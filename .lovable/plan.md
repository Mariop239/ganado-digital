
# Refactor Breeding — Servicio reproductivo + Nacimiento (sin duplicación)

## Diagnóstico (Domain First)

`FormHistorial` actual mezcla dos eventos del dominio ganadero: el **servicio** (monta/IA, ocurre hoy) y el **parto/cría** (ocurre ~283 días después). Pedir sexo/fecha de cría al registrar la monta es inventar datos inexistentes y viola Principios #2 (Domain First), #3 (animal es entidad estable) y #10 (eventos como historial).

Solución: `historial` deja de cargar datos de la cría. La cría nace como un `Animal` real usando el `FormAnimal` que ya existe — sin duplicar UI (Principio #1, #14).

## Cambios de dominio (Supabase)

Migración aditiva a `historial`:

- `tipo_servicio` TEXT NOT NULL DEFAULT `'monta_natural'`, CHECK `IN ('monta_natural','inseminacion')`.
- `estado_servicio` TEXT NOT NULL DEFAULT `'pendiente'`, CHECK `IN ('pendiente','prenada','vacia','parida')`.
- `fecha_probable_parto` DATE (calculada `fecha_monta + 283` y persistida al guardar).
- `cria_animal_id` UUID NULL — soft-link al `animals.id` creado al registrar el nacimiento (sin FK dura para no acoplar al ciclo de vida de animals).
- Backfill: `tipo_servicio='monta_natural'`; si `fecha_parto IS NOT NULL` → `estado_servicio='parida'`, sino `'pendiente'`; `fecha_probable_parto = fecha_monta + 283`.
- Se conservan `fecha_parto`, `sexo_cria`, `fecha_destete` como compatibilidad legacy interna; ya no se editan en el form de servicio. `marcarParida` los rellena automáticamente desde el animal cría creado.

Trigger `validar_fechas_historial` ya valida coherencia de fechas — sin cambios.

## Tipos y schemas

**`src/modules/breeding/types/domain.ts`**
- Añade `TipoServicio = 'monta_natural' | 'inseminacion'` y `EstadoServicio = 'pendiente' | 'prenada' | 'vacia' | 'parida'`.
- `Historial` incorpora `tipo_servicio`, `estado_servicio`, `fecha_probable_parto`, `cria_animal_id`.

**`src/modules/breeding/schemas/index.ts`**
- Nuevo `servicioSchema` (lo que valida el form): `tipo_servicio`, `toro`, `fecha_monta`, `estado_servicio`, `observaciones?`. Sin `fecha_parto/sexo_cria/fecha_destete`.
- `historialSchema` legacy se mantiene sólo para tipados internos del repo durante la transición; deja de ser usado por el form (Principio #12: cleanup en cuanto no haya consumidor).

**`src/modules/animals/types/domain.ts`** y **`schemas/index.ts`** — sin cambios. No necesitan saber del módulo breeding (Principio: no romper arquitectura modular).

## Repositorio + hooks

**`historial.repository.ts`**
- `createServicio(vacaNumero, ServicioInput)`: calcula `fecha_probable_parto` en cliente y persiste.
- `updateServicio(id, ServicioInput)`: ídem.
- `marcarParida(id, { fecha_parto, sexo_cria, cria_animal_id })`: actualiza `estado_servicio='parida'` + campos legacy en un solo update.
- `listHistorial` sin cambios.
- Se eliminan `createHistorial`/`updateHistorial` cuando ningún consumidor los use (Principio #12).

**`useHistorial.ts`**: añade `useCreateServicio`, `useUpdateServicio`, `useMarcarParida` invalidando `["historial", vacaNumero]`. Hooks viejos eliminados al cerrar la transición.

## Frontend

### `FormHistorial.tsx` (reescrito)

Form ÚNICAMENTE de servicio reproductivo, botones grandes (`h-12`, `text-base`), toasts:
- Select **Tipo de Servicio** — Monta Natural / Inseminación Artificial.
- Input **Toro / Pajuela** (texto libre — selector de toros del catálogo queda fuera de scope, Principio #7).
- Date **Fecha de Servicio**.
- Date read-only **Fecha probable de parto** (auto = servicio + 283d, recalculado en `watch`).
- Select **Estado** — Pendiente Diagnóstico / Confirmado Preñada / Vacía. (No exponemos `'parida'`: lo asigna el sistema al registrar nacimiento.)
- Textarea Observaciones.

### `HistorialTabla.tsx`

Columnas: **Tipo · Toro · Fecha Servicio · Fecha Probable Parto · Estado · Acciones**.

- Badge de color por `estado_servicio`.
- Si `estado_servicio === 'prenada'`: botón **"Registrar Nacimiento"** (verde, ícono `Baby` lucide, `size="lg"`, `min-h-12`) junto a editar/eliminar.
- Si `estado_servicio === 'parida'`: badge "Parida" con link al perfil `/animales/{numero}` resuelto vía `cria_animal_id`.

### Flujo de "Registrar Nacimiento" — SIN wrapper, SIN duplicar form

Reutilizamos directamente `FormAnimal` con dos extensiones mínimas y aditivas:

1. **`FormAnimal` recibe dos props opcionales nuevas**:
   - `defaults?: Partial<AnimalFormInput>` — semilla inicial cuando no hay `animal` en edición.
   - `lockedFields?: Array<keyof AnimalFormInput>` — campos renderizados `disabled` (madre, padre, etc.). Cambio interno: si el campo está bloqueado, el `Input`/`Selector` recibe `disabled`. Sin lógica condicional adicional fuera de eso (Principio #14: no wrappers).
   - `onAfterCreate?: (created: Animal) => void | Promise<void>` — hook opcional para que el llamador haga post-procesamiento (en nuestro caso: `marcarParida`). NO se introduce un componente intermedio.

2. **`HistorialTabla` abre el `Dialog` existente con `FormAnimal` directamente** (mismo patrón que ya usa `ListaAnimales` para crear un animal):
   ```tsx
   <Dialog open={openNacimiento} onOpenChange={setOpenNacimiento}>
     <DialogContent className="max-w-3xl">
       <DialogHeader><DialogTitle>Registrar nacimiento</DialogTitle></DialogHeader>
       <FormAnimal
         defaults={{
           mother_id: madreAnimalId,          // resuelto vía useAnimal(vacaNumero)
           padre_texto: registro.toro,
           fecha_nacimiento: new Date().toISOString().slice(0,10),
           sexo: "hembra",
         }}
         lockedFields={["mother_id", "padre_texto"]}
         onDone={() => setOpenNacimiento(false)}
         onAfterCreate={(created) =>
           marcarParida.mutateAsync({
             id: registro.id,
             fecha_parto: created.fecha_nacimiento!,
             sexo_cria: created.sexo === "macho" ? "Macho" : "Hembra",
             cria_animal_id: created.id,
           })
         }
       />
     </DialogContent>
   </Dialog>
   ```

3. El `mother_id` se resuelve con `useAnimal(vacaNumero)` (hook ya existente) y el `vacaNumero` viene del contexto del perfil donde se renderiza `HistorialTabla`.

Esto cumple el requisito explícito del usuario: **no se crea un nuevo formulario de nacimiento**. Se reutiliza `FormAnimal`, se invoca desde su Dialog y los campos llegan precargados+bloqueados.

## Cleanup obligatorio (Principio #12)

En esta misma fase:
- Eliminar de `FormHistorial` los inputs de parto/destete/sexo cría.
- Eliminar `createHistorial`/`updateHistorial` del repo si no quedan consumidores.
- Borrar exports legacy de `breeding/index.ts` no usados.

## Fuera de scope

- Selector real de toros desde catálogo (Principio #7 — primero validar uso real).
- Renombrar tabla `historial` → `servicios` (Principio #6 — cambio reversible primero).
- Modificaciones a `animals/schemas/index.ts` o al dominio de `animals` — el flujo de nacimiento es un caso de uso, no un cambio de dominio.
- Eventos en `animal_events` para diagnóstico de gestación (futuro).

## Riesgos y mitigaciones

- **Tipos de Supabase regenerados**: tras la migración, `types.ts` ya incluye los nuevos campos y `types/domain.ts` los alinea. Build TS verifica.
- **`FormAnimal` con props nuevas**: estrictamente opcionales y aditivas; los llamadores actuales no se ven afectados.
- **`cria_animal_id` sin FK**: intencional para no bloquear borrados; se trata como soft-link (la UI tolera que el animal cría haya sido borrado).
- **Doble fuente de verdad madre/padre**: la madre se infiere del contexto (perfil de la vaca); padre queda como `padre_texto` hasta que exista selector real.

## Orden de implementación

1. Migración SQL (`historial` + backfill).
2. `types/domain.ts` + `schemas/index.ts` del módulo breeding.
3. Repo + hooks (`createServicio`, `updateServicio`, `marcarParida`).
4. `FormHistorial.tsx` reescrito (solo servicio).
5. `FormAnimal.tsx`: añadir props `defaults`, `lockedFields`, `onAfterCreate`.
6. `HistorialTabla.tsx`: nuevas columnas + botón + Dialog que invoca `FormAnimal` directo.
7. Cleanup de imports/exports legacy.
