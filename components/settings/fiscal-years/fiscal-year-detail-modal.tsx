"use client";

import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FiscalYear } from '@/types/settings';
import { Order } from '@/types/sales';
import { StatCard } from '@/components/ui/stat-card';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { format, parseISO } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { Item } from '@radix-ui/react-dropdown-menu';

interface FiscalYearDetailModalProps {
    year: FiscalYear | null;
    allOrders: Order[];
    isOpen: boolean;
    onClose: () => void;
}

export function FiscalYearDetailModal({ year, allOrders, isOpen, onClose }: FiscalYearDetailModalProps) {
    const yearStats = useMemo(() => {
        if (!year) return null;

        const startDate = parseISO(year.startDate as string);
        const endDate = parseISO(year.endDate as string);

        const ordersInYear = allOrders.filter(order => {
            const orderDate = order.orderDate;
            return orderDate >= startDate && orderDate <= endDate && order.status !== 'Cancelled';
        });

        const totalRevenue = ordersInYear.reduce((sum, order) => sum + order.netToPay, 0);
        const totalHT = ordersInYear.reduce((sum, order) => sum + order.totalNetHT, 0);
        const totalTVA = ordersInYear.reduce((sum, order) => sum + order.totalTVA, 0);
        const invoiceCount = ordersInYear.length;
        
        const topProducts = ordersInYear
            .flatMap(order => order.items)
            .filter(item => item !== null)
            .reduce((acc, item) => {
                acc[item.name] = (acc[item.name] || 0) + item.quantity;
                return acc;
            }, {} as Record<string, number>);
        
        const sortedTopProducts = Object.entries(topProducts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([name, quantity]) => ({ name, quantity }));
        
        const topClients = ordersInYear
            .reduce((acc, order) => {
                acc[order.client.name] = (acc[order.client.name] || 0) + order.netToPay;
                return acc;
            }, {} as Record<string, number>);
        
        const sortedTopClients = Object.entries(topClients)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([name, revenue]) => ({ name, revenue }));

        return { totalRevenue, totalHT, totalTVA, invoiceCount, sortedTopProducts, sortedTopClients };
    }, [year, allOrders]);

    const topProductsColumns: ColumnDef<{ name: string; quantity: number }>[] = [
        { accessorKey: 'name', header: 'Produit' },
        { accessorKey: 'quantity', header: 'Qté Vendue' },
    ];
    
    const topClientsColumns: ColumnDef<{ name: string; revenue: number }>[] = [
        { accessorKey: 'name', header: 'Client' },
        { accessorKey: 'revenue', header: 'Chiffre d\'Affaires', cell: ({row}) => `${row.original.revenue.toLocaleString('fr-FR')} XAF` },
    ];

    if (!year || !yearStats) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] p-4 sm:p-6">
                <DialogHeader>
                    <DialogTitle>Bilan de l'Exercice : {year.name}</DialogTitle>
                    <DialogDescription>
                        Résumé de l'activité du {format(new Date(year.startDate), 'dd/MM/yyyy')} au {format(new Date(year.endDate), 'dd/MM/yyyy')}.
                    </DialogDescription>
                </DialogHeader>
                <div className="max-h-[70vh] overflow-y-auto pr-4 space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard title="CA TTC" value={`${yearStats.totalRevenue.toLocaleString('fr-FR')} XAF`} variant="primary" />
                        <StatCard title="Total HT" value={`${yearStats.totalHT.toLocaleString('fr-FR')} XAF`} />
                        <StatCard title="Total TVA" value={`${yearStats.totalTVA.toLocaleString('fr-FR')} XAF`} />
                        <StatCard title="Commandes" value={yearStats.invoiceCount.toLocaleString('fr-FR')} />
                    </div>
                    <Separator />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="text-md font-semibold mb-2">Top 5 Produits Vendus</h3>
                            <DataTable columns={topProductsColumns} data={yearStats.sortedTopProducts} />
                        </div>
                        <div>
                            <h3 className="text-md font-semibold mb-2">Top 5 Clients</h3>
                            <DataTable columns={topClientsColumns} data={yearStats.sortedTopClients} />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onClose}>Fermer</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}