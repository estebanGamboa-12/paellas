import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

import type { Database, TypedSupabaseClient } from "@/lib/database.types";

export const createSupabaseServerClient = (): TypedSupabaseClient =>
  createServerComponentClient<Database>({ cookies });

export type { TypedSupabaseClient };
