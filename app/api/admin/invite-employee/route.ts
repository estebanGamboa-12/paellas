import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabaseClient";

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ message: "Solo los administradores pueden invitar empleados" }, { status: 403 });
  }

  const body = await request.json();
  const email = body.email as string;
  const password = body.password as string;
  const fullName = (body.fullName as string) ?? null;

  if (!email || !password) {
    return NextResponse.json({ message: "Email y contraseña son obligatorios" }, { status: 400 });
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role: "empleado"
    }
  });

  if (error || !data.user) {
    return NextResponse.json({ message: error?.message ?? "Error creando el usuario" }, { status: 500 });
  }

  const { error: profileError } = await adminClient.from("profiles").insert({
    id: data.user.id,
    role: "empleado",
    full_name: fullName
  });

  if (profileError) {
    return NextResponse.json({ message: profileError.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Empleado creado" });
}
