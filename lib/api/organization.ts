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
