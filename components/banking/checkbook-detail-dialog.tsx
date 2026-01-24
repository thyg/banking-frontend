/**
 * @file components/banking/checkbook-detail-dialog.tsx
 * @description Dialogue affichant les détails complets d'un chéquier.
 * @version 2.1.0 - Refonte UI pour plus de clarté, suppression des redondances et correction de l'affichage des stats.
 */

"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

// Types et API
import { Checkbook } from '@/types/banking';
import { getCheckbookStats, CheckbookStats } from '@/lib/api/checkbook';

// Composants UI
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';

// Icônes
import { Building2, Hash, TrendingUp, Calendar, ExternalLink, BookOpen, ClipboardList, Shield, Infinity as InfinityIcon } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface CheckbookDetailDialogProps {
  checkbook: Checkbook | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency?: string;
}

const formatCurrency = (amount: number, currency: string = 'XAF'): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency, minimumFractionDigits: currency === 'XAF' || currency === 'XOF' ? 0 : 2,
  }).format(amount);
};

const formatDate = (dateString?: string): string => {
  if (!dateString) return 'N/A';
  try { return format(new Date(dateString), 'dd MMMM yyyy à HH:mm', { locale: fr }); }
  catch { return dateString; }
};

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'ACTIVE': return 'success';
    case 'FINISHED': return 'secondary';
    case 'CANCELLED': return 'destructive';
    default: return 'outline';
  }
};

export function CheckbookDetailDialog({ checkbook, open, onOpenChange, currency = 'XAF' }: CheckbookDetailDialogProps) {
  const [stats, setStats] = useState<CheckbookStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  useEffect(() => {
    if (open && checkbook && !checkbook.isSystem) {
      const fetchStats = async () => {
        setIsLoadingStats(true);
        try {
          const data = await getCheckbookStats(checkbook.id);
          setStats(data);
        } catch (error) {
          console.error("Erreur chargement stats chéquier:", error);
          setStats(null);
        } finally {
          setIsLoadingStats(false);
        }
      };
      fetchStats();
    }
  }, [open, checkbook]);

  if (!checkbook) return null;

  const {
    prefix, bankAccountName, iban, startNumber, endNumber, currentNumber,
    numberOfPages, status, type, createdAt, updatedAt, isSystem, nextSequence
  } = checkbook;

  // Calculs fiables pour l'utilisation PHYSIQUE du carnet
  const totalChecks = isSystem ? Infinity : (numberOfPages || (endNumber && startNumber ? endNumber - startNumber + 1 : 0));
  const usedChecksFromNumbers = isSystem ? stats?.usedChecksCount || 0 : Math.max(0, (currentNumber || startNumber || 0) - (startNumber || 0));
  const progress = totalChecks > 0 && totalChecks !== Infinity ? (usedChecksFromNumbers / totalChecks) * 100 : 0;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Badge variant={type === 'REEL' ? 'default' : 'secondary'}>{type}</Badge>
            <Badge variant={getStatusBadgeVariant(status)}>{status}</Badge>
            {isSystem && <Badge variant="outline" className="border-purple-300 text-purple-700"><Shield className="h-3 w-3 mr-1" />SYSTÈME</Badge>}
          </div>
          <DialogTitle className="text-xl mt-2 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-gray-500" />
            <span>{isSystem ? 'Chéquier Système' : `Chéquier ${prefix}`}</span>
          </DialogTitle>
          <DialogDescription>
            {isSystem ? 'Gestion des chèques reçus.' : `Associé au compte ${bankAccountName || 'inconnu'}.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto pr-2">
          
          {/* Section Informations Générales */}
          <div className="space-y-3">
            <div className="flex items-start gap-3"><Building2 className="h-4 w-4 text-gray-400 mt-1 shrink-0" /><div className="text-sm"><p className="text-gray-500">Compte bancaire</p><p className="font-medium">{bankAccountName || (isSystem ? <span className="italic text-gray-400">Non applicable</span> : 'N/A')}</p></div></div>
            <div className="flex items-start gap-3"><ClipboardList className="h-4 w-4 text-gray-400 mt-1 shrink-0" /><div className="text-sm"><p className="text-gray-500">IBAN</p><p className="font-mono text-xs">{iban || (isSystem ? <span className="italic text-gray-400">Non applicable</span> : 'N/A')}</p></div></div>
          </div>
          <Separator />

          {/* Section Utilisation du carnet */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-800 flex items-center gap-2"><Hash className="h-4 w-4" />Utilisation du carnet</h4>
            {isSystem ? (
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><p className="text-gray-500">Chèques disponibles</p><p className="font-medium flex items-center gap-1 text-purple-600"><InfinityIcon className="h-4 w-4" />Illimité</p></div>
                </div>
            ) : (
                <>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                            <span className="font-medium">{usedChecksFromNumbers} / {totalChecks} chèques utilisés</span>
                            <span className="font-bold">{progress.toFixed(0)}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div><p className="text-gray-500">Plage de numéros</p><p className="font-mono">{startNumber} - {endNumber}</p></div>
                        <div><p className="text-gray-500">Prochain N°</p><p className="font-mono font-bold">{currentNumber}</p></div>
                    </div>
                </>
            )}
          </div>
          <Separator />
          
          {/* Section Statistiques Financières */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-800 flex items-center gap-2"><TrendingUp className="h-4 w-4" />Statistiques financières</h4>
            {isLoadingStats ? (
              <div className="grid grid-cols-2 gap-4"><Skeleton className="h-16" /><Skeleton className="h-16" /></div>
            ) : stats ? (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-gray-50 rounded-lg"><p className="text-gray-500">Chèques enregistrés</p><p className="font-bold text-lg">{stats.usedChecksCount}</p></div>
                <div className="p-3 bg-gray-50 rounded-lg"><p className="text-gray-500">Montant total émis</p><p className="font-bold text-base">{formatCurrency(stats.totalAmountIssued, currency)}</p></div>
                <div className="p-3 bg-gray-50 rounded-lg"><p className="text-gray-500">Montant total encaissé</p><p className="font-bold text-base">{formatCurrency(stats.totalAmountCashed, currency)}</p></div>
              </div>
            ) : (
              <p className="text-sm text-red-500 p-3 bg-red-50 rounded-lg">Impossible de charger les statistiques.</p>
            )}
          </div>
          <Separator />
          
          {/* Section Historique */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-800 flex items-center gap-2"><Calendar className="h-4 w-4" />Historique</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-gray-500">Créé le</p><p className="font-medium">{formatDate(createdAt)}</p></div>
              <div><p className="text-gray-500">Modifié le</p><p className="font-medium">{formatDate(updatedAt)}</p></div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
          <Link href={`/banking/checks?checkbookId=${checkbook.id}`} passHref>
            <Button onClick={() => onOpenChange(false)}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Voir les chèques
            </Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}