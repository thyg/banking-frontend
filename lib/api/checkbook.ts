/**
 * @file lib/api/checkbook.ts
 * @description API pour la gestion des chéquiers.
 *
 * @version 1.0.0
 */

import type { Checkbook, BankAccount } from '@/types/banking';

// =============================================================================
// CONFIGURATION
// =============================================================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

const headers = {
  'Content-Type': 'application/json',
};

// =============================================================================
// TYPES
// =============================================================================

export interface CreateCheckbookData {
  bankAccountId: string;
  rib: string;
  prefix: string;
  startNumber: number;
  endNumber: number;
}

export interface UpdateCheckbookData {
  status?: 'ACTIVE' | 'FINISHED' | 'CANCELLED';
}

// =============================================================================
// HELPERS
// =============================================================================

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Une erreur est survenue' }));
    throw new Error(error.message || `Erreur HTTP: ${response.status}`);
  }
  return response.json();
}

// Chéquier par défaut de l'ERP (nombre illimité de chèques)
const DEFAULT_CHECKBOOK: Checkbook = {
  id: 'default-erp-checkbook',
  bankAccountId: '',
  bankAccountName: 'Chéquier ERP (par défaut)',
  rib: 'N/A',
  prefix: 'CHQ-',
  startNumber: 1,
  endNumber: 999999999, // Nombre illimité
  currentNumber: 1,
  availableChecks: 999999999,
  status: 'ACTIVE',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// =============================================================================
// API CHÉQUIERS - LECTURE
// =============================================================================

/**
 * Récupère tous les chéquiers.
 */
export async function getCheckbooks(): Promise<Checkbook[]> {
  console.log('[API:Checkbook] getCheckbooks');

  try {
    const response = await fetch(`${API_BASE_URL}/checkbooks`);
    const checkbooks = await handleResponse<Checkbook[]>(response);
    // Ajouter le chéquier par défaut en premier
    return [DEFAULT_CHECKBOOK, ...checkbooks];
  } catch (error) {
    console.error('[API:Checkbook] Erreur getCheckbooks:', error);
    // En cas d'erreur, retourner au moins le chéquier par défaut
    return [DEFAULT_CHECKBOOK];
  }
}

/**
 * Récupère un chéquier par son ID.
 */
export async function getCheckbookById(id: string): Promise<Checkbook | null> {
  console.log('[API:Checkbook] getCheckbookById:', id);

  // Vérifier si c'est le chéquier par défaut
  if (id === 'default-erp-checkbook') {
    return DEFAULT_CHECKBOOK;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/checkbooks/${id}`);
    if (response.status === 404) {
      return null;
    }
    return handleResponse<Checkbook>(response);
  } catch (error) {
    console.error('[API:Checkbook] Erreur getCheckbookById:', error);
    return null;
  }
}

/**
 * Récupère les chéquiers d'un compte bancaire.
 */
export async function getCheckbooksForAccount(accountId: string): Promise<Checkbook[]> {
  console.log('[API:Checkbook] getCheckbooksForAccount:', accountId);

  try {
    const response = await fetch(`${API_BASE_URL}/checkbooks/account/${accountId}`);
    const checkbooks = await handleResponse<Checkbook[]>(response);
    // Ajouter le chéquier par défaut adapté au compte
    const defaultForAccount = {
      ...DEFAULT_CHECKBOOK,
      bankAccountId: accountId,
    };
    return [defaultForAccount, ...checkbooks];
  } catch (error) {
    console.error('[API:Checkbook] Erreur getCheckbooksForAccount:', error);
    // En cas d'erreur, retourner au moins le chéquier par défaut
    return [{
      ...DEFAULT_CHECKBOOK,
      bankAccountId: accountId,
    }];
  }
}

/**
 * Récupère les chéquiers actifs d'un compte.
 */
export async function getActiveCheckbooksForAccount(accountId: string): Promise<Checkbook[]> {
  const checkbooks = await getCheckbooksForAccount(accountId);
  return checkbooks.filter(cb => cb.status === 'ACTIVE');
}

// =============================================================================
// API CHÉQUIERS - ÉCRITURE
// =============================================================================

/**
 * Crée un nouveau chéquier.
 */
export async function createCheckbook(data: CreateCheckbookData): Promise<Checkbook> {
  console.log('[API:Checkbook] createCheckbook:', data);

  const response = await fetch(`${API_BASE_URL}/checkbooks`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });

  return handleResponse<Checkbook>(response);
}

/**
 * Met à jour un chéquier.
 */
export async function updateCheckbook(id: string, data: UpdateCheckbookData): Promise<Checkbook> {
  console.log('[API:Checkbook] updateCheckbook:', id, data);

  const response = await fetch(`${API_BASE_URL}/checkbooks/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  });

  return handleResponse<Checkbook>(response);
}

/**
 * Supprime un chéquier (seulement si aucun chèque n'a été émis).
 */
export async function deleteCheckbook(id: string): Promise<void> {
  console.log('[API:Checkbook] deleteCheckbook:', id);

  const response = await fetch(`${API_BASE_URL}/checkbooks/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Échec de la suppression' }));
    throw new Error(error.message || 'Échec de la suppression');
  }
}

// =============================================================================
// ACTIONS SUR LES CHÉQUIERS
// =============================================================================

/**
 * Réserve le prochain numéro de chèque disponible dans un chéquier.
 * Retourne le numéro complet (préfixe + numéro).
 */
export async function reserveNextCheckNumber(checkbookId: string): Promise<string> {
  console.log('[API:Checkbook] reserveNextCheckNumber:', checkbookId);

  // Pour le chéquier par défaut, générer un numéro basé sur le timestamp
  if (checkbookId === 'default-erp-checkbook') {
    const timestamp = Date.now().toString().slice(-8);
    return `CHQ-${timestamp}`;
  }

  try {
    // Utiliser l'endpoint GET /api/checkbooks/{id}/next-number
    const response = await fetch(`${API_BASE_URL}/checkbooks/${checkbookId}/next-number`);
    const result = await handleResponse<{ checkbookId: string; checkNumber: string }>(response);
    return result.checkNumber;
  } catch (error) {
    // Fallback: récupérer le chéquier et calculer le prochain numéro
    const checkbook = await getCheckbookById(checkbookId);
    if (checkbook) {
      return `${checkbook.prefix}${String(checkbook.currentNumber).padStart(6, '0')}`;
    }
    throw error;
  }
}

/**
 * Marque un chéquier comme terminé.
 */
export async function finishCheckbook(id: string): Promise<Checkbook> {
  return updateCheckbook(id, { status: 'FINISHED' });
}

/**
 * Annule un chéquier.
 */
export async function cancelCheckbook(id: string): Promise<Checkbook> {
  return updateCheckbook(id, { status: 'CANCELLED' });
}
