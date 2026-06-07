// lib/api/checkbook.ts — Chéquiers (iwm-treasury-core)
// Backend: GET/POST /api/treasury/checkbooks
//          GET      /api/treasury/checkbooks/{id}
//          GET      /api/treasury/checkbooks/{id}/stats
//          POST     /api/treasury/checkbooks/{id}/close

import { tGet, tPost, qs } from "@/lib/api/treasury-client";
import type { Checkbook } from "@/types/banking";

export interface CreateCheckbookData {
  bankAccountId: string;
  prefix: string;
  startNumber: number;
  numberOfPages: number;
}

export interface CheckbookStats {
  usedChecksCount: number;
  totalAmountIssued: number;
  totalAmountCashed: number;
  remainingChecks: number;
}

export async function getCheckbooks(bankAccountId?: string): Promise<Checkbook[]> {
  return tGet<Checkbook[]>(`/checkbooks${qs({ bankAccountId })}`);
}

export async function getCheckbookById(id: string): Promise<Checkbook | null> {
  try {
    return await tGet<Checkbook>(`/checkbooks/${id}`);
  } catch {
    return null;
  }
}

export async function getSystemCheckbook(): Promise<Checkbook | null> {
  return null;
}

export async function getActiveCheckbooksForAccount(accountId: string): Promise<Checkbook[]> {
  const all = await getCheckbooks(accountId);
  return all.filter((cb: any) => cb.status === "ACTIVE");
}

export async function createCheckbook(data: CreateCheckbookData): Promise<Checkbook> {
  return tPost<Checkbook>("/checkbooks", data);
}

export async function cancelCheckbook(id: string): Promise<Checkbook> {
  return tPost<Checkbook>(`/checkbooks/${id}/close`);
}

export async function peekNextCheckNumber(checkbookId: string): Promise<string> {
  const checkbook = await getCheckbookById(checkbookId);
  if (!checkbook) throw new Error("Chéquier introuvable.");
  const seq = checkbook.currentNumber ?? checkbook.nextSequence ?? checkbook.startNumber ?? 1;
  const prefix = checkbook.prefix ?? '';
  return `${prefix}${seq}`;
}

export async function getCheckbookStats(id: string): Promise<CheckbookStats> {
  return tGet<CheckbookStats>(`/checkbooks/${id}/stats`);
}
