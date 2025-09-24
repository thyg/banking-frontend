/**
 * @file components/banking/reconciliation-panel.tsx
 * @description Le panneau "intelligent" pour le rapprochement. Affiche les suggestions
 * et les options de saisie manuelle pour la ligne de transaction sélectionnée.
 */

"use client";

import React, { useState } from 'react';
import { BankStatementLine, ReconciliationSuggestion } from '@/types/banking';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { FileCheck, Search, Banknote, User, Book, Loader2, Info } from 'lucide-react';

// --- Fonctions Utilitaires ---
const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
const formatCurrency = (amount: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);

// --- Définition des Types & Props ---
// Type pour les données du formulaire manuel
type ManualReconData = {
  partnerId?: string;
  accountId: string;
};

interface ReconciliationPanelProps {
  selectedLine: BankStatementLine | null;
  suggestions: ReconciliationSuggestion[];
  isLoadingSuggestions: boolean;
  onReconcileWithSuggestion: (lineId: string, suggestionId: string) => Promise<void>;
  onReconcileManually: (lineId: string, data: ManualReconData) => Promise<void>;
}

export function ReconciliationPanel({
  selectedLine,
  suggestions,
  isLoadingSuggestions,
  onReconcileWithSuggestion,
  onReconcileManually
}: ReconciliationPanelProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Wrapper pour la soumission afin de gérer l'état de chargement
  const handleSubmit = async (action: () => Promise<void>) => {
    setIsSubmitting(true);
    try {
      await action();
    } catch (error) {
      console.error("Échec du rapprochement:", error);
      // Idéalement, afficher un toast d'erreur ici
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Sous-composants de rendu pour la clarté ---

  const renderPlaceholder = () => (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <Info className="h-12 w-12 text-gray-400 mb-4" />
      <h3 className="text-lg font-semibold text-gray-800">En attente de sélection</h3>
      <p className="text-gray-500 mt-1 max-w-xs">
        Sélectionnez une transaction dans le tableau de gauche pour commencer le rapprochement.
      </p>
    </div>
  );

  const renderSuggestionsSection = () => {
    if (isLoadingSuggestions) {
      return (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      );
    }
    if (suggestions.length === 0) {
      return <p className="text-sm text-gray-500 text-center py-4">Aucune suggestion automatique trouvée.</p>;
    }
    return (
      <div className="space-y-3">
        {suggestions.map((suggestion) => (
          <div key={suggestion.id} className="border rounded-lg p-3 bg-gray-50">
            <div className="flex justify-between items-start">
              <div>
                <Badge variant="outline">{suggestion.type === 'invoice' ? 'Facture' : 'Fact. Fournisseur'}</Badge>
                <p className="font-semibold mt-1">{suggestion.reference}</p>
                <p className="text-sm text-gray-600">{suggestion.partnerName}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-lg">{formatCurrency(suggestion.amountDue)}</p>
                <p className="text-xs text-gray-500">{formatDate(suggestion.date)}</p>
              </div>
            </div>
            <Button
              size="sm"
              className="w-full mt-3 bg-green-600 hover:bg-green-700"
              onClick={() => handleSubmit(() => onReconcileWithSuggestion(selectedLine!.id, suggestion.id))}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileCheck className="mr-2 h-4 w-4" />}
              Rapprocher
            </Button>
          </div>
        ))}
      </div>
    );
  };

  const renderManualReconciliationSection = () => (
    <div className="space-y-4">
      {/* NOTE: Ces champs seraient remplacés par des composants de recherche avancés (Combobox) */}
      <div className="space-y-1">
        <label className="text-sm font-medium">Partenaire (Client/Fournisseur)</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Rechercher un partenaire..." className="pl-9" />
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">Compte comptable</label>
        <div className="relative">
          <Book className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Ex: 627 - Services bancaires" className="pl-9" />
        </div>
      </div>
      <Button 
        className="w-full" 
        variant="secondary"
        onClick={() => handleSubmit(() => onReconcileManually(selectedLine!.id, { accountId: 'mock_account_id' }))} // Données à remplacer par l'état du form
        disabled={isSubmitting}
      >
        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Banknote className="mr-2 h-4 w-4" />}
        Valider l'écriture
      </Button>
    </div>
  );

  return (
    <Card className="h-full shadow-sm sticky top-24"> {/* sticky pour qu'il reste visible au scroll */}
      <CardHeader>
        <CardTitle>Rapprochement</CardTitle>
        <CardDescription>
          {selectedLine ? `Transaction du ${formatDate(selectedLine.date)}` : 'Aucune transaction sélectionnée'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!selectedLine ? (
          renderPlaceholder()
        ) : (
          <div className="space-y-6">
            <div>
              <h4 className="font-semibold text-gray-800 mb-3">Suggestions automatiques</h4>
              {renderSuggestionsSection()}
            </div>
            <Separator />
            <div>
              <h4 className="font-semibold text-gray-800 mb-3">Saisie manuelle</h4>
              {renderManualReconciliationSection()}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}