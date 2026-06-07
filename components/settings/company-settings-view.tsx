"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { GeneralOptions } from '@/types/settings';
import { updateGeneralOptions } from '@/lib/api';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Save } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface CompanySettingsViewProps {
    initialOptions: GeneralOptions;
}

const FormSwitch = ({ control, name, label }: { control: any, name: string, label: string }) => (
    <FormField control={control} name={name} render={({ field }) => (
        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
            <FormLabel>{label}</FormLabel>
            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
        </FormItem>
    )} />
);

const FormInput = ({ control, name, label, type = "text", placeholder = "" }: { control: any, name: string, label: string, type?: string, placeholder?: string }) => (
     <FormField control={control} name={name} render={({ field }) => (
        <FormItem><FormLabel>{label}</FormLabel><FormControl><Input type={type} placeholder={placeholder} {...field} /></FormControl></FormItem>
    )} />
);

export function CompanySettingsView({ initialOptions }: CompanySettingsViewProps) {
    const form = useForm<GeneralOptions>({ defaultValues: initialOptions });

    const onSubmit = async (data: GeneralOptions) => {
        try {
            await updateGeneralOptions(data);
            alert("Options enregistrées avec succès !");
        } catch (error) {
            console.error("Failed to save options", error);
            alert("Une erreur est survenue.");
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="h-full">
                <Card className="h-full flex flex-col">
                    <CardContent className="p-4 flex-grow overflow-y-auto">
                        <Tabs defaultValue="general">
                            <TabsList className="grid w-full grid-cols-4">
                                <TabsTrigger value="general">Général</TabsTrigger>
                                <TabsTrigger value="sales">Vente</TabsTrigger>
                                <TabsTrigger value="term">Vente à terme</TabsTrigger>
                                <TabsTrigger value="cash">Vente au comptant</TabsTrigger>
                            </TabsList>

                            <TabsContent value="general" className="mt-4 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormSwitch control={form.control} name="general.autoInvoiceFromDelivery" label="Facturer auto. à la saisie des BL ?" />
                                    <FormSwitch control={form.control} name="general.autoTreasuryInterface" label="Automatiser l'interface Trésorerie ?" />
                                    <FormSwitch control={form.control} name="general.printTradeRegistryOnInvoice" label="Autoriser l'impression du RC sur la facture ?" />
                                    <FormSwitch control={form.control} name="general.isSupermarket" label="Cochez si c'est un SuperMarché" />
                                    <FormSwitch control={form.control} name="general.modifySalePriceOnPurchase" label="Modifier auto. le prix de vente lors des achats" />
                                </div>
                                <Separator />
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <FormInput control={form.control} name="general.decimalPlaces" label="Nbre de décimal" type="number" />
                                    <FormInput control={form.control} name="general.maxTechnicalMargin" label="Taux Max Marge Technicien (%)" type="number" />
                                    <FormInput control={form.control} name="general.dateFormat" label="Format de la date" placeholder="dd/MM/yyyy" />
                                </div>
                                <Separator />
                                <FormField control={form.control} name="printing.orientation" render={({ field }) => (
                                    <FormItem><FormLabel>Orientation du papier</FormLabel><RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4 pt-2">
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="Portrait" id="p-portrait" /><FormLabel htmlFor="p-portrait">Portrait</FormLabel></div>
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="Paysage" id="p-paysage" /><FormLabel htmlFor="p-paysage">Paysage</FormLabel></div>
                                    </RadioGroup></FormItem>
                                )}/>
                            </TabsContent>
                            
                            <TabsContent value="sales" className="mt-4 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormSwitch control={form.control} name="sales.canNegotiatePrice" label="Négocier le prix à la vente ?" />
                                    <FormSwitch control={form.control} name="sales.priceIncludesVAT" label="Le prix de vente inclu la TVA ?" />
                                    <FormSwitch control={form.control} name="sales.allowMultiWarehouseSales" label="Autoriser les ventes multi magasin ?" />
                                    <FormSwitch control={form.control} name="sales.allowTechnicalInvoices" label="Autoriser les Factures Technicien ?" />
                                </div>
                                 <Separator />
                                 <h4 className="font-semibold">Annulation impossible après :</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <FormInput control={form.control} name="sales.cancellationDays.invoices" label="Jour(s) pour Factures" type="number" />
                                    <FormInput control={form.control} name="sales.cancellationDays.creditNotes" label="Jour(s) pour Avoir" type="number" />
                                    <FormInput control={form.control} name="sales.cancellationDays.deliveries" label="Jour(s) pour Livraisons" type="number" />
                                    <FormInput control={form.control} name="sales.cancellationDays.purchases" label="Jour(s) pour Achats" type="number" />
                                </div>
                            </TabsContent>
                            
                            <TabsContent value="term" className="mt-4 space-y-4">
                                <h4 className="font-semibold">Format du n° facture : Facture à terme avec TVA</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                     <FormInput control={form.control} name="termInvoicing.vatInvoiceLength" label="Longueur auto." type="number" />
                                     <FormInput control={form.control} name="termInvoicing.vatInvoicePrefix" label="Préfixe" />
                                     <FormInput control={form.control} name="termInvoicing.vatInvoiceSuffix" label="Suffixe" />
                                </div>
                                <Separator />
                                <h4 className="font-semibold">Signatures</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                     <FormInput control={form.control} name="termInvoicing.leftSignature" label="Signataire gauche" />
                                     <FormInput control={form.control} name="termInvoicing.middleSignature" label="Signataire du milieu" />
                                     <FormInput control={form.control} name="termInvoicing.rightSignature" label="Signataire droite" />
                                </div>
                            </TabsContent>

                            <TabsContent value="cash" className="mt-4 space-y-4">
                                <h4 className="font-semibold">Format du n° facture : Facture au comptant avec TVA</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                     <FormInput control={form.control} name="cashInvoicing.vatInvoiceLength" label="Longueur auto." type="number" />
                                     <FormInput control={form.control} name="cashInvoicing.vatInvoicePrefix" label="Préfixe" />
                                     <FormInput control={form.control} name="cashInvoicing.vatInvoiceSuffix" label="Suffixe" />
                                </div>
                                 <Separator />
                                <h4 className="font-semibold">Format du n° facture : Facture au comptant sans TVA</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                     <FormInput control={form.control} name="cashInvoicing.noVatInvoiceLength" label="Longueur auto." type="number" />
                                     <FormInput control={form.control} name="cashInvoicing.noVatInvoicePrefix" label="Préfixe" />
                                     <FormInput control={form.control} name="cashInvoicing.noVatInvoiceSuffix" label="Suffixe" />
                                </div>
                                 <Separator />
                                 <FormSwitch control={form.control} name="cashInvoicing.useCashRegisterBalance" label="Utiliser le solde reporté à la caisse ?" />
                            </TabsContent>

                        </Tabs>
                    </CardContent>
                    <CardFooter className="justify-end border-t pt-4">
                        <Button type="submit"><Save className="mr-2 h-4 w-4"/>Appliquer</Button>
                    </CardFooter>
                </Card>
            </form>
        </Form>
    );
}