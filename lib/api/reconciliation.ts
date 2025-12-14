/**
 * @file lib/api/reconciliation.ts
 * @description API pour le rapprochement bancaire unifié.
 * Gère la recherche de suggestions, le rapprochement manuel et automatique.
 * 
 * @version 2.0.0 - Fix: Utilisation du backend réel au lieu des mocks
 * @author RT-ComOps Team
 * @since 2024-12-12
 */

import type {
  BankStatement,
  StatementLine,
  BankStatementLine,
  BankTransaction,
  Check,
  ReconciliationSuggestion,
  ReconciliationMatch,
  ReconciliationStats,
  ReconciliationSearchOptions,
  BulkReconciliationResult,
  ReconciliationTargetType,
  ReconciliationSummary,
  TransactionType,
} from '@/types/banking';

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
    const error = await response.json().catch(() => ({ message: 'Une erreur est survenue' }));
    throw new Error(error.message || `Erreur HTTP: ${response.status}`);
  }
  return response.json();
}

/**
 * Construit une URL avec des paramètres de requête.
 */
function buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
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

// =============================================================================
// RELEVÉS BANCAIRES
// =============================================================================

/**
 * Récupère la liste des relevés bancaires.
 * 
 * @param bankAccountId - Filtre par compte bancaire (optionnel)
 */
export async function getBankStatements(bankAccountId?: string): Promise<BankStatement[]> {
  console.log('[API:Reconciliation] getBankStatements - accountId:', bankAccountId);
  
  let url: string;
  if (bankAccountId) {
    url = `${API_BASE_URL}/bank-statements/account/${bankAccountId}`;
  } else {
    url = `${API_BASE_URL}/bank-statements`;
  }
  
  const response = await fetch(url);
  const statements = await handleResponse<BankStatement[]>(response);
  
  // Trier par date décroissante
  return statements.sort((a, b) => 
    new Date(b.statementDate).getTime() - new Date(a.statementDate).getTime()
  );
}

/**
 * Récupère un relevé par son ID.
 */
export async function getBankStatementById(statementId: string): Promise<BankStatement | null> {
  console.log('[API:Reconciliation] getBankStatementById:', statementId);
  
  try {
    const response = await fetch(`${API_BASE_URL}/bank-statements/${statementId}`);
    if (response.status === 404) {
      return null;
    }
    return handleResponse<BankStatement>(response);
  } catch (error) {
    console.error('[API:Reconciliation] Erreur getBankStatementById:', error);
    return null;
  }
}

/**
 * Récupère les lignes d'un relevé.
 * 
 * @param statementId - ID du relevé
 * @param onlyUnreconciled - Si true, retourne uniquement les lignes non rapprochées
 */
export async function getStatementLines(
  statementId: string,
  onlyUnreconciled: boolean = false
): Promise<StatementLine[]> {
  console.log('[API:Reconciliation] getStatementLines - statementId:', statementId, 'onlyUnreconciled:', onlyUnreconciled);
  
  let url: string;
  if (onlyUnreconciled) {
    url = `${API_BASE_URL}/statement-lines/statement/${statementId}/unmatched`;
  } else {
    url = `${API_BASE_URL}/statement-lines/statement/${statementId}`;
  }
  
  const response = await fetch(url);
  const lines = await handleResponse<StatementLine[]>(response);
  
  // Trier par numéro de ligne
  return lines.sort((a, b) => a.lineNumber - b.lineNumber);
}

/**
 * Récupère une ligne de relevé par son ID.
 */
export async function getStatementLineById(lineId: string): Promise<StatementLine | null> {
  console.log('[API:Reconciliation] getStatementLineById:', lineId);
  
  try {
    const response = await fetch(`${API_BASE_URL}/statement-lines/${lineId}`);
    if (response.status === 404) {
      return null;
    }
    return handleResponse<StatementLine>(response);
  } catch (error) {
    console.error('[API:Reconciliation] Erreur getStatementLineById:', error);
    return null;
  }
}

