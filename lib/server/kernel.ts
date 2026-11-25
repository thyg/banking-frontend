/**
 * @file lib/server/kernel.ts
 * @description Helpers SERVEUR du BFF (Backend For Frontend).
 *
 * Ce module ne s'exécute QUE côté serveur (Route Handlers). Il détient les
 * secrets de la ClientApplication (X-Client-Id / X-Api-Key) qui ne doivent
 * jamais transiter par le navigateur, et gère la session utilisateur dans un
 * cookie httpOnly chiffré (JWE via `jose`).
 *
 * Voir new infos/ARCHITECTURE_BFF.md
 */
import "server-only";
import { cookies } from "next/headers";
import { EncryptJWT, jwtDecrypt } from "jose";
import {
  createSession,
  destroySession,
  getStoredSession,
  updateSession,
} from "./session-store";

// ─── Configuration (secrets serveur, jamais NEXT_PUBLIC_) ────────────────────

export const KERNEL_BASE_URL =
  process.env.KERNEL_BASE_URL || "http://localhost:8080";
const KERNEL_CLIENT_ID = process.env.KERNEL_CLIENT_ID || "rt-comops-frontend";
const KERNEL_API_KEY = process.env.KERNEL_API_KEY || "dev-api-key";
const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || "";

const SESSION_COOKIE = "ksm-session";
/**
 * Anciens cookies découpés (`ksm-session.0`, `.1`, …) d'une version précédente : on ne les
 * écrit plus, mais on continue de les supprimer pour que les navigateurs qui en portent
 * encore ne restent pas coincés avec une session illisible.
 */
const LEGACY_MAX_COOKIE_CHUNKS = 8;
// 32 octets requis pour A256GCM. On dérive une clé stable depuis SESSION_SECRET.
const SESSION_SECRET = process.env.SESSION_SECRET || "dev-insecure-session-secret-change-me";

function sessionKey(): Uint8Array {
  // Étend/tronque le secret à 32 octets de façon déterministe.
  const raw = new TextEncoder().encode(SESSION_SECRET);
  const key = new Uint8Array(32);
  key.set(raw.subarray(0, 32));
  return key;
}

// ─── Modèle de session ───────────────────────────────────────────────────────

export interface KernelSession {
  accessToken: string;
  refreshToken?: string;
  tenantId?: string;
  organizationId?: string;
  userId?: string;
  email?: string;
  /** epoch ms d'expiration de l'access token */
  expiresAt?: number;
}

// ─── Lecture / écriture de la session (cookie httpOnly chiffré) ──────────────

/**
 * État de la session, pour distinguer les causes d'absence de token :
 *  - `missing`   : aucun cookie (utilisateur jamais connecté / déconnecté)
 *  - `invalid`   : cookie présent mais indéchiffrable ou expiré (SESSION_SECRET changé,
 *                  cookie corrompu, session périmée) → il faut se reconnecter
 *  - `valid`     : session exploitable
 */
export type SessionState = "valid" | "missing" | "invalid";

export interface SessionResult {
  session: KernelSession | null;
  state: SessionState;
  /** Identifiant de la session en store, présent uniquement si `state === "valid"`. */
  sid?: string;
}

/**
 * Lit la session et indique *pourquoi* elle est absente le cas échéant.
 * Sans cette distinction, un cookie illisible produisait un appel sans Bearer, et donc
 * un 403 « Access Denied » incompréhensible renvoyé par le kernel au lieu d'un
 * « session expirée, reconnectez-vous ».
 */
export async function readSession(): Promise<SessionResult> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;

  if (!raw) {
    // Reste d'une session découpée par une version précédente : inexploitable, mais ce n'est
    // pas « jamais connecté » — on le signale comme invalide pour que le cookie soit purgé.
    for (let i = 0; i < LEGACY_MAX_COOKIE_CHUNKS; i++) {
      if (jar.get(`${SESSION_COOKIE}.${i}`)) return { session: null, state: "invalid" };
    }
    return { session: null, state: "missing" };
  }

  try {
    const { payload } = await jwtDecrypt(raw, sessionKey());
    const sid = payload.sid as string | undefined;
    if (!sid) return { session: null, state: "invalid" };

    // Le cookie est authentique ; reste à savoir si la session vit encore côté serveur
    // (expirée, déconnexion, ou redémarrage du serveur avec un store en mémoire).
    const session = getStoredSession(sid);
    if (!session?.accessToken) return { session: null, state: "invalid" };

    return { session, state: "valid", sid };
  } catch {
    // Cookie corrompu, chiffré avec un autre SESSION_SECRET, ou expiré (JWE exp).
    return { session: null, state: "invalid" };
  }
}

export async function getSession(): Promise<KernelSession | null> {
  return (await readSession()).session;
}

/**
 * Fixe l'organisation de travail de la session courante.
 *
 * Le kernel ne renvoie **pas** d'`organizationId` au login (un utilisateur peut appartenir à
 * plusieurs organisations, le kernel ne devine pas laquelle). Sans cette information, le BFF
 * n'envoie pas `X-Organization-Id` et tous les endpoints « organization-scoped » échouent.
 * C'est donc au client de choisir, puis d'appeler cette fonction.
 *
 * `organizationId` à `null` efface le choix. Renvoie false si la session n'existe plus.
 */
export async function setSessionOrganization(organizationId: string | null): Promise<boolean> {
  const { session, sid } = await readSession();
  if (!session || !sid) return false;
  return updateSession(sid, { ...session, organizationId: organizationId ?? undefined });
}

