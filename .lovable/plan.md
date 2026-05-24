## Refactor a arquitectura modular por features (v2)

Reorganización pura: mover archivos a `src/modules/<feature>/` sin tocar comportamiento, JSX, query keys ni lógica.

### Estructura por módulo

```text
src/modules/
  cows/
    components/    EgresoDialog, FormVaca, ListaVacas, PerfilVaca
    hooks/         useVacas
    repositories/  vacas.repository.ts
    schemas/       index.ts  (vacaSchema, egresoSchema)
    types/         domain.ts (Vaca, VacaInput, EgresoInput)
    constants/     .gitkeep
    index.ts
  vaccinations/
    components/    FormVacuna, VacunasTablaVaca
    hooks/         useVacunas
    repositories/  vacunas.repository.ts
    schemas/       index.ts  (vacunaSchema)
    types/         domain.ts (Vacuna, VacunaConVaca, VacunaInput)
    constants/     .gitkeep
    index.ts
  breeding/
    components/    FormHistorial, HistorialTabla
    hooks/         useHistorial
    repositories/  historial.repository.ts
    schemas/       index.ts  (historialSchema)
    types/         domain.ts (Historial, HistorialInput)
    constants/     .gitkeep
    index.ts
```

`src/lib/schemas.ts` queda sólo con `loginSchema`. `src/lib/utils.ts`, `error-capture.ts`, `error-page.ts` y `src/integrations/**` no se mueven.

### Convenciones

- **repositories/**: sólo acceso a Supabase (CRUD), sin lógica de negocio. Funciones idénticas a las actuales.
- **types/domain.ts**: dueño único de los tipos del dominio (`Vaca`, `Vacuna`, `Historial`, e inputs derivados de Zod via `z.infer`). Repositories importan tipos desde `../types/domain`, no los exportan.
- **schemas/index.ts**: define schemas Zod y exporta `XInput = z.infer<typeof xSchema>` reexportado también desde `types/domain.ts` para un único punto de import.
- **constants/**: carpeta presente con `.gitkeep`, vacía por ahora.
- **Barrels explícitos** (sin `export *`):

```ts
// modules/cows/index.ts
export { ListaVacas } from "./components/ListaVacas";
export { PerfilVaca } from "./components/PerfilVaca";
export { FormVaca } from "./components/FormVaca";
export { EgresoDialog } from "./components/EgresoDialog";
export {
  useVacas, useVaca, useCreateVaca, useUpdateVaca,
  useMarcarEgreso, useReactivarVaca, useDeleteVaca,
} from "./hooks/useVacas";
export { vacaSchema, egresoSchema } from "./schemas";
export type { Vaca, VacaInput, EgresoInput } from "./types/domain";
```

Análogos para `vaccinations` y `breeding`. Imports intra-módulo usan rutas relativas; cross-módulo y rutas usan el barrel `@/modules/<feature>`.

### Mapping de archivos

| Origen | Destino |
|---|---|
| `src/components/vacas/{EgresoDialog,FormVaca,ListaVacas,PerfilVaca}.tsx` | `modules/cows/components/` |
| `src/hooks/useVacas.ts` | `modules/cows/hooks/useVacas.ts` |
| `src/lib/vacas-repository.ts` | `modules/cows/repositories/vacas.repository.ts` |
| `vacaSchema`, `egresoSchema` de `src/lib/schemas.ts` | `modules/cows/schemas/index.ts` |
| `src/components/vacunas/*` | `modules/vaccinations/components/` |
| `src/hooks/useVacunas.ts` | `modules/vaccinations/hooks/useVacunas.ts` |
| `src/lib/vacunas-repository.ts` | `modules/vaccinations/repositories/vacunas.repository.ts` |
| `vacunaSchema` | `modules/vaccinations/schemas/index.ts` |
| `src/components/vacas/{FormHistorial,HistorialTabla}.tsx` | `modules/breeding/components/` |
| `src/hooks/useHistorial.ts` | `modules/breeding/hooks/useHistorial.ts` |
| `src/lib/historial-repository.ts` | `modules/breeding/repositories/historial.repository.ts` |
| `historialSchema` | `modules/breeding/schemas/index.ts` |

### Garantías

- Mismas query keys: `["vacas", { soloActivas }]`, `["vaca", numero]`, `["vacunas", "global"]`, `["vacunas", "por-vaca", n]`, `["historial", n]`.
- Mismos nombres y firmas de hooks, schemas y funciones de repository.
- JSX intacto.
- No se crean componentes nuevos ni se fusionan hooks.
- `src/routes/**` sólo actualiza imports; los archivos de ruta no se mueven (file-based routing).

### Pasos de ejecución (build mode)

1. Crear estructura `src/modules/{cows,vaccinations,breeding}/{components,hooks,repositories,schemas,types,constants}` con `.gitkeep` en `constants/`.
2. Para cada módulo: crear `types/domain.ts`, `schemas/index.ts`, mover repository y hooks, mover componentes, crear barrel `index.ts` con exports explícitos.
3. Reducir `src/lib/schemas.ts` a `loginSchema`.
4. Actualizar imports en `src/routes/_authenticated/index.tsx`, `vacas.$numero.tsx`, `vacunas.tsx` para usar `@/modules/...`.
5. Borrar archivos originales (`src/components/vacas/`, `src/components/vacunas/`, `src/hooks/useVacas.ts`, `useVacunas.ts`, `useHistorial.ts`, `src/lib/vacas-repository.ts`, `vacunas-repository.ts`, `historial-repository.ts`).
6. Verificar build y smoke-check de `/`, `/vacas/$numero` (pestañas Reproducción y Vacunas), `/vacunas`.

### Fuera de alcance

- Renombrar identificadores visibles en código (siguen en español).
- Cambios de UI, optimizaciones, refactors lógicos, nuevos componentes o hooks.
- Mover `src/integrations/`, `src/routes/`, utilidades transversales.
