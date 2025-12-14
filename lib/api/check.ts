/**
 * @file lib/api/check.ts
 * @description API pour la gestion des chèques (émis et reçus).
 * Appels HTTP vers le backend Spring Boot.
 * 
 * @version 2.0.0 - Fix: Utilisation du backend réel au lieu des mocks
 * @author RT-ComOps Team
 * @since 2024-12-12
 */

import type {
  Check,
  CheckType,
  CheckStatus,
  CreateCheckData,
  UpdateCheckData,
  CheckFilters,
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
    const error = await response.json().catch(() => ({ message: 'Une erreur est survenue' }));
    throw new Error(error.message || `Erreur HTTP: ${response.status}`);
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

/**
 * Enrichit un chèque avec des champs calculés pour l'affichage.
 * Note: Le backend devrait déjà fournir bankAccountName, mais on garde cette fonction
 * pour la rétrocompatibilité et les cas où le backend ne le fournit pas.
 */
function enrichCheck(check: Check): Check {
  return {
    ...check,
    // Le backend devrait retourner bankAccountName, mais on s'assure qu'il existe
    bankAccountName: check.bankAccountName || 'Compte inconnu',
  };
}

// =============================================================================
// API CHÈQUES - LECTURE
// =============================================================================

/**
 * Récupère les chèques avec filtres optionnels.
 * 
 * @param filters - Filtres optionnels (compte, type, statut, dates, montants, recherche)
 * @returns Liste des chèques correspondant aux critères
 * 
 * @example
 * // Récupérer tous les chèques
 * const allChecks = await getChecks();
 * 
 * // Récupérer les chèques reçus en attente
 * const pendingReceived = await getChecks({ type: 'RECEIVED', status: 'PENDING' });
 */
export async function getChecks(filters?: CheckFilters): Promise<Check[]> {
  console.log('[API:Check] getChecks - filters:', filters);
  
  let checks: Check[] = [];
  
  // Déterminer quel endpoint utiliser selon les filtres
  if (filters?.bankAccountId) {
    // Filtrer par compte bancaire
    const response = await fetch(`${API_BASE_URL}/checks/account/${filters.bankAccountId}`);
    checks = await handleResponse<Check[]>(response);
  } else if (filters?.type && filters?.status) {
    // Filtrer par type ET statut
    const checkType = filters.type === 'RECEIVED' ? 'RECEIVED' : 'ISSUED';
    const response = await fetch(`${API_BASE_URL}/checks/type/${checkType}/status/${filters.status}`);
    checks = await handleResponse<Check[]>(response);
  } else if (filters?.type) {
    // Filtrer par type seulement
    const checkType = filters.type === 'RECEIVED' ? 'RECEIVED' : 'ISSUED';
    const response = await fetch(`${API_BASE_URL}/checks/type/${checkType}`);
    checks = await handleResponse<Check[]>(response);
  } else if (filters?.status) {
    // Filtrer par statut seulement
    const response = await fetch(`${API_BASE_URL}/checks/status/${filters.status}`);
    checks = await handleResponse<Check[]>(response);
  } else {
    // Récupérer tous les chèques
    const response = await fetch(`${API_BASE_URL}/checks`);
    checks = await handleResponse<Check[]>(response);
  }
  
  // Appliquer les filtres supplémentaires côté client
  // (le backend pourrait être étendu pour supporter ces filtres)
  if (filters) {
    // Filtre par dates
    if (filters.dateFrom || filters.startDate) {
      const startDate = filters.dateFrom || filters.startDate;
      checks = checks.filter(c => c.issueDate >= startDate!);
    }
    if (filters.dateTo || filters.endDate) {
      const endDate = filters.dateTo || filters.endDate;
      checks = checks.filter(c => c.issueDate <= endDate!);
    }
    
    // Filtre par montants
    if (filters.minAmount !== undefined) {
      checks = checks.filter(c => c.amount >= filters.minAmount!);
    }
    if (filters.maxAmount !== undefined) {
      checks = checks.filter(c => c.amount <= filters.maxAmount!);
    }
    
    // Filtre par recherche textuelle
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      checks = checks.filter(c =>
        c.checkNumber.toLowerCase().includes(searchLower) ||
        c.partnerName.toLowerCase().includes(searchLower) ||
        c.description?.toLowerCase().includes(searchLower) ||
        c.reference?.toLowerCase().includes(searchLower)
      );
    }
  }
  
  // Trier par date d'émission décroissante
  checks.sort((a, b) =>
    new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()
  );
  
  return checks.map(enrichCheck);
}

/**
 * Récupère un chèque par son ID.
 * 
 * @param id - Identifiant UUID du chèque
 * @returns Le chèque ou null si non trouvé
 */
