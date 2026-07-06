// lib/api/check.ts — Chèques (RT-comops-treasury-core)
// Backend: GET/POST /api/treasury/checks  (?organizationId= requis, &bankAccountId=)
//          GET      /api/treasury/checks/{id}
//          POST     /api/treasury/checks/{id}/issue|deposit|cash|reject|cancel
// Notes: reject et cancel attendent un body JSON { reason: string } ;
//        deposit exige ?depositId= (remise existante) ;
//        la création exige organizationId dans le body (RegisterCheckPaymentRequest).

import { tGet, tPost, qs, requireOrg, withOrg } from "@/lib/api/treasury-client";
import type { Check, CheckType, CheckStatus, CreateCheckData } from "@/types/banking";

export interface UpdateCheckData extends Partial<CreateCheckData> {}
export interface CheckFilters {
  bankAccountId?: string;
  checkbookId?: string;
  type?: CheckType;
  status?: CheckStatus | CheckStatus[];
  dateFrom?: string;
  startDate?: string;
  dateTo?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
}
export interface CheckStats {
  totalChecks: number;
  totalAmount: number;
  pendingCount: number;
  pendingAmount: number;
  issuedCount: number;
  issuedAmount: number;
  cashedCount: number;
  cashedAmount: number;
  rejectedCount: number;
  rejectedAmount: number;
  overdueCount: number;
  overdueAmount: number;
  totalIssuedTypeCount: number;
  totalIssuedTypeAmount: number;
  totalReceivedTypeCount: number;
  totalReceivedTypeAmount: number;
  receivedCount: number;
  receivedAmount: number;
  depositedCount: number;
  depositedAmount: number;
  inProgressCount: number;
  inProgressAmount: number;
}

function applyClientFilters(checks: Check[], filters?: CheckFilters): Check[] {
  if (!filters) return checks;
  let result = [...checks];

  if (filters.type) result = result.filter(c => c.checkType === filters.type);

  const statuses = filters.status
    ? (Array.isArray(filters.status) ? filters.status : [filters.status])
    : null;
  if (statuses?.length) result = result.filter(c => statuses.includes(c.status));

  if (filters.dateFrom || filters.startDate) {
    const d = filters.dateFrom ?? filters.startDate!;
    result = result.filter(c => c.issueDate >= d);
  }
  if (filters.dateTo || filters.endDate) {
    const d = filters.dateTo ?? filters.endDate!;
    result = result.filter(c => c.issueDate <= d);
  }
  if (filters.minAmount !== undefined) result = result.filter(c => c.amount >= filters.minAmount!);
  if (filters.maxAmount !== undefined) result = result.filter(c => c.amount <= filters.maxAmount!);
  if (filters.search) {
    const s = filters.search.toLowerCase();
    result = result.filter(c =>
      c.checkNumber?.toLowerCase().includes(s) ||
      c.partnerName?.toLowerCase().includes(s) ||
      c.description?.toLowerCase().includes(s)
    );
  }
  return result;
}

