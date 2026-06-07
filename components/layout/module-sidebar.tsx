"use client";

import { cn } from "@/lib/utils";
import { useModuleSidebar } from "@/hooks/useModuleSidebar";
import { useNavigationStore } from "@/hooks/use-navigation-store";
import { modules } from "@/config/navigation";
import { Button } from "../ui/button";
import { Menu } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { useRouter } from "next/navigation";

export function ModuleSidebar() {
  const { isCollapsed, toggle } = useModuleSidebar();
  const { activeModule, setActiveModule } = useNavigationStore();
  const router = useRouter();

  function handleModuleClick(key: string) {
    setActiveModule(key as any);
    const firstLink = modules[key as keyof typeof modules]?.sidebarLinks.find(l => !l.disabled);
    if (firstLink) router.push(firstLink.href);
  }

  return (
    <aside
      className={cn(
        "h-screen bg-white flex flex-col border-r transition-all duration-300",
        isCollapsed ? "w-20" : "w-72"
      )}
    >
      <div className="h-16 flex items-center px-4">
        <Button variant="ghost" size="icon" onClick={toggle} className="h-12 w-12">
          <Menu className="h-5 w-5 text-gray-600" />
        </Button>
        {!isCollapsed && (
          <span className="font-semibold text-lg tracking-tight text-gray-700 ml-2">
            KSM
          </span>
        )}
      </div>
      
      <div className="flex-1 flex flex-col items-center py-4 gap-2">
        <TooltipProvider delayDuration={0}>
          {Object.entries(modules).map(([key, module]) => {
            const Icon = module.icon;
            const isActive = activeModule === key;
            return isCollapsed ? (
              <Tooltip key={key}>
                <TooltipTrigger asChild>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    size="icon"
                    className="h-14 w-14"
                    onClick={() => handleModuleClick(key)}
                  >
                    <Icon className="h-6 w-6" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right"><p>{module.name}</p></TooltipContent>
              </Tooltip>
            ) : (
              <Button
                key={key}
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-[90%] h-12 justify-start px-4 text-base",
                  isActive && "font-bold"
                )}
                onClick={() => handleModuleClick(key)}
              >
                <Icon className="mr-4 h-6 w-6" />
                {module.name}
              </Button>
            );
          })}
        </TooltipProvider>
      </div>
    </aside>
  );
}