// =============================================================================
// SUGGESTIONS DE RAPPROCHEMENT
// =============================================================================

/**
 * Récupère les suggestions de rapprochement pour une ligne de relevé.
 * 
 * Cette fonction cherche les transactions et chèques qui pourraient correspondre
 * à une ligne de relevé donnée, en calculant un score de confiance.
 * 
 * @param lineId - ID de la ligne de relevé
 * @param options - Options de recherche (tolérance de date, montant, etc.)
 */
export async function getReconciliationSuggestions(
  lineId: string,
  options?: ReconciliationSearchOptions
): Promise<ReconciliationSuggestion[]> {
  console.log('[API:Reconciliation] getReconciliationSuggestions - lineId:', lineId);
  
  // Récupérer la ligne
  const line = await getStatementLineById(lineId);
  if (!line) {
    console.warn('[API:Reconciliation] Ligne non trouvée:', lineId);
    return [];
  }
  
  // Récupérer le relevé pour connaître le compte bancaire
  const statement = await getBankStatementById(line.bankStatementId);
  if (!statement) {
    console.warn('[API:Reconciliation] Relevé non trouvé pour la ligne:', lineId);
    return [];
  }
  
  const suggestions: ReconciliationSuggestion[] = [];
  
  // Récupérer les transactions non rapprochées du même compte
  try {
    const transactionsResponse = await fetch(
      `${API_BASE_URL}/bank-transactions/account/${statement.bankAccountId}`
    );
    const transactions = await handleResponse<BankTransaction[]>(transactionsResponse);
    
    // Filtrer les transactions validées et non rapprochées
    const unreconciledTransactions = transactions.filter(
      t => t.status === 'VALIDATED' && !t.isReconciled
    );
    
    // Générer les suggestions pour les transactions
    for (const txn of unreconciledTransactions) {
      const suggestion = generateTransactionSuggestion(line, txn, options);
      if (suggestion && suggestion.confidenceScore >= (options?.minimumConfidenceScore || 30)) {
        suggestions.push(suggestion);
      }
    }
  } catch (error) {
    console.error('[API:Reconciliation] Erreur récupération transactions:', error);
  }
  
  // Récupérer les chèques encaissés du même compte
  try {
    const checksResponse = await fetch(
      `${API_BASE_URL}/checks/account/${statement.bankAccountId}`
    );
    const checks = await handleResponse<Check[]>(checksResponse);
    
    // Filtrer les chèques encaissés
    const cashedChecks = checks.filter(c => c.status === 'CASHED');
    
    // Générer les suggestions pour les chèques
    for (const check of cashedChecks) {
      const suggestion = generateCheckSuggestion(line, check, options);
      if (suggestion && suggestion.confidenceScore >= (options?.minimumConfidenceScore || 30)) {
        suggestions.push(suggestion);
      }
    }
  } catch (error) {
    console.error('[API:Reconciliation] Erreur récupération chèques:', error);
  }
  
  // Trier par score décroissant
  suggestions.sort((a, b) => b.confidenceScore - a.confidenceScore);
  
  return suggestions;
}

/**
 * Génère une suggestion de rapprochement pour une transaction.
 */
