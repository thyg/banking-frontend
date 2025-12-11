/**
 * @file types/banking.ts
 * @description Types pour le module Tresorerie - Complet Increment 4.
 * 
 * @version 4.2.0 - Fix: Ajout category a TransactionType
 */

// =============================================================================
// TYPES DE BASE
// =============================================================================

export type Currency = 'EUR' | 'USD' | 'XAF' | 'XOF' | 'GBP';

export type TransactionDirection = 'CREDIT' | 'DEBIT' | 'BOTH';

export type TransactionStatus = 'DRAFT' | 'VALIDATED' | 'CANCELLED';

export type TransactionCategory = 'BANK' | 'CASH' | 'CHECK' | 'OTHER';

export type CheckType = 'ISSUED' | 'RECEIVED';

export type CheckStatus = 'PENDING' | 'DEPOSITED' | 'CASHED' | 'REJECTED' | 'CANCELLED';

export type StatementStatus = 'DRAFT' | 'PARTIAL' | 'RECONCILED';

export type ReconciliationTargetType = 'transaction' | 'check' | 'invoice' | 'bill' | 'manual';

// =============================================================================
// PARAMETRAGE - BANQUES
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

export interface CreateBankData {
  code: string;
  name: string;
  swiftCode?: string;
  country?: string;
  isActive: boolean;
}

export interface UpdateBankData extends Partial<CreateBankData> {}

// =============================================================================
// PARAMETRAGE - TYPES DE TRANSACTIONS
// =============================================================================

