/**
 * @file components/banking/checkbook-list.tsx
 * @description Affiche une liste de chéquiers sous forme de tableau.
 * 
 * @version 1.0.0
 * @date 2024-12-24
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
import { MoreHorizontal, Eye, Ban } from 'lucide-react';
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
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Compte Bancaire</TableHead>
            <TableHead>RIB</TableHead>
            <TableHead>Plage de numéros</TableHead>
            <TableHead>N° Actuel</TableHead>
            <TableHead>Chèques Restants</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {checkbooks.map((cb) => (
            <TableRow key={cb.id}>
              <TableCell className="font-medium">{cb.bankAccountName}</TableCell>
              <TableCell className="font-mono text-xs">{cb.rib}</TableCell>
              <TableCell>{cb.startNumber} - {cb.endNumber}</TableCell>
              <TableCell>{cb.currentNumber}</TableCell>
              <TableCell>{cb.availableChecks}</TableCell>
              <TableCell>
                <Badge variant={getStatusVariant(cb.status)} className={cn(
                  cb.status === 'ACTIVE' && 'bg-green-100 text-green-800',
                  cb.status === 'FINISHED' && 'bg-gray-100 text-gray-800',
                  cb.status === 'CANCELLED' && 'bg-red-100 text-red-800',
                )}>
                  {cb.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
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
                      Voir
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onCancel(cb)}
                      disabled={cb.status !== 'ACTIVE'}
                      className="text-red-600"
                    >
                      <Ban className="mr-2 h-4 w-4" />
                      Annuler
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