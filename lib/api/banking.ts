// lib/api/banking.ts - API complète pour le module Banking

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

// ============================================================================
// HELPERS
// ============================================================================

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Une erreur est survenue' }));
    throw new Error(error.message || `Erreur HTTP: ${response.status}`);
  }
  return response.json();
}

function buildUrl(path: string, params?: Record<string, string | number | boolean>): string {
  const url = new URL(`${API_BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
  }
  return url.toString();
}

const headers = {
  'Content-Type': 'application/json',
};

// ============================================================================
// BANKS API
// ============================================================================

import type {
  Bank, CreateBankRequest, UpdateBankRequest,
  TransactionType, CreateTransactionTypeRequest,
  AccountType, CreateAccountTypeRequest, UpdateAccountTypeRequest,
  AccountSubType, CreateAccountSubTypeRequest, UpdateAccountSubTypeRequest,
  BankAccount, CreateBankAccountRequest, UpdateBankAccountRequest,
  BankTransaction, CreateBankTransactionRequest,
  Check, CreateCheckRequest,
  BankStatement, CreateBankStatementRequest,
  StatementLine, CreateStatementLineRequest,
  ReconciliationMatch, ReconciliationSummary,
  ReconcileManualRequest, AutoReconcileRequest,
  BankingStats
} from '@/types/banking';

export async function getBanks(activeOnly = false): Promise<Bank[]> {
  const response = await fetch(buildUrl('/banks', { activeOnly }));
  return handleResponse<Bank[]>(response);
}

export async function getBankById(id: string): Promise<Bank> {
  const response = await fetch(`${API_BASE_URL}/banks/${id}`);
  return handleResponse<Bank>(response);
}

export async function createBank(data: CreateBankRequest): Promise<Bank> {
  const response = await fetch(`${API_BASE_URL}/banks`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  return handleResponse<Bank>(response);
}

export async function updateBank(id: string, data: UpdateBankRequest): Promise<Bank> {
  const response = await fetch(`${API_BASE_URL}/banks/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  });
  return handleResponse<Bank>(response);
}

export async function deleteBank(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/banks/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Échec de la suppression');
}

// ============================================================================
// TRANSACTION TYPES API
// ============================================================================

export async function getTransactionTypes(activeOnly = false): Promise<TransactionType[]> {
  const response = await fetch(buildUrl('/transaction-types', { activeOnly }));
  return handleResponse<TransactionType[]>(response);
}

export async function getTransactionTypeById(id: string): Promise<TransactionType> {
  const response = await fetch(`${API_BASE_URL}/transaction-types/${id}`);
  return handleResponse<TransactionType>(response);
}

export async function createTransactionType(data: CreateTransactionTypeRequest): Promise<TransactionType> {
  const response = await fetch(`${API_BASE_URL}/transaction-types`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  return handleResponse<TransactionType>(response);
}

export async function updateTransactionType(id: string, data: Partial<CreateTransactionTypeRequest>): Promise<TransactionType> {
  const response = await fetch(`${API_BASE_URL}/transaction-types/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  });
  return handleResponse<TransactionType>(response);
}

export async function deleteTransactionType(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/transaction-types/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Échec de la suppression');
}

// ============================================================================
// ACCOUNT TYPES API
// ============================================================================

export async function getAccountTypes(activeOnly = false): Promise<AccountType[]> {
  const response = await fetch(buildUrl('/account-types', { activeOnly }));
  return handleResponse<AccountType[]>(response);
}

export async function getAccountTypeById(id: string, includeSubTypes = false): Promise<AccountType> {
  const response = await fetch(buildUrl(`/account-types/${id}`, { includeSubTypes }));
  return handleResponse<AccountType>(response);
}

export async function getAccountTypeByCode(code: string): Promise<AccountType> {
  const response = await fetch(`${API_BASE_URL}/account-types/code/${code}`);
  return handleResponse<AccountType>(response);
}

export async function getCheckEmitterTypes(): Promise<AccountType[]> {
  const response = await fetch(`${API_BASE_URL}/account-types/check-emitters`);
  return handleResponse<AccountType[]>(response);
}

export async function getCheckReceiverTypes(): Promise<AccountType[]> {
  const response = await fetch(`${API_BASE_URL}/account-types/check-receivers`);
  return handleResponse<AccountType[]>(response);
}

export async function getCashEnabledTypes(): Promise<AccountType[]> {
  const response = await fetch(`${API_BASE_URL}/account-types/cash-enabled`);
  return handleResponse<AccountType[]>(response);
}

export async function getOverdraftEnabledTypes(): Promise<AccountType[]> {
  const response = await fetch(`${API_BASE_URL}/account-types/overdraft-enabled`);
  return handleResponse<AccountType[]>(response);
}

export async function createAccountType(data: CreateAccountTypeRequest): Promise<AccountType> {
  const response = await fetch(`${API_BASE_URL}/account-types`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  return handleResponse<AccountType>(response);
}

export async function updateAccountType(id: string, data: UpdateAccountTypeRequest): Promise<AccountType> {
  const response = await fetch(`${API_BASE_URL}/account-types/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  });
  return handleResponse<AccountType>(response);
}

