import { NewOrderForm } from "@/components/sales/new-order/new-order-form";
import { getClients, getProducts } from "@/lib/api";

export const dynamic = 'force-dynamic';

export default async function NewOrderPage() {
  const clients = await getClients();
  const products = await getProducts();
  
  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex-shrink-0">
         <h1 className="text-xl lg:text-2xl font-bold tracking-tight">Saisie Commandes Client</h1>
         <p className="text-muted-foreground text-sm">
            Créez une nouvelle commande client et préparez la livraison ou la facturation.
         </p>
      </div>
      <div className="flex-grow min-h-0">
        <NewOrderForm clients={clients} products={products} />
      </div>
    </div>
  );
}