export async function getChecks(filters?: CheckFilters): Promise<Check[]> {
  const params: Record<string, string | undefined> = { organizationId: requireOrg() };
  if (filters?.bankAccountId) params.bankAccountId = filters.bankAccountId;
  if (filters?.checkbookId)   params.checkbookId   = filters.checkbookId;

  const checks = await tGet<Check[]>(`/checks${qs(params)}`);
  return applyClientFilters(checks, filters).sort(
    (a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()
  );
}

export async function getCheckById(id: string): Promise<Check | null> {
  try { return await tGet<Check>(`/checks/${id}`); } catch { return null; }
}

export async function getChecksByType(type: CheckType): Promise<Check[]> {
  return getChecks({ type });
}

export async function getChecksByStatus(status: CheckStatus): Promise<Check[]> {
  return getChecks({ status });
}

export async function getChecksByAccountId(accountId: string): Promise<Check[]> {
  return getChecks({ bankAccountId: accountId });
}

export async function getPendingChecksDueBefore(_date: string): Promise<Check[]> { return []; }
export async function getOverdueChecks(): Promise<Check[]> { return []; }
export async function getPendingChecks(_type?: CheckType, limit = 10): Promise<Check[]> {
  const checks = await getChecks({ status: "PENDING" });
  return checks.slice(0, limit);
}

export async function createCheck(data: CreateCheckData): Promise<Check> {
  const payload: Record<string, unknown> = withOrg({ ...data });
  if (!payload.checkbookId) delete payload.checkbookId;
  if (!payload.dueDate)     delete payload.dueDate;
  if (!payload.description) delete payload.description;
  return tPost<Check>("/checks", payload);
}

export async function updateCheck(_id: string, _data: UpdateCheckData): Promise<Check> {
  throw new Error("La modification d'un chèque n'est pas disponible.");
}

export async function deleteCheck(_id: string): Promise<void> {
  throw new Error("La suppression d'un chèque n'est pas disponible.");
}

export async function emitCheck(id: string): Promise<Check> {
  return tPost<Check>(`/checks/${id}/issue`);
}

export async function markReceivedCheck(id: string): Promise<Check> {
  return tPost<Check>(`/checks/${id}/issue`);
}

export async function depositCheck(id: string, depositIdOrDate?: string): Promise<Check> {
  // Le backend exige un depositId (?depositId=) : un chèque se remet via une remise.
  // Compat : la page Chèques passe historiquement une date en 2e argument.
  const isUuid = !!depositIdOrDate && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(depositIdOrDate);
  if (isUuid) {
    return tPost<Check>(`/checks/${id}/deposit${qs({ depositId: depositIdOrDate })}`);
  }

  // Pas de remise fournie : on crée une remise pour ce seul chèque, on l'y ajoute
  // puis on la soumet (submit passe le chèque à DEPOSITED côté backend).
  const check = await getCheckById(id);
  if (!check) throw new Error("Chèque introuvable.");
  const depositDate = depositIdOrDate || new Date().toISOString().split("T")[0];
  const deposit = await tPost<{ id: string }>("/check-deposits", withOrg({
    bankAccountId: check.bankAccountId,
    reference: `REM-${depositDate.replace(/-/g, "")}-${check.checkNumber || id.slice(0, 6)}`,
    depositDate,
  }));
  await tPost(`/check-deposits/${deposit.id}/checks`, { checkId: id, amount: check.amount });
  await tPost(`/check-deposits/${deposit.id}/submit`);
  return (await getCheckById(id)) ?? check;
}

export async function cashCheck(id: string, _cashDate?: string): Promise<Check> {
  return tPost<Check>(`/checks/${id}/cash`);
}

export async function rejectCheck(id: string, reason = "Rejet", _rejectDate?: string): Promise<Check> {
  return tPost<Check>(`/checks/${id}/reject`, { reason });
}

export async function cancelCheck(id: string): Promise<Check> {
  return tPost<Check>(`/checks/${id}/cancel`, { reason: "Annulation" });
}

export async function markProcessingCheck(_id: string): Promise<Check> {
  throw new Error("Action non disponible dans cette version.");
}

export async function markPaidCheck(id: string): Promise<Check> {
  return cashCheck(id);
}

export async function getCheckStats(): Promise<CheckStats> {
  const checks = await getChecks();
  const sum = (arr: Check[]) => arr.reduce((s, c) => s + c.amount, 0);
  const byStatus = (s: CheckStatus) => checks.filter(c => c.status === s);
  const issued   = checks.filter(c => c.checkType === "ISSUED");
  const received = checks.filter(c => c.checkType === "RECEIVED");
  return {
    totalChecks: checks.length,
    totalAmount: sum(checks),
    pendingCount:    byStatus("PENDING").length,    pendingAmount:    sum(byStatus("PENDING")),
    issuedCount:     byStatus("ISSUED").length,     issuedAmount:     sum(byStatus("ISSUED")),
    cashedCount:     byStatus("CASHED").length,     cashedAmount:     sum(byStatus("CASHED")),
    rejectedCount:   byStatus("REJECTED").length,   rejectedAmount:   sum(byStatus("REJECTED")),
    receivedCount:   byStatus("RECEIVED").length,   receivedAmount:   sum(byStatus("RECEIVED")),
    depositedCount:  byStatus("DEPOSITED").length,  depositedAmount:  sum(byStatus("DEPOSITED")),
    inProgressCount: byStatus("IN_PROGRESS").length,inProgressAmount: sum(byStatus("IN_PROGRESS")),
    overdueCount: 0, overdueAmount: 0,
    totalIssuedTypeCount:    issued.length,   totalIssuedTypeAmount:    sum(issued),
    totalReceivedTypeCount:  received.length, totalReceivedTypeAmount:  sum(received),
  };
}
