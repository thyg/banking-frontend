"use client";

import { RolesManagementView } from "@/components/roles/roles-management-view";

export const dynamic = "force-dynamic";

export default function RolesPage() {
  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex-shrink-0">
        <h1 className="text-xl lg:text-2xl font-bold tracking-tight">Rôles & Permissions</h1>
        <p className="text-muted-foreground text-sm">
          Définissez des rôles et configurez leurs droits d'accès au système.
        </p>
      </div>
      <div className="flex-1 min-h-0">
        <RolesManagementView />
      </div>
    </div>
  );
}
