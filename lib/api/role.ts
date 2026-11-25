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

/**
 * Réponse du catalogue de permissions du kernel :
 * GET /api/administration/permissions
 */
interface KernelPermission {
  code: string;
  name: string;
  description?: string;
  module: string;
  scope?: string;
  system?: boolean;
  assignable?: boolean;
  deprecated?: boolean;
}

/**
 * Charge le **vrai** catalogue de permissions depuis le kernel, seule source de vérité.
 * Auparavant le formulaire s'appuyait sur une liste codée en dur (`BUILTIN_PERMISSIONS`)
 * qui contenait des permissions inexistantes (`treasury:write`, `org:read`…) : un rôle créé
 * avec elles était accepté par le kernel mais **totalement inopérant**.
 *
 * On ne garde que les permissions assignables et non dépréciées.
 * En cas d'échec, l'appelant retombe sur la liste statique (mode dégradé).
 */
export async function getPermissions(): Promise<Permission[]> {
  const raw = await apiGet<KernelPermission[]>("/api/administration/permissions");
  return (raw ?? [])
    .filter((p) => p.assignable !== false && p.deprecated !== true)
    .map((p) => ({
      id: p.code,
      code: p.code,
      label: p.name || p.code,
      description: p.description,
      module: (p.module || "AUTRE").toLowerCase(),
    }));
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
