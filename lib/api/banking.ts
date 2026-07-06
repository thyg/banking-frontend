// lib/api/banking.ts — API trésorerie connectée au backend iwm-treasury-core
// Tous les chemins sont relatifs à /api/treasury (géré par treasury-client.ts)

import { tGet, tPost, tPut, qs } from "@/lib/api/treasury-client";
import { DEFAULT_ORG_ID } from "@/lib/api-client";

import type {
  Bank, CreateBankRequest, UpdateBankRequest,
  BankCategory, BankCategoryRequest,
  AccountConnectorType, AccountConnectorResponse,
  TransactionType, CreateTransactionTypeRequest,
  AccountType, CreateAccountTypeRequest, UpdateAccountTypeRequest,
  AccountSubType, CreateAccountSubTypeRequest, UpdateAccountSubTypeRequest,
  BankAccount, CreateBankAccountRequest, UpdateBankAccountRequest,
  BankTransaction, CreateBankTransactionRequest,
  Check, CreateCheckRequest,
  BankStatement, CreateBankStatementRequest,
  StatementLine, CreateStatementLineRequest,
  ReconciliationMatch, ReconciliationSummary,
  ReconcileManualRequest,
  BankingStats,
} from "@/types/banking";

// ─── BANKS ───────────────────────────────────────────────────────────────────
// Backend: GET/POST /api/treasury/banks
//          GET      /api/treasury/banks/{id}
//          POST     /api/treasury/banks/{id}/deactivate

export async function getBanks(activeOnly = true): Promise<Bank[]> {
  return tGet<Bank[]>(`/banks${qs({ activeOnly })}`);
}
export async function getBankById(id: string): Promise<Bank | null> {
  return tGet<Bank>(`/banks/${id}`);
}
export async function createBank(data: CreateBankRequest): Promise<Bank> {
  return tPost<Bank>("/banks", data);
}
export async function updateBank(_id: string, _d: UpdateBankRequest): Promise<Bank> {
  throw new Error("La modification d'une banque n'est pas disponible. Utilisez désactiver.");
}
export async function deleteBank(id: string): Promise<void> {
  await tPost(`/banks/${id}/deactivate`, {});
}

// ─── BANK CATEGORIES ─────────────────────────────────────────────────────────
// Backend: GET/POST /api/treasury/bank-categories
//          POST     /api/treasury/bank-categories/{id}/deactivate

export async function getBankCategories(): Promise<BankCategory[]> {
  return tGet<BankCategory[]>("/bank-categories");
}
export async function getBankCategoryById(id: string): Promise<BankCategory> {
  return tGet<BankCategory>(`/bank-categories/${id}`);
}
export async function createBankCategory(data: BankCategoryRequest): Promise<BankCategory> {
  return tPost<BankCategory>("/bank-categories", data);
}
export async function updateBankCategory(_id: string, _d: BankCategoryRequest): Promise<BankCategory> {
  throw new Error("La modification d'une catégorie n'est pas disponible. Utilisez désactiver.");
}
export async function deleteBankCategory(id: string): Promise<void> {
  await tPost(`/bank-categories/${id}/deactivate`, {});
}

// ─── CONNECTOR TYPES (stub) ───────────────────────────────────────────────────

export async function getConnectorTypesByCategory(_catId: string): Promise<AccountConnectorType[]> {
  return [];
}
export async function getConnectorTypeWithFields(_id: string): Promise<AccountConnectorResponse> {
  throw new Error("Les connecteurs ne sont pas disponibles dans cette version.");
}

// ─── TRANSACTION TYPES ───────────────────────────────────────────────────────
// Backend: GET/POST /api/treasury/transaction-types
//          PUT      /api/treasury/transaction-types/{id}
//          POST     /api/treasury/transaction-types/{id}/deactivate

export async function getTransactionTypes(_activeOnly = false): Promise<TransactionType[]> {
  return tGet<TransactionType[]>("/transaction-types");
}
export async function getTransactionTypeById(id: string): Promise<TransactionType> {
  return tGet<TransactionType>(`/transaction-types/${id}`);
}
export async function createTransactionType(data: CreateTransactionTypeRequest): Promise<TransactionType> {
  return tPost<TransactionType>("/transaction-types", data);
}
export async function updateTransactionType(id: string, data: Partial<CreateTransactionTypeRequest>): Promise<TransactionType> {
  return tPut<TransactionType>(`/transaction-types/${id}`, data);
}
export async function deactivateTransactionType(id: string): Promise<TransactionType> {
  return tPost<TransactionType>(`/transaction-types/${id}/deactivate`);
}
export async function activateTransactionType(id: string): Promise<TransactionType> {
  return tPost<TransactionType>(`/transaction-types/${id}/activate`);
}
export async function deleteTransactionType(id: string): Promise<void> {
  await tPost(`/transaction-types/${id}/deactivate`, {});
}