export async function getCheckById(id: string): Promise<Check | null> {
  console.log('[API:Check] getCheckById:', id);
  
  try {
    const response = await fetch(`${API_BASE_URL}/checks/${id}`);
    if (response.status === 404) {
      return null;
    }
    const check = await handleResponse<Check>(response);
    return enrichCheck(check);
  } catch (error) {
    console.error('[API:Check] Erreur getCheckById:', error);
    return null;
  }
}

/**
 * Récupère les chèques par type (ISSUED ou RECEIVED).
 */
export async function getChecksByType(checkType: CheckType): Promise<Check[]> {
  console.log('[API:Check] getChecksByType:', checkType);
  
  const response = await fetch(`${API_BASE_URL}/checks/type/${checkType}`);
  const checks = await handleResponse<Check[]>(response);
  return checks.map(enrichCheck);
}

/**
 * Récupère les chèques par statut.
 */
export async function getChecksByStatus(status: CheckStatus): Promise<Check[]> {
  console.log('[API:Check] getChecksByStatus:', status);
  
  const response = await fetch(`${API_BASE_URL}/checks/status/${status}`);
  const checks = await handleResponse<Check[]>(response);
  return checks.map(enrichCheck);
}

/**
 * Récupère les chèques d'un compte bancaire.
 */
export async function getChecksByAccountId(accountId: string): Promise<Check[]> {
  console.log('[API:Check] getChecksByAccountId:', accountId);
  
  const response = await fetch(`${API_BASE_URL}/checks/account/${accountId}`);
  const checks = await handleResponse<Check[]>(response);
  return checks.map(enrichCheck);
}

/**
 * Récupère les chèques en attente dont l'échéance est avant une date donnée.
 */
export async function getPendingChecksDueBefore(date: string): Promise<Check[]> {
  console.log('[API:Check] getPendingChecksDueBefore:', date);
  
  const response = await fetch(buildUrl('/checks/pending/due-before', { date }));
  const checks = await handleResponse<Check[]>(response);
  return checks.map(enrichCheck);
}

// =============================================================================
// API CHÈQUES - ÉCRITURE
// =============================================================================

/**
 * Crée un nouveau chèque.
 * 
 * @param data - Données du chèque à créer
 * @returns Le chèque créé avec son ID
 * @throws Error si le compte bancaire n'existe pas ou si le numéro de chèque existe déjà
 */
