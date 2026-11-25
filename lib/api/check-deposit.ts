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
import { withAccountNames } from "@/lib/banking/account-directory";

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
    return withAccountNames((raw ?? []).map(mapCheckDeposit));
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
  // Plus récentes d'abord (une remise qu'on vient de créer doit apparaître en tête).
  return withAccountNames(results.flat().sort((a: any, b: any) =>
    String(b.createdAt ?? b.depositDate ?? "").localeCompare(String(a.createdAt ?? a.depositDate ?? ""))));
}

export async function getCheckDepositById(id: string): Promise<CheckDeposit | null> {
  try { return (await withAccountNames([mapCheckDeposit(await tGet<any>(`/check-deposits/${id}`))]))[0]; } catch { return null; }
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
  // 2. Remise ET chèques en une seule opération (tout ou rien) : un chèque refusé (déjà dans une
  //    autre remise, mauvais compte…) empêche la création, au lieu de laisser un brouillon incomplet.
  const requested = data.checkIds ?? [];
  const deposit = await tPost<any>("/check-deposits", withOrg({
    bankAccountId: data.bankAccountId,
    reference,
    depositDate: data.depositDate,
    checkIds: requested,
  }));

  // Compatibilité : un backend antérieur ignore checkIds → rattachement un à un des manquants.
  const attached = new Set<string>((deposit?.items ?? []).map((i: any) => i.checkId));
  for (const checkId of requested.filter((id) => !attached.has(id))) {
    const check = await tGet<Check>(`/checks/${checkId}`); // ancien backend : amount obligatoire
    await tPost(`/check-deposits/${deposit.id}/checks`, { checkId, amount: check.amount });
  }

  const complete = await getCheckDepositById(deposit.id);
  return complete ?? mapCheckDeposit(deposit);
}

/**
 * Chèques déjà engagés dans une remise ouverte (brouillon ou soumise) du compte. Un chèque reste
 * « reçu » jusqu'à la soumission de sa remise : sans ce filtre, le formulaire le proposait encore
 * et le backend refusait la nouvelle remise.
 */
export async function getCheckIdsInOpenDeposits(bankAccountId: string): Promise<Set<string>> {
  const raw = await tGet<any[]>(`/check-deposits${qs({ bankAccountId })}`);
  const ids = new Set<string>();
  for (const d of raw ?? []) {
    if (d.status === "DRAFT" || d.status === "SUBMITTED") {
      for (const item of d.items ?? []) ids.add(item.checkId);
    }
  }
  return ids;
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
