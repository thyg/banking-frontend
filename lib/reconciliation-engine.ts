/**
 * @file lib/reconciliation-engine.ts
 * @description Moteur de rapprochement bancaire avec algorithme de scoring.
 * 
 * @version 1.1.0 - Fix: Compatible avec types/banking.ts
 */

import {
  BankStatementLine,
  BankTransaction,
  Check,
  Invoice,
  Bill,
  ReconciliationSuggestion,
  ReconciliationTargetType,
  MatchScoreDetails,
  ReconciliationSearchOptions,
} from '@/types/banking';

// =============================================================================
// CONFIGURATION PAR DEFAUT
// =============================================================================

const DEFAULT_OPTIONS: Required<ReconciliationSearchOptions> = {
  amountTolerance: 0.01,
  dateTolerance: 7,
  minScore: 50,
  maxSuggestions: 10,
  targetTypes: ['transaction', 'check', 'invoice', 'bill'],
};

// =============================================================================
// UTILITAIRES DE CALCUL
// =============================================================================

/**
 * Normalise une chaine pour la comparaison.
 */
export function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calcule la similarite entre deux chaines (Levenshtein normalise).
 */
export function stringSimilarity(str1: string, str2: string): number {
  const s1 = normalizeString(str1);
  const s2 = normalizeString(str2);
  
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;
  
  const maxLen = Math.max(s1.length, s2.length);
  const distance = levenshteinDistance(s1, s2);
  
  return Math.max(0, 1 - distance / maxLen);
}

/**
 * Distance de Levenshtein entre deux chaines.
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));
  
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  
  return dp[m][n];
}

/**
 * Verifie si des mots-cles communs existent.
 */
export function hasKeywordMatch(str1: string, str2: string): boolean {
  const words1 = normalizeString(str1).split(' ').filter(w => w.length > 2);
  const words2 = normalizeString(str2).split(' ').filter(w => w.length > 2);
  
  return words1.some(w1 => words2.some(w2 => w1 === w2 || w1.includes(w2) || w2.includes(w1)));
}

/**
 * Calcule la difference en jours entre deux dates.
 */
export function daysDifference(date1: string, date2: string): number {
  const d1 = new Date(date1).getTime();
  const d2 = new Date(date2).getTime();
  return Math.abs(Math.round((d1 - d2) / (1000 * 60 * 60 * 24)));
}

// =============================================================================
// CALCUL DU SCORE DE CORRESPONDANCE
// =============================================================================

interface MatchCandidate {
  type: ReconciliationTargetType;
  id: string;
  reference: string;
  partnerName: string;
  amount: number;
  date: string;
  originalData?: BankTransaction | Check | Invoice | Bill;
}

/**
 * Calcule le score de correspondance entre une ligne et un candidat.
 */
export function calculateMatchScore(
  line: BankStatementLine,
  candidate: MatchCandidate,
  options: ReconciliationSearchOptions = {}
): { score: number; details: MatchScoreDetails } {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const reasons: string[] = [];
  
  // ---------------------------------------------------------------------------
  // Score Montant (40 points max)
  // ---------------------------------------------------------------------------
  let amountScore = 0;
  const lineAmount = Math.abs(line.amount);
  const candidateAmount = Math.abs(candidate.amount);
  const amountDiff = Math.abs(lineAmount - candidateAmount);
  const amountDiffPercent = lineAmount > 0 ? amountDiff / lineAmount : 1;
  
  if (amountDiff === 0) {
    amountScore = 40;
    reasons.push('Montant exact');
  } else if (amountDiffPercent <= opts.amountTolerance) {
    amountScore = Math.round(40 * (1 - amountDiffPercent / opts.amountTolerance));
    reasons.push(`Montant proche (${(amountDiffPercent * 100).toFixed(1)}% d'ecart)`);
  } else if (amountDiffPercent <= 0.1) {
    amountScore = Math.round(20 * (1 - amountDiffPercent / 0.1));
    reasons.push(`Montant avec ecart (${(amountDiffPercent * 100).toFixed(1)}%)`);
  }
  
  // ---------------------------------------------------------------------------
  // Score Date (30 points max)
  // ---------------------------------------------------------------------------
  let dateScore = 0;
  const daysDiff = daysDifference(line.date, candidate.date);
  
  if (daysDiff === 0) {
    dateScore = 30;
    reasons.push('Meme date');
  } else if (daysDiff <= opts.dateTolerance) {
    dateScore = Math.round(30 * (1 - daysDiff / opts.dateTolerance));
    reasons.push(`Date proche (${daysDiff} jour${daysDiff > 1 ? 's' : ''} d'ecart)`);
  } else if (daysDiff <= opts.dateTolerance * 2) {
    dateScore = Math.round(10 * (1 - (daysDiff - opts.dateTolerance) / opts.dateTolerance));
    reasons.push(`Date eloignee (${daysDiff} jours)`);
  }
  
  // ---------------------------------------------------------------------------
  // Score Libelle (20 points max)
  // ---------------------------------------------------------------------------
  let labelScore = 0;
  const labelSimilarity = stringSimilarity(line.label, candidate.reference);
  
  if (labelSimilarity > 0.8) {
    labelScore = Math.round(20 * labelSimilarity);
    reasons.push('Libelle tres similaire');
  } else if (labelSimilarity > 0.5) {
    labelScore = Math.round(15 * labelSimilarity);
    reasons.push('Libelle partiellement similaire');
  } else if (hasKeywordMatch(line.label, candidate.reference)) {
    labelScore = 8;
    reasons.push('Mots-cles communs dans le libelle');
  }
  
  // Bonus si la reference est dans le libelle
  if (candidate.reference && normalizeString(line.label).includes(normalizeString(candidate.reference))) {
    labelScore = Math.min(20, labelScore + 5);
    reasons.push('Reference trouvee dans le libelle');
  }
  
  // ---------------------------------------------------------------------------
  // Score Partenaire (10 points max)
  // ---------------------------------------------------------------------------
  let partnerScore = 0;
  if (line.partnerName && candidate.partnerName) {
    const partnerSimilarity = stringSimilarity(line.partnerName, candidate.partnerName);
    
    if (partnerSimilarity > 0.8) {
      partnerScore = 10;
      reasons.push('Meme partenaire');
    } else if (partnerSimilarity > 0.5) {
      partnerScore = Math.round(10 * partnerSimilarity);
      reasons.push('Partenaire similaire');
    } else if (hasKeywordMatch(line.partnerName, candidate.partnerName)) {
      partnerScore = 5;
      reasons.push('Nom partenaire partiellement correspondant');
    }
  }
  
  // ---------------------------------------------------------------------------
  // Score Total
  // ---------------------------------------------------------------------------
  const totalScore = amountScore + dateScore + labelScore + partnerScore;
  
  return {
    score: totalScore,
    details: {
      amountScore,
      dateScore,
      labelScore,
      partnerScore,
      reasons,
    },
  };
}

