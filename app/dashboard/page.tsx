import { redirect } from "next/navigation";
import { AuthProvider } from "@/components/AuthProvider";
import { Dashboard, type ClientWithPaellas } from "@/components/Dashboard";
import { createSupabaseServerClient } from "@/lib/supabaseClient";

export default async function DashboardPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/");
  }

  const { data: clientsData } = await supabase
    .from("clients")
    .select("*, paellas(*)")
    .order("created_at", { ascending: false });

  const clients = (clientsData ?? []) as unknown as ClientWithPaellas[];

  return (
    <AuthProvider>
      <Dashboard profile={profile} initialClients={clients} />
    </AuthProvider>
  );
}
