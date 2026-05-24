import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Syringe, DollarSign, Beef } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useVacunasGlobal } from "@/modules/vaccinations";

export const Route = createFileRoute("/_authenticated/vacunas")({
  component: VacunasGlobalPage,
});

const fmt = (d: string | null) => (d ? format(parseISO(d), "d MMM yyyy", { locale: es }) : "—");
const money = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n || 0);

function VacunasGlobalPage() {
  const { data, isLoading } = useVacunasGlobal();
  const [q, setQ] = useState("");

  const stats = useMemo(() => {
    const rows = data ?? [];
    const gasto = rows.reduce((s, r) => s + Number(r.gasto || 0), 0);
    const vacas = new Set(rows.map((r) => r.vaca_numero)).size;
    return { gasto, total: rows.length, vacas };
  }, [data]);

  const filtered = useMemo(() => {
    const rows = data ?? [];
    if (!q.trim()) return rows;
    const s = q.toLowerCase();
    return rows.filter((r) =>
      [r.vaca_numero, r.vacas?.nombre, r.vacuna_aplicada, r.enfermedad_a_prevenir]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(s))
    );
  }, [data, q]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Registro Global de Vacunas</h1>
        <p className="text-muted-foreground">Historial de todas las vacunas aplicadas en el rancho.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gasto total</CardTitle>
            <DollarSign className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{money(stats.gasto)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Aplicaciones</CardTitle>
            <Syringe className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vacas distintas</CardTitle>
            <Beef className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.vacas}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2">
        <Input
          placeholder="Buscar por vaca, vacuna o enfermedad…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-12 max-w-md text-base"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vaca</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Vacuna</TableHead>
              <TableHead>Enfermedad</TableHead>
              <TableHead className="text-right">Gasto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Cargando…</TableCell></TableRow>
            )}
            {!isLoading && filtered.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Sin registros.</TableCell></TableRow>
            )}
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">
                  #{r.vaca_numero}{r.vacas?.nombre ? ` — ${r.vacas.nombre}` : ""}
                </TableCell>
                <TableCell>{fmt(r.fecha)}</TableCell>
                <TableCell>{r.vacuna_aplicada}</TableCell>
                <TableCell>{r.enfermedad_a_prevenir || "—"}</TableCell>
                <TableCell className="text-right">{money(r.gasto)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}