export async function deleteAccountType(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/account-types/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Échec de la suppression');
}

export async function getAccountSubTypes(accountTypeId: string, activeOnly = false): Promise<AccountSubType[]> {
  const response = await fetch(buildUrl(`/account-types/${accountTypeId}/sub-types`, { activeOnly }));
  return handleResponse<AccountSubType[]>(response);
}

export async function getAccountSubTypeById(accountTypeId: string, subTypeId: string): Promise<AccountSubType> {
  const response = await fetch(`${API_BASE_URL}/account-types/${accountTypeId}/sub-types/${subTypeId}`);
  return handleResponse<AccountSubType>(response);
}

export async function createAccountSubType(accountTypeId: string, data: CreateAccountSubTypeRequest): Promise<AccountSubType> {
  const response = await fetch(`${API_BASE_URL}/account-types/${accountTypeId}/sub-types`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ ...data, accountTypeId }),
  });
  return handleResponse<AccountSubType>(response);
}

export async function updateAccountSubType(accountTypeId: string, subTypeId: string, data: UpdateAccountSubTypeRequest): Promise<AccountSubType> {
  const response = await fetch(`${API_BASE_URL}/account-types/${accountTypeId}/sub-types/${subTypeId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  });
  return handleResponse<AccountSubType>(response);
}

export async function deleteAccountSubType(accountTypeId: string, subTypeId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/account-types/${accountTypeId}/sub-types/${subTypeId}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Échec de la suppression du sous-type');
}

// ============================================================================
// BANK ACCOUNTS API
// ============================================================================

export async function getBankAccounts(activeOnly = false): Promise<BankAccount[]> {
  const response = await fetch(buildUrl('/bank-accounts', { activeOnly }));
  return handleResponse<BankAccount[]>(response);
}

export async function getBankAccountById(id: string): Promise<BankAccount> {
  const response = await fetch(`${API_BASE_URL}/bank-accounts/${id}`);
  return handleResponse<BankAccount>(response);
}

export async function getBankAccountsByBankId(bankId: string): Promise<BankAccount[]> {
  const response = await fetch(`${API_BASE_URL}/bank-accounts/bank/${bankId}`);
  return handleResponse<BankAccount[]>(response);
}

export async function createBankAccount(data: CreateBankAccountRequest): Promise<BankAccount> {
  const response = await fetch(`${API_BASE_URL}/bank-accounts`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  return handleResponse<BankAccount>(response);
}

export async function updateBankAccount(id: string, data: UpdateBankAccountRequest): Promise<BankAccount> {
  const response = await fetch(`${API_BASE_URL}/bank-accounts/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  });
  return handleResponse<BankAccount>(response);
}

export async function deleteBankAccount(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/bank-accounts/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Échec de la suppression');
}

// ============================================================================
// BANK TRANSACTIONS API
// ============================================================================

export async function getBankTransactions(): Promise<BankTransaction[]> {
  const response = await fetch(`${API_BASE_URL}/bank-transactions`);
  return handleResponse<BankTransaction[]>(response);
}

export async function getBankTransactionById(id: string): Promise<BankTransaction> {
  const response = await fetch(`${API_BASE_URL}/bank-transactions/${id}`);
  return handleResponse<BankTransaction>(response);
}

export async function getBankTransactionsByAccountId(accountId: string): Promise<BankTransaction[]> {
  const response = await fetch(`${API_BASE_URL}/bank-transactions/account/${accountId}`);
  return handleResponse<BankTransaction[]>(response);
}

export async function getBankTransactionsByStatus(status: string): Promise<BankTransaction[]> {
  const response = await fetch(`${API_BASE_URL}/bank-transactions/status/${status}`);
  return handleResponse<BankTransaction[]>(response);
}

export async function createBankTransaction(data: CreateBankTransactionRequest): Promise<BankTransaction> {
  const response = await fetch(`${API_BASE_URL}/bank-transactions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  return handleResponse<BankTransaction>(response);
}

export async function updateBankTransaction(id: string, data: Partial<CreateBankTransactionRequest>): Promise<BankTransaction> {
  const response = await fetch(`${API_BASE_URL}/bank-transactions/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  });
  return handleResponse<BankTransaction>(response);
}

