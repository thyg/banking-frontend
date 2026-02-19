/**
 * @file app/(dashboard)/banking/check-deposits/page.tsx
 * @description Page de gestion des remises de cheques en lot.
 * Affiche la liste des remises existantes et permet de gerer le workflow complet:
 * PENDING -> DEPOSITED -> CASHED
 *
 * @version 2.0.0
 * @author RT-ComOps Team
 * @since 2026-02-16
 */
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  PlusCircle,
  FileStack,
  Eye,
  CheckCircle,
  Clock,
  BanknoteIcon,
  Printer,
  Trash2,
  Building,
  MoreHorizontal,
  ExternalLink,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Types
import { CheckDeposit, CheckDepositStatus } from '@/types/banking';

// Composants UI
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from "@/components/ui/use-toast";
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Composants
import { CheckDepositForm } from '@/components/banking/check-deposit-form';
import { CheckDepositDetailDialog } from '@/components/banking/check-deposit-detail-dialog';

// API
import {
  getCheckDeposits,
  getCheckDepositById,
  confirmCheckDeposit,
  cashCheckDeposit,
  cancelCheckDeposit,
} from '@/lib/api/check-deposit';

// PDF Generator
import { generateDepositSlipPDF } from '@/lib/utils/deposit-slip-pdf';

/**
 * Formate un montant en devise.
 */
