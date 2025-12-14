/**
 * @file components/banking/statement-uploader.tsx
 * @description Composant d'upload de releves bancaires.
 *
 * @version 1.3.0 - Fix: Parsing CSV et creation des lignes du releve
 */

"use client";

import React, { useState, useCallback, useRef } from 'react';
import { BankAccount, CreateBankStatementRequest, CreateStatementLineRequest, TransactionDirection } from '@/types/banking';
import { createBankStatement, createStatementLinesBatch } from '@/lib/api/banking';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  FileSpreadsheet,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export interface StatementUploaderProps {
  accounts?: BankAccount[];
  accountId?: string;
  onUploadComplete?: (statementId: string) => void;
  onUploadSuccess?: (statement: { id: string }) => void;
  onCancel: () => void;
}

type UploadState = 'idle' | 'selected' | 'uploading' | 'processing' | 'success' | 'error';

interface FileInfo {
  name: string;
  size: number;
  type: string;
}

// =============================================================================
// UTILITAIRES
// =============================================================================

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function getFileIcon(type: string) {
  if (type.includes('csv') || type.includes('spreadsheet')) {
    return <FileSpreadsheet className="h-8 w-8 text-green-600" />;
  }
  return <FileText className="h-8 w-8 text-blue-600" />;
}

/**
 * Parse une date au format DD/MM/YYYY vers YYYY-MM-DD
 */
function parseDateFR(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  const parts = dateStr.trim().split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return dateStr;
}

/**
 * Parse le contenu d'un fichier CSV de releve bancaire.
 * Format attendu: date;date_valeur;montant;sens;reference;libelle;nom_tiers
 */
function parseCSV(content: string): {
  lines: Array<{
    date: string;
    valueDate: string;
    amount: number;
    direction: TransactionDirection;
    reference: string;
    description: string;
    partnerName: string;
  }>;
  startDate: string;
  endDate: string;
  openingBalance: number;
  closingBalance: number;
} {
  const rows = content.trim().split('\n').filter(row => row.trim());
  const lines: Array<{
    date: string;
    valueDate: string;
    amount: number;
    direction: TransactionDirection;
    reference: string;
    description: string;
    partnerName: string;
  }> = [];

  let startDate = '';
  let endDate = '';
  let runningBalance = 0;
  let openingBalance = 0;

  // Detecter le separateur (point-virgule ou virgule)
  const firstLine = rows[0] || '';
  const separator = firstLine.includes(';') ? ';' : ',';

  // Trouver l'index de la ligne d'en-tete
  let headerIndex = 0;
  for (let i = 0; i < rows.length; i++) {
    const lower = rows[i].toLowerCase();
    if (lower.includes('date') && (lower.includes('montant') || lower.includes('amount'))) {
      headerIndex = i;
      break;
    }
  }

  // Parser les lignes de donnees
  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i].trim();
    if (!row) continue;

    const cols = row.split(separator).map(c => c.trim().replace(/^"|"$/g, ''));

    // Format: date;date_valeur;montant;sens;reference;libelle;nom_tiers
    const [dateStr, valueDateStr, amountStr, sensStr, reference, description, partnerName] = cols;

    if (!dateStr || !amountStr) continue;

    const date = parseDateFR(dateStr);
    const valueDate = parseDateFR(valueDateStr || dateStr);
    const amount = Math.abs(parseFloat(amountStr.replace(',', '.').replace(/\s/g, '')) || 0);

    // Determiner la direction
    let direction: TransactionDirection = 'DEBIT';
    if (sensStr) {
      direction = sensStr.toUpperCase().includes('CREDIT') ? 'CREDIT' : 'DEBIT';
    } else {
      // Si pas de colonne sens, utiliser le signe du montant
      const rawAmount = parseFloat(amountStr.replace(',', '.').replace(/\s/g, '')) || 0;
      direction = rawAmount >= 0 ? 'CREDIT' : 'DEBIT';
    }

    // Calculer le solde courant
    if (direction === 'CREDIT') {
      runningBalance += amount;
    } else {
      runningBalance -= amount;
    }

    // Garder la premiere et derniere date
    if (!startDate || date < startDate) startDate = date;
    if (!endDate || date > endDate) endDate = date;

    lines.push({
      date,
      valueDate,
      amount,
      direction,
      reference: reference || '',
      description: description || '',
      partnerName: partnerName || '',
    });
  }

  // Si la premiere ligne est "Solde ouverture", l'utiliser comme solde d'ouverture
  if (lines.length > 0 && lines[0].description?.toLowerCase().includes('solde')) {
    openingBalance = lines[0].direction === 'CREDIT' ? lines[0].amount : -lines[0].amount;
  }

  return {
    lines,
    startDate: startDate || new Date().toISOString().split('T')[0],
    endDate: endDate || new Date().toISOString().split('T')[0],
    openingBalance,
    closingBalance: openingBalance + runningBalance,
  };
}

