
# Evolución biológica automática del animal

Calcular la categoría al vuelo a partir de `fecha_nacimiento` + `sexo`, sin tocar la base de datos ni introducir cron jobs. La columna `categoria` en Supabase sigue siendo la única fuente de verdad y **nunca** se sobrescribe en runtime. La UI lee un campo derivado `categoria_view`; los formularios, mutaciones y repositorios siguen usando `categoria`.

## Reglas de dominio

Categorías **automáticas** (derivadas por edad, nunca persistidas por el cálculo):

- Sin `fecha_nacimiento` → no se calcula nada; `categoria_view = categoria`, sin bandera.
- Edad ≤ 9 meses → `ternero` (macho) / `ternera` (hembra).
- 9 < edad ≤ 15 meses → `novillo` (macho) / `novilla` (hembra).

Categorías **adultas manuales** (las únicas válidas como destino tras los 15 meses):

```ts
const CATEGORIAS_ADULTAS = ["vaca", "toro"] as const;
```

`novillo` queda exclusivamente como etapa juvenil automática — se elimina de `CATEGORIAS_ADULTAS` para evitar la ambigüedad anterior.

Lógica > 15 meses:
- Si `categoria` persistida ∈ `CATEGORIAS_ADULTAS` (`vaca` o `toro`) → `categoria_view = categoria`, `requiere_clasificacion = false`, `calculada = false`.
- Si `categoria` persistida es juvenil (`ternero`, `ternera`, `novillo`, `novilla`) o vacía → `categoria_view` se mantiene en la juvenil calculada (o la persistida), y `requiere_clasificacion = true`. La UI pide clasificación manual adulta (`vaca` o `toro`).

Edad en meses: `differenceInMonths(today, parseISO(fecha_nacimiento))` (date-fns ya instalado).

NO se crean nuevas categorías. NO se toca la BD. NO se modifican CHECK constraints. NO hay migración.

## Cambios por archivo

### 1. `src/modules/animals/utils/categorias.ts` (nuevo)
- `edadEnMeses(fechaNacimiento): number | null`.
- `CATEGORIAS_ADULTAS = ["vaca", "toro"] as const`.
- `CATEGORIAS_JUVENILES = ["ternero", "ternera", "novillo", "novilla"] as const`.
- `derivarCategoria({ fecha_nacimiento, sexo, categoria }) => { categoria_view: Categoria; requiere_clasificacion: boolean; calculada: boolean }`.
  - **No muta** el input. Solo devuelve los tres campos derivados.

### 2. `src/modules/animals/types/domain.ts`
- Añadir tipo derivado:
  ```ts
  type AnimalView = Animal & {
    categoria_view: Categoria;
    requiere_clasificacion: boolean;
    calculada: boolean;
  };
  ```
- `categoria` permanece intacto = valor real de Supabase.
- **No** se introduce `categoria_bd` (innecesario porque `categoria` ya conserva el valor original).

### 3. `src/modules/animals/repositories/animals.repository.ts`
- Helper privado `toView(row): AnimalView` que **añade** (no reemplaza) `categoria_view`, `requiere_clasificacion`, `calculada` a cada fila leída en `listAnimals`, `getAnimalByNumero`, `getAnimalById`, `listHijos`.
- Mutaciones (`createAnimal`, `updateAnimal`, `updateRelaciones`, `marcarEgresoAnimal`, `reactivarAnimal`) siguen escribiendo/leyendo `categoria` cruda; sus retornos también pasan por `toView` para que el tipo sea consistente.
- Sin cambios en los hooks `useAnimal`, `useAnimals`, `useHijos`, `useAnimalById` salvo el tipo inferido (`AnimalView`).

### 4. `src/modules/animals/components/ListaAnimales.tsx`
- Cards leen `a.categoria_view` (no `a.categoria`).
- Badge llamativo (variant `destructive`) "Requiere clasificación" cuando `a.requiere_clasificacion`.
- Filtro de categoría: aplicar contra `a.categoria_view` para que el filtrado coincida con lo que el usuario ve.

### 5. `src/modules/animals/components/PerfilAnimal.tsx`
- Badge de categoría y fila "Categoría" leen `animal.categoria_view`.
- Si `animal.requiere_clasificacion`: Badge `destructive` "Requiere clasificación adulta" con `onClick` que abre `ClasificacionAdultaDialog`.
- Nota visual "calculada por edad" cuando `animal.calculada === true`.

### 6. `src/modules/animals/components/ClasificacionAdultaDialog.tsx` (nuevo, pequeño)
- Reutiliza `useUpdateAnimal(numero)`.
- `Select` con opciones según `sexo`: hembra → `["vaca"]`; macho → `["toro"]`.
- Persiste el valor en el campo **real** `categoria` (no en `categoria_view`).
- Toast de éxito + cierre. No duplica `FormAnimal`.

### 7. `FormAnimal.tsx`
- **Sin cambios.** El formulario ya usa `animal.categoria` (valor persistido real), que es lo correcto.

### 8. `src/modules/animals/index.ts`
- Exportar `derivarCategoria`, `CATEGORIAS_ADULTAS`, `ClasificacionAdultaDialog`, tipo `AnimalView`.

## Regla de uso (estricta)

| Contexto | Campo a leer |
|---|---|
| Render visual (cards, badges, filtros visuales, perfil) | `animal.categoria_view` |
| Formularios, mutaciones, payloads Supabase, repositorios | `animal.categoria` |

`categoria` nunca se reasigna. El objeto original no se muta.

## Lo que NO se hace

- No se sobrescribe `animal.categoria` con la derivada.
- No se introduce `categoria_bd`.
- No se añade columna, trigger ni migración en Supabase.
- No se crean nuevas categorías; `novillo` queda solo como etapa juvenil.
- No se modifican CHECK constraints.
- No se crean wrappers de hooks ni componentes paralelos.
- No se toca `cows/vacas`, `breeding`, ni `vaccinations`.

## Riesgos y cleanup

- Riesgo: cualquier futura pantalla que lea `categoria` esperando ver la categoría "visible" mostrará el valor crudo. Mitigación: contrato explícito documentado en `utils/categorias.ts` y en `index.ts`.
- Si más adelante se decide persistir transiciones automáticas, basta con añadir un job que escriba `categoria` siguiendo la misma función `derivarCategoria`.
