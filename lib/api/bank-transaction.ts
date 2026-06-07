// lib/api/bank-transaction.ts — Transactions bancaires (iwm-treasury-core)
// Backend: POST /api/treasury/transactions
//          POST /api/treasury/transactions/{id}/validate|cancel
//          GET  /api/treasury/bank-accounts/{id}/transactions

import { tGet, tPost } from "@/lib/api/treasury-client";
import type { BankTransaction } from "@/types/banking";

export interface CreateBankTransactionData {
  bankAccountId: string;
  transactionTypeId: string;
  amount: number;
  direction: "CREDIT" | "DEBIT";
  transactionDate: string;
  description?: string;
  referenceCode?: string;
}

export interface UpdateBankTransactionData extends Partial<CreateBankTransactionData> {}

export interface TransactionFilters {
  bankAccountId?: string;
  status?: string;
  direction?: string;
  dateFrom?: string;
  dateTo?: string;
}

export async function getBankTransactions(filters?: TransactionFilters): Promise<BankTransaction[]> {
  if (!filters?.bankAccountId) return [];
  return tGet<BankTransaction[]>(`/bank-accounts/${filters.bankAccountId}/transactions`);
}

export async function getBankTransactionsWithBalance(
  bankAccountId: string
): Promise<{ transactions: BankTransaction[]; startingBalance: number }> {
  const transactions = await tGet<BankTransaction[]>(`/bank-accounts/${bankAccountId}/transactions`);
  return { transactions, startingBalance: 0 };
}

export async function getBankTransactionById(id: string): Promise<BankTransaction | null> {
  try {
    return await tGet<BankTransaction>(`/transactions/${id}`);
  } catch {
    return null;
  }
}

export async function createBankTransaction(data: CreateBankTransactionData): Promise<BankTransaction> {
  return tPost<BankTransaction>("/transactions", data);
}

export async function updateBankTransaction(_id: string, _data: UpdateBankTransactionData): Promise<BankTransaction> {
  throw new Error("La modification d'une transaction n'est pas disponible.");
}

export async function deleteBankTransaction(_id: string): Promise<void> {
  throw new Error("La suppression d'une transaction n'est pas disponible.");
}

export async function validateBankTransaction(id: string): Promise<BankTransaction> {
  return tPost<BankTransaction>(`/transactions/${id}/validate`);
}

export async function cancelBankTransaction(id: string, reason = "Annulation manuelle"): Promise<BankTransaction> {
  return tPost<BankTransaction>(`/transactions/${id}/cancel`, { reason });
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
  const txns = await tGet<BankTransaction[]>(`/bank-accounts/${bankAccountId}/transactions`);
  const credits = txns.filter((t: any) => t.direction === "CREDIT");
  const debits  = txns.filter((t: any) => t.direction === "DEBIT");
  return {
    totalTransactions: txns.length,
    totalCredits: credits.length,
    totalDebits:  debits.length,
    creditAmount: credits.reduce((s: number, t: any) => s + t.amount, 0),
    debitAmount:  debits.reduce((s: number, t: any) => s + t.amount, 0),
    reconciledCount: txns.filter((t: any) => t.status === "RECONCILED").length,
    draftCount:      txns.filter((t: any) => t.status === "DRAFT").length,
  };
}
