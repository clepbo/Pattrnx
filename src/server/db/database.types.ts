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
      actions: {
        Row: {
          activity_type_id: string | null
          completed_at: string | null
          created_at: string
          estimated_minutes: number | null
          goal_id: string
          id: string
          milestone_id: string | null
          sort_order: number
          status: Database["public"]["Enums"]["action_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_type_id?: string | null
          completed_at?: string | null
          created_at?: string
          estimated_minutes?: number | null
          goal_id: string
          id?: string
          milestone_id?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["action_status"]
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          activity_type_id?: string | null
          completed_at?: string | null
          created_at?: string
          estimated_minutes?: number | null
          goal_id?: string
          id?: string
          milestone_id?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["action_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "actions_activity_type_fkey"
            columns: ["activity_type_id", "user_id"]
            isOneToOne: false
            referencedRelation: "activity_types"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "actions_goal_fkey"
            columns: ["goal_id", "user_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "actions_milestone_fkey"
            columns: ["milestone_id", "goal_id", "user_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id", "goal_id", "user_id"]
          },
        ]
      }
      activities: {
        Row: {
          activity_type_id: string
          created_at: string
          duration_minutes: number | null
          energy_level: number | null
          goal_id: string | null
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
          task_id: string | null
          unit: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_type_id: string
          created_at?: string
          duration_minutes?: number | null
          energy_level?: number | null
          goal_id?: string | null
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
          task_id?: string | null
          unit?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          activity_type_id?: string
          created_at?: string
          duration_minutes?: number | null
          energy_level?: number | null
          goal_id?: string | null
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
          task_id?: string | null
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
            foreignKeyName: "activities_goal_fkey"
            columns: ["goal_id", "user_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "activities_life_area_fkey"
            columns: ["life_area_id", "user_id"]
            isOneToOne: false
            referencedRelation: "life_areas"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "activities_task_fkey"
            columns: ["task_id", "user_id"]
            isOneToOne: false
            referencedRelation: "tasks"
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
      goal_strategies: {
        Row: {
          created_at: string
          description: string
          goal_id: string
          id: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          goal_id: string
          id?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          description?: string
          goal_id?: string
          id?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_strategies_goal_fkey"
            columns: ["goal_id", "user_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      goals: {
        Row: {
          baseline_value: number | null
          created_at: string
          current_state_text: string | null
          deadline: string | null
          description: string | null
          id: string
          life_area_id: string
          measurement_type: Database["public"]["Enums"]["measurement_type"]
          motivation: string | null
          planned_pace_amount: number | null
          planned_pace_period: Database["public"]["Enums"]["pace_period"] | null
          priority: number
          self_confidence: number | null
          start_date: string
          status: Database["public"]["Enums"]["goal_status"]
          status_changed_at: string
          target_state_text: string | null
          target_value: number | null
          title: string
          unit: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          baseline_value?: number | null
          created_at?: string
          current_state_text?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          life_area_id: string
          measurement_type: Database["public"]["Enums"]["measurement_type"]
          motivation?: string | null
          planned_pace_amount?: number | null
          planned_pace_period?:
            | Database["public"]["Enums"]["pace_period"]
            | null
          priority?: number
          self_confidence?: number | null
          start_date: string
          status?: Database["public"]["Enums"]["goal_status"]
          status_changed_at?: string
          target_state_text?: string | null
          target_value?: number | null
          title: string
          unit?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          baseline_value?: number | null
          created_at?: string
          current_state_text?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          life_area_id?: string
          measurement_type?: Database["public"]["Enums"]["measurement_type"]
          motivation?: string | null
          planned_pace_amount?: number | null
          planned_pace_period?:
            | Database["public"]["Enums"]["pace_period"]
            | null
          priority?: number
          self_confidence?: number | null
          start_date?: string
          status?: Database["public"]["Enums"]["goal_status"]
          status_changed_at?: string
          target_state_text?: string | null
          target_value?: number | null
          title?: string
          unit?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_life_area_fkey"
            columns: ["life_area_id", "user_id"]
            isOneToOne: false
            referencedRelation: "life_areas"
            referencedColumns: ["id", "user_id"]
          },
        ]
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
      milestones: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          goal_id: string
          id: string
          sort_order: number
          status: Database["public"]["Enums"]["milestone_status"]
          target_date: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          goal_id: string
          id?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["milestone_status"]
          target_date?: string | null
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          goal_id?: string
          id?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["milestone_status"]
          target_date?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestones_goal_fkey"
            columns: ["goal_id", "user_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      outcomes: {
        Row: {
          activity_id: string | null
          created_at: string
          description: string | null
          goal_id: string
          id: string
          local_date: string
          occurred_at: string
          updated_at: string
          user_id: string
          valence: Database["public"]["Enums"]["outcome_valence"]
          value: number | null
        }
        Insert: {
          activity_id?: string | null
          created_at?: string
          description?: string | null
          goal_id: string
          id?: string
          local_date: string
          occurred_at?: string
          updated_at?: string
          user_id?: string
          valence?: Database["public"]["Enums"]["outcome_valence"]
          value?: number | null
        }
        Update: {
          activity_id?: string | null
          created_at?: string
          description?: string | null
          goal_id?: string
          id?: string
          local_date?: string
          occurred_at?: string
          updated_at?: string
          user_id?: string
          valence?: Database["public"]["Enums"]["outcome_valence"]
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "outcomes_activity_fkey"
            columns: ["activity_id", "user_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "outcomes_goal_fkey"
            columns: ["goal_id", "user_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      patterns: {
        Row: {
          confidence: Database["public"]["Enums"]["pattern_confidence"]
          created_at: string
          detector_key: string
          detector_version: number
          effect_size: number
          evidence: Json
          feedback: Database["public"]["Enums"]["pattern_feedback"] | null
          feedback_at: string | null
          fingerprint: string
          first_detected_at: string
          id: string
          kind: Database["public"]["Enums"]["pattern_kind"]
          last_detected_at: string
          observations: number
          presented_at: string | null
          status: Database["public"]["Enums"]["pattern_status"]
          subject: Json
          summary: string
          suppressed: boolean
          updated_at: string
          user_id: string
          window_end: string
          window_start: string
        }
        Insert: {
          confidence: Database["public"]["Enums"]["pattern_confidence"]
          created_at?: string
          detector_key: string
          detector_version: number
          effect_size: number
          evidence?: Json
          feedback?: Database["public"]["Enums"]["pattern_feedback"] | null
          feedback_at?: string | null
          fingerprint: string
          first_detected_at?: string
          id?: string
          kind: Database["public"]["Enums"]["pattern_kind"]
          last_detected_at?: string
          observations: number
          presented_at?: string | null
          status?: Database["public"]["Enums"]["pattern_status"]
          subject?: Json
          summary: string
          suppressed?: boolean
          updated_at?: string
          user_id?: string
          window_end: string
          window_start: string
        }
        Update: {
          confidence?: Database["public"]["Enums"]["pattern_confidence"]
          created_at?: string
          detector_key?: string
          detector_version?: number
          effect_size?: number
          evidence?: Json
          feedback?: Database["public"]["Enums"]["pattern_feedback"] | null
          feedback_at?: string | null
          fingerprint?: string
          first_detected_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["pattern_kind"]
          last_detected_at?: string
          observations?: number
          presented_at?: string | null
          status?: Database["public"]["Enums"]["pattern_status"]
          subject?: Json
          summary?: string
          suppressed?: boolean
          updated_at?: string
          user_id?: string
          window_end?: string
          window_start?: string
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
          patterns_checked_at: string | null
          patterns_dirty: boolean
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
          patterns_checked_at?: string | null
          patterns_dirty?: boolean
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
          patterns_checked_at?: string | null
          patterns_dirty?: boolean
          timezone?: string
          updated_at?: string
          week_starts_on?: number
        }
        Relationships: []
      }
      routine_steps: {
        Row: {
          created_at: string
          id: string
          minutes: number | null
          routine_id: string
          sort_order: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          minutes?: number | null
          routine_id: string
          sort_order?: number
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          minutes?: number | null
          routine_id?: string
          sort_order?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routine_steps_routine_fkey"
            columns: ["routine_id", "user_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      routines: {
        Row: {
          active_from: string
          activity_type_id: string
          archived_at: string | null
          created_at: string
          days_of_week: number[]
          fallback_description: string | null
          goal_id: string | null
          id: string
          minimum_minutes: number | null
          name: string
          normal_minutes: number
          paused_at: string | null
          preferred_time: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active_from: string
          activity_type_id: string
          archived_at?: string | null
          created_at?: string
          days_of_week: number[]
          fallback_description?: string | null
          goal_id?: string | null
          id?: string
          minimum_minutes?: number | null
          name: string
          normal_minutes: number
          paused_at?: string | null
          preferred_time?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          active_from?: string
          activity_type_id?: string
          archived_at?: string | null
          created_at?: string
          days_of_week?: number[]
          fallback_description?: string | null
          goal_id?: string | null
          id?: string
          minimum_minutes?: number | null
          name?: string
          normal_minutes?: number
          paused_at?: string | null
          preferred_time?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routines_activity_type_fkey"
            columns: ["activity_type_id", "user_id"]
            isOneToOne: false
            referencedRelation: "activity_types"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "routines_goal_fkey"
            columns: ["goal_id", "user_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      tasks: {
        Row: {
          action_id: string | null
          activity_type_id: string | null
          completed_at: string | null
          created_at: string
          goal_id: string | null
          id: string
          minimum_minutes: number | null
          planned_minutes: number | null
          routine_id: string | null
          scheduled_date: string
          scheduled_time: string | null
          source: Database["public"]["Enums"]["task_source"]
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_id?: string | null
          activity_type_id?: string | null
          completed_at?: string | null
          created_at?: string
          goal_id?: string | null
          id?: string
          minimum_minutes?: number | null
          planned_minutes?: number | null
          routine_id?: string | null
          scheduled_date: string
          scheduled_time?: string | null
          source: Database["public"]["Enums"]["task_source"]
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          action_id?: string | null
          activity_type_id?: string | null
          completed_at?: string | null
          created_at?: string
          goal_id?: string | null
          id?: string
          minimum_minutes?: number | null
          planned_minutes?: number | null
          routine_id?: string | null
          scheduled_date?: string
          scheduled_time?: string | null
          source?: Database["public"]["Enums"]["task_source"]
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_action_fkey"
            columns: ["action_id", "user_id"]
            isOneToOne: false
            referencedRelation: "actions"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "tasks_activity_type_fkey"
            columns: ["activity_type_id", "user_id"]
            isOneToOne: false
            referencedRelation: "activity_types"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "tasks_goal_fkey"
            columns: ["goal_id", "user_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "tasks_routine_fkey"
            columns: ["routine_id", "user_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      are_valid_days_of_week: { Args: { days: number[] }; Returns: boolean }
      are_valid_tags: { Args: { tags: string[] }; Returns: boolean }
      claim_pattern_detection: {
        Args: { p_max_age?: string }
        Returns: boolean
      }
      is_valid_timezone: { Args: { tz: string }; Returns: boolean }
      set_task_status: {
        Args: {
          p_status: Database["public"]["Enums"]["task_status"]
          p_task_id: string
        }
        Returns: {
          action_id: string | null
          activity_type_id: string | null
          completed_at: string | null
          created_at: string
          goal_id: string | null
          id: string
          minimum_minutes: number | null
          planned_minutes: number | null
          routine_id: string | null
          scheduled_date: string
          scheduled_time: string | null
          source: Database["public"]["Enums"]["task_source"]
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "tasks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      action_status: "open" | "done" | "dropped"
      activity_polarity: "desired" | "undesired" | "neutral"
      activity_source: "manual" | "task" | "import"
      goal_status: "draft" | "active" | "paused" | "completed" | "abandoned"
      measurement_type: "cumulative" | "level" | "milestone"
      milestone_status: "pending" | "in_progress" | "done" | "dropped"
      outcome_valence: "positive" | "negative" | "neutral" | "unknown"
      pace_period: "day" | "week" | "month"
      pattern_confidence: "low" | "moderate" | "high" | "very_high"
      pattern_feedback: "accurate" | "partially_accurate" | "not_accurate"
      pattern_kind:
        | "frequency"
        | "deviation"
        | "timing"
        | "streak"
        | "breaking_point"
        | "sequence"
        | "loop"
      pattern_status:
        | "candidate"
        | "presented"
        | "acknowledged"
        | "dismissed"
        | "resolved"
      task_source: "manual" | "action" | "routine"
      task_status: "planned" | "done" | "done_minimum" | "skipped"
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
      action_status: ["open", "done", "dropped"],
      activity_polarity: ["desired", "undesired", "neutral"],
      activity_source: ["manual", "task", "import"],
      goal_status: ["draft", "active", "paused", "completed", "abandoned"],
      measurement_type: ["cumulative", "level", "milestone"],
      milestone_status: ["pending", "in_progress", "done", "dropped"],
      outcome_valence: ["positive", "negative", "neutral", "unknown"],
      pace_period: ["day", "week", "month"],
      pattern_confidence: ["low", "moderate", "high", "very_high"],
      pattern_feedback: ["accurate", "partially_accurate", "not_accurate"],
      pattern_kind: [
        "frequency",
        "deviation",
        "timing",
        "streak",
        "breaking_point",
        "sequence",
        "loop",
      ],
      pattern_status: [
        "candidate",
        "presented",
        "acknowledged",
        "dismissed",
        "resolved",
      ],
      task_source: ["manual", "action", "routine"],
      task_status: ["planned", "done", "done_minimum", "skipped"],
    },
  },
} as const