function formatCurrency(amount: number, currency: string = 'XAF'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Retourne le badge de statut approprie avec couleur.
 */
function StatusBadge({ status }: { status: CheckDepositStatus }) {
  switch (status) {
    case 'PENDING':
      return (
        <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
          <Clock className="mr-1 h-3 w-3" />
          En attente
        </Badge>
      );
    case 'DEPOSITED':
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
          <Building className="mr-1 h-3 w-3" />
          Deposee
        </Badge>
      );
    case 'CASHED':
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <BanknoteIcon className="mr-1 h-3 w-3" />
          Encaissee
        </Badge>
      );
    case 'RECONCILED':
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          <CheckCircle className="mr-1 h-3 w-3" />
          Rapprochee
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export default function CheckDepositsPage() {
  const [deposits, setDeposits] = useState<CheckDeposit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Etat pour le popup de details
  const [selectedDeposit, setSelectedDeposit] = useState<CheckDeposit | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Etat pour la modale de confirmation de depot
  const [isConfirmDepositOpen, setIsConfirmDepositOpen] = useState(false);
  const [confirmDepositDate, setConfirmDepositDate] = useState('');
  const [depositToConfirm, setDepositToConfirm] = useState<CheckDeposit | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  // Etat pour la modale d'encaissement
  const [isCashDepositOpen, setIsCashDepositOpen] = useState(false);
  const [cashDate, setCashDate] = useState('');
  const [depositToCash, setDepositToCash] = useState<CheckDeposit | null>(null);
  const [isCashing, setIsCashing] = useState(false);

  // Etat pour la confirmation d'annulation
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [depositToCancel, setDepositToCancel] = useState<CheckDeposit | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const { toast } = useToast();

  const fetchDeposits = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getCheckDeposits();
      setDeposits(data);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les remises de cheques.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDeposits();
  }, [fetchDeposits]);

  const handleDepositCreated = () => {
    toast({ title: "Succes", description: "Nouvelle remise de cheques creee (en attente de depot)." });
    fetchDeposits();
    setIsFormOpen(false);
  };

  /**
   * Ouvre le popup de details de la remise.
   */
  const handleView = async (deposit: CheckDeposit) => {
    setIsLoadingDetail(true);
    setIsDetailOpen(true);

    try {
      const fullDeposit = await getCheckDepositById(deposit.id);
      setSelectedDeposit(fullDeposit);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les details de la remise.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingDetail(false);
    }
  };

  /**
   * Ouvre la modale pour confirmer le depot en banque.
   */
  const handleOpenConfirmDeposit = (deposit: CheckDeposit) => {
    setDepositToConfirm(deposit);
    setConfirmDepositDate(deposit.depositDate || format(new Date(), 'yyyy-MM-dd'));
    setIsConfirmDepositOpen(true);
  };

  /**
   * Confirme le depot en banque.
   */
  const handleConfirmDeposit = async () => {
    if (!depositToConfirm || !confirmDepositDate) return;

    setIsConfirming(true);
    try {
      await confirmCheckDeposit(depositToConfirm.id, confirmDepositDate);
      toast({
        title: "Succes",
        description: `Remise ${depositToConfirm.reference} confirmee comme deposee en banque.`,
      });
      setIsConfirmDepositOpen(false);
      setDepositToConfirm(null);
      fetchDeposits();
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur lors de la confirmation du depot.",
        variant: "destructive",
      });
    } finally {
      setIsConfirming(false);
    }
  };

  /**
   * Ouvre la modale pour encaisser la remise.
   */
  const handleOpenCashDeposit = (deposit: CheckDeposit) => {
    setDepositToCash(deposit);
    setCashDate(format(new Date(), 'yyyy-MM-dd'));
    setIsCashDepositOpen(true);
  };

  /**
   * Encaisse la remise.
   */
  const handleCashDeposit = async () => {
    if (!depositToCash || !cashDate) return;

    setIsCashing(true);
    try {
      await cashCheckDeposit(depositToCash.id, cashDate);
      toast({
        title: "Succes",
        description: `Remise ${depositToCash.reference} encaissee. Transaction bancaire creee.`,
      });
      setIsCashDepositOpen(false);
      setDepositToCash(null);
      fetchDeposits();
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur lors de l'encaissement.",
        variant: "destructive",
      });
    } finally {
      setIsCashing(false);
    }
  };

  /**
   * Ouvre la confirmation d'annulation.
   */
  const handleOpenCancel = (deposit: CheckDeposit) => {
    setDepositToCancel(deposit);
    setIsCancelOpen(true);
  };

  /**
   * Annule la remise.
   */
  const handleCancelDeposit = async () => {
    if (!depositToCancel) return;

    setIsCancelling(true);
    try {
      await cancelCheckDeposit(depositToCancel.id);
      toast({
        title: "Succes",
        description: `Remise ${depositToCancel.reference} annulee. Les cheques sont de nouveau disponibles.`,
      });
      setIsCancelOpen(false);
      setDepositToCancel(null);
      fetchDeposits();
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur lors de l'annulation.",
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
    }
  };

  /**
   * Imprime le bordereau de remise.
   */
  const handlePrintSlip = async (deposit: CheckDeposit) => {
    try {
      // Recuperer les details complets avec les cheques
      const fullDeposit = await getCheckDepositById(deposit.id);
      if (fullDeposit) {
        generateDepositSlipPDF(fullDeposit, fullDeposit.checks || []);
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de generer le bordereau de remise.",
        variant: "destructive",
      });
    }
  };

  /**
   * Retourne les actions disponibles selon le statut de la remise.
   */
  const getDepositActions = (deposit: CheckDeposit) => {
    const actions: React.ReactNode[] = [];

    // Action commune: Voir les details
    actions.push(
      <DropdownMenuItem key="view" onClick={() => handleView(deposit)}>
        <Eye className="mr-2 h-4 w-4" />
        Voir les details
      </DropdownMenuItem>
    );

    switch (deposit.status) {
      case 'PENDING':
        actions.push(
          <DropdownMenuSeparator key="sep1" />,
          <DropdownMenuItem key="confirm" onClick={() => handleOpenConfirmDeposit(deposit)}>
            <Building className="mr-2 h-4 w-4" />
            Confirmer le depot
          </DropdownMenuItem>,
          <DropdownMenuItem key="print" onClick={() => handlePrintSlip(deposit)}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimer bordereau
          </DropdownMenuItem>,
          <DropdownMenuSeparator key="sep2" />,
          <DropdownMenuItem
            key="cancel"
            className="text-red-600"
            onClick={() => handleOpenCancel(deposit)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Annuler
          </DropdownMenuItem>
        );
        break;

      case 'DEPOSITED':
        actions.push(
          <DropdownMenuSeparator key="sep1" />,
          <DropdownMenuItem key="cash" onClick={() => handleOpenCashDeposit(deposit)}>
            <BanknoteIcon className="mr-2 h-4 w-4" />
            Marquer comme encaissee
          </DropdownMenuItem>,
          <DropdownMenuItem key="print" onClick={() => handlePrintSlip(deposit)}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimer bordereau
          </DropdownMenuItem>
        );
        break;

      case 'CASHED':
        actions.push(
          <DropdownMenuSeparator key="sep1" />,
          <DropdownMenuItem key="print" onClick={() => handlePrintSlip(deposit)}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimer bordereau
          </DropdownMenuItem>
        );
        if (deposit.bankTransactionId) {
          actions.push(
            <DropdownMenuItem key="transaction" asChild>
              <a href={`/banking/transactions?id=${deposit.bankTransactionId}`}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Voir la transaction
              </a>
            </DropdownMenuItem>
          );
        }
        break;

      case 'RECONCILED':
        actions.push(
          <DropdownMenuSeparator key="sep1" />,
          <DropdownMenuItem key="print" onClick={() => handlePrintSlip(deposit)}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimer bordereau
          </DropdownMenuItem>
        );
        break;
    }

    return actions;
  };

  // Calculs pour les statistiques
  const totalDeposits = deposits.length;
  const pendingCount = deposits.filter(d => d.status === 'PENDING').length;
  const depositedCount = deposits.filter(d => d.status === 'DEPOSITED').length;
  const cashedCount = deposits.filter(d => d.status === 'CASHED').length;
  const totalAmount = deposits.reduce((sum, d) => sum + d.totalAmount, 0);
  const pendingAmount = deposits
    .filter(d => d.status === 'PENDING' || d.status === 'DEPOSITED')
    .reduce((sum, d) => sum + d.totalAmount, 0);

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold flex items-center">
            <FileStack className="mr-4 h-8 w-8" />
            Remises de Cheques
          </h1>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nouvelle Remise
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Creer une remise de cheques</DialogTitle>
                <DialogDescription>
                  Selectionnez les cheques recus a regrouper dans cette remise.
                </DialogDescription>
              </DialogHeader>
              <CheckDepositForm
                onSuccess={handleDepositCreated}
                onCancel={() => setIsFormOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Statistiques */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total remises</CardTitle>
              <FileStack className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalDeposits}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En attente</CardTitle>
              <Clock className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingCount}</div>
              <p className="text-xs text-muted-foreground">A deposer</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Deposees</CardTitle>
              <Building className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{depositedCount}</div>
              <p className="text-xs text-muted-foreground">A encaisser</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Encaissees</CardTitle>
              <BanknoteIcon className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{cashedCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Montant en cours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(pendingAmount)}</div>
              <p className="text-xs text-muted-foreground">Non encore encaisse</p>
            </CardContent>
          </Card>
        </div>

        {/* Liste des remises */}
        <Card>
          <CardHeader>
            <CardTitle>Liste des remises</CardTitle>
            <CardDescription>
              Workflow: En attente &rarr; Deposee &rarr; Encaissee
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : deposits.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Aucune remise de cheques.
                <br />
                Cliquez sur "Nouvelle Remise" pour creer votre premiere remise.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Date depot</TableHead>
                    <TableHead>Compte</TableHead>
                    <TableHead className="text-center">Cheques</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deposits.map((deposit) => (
                    <TableRow key={deposit.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-medium">
                        {deposit.reference}
                      </TableCell>
                      <TableCell>
                        {deposit.depositDate
                          ? format(new Date(deposit.depositDate), 'dd MMM yyyy', { locale: fr })
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {deposit.bankAccountName || 'Compte inconnu'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{deposit.checkCount}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(deposit.totalAmount, deposit.currency)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={deposit.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {getDepositActions(deposit)}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Popup de details de la remise */}
      <CheckDepositDetailDialog
        deposit={selectedDeposit}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        isLoading={isLoadingDetail}
      />

      {/* Modale de confirmation de depot */}
      <Dialog open={isConfirmDepositOpen} onOpenChange={setIsConfirmDepositOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer le depot en banque</DialogTitle>
            <DialogDescription>
              Confirmez que la remise {depositToConfirm?.reference} a ete physiquement deposee en banque.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="depositDate">Date du depot</Label>
              <Input
                id="depositDate"
                type="date"
                value={confirmDepositDate}
                onChange={(e) => setConfirmDepositDate(e.target.value)}
              />
            </div>
            {depositToConfirm && (
              <div className="rounded-lg bg-muted p-4 text-sm">
                <p><strong>Reference:</strong> {depositToConfirm.reference}</p>
                <p><strong>Montant:</strong> {formatCurrency(depositToConfirm.totalAmount, depositToConfirm.currency)}</p>
                <p><strong>Cheques:</strong> {depositToConfirm.checkCount}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmDepositOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleConfirmDeposit} disabled={isConfirming || !confirmDepositDate}>
              {isConfirming ? 'Confirmation...' : 'Confirmer le depot'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modale d'encaissement */}
      <Dialog open={isCashDepositOpen} onOpenChange={setIsCashDepositOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marquer comme encaissee</DialogTitle>
            <DialogDescription>
              Confirmez que les fonds de la remise {depositToCash?.reference} ont ete recus sur le compte.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cashDate">Date d'encaissement</Label>
              <Input
                id="cashDate"
                type="date"
                value={cashDate}
                onChange={(e) => setCashDate(e.target.value)}
              />
            </div>
            {depositToCash && (
              <div className="rounded-lg bg-muted p-4 text-sm">
                <p><strong>Reference:</strong> {depositToCash.reference}</p>
                <p><strong>Montant:</strong> {formatCurrency(depositToCash.totalAmount, depositToCash.currency)}</p>
                <p><strong>Cheques:</strong> {depositToCash.checkCount}</p>
                <p className="mt-2 text-muted-foreground">
                  Une transaction bancaire sera creee automatiquement pour ce montant.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCashDepositOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleCashDeposit} disabled={isCashing || !cashDate}>
              {isCashing ? 'Encaissement...' : 'Marquer comme encaissee'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation d'annulation */}
      <AlertDialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler la remise ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action va annuler la remise {depositToCancel?.reference} et liberer les{' '}
              {depositToCancel?.checkCount} cheques associes. Ils redeviendront disponibles pour
              une nouvelle remise.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelDeposit}
              disabled={isCancelling}
              className="bg-red-600 hover:bg-red-700"
            >
              {isCancelling ? 'Annulation...' : 'Confirmer l\'annulation'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
