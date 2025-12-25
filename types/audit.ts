/**
 * @file types/audit.ts
 * @description Types TypeScript pour le Journal des Opérations (Audit Log)
 * @version 1.0.0 - Incrément 5
 */

// =============================================================================
// ENUMS
// =============================================================================

/**
 * Modules auditables du système de trésorerie.
 */
export type AuditModule =
  | 'BANK'
  | 'BANK_ACCOUNT'
  | 'TRANSACTION_TYPE'
  | 'BANK_TRANSACTION'
  | 'CHECK'
  | 'CHECKBOOK'
  | 'BANK_STATEMENT'
  | 'STATEMENT_LINE'
  | 'RECONCILIATION';

/**
 * Labels des modules en français.
 */
export const AUDIT_MODULE_LABELS: Record<AuditModule, string> = {
  BANK: 'Banques',
  BANK_ACCOUNT: 'Comptes bancaires',
  TRANSACTION_TYPE: 'Types de transactions',
  BANK_TRANSACTION: 'Transactions bancaires',
  CHECK: 'Chèques',
  CHECKBOOK: 'Chéquiers',
  BANK_STATEMENT: 'Relevés bancaires',
  STATEMENT_LINE: 'Lignes de relevés',
  RECONCILIATION: 'Rapprochement',
};

/**
 * Actions auditables.
 */
export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'VIEW'
  | 'ACTIVATE'
  | 'DEACTIVATE'
  | 'VALIDATE'
  | 'CANCEL'
  | 'DEPOSIT'
  | 'CASH'
  | 'REJECT'
  | 'IMPORT'
  | 'CLOSE'
  | 'MANUAL_MATCH'
  | 'AUTO_MATCH'
  | 'UNMATCH'
  | 'IGNORE'
  | 'RESET';

/**
 * Labels des actions en français.
 */
export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  CREATE: 'Création',
  UPDATE: 'Modification',
  DELETE: 'Suppression',
  VIEW: 'Consultation',
  ACTIVATE: 'Activation',
  DEACTIVATE: 'Désactivation',
  VALIDATE: 'Validation',
  CANCEL: 'Annulation',
  DEPOSIT: 'Remise en banque',
  CASH: 'Encaissement',
  REJECT: 'Rejet',
  IMPORT: 'Import',
  CLOSE: 'Clôture',
  MANUAL_MATCH: 'Rapprochement manuel',
  AUTO_MATCH: 'Rapprochement auto',
  UNMATCH: 'Dé-rapprochement',
  IGNORE: 'Ignorer',
  RESET: 'Réinitialiser',
};

/**
 * Sévérité des actions (pour les badges de couleur).
 */
export type ActionSeverity = 'success' | 'warning' | 'danger' | 'info' | 'secondary';

export const AUDIT_ACTION_SEVERITY: Record<AuditAction, ActionSeverity> = {
  CREATE: 'success',
  UPDATE: 'warning',
  DELETE: 'danger',
  VIEW: 'info',
  ACTIVATE: 'success',
  DEACTIVATE: 'warning',
  VALIDATE: 'success',
  CANCEL: 'danger',
  DEPOSIT: 'info',
  CASH: 'success',
  REJECT: 'danger',
  IMPORT: 'info',
  CLOSE: 'success',
  MANUAL_MATCH: 'success',
  AUTO_MATCH: 'success',
  UNMATCH: 'warning',
  IGNORE: 'secondary',
  RESET: 'info',
};

// =============================================================================
// INTERFACES
// =============================================================================

/**
 * Réponse d'une entrée du journal d'audit.
 */
export interface AuditLog {
  id: string;
  
  // Module & Action
  module: AuditModule;
  moduleLabel: string;
  action: AuditAction;
  actionLabel: string;
  actionSeverity: ActionSeverity;
  
  // Entité concernée
  entityId: string;
  entityReference: string;
  
  // Utilisateur
  userId: string | null;
  userName: string;
  
  // Changements (JSON stringifié)
  oldValue: string | null;
  newValue: string | null;
  hasChanges: boolean;
  
  // Contexte
  ipAddress: string | null;
  userAgent: string | null;
  description: string;
  
  // Timestamp
  createdAt: string;
  formattedDate: string;
  relativeTime: string;
}

/**
 * Filtres pour la recherche de logs.
 */
export interface AuditLogFilters {
  module?: AuditModule;
  action?: AuditAction;
  entityId?: string;
  entityReference?: string;
  userId?: string;
  userName?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  size?: number;
}

/**
 * Réponse paginée.
 */
export interface AuditLogPage {
  content: AuditLog[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

/**
 * Option pour les dropdowns de filtres.
 */
export interface FilterOption {
  value: string;
  label: string;
  severity?: ActionSeverity;
}

/**
 * Changements parsés (pour l'affichage du diff).
 */
export interface ParsedChanges {
  field: string;
  oldValue: string | number | boolean | null;
  newValue: string | number | boolean | null;
}

/**
 * Statistiques du journal.
 */
export interface AuditStats {
  totalEntries: number;
  todayEntries: number;
  entriesByModule: Record<AuditModule, number>;
  entriesByAction: Record<AuditAction, number>;
}