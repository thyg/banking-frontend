/**
 * @file lib/server/session-store.ts
 * @description Stockage serveur des sessions kernel.
 *
 * Pourquoi ce store existe : l'access token du kernel embarque toutes les permissions de
 * l'utilisateur (192 entrées pour un administrateur, ~7350 caractères à lui seul). Stocké
 * dans un cookie chiffré, il produisait une valeur de ~10 000 caractères. Or :
 *   - un cookie est limité à ~4096 octets par le navigateur ;
 *   - le découper en morceaux (`ksm-session.0`, `.1`, `.2`) ne résout rien, car les cookies
 *     repartent dans l'en-tête de CHAQUE requête et Node plafonne les en-têtes à ~8 Ko :
 *     le dernier morceau était **silencieusement supprimé**, le JWE arrivait tronqué,
 *     et l'administrateur ne pouvait jamais avoir de session valide.
 *
 * On garde donc la session côté serveur et le cookie ne transporte plus qu'un identifiant
 * opaque (~43 caractères), quel que soit le nombre de permissions.
 *
 * Implémentation : Map en mémoire du process. Suffisant en développement et pour un
 * déploiement mono-instance. Deux limites assumées, à lever le jour où l'app tourne en
 * multi-instance : les sessions sont perdues au redémarrage, et ne sont pas partagées entre
 * instances. Le remplacement se fait alors ici (Redis) sans toucher aux appelants.
 */
import { randomBytes } from "crypto";
import type { KernelSession } from "./kernel";

interface StoredSession {
  session: KernelSession;
  /** epoch ms au-delà duquel l'entrée est considérée morte */
  expiresAt: number;
}

const TTL_MS = 12 * 60 * 60 * 1000; // 12 h, aligné sur la durée de vie du cookie

/**
 * Le rechargement à chaud de Next réévalue les modules : une simple variable de module
 * viderait les sessions à chaque édition de fichier en dev. On accroche donc le store à
 * l'objet global, qui, lui, survit.
 */
const globalStore = globalThis as unknown as {
  __ksmSessionStore?: Map<string, StoredSession>;
};

const store: Map<string, StoredSession> =
  globalStore.__ksmSessionStore ?? (globalStore.__ksmSessionStore = new Map());

/** Supprime les entrées expirées. Appelé à chaque création : pas de timer à nettoyer. */
function purgeExpired(): void {
  const now = Date.now();
  for (const [id, entry] of store) {
    if (entry.expiresAt <= now) store.delete(id);
  }
}

/** Crée une session et renvoie son identifiant opaque, à mettre dans le cookie. */
export function createSession(session: KernelSession): string {
  purgeExpired();
  const id = randomBytes(32).toString("base64url");
  store.set(id, { session, expiresAt: Date.now() + TTL_MS });
  return id;
}

/** Lit une session. Renvoie null si l'identifiant est inconnu ou l'entrée expirée. */
export function getStoredSession(id: string): KernelSession | null {
  const entry = store.get(id);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    store.delete(id);
    return null;
  }
  return entry.session;
}

/**
 * Met à jour une session existante sans changer son identifiant : utilisé après un refresh
 * silencieux du token, pour que le cookie déjà posé chez le client reste valable.
 * Renvoie false si l'identifiant n'existe plus (session expirée entre-temps).
 */
export function updateSession(id: string, session: KernelSession): boolean {
  const entry = store.get(id);
  if (!entry) return false;
  entry.session = session;
  return true;
}

/** Détruit une session (déconnexion, cookie mort). */
export function destroySession(id: string): void {
  store.delete(id);
}
