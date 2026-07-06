// lib/api/audit.ts — Journal d'audit (RT-comops-treasury-core)
// Backend: GET /api/treasury/audit-logs?organizationId=   (organizationId REQUIS, seul filtre serveur)
//          GET /api/treasury/audit-logs/entity?entityId=&entityType=
// Réponse: { id, tenantId, organizationId, module, action, entityType, entityId,
//            userId, newValue, timestamp, requestId, metadata }
// Les filtres UI (module, action, dates, pagination) sont appliqués côté client.

import { tGet, qs, requireOrg } from "@/lib/api/treasury-client";
import type { AuditLog, FilterOption } from "@/types/audit";
import { AUDIT_MODULE_LABELS, AUDIT_ACTION_LABELS, AUDIT_ACTION_SEVERITY } from "@/types/audit";

export type { AuditLog };

export interface AuditLogFilters {
  module?: string;
  action?: string;
  entityId?: string;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}

/** Réponse backend → forme UI (timestamp→createdAt, entityReference, labels). */
function mapAuditLog(r: any): AuditLog {
  const createdAt = r.createdAt ?? r.timestamp ?? "";
  const shortId = typeof r.entityId === "string" ? r.entityId.slice(0, 8) : r.entityId;
  return {
    ...r,
    createdAt,
    entityReference: r.entityReference ?? (r.entityType ? `${r.entityType}#${shortId}` : String(r.entityId ?? "")),
    moduleLabel: (AUDIT_MODULE_LABELS as Record<string, string>)[r.module] ?? r.module,
    actionLabel: (AUDIT_ACTION_LABELS as Record<string, string>)[r.action] ?? r.action,
    actionSeverity: (AUDIT_ACTION_SEVERITY as Record<string, AuditLog["actionSeverity"]>)[r.action] ?? "info",
    userId: r.userId ?? null,
    userName: r.userName ?? r.userId ?? "Système",
    oldValue: r.oldValue ?? null,
    newValue: r.newValue ?? null,
    hasChanges: r.hasChanges ?? !!r.newValue,
    ipAddress: r.ipAddress ?? null,
    userAgent: r.userAgent ?? null,
    description: r.description ?? "",
    formattedDate: r.formattedDate ?? createdAt,
    relativeTime: r.relativeTime ?? "",
  } as AuditLog;
}

function applyClientFilters(logs: AuditLog[], filters?: AuditLogFilters): AuditLog[] {
  if (!filters) return logs;
  let result = logs;
  if (filters.module)   result = result.filter(l => l.module === filters.module);
  if (filters.action)   result = result.filter(l => l.action === filters.action);
  if (filters.entityId) result = result.filter(l => l.entityId === filters.entityId);
  if (filters.from)     result = result.filter(l => l.createdAt >= filters.from!);
  if (filters.to)       result = result.filter(l => l.createdAt <= `${filters.to}T23:59:59`);
  if (filters.page !== undefined && filters.size) {
    result = result.slice(filters.page * filters.size, (filters.page + 1) * filters.size);
  }
  return result;
}

export async function getAuditLogs(filters?: AuditLogFilters): Promise<AuditLog[]> {
  const raw = await tGet<any[]>(`/audit-logs${qs({ organizationId: requireOrg() })}`);
  const logs = (raw ?? [])
    .map(mapAuditLog)
    .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
  return applyClientFilters(logs, filters);
}

export async function getAuditLogsCount(filters?: AuditLogFilters): Promise<number> {
  const { page: _p, size: _s, ...rest } = filters ?? {};
  const logs = await getAuditLogs(rest);
  return logs.length;
}

export async function getAuditLogById(_id: string): Promise<AuditLog | null> { return null; }

export async function getAuditLogsByEntityId(entityId: string): Promise<AuditLog[]> {
  return getAuditLogs({ entityId });
}

export async function getTodayAuditLogs(): Promise<AuditLog[]> {
  const from = new Date().toISOString().split("T")[0];
  return getAuditLogs({ from });
}

export async function getAvailableModules(): Promise<FilterOption[]> {
  return Object.entries(AUDIT_MODULE_LABELS).map(([value, label]) => ({ value, label }));
}
export async function getAvailableActions(): Promise<FilterOption[]> {
  return Object.entries(AUDIT_ACTION_LABELS).map(([value, label]) => ({ value, label }));
}
export const countAuditLogs = getAuditLogsCount;
export const getAuditModules = getAvailableModules;
export const getAuditActions = getAvailableActions;

export function exportToCsv(logs: AuditLog[], filename: string): void {
  const header = "id,module,action,entityReference,entityId,userId,createdAt";
  const rows = logs.map(l =>
    [l.id, l.module, l.action, l.entityReference, l.entityId, l.userId, l.createdAt].join(",")
  );
  const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function exportToJson(logs: AuditLog[], filename: string): void {
  const blob = new Blob([JSON.stringify(logs, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// Utilitaires pour l'affichage des changements (utilisés par journal-detail-modal.tsx)
// Supporte deux signatures :
//   parseChanges(changes)               — depuis AuditLog.changes (format backend)
//   parseChanges(oldValue, newValue)    — depuis AuditLog.oldValue/newValue (format legacy)
export function parseChanges(
  changesOrOld: Record<string, { before: unknown; after: unknown }> | unknown | undefined,
  newValue?: unknown
): { differences: Array<{ field: string; before: unknown; after: unknown }> } {
  if (newValue !== undefined) {
    // Signature (oldValue, newValue) — comparer deux objets
    const oldObj = (typeof changesOrOld === "object" && changesOrOld !== null ? changesOrOld : {}) as Record<string, unknown>;
    const newObj = (typeof newValue === "object" && newValue !== null ? newValue : {}) as Record<string, unknown>;
    const fields = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
    const differences = Array.from(fields)
      .filter(f => JSON.stringify(oldObj[f]) !== JSON.stringify(newObj[f]))
      .map(f => ({ field: f, before: oldObj[f], after: newObj[f] }));
    return { differences };
  }
  // Signature (changes) — format backend { field: { before, after } }
  const changes = changesOrOld as Record<string, { before: unknown; after: unknown }> | undefined;
  if (!changes) return { differences: [] };
  return { differences: Object.entries(changes).map(([field, { before, after }]) => ({ field, before, after })) };
}

export function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Oui" : "Non";
  if (typeof value === "number") return value.toLocaleString("fr-FR");
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

export function translateFieldName(field: string): string {
  const labels: Record<string, string> = {
    amount: "Montant",
    status: "Statut",
    description: "Description",
    transactionDate: "Date",
    direction: "Sens",
    bankAccountId: "Compte",
    referenceCode: "Référence",
    beneficiary: "Bénéficiaire",
    issueDate: "Date d'émission",
    dueDate: "Échéance",
  };
  return labels[field] ?? field;
}
