import { InvoiceManagementView } from "@/components/invoices/invoice-management-view";
import { getGeneralOptions, getInvoices } from "@/lib/api";

export const dynamic = 'force-dynamic';

export default async function InvoicesPage() {
    const invoices = await getInvoices();
    const options = await getGeneralOptions();

    return (
        <div className="h-full flex flex-col gap-6">
            <div className="flex-shrink-0">
                <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
                    Gestion des Factures Client
                </h1>
                <p className="text-muted-foreground mt-1">
                    Consultez, réglez ou annulez les factures de vos clients.
                </p>
            </div>
            <div className="flex-grow min-h-0">
                <InvoiceManagementView initialInvoices={invoices} printSettings={options.printing} />
            </div>
        </div>
    );
}