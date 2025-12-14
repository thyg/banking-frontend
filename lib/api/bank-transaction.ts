/**
 * @file lib/api/bank-transaction.ts
 * @description API mock pour la gestion des transactions bancaires manuelles.
 * En production, ces fonctions feront de vrais appels HTTP au backend.
 * 
 * @version 1.0.0 - Incrément 3
 */

import type {
  BankTransaction,
  CreateBankTransactionData,
  UpdateBankTransactionData,
  TransactionFilters,
} from '@/types/banking';

import { mockBankAccounts, mockTransactionTypes } from '@/lib/mock-db'; // Keep for enrich
import { mockBankTransactions } from './mock-db';

// =============================================================================
// CONFIGURATION
// =============================================================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

const headers = {
  'Content-Type': 'application/json',
};

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Gère la réponse HTTP et extrait le JSON ou lance une erreur.
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text();
    try {
      const error = JSON.parse(errorText);
      throw new Error(error.message || `Erreur HTTP: ${response.status}`);
    } catch (e) {
      throw new Error(errorText || `Erreur HTTP: ${response.status}`);
    }
  }
  return response.json();
}

/**
 * Construit une URL avec des paramètres de requête.
 */
function buildUrl(path: string, params?: Record<string, any>): string {
  const url = new URL(`${API_BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.append(key, String(value));
      }
    });
  }
  return url.toString();
}


/**
 * Enrichit une transaction avec les données dénormalisées.
 */
function enrichTransaction(txn: BankTransaction): BankTransaction {
  const account = mockBankAccounts.find(a => a.id === txn.bankAccountId);
  const transactionType = mockTransactionTypes.find(t => t.id === txn.transactionTypeId);
  
  return {
    ...txn,
    bankAccountName: account?.name || txn.bankAccountName,
    transactionTypeCode: transactionType?.code || txn.transactionTypeCode,
    transactionTypeLabel: transactionType?.label || txn.transactionTypeLabel,
  };
}

/**
 * Calcule les soldes courants (running balance) pour une liste de transactions.
 * Le calcul se fait côté frontend comme spécifié.
 */
function calculateRunningBalances(
  transactions: BankTransaction[], 
  initialBalance: number
): BankTransaction[] {
  let runningBalance = initialBalance;
  
  // Les transactions sont triées par date croissante pour le calcul
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime()
  );
  
  return sorted.map(txn => {
    if (txn.direction === 'CREDIT') {
      runningBalance += txn.amount;
    } else {
      runningBalance -= txn.amount;
    }
    
    return {
      ...txn,
      runningBalance,
    };
  });
}

// =============================================================================
// API TRANSACTIONS BANCAIRES
// =============================================================================

/**
 * Récupère les transactions bancaires avec filtres optionnels.
 */
export async function getBankTransactions(
  filters?: TransactionFilters
): Promise<BankTransaction[]> {
  console.log('[API] getBankTransactions - filters:', filters);
  const response = await fetch(buildUrl('/bank-transactions', filters));
  return handleResponse<BankTransaction[]>(response);
}


/**
 * Récupère les transactions bancaires avec solde courant calculé.
 */
export async function getBankTransactionsWithBalance(
  bankAccountId: string,
  filters?: TransactionFilters
): Promise<{ transactions: BankTransaction[]; startingBalance: number }> {
    console.log('[API] getBankTransactionsWithBalance - accountId:', bankAccountId);

  const response = await fetch(buildUrl(`/bank-transactions/with-balance/${bankAccountId}`, filters));
  return handleResponse<{ transactions: BankTransaction[]; startingBalance: number }>(response);
}

/**
 * Récupère une transaction par son ID.
 */
export async function getBankTransactionById(id: string): Promise<BankTransaction | null> {
  console.log('[API] getBankTransactionById:', id);
  const response = await fetch(buildUrl(`/bank-transactions/${id}`));
  return handleResponse<BankTransaction | null>(response);
}

/**
 * Crée une nouvelle transaction bancaire.
 */
export async function createBankTransaction(
  data: CreateBankTransactionData
): Promise<BankTransaction> {
  console.log('[API] createBankTransaction:', data);

  const response = await fetch(buildUrl('/bank-transactions'), {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });

  return handleResponse<BankTransaction>(response);
}

/**
 * Met à jour une transaction bancaire existante.
 */
export async function updateBankTransaction(
  id: string,
  data: UpdateBankTransactionData
): Promise<BankTransaction> {
  console.log('[API] updateBankTransaction:', id, data);
  const response = await fetch(buildUrl(`/bank-transactions/${id}`), {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  });
  return handleResponse<BankTransaction>(response);
}

/**
 * Supprime une transaction bancaire (brouillon uniquement).
 */
export async function deleteBankTransaction(id: string): Promise<void> {
  console.log('[API] deleteBankTransaction:', id);
  const response = await fetch(buildUrl(`/bank-transactions/${id}`), {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
}

/**
 * Valide une transaction en brouillon.
 */
export async function validateBankTransaction(id: string): Promise<BankTransaction> {
    console.log('[API] validateBankTransaction:', id);
    const response = await fetch(buildUrl(`/bank-transactions/${id}/validate`), {
        method: 'POST',
    });
    return handleResponse<BankTransaction>(response);
}

/**
 * Annule une transaction.
 */
export async function cancelBankTransaction(id: string): Promise<BankTransaction> {
    console.log('[API] cancelBankTransaction:', id);
    const response = await fetch(buildUrl(`/bank-transactions/${id}/cancel`), {
        method: 'POST',
    });
    return handleResponse<BankTransaction>(response);
}

// =============================================================================
// STATISTIQUES
// =============================================================================

/**
 * Récupère les statistiques des transactions pour un compte.
 */
export async function getBankTransactionStats(
  bankAccountId?: string,
  dateFrom?: string,
  dateTo?: string
): Promise<{
  totalTransactions: number;
  totalCredits: number;
  totalDebits: number;
  creditAmount: number;
  debitAmount: number;
  reconciledCount: number;
  draftCount: number;
}> {
  console.log('[API] getBankTransactionStats');
  const response = await fetch(buildUrl('/bank-transactions/stats', { bankAccountId, dateFrom, dateTo }));
  return handleResponse<{
    totalTransactions: number;
    totalCredits: number;
    totalDebits: number;
    creditAmount: number;
    debitAmount: number;
    reconciledCount: number;
    draftCount: number;
  }>(response);
}