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
      partner_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      partner_device_locks: {
        Row: {
          created_at: string
          device_id: string
          email: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          device_id: string
          email: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string
          email?: string
          user_id?: string | null
        }
        Relationships: []
      }
      partner_match_reads: {
        Row: {
          last_read_at: string
          match_id: string
          user_id: string
        }
        Insert: {
          last_read_at?: string
          match_id: string
          user_id: string
        }
        Update: {
          last_read_at?: string
          match_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_match_reads_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "partner_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_matches: {
        Row: {
          chat_expires_at: string | null
          created_at: string
          id: string
          user_a: string
          user_b: string
        }
        Insert: {
          chat_expires_at?: string | null
          created_at?: string
          id?: string
          user_a: string
          user_b: string
        }
        Update: {
          chat_expires_at?: string | null
          created_at?: string
          id?: string
          user_a?: string
          user_b?: string
        }
        Relationships: []
      }
      partner_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          match_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          match_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          match_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_messages_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "partner_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_otp_codes: {
        Row: {
          code: string
          created_at: string
          email: string
          expires_at: string
          id: string
        }
        Insert: {
          code: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
        }
        Update: {
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
        }
        Relationships: []
      }
      partner_profiles: {
        Row: {
          age: number | null
          approval_emailed_at: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          gender: string | null
          id: string
          looking_for: string[] | null
          photo_urls: string[] | null
          reject_reason: string | null
          status: string
          user_id: string
        }
        Insert: {
          age?: number | null
          approval_emailed_at?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          gender?: string | null
          id?: string
          looking_for?: string[] | null
          photo_urls?: string[] | null
          reject_reason?: string | null
          status?: string
          user_id: string
        }
        Update: {
          age?: number | null
          approval_emailed_at?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          gender?: string | null
          id?: string
          looking_for?: string[] | null
          photo_urls?: string[] | null
          reject_reason?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      partner_reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string | null
          reported_id: string
          reporter_id: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string | null
          reported_id: string
          reporter_id: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string | null
          reported_id?: string
          reporter_id?: string
        }
        Relationships: []
      }
      partner_swipes: {
        Row: {
          created_at: string
          direction: string
          id: string
          swiped_id: string
          swiper_id: string
        }
        Insert: {
          created_at?: string
          direction: string
          id?: string
          swiped_id: string
          swiper_id: string
        }
        Update: {
          created_at?: string
          direction?: string
          id?: string
          swiped_id?: string
          swiper_id?: string
        }
        Relationships: []
      }
      payment_intents: {
        Row: {
          attendee_type: string | null
          buyer_email: string | null
          buyer_name: string | null
          buyer_phone: string | null
          claimed_at: string | null
          created_at: string
          edition: string
          id: string
          quantity: number
          reference: string
          status: string
          ticket_type: string
          total_amount: number
          unit_price: number
          verified_at: string | null
        }
        Insert: {
          attendee_type?: string | null
          buyer_email?: string | null
          buyer_name?: string | null
          buyer_phone?: string | null
          claimed_at?: string | null
          created_at?: string
          edition?: string
          id?: string
          quantity: number
          reference: string
          status?: string
          ticket_type: string
          total_amount: number
          unit_price: number
          verified_at?: string | null
        }
        Update: {
          attendee_type?: string | null
          buyer_email?: string | null
          buyer_name?: string | null
          buyer_phone?: string | null
          claimed_at?: string | null
          created_at?: string
          edition?: string
          id?: string
          quantity?: number
          reference?: string
          status?: string
          ticket_type?: string
          total_amount?: number
          unit_price?: number
          verified_at?: string | null
        }
        Relationships: []
      }
      ticket_purchases: {
        Row: {
          amount: number
          created_at: string
          edition: string
          email: string
          id: string
          name: string
          paid_at: string | null
          phone: string | null
          quantity: number
          reference: string
          status: string
          ticket_type: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          edition?: string
          email: string
          id?: string
          name: string
          paid_at?: string | null
          phone?: string | null
          quantity?: number
          reference: string
          status?: string
          ticket_type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          edition?: string
          email?: string
          id?: string
          name?: string
          paid_at?: string | null
          phone?: string | null
          quantity?: number
          reference?: string
          status?: string
          ticket_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      tickets: {
        Row: {
          amount_paid: number
          buyer_email: string
          buyer_name: string
          created_at: string
          edition: string
          id: string
          payment_reference: string
          qr_signature: string
          quantity: number
          ticket_index: number
          ticket_type: string
          used: boolean
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          amount_paid: number
          buyer_email: string
          buyer_name: string
          created_at?: string
          edition?: string
          id?: string
          payment_reference: string
          qr_signature: string
          quantity?: number
          ticket_index?: number
          ticket_type: string
          used?: boolean
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          amount_paid?: number
          buyer_email?: string
          buyer_name?: string
          created_at?: string
          edition?: string
          id?: string
          payment_reference?: string
          qr_signature?: string
          quantity?: number
          ticket_index?: number
          ticket_type?: string
          used?: boolean
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendor_applications: {
        Row: {
          amount: number
          brand_description: string | null
          brand_name: string
          business_category: string
          city: string | null
          created_at: string
          edition: string
          email: string
          id: string
          instagram: string | null
          paid_at: string | null
          phone: string
          previous_vendor: string | null
          reference: string
          scanned: boolean
          scanned_at: string | null
          scanned_by: string | null
          status: string
          sub_category: string | null
          sub_category_key: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          brand_description?: string | null
          brand_name: string
          business_category: string
          city?: string | null
          created_at?: string
          edition?: string
          email: string
          id?: string
          instagram?: string | null
          paid_at?: string | null
          phone: string
          previous_vendor?: string | null
          reference: string
          scanned?: boolean
          scanned_at?: string | null
          scanned_by?: string | null
          status?: string
          sub_category?: string | null
          sub_category_key?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          brand_description?: string | null
          brand_name?: string
          business_category?: string
          city?: string | null
          created_at?: string
          edition?: string
          email?: string
          id?: string
          instagram?: string | null
          paid_at?: string | null
          phone?: string
          previous_vendor?: string | null
          reference?: string
          scanned?: boolean
          scanned_at?: string | null
          scanned_by?: string | null
          status?: string
          sub_category?: string | null
          sub_category_key?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "scanner"
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
  public: {
    Enums: {
      app_role: ["admin", "scanner"],
    },
  },
} as const
