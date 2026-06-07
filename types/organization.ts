/**
 * @file types/organization.ts
 * @description Types pour le module Organisation — mappés sur le backend iwm-organization-core.
 */

export type OrganizationStatus = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";

export interface Organization {
  id: string;
  tenantId: string;
  code: string;
  legalName: string;
  displayName: string;
  organizationType: string;
  governanceStatus: OrganizationStatus;
  businessActorId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateOrganizationPayload {
  code: string;
  legalName: string;
  displayName: string;
  organizationType: string;
  businessActorId?: string;
}

export interface UpdateOrganizationPayload {
  legalName?: string;
  displayName?: string;
  organizationType?: string;
}

export const ORGANIZATION_TYPES = [
  { value: "COMPANY", label: "Société" },
  { value: "BRANCH", label: "Filiale" },
  { value: "AGENCY", label: "Agence" },
  { value: "SUBSIDIARY", label: "Succursale" },
  { value: "PARTNERSHIP", label: "Partenariat" },
] as const;

export const GOVERNANCE_STATUS_LABELS: Record<OrganizationStatus, string> = {
  PENDING: "En attente",
  APPROVED: "Approuvée",
  REJECTED: "Rejetée",
  SUSPENDED: "Suspendue",
};

export const GOVERNANCE_STATUS_COLORS: Record<OrganizationStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-700 border-yellow-200",
  APPROVED: "bg-green-100 text-green-700 border-green-200",
  REJECTED: "bg-red-100 text-red-700 border-red-200",
  SUSPENDED: "bg-gray-100 text-gray-600 border-gray-200",
};
