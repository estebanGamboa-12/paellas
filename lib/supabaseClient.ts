import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

import type { Database, TypedSupabaseClient } from "@/lib/database.types";

export const createSupabaseServerClient = (): TypedSupabaseClient =>
  createServerComponentClient<Database>({ cookies });

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

export type { TypedSupabaseClient };
