import { redirect } from "next/navigation";
import { AuthProvider } from "@/app/components/AuthProvider";
import { Dashboard, type ClientWithPaellas } from "@/app/components/Dashboard";
import { createSupabaseServerClient } from "@/lib/supabaseClient";

export default async function DashboardPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
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
