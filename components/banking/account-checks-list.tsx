/**
 * @file app/dashboard/banking/accounts/_components/account-checks-list.tsx
 * @description Liste des chèques d'un compte bancaire.
 * Affiche les chèques émis et reçus avec leur statut.
 * 
 * @version 1.0.0
 * @author RT-ComOps Team
 * @since 2024-12-11
 */

"use client";

import React from 'react';
import Link from 'next/link';
import type { Check } from '@/types/banking';
import { Button } from '@/components/ui/button';
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
  RefreshCw,
  Plus,
  ExternalLink,
  CheckSquare,
  ArrowDownCircle,
  ArrowUpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface AccountChecksListProps {
  /** Liste des chèques */
  checks: Check[];
  /** État de chargement */
  isLoading: boolean;
  /** Devise du compte */
  currency: string;
  /** Callback pour rafraîchir */
  onRefresh: () => void;
}

// ============================================================================
// HELPERS
// ============================================================================

function formatCurrency(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency
  }).format(amount);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'CASHED':
      return <Badge className="bg-green-100 text-green-800">Encaissé</Badge>;
    case 'DEPOSITED':
      return <Badge className="bg-blue-100 text-blue-800">Déposé</Badge>;
    case 'REJECTED':
      return <Badge variant="destructive">Rejeté</Badge>;
    case 'CANCELLED':
      return <Badge variant="outline">Annulé</Badge>;
    case 'PENDING':
    default:
      return <Badge variant="secondary">En attente</Badge>;
  }
}

function getTypeInfo(checkType: string) {
  if (checkType === 'RECEIVED') {
    return {
      label: 'Reçu',
      icon: <ArrowDownCircle className="h-4 w-4 text-green-600" />,
      color: 'text-green-600'
    };
  }
  return {
    label: 'Émis',
    icon: <ArrowUpCircle className="h-4 w-4 text-orange-600" />,
    color: 'text-orange-600'
  };
}

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

export function AccountChecksList({
  checks,
  isLoading,
  currency,
  onRefresh
}: AccountChecksListProps) {
  
  // Séparer les chèques par type
  const receivedChecks = checks.filter(c => c.checkType === 'RECEIVED');
  const issuedChecks = checks.filter(c => c.checkType === 'ISSUED');

  // État de chargement
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // État vide
  if (checks.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <CheckSquare className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">Aucun chèque</h3>
          <p className="text-muted-foreground text-center mb-4">
            Aucun chèque n'est enregistré pour ce compte.
          </p>
          <Link href="/banking/checks/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Enregistrer un chèque
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  // Liste des chèques avec onglets
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Chèques</CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
          <Link href="/banking/checks">
            <Button variant="outline" size="sm">
              Voir tout
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="received" className="space-y-4">
          <TabsList>
            <TabsTrigger value="received" className="flex items-center gap-2">
              <ArrowDownCircle className="h-4 w-4" />
              Reçus
              <Badge variant="secondary" className="ml-1">{receivedChecks.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="issued" className="flex items-center gap-2">
              <ArrowUpCircle className="h-4 w-4" />
              Émis
              <Badge variant="secondary" className="ml-1">{issuedChecks.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="received">
            <ChecksTable checks={receivedChecks} currency={currency} />
          </TabsContent>

          <TabsContent value="issued">
            <ChecksTable checks={issuedChecks} currency={currency} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// SOUS-COMPOSANT TABLE
// ============================================================================

function ChecksTable({ checks, currency }: { checks: Check[], currency: string }) {
  if (checks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Aucun chèque dans cette catégorie
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>N° Chèque</TableHead>
          <TableHead>Partenaire</TableHead>
          <TableHead>Date émission</TableHead>
          <TableHead>Échéance</TableHead>
          <TableHead className="text-right">Montant</TableHead>
          <TableHead>Statut</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {checks.slice(0, 10).map((check) => {
          const typeInfo = getTypeInfo(check.checkType);
          
          return (
            <TableRow key={check.id} className="hover:bg-muted/50">
              <TableCell className="font-mono font-medium">
                {check.checkNumber}
              </TableCell>
              <TableCell className="max-w-[150px] truncate">
                {check.partnerName}
              </TableCell>
              <TableCell>
                {formatDate(check.issueDate)}
              </TableCell>
              <TableCell>
                {check.dueDate ? formatDate(check.dueDate) : '-'}
              </TableCell>
              <TableCell className="text-right">
                <span className={cn("font-mono font-medium", typeInfo.color)}>
                  {formatCurrency(check.amount, currency)}
                </span>
              </TableCell>
              <TableCell>
                {getStatusBadge(check.status)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export default AccountChecksList;