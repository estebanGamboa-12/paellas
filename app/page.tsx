import { redirect } from "next/navigation";
import { LoginForm } from "@/app/components/LoginForm";
import { AuthProvider } from "@/app/components/AuthProvider";
import { createSupabaseServerClient } from "@/lib/supabaseClient";

export default async function HomePage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <AuthProvider>
      <div className="mx-auto max-w-md">
        <h2 className="mb-6 text-xl font-semibold text-slate-800">Bienvenido</h2>
        <LoginForm />
      </div>
    </AuthProvider>
  );
}
