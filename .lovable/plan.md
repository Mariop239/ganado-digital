## Objetivo

Separar el momento del **Servicio** del momento de la **Confirmación de Preñez** en el módulo `breeding`, agregando `fecha_confirmacion` y refinando la lógica de estado y FPP. Sin duplicar componentes, manteniendo `animals` como fuente de verdad.

---

## Fase A — Base de datos (migración)

Agregar columna a `historial`:

- `fecha_confirmacion date NULL` (opcional)

`fecha_monta` se mantiene como `NOT NULL` (es la `fecha_servicio` actual en el código — ver nota de naming abajo).

No tocar triggers existentes (`validar_fechas_historial`, etc.). No backfill: las filas viejas quedan con `fecha_confirmacion = NULL`, lo cual es válido.

---

## Fase B — Tipos y schemas

**`src/modules/breeding/types/domain.ts`**
- Añadir `fecha_confirmacion: string | null` al tipo `Historial`.

**`src/modules/breeding/schemas/index.ts`** (`servicioSchema`)
- Añadir `fecha_confirmacion: z.string().optional().nullable().or(z.literal("")).transform(v => v || null)`.
- Mantener `fecha_monta` obligatoria.
- Añadir `superRefine`:
  - Si `fecha_confirmacion` está presente → forzar `estado_servicio = "prenada"`.
  - Si `estado_servicio = "vacia"` → `fecha_confirmacion` debe ser `null`.

**Nota de naming**: el código actual usa `fecha_monta` para lo que el usuario llama `fecha_servicio`. NO renombramos columna ni campo (rompería tipos generados de Supabase y `vaca_numero`/historial existente). Mantenemos `fecha_monta` internamente; la UI ya muestra el label "Fecha de servicio".

---

## Fase C — Repositorio y hook

**`historial.repository.ts`** — `normalizeServicio`:
- Incluir `fecha_confirmacion: input.fecha_confirmacion ?? null`.
- Lógica FPP condicional:
  ```ts
  fecha_probable_parto:
    input.estado_servicio === "vacia"
      ? null
      : addDays(input.fecha_monta, 283)
  ```
- Garantiza que `null` se envía limpio a Supabase (no string vacío).

**`useHistorial.ts`** — sin cambios estructurales; ya pasa el `ServicioInput` tal cual.

---

## Fase D — UI `FormHistorial.tsx`

1. Nuevo campo `<Input type="date">` para `fecha_confirmacion`, debajo de `fecha_monta` (label: "Fecha de confirmación de preñez").
2. `watch` sobre `fecha_confirmacion` y `estado_servicio`.
3. Lógica condicional del selector Estado:
   - Si `fecha_confirmacion` tiene valor → forzar `setValue("estado_servicio", "prenada")` (en `useEffect`) y renderizar `<Select disabled>`.
   - Si `fecha_confirmacion` vacía → Select habilitado, opciones limitadas a `["pendiente", "vacia"]` (quitamos `"prenada"` manual; la única vía a "prenada" es ingresar fecha de confirmación).
4. Si el usuario cambia estado manualmente a `"vacia"` con una `fecha_confirmacion` ya escrita → limpiar `fecha_confirmacion` (`setValue(..., "")`).
5. FPP visual:
   - Ocultar el bloque FPP cuando `estado_servicio === "vacia"` (o mostrar texto "No aplica").
   - Caso contrario: seguir mostrando `addDays(fecha_monta, 283)`.

---

## Fase E — UI `HistorialTabla.tsx`

- Nueva columna **"Confirmación"** entre "Fecha servicio" y "Fecha probable parto", renderiza `fmt(r.fecha_confirmacion)` o `—`.
- Columna FPP: si `r.estado_servicio === "vacia"` → `"—"`; si no → `fmt(r.fecha_probable_parto)`.
- Botón **"Registrar nacimiento"**: confirmar que sigue gated por `r.estado_servicio === "prenada"` (ya lo está).
- Ampliar `colSpan` de filas vacías/loading a 7.

---

## Diagrama de estados (resultante)

```text
                  ┌─────────────┐
   crear servicio │  pendiente  │  (sin fecha_confirmacion, sin FPP visible si vacia)
                  └──────┬──────┘
                         │
       ┌─────────────────┼─────────────────┐
       │                 │                 │
ingresar fecha_      marcar vacia    (vía nacimiento)
confirmacion             │                 │
       │                 │                 │
       ▼                 ▼                 ▼
   ┌─────────┐       ┌───────┐         ┌────────┐
   │ prenada │       │ vacia │         │ parida │
   │ (lock)  │       │       │         │ (auto) │
   └─────────┘       └───────┘         └────────┘
```

---

## Archivos a tocar

- migración SQL (nueva)
- `src/modules/breeding/types/domain.ts`
- `src/modules/breeding/schemas/index.ts`
- `src/modules/breeding/repositories/historial.repository.ts`
- `src/modules/breeding/components/FormHistorial.tsx`
- `src/modules/breeding/components/HistorialTabla.tsx`
- `src/integrations/supabase/types.ts` (regenerado tras migración)

## Fuera de alcance

- Renombrar `fecha_monta` → `fecha_servicio` en BD (riesgo alto, no aporta valor de dominio inmediato).
- Cambios en `FormAnimal` o flujo de nacimiento (ya implementado correctamente).
- Cambios en `useHistorial.ts` (no requiere modificación).
