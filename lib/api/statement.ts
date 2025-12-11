/**
 * @file lib/api/statement.ts
 * @description API pour l'import et la gestion des releves bancaires.
 * 
 * @version 1.0.0 - Increment 4
 */

import {
  BankStatement,
  BankStatementLine,
  ParsedStatement,
  ParsedStatementLine,
} from '@/types/banking';

import {
  mockBankStatements,
  mockStatementLines,
  mockBankAccounts,
  generateId,
  getCurrentTimestamp,
} from '@/lib/mock-db';

// =============================================================================
// UTILITAIRES
// =============================================================================

const wait = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms));

// =============================================================================
// IMPORT DE RELEVES
// =============================================================================

/**
 * Importe un releve parse dans le systeme.
 */
export async function importStatement(parsed: ParsedStatement): Promise<BankStatement> {
  await wait(500);

  const account = mockBankAccounts.find(a => a.id === parsed.bankAccountId);
  if (!account) {
    throw new Error('Compte bancaire non trouve');
  }

  const statementId = generateId();
  const now = getCurrentTimestamp();

  // Creer le releve
  const newStatement: BankStatement = {
    id: statementId,
    bankAccountId: parsed.bankAccountId,
    bankAccountName: account.name,
    name: parsed.name,
    fileName: parsed.fileName,
    date: now.split('T')[0],
    periodStart: parsed.periodStart,
    periodEnd: parsed.periodEnd,
    startBalance: parsed.startBalance,
    endBalance: parsed.endBalance,
    lineCount: parsed.lines.length,
    reconciledCount: 0,
    status: 'DRAFT',
    importedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  // Creer les lignes
  const newLines: BankStatementLine[] = parsed.lines.map((line: ParsedStatementLine, index: number) => ({
    id: generateId(),
    statementId,
    bankAccountId: parsed.bankAccountId,
    lineNumber: index + 1,
    date: line.date,
    valueDate: line.valueDate,
    label: line.label,
    reference: line.reference,
    amount: line.amount,
    direction: line.amount >= 0 ? 'CREDIT' as const : 'DEBIT' as const,
    currency: account.currency,
    balance: line.balance,
    isReconciled: false,
    createdAt: now,
    updatedAt: now,
  }));

  // Ajouter aux donnees mock
  mockBankStatements.push(newStatement);
  mockStatementLines.push(...newLines);

  return newStatement;
}

/**
 * Simule l'upload d'un fichier et retourne un releve.
 * C'est la fonction appelee par le composant StatementUploader existant.
 */
export async function uploadStatement(accountId: string, file: File): Promise<BankStatement> {
  await wait(1000);

  const account = mockBankAccounts.find(a => a.id === accountId);
  if (!account) {
    throw new Error('Compte bancaire non trouve');
  }

  // Simuler le parsing du fichier
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const mockParsed: ParsedStatement = {
    bankAccountId: accountId,
    name: `Releve ${file.name.replace('.csv', '')}`,
    fileName: file.name,
    periodStart: startOfMonth.toISOString().split('T')[0],
    periodEnd: endOfMonth.toISOString().split('T')[0],
    startBalance: account.currentBalance - 1000,
    endBalance: account.currentBalance,
    lines: [
      {
        date: today.toISOString().split('T')[0],
        label: 'Virement recu - Import test',
        amount: 500,
        balance: account.currentBalance - 500,
      },
      {
        date: today.toISOString().split('T')[0],
        label: 'Prelevement - Import test',
        amount: -200,
        balance: account.currentBalance - 700,
      },
      {
        date: today.toISOString().split('T')[0],
        label: 'Frais bancaires - Import test',
        amount: -15,
        balance: account.currentBalance - 715,
      },
    ],
  };

  return importStatement(mockParsed);
}

// =============================================================================
// LECTURE DES RELEVES
// =============================================================================

/**
 * Recupere tous les releves d'un compte.
 */
export async function getBankStatements(bankAccountId?: string): Promise<BankStatement[]> {
  await wait(200);

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
  }).sort((a, b) => new Date(b.periodEnd).getTime() - new Date(a.periodEnd).getTime());
}

/**
 * Recupere un releve par ID.
 */
export async function getBankStatementById(statementId: string): Promise<BankStatement | null> {
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
 * Recupere les lignes d'un releve.
 */
export async function getStatementLines(
  statementId: string,
  onlyUnreconciled: boolean = false
): Promise<BankStatementLine[]> {
  await wait(200);

  let lines = mockStatementLines.filter(l => l.statementId === statementId);

  if (onlyUnreconciled) {
    lines = lines.filter(l => !l.isReconciled);
  }

  return lines.sort((a, b) => a.lineNumber - b.lineNumber);
}

// =============================================================================
// SUPPRESSION
// =============================================================================

/**
 * Supprime un releve et ses lignes.
 */
export async function deleteStatement(statementId: string): Promise<void> {
  await wait(300);

  const statementIndex = mockBankStatements.findIndex(s => s.id === statementId);
  if (statementIndex === -1) {
    throw new Error('Releve non trouve');
  }

  // Supprimer les lignes associees
  const lineIndices: number[] = [];
  mockStatementLines.forEach((line, index) => {
    if (line.statementId === statementId) {
      lineIndices.push(index);
    }
  });

  // Supprimer en ordre inverse pour ne pas decaler les indices
  lineIndices.reverse().forEach(index => {
    mockStatementLines.splice(index, 1);
  });

  // Supprimer le releve
  mockBankStatements.splice(statementIndex, 1);
}