// ─── ACCOUNT TYPES ───────────────────────────────────────────────────────────
// Backend: GET/POST /api/treasury/account-types
//          GET      /api/treasury/account-types/{id}
//          POST     /api/treasury/account-types/sub-types
//          GET      /api/treasury/account-types/{id}/sub-types
//          POST     /api/treasury/account-types/{id}/deactivate

export async function getAccountTypes(_activeOnly = false): Promise<AccountType[]> {
  return tGet<AccountType[]>("/account-types");
}
export async function getAccountTypeById(id: string): Promise<AccountType> {
  return tGet<AccountType>(`/account-types/${id}`);
}
export async function getAccountTypeByCode(_code: string): Promise<AccountType | null> { return null; }
export async function getCheckEmitterTypes(): Promise<AccountType[]> { return getAccountTypes(); }
export async function getCheckReceiverTypes(): Promise<AccountType[]> { return getAccountTypes(); }
export async function getCashEnabledTypes(): Promise<AccountType[]> { return getAccountTypes(); }
export async function getOverdraftEnabledTypes(): Promise<AccountType[]> { return getAccountTypes(); }

export async function createAccountType(data: CreateAccountTypeRequest): Promise<AccountType> {
  return tPost<AccountType>("/account-types", data);
}
export async function updateAccountType(_id: string, _d: UpdateAccountTypeRequest): Promise<AccountType> {
  throw new Error("La modification d'un type de compte n'est pas disponible.");
}
export async function deleteAccountType(id: string): Promise<void> {
  await tPost(`/account-types/${id}/deactivate`, {});
}

export async function getAccountSubTypes(accountTypeId: string): Promise<AccountSubType[]> {
  return tGet<AccountSubType[]>(`/account-types/${accountTypeId}/sub-types`);
}
export async function getAccountSubTypeById(_atId: string, _stId: string): Promise<AccountSubType | null> { return null; }
export async function createAccountSubType(_accountTypeId: string, data: CreateAccountSubTypeRequest): Promise<AccountSubType> {
  return tPost<AccountSubType>("/account-types/sub-types", data);
}
export async function updateAccountSubType(_atId: string, _stId: string, _d: UpdateAccountSubTypeRequest): Promise<AccountSubType> {
  throw new Error("La modification d'un sous-type n'est pas disponible.");
}
export async function deleteAccountSubType(_atId: string, _stId: string): Promise<void> {
  throw new Error("La suppression d'un sous-type n'est pas disponible.");
}

// ─── BANK ACCOUNTS ───────────────────────────────────────────────────────────
// Backend: GET/POST /api/treasury/bank-accounts
//          GET      /api/treasury/bank-accounts/{id}
//          GET      /api/treasury/bank-accounts/{id}/balance

export async function getBankAccounts(_activeOnly = false): Promise<BankAccount[]> {
  return tGet<BankAccount[]>(`/bank-accounts${qs({ organizationId: DEFAULT_ORG_ID || undefined })}`);
}
export async function getBankAccountById(id: string): Promise<BankAccount> {
  return tGet<BankAccount>(`/bank-accounts/${id}`);
}
export async function getBankAccountBalance(id: string): Promise<number> {
  const res = await tGet<{ balance: number }>(`/bank-accounts/${id}/balance`);
  return res?.balance ?? 0;
}
export async function getBankAccountsByBankId(_bankId: string): Promise<BankAccount[]> { return []; }
export async function createBankAccount(data: CreateBankAccountRequest): Promise<BankAccount> {
  return tPost<BankAccount>("/bank-accounts", data);
}
export async function updateBankAccount(_id: string, _d: UpdateBankAccountRequest): Promise<BankAccount> {
  throw new Error("La modification d'un compte bancaire n'est pas disponible dans cette version.");
}
export async function deleteBankAccount(_id: string): Promise<void> {
  throw new Error("La suppression d'un compte bancaire n'est pas disponible dans cette version.");
}

