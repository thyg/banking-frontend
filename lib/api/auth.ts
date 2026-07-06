/**
 * @file lib/api/auth.ts
 * @description Fonctions d'authentification — passent désormais par le BFF Next.js.
 * Le login dépose un cookie de session httpOnly côté serveur ; aucun secret ni
 * token kernel ne transite par le navigateur.
 *
 * Voir new infos/ARCHITECTURE_BFF.md
 */

import type { AuthUser } from "@/hooks/use-auth";

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

/** Erreur spécifique signalant qu'une étape MFA est requise. */
export class MfaRequiredError extends Error {
  constructor(public mfaToken?: string) {
    super("Vérification MFA requise.");
    this.name = "MfaRequiredError";
  }
}

export async function loginApi(payload: LoginPayload): Promise<AuthUser> {
  // BFF même origine : le cookie de session est posé par la réponse.
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      email: payload.email,
      password: payload.password,
      tenantId: payload.tenantId,
    }),
  });

  if (res.status === 202) {
    const data = await res.json().catch(() => ({}));
    throw new MfaRequiredError(data?.mfaToken);
  }
  if (res.status === 401) throw new Error("Email ou mot de passe incorrect.");
  if (!res.ok) {
    let msg = "Erreur de connexion.";
    try { const e = await res.json(); msg = e?.message || msg; } catch { /* ignore */ }
    throw new Error(msg);
  }

  const json = await res.json();
  const user = json?.user ?? {};
  return {
    userId: user.userId,
    tenantId: user.tenantId,
    organizationId: user.organizationId,
    actorId: user.actorId,
    // Le token réel reste côté serveur (cookie httpOnly). Marqueur de session.
    token: "session",
    email: user.email ?? payload.email,
  };
}

export async function registerApi(payload: RegisterPayload): Promise<RegisteredUser> {
  // Relayé via le proxy BFF vers /api/auth/register du kernel.
  const res = await fetch("/api/kernel/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
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

/** Déconnexion : efface la session côté serveur. */
export async function logoutApi(): Promise<void> {
  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  }).catch(() => undefined);
}
