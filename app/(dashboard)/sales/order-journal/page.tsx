import { OrderJournalView } from "@/components/sales/journal/order-journal-view";

export const dynamic = 'force-dynamic';

export default function OrderJournalPage() {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0">
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Journal des Commandes Clients</h1>
        <p className="text-muted-foreground mt-1">
          Analysez et consultez l'historique des commandes clients selon plusieurs critères.
        </p>
      </div>
       <div className="flex-grow mt-6">
        <OrderJournalView />
      </div>
    </div>
  );
}