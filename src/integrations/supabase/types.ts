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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      degree_fees: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string
          fee_date: string
          id: string
          notes: string | null
          receipt_url: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          description: string
          fee_date: string
          id?: string
          notes?: string | null
          receipt_url?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string
          fee_date?: string
          id?: string
          notes?: string | null
          receipt_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          description: string
          expense_date: string
          id: string
          notes: string | null
          receipt_url: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          category?: string | null
          created_at?: string
          description: string
          expense_date: string
          id?: string
          notes?: string | null
          receipt_url?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          description?: string
          expense_date?: string
          id?: string
          notes?: string | null
          receipt_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      extraordinary_fees: {
        Row: {
          amount_per_member: number
          category: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          is_mandatory: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          amount_per_member?: number
          category?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_mandatory?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          amount_per_member?: number
          category?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_mandatory?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      extraordinary_payments: {
        Row: {
          amount_paid: number
          created_at: string
          extraordinary_fee_id: string
          id: string
          member_id: string
          payment_date: string | null
          receipt_url: string | null
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          created_at?: string
          extraordinary_fee_id: string
          id?: string
          member_id: string
          payment_date?: string | null
          receipt_url?: string | null
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          created_at?: string
          extraordinary_fee_id?: string
          id?: string
          member_id?: string
          payment_date?: string | null
          receipt_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "extraordinary_payments_extraordinary_fee_id_fkey"
            columns: ["extraordinary_fee_id"]
            isOneToOne: false
            referencedRelation: "extraordinary_fees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extraordinary_payments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          address: string | null
          birth_date: string | null
          cargo_logial: string | null
          cedula: string | null
          created_at: string
          degree: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          full_name: string
          id: string
          is_treasurer: boolean | null
          join_date: string | null
          phone: string | null
          status: string | null
          treasury_amount: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          cargo_logial?: string | null
          cedula?: string | null
          created_at?: string
          degree?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name: string
          id?: string
          is_treasurer?: boolean | null
          join_date?: string | null
          phone?: string | null
          status?: string | null
          treasury_amount?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          cargo_logial?: string | null
          cedula?: string | null
          created_at?: string
          degree?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string
          id?: string
          is_treasurer?: boolean | null
          join_date?: string | null
          phone?: string | null
          status?: string | null
          treasury_amount?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      monthly_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          member_id: string
          month: number
          paid_at: string | null
          payment_type: string | null
          quick_pay_group_id: string | null
          receipt_url: string | null
          status: string | null
          updated_at: string
          year: number
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          member_id: string
          month: number
          paid_at?: string | null
          payment_type?: string | null
          quick_pay_group_id?: string | null
          receipt_url?: string | null
          status?: string | null
          updated_at?: string
          year: number
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          member_id?: string
          month?: number
          paid_at?: string | null
          payment_type?: string | null
          quick_pay_group_id?: string | null
          receipt_url?: string | null
          status?: string | null
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "monthly_payments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      receipt_sequences: {
        Row: {
          id: string
          last_number: number
          module: string
        }
        Insert: {
          id?: string
          last_number?: number
          module: string
        }
        Update: {
          id?: string
          last_number?: number
          module?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          annual_report_template: string | null
          created_at: string
          id: string
          institution_name: string | null
          logo_url: string | null
          monthly_fee_base: number | null
          monthly_report_template: string | null
          treasurer_id: string | null
          treasurer_signature_url: string | null
          updated_at: string
          vm_signature_url: string | null
        }
        Insert: {
          annual_report_template?: string | null
          created_at?: string
          id?: string
          institution_name?: string | null
          logo_url?: string | null
          monthly_fee_base?: number | null
          monthly_report_template?: string | null
          treasurer_id?: string | null
          treasurer_signature_url?: string | null
          updated_at?: string
          vm_signature_url?: string | null
        }
        Update: {
          annual_report_template?: string | null
          created_at?: string
          id?: string
          institution_name?: string | null
          logo_url?: string | null
          monthly_fee_base?: number | null
          monthly_report_template?: string | null
          treasurer_id?: string | null
          treasurer_signature_url?: string | null
          updated_at?: string
          vm_signature_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "settings_treasurer_id_fkey"
            columns: ["treasurer_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_next_receipt_number: { Args: { p_module: string }; Returns: string }
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
