/**
 * @file components/banking/bank-account-card.tsx
 * @description Composant de présentation pour une seule carte de compte bancaire.
 * Affiche les détails clés et les actions disponibles pour un compte.
 */

"use client";

import React from 'react';
import { BankAccount } from '@/types/banking';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Upload, Pencil, Trash2 } from 'lucide-react';

// Fonctions utilitaires - Idéalement, celles-ci devraient vivre dans un fichier partagé comme `lib/utils.ts`
const formatCurrency = (amount: number, currencyCode: string = 'EUR') => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currencyCode,
  }).format(amount);
};

const maskAccountNumber = (accountNumber: string) => {
  if (accountNumber.length <= 8) {
    return accountNumber; // Ne pas masquer si le numéro est trop court
  }
  // Affiche les 4 premiers et les 4 derniers caractères (standard pour les IBAN)
  return `${accountNumber.slice(0, 4)} **** **** ${accountNumber.slice(-4)}`;
};

// Définition des props
interface BankAccountCardProps {
  account: BankAccount;
  onEdit: (account: BankAccount) => void;
  onDelete: (account: BankAccount) => void;
  onUpload: (accountId: string) => void;
}

export function BankAccountCard({ account, onEdit, onDelete, onUpload }: BankAccountCardProps) {
  return (
    <Card className="flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader className="flex-row items-start justify-between">
        <div>
          <CardTitle className="text-lg font-semibold">{account.name}</CardTitle>
          <CardDescription>{account.bankName}</CardDescription>
        </div>
        {/* Menu d'actions secondaires */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(account)}>
              <Pencil className="mr-2 h-4 w-4" />
              <span>Modifier</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(account)} className="text-red-600 focus:text-red-600">
              <Trash2 className="mr-2 h-4 w-4" />
              <span>Supprimer</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      
      <CardContent className="flex-grow">
        <div className="mb-4">
          <p className="text-sm text-gray-500">Numéro de compte</p>
          <p className="font-mono text-gray-800">{maskAccountNumber(account.accountNumber)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Solde actuel</p>
          <p className="text-3xl font-bold text-gray-900">
            {formatCurrency(account.currentBalance, account.currency)}
          </p>
        </div>
      </CardContent>
      
      <CardFooter>
        {/* Action principale */}
        <Button className="w-full" onClick={() => onUpload(account.id)}>
          <Upload className="mr-2 h-4 w-4" />
          Importer un relevé
        </Button>
      </CardFooter>
    </Card>
  );
}