/**
 * Ouvre une session : la session vit côté serveur, le cookie ne porte que son identifiant.
 * Le JWE reste utilisé pour que le cookie soit infalsifiable et daté — mais il ne chiffre
 * plus qu'un `sid` court, jamais l'access token.
 */
export async function setSession(session: KernelSession): Promise<void> {
  const sid = createSession(session);
  const token = await new EncryptJWT({ sid })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .encrypt(sessionKey());

  const jar = await cookies();

  // Purge d'éventuels restes d'une session découpée par une version précédente.
  for (let i = 0; i < LEGACY_MAX_COOKIE_CHUNKS; i++) jar.delete(`${SESSION_COOKIE}.${i}`);

  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();

  // Détruire l'entrée serveur avant d'oublier le cookie, sinon elle resterait en mémoire
  // jusqu'à son expiration.
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (raw) {
    try {
      const { payload } = await jwtDecrypt(raw, sessionKey());
      const sid = payload.sid as string | undefined;
      if (sid) destroySession(sid);
    } catch {
      // Cookie illisible : il n'y a pas de sid exploitable, le supprimer suffit.
    }
  }

  jar.delete(SESSION_COOKIE);
  // Supprime aussi les morceaux d'une session découpée (versions précédentes).
  for (let i = 0; i < LEGACY_MAX_COOKIE_CHUNKS; i++) jar.delete(`${SESSION_COOKIE}.${i}`);
}

// ─── En-têtes vers le kernel ─────────────────────────────────────────────────

/**
 * Construit les en-têtes pour un appel au kernel. Les secrets de la
 * ClientApplication sont injectés ici, côté serveur uniquement.
 */
export function kernelHeaders(
  session: KernelSession | null,
  extra?: Record<string, string>,
): Record<string, string> {
  const headers: Record<string, string> = {
    "X-Client-Id": KERNEL_CLIENT_ID,
    "X-Api-Key": KERNEL_API_KEY,
    ...extra,
  };
  if (session?.accessToken) headers["Authorization"] = `Bearer ${session.accessToken}`;

  const tenantId = session?.tenantId || DEFAULT_TENANT_ID;
  if (tenantId) headers["X-Tenant-Id"] = tenantId;
  if (session?.organizationId) headers["X-Organization-Id"] = session.organizationId;

  return headers;
}

// ─── Appel bas-niveau au kernel ──────────────────────────────────────────────

/**
 * Relaie une requête vers le kernel. `path` doit commencer par "/api/...".
 * Tente un refresh silencieux du token sur 401 si un refreshToken est présent.
 */
export async function kernelFetch(
  path: string,
  init: RequestInit,
  session: KernelSession | null,
  sid?: string,
): Promise<Response> {
  const url = `${KERNEL_BASE_URL}${path}`;
  const doFetch = (s: KernelSession | null) =>
    fetch(url, {
      ...init,
      headers: {
        ...kernelHeaders(s, (init.headers as Record<string, string>) || {}),
      },
      cache: "no-store",
    });

  let res = await doFetch(session);

  if (res.status === 401 && session?.refreshToken) {
    const refreshed = sid ? await refreshOnce(sid, session) : await tryRefresh(session);
    if (refreshed) {
      // Mise à jour en place quand on connaît le `sid` : le cookie déjà posé chez le client
      // reste valable et l'ancienne entrée n'est pas laissée orpheline en mémoire.
      if (!sid || !updateSession(sid, refreshed)) await setSession(refreshed);
      res = await doFetch(refreshed);
    }
  }
  return res;
}

/**
 * Refresh « single-flight » par session. Une page lance plusieurs appels en parallèle : à
 * l'expiration du token, tous recevaient un 401 et tentaient chacun un refresh avec le même
 * refresh token. Le premier le consommait, les autres échouaient, et la session était
 * détruite : l'utilisateur était déconnecté à chaque expiration du token d'accès.
 */
const refreshes = ((globalThis as unknown as { __ksmRefreshes?: Map<string, Promise<KernelSession | null>> })
  .__ksmRefreshes ??= new Map());

function refreshOnce(sid: string, session: KernelSession): Promise<KernelSession | null> {
  // Un autre appel a déjà renouvelé le token depuis notre lecture de la session : on le reprend.
  const latest = getStoredSession(sid);
  if (latest?.accessToken && latest.accessToken !== session.accessToken) {
    return Promise.resolve(latest);
  }
  let pending = refreshes.get(sid);
  if (!pending) {
    pending = tryRefresh(session).finally(() => {
      // Laisse le temps aux requêtes concurrentes de lire le résultat avant de l'oublier.
      setTimeout(() => refreshes.delete(sid), 5_000);
    });
    refreshes.set(sid, pending);
  }
  return pending;
}

/** Tente POST /api/auth/refresh. Renvoie la session mise à jour ou null. */
async function tryRefresh(session: KernelSession): Promise<KernelSession | null> {
  try {
    const res = await fetch(`${KERNEL_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: kernelHeaders(null, { "Content-Type": "application/json" }),
      body: JSON.stringify({ refreshToken: session.refreshToken }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    const data = json?.data ?? json;
    return {
      ...session,
      accessToken: data.accessToken ?? data.token,
      refreshToken: data.refreshToken ?? session.refreshToken,
      expiresAt: data.expiresInSeconds
        ? Date.now() + data.expiresInSeconds * 1000
        : session.expiresAt,
    };
  } catch {
    return null;
  }
}
