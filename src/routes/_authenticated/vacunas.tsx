import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Syringe, DollarSign, Beef, Plus } from "lucide-react";
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
      return [r.vaca_numero, r.vacas?.nombre, r.vacuna_aplicada, r.enfermedad_a_prevenir]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(s));
    });
  }, [data, q, tipo, producto]);

  const stats = useMemo(() => {
    const rows = data ?? [];
    const gasto = rows.reduce((s, r) => s + Number(r.gasto || 0), 0);
    const animales = new Set(rows.map((r) => r.animal_id ?? r.vaca_numero)).size;
    const programados = rows.filter((r) => r.estado_tratamiento === "programado").length;
    return { gasto, total: rows.length, animales, programados };
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Gasto total</CardTitle>
            <DollarSign className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{money(stats.gasto)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Registros</CardTitle>
            <Syringe className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Animales</CardTitle>
            <Beef className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.animales}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Programados</CardTitle>
            <Badge className="border-transparent bg-amber-500 text-white">Pendientes</Badge>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.programados}</div></CardContent>
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
              <TableRow><TableCell colSpan={7} className="py-6 text-center text-muted-foreground">Cargando…</TableCell></TableRow>
            )}
            {!isLoading && filtered.length === 0 && (
              <TableRow><TableCell colSpan={7} className="py-6 text-center text-muted-foreground">Sin registros.</TableCell></TableRow>
            )}
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">
                  #{r.vaca_numero}{r.vacas?.nombre ? ` — ${r.vacas.nombre}` : ""}
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
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}