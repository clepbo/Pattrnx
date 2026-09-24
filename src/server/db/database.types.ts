export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activities: {
        Row: {
          activity_type_id: string
          created_at: string
          duration_minutes: number | null
          energy_level: number | null
          id: string
          life_area_id: string
          local_date: string
          local_hour: number
          mood: number | null
          note: string | null
          occurred_at: string
          quantity: number | null
          source: Database["public"]["Enums"]["activity_source"]
          tags: string[]
          unit: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_type_id: string
          created_at?: string
          duration_minutes?: number | null
          energy_level?: number | null
          id?: string
          life_area_id: string
          local_date: string
          local_hour: number
          mood?: number | null
          note?: string | null
          occurred_at?: string
          quantity?: number | null
          source?: Database["public"]["Enums"]["activity_source"]
          tags?: string[]
          unit?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          activity_type_id?: string
          created_at?: string
          duration_minutes?: number | null
          energy_level?: number | null
          id?: string
          life_area_id?: string
          local_date?: string
          local_hour?: number
          mood?: number | null
          note?: string | null
          occurred_at?: string
          quantity?: number | null
          source?: Database["public"]["Enums"]["activity_source"]
          tags?: string[]
          unit?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_activity_type_fkey"
            columns: ["activity_type_id", "user_id"]
            isOneToOne: false
            referencedRelation: "activity_types"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "activities_life_area_fkey"
            columns: ["life_area_id", "user_id"]
            isOneToOne: false
            referencedRelation: "life_areas"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      activity_types: {
        Row: {
          archived_at: string | null
          created_at: string
          default_unit: string | null
          id: string
          is_quick_log: boolean
          life_area_id: string
          name: string
          polarity: Database["public"]["Enums"]["activity_polarity"]
          quick_log_defaults: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          default_unit?: string | null
          id?: string
          is_quick_log?: boolean
          life_area_id: string
          name: string
          polarity?: Database["public"]["Enums"]["activity_polarity"]
          quick_log_defaults?: Json
          updated_at?: string
          user_id?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          default_unit?: string | null
          id?: string
          is_quick_log?: boolean
          life_area_id?: string
          name?: string
          polarity?: Database["public"]["Enums"]["activity_polarity"]
          quick_log_defaults?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_types_life_area_fkey"
            columns: ["life_area_id", "user_id"]
            isOneToOne: false
            referencedRelation: "life_areas"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      daily_checkins: {
        Row: {
          created_at: string
          energy: number | null
          id: string
          local_date: string
          mood: number | null
          note: string | null
          sleep_hours: number | null
          stress: number | null
          updated_at: string
          user_id: string
          workload: number | null
        }
        Insert: {
          created_at?: string
          energy?: number | null
          id?: string
          local_date: string
          mood?: number | null
          note?: string | null
          sleep_hours?: number | null
          stress?: number | null
          updated_at?: string
          user_id?: string
          workload?: number | null
        }
        Update: {
          created_at?: string
          energy?: number | null
          id?: string
          local_date?: string
          mood?: number | null
          note?: string | null
          sleep_hours?: number | null
          stress?: number | null
          updated_at?: string
          user_id?: string
          workload?: number | null
        }
        Relationships: []
      }
      life_areas: {
        Row: {
          archived_at: string | null
          color: string | null
          created_at: string
          id: string
          name: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          color?: string | null
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          archived_at?: string | null
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ai_processing_consent: boolean
          created_at: string
          currency: string
          display_name: string | null
          id: string
          onboarding_completed_at: string | null
          timezone: string
          updated_at: string
          week_starts_on: number
        }
        Insert: {
          ai_processing_consent?: boolean
          created_at?: string
          currency?: string
          display_name?: string | null
          id: string
          onboarding_completed_at?: string | null
          timezone?: string
          updated_at?: string
          week_starts_on?: number
        }
        Update: {
          ai_processing_consent?: boolean
          created_at?: string
          currency?: string
          display_name?: string | null
          id?: string
          onboarding_completed_at?: string | null
          timezone?: string
          updated_at?: string
          week_starts_on?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      are_valid_tags: { Args: { tags: string[] }; Returns: boolean }
      is_valid_timezone: { Args: { tz: string }; Returns: boolean }
    }
    Enums: {
      activity_polarity: "desired" | "undesired" | "neutral"
      activity_source: "manual" | "task" | "import"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      activity_polarity: ["desired", "undesired", "neutral"],
      activity_source: ["manual", "task", "import"],
    },
  },
} as const

