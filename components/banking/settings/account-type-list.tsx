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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
  const [selectedType, setSelectedType] = useState<AccountType | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const handleRowClick = (type: AccountType) => {
    setSelectedType(type);
    setIsDetailOpen(true);
  };

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

  const PermissionsList = ({ peutEmettre, peutRecevoir, peutEspeces, isInherited }: { peutEmettre: boolean; peutRecevoir: boolean; peutEspeces: boolean; isInherited?: boolean; }) => (
    <div className="flex flex-wrap gap-1.5">
        {peutEmettre && <Badge variant="outline" className="border-green-300 text-green-700 dark:border-green-700 dark:text-green-400">Émission Chèques</Badge>}
        {peutRecevoir && <Badge variant="outline" className="border-teal-300 text-teal-700 dark:border-teal-700 dark:text-teal-400">Réception Chèques</Badge>}
        {peutEspeces && <Badge variant="outline" className="border-sky-300 text-sky-700 dark:border-sky-700 dark:text-sky-400">Transactions Espèces</Badge>}
        {!peutEmettre && !peutRecevoir && !peutEspeces && <Badge variant="secondary">Aucune</Badge>}
    </div>
);

  const DecouvertBadge = ({ autorise }: { autorise: boolean; montant: number }) => (
    autorise 
    ? <Badge variant="outline" className="text-center border-amber-400 text-amber-700 dark:border-amber-600 dark:text-amber-400">Autorisé</Badge> 
    : <span className="text-xs text-muted-foreground text-center block">Non autorisé</span>
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

function TypeRow({ type, isExpanded, onToggleExpand, onEdit, onAddSubType, onDelete, onEditSubType, onDeleteSubType, onRowClick }: any) {
    const hasSubTypes = type.subTypes && type.subTypes.length > 0;

    const handleCellClick = (e: React.MouseEvent) => {
      // Ne pas ouvrir les détails si on clique sur un bouton ou le dropdown
      if ((e.target as HTMLElement).closest('button, [role="menuitem"]')) {
        return;
      }
      onRowClick(type);
    };

    return (
        <>
            {/* Ligne principale du type */}
            <TableRow
              className="border-b-0 cursor-pointer hover:bg-muted/60"
              data-state={isExpanded ? "open" : "closed"}
              onClick={handleCellClick}
            >
                <TableCell className="font-mono font-medium text-blue-600 dark:text-blue-400">
                    <div className="flex items-center gap-1 sm:gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 sm:h-8 sm:w-8"
                          onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
                          disabled={!hasSubTypes}
                        >
                            {hasSubTypes ? (isExpanded ? <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" /> : <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />) : <div className="w-3 sm:w-4" />}
                        </Button>
                        <span className="text-xs sm:text-sm">{type.code}</span>
                    </div>
                </TableCell>
                <TableCell>
                    <div className="font-medium text-sm sm:text-base">{type.libelle}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground truncate max-w-[120px] sm:max-w-xs">{type.description}</div>
                </TableCell>
                <TableCell className="hidden md:table-cell"><PermissionsList peutEmettre={type.peutEmettreChecques} peutRecevoir={type.peutRecevoirChecques} peutEspeces={type.peutTransactionsEspeces} /></TableCell>
                <TableCell className="hidden lg:table-cell text-center"><DecouvertBadge autorise={type.decouvertAutorise} montant={type.decouvertParDefaut} /></TableCell>
                <TableCell className="text-center"><Badge variant={type.isActive ? 'default' : 'secondary'} className="text-xs">{type.isActive ? "Actif" : "Inactif"}</Badge></TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEdit(type)}><Pencil className="h-4 w-4 mr-2" />Modifier</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onAddSubType(type)}><Layers className="h-4 w-4 mr-2" />Ajouter un sous-type</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onDelete(type)} className="text-red-600"><Trash2 className="h-4 w-4 mr-2" />Supprimer</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </TableCell>
            </TableRow>

            {/* Lignes des sous-types (si déplié) - responsives */}
            {isExpanded && hasSubTypes && type.subTypes.map((subType: AccountSubType) => (
                <TableRow key={subType.id} className="bg-muted/30 hover:bg-muted/50">
                    <TableCell className="pl-8 sm:pl-16 text-muted-foreground text-xs sm:text-sm">{subType.code}</TableCell>
                    <TableCell>
                        <div className="font-medium text-xs sm:text-sm">{subType.libelle}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[100px] sm:max-w-xs">{subType.description}</div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell"><PermissionsList peutEmettre={subType.peutEmettreChecques} peutRecevoir={subType.peutRecevoirChecques} peutEspeces={subType.peutTransactionsEspeces} /></TableCell>
                    <TableCell className="hidden lg:table-cell text-center"><DecouvertBadge autorise={subType.decouvertAutorise} montant={subType.decouvertParDefaut} /></TableCell>
                    <TableCell className="text-center"><Badge variant={subType.isActive ? 'default' : 'secondary'} className="text-xs">{subType.isActive ? "Actif" : "Inactif"}</Badge></TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6 sm:h-8 sm:w-8"><MoreHorizontal className="h-3 w-3 sm:h-4 sm:w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => onEditSubType(type, subType)}><Pencil className="h-4 w-4 mr-2" />Modifier</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => onDeleteSubType(type, subType)} className="text-red-600"><Trash2 className="h-4 w-4 mr-2" />Supprimer</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                </TableRow>
            ))}
        </>
    );
}


  return (
   <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2"><FolderTree className="h-5 w-5" />Types de Comptes</CardTitle>
          <CardDescription className="hidden sm:block">Configurez les types et sous-types de comptes avec leurs permissions</CardDescription>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" size="icon" onClick={onRefresh} disabled={isLoading}><RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /></Button>
          <Button onClick={onAddNew} className="flex-1 sm:flex-none"><Plus className="h-4 w-4 mr-2" /><span className="hidden sm:inline">Nouveau Type</span><span className="sm:hidden">Nouveau</span></Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2 py-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : accountTypes.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
             <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Aucun type de compte</p>
            <p className="text-sm">Commencez par créer votre premier type de compte.</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
                <TableHeader>
                    {/* Responsive : cacher Permissions et Découvert sur mobile */}
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead className="w-[100px] sm:w-[150px]">Code</TableHead>
                        <TableHead>Libellé</TableHead>
                        <TableHead className="hidden md:table-cell">Permissions</TableHead>
                        <TableHead className="hidden lg:table-cell w-[150px] text-center">Découvert</TableHead>
                        <TableHead className="w-[80px] sm:w-[120px] text-center">Statut</TableHead>
                        <TableHead className="w-[50px]"> </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {accountTypes.map((type) => (
                        <TypeRow
                          key={type.id}
                          type={type}
                          isExpanded={expandedTypes.has(type.id)}
                          onToggleExpand={() => toggleExpand(type.id)}
                          onRowClick={handleRowClick}
                          onEdit={onEdit}
                          onAddSubType={onAddSubType}
                          onDelete={onDelete}
                          onEditSubType={onEditSubType}
                          onDeleteSubType={onDeleteSubType}
                        />
                    ))}
                </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Sheet de détails du type de compte */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {selectedType && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <FolderTree className="h-5 w-5 text-primary" />
                  {selectedType.libelle}
                </SheetTitle>
                <SheetDescription>
                  Détails du type de compte
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6 py-4">
                {/* Informations générales */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Informations générales
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Code</p>
                      <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                        {selectedType.code}
                      </code>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Statut</p>
                      <Badge variant={selectedType.isActive ? 'default' : 'secondary'} className="mt-1">
                        {selectedType.isActive ? "Actif" : "Inactif"}
                      </Badge>
                    </div>
                  </div>
                  {selectedType.description && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Description</p>
                      <p className="text-sm">{selectedType.description}</p>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Permissions */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Permissions
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <span className="text-sm">Émission de chèques</span>
                      {selectedType.peutEmettreChecques ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Autorisé
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          <XCircle className="h-3 w-3 mr-1" /> Non autorisé
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <span className="text-sm">Réception de chèques</span>
                      {selectedType.peutRecevoirChecques ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Autorisé
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          <XCircle className="h-3 w-3 mr-1" /> Non autorisé
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <span className="text-sm">Transactions espèces</span>
                      {selectedType.peutTransactionsEspeces ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Autorisé
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          <XCircle className="h-3 w-3 mr-1" /> Non autorisé
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Découvert */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Paramètres de découvert
                  </h4>
                  <div className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium">Découvert autorisé</span>
                      {selectedType.decouvertAutorise ? (
                        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                          Oui
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Non</Badge>
                      )}
                    </div>
                    {selectedType.decouvertAutorise && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Montant par défaut</p>
                        <p className="text-lg font-semibold text-primary">
                          {formatAmount(selectedType.decouvertParDefaut)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sous-types */}
                {selectedType.subTypes && selectedType.subTypes.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                        <Layers className="h-4 w-4" />
                        Sous-types ({selectedType.subTypes.length})
                      </h4>
                      <div className="space-y-2">
                        {selectedType.subTypes.map((subType) => (
                          <div
                            key={subType.id}
                            className="p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <code className="bg-background px-2 py-0.5 rounded text-xs font-mono border">
                                  {subType.code}
                                </code>
                                <span className="font-medium text-sm">{subType.libelle}</span>
                              </div>
                              <Badge
                                variant={subType.isActive ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {subType.isActive ? "Actif" : "Inactif"}
                              </Badge>
                            </div>
                            {subType.description && (
                              <p className="text-xs text-muted-foreground mb-2">
                                {subType.description}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-1">
                              {subType.peutEmettreChecques && (
                                <Badge variant="outline" className="text-xs border-green-300 text-green-700">
                                  Émission
                                </Badge>
                              )}
                              {subType.peutRecevoirChecques && (
                                <Badge variant="outline" className="text-xs border-teal-300 text-teal-700">
                                  Réception
                                </Badge>
                              )}
                              {subType.peutTransactionsEspeces && (
                                <Badge variant="outline" className="text-xs border-sky-300 text-sky-700">
                                  Espèces
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setIsDetailOpen(false);
                    onEdit(selectedType);
                  }}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Modifier
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDetailOpen(false);
                    onAddSubType(selectedType);
                  }}
                >
                  <Layers className="h-4 w-4 mr-2" />
                  Ajouter sous-type
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </Card>
  );
}
