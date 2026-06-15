import { useMemo, useState } from "react";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  Beef,
  Baby,
  Syringe,
  Plus,
  Stethoscope,
  CalendarHeart,
  Check,
  Bug,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useAnimals, FormAnimal, SelectorAnimal } from "@/modules/animals";
import {
  FormHistorial,
  useNacimientosMes,
  useAlertasCrianza,
  useMarcarParida,
  useMarcarDestetado,
  type AlertaCrianza,
} from "@/modules/breeding";
import {
  FormControlSanitarioGrupal,
  FormVacuna,
  useGastoSanitarioMes,
  useAlertasSanitariasGlobales,
} from "@/modules/vaccinations";
import type { AlertaSanitaria, TipoTratamiento } from "@/modules/vaccinations";
import { PushNotificationsBanner } from "@/modules/notifications";
import { supabase } from "@/integrations/supabase/client";

const money = (n: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(n || 0);

type DialogState =
  | { tipo: "animal" }
  | { tipo: "vacuna-grupal" }
  | {
      tipo: "vacuna-grupal-resolver";
      alertasIds: string[];
      animalesIds: string[];
      modoResolucionTipo: "update" | "create_and_clear";
      prefill: {
        tipo_tratamiento?: TipoTratamiento;
        vacuna_aplicada?: string;
        enfermedad_a_prevenir?: string;
        fecha_proxima_dosis?: string | null;
      };
    }
  | {
      tipo: "vacuna-rapida";
      animalId: string;
      alertaId?: string;
      alertaEstado?: "programado" | "aplicado";
      prefill?: {
        tipo_tratamiento?: string;
        vacuna_aplicada?: string;
        enfermedad_a_prevenir?: string;
      };
    }
  | { tipo: "parto-selector" }
  | {
      tipo: "parto";
      animalId: string;
      historialId: string;
      toro: string | null;
      madreLabel: string;
    };

export function Dashboard() {
  const { data: animals, isLoading: loadingAnimals } = useAnimals();
  const { data: nacimientos, isLoading: loadingNacimientos } =
    useNacimientosMes();
  const { data: gasto, isLoading: loadingGasto } = useGastoSanitarioMes();

  const activos = useMemo(
    () => (animals ?? []).filter((a) => a.estado_actual === "activa").length,
    [animals],
  );

  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [partoSelectorId, setPartoSelectorId] = useState<string | null>(null);

  const closeAll = () => {
    setDialog(null);
    setPartoSelectorId(null);
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

      <PushNotificationsBanner />

      <DebugNotificacionesCard />

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
            onClick={() => setDialog({ tipo: "parto-selector" })}
          />
          <QuickAction
            label="Añadir animal"
            icon={Plus}
            onClick={() => setDialog({ tipo: "animal" })}
          />
          <QuickAction
            label="Registrar vacuna"
            icon={Syringe}
            onClick={() => setDialog({ tipo: "vacuna-grupal" })}
          />
        </div>
      </section>

      {/* Alertas */}
      <section aria-label="Tareas y alertas pendientes" className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">
          Tareas y alertas pendientes
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AlertasCrianza
            onRegistrarParto={(a) =>
              setDialog({
                tipo: "parto",
                animalId: a.animal_id,
                historialId: a.historial_id,
                toro: a.toro,
                madreLabel: animalLabel(a),
              })
            }
          />
          <AlertasSanitarias
            onRegistrar={(animalId, alertaId, alertaEstado, prefill) =>
              setDialog({ tipo: "vacuna-rapida", animalId, alertaId, alertaEstado, prefill })
            }
            onResolverLote={(payload) =>
              setDialog({ tipo: "vacuna-grupal-resolver", ...payload })
            }
          />
        </div>
      </section>

      {/* Diálogos */}
      <Dialog
        open={dialog?.tipo === "animal"}
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
        open={dialog?.tipo === "vacuna-grupal"}
        onOpenChange={(v) => (!v ? closeAll() : null)}
      >
        <DialogContent className="max-w-3xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registro sanitario grupal</DialogTitle>
          </DialogHeader>
          <FormControlSanitarioGrupal onDone={closeAll} />
        </DialogContent>
      </Dialog>

      {/* Resolución masiva de alertas sanitarias */}
      <Dialog
        open={dialog?.tipo === "vacuna-grupal-resolver"}
        onOpenChange={(v) => (!v ? closeAll() : null)}
      >
        <DialogContent className="max-w-3xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Resolver lote sanitario</DialogTitle>
          </DialogHeader>
          {dialog?.tipo === "vacuna-grupal-resolver" && (
            <FormControlSanitarioGrupal
              onDone={closeAll}
              modoResolucion
              alertasIds={dialog.alertasIds}
              animalesIdsPreseleccionados={dialog.animalesIds}
              modoResolucionTipo={dialog.modoResolucionTipo}
              prefill={dialog.prefill}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Acción rápida: registrar vacuna a un animal puntual */}
      <Dialog
        open={dialog?.tipo === "vacuna-rapida"}
        onOpenChange={(v) => (!v ? closeAll() : null)}
      >
        <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar tratamiento</DialogTitle>
          </DialogHeader>
          {dialog?.tipo === "vacuna-rapida" && (
            <FormVacuna
              animalId={dialog.animalId}
              alertaId={dialog.alertaId}
              alertaEstado={dialog.alertaEstado}
              prefill={dialog.prefill as any}
              onDone={closeAll}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Selector del header para "Registrar parto" */}
      <Dialog
        open={dialog?.tipo === "parto-selector"}
        onOpenChange={(v) => (!v ? closeAll() : null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {partoSelectorId
                ? "Registrar servicio / parto"
                : "Selecciona la madre"}
            </DialogTitle>
          </DialogHeader>
          {!partoSelectorId ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Elige la hembra a la que vas a registrar el servicio o parto.
              </p>
              <SelectorAnimal
                value={null}
                onChange={(id) => setPartoSelectorId(id)}
                sexo="hembra"
                placeholder="Buscar hembra…"
              />
            </div>
          ) : (
            <FormHistorial animalId={partoSelectorId} onDone={closeAll} />
          )}
        </DialogContent>
      </Dialog>

      {/* Acción rápida de parto desde una alerta — reusa el flujo de "Registrar nacimiento" */}
      <PartoRapidoDialog
        state={dialog?.tipo === "parto" ? dialog : null}
        onClose={closeAll}
      />
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

function CrianzaRow({
  title,
  meta,
  icon: Icon,
  alert,
  action,
}: {
  title: string;
  meta: string;
  icon: React.ComponentType<{ className?: string }>;
  alert: boolean;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 p-4">
      <Icon
        className={`mt-0.5 h-5 w-5 shrink-0 ${alert ? "text-destructive" : "text-amber-600"}`}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        <p
          className={`text-xs ${alert ? "text-destructive" : "text-muted-foreground"}`}
        >
          {meta}
        </p>
      </div>
      {action ? <div className="ml-auto shrink-0">{action}</div> : null}
    </div>
  );
}

function animalLabel(a: AlertaCrianza) {
  return `#${a.animal_numero}${a.animal_nombre ? ` — ${a.animal_nombre}` : ""}`;
}

function DebugNotificacionesCard() {
  const [running, setRunning] = useState(false);

  const runTest = async () => {
    setRunning(true);
    try {
      // Paso A: permisos de notificación
      if (!("Notification" in window)) {
        toast.error("Este navegador no soporta notificaciones.");
      } else if (Notification.permission === "granted") {
        toast.success("Paso A: permiso de notificaciones concedido.");
      } else if (Notification.permission === "denied") {
        toast.error(
          "Paso A: permiso de notificaciones denegado. Habilítalo en la configuración del navegador.",
        );
      } else {
        const res = await Notification.requestPermission();
        if (res === "granted") {
          toast.success("Paso A: permiso concedido tras solicitud.");
        } else {
          toast.error(`Paso A: permiso no concedido (${res}).`);
        }
      }

      // Paso B: Service Worker push-sw.js
      if (!("serviceWorker" in navigator)) {
        toast.error("Paso B: Service Worker no soportado en este navegador.");
      } else {
        const regs = await navigator.serviceWorker.getRegistrations();
        const pushReg = regs.find((r) => {
          const url =
            r.active?.scriptURL ||
            r.waiting?.scriptURL ||
            r.installing?.scriptURL ||
            "";
          return url.includes("push-sw.js");
        });
        if (!pushReg) {
          toast.error(
            "Paso B: push-sw.js no está registrado. Activa las notificaciones desde el banner.",
          );
        } else if (!pushReg.active) {
          toast.warning("Paso B: push-sw.js registrado pero aún no activo.");
        } else {
          toast.success("Paso B: push-sw.js registrado y activo.");
        }
      }

      // Paso C: POST al hook
      // Obtenemos la anon/publishable key directamente desde el cliente
      // centralizado de Supabase para no depender de VITE_SUPABASE_ANON_KEY
      // (que en este entorno viene undefined).
      const apikey =
        ((supabase as unknown as { supabaseKey?: string }).supabaseKey) ||
        (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
        (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined);
      if (!apikey) {
        toast.error(
          "Paso C: no se pudo obtener la anon key desde el cliente de Supabase.",
        );
        return;
      }
      try {
        const resp = await fetch("/api/public/hooks/vacunas-recordatorios", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey,
            Authorization: `Bearer ${apikey}`,
          },
          body: JSON.stringify({ test: true }),
        });
        const text = await resp.text();
        if (!resp.ok) {
          toast.error(
            `Paso C: error ${resp.status} ${resp.statusText} — ${text.slice(0, 300)}`,
            { duration: 10000 },
          );
        } else {
          toast.success(
            `Paso C: hook OK (${resp.status}) — ${text.slice(0, 200) || "sin cuerpo"}`,
          );
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        toast.error(`Paso C: fallo de red — ${msg}`, { duration: 10000 });
      }
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card className="border-dashed border-muted-foreground/30 bg-muted/20">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <Bug className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Diagnóstico (temporal)
          </CardTitle>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={runTest}
          disabled={running}
        >
          {running ? "Ejecutando…" : "Ejecutar Test de Notificaciones"}
        </Button>
      </CardHeader>
    </Card>
  );
}

function AlertasCrianza({
  onRegistrarParto,
}: {
  onRegistrarParto: (a: AlertaCrianza) => void;
}) {
  const { data, isLoading } = useAlertasCrianza();
  const items = useMemo(() => (data ?? []).slice(0, 5), [data]);
  const destetar = useMarcarDestetado();
  const [confirm, setConfirm] = useState<AlertaCrianza | null>(null);

  return (
    <>
    <Card className="border-amber-500/40 bg-amber-50/40 dark:bg-amber-950/10">
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-3">
        <CalendarHeart className="h-5 w-5 text-amber-600" />
        <CardTitle className="text-base font-semibold text-foreground">
          Alertas de crianza
        </CardTitle>
      </CardHeader>
      <CardContent className="divide-y divide-amber-500/20 p-0">
        {isLoading && (
          <div className="space-y-2 p-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        )}
        {!isLoading && items.length === 0 && (
          <div className="p-4 text-sm text-muted-foreground">
            No hay partos ni destetes próximos.
          </div>
        )}
        {!isLoading &&
          items.map((a) => {
            const fecha = parseISO(a.fecha_clave);
            const diff = differenceInCalendarDays(fecha, new Date());
            const fechaLabel = format(fecha, "d MMM yyyy", { locale: es });
            if (a.tipo === "parto") {
              const overdue = diff < 0;
              const meta = overdue
                ? `Atrasado por ${Math.abs(diff)} día${Math.abs(diff) === 1 ? "" : "s"} (${fechaLabel})`
                : diff === 0
                  ? `Hoy: ${fechaLabel}`
                  : `Faltan ${diff} día${diff === 1 ? "" : "s"} (${fechaLabel})`;
              return (
                <CrianzaRow
                  key={a.id}
                  icon={CalendarHeart}
                  title={`Próximo parto: ${animalLabel(a)}`}
                  meta={meta}
                  alert={overdue}
                  action={
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => onRegistrarParto(a)}
                    >
                      <Baby className="h-4 w-4" />
                      <span className="hidden sm:inline">Registrar</span>
                    </Button>
                  }
                />
              );
            }
            // destete
            const partoLabel = a.fecha_parto
              ? format(parseISO(a.fecha_parto), "d MMM yyyy", { locale: es })
              : "—";
            const edadDias = a.fecha_parto
              ? differenceInCalendarDays(new Date(), parseISO(a.fecha_parto))
              : 0;
            const meses = Math.floor(edadDias / 30);
            const overdue = edadDias > 210;
            const meta = overdue
              ? `La cría tiene ${meses} meses (nacida el ${partoLabel})`
              : `Cría nacida el ${partoLabel}`;
            return (
              <CrianzaRow
                key={a.id}
                icon={Baby}
                title={`Destete pendiente: ${animalLabel(a)}`}
                meta={meta}
                alert={overdue}
                action={
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setConfirm(a)}
                    disabled={destetar.isPending}
                  >
                    <Check className="h-4 w-4" />
                    <span className="hidden sm:inline">Destetar</span>
                  </Button>
                }
              />
            );
          })}
      </CardContent>
    </Card>

    <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Confirmar destete?</AlertDialogTitle>
          <AlertDialogDescription>
            Se registrará el destete de {confirm ? animalLabel(confirm) : ""} con la fecha de hoy.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={async () => {
              if (!confirm) return;
              try {
                await destetar.mutateAsync(confirm.historial_id);
                toast.success("Destete registrado");
              } catch (e: unknown) {
                toast.error(e instanceof Error ? e.message : "Error al registrar destete");
              } finally {
                setConfirm(null);
              }
            }}
          >
            Confirmar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

function AlertasSanitarias({
  onRegistrar,
  onResolverLote,
}: {
  onRegistrar: (
    animalId: string,
    alertaId?: string,
    alertaEstado?: "programado" | "aplicado",
    prefill?: { tipo_tratamiento?: string; vacuna_aplicada?: string; enfermedad_a_prevenir?: string },
  ) => void;
  onResolverLote: (payload: {
    alertasIds: string[];
    animalesIds: string[];
    modoResolucionTipo: "update" | "create_and_clear";
    prefill: {
      tipo_tratamiento?: TipoTratamiento;
      vacuna_aplicada?: string;
      enfermedad_a_prevenir?: string;
      fecha_proxima_dosis?: string | null;
    };
  }) => void;
}) {
  const { data, isLoading } = useAlertasSanitariasGlobales();

  // Agrupar por vacuna_aplicada + fecha_proxima_dosis + batch_id
  const grupos = useMemo(() => {
    const map = new Map<string, AlertaSanitaria[]>();
    for (const a of data ?? []) {
      const key = `${a.vacuna_aplicada}|${a.fecha_proxima_dosis}|${a.batch_id ?? `solo-${a.id}`}`;
      const arr = map.get(key) ?? [];
      arr.push(a);
      map.set(key, arr);
    }
    return Array.from(map.values()).slice(0, 5);
  }, [data]);

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
        {!isLoading && grupos.length === 0 && (
          <div className="p-4 text-sm text-muted-foreground">
            Todo al día. No hay vacunas próximas.
          </div>
        )}
        {!isLoading &&
          grupos.map((grupo) => {
            const r = grupo[0];
            const fecha = parseISO(r.fecha_proxima_dosis);
            const diff = differenceInCalendarDays(fecha, new Date());
            const label = format(fecha, "d MMM yyyy", { locale: es });
            const meta =
              diff < 0
                ? `Atrasado: ${label}`
                : diff === 0
                  ? `Hoy: ${label}`
                  : `En ${diff} día${diff === 1 ? "" : "s"}: ${label}`;

            if (grupo.length > 1) {
              const aplicado = grupo.every(
                (g) => g.estado_tratamiento === "aplicado",
              );
              const modoResolucionTipo: "update" | "create_and_clear" =
                aplicado ? "create_and_clear" : "update";
              return (
                <SanitariaRow
                  key={`lote-${r.batch_id ?? r.id}`}
                  title={`Lote: ${r.vacuna_aplicada} (${grupo.length} animales)`}
                  meta={meta}
                  overdue={diff < 0}
                  buttonLabel="Resolver Lote"
                  onRegistrar={() =>
                    onResolverLote({
                      alertasIds: grupo.map((g) => g.id),
                      animalesIds: grupo.map((g) => g.animal_id),
                      modoResolucionTipo,
                      prefill: {
                        tipo_tratamiento:
                          r.tipo_tratamiento as TipoTratamiento,
                        vacuna_aplicada: r.vacuna_aplicada,
                        enfermedad_a_prevenir: r.enfermedad_a_prevenir,
                        fecha_proxima_dosis: null,
                      },
                    })
                  }
                />
              );
            }

            const animal = `#${r.animal_numero}${r.animal_nombre ? ` — ${r.animal_nombre}` : ""}`;
            return (
              <SanitariaRow
                key={r.id}
                title={`${animal} · ${r.vacuna_aplicada}`}
                meta={meta}
                overdue={diff < 0}
                onRegistrar={() =>
                  onRegistrar(
                    r.animal_id,
                    r.id,
                    r.estado_tratamiento as "programado" | "aplicado",
                    {
                      tipo_tratamiento: r.tipo_tratamiento,
                      vacuna_aplicada: r.vacuna_aplicada,
                      enfermedad_a_prevenir: r.enfermedad_a_prevenir,
                    },
                  )
                }
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
  onRegistrar,
  buttonLabel = "Registrar",
}: {
  title: string;
  meta: string;
  overdue: boolean;
  onRegistrar: () => void;
  buttonLabel?: string;
}) {
  return (
    <div className="flex items-start gap-3 p-4">
      <Syringe
        className={`mt-0.5 h-5 w-5 shrink-0 ${overdue ? "text-destructive" : "text-sky-600"}`}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        <p
          className={`text-xs ${overdue ? "text-destructive" : "text-muted-foreground"}`}
        >
          {meta}
        </p>
      </div>
      <div className="ml-auto shrink-0">
        <Button type="button" size="sm" variant="outline" onClick={onRegistrar}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">{buttonLabel}</span>
        </Button>
      </div>
    </div>
  );
}

function PartoRapidoDialog({
  state,
  onClose,
}: {
  state:
    | {
        tipo: "parto";
        animalId: string;
        historialId: string;
        toro: string | null;
        madreLabel: string;
      }
    | null;
  onClose: () => void;
}) {
  const marcarParida = useMarcarParida(state?.animalId ?? "");
  return (
    <Dialog open={!!state} onOpenChange={(v) => (!v ? onClose() : null)}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar nacimiento — {state?.madreLabel}</DialogTitle>
        </DialogHeader>
        {state && (
          <FormAnimal
            defaults={{
              mother_id: state.animalId,
              madre_texto: state.madreLabel,
              padre_texto: state.toro ?? "",
              fecha_nacimiento: new Date().toISOString().slice(0, 10),
              sexo: "hembra",
              categoria: "ternera",
            }}
            lockedFields={["mother_id", "madre_texto", "padre_texto"]}
            onDone={onClose}
            onAfterCreate={async (created) => {
              try {
                await marcarParida.mutateAsync({
                  id: state.historialId,
                  input: {
                    fecha_parto:
                      created.fecha_nacimiento ??
                      new Date().toISOString().slice(0, 10),
                    sexo_cria: created.sexo === "macho" ? "Macho" : "Hembra",
                    cria_animal_id: created.id,
                  },
                });
                toast.success("Nacimiento registrado y parto cerrado");
              } catch (e: unknown) {
                toast.error(
                  e instanceof Error ? e.message : "Error al actualizar el servicio",
                );
              }
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}