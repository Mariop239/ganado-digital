import * as React from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
};

/**
 * Combobox de texto libre: muestra opciones existentes y permite
 * escribir un valor nuevo que se conserva al guardar.
 */
export function ComboboxFree({
  value,
  onChange,
  options,
  placeholder = "Seleccionar o escribir…",
  emptyText = "Sin coincidencias",
  disabled,
  className,
  id,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const normalized = options
    .map((o) => o?.trim())
    .filter((o): o is string => !!o)
    .filter((o, i, arr) => arr.findIndex((x) => x.toLowerCase() === o.toLowerCase()) === i)
    .sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));

  const trimmedQuery = query.trim();
  const exists =
    !!trimmedQuery &&
    normalized.some((o) => o.toLowerCase() === trimmedQuery.toLowerCase());

  const commit = (v: string) => {
    onChange(v);
    setQuery("");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "h-12 w-full justify-between text-base font-normal",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter>
          <CommandInput
            placeholder={placeholder}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            {trimmedQuery && !exists && (
              <CommandGroup heading="Nuevo">
                <CommandItem
                  value={`__new__${trimmedQuery}`}
                  onSelect={() => commit(trimmedQuery)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Usar "{trimmedQuery}"
                </CommandItem>
              </CommandGroup>
            )}
            {normalized.length > 0 && (
              <CommandGroup heading="Existentes">
                {normalized.map((opt) => (
                  <CommandItem key={opt} value={opt} onSelect={() => commit(opt)}>
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value?.toLowerCase() === opt.toLowerCase()
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                    {opt}
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