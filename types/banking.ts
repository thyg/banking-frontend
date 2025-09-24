// types/banking.ts

// La fiche d'identité d'un compte en banque
export interface BankAccount {
  id: string;
  name: string;
  bankName: string; // Ex: "BNP Paribas"
  accountNumber: string; // Ex: FR76...
  journalId: string; // ID du journal comptable lié
  currency: 'EUR' | 'USD'; // A adapter
  currentBalance: number;
}

// Un relevé bancaire importé
export interface BankStatement {
  id: string;
  name: string;
  date: string; // Date d'import
  startBalance: number;
  endBalance: number;
  lineCount: number;
  status: 'draft' | 'reconciled'; // Brouillon ou entièrement rapproché
}

// Une seule ligne de transaction sur un relevé
export interface BankStatementLine {
  id: string;
  date: string;
  label: string; // Libellé brut de la banque
  partnerName?: string; // Nom du partenaire si le back l'a identifié
  amount: number;
  isReconciled: boolean;
}

// Une suggestion de rapprochement fournie par le backend
// Ex: une facture qui correspond au montant et/ou au partenaire
export interface ReconciliationSuggestion {
  type: 'invoice' | 'bill'; // Facture client ou fournisseur
  id: string; // ID de la facture/bill
  reference: string; // Ex: "FA2025-001"
  partnerName: string;
  amountDue: number;
  date: string;
}