// ─── BANK TRANSACTIONS ───────────────────────────────────────────────────────
// Backend: POST     /api/treasury/transactions
//          POST     /api/treasury/transactions/{id}/validate
//          POST     /api/treasury/transactions/{id}/cancel
//          GET      /api/treasury/bank-accounts/{id}/transactions

export async function getBankTransactions(): Promise<BankTransaction[]> { return []; }
export async function getBankTransactionById(_id: string): Promise<BankTransaction | null> { return null; }
export async function getBankTransactionsByAccountId(accountId: string): Promise<BankTransaction[]> {
  return tGet<BankTransaction[]>(`/bank-accounts/${accountId}/transactions`);
}
export async function getBankTransactionsByStatus(_status: string): Promise<BankTransaction[]> { return []; }
export async function createBankTransaction(data: CreateBankTransactionRequest): Promise<BankTransaction> {
  return tPost<BankTransaction>("/transactions", data);
}
export async function updateBankTransaction(_id: string, _d: unknown): Promise<BankTransaction> {
  throw new Error("La modification d'une transaction n'est pas disponible.");
}
export async function validateBankTransaction(id: string): Promise<BankTransaction> {
  return tPost<BankTransaction>(`/transactions/${id}/validate`);
}
export async function cancelBankTransaction(id: string, reason = "Annulation manuelle"): Promise<BankTransaction> {
  return tPost<BankTransaction>(`/transactions/${id}/cancel`, { reason });
}
export async function deleteBankTransaction(_id: string): Promise<void> {
  throw new Error("La suppression d'une transaction n'est pas disponible.");
}

// ─── CHECKS ──────────────────────────────────────────────────────────────────
// Backend: POST /api/treasury/checks  GET /api/treasury/checks?bankAccountId=
//          GET  /api/treasury/checks/{id}
//          POST /api/treasury/checks/{id}/issue|deposit|cash|reject|cancel

export async function getChecks(): Promise<Check[]> {
  return tGet<Check[]>(`/checks${qs({ organizationId: DEFAULT_ORG_ID || undefined })}`);
}
export async function getCheckById(id: string): Promise<Check> {
  return tGet<Check>(`/checks/${id}`);
}
export async function getChecksByType(_type: string): Promise<Check[]> { return getChecks(); }
export async function getChecksByStatus(_status: string): Promise<Check[]> { return getChecks(); }
export async function getChecksByAccountId(accountId: string): Promise<Check[]> {
  return tGet<Check[]>(`/checks${qs({ bankAccountId: accountId })}`);
}
export async function getPendingChecksDueBefore(_date: string): Promise<Check[]> { return []; }
export async function createCheck(data: CreateCheckRequest): Promise<Check> {
  return tPost<Check>("/checks", data);
}
export async function updateCheck(_id: string, _d: unknown): Promise<Check> {
  throw new Error("La modification d'un chèque n'est pas disponible.");
}
export async function depositCheck(id: string, _depositDate?: string): Promise<Check> {
  return tPost<Check>(`/checks/${id}/deposit`);
}
export async function cashCheck(id: string): Promise<Check> {
  return tPost<Check>(`/checks/${id}/cash`);
}
export async function rejectCheck(id: string, reason: string): Promise<Check> {
  return tPost<Check>(`/checks/${id}/reject`, { reason });
}
export async function cancelCheck(id: string): Promise<Check> {
  return tPost<Check>(`/checks/${id}/cancel`, { reason: "Annulation" });
}
export async function deleteCheck(_id: string): Promise<void> {
  throw new Error("La suppression d'un chèque n'est pas disponible.");
}

// ─── BANK STATEMENTS ─────────────────────────────────────────────────────────
// Backend: GET/POST /api/treasury/statements
//          GET      /api/treasury/statements/{id}
//          POST     /api/treasury/statements/{id}/close

