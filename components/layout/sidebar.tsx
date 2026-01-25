/**
 * @file components/layout/sidebar.tsx
 * @description Sidebar principale de l'application avec navigation par modules.
 * 
 * CHANGEMENTS v3.0.1:
 * - Ajout import Landmark (icône Trésorerie)
 * - Ajout tresorerie dans moduleIcons
 * - Ajout case 'tresorerie' dans handleCompose
 * - Fix: Suppression de onCancel sur CustomerForm et ProductForm
 * 
 * @version 3.0.1 - Ajout module Trésorerie + Fix props formulaires
 */

"use client";

import { MainNav } from "./main-nav";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/hooks/useSidebar";
import { useNavigationStore } from "@/hooks/use-navigation-store";
import { modules } from "@/config/navigation";
import { Button } from "../ui/button";
import { 
  ShoppingCart, 
  Warehouse, 
  UserCog, 
  Settings,
  Landmark
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

const moduleIcons = {
    ventes: ShoppingCart,
    stock: Warehouse,
    tresorerie: Landmark,
    personnel: UserCog,
    parametres: Settings
};

export function Sidebar() {
  const { isCollapsed } = useSidebar();
  const { activeModule, setActiveModule } = useNavigationStore();

  const currentModuleData = modules[activeModule];

  return (
    <aside
      className={cn(
        "h-screen bg-sidebar flex transition-all duration-300 ",
        isCollapsed ? "w-20" : "w-72"
      )}
    >
        <div className="w-15 flex-shrink-0 flex flex-col items-center py-4 border-r bg-sidebar">
            <TooltipProvider delayDuration={0}>
                {Object.entries(modules).map(([key, module]) => {
                    const Icon = module.icon;
                    return (
                        <Tooltip key={key}>
                            <TooltipTrigger asChild>
                                <Button 
                                    variant={activeModule === key ? "secondary" : "ghost"}
                                    size="icon" 
                                    className="h-12 w-12 flex-col gap-3 text-xs"
                                    onClick={() => setActiveModule(key as any)}
                                >
                                    <Icon className={cn(
                                        "h-5 w-5",
                                        activeModule === key ? "text-foreground" : "text-muted-foreground"
                                    )}/>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                                <p>{module.name}</p>
                            </TooltipContent>
                        </Tooltip>
                    )
                })}
            </TooltipProvider>
        </div>
        
        {!isCollapsed && (
            <div className="flex-1 flex flex-col pt-5">
                <div className="flex-1 overflow-y-auto px-2">
                    <MainNav links={currentModuleData.sidebarLinks} />
                </div>
            </div>
        )}
    </aside>
  );
}