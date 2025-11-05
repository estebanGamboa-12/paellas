"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import type { Database } from "@/lib/supabaseClient";
import clsx from "clsx";

export type ClientWithPaellas = Database["public"]["Tables"]["clients"]["Row"] & {
  paellas: Database["public"]["Tables"]["paellas"]["Row"][];
};

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

type DashboardProps = {
  profile: Profile;
  initialClients: ClientWithPaellas[];
};

const STATUS_BADGE: Record<string, string> = {
  pendiente: "bg-yellow-100 text-yellow-800",
  entregado: "bg-green-100 text-green-800",
  devuelto: "bg-red-100 text-red-800"
};

const PAELLA_STATUS_BADGE: Record<string, string> = {
  pendiente: "bg-amber-100 text-amber-800",
  cocinando: "bg-blue-100 text-blue-800",
  lista: "bg-emerald-100 text-emerald-800",
  entregada: "bg-green-100 text-green-800",
  devuelta: "bg-rose-100 text-rose-800"
};

export function Dashboard({ profile, initialClients }: DashboardProps) {
  const supabase = useSupabaseClient<Database>();
  const router = useRouter();
  const [clients, setClients] = useState(initialClients);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formState, setFormState] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    servings: 2,
    rice_type: "Mixta",
    notes: ""
  });

  const isAdmin = profile.role === "admin";

  const filteredClients = useMemo(() => {
    if (!search) return clients;
    const normalized = search.toLowerCase();
    return clients.filter((client) => {
      const fullName = `${client.first_name} ${client.last_name}`.toLowerCase();
      const phone = client.phone?.toLowerCase() ?? "";
      return fullName.includes(normalized) || phone.includes(normalized);
    });
  }, [clients, search]);

  const resetForm = () => {
    setFormState({
      first_name: "",
      last_name: "",
      phone: "",
      servings: 2,
      rice_type: "Mixta",
      notes: ""
    });
    setFormError(null);
  };

  const handleCreateClient = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (creating) return;
    if (formState.servings < 2) {
      setFormError("La paella debe ser para al menos 2 personas.");
      return;
    }

    setCreating(true);
    setFormError(null);

    const { data: clientData, error: clientError } = await supabase
      .from("clients")
      .insert({
        first_name: formState.first_name,
        last_name: formState.last_name,
        phone: formState.phone || null,
        notes: formState.notes || null,
        status: "pendiente"
      })
      .select()
      .single();

    if (clientError || !clientData) {
      setFormError(clientError?.message ?? "No se pudo crear el cliente");
      setCreating(false);
      return;
    }

    const { data: paellaData, error: paellaError } = await supabase
      .from("paellas")
      .insert({
        client_id: clientData.id,
        servings: formState.servings,
        rice_type: formState.rice_type,
        status: "pendiente",
        notes: formState.notes || null
      })
      .select()
      .single();

    if (paellaError || !paellaData) {
      setFormError(paellaError?.message ?? "No se pudo crear la paella");
      setCreating(false);
      return;
    }

    setClients((current) => [
      { ...clientData, paellas: [paellaData] },
      ...current
    ]);
    setCreating(false);
    resetForm();
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!isAdmin) return;
    await supabase.from("paellas").delete().eq("client_id", clientId);
    await supabase.from("clients").delete().eq("id", clientId);
    setClients((current) => current.filter((client) => client.id !== clientId));
  };

  const handleUpdateClientStatus = async (
    clientId: string,
    status: "pendiente" | "entregado" | "devuelto"
  ) => {
    if (!isAdmin) return;
    const { data } = await supabase
      .from("clients")
      .update({ status })
      .eq("id", clientId)
      .select("*, paellas(*)")
      .single();

    if (data) {
      setClients((current) =>
        current.map((client) => (client.id === clientId ? (data as ClientWithPaellas) : client))
      );
    }
  };

  const handleUpdatePaellaStatus = async (
    paellaId: string,
    status: Database["public"]["Tables"]["paellas"]["Row"]["status"]
  ) => {
    if (!isAdmin) return;
    const { data, error } = await supabase
      .from("paellas")
      .update({ status })
      .eq("id", paellaId)
      .select();

    if (!error && data) {
      setClients((current) =>
        current.map((client) => ({
          ...client,
          paellas: client.paellas.map((paella) =>
            paella.id === paellaId ? { ...paella, status } : paella
          )
        }))
      );
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  const handleAddEmployee = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isAdmin) return;

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email")?.toString() ?? "";
    const password = formData.get("password")?.toString() ?? "";
    const fullName = formData.get("fullName")?.toString() ?? "";

    const response = await fetch("/api/admin/invite-employee", {
      method: "POST",
      body: JSON.stringify({ email, password, fullName }),
      headers: { "Content-Type": "application/json" }
    });

    if (!response.ok) {
      const { message } = await response.json();
      alert(message ?? "No se pudo crear el empleado");
      return;
    }

    alert("Empleado creado correctamente. Se ha enviado una invitación por correo.");
    event.currentTarget.reset();
  };

  return (
    <div className="space-y-8">
      <section className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-800">Panel principal</h2>
          <p className="text-sm text-slate-600">
            Sesión iniciada como <span className="font-medium">{profile.role}</span>
          </p>
        </div>
        <button
          onClick={handleSignOut}
          className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
        >
          Cerrar sesión
        </button>
      </section>

      <section className="grid gap-6 rounded-lg bg-white p-6 shadow lg:grid-cols-2">
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-slate-800">Buscar clientes</h3>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nombre completo o teléfono"
            className="w-full rounded-md border border-slate-200 px-3 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
          />
        </div>
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-slate-800">Nuevo cliente y paella</h3>
          <form onSubmit={handleCreateClient} className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-slate-700">Nombre *</label>
              <input
                required
                value={formState.first_name}
                onChange={(event) => setFormState((prev) => ({ ...prev, first_name: event.target.value }))}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
                placeholder="María"
              />
            </div>
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-slate-700">Apellido *</label>
              <input
                required
                value={formState.last_name}
                onChange={(event) => setFormState((prev) => ({ ...prev, last_name: event.target.value }))}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
                placeholder="García"
              />
            </div>
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-slate-700">Teléfono móvil</label>
              <input
                type="tel"
                value={formState.phone}
                onChange={(event) => setFormState((prev) => ({ ...prev, phone: event.target.value }))}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
                placeholder="600 123 456"
              />
            </div>
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-slate-700">Número de personas *</label>
              <input
                type="number"
                min={2}
                required
                value={formState.servings}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, servings: Number(event.target.value) }))
                }
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
              />
            </div>
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-slate-700">Tipo de arroz</label>
              <select
                value={formState.rice_type}
                onChange={(event) => setFormState((prev) => ({ ...prev, rice_type: event.target.value }))}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
              >
                <option>Mixta</option>
                <option>Marisco</option>
                <option>Carne</option>
                <option>Vegetal</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700">Notas</label>
              <textarea
                value={formState.notes}
                onChange={(event) => setFormState((prev) => ({ ...prev, notes: event.target.value }))}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
                rows={2}
                placeholder="Sin gluten, sin pimiento..."
              />
            </div>
            {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
            <button
              type="submit"
              disabled={creating}
              className="md:col-span-2 rounded-md bg-brand px-4 py-2 font-medium text-white hover:bg-brand-dark disabled:opacity-50"
            >
              {creating ? "Guardando..." : "Crear cliente"}
            </button>
          </form>
        </div>
      </section>

      {isAdmin ? (
        <section className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-lg font-semibold text-slate-800">Gestión de empleados</h3>
          <p className="mb-4 text-sm text-slate-600">
            Invita a nuevos empleados para que puedan registrar clientes.
          </p>
          <form onSubmit={handleAddEmployee} className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">Nombre completo</label>
              <input
                name="fullName"
                required
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
                placeholder="Ana López"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Correo</label>
              <input
                type="email"
                name="email"
                required
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
                placeholder="empleado@paellas.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Contraseña temporal</label>
              <input
                type="password"
                name="password"
                minLength={6}
                required
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <button
              type="submit"
              className="md:col-span-3 rounded-md border border-brand px-4 py-2 font-medium text-brand transition hover:bg-brand/10"
            >
              Invitar empleado
            </button>
          </form>
        </section>
      ) : null}

      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-800">Listado de clientes</h3>
        <div className="space-y-4">
          {filteredClients.map((client) => (
            <article key={client.id} className="rounded-lg bg-white p-6 shadow">
              <header className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-lg font-semibold text-slate-800">
                    {client.first_name} {client.last_name}
                  </h4>
                  <p className="text-sm text-slate-600">{client.phone ?? "Sin teléfono"}</p>
                </div>
                <span
                  className={clsx(
                    "rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide",
                    STATUS_BADGE[client.status] ?? STATUS_BADGE.pendiente
                  )}
                >
                  {client.status}
                </span>
              </header>
              <div className="mt-4 space-y-2 text-sm text-slate-600">
                {client.paellas.length === 0 ? (
                  <p>No hay paellas registradas todavía.</p>
                ) : (
                  client.paellas.map((paella) => (
                    <div
                      key={paella.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-100 p-3"
                    >
                      <div>
                        <p className="font-medium text-slate-800">
                          {paella.servings} raciones · {paella.rice_type ?? "Mixta"}
                        </p>
                        <p className="text-xs text-slate-500">
                          Estado: {paella.status} · {paella.notes ?? "Sin notas"}
                        </p>
                      </div>
                      {isAdmin ? (
                        <div className="flex flex-wrap items-center gap-2">
                          {(["pendiente", "cocinando", "lista", "entregada", "devuelta"] as const).map(
                            (statusOption) => (
                              <button
                                key={statusOption}
                                onClick={() => handleUpdatePaellaStatus(paella.id, statusOption)}
                                className={clsx(
                                  "rounded-full px-3 py-1 text-xs capitalize transition",
                                  PAELLA_STATUS_BADGE[statusOption],
                                  paella.status === statusOption
                                    ? "ring-2 ring-brand/60"
                                    : "opacity-70 hover:opacity-100"
                                )}
                              >
                                {statusOption}
                              </button>
                            )
                          )}
                        </div>
                      ) : (
                        <span
                          className={clsx(
                            "rounded-full px-3 py-1 text-xs capitalize",
                            PAELLA_STATUS_BADGE[paella.status]
                          )}
                        >
                          {paella.status}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
              <footer className="mt-4 flex flex-wrap items-center gap-3">
                {isAdmin ? (
                  <>
                    <button
                      onClick={() => handleUpdateClientStatus(client.id, "pendiente")}
                      className="rounded-md border border-yellow-300 px-3 py-1 text-xs font-medium text-yellow-700"
                    >
                      Pendiente
                    </button>
                    <button
                      onClick={() => handleUpdateClientStatus(client.id, "entregado")}
                      className="rounded-md border border-emerald-300 px-3 py-1 text-xs font-medium text-emerald-700"
                    >
                      Ticket
                    </button>
                    <button
                      onClick={() => handleUpdateClientStatus(client.id, "devuelto")}
                      className="rounded-md border border-rose-300 px-3 py-1 text-xs font-medium text-rose-700"
                    >
                      Devuelta
                    </button>
                    <button
                      onClick={() => handleDeleteClient(client.id)}
                      className="ml-auto rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                    >
                      Eliminar
                    </button>
                  </>
                ) : (
                  <p className="text-xs text-slate-500">
                    Los cambios de estado solo están disponibles para administradores.
                  </p>
                )}
              </footer>
            </article>
          ))}
          {filteredClients.length === 0 ? (
            <p className="rounded-md border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
              No se encontraron clientes para la búsqueda actual.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