// =============================================================================
// COMPOSANT PRINCIPAL
// =============================================================================

export function StatementUploader({
  accounts = [],
  accountId,
  onUploadComplete,
  onUploadSuccess,
  onCancel,
}: StatementUploaderProps) {
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accountId || '');
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [statementName, setStatementName] = useState<string>('');

  // Reference au fichier reel pour le parsing
  const fileRef = useRef<File | null>(null);

  const acceptedFormats = '.csv,.ofx,.qif,.txt';

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setErrorMessage('Le fichier est trop volumineux (max 10 Mo)');
      setUploadState('error');
      return;
    }

    const validTypes = ['text/csv', 'application/x-ofx', 'text/plain'];
    const validExtensions = ['.csv', '.ofx', '.qif', '.txt'];
    const hasValidExtension = validExtensions.some(ext => 
      file.name.toLowerCase().endsWith(ext)
    );

    if (!validTypes.includes(file.type) && !hasValidExtension) {
      setErrorMessage('Format de fichier non supporte');
      setUploadState('error');
      return;
    }

    // Garder le fichier reel pour le parsing
    fileRef.current = file;

    setSelectedFile({
      name: file.name,
      size: file.size,
      type: file.type,
    });
    setStatementName(file.name.replace(/\.[^/.]+$/, ''));
    setUploadState('selected');
    setErrorMessage('');
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const file = event.dataTransfer.files?.[0];
    if (file) {
      const input = document.createElement('input');
      input.type = 'file';
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      
      handleFileChange({ target: input } as React.ChangeEvent<HTMLInputElement>);
    }
  }, [handleFileChange]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleUpload = async () => {
    const effectiveAccountId = accountId || selectedAccountId;
    if (!selectedFile || !effectiveAccountId || !fileRef.current) return;

    setUploadState('uploading');
    setUploadProgress(0);

    try {
      // Etape 1: Lire le contenu du fichier
      setUploadProgress(10);
      const fileContent = await fileRef.current.text();

      // Etape 2: Parser le CSV
      setUploadProgress(20);
      const parsed = parseCSV(fileContent);

      if (parsed.lines.length === 0) {
        throw new Error('Aucune transaction trouvee dans le fichier');
      }

      setUploadState('processing');
      setUploadProgress(40);

      // Etape 3: Creer le releve dans le backend
      const today = new Date();

      const request: CreateBankStatementRequest = {
        bankAccountId: effectiveAccountId,
        reference: statementName || selectedFile.name.replace(/\.[^/.]+$/, ''),
        statementDate: today.toISOString().split('T')[0],
        periodStart: parsed.startDate,
        periodEnd: parsed.endDate,
        openingBalance: parsed.openingBalance,
        closingBalance: parsed.closingBalance,
        importSource: 'CSV_UPLOAD',
        fileName: selectedFile.name,
      };

      setUploadProgress(50);

      const statement = await createBankStatement(request);

      setUploadProgress(60);

      // Etape 4: Creer les lignes du releve
      const lineRequests: CreateStatementLineRequest[] = parsed.lines.map((line, index) => ({
        bankStatementId: statement.id,
        lineNumber: index + 1,
        transactionDate: line.date,
        valueDate: line.valueDate,
        amount: line.amount,
        direction: line.direction,
        reference: line.reference,
        description: line.description,
        partnerName: line.partnerName,
      }));

      setUploadProgress(70);

      // Creer les lignes par batch
      await createStatementLinesBatch(statement.id, lineRequests);

      setUploadProgress(100);
      setUploadState('success');

      // Attendre un peu avant de rediriger pour montrer le succes
      setTimeout(() => {
        if (onUploadComplete) {
          onUploadComplete(statement.id);
        }
        if (onUploadSuccess) {
          onUploadSuccess({ id: statement.id });
        }
      }, 1000);
    } catch (error) {
      console.error('Erreur lors de l\'upload:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Erreur lors de l\'upload');
      setUploadState('error');
    }
  };

  const handleReset = () => {
    fileRef.current = null;
    setSelectedFile(null);
    setUploadState('idle');
    setUploadProgress(0);
    setErrorMessage('');
    setStatementName('');
  };

  // Etat succes
  if (uploadState === 'success') {
    return (
      <div className="py-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Import reussi !
        </h3>
        <p className="text-gray-500">
          Le releve a ete importe et est pret pour le rapprochement.
        </p>
      </div>
    );
  }

  // Etat erreur
  if (uploadState === 'error') {
    return (
      <div className="py-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
          <AlertCircle className="h-8 w-8 text-red-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Erreur d'import
        </h3>
        <p className="text-red-600 mb-4">{errorMessage}</p>
        <Button variant="outline" onClick={handleReset}>
          Reessayer
        </Button>
      </div>
    );
  }

  // Etat upload/processing
  if (uploadState === 'uploading' || uploadState === 'processing') {
    return (
      <div className="py-8">
        <div className="text-center mb-6">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900">
            {uploadState === 'uploading' ? 'Telechargement...' : 'Traitement...'}
          </h3>
          <p className="text-gray-500 mt-1">
            {uploadState === 'uploading' 
              ? 'Envoi du fichier en cours'
              : 'Analyse et extraction des transactions'}
          </p>
        </div>
        <Progress value={uploadProgress} className="h-2" />
        <p className="text-center text-sm text-gray-400 mt-2">
          {uploadProgress}%
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Zone de drop / selection de fichier */}
      {!selectedFile ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer"
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <Upload className="h-10 w-10 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">
            Glissez-deposez votre fichier ici
          </p>
          <p className="text-sm text-gray-400 mb-4">
            ou cliquez pour selectionner
          </p>
          <p className="text-xs text-gray-400">
            Formats acceptes: CSV, OFX, QIF (max 10 Mo)
          </p>
          <input
            id="file-input"
            type="file"
            accept={acceptedFormats}
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      ) : (
        <div className="border rounded-lg p-4 bg-gray-50">
          <div className="flex items-center gap-3">
            {getFileIcon(selectedFile.type)}
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{selectedFile.name}</p>
              <p className="text-sm text-gray-500">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleReset}
              className="flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Selection du compte - seulement si pas d'accountId préselectionné */}
      {!accountId && accounts.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="account">Compte bancaire *</Label>
          <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
            <SelectTrigger id="account">
              <SelectValue placeholder="Selectionnez le compte..." />
            </SelectTrigger>
            <SelectContent>
              {accounts.map(account => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name} ({account.currency})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Nom du releve */}
      <div className="space-y-2">
        <Label htmlFor="statementName">Nom du releve</Label>
        <Input
          id="statementName"
          value={statementName}
          onChange={(e) => setStatementName(e.target.value)}
          placeholder="Ex: Releve Decembre 2024"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button
          onClick={handleUpload}
          disabled={!selectedFile || (!accountId && !selectedAccountId)}
        >
          <Upload className="mr-2 h-4 w-4" />
          Importer
        </Button>
      </div>
    </div>
  );
}