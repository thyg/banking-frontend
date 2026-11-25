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
  "administration",
  "accounting",
  "organization",
  "sales",
  "inventory",
  "settings",
] as const;

export type PermissionModule = (typeof PERMISSION_MODULES)[number];

/**
 * Repli minimal utilisé **uniquement** si le catalogue du kernel est injoignable.
 *
 * ⚠️ Ne contient que des permissions **réellement existantes** côté kernel
 * (`PermissionCatalogService`). L'ancienne version listait `treasury:write`,
 * `org:read`, `roles:manage`… qui n'existent pas : un rôle créé avec elles était
 * accepté mais totalement inopérant. La source de vérité est désormais
 * `getPermissions()` → `GET /api/administration/permissions`.
 */
export const BUILTIN_PERMISSIONS: Permission[] = [
  // Trésorerie
  { id: "treasury:read",            code: "treasury:read",            label: "Lire la trésorerie",            module: "treasury" },
  { id: "treasury:manage",          code: "treasury:manage",          label: "Administrer la trésorerie",     module: "treasury" },
  { id: "treasury:settle-invoices", code: "treasury:settle-invoices", label: "Régler les factures",           module: "treasury" },
  // Administration (rôles, utilisateurs, paramètres)
  { id: "administration:read",             code: "administration:read",             label: "Lire l'administration",     module: "administration" },
  { id: "administration:write",            code: "administration:write",            label: "Modifier l'administration", module: "administration" },
  { id: "administration:roles:read",       code: "administration:roles:read",       label: "Lire les rôles",            module: "administration" },
  { id: "administration:roles:write",      code: "administration:roles:write",      label: "Gérer les rôles",           module: "administration" },
  { id: "administration:assignments:write", code: "administration:assignments:write", label: "Affecter des rôles",      module: "administration" },
  // Comptabilité
  { id: "accounting:read",  code: "accounting:read",  label: "Lire la comptabilité",     module: "accounting" },
  { id: "accounting:write", code: "accounting:write", label: "Modifier la comptabilité", module: "accounting" },
  { id: "accounting:post",  code: "accounting:post",  label: "Comptabiliser",            module: "accounting" },
  // Organisations
  { id: "organizations:write", code: "organizations:write", label: "Gérer les organisations", module: "organization" },
  // Ventes / Stock / Paramètres
  { id: "sales:write",     code: "sales:write",     label: "Gérer les ventes",   module: "sales" },
  { id: "inventory:write", code: "inventory:write", label: "Gérer le stock",     module: "inventory" },
  { id: "settings:read",   code: "settings:read",   label: "Lire les paramètres",     module: "settings" },
  { id: "settings:write",  code: "settings:write",  label: "Modifier les paramètres", module: "settings" },
];

/** Libellés des modules du catalogue kernel (clés normalisées en minuscules). */
export const MODULE_LABELS: Record<string, string> = {
  treasury: "Trésorerie",
  administration: "Administration",
  accounting: "Comptabilité",
  organization: "Organisations",
  sales: "Ventes",
  inventory: "Stock",
  product: "Produits",
  settings: "Paramètres",
  hrm: "Personnel (RH)",
  cashier: "Caisse",
  commercial: "Commercial",
  resource: "Ressources",
  blockchain: "Blockchain",
  iam: "Identités & accès",
  system: "Système",
};
