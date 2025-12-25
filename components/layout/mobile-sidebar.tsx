"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Menu, ShoppingCart, Warehouse, Landmark, UserCog, Settings } from "lucide-react";
import { MainNav } from "./main-nav";
import { Button } from "../ui/button";
import { modules } from "@/config/navigation";
import { useNavigationStore } from "@/hooks/use-navigation-store";
import { cn } from "@/lib/utils";
import { ScrollArea } from "../ui/scroll-area";

const moduleIcons = {
  ventes: ShoppingCart,
  stock: Warehouse,
  tresorerie: Landmark,
  personnel: UserCog,
  parametres: Settings
};

export function MobileSidebar() {
  const [open, setOpen] = useState(false);
  const { activeModule, setActiveModule } = useNavigationStore();
  const currentModuleData = modules[activeModule];

  const handleModuleChange = (key: string) => {
    setActiveModule(key as any);
  };

  const handleLinkClick = () => {
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-10 w-10">
          <Menu className="h-6 w-6" />
          <span className="sr-only">Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="text-left">KSM ERP</SheetTitle>
        </SheetHeader>

        {/* Sélecteur de modules */}
        <div className="flex overflow-x-auto gap-1 p-2 border-b bg-gray-50">
          {Object.entries(modules).map(([key, module]) => {
            const Icon = moduleIcons[key as keyof typeof moduleIcons] || Settings;
            return (
              <Button
                key={key}
                variant={activeModule === key ? "secondary" : "ghost"}
                size="sm"
                className={cn(
                  "flex-shrink-0 h-10 px-3 gap-2",
                  activeModule === key && "bg-blue-100 text-blue-700"
                )}
                onClick={() => handleModuleChange(key)}
              >
                <Icon className="h-4 w-4" />
                <span className="text-xs">{module.name}</span>
              </Button>
            );
          })}
        </div>

        {/* Navigation du module actif */}
        <ScrollArea className="h-[calc(100vh-140px)]">
          <div className="p-2" onClick={handleLinkClick}>
            <MainNav links={currentModuleData.sidebarLinks} />
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}