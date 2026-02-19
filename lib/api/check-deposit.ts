/**
 * @file lib/api/check-deposit.ts
 * @description API pour la gestion des remises de chèques en lot.
 * Appels HTTP vers le backend Spring Boot.
 *
 * @version 1.0.0
 * @author RT-ComOps Team
 * @since 2026-02-16
 */

import type {
  CheckDeposit,
  CreateCheckDepositData,
  CheckDepositFilters,
} from '@/types/banking';

// =============================================================================
// CONFIGURATION
// =============================================================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

const headers = {
  'Content-Type': 'application/json',
};

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Gère la réponse HTTP et extrait le JSON ou lance une erreur.
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `Erreur HTTP: ${response.status}`;
    try {
      const text = await response.text();
      console.error(`[API:CheckDeposit] Erreur ${response.status} - Réponse brute:`, text);

      if (text) {
        const errorBody = JSON.parse(text);
        errorMessage = errorBody.message || errorBody.error || errorBody.detail || errorMessage;
      }
    } catch {
      // Si on ne peut pas parser le JSON, on garde le message par défaut
    }
    throw new Error(errorMessage);
  }
  return response.json();
}

/**
 * Construit une URL avec des paramètres de requête.
 */
function buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
  const url = new URL(`${API_BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.append(key, String(value));
      }
    });
  }
  return url.toString();
}

// =============================================================================
// API REMISES DE CHÈQUES - LECTURE
// =============================================================================

/**
 * Récupère toutes les remises de chèques.
 *
 * @returns Liste des remises de chèques
 */
export async function getCheckDeposits(): Promise<CheckDeposit[]> {
  console.log('[API:CheckDeposit] getCheckDeposits');

  const response = await fetch(`${API_BASE_URL}/check-deposits`);
  return handleResponse<CheckDeposit[]>(response);
}

/**
 * Récupère une remise de chèques par son ID avec tous les détails (chèques inclus).
 *
 * @param id - Identifiant UUID de la remise
 * @returns La remise avec ses détails ou null si non trouvée
 */
export async function getCheckDepositById(id: string): Promise<CheckDeposit | null> {
  console.log('[API:CheckDeposit] getCheckDepositById:', id);

  try {
    const response = await fetch(`${API_BASE_URL}/check-deposits/${id}`);
    if (response.status === 404) {
      return null;
    }
    return handleResponse<CheckDeposit>(response);
  } catch (error) {
    console.error('[API:CheckDeposit] Erreur getCheckDepositById:', error);
    return null;
  }
}

/**
 * Récupère les remises de chèques pour un compte bancaire spécifique.
 *
 * @param accountId - ID du compte bancaire
 * @returns Liste des remises du compte
 */
export async function getCheckDepositsByAccountId(accountId: string): Promise<CheckDeposit[]> {
  console.log('[API:CheckDeposit] getCheckDepositsByAccountId:', accountId);

  const response = await fetch(`${API_BASE_URL}/check-deposits/account/${accountId}`);
  return handleResponse<CheckDeposit[]>(response);
}

/**
 * Récupère les remises de chèques non rapprochées (status = DEPOSITED).
 *
 * @returns Liste des remises en attente de rapprochement
 */
export async function getUnreconciledDeposits(): Promise<CheckDeposit[]> {
  console.log('[API:CheckDeposit] getUnreconciledDeposits');

  const response = await fetch(`${API_BASE_URL}/check-deposits/unreconciled`);
  return handleResponse<CheckDeposit[]>(response);
}

// =============================================================================
// API REMISES DE CHÈQUES - ÉCRITURE
// =============================================================================

/**
 * Crée une nouvelle remise de chèques.
 *
 * @param data - Données de la remise (checkIds, bankAccountId, depositDate)
 * @returns La remise créée
 * @throws Error si la validation échoue
 */
export async function createCheckDeposit(data: CreateCheckDepositData): Promise<CheckDeposit> {
  console.log('[API:CheckDeposit] createCheckDeposit:', data);

  const response = await fetch(`${API_BASE_URL}/check-deposits`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });

  const deposit = await handleResponse<CheckDeposit>(response);
  console.log('[API:CheckDeposit] Remise créée:', deposit.id, deposit.reference);

  return deposit;
}

// =============================================================================
// API WORKFLOW REMISES DE CHÈQUES
// =============================================================================

/**
 * Confirme le dépôt en banque d'une remise (Step 2).
 * Fait passer la remise de PENDING à DEPOSITED.
 *
 * @param depositId - ID de la remise de chèques
 * @param depositDate - Date du dépôt physique en banque
 * @returns La remise mise à jour
 */
export async function confirmCheckDeposit(depositId: string, depositDate: string): Promise<CheckDeposit> {
  console.log('[API:CheckDeposit] confirmCheckDeposit:', depositId, depositDate);

  const response = await fetch(
    `${API_BASE_URL}/check-deposits/${depositId}/confirm-deposit?depositDate=${depositDate}`,
    { method: 'POST' }
  );

  const deposit = await handleResponse<CheckDeposit>(response);
  console.log('[API:CheckDeposit] Dépôt confirmé:', deposit.id, deposit.reference, deposit.status);

  return deposit;
}

/**
 * Marque une remise comme encaissée (Step 3).
 * Fait passer la remise de DEPOSITED à CASHED.
 * Crée une transaction bancaire unique pour le montant total.
 *
 * @param depositId - ID de la remise de chèques
 * @param cashedDate - Date d'encaissement (réception des fonds)
 * @returns La remise mise à jour
 */
export async function cashCheckDeposit(depositId: string, cashedDate: string): Promise<CheckDeposit> {
  console.log('[API:CheckDeposit] cashCheckDeposit:', depositId, cashedDate);

  const response = await fetch(
    `${API_BASE_URL}/check-deposits/${depositId}/cash?cashedDate=${cashedDate}`,
    { method: 'POST' }
  );

  const deposit = await handleResponse<CheckDeposit>(response);
  console.log('[API:CheckDeposit] Remise encaissée:', deposit.id, deposit.reference, deposit.status);

  return deposit;
}

/**
 * Annule une remise en attente (PENDING uniquement).
 * Les chèques sont libérés et redeviennent disponibles.
 *
 * @param depositId - ID de la remise de chèques
 */
export async function cancelCheckDeposit(depositId: string): Promise<void> {
  console.log('[API:CheckDeposit] cancelCheckDeposit:', depositId);

  const response = await fetch(`${API_BASE_URL}/check-deposits/${depositId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    let errorMessage = `Erreur HTTP: ${response.status}`;
    try {
      const text = await response.text();
      if (text) {
        const errorBody = JSON.parse(text);
        errorMessage = errorBody.message || errorBody.error || errorMessage;
      }
    } catch {
      // Ignorer
    }
    throw new Error(errorMessage);
  }

  console.log('[API:CheckDeposit] Remise annulée:', depositId);
}

// =============================================================================
// API RAPPROCHEMENT
// =============================================================================

/**
 * Rapproche une remise de chèques avec une ligne de relevé bancaire.
 *
 * @param depositId - ID de la remise de chèques
 * @param statementLineId - ID de la ligne de relevé bancaire
 */
export async function reconcileCheckDeposit(depositId: string, statementLineId: string): Promise<void> {
  console.log('[API:CheckDeposit] reconcileCheckDeposit:', depositId, statementLineId);

  const response = await fetch(
    `${API_BASE_URL}/reconciliation/check-deposit/${depositId}/line/${statementLineId}`,
    { method: 'POST' }
  );

  if (!response.ok) {
    let errorMessage = `Erreur HTTP: ${response.status}`;
    try {
      const text = await response.text();
      if (text) {
        const errorBody = JSON.parse(text);
        errorMessage = errorBody.message || errorBody.error || errorMessage;
      }
    } catch {
      // Ignorer
    }
    throw new Error(errorMessage);
  }

  console.log('[API:CheckDeposit] Remise rapprochée:', depositId);
}
