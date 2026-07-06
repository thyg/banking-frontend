// lib/api/statement.ts — Import de relevés bancaires (RT-comops-treasury-core)
// Délègue à lib/api/banking.ts qui applique le contrat backend :
//   POST /api/treasury/statements        { organizationId, bankAccountId, statementNumber?, statementDate, openingBalance, closingBalance }
//   POST /api/treasury/statements/{id}/lines  { lines: [{ operationDate, valueDate?, label, amount, direction, referenceCode? }] }
//   POST /api/treasury/statements/{id}/close

import { createBankStatement, createStatementLinesBatch, closeBankStatement } from "@/lib/api/banking";
import type { BankStatement, CreateStatementLineRequest } from "@/types/banking";

export interface ParsedStatementLine {
  date?: string;
  operationDate?: string;
  valueDate?: string;
  label?: string;
  description?: string;
  amount: number;
  direction: "CREDIT" | "DEBIT";
  reference?: string;
  referenceCode?: string;
}

export interface ParsedStatement {
  bankAccountId: string;
  startDate: string;
  endDate: string;
  openingBalance?: number;
  closingBalance?: number;
  currency?: string;
  lines?: ParsedStatementLine[];
}

export async function importStatement(parsed: ParsedStatement): Promise<BankStatement> {
  const statement = await createBankStatement({
    bankAccountId:  parsed.bankAccountId,
    statementDate:  parsed.endDate || parsed.startDate || new Date().toISOString().split("T")[0],
    periodStart:    parsed.startDate,
    periodEnd:      parsed.endDate,
    openingBalance: parsed.openingBalance ?? 0,
    closingBalance: parsed.closingBalance ?? 0,
  });

  if (parsed.lines?.length) {
    const lines: CreateStatementLineRequest[] = parsed.lines.map((l) => ({
      bankStatementId: statement.id,
      transactionDate: l.date ?? l.operationDate ?? statement.statementDate,
      valueDate:       l.valueDate ?? l.date,
      description:     l.label ?? l.description,
      amount:          l.amount,
      direction:       l.direction,
      reference:       l.reference ?? l.referenceCode,
    }));
    await createStatementLinesBatch(statement.id, lines);
  }

  return statement;
}

export async function closeStatement(statementId: string): Promise<BankStatement> {
  return closeBankStatement(statementId);
}
