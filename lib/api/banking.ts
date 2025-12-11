/**
 * @file lib/api/banking.ts
 * @description API pour le module Trésorerie - Banques, Comptes, Transactions, Chèques.
 * 
 * @version 4.0.0 - Incrément 4 : Ajout fonctions pour relevés et rapprochement
 */

import {
  Bank,
  CreateBankData,
  UpdateBankData,
  TransactionType,
  CreateTransactionTypeData,
  UpdateTransactionTypeData,
  BankAccount,
  CreateBankAccountData,
  UpdateBankAccountData,
  BankTransaction,
  CreateBankTransactionData,
  UpdateBankTransactionData,
  BankTransactionFilters,
  Check,
  CreateCheckData,
  UpdateCheckData,
  CheckFilters,
  CheckStatus,
  BankStatement,
  BankStatementLine,
} from '@/types/banking';

import {
  mockBanks,
  mockTransactionTypes,
  mockBankAccounts,
  mockBankTransactions,
  mockChecks,
  mockBankStatements,
  mockStatementLines,
  generateId,
  getCurrentTimestamp,
} from '@/lib/mock-db';

// =============================================================================
// UTILITAIRES
// =============================================================================

const wait = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms));

// =============================================================================
// BANQUES (PARAMÉTRAGE)
// =============================================================================

