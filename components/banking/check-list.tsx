/**
 * @file components/banking/check-list.tsx
 * @description Composant de présentation pour afficher la liste des chèques.
 * Gère les états de chargement, vide et données avec actions par statut.
 * 
 * @version 1.0.0 - Incrément 3
 */

"use client";

import React, { useState } from 'react';
import { Check, CheckFilters, CheckType, CheckStatus } from '@/types/banking';

// Composants UI
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  RefreshCw,
  MoreHorizontal,
  Pencil,
  FileText,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  Banknote,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Building2,
  BookOpen,
  Send,
  Trash2,
  Printer,
  Download,
  Eye,
  ExternalLink,
  Ban,
  type LucideIcon,
} from 'lucide-react';

// =============================================================================
// UTILITAIRES
// =============================================================================

const formatCurrency = (amount: number, currency: string = 'EUR'): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: currency === 'XAF' || currency === 'XOF' ? 0 : 2,
  }).format(amount);
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

// =============================================================================
// ACTIONS DYNAMIQUES SELON ÉTAT
// =============================================================================

interface CheckAction {
  id: string;
  label: string;
  icon: LucideIcon;
  variant?: 'default' | 'destructive' | 'warning';
  separator?: boolean;
}
/**
 * Retourne les actions disponibles selon le type et le statut du chèque,
 * en suivant le workflow métier optimal.
 */
function getAvailableActions(check: Check): CheckAction[] {
  const actions: CheckAction[] = [];

  // Actions communes de consultation
  const viewDetailsAction = { id: 'view_details', label: 'Voir Détails', icon: Eye };
  const viewTransactionAction = { id: 'view_transaction', label: 'Voir la Transaction', icon: ExternalLink };

  if (check.checkType === 'ISSUED') {
    // --- WORKFLOW CHÈQUE ÉMIS ---
    switch (check.status) {
      case 'PENDING':
        actions.push(
          { id: 'emit', label: 'Émettre (remettre)', icon: Send },
          { id: 'edit', label: 'Modifier', icon: Pencil },
          { id: 'print', label: 'Imprimer', icon: Printer },
          { id: 'cancel', label: 'Annuler', icon: XCircle, variant: 'warning', separator: true },
          { id: 'delete', label: 'Supprimer', icon: Trash2, variant: 'destructive' }
        );
        break;
      case 'ISSUED':
        actions.push(
          { id: 'mark_paid', label: 'Marquer comme Payé', icon: CheckCircle },
          { id: 'print', label: 'Imprimer', icon: Printer },
          { id: 'cancel', label: 'Annuler', icon: XCircle, variant: 'warning', separator: true }
        );
        break;
      case 'CASHED':
        if (check.bankTransactionId) actions.push(viewTransactionAction);
        actions.push({ id: 'print', label: 'Imprimer', icon: Printer });
        actions.push(viewDetailsAction);
        break;
      default: // Pour CANCELLED, REJECTED
        actions.push({ id: 'print', label: 'Imprimer', icon: Printer });
        actions.push(viewDetailsAction);
        break;
    }
  } else {
    // --- WORKFLOW CHÈQUE REÇU ---
    switch (check.status) {
      case 'PENDING':
        actions.push(
          { id: 'mark_received', label: 'Marquer comme Reçu', icon: Download },
          { id: 'edit', label: 'Modifier', icon: Pencil },
          { id: 'print', label: 'Imprimer', icon: Printer },
          { id: 'cancel', label: 'Annuler', icon: XCircle, variant: 'warning', separator: true },
          { id: 'delete', label: 'Supprimer', icon: Trash2, variant: 'destructive' }
        );
        break;
      case 'RECEIVED':
        actions.push(
          { id: 'deposit', label: 'Déposer en banque', icon: Building2 },
          { id: 'print', label: 'Imprimer', icon: Printer },
          { id: 'cancel', label: 'Annuler', icon: XCircle, variant: 'warning', separator: true }
        );
        break;
      case 'DEPOSITED':
        actions.push(
          { id: 'mark_processing', label: 'Marquer En Cours', icon: Clock },
          { id: 'cash', label: 'Encaisser', icon: Banknote },
          { id: 'print', label: 'Imprimer', icon: Printer },
          { id: 'reject', label: 'Rejeter', icon: Ban, variant: 'destructive', separator: true }
        );
        break;
      case 'IN_PROGRESS': // Statut intermédiaire, mêmes actions que DEPOSITED
        actions.push(
          { id: 'cash', label: 'Encaisser', icon: Banknote },
          { id: 'print', label: 'Imprimer', icon: Printer },
          { id: 'reject', label: 'Rejeter', icon: Ban, variant: 'destructive', separator: true }
        );
        break;
      case 'CASHED':
        if (check.bankTransactionId) actions.push(viewTransactionAction);
        actions.push({ id: 'print', label: 'Imprimer', icon: Printer });
        actions.push(viewDetailsAction);
        break;
      default: // Pour CANCELLED, REJECTED
        actions.push({ id: 'print', label: 'Imprimer', icon: Printer });
        actions.push(viewDetailsAction);
        break;
    }
  }

  return actions;
}

