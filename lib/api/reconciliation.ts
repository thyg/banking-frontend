/**
 * @file lib/api/reconciliation.ts
 * @description API pour le rapprochement bancaire unifié.
 * Gère la recherche de suggestions, le rapprochement manuel et automatique.
 * 
 * @version 1.0.0 - Incrément 4
 */

import {
  BankStatement,
  BankStatementLine,
  BankTransaction,
  Check,
  ReconciliationSuggestion,
  ReconciliationMatch,
  ReconciliationStats,
  ReconciliationSearchOptions,
  BulkReconciliationResult,
  ReconciliationTargetType,
} from '@/types/banking';

import {
  mockBankStatements,
  mockStatementLines,
  mockBankTransactions,
  mockChecks,
  mockBankAccounts,
  generateId,
  getCurrentTimestamp,
} from '@/lib/mock-db';

import {
  generateSuggestions,
  bulkAutoMatch,
  canAutoReconcile,
} from '@/lib/reconciliation-engine';

// =============================================================================
// UTILITAIRES
// =============================================================================

const wait = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms));

// =============================================================================
// RELEVÉS BANCAIRES
// =============================================================================

/**
 * Récupère la liste des relevés bancaires.
 */
export async function getBankStatements(
  bankAccountId?: string
): Promise<BankStatement[]> {
  await wait(200);
  console.log('[API:Reconciliation] getBankStatements - accountId:', bankAccountId);
  
  let statements = [...mockBankStatements];
  
  if (bankAccountId) {
    statements = statements.filter(s => s.bankAccountId === bankAccountId);
  }
  
  // Enrichir avec le nom du compte
  return statements.map(statement => {
    const account = mockBankAccounts.find(a => a.id === statement.bankAccountId);
    return {
      ...statement,
      bankAccountName: account?.name || 'Compte inconnu',
    };
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * Récupère un relevé par son ID.
 */
export async function getBankStatementById(
  statementId: string
): Promise<BankStatement | null> {
  await wait(100);
  
  const statement = mockBankStatements.find(s => s.id === statementId);
  if (!statement) return null;
  
  const account = mockBankAccounts.find(a => a.id === statement.bankAccountId);
  return {
    ...statement,
    bankAccountName: account?.name || 'Compte inconnu',
  };
}

/**
 * Récupère les lignes d'un relevé.
 */
export async function getStatementLines(
  statementId: string,
  onlyUnreconciled: boolean = false
): Promise<BankStatementLine[]> {
  await wait(200);
  console.log('[API:Reconciliation] getStatementLines - statementId:', statementId);
  
  let lines = mockStatementLines.filter(l => l.statementId === statementId);
  
  if (onlyUnreconciled) {
    lines = lines.filter(l => !l.isReconciled);
  }
  
  return lines.sort((a, b) => a.lineNumber - b.lineNumber);
}

/**
 * Récupère une ligne de relevé par son ID.
 */
export async function getStatementLineById(
  lineId: string
): Promise<BankStatementLine | null> {
  await wait(50);
  return mockStatementLines.find(l => l.id === lineId) || null;
}

// =============================================================================
// SUGGESTIONS DE RAPPROCHEMENT
// =============================================================================

/**
 * Récupère les suggestions de rapprochement pour une ligne de relevé.
 * Recherche dans les transactions manuelles, chèques, factures, etc.
 */
export async function getReconciliationSuggestions(
  lineId: string,
  options?: ReconciliationSearchOptions
): Promise<ReconciliationSuggestion[]> {
  await wait(300);
  console.log('[API:Reconciliation] getReconciliationSuggestions - lineId:', lineId);
  
  const line = mockStatementLines.find(l => l.id === lineId);
  if (!line) {
    console.warn('[API:Reconciliation] Ligne non trouvée:', lineId);
    return [];
  }
  
  // Récupérer les candidats du même compte
  const accountTransactions = mockBankTransactions.filter(
    t => t.bankAccountId === line.bankAccountId && 
         t.status === 'VALIDATED' && 
         !t.isReconciled
  );
  
  const accountChecks = mockChecks.filter(
    c => c.bankAccountId === line.bankAccountId && 
         c.status === 'CASHED'
  );
  
  // Générer les suggestions via le moteur
  const suggestions = generateSuggestions(
    line,
    {
      transactions: accountTransactions,
      checks: accountChecks,
      // invoices et bills seraient ajoutés ici
    },
    options
  );
  
  return suggestions;
}

/**
 * Récupère toutes les suggestions pour un relevé entier.
 */
export async function getAllSuggestionsForStatement(
  statementId: string,
  options?: ReconciliationSearchOptions
): Promise<Map<string, ReconciliationSuggestion[]>> {
  await wait(500);
  console.log('[API:Reconciliation] getAllSuggestionsForStatement');
  
  const lines = mockStatementLines.filter(
    l => l.statementId === statementId && !l.isReconciled
  );
  
  const statement = mockBankStatements.find(s => s.id === statementId);
  if (!statement) return new Map();
  
  // Récupérer tous les candidats
  const accountTransactions = mockBankTransactions.filter(
    t => t.bankAccountId === statement.bankAccountId && 
         t.status === 'VALIDATED' && 
         !t.isReconciled
  );
  
  const accountChecks = mockChecks.filter(
    c => c.bankAccountId === statement.bankAccountId && 
         c.status === 'CASHED'
  );
  
  const result = new Map<string, ReconciliationSuggestion[]>();
  
  for (const line of lines) {
    const suggestions = generateSuggestions(
      line,
      { transactions: accountTransactions, checks: accountChecks },
      options
    );
    result.set(line.id, suggestions);
  }
  
  return result;
}

// =============================================================================
// ACTIONS DE RAPPROCHEMENT
// =============================================================================

/**
 * Rapproche une ligne de relevé avec une cible (transaction, chèque, facture).
 */
export async function reconcileLine(
  lineId: string,
  targetId: string,
  targetType: ReconciliationTargetType
): Promise<{ success: boolean; error?: string }> {
  await wait(400);
  console.log(`[API:Reconciliation] reconcileLine: ${lineId} -> ${targetType}:${targetId}`);
  
  // Trouver la ligne
  const lineIndex = mockStatementLines.findIndex(l => l.id === lineId);
  if (lineIndex === -1) {
    return { success: false, error: 'Ligne de relevé introuvable' };
  }
  
  const line = mockStatementLines[lineIndex];
  
  // Vérifier que la ligne n'est pas déjà rapprochée
  if (line.isReconciled) {
    return { success: false, error: 'Cette ligne est déjà rapprochée' };
  }
  
  // Marquer la ligne comme rapprochée
  mockStatementLines[lineIndex] = {
    ...line,
    isReconciled: true,
    reconciledWithId: targetId,
    reconciledWithType: targetType,
    reconciledAt: getCurrentTimestamp(),
    updatedAt: getCurrentTimestamp(),
  };
  
  // Marquer la cible comme rapprochée selon le type
  if (targetType === 'transaction') {
    const txnIndex = mockBankTransactions.findIndex(t => t.id === targetId);
    if (txnIndex !== -1) {
      mockBankTransactions[txnIndex] = {
        ...mockBankTransactions[txnIndex],
        isReconciled: true,
        reconciledStatementLineId: lineId,
        reconciledAt: getCurrentTimestamp(),
        updatedAt: getCurrentTimestamp(),
      };
    }
  }
  
  // Mettre à jour le statut du relevé
  await updateStatementStatus(line.statementId);
  
  return { success: true };
}

/**
 * Annule le rapprochement d'une ligne.
 */
export async function unreconcileLine(
  lineId: string
): Promise<{ success: boolean; error?: string }> {
  await wait(300);
  console.log('[API:Reconciliation] unreconcileLine:', lineId);
  
  const lineIndex = mockStatementLines.findIndex(l => l.id === lineId);
  if (lineIndex === -1) {
    return { success: false, error: 'Ligne introuvable' };
  }
  
  const line = mockStatementLines[lineIndex];
  
  if (!line.isReconciled) {
    return { success: false, error: 'Cette ligne n\'est pas rapprochée' };
  }
  
  // Dé-rapprocher la cible si c'est une transaction
  if (line.reconciledWithType === 'transaction' && line.reconciledWithId) {
    const txnIndex = mockBankTransactions.findIndex(t => t.id === line.reconciledWithId);
    if (txnIndex !== -1) {
      mockBankTransactions[txnIndex] = {
        ...mockBankTransactions[txnIndex],
        isReconciled: false,
        reconciledStatementLineId: undefined,
        reconciledAt: undefined,
        updatedAt: getCurrentTimestamp(),
      };
    }
  }
  
  // Dé-rapprocher la ligne
  mockStatementLines[lineIndex] = {
    ...line,
    isReconciled: false,
    reconciledWithId: undefined,
    reconciledWithType: undefined,
    reconciledAt: undefined,
    updatedAt: getCurrentTimestamp(),
  };
  
  // Mettre à jour le statut du relevé
  await updateStatementStatus(line.statementId);
  
  return { success: true };
}

/**
 * Rapprochement automatique en lot pour un relevé.
 */
export async function bulkReconcile(
  statementId: string,
  options?: ReconciliationSearchOptions
): Promise<BulkReconciliationResult> {
  await wait(1000);
  console.log('[API:Reconciliation] bulkReconcile - statementId:', statementId);
  
  const statement = mockBankStatements.find(s => s.id === statementId);
  if (!statement) {
    return {
      success: false,
      totalProcessed: 0,
      reconciled: 0,
      skipped: 0,
      errors: 1,
      details: [{ lineId: '', status: 'error', reason: 'Relevé introuvable' }],
    };
  }
  
  // Récupérer les lignes non rapprochées
  const lines = mockStatementLines.filter(
    l => l.statementId === statementId && !l.isReconciled
  );
  
  // Récupérer les candidats
  const transactions = mockBankTransactions.filter(
    t => t.bankAccountId === statement.bankAccountId && 
         t.status === 'VALIDATED' && 
         !t.isReconciled
  );
  
  const checks = mockChecks.filter(
    c => c.bankAccountId === statement.bankAccountId && 
         c.status === 'CASHED'
  );
  
  // Effectuer le matching automatique
  const matches = bulkAutoMatch(lines, { transactions, checks }, options);
  
  const details: BulkReconciliationResult['details'] = [];
  let reconciled = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const line of lines) {
    const match = matches.get(line.id);
    
    if (match) {
      const result = await reconcileLine(line.id, match.id, match.type);
      if (result.success) {
        reconciled++;
        details.push({
          lineId: line.id,
          status: 'reconciled',
          matchedWith: `${match.type}:${match.id}`,
        });
      } else {
        errors++;
        details.push({
          lineId: line.id,
          status: 'error',
          reason: result.error,
        });
      }
    } else {
      skipped++;
      details.push({
        lineId: line.id,
        status: 'skipped',
        reason: 'Aucun match automatique trouvé',
      });
    }
  }
  
  return {
    success: errors === 0,
    totalProcessed: lines.length,
    reconciled,
    skipped,
    errors,
    details,
  };
}

/**
 * Crée une transaction manuelle et rapproche la ligne en même temps.
 */
export async function reconcileWithNewTransaction(
  lineId: string,
  transactionData: {
    transactionTypeId: string;
    label?: string;
    partnerName?: string;
    notes?: string;
  }
): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  await wait(500);
  console.log('[API:Reconciliation] reconcileWithNewTransaction:', lineId);
  
  const line = mockStatementLines.find(l => l.id === lineId);
  if (!line) {
    return { success: false, error: 'Ligne introuvable' };
  }
  
  // Créer la transaction
  const newTransaction: BankTransaction = {
    id: generateId(),
    bankAccountId: line.bankAccountId,
    transactionTypeId: transactionData.transactionTypeId,
    transactionDate: line.date,
    valueDate: line.valueDate,
    reference: line.reference,
    label: transactionData.label || line.label,
    amount: Math.abs(line.amount),
    direction: line.amount >= 0 ? 'CREDIT' : 'DEBIT',
    currency: line.currency,
    partnerName: transactionData.partnerName || line.partnerName,
    status: 'VALIDATED',
    notes: transactionData.notes,
    isReconciled: true,
    reconciledStatementLineId: lineId,
    reconciledAt: getCurrentTimestamp(),
    createdAt: getCurrentTimestamp(),
    updatedAt: getCurrentTimestamp(),
  };
  
  mockBankTransactions.push(newTransaction);
  
  // Rapprocher la ligne
  const lineIndex = mockStatementLines.findIndex(l => l.id === lineId);
  mockStatementLines[lineIndex] = {
    ...line,
    isReconciled: true,
    reconciledWithId: newTransaction.id,
    reconciledWithType: 'transaction',
    reconciledAt: getCurrentTimestamp(),
    updatedAt: getCurrentTimestamp(),
  };
  
  // Mettre à jour le solde du compte
  const accountIndex = mockBankAccounts.findIndex(a => a.id === line.bankAccountId);
  if (accountIndex !== -1) {
    const balanceChange = newTransaction.direction === 'CREDIT' 
      ? newTransaction.amount 
      : -newTransaction.amount;
    mockBankAccounts[accountIndex].currentBalance += balanceChange;
  }
  
  // Mettre à jour le statut du relevé
  await updateStatementStatus(line.statementId);
  
  return { success: true, transactionId: newTransaction.id };
}

// =============================================================================
// STATISTIQUES
// =============================================================================

/**
 * Récupère les statistiques de rapprochement pour un compte.
 */
export async function getReconciliationStats(
  bankAccountId: string
): Promise<ReconciliationStats> {
  await wait(200);
  console.log('[API:Reconciliation] getReconciliationStats:', bankAccountId);
  
  // Lignes de relevé pour ce compte
  const statementLines = mockStatementLines.filter(
    l => l.bankAccountId === bankAccountId
  );
  const reconciledLines = statementLines.filter(l => l.isReconciled);
  const pendingLines = statementLines.filter(l => !l.isReconciled);
  
  // Transactions pour ce compte
  const transactions = mockBankTransactions.filter(
    t => t.bankAccountId === bankAccountId && t.status === 'VALIDATED'
  );
  const reconciledTxns = transactions.filter(t => t.isReconciled);
  const unreconciledTxns = transactions.filter(t => !t.isReconciled);
  
  // Calculs de montants
  const totalRelevé = statementLines.reduce((sum, l) => sum + l.amount, 0);
  const reconciledAmount = reconciledLines.reduce((sum, l) => sum + l.amount, 0);
  const pendingAmount = pendingLines.reduce((sum, l) => sum + l.amount, 0);
  
  const totalTransactions = transactions.reduce((sum, t) => {
    return sum + (t.direction === 'CREDIT' ? t.amount : -t.amount);
  }, 0);
  
  return {
    totalStatementLines: statementLines.length,
    reconciledLines: reconciledLines.length,
    pendingLines: pendingLines.length,
    reconciledPercentage: statementLines.length > 0 
      ? Math.round((reconciledLines.length / statementLines.length) * 100) 
      : 0,
    totalTransactions: transactions.length,
    reconciledTransactions: reconciledTxns.length,
    unreconciledTransactions: unreconciledTxns.length,
    totalAmount: totalRelevé,
    reconciledAmount,
    pendingAmount,
    discrepancy: totalRelevé - totalTransactions,
  };
}

/**
 * Récupère les statistiques pour un relevé spécifique.
 */
export async function getStatementReconciliationStats(
  statementId: string
): Promise<{
  totalLines: number;
  reconciledLines: number;
  pendingLines: number;
  percentage: number;
  totalAmount: number;
  reconciledAmount: number;
  pendingAmount: number;
}> {
  await wait(100);
  
  const lines = mockStatementLines.filter(l => l.statementId === statementId);
  const reconciled = lines.filter(l => l.isReconciled);
  const pending = lines.filter(l => !l.isReconciled);
  
  return {
    totalLines: lines.length,
    reconciledLines: reconciled.length,
    pendingLines: pending.length,
    percentage: lines.length > 0 
      ? Math.round((reconciled.length / lines.length) * 100) 
      : 0,
    totalAmount: lines.reduce((s, l) => s + l.amount, 0),
    reconciledAmount: reconciled.reduce((s, l) => s + l.amount, 0),
    pendingAmount: pending.reduce((s, l) => s + l.amount, 0),
  };
}

// =============================================================================
// HELPERS INTERNES
// =============================================================================

/**
 * Met à jour le statut d'un relevé en fonction de ses lignes.
 */
async function updateStatementStatus(statementId: string): Promise<void> {
  const statementIndex = mockBankStatements.findIndex(s => s.id === statementId);
  if (statementIndex === -1) return;
  
  const lines = mockStatementLines.filter(l => l.statementId === statementId);
  const reconciledCount = lines.filter(l => l.isReconciled).length;
  
  let status: 'DRAFT' | 'PARTIAL' | 'RECONCILED' = 'DRAFT';
  if (reconciledCount === lines.length && lines.length > 0) {
    status = 'RECONCILED';
  } else if (reconciledCount > 0) {
    status = 'PARTIAL';
  }
  
  mockBankStatements[statementIndex] = {
    ...mockBankStatements[statementIndex],
    reconciledCount,
    status,
    reconciledAt: status === 'RECONCILED' ? getCurrentTimestamp() : undefined,
    updatedAt: getCurrentTimestamp(),
  };
}