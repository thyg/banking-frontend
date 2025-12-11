/**
 * @file lib/api/check.ts
 * @description API mock pour la gestion des chèques (émis et reçus).
 * En production, ces fonctions feront de vrais appels HTTP au backend.
 * 
 * @version 1.0.0 - Incrément 3
 */

import {
  Check,
  CheckType,
  CheckStatus,
  CreateCheckData,
  UpdateCheckData,
  CheckFilters,
  BankTransaction,
} from '@/types/banking';

import {
  mockChecks,
  mockBankAccounts,
  mockBankTransactions,
  mockTransactionTypes,
  generateId,
  getCurrentTimestamp,
} from '@/lib/mock-db';

// =============================================================================
// UTILITAIRES
// =============================================================================

const wait = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Enrichit un chèque avec les données dénormalisées.
 */
function enrichCheck(check: Check): Check {
  const account = mockBankAccounts.find(a => a.id === check.bankAccountId);
  
  return {
    ...check,
    bankAccountName: account?.name || check.bankAccountName,
  };
}

// =============================================================================
// API CHÈQUES
// =============================================================================

/**
 * Récupère les chèques avec filtres optionnels.
 */
export async function getChecks(filters?: CheckFilters): Promise<Check[]> {
  await wait(300);
  console.log('[API] getChecks - filters:', filters);
  
  let checks = [...mockChecks].map(enrichCheck);
  
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
    if (filters.minAmount !== undefined) {
      checks = checks.filter(c => c.amount >= filters.minAmount!);
    }
    if (filters.maxAmount !== undefined) {
      checks = checks.filter(c => c.amount <= filters.maxAmount!);
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      checks = checks.filter(c =>
        c.checkNumber.toLowerCase().includes(searchLower) ||
        c.partnerName.toLowerCase().includes(searchLower) ||
        c.description?.toLowerCase().includes(searchLower)
      );
    }
  }
  
  // Trier par date d'émission décroissante
  checks.sort((a, b) =>
    new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()
  );
  
  return checks;
}

/**
 * Récupère un chèque par son ID.
 */
export async function getCheckById(id: string): Promise<Check | null> {
  await wait(150);
  console.log('[API] getCheckById:', id);
  
  const check = mockChecks.find(c => c.id === id);
  return check ? enrichCheck(check) : null;
}

/**
 * Crée un nouveau chèque.
 */