export async function createCheck(data: CreateCheckData): Promise<Check> {
  console.log('[API:Check] createCheck:', data);
  
  const response = await fetch(`${API_BASE_URL}/checks`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  
  const check = await handleResponse<Check>(response);
  console.log('[API:Check] Chèque créé:', check.id);
  
  return enrichCheck(check);
}

/**
 * Met à jour un chèque existant.
 * 
 * @param id - Identifiant du chèque
 * @param data - Données à mettre à jour
 * @returns Le chèque mis à jour
 * @throws Error si le chèque n'existe pas ou ne peut plus être modifié
 */
export async function updateCheck(id: string, data: UpdateCheckData): Promise<Check> {
  console.log('[API:Check] updateCheck:', id, data);
  
  const response = await fetch(`${API_BASE_URL}/checks/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  });
  
  const check = await handleResponse<Check>(response);
  console.log('[API:Check] Chèque mis à jour:', id);
  
  return enrichCheck(check);
}

/**
 * Supprime un chèque (en attente uniquement).
 * 
 * @param id - Identifiant du chèque
 * @throws Error si le chèque n'existe pas ou n'est pas en attente
 */
export async function deleteCheck(id: string): Promise<void> {
  console.log('[API:Check] deleteCheck:', id);
  
  const response = await fetch(`${API_BASE_URL}/checks/${id}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Échec de la suppression' }));
    throw new Error(error.message || 'Échec de la suppression');
  }
  
  console.log('[API:Check] Chèque supprimé:', id);
}

// =============================================================================
// ACTIONS SUR LES CHÈQUES
// =============================================================================

/**
 * Remet un chèque reçu en banque (passage en DEPOSITED).
 * 
 * @param id - Identifiant du chèque
 * @param depositDate - Date de remise (optionnelle, utilise la date du jour si non fournie)
 * @returns Le chèque mis à jour
 */
export async function depositCheck(id: string, depositDate?: string): Promise<Check> {
  console.log('[API:Check] depositCheck:', id, depositDate);
  
  const date = depositDate || new Date().toISOString().split('T')[0];
  const response = await fetch(
    buildUrl(`/checks/${id}/deposit`, { depositDate: date }),
    { method: 'POST' }
  );
  
  const check = await handleResponse<Check>(response);
  console.log('[API:Check] Chèque remis en banque:', id);
  
  return enrichCheck(check);
}

/**
 * Marque un chèque comme encaissé/débité.
 * Crée automatiquement la transaction bancaire associée côté backend.
 * 
 * @param id - Identifiant du chèque
 * @param cashedDate - Date d'encaissement (optionnelle)
 * @returns Le chèque mis à jour
 */
export async function cashCheck(id: string, cashedDate?: string): Promise<Check> {
  console.log('[API:Check] cashCheck:', id, cashedDate);
  
  const date = cashedDate || new Date().toISOString().split('T')[0];
  const response = await fetch(
    buildUrl(`/checks/${id}/cash`, { cashedDate: date }),
    { method: 'POST' }
  );
  
  const check = await handleResponse<Check>(response);
  console.log('[API:Check] Chèque encaissé:', id);
  
  return enrichCheck(check);
}

/**
 * Marque un chèque comme rejeté.
 * 
 * @param id - Identifiant du chèque
 * @param rejectionReason - Motif du rejet (obligatoire)
 * @param rejectedDate - Date de rejet (optionnelle)
 * @returns Le chèque mis à jour
 */
export async function rejectCheck(
  id: string,
  rejectionReason: string,
  rejectedDate?: string
): Promise<Check> {
  console.log('[API:Check] rejectCheck:', id, rejectionReason);
  
  // Le backend attend 'reason' comme paramètre
  const response = await fetch(
    buildUrl(`/checks/${id}/reject`, { reason: rejectionReason }),
    { method: 'POST' }
  );
  
  const check = await handleResponse<Check>(response);
  console.log('[API:Check] Chèque rejeté:', id);
  
  return enrichCheck(check);
}

/**
 * Annule un chèque émis (avant qu'il soit débité).
 * 
 * @param id - Identifiant du chèque
 * @returns Le chèque mis à jour
 */
export async function cancelCheck(id: string): Promise<Check> {
  console.log('[API:Check] cancelCheck:', id);
  
  const response = await fetch(`${API_BASE_URL}/checks/${id}/cancel`, {
    method: 'POST',
  });
  
  const check = await handleResponse<Check>(response);
  console.log('[API:Check] Chèque annulé:', id);
  
  return enrichCheck(check);
}

// =============================================================================
// STATISTIQUES
// =============================================================================

/**
 * Récupère les statistiques des chèques.
 * Note: Cette fonction fait des calculs côté client en attendant un endpoint dédié.
 * 
 * @param bankAccountId - Filtre par compte (optionnel)
 * @param type - Filtre par type (optionnel)
 */
export async function getCheckStats(
  bankAccountId?: string,
  type?: CheckType
): Promise<{
  totalChecks: number;
  pendingCount: number;
  pendingAmount: number;
  depositedCount: number;
  depositedAmount: number;
  cashedCount: number;
  cashedAmount: number;
  rejectedCount: number;
  rejectedAmount: number;
}> {
  console.log('[API:Check] getCheckStats');
  
  // Récupérer les chèques selon les filtres
  let checks = await getChecks({ bankAccountId, type });
  
  // Exclure les annulés
  checks = checks.filter(c => c.status !== 'CANCELLED');
  
  const byStatus = (status: CheckStatus) => checks.filter(c => c.status === status);
  const sumAmount = (arr: Check[]) => arr.reduce((sum, c) => sum + c.amount, 0);
  
  return {
    totalChecks: checks.length,
    pendingCount: byStatus('PENDING').length,
    pendingAmount: sumAmount(byStatus('PENDING')),
    depositedCount: byStatus('DEPOSITED').length,
    depositedAmount: sumAmount(byStatus('DEPOSITED')),
    cashedCount: byStatus('CASHED').length,
    cashedAmount: sumAmount(byStatus('CASHED')),
    rejectedCount: byStatus('REJECTED').length,
    rejectedAmount: sumAmount(byStatus('REJECTED')),
  };
}

/**
 * Récupère les chèques en attente (à surveiller).
 * 
 * @param type - Filtre par type (optionnel)
 * @param limit - Nombre maximum de résultats
 */
export async function getPendingChecks(
  type?: CheckType,
  limit: number = 10
): Promise<Check[]> {
  console.log('[API:Check] getPendingChecks - type:', type, 'limit:', limit);
  
  let checks: Check[];
  
  if (type) {
    // Récupérer par type et statuts PENDING + DEPOSITED
    const pending = await getChecks({ type, status: 'PENDING' });
    const deposited = await getChecks({ type, status: 'DEPOSITED' });
    checks = [...pending, ...deposited];
  } else {
    // Récupérer tous les PENDING et DEPOSITED
    const pending = await getChecksByStatus('PENDING');
    const deposited = await getChecksByStatus('DEPOSITED');
    checks = [...pending, ...deposited];
  }
  
  // Trier par date d'échéance ou d'émission
  checks.sort((a, b) => {
    const dateA = a.dueDate || a.issueDate;
    const dateB = b.dueDate || b.issueDate;
    return new Date(dateA).getTime() - new Date(dateB).getTime();
  });
  
  return checks.slice(0, limit);
}