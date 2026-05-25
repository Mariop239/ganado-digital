## Mejora de Navegación Bidireccional en Árbol Genealógico

Convertir la sección "Padres" del `FamiliaTab` en tarjetas cliqueables (misma UX que "Hijos") y mover la edición de relaciones a un Dialog separado.

### Principios aplicados
- Dominio `animals` se mantiene como única fuente de verdad.
- Reutilizamos `SelectorAnimal`, `useUpdateRelaciones`, `Card`, `Dialog`.
- Sin duplicación visual: lista de Padres usa el mismo patrón visual que lista de Hijos.
- Cambios estrictamente UI + 1 hook nuevo, sin tocar schemas ni `domain.ts`.

---

### Fase A — Datos de los padres (mínimo invasivo)

**Decisión:** NO hacer join anidado en `getAnimalByNumero`. Razones:
- `animals.mother_id` / `father_id` no tienen FK declarada en Supabase (ver schema), por lo que la sintaxis `madre:animals!mother_id(...)` no funciona sin agregar la FK, y eso amplía el alcance fuera de UI.
- Cambiar el tipo `Animal` rompería múltiples consumidores (`FormAnimal`, `ListaAnimales`, `PerfilAnimal`, repos).

**En su lugar:** crear un hook ligero `useAnimalById(id)` que reutilice el repo existente, y un `usePadres(animal)` que devuelva `{ madre, padre }` resolviendo cada uno por id. Esto:
- No toca `domain.ts` ni `Animal`.
- Reutiliza queries cacheadas por React Query (`["animal-by-id", id]`).
- Es 100% reversible.

Archivos:
- `src/modules/animals/repositories/animals.repository.ts` — añadir `getAnimalById(id: string)`.
- `src/modules/animals/hooks/useAnimalById.ts` — nuevo, espejo de `useAnimal` pero por `id`.
- `src/modules/animals/index.ts` — exportar `useAnimalById`.

### Fase B — Tarjetas de Padres cliqueables (solo lectura)

En `FamiliaTab.tsx`, reemplazar la sección "Padres" actual por una lista visual idéntica a "Hijos":

- Una `Card` con título "Padres".
- Dentro, dos filas (Madre / Padre) usando el mismo patrón `<li>` que ya usa Hijos:
  - Si existe `mother_id` → resolver con `useAnimalById` y renderizar `<Link to="/animales/$numero" params={{ numero }}>` envolviendo la fila completa (área de toque grande, `min-h-14`).
  - Si no existe pero hay `madre_texto` → mostrar texto plano con badge "Sin vincular".
  - Si no hay ninguno → estado vacío "Sin madre registrada".
- Mismo tratamiento para Padre.
- Botón secundario en el header de la Card: **"Editar genealogía"** (variant `outline`, icono `Pencil`).

### Fase C — Dialog de edición

Nuevo componente local en el mismo archivo (o `EditarGenealogiaDialog.tsx` si crece):

- `<Dialog>` con título "Editar genealogía".
- Reutiliza `SelectorAnimal` para Madre (`sexo="hembra"`) y Padre (`sexo="macho"`), ambos con `excludeId={animalId}`.
- Mantiene los inputs de texto libre `madre_texto` / `padre_texto` (compatibilidad con animales no catalogados — Principio #5).
- Botones: Cancelar / Guardar (grandes, `min-h-11`).
- Al guardar: `useUpdateRelaciones.mutateAsync(...)` → toast éxito/error → cerrar dialog.
- Estado local del form se inicializa desde `animal` al abrir, se descarta al cancelar.

### Fase D — Cleanup

- Eliminar del cuerpo principal de `FamiliaTab` los `SelectorAnimal` y los `<Input>` de texto libre (ahora viven solo dentro del Dialog).
- Eliminar el botón "Guardar relaciones" antiguo.

---

### Detalles técnicos

```ts
// animals.repository.ts
export async function getAnimalById(id: string): Promise<Animal | null> {
  const { data, error } = await supabase
    .from("animals").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as Animal | null) ?? null;
}
```

```ts
// useAnimalById.ts
export function useAnimalById(id: string | null | undefined) {
  return useQuery({
    queryKey: ["animal-by-id", id],
    queryFn: () => getAnimalById(id as string),
    enabled: !!id,
  });
}
```

Patrón fila padre (mismo estilo que Hijos):
```tsx
<li className="py-2">
  {padre ? (
    <Link to="/animales/$numero" params={{ numero: padre.numero }}
          className="flex items-center justify-between min-h-14 hover:bg-accent/50 rounded-md px-2 -mx-2 transition-colors">
      <div>
        <div className="text-xs uppercase text-muted-foreground">Padre</div>
        <div className="font-medium">#{padre.numero}{padre.nombre ? ` · ${padre.nombre}` : ""}</div>
        <div className="text-xs text-muted-foreground">{padre.sexo} · {padre.categoria}</div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  ) : (
    <EstadoVacio label="Padre" textoLibre={animal.padre_texto} />
  )}
</li>
```

### Riesgos
- Ninguno en BD ni tipos: cero migraciones, cero cambios en `domain.ts`.
- `useAnimalById` dispara 2 fetches extra cuando hay ambos padres vinculados — cacheados por React Query, costo despreciable.

### Fuera de alcance
- Agregar FK real `mother_id/father_id → animals.id` (Principio #7: no sobreingeniería; lo haremos cuando lo justifique un join real).
- Validar `sexo` del padre/madre seleccionado (ya lo hace `SelectorAnimal` vía filtro `sexo`).
- Modificar `FormAnimal`, `PerfilAnimal` u otras vistas.

### Archivos a tocar
- `src/modules/animals/repositories/animals.repository.ts` (+1 función)
- `src/modules/animals/hooks/useAnimalById.ts` (nuevo)
- `src/modules/animals/index.ts` (+1 export)
- `src/modules/animals/components/FamiliaTab.tsx` (refactor sección Padres + Dialog)
