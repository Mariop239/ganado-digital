import { Fragment, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Syringe, CalendarClock, Beef, Plus, AlarmClock, ChevronRight, ChevronDown, Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  useVacunasGlobal,
  FormControlSanitarioGrupal,
  TIPO_TRATAMIENTO_LABELS,
  ESTADO_TRATAMIENTO_LABELS,
  type TipoTratamiento,
  type EstadoTratamiento,
} from "@/modules/vaccinations";

export const Route = createFileRoute("/_authenticated/vacunas")({
  component: ControlSanitarioPage,
});

const fmt = (d: string | null) => (d ? format(parseISO(d), "d MMM yyyy", { locale: es }) : "—");
const money = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n || 0);

function EstadoBadge({ estado }: { estado: EstadoTratamiento }) {
  const cls =
    estado === "programado"
      ? "border-transparent bg-amber-500 text-white hover:bg-amber-500/90"
      : "border-transparent bg-emerald-600 text-white hover:bg-emerald-600/90";
  return <Badge className={cls}>{ESTADO_TRATAMIENTO_LABELS[estado]}</Badge>;
}

function ControlSanitarioPage() {
  const { data, isLoading } = useVacunasGlobal();
  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState<"todos" | TipoTratamiento>("todos");
  const [producto, setProducto] = useState<string>("todos");
  const [openGrupal, setOpenGrupal] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleBatch = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const productos = useMemo(() => {
    const set = new Set<string>();
    (data ?? []).forEach((r) => {
      const p = r.vacuna_aplicada?.trim();
      if (p) set.add(p);
    });
    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, "es", { sensitivity: "base" }),
    );
  }, [data]);

  const filtered = useMemo(() => {
    const rows = data ?? [];
    const s = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (tipo !== "todos" && r.tipo_tratamiento !== tipo) return false;
      if (producto !== "todos" && r.vacuna_aplicada !== producto) return false;
      if (!s) return true;
      return [r.animals?.numero, r.animals?.nombre, r.vacuna_aplicada, r.enfermedad_a_prevenir]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(s));
    });
  }, [data, q, tipo, producto]);

  type GroupRow =
    | { kind: "single"; vacuna: (typeof filtered)[number] }
    | {
        kind: "batch";
        batch_id: string;
        fecha: string | null;
        fecha_proxima_dosis: string | null;
        tipo_tratamiento: TipoTratamiento;
        estado_tratamiento: EstadoTratamiento;
        vacuna_aplicada: string;
        gasto_total: number;
        items: (typeof filtered);
      };

  const grouped = useMemo<GroupRow[]>(() => {
    const out: GroupRow[] = [];
    const batches = new Map<string, GroupRow & { kind: "batch" }>();
    for (const r of filtered) {
      if (r.batch_id) {
        const existing = batches.get(r.batch_id);
        if (existing) {
          existing.items.push(r);
          existing.gasto_total += Number(r.gasto) || 0;
        } else {
          const row: GroupRow & { kind: "batch" } = {
            kind: "batch",
            batch_id: r.batch_id,
            fecha: r.fecha,
            fecha_proxima_dosis: r.fecha_proxima_dosis,
            tipo_tratamiento: r.tipo_tratamiento as TipoTratamiento,
            estado_tratamiento: r.estado_tratamiento as EstadoTratamiento,
            vacuna_aplicada: r.vacuna_aplicada,
            gasto_total: Number(r.gasto) || 0,
            items: [r],
          };
          batches.set(r.batch_id, row);
          out.push(row);
        }
      } else {
        out.push({ kind: "single", vacuna: r });
      }
    }
    return out;
  }, [filtered]);

  const stats = useMemo(() => {
    const rows = data ?? [];
    const animales = new Set(rows.map((r) => r.animal_id ?? r.animals?.numero)).size;
    const programados = rows.filter((r) => r.estado_tratamiento === "programado").length;
    const aplicados = rows.filter((r) => r.estado_tratamiento === "aplicado").length;
    const hoy = new Date();
    const proximos = rows.filter((r) => {
      if (!r.fecha_proxima_dosis) return false;
      const diff = differenceInCalendarDays(parseISO(r.fecha_proxima_dosis), hoy);
      return diff >= 0 && diff <= 15;
    }).length;
    return { aplicados, total: rows.length, animales, programados, proximos };
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Control Sanitario</h1>
          <p className="text-muted-foreground">
            Historial global de vacunas, vitaminas, desparasitantes y tratamientos.
          </p>
        </div>
        <Dialog open={openGrupal} onOpenChange={setOpenGrupal}>
          <DialogTrigger asChild>
            <Button size="lg" className="min-h-12">
              <Plus className="mr-2 h-5 w-5" /> Registro grupal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Registro sanitario grupal</DialogTitle>
            </DialogHeader>
            <FormControlSanitarioGrupal onDone={() => setOpenGrupal(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tratamientos aplicados</CardTitle>
            <Syringe className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.aplicados}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Animales atendidos</CardTitle>
            <Beef className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.animales}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Programados</CardTitle>
            <CalendarClock className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.programados}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Próximos 15 días</CardTitle>
            <AlarmClock className="h-5 w-5 text-amber-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-amber-600">{stats.proximos}</div></CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          placeholder="Buscar por animal, producto o motivo…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-11 max-w-md"
        />
        <Select value={tipo} onValueChange={(v) => setTipo(v as typeof tipo)}>
          <SelectTrigger className="h-11 w-full sm:w-56">
            <SelectValue placeholder="Tipo de tratamiento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los tipos</SelectItem>
            {Object.entries(TIPO_TRATAMIENTO_LABELS).map(([v, l]) => (
              <SelectItem key={v} value={v}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={producto} onValueChange={setProducto}>
          <SelectTrigger className="h-11 w-full sm:w-56">
            <SelectValue placeholder="Producto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los productos</SelectItem>
            {productos.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Animal</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Aplicación</TableHead>
              <TableHead>Programada / próxima</TableHead>
              <TableHead className="text-right">Gasto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={8} className="py-6 text-center text-muted-foreground">Cargando…</TableCell></TableRow>
            )}
            {!isLoading && grouped.length === 0 && (
              <TableRow><TableCell colSpan={8} className="py-6 text-center text-muted-foreground">Sin registros.</TableCell></TableRow>
            )}
            {grouped.map((row) => {
              if (row.kind === "single") {
                const r = row.vacuna;
                return (
                  <TableRow key={r.id}>
                    <TableCell />
                    <TableCell className="font-medium">
                      #{r.animals?.numero ?? "—"}{r.animals?.nombre ? ` — ${r.animals.nombre}` : ""}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {TIPO_TRATAMIENTO_LABELS[r.tipo_tratamiento as TipoTratamiento] ?? r.tipo_tratamiento}
                      </Badge>
                    </TableCell>
                    <TableCell>{r.vacuna_aplicada}</TableCell>
                    <TableCell><EstadoBadge estado={r.estado_tratamiento} /></TableCell>
                    <TableCell>{fmt(r.fecha)}</TableCell>
                    <TableCell>{fmt(r.fecha_proxima_dosis)}</TableCell>
                    <TableCell className="text-right">{money(r.gasto)}</TableCell>
                  </TableRow>
                );
              }
              const isOpen = expanded.has(row.batch_id);
              return (
                <Fragment key={row.batch_id}>
                  <TableRow
                    key={row.batch_id}
                    className="cursor-pointer bg-muted/30 hover:bg-muted/50"
                    onClick={() => toggleBatch(row.batch_id)}
                  >
                    <TableCell className="w-8">
                      {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Badge className="border-transparent bg-primary/10 text-primary hover:bg-primary/20">
                          <Layers className="mr-1 h-3 w-3" /> Lote · {row.items.length} animales
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {TIPO_TRATAMIENTO_LABELS[row.tipo_tratamiento] ?? row.tipo_tratamiento}
                      </Badge>
                    </TableCell>
                    <TableCell>{row.vacuna_aplicada}</TableCell>
                    <TableCell><EstadoBadge estado={row.estado_tratamiento} /></TableCell>
                    <TableCell>{fmt(row.fecha)}</TableCell>
                    <TableCell>{fmt(row.fecha_proxima_dosis)}</TableCell>
                    <TableCell className="text-right font-medium">{money(row.gasto_total)}</TableCell>
                  </TableRow>
                  {isOpen &&
                    row.items.map((r) => (
                      <TableRow key={r.id} className="bg-muted/10">
                        <TableCell />
                        <TableCell className="pl-8 text-sm">
                          #{r.animals?.numero ?? "—"}{r.animals?.nombre ? ` — ${r.animals.nombre}` : ""}
                        </TableCell>
                        <TableCell colSpan={5} className="text-sm text-muted-foreground">
                          Incluido en el lote
                        </TableCell>
                        <TableCell className="text-right text-sm">{money(r.gasto)}</TableCell>
                      </TableRow>
                    ))}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}