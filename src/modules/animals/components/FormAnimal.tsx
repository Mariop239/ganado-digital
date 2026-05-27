import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { animalSchema, type AnimalFormInput, type AnimalFormOutput } from "../schemas";
import type { Animal } from "../types/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAnimals, useCreateAnimal, useUpdateAnimal } from "../hooks/useAnimals";
import { ComboboxFree } from "@/components/ui/combobox-free";
import { DatePicker } from "@/components/ui/date-picker";
import { CATEGORIA_LABELS, SEXO_LABELS, categoriasPorSexo, aplicaEstadoReproductivo } from "../constants/categorias";
import { ESTADOS_REPRODUCTIVOS, ESTADO_REPRODUCTIVO_LABELS, ESTADOS_ACTUALES, ESTADO_ACTUAL_LABELS } from "../constants/estados";
import { SelectorAnimal } from "./SelectorAnimal";
import { derivarCategoria, edadEnMeses, adultasPorSexo } from "../utils/categorias";
import { toast } from "sonner";

type Props = {
  animal?: Animal;
  onDone: (numero: string) => void;
  /** Semilla inicial cuando NO se está editando un animal. */
  defaults?: Partial<AnimalFormInput>;
  /** Campos a renderizar disabled (precargados y no editables). */
  lockedFields?: Array<keyof AnimalFormInput>;
  /** Hook opcional ejecutado tras crear con éxito; recibe el animal creado. */
  onAfterCreate?: (created: Animal) => void | Promise<void>;
};

