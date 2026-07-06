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

// ─── Configuration (secrets serveur, jamais NEXT_PUBLIC_) ────────────────────

export const KERNEL_BASE_URL =
  process.env.KERNEL_BASE_URL || "http://localhost:8080";
const KERNEL_CLIENT_ID = process.env.KERNEL_CLIENT_ID || "dev-platform-backend";
const KERNEL_API_KEY = process.env.KERNEL_API_KEY || "dev-api-key";
const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || "";

const SESSION_COOKIE = "ksm-session";
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

export async function getSession(): Promise<KernelSession | null> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    const { payload } = await jwtDecrypt(raw, sessionKey());
    return payload.session as KernelSession;
  } catch {
    return null;
  }
}

export async function setSession(session: KernelSession): Promise<void> {
  const token = await new EncryptJWT({ session })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .encrypt(sessionKey());

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
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
    const refreshed = await tryRefresh(session);
    if (refreshed) {
      await setSession(refreshed);
      res = await doFetch(refreshed);
    }
  }
  return res;
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
