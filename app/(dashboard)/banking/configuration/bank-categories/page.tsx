"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { BankCategory, BankCategoryRequest } from '@/types/banking';
import {
  getBankCategories,
  createBankCategory,
  updateBankCategory,
  deleteBankCategory,
} from '@/lib/api/banking';
import { BankCategoryList } from '@/components/banking/settings/bank-category-list';
import { BankCategoryForm } from '@/components/banking/settings/bank-category-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';

export default function BankCategoriesPage() {
  const { toast } = useToast();

  const [categories, setCategories] = useState<BankCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<BankCategory | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<BankCategory | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getBankCategories();
      setCategories(data);
    } catch (error) {
      console.error("Erreur chargement catégories:", error);
      toast({
        title: "Erreur de chargement",
        description: "Impossible de charger les catégories.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleAddNew = () => {
    setEditingCategory(null);
    setIsFormOpen(true);
  };

  const handleEdit = (category: BankCategory) => {
    setEditingCategory(category);
    setIsFormOpen(true);
  };

  const handleSave = async (data: BankCategoryRequest) => {
    try {
      if (editingCategory) {
        await updateBankCategory(editingCategory.id, data);
        toast({
          title: "Catégorie modifiée",
          description: `La catégorie "${data.label}" a été mise à jour.`,
        });
      } else {
        await createBankCategory(data);
        toast({
          title: "Catégorie créée",
          description: `La catégorie "${data.label}" a été créée.`,
        });
      }
      setIsFormOpen(false);
      setEditingCategory(null);
      await fetchCategories();
    } catch (error) {
      console.error("Erreur sauvegarde:", error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de sauvegarder.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = (category: BankCategory) => {
    setCategoryToDelete(category);
  };

  const confirmDelete = async () => {
    if (!categoryToDelete) return;
    setIsSubmitting(true);
    try {
      await deleteBankCategory(categoryToDelete.id);
      toast({
        title: "Catégorie supprimée",
        description: `La catégorie "${categoryToDelete.label}" a été supprimée.`,
      });
      setCategoryToDelete(null);
      await fetchCategories();
    } catch (error) {
      console.error("Erreur suppression:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer. La catégorie est peut-être utilisée par des banques.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Catégories de banques</h2>
          <p className="text-muted-foreground">
            Gérez les catégories d'institutions financières (Banque, Mobile Money, Microfinance...).
          </p>
        </div>

        <BankCategoryList
          categories={categories}
          isLoading={isLoading}
          onAddNew={handleAddNew}
          onRefresh={fetchCategories}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? `Modifier "${editingCategory.label}"` : 'Nouvelle catégorie'}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? "Modifiez les informations de la catégorie."
                : "Ajoutez une nouvelle catégorie d'institution financière."
              }
            </DialogDescription>
          </DialogHeader>
          <BankCategoryForm
            initialData={editingCategory}
            onSave={handleSave}
            onCancel={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!categoryToDelete}
        onOpenChange={(open) => !open && setCategoryToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Supprimer la catégorie "{categoryToDelete?.label}" ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Les banques associées à cette catégorie
              perdront leur lien de catégorie.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
