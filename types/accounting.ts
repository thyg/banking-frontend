// types/accounting.ts

export interface Journal {
  id: string;
  name: string;
  code: string;
  type: 'banque' | 'vente' | 'achat' | 'divers';
}