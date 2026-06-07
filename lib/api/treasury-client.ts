/**
 * Thin wrapper around api-client that prepends /api/treasury to every path.
 * All auth headers (X-Api-Key, X-User-Token) and response-envelope unwrapping
 * ({ data, success, message } → T) are handled by api-client.ts.
 */
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api-client";

const T = "/api/treasury";

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
