// lib/api/audit.ts — Journal d'audit (iwm-treasury-core)
// Backend: GET /api/treasury/audit-logs  (?module=&action=&entityId=&from=&to=&page=&size=)

import { tGet, qs } from "@/lib/api/treasury-client";
import type { AuditLog, FilterOption } from "@/types/audit";

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

export async function getAuditLogs(filters?: AuditLogFilters): Promise<AuditLog[]> {
  return tGet<AuditLog[]>(`/audit-logs${qs({ ...filters })}`);
}

export async function getAuditLogsCount(_filters?: AuditLogFilters): Promise<number> {
  const logs = await getAuditLogs(_filters);
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
export async function getAvailableModules(): Promise<FilterOption[]> { return []; }
export async function getAvailableActions(): Promise<FilterOption[]> { return []; }
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