export async function createCheck(data: CreateCheckData): Promise<Check> {
  await wait(400);
  console.log('[API] createCheck:', data);
  
  // Vérifier que le compte existe
  const account = mockBankAccounts.find(a => a.id === data.bankAccountId);
  if (!account) {
    throw new Error('Compte bancaire introuvable.');
  }
  
  // Vérifier l'unicité du numéro de chèque pour ce compte
  const existingCheck = mockChecks.find(
    c => c.checkNumber === data.checkNumber && c.bankAccountId === data.bankAccountId
  );
  if (existingCheck) {
    throw new Error(`Un chèque avec le numéro "${data.checkNumber}" existe déjà pour ce compte.`);
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
  console.log('[API] Chèque créé:', newCheck.id);
  
  return enrichCheck(newCheck);
}

/**
 * Met à jour un chèque existant.
 */
export async function updateCheck(id: string, data: UpdateCheckData): Promise<Check> {
  await wait(350);
  console.log('[API] updateCheck:', id, data);
  
  const index = mockChecks.findIndex(c => c.id === id);
  if (index === -1) {
    throw new Error('Chèque introuvable.');
  }
  
  const existingCheck = mockChecks[index];
  
  // Empêcher la modification si déjà encaissé ou annulé
  if (['CASHED', 'CANCELLED'].includes(existingCheck.status)) {
    throw new Error('Ce chèque ne peut plus être modifié.');
  }
  
  mockChecks[index] = {
    ...existingCheck,
    ...data,
    updatedAt: getCurrentTimestamp(),
  };
  
  return enrichCheck(mockChecks[index]);
}

/**
 * Supprime un chèque (en attente uniquement).
 */
export async function deleteCheck(id: string): Promise<void> {
  await wait(300);
  console.log('[API] deleteCheck:', id);
  
  const index = mockChecks.findIndex(c => c.id === id);
  if (index === -1) {
    throw new Error('Chèque introuvable.');
  }
  
  const check = mockChecks[index];
  
  if (check.status !== 'PENDING') {
    throw new Error('Seuls les chèques en attente peuvent être supprimés.');
  }
  
  mockChecks.splice(index, 1);
  console.log('[API] Chèque supprimé:', id);
}

// =============================================================================
// ACTIONS SUR LES CHÈQUES
// =============================================================================

/**
 * Remet un chèque reçu en banque (passage en DEPOSITED).
 */
export async function depositCheck(id: string, depositDate?: string): Promise<Check> {
  await wait(400);
  console.log('[API] depositCheck:', id);
  
  const index = mockChecks.findIndex(c => c.id === id);
  if (index === -1) {
    throw new Error('Chèque introuvable.');
  }
  
  const check = mockChecks[index];
  
  if (check.type !== 'RECEIVED') {
    throw new Error('Seuls les chèques reçus peuvent être remis en banque.');
  }
  
  if (check.status !== 'PENDING') {
    throw new Error('Ce chèque a déjà été remis ou traité.');
  }
  
  mockChecks[index] = {
    ...check,
    status: 'DEPOSITED',
    depositDate: depositDate || getCurrentTimestamp().split('T')[0],
    updatedAt: getCurrentTimestamp(),
  };
  
  console.log('[API] Chèque remis en banque:', id);
  return enrichCheck(mockChecks[index]);
}

/**
 * Marque un chèque comme encaissé/débité.
 * Crée automatiquement la transaction bancaire associée.
 */
export async function cashCheck(id: string, cashedDate?: string): Promise<Check> {
  await wait(500);
  console.log('[API] cashCheck:', id);
  
  const index = mockChecks.findIndex(c => c.id === id);
  if (index === -1) {
    throw new Error('Chèque introuvable.');
  }
  
  const check = mockChecks[index];
  
  // Vérifier le statut selon le type
  if (check.type === 'RECEIVED' && check.status !== 'DEPOSITED') {
    throw new Error('Un chèque reçu doit d\'abord être remis en banque.');
  }
  if (check.type === 'ISSUED' && check.status !== 'PENDING') {
    throw new Error('Ce chèque a déjà été traité.');
  }
  
  // Trouver le type de transaction approprié
  const transactionType = mockTransactionTypes.find(
    t => t.code === (check.type === 'ISSUED' ? 'CHQ_EMI' : 'CHQ_REC')
  );
  
  // Créer la transaction bancaire
  const direction = check.type === 'ISSUED' ? 'DEBIT' : 'CREDIT';
  const bankTransaction: BankTransaction = {
    id: generateId(),
    bankAccountId: check.bankAccountId,
    bankAccountName: check.bankAccountName,
    transactionTypeId: transactionType?.id || 'tt-002',
    transactionTypeCode: transactionType?.code,
    transactionTypeLabel: transactionType?.label,
    transactionDate: cashedDate || getCurrentTimestamp().split('T')[0],
    reference: `CHQ-${check.checkNumber}`,
    label: `Chèque n°${check.checkNumber} - ${check.partnerName}`,
    amount: check.amount,
    direction,
    currency: check.currency,
    partnerName: check.partnerName,
    partnerId: check.partnerId,
    status: 'VALIDATED',
    checkId: check.id,
    isReconciled: false,
    createdAt: getCurrentTimestamp(),
    updatedAt: getCurrentTimestamp(),
  };
  
  mockBankTransactions.push(bankTransaction);
  
  // Mettre à jour le solde du compte
  const accountIndex = mockBankAccounts.findIndex(a => a.id === check.bankAccountId);
  if (accountIndex !== -1) {
    if (direction === 'CREDIT') {
      mockBankAccounts[accountIndex].currentBalance += check.amount;
    } else {
      mockBankAccounts[accountIndex].currentBalance -= check.amount;
    }
    mockBankAccounts[accountIndex].updatedAt = getCurrentTimestamp();
  }
  
  // Mettre à jour le chèque
  mockChecks[index] = {
    ...check,
    status: 'CASHED',
    cashedDate: cashedDate || getCurrentTimestamp().split('T')[0],
    bankTransactionId: bankTransaction.id,
    updatedAt: getCurrentTimestamp(),
  };
  
  console.log('[API] Chèque encaissé:', id, '- Transaction créée:', bankTransaction.id);
  return enrichCheck(mockChecks[index]);
}

/**
 * Marque un chèque comme rejeté.
 */
export async function rejectCheck(
  id: string, 
  rejectionReason: string,
  rejectedDate?: string
): Promise<Check> {
  await wait(400);
  console.log('[API] rejectCheck:', id, rejectionReason);
  
  const index = mockChecks.findIndex(c => c.id === id);
  if (index === -1) {
    throw new Error('Chèque introuvable.');
  }
  
  const check = mockChecks[index];
  
  if (['CASHED', 'CANCELLED', 'REJECTED'].includes(check.status)) {
    throw new Error('Ce chèque ne peut pas être rejeté.');
  }
  
  mockChecks[index] = {
    ...check,
    status: 'REJECTED',
    rejectedDate: rejectedDate || getCurrentTimestamp().split('T')[0],
    rejectionReason,
    updatedAt: getCurrentTimestamp(),
  };
  
  console.log('[API] Chèque rejeté:', id);
  return enrichCheck(mockChecks[index]);
}

/**
 * Annule un chèque émis (avant qu'il soit débité).
 */
export async function cancelCheck(id: string): Promise<Check> {
  await wait(300);
  console.log('[API] cancelCheck:', id);
  
  const index = mockChecks.findIndex(c => c.id === id);
  if (index === -1) {
    throw new Error('Chèque introuvable.');
  }
  
  const check = mockChecks[index];
  
  if (check.status !== 'PENDING') {
    throw new Error('Seuls les chèques en attente peuvent être annulés.');
  }
  
  mockChecks[index] = {
    ...check,
    status: 'CANCELLED',
    updatedAt: getCurrentTimestamp(),
  };
  
  console.log('[API] Chèque annulé:', id);
  return enrichCheck(mockChecks[index]);
}

// =============================================================================
// STATISTIQUES
// =============================================================================

/**
 * Récupère les statistiques des chèques.
 */
export async function getCheckStats(
  bankAccountId?: string,
  type?: CheckType
): Promise<{
  totalChecks: number;
  pendingCount: number;
  pendingAmount: number;
  depositedCount: number;
  depositedAmount: number;
  cashedCount: number;
  cashedAmount: number;
  rejectedCount: number;
  rejectedAmount: number;
}> {
  await wait(200);
  console.log('[API] getCheckStats');
  
  let checks = [...mockChecks];
  
  if (bankAccountId) {
    checks = checks.filter(c => c.bankAccountId === bankAccountId);
  }
  if (type) {
    checks = checks.filter(c => c.type === type);
  }
  
  // Exclure les annulés
  checks = checks.filter(c => c.status !== 'CANCELLED');
  
  const byStatus = (status: CheckStatus) => checks.filter(c => c.status === status);
  const sumAmount = (arr: Check[]) => arr.reduce((sum, c) => sum + c.amount, 0);
  
  return {
    totalChecks: checks.length,
    pendingCount: byStatus('PENDING').length,
    pendingAmount: sumAmount(byStatus('PENDING')),
    depositedCount: byStatus('DEPOSITED').length,
    depositedAmount: sumAmount(byStatus('DEPOSITED')),
    cashedCount: byStatus('CASHED').length,
    cashedAmount: sumAmount(byStatus('CASHED')),
    rejectedCount: byStatus('REJECTED').length,
    rejectedAmount: sumAmount(byStatus('REJECTED')),
  };
}

/**
 * Récupère les chèques en attente (à surveiller).
 */
export async function getPendingChecks(
  type?: CheckType,
  limit: number = 10
): Promise<Check[]> {
  await wait(250);
  console.log('[API] getPendingChecks - type:', type, 'limit:', limit);
  
  let checks = mockChecks
    .filter(c => c.status === 'PENDING' || c.status === 'DEPOSITED')
    .map(enrichCheck);
  
  if (type) {
    checks = checks.filter(c => c.type === type);
  }
  
  // Trier par date d'échéance ou d'émission
  checks.sort((a, b) => {
    const dateA = a.dueDate || a.issueDate;
    const dateB = b.dueDate || b.issueDate;
    return new Date(dateA).getTime() - new Date(dateB).getTime();
  });
  
  return checks.slice(0, limit);
}