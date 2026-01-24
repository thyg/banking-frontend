/**
 * @file components/banking/settings/account-type-list.tsx
 * @description Composant de liste des types de comptes bancaires avec sous-types.
 * Affiche les types en arborescence avec leurs permissions et actions.
 *
 * @version 2.0.0
 * @date 2024-12-31
 */

"use client";

import React, { useState } from 'react';
import { AccountType, AccountSubType } from '@/types/banking';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Banknote,
  CreditCard,
  Wallet,
  ChevronRight,
  ChevronDown,
  FolderTree,
  Layers,
} from 'lucide-react';

interface AccountTypeListProps {
  accountTypes: AccountType[];
  isLoading: boolean;
  onAddNew: () => void;
  onAddSubType: (parentType: AccountType) => void;
  onEdit: (type: AccountType) => void;
  onEditSubType: (parentType: AccountType, subType: AccountSubType) => void;
  onDelete: (type: AccountType) => void;
  onDeleteSubType: (parentType: AccountType, subType: AccountSubType) => void;
  onRefresh: () => void;
}

export function AccountTypeList({
  accountTypes,
  isLoading,
  onAddNew,
  onAddSubType,
  onEdit,
  onEditSubType,
  onDelete,
  onDeleteSubType,
  onRefresh,
}: AccountTypeListProps) {
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());

  const toggleExpand = (typeId: string) => {
    const newExpanded = new Set(expandedTypes);
    if (newExpanded.has(typeId)) {
      newExpanded.delete(typeId);
    } else {
      newExpanded.add(typeId);
    }
    setExpandedTypes(newExpanded);
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + ' XAF';
  };

  const PermissionBadge = ({ enabled, label }: { enabled: boolean; label: string }) => (
    <Badge
      variant={enabled ? "default" : "outline"}
      className={enabled
        ? "bg-green-100 text-green-800 hover:bg-green-100 text-xs"
        : "bg-gray-100 text-gray-500 text-xs"
      }
    >
      {enabled ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
      {label}
    </Badge>
  );

  const PermissionsList = ({
    peutEmettre,
    peutRecevoir,
    peutEspeces,
    isInherited = false
  }: {
    peutEmettre: boolean;
    peutRecevoir: boolean;
    peutEspeces: boolean;
    isInherited?: boolean;
  }) => (
    <div className="flex flex-wrap gap-1">
      {peutEmettre && (
        <PermissionBadge enabled={true} label="Emettre" />
      )}
      {peutRecevoir && (
        <PermissionBadge enabled={true} label="Recevoir" />
      )}
      {peutEspeces && (
        <Badge variant="outline" className="bg-blue-100 text-blue-800 text-xs">
          <Banknote className="h-3 w-3 mr-1" />
          Especes
        </Badge>
      )}
      {!peutEmettre && !peutRecevoir && !peutEspeces && (
        <span className="text-xs text-muted-foreground">Aucune</span>
      )}
    </div>
  );

  const DecouvertBadge = ({ autorise, montant }: { autorise: boolean; montant: number }) => (
    autorise ? (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="bg-orange-100 text-orange-800 text-xs">
          <Wallet className="h-3 w-3 mr-1" />
          Autorise
        </Badge>
        {montant > 0 && (
          <span className="text-xs text-muted-foreground">
            {formatAmount(montant)}
          </span>
        )}
      </div>
    ) : (
      <Badge variant="outline" className="text-gray-500 text-xs">
        Non autorise
      </Badge>
    )
  );

  // Render a sub-type row
  const SubTypeRow = ({ parentType, subType }: { parentType: AccountType; subType: AccountSubType }) => (
    <div className="flex items-center justify-between py-3 px-4 ml-8 border-l-2 border-gray-200 bg-gray-50/50 hover:bg-gray-100/50">
      <div className="flex items-center gap-4 flex-1">
        <div className="flex items-center gap-2">
          <div className="w-4 h-px bg-gray-300" />
          <code className="bg-white px-2 py-0.5 rounded text-xs font-mono border">
            {subType.code}
          </code>
        </div>

        <div className="min-w-[150px]">
          <p className="text-sm font-medium">{subType.libelle}</p>
          {subType.description && (
            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
              {subType.description}
            </p>
          )}
        </div>

        <div className="flex-1">
          <PermissionsList
            peutEmettre={subType.peutEmettreChecques}
            peutRecevoir={subType.peutRecevoirChecques}
            peutEspeces={subType.peutTransactionsEspeces}
            isInherited
          />
        </div>

        <div className="min-w-[150px]">
          <DecouvertBadge
            autorise={subType.decouvertAutorise}
            montant={subType.decouvertParDefaut}
          />
        </div>

        <div className="min-w-[80px]">
          <Badge variant={subType.isActive ? "default" : "secondary"} className="text-xs">
            {subType.isActive ? "Actif" : "Inactif"}
          </Badge>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEditSubType(parentType, subType)}>
            <Pencil className="h-4 w-4 mr-2" />
            Modifier
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => onDeleteSubType(parentType, subType)}
            className="text-red-600"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  // Render a type row with its sub-types
  const TypeRow = ({ type }: { type: AccountType }) => {
    const hasSubTypes = type.subTypes && type.subTypes.length > 0;
    const isExpanded = expandedTypes.has(type.id);

    return (
      <Collapsible open={isExpanded} onOpenChange={() => toggleExpand(type.id)}>
        <div className="border-b last:border-b-0">
          {/* Main type row */}
          <div className="flex items-center justify-between py-4 px-4 hover:bg-gray-50">
            <div className="flex items-center gap-4 flex-1">
              {/* Expand button */}
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!hasSubTypes}>
                  {hasSubTypes ? (
                    isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )
                  ) : (
                    <div className="w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>

              <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                {type.code}
              </code>

              <div className="min-w-[150px]">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{type.libelle}</p>
                  {hasSubTypes && (
                    <Badge variant="outline" className="text-xs">
                      {type.subTypes!.length} sous-type{type.subTypes!.length > 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
                {type.description && (
                  <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                    {type.description}
                  </p>
                )}
              </div>

              <div className="flex-1">
                <PermissionsList
                  peutEmettre={type.peutEmettreChecques}
                  peutRecevoir={type.peutRecevoirChecques}
                  peutEspeces={type.peutTransactionsEspeces}
                />
              </div>

              <div className="min-w-[150px]">
                <DecouvertBadge
                  autorise={type.decouvertAutorise}
                  montant={type.decouvertParDefaut}
                />
              </div>

              <div className="min-w-[80px]">
                <Badge variant={type.isActive ? "default" : "secondary"}>
                  {type.isActive ? "Actif" : "Inactif"}
                </Badge>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(type)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Modifier
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAddSubType(type)}>
                  <Layers className="h-4 w-4 mr-2" />
                  Ajouter un sous-type
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(type)}
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Sub-types */}
          <CollapsibleContent>
            {type.subTypes?.map((subType) => (
              <SubTypeRow key={subType.id} parentType={type} subType={subType} />
            ))}
          </CollapsibleContent>
        </div>
      </Collapsible>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <FolderTree className="h-5 w-5" />
            Types de Comptes
          </CardTitle>
          <CardDescription>
            Configurez les types et sous-types de comptes avec leurs permissions
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={onRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={onAddNew}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau Type
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-full" />
              </div>
            ))}
          </div>
        ) : accountTypes.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Aucun type de compte</p>
            <p className="text-sm">Commencez par creer votre premier type de compte</p>
          </div>
        ) : (
          <div className="border rounded-lg">
            {/* Header */}
            <div className="flex items-center gap-4 py-3 px-4 bg-gray-100 border-b text-sm font-medium text-muted-foreground">
              <div className="w-8" /> {/* Expand button space */}
              <div className="w-[100px]">Code</div>
              <div className="min-w-[150px]">Libelle</div>
              <div className="flex-1">Permissions</div>
              <div className="min-w-[150px]">Decouvert</div>
              <div className="min-w-[80px]">Statut</div>
              <div className="w-10" /> {/* Actions space */}
            </div>

            {/* Types list */}
            {accountTypes.map((type) => (
              <TypeRow key={type.id} type={type} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
