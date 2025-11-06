"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import ConfirmDialog from "@/app/components/ConfirmDialog";




export default function Dashboard() {
  const [clients, setClients] = useState<any[]>([]);
  const [filter, setFilter] = useState("todas");
  const [search, setSearch] = useState("");
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);



  async function handleUpdateClientStatus(clientId: string, newStatus: "pendiente" | "entregada") {
    const { error } = await supabase
      .from("paellas")
      .update({ status: newStatus })
      .eq("client_id", clientId);

    if (error) {
      toast.error("❌ Error al actualizar el estado");
      return;
    }

    toast.success(
      newStatus === "entregada"
        ? "✅ Paellas marcadas como entregadas"
        : "🔄 Paellas marcadas como pendientes"
    );

    load();
  }




  function getClientStatus(paellas: any[]) {
    return paellas.some((p) => p.status === "pendiente")
      ? "pendiente"
      : "entregada";
  }

  function getTotalDeposit(paellas: any[]) {
    return paellas.reduce((sum, p) => {
      try {
        const notes = JSON.parse(p.notes || "{}");
        return sum + (notes.deposit ? Number(notes.deposit) : 0);
      } catch {
        return sum;
      }
    }, 0);
  }


  function parseNotes(notes: string | null) {
    try {
      const parsed = JSON.parse(notes || "{}");
      return {
        deposit: parsed.deposit ?? null,
        price: parsed.price ?? null,
      };
    } catch {
      return { deposit: null, price: null };
    }
  }

  async function load() {
    const { data } = await supabase
      .from("clients")
      .select(`
        id,
        first_name,
        last_name,
        phone,
        paellas (
          id,
          servings,
          rice_type,
          status,
          notes
        )
      `)
      .order("id", { ascending: false });

    setClients(data || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleUpdateStatus(paellaId: string, status: "pendiente" | "entregada") {
    await supabase.from("paellas").update({ status }).eq("id", paellaId);

    // Actualizar en estado sin recargar
    setClients((prev) =>
      prev.map((client) => ({
        ...client,
        paellas: client.paellas.map((p: any) =>
          p.id === paellaId ? { ...p, status } : p
        ),
      }))
    );
  }
  async function markClientReturned(clientId: string) {
    await supabase
      .from("paellas")
      .update({ status: "entregada" })
      .eq("client_id", clientId);

    // Actualizamos estado sin recargar
    setClients((prev) =>
      prev.map((c) =>
        c.id === clientId
          ? {
            ...c,
            paellas: c.paellas.map((p: any) => ({ ...p, status: "entregada" })),
          }
          : c
      )
    );
  }


  function filtered() {
    return clients
      .map((client) => ({
        ...client,
        paellas: client.paellas.filter((p: any) =>
          filter === "todas" ? true : p.status === filter
        ),
      }))
      .filter((client) =>
        `${client.first_name} ${client.last_name}`
          .toLowerCase()
          .includes(search.toLowerCase())
      )
      .filter((client) => client.paellas.length > 0);
  }

  return (
    <div className="space-y-6 p-4">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-800">Clientes</h1>
        <Link href="/dashboard/create" className="text-blue-600 font-medium hover:underline">
          + Nuevo
        </Link>
      </div>

      {/* SEARCH */}
      <input
        type="text"
        placeholder="Buscar por nombre..."
        className="w-full px-4 py-2 rounded-lg border bg-white shadow-sm"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* FILTER BUTTONS */}
      <div className="flex gap-2 mt-2">
        <button
          onClick={() => setFilter("pendiente")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition ${filter === "pendiente"
            ? "bg-red-500 text-white"
            : "bg-red-100 text-red-600"
            }`}
        >
          Pendientes
        </button>

        <button
          onClick={() => setFilter("entregada")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition ${filter === "entregada"
            ? "bg-green-600 text-white"
            : "bg-green-100 text-green-700"
            }`}
        >
          Entregadas
        </button>

        <button
          onClick={() => setFilter("todas")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition ${filter === "todas"
            ? "bg-slate-700 text-white"
            : "bg-slate-200 text-slate-700"
            }`}
        >
          Todas
        </button>
      </div>

      {/* LIST */}
      {/* LISTADO */}
      <div className="space-y-4">
        {filtered().map((client) => {
          const clientStatus = getClientStatus(client.paellas);
          const totalDeposit = getTotalDeposit(client.paellas);

          return (
            <div key={client.id} className="rounded-xl bg-white p-4 shadow-sm border">

              {/* CABECERA */}
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-lg font-semibold text-slate-800">
                    {client.first_name} {client.last_name}
                  </div>
                  <div className="text-sm text-slate-500">
                    {client.phone || "Sin teléfono"}
                  </div>
                </div>

                <span
                  className={`px-3 py-1 text-sm font-medium rounded-full capitalize ${clientStatus === "pendiente"
                    ? "bg-red-100 text-red-700"
                    : "bg-green-100 text-green-700"
                    }`}
                >
                  {clientStatus}
                </span>
              </div>

              {/* LISTA DE PAELLAS */}
              <div className="mt-3 space-y-2">
                {client.paellas.map((p: any) => {
                  const { deposit } = parseNotes(p.notes);

                  return (
                    <div key={p.id} className="flex justify-between items-center border-b pb-2">
                      <div className="text-sm text-slate-700">
                        🍽️ {p.servings} personas — Fianza {deposit ? `${deposit}€` : "-"}
                      </div>

                      {/* <div className="flex gap-1">
                  <button
                    onClick={() => handleUpdateStatus(p.id, "pendiente")}
                    className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-700 hover:bg-amber-200"
                  >
                    Pendiente
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(p.id, "entregada")}
                    className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200"
                  >
                    Entregada
                  </button>
                </div> */}
                    </div>
                  );
                })}
              </div>

              {/* TOTAL FIANZAS */}
              <div className="mt-3 text-sm font-semibold text-slate-800">
                💰 Total fianzas: {totalDeposit} €
              </div>

              {/* BOTONES DE ABAJO */}
              <div className="flex items-center gap-4 pt-3 text-sm font-medium">

                {/* CAMBIAR ESTADO */}
                <button
                  onClick={() =>
                    handleUpdateClientStatus(
                      client.id,
                      client.paellas.every((p: any) => p.status === "pendiente")
                        ? "entregada"
                        : "pendiente"
                    )
                  }
                  className="flex items-center gap-1 text-blue-600 hover:underline font-medium"
                >
                  {client.paellas.every((p: any) => p.status === "pendiente")
                    ? "✅ Marcar entregada"
                    : "🔄 Marcar pendiente"}
                </button>



                {/* EDITAR */}
                <button
                  onClick={() => router.push(`/dashboard/client/${client.id}`)}
                  className="text-blue-600 hover:underline"
                >
                  ✏️ Editar
                </button>

                {/* ELIMINAR */}
                <button
                  onClick={() => {
                    setSelectedClientId(client.id);
                    setConfirmOpen(true);
                  }}
                  className="text-red-600 hover:underline flex items-center gap-1"
                >
                  🗑 Eliminar
                </button>


                {/* TICKET */}
                <button
                  onClick={() => router.push(`/dashboard/ticket/${client.id}`)}
                  className="text-slate-600 hover:underline"
                >
                  🧾 Ticket
                </button>

              </div>


            </div>
          );
        })}
      </div>
<ConfirmDialog
  open={confirmOpen}
  title="Eliminar cliente"
  message="Esto borrará el cliente y todas sus paellas asociadas. ¿Seguro?"
  onCancel={() => setConfirmOpen(false)}
  onConfirm={async () => {
    await supabase.from("clients").delete().eq("id", selectedClientId);
    toast.success("Cliente eliminado correctamente");
    setConfirmOpen(false);
    load(); // refrescar lista
  }}
/>

    </div>
  );
}
