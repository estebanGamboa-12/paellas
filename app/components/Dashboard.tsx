"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import type { Database } from "@/lib/database.types";
import clsx from "clsx";

export type ClientWithPaellas = Database["public"]["Tables"]["clients"]["Row"] & {
  paellas: Database["public"]["Tables"]["paellas"]["Row"][];
};

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

type DashboardProps = {
  profile: Profile;
  initialClients: ClientWithPaellas[];
};

type StatusFilter = "todos" | "pendiente" | "devuelto";

type PaellaEditState = {
  servings: number;
  rice_type: string | null;
  notes: string;
  deposit: string;
  price: string;
};

type ParsedPaellaNotes = {
  notesText: string;
  deposit: number | null;
  price: number | null;
};

type SectionKey = "overview" | "clients" | "create" | "invite";

const STATUS_BADGE: Record<string, string> = {
  pendiente: "bg-amber-100 text-amber-800",
  entregado: "bg-sky-100 text-sky-800",
  devuelto: "bg-emerald-100 text-emerald-800"
};

const STATUS_FILTERS: { value: StatusFilter; label: string; icon: string }[] = [
  { value: "pendiente", label: "Pendientes", icon: "⏳" },
  { value: "devuelto", label: "Devueltas", icon: "✅" },
  { value: "todos", label: "Todas", icon: "📋" }
];

const CLIENT_STATUS_LABELS: Record<string, string> = {
  pendiente: "Pendientes",
  entregado: "Entregados",
  devuelto: "Devueltos"
};

const PAELLA_STATUS_BADGE: Record<string, string> = {
  pendiente: "bg-amber-100 text-amber-800",
  cocinando: "bg-blue-100 text-blue-800",
  lista: "bg-emerald-100 text-emerald-800",
  entregada: "bg-green-100 text-green-800",
  devuelta: "bg-rose-100 text-rose-800"
};

const CARD_VARIANTS: Record<string, string> = {
  pendiente: "border-amber-200 ring-1 ring-amber-100/60",
  devuelto: "border-emerald-200 ring-1 ring-emerald-100/60",
  entregado: "border-sky-200 ring-1 ring-sky-100/60"
};

const DEFAULT_DEPOSIT = 10;

function parsePaellaNotes(notes: string | null): ParsedPaellaNotes {
  if (!notes) {
    return { notesText: "", deposit: null, price: null };
  }

  try {
    const parsed = JSON.parse(notes);
    const rawDeposit = parsed.deposit;
    const rawPrice = parsed.price;

    return {
      notesText: typeof parsed.notes === "string" ? parsed.notes : "",
      deposit:
        typeof rawDeposit === "number"
          ? rawDeposit
          : rawDeposit !== undefined && rawDeposit !== null && !Number.isNaN(Number(rawDeposit))
          ? Number(rawDeposit)
          : null,
      price:
        typeof rawPrice === "number"
          ? rawPrice
          : rawPrice !== undefined && rawPrice !== null && !Number.isNaN(Number(rawPrice))
          ? Number(rawPrice)
          : null
    };
  } catch (error) {
    const depositMatch = notes.match(/fianza[:\s]*([0-9.,]+)/i);
    const priceMatch = notes.match(/precio[:\s]*([0-9.,]+)/i);

    return {
      notesText: notes,
      deposit: depositMatch ? Number(depositMatch[1].replace(",", ".")) : null,
      price: priceMatch ? Number(priceMatch[1].replace(",", ".")) : null
    };
  }
}

function buildPaellaNotesPayload({
  notes,
  deposit,
  price
}: {
  notes: string;
  deposit: number | null;
  price: number | null;
}) {
  return JSON.stringify({
    notes,
    deposit,
    price
  });
}

