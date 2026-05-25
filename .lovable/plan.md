## Objetivo
`numero` obligatorio visualmente solo para hembras. Machos pueden dejarlo vacío; el form genera un identificador temporal estable antes de persistir. BD, repos, rutas y constraints intactos.

## Cambios

### 1. `src/modules/animals/schemas/index.ts`
- Reemplazar:
  ```ts
  numero: z.string().trim().min(1, "Requerido").max(50)
  ```
  por:
  ```ts
  numero: z.string().trim().max(50).default("")
  ```
- Añadir en el `.superRefine` existente:
  ```ts
  if (data.sexo === "hembra" && !data.numero?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["numero"],
      message: "El número de arete es obligatorio para hembras",
    });
  }
  ```
- No tocar el resto del schema.

### 2. `src/modules/animals/components/FormAnimal.tsx`
- Label dinámico según `sexo` (ya está siendo observado con `form.watch("sexo")`):
  - Hembra: `Número (arete) *`
  - Macho: `Número (arete)`
- Helper text bajo el input:
  > Solo es obligatorio para hembras; los machos pueden usar identificación temporal automática.
- Revalidación reactiva: en el `useEffect` que ya depende de `[sexo, fechaNacimiento]`, añadir:
  ```ts
  if (form.formState.isSubmitted) form.trigger("numero");
  ```
- En `onSubmit`, **antes** de llamar a `create.mutateAsync(parsed)`:
  ```ts
  if (!editing && parsed.sexo === "macho" && !parsed.numero?.trim()) {
    parsed.numero = `M-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
  }
  ```
  - `parsed.numero` queda siempre `string` no vacío → compatible con BD `NOT NULL` y `UNIQUE`.
  - Solo se aplica en creación; en edición no se sobrescribe.
  - El identificador es estable (se persiste tal cual) y navegable en `/animales/:numero`.

## No se toca
- BD, migraciones, constraints, RLS.
- `animals.repository.ts`, hooks, tipos `Animal` (sigue `numero: string`).
- `PerfilAnimal`, listados, breeding, events, vaccinations.
- Routing y redirects legacy.

## Garantías
- `numero` sigue siendo `string` obligatorio en todo el sistema.
- No se introduce `null`, no se usa `null as any`.
- UNIQUE respetado (`crypto.randomUUID()` hace colisión prácticamente imposible).
- UX clara: hembras ven `*` y error si falta; machos ven helper y nunca ven error.

## Fase única
Cambio acotado a 2 archivos, reversible.
