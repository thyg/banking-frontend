// lib/api/check-deposit.ts — Remises de chèques (iwm-treasury-core)
// Backend: GET/POST /api/treasury/check-deposits  (?bankAccountId=)
//          GET      /api/treasury/check-deposits/{id}
//          POST     /api/treasury/check-deposits/{id}/checks
//          DELETE   /api/treasury/check-deposits/{id}/checks/{checkId}
//          POST     /api/treasury/check-deposits/{id}/submit   (→ confirmCheckDeposit)
//          POST     /api/treasury/check-deposits/{id}/validate (→ cashCheckDeposit)
//          POST     /api/treasury/check-deposits/{id}/reject

import { tGet, tPost, tDel, qs } from "@/lib/api/treasury-client";
import type { CheckDeposit } from "@/types/banking";

export interface CreateCheckDepositData {
  bankAccountId: string;
  depositDate: string;
  description?: string;
  checkIds?: string[];
}

export interface CheckDepositFilters {
  bankAccountId?: string;
}

export async function getCheckDeposits(filters?: CheckDepositFilters): Promise<CheckDeposit[]> {
  return tGet<CheckDeposit[]>(`/check-deposits${qs({ bankAccountId: filters?.bankAccountId })}`);
}

export async function getCheckDepositById(id: string): Promise<CheckDeposit | null> {
  try { return await tGet<CheckDeposit>(`/check-deposits/${id}`); } catch { return null; }
}

export async function getCheckDepositsByAccountId(accountId: string): Promise<CheckDeposit[]> {
  return tGet<CheckDeposit[]>(`/check-deposits${qs({ bankAccountId: accountId })}`);
}

export async function getUnreconciledCheckDeposits(): Promise<CheckDeposit[]> {
  const all = await tGet<CheckDeposit[]>("/check-deposits");
  return all.filter((d: any) => d.status !== "VALIDATED" && d.status !== "REJECTED");
}

export async function createCheckDeposit(data: CreateCheckDepositData): Promise<CheckDeposit> {
  return tPost<CheckDeposit>("/check-deposits", data);
}

export async function addCheckToDeposit(depositId: string, checkId: string): Promise<CheckDeposit> {
  return tPost<CheckDeposit>(`/check-deposits/${depositId}/checks`, { checkId });
}

export async function removeCheckFromDeposit(depositId: string, checkId: string): Promise<void> {
  await tDel(`/check-deposits/${depositId}/checks/${checkId}`);
}

export async function confirmCheckDeposit(id: string, _depositDate?: string): Promise<CheckDeposit> {
  return tPost<CheckDeposit>(`/check-deposits/${id}/submit`);
}

export async function cashCheckDeposit(id: string, _cashDate?: string): Promise<CheckDeposit> {
  return tPost<CheckDeposit>(`/check-deposits/${id}/validate`);
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