// =============================================================================
// SOUS-COMPOSANTS
// =============================================================================

function TypeBadge({ checkType }: { checkType: CheckType }) {
  if (checkType === 'RECEIVED') {
    return (
      <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
        <ArrowDownLeft className="h-3 w-3 mr-1" />
        Reçu
      </Badge>
    );
  }
  return (
    <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
      <ArrowUpRight className="h-3 w-3 mr-1" />
      Émis
    </Badge>
  );
}

function StatusBadge({ status }: { status: CheckStatus }) {
  const configs: Record<CheckStatus, { icon: React.ReactNode; label: string; className: string }> = {
    PENDING: {
      icon: <Clock className="h-3 w-3 mr-1" />,
      label: 'En attente',
      className: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    // --- NOUVEAU ---
    ISSUED: {
      icon: <Send className="h-3 w-3 mr-1" />,
      label: 'Émis',
      className: 'bg-purple-50 text-purple-700 border-purple-200',
    },
    // --- NOUVEAU ---
    RECEIVED: {
      icon: <Download className="h-3 w-3 mr-1" />,
      label: 'Reçu',
      className: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    },
    DEPOSITED: {
      icon: <Building2 className="h-3 w-3 mr-1" />,
      label: 'Remis',
      className: 'bg-blue-50 text-blue-700 border-blue-200',
    },
      IN_PROGRESS: {
      icon: <RefreshCw className="h-3 w-3 mr-1 animate-spin" />,
      label: 'En cours',
      className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    },
    CASHED: {
      icon: <CheckCircle className="h-3 w-3 mr-1" />,
      label: 'Encaissé',
      className: 'bg-green-50 text-green-700 border-green-200',
    },
    REJECTED: {
      icon: <AlertTriangle className="h-3 w-3 mr-1" />,
      label: 'Rejeté',
      className: 'bg-red-50 text-red-700 border-red-200',
    },
    CANCELLED: {
      icon: <XCircle className="h-3 w-3 mr-1" />,
      label: 'Annulé',
      className: 'bg-gray-100 text-gray-500 border-gray-200',
    },
  };

  const config = configs[status];

    // --- SÉCURITÉ SUPPLÉMENTAIRE ---
  // Si un statut inconnu arrive, on affiche une valeur par défaut au lieu de planter.
  if (!config) {
    return (
      <Badge variant="outline" className="bg-gray-100 text-gray-500 border-gray-200">
        <AlertTriangle className="h-3 w-3 mr-1" />
        {status} (Inconnu)
      </Badge>
    );
  }
  
  
  return (
    <Badge variant="outline" className={config.className}>
      {config.icon}
      {config.label}
    </Badge>
  );
}

// =============================================================================
// PROPS
// =============================================================================

interface CheckListProps {
  checks: Check[];
  isLoading: boolean;
  filters: CheckFilters;
  onFiltersChange: (filters: CheckFilters) => void;
  onAddNew: (type?: CheckType) => void;
  onEdit: (check: Check) => void;
  onDelete: (check: Check) => void;
  onDeposit?: (check: Check) => void;
  onCash?: (check: Check) => void;
  onReject?: (check: Check) => void;
  onCancel?: (check: Check) => void;
  onPost?: (check: Check) => void;
  onRefresh: () => void;
  // Nouvelles actions
  onEmit?: (check: Check) => void;
  onPrint?: (check: Check) => void;
  onMarkReceived?: (check: Check) => void;
  onMarkProcessing?: (check: Check) => void;
  onMarkPaid?: (check: Check) => void;
  onViewTransaction?: (check: Check) => void;
  onViewDetails?: (check: Check) => void;
}

// =============================================================================
// COMPOSANT PRINCIPAL
// =============================================================================

export function CheckList({
  checks,
  isLoading,
  filters,
  onFiltersChange,
  onAddNew,
  onEdit,
  onDelete,
  onDeposit,
  onCash,
  onReject,
  onCancel,
  onPost,
  onRefresh,
  onEmit,
  onPrint,
  onMarkReceived,
  onMarkProcessing,
  onMarkPaid,
  onViewTransaction,
  onViewDetails,
}: CheckListProps) {
  // Mapper les actions aux handlers
  const actionHandlers: Record<string, ((check: Check) => void) | undefined> = {
    edit: onEdit,
    delete: onDelete,
    deposit: onDeposit,
    cash: onCash,
    reject: onReject,
    cancel: onCancel,
    post: onPost,
    emit: onEmit,
    print: onPrint,
    mark_received: onMarkReceived,
    mark_processing: onMarkProcessing,
    mark_paid: onMarkPaid,
    view_transaction: onViewTransaction,
    view_details: onViewDetails,
  };

  const handleAction = (actionId: string, check: Check) => {
    const handler = actionHandlers[actionId];
    if (handler) {
      handler(check);
    } else {
      console.warn(`Action "${actionId}" non implémentée`);
    }
  };
  const [searchValue, setSearchValue] = useState(filters.search || '');
  const [activeTab, setActiveTab] = useState<'all' | 'RECEIVED' | 'ISSUED'>('all');

  // Filtrer par onglet
  const filteredByTab = activeTab === 'all'
    ? checks
    : checks.filter(c => c.checkType === activeTab);

  // Statistiques par statut (excluant les annulés)
  const activeChecks = checks.filter(c => c.status !== 'CANCELLED');
  const pendingChecks = activeChecks.filter(c => c.status === 'PENDING');
  const depositedChecks = activeChecks.filter(c => c.status === 'DEPOSITED');
  const issuedChecks = activeChecks.filter(c => c.status === 'ISSUED'); // Chèques émis en circulation
  const cashedChecks = activeChecks.filter(c => c.status === 'CASHED');
  const rejectedChecks = activeChecks.filter(c => c.status === 'REJECTED');

  // Chèques en retard (date d'échéance dépassée, non encaissés)
  const today = new Date().toISOString().split('T')[0];
  const overdueChecks = activeChecks.filter(c =>
    c.checkType === 'RECEIVED' &&
    c.dueDate &&
    c.dueDate < today &&
    ['PENDING', 'RECEIVED', 'DEPOSITED', 'IN_PROGRESS'].includes(c.status)
  );

  // Calcul des montants
  const pendingAmount = pendingChecks.reduce((sum, c) => sum + c.amount, 0);
  const depositedAmount = depositedChecks.reduce((sum, c) => sum + c.amount, 0);
  const issuedAmount = issuedChecks.reduce((sum, c) => sum + c.amount, 0);
  const cashedAmount = cashedChecks.reduce((sum, c) => sum + c.amount, 0);
  const overdueAmount = overdueChecks.reduce((sum, c) => sum + c.amount, 0);

  // Gérer la recherche
  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    setTimeout(() => {
      onFiltersChange({ ...filters, search: value || undefined });
    }, 300);
  };

  // Changer d'onglet
  const handleTabChange = (tab: string) => {
    setActiveTab(tab as 'all' | 'RECEIVED' | 'ISSUED');
    onFiltersChange({ 
      ...filters, 
      type: tab === 'all' ? undefined : tab as CheckType 
    });
  };

  // ---------------------------------------------------------------------------
  // RENDU DU TABLEAU
  // ---------------------------------------------------------------------------

  const renderTable = (checksToShow: Check[]) => {
    if (isLoading) {
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>N° Chèque</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Tiers</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="w-[70px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={index}>
                <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                <TableCell><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                <TableCell><Skeleton className="h-8 w-8" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
    }

    if (checksToShow.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="p-4 bg-purple-50 rounded-full mb-4">
            <FileText className="h-10 w-10 text-purple-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Aucun chèque
          </h3>
          <p className="text-gray-500 mb-6 max-w-md">
            {filters.search
              ? "Aucun chèque ne correspond à votre recherche."
              : "Enregistrez votre premier chèque pour commencer le suivi."}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onAddNew('RECEIVED')}>
              <ArrowDownLeft className="mr-2 h-4 w-4" />
              Chèque reçu
            </Button>
            <Button onClick={() => onAddNew('ISSUED')}>
              <ArrowUpRight className="mr-2 h-4 w-4" />
              Chèque émis
            </Button>
          </div>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>N° Chèque</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Tiers</TableHead>
            <TableHead className="text-right">Montant</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="w-[70px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {checksToShow.map(check => (
            <TableRow
              key={check.id}
              className={`${check.status === 'CANCELLED' ? 'opacity-50' : ''} cursor-pointer hover:bg-muted/50 transition-colors`}
              onClick={() => onViewDetails?.(check)}
            >
              <TableCell className="font-mono font-medium">
                {check.checkNumber}
              </TableCell>
              <TableCell>
                <TypeBadge checkType={check.checkType} />
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span>{formatDate(check.issueDate)}</span>
                  {check.dueDate && (
                    <span className="text-xs text-gray-500">
                      Éch: {formatDate(check.dueDate)}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium">{check.partnerName}</span>
                  {check.description && (
                    <span className="text-sm text-gray-500 truncate max-w-[200px]">
                      {check.description}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell className={`text-right font-medium ${
                check.checkType === 'RECEIVED' ? 'text-green-600' : 'text-red-600'
              }`}>
                {check.checkType === 'RECEIVED' ? '+' : '-'}
                {formatCurrency(check.amount, check.currency)}
              </TableCell>
              <TableCell>
                <StatusBadge status={check.status} />
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {getAvailableActions(check).map((action, index) => {
                      const Icon = action.icon;
                      const variantClass =
                        action.variant === 'destructive' ? 'text-red-600 focus:text-red-600' :
                        action.variant === 'warning' ? 'text-amber-600 focus:text-amber-600' :
                        '';

                      return (
                        <React.Fragment key={action.id}>
                          {action.separator && index > 0 && <DropdownMenuSeparator />}
                          <DropdownMenuItem
                            onClick={() => handleAction(action.id, check)}
                            className={variantClass}
                          >
                            <Icon className="mr-2 h-4 w-4" />
                            {action.label}
                          </DropdownMenuItem>
                        </React.Fragment>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  // ---------------------------------------------------------------------------
  // RENDU PRINCIPAL
  // ---------------------------------------------------------------------------

  return (
    <div className="p-responsive space-y-4 sm:space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="heading-responsive font-bold tracking-tight text-gray-900">
            Gestion des Chèques
          </h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">
            Suivez vos chèques émis et reçus.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="flex-1 sm:flex-none">
                <Plus className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Nouveau Chèque</span>
                <span className="sm:hidden">Nouveau</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onAddNew('RECEIVED')}>
                <ArrowDownLeft className="mr-2 h-4 w-4 text-green-500" />
                Chèque reçu
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAddNew('ISSUED')}>
                <ArrowUpRight className="mr-2 h-4 w-4 text-red-500" />
                Chèque émis
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Statistiques - Ligne 1 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-500">
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{activeChecks.length}</div>
          </CardContent>
        </Card>

        {/* En attente */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-500 flex items-center gap-1">
              <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-amber-500" />
              En attente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-amber-600">
              {pendingChecks.length}
            </div>
            <p className="text-xs sm:text-sm text-gray-500 truncate">
              {formatCurrency(pendingAmount)}
            </p>
          </CardContent>
        </Card>

        {/* Émis en circulation */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-500 flex items-center gap-1">
              <Send className="h-3 w-3 sm:h-4 sm:w-4 text-purple-500" />
              Émis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-purple-600">
              {issuedChecks.length}
            </div>
            <p className="text-xs sm:text-sm text-gray-500 truncate">
              {formatCurrency(issuedAmount)}
            </p>
          </CardContent>
        </Card>

        {/* Remis en banque */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-500 flex items-center gap-1">
              <Building2 className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500" />
              Déposés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-blue-600">
              {depositedChecks.length}
            </div>
            <p className="text-xs sm:text-sm text-gray-500 truncate">
              {formatCurrency(depositedAmount)}
            </p>
          </CardContent>
        </Card>

        {/* Encaissés */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-500 flex items-center gap-1">
              <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
              Encaissés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-green-600">
              {cashedChecks.length}
            </div>
            <p className="text-xs sm:text-sm text-gray-500 truncate">
              {formatCurrency(cashedAmount)}
            </p>
          </CardContent>
        </Card>

        {/* Rejetés */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-500 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-red-500" />
              Rejetés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-red-600">
              {rejectedChecks.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerte échéances dépassées */}
      {overdueChecks.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-full">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium text-orange-800">
                    {overdueChecks.length} chèque{overdueChecks.length > 1 ? 's' : ''} en retard
                  </p>
                  <p className="text-sm text-orange-600">
                    Montant total : {formatCurrency(overdueAmount)}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="border-orange-300 text-orange-700 bg-orange-100">
                Échéance dépassée
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recherche */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher par numéro, tiers, description..."
              value={searchValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Onglets et Tableau */}
      <Card>
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <CardHeader className="pb-0">
            <TabsList>
              <TabsTrigger value="all">
                Tous ({checks.length})
              </TabsTrigger>
              <TabsTrigger value="RECEIVED">
                <ArrowDownLeft className="h-4 w-4 mr-1" />
                Reçus ({checks.filter(c => c.checkType === 'RECEIVED').length})
              </TabsTrigger>
              <TabsTrigger value="ISSUED">
                <ArrowUpRight className="h-4 w-4 mr-1" />
                Émis ({checks.filter(c => c.checkType === 'ISSUED').length})
              </TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent className="p-0 overflow-hidden">
            <div className="table-responsive">
              <TabsContent value="all" className="m-0">
                {renderTable(filteredByTab)}
              </TabsContent>
              <TabsContent value="RECEIVED" className="m-0">
                {renderTable(filteredByTab)}
              </TabsContent>
              <TabsContent value="ISSUED" className="m-0">
                {renderTable(filteredByTab)}
              </TabsContent>
            </div>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}