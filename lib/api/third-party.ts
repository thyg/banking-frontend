import { apiGet } from "@/lib/api-client";

export interface ThirdPartySummary {
  id: string;
  referenceCode: string;
  displayName: string;
  roles: string[];
  active: boolean;
}

export interface ThirdPartySearchParams {
  search?: string;
  role?: string;   // ex: "SUPPLIER", "CUSTOMER"
  active?: boolean;
  page?: number;
  size?: number;
}

export async function searchThirdParties(
  params: ThirdPartySearchParams = {}
): Promise<ThirdPartySummary[]> {
  const p = new URLSearchParams();
  if (params.search)              p.append("search", params.search);
  if (params.role)                p.append("role", params.role);
  if (params.active !== undefined) p.append("active", String(params.active));
  if (params.page !== undefined)  p.append("page", String(params.page));
  if (params.size !== undefined)  p.append("size", String(params.size));
  const qs = p.toString() ? `?${p.toString()}` : "";
  return apiGet<ThirdPartySummary[]>(`/api/third-parties${qs}`);
}
