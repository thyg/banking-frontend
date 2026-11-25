/**
 * @file lib/api/session-organization.ts
 * @description Organisation de travail de la session (côté client).
 *
 * Le kernel ne renvoie pas d'organisation au login : l'utilisateur la choisit, et le BFF la
 * conserve en session pour injecter `X-Organization-Id` sur les appels suivants.
 */

import { useAuth } from "@/hooks/use-auth";

export interface SessionOrganization {
  organizationId: string | null;
}

/** Lit l'organisation de travail de la session. */
export async function getSessionOrganization(): Promise<string | null> {
  const res = await fetch("/api/auth/organization", {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) return null;
  const json = (await res.json()) as SessionOrganization;
  return json.organizationId ?? null;
}

/** Fixe l'organisation de travail. `null` efface le choix. */
export async function setSessionOrganization(organizationId: string | null): Promise<void> {
  const res = await fetch("/api/auth/organization", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ organizationId }),
  });
  if (!res.ok) {
    let message = "Impossible de définir l'organisation.";
    try {
      const e = await res.json();
      message = e?.message || message;
    } catch {
      /* réponse non JSON : on garde le message par défaut */
    }
    throw new Error(message);
  }
}

/** Organisation de l'utilisateur pour un service, avec son droit d'accès (kernel /auth/me/workspaces). */
export interface Workspace {
  tenantId: string;
  organizationId: string | null;
  organizationCode?: string;
  organizationName?: string;
  organizationLogoUri?: string;
  roleName?: string;
  /** Portée du rôle : TENANT (tout l'espace, sans organisation précise) ou ORGANIZATION. */
  scopeType?: string;
  accessGranted: boolean;
  accessDeniedReason?: string;
}

/** Espaces de travail de l'utilisateur connecté pour le service Trésorerie. */
export async function listTreasuryWorkspaces(): Promise<Workspace[]> {
  const res = await fetch("/api/kernel/auth/me/workspaces?serviceCode=TREASURY", {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Impossible de récupérer vos organisations.");
  const json = await res.json().catch(() => ({}));
  return (json?.data ?? json ?? []) as Workspace[];
}

/** Fixe l'organisation de travail dans la session BFF ET dans l'état client (requireOrg). */
export async function selectOrganization(organizationId: string): Promise<void> {
  await setSessionOrganization(organizationId);
  useAuth.getState().setOrganization(organizationId);
}
