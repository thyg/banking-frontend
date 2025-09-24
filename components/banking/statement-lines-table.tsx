/**
 * @file components/banking/statement-lines-table.tsx
 * @description Affiche la table des transactions d'un relevé bancaire.
 * Gère la sélection d'une ligne pour le rapprochement et les états d'affichage.
 */

"use client";

import React from 'react';
import { BankStatementLine } from '@/types/banking';
import { cn } from '@/lib/utils'; // Utilitaire de classes standard de shadcn/ui

import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2 } from 'lucide-react';

// --- Fonctions Utilitaires ---
// NOTE: Pour un projet réel, ces fonctions devraient être dans `lib/utils.ts` pour être réutilisées.
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const formatCurrency = (amount: number, currencyCode: string = 'EUR') => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currencyCode,
  }).format(amount);
};

// --- Définition des Props ---
interface StatementLinesTableProps {
  lines: BankStatementLine[];
  isLoading: boolean;
  selectedLineId: string | null;
  onSelectLine: (lineId: string) => void;
}

export function StatementLinesTable({
  lines,
  isLoading,
  selectedLineId,
  onSelectLine
}: StatementLinesTableProps) {

  const renderTableBody = () => {
    // 1. État de chargement
    if (isLoading) {
      return Array.from({ length: 8 }).map((_, index) => (
        <TableRow key={index}>
          <TableCell><Skeleton className="h-5 w-24" /></TableCell>
          <TableCell><Skeleton className="h-5 w-full" /></TableCell>
          <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
          <TableCell><Skeleton className="h-6 w-24" /></TableCell>
        </TableRow>
      ));
    }

    // 2. État vide (après chargement)
    if (lines.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={4} className="h-48 text-center">
            <div className="flex flex-col items-center justify-center text-gray-500">
              <CheckCircle2 className="h-10 w-10 text-green-500 mb-3" />
              <h3 className="font-semibold">Tout est rapproché !</h3>
              <p className="text-sm">Toutes les transactions de ce relevé ont été traitées.</p>
            </div>
          </TableCell>
        </TableRow>
      );
    }

    // 3. État avec des données
    return lines.map((line) => (
      <TableRow
        key={line.id}
        onClick={() => onSelectLine(line.id)}
        className={cn(
          "cursor-pointer transition-colors",
          selectedLineId === line.id 
            ? "bg-blue-50 hover:bg-blue-100" 
            : "hover:bg-gray-50",
          line.isReconciled && "text-gray-400 hover:text-gray-500" // Estompe les lignes déjà rapprochées
        )}
      >
        <TableCell className="w-[120px]">{formatDate(line.date)}</TableCell>
        <TableCell>
          <p className="font-medium">{line.label}</p>
          {line.partnerName && (
            <p className="text-xs text-gray-500">{line.partnerName}</p>
          )}
        </TableCell>
        <TableCell className="text-right w-[150px]">
          <span className={cn(
            'font-semibold font-mono',
            line.amount > 0 ? 'text-green-600' : 'text-gray-800',
            line.isReconciled && 'font-normal' // Atténue le contraste pour les lignes rapprochées
          )}>
            {formatCurrency(line.amount)}
          </span>
        </TableCell>
        <TableCell className="w-[120px]">
          <Badge variant={line.isReconciled ? 'success' : 'secondary'}>
            {line.isReconciled ? 'Rapproché' : 'À traiter'}
          </Badge>
        </TableCell>
      </TableRow>
    ));
  };

  return (
    <Card className="h-full shadow-sm">
      <CardHeader>
        <CardTitle>Transactions du relevé</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Libellé</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {renderTableBody()}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// NOTE: Pour que la Badge "success" fonctionne, vous devrez peut-être l'ajouter
// à vos variantes de badge dans `components/ui/badge.tsx` si elle n'existe pas.
// Exemple de variante : success: "border-transparent bg-green-100 text-green-800 hover:bg-green-100/80"