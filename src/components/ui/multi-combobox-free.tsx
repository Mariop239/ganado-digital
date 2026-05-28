import * as React from "react";
import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  value: string[];
  onChange: (value: string[]) => void;
  options: string[];
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
};

/**
 * Multi-combobox de texto libre: permite seleccionar varias opciones existentes
 * y/o crear nuevas escribiéndolas.
 */
export function MultiComboboxFree({
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

  const selected = React.useMemo(
    () => (value ?? []).map((v) => v.trim()).filter(Boolean),
    [value],
  );

  const normalized = React.useMemo(
    () =>
      options
        .map((o) => o?.trim())
        .filter((o): o is string => !!o)
        .filter(
          (o, i, arr) =>
            arr.findIndex((x) => x.toLowerCase() === o.toLowerCase()) === i,
        )
        .sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" })),
    [options],
  );

  const trimmedQuery = query.trim();
  const lowerQuery = trimmedQuery.toLowerCase();
  const filtered = trimmedQuery
    ? normalized.filter((o) => o.toLowerCase().includes(lowerQuery))
    : normalized;
  const existsInOptions =
    !!trimmedQuery && normalized.some((o) => o.toLowerCase() === lowerQuery);
  const alreadySelected = (v: string) =>
    selected.some((s) => s.toLowerCase() === v.toLowerCase());

  const toggle = (v: string) => {
    const t = v.trim();
    if (!t) return;
    if (alreadySelected(t)) {
      onChange(selected.filter((s) => s.toLowerCase() !== t.toLowerCase()));
    } else {
      onChange([...selected, t]);
    }
    setQuery("");
  };

  const remove = (v: string) => {
    onChange(selected.filter((s) => s.toLowerCase() !== v.toLowerCase()));
  };

  return (
    <div className={cn("space-y-2", className)}>
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
              "min-h-12 w-full justify-between text-base font-normal",
              selected.length === 0 && "text-muted-foreground",
            )}
          >
            <span className="truncate">
              {selected.length === 0
                ? placeholder
                : `${selected.length} seleccionado${selected.length === 1 ? "" : "s"}`}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={placeholder}
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              {filtered.length === 0 && !trimmedQuery && (
                <CommandEmpty>{emptyText}</CommandEmpty>
              )}
              {trimmedQuery && !existsInOptions && !alreadySelected(trimmedQuery) && (
                <CommandGroup heading="Nuevo">
                  <CommandItem
                    value={`__new__${trimmedQuery}`}
                    onSelect={() => toggle(trimmedQuery)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Añadir "{trimmedQuery}"
                  </CommandItem>
                </CommandGroup>
              )}
              {filtered.length > 0 && (
                <CommandGroup heading="Opciones">
                  {filtered.map((opt) => {
                    const isSel = alreadySelected(opt);
                    return (
                      <CommandItem key={opt} value={opt} onSelect={() => toggle(opt)}>
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            isSel ? "opacity-100" : "opacity-0",
                          )}
                        />
                        {opt}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((s) => (
            <Badge key={s} variant="secondary" className="gap-1 pr-1">
              {s}
              <button
                type="button"
                onClick={() => remove(s)}
                disabled={disabled}
                className="rounded-sm p-0.5 hover:bg-muted-foreground/20 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                aria-label={`Quitar ${s}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}