# Consolidación del dominio `animals` como experiencia principal

## Estado actual (híbrido)

- `/` renderiza `ListaVacas` → filtra hembras y `fecha_egreso`. Machos invisibles.
- Perfil principal `/vacas/$numero` → `PerfilVaca` (módulo `cows`).
- Creación: `FormVaca` solo edita campos legacy, sin `sexo`/`categoria`/`estado_*`/IDs de padres.
- `EgresoDialog` (cows) escribe `animal_events` pero la UX y copy son "vaca".
- `FamiliaTab` ya existe pero está como pestaña anexa y sus links de hijos van a `/vacas/$numero` (rompe para machos).
- Triggers BD sincronizan `vacas ↔ animals` en ambos sentidos → datos OK, pero **frontend con dos fuentes de verdad**.

## Diagnóstico

La UI sigue pensando en "vacas paridas". `animals` aparece solo como anexo. Hay que invertir: `animals` pasa a ser la UI primaria; `cows` queda como repo interno + alias de ruta.

## Estrategia

1. **UI única basada en `animals`**.
2. **Compatibilidad legacy solo en datos** (vista `vacas` + triggers intactos).
3. **Cleanup gradual sin breaking**: `/vacas/*` redirige a `/animales/*`.

## Cambios concretos

### 1. Completar `modules/animals`

- **`schemas/index.ts`**: añadir `animalSchema` con todos los campos + `superRefine` para:
  - `sexo = "macho"` ⇒ `estado_reproductivo` forzado a `null` (reset implícito, no error).
  - **Validación cruzada `sexo ↔ categoria`**:
    - `hembra` ⇒ `categoria ∈ {ternera, novilla, vaca}`.
    - `macho` ⇒ `categoria ∈ {ternero, toro, novillo}`.
    - Combinaciones inválidas devuelven error en `categoria`.
  - `estado_reproductivo` solo permitido si `sexo=hembra` y `categoria ∈ {novilla, vaca}`.
- **`repositories/animals.repository.ts`**: añadir `createAnimal`, `updateAnimal`, `deleteAnimal`, `marcarEgreso(numero, {fecha, motivo, tipo})` (inserta `animal_events`), `reactivarAnimal`.
- **`hooks/useAnimals.ts`**: añadir `useCreateAnimal`, `useUpdateAnimal`, `useMarcarEgresoAnimal`, `useReactivarAnimal`, `useDeleteAnimal`. Invalidar `["animals"]`, `["animal", numero]`, `["animal-events", numero]`, y también `["vacas"]`/`["vaca", numero]` durante la transición.
- **`components/FormAnimal.tsx`**: única fuente de verdad para crear/editar.
  - Al cambiar `sexo` a `macho`: limpia `estado_reproductivo` en el form state.
  - Opciones de `categoria` filtradas dinámicamente según `sexo` seleccionado.
  - `estado_reproductivo` solo visible si hembra adulta.
  - `mother_id` selector filtrado `sexo=hembra`; `father_id` filtrado `sexo=macho`; fallback texto libre.
- **`components/ListaAnimales.tsx`**: reemplaza `ListaVacas`. Filtros: búsqueda, `sexo`, `categoria`, `estado_actual` (default `activa`). Link a `/animales/$numero`.
- **`components/PerfilAnimal.tsx`**: reemplaza `PerfilVaca`. Badges (`sexo`, `categoria`, `estado_reproductivo`, `estado_actual`). Tabs: Reproducción (solo hembra adulta), Vacunas, Eventos, Familia.
- **`components/EstadoAnimalDialog.tsx`** *(renombrado desde EgresoDialogAnimal)*: maneja el cambio de `estado_actual` (egreso por venta, fallecimiento, etc.). Usa `useMarcarEgresoAnimal` internamente; copy genérico ("Cambiar estado del animal"). Mantiene UX similar al `EgresoDialog` legacy.

### 2. Rutas

- Crear `src/routes/_authenticated/animales.index.tsx` → `ListaAnimales`.
- Crear `src/routes/_authenticated/animales.$numero.tsx` → `PerfilAnimal`.
- `src/routes/_authenticated/index.tsx` → renderizar `ListaAnimales`.
- `src/routes/_authenticated/vacas.$numero.tsx` → redirect interno a `/animales/$numero` (`beforeLoad` con `throw redirect`).

### 3. `modules/cows` → capa interna

- **Mantener**: `vacas.repository.ts`, tipos, hooks (`breeding`/`vaccinations`/`events` aún usan `vaca_numero`).
- **Quitar de exports**: `ListaVacas`, `PerfilVaca`, `FormVaca`, `EgresoDialog`.
- **Borrar archivos UI** tras verificar que no quedan imports (Fase C).
- Marcar el módulo `@deprecated — internal repo only`.

### 4. Subcomponentes compartidos

`HistorialTabla`, `VacunasTablaVaca`, `EventTimeline`, `EventDialog` siguen recibiendo `vacaNumero` (drop-in: `animal.numero === vaca.numero`). Rename léxico queda fuera de scope.

### 5. `FamiliaTab`

- Links de hijos cambian a `/animales/$numero` (funciona para ambos sexos).
- Se elimina del wrapper de `PerfilVaca` (que desaparece) y vive solo en `PerfilAnimal`.

### 6. Navegación

- `AppSidebar`: si menciona "Vacas", renombrar a "Animales", apuntar a `/`.
- Cualquier `<Link to="/vacas/$numero">` restante → `/animales/$numero`.

## Fases (cada commit verde)

```text
Fase A — Módulo animals completo, sin tocar UI legacy
  - schemas + superRefine (sexo↔categoria, reset estado_reproductivo)
  - repository extendido + hooks de mutación
  - FormAnimal, ListaAnimales, PerfilAnimal, EstadoAnimalDialog
  - Rutas /animales/* nuevas
  - FamiliaTab: links a /animales/$numero
  → /vacas sigue intacto

Fase B — Switch del flujo principal
  - / renderiza ListaAnimales
  - /vacas/$numero → redirect a /animales/$numero
  - Sidebar/nav: "Animales"

Fase C — Cleanup UI legacy
  - Borrar ListaVacas, PerfilVaca, FormVaca, EgresoDialog
  - Limpiar exports de modules/cows/index.ts
```

## Fuera de scope

- Genealogía multinivel, árboles, RPC recursivas.
- Rename `vaca_numero → animal_numero` en tablas hijas.
- Borrar tabla/vista `vacas` o triggers.
- Reescribir `breeding`/`vaccinations`/`events`.
- Nuevos triggers o automatizaciones de `categoria`.
- Wrappers `cows → animals`.
- Migraciones de BD.

## Riesgos y mitigación

- **Cache desincronizado** BD ↔ React Query: invalidar ambas keys en mutaciones de `animals`.
- **Machos creados desde FormAnimal no aparecen en vista `vacas`**: esperado y correcto.
- **Egreso desde animals**: insert en `animal_events` con `vaca_numero=animal.numero` dispara el trigger `sync_vaca_estado` y luego `sync_vacas_to_animals` actualiza `animals.estado_actual`/`fecha_egreso`.
- **Bookmarks `/vacas/123`**: preservados vía redirect.

## Cómo se evita deuda futura

- Una sola UI (`PerfilAnimal`); archivos legacy borrados eliminan la tentación de bifurcar.
- `modules/cows` queda explícitamente `@deprecated — internal`.
- Próxima fase natural (no aquí): renombrar `vaca_numero → animal_numero` y reemplazar la vista `vacas` por queries directas en módulos hijos.

Esperando aprobación para implementar Fase A.
