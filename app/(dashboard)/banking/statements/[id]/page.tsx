/**
 * @file app/dashboard/banking/statements/[id]/page.tsx
 * @description Page de rapprochement d'un relevé bancaire.
 * Ce composant "intelligent" gère l'état de la sélection d'une ligne,
 * charge les données du relevé et de ses suggestions, et connecte le
 * tableau des lignes au panneau de rapprochement.
 */

"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';

// Types et API
import { BankStatement, BankStatementLine, ReconciliationSuggestion } from '@/types/banking';
import { 
  getStatementDetails, 
  getStatementLines, 
  getReconciliationSuggestions,
  reconcileWithSuggestion,
  reconcileManually,
} from '@/lib/api/banking';

// Composants
import { StatementLinesTable } from '@/components/banking/statement-lines-table';
import { ReconciliationPanel } from '@/components/banking/reconciliation-panel';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

// Type pour le formulaire manuel
type ManualReconData = {
  partnerId?: string;
  accountId: string;
};

export default function ReconciliationPage() {
  const router = useRouter();
  const params = useParams();
  const statementId = params.id as string;

  // --- États pour les données ---
  const [statement, setStatement] = useState<BankStatement | null>(null);
  const [lines, setLines] = useState<BankStatementLine[]>([]);
  const [suggestions, setSuggestions] = useState<ReconciliationSuggestion[]>([]);

  // --- États pour l'UI et le chargement ---
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);

  // Fonction pour (re)charger la liste des lignes du relevé
  const fetchStatementLines = useCallback(async () => {
    if (!statementId) return;
    try {
      const linesData = await getStatementLines(statementId);
      setLines(linesData);
    } catch (error) {
      console.error("Échec de la récupération des lignes du relevé:", error);
    }
  }, [statementId]);

  // Effet initial pour charger les données de la page (détails + lignes)
  useEffect(() => {
    async function loadInitialData() {
      if (!statementId) return;
      setIsLoadingPage(true);
      try {
        const [statementData, linesData] = await Promise.all([
          getStatementDetails(statementId),
          getStatementLines(statementId),
        ]);
        setStatement(statementData);
        setLines(linesData);
      } catch (error) {
        console.error("Échec du chargement de la page de rapprochement:", error);
        // TODO: Afficher une page d'erreur ou un toast
      } finally {
        setIsLoadingPage(false);
      }
    }
    loadInitialData();
  }, [statementId]);

  // Effet pour charger les suggestions quand une ligne est sélectionnée
  useEffect(() => {
    async function loadSuggestions() {
      if (!selectedLineId) {
        setSuggestions([]);
        return;
      }
      setIsLoadingSuggestions(true);
      try {
        const suggestionsData = await getReconciliationSuggestions(selectedLineId);
        setSuggestions(suggestionsData);
      } catch (error) {
        console.error("Échec de la récupération des suggestions:", error);
      } finally {
        setIsLoadingSuggestions(false);
      }
    }
    loadSuggestions();
  }, [selectedLineId]);

  // --- Handlers pour les actions du panneau de rapprochement ---

  const handleReconcileWithSuggestion = async (lineId: string, suggestionId: string) => {
    await reconcileWithSuggestion(lineId, suggestionId);
    await fetchStatementLines(); // Rafraîchit la liste pour mettre à jour le statut
    // Optionnel: désélectionner la ligne pour passer à la suivante
     setSelectedLineId(null);
  };

  const handleReconcileManually = async (lineId: string, data: ManualReconData) => {
    await reconcileManually(lineId, data.accountId, data.partnerId);
    await fetchStatementLines();
    setSelectedLineId(null);
  };

  // Trouve l'objet de la ligne sélectionnée pour le passer au panneau
  const selectedLine = useMemo(
    () => lines.find(line => line.id === selectedLineId) || null,
    [lines, selectedLineId]
  );
  
  // Affiche un squelette pendant le chargement initial de la page
  if (isLoadingPage) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <Skeleton className="h-8 w-1/4 mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-[calc(100vh-12rem)]">
          <div className="lg:col-span-3"><Skeleton className="h-full w-full" /></div>
          <div className="lg:col-span-2"><Skeleton className="h-full w-full" /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 h-full">
      <div className="mb-6">
        <Button variant="outline" onClick={() => router.push('/dashboard/banking')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour au tableau de bord
        </Button>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Rapprochement du relevé
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          {statement?.name || 'Chargement...'}
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* --- PARTIE GAUCHE : TABLEAU DES TRANSACTIONS --- */}
        <div className="lg:col-span-3">
          <StatementLinesTable
            lines={lines}
            isLoading={false} // Le chargement de la page gère déjà cet état
            selectedLineId={selectedLineId}
            onSelectLine={setSelectedLineId}
          />
        </div>

        {/* --- PARTIE DROITE : PANNEAU DE RAPPROCHEMENT --- */}
        <div className="lg:col-span-2">
          <ReconciliationPanel
            selectedLine={selectedLine}
            suggestions={suggestions}
            isLoadingSuggestions={isLoadingSuggestions}
            onReconcileWithSuggestion={handleReconcileWithSuggestion}
            onReconcileManually={handleReconcileManually}
          />
        </div>
      </div>
    </div>
  );
}