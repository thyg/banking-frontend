/**
 * @file lib/api/bank-transaction.ts
 * @description API mock pour la gestion des transactions bancaires manuelles.
 * En production, ces fonctions feront de vrais appels HTTP au backend.
 * 
 * @version 1.0.0 - Incrément 3
 */

import {
  BankTransaction,
  CreateBankTransactionData,
  UpdateBankTransactionData,
  BankTransactionFilters,
  PaginatedResult,
} from '@/types/banking';

import {
  mockBankTransactions,
  mockBankAccounts,
  mockTransactionTypes,
  generateId,
  getCurrentTimestamp,
} from '@/lib/mock-db';

// =============================================================================
// UTILITAIRES
// =============================================================================

const wait = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms));

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
  filters?: BankTransactionFilters
): Promise<BankTransaction[]> {
  await wait(300);
  console.log('[API] getBankTransactions - filters:', filters);
  
  let transactions = [...mockBankTransactions].map(enrichTransaction);
  
  // Appliquer les filtres
  if (filters) {
    if (filters.bankAccountId) {
      transactions = transactions.filter(t => t.bankAccountId === filters.bankAccountId);
    }
    if (filters.transactionTypeId) {
      transactions = transactions.filter(t => t.transactionTypeId === filters.transactionTypeId);
    }
    if (filters.direction) {
      transactions = transactions.filter(t => t.direction === filters.direction);
    }
    if (filters.status) {
      transactions = transactions.filter(t => t.status === filters.status);
    }
    if (filters.dateFrom) {
      transactions = transactions.filter(t => t.transactionDate >= filters.dateFrom!);
    }
    if (filters.dateTo) {
      transactions = transactions.filter(t => t.transactionDate <= filters.dateTo!);
    }
    if (filters.minAmount !== undefined) {
      transactions = transactions.filter(t => t.amount >= filters.minAmount!);
    }
    if (filters.maxAmount !== undefined) {
      transactions = transactions.filter(t => t.amount <= filters.maxAmount!);
    }
    if (filters.isReconciled !== undefined) {
      transactions = transactions.filter(t => t.isReconciled === filters.isReconciled);
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      transactions = transactions.filter(t => 
        t.label.toLowerCase().includes(searchLower) ||
        t.reference?.toLowerCase().includes(searchLower) ||
        t.partnerName?.toLowerCase().includes(searchLower)
      );
    }
  }
  
  // Trier par date décroissante
  transactions.sort((a, b) => 
    new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
  );
  
  return transactions;
}

/**
 * Récupère les transactions bancaires avec solde courant calculé.
 */
export async function getBankTransactionsWithBalance(
  bankAccountId: string,
  filters?: BankTransactionFilters
): Promise<{ transactions: BankTransaction[]; startingBalance: number }> {
  await wait(350);
  console.log('[API] getBankTransactionsWithBalance - accountId:', bankAccountId);
  
  // Récupérer le compte pour le solde initial
  const account = mockBankAccounts.find(a => a.id === bankAccountId);
  if (!account) {
    throw new Error('Compte bancaire introuvable.');
  }
  
  // Récupérer les transactions du compte
  let transactions = mockBankTransactions
    .filter(t => t.bankAccountId === bankAccountId)
    .map(enrichTransaction);
  
  // Appliquer les filtres additionnels
  if (filters) {
    if (filters.dateFrom) {
      transactions = transactions.filter(t => t.transactionDate >= filters.dateFrom!);
    }
    if (filters.dateTo) {
      transactions = transactions.filter(t => t.transactionDate <= filters.dateTo!);
    }
  }
  
  // Pour le calcul du solde courant, on prend le solde actuel et on remonte
  // NOTE: En production, le backend fournirait le solde de départ pour la période
  const startingBalance = account.currentBalance - transactions.reduce((sum, t) => {
    return sum + (t.direction === 'CREDIT' ? t.amount : -t.amount);
  }, 0);
  
  // Calculer les soldes courants
  const transactionsWithBalance = calculateRunningBalances(transactions, startingBalance);
  
  // Retourner triées par date décroissante pour l'affichage
  transactionsWithBalance.sort((a, b) => 
    new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
  );
  
  return {
    transactions: transactionsWithBalance,
    startingBalance,
  };
}

/**
 * Récupère une transaction par son ID.
 */
export async function getBankTransactionById(id: string): Promise<BankTransaction | null> {
  await wait(150);
  console.log('[API] getBankTransactionById:', id);
  
  const txn = mockBankTransactions.find(t => t.id === id);
  return txn ? enrichTransaction(txn) : null;
}

/**
 * Crée une nouvelle transaction bancaire.
 */
export async function createBankTransaction(
  data: CreateBankTransactionData
): Promise<BankTransaction> {
  await wait(400);
  console.log('[API] createBankTransaction:', data);
  
  // Vérifier que le compte existe
  const account = mockBankAccounts.find(a => a.id === data.bankAccountId);
  if (!account) {
    throw new Error('Compte bancaire introuvable.');
  }
  
  // Vérifier que le type de transaction existe
  const transactionType = mockTransactionTypes.find(t => t.id === data.transactionTypeId);
  if (!transactionType) {
    throw new Error('Type de transaction introuvable.');
  }
  
  // Vérifier la cohérence direction/type
  if (transactionType.direction !== 'BOTH' && transactionType.direction !== data.direction) {
    throw new Error(`Ce type de transaction ne permet que les opérations de type ${transactionType.direction}.`);
  }
  
  const newTransaction: BankTransaction = {
    id: generateId(),
    ...data,
    bankAccountName: account.name,
    transactionTypeCode: transactionType.code,
    transactionTypeLabel: transactionType.label,
    status: data.status || 'DRAFT',
    isReconciled: false,
    createdAt: getCurrentTimestamp(),
    updatedAt: getCurrentTimestamp(),
  };
  
  mockBankTransactions.push(newTransaction);
  
  // Mettre à jour le solde du compte si la transaction est validée
  if (newTransaction.status === 'VALIDATED') {
    const accountIndex = mockBankAccounts.findIndex(a => a.id === data.bankAccountId);
    if (accountIndex !== -1) {
      if (data.direction === 'CREDIT') {
        mockBankAccounts[accountIndex].currentBalance += data.amount;
      } else {
        mockBankAccounts[accountIndex].currentBalance -= data.amount;
      }
      mockBankAccounts[accountIndex].updatedAt = getCurrentTimestamp();
    }
  }
  
  console.log('[API] Transaction créée:', newTransaction.id);
  return enrichTransaction(newTransaction);
}

