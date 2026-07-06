// lib/api/bank-transaction.ts — Transactions bancaires (RT-comops-treasury-core)
// Backend: POST /api/treasury/transactions            (RegisterBankTransactionRequest)
//          POST /api/treasury/transactions/{id}/validate|cancel
//          GET  /api/treasury/transactions/{id}
//          GET  /api/treasury/bank-accounts/{id}/transactions
//
// Conventions backend :
//  - pas de champ direction : montant signé (négatif = DEBIT, positif = CREDIT)
//  - transactionType = CODE du type (chaîne), pas l'UUID
//  - statuts : RECORDED / VALIDATED / RECONCILED / CANCELLED
//  - referenceNumber généré côté serveur si absent

import { tGet, tPost, requireOrg } from "@/lib/api/treasury-client";
import type { BankTransaction, TransactionType } from "@/types/banking";

export interface CreateBankTransactionData {
  bankAccountId: string;
  transactionTypeId: string;
  amount: number;
  direction: "CREDIT" | "DEBIT";
  transactionDate: string;
  description?: string;
  reference?: string;
  externalReference?: string;
  valueDate?: string;
  paymentMethod?: string;
  partnerName?: string;
  partnerId?: string;
  /** Chèque à encaisser en même temps que la transaction (POST /checks/{id}/cash). */
  checkId?: string;
}

export interface UpdateBankTransactionData extends Partial<CreateBankTransactionData> {}

export interface TransactionFilters {
  bankAccountId?: string;
  status?: string;
  direction?: string;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Convertit une BankTransactionResponse backend vers la forme attendue par l'UI :
 * direction déduite du signe, montant absolu, statut RECORDED→DRAFT / RECONCILED→VALIDATED.
 */
export function mapBankTransaction(r: any): BankTransaction {
  const rawAmount = Number(r.amount ?? 0);
  const status =
    r.status === "RECORDED" ? "DRAFT" :
    r.status === "RECONCILED" ? "VALIDATED" :
    r.status;
  return {
    ...r,
    amount: Math.abs(rawAmount),
    direction: r.direction ?? (rawAmount < 0 ? "DEBIT" : "CREDIT"),
    status,
    reference: r.reference ?? r.referenceNumber,
    transactionTypeId: r.transactionTypeId ?? "",
    transactionTypeCode: r.transactionTypeCode ?? r.transactionType,
    transactionTypeLabel: r.transactionTypeLabel ?? r.transactionType,
    isReconciled: r.isReconciled ?? (r.status === "RECONCILED" || !!r.reconciledAt),
    createdAt: r.createdAt ?? r.transactionDate,
    updatedAt: r.updatedAt ?? r.transactionDate,
  } as BankTransaction;
}

export async function getBankTransactions(filters?: TransactionFilters): Promise<BankTransaction[]> {
  if (!filters?.bankAccountId) return [];
  const txns = await tGet<any[]>(`/bank-accounts/${filters.bankAccountId}/transactions`);
  return (txns ?? []).map(mapBankTransaction);
}

export async function getBankTransactionsWithBalance(
  bankAccountId: string
): Promise<{ transactions: BankTransaction[]; startingBalance: number }> {
  const transactions = await getBankTransactions({ bankAccountId });
  return { transactions, startingBalance: 0 };
}

export async function getBankTransactionById(id: string): Promise<BankTransaction | null> {
  try {
    return mapBankTransaction(await tGet<any>(`/transactions/${id}`));
  } catch {
    return null;
  }
}

export async function createBankTransaction(data: CreateBankTransactionData): Promise<BankTransaction> {
  // Le backend attend le CODE du type ; l'UI manipule son UUID.
  const type = await tGet<TransactionType>(`/transaction-types/${data.transactionTypeId}`);
  const signedAmount =
    data.direction === "DEBIT" ? -Math.abs(data.amount) : Math.abs(data.amount);

  const payload = {
    organizationId: requireOrg(),
    bankAccountId: data.bankAccountId,
    transactionType: type?.code ?? "OTHER",
    transactionDate: data.transactionDate,
    amount: signedAmount,
    description:
      data.description?.trim() ||
      [type?.label, data.partnerName].filter(Boolean).join(" — ") ||
      "Transaction bancaire",
    referenceNumber: data.reference || data.externalReference || undefined,
  };

  const created = mapBankTransaction(await tPost<any>("/transactions", payload));

  // Règlement par chèque : on encaisse le chèque lié (meilleur effort).
  if (data.checkId) {
    try {
      await tPost(`/checks/${data.checkId}/cash`);
    } catch (e) {
      console.warn("[bank-transaction] Chèque lié non encaissé :", e);
    }
  }

  return created;
}

export async function updateBankTransaction(_id: string, _data: UpdateBankTransactionData): Promise<BankTransaction> {
  throw new Error("La modification d'une transaction n'est pas disponible.");
}

export async function deleteBankTransaction(_id: string): Promise<void> {
  throw new Error("La suppression d'une transaction n'est pas disponible.");
}

export async function validateBankTransaction(id: string): Promise<BankTransaction> {
  return mapBankTransaction(await tPost<any>(`/transactions/${id}/validate`));
}

export async function cancelBankTransaction(id: string, reason = "Annulation manuelle"): Promise<BankTransaction> {
  return mapBankTransaction(await tPost<any>(`/transactions/${id}/cancel`, { reason }));
}

export async function getBankTransactionStats(bankAccountId?: string): Promise<{
  totalTransactions: number;
  totalCredits: number;
  totalDebits: number;
  creditAmount: number;
  debitAmount: number;
  reconciledCount: number;
  draftCount: number;
}> {
  if (!bankAccountId) {
    return { totalTransactions: 0, totalCredits: 0, totalDebits: 0, creditAmount: 0, debitAmount: 0, reconciledCount: 0, draftCount: 0 };
  }
  const txns = await getBankTransactions({ bankAccountId });
  const credits = txns.filter(t => t.direction === "CREDIT");
  const debits  = txns.filter(t => t.direction === "DEBIT");
  return {
    totalTransactions: txns.length,
    totalCredits: credits.length,
    totalDebits:  debits.length,
    creditAmount: credits.reduce((s, t) => s + t.amount, 0),
    debitAmount:  debits.reduce((s, t) => s + t.amount, 0),
    reconciledCount: txns.filter(t => t.isReconciled).length,
    draftCount:      txns.filter(t => t.status === "DRAFT").length,
  };
}
