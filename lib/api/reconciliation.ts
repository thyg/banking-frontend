// lib/api/reconciliation.ts — Rapprochement bancaire (RT-comops-treasury-core)
// Backend: GET  /api/treasury/statements  (?organizationId= requis, &bankAccountId=)
//          GET  /api/treasury/statements/{id}
//          GET  /api/treasury/statements/{id}/lines
//          POST /api/treasury/statement-lines/{id}/ignore  (body: { reason })
//          POST /api/treasury/reconciliation/manual-match  (body: { statementLineId, matchedEntityType, matchedEntityId })
//          POST /api/treasury/reconciliation/match-with-new (body: { statementLineId, transactionTypeId, label?, partnerName?, notes? })
//          POST /api/treasury/reconciliation/auto-match    (?statementId=)
//          POST /api/treasury/reconciliation/unmatch/{id}
//          GET  /api/treasury/reconciliation/summary       (?statementId=)
// Lignes : reconciliationStatus ∈ UNMATCHED | MATCHED | IGNORED.
// Résumé : { totalLines, unmatchedCount, matchedCount, ignoredCount, unmatchedAmount, matchedAmount }.

import { tGet, tPost, qs, requireOrg } from "@/lib/api/treasury-client";
import { mapStatement, mapStatementLine } from "@/lib/api/banking";
import { mapBankTransaction } from "@/lib/api/bank-transaction";
import type {
  BankStatement,
  StatementLine,
  ReconciliationMatch,
  ReconciliationSummary,
  ReconciliationStats,
  ReconciliationSuggestion,
  BankTransaction,
  Check,
} from "@/types/banking";

export async function getBankStatements(bankAccountId?: string): Promise<BankStatement[]> {
  const raw = await tGet<any[]>(`/statements${qs({ organizationId: requireOrg(), bankAccountId })}`);
  return (raw ?? []).map(mapStatement);
}

export async function getBankStatementById(id: string): Promise<BankStatement> {
  return mapStatement(await tGet<any>(`/statements/${id}`));
}

export async function getBankStatementsByAccountId(accountId: string): Promise<BankStatement[]> {
  return getBankStatements(accountId);
}

export async function getStatementLines(statementId: string): Promise<StatementLine[]> {
  const raw = await tGet<any[]>(`/statements/${statementId}/lines`);
  return (raw ?? []).map(mapStatementLine);
}

export async function getUnmatchedStatementLines(statementId: string): Promise<StatementLine[]> {
  const lines = await getStatementLines(statementId);
  return lines.filter(l => l.reconciliationStatus === "UNMATCHED");
}

export async function getMatchedStatementLines(statementId: string): Promise<StatementLine[]> {
  const lines = await getStatementLines(statementId);
  return lines.filter(l => l.reconciliationStatus === "MATCHED");
}

export async function ignoreStatementLine(id: string, reason = "Ignoré"): Promise<StatementLine> {
  return mapStatementLine(await tPost<any>(`/statement-lines/${id}/ignore`, { reason }));
}

export async function resetStatementLine(_id: string): Promise<StatementLine> {
  throw new Error("La réinitialisation d'une ligne n'est pas disponible.");
}

export async function getBankTransactions(accountId: string): Promise<BankTransaction[]> {
  const raw = await tGet<any[]>(`/bank-accounts/${accountId}/transactions`);
  return (raw ?? []).map(mapBankTransaction);
}

export async function getChecks(accountId: string): Promise<Check[]> {
  return tGet<Check[]>(`/checks${qs({ organizationId: requireOrg(), bankAccountId: accountId })}`);
}

export async function reconcileManual(data: {
  statementLineId: string;
  matchedEntityType: string;
  matchedEntityId: string;
}): Promise<ReconciliationMatch> {
  return tPost<ReconciliationMatch>("/reconciliation/manual-match", data);
}

export async function reconcileAuto(statementId: string): Promise<unknown> {
  return tPost(`/reconciliation/auto-match${qs({ statementId })}`);
}

export async function deleteMatch(matchId: string): Promise<void> {
  await tPost(`/reconciliation/unmatch/${matchId}`);
}

