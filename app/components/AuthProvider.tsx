"use client";

import { SessionContextProvider } from "@supabase/auth-helpers-react";
import { ReactNode, useMemo } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  return <SessionContextProvider supabaseClient={supabase}>{children}</SessionContextProvider>;
}
