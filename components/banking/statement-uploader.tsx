/**
 * @file components/banking/statement-uploader.tsx
 * @description Composant pour l'upload de relevés bancaires. Gère le drag-and-drop,
 * la sélection de fichier, la validation basique et l'état de l'upload.
 */

"use client";

import React, { useState, useCallback, useRef } from 'react';
import { BankStatement } from '@/types/banking';
import { uploadStatement } from '@/lib/api/banking'; // Fonction API à créer

import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { UploadCloud, FileText, X, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils'; // Utilitaire pour fusionner les classes Tailwind (standard avec shadcn/ui)

// Définition des props
interface StatementUploaderProps {
  accountId: string; // Indispensable pour savoir à quel compte lier le relevé
  onUploadSuccess: (statement: BankStatement) => void; // Pour gérer la redirection/fermeture après succès
  onCancel: () => void;
}

// Constantes pour la validation
const MAX_FILE_SIZE_MB = 5;
const ACCEPTED_FILE_TYPE = 'text/csv';

export function StatementUploader({ accountId, onUploadSuccess, onCancel }: StatementUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileValidation = (selectedFile: File): boolean => {
    if (selectedFile.type !== ACCEPTED_FILE_TYPE) {
      setError(`Type de fichier invalide. Veuillez sélectionner un fichier CSV.`);
      return false;
    }
    if (selectedFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`Le fichier est trop volumineux. La taille maximale est de ${MAX_FILE_SIZE_MB} Mo.`);
      return false;
    }
    setError(null);
    return true;
  };

  const handleFileSelect = (selectedFile: File | undefined) => {
    if (selectedFile && handleFileValidation(selectedFile)) {
      setFile(selectedFile);
    }
  };

  // --- Gestionnaires d'événements pour le Drag-and-Drop ---
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); // Nécessaire pour permettre le drop
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files?.[0]);
  };

  // --- Gestion de la soumission ---
  const handleUpload = async () => {
    if (!file) return;

    setUploadStatus('uploading');
    setError(null);
    try {
      const newStatement = await uploadStatement(accountId, file);
      setUploadStatus('success');
      // Laisser le temps à l'utilisateur de voir le message de succès avant de fermer
      setTimeout(() => onUploadSuccess(newStatement), 1000); 
    } catch (apiError) {
      console.error("Échec de l'upload:", apiError);
      setError("Une erreur est survenue lors de l'envoi du fichier. Veuillez réessayer.");
      setUploadStatus('idle');
    }
  };

  return (
    <div className="p-1">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold">Importer un relevé bancaire</h2>
        <p className="text-gray-500">Sélectionnez un fichier CSV fourni par votre banque.</p>
      </div>

      {!file && (
        <div
          className={cn(
            "relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-200",
            isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
          )}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadCloud className="h-10 w-10 text-gray-400 mb-2" />
          <p className="font-semibold">Glissez-déposez votre fichier ici</p>
          <p className="text-sm text-gray-500">ou cliquez pour le sélectionner</p>
          <p className="text-xs text-gray-400 mt-2">Fichier CSV uniquement, {MAX_FILE_SIZE_MB}Mo max.</p>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_FILE_TYPE}
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files?.[0])}
          />
        </div>
      )}

      {file && (
        <div className="p-4 border rounded-lg bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="h-8 w-8 text-blue-500" />
              <div>
                <p className="font-semibold text-gray-800">{file.name}</p>
                <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(2)} Ko</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setFile(null)} disabled={uploadStatus === 'uploading'}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}

      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end space-x-4 mt-8">
        <Button variant="outline" onClick={onCancel} disabled={uploadStatus === 'uploading'}>
          Annuler
        </Button>
        <Button onClick={handleUpload} disabled={!file || uploadStatus !== 'idle'}>
          {uploadStatus === 'uploading' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {uploadStatus === 'uploading' ? 'Import en cours...' : 'Importer le fichier'}
        </Button>
      </div>
    </div>
  );
}
