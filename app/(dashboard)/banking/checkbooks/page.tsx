/**
 * @file app/(dashboard)/banking/checkbooks/page.tsx
 * @description Page de gestion des chéquiers.
 * Affiche la liste des chéquiers avec popup de détails et formulaire de création.
 *
 * @version 2.0.0
 * @date 2024-12-31
 * @changelog
 * - Ajout du popup de détails (CheckbookDetailDialog)
 * - Séparation du formulaire et de la vue détails
 */
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { PlusCircle, BookOpen } from 'lucide-react';

// Types
import { Checkbook } from '@/types/banking';

// Composants UI
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from "@/components/ui/use-toast";
import { CheckbookList } from '@/components/banking/checkbook-list';
import { CheckbookForm } from '@/components/banking/checkbook-form';
import { CheckbookDetailDialog } from '@/components/banking/checkbook-detail-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// API - Connexion au backend
import {
  getCheckbooks,
  createCheckbook,
  cancelCheckbook,
  type CreateCheckbookData
} from '@/lib/api/checkbook';


export default function CheckbooksPage() {
  const [checkbooks, setCheckbooks] = useState<Checkbook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // État pour le popup de détails
  const [selectedCheckbook, setSelectedCheckbook] = useState<Checkbook | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const { toast } = useToast();

  const fetchCheckbooks = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getCheckbooks();
      setCheckbooks(data);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les chéquiers.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCheckbooks();
  }, [fetchCheckbooks]);

  const handleSave = async (data: CreateCheckbookData) => {
    try {
      await createCheckbook(data);
      toast({ title: "Succès", description: "Nouveau chéquier créé." });
      fetchCheckbooks();
      setIsFormOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "L'opération a échoué.";
      toast({
        title: "Erreur",
        description: message,
        variant: "destructive",
      });
    }
  };

  /**
   * Ouvre le popup de détails du chéquier
   */
  const handleView = (checkbook: Checkbook) => {
    setSelectedCheckbook(checkbook);
    setIsDetailOpen(true);
  };

  const handleCancel = async (checkbook: Checkbook) => {
    // Empêcher l'annulation du chéquier système
    if (checkbook.isSystem) {
      toast({
        title: "Action non autorisée",
        description: "Le chéquier système ne peut pas être annulé.",
        variant: "destructive",
      });
      return;
    }

    try {
      await cancelCheckbook(checkbook.id);
      toast({
        title: "Succès",
        description: `Le chéquier ${checkbook.prefix} a été annulé.`,
      });
      fetchCheckbooks();
    } catch (error) {
      const message = error instanceof Error ? error.message : "L'annulation a échoué.";
      toast({
        title: "Erreur",
        description: message,
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <div className="space-y-4 p-4 sm:p-6">
        {/* Header responsive */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center">
            <BookOpen className="mr-2 sm:mr-4 h-6 w-6 sm:h-8 sm:w-8" />
            Gestion des Chéquiers
          </h1>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <PlusCircle className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Nouveau Chéquier</span>
                <span className="sm:hidden">Nouveau</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="flex flex-col w-[95vw] max-w-[500px] max-h-[90vh] p-0 sm:p-0">
              <DialogHeader className="flex-shrink-0 px-4 pt-4 sm:px-6 sm:pt-6">
                <DialogTitle className="text-lg sm:text-xl">Créer un chéquier</DialogTitle>
                <DialogDescription className="text-sm">
                  Ajoutez un nouveau chéquier pour un compte bancaire.
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto px-4 pb-4 sm:px-6 sm:pb-6">
                <CheckbookForm
                  initialData={null}
                  onSave={handleSave}
                  onCancel={() => setIsFormOpen(false)}
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Liste des chéquiers</CardTitle>
            <CardDescription>
              Cliquez sur un chéquier pour voir ses détails et statistiques.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CheckbookList
              checkbooks={checkbooks}
              isLoading={isLoading}
              onView={handleView}
              onCancel={handleCancel}
            />
          </CardContent>
        </Card>
      </div>

      {/* Popup de détails du chéquier */}
      <CheckbookDetailDialog
        checkbook={selectedCheckbook}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        currency="XAF"
      />
    </>
  );
}
