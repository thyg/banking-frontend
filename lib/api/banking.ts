// lib/api/banking.ts — API trésorerie connectée au backend RT-comops-treasury-core
// Tous les chemins sont relatifs à /api/treasury (géré par treasury-client.ts).
//
// Conventions backend (contrat "legacy" rétabli, cf. RAPPORT_ANALYSE_BANKING/) :
//  - organizationId requis en query des GET de liste et dans les bodies de création
//  - comptes : { organizationId, bankName, accountNumber, iban, currency }
//  - relevés : { organizationId, bankAccountId, statementNumber?, statementDate, openingBalance, closingBalance }
//  - lignes  : { lines: [{ operationDate, valueDate?, label, amount, direction, referenceCode? }] }
//  - lignes de relevé : reconciliationStatus ∈ UNMATCHED | MATCHED | IGNORED
//  - statut relevé : OPEN | CLOSED — statut compte : ACTIVE | ...

import { tGet, tPost, tPut, qs, requireOrg, withOrg } from "@/lib/api/treasury-client";
import {
  mapBankTransaction,
  createBankTransaction as createBankTransactionCore,
  validateBankTransaction as validateBankTransactionCore,
  cancelBankTransaction as cancelBankTransactionCore,
} from "@/lib/api/bank-transaction";

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

// ─── MAPPERS DE LECTURE (réponse backend → forme attendue par l'UI) ──────────

export function mapBankAccount(r: any): BankAccount {
  return {
    ...r,
    name: r.name ?? r.bankName ?? r.accountNumber ?? "Compte",
    bankName: r.bankName,
    bankId: r.bankId ?? r.bankThirdPartyId ?? "",
    isActive: r.isActive ?? (r.status ? r.status === "ACTIVE" : true),
    currentBalance: r.currentBalance ?? 0,
    reconciledBalance: r.reconciledBalance ?? 0,
    currency: r.currency ?? "XAF",
    createdAt: r.createdAt ?? "",
    updatedAt: r.updatedAt ?? "",
  } as BankAccount;
}

export function mapStatement(r: any): BankStatement {
  return {
    ...r,
    reference: r.reference ?? r.statementNumber,
    name: r.name ?? r.statementNumber,
    statementDate: r.statementDate,
    periodStart: r.periodStart ?? r.statementDate,
    periodEnd: r.periodEnd ?? r.statementDate,
    status: r.status === "OPEN" ? "IN_PROGRESS" : r.status,
    totalCredits: r.totalCredits ?? 0,
    totalDebits: r.totalDebits ?? 0,
    lineCount: r.lineCount ?? 0,
    reconciledCount: r.reconciledCount ?? 0,
    createdAt: r.createdAt ?? r.statementDate,
    updatedAt: r.updatedAt ?? r.statementDate,
  } as BankStatement;
}

export function mapStatementLine(r: any): StatementLine {
  return {
    ...r,
    bankStatementId: r.bankStatementId ?? r.statementId,
    label: r.label ?? r.description,
    date: r.date ?? r.transactionDate,
    isReconciled: r.isReconciled ?? r.reconciliationStatus === "MATCHED",
  } as StatementLine;
}

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

// ─── CONNECTOR TYPES ─────────────────────────────────────────────────────────
// Backend: GET /api/treasury/account-connectors
//          GET /api/treasury/account-connectors/{connectorTypeId}/fields
// La réponse backend ne porte pas bankCategoryId : on renvoie tous les types actifs.

export async function getConnectorTypesByCategory(catId: string): Promise<AccountConnectorType[]> {
  try {
    const types = await tGet<any[]>("/account-connectors");
    return (types ?? [])
      .filter(t => t.active !== false)
      .map(t => ({ id: t.id, code: t.code, name: t.name, bankCategoryId: catId }));
  } catch {
    return [];
  }
}
export async function getConnectorTypeWithFields(id: string): Promise<AccountConnectorResponse> {
  const [types, fields] = await Promise.all([
    tGet<any[]>("/account-connectors"),
    tGet<any[]>(`/account-connectors/${id}/fields`),
  ]);
  const t = (types ?? []).find(x => x.id === id);
  if (!t) throw new Error("Type de connecteur introuvable.");
  return {
    connectorType: { id: t.id, code: t.code, name: t.name, bankCategoryId: "" },
    fields: (fields ?? []).map(f => ({
      id: f.id,
      connectorTypeId: f.connectorTypeId,
      fieldKey: f.fieldKey ?? f.fieldName,
      label: f.label ?? f.fieldLabel,
      fieldType: f.fieldType,
      isRequired: f.isRequired ?? f.required ?? false,
      displayOrder: f.displayOrder ?? 0,
    })),
  };
}

