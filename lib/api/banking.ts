// lib/api/banking.ts
import { BankAccount, BankStatement, BankStatementLine, ReconciliationSuggestion } from '@/types/banking';
import { mockBankAccounts } from '../mock-db'; // Importez vos données simulées
import { mockStatementLines } from '../mock-db'; // <--- NOUVEL IMPORT


// Helper pour simuler la latence du réseau
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- GESTION DES COMPTES BANCAIRES ---
export async function getBankAccounts(): Promise<BankAccount[]> {
    await wait(500); // Simule le temps de chargement
    return Promise.resolve([...mockBankAccounts]); // Retourne une copie
}

export async function createBankAccount(data: Omit<BankAccount, 'id' | 'currentBalance'>): Promise<BankAccount> {
    await wait(500);
    const newAccount: BankAccount = {
        ...data,
        id: `acc_${Math.random().toString(36).substr(2, 9)}`, // Génère un ID aléatoire
        currentBalance: 0,
    };
    mockBankAccounts.push(newAccount);
    return Promise.resolve(newAccount);
}

export async function updateBankAccount(id: string, data: Partial<BankAccount>): Promise<BankAccount> {
    await wait(500);
    const accountIndex = mockBankAccounts.findIndex((acc: BankAccount) => acc.id === id);
    if (accountIndex === -1) throw new Error("Account not found");
    
    mockBankAccounts[accountIndex] = { ...mockBankAccounts[accountIndex], ...data };
    return Promise.resolve(mockBankAccounts[accountIndex]);
}

export async function deleteBankAccount(id: string): Promise<void> {
    await wait(500);
    const accountIndex = mockBankAccounts.findIndex((acc: BankAccount) => acc.id === id);
    if (accountIndex > -1) {
        mockBankAccounts.splice(accountIndex, 1);
    }
    return Promise.resolve();
}

// --- GESTION DES RELEVÉS ---
// Note: Ces fonctions sont des placeholders pour les futures étapes
export async function uploadStatement(accountId: string, file: File): Promise<BankStatement> {
    await wait(1500); // L'upload est plus long
    console.log(`Uploading file ${file.name} for account ${accountId}`);
    
    // Simule la création d'un nouveau relevé
    const newStatement: BankStatement = {
        id: `stmt_${Math.random().toString(36).substr(2, 9)}`,
        name: `Relevé du ${new Date().toLocaleDateString()}`,
        date: new Date().toISOString(),
        startBalance: 1000,
        endBalance: 2500,
        lineCount: 15,
        status: 'draft',
    };
    return Promise.resolve(newStatement);
}

export async function getStatementDetails(statementId: string): Promise<BankStatement> {
    await wait(300);
    // Retourne un relevé statique pour le développement
    return Promise.resolve({
        id: statementId,
        name: `Relevé Test 2025-09-23`,
        date: new Date().toISOString(),
        startBalance: 1000,
        endBalance: 2500,
        lineCount: 5,
        status: 'draft',
    });
}

export async function getStatementLines(statementId: string): Promise<BankStatementLine[]> {
    await wait(700);
    // Retourne une copie de l'état actuel de notre base de données simulée
    return Promise.resolve([...mockStatementLines]);
}


// --- LOGIQUE DE RAPPROCHEMENT ---
export async function getReconciliationSuggestions(lineId: string): Promise<ReconciliationSuggestion[]> {
    await wait(400);
    // Simule des suggestions uniquement pour la ligne 1
    if (lineId === 'line_1') {
        return Promise.resolve([
            { id: 'inv_1', type: 'invoice', reference: 'FA2025-08-012', partnerName: 'Client Dupont SARL', amountDue: 1200.00, date: '2025-08-15' }
        ]);
    }
    return Promise.resolve([]);
}
export async function reconcileWithSuggestion(lineId: string, suggestionId: string): Promise<{ success: boolean }> {
    await wait(600);
    console.log(`Reconciling line ${lineId} with suggestion ${suggestionId}`);
    
    const lineIndex = mockStatementLines.findIndex(line => line.id === lineId);
    if (lineIndex !== -1) {
        mockStatementLines[lineIndex].isReconciled = true; // On change l'état !
    }
    
    return Promise.resolve({ success: true });
}
export async function reconcileManually(lineId: string, accountId: string, partnerId?: string): Promise<{ success: boolean }> {
    await wait(600);
    console.log(`Reconciling line ${lineId} manually with account ${accountId}`);
    
    const lineIndex = mockStatementLines.findIndex(line => line.id === lineId);
    if (lineIndex !== -1) {
        mockStatementLines[lineIndex].isReconciled = true; // On change l'état !
    }
    
    return Promise.resolve({ success: true });
}
