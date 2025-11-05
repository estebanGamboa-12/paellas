import type { SupabaseClient } from "@supabase/supabase-js";

export type Database = {
  public: {
    Tables: {
      clients: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          phone: string | null;
          notes: string | null;
          status: "pendiente" | "entregado" | "devuelto";
          created_at: string;
        };
        Insert: {
          id?: string;
          first_name: string;
          last_name: string;
          phone?: string | null;
          notes?: string | null;
          status?: "pendiente" | "entregado" | "devuelto";
        };
        Update: Partial<Database["public"]["Tables"]["clients"]["Row"]>;
      };
      paellas: {
        Row: {
          id: string;
          client_id: string;
          servings: number;
          rice_type: string | null;
          status: "pendiente" | "cocinando" | "lista" | "entregada" | "devuelta";
          scheduled_for: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          servings: number;
          rice_type?: string | null;
          status?: "pendiente" | "cocinando" | "lista" | "entregada" | "devuelta";
          scheduled_for?: string | null;
          notes?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["paellas"]["Row"]>;
      };
      profiles: {
        Row: {
          id: string;
          role: "admin" | "empleado";
          full_name: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          role: "admin" | "empleado";
          full_name?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
      };
    };
  };
};

export type TypedSupabaseClient = SupabaseClient<Database>;
