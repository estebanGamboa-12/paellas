import { createBrowserClient } from "@supabase/auth-helpers-nextjs";
import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { type SupabaseClient } from "@supabase/supabase-js";

export const createSupabaseBrowserClient = () =>
  createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

export const createSupabaseServerClient = () => {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        }
      }
    }
  );
};

export type TypedSupabaseClient = SupabaseClient<Database>;

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
