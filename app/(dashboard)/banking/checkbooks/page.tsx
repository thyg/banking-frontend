/**
 * @file app/(dashboard)/banking/checkbooks/page.tsx
 * @description Page de gestion des chéquiers.
 * Affiche la liste des chéquiers et permet d'en ajouter de nouveaux.
 *
 * @version 1.1.0
 * @date 2024-12-25
 * @changelog Connexion à la vraie API backend (suppression des mocks)
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
  const [selectedCheckbook, setSelectedCheckbook] = useState<Checkbook | null>(null);
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
      if (selectedCheckbook) {
        // Les chéquiers ne peuvent pas être modifiés après création
        toast({
          title: "Information",
          description: "Les chéquiers ne peuvent pas être modifiés.",
          variant: "default",
        });
      } else {
        await createCheckbook(data);
        toast({ title: "Succès", description: "Nouveau chéquier créé." });
      }
      fetchCheckbooks();
      setIsFormOpen(false);
      setSelectedCheckbook(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "L'opération a échoué.";
      toast({
        title: "Erreur",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleView = (checkbook: Checkbook) => {
    // Ouvrir le formulaire en mode lecture seule
    setSelectedCheckbook(checkbook);
    setIsFormOpen(true);
  };

  const handleCancel = async (checkbook: Checkbook) => {
    // Empêcher l'annulation du chéquier par défaut
    if (checkbook.id === 'default-erp-checkbook') {
      toast({
        title: "Action non autorisée",
        description: "Le chéquier ERP par défaut ne peut pas être annulé.",
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
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold flex items-center">
            <BookOpen className="mr-4 h-8 w-8" />
            Gestion des Chéquiers
          </h1>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setSelectedCheckbook(null)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nouveau Chéquier
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{selectedCheckbook ? "Modifier le" : "Créer un"} chéquier</DialogTitle>
                <DialogDescription>
                  {selectedCheckbook ? "Les chéquiers ne peuvent pas être modifiés." : "Ajoutez un nouveau chéquier pour un compte bancaire."}
                </DialogDescription>
              </DialogHeader>
              <CheckbookForm
                initialData={selectedCheckbook}
                onSave={handleSave}
                onCancel={() => setIsFormOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Liste des chéquiers</CardTitle>
            <CardDescription>
              Affichez et gérez les chéquiers de vos comptes bancaires.
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
    </>
  );
}
