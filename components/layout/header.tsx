"use client";

import { UserNav } from "./user-nav";
import { MobileSidebar } from "./mobile-sidebar";
import { Button } from "../ui/button";
import { Menu, Search, Settings, HelpCircle, X } from "lucide-react";
import { Input } from "../ui/input";
import { useSidebar } from "@/hooks/useSidebar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu";
import Link from "next/link";
import { useState } from "react";
import { ThemeToggleButton } from "../theme-toggle-button";

export function Header() {
  const { isCollapsed, toggle } = useSidebar();
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  return (
    <header className="flex-shrink-0 h-14 sm:h-16 flex items-center px-2 sm:px-4 md:px-6 bg-background">
      {/* Menu mobile - visible uniquement sur mobile */}
      <div className="md:hidden mr-2">
        <MobileSidebar />
      </div>

      {/* Bouton toggle sidebar - visible uniquement sur desktop */}
      <Button variant="ghost" size="icon" className="mr-2 hidden md:flex" onClick={toggle}>
        <Menu className="h-5 w-5 text-muted-foreground" />
      </Button>

      {/* Logo */}
      <div className="font-semibold text-lg tracking-tight text-foreground mr-2 sm:mr-6">
        KSM
      </div>

      {/* Barre de recherche - Desktop */}
      <div className="hidden sm:flex flex-1 max-w-2xl">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            className="w-full bg-muted rounded-full pl-10 pr-4 py-2 h-10 sm:h-12 border-transparent focus:bg-background focus:border-primary focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Recherche mobile - Bouton toggle */}
      <div className="sm:hidden flex-1 flex justify-end">
        {showMobileSearch ? (
          <div className="absolute inset-x-0 top-0 h-14 bg-background z-50 flex items-center px-2 gap-2 border-b">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                className="w-full bg-muted rounded-full pl-9 pr-4 py-2 h-10 border-transparent focus:bg-background focus:border-primary"
                autoFocus
              />
            </div>
            <Button variant="ghost" size="icon" onClick={() => setShowMobileSearch(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="icon" onClick={() => setShowMobileSearch(true)}>
            <Search className="h-5 w-5 text-muted-foreground" />
          </Button>
        )}
      </div>

      <div className="hidden sm:flex flex-1" />

      <div className="flex items-center gap-1 sm:gap-2">
        {/* Aide - caché sur très petit écran */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="hidden xs:flex">
              <HelpCircle className="h-5 w-5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Centre d'aide</DropdownMenuItem>
            <DropdownMenuItem>Formation</DropdownMenuItem>
            <DropdownMenuItem>Nouveautés</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Envoyer des commentaires</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Paramètres */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Paramètres rapides</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link href="/settings/company">Voir tous les paramètres</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Densité</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <ThemeToggleButton />

        <UserNav />
      </div>
    </header>
  );
}