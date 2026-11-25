/**
 * Annuaire des comptes bancaires de l'organisation (cache court), pour afficher le nom du compte
 * sur les objets que le backend renvoie sans lui (remises, transactions) — sinon « Compte inconnu ».
 */
import { tGet, qs, requireOrg } from "@/lib/api/treasury-client";

let cache: { org: string; at: number; names: Map<string, string> } | null = null;
/**
 * Chargement en cours, partagé : la page Transactions charge les comptes en parallèle et chaque
 * chargement demande l'annuaire. Sans ce partage, les N appels simultanés ratent tous le cache
 * (encore vide) et rechargent chacun la liste des comptes — des centaines de requêtes qui
 * saturent la file du navigateur et figent les formulaires (création de transaction bloquée).
 */
let inflight: { org: string; promise: Promise<Map<string, string>> } | null = null;
const TTL_MS = 30_000;

export async function accountNames(): Promise<Map<string, string>> {
  const org = requireOrg();
  if (cache && cache.org === org && Date.now() - cache.at < TTL_MS) return cache.names;
  if (inflight && inflight.org === org) return inflight.promise;
  const promise = (async () => {
    const accounts = (await tGet<any[]>(`/bank-accounts${qs({ organizationId: org })}`)) ?? [];
    const names = new Map<string, string>();
    for (const a of accounts) {
      const number = String(a.accountNumber ?? "");
      names.set(a.id, `${a.label ?? a.bankName ?? "Compte"}${number ? ` · …${number.slice(-4)}` : ""}`);
    }
    cache = { org, at: Date.now(), names };
    return names;
  })().finally(() => { if (inflight?.promise === promise) inflight = null; });
  inflight = { org, promise };
  return promise;
}

/** Ajoute bankAccountName aux objets qui portent un bankAccountId. */
export async function withAccountNames<T extends { bankAccountId?: string; bankAccountName?: string }>(items: T[]): Promise<T[]> {
  if (!items.length) return items;
  const names = await accountNames().catch(() => new Map<string, string>());
  return items.map((it) => ({ ...it, bankAccountName: it.bankAccountName ?? (it.bankAccountId ? names.get(it.bankAccountId) : undefined) }));
}
