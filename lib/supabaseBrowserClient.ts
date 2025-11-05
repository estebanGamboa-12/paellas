import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

import type { Database, TypedSupabaseClient } from "@/lib/database.types";

export const createSupabaseBrowserClient = (): TypedSupabaseClient =>
  createClientComponentClient<Database>();
