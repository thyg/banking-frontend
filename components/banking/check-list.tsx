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
  Trash2,
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
// SOUS-COMPOSANTS
// =============================================================================

function TypeBadge({ type }: { type: CheckType }) {
  if (type === 'RECEIVED') {
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
    DEPOSITED: {
      icon: <Building2 className="h-3 w-3 mr-1" />,
      label: 'Remis',
      className: 'bg-blue-50 text-blue-700 border-blue-200',
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
  onRefresh: () => void;
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
  onRefresh,
}: CheckListProps) {
  const [searchValue, setSearchValue] = useState(filters.search || '');
  const [activeTab, setActiveTab] = useState<'all' | 'RECEIVED' | 'ISSUED'>('all');

  // Filtrer par onglet
  const filteredByTab = activeTab === 'all' 
    ? checks 
    : checks.filter(c => c.type === activeTab);

  // Statistiques par statut
  const pendingChecks = checks.filter(c => c.status === 'PENDING');
  const depositedChecks = checks.filter(c => c.status === 'DEPOSITED');
  const pendingAmount = pendingChecks.reduce((sum, c) => sum + c.amount, 0);
  const depositedAmount = depositedChecks.reduce((sum, c) => sum + c.amount, 0);

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
              className={check.status === 'CANCELLED' ? 'opacity-50' : ''}
            >
              <TableCell className="font-mono font-medium">
                {check.checkNumber}
              </TableCell>
              <TableCell>
                <TypeBadge type={check.type} />
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
                check.type === 'RECEIVED' ? 'text-green-600' : 'text-red-600'
              }`}>
                {check.type === 'RECEIVED' ? '+' : '-'}
                {formatCurrency(check.amount, check.currency)}
              </TableCell>
              <TableCell>
                <StatusBadge status={check.status} />
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => onEdit(check)}
                      disabled={check.status !== 'PENDING'}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Modifier
                    </DropdownMenuItem>
                    
                    {/* Actions spécifiques selon le statut */}
                    {check.type === 'RECEIVED' && check.status === 'PENDING' && onDeposit && (
                      <DropdownMenuItem onClick={() => onDeposit(check)}>
                        <Building2 className="mr-2 h-4 w-4" />
                        Remettre en banque
                      </DropdownMenuItem>
                    )}
                    
                    {check.type === 'RECEIVED' && check.status === 'DEPOSITED' && onCash && (
                      <DropdownMenuItem onClick={() => onCash(check)}>
                        <Banknote className="mr-2 h-4 w-4" />
                        Marquer encaissé
                      </DropdownMenuItem>
                    )}
                    
                    {check.type === 'ISSUED' && check.status === 'PENDING' && onCash && (
                      <DropdownMenuItem onClick={() => onCash(check)}>
                        <Banknote className="mr-2 h-4 w-4" />
                        Marquer débité
                      </DropdownMenuItem>
                    )}
                    
                    {['PENDING', 'DEPOSITED'].includes(check.status) && onReject && (
                      <DropdownMenuItem 
                        onClick={() => onReject(check)}
                        className="text-amber-600"
                      >
                        <AlertTriangle className="mr-2 h-4 w-4" />
                        Marquer rejeté
                      </DropdownMenuItem>
                    )}
                    
                    {check.status === 'PENDING' && onCancel && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onCancel(check)}
                          className="text-gray-600"
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Annuler
                        </DropdownMenuItem>
                      </>
                    )}
                    
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete(check)}
                      className="text-red-600 focus:text-red-600"
                      disabled={check.status !== 'PENDING'}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Supprimer
                    </DropdownMenuItem>
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
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Gestion des Chèques
          </h1>
          <p className="text-gray-500 mt-1">
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
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nouveau Chèque
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

      {/* Statistiques */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total chèques
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{checks.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              En attente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {pendingChecks.length}
            </div>
            <p className="text-sm text-gray-500">
              {formatCurrency(pendingAmount)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-500" />
              Remis en banque
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {depositedChecks.length}
            </div>
            <p className="text-sm text-gray-500">
              {formatCurrency(depositedAmount)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Rejetés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {checks.filter(c => c.status === 'REJECTED').length}
            </div>
          </CardContent>
        </Card>
      </div>

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
                Reçus ({checks.filter(c => c.type === 'RECEIVED').length})
              </TabsTrigger>
              <TabsTrigger value="ISSUED">
                <ArrowUpRight className="h-4 w-4 mr-1" />
                Émis ({checks.filter(c => c.type === 'ISSUED').length})
              </TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent className="p-0">
            <TabsContent value="all" className="m-0">
              {renderTable(filteredByTab)}
            </TabsContent>
            <TabsContent value="RECEIVED" className="m-0">
              {renderTable(filteredByTab)}
            </TabsContent>
            <TabsContent value="ISSUED" className="m-0">
              {renderTable(filteredByTab)}
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}