export async function validateBankTransaction(id: string): Promise<BankTransaction> {
  const response = await fetch(`${API_BASE_URL}/bank-transactions/${id}/validate`, { method: 'POST' });
  return handleResponse<BankTransaction>(response);
}

export async function cancelBankTransaction(id: string): Promise<BankTransaction> {
  const response = await fetch(`${API_BASE_URL}/bank-transactions/${id}/cancel`, { method: 'POST' });
  return handleResponse<BankTransaction>(response);
}

export async function deleteBankTransaction(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/bank-transactions/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Échec de la suppression');
}

// ============================================================================
// CHECKS API
// ============================================================================

export async function getChecks(): Promise<Check[]> {
  const response = await fetch(`${API_BASE_URL}/checks`);
  return handleResponse<Check[]>(response);
}

export async function getCheckById(id: string): Promise<Check> {
  const response = await fetch(`${API_BASE_URL}/checks/${id}`);
  return handleResponse<Check>(response);
}

export async function getChecksByType(checkType: string): Promise<Check[]> {
  const response = await fetch(`${API_BASE_URL}/checks/type/${checkType}`);
  return handleResponse<Check[]>(response);
}

export async function getChecksByStatus(status: string): Promise<Check[]> {
  const response = await fetch(`${API_BASE_URL}/checks/status/${status}`);
  return handleResponse<Check[]>(response);
}

export async function getChecksByAccountId(accountId: string): Promise<Check[]> {
  const response = await fetch(`${API_BASE_URL}/checks/account/${accountId}`);
  return handleResponse<Check[]>(response);
}

export async function getPendingChecksDueBefore(date: string): Promise<Check[]> {
  const response = await fetch(buildUrl('/checks/pending/due-before', { date }));
  return handleResponse<Check[]>(response);
}

export async function createCheck(data: CreateCheckRequest): Promise<Check> {
  const response = await fetch(`${API_BASE_URL}/checks`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  return handleResponse<Check>(response);
}

export async function updateCheck(id: string, data: Partial<CreateCheckRequest>): Promise<Check> {
  const response = await fetch(`${API_BASE_URL}/checks/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  });
  return handleResponse<Check>(response);
}

export async function depositCheck(id: string, depositDate: string): Promise<Check> {
  const response = await fetch(buildUrl(`/checks/${id}/deposit`, { depositDate }), { method: 'POST' });
  return handleResponse<Check>(response);
}

export async function cashCheck(id: string, cashedDate: string): Promise<Check> {
  const response = await fetch(buildUrl(`/checks/${id}/cash`, { cashedDate }), { method: 'POST' });
  return handleResponse<Check>(response);
}

export async function rejectCheck(id: string, reason: string): Promise<Check> {
  const response = await fetch(buildUrl(`/checks/${id}/reject`, { reason }), { method: 'POST' });
  return handleResponse<Check>(response);
}

export async function cancelCheck(id: string): Promise<Check> {
  const response = await fetch(`${API_BASE_URL}/checks/${id}/cancel`, { method: 'POST' });
  return handleResponse<Check>(response);
}

export async function deleteCheck(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/checks/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Échec de la suppression');
}

// ============================================================================
// BANK STATEMENTS API
// ============================================================================

export async function getBankStatements(): Promise<BankStatement[]> {
  const response = await fetch(`${API_BASE_URL}/bank-statements`);
  return handleResponse<BankStatement[]>(response);
}

export async function getBankStatementById(id: string): Promise<BankStatement> {
  const response = await fetch(`${API_BASE_URL}/bank-statements/${id}`);
  return handleResponse<BankStatement>(response);
}

export async function getBankStatementsByAccountId(accountId: string): Promise<BankStatement[]> {
  const response = await fetch(`${API_BASE_URL}/bank-statements/account/${accountId}`);
  return handleResponse<BankStatement[]>(response);
}

export async function getBankStatementsByStatus(status: string): Promise<BankStatement[]> {
  const response = await fetch(`${API_BASE_URL}/bank-statements/status/${status}`);
  return handleResponse<BankStatement[]>(response);
}

export async function createBankStatement(data: CreateBankStatementRequest): Promise<BankStatement> {
  const response = await fetch(`${API_BASE_URL}/bank-statements`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  return handleResponse<BankStatement>(response);
}

export async function updateBankStatement(id: string, data: Partial<CreateBankStatementRequest>): Promise<BankStatement> {
  const response = await fetch(`${API_BASE_URL}/bank-statements/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  });
  return handleResponse<BankStatement>(response);
}

