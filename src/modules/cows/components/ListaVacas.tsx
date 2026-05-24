import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useVacas } from "../hooks/useVacas";
import { FormVaca } from "./FormVaca";

export function ListaVacas() {
  const [q, setQ] = useState("");
  const [soloActivas, setSoloActivas] = useState(true);
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useVacas(soloActivas);

  const filtered = useMemo(() => {
    if (!data) return [];
    const term = q.trim().toLowerCase();
    if (!term) return data;
    return data.filter(
      (v) => v.numero.toLowerCase().includes(term) || v.nombre.toLowerCase().includes(term),
    );
  }, [data, q]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Vacas Paridas</h1>
          <p className="text-sm text-muted-foreground">Listado del rancho</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="min-h-12">
              <Plus className="mr-2 h-5 w-5" /> Añadir nueva vaca
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nueva vaca</DialogTitle>
            </DialogHeader>
            <FormVaca onDone={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por número o nombre…"
            className="h-12 pl-11 text-base"
          />
        </div>
        <Tabs value={soloActivas ? "activas" : "todas"} onValueChange={(v) => setSoloActivas(v === "activas")}>
          <TabsList className="h-12">
            <TabsTrigger value="activas" className="min-h-10 px-4 text-base">Activas</TabsTrigger>
            <TabsTrigger value="todas" className="min-h-10 px-4 text-base">Todas</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <p className="py-10 text-center text-muted-foreground">Cargando…</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {q ? "Sin resultados para esa búsqueda." : "Aún no hay vacas registradas. Añade la primera."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((v) => (
            <Link
              key={v.numero}
              to="/vacas/$numero"
              params={{ numero: v.numero }}
              className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
            >
              <Card className="h-full transition-colors hover:bg-secondary/50">
                <CardContent className="space-y-1 p-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-lg font-semibold text-foreground">#{v.numero}</span>
                    {v.fecha_egreso && (
                      <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                        Egresada
                      </span>
                    )}
                  </div>
                  <div className="text-base text-foreground">{v.nombre || "Sin nombre"}</div>
                  <div className="text-sm text-muted-foreground">{v.raza || "Raza sin especificar"}</div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}