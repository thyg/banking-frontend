import { getSystemAudits } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AuditTableClient } from '@/components/personnel/audits/audit-table-client';

export default async function AuditPage() {
    const audits = await getSystemAudits().catch(() => []);

    return (
        <div className="h-full flex flex-col gap-4">
            <div className="flex-shrink-0">
                <h1 className="text-xl lg:text-2xl font-bold tracking-tight">Audit du système</h1>
                <p className="text-muted-foreground text-sm">
                    Consultez le journal des actions importantes effectuées par les utilisateurs.
                </p>
            </div>
            <Card className="flex-grow flex flex-col min-h-0">
                <CardHeader>
                    <CardTitle className="text-base">Piste d'audit</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow overflow-y-auto">
                    <AuditTableClient data={audits} />
                </CardContent>
            </Card>
        </div>
    );
}