export async function getMatchesByLineId(_lineId: string): Promise<ReconciliationMatch[]> {
  return [];
}

export async function getReconciliationSummary(statementId: string): Promise<ReconciliationSummary> {
  const s = await tGet<any>(`/reconciliation/summary${qs({ statementId })}`);
  const total = s?.totalLines ?? 0;
  const matched = s?.matchedCount ?? 0;
  return {
    ...s,
    bankStatementId: s?.bankStatementId ?? s?.statementId ?? statementId,
    bankAccountName: s?.bankAccountName ?? "",
    totalLines: total,
    matchedLines: s?.matchedLines ?? matched,
    unmatchedLines: s?.unmatchedLines ?? s?.unmatchedCount ?? 0,
    ignoredLines: s?.ignoredLines ?? s?.ignoredCount ?? 0,
    progressPercentage: total > 0 ? Math.round((matched / total) * 100) : 0,
  } as ReconciliationSummary;
}

export async function getReconciliationStats(statementId: string): Promise<ReconciliationStats> {
  try {
    // Champs backend : totalLines, matchedCount, unmatchedCount, matchedAmount, unmatchedAmount.
    const s = await tGet<any>(`/reconciliation/summary${qs({ statementId })}`);
    const total      = s?.totalLines    ?? 0;
    const reconciled = s?.matchedCount  ?? 0;
    const pending    = s?.unmatchedCount ?? 0;
    return {
      totalLines:       total,
      reconciledLines:  reconciled,
      pendingLines:     pending,
      percentage:       total > 0 ? Math.round((reconciled / total) * 100) : 0,
      reconciledAmount: s?.matchedAmount   ?? 0,
      pendingAmount:    s?.unmatchedAmount ?? 0,
    };
  } catch {
    return { totalLines: 0, reconciledLines: 0, pendingLines: 0, percentage: 0 };
  }
}

export async function createBankTransaction(data: unknown): Promise<BankTransaction> {
  return tPost<BankTransaction>("/transactions", data);
}

export async function getStatementReconciliationStats(statementId: string): Promise<ReconciliationStats> {
  return getReconciliationStats(statementId);
}

export async function getReconciliationSuggestions(lineId: string): Promise<ReconciliationSuggestion[]> {
  try {
    const matches = await tGet<any[]>(`/reconciliation/suggestions${qs({ statementLineId: lineId })}`);
    return (matches ?? []).map((m: any) => ({
      id:              m.id,
      type:            m.matchedEntityType ?? "TRANSACTION",
      reference:       m.matchedEntityReference ?? m.matchedEntityId,
      label:           m.matchedEntityLabel ?? m.matchedEntityId,
      amount:          m.amount ?? 0,
      date:            m.matchedAt ?? m.createdAt ?? "",
      direction:       m.direction ?? "DEBIT",
      confidenceScore: m.confidenceScore ?? 0,
      matchReasons:    m.matchReasons ?? [],
    }));
  } catch {
    return [];
  }
}

export async function reconcileLine(
  lineId: string,
  matchedEntityId: string,
  matchedEntityType: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await reconcileManual({ statementLineId: lineId, matchedEntityId, matchedEntityType });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message ?? "Erreur de rapprochement" };
  }
}

export async function reconcileWithNewTransaction(
  lineId: string,
  data: unknown
): Promise<{ success: boolean; error?: string }> {
  try {
    await tPost(`/reconciliation/match-with-new`, { statementLineId: lineId, ...data as object });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message ?? "Erreur de création" };
  }
}

export async function bulkReconcile(statementId: string): Promise<{ reconciled: number; skipped: number; errors: number }> {
  try {
    const result = await reconcileAuto(statementId) as any;
    return {
      reconciled: result?.matchesCreated ?? result?.reconciled ?? 0,
      skipped:    result?.linesProcessed != null ? (result.linesProcessed - (result.matchesCreated ?? 0)) : 0,
      errors:     result?.errors ?? 0,
    };
  } catch {
    return { reconciled: 0, skipped: 0, errors: 1 };
  }
}
