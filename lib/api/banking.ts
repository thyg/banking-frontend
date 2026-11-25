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
    // Libellé saisi par l'utilisateur, sinon nom de la banque (comptes créés avant le libellé).
    name: r.label ?? r.name ?? r.bankName ?? r.accountNumber ?? "Compte",
    bankName: r.bankName,
    bankId: r.bankId ?? r.bankThirdPartyId ?? "",
    isActive: r.isActive ?? (r.status ? r.status === "ACTIVE" : true),
    currentBalance: r.currentBalance ?? 0,
    reconciledBalance: r.reconciledBalance ?? 0,
    overdraftAllowed: r.overdraftAllowed ?? false,
    // Alias lu par le formulaire de chèque (indicateur de provision).
    overdraftAuthorized: r.overdraftAllowed ?? r.overdraftAuthorized ?? false,
    overdraftLimit: r.overdraftLimit ?? 0,
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
/**
 * Modification d'une banque (PUT, le code est immuable). Le backend attend l'objet complet :
 * on fusionne l'état actuel et les champs modifiés pour ne rien effacer.
 */
export async function updateBank(id: string, d: UpdateBankRequest): Promise<Bank> {
  const current: any = await getBankById(id);
  const merged = { ...current, ...d };
  const updated = await tPut<Bank>(`/banks/${id}`, {
    name: merged.name,
    swiftCode: merged.swiftCode || undefined,
    bankCode: merged.bankCode || undefined,
    country: merged.country || undefined,
    address: merged.address || undefined,
    bankCategoryId: merged.bankCategoryId || undefined,
  });
  if (d.isActive === false && current?.active !== false && current?.isActive !== false) {
    await tPost(`/banks/${id}/deactivate`, {});
  }
  return updated;
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
/** Modification du libellé d'une catégorie (le code est immuable). */
export async function updateBankCategory(id: string, d: BankCategoryRequest): Promise<BankCategory> {
  return tPut<BankCategory>(`/bank-categories/${id}`, { label: d.label });
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

/** Le backend expose « active » ; l'UI lit « isActive » (sans ce mapping, tous les types étaient filtrés). */
function mapTransactionType(r: any): TransactionType {
  return { ...r, isActive: r.isActive ?? r.active ?? true, active: r.active ?? r.isActive ?? true } as TransactionType;
}
export async function getTransactionTypes(activeOnly = false): Promise<TransactionType[]> {
  const types = ((await tGet<any[]>("/transaction-types")) ?? []).map(mapTransactionType);
  return activeOnly ? types.filter(t => t.isActive) : types;
}
export async function getTransactionTypeById(id: string): Promise<TransactionType> {
  return mapTransactionType(await tGet<any>(`/transaction-types/${id}`));
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

export async function getAccountTypes(activeOnly = false): Promise<AccountType[]> {
  const types = (await tGet<any[]>("/account-types") ?? []).map(r => mapAccountType<AccountType>(r));
  return activeOnly ? types.filter(t => t.isActive !== false) : types;
}
export async function getAccountTypeById(id: string): Promise<AccountType> {
  return mapAccountType<AccountType>(await tGet<any>(`/account-types/${id}`));
}
export async function getAccountTypeByCode(_code: string): Promise<AccountType | null> { return null; }
export async function getCheckEmitterTypes(): Promise<AccountType[]> {
  return (await getAccountTypes(true)).filter(t => t.peutEmettreCheques);
}
export async function getCheckReceiverTypes(): Promise<AccountType[]> {
  return (await getAccountTypes(true)).filter(t => t.peutRecevoirCheques);
}
export async function getCashEnabledTypes(): Promise<AccountType[]> {
  return (await getAccountTypes(true)).filter(t => t.peutTransactionsEspeces);
}
export async function getOverdraftEnabledTypes(): Promise<AccountType[]> {
  return (await getAccountTypes(true)).filter(t => t.decouvertAutorise);
}

export async function createAccountType(data: CreateAccountTypeRequest): Promise<AccountType> {
  return mapAccountType<AccountType>(await tPost<any>("/account-types", data));
}
/** Modification d'un type de compte (le code est immuable) ; fusion avec l'état actuel. */
export async function updateAccountType(id: string, d: UpdateAccountTypeRequest): Promise<AccountType> {
  const current: any = await getAccountTypeById(id);
  const m = { ...current, ...d };
  return mapAccountType<AccountType>(await tPut<any>(`/account-types/${id}`, {
    libelle: m.libelle,
    description: m.description || undefined,
    peutEmettreCheques: !!m.peutEmettreCheques,
    peutRecevoirCheques: !!m.peutRecevoirCheques,
    peutTransactionsEspeces: !!m.peutTransactionsEspeces,
    decouvertAutorise: !!m.decouvertAutorise,
    decouvertParDefaut: m.decouvertParDefaut ?? 0,
    ordreAffichage: m.ordreAffichage ?? 0,
  }));
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
// La réponse « compte » porte le solde stocké (currentBalance, mis à jour à la validation) : plus
// besoin d'un appel /balance par compte. Ce N+1 saturait la file du navigateur (6 requêtes
// simultanées par hôte) dès quelques dizaines de comptes et figeait les formulaires ouverts ensuite.

export async function getBankAccounts(_activeOnly = false): Promise<BankAccount[]> {
  const raw = await tGet<any[]>(`/bank-accounts${qs({ organizationId: requireOrg() })}`);
  return (raw ?? []).map(mapBankAccount);
}
export async function getBankAccountById(id: string): Promise<BankAccount> {
  return mapBankAccount(await tGet<any>(`/bank-accounts/${id}`));
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
    iban;
  // Avant : à défaut, le NOM du compte servait de numéro et d'IBAN (doublons, numéro affiché faux).
  if (!accountNumber) throw new Error("Le numéro de compte est requis.");
  const payload = {
    organizationId: requireOrg(),
    bankName: bankName || data.name,
    accountNumber,
    iban: iban || accountNumber,
    currency: data.currency || "XAF",
    label: data.name || undefined,
  };
  const created = mapBankAccount(await tPost<any>("/bank-accounts", payload));
  // Le découvert saisi dans le formulaire était perdu : il s'applique via la route dédiée (Q3).
  if ((data as any).overdraftAllowed) {
    return mapBankAccount(await tPut<any>(`/bank-accounts/${created.id}/overdraft`, {
      overdraftAllowed: true,
      overdraftLimit: Number((data as any).overdraftLimit ?? 0),
    }));
  }
  return created;
}
/**
 * Modification d'un compte : le backend gère le découvert et le statut (Q3). Banque, numéro et IBAN
 * sont l'identité du compte et ne se modifient pas (un compte erroné se désactive et se recrée).
 */
export async function updateBankAccount(id: string, d: UpdateBankAccountRequest): Promise<BankAccount> {
  const data: any = d ?? {};
  let account: BankAccount | null = null;
  if (data.overdraftAllowed !== undefined || data.overdraftLimit !== undefined) {
    account = mapBankAccount(await tPut<any>(`/bank-accounts/${id}/overdraft`, {
      overdraftAllowed: !!data.overdraftAllowed,
      overdraftLimit: data.overdraftAllowed ? Number(data.overdraftLimit ?? 0) : 0,
    }));
  }
  if (data.isActive !== undefined) {
    account = mapBankAccount(await tPut<any>(`/bank-accounts/${id}/status`, {
      status: data.isActive ? "ACTIVE" : "INACTIVE",
    }));
  }
  return account ?? mapBankAccount(await tGet<any>(`/bank-accounts/${id}`));
}
/** Un compte bancaire ne se supprime pas (historique financier) : il est désactivé. */
export async function deleteBankAccount(id: string): Promise<void> {
  await tPut(`/bank-accounts/${id}/status`, { status: "INACTIVE" });
}

// ─── BANK TRANSACTIONS ───────────────────────────────────────────────────────
// Implémentation unique dans lib/api/bank-transaction.ts (montant signé, code du type).

/** Transactions de tous les comptes de l'organisation, les plus récentes d'abord. */
export async function getBankTransactions(): Promise<BankTransaction[]> {
  const accounts = await getBankAccounts();
  const lists = await Promise.all(
    accounts.map((a) => getBankTransactionsByAccountId(a.id).catch(() => [] as BankTransaction[])),
  );
  return lists.flat().sort((a, b) =>
    String(b.transactionDate ?? "").localeCompare(String(a.transactionDate ?? "")));
}
export async function getBankTransactionById(id: string): Promise<BankTransaction | null> {
  try { return mapBankTransaction(await tGet<any>(`/transactions/${id}`)); } catch { return null; }
}
export async function getBankTransactionsByAccountId(accountId: string): Promise<BankTransaction[]> {
  const txns = await tGet<any[]>(`/bank-accounts/${accountId}/transactions`);
  return (txns ?? []).map(mapBankTransaction);
}
/** Filtre par statut frontend (DRAFT = brouillon RECORDED côté backend, VALIDATED, CANCELLED). */
export async function getBankTransactionsByStatus(status: string): Promise<BankTransaction[]> {
  return (await getBankTransactions()).filter((t) => t.status === status);
}
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
export async function deleteBankTransaction(id: string): Promise<void> {
  await tPost(`/transactions/${id}/cancel`, { reason: "Brouillon annulé par l'utilisateur" });
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
export async function getChecksByType(type: string): Promise<Check[]> {
  return (await getChecks()).filter((c) => c.checkType === type);
}
export async function getChecksByStatus(status: string): Promise<Check[]> {
  return (await getChecks()).filter((c) => c.status === status);
}
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
  return withLineCounts((raw ?? []).map(mapStatement));
}

/**
 * Le relevé ne porte pas ses compteurs de lignes : la progression affichait « 0/0 ». On lit le
 * résumé de rapprochement de chaque relevé (lignes traitées = rapprochées + ignorées) et on trie
 * du plus récent au plus ancien.
 */
export async function withLineCounts(statements: BankStatement[]): Promise<BankStatement[]> {
  await Promise.all(statements.map(async (st: any) => {
    try {
      const sum = await tGet<any>(`/reconciliation/summary${qs({ statementId: st.id })}`);
      st.lineCount = sum?.totalLines ?? 0;
      st.reconciledCount = (sum?.matchedCount ?? 0) + (sum?.ignoredCount ?? 0);
    } catch { /* résumé indisponible : on garde 0 */ }
  }));
  return statements.sort((a: any, b: any) =>
    String(b.createdAt ?? b.statementDate ?? "").localeCompare(String(a.createdAt ?? a.statementDate ?? "")));
}
export async function getBankStatementById(id: string): Promise<BankStatement> {
  return mapStatement(await tGet<any>(`/statements/${id}`));
}
export async function getBankStatementsByAccountId(accountId: string): Promise<BankStatement[]> {
  const raw = await tGet<any[]>(`/statements${qs({ organizationId: requireOrg(), bankAccountId: accountId })}`);
  return (raw ?? []).map(mapStatement);
}
export async function getBankStatementsByStatus(status: string): Promise<BankStatement[]> {
  return (await getBankStatements()).filter((st) => st.status === status);
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

/**
 * Import d'un relevé CSV via le backend (/statements/upload) : un seul parseur (sens « Crédit »/
 * « Débit » accentués, ligne « Solde initial » traitée comme ouverture), relevé et lignes créés
 * dans une même transaction. Remplace le parseur dupliqué côté navigateur.
 */
export async function uploadStatementCsv(file: File, bankAccountId: string, statementName?: string): Promise<{
  statement: BankStatement; linesImported: number;
}> {
  const form = new FormData();
  form.append("file", file);
  form.append("bankAccountId", bankAccountId);
  if (statementName?.trim()) form.append("statementNumber", statementName.trim());
  const res = await fetch("/api/kernel/treasury/statements/upload", { method: "POST", body: form, credentials: "include" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message || "L'import du relevé a échoué.");
  const data = json?.data ?? json;
  return { statement: mapStatement(data.statement), linesImported: data.linesImported ?? 0 };
}
