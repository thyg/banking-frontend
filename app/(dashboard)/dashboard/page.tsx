import { DashboardView } from "@/components/dashboard/dashboard-view";
import { getClients, getOrders, getProducts } from "@/lib/api";

export const dynamic = 'force-dynamic';


export default async function DashboardPage() {
    const orders = await getOrders();
    const clients = await getClients();
    const products = await getProducts();

    return (
        <div className="h-full">
            <DashboardView
                totalRevenue={orders.reduce((sum, order) => sum + order.netToPay, 0)}
                totalClients={clients.length}
                totalProducts={products.length}
                recentOrders={orders.slice(0, 5)}
            />
        </div>
    );
}