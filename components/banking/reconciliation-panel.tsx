/**
 * @file components/banking/reconciliation-panel.tsx
 * @description Panneau de rapprochement unifié et intelligent.
 * Affiche les suggestions (transactions, chèques, factures) avec scores de confiance.
 * Permet le rapprochement manuel ou automatique.
 * 
 * @version 2.0.0 - Incrément 4 : Rapprochement Unifié
 */

"use client";

import React, { useState } from 'react';
import {
  BankStatementLine,
  ReconciliationSuggestion,
  ReconciliationTargetType,
  TransactionType,
} from '@/types/banking';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  FileCheck,
  Search,
  Banknote,
  Info,
  Loader2,
  ChevronDown,
  ChevronUp,
  ArrowDownLeft,
  ArrowUpRight,
  FileText,
  Receipt,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  Link2,
  X,
} from 'lucide-react';

// =============================================================================
// UTILITAIRES
// =============================================================================

const formatDate = (dateString: string) => 
  new Date(dateString).toLocaleDateString('fr-FR', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
  });

const formatCurrency = (amount: number, currency: string = 'EUR') => 
  new Intl.NumberFormat('fr-FR', { 
    style: 'currency', 
    currency,
    minimumFractionDigits: currency === 'XAF' || currency === 'XOF' ? 0 : 2,
  }).format(amount);

/**
 * Retourne la couleur du badge selon le score.
 */
function getScoreColor(score: number): string {
  if (score >= 90) return 'bg-green-100 text-green-700 border-green-200';
  if (score >= 70) return 'bg-blue-100 text-blue-700 border-blue-200';
  if (score >= 50) return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-gray-100 text-gray-700 border-gray-200';
}

/**
 * Retourne l'icône selon le type de cible.
 */
function getTypeIcon(type: ReconciliationTargetType) {
  switch (type) {
    case 'transaction':
      return <Receipt className="h-4 w-4" />;
    case 'check':
      return <FileText className="h-4 w-4" />;
    case 'invoice':
      return <ArrowDownLeft className="h-4 w-4 text-green-600" />;
    case 'bill':
      return <ArrowUpRight className="h-4 w-4 text-red-600" />;
    default:
      return <Banknote className="h-4 w-4" />;
  }
}

/**
 * Retourne le label selon le type de cible.
 */
function getTypeLabel(type: ReconciliationTargetType): string {
  switch (type) {
    case 'transaction':
      return 'Transaction';
    case 'check':
      return 'Chèque';
    case 'invoice':
      return 'Facture client';
    case 'bill':
      return 'Facture fournisseur';
    case 'manual':
      return 'Écriture manuelle';
    default:
      return type;
  }
}

// =============================================================================
// SOUS-COMPOSANTS
// =============================================================================

interface SuggestionCardProps {
  suggestion: ReconciliationSuggestion;
  isSubmitting: boolean;
  onReconcile: () => void;
}

