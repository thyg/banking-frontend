import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api-client";
import type { Role, Permission, CreateRolePayload, UpdateRolePayload } from "@/types/role";

// Backend returns { id, tenantId, code, name, scopeType, permissions }
// Frontend uses  { id, tenantId, code, label, permissions }
function fromBackend(r: any): Role {
  return {
    id: r.id,
    tenantId: r.tenantId,
    code: r.code,
    label: r.name ?? r.label ?? "",
    permissions: r.permissions ?? [],
    isSystem: r.isSystem,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export async function getRoles(): Promise<Role[]> {
  try {
    const data = await apiGet<any[]>("/api/roles");
    return (data ?? []).map(fromBackend);
  } catch {
    return [];
  }
}

export async function getRoleById(id: string): Promise<Role> {
  const data = await apiGet<any>(`/api/roles/${id}`);
  return fromBackend(data);
}

export async function createRole(payload: CreateRolePayload): Promise<Role> {
  const body = {
    code: payload.code,
    name: payload.label,
    scopeType: "TENANT",
    permissions: payload.permissions,
  };
  const data = await apiPost<any>("/api/roles", body);
  return fromBackend(data);
}

export async function updateRole(id: string, payload: UpdateRolePayload): Promise<Role> {
  const body = {
    ...(payload.label !== undefined && { name: payload.label }),
    ...(payload.permissions !== undefined && { permissions: payload.permissions }),
  };
  const data = await apiPut<any>(`/api/roles/${id}`, body);
  return fromBackend(data);
}

export async function deleteRole(id: string): Promise<void> {
  return apiDelete(`/api/roles/${id}`);
}

export async function getPermissions(): Promise<Permission[]> {
  try {
    return await apiGet<Permission[]>("/api/permissions");
  } catch {
    return [];
  }
}

export async function assignRoleToUser(userId: string, roleId: string): Promise<void> {
  await apiPost(`/api/roles/assignments`, {
    userId,
    roleId,
    scopeType: "TENANT",
    scope: "TENANT",
  });
}

export async function revokeRoleFromUser(userId: string, roleId: string): Promise<void> {
  return apiDelete(`/api/roles/${roleId}/users/${userId}`);
}
