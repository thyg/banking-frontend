/**
 * @file components/banking/check-form.tsx
 * @description Formulaire de création et d'édition pour un chèque (émis ou reçu).
 * Utilise react-hook-form pour la gestion de l'état et Zod pour la validation.
 * 
 * @version 2.0.0 - Amélioration UX : Ordre des champs et logique du chéquier.
 */

"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Types
import { Check, CreateCheckData, CheckType, BankAccount, Checkbook } from '@/types/banking';

// API
import { getBankAccounts } from '@/lib/api/banking';
import { getActiveCheckbooksForAccount, peekNextCheckNumber } from '@/lib/api/checkbook';
import { amountToWords } from '@/lib/utils/number-to-words';

// Composants UI
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, FileText, ArrowUpRight, ArrowDownLeft, Calendar, Building2, Clock, Camera, X, Image as ImageIcon } from 'lucide-react';
import { BalanceIndicator } from '@/components/banking/balance-indicator';
import { Card } from '@/components/ui/card';

// =============================================================================
// VALIDATION SCHEMA
// =============================================================================

const checkFormSchema = z.object({
  type: z.enum(['ISSUED', 'RECEIVED'], {
    required_error: "Veuillez sélectionner le type de chèque.",
  }),
  checkbookId: z.string().optional(),
  checkNumber: z
    .string()
    .min(1, { message: "Le numéro de chèque est requis." })
    .max(30, { message: "Le numéro ne peut pas dépasser 30 caractères." }),
  bankAccountId: z.string({
    required_error: "Veuillez sélectionner un compte bancaire.",
  }),
  issueDate: z.string({
    required_error: "La date d'émission est requise.",
  }),
  dueDate: z.string().optional(),
  receiptDate: z.string().optional(),
  issuerBank: z.string().max(100).optional(),
  initialStatus: z.enum(['PENDING', 'RECEIVED', 'DEPOSITED']).optional(),
  imageUrl: z.string().optional(),
  amount: z
    .number({
      required_error: "Le montant est requis.",
      invalid_type_error: "Veuillez entrer un montant valide.",
    })
    .positive({ message: "Le montant doit être positif." }),
  partnerName: z
    .string()
    .min(2, { message: "Le nom doit contenir au moins 2 caractères." })
    .max(100, { message: "Le nom ne peut pas dépasser 100 caractères." }),
  description: z
    .string()
    .max(200, { message: "La description ne peut pas dépasser 200 caractères." })
    .optional()
    .or(z.literal('')),
});

type CheckFormData = z.infer<typeof checkFormSchema>;

// =============================================================================
// PROPS
// =============================================================================

interface CheckFormProps {
  initialData: Check | null;
  preselectedType?: CheckType;
  preselectedAccountId?: string;
  onSave: (data: CreateCheckData) => Promise<void>;
  onCancel: () => void;
}

// =============================================================================
// COMPOSANT
// =============================================================================

