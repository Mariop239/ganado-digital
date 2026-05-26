import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { EVENT_REGISTRY, EVENT_TYPES } from "../registry";
import { DynamicEventForm } from "./DynamicEventForm";
import type { AnimalEventType } from "../types/domain";

type Props = {
  animalId: string;
  vacaNumero: string;
  defaultTipo?: AnimalEventType;
  triggerLabel?: string;
  variant?: "default" | "outline";
};

export function EventDialog({
  animalId,
  vacaNumero,
  defaultTipo,
  triggerLabel = "Registrar evento",
  variant = "default",
}: Props) {
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState<AnimalEventType>(defaultTipo ?? "observacion");
  const def = EVENT_REGISTRY[tipo];

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v && defaultTipo) setTipo(defaultTipo);
      }}
    >
      <DialogTrigger asChild>
        <Button variant={variant} size="lg" className="min-h-12">
          <Plus className="mr-2 h-5 w-5" /> {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{def.label}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <Label className="text-base">Tipo de evento</Label>
          <Select value={tipo} onValueChange={(v) => setTipo(v as AnimalEventType)}>
            <SelectTrigger className="h-12 text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EVENT_TYPES.map((t) => {
                const d = EVENT_REGISTRY[t];
                const Icon = d.icon;
                return (
                  <SelectItem key={t} value={t}>
                    <span className="inline-flex items-center gap-2">
                      <Icon className="h-4 w-4" /> {d.label}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <DynamicEventForm
          key={tipo}
          animalId={animalId}
          vacaNumero={vacaNumero}
          tipo={tipo}
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}