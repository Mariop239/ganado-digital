export type Sexo = "hembra" | "macho";

export type Categoria =
  | "ternero"
  | "ternera"
  | "novilla"
  | "vaca"
  | "toro"
  | "novillo";

export type EstadoReproductivo =
  | "soltera"
  | "gestante"
  | "parida"
  | "seca";

export type EstadoActual = "activa" | "vendida" | "fallecida";

export type Animal = {
  id: string;
  numero: string;
  nombre: string;
  sexo: Sexo;
  categoria: Categoria;
  estado_reproductivo: EstadoReproductivo | null;
  estado_actual: EstadoActual;
  fecha_nacimiento: string | null;
  color: string;
  raza: string;
  dueno: string;
  mother_id: string | null;
  father_id: string | null;
  madre_texto: string;
  padre_texto: string;
  fecha_egreso: string | null;
  motivo_egreso: string | null;
  created_at: string;
  updated_at: string;
};

export type AnimalRelacionInput = {
  mother_id?: string | null;
  father_id?: string | null;
  madre_texto?: string;
  padre_texto?: string;
};

export type AnimalFiltros = {
  sexo?: Sexo;
  categoria?: Categoria;
  estado_actual?: EstadoActual;
};

/**
 * Vista derivada para la UI. `categoria` permanece intacto (valor real persistido).
 * Solo la UI lee `categoria_view`; formularios, mutaciones y repos siguen usando `categoria`.
 */
export type AnimalView = Animal & {
  categoria_view: Categoria;
  requiere_clasificacion: boolean;
  calculada: boolean;
};