export function FormAnimal({
  animal,
  onDone,
  defaults,
  lockedFields,
  onAfterCreate,
}: Props) {
  const editing = !!animal;
  const locked = (k: keyof AnimalFormInput) => !!lockedFields?.includes(k);
  const form = useForm<AnimalFormInput>({
    resolver: zodResolver(animalSchema),
    defaultValues: animal
      ? {
          numero: animal.numero,
          nombre: animal.nombre,
          sexo: animal.sexo,
          categoria: animal.categoria,
          estado_actual: animal.estado_actual,
          estado_reproductivo: animal.estado_reproductivo,
          fecha_nacimiento: animal.fecha_nacimiento,
          color: animal.color,
          raza: animal.raza,
          dueno: animal.dueno,
          mother_id: animal.mother_id,
          father_id: animal.father_id,
          madre_texto: animal.madre_texto,
          padre_texto: animal.padre_texto,
          ubicacion_actual: animal.ubicacion_actual ?? "Mi rancho",
          lote_actual: animal.lote_actual ?? "",
        }
      : {
          numero: "", nombre: "", sexo: "hembra", categoria: "vaca",
          estado_actual: "activa", estado_reproductivo: null,
          fecha_nacimiento: null, color: "", raza: "", dueno: "",
          mother_id: null, father_id: null, madre_texto: "", padre_texto: "",
          ubicacion_actual: "Mi rancho", lote_actual: "",
          ...defaults,
        },
  });
  const create = useCreateAnimal();
  const update = useUpdateAnimal(animal?.id ?? "");

  // Opciones dinámicas para Ubicación y Lote a partir de los animales existentes.
  const { data: animalesExistentes } = useAnimals();
  const ubicacionOptions = Array.from(
    new Set(
      (animalesExistentes ?? [])
        .map((a) => a.ubicacion_actual?.trim() ?? "")
        .filter(Boolean),
    ),
  );
  if (!ubicacionOptions.some((o) => o.toLowerCase() === "mi rancho")) {
    ubicacionOptions.push("Mi rancho");
  }
  const loteOptions = Array.from(
    new Set(
      (animalesExistentes ?? [])
        .map((a) => a.lote_actual?.trim() ?? "")
        .filter(Boolean),
    ),
  );

  const sexo = form.watch("sexo");
  const categoria = form.watch("categoria");
  const fechaNacimiento = form.watch("fecha_nacimiento");
  const categoriasDisponibles = categoriasPorSexo(sexo);
  const showEstadoRepro = aplicaEstadoReproductivo(sexo, categoria);

  // Derivación biológica
  const meses = edadEnMeses(fechaNacimiento ?? null);
  const esJoven = meses !== null && meses <= 15;
  const esAdulto = meses !== null && meses > 15;
  const derivada = esJoven
    ? derivarCategoria({
        fecha_nacimiento: fechaNacimiento ?? null,
        sexo,
        categoria,
      }).categoria_view
    : null;
  const adultas = adultasPorSexo(sexo);

  // Reset implícito al cambiar sexo / fecha_nacimiento
  useEffect(() => {
    if (sexo === "macho") form.setValue("estado_reproductivo", null);

    if (esJoven && derivada && categoria !== derivada) {
      form.setValue("categoria", derivada, { shouldDirty: true });
      return;
    }
    if (esAdulto && !(adultas as readonly string[]).includes(categoria)) {
      form.setValue("categoria", adultas[0], { shouldDirty: true });
      return;
    }
    if (meses === null && !categoriasDisponibles.includes(categoria)) {
      form.setValue("categoria", categoriasDisponibles[categoriasDisponibles.length - 1]);
    }
    if (form.formState.isSubmitted) form.trigger("numero");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sexo, fechaNacimiento]);

  useEffect(() => {
    if (!showEstadoRepro) form.setValue("estado_reproductivo", null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showEstadoRepro]);

  const onSubmit = async (values: AnimalFormInput) => {
    try {
      const parsed = animalSchema.parse(values) as AnimalFormOutput;
      if (!editing && parsed.sexo === "macho" && !parsed.numero?.trim()) {
        parsed.numero = `M-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
      }
      if (editing) {
        const { numero: _i, ...rest } = parsed;
        await update.mutateAsync(rest);
        toast.success("Animal actualizado");
        onDone(animal!.numero);
      } else {
        const created = await create.mutateAsync(parsed);
        if (onAfterCreate) await onAfterCreate(created);
        toast.success("Animal añadido");
        onDone(created.numero);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al guardar");
    }
  };

  const err = form.formState.errors;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="numero" className="text-base">
            Número (arete){sexo === "hembra" ? " *" : ""}
          </Label>
          <Input id="numero" className="h-12 text-base" disabled={editing || locked("numero")} {...form.register("numero")} />
          <p className="text-xs text-muted-foreground">
            Solo es obligatorio para hembras; los machos pueden usar identificación temporal automática.
          </p>
          {err.numero && <p className="text-sm text-destructive">{err.numero.message as string}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="nombre" className="text-base">Nombre</Label>
          <Input id="nombre" className="h-12 text-base" {...form.register("nombre")} />
        </div>

        <Controller
          control={form.control}
          name="sexo"
          render={({ field }) => (
            <div className="space-y-2">
              <Label className="text-base">Sexo *</Label>
              <Select value={field.value} onValueChange={field.onChange} disabled={locked("sexo")}>
                <SelectTrigger className="h-12 text-base"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["hembra", "macho"] as const).map((s) => (
                    <SelectItem key={s} value={s}>{SEXO_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        />

        {esJoven ? (
          <div className="space-y-2">
            <Label className="text-base">Categoría *</Label>
            <div className="h-12 flex flex-col justify-center">
              <p className="text-sm text-muted-foreground">
                Categoría automática: <span className="font-medium text-foreground">{CATEGORIA_LABELS[derivada!]}</span>
              </p>
              <p className="text-xs text-muted-foreground">Calculada según edad</p>
            </div>
          </div>
        ) : (
          <Controller
            control={form.control}
            name="categoria"
            render={({ field }) => {
              const opciones = esAdulto ? adultas : categoriasDisponibles;
              return (
                <div className="space-y-2">
                  <Label className="text-base">Categoría *</Label>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-12 text-base"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {opciones.map((c) => (
                        <SelectItem key={c} value={c}>{CATEGORIA_LABELS[c]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {err.categoria && <p className="text-sm text-destructive">{err.categoria.message as string}</p>}
                </div>
              );
            }}
          />
        )}

        <Controller
          control={form.control}
          name="estado_actual"
          render={({ field }) => (
            <div className="space-y-2">
              <Label className="text-base">Estado actual</Label>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="h-12 text-base"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ESTADOS_ACTUALES.map((e) => (
                    <SelectItem key={e} value={e}>{ESTADO_ACTUAL_LABELS[e]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        />

        {showEstadoRepro && (
          <Controller
            control={form.control}
            name="estado_reproductivo"
            render={({ field }) => (
              <div className="space-y-2">
                <Label className="text-base">Estado reproductivo</Label>
                <Select
                  value={field.value ?? "none"}
                  onValueChange={(v) => field.onChange(v === "none" ? null : v)}
                >
                  <SelectTrigger className="h-12 text-base"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Sin definir —</SelectItem>
                    {ESTADOS_REPRODUCTIVOS.map((e) => (
                      <SelectItem key={e} value={e}>{ESTADO_REPRODUCTIVO_LABELS[e]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          />
        )}

        <div className="space-y-2">
          <Label htmlFor="fecha_nacimiento" className="text-base">Fecha de nacimiento</Label>
          <Controller
            control={form.control}
            name="fecha_nacimiento"
            render={({ field }) => (
              <DatePicker
                id="fecha_nacimiento"
                value={field.value ?? null}
                onChange={field.onChange}
                placeholder="Selecciona una fecha"
                disabled={locked("fecha_nacimiento")}
                disableFuture
              />
            )}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dueno" className="text-base">Dueño</Label>
          <Input id="dueno" className="h-12 text-base" {...form.register("dueno")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="color" className="text-base">Color</Label>
          <Input id="color" className="h-12 text-base" {...form.register("color")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="raza" className="text-base">Raza</Label>
          <Input id="raza" className="h-12 text-base" {...form.register("raza")} />
        </div>
        <Controller
          control={form.control}
          name="ubicacion_actual"
          render={({ field }) => (
            <div className="space-y-2">
              <Label htmlFor="ubicacion_actual" className="text-base">Ubicación</Label>
              <ComboboxFree
                id="ubicacion_actual"
                value={field.value ?? ""}
                onChange={field.onChange}
                options={ubicacionOptions}
                placeholder="Mi rancho"
                emptyText="Escribe para crear una nueva ubicación"
              />
              <p className="text-xs text-muted-foreground">
                Elige una existente o escribe un nombre nuevo. Si se deja vacío se asigna "Mi rancho".
              </p>
            </div>
          )}
        />
        <Controller
          control={form.control}
          name="lote_actual"
          render={({ field }) => (
            <div className="space-y-2">
              <Label htmlFor="lote_actual" className="text-base">Lote</Label>
              <ComboboxFree
                id="lote_actual"
                value={field.value ?? ""}
                onChange={field.onChange}
                options={loteOptions}
                placeholder="Ej. Lote A"
                emptyText="Escribe para crear un lote nuevo"
              />
              <p className="text-xs text-muted-foreground">
                Opcional. Elige uno existente o escribe un nombre nuevo.
              </p>
            </div>
          )}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-base">Madre (del catálogo)</Label>
          <Controller
            control={form.control}
            name="mother_id"
            render={({ field }) => (
              <SelectorAnimal
                value={field.value ?? null}
                onChange={field.onChange}
                sexo="hembra"
                excludeId={animal?.id}
                placeholder="Seleccionar madre…"
                disabled={locked("mother_id")}
              />
            )}
          />
          <Input placeholder="o texto libre" className="min-h-11" disabled={locked("madre_texto")} {...form.register("madre_texto")} />
        </div>
        <div className="space-y-2">
          <Label className="text-base">Padre (del catálogo)</Label>
          <Controller
            control={form.control}
            name="father_id"
            render={({ field }) => (
              <SelectorAnimal
                value={field.value ?? null}
                onChange={field.onChange}
                sexo="macho"
                excludeId={animal?.id}
                placeholder="Seleccionar padre…"
                disabled={locked("father_id")}
              />
            )}
          />
          <Input placeholder="o texto libre" className="min-h-11" disabled={locked("padre_texto")} {...form.register("padre_texto")} />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" size="lg" className="min-h-12" disabled={form.formState.isSubmitting}>
          {editing ? "Guardar cambios" : "Añadir animal"}
        </Button>
      </div>
    </form>
  );
}