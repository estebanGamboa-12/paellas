import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { AuthProvider } from "@/components/AuthProvider";
import { createSupabaseServerClient } from "@/lib/supabaseClient";

export default async function HomePage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
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