function generateTransactionSuggestion(
  line: StatementLine,
  txn: BankTransaction,
  options?: ReconciliationSearchOptions
): ReconciliationSuggestion | null {
  const matchReasons: string[] = [];
  let score = 0;
  
  // Vérifier la direction
  const lineDirection = line.amount >= 0 ? 'CREDIT' : 'DEBIT';
  if (txn.direction !== lineDirection && txn.direction !== 'BOTH') {
    return null; // Direction incompatible
  }
  
  // Comparaison du montant (40 points max)
  const lineAmount = Math.abs(line.amount);
  const txnAmount = txn.amount;
  const amountDiff = Math.abs(lineAmount - txnAmount);
  const amountTolerance = options?.amountTolerance || 0.01;
  
  if (amountDiff <= amountTolerance) {
    score += 40;
    matchReasons.push('Montant exact');
  } else if (amountDiff <= lineAmount * 0.01) {
    score += 30;
    matchReasons.push('Montant proche (±1%)');
  } else if (amountDiff <= lineAmount * 0.05) {
    score += 15;
    matchReasons.push('Montant similaire (±5%)');
  }
  
  // Comparaison de la date (30 points max)
  const lineDate = new Date(line.transactionDate);
  const txnDate = new Date(txn.transactionDate);
  const daysDiff = Math.abs((lineDate.getTime() - txnDate.getTime()) / (1000 * 60 * 60 * 24));
  const dateTolerance = options?.dateToleranceDays || 3;
  
  if (daysDiff === 0) {
    score += 30;
    matchReasons.push('Date identique');
  } else if (daysDiff <= 1) {
    score += 25;
    matchReasons.push('Date ±1 jour');
  } else if (daysDiff <= dateTolerance) {
    score += 15;
    matchReasons.push(`Date ±${Math.round(daysDiff)} jours`);
  }
  
  // Comparaison de la référence (30 points max)
  if (line.reference && txn.reference) {
    const lineRef = line.reference.toLowerCase().trim();
    const txnRef = txn.reference.toLowerCase().trim();
    
    if (lineRef === txnRef) {
      score += 30;
      matchReasons.push('Référence identique');
    } else if (lineRef.includes(txnRef) || txnRef.includes(lineRef)) {
      score += 20;
      matchReasons.push('Référence partielle');
    }
  }
  
  // Comparaison du partenaire
  if (line.partnerName && txn.partnerName) {
    const linePartner = line.partnerName.toLowerCase().trim();
    const txnPartner = txn.partnerName.toLowerCase().trim();
    
    if (linePartner === txnPartner) {
      score += 10;
      matchReasons.push('Partenaire identique');
    } else if (linePartner.includes(txnPartner) || txnPartner.includes(linePartner)) {
      score += 5;
      matchReasons.push('Partenaire similaire');
    }
  }
  
  if (score === 0) {
    return null;
  }
  
  return {
    id: txn.id,
    type: 'TRANSACTION',
    reference: txn.reference || `TXN-${txn.id.substring(0, 8)}`,
    label: txn.description || txn.transactionTypeLabel || 'Transaction',
    amount: txn.amount,
    date: txn.transactionDate,
    direction: txn.direction,
    partnerName: txn.partnerName,
    confidenceScore: Math.min(score, 100),
    matchReasons,
  };
}

/**
 * Génère une suggestion de rapprochement pour un chèque.
 */
function generateCheckSuggestion(
  line: StatementLine,
  check: Check,
  options?: ReconciliationSearchOptions
): ReconciliationSuggestion | null {
  const matchReasons: string[] = [];
  let score = 0;
  
  // Vérifier la direction
  const lineDirection = line.amount >= 0 ? 'CREDIT' : 'DEBIT';
  const checkDirection = check.checkType === 'RECEIVED' ? 'CREDIT' : 'DEBIT';
  
  if (lineDirection !== checkDirection) {
    return null; // Direction incompatible
  }
  
  // Comparaison du montant (40 points max)
  const lineAmount = Math.abs(line.amount);
  const amountDiff = Math.abs(lineAmount - check.amount);
  const amountTolerance = options?.amountTolerance || 0.01;
  
  if (amountDiff <= amountTolerance) {
    score += 40;
    matchReasons.push('Montant exact');
  } else if (amountDiff <= lineAmount * 0.01) {
    score += 30;
    matchReasons.push('Montant proche');
  }
  
  // Comparaison de la date (30 points max)
  if (check.cashedDate) {
    const lineDate = new Date(line.transactionDate);
    const checkDate = new Date(check.cashedDate);
    const daysDiff = Math.abs((lineDate.getTime() - checkDate.getTime()) / (1000 * 60 * 60 * 24));
    const dateTolerance = options?.dateToleranceDays || 3;
    
    if (daysDiff === 0) {
      score += 30;
      matchReasons.push('Date identique');
    } else if (daysDiff <= dateTolerance) {
      score += 20;
      matchReasons.push(`Date ±${Math.round(daysDiff)} jours`);
    }
  }
  
  // Comparaison du numéro de chèque dans la référence (30 points max)
  if (line.reference) {
    const lineRef = line.reference.toLowerCase();
    const checkNum = check.checkNumber.toLowerCase();
    
    if (lineRef.includes(checkNum)) {
      score += 30;
      matchReasons.push('N° chèque trouvé');
    }
  }
  
  // Comparaison du partenaire
  if (line.partnerName) {
    const linePartner = line.partnerName.toLowerCase().trim();
    const checkPartner = check.partnerName.toLowerCase().trim();
    
    if (linePartner.includes(checkPartner) || checkPartner.includes(linePartner)) {
      score += 10;
      matchReasons.push('Partenaire similaire');
    }
  }
  
  if (score === 0) {
    return null;
  }
  
  return {
    id: check.id,
    type: 'CHECK',
    reference: `CHQ-${check.checkNumber}`,
    label: `Chèque n°${check.checkNumber} - ${check.partnerName}`,
    amount: check.amount,
    date: check.cashedDate || check.issueDate,
    direction: checkDirection,
    partnerName: check.partnerName,
    confidenceScore: Math.min(score, 100),
    matchReasons,
  };
}

