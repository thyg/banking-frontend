import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api-client";
import type {
  Organization,
  CreateOrganizationPayload,
  UpdateOrganizationPayload,
} from "@/types/organization";

export async function getOrganizations(): Promise<Organization[]> {
  return apiGet<Organization[]>("/api/organizations");
}

export async function getMyOrganizations(): Promise<Organization[]> {
  return apiGet<Organization[]>("/api/organizations/mine");
}

export async function getOrganizationById(id: string): Promise<Organization> {
  return apiGet<Organization>(`/api/organizations/${id}`);
}

export async function createOrganization(
  payload: CreateOrganizationPayload
): Promise<Organization> {
  return apiPost<Organization>("/api/organizations", payload);
}

export async function updateOrganization(
  id: string,
  payload: UpdateOrganizationPayload
): Promise<Organization> {
  return apiPut<Organization>(`/api/organizations/${id}`, payload);
}

export async function approveOrganization(id: string): Promise<Organization> {
  return apiPut<Organization>(`/api/organizations/${id}/approve`, {});
}

export async function rejectOrganization(id: string): Promise<Organization> {
  return apiPut<Organization>(`/api/organizations/${id}/reject`, {});
}

export async function suspendOrganization(id: string): Promise<Organization> {
  return apiPut<Organization>(`/api/organizations/${id}/suspend`, {});
}

export async function deleteOrganization(id: string): Promise<void> {
  return apiDelete(`/api/organizations/${id}`);
}

// ─── Membres (acteurs rattachés à une organisation) ──────────────────────────
// Backend : POST /api/organizations/{organizationId}/actors   { actorId, type }
//           GET  /api/organizations/{organizationId}/actors

export interface OrganizationActor {
  id: string;
  organizationId: string;
  actorId: string;
  type?: string;
}

/** Forme brute renvoyée par le kernel pour un acteur d'organisation. */
interface OrganizationActorRaw {
  id: string;
  organizationId?: string;
  actorId?: string;
  type?: string;
}

/** Rattache un acteur (utilisateur) à une organisation. `type` ex. OWNER / EMPLOYEE. */
export async function linkActorToOrganization(
  organizationId: string,
  actorId: string,
  type = "EMPLOYEE",
): Promise<OrganizationActor> {
  const raw = await apiPost<OrganizationActorRaw>(
    `/api/organizations/${organizationId}/actors`,
    { actorId, type },
  );
  return {
    id: raw.id,
    organizationId: raw.organizationId ?? organizationId,
    actorId: raw.actorId ?? actorId,
    type: raw.type ?? type,
  };
}

/** Liste les acteurs (membres) rattachés à une organisation. */
export async function getOrganizationActors(organizationId: string): Promise<OrganizationActor[]> {
  const raw = await apiGet<OrganizationActorRaw[]>(`/api/organizations/${organizationId}/actors`);
  return (raw ?? []).map((r) => ({
    id: r.id,
    organizationId: r.organizationId ?? organizationId,
    actorId: r.actorId ?? "",
    type: r.type,
  }));
}