// =============================================================================
// GENERATION DES SUGGESTIONS
// =============================================================================

/**
 * Convertit une transaction en candidat.
 */
function transactionToCandidate(txn: BankTransaction): MatchCandidate {
  return {
    type: 'transaction',
    id: txn.id,
    reference: txn.reference || txn.label,
    partnerName: txn.partnerName || '',
    amount: txn.direction === 'CREDIT' ? txn.amount : -txn.amount,
    date: txn.transactionDate,
    originalData: txn,
  };
}

/**
 * Convertit un cheque en candidat.
 */
function checkToCandidate(check: Check): MatchCandidate {
  const isCredit = check.type === 'RECEIVED';
  return {
    type: 'check',
    id: check.id,
    reference: `Cheque ${check.checkNumber}`,
    partnerName: check.partnerName,
    amount: isCredit ? check.amount : -check.amount,
    date: check.cashedDate || check.depositDate || check.issueDate,
    originalData: check,
  };
}

/**
 * Convertit une facture client en candidat.
 * Note: Invoice utilise balanceDue et partnerName
 */
function invoiceToCandidate(invoice: Invoice): MatchCandidate {
  return {
    type: 'invoice',
    id: invoice.id,
    reference: invoice.reference,
    partnerName: invoice.partnerName,
    amount: invoice.balanceDue,
    date: invoice.dueDate,
    originalData: invoice,
  };
}

/**
 * Convertit une facture fournisseur en candidat.
 * Note: Bill utilise balanceDue et partnerName
 */
function billToCandidate(bill: Bill): MatchCandidate {
  return {
    type: 'bill',
    id: bill.id,
    reference: bill.reference,
    partnerName: bill.partnerName,
    amount: -bill.balanceDue,
    date: bill.dueDate,
    originalData: bill,
  };
}

/**
 * Genere les suggestions de rapprochement pour une ligne.
 */