// ─── TRANSACTION TYPES ───────────────────────────────────────────────────────

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
// La réponse backend expose `active` ; l'UI lit `isActive`.

function mapAccountType<T extends { isActive?: boolean }>(r: any): T {
  return { ...r, isActive: r.isActive ?? r.active ?? true } as T;
}

export async function getAccountTypes(_activeOnly = false): Promise<AccountType[]> {
  const types = await tGet<any[]>("/account-types");
  return (types ?? []).map(r => mapAccountType<AccountType>(r));
}
export async function getAccountTypeById(id: string): Promise<AccountType> {
  return mapAccountType<AccountType>(await tGet<any>(`/account-types/${id}`));
}
export async function getAccountTypeByCode(_code: string): Promise<AccountType | null> { return null; }
export async function getCheckEmitterTypes(): Promise<AccountType[]> { return getAccountTypes(); }
export async function getCheckReceiverTypes(): Promise<AccountType[]> { return getAccountTypes(); }
export async function getCashEnabledTypes(): Promise<AccountType[]> { return getAccountTypes(); }
export async function getOverdraftEnabledTypes(): Promise<AccountType[]> { return getAccountTypes(); }

export async function createAccountType(data: CreateAccountTypeRequest): Promise<AccountType> {
  return mapAccountType<AccountType>(await tPost<any>("/account-types", data));
}
export async function updateAccountType(_id: string, _d: UpdateAccountTypeRequest): Promise<AccountType> {
  throw new Error("La modification d'un type de compte n'est pas disponible.");
}
export async function deleteAccountType(id: string): Promise<void> {
  await tPost(`/account-types/${id}/deactivate`, {});
}

export async function getAccountSubTypes(accountTypeId: string): Promise<AccountSubType[]> {
  const subTypes = await tGet<any[]>(`/account-types/${accountTypeId}/sub-types`);
  return (subTypes ?? []).map(r => mapAccountType<AccountSubType>(r));
}
export async function getAccountSubTypeById(_atId: string, _stId: string): Promise<AccountSubType | null> { return null; }
export async function createAccountSubType(accountTypeId: string, data: CreateAccountSubTypeRequest): Promise<AccountSubType> {
  // Le backend exige accountTypeId dans le body (RegisterAccountSubTypeRequest).
  return mapAccountType<AccountSubType>(
    await tPost<any>("/account-types/sub-types", { ...data, accountTypeId })
  );
}
export async function updateAccountSubType(_atId: string, _stId: string, _d: UpdateAccountSubTypeRequest): Promise<AccountSubType> {
  throw new Error("La modification d'un sous-type n'est pas disponible.");
}
export async function deleteAccountSubType(_atId: string, _stId: string): Promise<void> {
  throw new Error("La suppression d'un sous-type n'est pas disponible.");
}

// ─── BANK ACCOUNTS ───────────────────────────────────────────────────────────
// Backend: GET/POST /api/treasury/bank-accounts   (organizationId requis)
//          GET      /api/treasury/bank-accounts/{id}
//          GET      /api/treasury/bank-accounts/{id}/balance
// La réponse de liste ne contient pas le solde : on le complète via /balance.

export async function getBankAccounts(_activeOnly = false): Promise<BankAccount[]> {
  const raw = await tGet<any[]>(`/bank-accounts${qs({ organizationId: requireOrg() })}`);
  const accounts = (raw ?? []).map(mapBankAccount);
  await Promise.all(accounts.map(async (a) => {
    try {
      const res = await tGet<{ balance: number }>(`/bank-accounts/${a.id}/balance`);
      a.currentBalance = res?.balance ?? 0;
    } catch { /* solde indisponible : on laisse 0 */ }
  }));
  return accounts;
}
export async function getBankAccountById(id: string): Promise<BankAccount> {
  const account = mapBankAccount(await tGet<any>(`/bank-accounts/${id}`));
  try {
    const res = await tGet<{ balance: number }>(`/bank-accounts/${id}/balance`);
    account.currentBalance = res?.balance ?? 0;
  } catch { /* solde indisponible */ }
  return account;
}
export async function getBankAccountBalance(id: string): Promise<number> {
  const res = await tGet<{ balance: number }>(`/bank-accounts/${id}/balance`);
  return res?.balance ?? 0;
}
export async function getBankAccountsByBankId(_bankId: string): Promise<BankAccount[]> { return []; }

