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

  function getClientStatus(paellas: any[]) {
    return paellas.some((p) => p.status === "pendiente")
      ? "pendiente"
      : "entregada";
  }

  function getTotalDeposit(paellas: any[]) {
    return paellas.reduce((sum, p) => {
      const { deposit } = parseNotes(p.notes);
      return sum + (deposit ? Number(deposit) : 0);
    }, 0);
  }

  function getTotalPeople(paellas: any[]) {
    return paellas.reduce((sum, p) => sum + Number(p.servings || 0), 0);
  }

  async function handleUpdateClientStatus(clientId: string, newStatus: "pendiente" | "entregada") {
    const { error } = await supabase
      .from("paellas")
      .update({ status: newStatus })
      .eq("client_id", clientId);

    if (error) {
      toast.error("❌ Error al actualizar el estado");
      return;
    }

    toast.success(newStatus === "entregada" ? "✅ Marcado como entregado" : "🔄 Marcado como pendiente");
    load();
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

  // ✅ NUEVO: FUNCIÓN DE IMPRESIÓN
  async function handlePrint(client: any) {
    const totalPeople = getTotalPeople(client.paellas);
    const totalDeposit = getTotalDeposit(client.paellas);
    const estado = getClientStatus(client.paellas);

    try {
      await fetch("http://localhost:5001/print", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente: `${client.first_name} ${client.last_name}`,
          telefono: client.phone || "Sin teléfono",
          personas: totalPeople,
          fianza: totalDeposit,
          estado,
        }),
      });

      toast.success("🧾 Ticket enviado a imprimir");
    } catch (e) {
      toast.error("⚠️ No se pudo conectar al servidor de impresión");
    }
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-800">Clientes</h1>
        <Link href="/dashboard/create" className="text-blue-600 font-medium hover:underline">
          + Nuevo
        </Link>
      </div>

      <input
        type="text"
        placeholder="Buscar por nombre..."
        className="w-full px-4 py-2 rounded-lg border bg-white shadow-sm"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="flex gap-2 mt-2">
        <button onClick={() => setFilter("pendiente")} className={`px-4 py-2 rounded-full text-sm font-medium ${filter === "pendiente" ? "bg-red-500 text-white" : "bg-red-100 text-red-600"}`}>Pendientes</button>
        <button onClick={() => setFilter("entregada")} className={`px-4 py-2 rounded-full text-sm font-medium ${filter === "entregada" ? "bg-green-600 text-white" : "bg-green-100 text-green-700"}`}>Entregadas</button>
        <button onClick={() => setFilter("todas")} className={`px-4 py-2 rounded-full text-sm font-medium ${filter === "todas" ? "bg-slate-700 text-white" : "bg-slate-200 text-slate-700"}`}>Todas</button>
      </div>

      <div className="space-y-4">
        {filtered().map((client) => {
          const estado = getClientStatus(client.paellas);
          const totalDeposit = getTotalDeposit(client.paellas);

          return (
            <div key={client.id} className="rounded-xl bg-white p-4 shadow-sm border">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-lg font-semibold text-slate-800">
                    {client.first_name} {client.last_name}
                  </div>
                  <div className="text-sm text-slate-500">{client.phone || "Sin teléfono"}</div>
                </div>
                <span className={`px-3 py-1 text-sm font-medium rounded-full capitalize ${estado === "pendiente" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                  {estado}
                </span>
              </div>

              <div className="mt-3 space-y-1 text-sm text-slate-700">
                {client.paellas.map((p: any) => {
                  const { deposit } = parseNotes(p.notes);
                  return (
                    <div key={p.id}>🍽️ {p.servings} personas — Fianza {deposit ? `${deposit}€` : "-"}</div>
                  );
                })}
              </div>

              <div className="mt-3 text-sm font-semibold text-slate-800">
                💰 Total fianzas: {totalDeposit} €
              </div>

              <div className="flex items-center gap-4 pt-3 text-sm font-medium">
                <button
                  onClick={() =>
                    handleUpdateClientStatus(
                      client.id,
                      estado === "pendiente" ? "entregada" : "pendiente"
                    )
                  }
                  className="text-blue-600 hover:underline"
                >
                  {estado === "pendiente" ? "✅ Marcar entregada" : "🔄 Marcar pendiente"}
                </button>

                <button onClick={() => router.push(`/dashboard/client/${client.id}`)} className="text-blue-600 hover:underline">
                  ✏️ Editar
                </button>

                <button onClick={() => { setSelectedClientId(client.id); setConfirmOpen(true); }} className="text-red-600 hover:underline flex items-center gap-1">
                  🗑 Eliminar
                </button>

                {/* ✅ TICKET */}
                <button onClick={() => handlePrint(client)} className="text-blue-600 hover:underline">
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
          load();
        }}
      />
    </div>
  );
}
