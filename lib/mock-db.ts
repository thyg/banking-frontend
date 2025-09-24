// lib/mock-db.ts

import { BankAccount } from "@/types/banking";
import { BankStatementLine } from "@/types/banking";

export let mockBankAccounts: BankAccount[] = [
    {
        id: 'acc_1',
        name: 'Compte Courant Pro',
        bankName: 'BNP Paribas',
        accountNumber: 'FR7630004000050000123456789',
        journalId: 'journal_1',
        currency: 'EUR',
        currentBalance: 12540.50,
    },
    {
        id: 'acc_2',
        name: 'Compte de Dépôt',
        bankName: 'Société Générale',
        accountNumber: 'FR7630003000010000987654321',
        journalId: 'journal_2',
        currency: 'EUR',
        currentBalance: 8230.15,
    }
];

export let mockStatementLines: BankStatementLine[] = [
    { id: 'line_1', date: '2025-09-22', label: 'Virement de CLIENT DUPONT', amount: 1200.00, isReconciled: false, partnerName: 'Client Dupont SARL' },
    { id: 'line_2', date: '2025-09-22', label: 'Paiement CB FREE MOBILE', amount: -19.99, isReconciled: true },
    { id: 'line_3', date: '2025-09-21', label: 'Frais bancaires', amount: -15.50, isReconciled: false },
    { id: 'line_4', date: '2025-09-20', label: 'Paiement facture EDF', amount: -125.75, isReconciled: true, partnerName: 'EDF' },
    { id: 'line_5', date: '2025-09-20', label: 'Virement de CLIENT MARTIN', amount: 560.00, isReconciled: false },
];