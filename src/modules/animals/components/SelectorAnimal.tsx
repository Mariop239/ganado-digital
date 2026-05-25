import { useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { useAnimals } from "../hooks/useAnimals";
import type { Sexo } from "../types/domain";

type Props = {
  value: string | null;
  onChange: (id: string | null) => void;
  sexo?: Sexo;
  excludeId?: string;
  placeholder?: string;
  disabled?: boolean;
};

export function SelectorAnimal({
  value,
  onChange,
  sexo,
  excludeId,
  placeholder = "Buscar animal…",
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const { data: animales = [] } = useAnimals(sexo ? { sexo } : {});
  const filtrados = animales.filter((a) => a.id !== excludeId);
  const seleccionado = filtrados.find((a) => a.id === value) ?? null;

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="min-h-11 flex-1 justify-between"
            disabled={disabled}
          >
            {seleccionado
              ? `#${seleccionado.numero}${seleccionado.nombre ? " · " + seleccionado.nombre : ""}`
              : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar por número o nombre…" />
            <CommandList>
              <CommandEmpty>Sin resultados.</CommandEmpty>
              <CommandGroup>
                {filtrados.map((a) => (
                  <CommandItem
                    key={a.id}
                    value={`${a.numero} ${a.nombre}`}
                    onSelect={() => {
                      onChange(a.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === a.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    #{a.numero}
                    {a.nombre ? ` · ${a.nombre}` : ""}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value && !disabled && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="min-h-11 min-w-11"
          onClick={() => onChange(null)}
          aria-label="Quitar selección"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}