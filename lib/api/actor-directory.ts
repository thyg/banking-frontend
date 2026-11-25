/**
 * @file lib/api/actor-directory.ts
 * @description Annuaire local des acteurs (actorId → nom lisible).
 *
 * Pourquoi cet annuaire existe : le kernel ne permet pas de retrouver un nom à partir d'un
 * `actorId`. Vérifié sur le kernel local :
 *   - `GET /api/users` n'expose que `/me` (pas de listing des utilisateurs) ;
 *   - `GET /api/actors/{id}` répond 404 (`/api/actors` n'accepte que POST) ;
 *   - `GET /api/organizations/{id}/actors` ne renvoie que des `actorId` bruts ;
 *   - `GET /api/roles/assignments` exige un `userId` en paramètre (il répond « quels rôles a
 *     CET utilisateur », jamais « qui a ce rôle »).
 *
 * Sans annuaire, l'interface ne peut afficher que des UUID — illisibles pour l'utilisateur.
 * On mémorise donc localement les acteurs connus, alimentés à la création d'un utilisateur.
 *
 * Limite assumée : cet annuaire ne connaît que ce que ce navigateur a vu passer. Un acteur
 * créé ailleurs s'affichera en UUID raccourci, jamais en donnée inventée. Le jour où le
 * kernel exposera un listing, ce fichier devient inutile et se remplace par un simple appel.
 */

import { apiPost } from "@/lib/api-client";

const STORAGE_KEY = "ksm-actor-directory";

export interface ActorDirectoryEntry {
  actorId: string;
  /** Nom lisible, ex. « jude ». */
  name: string;
  email?: string;
  /** Rôle métier réel (ex. « QA Tresorier »), à titre indicatif d'affichage. */
  role?: string;
}

/**
 * Acteurs connus du seed local, vérifiés en base. Ils servent de repli pour que l'annuaire
 * ne soit pas vide au premier usage.
 */
const SEED: ActorDirectoryEntry[] = [
  {
    actorId: "00000000-0000-0000-0000-000000000004",
    name: "admin",
    email: "admin@demo.com",
    role: "Administrateur",
  },
  {
    actorId: "3c192f3d-548f-42e7-8db7-ea03d8f7fabe",
    name: "comptable",
    email: "comptable@demo.com",
    role: "Comptable",
  },
  {
    actorId: "a2da47f3-e0b1-4696-87b6-621822fb2650",
    name: "jude",
    email: "qa.tresorier@ksm.test",
    role: "QA Tresorier",
  },
];

function read(): ActorDirectoryEntry[] {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED;
    const stored = JSON.parse(raw) as ActorDirectoryEntry[];
    // Le seed reste prioritaire sur d'éventuelles entrées locales de même actorId.
    const seeded = new Set(SEED.map((e) => e.actorId));
    return [...SEED, ...stored.filter((e) => !seeded.has(e.actorId))];
  } catch {
    // localStorage illisible (quota, mode privé, données corrompues) : le seed suffit.
    return SEED;
  }
}

/** Liste les acteurs connus, triés par nom. */
export function getKnownActors(): ActorDirectoryEntry[] {
  return read().sort((a, b) => a.name.localeCompare(b.name));
}

/** Mémorise un acteur (à la création d'un utilisateur). Écrase l'entrée de même actorId. */
export function rememberActor(entry: ActorDirectoryEntry): void {
  if (typeof window === "undefined" || !entry.actorId) return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const stored = raw ? (JSON.parse(raw) as ActorDirectoryEntry[]) : [];
    const next = [...stored.filter((e) => e.actorId !== entry.actorId), entry];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Écriture impossible : l'annuaire reste incomplet, l'UI retombe sur l'UUID raccourci.
  }
}

/** Nom lisible d'un acteur, ou UUID raccourci si inconnu — jamais de nom inventé. */
export function actorLabel(actorId: string): string {
  const found = read().find((e) => e.actorId === actorId);
  return found ? found.name : `${actorId.slice(0, 8)}…`;
}

/** Entrée complète d'un acteur, si connue. */
export function findActor(actorId: string): ActorDirectoryEntry | undefined {
  return read().find((e) => e.actorId === actorId);
}

/**
 * Crée un acteur pour un nouvel utilisateur.
 *
 * `POST /api/auth/register` attend un `actorId` **fourni en entrée** et n'en crée pas (à la
 * différence de `signUp`, réservé à l'inscription publique). Sans cet appel préalable, le
 * compte est créé avec `actor_id` NULL et ne peut jamais être rattaché à une organisation —
 * c'est le cas des comptes `jude` et `test` créés avant ce correctif.
 */
export async function createActorFor(
  username: string,
  email: string,
): Promise<string | undefined> {
  const raw = await apiPost<{ id?: string }>("/api/actors", {
    firstName: username,
    lastName: username,
    name: username,
    email,
    type: "PERSON",
  });
  return raw?.id;
}
