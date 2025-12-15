import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FilePlus2, History } from "lucide-react";
import { OrderForm } from "@/components/sales/orders/order-form";
import { OrderHistory } from "@/components/sales/orders/order-history";

export const dynamic = 'force-dynamic';

export default function SalesOrdersPage() {
  return (
    // h-full et flex permettent à la page de remplir la hauteur
    <div className="h-full flex flex-col space-y-4">
      <div className="flex-shrink-0">
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Gestion des Commandes Client</h1>
        <p className="text-muted-foreground mt-1">
          Créer, facturer, suivre et annuler les commandes des clients.
        </p>
      </div>

      <Tabs defaultValue="new_order" className="flex-grow flex flex-col">
        <TabsList className="grid w-full grid-cols-2 max-w-lg flex-shrink-0">
          <TabsTrigger value="new_order">
            <FilePlus2 className="mr-2 h-4 w-4" />
            Nouvelle Commande / Facturation
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="mr-2 h-4 w-4" />
            Historique & Annulation
          </TabsTrigger>
        </TabsList>
        {/* flex-grow permet au contenu de l'onglet de s'étirer */}
        <TabsContent value="new_order" className="flex-grow mt-4">
          <OrderForm />
        </TabsContent>
        <TabsContent value="history" className="flex-grow mt-4">
          <OrderHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}