export interface TransactionType {
  id: string;
  code: string;
  label: string;
  direction: TransactionDirection;
  category: TransactionCategory;  // <-- AJOUTE pour compatibilite avec vos formulaires
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTransactionTypeData {
  code: string;
  label: string;
  direction: TransactionDirection;
  category: TransactionCategory;  // <-- AJOUTE
  description?: string;
  isActive: boolean;
}

export interface UpdateTransactionTypeData extends Partial<CreateTransactionTypeData> {}

// =============================================================================
// COMPTES BANCAIRES
// =============================================================================

export interface BankAccount {
  id: string;
  name: string;
  bankId: string;
  bankName: string;
  accountNumber: string;
  iban?: string;
  bic?: string;
  currency: Currency;
  currentBalance: number;
  reconciledBalance: number;
  lastReconciledDate?: string;
  isActive: boolean;
  journalId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBankAccountData {
  name: string;
  bankId: string;
  accountNumber: string;
  iban?: string;
  bic?: string;
  currency: Currency;
  isActive: boolean;
  journalId?: string;
}

export interface UpdateBankAccountData extends Partial<CreateBankAccountData> {}

// =============================================================================
// TRANSACTIONS BANCAIRES
// =============================================================================

export interface BankTransaction {
  id: string;
  bankAccountId: string;
  bankAccountName?: string;
  transactionTypeId: string;
  transactionTypeCode?: string;
  transactionTypeLabel?: string;
  transactionDate: string;
  valueDate?: string;
  reference?: string;
  label: string;
  amount: number;
  direction: 'CREDIT' | 'DEBIT';
  currency: Currency;
  partnerName?: string;
  notes?: string;
  status: TransactionStatus;
  isReconciled: boolean;
  reconciledStatementLineId?: string;
  reconciledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBankTransactionData {
  bankAccountId: string;
  transactionTypeId: string;
  transactionDate: string;
  valueDate?: string;
  reference?: string;
  label: string;
  amount: number;
  direction: 'CREDIT' | 'DEBIT';
  currency: Currency;
  partnerName?: string;
  notes?: string;
  status: TransactionStatus;
}

export interface UpdateBankTransactionData extends Partial<Omit<CreateBankTransactionData, 'bankAccountId'>> {}

export interface BankTransactionFilters {
  bankAccountId?: string;
  transactionTypeId?: string;
  direction?: 'CREDIT' | 'DEBIT';
  status?: TransactionStatus;
  dateFrom?: string;
  dateTo?: string;
  isReconciled?: boolean;
  search?: string;
}

// =============================================================================
// CHEQUES
// =============================================================================

export interface Check {
  id: string;
  type: CheckType;
  checkNumber: string;
  bankAccountId: string;
  bankAccountName?: string;
  issueDate: string;
  dueDate?: string;
  amount: number;
  currency: Currency;
  partnerName: string;
  description?: string;
  status: CheckStatus;
  depositDate?: string;
  cashedDate?: string;
  rejectedDate?: string;
  rejectionReason?: string;
  linkedTransactionId?: string;
  isReconciled?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCheckData {
  type: CheckType;
  checkNumber: string;
  bankAccountId: string;
  issueDate: string;
  dueDate?: string;
  amount: number;
  currency: Currency;
  partnerName: string;
  description?: string;
}

export interface UpdateCheckData extends Partial<Omit<CreateCheckData, 'type' | 'bankAccountId'>> {}

export interface CheckFilters {
  bankAccountId?: string;
  type?: CheckType;
  status?: CheckStatus;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

// =============================================================================
// RELEVES BANCAIRES (INCREMENT 4)
// =============================================================================

export interface BankStatement {
  id: string;
  bankAccountId: string;
  bankAccountName?: string;
  name: string;
  fileName?: string;
  date: string;
  periodStart: string;
  periodEnd: string;
  startBalance: number;
  endBalance: number;
  lineCount: number;
  reconciledCount: number;
  status: StatementStatus;
  importedAt: string;
  reconciledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BankStatementLine {
  id: string;
  statementId: string;
  bankAccountId: string;
  lineNumber: number;
  date: string;
  valueDate?: string;
  label: string;
  reference?: string;
  partnerName?: string;
  amount: number;
  direction: 'CREDIT' | 'DEBIT';
  currency: Currency;
  balance?: number;
  isReconciled: boolean;
  reconciledWithId?: string;
  reconciledWithType?: ReconciliationTargetType;
  reconciledAt?: string;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// RAPPROCHEMENT (INCREMENT 4)
// =============================================================================

/**
 * Detail du calcul du score de correspondance.
 */
export interface MatchScoreDetails {
  amountScore: number;
  dateScore: number;
  labelScore: number;
  partnerScore: number;
  reasons: string[];
}

/**
 * Suggestion de rapprochement unifiee.
 */
export interface ReconciliationSuggestion {
  id: string;
  type: ReconciliationTargetType;
  reference: string;
  partnerName: string;
  amount: number;
  date: string;
  matchScore: number;
  matchDetails: MatchScoreDetails;
  amountDifference?: number;
  originalData?: BankTransaction | Check | Invoice | Bill;
}

/**
 * Options pour la recherche de correspondances.
 */
export interface ReconciliationSearchOptions {
  amountTolerance?: number;
  dateTolerance?: number;
  minScore?: number;
  maxSuggestions?: number;
  targetTypes?: ReconciliationTargetType[];
}

/**
 * Resultat d'un rapprochement en lot.
 */
export interface BulkReconciliationResult {
  success: boolean;
  totalProcessed: number;
  reconciled: number;
  skipped: number;
  errors: number;
  details: Array<{
    lineId: string;
    status: 'reconciled' | 'skipped' | 'error';
    reason?: string;
  }>;
}

/**
 * Statistiques de rapprochement.
 */
export interface ReconciliationStats {
  totalLines: number;
  reconciledLines: number;
  pendingLines: number;
  percentage: number;
  totalCredits?: number;
  totalDebits?: number;
}

// =============================================================================
// FACTURES (PLACEHOLDER POUR RAPPROCHEMENT)
// =============================================================================

export interface Invoice {
  id: string;
  reference: string;
  partnerName: string;
  partnerId: string;
  date: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  currency: Currency;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'PARTIAL' | 'CANCELLED';
}

export interface Bill {
  id: string;
  reference: string;
  partnerName: string;
  partnerId: string;
  date: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  currency: Currency;
  status: 'DRAFT' | 'RECEIVED' | 'PAID' | 'PARTIAL' | 'CANCELLED';
}

// =============================================================================
// TYPES POUR IMPORT RELEVES (pour lib/api/statement.ts)
// =============================================================================

/**
 * Structure d'un releve parse depuis un fichier CSV/OFX.
 */
export interface ParsedStatement {
  bankAccountId: string;
  name: string;
  fileName: string;
  periodStart: string;
  periodEnd: string;
  startBalance: number;
  endBalance: number;
  lines: ParsedStatementLine[];
}

/**
 * Structure d'une ligne de releve parsee.
 */
export interface ParsedStatementLine {
  date: string;
  valueDate?: string;
  label: string;
  reference?: string;
  amount: number;
  balance?: number;
}