export function CheckForm({
  initialData,
  preselectedType,
  preselectedAccountId,
  onSave,
  onCancel,
}: CheckFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [checkbooks, setCheckbooks] = useState<Checkbook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.imageUrl || null);
  
  // NOUVEAU: État pour savoir si le numéro de chèque doit être manuel
  const [isCheckNumberManual, setIsCheckNumberManual] = useState(true);

  const isEditMode = initialData !== null;
  const isProcessed = !!(initialData && !['PENDING', 'RECEIVED'].includes(initialData.status));
  const systemDate = new Date().toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const form = useForm<CheckFormData>({
    resolver: zodResolver(checkFormSchema),
    defaultValues: {
      type: initialData?.checkType ?? preselectedType ?? 'RECEIVED',
      checkbookId: initialData?.checkbookId ?? '',
      checkNumber: initialData?.checkNumber ?? '',
      bankAccountId: initialData?.bankAccountId ?? preselectedAccountId ?? '',
      issueDate: initialData?.issueDate ?? new Date().toISOString().split('T')[0],
      dueDate: initialData?.dueDate ?? '',
      receiptDate: initialData?.receiptDate ?? '',
      issuerBank: initialData?.issuerBank ?? '',
      initialStatus: 'PENDING',
      imageUrl: initialData?.imageUrl ?? '',
      amount: initialData?.amount ?? 0,
      partnerName: initialData?.partnerName ?? '',
      description: initialData?.description ?? '',
    },
  });

  const watchType = form.watch('type');
  const watchAmount = form.watch('amount');
  const amountInWordsText = amountToWords(watchAmount, selectedAccount?.currency || 'FCFA');

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const accountsData = await getBankAccounts();
        setAccounts(accountsData);

        const accountId = form.getValues('bankAccountId');
        if (accountId) {
          const account = accountsData.find(a => a.id === accountId);
          if (account) {
            setSelectedAccount(account);
            const checkbooksData = await getActiveCheckbooksForAccount(account.id);
            setCheckbooks(checkbooksData);
          }
        }
      } catch (error) {
        console.error("[CheckForm] Erreur chargement comptes:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [form]);

  const handleAccountChange = async (accountId: string) => {
    const account = accounts.find(a => a.id === accountId);
    if (account) {
      setSelectedAccount(account);
      form.setValue('checkbookId', '');
      form.setValue('checkNumber', '');
      setIsCheckNumberManual(true); // Réinitialiser
      try {
        const checkbooksData = await getActiveCheckbooksForAccount(account.id);
        setCheckbooks(checkbooksData);
      } catch (error) {
        console.error("[CheckForm] Erreur chargement chéquiers:", error);
        setCheckbooks([]);
      }
    }
  };

  const handleCheckbookChange = async (checkbookId: string) => {
    const checkbook = checkbooks.find(cb => cb.id === checkbookId);
    if (checkbook) {
      // Si c'est un chéquier physique (REEL), le numéro est automatique et non modifiable
      if (checkbook.type === 'REEL') {
        setIsCheckNumberManual(false);
        try {
          const checkNumber = await peekNextCheckNumber(checkbookId);
          form.setValue('checkNumber', checkNumber);
          form.clearErrors('checkNumber');
        } catch (error) {
          form.setError('checkbookId', { message: 'Impossible de réserver le prochain numéro.' });
        }
      } else {
        // Pour les chéquiers fictifs/ERP, la saisie est manuelle
        setIsCheckNumberManual(true);
        form.setValue('checkNumber', '');
      }
    } else {
      setIsCheckNumberManual(true);
    }
  };

const handleSubmit = async (data: CheckFormData) => {
  setIsSubmitting(true);
  try {
    // 1. On crée un nouvel objet 'saveData' qui sera envoyé à l'API.
    //    Ce nouvel objet doit avoir exactement la structure de 'CreateCheckData'.
    const saveData: CreateCheckData = {

      // 2. On prend la valeur de 'data.type' et on la met dans 'checkType'.
      //    C'est ici que l'on corrige l'incohérence de nom.
      checkType: data.type, 
      
      // 3. On prend les autres valeurs de 'data' et on les assigne aux bons champs.
      //    Les '|| undefined' sont une bonne pratique pour s'assurer qu'on n'envoie
      //    pas de chaînes de caractères vides "" si le champ n'est pas rempli.
      checkbookId: data.checkbookId || undefined,
      checkNumber: data.checkNumber,
      bankAccountId: data.bankAccountId,
      issueDate: data.issueDate,
      dueDate: data.dueDate || undefined,
      
      // 4. On corrige aussi le nom 'receptionDate' en 'receiptDate'.
      receiptDate: data.receiptDate || undefined, 
      
      issuerBank: data.issuerBank || undefined,
      imageUrl: data.imageUrl || undefined,
      amount: data.amount,
      partnerName: data.partnerName,
      description: data.description || undefined,
    };

    // 5. On appelle 'onSave' avec notre objet 'saveData' qui est maintenant 100% correct.
    //    TypeScript est content, car il n'y a plus d'incohérence.
    await onSave(saveData);

  } catch (error) {
    // ...
  } finally {
    setIsSubmitting(false);
  }
};

  if (isLoading) {
    return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b">
          <div className="p-2 bg-purple-100 rounded-lg"><FileText className="h-5 w-5 text-purple-600" /></div>
          <div>
            <h3 className="font-semibold text-gray-900">{isEditMode ? 'Modifier le chèque' : 'Nouveau chèque'}</h3>
            <p className="text-sm text-gray-500">{isEditMode ? 'Modifiez les informations.' : 'Enregistrez un chèque émis ou reçu.'}</p>
          </div>
        </div>

        {isProcessed && <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">⚠️ Ce chèque a déjà été traité et ne peut plus être modifié.</div>}

        <FormField control={form.control} name="type" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-base font-semibold">Je souhaite...</FormLabel>
            <FormControl>
              <RadioGroup onValueChange={field.onChange} value={field.value} className="grid grid-cols-1 sm:grid-cols-2 gap-3" disabled={isEditMode}>
                <label htmlFor="received" className="cursor-pointer">
                  <Card className={`p-4 transition-all hover:border-green-400 ${field.value === 'RECEIVED' ? 'border-2 border-green-500 bg-green-50' : `border hover:bg-green-50/50`} ${isEditMode ? 'opacity-60 cursor-not-allowed' : ''}`}>
                    <div className="flex items-start gap-3"><RadioGroupItem value="RECEIVED" id="received" className="mt-1" /><div className="flex-1"><div className="flex items-center gap-2 font-medium"><ArrowDownLeft className="h-5 w-5 text-green-600" /><span>RECEVOIR un chèque</span></div><p className="text-sm text-muted-foreground mt-1">Encaisser un paiement d'un tiers</p></div></div>
                  </Card>
                </label>
                <label htmlFor="issued" className="cursor-pointer">
                  <Card className={`p-4 transition-all hover:border-red-400 ${field.value === 'ISSUED' ? 'border-2 border-red-500 bg-red-50' : `border hover:bg-red-50/50`} ${isEditMode ? 'opacity-60 cursor-not-allowed' : ''}`}>
                    <div className="flex items-start gap-3"><RadioGroupItem value="ISSUED" id="issued" className="mt-1" /><div className="flex-1"><div className="flex items-center gap-2 font-medium"><ArrowUpRight className="h-5 w-5 text-red-600" /><span>ÉMETTRE un chèque</span></div><p className="text-sm text-muted-foreground mt-1">Payer un fournisseur ou un tiers</p></div></div>
                  </Card>
                </label>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border text-sm"><Clock className="h-4 w-4 text-gray-500" /><span className="text-gray-600">Date système :</span><span className="font-medium">{systemDate}</span></div>

        <FormField control={form.control} name="bankAccountId" render={({ field }) => (
          <FormItem>
            <FormLabel>Compte bancaire *</FormLabel>
            <Select onValueChange={(value) => { field.onChange(value); handleAccountChange(value); }} value={field.value} disabled={isEditMode}>
              <FormControl><SelectTrigger><SelectValue placeholder="Sélectionnez un compte..." /></SelectTrigger></FormControl>
              <SelectContent>{accounts.map(account => (<SelectItem key={account.id} value={account.id}>{account.name} ({account.currency})</SelectItem>))}</SelectContent>
            </Select>
            {selectedAccount && watchType === 'ISSUED' && <div className="mt-3"><BalanceIndicator balanceInfo={{ currentBalance: selectedAccount.currentBalance || 0, overdraftLimit: selectedAccount.overdraftLimit || 0, availableBalance: (selectedAccount.currentBalance || 0) + ((selectedAccount.overdraftAuthorized ? (selectedAccount.overdraftLimit || 0) : 0)), overdraftUsed: ((selectedAccount.currentBalance || 0) < 0 ? Math.abs(selectedAccount.currentBalance || 0) : 0), overdraftAuthorized: selectedAccount.overdraftAuthorized || false, }} pendingAmount={watchAmount > 0 ? watchAmount : 0} currency={selectedAccount.currency || 'XAF'} /></div>}
            {selectedAccount && watchType === 'RECEIVED' && <div className="mt-2 p-3 rounded-lg border bg-blue-50 border-blue-200 text-blue-700"><div className="flex justify-between items-center"><span className="text-sm font-medium">Solde actuel :</span><span className="font-bold">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: selectedAccount.currency || 'XAF', minimumFractionDigits: selectedAccount.currency === 'XAF' ? 0 : 2 }).format(selectedAccount.currentBalance || 0)}</span></div></div>}
            <FormMessage />
          </FormItem>
        )} />
        
        {/* --- NOUVEL ORDRE DES CHAMPS --- */}

        {watchType === 'ISSUED' && (
          <FormField control={form.control} name="checkbookId" render={({ field }) => (
            <FormItem>
              <FormLabel>Chéquier *</FormLabel>
              {checkbooks.length > 0 ? (
                <Select onValueChange={(value) => { field.onChange(value); handleCheckbookChange(value); }} value={field.value} disabled={isProcessed}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Sélectionnez un chéquier..." /></SelectTrigger></FormControl>
                  <SelectContent>{checkbooks.map(cb => (<SelectItem key={cb.id} value={cb.id}>{cb.isSystem ? `Chéquier ERP (numéro manuel)` : `${cb.prefix} | ${cb.availableChecks} chèques restants`}</SelectItem>))}</SelectContent>
                </Select>
              ) : (
                <div className="p-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md">
                  {selectedAccount ? "Aucun chéquier actif pour ce compte. Veuillez d'abord en créer un." : "Veuillez d'abord sélectionner un compte bancaire."}
                </div>
              )}
              <FormMessage />
            </FormItem>
          )} />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField control={form.control} name="checkNumber" render={({ field }) => (
            <FormItem>
              <FormLabel>Numéro de chèque *</FormLabel>
              <FormControl>
                <Input placeholder="Saisir ou générer..." {...field} disabled={isProcessed || !isCheckNumberManual} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          
          <FormField control={form.control} name="partnerName" render={({ field }) => (
            <FormItem>
              <FormLabel>{watchType === 'ISSUED' ? 'Bénéficiaire *' : 'Émetteur *'}</FormLabel>
              <FormControl>
                <Input placeholder={watchType === 'ISSUED' ? "Nom du bénéficiaire" : "Nom de l'émetteur"} {...field} disabled={isProcessed} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        
        {/* --- FIN DU NOUVEL ORDRE --- */}

        {watchType === 'RECEIVED' && (
          <>
            <FormField control={form.control} name="issuerBank" render={({ field }) => (
              <FormItem><FormLabel className="flex items-center gap-2"><Building2 className="h-4 w-4" />Banque émettrice</FormLabel><FormControl><Input placeholder="Ex: Afriland First Bank, BICEC..." {...field} disabled={isProcessed} /></FormControl><FormDescription>Banque sur laquelle le chèque est tiré (optionnel)</FormDescription><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="receiptDate" render={({ field }) => (
              <FormItem><FormLabel>Date de réception</FormLabel><FormControl><Input type="date" {...field} disabled={isProcessed} /></FormControl><FormDescription>Date à laquelle vous avez reçu le chèque (optionnel)</FormDescription><FormMessage /></FormItem>
            )} />
            {!isEditMode && (<FormField control={form.control} name="initialStatus" render={({ field }) => (
              <FormItem><FormLabel>État initial *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Sélectionnez l'état..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="PENDING"><div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-gray-400" />Créé (en attente)</div></SelectItem><SelectItem value="RECEIVED"><div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500" />Reçu (en main)</div></SelectItem><SelectItem value="DEPOSITED"><div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-500" />Déjà déposé en banque</div></SelectItem></SelectContent></Select><FormDescription>L'état actuel du chèque au moment de l'enregistrement</FormDescription><FormMessage /></FormItem>
            )} />)}
          </>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField control={form.control} name="issueDate" render={({ field }) => (<FormItem><FormLabel>Date d'émission *</FormLabel><FormControl><Input type="date" {...field} disabled={isProcessed} /></FormControl><FormMessage /></FormItem>)} />
          {watchType === 'RECEIVED' && (<FormField control={form.control} name="dueDate" render={({ field }) => (<FormItem><FormLabel>Date d'échéance</FormLabel><FormControl><Input type="date" {...field} disabled={isProcessed} /></FormControl><FormDescription>Date à laquelle le chèque peut être encaissé</FormDescription><FormMessage /></FormItem>)} />)}
        </div>

        <FormField control={form.control} name="amount" render={({ field }) => (
          <FormItem><FormLabel>Montant *</FormLabel><FormControl><div className="flex h-10 items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:outline-none"><Input type="number" step="0.01" min="0" placeholder="0.00" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} disabled={isProcessed} className="h-full flex-1 border-none p-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none" /><span className="text-gray-500 text-sm">{selectedAccount?.currency || 'EUR'}</span></div></FormControl><FormMessage /></FormItem>
        )} />
        <FormItem><FormLabel>Montant en lettres</FormLabel><FormControl><Input readOnly value={amountInWordsText} className="bg-gray-100 italic" /></FormControl></FormItem>
        
        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem><FormLabel>Objet / Motif</FormLabel><FormControl><Input placeholder="Ex: Règlement facture FA-2024-001" {...field} disabled={isProcessed} /></FormControl><FormMessage /></FormItem>
        )} />
        
        <FormField control={form.control} name="imageUrl" render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2"><Camera className="h-4 w-4" />Photo du chèque</FormLabel>
              <FormControl>
                <div className="space-y-3">
                  {imagePreview ? (
                    <div className="relative inline-block">
                      <img src={imagePreview} alt="Aperçu du chèque" className="max-h-40 rounded-lg border object-cover" />
                      {!isProcessed && (<button type="button" onClick={() => { setImagePreview(null); field.onChange(''); }} className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"><X className="h-3 w-3" /></button>)}
                    </div>
                  ) : (
                    <label className={`flex flex-col items-center gap-2 p-6 border-2 border-dashed rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors ${isProcessed ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      <ImageIcon className="h-8 w-8 text-gray-400" /><span className="text-sm text-gray-500">Cliquez ou glissez une photo</span><span className="text-xs text-gray-400">JPG, PNG (max 5 Mo)</span>
                      <Input type="file" accept="image/*" capture="environment" className="hidden" disabled={isProcessed} onChange={(e) => { const file = e.target.files?.[0]; if (file) { if (file.size > 5 * 1024 * 1024) { alert('Le fichier ne doit pas dépasser 5 Mo'); return; } const reader = new FileReader(); reader.onload = (event) => { const dataUrl = event.target?.result as string; setImagePreview(dataUrl); field.onChange(dataUrl); }; reader.readAsDataURL(file); } }} />
                    </label>
                  )}
                </div>
              </FormControl>
              <FormDescription>Prenez une photo ou importez une image du chèque (optionnel)</FormDescription><FormMessage />
            </FormItem>
        )} />

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting} className="w-full sm:w-auto">Annuler</Button>
          {!isProcessed && <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {isEditMode ? 'Enregistrer' : 'Créer le chèque'}</Button>}
        </div>
      </form>
    </Form>
  );
}