// lib/api/checkbook.ts — Chéquiers (RT-comops-treasury-core)
// Backend: GET      /api/treasury/checkbooks?bankAccountId=  (bankAccountId REQUIS)
//          GET      /api/treasury/checkbooks/{id}
//          GET      /api/treasury/checkbooks/{id}/stats
//          POST     /api/treasury/checkbooks   (organizationId requis dans le body)
//          POST     /api/treasury/checkbooks/{id}/close
// Statuts backend : ACTIVE | CLOSED | EXHAUSTED (l'UI connaît ACTIVE | FINISHED | CANCELLED).

import { tGet, tPost, qs, requireOrg, withOrg } from "@/lib/api/treasury-client";
import type { Checkbook } from "@/types/banking";

export interface CreateCheckbookData {
  bankAccountId: string;
  prefix: string;
  startNumber: number;
  numberOfPages: number;
  type?: string;
}

export interface CheckbookStats {
  usedChecksCount: number;
  totalAmountIssued: number;
  totalAmountCashed: number;
  remainingChecks: number;
}

/** Réponse backend → forme UI (numberOfPages, nextSequence, statuts). */
function mapCheckbook(r: any, bankAccountName?: string): Checkbook {
  const status =
    r.status === "EXHAUSTED" ? "FINISHED" :
    r.status === "CLOSED" ? "CANCELLED" :
    r.status;
  return {
    ...r,
    status,
    numberOfPages: r.numberOfPages ?? r.totalCapacity ?? null,
    nextSequence: r.nextSequence ?? r.currentNumber ?? null,
    availableChecks: r.availableChecks ?? -1,
    bankAccountName: r.bankAccountName ?? bankAccountName ?? null,
    iban: r.iban ?? null,
    createdAt: r.createdAt ?? r.issuedAt ?? "",
    updatedAt: r.updatedAt ?? r.issuedAt ?? "",
  } as Checkbook;
}

export async function getCheckbooks(bankAccountId?: string): Promise<Checkbook[]> {
  if (bankAccountId) {
    const raw = await tGet<any[]>(`/checkbooks${qs({ bankAccountId })}`);
    return (raw ?? []).map(cb => mapCheckbook(cb));
  }
  // Le backend n'a pas de liste globale : on agrège par compte de l'organisation.
  const accounts = await tGet<any[]>(`/bank-accounts${qs({ organizationId: requireOrg() })}`);
  const results = await Promise.all(
    (accounts ?? []).map(async (a) => {
      try {
        const raw = await tGet<any[]>(`/checkbooks${qs({ bankAccountId: a.id })}`);
        return (raw ?? []).map(cb => mapCheckbook(cb, a.bankName ?? a.accountNumber));
      } catch {
        return [] as Checkbook[];
      }
    })
  );
  return results.flat();
}

export async function getCheckbookById(id: string): Promise<Checkbook | null> {
  try {
    return mapCheckbook(await tGet<any>(`/checkbooks/${id}`));
  } catch {
    return null;
  }
}

export async function getSystemCheckbook(): Promise<Checkbook | null> {
  return null;
}

export async function getActiveCheckbooksForAccount(accountId: string): Promise<Checkbook[]> {
  const all = await getCheckbooks(accountId);
  return all.filter(cb => cb.status === "ACTIVE");
}

export async function createCheckbook(data: CreateCheckbookData): Promise<Checkbook> {
  return mapCheckbook(await tPost<any>("/checkbooks", withOrg(data)));
}

export async function cancelCheckbook(id: string): Promise<Checkbook> {
  return mapCheckbook(await tPost<any>(`/checkbooks/${id}/close`));
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
