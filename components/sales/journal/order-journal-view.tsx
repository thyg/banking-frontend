"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DateRangePicker } from "@/components/date-range-picker";
import { OrderJournalEntry, OrderItem } from "@/types/sales";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Printer, Search, X, Eye, Pencil, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { getOrderJournal, updateOrderJournalEntry, deleteOrderJournalEntry } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { DateRange } from "react-day-picker";

type SearchFormData = {
    dateRange?: DateRange;
    clientName?: string;
    status?: string;
};

export function OrderJournalView() {
    const [allEntries, setAllEntries] = useState<OrderJournalEntry[]>([]);
    const [filteredEntries, setFilteredEntries] = useState<OrderJournalEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [modalState, setModalState] = useState<{ type: 'view' | 'edit' | 'delete' | null, entry: OrderJournalEntry | null }>({ type: null, entry: null });

    const searchForm = useForm<SearchFormData>({ defaultValues: { status: "all" } });

    const fetchJournal = async () => {
        setIsLoading(true);
        try {
            const data = await getOrderJournal();
            setAllEntries(data);
            setFilteredEntries(data);
        } catch (error) {
            console.error("Failed to fetch order journal:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchJournal();
    }, []);

    const handleSearch = (data: SearchFormData) => {
        let tempEntries = [...allEntries];
        if (data.clientName) {
            tempEntries = tempEntries.filter(e => e.clientName.toLowerCase().includes(data.clientName!.toLowerCase()));
        }
        if (data.status && data.status !== "all") {
            tempEntries = tempEntries.filter(e => e.status === data.status);
        }
        if (data.dateRange?.from) {
            tempEntries = tempEntries.filter(e => e.orderDate >= data.dateRange!.from!);
        }
        if (data.dateRange?.to) {
            tempEntries = tempEntries.filter(e => e.orderDate <= data.dateRange!.to!);
        }
        setFilteredEntries(tempEntries);
    };
    
    const handleReset = () => {
        searchForm.reset({ clientName: '', status: 'all', dateRange: undefined });
        setFilteredEntries(allEntries);
    };

    const handleOpenModal = (type: 'view' | 'edit' | 'delete', entry: OrderJournalEntry) => setModalState({ type, entry });
    const handleCloseModal = () => setModalState({ type: null, entry: null });
    
    const handleUpdateEntry = async (id: string, data: Partial<OrderJournalEntry>) => {
        await updateOrderJournalEntry(id, data);
        await fetchJournal();
        handleCloseModal();
    };

    const handleDeleteEntry = async (id: string) => {
        if (window.confirm("Voulez-vous vraiment supprimer cette entrée du journal ?")) {
            await deleteOrderJournalEntry(id);
            await fetchJournal();
            handleCloseModal();
        }
    };

    const journalColumns: ColumnDef<OrderJournalEntry>[] = [
        { accessorKey: "blNumber", header: "No BL" },
        { accessorKey: "clientName", header: "Client" },
        { accessorKey: "amountHT", header: "Montant HT", cell: ({ row }) => row.original.amountHT.toLocaleString() },
        { accessorKey: "orderDate", header: "Date CMD", cell: ({ row }) => format(new Date(row.original.orderDate), "dd-MM-yy") },
        { accessorKey: "status", header: "Etat" },
        {
            id: "actions", header: "Actions", cell: ({ row }) => (
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenModal('view', row.original)}><Eye className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenModal('edit', row.original)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenModal('delete', row.original)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
            ),
        },
    ];

    return (
        <div className="flex gap-4 h-full">
            <Card className="w-1/3 xl:w-1/4 flex flex-col">
                <CardHeader><CardTitle className="text-base">Filtres de Recherche</CardTitle></CardHeader>
                <CardContent className="p-4 flex-grow overflow-y-auto">
                    <Form {...searchForm}>
                        <form onSubmit={searchForm.handleSubmit(handleSearch)} className="space-y-4">
                            <FormItem><FormLabel>Date</FormLabel><DateRangePicker onDateChange={range => searchForm.setValue('dateRange', range)} /></FormItem>
                            <FormField control={searchForm.control} name="clientName" render={({ field }) => (<FormItem><FormLabel>Client</FormLabel><Input {...field} placeholder="Nom du client..." /></FormItem>)} />
                            <FormField control={searchForm.control} name="status" render={({ field }) => (
                                <FormItem><FormLabel>État</FormLabel><RadioGroup onValueChange={field.onChange} value={field.value} className="space-y-1 mt-2">
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="all" id="s-all" /><Label htmlFor="s-all" className="font-normal">Toutes</Label></div>
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="Facturée" id="s-fac" /><Label htmlFor="s-fac" className="font-normal">Facturées</Label></div>
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="Livrée" id="s-liv" /><Label htmlFor="s-liv" className="font-normal">Livrées</Label></div>
                                </RadioGroup></FormItem>
                            )} />
                            <div className="flex justify-between pt-4">
                                <Button type="submit"><Search className="mr-2 h-4 w-4" />Rechercher</Button>
                                <Button type="button" variant="outline" onClick={handleReset}><X className="mr-2 h-4 w-4" />Réinitialiser</Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            <div className="flex-grow flex flex-col gap-4 min-h-0">
                <Card>
                    <CardContent className="p-3 flex items-center justify-between">
                        <p className="text-base font-semibold">Résultats <span className="text-muted-foreground font-normal">({filteredEntries.length} commandes trouvées)</span></p>
                        <Button variant="outline"><Printer className="mr-2 h-4 w-4" />Imprimer le journal</Button>
                    </CardContent>
                </Card>
                <Card className="flex-grow min-h-0">
                    <CardContent className="h-full p-2">
                       {isLoading ? <Skeleton className="w-full h-full" /> : <DataTable columns={journalColumns} data={filteredEntries} />}
                    </CardContent>
                </Card>
            </div>

            {modalState.entry && (
                <>
                    <ViewOrderModal isOpen={modalState.type === 'view'} onClose={handleCloseModal} entry={modalState.entry} />
                    <EditOrderModal isOpen={modalState.type === 'edit'} onClose={handleCloseModal} entry={modalState.entry} onSave={handleUpdateEntry} />
                    <DeleteConfirmationModal isOpen={modalState.type === 'delete'} onClose={handleCloseModal} entry={modalState.entry} onDelete={handleDeleteEntry} />
                </>
            )}
        </div>
    );
}

