/**
 * Libellé d'un compte dans les listes de sélection : nom + fin du numéro + devise.
 * Plusieurs comptes d'une même banque s'affichaient tous « Banque Audit — XAF », indistinguables.
 */
export function accountOptionLabel(account: { name?: string; accountNumber?: string; currency?: string; isActive?: boolean }): string {
  const number = (account.accountNumber ?? "").replace(/\s+/g, "");
  const tail = number ? ` · …${number.slice(-4)}` : "";
  const inactive = account.isActive === false ? " (inactif)" : "";
  return `${account.name ?? "Compte"}${tail} — ${account.currency ?? "XAF"}${inactive}`;
}