function SuggestionCard({ suggestion, isSubmitting, onReconcile }: SuggestionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const matchScore = suggestion.matchScore ?? suggestion.confidenceScore ?? 0;
  const matchDetails = suggestion.matchDetails ?? {};
  const isAutoMatch = matchScore >= 90 && (matchDetails.amountScore ?? 0) === 40;
  
  return (
    <div className={`border rounded-lg p-4 transition-all ${
      isAutoMatch ? 'bg-green-50 border-green-200' : 'bg-white hover:bg-gray-50'
    }`}>
      {/* En-tête */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`p-2 rounded-lg ${
            suggestion.type === 'transaction' ? 'bg-blue-100' :
            suggestion.type === 'check' ? 'bg-purple-100' :
            suggestion.type === 'invoice' ? 'bg-green-100' :
            'bg-orange-100'
          }`}>
            {getTypeIcon(suggestion.type)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs">
                {getTypeLabel(suggestion.type)}
              </Badge>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className={`text-xs ${getScoreColor(matchScore)}`}
                    >
                      {isAutoMatch && <Sparkles className="h-3 w-3 mr-1" />}
                      {matchScore}%
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <div className="space-y-1 text-xs">
                      <p className="font-semibold">Détail du score:</p>
                      <p>Montant: {matchDetails.amountScore ?? 0}/40</p>
                      <p>Date: {matchDetails.dateScore ?? 0}/30</p>
                      <p>Libellé: {matchDetails.labelScore ?? 0}/20</p>
                      <p>Partenaire: {matchDetails.partnerScore ?? 0}/10</p>
                      {(matchDetails.reasons?.length ?? 0) > 0 && (
                        <>
                          <Separator className="my-1" />
                          <p className="font-semibold">Raisons:</p>
                          {matchDetails.reasons?.map((r: string, i: number) => (
                            <p key={i}>• {r}</p>
                          ))}
                        </>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <p className="font-semibold mt-1 truncate">{suggestion.reference}</p>
            <p className="text-sm text-gray-600 truncate">{suggestion.partnerName}</p>
          </div>
        </div>
        
        <div className="text-right flex-shrink-0">
          <p className={`font-bold text-lg ${
            suggestion.amountDifference === 0 ? 'text-green-600' : ''
          }`}>
            {formatCurrency(suggestion.amount, suggestion.currency)}
          </p>
          <p className="text-xs text-gray-500">{formatDate(suggestion.date)}</p>
          {suggestion.amountDifference !== undefined && suggestion.amountDifference !== 0 && (
            <p className="text-xs text-amber-600 flex items-center justify-end gap-1">
              <AlertTriangle className="h-3 w-3" />
              Écart: {formatCurrency(suggestion.amountDifference, suggestion.currency)}
            </p>
          )}
        </div>
      </div>
      
      {/* Barre de progression du score */}
      <div className="mt-3">
        <Progress value={suggestion.matchScore} className="h-1.5" />
      </div>
      
      {/* Détails expansibles */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full mt-2 text-xs">
            {isExpanded ? (
              <>
                <ChevronUp className="h-3 w-3 mr-1" />
                Masquer les détails
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3 mr-1" />
                Voir les détails
              </>
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 pt-2 border-t text-sm text-gray-600 space-y-1">
          {(matchDetails.reasons ?? suggestion.matchReasons ?? []).map((reason: string, index: number) => (
            <p key={index} className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              {reason}
            </p>
          ))}
        </CollapsibleContent>
      </Collapsible>
      
      {/* Bouton rapprochement */}
      <Button
        size="sm"
        className={`w-full mt-3 ${
          isAutoMatch 
            ? 'bg-green-600 hover:bg-green-700' 
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
        onClick={onReconcile}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Link2 className="mr-2 h-4 w-4" />
        )}
        {isAutoMatch ? 'Rapprocher (auto)' : 'Rapprocher'}
      </Button>
    </div>
  );
}

// =============================================================================
// COMPOSANT PRINCIPAL
// =============================================================================

interface ReconciliationPanelProps {
  selectedLine: BankStatementLine | null;
  suggestions: ReconciliationSuggestion[];
  isLoadingSuggestions: boolean;
  transactionTypes: TransactionType[];
  onReconcileWithSuggestion: (lineId: string, suggestion: ReconciliationSuggestion) => Promise<void>;
  onReconcileManually: (lineId: string, data: ManualReconciliationData) => Promise<void>;
  onClose?: () => void;
}

export interface ManualReconciliationData {
  transactionTypeId: string;
  label?: string;
  partnerName?: string;
  notes?: string;
}

export function ReconciliationPanel({
  selectedLine,
  suggestions,
  isLoadingSuggestions,
  transactionTypes,
  onReconcileWithSuggestion,
  onReconcileManually,
  onClose,
}: ReconciliationPanelProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'suggestions' | 'manual'>('suggestions');
  
  // État du formulaire manuel
  const [manualData, setManualData] = useState<ManualReconciliationData>({
    transactionTypeId: '',
    label: '',
    partnerName: '',
    notes: '',
  });

  // Wrapper pour gérer l'état de chargement
  const handleSubmit = async (action: () => Promise<void>) => {
    setIsSubmitting(true);
    try {
      await action();
    } catch (error) {
      console.error("[ReconciliationPanel] Erreur:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Pré-remplir le formulaire manuel avec les données de la ligne
  React.useEffect(() => {
    if (selectedLine) {
      setManualData({
        transactionTypeId: '',
        label: selectedLine.label || '',
        partnerName: selectedLine.partnerName || '',
        notes: '',
      });
    }
  }, [selectedLine]);

  // --- Sections de rendu ---

  const renderPlaceholder = () => (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <div className="p-4 bg-gray-100 rounded-full mb-4">
        <Info className="h-10 w-10 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-800">En attente de sélection</h3>
      <p className="text-gray-500 mt-1 max-w-xs">
        Sélectionnez une ligne du relevé pour voir les suggestions de rapprochement.
      </p>
    </div>
  );

  const renderSuggestionsSection = () => {
    if (isLoadingSuggestions) {
      return (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border rounded-lg p-4">
              <div className="flex gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="h-8 w-full mt-3" />
            </div>
          ))}
        </div>
      );
    }

    if (suggestions.length === 0) {
      return (
        <div className="text-center py-8">
          <div className="p-3 bg-amber-50 rounded-full inline-block mb-3">
            <Search className="h-6 w-6 text-amber-500" />
          </div>
          <p className="text-gray-600 font-medium">Aucune suggestion trouvée</p>
          <p className="text-sm text-gray-500 mt-1">
            Utilisez le rapprochement manuel ci-dessous.
          </p>
        </div>
      );
    }

    // Séparer les suggestions par niveau de confiance
    const getScore = (s: ReconciliationSuggestion) => s.matchScore ?? s.confidenceScore ?? 0;
    const getAmountScore = (s: ReconciliationSuggestion) => s.matchDetails?.amountScore ?? 0;
    const autoMatches = suggestions.filter(s => getScore(s) >= 90 && getAmountScore(s) === 40);
    const goodMatches = suggestions.filter(s => getScore(s) >= 70 && !autoMatches.includes(s));
    const otherMatches = suggestions.filter(s => getScore(s) < 70);

    return (
      <div className="space-y-4">
        {/* Auto-matches (score >= 90 et montant exact) */}
        {autoMatches.length > 0 && (
          <div>
            <p className="text-sm font-medium text-green-700 mb-2 flex items-center gap-1">
              <Sparkles className="h-4 w-4" />
              Correspondances exactes ({autoMatches.length})
            </p>
            <div className="space-y-3">
              {autoMatches.map((suggestion) => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  isSubmitting={isSubmitting}
                  onReconcile={() => handleSubmit(() => 
                    onReconcileWithSuggestion(selectedLine!.id, suggestion)
                  )}
                />
              ))}
            </div>
          </div>
        )}

        {/* Bonnes correspondances (score >= 70) */}
        {goodMatches.length > 0 && (
          <div>
            <p className="text-sm font-medium text-blue-700 mb-2">
              Bonnes correspondances ({goodMatches.length})
            </p>
            <div className="space-y-3">
              {goodMatches.map((suggestion) => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  isSubmitting={isSubmitting}
                  onReconcile={() => handleSubmit(() => 
                    onReconcileWithSuggestion(selectedLine!.id, suggestion)
                  )}
                />
              ))}
            </div>
          </div>
        )}

        {/* Autres suggestions */}
        {otherMatches.length > 0 && (
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full text-gray-500">
                <ChevronDown className="h-4 w-4 mr-1" />
                Autres suggestions ({otherMatches.length})
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 mt-2">
              {otherMatches.map((suggestion) => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  isSubmitting={isSubmitting}
                  onReconcile={() => handleSubmit(() => 
                    onReconcileWithSuggestion(selectedLine!.id, suggestion)
                  )}
                />
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    );
  };

  const renderManualSection = () => {
    const activeTypes = transactionTypes.filter(t => t.isActive);
    
    return (
      <div className="space-y-4">
        <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
          <Info className="h-4 w-4 inline mr-1" />
          Cette action créera une transaction et la rapprochera automatiquement.
        </div>
        
        <div className="space-y-3">
          <div>
            <Label htmlFor="transactionType">Type de transaction *</Label>
            <Select
              value={manualData.transactionTypeId}
              onValueChange={(value) => setManualData({ ...manualData, transactionTypeId: value })}
            >
              <SelectTrigger id="transactionType" className="mt-1">
                <SelectValue placeholder="Sélectionnez un type..." />
              </SelectTrigger>
              <SelectContent>
                {activeTypes.map(type => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.label} ({type.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="label">Libellé</Label>
            <Input
              id="label"
              value={manualData.label}
              onChange={(e) => setManualData({ ...manualData, label: e.target.value })}
              placeholder="Libellé de la transaction"
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="partnerName">Partenaire</Label>
            <Input
              id="partnerName"
              value={manualData.partnerName}
              onChange={(e) => setManualData({ ...manualData, partnerName: e.target.value })}
              placeholder="Client ou fournisseur"
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              value={manualData.notes}
              onChange={(e) => setManualData({ ...manualData, notes: e.target.value })}
              placeholder="Notes optionnelles"
              className="mt-1"
            />
          </div>
        </div>
        
        <Button
          className="w-full"
          onClick={() => handleSubmit(() => 
            onReconcileManually(selectedLine!.id, manualData)
          )}
          disabled={isSubmitting || !manualData.transactionTypeId}
        >
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Banknote className="mr-2 h-4 w-4" />
          )}
          Créer et rapprocher
        </Button>
      </div>
    );
  };

  // --- Rendu principal ---

  return (
    <Card className="h-full shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Rapprochement</CardTitle>
            <CardDescription>
              {selectedLine
                ? `${formatDate(selectedLine.date ?? selectedLine.transactionDate)} • ${formatCurrency(selectedLine.amount, selectedLine.currency ?? 'XAF')}`
                : 'Aucune ligne sélectionnée'
              }
            </CardDescription>
          </div>
          {onClose && selectedLine && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        {/* Info ligne sélectionnée */}
        {selectedLine && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <p className="font-medium text-sm truncate">{selectedLine.label}</p>
            {selectedLine.partnerName && (
              <p className="text-xs text-gray-500">{selectedLine.partnerName}</p>
            )}
            <div className="flex items-center justify-between mt-2">
              <Badge variant={selectedLine.direction === 'CREDIT' ? 'default' : 'destructive'}>
                {selectedLine.direction === 'CREDIT' ? (
                  <ArrowDownLeft className="h-3 w-3 mr-1" />
                ) : (
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                )}
                {selectedLine.direction === 'CREDIT' ? 'Crédit' : 'Débit'}
              </Badge>
              <span className={`font-bold ${
                selectedLine.amount >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(selectedLine.amount, selectedLine.currency)}
              </span>
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        {!selectedLine ? (
          renderPlaceholder()
        ) : (
          <div className="space-y-4">
            {/* Onglets */}
            <div className="flex border-b">
              <button
                onClick={() => setActiveTab('suggestions')}
                className={`flex-1 pb-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'suggestions'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Suggestions
                {suggestions.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {suggestions.length}
                  </Badge>
                )}
              </button>
              <button
                onClick={() => setActiveTab('manual')}
                className={`flex-1 pb-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'manual'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Manuel
              </button>
            </div>
            
            {/* Contenu */}
            <div className="min-h-[300px]">
              {activeTab === 'suggestions' ? renderSuggestionsSection() : renderManualSection()}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}