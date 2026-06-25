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
      bank_accounts: {
        Row: {
          account_name: string | null
          account_type: string
          bank_name: string
          created_at: string
          currency: string
          current_balance: number
          id: string
          opening_balance: number
          user_id: string
        }
        Insert: {
          account_name?: string | null
          account_type: string
          bank_name: string
          created_at?: string
          currency?: string
          current_balance?: number
          id?: string
          opening_balance?: number
          user_id: string
        }
        Update: {
          account_name?: string | null
          account_type?: string
          bank_name?: string
          created_at?: string
          currency?: string
          current_balance?: number
          id?: string
          opening_balance?: number
          user_id?: string
        }
        Relationships: []
      }
      credit_cards: {
        Row: {
          bank_name: string
          card_name: string
          card_type: string | null
          created_at: string
          id: string
          last_four: string | null
          reward_type: string | null
          user_id: string
        }
        Insert: {
          bank_name: string
          card_name: string
          card_type?: string | null
          created_at?: string
          id?: string
          last_four?: string | null
          reward_type?: string | null
          user_id: string
        }
        Update: {
          bank_name?: string
          card_name?: string
          card_type?: string | null
          created_at?: string
          id?: string
          last_four?: string | null
          reward_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      miles_wallet: {
        Row: {
          balance: number
          expiry_date: string | null
          id: string
          last_updated: string
          program_name: string
          program_type: string | null
          user_id: string
        }
        Insert: {
          balance?: number
          expiry_date?: string | null
          id?: string
          last_updated?: string
          program_name: string
          program_type?: string | null
          user_id: string
        }
        Update: {
          balance?: number
          expiry_date?: string | null
          id?: string
          last_updated?: string
          program_name?: string
          program_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          currency_pref: string
          first_name: string | null
          id: string
          last_name: string | null
          mobile_number: string | null
          onboarding_completed: boolean
          reward_focus: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency_pref?: string
          first_name?: string | null
          id: string
          last_name?: string | null
          mobile_number?: string | null
          onboarding_completed?: boolean
          reward_focus?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency_pref?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          mobile_number?: string | null
          onboarding_completed?: boolean
          reward_focus?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      statements: {
        Row: {
          ai_model_used: string | null
          bank_or_card: string | null
          file_name: string
          file_path: string | null
          file_size_bytes: number | null
          file_type: string | null
          id: string
          period_end: string | null
          period_start: string | null
          processed_at: string | null
          source_type: string | null
          status: string
          transaction_count: number
          uploaded_at: string
          user_id: string
        }
        Insert: {
          ai_model_used?: string | null
          bank_or_card?: string | null
          file_name: string
          file_path?: string | null
          file_size_bytes?: number | null
          file_type?: string | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          processed_at?: string | null
          source_type?: string | null
          status?: string
          transaction_count?: number
          uploaded_at?: string
          user_id: string
        }
        Update: {
          ai_model_used?: string | null
          bank_or_card?: string | null
          file_name?: string
          file_path?: string | null
          file_size_bytes?: number | null
          file_type?: string | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          processed_at?: string | null
          source_type?: string | null
          status?: string
          transaction_count?: number
          uploaded_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          account_id: string | null
          account_type: string | null
          ai_confidence: number | null
          amount: number
          cashback_earned: number
          category: string | null
          created_at: string
          currency: string
          date: string
          description: string | null
          id: string
          mcc_code: string | null
          merchant: string | null
          miles_earned: number
          statement_id: string | null
          user_corrected: boolean
          user_id: string
        }
        Insert: {
          account_id?: string | null
          account_type?: string | null
          ai_confidence?: number | null
          amount: number
          cashback_earned?: number
          category?: string | null
          created_at?: string
          currency?: string
          date: string
          description?: string | null
          id?: string
          mcc_code?: string | null
          merchant?: string | null
          miles_earned?: number
          statement_id?: string | null
          user_corrected?: boolean
          user_id: string
        }
        Update: {
          account_id?: string | null
          account_type?: string | null
          ai_confidence?: number | null
          amount?: number
          cashback_earned?: number
          category?: string | null
          created_at?: string
          currency?: string
          date?: string
          description?: string | null
          id?: string
          mcc_code?: string | null
          merchant?: string | null
          miles_earned?: number
          statement_id?: string | null
          user_corrected?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_statement_id_fkey"
            columns: ["statement_id"]
            isOneToOne: false
            referencedRelation: "statements"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_goals: {
        Row: {
          airline: string | null
          cabin_class: string | null
          created_at: string
          destination: string
          id: string
          miles_current: number
          miles_required: number
          target_date: string | null
          user_id: string
        }
        Insert: {
          airline?: string | null
          cabin_class?: string | null
          created_at?: string
          destination: string
          id?: string
          miles_current?: number
          miles_required: number
          target_date?: string | null
          user_id: string
        }
        Update: {
          airline?: string | null
          cabin_class?: string | null
          created_at?: string
          destination?: string
          id?: string
          miles_current?: number
          miles_required?: number
          target_date?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
