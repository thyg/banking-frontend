/**
 * @file components/banking/statement-uploader.tsx
 * @description Composant d'upload de releves bancaires.
 * 
 * @version 1.1.0 - Fix: Props onUploadComplete corrigee
 */

"use client";

import React, { useState, useCallback } from 'react';
import { BankAccount } from '@/types/banking';

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
  accounts: BankAccount[];
  onUploadComplete: (statementId: string) => void;
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

// =============================================================================
// COMPOSANT PRINCIPAL
// =============================================================================

export function StatementUploader({
  accounts,
  onUploadComplete,
  onCancel,
}: StatementUploaderProps) {
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [statementName, setStatementName] = useState<string>('');

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
    if (!selectedFile || !selectedAccountId) return;

    setUploadState('uploading');
    setUploadProgress(0);

    try {
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        setUploadProgress(i);
      }

      setUploadState('processing');

      await new Promise(resolve => setTimeout(resolve, 1500));

      setUploadState('success');

      setTimeout(() => {
        onUploadComplete('stmt-new-' + Date.now());
      }, 1000);
    } catch (error) {
      setErrorMessage('Erreur lors de l\'upload');
      setUploadState('error');
    }
  };

  const handleReset = () => {
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

      {/* Selection du compte */}
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
          disabled={!selectedFile || !selectedAccountId}
        >
          <Upload className="mr-2 h-4 w-4" />
          Importer
        </Button>
      </div>
    </div>
  );
}