export async function getBankStatements(): Promise<BankStatement[]> {
  return tGet<BankStatement[]>(`/statements${qs({ organizationId: DEFAULT_ORG_ID || undefined })}`);
}
export async function getBankStatementById(id: string): Promise<BankStatement> {
  return tGet<BankStatement>(`/statements/${id}`);
}
export async function getBankStatementsByAccountId(accountId: string): Promise<BankStatement[]> {
  return tGet<BankStatement[]>(`/statements${qs({ bankAccountId: accountId })}`);
}
export async function getBankStatementsByStatus(_status: string): Promise<BankStatement[]> {
  return getBankStatements();
}
export async function createBankStatement(data: CreateBankStatementRequest): Promise<BankStatement> {
  return tPost<BankStatement>("/statements", data);
}
export async function updateBankStatement(_id: string, _d: unknown): Promise<BankStatement> {
  throw new Error("La modification d'un relevé n'est pas disponible.");
}
export async function updateStatementTotals(_id: string): Promise<BankStatement> {
  throw new Error("Le recalcul des totaux n'est pas disponible.");
}
export async function closeBankStatement(id: string): Promise<BankStatement> {
  return tPost<BankStatement>(`/statements/${id}/close`);
}
export async function deleteBankStatement(_id: string): Promise<void> {
  throw new Error("La suppression d'un relevé n'est pas disponible.");
}

// ─── STATEMENT LINES ─────────────────────────────────────────────────────────
// Backend: POST /api/treasury/statements/{id}/lines
//          GET  /api/treasury/statements/{id}/lines
//          POST /api/treasury/statement-lines/{id}/ignore (with body { reason })

export async function getStatementLines(statementId: string): Promise<StatementLine[]> {
  return tGet<StatementLine[]>(`/statements/${statementId}/lines`);
}
export async function getStatementLineById(_id: string): Promise<StatementLine | null> { return null; }
export async function getUnmatchedStatementLines(statementId: string): Promise<StatementLine[]> {
  const lines = await getStatementLines(statementId);
  return lines.filter((l: any) => l.status === "UNRECONCILED" || l.status === "PENDING");
}
export async function getMatchedStatementLines(statementId: string): Promise<StatementLine[]> {
  const lines = await getStatementLines(statementId);
  return lines.filter((l: any) => l.status === "RECONCILED");
}
export async function createStatementLine(_d: CreateStatementLineRequest): Promise<StatementLine> {
  throw new Error("Utilisez createStatementLinesBatch pour importer des lignes.");
}
export async function createStatementLinesBatch(statementId: string, lines: CreateStatementLineRequest[]): Promise<StatementLine[]> {
  return tPost<StatementLine[]>(`/statements/${statementId}/lines`, lines);
}
export async function ignoreStatementLine(id: string, reason = "Ignoré"): Promise<StatementLine> {
  return tPost<StatementLine>(`/statement-lines/${id}/ignore`, { reason });
}
export async function resetStatementLine(_id: string): Promise<StatementLine> {
  throw new Error("La réinitialisation d'une ligne n'est pas disponible.");
}
export async function deleteStatementLine(_id: string): Promise<void> {
  throw new Error("La suppression d'une ligne n'est pas disponible.");
}

// ─── RECONCILIATION ──────────────────────────────────────────────────────────
// Backend: POST /api/treasury/reconciliation/manual-match  (body)
//          POST /api/treasury/reconciliation/auto-match    (?statementId=)
//          POST /api/treasury/reconciliation/unmatch/{id}
//          GET  /api/treasury/reconciliation/summary       (?statementId=)

export async function reconcileManual(data: ReconcileManualRequest): Promise<ReconciliationMatch> {
  return tPost<ReconciliationMatch>("/reconciliation/manual-match", data);
}
export async function reconcileAuto(statementId: string): Promise<unknown> {
  return tPost(`/reconciliation/auto-match${qs({ statementId })}`);
}
export async function unmatch(matchId: string): Promise<void> {
  await tPost(`/reconciliation/unmatch/${matchId}`);
}
export async function getReconciliationSummary(statementId: string): Promise<ReconciliationSummary> {
  return tGet<ReconciliationSummary>(`/reconciliation/summary${qs({ statementId })}`);
}
export async function getMatchesByLineId(_lineId: string): Promise<ReconciliationMatch[]> { return []; }

// ─── BANKING STATS (calculées côté client) ───────────────────────────────────

export async function getBankingStats(): Promise<BankingStats> {
  const [accounts, stmts] = await Promise.all([
    getBankAccounts(),
    getBankStatements().catch(() => []),
  ]);
  const totalBalance = accounts.reduce((s: number, a: any) => s + (a.currentBalance ?? 0), 0);
  return {
    totalBalance,
    totalAccounts: accounts.length,
    activeAccounts: accounts.filter((a: any) => a.isActive).length,
    pendingTransactions: 0,
    pendingChecks: 0,
    unreconciledStatements: stmts.filter((s: any) => s.status === "IN_PROGRESS").length,
    monthlyCredits: 0,
    monthlyDebits: 0,
  };
}
