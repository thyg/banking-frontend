// lib/api/accounting.ts

import { Journal } from '@/types/accounting';

// Simule un appel API pour récupérer les journaux de type "banque"
export async function getBankJournals(): Promise<Journal[]> {
  console.log("API MOCK: Fetching bank journals...");
  
  // Simule une latence réseau de 500ms
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const mockJournals: Journal[] = [
    { id: 'journal_1', name: 'Journal Banque BNP', code: 'BNP', type: 'banque' },
    { id: 'journal_2', name: 'Journal Banque SG', code: 'SG', type: 'banque' },
    { id: 'journal_3', name: 'Caisse espèces', code: 'CAI', type: 'banque' },
  ];
  
  return Promise.resolve(mockJournals);
}