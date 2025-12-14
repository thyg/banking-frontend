/**
 * @file components/banking/journal-filters.tsx
 * @description Filtres pour le journal d'audit
 * @version 1.0.0 - Incrément 5
 */

"use client";

import React from 'react';
import type { AuditLogFilters, FilterOption } from '@/types/audit';

// UI
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

// Icons
import { Search, X, CalendarIcon } from 'lucide-react';

// Date formatting
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// =============================================================================
// TYPES
// =============================================================================

interface JournalFiltersProps {
  /** Filtres actuels */
  filters: AuditLogFilters;
  /** Liste des modules disponibles */
  modules: FilterOption[];
  /** Liste des actions disponibles */
  actions: FilterOption[];
  /** Callback pour mettre à jour les filtres */
  onFiltersChange: (filters: Partial<AuditLogFilters>) => void;
}

// =============================================================================
// COMPOSANT
// =============================================================================

export function JournalFilters({
  filters,
  modules,
  actions,
  onFiltersChange,
}: JournalFiltersProps) {
  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ search: e.target.value || undefined });
  };

  const handleModuleChange = (value: string) => {
    onFiltersChange({ 
      module: value === 'all' ? undefined : value as AuditLogFilters['module'] 
    });
  };

  const handleActionChange = (value: string) => {
    onFiltersChange({ 
      action: value === 'all' ? undefined : value as AuditLogFilters['action'] 
    });
  };

  const handleStartDateChange = (date: Date | undefined) => {
    onFiltersChange({
      startDate: date ? format(date, 'yyyy-MM-dd') : undefined,
    });
  };

  const handleEndDateChange = (date: Date | undefined) => {
    onFiltersChange({
      endDate: date ? format(date, 'yyyy-MM-dd') : undefined,
    });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      module: undefined,
      action: undefined,
      startDate: undefined,
      endDate: undefined,
      search: undefined,
    });
  };

  // Vérifie si des filtres sont actifs
  const hasActiveFilters = !!(
    filters.module ||
    filters.action ||
    filters.startDate ||
    filters.endDate ||
    filters.search
  );

  // Parse les dates pour l'affichage
  const startDate = filters.startDate ? new Date(filters.startDate) : undefined;
  const endDate = filters.endDate ? new Date(filters.endDate) : undefined;

  // ---------------------------------------------------------------------------
  // RENDU
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* Ligne principale */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Recherche */}
        <div className="space-y-2 lg:col-span-2">
          <Label htmlFor="search">Recherche</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              type="search"
              placeholder="Rechercher par référence ou description..."
              value={filters.search || ''}
              onChange={handleSearchChange}
              className="pl-8"
            />
          </div>
        </div>

        {/* Module */}
        <div className="space-y-2">
          <Label htmlFor="module">Module</Label>
          <Select value={filters.module || 'all'} onValueChange={handleModuleChange}>
            <SelectTrigger id="module">
              <SelectValue placeholder="Tous les modules" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les modules</SelectItem>
              {modules.map((module) => (
                <SelectItem key={module.value} value={module.value}>
                  {module.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Action */}
        <div className="space-y-2">
          <Label htmlFor="action">Action</Label>
          <Select value={filters.action || 'all'} onValueChange={handleActionChange}>
            <SelectTrigger id="action">
              <SelectValue placeholder="Toutes les actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les actions</SelectItem>
              {actions.map((action) => (
                <SelectItem key={action.value} value={action.value}>
                  {action.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Ligne dates */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Date début */}
        <div className="space-y-2">
          <Label>Date début</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !startDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, 'dd/MM/yyyy', { locale: fr }) : 'Sélectionner...'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={handleStartDateChange}
                locale={fr}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Date fin */}
        <div className="space-y-2">
          <Label>Date fin</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !endDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, 'dd/MM/yyyy', { locale: fr }) : 'Sélectionner...'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={handleEndDateChange}
                locale={fr}
                initialFocus
                disabled={(date) => startDate ? date < startDate : false}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Raccourcis de période */}
        <div className="space-y-2">
          <Label>Période rapide</Label>
          <Select 
            value="custom" 
            onValueChange={(value) => {
              const today = new Date();
              switch (value) {
                case 'today':
                  handleStartDateChange(today);
                  handleEndDateChange(today);
                  break;
                case 'week':
                  const weekAgo = new Date(today);
                  weekAgo.setDate(today.getDate() - 7);
                  handleStartDateChange(weekAgo);
                  handleEndDateChange(today);
                  break;
                case 'month':
                  const monthAgo = new Date(today);
                  monthAgo.setMonth(today.getMonth() - 1);
                  handleStartDateChange(monthAgo);
                  handleEndDateChange(today);
                  break;
                case 'year':
                  const yearAgo = new Date(today);
                  yearAgo.setFullYear(today.getFullYear() - 1);
                  handleStartDateChange(yearAgo);
                  handleEndDateChange(today);
                  break;
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choisir une période" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="custom">Personnalisé</SelectItem>
              <SelectItem value="today">Aujourd'hui</SelectItem>
              <SelectItem value="week">7 derniers jours</SelectItem>
              <SelectItem value="month">30 derniers jours</SelectItem>
              <SelectItem value="year">Cette année</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bouton effacer */}
        <div className="space-y-2">
          <Label className="invisible">Actions</Label>
          <Button
            variant="ghost"
            className="w-full"
            onClick={handleClearFilters}
            disabled={!hasActiveFilters}
          >
            <X className="mr-2 h-4 w-4" />
            Effacer les filtres
          </Button>
        </div>
      </div>

      {/* Indicateur de filtres actifs */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 pt-2">
          {filters.search && (
            <Badge variant="secondary" className="gap-1">
              Recherche: "{filters.search}"
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => onFiltersChange({ search: undefined })}
              />
            </Badge>
          )}
          {filters.module && (
            <Badge variant="secondary" className="gap-1">
              Module: {modules.find(m => m.value === filters.module)?.label}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => onFiltersChange({ module: undefined })}
              />
            </Badge>
          )}
          {filters.action && (
            <Badge variant="secondary" className="gap-1">
              Action: {actions.find(a => a.value === filters.action)?.label}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => onFiltersChange({ action: undefined })}
              />
            </Badge>
          )}
          {filters.startDate && (
            <Badge variant="secondary" className="gap-1">
              Depuis: {format(new Date(filters.startDate), 'dd/MM/yyyy')}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => onFiltersChange({ startDate: undefined })}
              />
            </Badge>
          )}
          {filters.endDate && (
            <Badge variant="secondary" className="gap-1">
              Jusqu'au: {format(new Date(filters.endDate), 'dd/MM/yyyy')}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => onFiltersChange({ endDate: undefined })}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}