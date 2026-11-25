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
  /** Acteur à associer au compte. À créer au préalable : `register` n'en crée pas. */
  actorId?: string;
}

export interface RegisteredUser {
  id: string;
  username: string;
  email: string;
  /** Identifiant de l'acteur métier lié à l'utilisateur (requis pour le rattacher à une organisation). */
  actorId?: string;
}

/** Erreur spécifique signalant qu'une étape MFA est requise. */
export class MfaRequiredError extends Error {
  constructor(
    public mfaToken?: string,
    /** Canal d'envoi du code (EMAIL, SMS…). */
    public channel?: string,
    public expiresInSeconds?: number,
    /** Code renvoyé par le kernel en développement uniquement (jamais en production). */
    public devCode?: string,
  ) {
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
    throw new MfaRequiredError(data?.mfaToken, data?.channel, data?.expiresInSeconds, data?.devCode);
  }
  if (!res.ok) {
    let msg = "Erreur de connexion.";
    try { const e = await res.json(); msg = e?.message || msg; } catch { /* ignore */ }
    throw new Error(msg);
  }

  return toAuthUser(await res.json(), payload.email);
}

/** Confirme le code MFA reçu ; ouvre la session comme un login direct. */
export async function confirmMfaApi(mfaToken: string, code: string, tenantId?: string): Promise<AuthUser> {
  const res = await fetch("/api/auth/login/mfa", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ mfaToken, code, tenantId }),
  });
  if (!res.ok) {
    let msg = "Code invalide ou expiré.";
    try { const e = await res.json(); msg = e?.message || msg; } catch { /* ignore */ }
    throw new Error(msg);
  }
  return toAuthUser(await res.json());
}

function toAuthUser(json: any, fallbackEmail?: string): AuthUser {
  const user = json?.user ?? {};
  return {
    userId: user.userId,
    tenantId: user.tenantId,
    organizationId: user.organizationId,
    actorId: user.actorId,
    // Le token réel reste côté serveur (cookie httpOnly). Marqueur de session.
    token: "session",
    email: user.email ?? fallbackEmail,
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
      // `register` ne crée pas d'acteur (contrairement à `signUp`) : sans cet actorId, le
      // compte reste avec actor_id NULL et ne peut pas être rattaché à une organisation.
      ...(payload.actorId ? { actorId: payload.actorId } : {}),
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
  return { id: data.id, username: data.username, email: data.email, actorId: data.actorId ?? data.actor_id };
}

/** Déconnexion : efface la session côté serveur. */
export async function logoutApi(): Promise<void> {
  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  }).catch(() => undefined);
}
