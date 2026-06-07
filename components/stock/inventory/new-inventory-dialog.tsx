"use client";

import { useForm, Controller } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Warehouse, Inventory } from '@/types/stock';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export type InventoryCreationOptions = {
    warehouseId: string;
    type: Inventory['type'];
    creationMode: 're-initialize' | 'carry-over' | 'manual';
};

interface NewInventoryDialogProps {
    isOpen: boolean;
    onClose: () => void;
    warehouses: Warehouse[];
    onSubmit: (data: InventoryCreationOptions) => void;
}

export function NewInventoryDialog({ isOpen, onClose, warehouses, onSubmit }: NewInventoryDialogProps) {
    const form = useForm<InventoryCreationOptions>({
        defaultValues: { warehouseId: '', type: 'Spontané', creationMode: 're-initialize' }
    });

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
                <DialogHeader>
                    <DialogTitle>Lancer un nouvel inventaire</DialogTitle>
                </DialogHeader>
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Attention : Opération Irréversible</AlertTitle>
                  <AlertDescription>
                    L'opération d'inventaire ré-initialise le stock à cette date. Assurez-vous d'avoir sauvegardé (compacté, archivé) vos données avant de continuer.
                  </AlertDescription>
                </Alert>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField control={form.control} name="warehouseId" render={({ field }) => (
                                <FormItem><FormLabel>Magasin</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger></FormControl><SelectContent>
                                        {warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                                    </SelectContent></Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                             <FormField control={form.control} name="type" render={({ field }) => (
                                <FormItem><FormLabel>Type</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>
                                        <SelectItem value="Spontané">Spontané</SelectItem>
                                        <SelectItem value="Tournant">Tournant</SelectItem>
                                        <SelectItem value="Annuel">Annuel</SelectItem>
                                    </SelectContent></Select>
                                </FormItem>
                            )} />
                        </div>

                        <FormField
                            control={form.control}
                            name="creationMode"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Option d'inventaire</FormLabel>
                                    <RadioGroup onValueChange={field.onChange} value={field.value} className="mt-2 space-y-3">
                                        <FormItem className="flex items-start space-x-3 space-y-0 rounded-md border p-4">
                                            <FormControl><RadioGroupItem value="re-initialize" /></FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel>Ré-initialiser le stock</FormLabel>
                                                <p className="text-xs text-muted-foreground">Cochez cette case pour préparer les données pour un inventaire manuel complet du magasin.</p>
                                            </div>
                                        </FormItem>
                                        <FormItem className="flex items-start space-x-3 space-y-0 rounded-md border p-4">
                                            <FormControl><RadioGroupItem value="carry-over" /></FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel>Reconduire le stock actuel</FormLabel>
                                                <p className="text-xs text-muted-foreground">Cette option permet de reconduire automatiquement le stock courant actuel (inventaire tournant).</p>
                                            </div>
                                        </FormItem>
                                        <FormItem className="flex items-start space-x-3 space-y-0 rounded-md border p-4">
                                            <FormControl><RadioGroupItem value="manual" disabled /></FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel>À partir de l'inventaire manuel (bientôt)</FormLabel>
                                                <p className="text-xs text-muted-foreground">Permet de saisir manuellement les fiches d'inventaire.</p>
                                            </div>
                                        </FormItem>
                                    </RadioGroup>
                                </FormItem>
                            )}
                        />
                        
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
                            <Button type="submit" disabled={!form.watch('warehouseId')}>Créer la fiche d'inventaire</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}