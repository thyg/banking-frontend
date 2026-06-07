import { DashboardView } from "@/components/dashboard/dashboard-view";
import { getClients, getOrders, getProducts } from "@/lib/api";

export const dynamic = 'force-dynamic';


export default async function DashboardPage() {
    const [orders, clients, products] = await Promise.all([
        getOrders().catch(() => []),
        getClients().catch(() => []),
        getProducts().catch(() => []),
    ]);

    return (
        <div className="h-full">
            <DashboardView
                totalRevenue={orders.reduce((sum: number, order: any) => sum + (order.netToPay ?? 0), 0)}
                totalClients={clients.length}
                totalProducts={products.length}
                recentOrders={orders.slice(0, 5)}
            />
        </div>
    );
}