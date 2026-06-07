// lib/api/statement.ts — Import de relevés bancaires (iwm-treasury-core)
// Backend: POST /api/treasury/statements                  (créer relevé)
//          POST /api/treasury/statements/{id}/lines       (importer lignes)
//          POST /api/treasury/statements/{id}/close       (clôturer)

import { tPost } from "@/lib/api/treasury-client";
import type { BankStatement, StatementLine } from "@/types/banking";

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
  const statement = await tPost<BankStatement>("/statements", {
    bankAccountId:  parsed.bankAccountId,
    startDate:      parsed.startDate,
    endDate:        parsed.endDate,
    openingBalance: parsed.openingBalance ?? 0,
    closingBalance: parsed.closingBalance ?? 0,
    currency:       parsed.currency ?? "XOF",
  });

  if (parsed.lines?.length) {
    await tPost<StatementLine[]>(`/statements/${statement.id}/lines`,
      parsed.lines.map((l: any) => ({
        operationDate: l.date ?? l.operationDate,
        valueDate:     l.valueDate ?? l.date,
        label:         l.label ?? l.description,
        amount:        l.amount,
        direction:     l.direction,
        referenceCode: l.reference ?? l.referenceCode,
      }))
    );
  }

  return statement;
}

export async function closeStatement(statementId: string): Promise<BankStatement> {
  return tPost<BankStatement>(`/statements/${statementId}/close`);
}