/**
 * Met à jour une transaction bancaire existante.
 */
export async function updateBankTransaction(
  id: string,
  data: UpdateBankTransactionData
): Promise<BankTransaction> {
  await wait(350);
  console.log('[API] updateBankTransaction:', id, data);
  
  const index = mockBankTransactions.findIndex(t => t.id === id);
  if (index === -1) {
    throw new Error('Transaction introuvable.');
  }
  
  const existingTxn = mockBankTransactions[index];
  
  // Empêcher la modification si déjà rapprochée
  if (existingTxn.isReconciled && data.status !== 'CANCELLED') {
    throw new Error('Une transaction rapprochée ne peut pas être modifiée.');
  }
  
  // Empêcher la modification si validée (sauf annulation)
  if (existingTxn.status === 'VALIDATED' && data.status !== 'CANCELLED') {
    throw new Error('Une transaction validée ne peut pas être modifiée. Annulez-la d\'abord.');
  }
  
  // Gérer le changement de statut
  const oldStatus = existingTxn.status;
  const newStatus = data.status || oldStatus;
  
  // Si on passe de DRAFT à VALIDATED, mettre à jour le solde
  if (oldStatus === 'DRAFT' && newStatus === 'VALIDATED') {
    const accountIndex = mockBankAccounts.findIndex(a => a.id === existingTxn.bankAccountId);
    if (accountIndex !== -1) {
      const amount = data.amount || existingTxn.amount;
      const direction = data.direction || existingTxn.direction;
      
      if (direction === 'CREDIT') {
        mockBankAccounts[accountIndex].currentBalance += amount;
      } else {
        mockBankAccounts[accountIndex].currentBalance -= amount;
      }
      mockBankAccounts[accountIndex].updatedAt = getCurrentTimestamp();
    }
  }
  
  // Si on annule une transaction validée, rétablir le solde
  if (oldStatus === 'VALIDATED' && newStatus === 'CANCELLED') {
    const accountIndex = mockBankAccounts.findIndex(a => a.id === existingTxn.bankAccountId);
    if (accountIndex !== -1) {
      if (existingTxn.direction === 'CREDIT') {
        mockBankAccounts[accountIndex].currentBalance -= existingTxn.amount;
      } else {
        mockBankAccounts[accountIndex].currentBalance += existingTxn.amount;
      }
      mockBankAccounts[accountIndex].updatedAt = getCurrentTimestamp();
    }
  }
  
  mockBankTransactions[index] = {
    ...existingTxn,
    ...data,
    updatedAt: getCurrentTimestamp(),
  };
  
  return enrichTransaction(mockBankTransactions[index]);
}

/**
 * Supprime une transaction bancaire (brouillon uniquement).
 */
export async function deleteBankTransaction(id: string): Promise<void> {
  await wait(300);
  console.log('[API] deleteBankTransaction:', id);
  
  const index = mockBankTransactions.findIndex(t => t.id === id);
  if (index === -1) {
    throw new Error('Transaction introuvable.');
  }
  
  const txn = mockBankTransactions[index];
  
  if (txn.status !== 'DRAFT') {
    throw new Error('Seules les transactions en brouillon peuvent être supprimées.');
  }
  
  if (txn.isReconciled) {
    throw new Error('Une transaction rapprochée ne peut pas être supprimée.');
  }
  
  mockBankTransactions.splice(index, 1);
  console.log('[API] Transaction supprimée:', id);
}

/**
 * Valide une transaction en brouillon.
 */
export async function validateBankTransaction(id: string): Promise<BankTransaction> {
  return updateBankTransaction(id, { status: 'VALIDATED' });
}

/**
 * Annule une transaction.
 */
export async function cancelBankTransaction(id: string): Promise<BankTransaction> {
  return updateBankTransaction(id, { status: 'CANCELLED' });
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
  await wait(200);
  console.log('[API] getBankTransactionStats');
  
  let transactions = [...mockBankTransactions];
  
  if (bankAccountId) {
    transactions = transactions.filter(t => t.bankAccountId === bankAccountId);
  }
  if (dateFrom) {
    transactions = transactions.filter(t => t.transactionDate >= dateFrom);
  }
  if (dateTo) {
    transactions = transactions.filter(t => t.transactionDate <= dateTo);
  }
  
  // Exclure les annulées des stats
  transactions = transactions.filter(t => t.status !== 'CANCELLED');
  
  const credits = transactions.filter(t => t.direction === 'CREDIT');
  const debits = transactions.filter(t => t.direction === 'DEBIT');
  
  return {
    totalTransactions: transactions.length,
    totalCredits: credits.length,
    totalDebits: debits.length,
    creditAmount: credits.reduce((sum, t) => sum + t.amount, 0),
    debitAmount: debits.reduce((sum, t) => sum + t.amount, 0),
    reconciledCount: transactions.filter(t => t.isReconciled).length,
    draftCount: transactions.filter(t => t.status === 'DRAFT').length,
  };
}