export function generateSuggestions(
  line: BankStatementLine,
  candidates: {
    transactions?: BankTransaction[];
    checks?: Check[];
    invoices?: Invoice[];
    bills?: Bill[];
  },
  options: ReconciliationSearchOptions = {}
): ReconciliationSuggestion[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const suggestions: ReconciliationSuggestion[] = [];
  
  // Convertir les transactions
  if (candidates.transactions && opts.targetTypes.includes('transaction')) {
    for (const txn of candidates.transactions) {
      if (txn.isReconciled) continue;
      if (txn.status !== 'VALIDATED') continue;
      
      const candidate = transactionToCandidate(txn);
      const { score, details } = calculateMatchScore(line, candidate, opts);
      
      if (score >= opts.minScore) {
        suggestions.push({
          id: candidate.id,
          type: candidate.type,
          reference: candidate.reference,
          partnerName: candidate.partnerName,
          amount: Math.abs(candidate.amount),
          date: candidate.date,
          matchScore: score,
          matchDetails: details,
          amountDifference: Math.abs(line.amount) - Math.abs(candidate.amount),
          originalData: candidate.originalData,
        });
      }
    }
  }
  
  // Convertir les cheques
  if (candidates.checks && opts.targetTypes.includes('check')) {
    for (const check of candidates.checks) {
      if (check.status !== 'CASHED' && check.status !== 'DEPOSITED') continue;
      
      const candidate = checkToCandidate(check);
      const { score, details } = calculateMatchScore(line, candidate, opts);
      
      if (score >= opts.minScore) {
        suggestions.push({
          id: candidate.id,
          type: candidate.type,
          reference: candidate.reference,
          partnerName: candidate.partnerName,
          amount: Math.abs(candidate.amount),
          date: candidate.date,
          matchScore: score,
          matchDetails: details,
          amountDifference: Math.abs(line.amount) - Math.abs(candidate.amount),
          originalData: candidate.originalData,
        });
      }
    }
  }
  
  // Convertir les factures clients (credits - paiements recus)
  if (candidates.invoices && opts.targetTypes.includes('invoice')) {
    for (const invoice of candidates.invoices) {
      if (invoice.balanceDue <= 0) continue;
      if (line.amount <= 0) continue; // Les paiements de factures clients sont des credits
      
      const candidate = invoiceToCandidate(invoice);
      const { score, details } = calculateMatchScore(line, candidate, opts);
      
      if (score >= opts.minScore) {
        suggestions.push({
          id: candidate.id,
          type: candidate.type,
          reference: candidate.reference,
          partnerName: candidate.partnerName,
          amount: Math.abs(candidate.amount),
          date: candidate.date,
          matchScore: score,
          matchDetails: details,
          amountDifference: Math.abs(line.amount) - Math.abs(candidate.amount),
          originalData: candidate.originalData,
        });
      }
    }
  }
  
  // Convertir les factures fournisseurs (debits - paiements emis)
  if (candidates.bills && opts.targetTypes.includes('bill')) {
    for (const bill of candidates.bills) {
      if (bill.balanceDue <= 0) continue;
      if (line.amount >= 0) continue; // Les paiements de factures fournisseurs sont des debits
      
      const candidate = billToCandidate(bill);
      const { score, details } = calculateMatchScore(line, candidate, opts);
      
      if (score >= opts.minScore) {
        suggestions.push({
          id: candidate.id,
          type: candidate.type,
          reference: candidate.reference,
          partnerName: candidate.partnerName,
          amount: Math.abs(candidate.amount),
          date: candidate.date,
          matchScore: score,
          matchDetails: details,
          amountDifference: Math.abs(line.amount) - Math.abs(candidate.amount),
          originalData: candidate.originalData,
        });
      }
    }
  }
  
  // Trier par score decroissant et limiter
  return suggestions
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, opts.maxSuggestions);
}

// =============================================================================
// UTILITAIRES POUR LE RAPPROCHEMENT EN LOT
// =============================================================================

/**
 * Verifie si une suggestion peut etre rapprochee automatiquement.
 */
export function canAutoReconcile(suggestion: ReconciliationSuggestion): boolean {
  return suggestion.matchScore >= 90 && suggestion.amountDifference === 0;
}

/**
 * Trouve la meilleure correspondance sans ambiguite.
 */
export function findBestMatch(
  suggestions: ReconciliationSuggestion[]
): ReconciliationSuggestion | null {
  if (suggestions.length === 0) return null;
  
  const best = suggestions[0];
  
  if (suggestions.length === 1) {
    return canAutoReconcile(best) ? best : null;
  }
  
  const second = suggestions[1];
  const scoreDiff = best.matchScore - second.matchScore;
  
  if (scoreDiff >= 10 && canAutoReconcile(best)) {
    return best;
  }
  
  return null;
}

/**
 * Rapprochement en lot automatique.
 */
export function bulkAutoMatch(
  lines: BankStatementLine[],
  allSuggestions: Map<string, ReconciliationSuggestion[]>
): Array<{ lineId: string; suggestion: ReconciliationSuggestion }> {
  const results: Array<{ lineId: string; suggestion: ReconciliationSuggestion }> = [];
  const usedTargets = new Set<string>();
  
  const sortedLines = [...lines]
    .filter(l => !l.isReconciled)
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
  
  for (const line of sortedLines) {
    const suggestions = allSuggestions.get(line.id) || [];
    
    const availableSuggestions = suggestions.filter(
      s => !usedTargets.has(`${s.type}-${s.id}`)
    );
    
    const bestMatch = findBestMatch(availableSuggestions);
    
    if (bestMatch) {
      results.push({ lineId: line.id, suggestion: bestMatch });
      usedTargets.add(`${bestMatch.type}-${bestMatch.id}`);
    }
  }
  
  return results;
}