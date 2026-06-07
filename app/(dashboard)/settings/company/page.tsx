import { getGeneralOptions } from "@/lib/api";
import { CompanySettingsView } from "@/components/settings/company-settings-view";

export default async function CompanySettingsPage() {
    const options = await getGeneralOptions().catch(() => null);

    return (
        <div className="h-full flex flex-col gap-4">
            <div className="flex-shrink-0">
                <h1 className="text-xl lg:text-2xl font-bold tracking-tight">Paramètres de la Société</h1>
                <p className="text-muted-foreground text-sm">
                    Configurez les options générales de fonctionnement de l'application.
                </p>
            </div>
            <div className="flex-grow min-h-0">
                <CompanySettingsView initialOptions={options} />
            </div>
        </div>
    );
}