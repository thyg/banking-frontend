export interface Permission {
  id: string;
  code: string;
  label: string;
  description?: string;
  module: string;
}

export interface Role {
  id: string;
  tenantId: string;
  code: string;
  label: string;
  description?: string;
  permissions: string[];
  isSystem?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateRolePayload {
  code: string;
  label: string;
  description?: string;
  permissions: string[];
}

export interface UpdateRolePayload {
  label?: string;
  description?: string;
  permissions?: string[];
}

export const PERMISSION_MODULES = [
  "treasury",
  "organization",
  "roles",
  "sales",
  "stock",
  "personnel",
] as const;

export type PermissionModule = (typeof PERMISSION_MODULES)[number];

export const BUILTIN_PERMISSIONS: Permission[] = [
  // Treasury
  { id: "treasury:read",   code: "treasury:read",   label: "Lire la trésorerie",       module: "treasury" },
  { id: "treasury:write",  code: "treasury:write",  label: "Modifier la trésorerie",    module: "treasury" },
  { id: "treasury:manage", code: "treasury:manage", label: "Administrer la trésorerie", module: "treasury" },
  // Organizations
  { id: "org:read",   code: "org:read",   label: "Lire les organisations",       module: "organization" },
  { id: "org:write",  code: "org:write",  label: "Modifier les organisations",    module: "organization" },
  { id: "org:manage", code: "org:manage", label: "Administrer les organisations", module: "organization" },
  // Roles
  { id: "roles:read",   code: "roles:read",   label: "Lire les rôles",       module: "roles" },
  { id: "roles:write",  code: "roles:write",  label: "Modifier les rôles",    module: "roles" },
  { id: "roles:manage", code: "roles:manage", label: "Administrer les rôles", module: "roles" },
  // Sales
  { id: "sales:read",   code: "sales:read",   label: "Lire les ventes",       module: "sales" },
  { id: "sales:write",  code: "sales:write",  label: "Modifier les ventes",    module: "sales" },
  { id: "sales:manage", code: "sales:manage", label: "Administrer les ventes", module: "sales" },
  // Stock
  { id: "stock:read",   code: "stock:read",   label: "Lire le stock",       module: "stock" },
  { id: "stock:write",  code: "stock:write",  label: "Modifier le stock",    module: "stock" },
  { id: "stock:manage", code: "stock:manage", label: "Administrer le stock", module: "stock" },
  // Personnel
  { id: "personnel:read",   code: "personnel:read",   label: "Lire le personnel",       module: "personnel" },
  { id: "personnel:write",  code: "personnel:write",  label: "Modifier le personnel",    module: "personnel" },
  { id: "personnel:manage", code: "personnel:manage", label: "Administrer le personnel", module: "personnel" },
];

export const MODULE_LABELS: Record<string, string> = {
  treasury: "Trésorerie",
  organization: "Organisations",
  roles: "Rôles",
  sales: "Ventes",
  stock: "Stock",
  personnel: "Personnel",
};
