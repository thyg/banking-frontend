/**
 * Thin wrapper around api-client that prepends /api/treasury to every path.
 * All auth headers (X-Api-Key, X-User-Token) and response-envelope unwrapping
 * ({ data, success, message } → T) are handled by api-client.ts.
 */
import { apiGet, apiPost, apiPut, apiDelete, DEFAULT_ORG_ID } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";

const T = "/api/treasury";

/**
 * Identifiant d'organisation exigé par le backend treasury (query des listes, body des créations).
 *
 * C'est l'organisation de travail choisie après la connexion — la même que celle que le BFF envoie
 * en `X-Organization-Id`. Le backend refuse (403) une organisation différente de celle de la
 * session : la variable d'environnement n'est qu'un repli de développement.
 */
export function requireOrg(): string {
  const sessionOrg = useAuth.getState().user?.organizationId;
  const org = sessionOrg || DEFAULT_ORG_ID;
  if (!org) {
    throw new Error("Aucune organisation de travail sélectionnée. Reconnectez-vous et choisissez une organisation.");
  }
  return org;
}

/** Ajoute organizationId à un body de création (sans écraser une valeur déjà fournie). */
export function withOrg<B extends object>(body: B): B & { organizationId: string } {
  return { organizationId: requireOrg(), ...body };
}

export const tGet  = <R>(path: string)                  => apiGet<R>(`${T}${path}`);
export const tPost = <R>(path: string, body?: unknown)  => apiPost<R>(`${T}${path}`, body);
export const tPut  = <R>(path: string, body?: unknown)  => apiPut<R>(`${T}${path}`, body);
export const tDel  = (path: string)                     => apiDelete(`${T}${path}`);

/** Build a query-string from a plain object, skipping null/undefined values. */
export function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") p.append(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}
