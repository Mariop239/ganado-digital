# Mejora UX en FormAnimal: categoría auto-derivada

Alinear el formulario con la lógica biológica ya existente. Solo cambios locales en `src/modules/animals/components/FormAnimal.tsx` reutilizando `derivarCategoria`, `edadEnMeses` y `CATEGORIAS_ADULTAS` desde `src/modules/animals/utils/categorias.ts`.

## Comportamiento

Se observa `sexo` y `fecha_nacimiento` con `form.watch`. Se calcula `meses = edadEnMeses(fecha_nacimiento)` en cada render (función pura, sin `useEffect` salvo el de sincronización del valor).

- **Caso A — Joven (`meses != null && meses <= 15`)**: 
  - Ocultar el selector manual de categoría.
  - Derivar con `derivarCategoria({ fecha_nacimiento, sexo, categoria: form.getValues("categoria") })` y usar `categoria_view`.
  - Sincronizar al form vía un único `useEffect` con deps `[sexo, fecha_nacimiento]` que llame `form.setValue("categoria", categoria_view, { shouldDirty: true })` solo si el valor difiere.
  - Render read-only: `<p className="text-sm text-muted-foreground">Categoría automática: {CATEGORIA_LABELS[derivada]} · Calculada según edad</p>`.

- **Caso B — Adulto (`meses != null && meses > 15`)**:
  - Mostrar `<Select>` con opciones filtradas a `adultasPorSexo(sexo)` (ya devuelve `["vaca"]` o `["toro"]`).
  - Si el valor actual del form no está en esa lista (p.ej. era juvenil), hacer `setValue` al primer adulto válido en el mismo `useEffect`.

- **Caso C — Sin `fecha_nacimiento`**:
  - Comportamiento actual: selector manual con `categoriasPorSexo(sexo)`.

## Detalles de implementación

- Reemplazar el bloque `<Controller name="categoria">` por una rama condicional según los tres casos.
- El `useEffect` existente que reajusta categoría al cambiar `sexo` se fusiona con la nueva sincronización para evitar doble lógica.
- `aplicaEstadoReproductivo(sexo, categoria)` sigue funcionando porque el form siempre tiene una `categoria` válida sincronizada.
- No tocar `schemas`, `domain.ts`, `repositories`, hooks, `PerfilAnimal`, `ListaAnimales`, ni `constants/categorias.ts`.

## Archivos tocados

- `src/modules/animals/components/FormAnimal.tsx` (único cambio).

## Riesgos / cleanup

- Edición de un animal adulto persistido con categoría juvenil rara (`novillo` con >15m): el `useEffect` lo reasignaría a `toro` en cuanto el usuario edite. Mitigación: solo reasignar si la categoría actual NO pertenece al conjunto válido del caso vigente; nunca sobrescribir un valor ya válido.
- No se introduce duplicación: toda la regla biológica vive en `utils/categorias.ts`.
