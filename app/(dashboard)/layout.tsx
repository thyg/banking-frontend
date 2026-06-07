"use client";

import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import React, { useEffect } from "react";
import { ComposeWindow } from "@/components/ui/compose-window";
import { usePathname } from "next/navigation";
import { useNavigationStore } from "@/hooks/use-navigation-store";
import { findModuleByPath } from "@/config/navigation";

export const dynamic = 'force-dynamic';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { activeModule, setActiveModule } = useNavigationStore();

  useEffect(() => {
    if (pathname) {
      const currentModule = findModuleByPath(pathname);
      if (currentModule && currentModule !== activeModule) {
        setActiveModule(currentModule);
      }
    }
  }, [pathname, activeModule, setActiveModule]);

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-background">
      {/* Sidebar - cachée sur mobile, visible sur tablette et desktop */}
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-2 sm:p-4 pt-2">
          {children}
        </main>
      </div>
      <ComposeWindow />
    </div>
  );
}