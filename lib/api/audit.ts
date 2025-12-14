/**
 * @file lib/api/audit.ts
 * @description API client pour le Journal des Opérations
 * @version 1.0.0 - Incrément 5
 */

import type {
  AuditLog,
  AuditLogFilters,
  FilterOption,
} from '@/types/audit';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Gère la réponse HTTP et parse le JSON.
 * @throws Error si la réponse n'est pas OK
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Une erreur est survenue' }));
    throw new Error(error.message || `Erreur HTTP: ${response.status}`);
  }
  return response.json();
}

/**
 * Construit la query string à partir des filtres.
 */
function buildQueryString(filters: AuditLogFilters): string {
  const params = new URLSearchParams();
  
  if (filters.module) params.append('module', filters.module);
  if (filters.action) params.append('action', filters.action);
  if (filters.entityId) params.append('entityId', filters.entityId);
  if (filters.entityReference) params.append('entityReference', filters.entityReference);
  if (filters.userId) params.append('userId', filters.userId);
  if (filters.userName) params.append('userName', filters.userName);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.search) params.append('search', filters.search);
  if (filters.page !== undefined) params.append('page', String(filters.page));
  if (filters.size !== undefined) params.append('size', String(filters.size));
  
  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

// =============================================================================
// AUDIT LOG API
// =============================================================================

/**
 * Récupère les logs d'audit avec filtres.
 */
export async function getAuditLogs(filters: AuditLogFilters = {}): Promise<AuditLog[]> {
  const queryString = buildQueryString(filters);
  const response = await fetch(`${API_BASE_URL}/audit-logs${queryString}`);
  return handleResponse<AuditLog[]>(response);
}

/**
 * Compte les logs d'audit avec filtres.
 */
export async function countAuditLogs(filters: AuditLogFilters = {}): Promise<number> {
  const queryString = buildQueryString(filters);
  const response = await fetch(`${API_BASE_URL}/audit-logs/count${queryString}`);
  const result = await handleResponse<{ total: number }>(response);
  return result.total;
}

/**
 * Récupère un log d'audit par son ID.
 */
export async function getAuditLogById(id: string): Promise<AuditLog> {
  const response = await fetch(`${API_BASE_URL}/audit-logs/${id}`);
  return handleResponse<AuditLog>(response);
}

/**
 * Récupère l'historique d'audit pour une entité.
 */
export async function getEntityAuditHistory(entityId: string): Promise<AuditLog[]> {
  const response = await fetch(`${API_BASE_URL}/audit-logs/entity/${entityId}`);
  return handleResponse<AuditLog[]>(response);
}

/**
 * Récupère les logs d'audit d'aujourd'hui.
 */
export async function getTodayAuditLogs(): Promise<AuditLog[]> {
  const response = await fetch(`${API_BASE_URL}/audit-logs/today`);
  return handleResponse<AuditLog[]>(response);
}

// =============================================================================
// METADATA API
// =============================================================================

/**
 * Récupère la liste des modules disponibles.
 */
export async function getAuditModules(): Promise<FilterOption[]> {
  const response = await fetch(`${API_BASE_URL}/audit-logs/modules`);
  return handleResponse<FilterOption[]>(response);
}

/**
 * Récupère la liste des actions disponibles.
 */