export async function createBankAccount(data: CreateBankAccountRequest): Promise<BankAccount> {
  // Backend: { organizationId, bankName, accountNumber, iban, currency }.
  // L'UI fournit bankId : on résout le nom de la banque.
  let bankName = (data as any).bankName as string | undefined;
  if (!bankName && data.bankId) {
    try { bankName = (await getBankById(data.bankId))?.name; } catch { /* banque introuvable */ }
  }
  const iban = data.generatedIban || data.iban || "";
  const accountNumber =
    data.accountNumber ||
    (data.details?.phoneNumber as string | undefined) ||
    iban ||
    data.name;
  const payload = {
    organizationId: requireOrg(),
    bankName: bankName || data.name,
    accountNumber,
    iban: iban || accountNumber,
    currency: data.currency || "XAF",
  };
  return mapBankAccount(await tPost<any>("/bank-accounts", payload));
}
export async function updateBankAccount(_id: string, _d: UpdateBankAccountRequest): Promise<BankAccount> {
  throw new Error("La modification d'un compte bancaire n'est pas disponible dans cette version.");
}
export async function deleteBankAccount(_id: string): Promise<void> {
  throw new Error("La suppression d'un compte bancaire n'est pas disponible dans cette version.");
}

// ─── BANK TRANSACTIONS ───────────────────────────────────────────────────────
// Implémentation unique dans lib/api/bank-transaction.ts (montant signé, code du type).

export async function getBankTransactions(): Promise<BankTransaction[]> { return []; }
export async function getBankTransactionById(id: string): Promise<BankTransaction | null> {
  try { return mapBankTransaction(await tGet<any>(`/transactions/${id}`)); } catch { return null; }
}
export async function getBankTransactionsByAccountId(accountId: string): Promise<BankTransaction[]> {
  const txns = await tGet<any[]>(`/bank-accounts/${accountId}/transactions`);
  return (txns ?? []).map(mapBankTransaction);
}
export async function getBankTransactionsByStatus(_status: string): Promise<BankTransaction[]> { return []; }
export async function createBankTransaction(data: CreateBankTransactionRequest): Promise<BankTransaction> {
  return createBankTransactionCore(data);
}
export async function updateBankTransaction(_id: string, _d: unknown): Promise<BankTransaction> {
  throw new Error("La modification d'une transaction n'est pas disponible.");
}
export async function validateBankTransaction(id: string): Promise<BankTransaction> {
  return validateBankTransactionCore(id);
}
export async function cancelBankTransaction(id: string, reason = "Annulation manuelle"): Promise<BankTransaction> {
  return cancelBankTransactionCore(id, reason);
}
export async function deleteBankTransaction(_id: string): Promise<void> {
  throw new Error("La suppression d'une transaction n'est pas disponible.");
}

// ─── CHECKS ──────────────────────────────────────────────────────────────────
// Backend: GET /api/treasury/checks (organizationId requis, bankAccountId optionnel)
//          POST /api/treasury/checks (organizationId requis dans le body)
//          POST /api/treasury/checks/{id}/issue|deposit|cash|reject|cancel
//          (deposit exige ?depositId= — utiliser le flux Remises)

