import * as React from "react";
import { format, parseISO, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type Props = {
  /** ISO date string `yyyy-MM-dd` or null/empty for vacío. */
  value?: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Si true permite borrar la fecha con un botón. Default true. */
  clearable?: boolean;
  /** Restringe la selección a fechas pasadas (incluye hoy). */
  disableFuture?: boolean;
  /** Restringe la selección a fechas futuras (incluye hoy). */
  disablePast?: boolean;
  className?: string;
  id?: string;
};

/**
 * DatePicker estandarizado de la app: usa popover + Calendar de shadcn/ui
 * y devuelve la fecha en formato ISO `yyyy-MM-dd`. Reemplaza a los
 * inputs nativos `<input type="date">`.
 */
export function DatePicker({
  value,
  onChange,
  placeholder = "Selecciona una fecha",
  disabled,
  clearable = true,
  disableFuture,
  disablePast,
  className,
  id,
}: Props) {
  const dateValue = React.useMemo(() => {
    if (!value) return undefined;
    const d = parseISO(value);
    return isValid(d) ? d : undefined;
  }, [value]);

  const [open, setOpen] = React.useState(false);

  return (
    <div className={cn("flex gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "h-12 flex-1 justify-start text-left text-base font-normal",
              !dateValue && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateValue ? format(dateValue, "PPP", { locale: es }) : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={dateValue}
            onSelect={(d) => {
              onChange(d ? format(d, "yyyy-MM-dd") : null);
              setOpen(false);
            }}
            disabled={(date) => {
              if (disableFuture && date > new Date()) return true;
              if (disablePast && date < new Date(new Date().toDateString())) return true;
              return false;
            }}
            initialFocus
            locale={es}
            captionLayout="dropdown"
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
      {clearable && dateValue && !disabled && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-12 w-12"
          onClick={() => onChange(null)}
          aria-label="Limpiar fecha"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}