const ViewOrderModal = ({ isOpen, onClose, entry }: { isOpen: boolean, onClose: () => void, entry: OrderJournalEntry }) => {
    const itemColumns: ColumnDef<OrderItem>[] = [
        { accessorKey: "code", header: "Code" },
        { accessorKey: "name", header: "Libellé" },
        { accessorKey: "quantity", header: "Qté" },
        { accessorKey: "unitPrice", header: "P.U.", cell: ({ row }) => row.original.unitPrice.toLocaleString() },
        { accessorKey: "total", header: "Total", cell: ({ row }) => row.original.total.toLocaleString() },
    ];
    return (
        <Dialog open={isOpen} onOpenChange={onClose}><DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] p-4 sm:p-6">
            <DialogHeader><DialogTitle>Détail: {entry.blNumber}</DialogTitle><DialogDescription>Client: {entry.clientName}</DialogDescription></DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto"><DataTable columns={itemColumns} data={entry.items} /></div>
            <DialogFooter><Button variant="outline" onClick={onClose}>Fermer</Button></DialogFooter>
        </DialogContent></Dialog>
    );
};

const EditOrderModal = ({ isOpen, onClose, entry, onSave }: { isOpen: boolean, onClose: () => void, entry: OrderJournalEntry, onSave: Function }) => {
    const form = useForm<OrderJournalEntry>({ defaultValues: entry });
    return (
        <Dialog open={isOpen} onOpenChange={onClose}><DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader><DialogTitle>Modifier: {entry.blNumber}</DialogTitle></DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(data => onSave(entry.id, data))} className="space-y-4">
                    <FormField name="clientName" control={form.control} render={({ field }) => (<FormItem><FormLabel>Client</FormLabel><Input {...field} /></FormItem>)} />
                    <FormField name="status" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Statut</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>
                            <SelectItem value="Livrée">Livrée</SelectItem><SelectItem value="Facturée">Facturée</SelectItem><SelectItem value="Annulée">Annulée</SelectItem>
                        </SelectContent></Select></FormItem>
                    )} />
                    <DialogFooter><Button variant="outline" type="button" onClick={onClose}>Annuler</Button><Button type="submit">Enregistrer</Button></DialogFooter>
                </form>
            </Form>
        </DialogContent></Dialog>
    );
};

const DeleteConfirmationModal = ({ isOpen, onClose, entry, onDelete }: { isOpen: boolean, onClose: () => void, entry: OrderJournalEntry, onDelete: Function }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}><DialogContent>
            <DialogHeader><DialogTitle>Confirmer la suppression</DialogTitle><DialogDescription>Êtes-vous sûr de vouloir supprimer la commande N° <span className="font-semibold text-foreground">{entry.blNumber}</span> ? Cette action est irréversible.</DialogDescription></DialogHeader>
            <DialogFooter><Button variant="outline" onClick={onClose}>Annuler</Button><Button variant="destructive" onClick={() => onDelete(entry.id)}>Supprimer</Button></DialogFooter>
        </DialogContent></Dialog>
    );
};