// lib/api/check-deposit.ts — Remises de chèques (RT-comops-treasury-core)
// Backend: GET      /api/treasury/check-deposits?bankAccountId=  (bankAccountId REQUIS)
//          GET      /api/treasury/check-deposits/{id}
//          POST     /api/treasury/check-deposits   { organizationId, bankAccountId, reference, depositDate }
//          POST     /api/treasury/check-deposits/{id}/checks   { checkId, amount }
//          DELETE   /api/treasury/check-deposits/{id}/checks/{checkId}
//          POST     /api/treasury/check-deposits/{id}/submit   (→ confirmCheckDeposit)
//          POST     /api/treasury/check-deposits/{id}/validate (→ cashCheckDeposit)
//          POST     /api/treasury/check-deposits/{id}/reject   { reason }
// Statuts backend : DRAFT | SUBMITTED | VALIDATED | REJECTED
// (l'UI connaît PENDING | DEPOSITED | CASHED — on mappe à la lecture).

import { tGet, tPost, tDel, qs, requireOrg, withOrg } from "@/lib/api/treasury-client";
import type { Check, CheckDeposit } from "@/types/banking";

export interface CreateCheckDepositData {
  bankAccountId: string;
  depositDate: string;
  reference?: string;
  description?: string;
  checkIds?: string[];
}

export interface CheckDepositFilters {
  bankAccountId?: string;
}

/** Réponse backend → forme UI (statuts + alias). */
function mapCheckDeposit(r: any): CheckDeposit {
  const status =
    r.status === "DRAFT" ? "PENDING" :
    r.status === "SUBMITTED" ? "DEPOSITED" :
    r.status === "VALIDATED" ? "CASHED" :
    r.status;
  return { ...r, status } as CheckDeposit;
}

export async function getCheckDeposits(filters?: CheckDepositFilters): Promise<CheckDeposit[]> {
  if (filters?.bankAccountId) {
    const raw = await tGet<any[]>(`/check-deposits${qs({ bankAccountId: filters.bankAccountId })}`);
    return (raw ?? []).map(mapCheckDeposit);
  }
  // Pas de liste globale côté backend : agrégation par compte de l'organisation.
  const accounts = await tGet<any[]>(`/bank-accounts${qs({ organizationId: requireOrg() })}`);
  const results = await Promise.all(
    (accounts ?? []).map(async (a) => {
      try {
        const raw = await tGet<any[]>(`/check-deposits${qs({ bankAccountId: a.id })}`);
        return (raw ?? []).map(mapCheckDeposit);
      } catch {
        return [] as CheckDeposit[];
      }
    })
  );
  return results.flat();
}

export async function getCheckDepositById(id: string): Promise<CheckDeposit | null> {
  try { return mapCheckDeposit(await tGet<any>(`/check-deposits/${id}`)); } catch { return null; }
}

export async function getCheckDepositsByAccountId(accountId: string): Promise<CheckDeposit[]> {
  return getCheckDeposits({ bankAccountId: accountId });
}

export async function getUnreconciledCheckDeposits(): Promise<CheckDeposit[]> {
  const all = await getCheckDeposits();
  return all.filter(d => d.status !== "CASHED" && d.status !== "REJECTED");
}

export async function createCheckDeposit(data: CreateCheckDepositData): Promise<CheckDeposit> {
  // 1. Créer la remise (le backend exige une référence — générée si absente).
  const reference =
    data.reference ||
    `REM-${(data.depositDate || "").replace(/-/g, "") || Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const deposit = await tPost<any>("/check-deposits", withOrg({
    bankAccountId: data.bankAccountId,
    reference,
    depositDate: data.depositDate,
  }));

  // 2. Rattacher les chèques un à un : le backend n'accepte pas checkIds à la création
  //    et exige le montant de chaque chèque.
  for (const checkId of data.checkIds ?? []) {
    const check = await tGet<Check>(`/checks/${checkId}`);
    await tPost(`/check-deposits/${deposit.id}/checks`, { checkId, amount: check.amount });
  }

  const complete = await getCheckDepositById(deposit.id);
  return complete ?? mapCheckDeposit(deposit);
}

export async function addCheckToDeposit(depositId: string, checkId: string, amount?: number): Promise<CheckDeposit> {
  // Le backend exige { checkId, amount } : on récupère le montant si non fourni.
  const checkAmount = amount ?? (await tGet<Check>(`/checks/${checkId}`)).amount;
  return mapCheckDeposit(
    await tPost<any>(`/check-deposits/${depositId}/checks`, { checkId, amount: checkAmount })
  );
}

export async function removeCheckFromDeposit(depositId: string, checkId: string): Promise<void> {
  await tDel(`/check-deposits/${depositId}/checks/${checkId}`);
}

export async function confirmCheckDeposit(id: string, _depositDate?: string): Promise<CheckDeposit> {
  return mapCheckDeposit(await tPost<any>(`/check-deposits/${id}/submit`));
}

export async function cashCheckDeposit(id: string, _cashDate?: string): Promise<CheckDeposit> {
  return mapCheckDeposit(await tPost<any>(`/check-deposits/${id}/validate`));
}

export async function deleteCheckDeposit(id: string): Promise<void> {
  await tPost(`/check-deposits/${id}/reject`, { reason: "Annulation" });
}

export async function cancelCheckDeposit(id: string): Promise<void> {
  await tPost(`/check-deposits/${id}/reject`, { reason: "Annulation" });
}

export async function reconcileCheckDepositWithStatementLine(
  _depositId: string,
  _lineId: string
): Promise<void> {
  throw new Error("La réconciliation directe d'une remise n'est pas disponible. Utilisez le rapprochement bancaire.");
}