export async function getBanks(activeOnly: boolean = false): Promise<Bank[]> {
  await wait(200);
  let banks = [...mockBanks];
  if (activeOnly) {
    banks = banks.filter(b => b.isActive);
  }
  return banks.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getBankById(id: string): Promise<Bank | null> {
  await wait(100);
  return mockBanks.find(b => b.id === id) || null;
}

export async function createBank(data: CreateBankData): Promise<Bank> {
  await wait(300);
  
  // Vérifier unicité du code
  const existingCode = mockBanks.find(
    b => b.code.toLowerCase() === data.code.toLowerCase()
  );
  if (existingCode) {
    throw new Error(`Le code "${data.code}" existe déjà`);
  }
  
  const newBank: Bank = {
    id: generateId(),
    ...data,
    createdAt: getCurrentTimestamp(),
    updatedAt: getCurrentTimestamp(),
  };
  
  mockBanks.push(newBank);
  return newBank;
}

export async function updateBank(id: string, data: UpdateBankData): Promise<Bank> {
  await wait(300);
  
  const index = mockBanks.findIndex(b => b.id === id);
  if (index === -1) {
    throw new Error('Banque non trouvée');
  }
  
  // Vérifier unicité du code si modifié
  if (data.code) {
    const existingCode = mockBanks.find(
      b => b.id !== id && b.code.toLowerCase() === data.code!.toLowerCase()
    );
    if (existingCode) {
      throw new Error(`Le code "${data.code}" existe déjà`);
    }
  }
  
  mockBanks[index] = {
    ...mockBanks[index],
    ...data,
    updatedAt: getCurrentTimestamp(),
  };
  
  return mockBanks[index];
}

export async function deleteBank(id: string): Promise<void> {
  await wait(300);
  
  const index = mockBanks.findIndex(b => b.id === id);
  if (index === -1) {
    throw new Error('Banque non trouvée');
  }
  
  // Vérifier qu'aucun compte n'utilise cette banque
  const hasAccounts = mockBankAccounts.some(a => a.bankId === id);
  if (hasAccounts) {
    throw new Error('Impossible de supprimer: des comptes utilisent cette banque');
  }
  
  mockBanks.splice(index, 1);
}

// =============================================================================
// TYPES DE TRANSACTIONS (PARAMÉTRAGE)
// =============================================================================

export async function getTransactionTypes(activeOnly: boolean = false): Promise<TransactionType[]> {
  await wait(200);
  let types = [...mockTransactionTypes];
  if (activeOnly) {
    types = types.filter(t => t.isActive);
  }
  return types.sort((a, b) => a.code.localeCompare(b.code));
}

export async function getTransactionTypeById(id: string): Promise<TransactionType | null> {
  await wait(100);
  return mockTransactionTypes.find(t => t.id === id) || null;
}

export async function createTransactionType(data: CreateTransactionTypeData): Promise<TransactionType> {
  await wait(300);
  
  const existingCode = mockTransactionTypes.find(
    t => t.code.toLowerCase() === data.code.toLowerCase()
  );
  if (existingCode) {
    throw new Error(`Le code "${data.code}" existe déjà`);
  }
  
  const newType: TransactionType = {
    id: generateId(),
    ...data,
    createdAt: getCurrentTimestamp(),
    updatedAt: getCurrentTimestamp(),
  };
  
  mockTransactionTypes.push(newType);
  return newType;
}

export async function updateTransactionType(
  id: string,
  data: UpdateTransactionTypeData
): Promise<TransactionType> {
  await wait(300);
  
  const index = mockTransactionTypes.findIndex(t => t.id === id);
  if (index === -1) {
    throw new Error('Type de transaction non trouvé');
  }
  
  if (data.code) {
    const existingCode = mockTransactionTypes.find(
      t => t.id !== id && t.code.toLowerCase() === data.code!.toLowerCase()
    );
    if (existingCode) {
      throw new Error(`Le code "${data.code}" existe déjà`);
    }
  }
  
  mockTransactionTypes[index] = {
    ...mockTransactionTypes[index],
    ...data,
    updatedAt: getCurrentTimestamp(),
  };
  
  return mockTransactionTypes[index];
}

export async function deleteTransactionType(id: string): Promise<void> {
  await wait(300);
  
  const index = mockTransactionTypes.findIndex(t => t.id === id);
  if (index === -1) {
    throw new Error('Type de transaction non trouvé');
  }
  
  // Vérifier qu'aucune transaction n'utilise ce type
  const hasTransactions = mockBankTransactions.some(t => t.transactionTypeId === id);
  if (hasTransactions) {
    throw new Error('Impossible de supprimer: des transactions utilisent ce type');
  }
  
  mockTransactionTypes.splice(index, 1);
}

// =============================================================================
// COMPTES BANCAIRES
// =============================================================================

export async function getBankAccounts(activeOnly: boolean = false): Promise<BankAccount[]> {
  await wait(200);
  let accounts = [...mockBankAccounts];
  if (activeOnly) {
    accounts = accounts.filter(a => a.isActive);
  }
  return accounts.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getBankAccountById(id: string): Promise<BankAccount | null> {
  await wait(100);
  return mockBankAccounts.find(a => a.id === id) || null;
}

export async function createBankAccount(data: CreateBankAccountData): Promise<BankAccount> {
  await wait(300);
  
  const bank = mockBanks.find(b => b.id === data.bankId);
  if (!bank) {
    throw new Error('Banque non trouvée');
  }
  
  const newAccount: BankAccount = {
    id: generateId(),
    ...data,
    bankName: bank.name,
    currentBalance: 0,
    reconciledBalance: 0,
    createdAt: getCurrentTimestamp(),
    updatedAt: getCurrentTimestamp(),
  };
  
  mockBankAccounts.push(newAccount);
  return newAccount;
}

export async function updateBankAccount(
  id: string,
  data: UpdateBankAccountData
): Promise<BankAccount> {
  await wait(300);
  
  const index = mockBankAccounts.findIndex(a => a.id === id);
  if (index === -1) {
    throw new Error('Compte bancaire non trouvé');
  }
  
  let bankName = mockBankAccounts[index].bankName;
  if (data.bankId) {
    const bank = mockBanks.find(b => b.id === data.bankId);
    if (!bank) {
      throw new Error('Banque non trouvée');
    }
    bankName = bank.name;
  }
  
  mockBankAccounts[index] = {
    ...mockBankAccounts[index],
    ...data,
    bankName,
    updatedAt: getCurrentTimestamp(),
  };
  
  return mockBankAccounts[index];
}

export async function deleteBankAccount(id: string): Promise<void> {
  await wait(300);
  
  const index = mockBankAccounts.findIndex(a => a.id === id);
  if (index === -1) {
    throw new Error('Compte bancaire non trouvé');
  }
  
  // Vérifier qu'aucune transaction ni relevé n'utilise ce compte
  const hasTransactions = mockBankTransactions.some(t => t.bankAccountId === id);
  const hasStatements = mockBankStatements.some(s => s.bankAccountId === id);
  
  if (hasTransactions || hasStatements) {
    throw new Error('Impossible de supprimer: des transactions ou relevés utilisent ce compte');
  }
  
  mockBankAccounts.splice(index, 1);
}

// =============================================================================
// TRANSACTIONS BANCAIRES
// =============================================================================

export async function getBankTransactions(
  filters?: BankTransactionFilters
): Promise<BankTransaction[]> {
  await wait(300);
  
  let transactions = [...mockBankTransactions];
  
  // Enrichir avec les noms
  transactions = transactions.map(txn => {
    const account = mockBankAccounts.find(a => a.id === txn.bankAccountId);
    const type = mockTransactionTypes.find(t => t.id === txn.transactionTypeId);
    return {
      ...txn,
      bankAccountName: account?.name || 'Compte inconnu',
      transactionTypeCode: type?.code || '',
      transactionTypeLabel: type?.label || 'Type inconnu',
    };
  });
  
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
    if (filters.isReconciled !== undefined) {
      transactions = transactions.filter(t => t.isReconciled === filters.isReconciled);
    }
    if (filters.search) {
      const search = filters.search.toLowerCase();
      transactions = transactions.filter(t =>
        t.label.toLowerCase().includes(search) ||
        t.reference?.toLowerCase().includes(search) ||
        t.partnerName?.toLowerCase().includes(search)
      );
    }
  }
  
  // Trier par date décroissante
  return transactions.sort(
    (a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
  );
}

export async function getBankTransactionById(id: string): Promise<BankTransaction | null> {
  await wait(100);
  
  const txn = mockBankTransactions.find(t => t.id === id);
  if (!txn) return null;
  
  const account = mockBankAccounts.find(a => a.id === txn.bankAccountId);
  const type = mockTransactionTypes.find(t => t.id === txn.transactionTypeId);
  
  return {
    ...txn,
    bankAccountName: account?.name,
    transactionTypeCode: type?.code,
    transactionTypeLabel: type?.label,
  };
}

export async function createBankTransaction(
  data: CreateBankTransactionData
): Promise<BankTransaction> {
  await wait(400);
  
  const account = mockBankAccounts.find(a => a.id === data.bankAccountId);
  if (!account) {
    throw new Error('Compte bancaire non trouvé');
  }
  
  const type = mockTransactionTypes.find(t => t.id === data.transactionTypeId);
  if (!type) {
    throw new Error('Type de transaction non trouvé');
  }
  
  const newTransaction: BankTransaction = {
    id: generateId(),
    ...data,
    bankAccountName: account.name,
    transactionTypeCode: type.code,
    transactionTypeLabel: type.label,
    isReconciled: false,
    createdAt: getCurrentTimestamp(),
    updatedAt: getCurrentTimestamp(),
  };
  
  mockBankTransactions.push(newTransaction);
  
  // Mettre à jour le solde du compte si la transaction est validée
  if (newTransaction.status === 'VALIDATED') {
    const balanceChange = newTransaction.direction === 'CREDIT'
      ? newTransaction.amount
      : -newTransaction.amount;
    
    const accountIndex = mockBankAccounts.findIndex(a => a.id === data.bankAccountId);
    if (accountIndex !== -1) {
      mockBankAccounts[accountIndex].currentBalance += balanceChange;
    }
  }
  
  return newTransaction;
}

export async function updateBankTransaction(
  id: string,
  data: UpdateBankTransactionData
): Promise<BankTransaction> {
  await wait(400);
  
  const index = mockBankTransactions.findIndex(t => t.id === id);
  if (index === -1) {
    throw new Error('Transaction non trouvée');
  }
  
  const currentTxn = mockBankTransactions[index];
  
  // Interdire modification si validée (sauf annulation)
  if (currentTxn.status === 'VALIDATED' && data.status !== 'CANCELLED') {
    throw new Error('Impossible de modifier une transaction validée');
  }
  
  mockBankTransactions[index] = {
    ...currentTxn,
    ...data,
    updatedAt: getCurrentTimestamp(),
  };
  
  return mockBankTransactions[index];
}

export async function validateBankTransaction(id: string): Promise<BankTransaction> {
  await wait(300);
  
  const index = mockBankTransactions.findIndex(t => t.id === id);
  if (index === -1) {
    throw new Error('Transaction non trouvée');
  }
  
  const txn = mockBankTransactions[index];
  
  if (txn.status !== 'DRAFT') {
    throw new Error('Seules les transactions en brouillon peuvent être validées');
  }
  
  mockBankTransactions[index] = {
    ...txn,
    status: 'VALIDATED',
    updatedAt: getCurrentTimestamp(),
  };
  
  // Mettre à jour le solde du compte
  const balanceChange = txn.direction === 'CREDIT' ? txn.amount : -txn.amount;
  const accountIndex = mockBankAccounts.findIndex(a => a.id === txn.bankAccountId);
  if (accountIndex !== -1) {
    mockBankAccounts[accountIndex].currentBalance += balanceChange;
  }
  
  return mockBankTransactions[index];
}

export async function cancelBankTransaction(id: string): Promise<BankTransaction> {
  await wait(300);
  
  const index = mockBankTransactions.findIndex(t => t.id === id);
  if (index === -1) {
    throw new Error('Transaction non trouvée');
  }
  
  const txn = mockBankTransactions[index];
  
  if (txn.status === 'CANCELLED') {
    throw new Error('Transaction déjà annulée');
  }
  
  // Si validée, inverser l'impact sur le solde
  if (txn.status === 'VALIDATED') {
    const balanceChange = txn.direction === 'CREDIT' ? -txn.amount : txn.amount;
    const accountIndex = mockBankAccounts.findIndex(a => a.id === txn.bankAccountId);
    if (accountIndex !== -1) {
      mockBankAccounts[accountIndex].currentBalance += balanceChange;
    }
  }
  
  mockBankTransactions[index] = {
    ...txn,
    status: 'CANCELLED',
    updatedAt: getCurrentTimestamp(),
  };
  
  return mockBankTransactions[index];
}

export async function deleteBankTransaction(id: string): Promise<void> {
  await wait(300);
  
  const index = mockBankTransactions.findIndex(t => t.id === id);
  if (index === -1) {
    throw new Error('Transaction non trouvée');
  }
  
  const txn = mockBankTransactions[index];
  
  if (txn.status !== 'DRAFT') {
    throw new Error('Seules les transactions en brouillon peuvent être supprimées');
  }
  
  mockBankTransactions.splice(index, 1);
}

// =============================================================================
// CHÈQUES
// =============================================================================

export async function getChecks(filters?: CheckFilters): Promise<Check[]> {
  await wait(300);
  
  let checks = [...mockChecks];
  
  // Enrichir avec le nom du compte
  checks = checks.map(check => {
    const account = mockBankAccounts.find(a => a.id === check.bankAccountId);
    return {
      ...check,
      bankAccountName: account?.name || 'Compte inconnu',
    };
  });
  
  // Appliquer les filtres
  if (filters) {
    if (filters.bankAccountId) {
      checks = checks.filter(c => c.bankAccountId === filters.bankAccountId);
    }
    if (filters.type) {
      checks = checks.filter(c => c.type === filters.type);
    }
    if (filters.status) {
      checks = checks.filter(c => c.status === filters.status);
    }
    if (filters.dateFrom) {
      checks = checks.filter(c => c.issueDate >= filters.dateFrom!);
    }
    if (filters.dateTo) {
      checks = checks.filter(c => c.issueDate <= filters.dateTo!);
    }
    if (filters.search) {
      const search = filters.search.toLowerCase();
      checks = checks.filter(c =>
        c.checkNumber.toLowerCase().includes(search) ||
        c.partnerName.toLowerCase().includes(search) ||
        c.description?.toLowerCase().includes(search)
      );
    }
  }
  
  // Trier par date décroissante
  return checks.sort(
    (a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()
  );
}

export async function getCheckById(id: string): Promise<Check | null> {
  await wait(100);
  
  const check = mockChecks.find(c => c.id === id);
  if (!check) return null;
  
  const account = mockBankAccounts.find(a => a.id === check.bankAccountId);
  return {
    ...check,
    bankAccountName: account?.name,
  };
}

export async function createCheck(data: CreateCheckData): Promise<Check> {
  await wait(400);
  
  const account = mockBankAccounts.find(a => a.id === data.bankAccountId);
  if (!account) {
    throw new Error('Compte bancaire non trouvé');
  }
  
  // Vérifier unicité du numéro de chèque pour ce compte
  const existingCheck = mockChecks.find(
    c => c.bankAccountId === data.bankAccountId && 
         c.checkNumber === data.checkNumber
  );
  if (existingCheck) {
    throw new Error(`Le chèque n°${data.checkNumber} existe déjà pour ce compte`);
  }
  
  const newCheck: Check = {
    id: generateId(),
    ...data,
    bankAccountName: account.name,
    status: 'PENDING',
    createdAt: getCurrentTimestamp(),
    updatedAt: getCurrentTimestamp(),
  };
  
  mockChecks.push(newCheck);
  return newCheck;
}

export async function updateCheck(id: string, data: UpdateCheckData): Promise<Check> {
  await wait(400);
  
  const index = mockChecks.findIndex(c => c.id === id);
  if (index === -1) {
    throw new Error('Chèque non trouvé');
  }
  
  const currentCheck = mockChecks[index];
  
  // Interdire modification si pas en attente
  if (currentCheck.status !== 'PENDING') {
    throw new Error('Seuls les chèques en attente peuvent être modifiés');
  }
  
  mockChecks[index] = {
    ...currentCheck,
    ...data,
    updatedAt: getCurrentTimestamp(),
  };
  
  return mockChecks[index];
}

export async function updateCheckStatus(
  id: string,
  status: CheckStatus,
  additionalData?: {
    depositDate?: string;
    cashedDate?: string;
    rejectedDate?: string;
    rejectionReason?: string;
  }
): Promise<Check> {
  await wait(400);
  
  const index = mockChecks.findIndex(c => c.id === id);
  if (index === -1) {
    throw new Error('Chèque non trouvé');
  }
  
  mockChecks[index] = {
    ...mockChecks[index],
    status,
    ...additionalData,
    updatedAt: getCurrentTimestamp(),
  };
  
  return mockChecks[index];
}

export async function deleteCheck(id: string): Promise<void> {
  await wait(300);
  
  const index = mockChecks.findIndex(c => c.id === id);
  if (index === -1) {
    throw new Error('Chèque non trouvé');
  }
  
  const check = mockChecks[index];
  
  if (check.status !== 'PENDING') {
    throw new Error('Seuls les chèques en attente peuvent être supprimés');
  }
  
  mockChecks.splice(index, 1);
}

// =============================================================================
// STATISTIQUES
// =============================================================================

export async function getBankTransactionStats(bankAccountId?: string): Promise<{
  totalTransactions: number;
  totalCredits: number;
  totalDebits: number;
  draftCount: number;
  validatedCount: number;
}> {
  await wait(200);
  
  let transactions = [...mockBankTransactions];
  
  if (bankAccountId) {
    transactions = transactions.filter(t => t.bankAccountId === bankAccountId);
  }
  
  const validated = transactions.filter(t => t.status === 'VALIDATED');
  const credits = validated.filter(t => t.direction === 'CREDIT');
  const debits = validated.filter(t => t.direction === 'DEBIT');
  
  return {
    totalTransactions: transactions.length,
    totalCredits: credits.reduce((sum, t) => sum + t.amount, 0),
    totalDebits: debits.reduce((sum, t) => sum + t.amount, 0),
    draftCount: transactions.filter(t => t.status === 'DRAFT').length,
    validatedCount: validated.length,
  };
}

export async function getCheckStats(bankAccountId?: string): Promise<{
  totalChecks: number;
  pendingCount: number;
  pendingAmount: number;
  depositedCount: number;
  depositedAmount: number;
  cashedCount: number;
  rejectedCount: number;
}> {
  await wait(200);
  
  let checks = [...mockChecks];
  
  if (bankAccountId) {
    checks = checks.filter(c => c.bankAccountId === bankAccountId);
  }
  
  const pending = checks.filter(c => c.status === 'PENDING');
  const deposited = checks.filter(c => c.status === 'DEPOSITED');
  
  return {
    totalChecks: checks.length,
    pendingCount: pending.length,
    pendingAmount: pending.reduce((sum, c) => sum + c.amount, 0),
    depositedCount: deposited.length,
    depositedAmount: deposited.reduce((sum, c) => sum + c.amount, 0),
    cashedCount: checks.filter(c => c.status === 'CASHED').length,
    rejectedCount: checks.filter(c => c.status === 'REJECTED').length,
  };
}