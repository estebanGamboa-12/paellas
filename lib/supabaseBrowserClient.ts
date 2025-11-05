import { createBrowserClient } from "@supabase/auth-helpers-nextjs";

import type { Database, TypedSupabaseClient } from "@/lib/database.types";

export const createSupabaseBrowserClient = (): TypedSupabaseClient =>
  createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