export async function updateStatementTotals(id: string): Promise<BankStatement> {
  const response = await fetch(`${API_BASE_URL}/bank-statements/${id}/update-totals`, { method: 'POST' });
  return handleResponse<BankStatement>(response);
}

export async function closeBankStatement(id: string): Promise<BankStatement> {
  const response = await fetch(`${API_BASE_URL}/bank-statements/${id}/close`, { method: 'POST' });
  return handleResponse<BankStatement>(response);
}

export async function deleteBankStatement(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/bank-statements/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Échec de la suppression');
}

// ============================================================================
// STATEMENT LINES API
// ============================================================================

export async function getStatementLines(statementId: string): Promise<StatementLine[]> {
  const response = await fetch(`${API_BASE_URL}/statement-lines/statement/${statementId}`);
  return handleResponse<StatementLine[]>(response);
}

export async function getStatementLineById(id: string): Promise<StatementLine> {
  const response = await fetch(`${API_BASE_URL}/statement-lines/${id}`);
  return handleResponse<StatementLine>(response);
}

export async function getUnmatchedStatementLines(statementId: string): Promise<StatementLine[]> {
  const response = await fetch(`${API_BASE_URL}/statement-lines/statement/${statementId}/unmatched`);
  return handleResponse<StatementLine[]>(response);
}

export async function getMatchedStatementLines(statementId: string): Promise<StatementLine[]> {
  const response = await fetch(`${API_BASE_URL}/statement-lines/statement/${statementId}/matched`);
  return handleResponse<StatementLine[]>(response);
}

export async function createStatementLine(data: CreateStatementLineRequest): Promise<StatementLine> {
  const response = await fetch(`${API_BASE_URL}/statement-lines`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  return handleResponse<StatementLine>(response);
}

export async function createStatementLinesBatch(statementId: string, lines: CreateStatementLineRequest[]): Promise<StatementLine[]> {
  const response = await fetch(`${API_BASE_URL}/statement-lines/statement/${statementId}/batch`, {
    method: 'POST',
    headers,
    body: JSON.stringify(lines),
  });
  return handleResponse<StatementLine[]>(response);
}

export async function ignoreStatementLine(id: string): Promise<StatementLine> {
  const response = await fetch(`${API_BASE_URL}/statement-lines/${id}/ignore`, { method: 'POST' });
  return handleResponse<StatementLine>(response);
}

export async function resetStatementLine(id: string): Promise<StatementLine> {
  const response = await fetch(`${API_BASE_URL}/statement-lines/${id}/reset`, { method: 'POST' });
  return handleResponse<StatementLine>(response);
}

export async function deleteStatementLine(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/statement-lines/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Échec de la suppression');
}

// ============================================================================
// RECONCILIATION API
// ============================================================================

export async function reconcileManual(data: ReconcileManualRequest): Promise<ReconciliationMatch> {
  const response = await fetch(`${API_BASE_URL}/reconciliation/manual`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  return handleResponse<ReconciliationMatch>(response);
}

export async function reconcileAuto(data: AutoReconcileRequest): Promise<ReconciliationMatch[]> {
  const response = await fetch(`${API_BASE_URL}/reconciliation/auto`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  return handleResponse<ReconciliationMatch[]>(response);
}

export async function unmatch(matchId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/reconciliation/match/${matchId}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Échec de l\'annulation');
}

export async function getReconciliationSummary(statementId: string): Promise<ReconciliationSummary> {
  const response = await fetch(`${API_BASE_URL}/reconciliation/summary/${statementId}`);
  return handleResponse<ReconciliationSummary>(response);
}

export async function getMatchesByLineId(lineId: string): Promise<ReconciliationMatch[]> {
  const response = await fetch(`${API_BASE_URL}/reconciliation/matches/line/${lineId}`);
  return handleResponse<ReconciliationMatch[]>(response);
}

// ============================================================================
// DASHBOARD STATS API (calculs côté client pour l'instant)
// ============================================================================

export async function getBankingStats(): Promise<BankingStats> {
  const [accounts, transactions, checks, statements] = await Promise.all([
    getBankAccounts(),
    getBankTransactionsByStatus('DRAFT'),
    getChecksByStatus('PENDING'),
    getBankStatementsByStatus('IN_PROGRESS'),
  ]);

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.currentBalance, 0);
  const activeAccounts = accounts.filter(acc => acc.isActive).length;

  return {
    totalBalance,
    totalAccounts: accounts.length,
    activeAccounts,
    pendingTransactions: transactions.length,
    pendingChecks: checks.length,
    unreconciledStatements: statements.length,
    monthlyCredits: 0, // À calculer avec une requête dédiée
    monthlyDebits: 0,  // À calculer avec une requête dédiée
  };
}