export function Dashboard({ profile, initialClients }: DashboardProps) {
  const supabase = useSupabaseClient<Database>();
  const router = useRouter();
  const [clients, setClients] = useState(initialClients);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formState, setFormState] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    servings: 2,
    rice_type: "Mixta",
    notes: "",
    deposit: DEFAULT_DEPOSIT,
    price: ""
  });
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editFormState, setEditFormState] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    notes: ""
  });
  const [editPaellasState, setEditPaellasState] = useState<Record<string, PaellaEditState>>({});
  const [editingError, setEditingError] = useState<string | null>(null);
  const [savingClient, setSavingClient] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionKey>("overview");

  const isAdmin = profile.role === "admin";

  const sections = useMemo(() => {
    const items: { key: SectionKey; label: string }[] = [
      { key: "overview", label: "Resumen" },
      { key: "clients", label: "Clientes" },
      { key: "create", label: "Nuevo cliente" }
    ];

    if (isAdmin) {
      items.push({ key: "invite", label: "Equipo" });
    }

    return items;
  }, [isAdmin]);

  const clientStatusCounts = useMemo(() => {
    return clients.reduce(
      (acc, client) => {
        acc[client.status] = (acc[client.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
  }, [clients]);

  const totalPaellas = useMemo(
    () => clients.reduce((total, client) => total + client.paellas.length, 0),
    [clients]
  );

  const paellaStatusCounts = useMemo(() => {
    return clients.reduce((acc, client) => {
      client.paellas.forEach((paella) => {
        acc[paella.status] = (acc[paella.status] ?? 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);
  }, [clients]);

  const activePaellas = useMemo(
    () => (paellaStatusCounts.pendiente ?? 0) + (paellaStatusCounts.cocinando ?? 0),
    [paellaStatusCounts]
  );

  const filteredClients = useMemo(() => {
    const normalized = search.toLowerCase().trim();

    return clients.filter((client) => {
      const fullName = `${client.first_name} ${client.last_name}`.toLowerCase();
      const phone = client.phone?.toLowerCase() ?? "";
      const matchesSearch = !normalized || fullName.includes(normalized) || phone.includes(normalized);
      const matchesFilter =
        statusFilter === "todos" ? true : client.status === statusFilter;

      return matchesSearch && matchesFilter;
    });
  }, [clients, search, statusFilter]);

  const resetForm = () => {
    setFormState({
      first_name: "",
      last_name: "",
      phone: "",
      servings: 2,
      rice_type: "Mixta",
      notes: "",
      deposit: DEFAULT_DEPOSIT,
      price: ""
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

    const depositValue = Number(formState.deposit) || DEFAULT_DEPOSIT;
    const priceValue = formState.price ? Number(formState.price) : null;

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
        notes: buildPaellaNotesPayload({
          notes: formState.notes,
          deposit: depositValue,
          price: priceValue
        })
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

  const startEditingClient = (client: ClientWithPaellas) => {
    if (!isAdmin) return;
    setEditingClientId(client.id);
    setEditingError(null);
    setEditFormState({
      first_name: client.first_name,
      last_name: client.last_name,
      phone: client.phone ?? "",
      notes: client.notes ?? ""
    });

    const paellaState: Record<string, PaellaEditState> = {};
    client.paellas.forEach((paella) => {
      const parsed = parsePaellaNotes(paella.notes);
      paellaState[paella.id] = {
        servings: paella.servings,
        rice_type: paella.rice_type,
        notes: parsed.notesText,
        deposit: parsed.deposit !== null ? String(parsed.deposit) : "",
        price: parsed.price !== null ? String(parsed.price) : ""
      };
    });
    setEditPaellasState(paellaState);
  };

  const cancelEditingClient = () => {
    setEditingClientId(null);
    setEditingError(null);
    setSavingClient(false);
    setEditPaellasState({});
  };

  const handleSaveClient = async (client: ClientWithPaellas) => {
    if (!isAdmin) return;

    const paellaStates = editPaellasState;
    const hasInvalidDeposit = Object.values(paellaStates).some((state) => {
      if (!state.deposit) return false;
      return Number.isNaN(Number(state.deposit));
    });
    const hasInvalidPrice = Object.values(paellaStates).some((state) => {
      if (!state.price) return false;
      return Number.isNaN(Number(state.price));
    });

    if (hasInvalidDeposit || hasInvalidPrice) {
      setEditingError("Revisa los importes introducidos para fianza o precio.");
      return;
    }

    setSavingClient(true);
    setEditingError(null);

    const { error: clientError } = await supabase
      .from("clients")
      .update({
        first_name: editFormState.first_name,
        last_name: editFormState.last_name,
        phone: editFormState.phone || null,
        notes: editFormState.notes || null
      })
      .eq("id", client.id);

    if (clientError) {
      setEditingError(clientError.message ?? "No se pudo actualizar el cliente.");
      setSavingClient(false);
      return;
    }

    for (const paella of client.paellas) {
      const state = paellaStates[paella.id];
      if (!state) continue;

      await supabase
        .from("paellas")
        .update({
          servings: state.servings,
          rice_type: state.rice_type,
          notes: buildPaellaNotesPayload({
            notes: state.notes,
            deposit: state.deposit ? Number(state.deposit) : null,
            price: state.price ? Number(state.price) : null
          })
        })
        .eq("id", paella.id);
    }

    const { data: refreshed } = await supabase
      .from("clients")
      .select("*, paellas(*)")
      .eq("id", client.id)
      .single();

    if (refreshed) {
      setClients((current) =>
        current.map((item) => (item.id === client.id ? (refreshed as ClientWithPaellas) : item))
      );
    }

    setSavingClient(false);
    cancelEditingClient();
  };

  return (
    <div className="space-y-6">
      <nav className="sticky top-0 z-10 rounded-xl border border-slate-200 bg-white shadow-sm">
        <ul className="flex flex-wrap items-center gap-2 bg-gradient-to-r from-brand/10 via-slate-50 to-transparent px-4 py-3">
          {sections.map((section) => (
            <li key={section.key}>
              <button
                type="button"
                onClick={() => setActiveSection(section.key)}
                className={clsx(
                  "rounded-full px-4 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/60",
                  activeSection === section.key
                    ? "bg-brand text-white shadow-md"
                    : "border border-transparent text-slate-600 hover:bg-slate-100"
                )}
              >
                {section.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {activeSection === "overview" ? (
        <section className="space-y-6 rounded-lg bg-white p-6 shadow">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-800">Panel principal</h2>
              <p className="text-sm text-slate-600">
                Sesión iniciada como <span className="font-medium">{profile.role}</span>
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="self-start rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
            >
              Cerrar sesión
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Clientes totales</p>
              <p className="mt-2 text-2xl font-semibold text-slate-800">{clients.length}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Paellas registradas</p>
              <p className="mt-2 text-2xl font-semibold text-slate-800">{totalPaellas}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Paellas activas</p>
              <p className="mt-2 text-2xl font-semibold text-slate-800">{activePaellas}</p>
              <p className="text-xs text-slate-500">Pendientes o en cocina</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Clientes pendientes</p>
              <p className="mt-2 text-2xl font-semibold text-slate-800">{clientStatusCounts.pendiente ?? 0}</p>
              <p className="text-xs text-slate-500">A la espera de devolución</p>
            </div>
          </div>
        </section>
      ) : null}

      {activeSection === "clients" ? (
        <div className="space-y-6">
          <section className="rounded-2xl bg-white/90 p-6 shadow-sm ring-1 ring-slate-200/60">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-2xl">
                  📒
                </span>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-brand">Panel de clientes</p>
                  <h3 className="text-2xl font-semibold text-slate-900">Lista de Clientes</h3>
                  <p className="text-sm text-slate-500">Busca, filtra y gestiona tus pedidos en un solo lugar.</p>
                </div>
              </div>
              <div className="w-full max-w-sm">
                <label className="relative block">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-slate-400">
                    🔍
                  </span>
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar por nombre o teléfono..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm text-slate-700 shadow-inner focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                </label>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {STATUS_FILTERS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setStatusFilter(option.value)}
                  className={clsx(
                    "flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wide transition",
                    statusFilter === option.value
                      ? "border-transparent bg-brand text-white shadow-lg shadow-brand/30"
                      : "border-slate-200 bg-white text-slate-600 hover:border-brand/40 hover:text-brand"
                  )}
                >
                  <span className="text-base">{option.icon}</span>
                  {option.label}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h4 className="text-base font-semibold text-slate-700">Clientes encontrados</h4>
              <p className="text-xs text-slate-500">
                Mostrando {filteredClients.length} cliente{filteredClients.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="space-y-4">
              {filteredClients.map((client) => {
                const cardClasses = clsx(
                  "rounded-2xl border bg-white/95 p-6 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg",
                  CARD_VARIANTS[client.status] ?? "border-slate-200/80"
                );
                const paellaDetails = client.paellas.map((paella) => {
                  const parsed = parsePaellaNotes(paella.notes);
                  return {
                    paella,
                    parsed,
                    depositValue: parsed.deposit !== null ? parsed.deposit : DEFAULT_DEPOSIT
                  };
                });
                const totalDeposit = paellaDetails.reduce((sum, item) => sum + item.depositValue, 0);
                const statusLabel = CLIENT_STATUS_LABELS[client.status] ?? client.status;

                return (
                  <article key={client.id} className={cardClasses}>
                    <header className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-lg font-semibold text-slate-900">
                            {client.first_name} {client.last_name}
                          </h4>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                            #{client.id.slice(0, 6)}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <span>📞</span>
                            {client.phone ?? "Sin teléfono"}
                          </span>
                          <span className="flex items-center gap-1">
                            <span>📅</span>
                            {new Date(client.created_at).toLocaleDateString("es-ES", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric"
                            })}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 text-right">
                        <span
                          className={clsx(
                            "rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide",
                            STATUS_BADGE[client.status] ?? STATUS_BADGE.pendiente
                          )}
                        >
                          {statusLabel}
                        </span>
                        <span className="text-[11px] uppercase tracking-wider text-slate-500">
                          Creado el {new Date(client.created_at).toLocaleDateString("es-ES")}
                        </span>
                      </div>
                    </header>

                    {editingClientId === client.id ? (
                      <div className="mt-4 space-y-4 border-t border-slate-200 pt-4">
                        <div className="grid gap-3 md:grid-cols-2">
                          <label className="space-y-1">
                            <span className="text-xs font-semibold uppercase text-slate-600">Nombre</span>
                            <input
                              value={editFormState.first_name}
                              onChange={(event) =>
                                setEditFormState((prev) => ({ ...prev, first_name: event.target.value }))
                              }
                              className="w-full rounded-md border border-slate-200 px-3 py-2"
                            />
                          </label>
                          <label className="space-y-1">
                            <span className="text-xs font-semibold uppercase text-slate-600">Apellido</span>
                            <input
                              value={editFormState.last_name}
                              onChange={(event) =>
                                setEditFormState((prev) => ({ ...prev, last_name: event.target.value }))
                              }
                              className="w-full rounded-md border border-slate-200 px-3 py-2"
                            />
                          </label>
                          <label className="space-y-1">
                            <span className="text-xs font-semibold uppercase text-slate-600">Teléfono</span>
                            <input
                              value={editFormState.phone}
                              onChange={(event) =>
                                setEditFormState((prev) => ({ ...prev, phone: event.target.value }))
                              }
                              className="w-full rounded-md border border-slate-200 px-3 py-2"
                            />
                          </label>
                          <label className="md:col-span-2 space-y-1">
                            <span className="text-xs font-semibold uppercase text-slate-600">Notas generales</span>
                            <textarea
                              value={editFormState.notes}
                              onChange={(event) =>
                                setEditFormState((prev) => ({ ...prev, notes: event.target.value }))
                              }
                              className="w-full rounded-md border border-slate-200 px-3 py-2"
                              rows={2}
                            />
                          </label>
                        </div>

                        <div className="space-y-3">
                          <h5 className="text-sm font-semibold text-slate-700">Paellas de este cliente</h5>
                          {client.paellas.map((paella) => {
                            const storedState = editPaellasState[paella.id];
                            const initialState = () => {
                              const parsedDetails = parsePaellaNotes(paella.notes);
                              return {
                                servings: paella.servings,
                                rice_type: paella.rice_type,
                                notes: parsedDetails.notesText,
                                deposit: parsedDetails.deposit !== null ? String(parsedDetails.deposit) : "",
                                price: parsedDetails.price !== null ? String(parsedDetails.price) : ""
                              } satisfies PaellaEditState;
                            };
                            const currentState = storedState ?? initialState();

                            return (
                              <div key={paella.id} className="rounded-md border border-slate-200 p-3">
                                <div className="grid gap-3 md:grid-cols-3">
                                  <label className="space-y-1">
                                    <span className="text-xs font-semibold uppercase text-slate-600">Raciones</span>
                                    <input
                                      type="number"
                                      min={2}
                                      value={currentState.servings}
                                      onChange={(event) =>
                                        setEditPaellasState((prev) => {
                                          const base = prev[paella.id] ?? initialState();
                                          return {
                                            ...prev,
                                            [paella.id]: {
                                              ...base,
                                              servings: Number(event.target.value)
                                            }
                                          };
                                        })
                                      }
                                      className="w-full rounded-md border border-slate-200 px-3 py-2"
                                    />
                                  </label>
                                  <label className="space-y-1">
                                    <span className="text-xs font-semibold uppercase text-slate-600">Tipo de arroz</span>
                                    <select
                                      value={currentState.rice_type ?? "Mixta"}
                                      onChange={(event) =>
                                        setEditPaellasState((prev) => {
                                          const base = prev[paella.id] ?? initialState();
                                          return {
                                            ...prev,
                                            [paella.id]: {
                                              ...base,
                                              rice_type: event.target.value
                                            }
                                          };
                                        })
                                      }
                                      className="w-full rounded-md border border-slate-200 px-3 py-2"
                                    >
                                      <option value="Mixta">Mixta</option>
                                      <option value="Marisco">Marisco</option>
                                      <option value="Carne">Carne</option>
                                      <option value="Vegetal">Vegetal</option>
                                    </select>
                                  </label>
                                  <label className="space-y-1">
                                    <span className="text-xs font-semibold uppercase text-slate-600">Estado</span>
                                    <span className="block rounded-md border border-dashed border-slate-200 px-3 py-2 text-sm">
                                      {paella.status}
                                    </span>
                                  </label>
                                  <label className="space-y-1">
                                    <span className="text-xs font-semibold uppercase text-slate-600">Fianza (€)</span>
                                    <input
                                      type="number"
                                      min={0}
                                      value={currentState.deposit}
                                      onChange={(event) =>
                                        setEditPaellasState((prev) => {
                                          const base = prev[paella.id] ?? initialState();
                                          return {
                                            ...prev,
                                            [paella.id]: {
                                              ...base,
                                              deposit: event.target.value
                                            }
                                          };
                                        })
                                      }
                                      className="w-full rounded-md border border-slate-200 px-3 py-2"
                                      placeholder="10"
                                    />
                                  </label>
                                  <label className="space-y-1">
                                    <span className="text-xs font-semibold uppercase text-slate-600">Precio (€)</span>
                                    <input
                                      type="number"
                                      min={0}
                                      step="0.01"
                                      value={currentState.price}
                                      onChange={(event) =>
                                        setEditPaellasState((prev) => {
                                          const base = prev[paella.id] ?? initialState();
                                          return {
                                            ...prev,
                                            [paella.id]: {
                                              ...base,
                                              price: event.target.value
                                            }
                                          };
                                        })
                                      }
                                      className="w-full rounded-md border border-slate-200 px-3 py-2"
                                      placeholder="Precio final"
                                    />
                                  </label>
                                  <label className="md:col-span-3 space-y-1">
                                    <span className="text-xs font-semibold uppercase text-slate-600">Notas</span>
                                    <textarea
                                      value={currentState.notes}
                                      onChange={(event) =>
                                        setEditPaellasState((prev) => {
                                          const base = prev[paella.id] ?? initialState();
                                          return {
                                            ...prev,
                                            [paella.id]: {
                                              ...base,
                                              notes: event.target.value
                                            }
                                          };
                                        })
                                      }
                                      className="w-full rounded-md border border-slate-200 px-3 py-2"
                                      rows={2}
                                    />
                                  </label>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {editingError ? <p className="text-sm text-red-600">{editingError}</p> : null}
                        <div className="flex flex-wrap gap-3">
                          <button
                            onClick={() => handleSaveClient(client)}
                            disabled={savingClient}
                            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
                          >
                            {savingClient ? "Guardando..." : "Guardar cambios"}
                          </button>
                          <button
                            onClick={cancelEditingClient}
                            type="button"
                            className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-5 space-y-4">
                        {paellaDetails.length === 0 ? (
                          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                            No hay paellas registradas todavía.
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {paellaDetails.map(({ paella, parsed, depositValue }) => {
                              const priceDisplay =
                                parsed.price !== null
                                  ? `${parsed.price.toLocaleString("es-ES", {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2
                                    })} €`
                                  : "Sin precio asignado";

                              return (
                                <div
                                  key={paella.id}
                                  className="space-y-3 rounded-xl border border-slate-200/70 bg-white/80 p-4 shadow-sm"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 text-slate-700">
                                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand/10 text-lg">
                                        🍽️
                                      </span>
                                      <div>
                                        <p className="text-sm font-semibold text-slate-900">
                                          {paella.servings} persona{paella.servings === 1 ? "" : "s"}
                                        </p>
                                        <p className="text-xs text-slate-500">{paella.rice_type ?? "Mixta"}</p>
                                      </div>
                                    </div>
                                    <span
                                      className={clsx(
                                        "rounded-full px-3 py-1 text-xs capitalize",
                                        PAELLA_STATUS_BADGE[paella.status]
                                      )}
                                    >
                                      {paella.status}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-3 text-xs text-slate-600">
                                    <span className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
                                      <span>👥</span>
                                      {paella.servings} comensales
                                    </span>
                                    <span className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
                                      <span>💶</span>
                                      Fianza {depositValue.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €
                                    </span>
                                    <span className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
                                      <span>🏷️</span>
                                      {priceDisplay}
                                    </span>
                                  </div>
                                  {parsed.notesText ? (
                                    <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">{parsed.notesText}</p>
                                  ) : null}
                                  {isAdmin ? (
                                    <div className="flex flex-wrap gap-2">
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
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <div className="rounded-xl border border-slate-200/70 bg-slate-50/80 p-4 text-sm text-slate-600">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 font-medium text-slate-700">
                              <span>💰</span>
                              Total fianzas
                            </span>
                            <span className="text-base font-semibold text-slate-900">
                              {totalDeposit.toLocaleString("es-ES", {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0
                              })}
                               €
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    <footer className="mt-6 space-y-4">
                      {isAdmin ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => handleUpdateClientStatus(client.id, "devuelto")}
                            className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/70 px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm hover:bg-emerald-100"
                          >
                            <span>✅</span>
                            Marcar devuelta
                          </button>
                          <button
                            onClick={() => handleUpdateClientStatus(client.id, "entregado")}
                            className="flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50/70 px-3 py-1.5 text-xs font-semibold text-sky-700 shadow-sm hover:bg-sky-100"
                          >
                            <span>🎟️</span>
                            Ticket
                          </button>
                          <button
                            onClick={() => startEditingClient(client)}
                            className="flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand shadow-sm hover:bg-brand/20"
                          >
                            <span>✏️</span>
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeleteClient(client.id)}
                            className="flex items-center gap-2 rounded-full border border-red-300 bg-red-50/70 px-3 py-1.5 text-xs font-semibold text-red-700 shadow-sm hover:bg-red-100"
                          >
                            <span>🗑️</span>
                            Eliminar
                          </button>
                          {client.status !== "pendiente" ? (
                            <button
                              onClick={() => handleUpdateClientStatus(client.id, "pendiente")}
                              className="flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50/70 px-3 py-1.5 text-xs font-semibold text-amber-700 shadow-sm hover:bg-amber-100"
                            >
                              <span>↩️</span>
                              Volver a pendiente
                            </button>
                          ) : null}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">
                          Los cambios de estado solo están disponibles para administradores.
                        </p>
                      )}

                      <p className="text-xs text-slate-400">Gestión de paellas adicionales disponible desde el formulario de creación.</p>
                    </footer>
                  </article>
                );
              })}
              {filteredClients.length === 0 ? (
                <p className="rounded-md border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                  No se encontraron clientes para la búsqueda actual.
                </p>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}

      {activeSection === "create" ? (
        <section className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-lg font-semibold text-slate-800">Nuevo cliente y paella</h3>
          <p className="mb-4 text-sm text-slate-600">
            Registra un nuevo pedido con toda la información necesaria.
          </p>
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
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-slate-700">Fianza (€)</label>
              <input
                type="number"
                min={0}
                value={formState.deposit}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, deposit: Number(event.target.value) }))
                }
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
              />
            </div>
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-slate-700">Precio (€)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={formState.price}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, price: event.target.value }))
                }
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
                placeholder="Precio final"
              />
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
        </section>
      ) : null}

      {isAdmin && activeSection === "invite" ? (
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
    </div>
  );
}
