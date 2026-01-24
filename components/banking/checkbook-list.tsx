/**
 * @file components/banking/checkbook-list.tsx
 * @description Affiche une liste de chéquiers sous forme de tableau.
 * Supporte les chéquiers réels (REEL) et le chéquier système fictif (FICTIF).
 *
 * @version 2.0.0
 * @date 2024-12-30
 */
"use client";

import React from 'react';
import { Checkbook } from '@/types/banking';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Eye, Ban, Shield, Infinity } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';

interface CheckbookListProps {
  checkbooks: Checkbook[];
  isLoading: boolean;
  onView: (checkbook: Checkbook) => void;
  onCancel: (checkbook: Checkbook) => void;
}

export function CheckbookList({ checkbooks, isLoading, onView, onCancel }: CheckbookListProps) {
  
  const getStatusVariant = (status: Checkbook['status']) => {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'FINISHED':
        return 'secondary';
      case 'CANCELLED':
        return 'destructive';
      default:
        return 'default';
    }
  };

  if (isLoading) {
    return <div>Chargement de la liste des chéquiers...</div>;
  }

  if (checkbooks.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        Aucun chéquier trouvé.
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Compte Bancaire</TableHead>
            <TableHead className="hidden md:table-cell">RIB</TableHead>
            <TableHead className="hidden lg:table-cell">Plage</TableHead>
            <TableHead className="hidden sm:table-cell">N° Actuel</TableHead>
            <TableHead>Restants</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {checkbooks.map((cb) => (
            <TableRow
              key={cb.id}
              className={cn(
                cb.isSystem && 'bg-purple-50/50',
                'cursor-pointer hover:bg-muted/50 transition-colors'
              )}
              onClick={() => onView(cb)}
            >
              {/* Type Badge */}
              <TableCell>
                {cb.isSystem ? (
                  <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300 text-xs">
                    <Shield className="h-3 w-3 mr-1 hidden sm:inline" />
                    <span className="hidden sm:inline">SYSTEME</span>
                    <span className="sm:hidden">SYS</span>
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                    REEL
                  </Badge>
                )}
              </TableCell>
              {/* Bank Account */}
              <TableCell className="font-medium max-w-[120px] sm:max-w-none truncate">
                {cb.type === 'FICTIF' ? (
                  <span className="text-muted-foreground italic text-xs sm:text-sm">Cheques recus</span>
                ) : (
                  <span className="text-xs sm:text-sm">{cb.bankAccountName}</span>
                )}
              </TableCell>
              {/* IBAN - Hidden on mobile */}
              <TableCell className="hidden md:table-cell font-mono text-xs">
                {cb.type === 'FICTIF' ? (
                  <span className="text-muted-foreground">N/A</span>
                ) : (
                  cb.iban
                )}
              </TableCell>
              {/* Number Range - Hidden on mobile and tablet */}
              <TableCell className="hidden lg:table-cell text-xs">
                {cb.type === 'FICTIF' ? (
                  <span className="text-muted-foreground">N/A</span>
                ) : (
                  `${cb.startNumber} - ${cb.endNumber}`
                )}
              </TableCell>
              {/* Current Number - Hidden on mobile */}
              <TableCell className="hidden sm:table-cell text-xs">
                {cb.type === 'FICTIF' ? (
                  <span className="text-muted-foreground font-mono">CHQ-REC-{String(cb.nextSequence || 1).padStart(6, '0')}</span>
                ) : (
                  <span className="font-mono">{cb.currentNumber}</span>
                )}
              </TableCell>
              {/* Available Checks */}
              <TableCell>
                {cb.type === 'FICTIF' || cb.availableChecks === -1 ? (
                  <div className="flex items-center gap-1 text-purple-600">
                    <Infinity className="h-4 w-4" />
                    <span className="text-xs sm:text-sm font-medium hidden sm:inline">Illimite</span>
                  </div>
                ) : (
                  <span className="text-xs sm:text-sm">{cb.availableChecks}</span>
                )}
              </TableCell>
              {/* Status */}
              <TableCell>
                <Badge variant={getStatusVariant(cb.status)} className={cn(
                  "text-xs",
                  cb.status === 'ACTIVE' && 'bg-green-100 text-green-800',
                  cb.status === 'FINISHED' && 'bg-gray-100 text-gray-800',
                  cb.status === 'CANCELLED' && 'bg-red-100 text-red-800',
                )}>
                  <span className="hidden sm:inline">{cb.status}</span>
                  <span className="sm:hidden">{cb.status.substring(0, 3)}</span>
                </Badge>
              </TableCell>
              {/* Actions */}
              <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Ouvrir le menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onView(cb)}>
                      <Eye className="mr-2 h-4 w-4" />
                      Voir details
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onCancel(cb)}
                      disabled={cb.status !== 'ACTIVE' || cb.isSystem}
                      className={cn(
                        "text-red-600",
                        cb.isSystem && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <Ban className="mr-2 h-4 w-4" />
                      {cb.isSystem ? "Non modifiable" : "Annuler"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}