export async function getAuditActions(): Promise<FilterOption[]> {
  const response = await fetch(`${API_BASE_URL}/audit-logs/actions`);
  return handleResponse<FilterOption[]>(response);
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Parse le JSON des changements pour affichage.
 */
export function parseChanges(oldValue: string | null, newValue: string | null): {
  oldParsed: Record<string, unknown> | null;
  newParsed: Record<string, unknown> | null;
  differences: Array<{ field: string; old: unknown; new: unknown }>;
} {
  let oldParsed: Record<string, unknown> | null = null;
  let newParsed: Record<string, unknown> | null = null;
  
  try {
    oldParsed = oldValue ? JSON.parse(oldValue) : null;
  } catch {
    console.warn('[parseChanges] Failed to parse oldValue');
  }
  
  try {
    newParsed = newValue ? JSON.parse(newValue) : null;
  } catch {
    console.warn('[parseChanges] Failed to parse newValue');
  }
  
  const differences: Array<{ field: string; old: unknown; new: unknown }> = [];
  
  if (oldParsed && newParsed) {
    // Trouver les champs modifiés
    const allKeys = new Set([...Object.keys(oldParsed), ...Object.keys(newParsed)]);
    allKeys.forEach(key => {
      // Ignorer certains champs techniques
      if (['createdAt', 'updatedAt', 'isNew'].includes(key)) return;
      
      const oldVal = oldParsed![key];
      const newVal = newParsed![key];
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        differences.push({ field: key, old: oldVal, new: newVal });
      }
    });
  } else if (newParsed) {
    // Création: tous les champs sont nouveaux
    Object.entries(newParsed).forEach(([key, value]) => {
      if (['createdAt', 'updatedAt', 'isNew'].includes(key)) return;
      differences.push({ field: key, old: null, new: value });
    });
  } else if (oldParsed) {
    // Suppression: tous les champs sont supprimés
    Object.entries(oldParsed).forEach(([key, value]) => {
      if (['createdAt', 'updatedAt', 'isNew'].includes(key)) return;
      differences.push({ field: key, old: value, new: null });
    });
  }
  
  return { oldParsed, newParsed, differences };
}

/**
 * Formate une valeur pour l'affichage.
 */
export function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '(vide)';
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

/**
 * Traduit un nom de champ en français.
 */
export function translateFieldName(field: string): string {
  const translations: Record<string, string> = {
    id: 'ID',
    reference: 'Référence',
    name: 'Nom',
    code: 'Code',
    label: 'Libellé',
    description: 'Description',
    amount: 'Montant',
    direction: 'Direction',
    status: 'Statut',
    isActive: 'Actif',
    isReconciled: 'Rapproché',
    transactionDate: 'Date transaction',
    valueDate: 'Date valeur',
    checkNumber: 'N° chèque',
    checkType: 'Type chèque',
    partnerName: 'Partenaire',
    bankAccountId: 'Compte bancaire',
    transactionTypeId: 'Type transaction',
    swiftCode: 'Code SWIFT',
    country: 'Pays',
    accountNumber: 'N° compte',
    iban: 'IBAN',
    bic: 'BIC',
    currency: 'Devise',
    currentBalance: 'Solde actuel',
    initialBalance: 'Solde initial',
    issueDate: 'Date émission',
    dueDate: 'Date échéance',
    depositDate: 'Date remise',
    cashedDate: 'Date encaissement',
    rejectionReason: 'Motif rejet',
  };
  return translations[field] || field;
}

/**
 * Exporte les logs en CSV.
 */
export function exportToCsv(logs: AuditLog[], filename: string = 'journal-operations.csv'): void {
  const headers = [
    'Date',
    'Module',
    'Action',
    'Référence',
    'Utilisateur',
    'Description',
  ];
  
  const rows = logs.map(log => [
    log.formattedDate,
    log.moduleLabel,
    log.actionLabel,
    log.entityReference || log.entityId,
    log.userName,
    log.description,
  ]);
  
  // Encoder en CSV avec séparateur point-virgule (pour Excel français)
  const csvContent = [
    headers.join(';'),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';')),
  ].join('\n');
  
  // Ajouter BOM UTF-8 pour Excel
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  
  // Cleanup
  URL.revokeObjectURL(link.href);
}

/**
 * Exporte les logs en JSON.
 */
export function exportToJson(logs: AuditLog[], filename: string = 'journal-operations.json'): void {
  const jsonContent = JSON.stringify(logs, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  
  // Cleanup
  URL.revokeObjectURL(link.href);
}