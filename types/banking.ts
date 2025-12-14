// =============================================================================
// types/banking.ts - Version corrigée avec tous les types nécessaires
// =============================================================================
// RT-ComOps ERP - Module Trésorerie
// Types TypeScript pour le frontend
// @version 2.1.0 - Fix: Ajout des types manquants (CreateTransactionTypeData, etc.)
// @author RT-ComOps Team
// @since 2024-12-12
// =============================================================================

// =============================================================================
// ENUMS ET CONSTANTES
// =============================================================================

export type TransactionDirection = 'CREDIT' | 'DEBIT' | 'BOTH';
export type TransactionCategory = 'BANK' | 'CASH' | 'CHECK' | 'OTHER';
export type TransactionStatus = 'DRAFT' | 'VALIDATED' | 'CANCELLED';
export type CheckType = 'ISSUED' | 'RECEIVED';
export type CheckStatus = 'PENDING' | 'DEPOSITED' | 'CASHED' | 'REJECTED' | 'CANCELLED';
export type StatementStatus = 'IMPORTED' | 'IN_PROGRESS' | 'RECONCILED' | 'CLOSED';
export type ReconciliationStatus = 'UNMATCHED' | 'MATCHED' | 'PARTIALLY_MATCHED' | 'IGNORED';
export type MatchType = 'TRANSACTION' | 'CHECK' | 'MULTIPLE' | 'PARTIAL';
export type MatchMethod = 'AUTO_EXACT' | 'AUTO_FUZZY' | 'MANUAL' | 'RULE_BASED';

// =============================================================================
// ENTITÉS PRINCIPALES
// =============================================================================

