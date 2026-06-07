"use client";

import React, { useState, useEffect, useRef } from "react";
import { Check, ChevronsUpDown, X, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { searchThirdParties, ThirdPartySummary } from "@/lib/api/third-party";

interface ThirdPartySelectorProps {
  value?: string;           // partnerId sélectionné
  displayValue?: string;    // partnerName affiché
  role?: string;            // filtre : "SUPPLIER" | "CUSTOMER" | undefined = tous
  placeholder?: string;
  disabled?: boolean;
  onSelect: (tp: ThirdPartySummary | null) => void;
}

export function ThirdPartySelector({
  value,
  displayValue,
  role,
  placeholder = "Rechercher un tiers...",
  disabled = false,
  onSelect,
}: ThirdPartySelectorProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ThirdPartySummary[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!open) return;
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchThirdParties({
          search: query || undefined,
          role,
          active: true,
          size: 20,
        });
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [query, open, role]);

  const handleSelect = (tp: ThirdPartySummary) => {
    onSelect(tp);
    setOpen(false);
    setQuery("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(null);
  };

  const selectedLabel = displayValue || (value ? `Tiers ${value.slice(0, 8)}…` : null);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !selectedLabel && "text-muted-foreground"
          )}
        >
          <span className="flex items-center gap-2 truncate">
            <User className="h-4 w-4 shrink-0 opacity-50" />
            <span className="truncate">{selectedLabel ?? placeholder}</span>
          </span>
          <span className="flex items-center gap-1 ml-2 shrink-0">
            {selectedLabel && !disabled && (
              <X
                className="h-3.5 w-3.5 opacity-50 hover:opacity-100 cursor-pointer"
                onClick={handleClear}
              />
            )}
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Nom, code ou référence..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {loading && (
              <div className="py-4 text-center text-sm text-muted-foreground">
                Recherche en cours…
              </div>
            )}
            {!loading && results.length === 0 && (
              <CommandEmpty>Aucun tiers trouvé.</CommandEmpty>
            )}
            {!loading && results.length > 0 && (
              <CommandGroup>
                {results.map((tp) => (
                  <CommandItem
                    key={tp.id}
                    value={tp.id}
                    onSelect={() => handleSelect(tp)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "h-4 w-4 shrink-0",
                        value === tp.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium truncate">{tp.displayName}</span>
                      <span className="text-xs text-muted-foreground">
                        {tp.referenceCode}
                        {tp.roles?.length > 0 && (
                          <> · {tp.roles.join(", ")}</>
                        )}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