export async function getChecks(): Promise<Check[]> {
  return tGet<Check[]>(`/checks${qs({ organizationId: requireOrg() })}`);
}
export async function getCheckById(id: string): Promise<Check> {
  return tGet<Check>(`/checks/${id}`);
}
export async function getChecksByType(_type: string): Promise<Check[]> { return getChecks(); }
export async function getChecksByStatus(_status: string): Promise<Check[]> { return getChecks(); }
export async function getChecksByAccountId(accountId: string): Promise<Check[]> {
  return tGet<Check[]>(`/checks${qs({ organizationId: requireOrg(), bankAccountId: accountId })}`);
}
export async function getPendingChecksDueBefore(_date: string): Promise<Check[]> { return []; }
export async function createCheck(data: CreateCheckRequest): Promise<Check> {
  return tPost<Check>("/checks", withOrg(data));
}
export async function updateCheck(_id: string, _d: unknown): Promise<Check> {
  throw new Error("La modification d'un chèque n'est pas disponible.");
}
export async function depositCheck(id: string, depositId?: string): Promise<Check> {
  if (!depositId) {
    throw new Error("La remise d'un chèque exige une remise (depositId). Utilisez le flux Remises de chèques.");
  }
  return tPost<Check>(`/checks/${id}/deposit${qs({ depositId })}`);
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
// Backend: GET/POST /api/treasury/statements (organizationId requis)
//          GET      /api/treasury/statements/{id}
//          POST     /api/treasury/statements/{id}/close

export async function getBankStatements(): Promise<BankStatement[]> {
  const raw = await tGet<any[]>(`/statements${qs({ organizationId: requireOrg() })}`);
  return (raw ?? []).map(mapStatement);
}
export async function getBankStatementById(id: string): Promise<BankStatement> {
  return mapStatement(await tGet<any>(`/statements/${id}`));
}
export async function getBankStatementsByAccountId(accountId: string): Promise<BankStatement[]> {
  const raw = await tGet<any[]>(`/statements${qs({ organizationId: requireOrg(), bankAccountId: accountId })}`);
  return (raw ?? []).map(mapStatement);
}
export async function getBankStatementsByStatus(_status: string): Promise<BankStatement[]> {
  return getBankStatements();
}
export async function createBankStatement(data: CreateBankStatementRequest): Promise<BankStatement> {
  // Backend: RegisterBankStatementRequest { organizationId, bankAccountId, statementNumber?, statementDate, openingBalance, closingBalance }
  const payload = {
    organizationId: requireOrg(),
    bankAccountId: data.bankAccountId,
    statementNumber: data.reference || undefined,
    statementDate: data.statementDate || data.periodEnd || new Date().toISOString().split("T")[0],
    openingBalance: data.openingBalance ?? 0,
    closingBalance: data.closingBalance ?? 0,
  };
  return mapStatement(await tPost<any>("/statements", payload));
}
export async function updateBankStatement(_id: string, _d: unknown): Promise<BankStatement> {
  throw new Error("La modification d'un relevé n'est pas disponible.");
}
export async function updateStatementTotals(_id: string): Promise<BankStatement> {
  throw new Error("Le recalcul des totaux n'est pas disponible.");
}
export async function closeBankStatement(id: string): Promise<BankStatement> {
  return mapStatement(await tPost<any>(`/statements/${id}/close`));
}
export async function deleteBankStatement(_id: string): Promise<void> {
  throw new Error("La suppression d'un relevé n'est pas disponible.");
}

// ─── STATEMENT LINES ─────────────────────────────────────────────────────────
// Backend: GET  /api/treasury/statements/{id}/lines
//          POST /api/treasury/statements/{id}/lines  { lines: [{ operationDate, valueDate?, label, amount, direction, referenceCode? }] }
//          POST /api/treasury/statement-lines/{id}/ignore  { reason }

export async function getStatementLines(statementId: string): Promise<StatementLine[]> {
  const raw = await tGet<any[]>(`/statements/${statementId}/lines`);
  return (raw ?? []).map(mapStatementLine);
}
export async function getStatementLineById(_id: string): Promise<StatementLine | null> { return null; }
export async function getUnmatchedStatementLines(statementId: string): Promise<StatementLine[]> {
  const lines = await getStatementLines(statementId);
  return lines.filter(l => l.reconciliationStatus === "UNMATCHED");
}
export async function getMatchedStatementLines(statementId: string): Promise<StatementLine[]> {
  const lines = await getStatementLines(statementId);
  return lines.filter(l => l.reconciliationStatus === "MATCHED");
}
export async function createStatementLine(_d: CreateStatementLineRequest): Promise<StatementLine> {
  throw new Error("Utilisez createStatementLinesBatch pour importer des lignes.");
}
export async function createStatementLinesBatch(statementId: string, lines: CreateStatementLineRequest[]): Promise<StatementLine[]> {
  // Backend: ImportStatementLinesRequest { lines: [LineEntry] }
  const payload = {
    lines: lines.map(l => ({
      operationDate: l.transactionDate,
      valueDate: l.valueDate || l.transactionDate,
      label: l.description || l.reference || "Ligne de relevé",
      amount: l.amount,
      direction: l.direction,
      referenceCode: l.reference || undefined,
    })),
  };
  const raw = await tPost<any[]>(`/statements/${statementId}/lines`, payload);
  return (raw ?? []).map(mapStatementLine);
}
export async function ignoreStatementLine(id: string, reason = "Ignoré"): Promise<StatementLine> {
  return mapStatementLine(await tPost<any>(`/statement-lines/${id}/ignore`, { reason }));
}
export async function resetStatementLine(_id: string): Promise<StatementLine> {
  throw new Error("La réinitialisation d'une ligne n'est pas disponible.");
}
export async function deleteStatementLine(_id: string): Promise<void> {
  throw new Error("La suppression d'une ligne n'est pas disponible.");
}

// ─── RECONCILIATION ──────────────────────────────────────────────────────────
// Backend: POST /api/treasury/reconciliation/manual-match  { statementLineId, matchedEntityType, matchedEntityId }
//          POST /api/treasury/reconciliation/auto-match    (?statementId=)
//          POST /api/treasury/reconciliation/unmatch/{id}
//          GET  /api/treasury/reconciliation/summary       (?statementId=)

export async function reconcileManual(data: ReconcileManualRequest): Promise<ReconciliationMatch> {
  // Traduction de l'ancienne forme (bankTransactionId / checkId) vers ManualMatchRequest.
  const matchedEntityId = data.bankTransactionId ?? data.checkId;
  if (!matchedEntityId) throw new Error("Aucune entité à rapprocher (transaction ou chèque requis).");
  return tPost<ReconciliationMatch>("/reconciliation/manual-match", {
    statementLineId: data.statementLineId,
    matchedEntityType: data.bankTransactionId ? "BANK_TRANSACTION" : "CHECK",
    matchedEntityId,
  });
}
export async function reconcileAuto(statementId: string): Promise<unknown> {
  return tPost(`/reconciliation/auto-match${qs({ statementId })}`);
}
export async function unmatch(matchId: string): Promise<void> {
  await tPost(`/reconciliation/unmatch/${matchId}`);
}
export async function getReconciliationSummary(statementId: string): Promise<ReconciliationSummary> {
  // Backend: { statementId, totalLines, unmatchedCount, matchedCount, ignoredCount, unmatchedAmount, matchedAmount }
  const s = await tGet<any>(`/reconciliation/summary${qs({ statementId })}`);
  const total = s?.totalLines ?? 0;
  const matched = s?.matchedCount ?? 0;
  return {
    ...s,
    bankStatementId: s?.bankStatementId ?? s?.statementId ?? statementId,
    bankAccountName: s?.bankAccountName ?? "",
    totalLines: total,
    matchedLines: s?.matchedLines ?? matched,
    unmatchedLines: s?.unmatchedLines ?? s?.unmatchedCount ?? 0,
    ignoredLines: s?.ignoredLines ?? s?.ignoredCount ?? 0,
    progressPercentage: total > 0 ? Math.round((matched / total) * 100) : 0,
  } as ReconciliationSummary;
}
export async function getMatchesByLineId(_lineId: string): Promise<ReconciliationMatch[]> { return []; }

// ─── BANKING STATS (calculées côté client) ───────────────────────────────────

export async function getBankingStats(): Promise<BankingStats> {
  const [accounts, stmts] = await Promise.all([
    getBankAccounts(),
    getBankStatements().catch(() => [] as BankStatement[]),
  ]);
  const totalBalance = accounts.reduce((s, a) => s + (a.currentBalance ?? 0), 0);
  return {
    totalBalance,
    totalAccounts: accounts.length,
    activeAccounts: accounts.filter(a => a.isActive).length,
    pendingTransactions: 0,
    pendingChecks: 0,
    unreconciledStatements: stmts.filter(s => s.status === "IN_PROGRESS").length,
    monthlyCredits: 0,
    monthlyDebits: 0,
  };
}
