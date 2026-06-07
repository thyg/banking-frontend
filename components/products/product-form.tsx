"use client";

import React, { useEffect } from 'react';
import { Product } from '@/types/core';
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Separator } from '../ui/separator';

interface ProductFormProps {
    initialData: Partial<Product> | null;
    onSave: (data: Product) => void;
}

export function ProductForm({ initialData, onSave }: ProductFormProps) {
    const form = useForm<Product>({
        defaultValues: initialData || { name: '', code: '', family: '', mainSupplier: '', isActive: true, isDiscountable: true, isPerishable: false, stock: 0, costPrice: 0, salePrice: 0 },
    });

    useEffect(() => {
        form.reset(initialData || { name: '', code: '', family: '', mainSupplier: '', isActive: true, isDiscountable: true, isPerishable: false, stock: 0, costPrice: 0, salePrice: 0 });
    }, [initialData, form]);

    const onSubmit = (data: Product) => {
        onSave(data);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="h-full flex flex-col">
                <div className="flex-1 p-6 overflow-y-auto space-y-6">
                    <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem><FormLabel>Libellé de l'article *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        <FormField control={form.control} name="code" render={({ field }) => (
                            <FormItem><FormLabel>Code Vente *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="supplierRef" render={({ field }) => (
                            <FormItem><FormLabel>Réf. Fournisseur</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                        )} />
                        <FormField control={form.control} name="family" render={({ field }) => (
                            <FormItem><FormLabel>Famille</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Sélectionner..."/></SelectTrigger></FormControl><SelectContent><SelectItem value="Cimenterie">Cimenterie</SelectItem><SelectItem value="Tôlerie">Tôlerie</SelectItem><SelectItem value="Peinture">Peinture</SelectItem><SelectItem value="Ferraillage">Ferraillage</SelectItem><SelectItem value="Electricité">Electricité</SelectItem><SelectItem value="Plomberie">Plomberie</SelectItem></SelectContent></Select></FormItem>
                        )}/>
                        <FormField control={form.control} name="mainSupplier" render={({ field }) => (
                            <FormItem><FormLabel>Fournisseur Principal</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Sélectionner..."/></SelectTrigger></FormControl><SelectContent><SelectItem value="CIMENCAM">CIMENCAM</SelectItem><SelectItem value="ALUCAM">ALUCAM</SelectItem><SelectItem value="SOFAP">SOFAP</SelectItem><SelectItem value="PROMETAL">PROMETAL</SelectItem></SelectContent></Select></FormItem>
                        )}/>
                    </div>
                    
                    <Separator />

                    <div className="space-y-4">
                        <FormField control={form.control} name="isDiscountable" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><FormLabel>Remise Autorisée ?</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange}/></FormControl></FormItem>)} />
                        <FormField control={form.control} name="isPerishable" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><FormLabel>Produit Périssable ?</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange}/></FormControl></FormItem>)} />
                        <FormField control={form.control} name="isActive" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><FormLabel>Article Actif ?</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange}/></FormControl></FormItem>)} />
                    </div>
                </div>
                
                <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                        <Save className="h-4 w-4 mr-2"/>
                        {form.formState.isSubmitting ? 'Sauvegarde...' : "Enregistrer les modifications"}
                    </Button>
                </div>
            </form>
        </Form>
    );
}