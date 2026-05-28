export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      animal_events: {
        Row: {
          animal_id: string | null
          created_at: string
          fecha: string
          id: string
          is_terminal: boolean
          observaciones: string | null
          payload: Json
          tipo: Database["public"]["Enums"]["animal_event_type"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          animal_id?: string | null
          created_at?: string
          fecha: string
          id?: string
          is_terminal?: boolean
          observaciones?: string | null
          payload?: Json
          tipo: Database["public"]["Enums"]["animal_event_type"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          animal_id?: string | null
          created_at?: string
          fecha?: string
          id?: string
          is_terminal?: boolean
          observaciones?: string | null
          payload?: Json
          tipo?: Database["public"]["Enums"]["animal_event_type"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "animal_events_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
        ]
      }
      animals: {
        Row: {
          categoria: string
          color: string
          created_at: string
          dueno: string
          estado_actual: string
          estado_reproductivo: string | null
          father_id: string | null
          fecha_egreso: string | null
          fecha_nacimiento: string | null
          id: string
          lote_actual: string | null
          madre_texto: string
          mother_id: string | null
          motivo_egreso: string | null
          nombre: string
          numero: string
          padre_texto: string
          raza: string
          sexo: string
          ubicacion_actual: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          categoria: string
          color?: string
          created_at?: string
          dueno?: string
          estado_actual?: string
          estado_reproductivo?: string | null
          father_id?: string | null
          fecha_egreso?: string | null
          fecha_nacimiento?: string | null
          id?: string
          lote_actual?: string | null
          madre_texto?: string
          mother_id?: string | null
          motivo_egreso?: string | null
          nombre?: string
          numero: string
          padre_texto?: string
          raza?: string
          sexo: string
          ubicacion_actual?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          categoria?: string
          color?: string
          created_at?: string
          dueno?: string
          estado_actual?: string
          estado_reproductivo?: string | null
          father_id?: string | null
          fecha_egreso?: string | null
          fecha_nacimiento?: string | null
          id?: string
          lote_actual?: string | null
          madre_texto?: string
          mother_id?: string | null
          motivo_egreso?: string | null
          nombre?: string
          numero?: string
          padre_texto?: string
          raza?: string
          sexo?: string
          ubicacion_actual?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "animals_father_id_fkey"
            columns: ["father_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animals_mother_id_fkey"
            columns: ["mother_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
        ]
      }
      control_vacunas: {
        Row: {
          animal_id: string | null
          created_at: string
          enfermedad_a_prevenir: string
          estado_tratamiento: string
          fecha: string | null
          fecha_proxima_dosis: string | null
          gasto: number
          id: string
          observaciones: string | null
          tipo_tratamiento: string
          updated_at: string
          user_id: string | null
          vacuna_aplicada: string
        }
        Insert: {
          animal_id?: string | null
          created_at?: string
          enfermedad_a_prevenir?: string
          estado_tratamiento?: string
          fecha?: string | null
          fecha_proxima_dosis?: string | null
          gasto?: number
          id?: string
          observaciones?: string | null
          tipo_tratamiento?: string
          updated_at?: string
          user_id?: string | null
          vacuna_aplicada: string
        }
        Update: {
          animal_id?: string | null
          created_at?: string
          enfermedad_a_prevenir?: string
          estado_tratamiento?: string
          fecha?: string | null
          fecha_proxima_dosis?: string | null
          gasto?: number
          id?: string
          observaciones?: string | null
          tipo_tratamiento?: string
          updated_at?: string
          user_id?: string | null
          vacuna_aplicada?: string
        }
        Relationships: [
          {
            foreignKeyName: "control_vacunas_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
        ]
      }
      historial: {
        Row: {
          animal_id: string | null
          created_at: string
          cria_animal_id: string | null
          estado_servicio: string
          fecha_confirmacion: string | null
          fecha_destete: string | null
          fecha_monta: string
          fecha_parto: string | null
          fecha_probable_parto: string | null
          id: string
          observaciones: string | null
          sexo_cria: string | null
          tipo_servicio: string
          toro: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          animal_id?: string | null
          created_at?: string
          cria_animal_id?: string | null
          estado_servicio?: string
          fecha_confirmacion?: string | null
          fecha_destete?: string | null
          fecha_monta: string
          fecha_parto?: string | null
          fecha_probable_parto?: string | null
          id?: string
          observaciones?: string | null
          sexo_cria?: string | null
          tipo_servicio?: string
          toro?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          animal_id?: string | null
          created_at?: string
          cria_animal_id?: string | null
          estado_servicio?: string
          fecha_confirmacion?: string | null
          fecha_destete?: string | null
          fecha_monta?: string
          fecha_parto?: string | null
          fecha_probable_parto?: string | null
          id?: string
          observaciones?: string | null
          sexo_cria?: string | null
          tipo_servicio?: string
          toro?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historial_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      animal_event_type:
        | "venta"
        | "fallecimiento"
        | "traslado"
        | "observacion"
        | "tratamiento"
        | "otro"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      animal_event_type: [
        "venta",
        "fallecimiento",
        "traslado",
        "observacion",
        "tratamiento",
        "otro",
      ],
    },
  },
} as const