export interface Bank {
  id: string;
  code: string;
  name: string;
  swiftCode?: string;
  country?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionType {
  id: string;
  code: string;
  label: string;
  direction: TransactionDirection;
  category: TransactionCategory;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BankAccount {
  id: string;
  bankId: string;
  bankName?: string;
  name: string;
  accountNumber: string;
  iban?: string;
  bic?: string;
  currency: string;
  currentBalance: number;
  reconciledBalance: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BankTransaction {
  id: string;
  bankAccountId: string;
  bankAccountName?: string;
  transactionTypeId: string;
  transactionTypeCode?: string;
  transactionTypeLabel?: string;
  reference?: string;
  transactionDate: string;
  valueDate?: string;
  amount: number;
  direction: TransactionDirection;
  description?: string;
  partnerName?: string;
  status: TransactionStatus;
  isReconciled: boolean;
  reconciledAt?: string;
  statementLineId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Check {
  id: string;
  bankAccountId: string;
  bankAccountName?: string;
  checkType: CheckType;
  checkNumber: string;
  amount: number;
  currency?: string;
  partnerName: string;
  partnerId?: string;
  issueDate: string;
  dueDate?: string;
  depositDate?: string;
  cashedDate?: string;
  rejectedDate?: string;
  status: CheckStatus;
  description?: string;
  rejectionReason?: string;
  bankTransactionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BankStatement {
  id: string;
  bankAccountId: string;
  bankAccountName?: string;
  name?: string;
  reference?: string;
  statementDate: string;
  periodStart: string;
  periodEnd: string;
  openingBalance: number;
  closingBalance: number;
  totalCredits: number;
  totalDebits: number;
  lineCount: number;
  reconciledCount: number;
  reconciliationProgress?: number;
  status: StatementStatus;
  importSource?: string;
  fileName?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StatementLine {
  id: string;
  bankStatementId: string;
  lineNumber: number;
  transactionDate: string;
  valueDate?: string;
  amount: number;
  direction: TransactionDirection;
  reference?: string;
  description?: string;
  partnerName?: string;
  partnerAccount?: string;
  balanceAfter?: number;
  reconciliationStatus: ReconciliationStatus;
  isReconciled?: boolean;
  reconciledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReconciliationMatch {
  id: string;
  statementLineId: string;
  bankTransactionId?: string;
  bankTransactionReference?: string;
  checkId?: string;
  checkNumber?: string;
  matchType: MatchType;
  matchMethod: MatchMethod;
  matchedAmount: number;
  confidenceScore?: number;
  notes?: string;
  matchedBy?: string;
  createdAt: string;
}

export interface ReconciliationSummary {
  bankStatementId: string;
  bankAccountName: string;
  totalLines: number;
  matchedLines: number;
  unmatchedLines: number;
  ignoredLines: number;
  progressPercentage: number;
  totalCredits: number;
  totalDebits: number;
  matchedCredits: number;
  matchedDebits: number;
  unmatchedCredits: number;
  unmatchedDebits: number;
  openingBalance: number;
  closingBalance: number;
  calculatedBalance: number;
  balanceDifference: number;
  status: StatementStatus;
}

// =============================================================================
// TYPES POUR LE RAPPROCHEMENT
// =============================================================================

export interface ReconciliationSuggestion {
  id: string;
  type: 'TRANSACTION' | 'CHECK';
  reference: string;
  label: string;
  amount: number;
  date: string;
  direction: TransactionDirection;
  partnerName?: string;
  confidenceScore: number;
  matchReasons: string[];
}

export interface ReconciliationStats {
  totalLines: number;
  reconciledLines: number;
  pendingLines: number;
  percentage: number;
  totalAmount?: number;
  reconciledAmount?: number;
  pendingAmount?: number;
}

export interface ReconciliationSearchOptions {
  matchByAmount?: boolean;
  matchByReference?: boolean;
  matchByDate?: boolean;
  dateToleranceDays?: number;
  amountTolerance?: number;
  minimumConfidenceScore?: number;
}

export interface BulkReconciliationResult {
  success: boolean;
  totalProcessed: number;
  reconciled: number;
  skipped: number;
  errors: number;
  details: Array<{
    lineId: string;
    status: 'reconciled' | 'skipped' | 'error';
    matchedWith?: string;
    reason?: string;
  }>;
}

// =============================================================================
// ALIAS DE COMPATIBILITÉ
// Ces types sont fournis pour assurer la compatibilité avec l'ancien code
// =============================================================================

/**
 * @deprecated Utilisez StatementLine à la place
 */
export type BankStatementLine = StatementLine;

/**
 * @deprecated Utilisez ReconciliationStatus à la place
 */
export type ReconciliationTargetType = 'TRANSACTION' | 'CHECK';

/**
 * @deprecated Utilisez TransactionDirection à la place
 */
export type LineDirection = TransactionDirection;

// =============================================================================
// DTOs POUR LES REQUÊTES (Backend)
// =============================================================================

export interface CreateBankRequest {
  code: string;
  name: string;
  swiftCode?: string;
  country?: string;
  isActive?: boolean;
}

export interface UpdateBankRequest {
  code?: string;
  name?: string;
  swiftCode?: string;
  country?: string;
  isActive?: boolean;
}

export interface CreateTransactionTypeRequest {
  code: string;
  label: string;
  direction: TransactionDirection;
  category: TransactionCategory;
  description?: string;
  isActive?: boolean;
}

export interface UpdateTransactionTypeRequest {
  code?: string;
  label?: string;
  direction?: TransactionDirection;
  category?: TransactionCategory;
  description?: string;
  isActive?: boolean;
}

// =============================================================================
// ALIAS POUR COMPATIBILITÉ FRONTEND
// Ces types sont utilisés par les formulaires et composants
// =============================================================================

/**
 * Alias pour CreateTransactionTypeRequest - utilisé par transaction-type-form.tsx
 */
export type CreateTransactionTypeData = CreateTransactionTypeRequest;

/**
 * Alias pour CreateBankRequest - utilisé par bank-form.tsx
 */
export type CreateBankData = CreateBankRequest;

/**
 * Alias pour UpdateBankRequest
 */
export type UpdateBankData = UpdateBankRequest;

// =============================================================================
// DTOs BANK ACCOUNTS
// =============================================================================

export interface CreateBankAccountRequest {
  bankId: string;
  name: string;
  accountNumber: string;
  iban?: string;
  bic?: string;
  currency?: string;
  initialBalance?: number;
  isActive?: boolean;
}

export interface UpdateBankAccountRequest {
  bankId?: string;
  name?: string;
  accountNumber?: string;
  iban?: string;
  bic?: string;
  currency?: string;
  isActive?: boolean;
}

export type CreateBankAccountData = CreateBankAccountRequest;
export type UpdateBankAccountData = UpdateBankAccountRequest;

// =============================================================================
// DTOs BANK TRANSACTIONS
// =============================================================================

export interface CreateBankTransactionRequest {
  bankAccountId: string;
  transactionTypeId: string;
  reference?: string;
  transactionDate: string;
  valueDate?: string;
  amount: number;
  direction: TransactionDirection;
  description?: string;
  partnerName?: string;
}

export interface UpdateBankTransactionRequest {
  bankAccountId?: string;
  transactionTypeId?: string;
  reference?: string;
  transactionDate?: string;
  valueDate?: string;
  amount?: number;
  direction?: TransactionDirection;
  description?: string;
  partnerName?: string;
  status?: TransactionStatus;
}

export type CreateBankTransactionData = CreateBankTransactionRequest;
export type UpdateBankTransactionData = UpdateBankTransactionRequest;

// =============================================================================
// DTOs CHECKS
// =============================================================================

export interface CreateCheckRequest {
  bankAccountId: string;
  checkType: CheckType;
  checkNumber: string;
  amount: number;
  currency?: string;
  partnerName: string;
  partnerId?: string;
  issueDate: string;
  dueDate?: string;
  description?: string;
}

export interface UpdateCheckRequest {
  bankAccountId?: string;
  checkType?: CheckType;
  checkNumber?: string;
  amount?: number;
  partnerName?: string;
  issueDate?: string;
  dueDate?: string;
  depositDate?: string;
  cashedDate?: string;
  status?: CheckStatus;
  description?: string;
  rejectionReason?: string;
}

/**
 * Alias pour CreateCheckRequest - utilisé par check-form.tsx
 */
export type CreateCheckData = CreateCheckRequest;

/**
 * Alias pour UpdateCheckRequest
 */
export type UpdateCheckData = UpdateCheckRequest;

// =============================================================================
// DTOs BANK STATEMENTS
// =============================================================================

export interface CreateBankStatementRequest {
  bankAccountId: string;
  reference?: string;
  statementDate: string;
  periodStart: string;
  periodEnd: string;
  openingBalance: number;
  closingBalance: number;
  importSource?: string;
  fileName?: string;
  notes?: string;
}

export interface UpdateBankStatementRequest {
  reference?: string;
  statementDate?: string;
  periodStart?: string;
  periodEnd?: string;
  openingBalance?: number;
  closingBalance?: number;
  status?: StatementStatus;
  notes?: string;
}

// =============================================================================
// DTOs STATEMENT LINES
// =============================================================================

export interface CreateStatementLineRequest {
  bankStatementId: string;
  lineNumber?: number;
  transactionDate: string;
  valueDate?: string;
  amount: number;
  direction: TransactionDirection;
  reference?: string;
  description?: string;
  partnerName?: string;
  partnerAccount?: string;
  balanceAfter?: number;
  rawData?: string;
}

// =============================================================================
// DTOs RECONCILIATION
// =============================================================================

export interface ReconcileManualRequest {
  statementLineId: string;
  bankTransactionId?: string;
  checkId?: string;
  matchedAmount?: number;
  notes?: string;
  matchedBy?: string;
}

export interface AutoReconcileRequest {
  bankStatementId: string;
  matchByAmount?: boolean;
  matchByReference?: boolean;
  matchByDate?: boolean;
  dateToleranceDays?: number;
  amountTolerance?: number;
  minimumConfidenceScore?: number;
}

// =============================================================================
// TYPES POUR LE DASHBOARD
// =============================================================================

export interface BankingStats {
  totalBalance: number;
  totalAccounts: number;
  activeAccounts: number;
  pendingTransactions: number;
  pendingChecks: number;
  unreconciledStatements: number;
  monthlyCredits: number;
  monthlyDebits: number;
}

export interface BankingAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  title: string;
  message: string;
  link?: string;
  createdAt: string;
}

// =============================================================================
// TYPES POUR LES FILTRES ET RECHERCHE
// =============================================================================

export interface BankAccountFilters {
  bankId?: string;
  isActive?: boolean;
  currency?: string;
  search?: string;
}

export interface TransactionFilters {
  bankAccountId?: string;
  transactionTypeId?: string;
  status?: TransactionStatus;
  direction?: TransactionDirection;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  isReconciled?: boolean;
  search?: string;
}

export interface CheckFilters {
  bankAccountId?: string;
  checkType?: CheckType;
  type?: CheckType; // Alias pour compatibilité
  status?: CheckStatus;
  startDate?: string;
  endDate?: string;
  dateFrom?: string;  // Alias
  dateTo?: string;    // Alias
  minAmount?: number;
  maxAmount?: number;
  search?: string;
}

export interface StatementFilters {
  bankAccountId?: string;
  status?: StatementStatus;
  startDate?: string;
  endDate?: string;
}

// =============================================================================
// TYPES POUR LA PAGINATION
// =============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// =============================================================================
// TYPES POUR L'IMPORT DE RELEVÉS
// =============================================================================

export interface StatementImportResult {
  success: boolean;
  statement?: BankStatement;
  linesImported: number;
  errors: string[];
  warnings: string[];
}

export interface StatementImportOptions {
  format: 'CSV' | 'OFX' | 'MT940' | 'CAMT053';
  dateFormat?: string;
  delimiter?: string;
  encoding?: string;
  skipHeader?: boolean;
  columnMapping?: Record<string, string>;
}

// =============================================================================
// TYPES POUR LES RAPPORTS
// =============================================================================

export interface AccountBalanceReport {
  accountId: string;
  accountName: string;
  bankName: string;
  currency: string;
  openingBalance: number;
  closingBalance: number;
  totalCredits: number;
  totalDebits: number;
  transactionCount: number;
  period: {
    start: string;
    end: string;
  };
}

export interface CashFlowReport {
  period: {
    start: string;
    end: string;
  };
  inflows: {
    total: number;
    byCategory: Record<string, number>;
    byAccount: Record<string, number>;
  };
  outflows: {
    total: number;
    byCategory: Record<string, number>;
    byAccount: Record<string, number>;
  };
  netFlow: number;
}