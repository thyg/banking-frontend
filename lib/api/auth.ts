/**
 * @file lib/api/auth.ts
 * @description Fonctions d'authentification connectées au backend Spring Boot.
 */

import type { AuthUser } from "@/hooks/use-auth";
import { useAuth } from "@/hooks/use-auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "dev-api-key";
const DEFAULT_TENANT_ID = process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID || "";

function authHeaders(): Record<string, string> {
  const token = useAuth.getState().getToken();
  const tenantId = useAuth.getState().getTenantId();
  return {
    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    ...(tenantId ? { "X-Tenant-Id": tenantId } : {}),
  };
}

export interface LoginPayload {
  email: string;
  password: string;
  tenantId?: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  username?: string;
  tenantId?: string;
}

export interface RegisteredUser {
  id: string;
  username: string;
  email: string;
}

export async function loginApi(payload: LoginPayload): Promise<AuthUser> {
  const tenantId = payload.tenantId || DEFAULT_TENANT_ID;
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": API_KEY,
      ...(tenantId ? { "X-Tenant-Id": tenantId } : {}),
    },
    body: JSON.stringify({ principal: payload.email, password: payload.password }),
  });

  if (res.status === 401) throw new Error("Email ou mot de passe incorrect.");
  if (!res.ok) {
    let msg = "Erreur de connexion.";
    try { const e = await res.json(); msg = e?.message || msg; } catch { /* ignore */ }
    throw new Error(msg);
  }

  const json = await res.json();
  const data = json?.data ?? json;

  return {
    userId: data.id ?? data.userId,
    tenantId: data.tenantId,
    actorId: data.actorId,
    token: data.sessionToken ?? data.token,
    expiresAt: data.expiresAt,
    email: payload.email,
  };
}

export async function registerApi(payload: RegisterPayload): Promise<RegisteredUser> {
  const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": API_KEY,
      ...authHeaders(),
    },
    body: JSON.stringify({
      username: payload.username ?? payload.email,
      email: payload.email,
      password: payload.password,
      authProvider: "LOCAL",
    }),
  });

  if (res.status === 409) throw new Error("Cet email est déjà utilisé.");
  if (!res.ok) {
    let msg = "Erreur lors de l'inscription.";
    try { const e = await res.json(); msg = e?.message || msg; } catch { /* ignore */ }
    throw new Error(msg);
  }

  const json = await res.json();
  const data = json?.data ?? json;
  return { id: data.id, username: data.username, email: data.email };
}
