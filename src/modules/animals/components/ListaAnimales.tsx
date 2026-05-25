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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAnimals } from "../hooks/useAnimals";
import { FormAnimal } from "./FormAnimal";
import { CATEGORIA_LABELS, SEXO_LABELS } from "../constants/categorias";
import { ESTADO_ACTUAL_LABELS, ESTADO_REPRODUCTIVO_LABELS } from "../constants/estados";
import type { Sexo, Categoria } from "../types/domain";

export function ListaAnimales() {
  const [q, setQ] = useState("");
  const [soloActivas, setSoloActivas] = useState(true);
  const [sexo, setSexo] = useState<Sexo | "todos">("todos");
  const [categoria, setCategoria] = useState<Categoria | "todas">("todas");
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useAnimals({
    sexo: sexo === "todos" ? undefined : sexo,
    categoria: categoria === "todas" ? undefined : categoria,
    estado_actual: soloActivas ? "activa" : undefined,
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    const term = q.trim().toLowerCase();
    if (!term) return data;
    return data.filter(
      (a) => a.numero.toLowerCase().includes(term) || a.nombre.toLowerCase().includes(term),
    );
  }, [data, q]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Animales</h1>
          <p className="text-sm text-muted-foreground">Catálogo del rancho</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="min-h-12">
              <Plus className="mr-2 h-5 w-5" /> Crear animal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nuevo animal</DialogTitle>
            </DialogHeader>
            <FormAnimal onDone={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por número o nombre…"
            className="h-12 pl-11 text-base"
          />
        </div>
        <Select value={sexo} onValueChange={(v) => setSexo(v as Sexo | "todos")}>
          <SelectTrigger className="h-12 w-full sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los sexos</SelectItem>
            <SelectItem value="hembra">{SEXO_LABELS.hembra}</SelectItem>
            <SelectItem value="macho">{SEXO_LABELS.macho}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoria} onValueChange={(v) => setCategoria(v as Categoria | "todas")}>
          <SelectTrigger className="h-12 w-full sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las categorías</SelectItem>
            {(Object.keys(CATEGORIA_LABELS) as Categoria[]).map((c) => (
              <SelectItem key={c} value={c}>{CATEGORIA_LABELS[c]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
            {q ? "Sin resultados para esa búsqueda." : "Aún no hay animales registrados."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => (
            <Link
              key={a.id}
              to="/animales/$numero"
              params={{ numero: a.numero }}
              className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
            >
              <Card className="h-full transition-colors hover:bg-secondary/50">
                <CardContent className="space-y-1 p-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-lg font-semibold text-foreground">#{a.numero}</span>
                    {a.estado_actual !== "activa" && (
                      <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                        {ESTADO_ACTUAL_LABELS[a.estado_actual]}
                      </span>
                    )}
                  </div>
                  <div className="text-base text-foreground">{a.nombre || "Sin nombre"}</div>
                  <div className="text-sm text-muted-foreground">
                    {SEXO_LABELS[a.sexo]} · {CATEGORIA_LABELS[a.categoria]}
                    {a.estado_reproductivo ? ` · ${ESTADO_REPRODUCTIVO_LABELS[a.estado_reproductivo]}` : ""}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}