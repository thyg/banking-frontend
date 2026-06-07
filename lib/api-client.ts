/**
 * @file lib/api-client.ts
 * @description Client HTTP centralisé avec injection automatique des headers d'authentification.
 * Toutes les requêtes vers le backend Spring Boot passent par ce module.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "dev-api-key";
const DEFAULT_ORG_ID = process.env.NEXT_PUBLIC_DEFAULT_ORGANIZATION_ID || "";

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("iwm-auth");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state?.user?.token ?? null;
  } catch {
    return null;
  }
}

function getStoredOrgId(): string | null {
  if (typeof window === "undefined") return DEFAULT_ORG_ID || null;
  try {
    const raw = localStorage.getItem("iwm-auth");
    if (!raw) return DEFAULT_ORG_ID || null;
    const parsed = JSON.parse(raw);
    return parsed?.state?.user?.organizationId ?? DEFAULT_ORG_ID ?? null;
  } catch {
    return DEFAULT_ORG_ID || null;
  }
}

function buildHeaders(extra?: Record<string, string>): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Api-Key": API_KEY,
    ...extra,
  };
  const token = getStoredToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const orgId = getStoredOrgId();
  if (orgId) headers["X-Organization-Id"] = orgId;
  return headers;
}

export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    headers: buildHeaders(),
  });
  return handleResponse<T>(res);
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: buildHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(res);
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "PUT",
    headers: buildHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(res);
}

export async function apiDelete(path: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "DELETE",
    headers: buildHeaders(),
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
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: buildHeaders(),
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