// =============================================================================
// ACTIONS DE RAPPROCHEMENT
// =============================================================================

/**
 * Rapproche une ligne de relevé avec une cible (transaction ou chèque).
 * 
 * @param lineId - ID de la ligne de relevé
 * @param targetId - ID de la transaction ou du chèque
 * @param targetType - Type de cible ('TRANSACTION' ou 'CHECK')
 */
export async function reconcileLine(
  lineId: string,
  targetId: string,
  targetType: ReconciliationTargetType | string
): Promise<{ success: boolean; error?: string }> {
  console.log(`[API:Reconciliation] reconcileLine: ${lineId} -> ${targetType}:${targetId}`);
  
  try {
    const requestBody: any = {
      statementLineId: lineId,
    };
    
    if (targetType === 'TRANSACTION' || targetType === 'transaction') {
      requestBody.bankTransactionId = targetId;
    } else if (targetType === 'CHECK' || targetType === 'check') {
      requestBody.checkId = targetId;
    }
    
    const response = await fetch(`${API_BASE_URL}/reconciliation/manual`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Échec du rapprochement' }));
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (error) {
    console.error('[API:Reconciliation] Erreur reconcileLine:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur inattendue' 
    };
  }
}

/**
 * Annule le rapprochement d'une ligne.
 */
export async function unreconcileLine(lineId: string): Promise<{ success: boolean; error?: string }> {
  console.log('[API:Reconciliation] unreconcileLine:', lineId);
  
  try {
    // Récupérer les matches de cette ligne
    const matchesResponse = await fetch(`${API_BASE_URL}/reconciliation/matches/line/${lineId}`);
    const matches = await handleResponse<ReconciliationMatch[]>(matchesResponse);
    
    // Supprimer chaque match
    for (const match of matches) {
      const response = await fetch(`${API_BASE_URL}/reconciliation/match/${match.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Échec de l\'annulation' }));
        return { success: false, error: error.message };
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('[API:Reconciliation] Erreur unreconcileLine:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur inattendue' 
    };
  }
}

/**
 * Lance le rapprochement automatique pour un relevé.
 */
export async function bulkReconcile(
  statementId: string,
  options?: ReconciliationSearchOptions
): Promise<BulkReconciliationResult> {
  console.log('[API:Reconciliation] bulkReconcile - statementId:', statementId);
  
  try {
    const requestBody = {
      bankStatementId: statementId,
      matchByAmount: options?.matchByAmount ?? true,
      matchByReference: options?.matchByReference ?? true,
      matchByDate: options?.matchByDate ?? true,
      dateToleranceDays: options?.dateToleranceDays ?? 3,
      amountTolerance: options?.amountTolerance ?? 0.01,
      minimumConfidenceScore: options?.minimumConfidenceScore ?? 90,
    };
    
    const response = await fetch(`${API_BASE_URL}/reconciliation/auto`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });
    
    const matches = await handleResponse<ReconciliationMatch[]>(response);
    
    return {
      success: true,
      totalProcessed: matches.length,
      reconciled: matches.length,
      skipped: 0,
      errors: 0,
      details: matches.map(m => ({
        lineId: m.statementLineId,
        status: 'reconciled' as const,
        matchedWith: m.bankTransactionId || m.checkId,
      })),
    };
  } catch (error) {
    console.error('[API:Reconciliation] Erreur bulkReconcile:', error);
    return {
      success: false,
      totalProcessed: 0,
      reconciled: 0,
      skipped: 0,
      errors: 1,
      details: [{
        lineId: '',
        status: 'error',
        reason: error instanceof Error ? error.message : 'Erreur inattendue',
      }],
    };
  }
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
  console.log('[API:Reconciliation] reconcileWithNewTransaction:', lineId);
  
  try {
    // Récupérer la ligne pour avoir les informations
    const line = await getStatementLineById(lineId);
    if (!line) {
      return { success: false, error: 'Ligne introuvable' };
    }
    
    // Récupérer le relevé pour avoir le compte bancaire
    const statement = await getBankStatementById(line.bankStatementId);
    if (!statement) {
      return { success: false, error: 'Relevé introuvable' };
    }
    
    // Créer la transaction
    const transactionRequest = {
      bankAccountId: statement.bankAccountId,
      transactionTypeId: transactionData.transactionTypeId,
      transactionDate: line.transactionDate,
      valueDate: line.valueDate,
      reference: line.reference,
      amount: Math.abs(line.amount),
      direction: line.amount >= 0 ? 'CREDIT' : 'DEBIT',
      description: transactionData.label || line.description,
      partnerName: transactionData.partnerName || line.partnerName,
    };
    
    const createResponse = await fetch(`${API_BASE_URL}/bank-transactions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(transactionRequest),
    });
    
    const transaction = await handleResponse<BankTransaction>(createResponse);
    
    // Valider la transaction
    await fetch(`${API_BASE_URL}/bank-transactions/${transaction.id}/validate`, {
      method: 'POST',
    });
    
    // Rapprocher la ligne avec la nouvelle transaction
    const reconcileResult = await reconcileLine(lineId, transaction.id, 'TRANSACTION');
    
    if (!reconcileResult.success) {
      return { success: false, error: reconcileResult.error, transactionId: transaction.id };
    }
    
    return { success: true, transactionId: transaction.id };
  } catch (error) {
    console.error('[API:Reconciliation] Erreur reconcileWithNewTransaction:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur inattendue' 
    };
  }
}

/**
 * Marque une ligne comme ignorée.
 */
export async function ignoreLine(lineId: string): Promise<{ success: boolean; error?: string }> {
  console.log('[API:Reconciliation] ignoreLine:', lineId);
  
  try {
    const response = await fetch(`${API_BASE_URL}/statement-lines/${lineId}/ignore`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Échec' }));
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur inattendue' 
    };
  }
}

/**
 * Réinitialise le statut d'une ligne (annule l'ignoré ou le rapprochement).
 */
export async function resetLine(lineId: string): Promise<{ success: boolean; error?: string }> {
  console.log('[API:Reconciliation] resetLine:', lineId);
  
  try {
    const response = await fetch(`${API_BASE_URL}/statement-lines/${lineId}/reset`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Échec' }));
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur inattendue' 
    };
  }
}

// =============================================================================
// STATISTIQUES
// =============================================================================

/**
 * Récupère les statistiques de rapprochement pour un relevé.
 */
export async function getStatementReconciliationStats(statementId: string): Promise<ReconciliationStats> {
  console.log('[API:Reconciliation] getStatementReconciliationStats:', statementId);
  
  try {
    // Essayer d'abord l'endpoint dédié
    const response = await fetch(`${API_BASE_URL}/reconciliation/summary/${statementId}`);
    
    if (response.ok) {
      const summary = await handleResponse<ReconciliationSummary>(response);
      return {
        totalLines: summary.totalLines,
        reconciledLines: summary.matchedLines,
        pendingLines: summary.unmatchedLines,
        percentage: summary.progressPercentage,
        totalAmount: summary.totalCredits + summary.totalDebits,
        reconciledAmount: summary.matchedCredits + summary.matchedDebits,
        pendingAmount: summary.unmatchedCredits + summary.unmatchedDebits,
      };
    }
    
    // Fallback: calculer depuis les lignes
    const lines = await getStatementLines(statementId);
    const reconciled = lines.filter(l => 
      l.reconciliationStatus === 'MATCHED' || l.isReconciled
    );
    const pending = lines.filter(l => 
      l.reconciliationStatus === 'UNMATCHED' && !l.isReconciled
    );
    
    return {
      totalLines: lines.length,
      reconciledLines: reconciled.length,
      pendingLines: pending.length,
      percentage: lines.length > 0 
        ? Math.round((reconciled.length / lines.length) * 100) 
        : 0,
      totalAmount: lines.reduce((s, l) => s + Math.abs(l.amount), 0),
      reconciledAmount: reconciled.reduce((s, l) => s + Math.abs(l.amount), 0),
      pendingAmount: pending.reduce((s, l) => s + Math.abs(l.amount), 0),
    };
  } catch (error) {
    console.error('[API:Reconciliation] Erreur getStatementReconciliationStats:', error);
    return {
      totalLines: 0,
      reconciledLines: 0,
      pendingLines: 0,
      percentage: 0,
    };
  }
}

/**
 * Récupère les statistiques de rapprochement pour un compte bancaire.
 */
export async function getReconciliationStats(bankAccountId: string): Promise<{
  totalStatementLines: number;
  reconciledLines: number;
  pendingLines: number;
  reconciledPercentage: number;
  totalTransactions: number;
  reconciledTransactions: number;
  unreconciledTransactions: number;
  discrepancy: number;
}> {
  console.log('[API:Reconciliation] getReconciliationStats:', bankAccountId);
  
  try {
    // Récupérer les relevés du compte
    const statements = await getBankStatements(bankAccountId);
    
    let totalLines = 0;
    let reconciledLines = 0;
    
    for (const statement of statements) {
      const lines = await getStatementLines(statement.id);
      totalLines += lines.length;
      reconciledLines += lines.filter(l => 
        l.reconciliationStatus === 'MATCHED' || l.isReconciled
      ).length;
    }
    
    // Récupérer les transactions du compte
    const transactionsResponse = await fetch(
      `${API_BASE_URL}/bank-transactions/account/${bankAccountId}`
    );
    const transactions = await handleResponse<BankTransaction[]>(transactionsResponse);
    const validatedTransactions = transactions.filter(t => t.status === 'VALIDATED');
    const reconciledTxns = validatedTransactions.filter(t => t.isReconciled);
    
    return {
      totalStatementLines: totalLines,
      reconciledLines,
      pendingLines: totalLines - reconciledLines,
      reconciledPercentage: totalLines > 0 
        ? Math.round((reconciledLines / totalLines) * 100) 
        : 0,
      totalTransactions: validatedTransactions.length,
      reconciledTransactions: reconciledTxns.length,
      unreconciledTransactions: validatedTransactions.length - reconciledTxns.length,
      discrepancy: 0, // À calculer selon les besoins métier
    };
  } catch (error) {
    console.error('[API:Reconciliation] Erreur getReconciliationStats:', error);
    return {
      totalStatementLines: 0,
      reconciledLines: 0,
      pendingLines: 0,
      reconciledPercentage: 0,
      totalTransactions: 0,
      reconciledTransactions: 0,
      unreconciledTransactions: 0,
      discrepancy: 0,
    };
  }
}