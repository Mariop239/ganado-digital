# Sistema de lotes para registros sanitarios

Agrupar los registros creados desde el formulario grupal bajo un mismo `batch_id`, y mostrarlos colapsados en la tabla global de Control Sanitario.

## Fase A — Base de datos (migración)

Añadir columna `batch_id uuid NULL` a `public.control_vacunas` + índice.

```sql
ALTER TABLE public.control_vacunas ADD COLUMN batch_id uuid NULL;
CREATE INDEX idx_control_vacunas_batch_id ON public.control_vacunas(batch_id);
```

- Nullable: los registros individuales (creados desde `FormVacuna` o desde la acción rápida del Dashboard) siguen sin batch.
- No se toca RLS (la columna hereda las políticas existentes scoped a `user_id`).
- Sin backfill: los registros previos quedan como individuales (`batch_id = NULL`), que es lo correcto desde el dominio.

Tras aprobar la migración, se regenera `src/integrations/supabase/types.ts` automáticamente.

## Fase B — Repositorio + hook de bulk

**`src/modules/vaccinations/repositories/vacunas.repository.ts`**
- `createVacunasBulk(animales, input)` genera un `batch_id = crypto.randomUUID()` y lo incluye en cada row del `insert`. Devuelve `{ count, batchId }` (en lugar de solo `count`) para que el caller pueda mostrar feedback o navegar.
- `createVacuna` (individual) y `FormVacuna` NO asignan batch_id.
- `listVacunasGlobal` ya hace `select("*")`, así que `batch_id` viene incluido sin cambios.

**`src/modules/vaccinations/types/domain.ts`**
- Añadir `batch_id: string | null` al tipo `Vacuna`.

**`src/modules/vaccinations/hooks/useVacunas.ts`**
- Ajustar la firma de `useCreateVacunasBulk` para devolver `{ count, batchId }`. La invalidación de `["dashboard"]`, `["vacunas"]` ya está en su sitio.

## Fase C — UI agrupada en `/vacunas`

Toda la lógica vive en `src/routes/_authenticated/vacunas.tsx`. No se toca el módulo `dashboard`, ni `FormControlSanitarioGrupal` (su contrato `onDone()` se mantiene).

### Modelo de fila agrupada

Derivado en memoria desde `data` (no requiere segunda query):

```ts
type GroupRow =
  | { kind: "single"; vacuna: VacunaConVaca }
  | {
      kind: "batch";
      batch_id: string;
      fecha: string | null;
      fecha_proxima_dosis: string | null;
      tipo_tratamiento: TipoTratamiento;
      estado_tratamiento: EstadoTratamiento;
      vacuna_aplicada: string;
      gasto_total: number;
      animales_count: number;
      items: VacunaConVaca[];
    };
```

Reglas:
- Recorrer `filtered`; agrupar por `batch_id` cuando no sea null.
- Para cada lote: tomar campos comunes del primer item (fecha, producto, tipo, estado — son idénticos por construcción del bulk), sumar `gasto`, contar items.
- Filtros existentes (`q`, `tipo`, `producto`) se aplican ANTES del agrupado: si un filtro de búsqueda matchea solo un animal del lote, el lote completo se muestra (el search por número/nombre de animal sigue funcionando porque al menos un item matchea).

### Renderizado

Reemplazar el `<TableBody>` actual por filas según `GroupRow`:

- **Single** → fila idéntica a la actual.
- **Batch** → fila con:
  - Botón chevron (`ChevronRight` / `ChevronDown`) en una celda extra al inicio.
  - Columna Animal: badge `Lote · N animales` + `vacuna_aplicada`.
  - Resto de columnas: tipo, producto, estado, fecha, próxima, **gasto total** (suma).
  - Al expandir: filas hijas (una por animal) renderizadas debajo con `<TableRow>` de fondo `bg-muted/30`, mostrando `#numero — nombre` y gasto individual. Estado de expansión local: `const [expanded, setExpanded] = useState<Set<string>>(new Set())` con key = `batch_id`.

- Añadir un thead-column extra al principio (vacío) para alinear el chevron. Las filas single dejan esa celda vacía.

KPIs actuales (`stats`): no se modifican — siguen contando registros individuales, que es lo correcto (un lote de 20 vacunas = 20 tratamientos aplicados).

## Archivos a tocar

- migración SQL (nueva)
- `src/modules/vaccinations/types/domain.ts`
- `src/modules/vaccinations/repositories/vacunas.repository.ts`
- `src/modules/vaccinations/hooks/useVacunas.ts`
- `src/routes/_authenticated/vacunas.tsx`

## No se toca

- `FormVacuna.tsx`, `FormControlSanitarioGrupal.tsx` (su contrato externo no cambia).
- Dashboard / alertas sanitarias (los lotes se ven como N tratamientos individuales en alertas, que es correcto: cada animal tiene su próxima dosis propia).
- Perfil del animal / `VacunasTablaVaca` (a nivel animal cada registro sigue siendo una fila — no tiene sentido agrupar dentro de un mismo animal).

## Riesgos / decisiones explícitas

- **Edición / borrado de un lote**: fuera de alcance de esta fase. El botón de eliminar (cuando exista) borrará registros individuales; un futuro prompt puede añadir "eliminar lote completo".
- **Filtros vs agrupado**: si el usuario filtra por un animal específico y ese animal pertenece a un lote, se muestra el lote completo expandido (decisión: privilegiar contexto del lote). Se puede ajustar después si molesta.
