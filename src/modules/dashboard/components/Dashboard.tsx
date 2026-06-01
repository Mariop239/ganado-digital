import { useMemo, useState } from "react";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  Beef,
  Baby,
  Syringe,
  Plus,
  AlertTriangle,
  Stethoscope,
  CalendarHeart,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAnimals, FormAnimal, SelectorAnimal } from "@/modules/animals";
import { FormHistorial, useNacimientosMes } from "@/modules/breeding";
import {
  FormControlSanitarioGrupal,
  useGastoSanitarioMes,
  useAlertasSanitariasGlobales,
} from "@/modules/vaccinations";

const money = (n: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(n || 0);

type DialogKey = null | "animal" | "vacuna" | "parto";

export function Dashboard() {
  const { data: animals, isLoading: loadingAnimals } = useAnimals();
  const { data: nacimientos, isLoading: loadingNacimientos } =
    useNacimientosMes();
  const { data: gasto, isLoading: loadingGasto } = useGastoSanitarioMes();

  const activos = useMemo(
    () => (animals ?? []).filter((a) => a.estado_actual === "activa").length,
    [animals],
  );

  const [open, setOpen] = useState<DialogKey>(null);
  const [madreId, setMadreId] = useState<string | null>(null);

  const closeAll = () => {
    setOpen(null);
    setMadreId(null);
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
          Dashboard
        </h1>
        <p className="text-muted-foreground">
          Resumen general del rancho y accesos rápidos.
        </p>
      </header>

      {/* KPIs */}
      <section
        aria-label="Resumen"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <KpiCard
          label="Animales activos"
          value={activos}
          loading={loadingAnimals}
          icon={Beef}
          accent="text-emerald-600 dark:text-emerald-400"
        />
        <KpiCard
          label="Nacimientos del mes"
          value={nacimientos ?? 0}
          loading={loadingNacimientos}
          icon={Baby}
          accent="text-pink-600 dark:text-pink-400"
        />
        <KpiCard
          label="Gasto sanitario (mes)"
          value={money(gasto ?? 0)}
          loading={loadingGasto}
          icon={Stethoscope}
          accent="text-primary"
        />
      </section>

      {/* Acciones rápidas */}
      <section aria-label="Acciones rápidas" className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">
          Acciones rápidas
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <QuickAction
            label="Registrar parto"
            icon={CalendarHeart}
            onClick={() => setOpen("parto")}
          />
          <QuickAction
            label="Añadir animal"
            icon={Plus}
            onClick={() => setOpen("animal")}
          />
          <QuickAction
            label="Registrar vacuna"
            icon={Syringe}
            onClick={() => setOpen("vacuna")}
          />
        </div>
      </section>

      {/* Alertas */}
      <section aria-label="Tareas y alertas pendientes" className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">
          Tareas y alertas pendientes
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AlertasCrianza />
          <AlertasSanitarias />
        </div>
      </section>

      {/* Diálogos */}
      <Dialog
        open={open === "animal"}
        onOpenChange={(v) => (!v ? closeAll() : null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Añadir animal</DialogTitle>
          </DialogHeader>
          <FormAnimal onDone={closeAll} />
        </DialogContent>
      </Dialog>

      <Dialog
        open={open === "vacuna"}
        onOpenChange={(v) => (!v ? closeAll() : null)}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Registro sanitario grupal</DialogTitle>
          </DialogHeader>
          <FormControlSanitarioGrupal onDone={closeAll} />
        </DialogContent>
      </Dialog>

      <Dialog
        open={open === "parto"}
        onOpenChange={(v) => (!v ? closeAll() : null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {madreId ? "Registrar servicio / parto" : "Selecciona la madre"}
            </DialogTitle>
          </DialogHeader>
          {!madreId ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Elige la hembra a la que vas a registrar el servicio o parto.
              </p>
              <SelectorAnimal
                value={null}
                onChange={(id) => setMadreId(id)}
                sexo="hembra"
                placeholder="Buscar hembra…"
              />
            </div>
          ) : (
            <FormHistorial animalId={madreId} onDone={closeAll} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KpiCard({
  label,
  value,
  loading,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number | string;
  loading: boolean;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <Icon className={`h-6 w-6 ${accent}`} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-9 w-24" />
        ) : (
          <div className="text-3xl font-bold text-foreground">{value}</div>
        )}
      </CardContent>
    </Card>
  );
}

function QuickAction({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      className="flex min-h-20 w-full flex-col items-center justify-center gap-2 rounded-xl text-base font-semibold [&_svg]:size-6"
    >
      <Icon />
      <span>{label}</span>
    </Button>
  );
}

function AlertRow({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="flex items-start gap-3 p-4">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{meta}</p>
      </div>
    </div>
  );
}

function AlertasCrianza() {
  return (
    <Card className="border-amber-500/40 bg-amber-50/40 dark:bg-amber-950/10">
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-3">
        <CalendarHeart className="h-5 w-5 text-amber-600" />
        <CardTitle className="text-base font-semibold text-foreground">
          Alertas de crianza
        </CardTitle>
      </CardHeader>
      <CardContent className="divide-y divide-amber-500/20 p-0">
        <AlertRow
          title="Vaca V-045 próxima a parto"
          meta="Fecha probable: en 5 días"
        />
        <AlertRow
          title="Destete pendiente V-012"
          meta="Cría con más de 6 meses"
        />
      </CardContent>
    </Card>
  );
}

function AlertasSanitarias() {
  const { data, isLoading } = useAlertasSanitariasGlobales();
  const proximas = useMemo(() => (data ?? []).slice(0, 5), [data]);

  return (
    <Card className="border-sky-500/40 bg-sky-50/40 dark:bg-sky-950/10">
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-3">
        <Syringe className="h-5 w-5 text-sky-600" />
        <CardTitle className="text-base font-semibold text-foreground">
          Alertas sanitarias
        </CardTitle>
      </CardHeader>
      <CardContent className="divide-y divide-sky-500/20 p-0">
        {isLoading && (
          <div className="space-y-2 p-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        )}
        {!isLoading && proximas.length === 0 && (
          <div className="p-4 text-sm text-muted-foreground">
            Todo al día. No hay vacunas próximas.
          </div>
        )}
        {!isLoading &&
          proximas.map((r) => {
            const fecha = parseISO(r.fecha_proxima_dosis);
            const diff = differenceInCalendarDays(fecha, new Date());
            const label = format(fecha, "d MMM yyyy", { locale: es });
            const meta =
              diff < 0
                ? `Atrasado: ${label}`
                : diff === 0
                  ? `Hoy: ${label}`
                  : `En ${diff} día${diff === 1 ? "" : "s"}: ${label}`;
            const animal = `#${r.animal_numero}${r.animal_nombre ? ` — ${r.animal_nombre}` : ""}`;
            return (
              <SanitariaRow
                key={r.id}
                title={`${animal} · ${r.vacuna_aplicada}`}
                meta={meta}
                overdue={diff < 0}
              />
            );
          })}
      </CardContent>
    </Card>
  );
}

function SanitariaRow({
  title,
  meta,
  overdue,
}: {
  title: string;
  meta: string;
  overdue: boolean;
}) {
  return (
    <div className="flex items-start gap-3 p-4">
      <Syringe
        className={`mt-0.5 h-5 w-5 shrink-0 ${overdue ? "text-destructive" : "text-sky-600"}`}
      />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        <p
          className={`text-xs ${overdue ? "text-destructive" : "text-muted-foreground"}`}
        >
          {meta}
        </p>
      </div>
    </div>
  );
}