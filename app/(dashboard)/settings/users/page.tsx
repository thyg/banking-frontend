import { UserManagementView } from "@/components/personnel/users/user-management-view";

export const dynamic = "force-dynamic";

export default function UsersPage() {
    return (
        <div className="h-full flex flex-col gap-4">
            <div className="flex-shrink-0">
                <h1 className="text-xl lg:text-2xl font-bold tracking-tight">Gestion des Utilisateurs</h1>
                <p className="text-muted-foreground text-sm">
                    Créez des utilisateurs et gérez leurs accès au système.
                </p>
            </div>
            <div className="flex-grow min-h-0">
                <UserManagementView />
            </div>
        </div>
    );
}
