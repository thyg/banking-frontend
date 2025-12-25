"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Order } from "@/types/sales";
import { Banknote, Users, Package, ShoppingCart } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Badge } from "../ui/badge";

interface DashboardViewProps {
    totalRevenue: number;
    totalClients: number;
    totalProducts: number;
    recentOrders: Order[];
}

export function DashboardView({ totalRevenue, totalClients, totalProducts, recentOrders }: DashboardViewProps) {

    const orderColumns: ColumnDef<Order>[] = [
        { accessorKey: 'orderNumber', header: 'Commande' },
        { accessorKey: 'client.name', header: 'Client' },
        { accessorKey: 'orderDate', header: 'Date', cell: ({row}) => format(new Date(row.original.orderDate), 'dd/MM/yyyy') },
        { accessorKey: 'netToPay', header: 'Montant', cell: ({row}) => `${row.original.netToPay.toLocaleString('fr-FR')} XAF` },
        { accessorKey: 'status', header: 'Statut', cell: ({row}) => <Badge>{row.original.status}</Badge>},
    ];

    return (
        <div className="flex flex-col gap-4 sm:gap-6">
            {/* Stats Grid - responsive */}
            <div className="stats-grid">
                <StatCard
                    title="Chiffre d'Affaires"
                    value={`${totalRevenue.toLocaleString('fr-FR')} XAF`}
                    icon={<Banknote className="h-5 w-5 text-muted-foreground"/>}
                    variant="primary"
                />
                <StatCard
                    title="Clients"
                    value={totalClients}
                    icon={<Users className="h-5 w-5 text-muted-foreground"/>}
                />
                <StatCard
                    title="Articles"
                    value={totalProducts}
                    icon={<Package className="h-5 w-5 text-muted-foreground"/>}
                />
                <StatCard
                    title="Commandes"
                    value={recentOrders.length}
                    icon={<ShoppingCart className="h-5 w-5 text-muted-foreground"/>}
                />
            </div>

            {/* Tableau des commandes - responsive */}
            <Card>
                <CardHeader className="pb-3 sm:pb-6">
                    <CardTitle className="text-base sm:text-lg">Dernières Commandes</CardTitle>
                </CardHeader>
                <CardContent className="p-0 sm:p-6 sm:pt-0 overflow-hidden">
                    <div className="table-responsive">
                        <DataTable columns={orderColumns} data={recentOrders} />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}