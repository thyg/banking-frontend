/**
 * @file lib/api-client.ts
 * @description Client HTTP centralisé. Toutes les requêtes passent désormais par
 * le BFF Next.js (/api/kernel/...) qui injecte côté serveur les secrets de la
 * ClientApplication et le Bearer token. Le navigateur n'envoie QUE son cookie de
 * session (httpOnly) — aucun secret ni token ne transite par le client.
 *
 * Voir new infos/ARCHITECTURE_BFF.md
 */

/** Préfixe du proxy BFF. Un appel `/api/treasury/x` est relayé via `/api/kernel/treasury/x`. */
const BFF_PREFIX = "/api/kernel";

/** Conservé pour compat : certains modules importent DEFAULT_ORG_ID. */
export const DEFAULT_ORG_ID = process.env.NEXT_PUBLIC_DEFAULT_ORGANIZATION_ID || "";

/** Réécrit un chemin kernel (`/api/...`) vers le proxy BFF (`/api/kernel/...`). */
function toBffPath(path: string): string {
  if (path.startsWith(BFF_PREFIX)) return path; // déjà préfixé
  const stripped = path.startsWith("/api/") ? path.slice("/api".length) : path;
  return `${BFF_PREFIX}${stripped.startsWith("/") ? "" : "/"}${stripped}`;
}

function buildHeaders(extra?: Record<string, string>): HeadersInit {
  // Le cookie de session (httpOnly) est joint automatiquement par le navigateur.
  // Le BFF injecte X-Client-Id / X-Api-Key / Authorization / X-Tenant-Id côté serveur.
  return {
    "Content-Type": "application/json",
    ...extra,
  };
}

export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(toBffPath(path), {
    method: "GET",
    headers: buildHeaders(),
    credentials: "include",
  });
  return handleResponse<T>(res);
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(toBffPath(path), {
    method: "POST",
    headers: buildHeaders(),
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(res);
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(toBffPath(path), {
    method: "PUT",
    headers: buildHeaders(),
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(res);
}

export async function apiDelete(path: string): Promise<void> {
  const res = await fetch(toBffPath(path), {
    method: "DELETE",
    headers: buildHeaders(),
    credentials: "include",
  });
  if (!res.ok && res.status !== 204) await handleResponse(res);
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Erreur ${res.status}`;
    try {
      const err = await res.json();
      message = err?.message || err?.error || message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as unknown as T;
  const json = await res.json();
  // Le backend enveloppe dans { data, message, success }
  return (json?.data !== undefined ? json.data : json) as T;
}

export async function apiPostRaw<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
  const res = await fetch(toBffPath(path), {
    method: "POST",
    headers: buildHeaders(),
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let message = `Erreur ${res.status}`;
    try {
      const err = await res.json();
      message = err?.message || message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return res.json();
}
