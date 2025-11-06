"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function EditClientPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const clientId = params.id;

  const [loading, setLoading] = useState(true);

  const [client, setClient] = useState({
    first_name: "",
    last_name: "",
    phone: "",
  });

  const [paellas, setPaellas] = useState<
    { id?: string; servings: number; rice_type: string; hasDeposit: boolean; deposit: number | null }[]
  >([]);

  function updatePaella<T extends keyof typeof paellas[0]>(index: number, key: T, value: typeof paellas[0][T]) {
    const copy = [...paellas];
    copy[index] = { ...copy[index], [key]: value };
    setPaellas(copy);
  }


  async function load() {
    const { data: clientData } = await supabase
      .from("clients")
      .select("first_name, last_name, phone")
      .eq("id", clientId)
      .single();

    const { data: paellasData } = await supabase
      .from("paellas")
      .select("id, servings, rice_type, notes")
      .eq("client_id", clientId);

    setClient(clientData ?? {
      first_name: "",
      last_name: "",
      phone: "",
    });

    const formatted = paellasData?.map((p) => {
      let deposit = null;
      try {
        const n = JSON.parse(p.notes ?? "{}");
        deposit = n.deposit ?? null;
      } catch (_) { }

      return {
        id: p.id,
        servings: p.servings,
        rice_type: p.rice_type,
        hasDeposit: deposit !== null,
        deposit: deposit,
      };
    }) || [];

    setPaellas(formatted);

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function save(e: any) {
    e.preventDefault();
    setLoading(true);

    // 1) Update cliente
    await supabase.from("clients").update({
      first_name: client.first_name,
      last_name: client.last_name,
      phone: client.phone || null,
    }).eq("id", clientId);

    // 2) Update paellas
    for (const p of paellas) {
      await supabase.from("paellas")
        .update({
          servings: p.servings,
          rice_type: p.rice_type,
          notes: JSON.stringify({
            deposit: p.hasDeposit ? Number(p.deposit) : null,
          })
        })
        .eq("id", p.id);
    }

    router.push("/dashboard");
  }

  const totalDeposit = paellas.reduce(
    (sum, p) => sum + (p.hasDeposit ? Number(p.deposit) : 0),
    0
  );

  if (loading) return <div className="p-6 text-center">Cargando...</div>;

  return (
    <div className="max-w-lg mx-auto p-6 space-y-6">

      <h1 className="text-2xl font-bold text-slate-800">Editar Cliente</h1>

      <form onSubmit={save} className="space-y-6">

        {/* NOMBRE */}
        <input
          className="w-full border rounded-lg px-4 py-2 shadow-sm"
          placeholder="Nombre"
          value={client.first_name}
          onChange={(e) => setClient({ ...client, first_name: e.target.value })}
          required
        />

        {/* APELLIDOS */}
        <input
          className="w-full border rounded-lg px-4 py-2 shadow-sm"
          placeholder="Apellidos"
          value={client.last_name}
          onChange={(e) => setClient({ ...client, last_name: e.target.value })}
          required
        />

        {/* TELEFONO */}
        <input
          className="w-full border rounded-lg px-4 py-2 shadow-sm"
          placeholder="Teléfono (opcional)"
          value={client.phone}
          onChange={(e) => setClient({ ...client, phone: e.target.value })}
        />

        {/* LISTA DE PAELLAS */}
        <h2 className="font-semibold text-slate-700 flex items-center gap-2">
          🥘 Paellas
        </h2>

        {paellas.map((p, i) => (
          <div key={i} className="border rounded-lg p-4 space-y-4 shadow-sm">

            <div className="space-y-2">
              <label className="text-sm text-slate-600">Tamaño (personas)</label>
              <input
                type="number"
                min={2}
                className="w-full border rounded-lg px-3 py-2"
                value={p.servings}
                onChange={(e) => updatePaella(i, "servings", Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-600">Tipo</label>
              <select
                className="w-full border rounded-lg px-3 py-2"
                value={p.rice_type}
                onChange={(e) => updatePaella(i, "rice_type", e.target.value)}
              >
                <option>Mixta</option>
                <option>Marisco</option>
                <option>Carne</option>
                <option>Vegetal</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-600">Fianza</label>
              <select
                className="w-full border rounded-lg px-3 py-2"
                value={p.hasDeposit ? "con" : "sin"}
                onChange={(e) => updatePaella(i, "hasDeposit", e.target.value === "con")}
              >
                <option value="con">Con fianza</option>
                <option value="sin">Sin fianza</option>
              </select>
            </div>

            {p.hasDeposit && (
              <div className="space-y-2">
                <label className="text-sm text-slate-600">Importe (€)</label>
                <input
                  type="number"
                  min={0}
                  className="w-full border rounded-lg px-3 py-2"
                  value={p.deposit ?? ""}
                  onChange={(e) => updatePaella(i, "deposit", Number(e.target.value))}
                />
              </div>
            )}
          </div>
        ))}

        {/* TOTAL FIANZA */}
        <div className="text-right text-slate-700 font-medium">
          💰 Total fianza: <span className="font-bold">{totalDeposit}€</span>
        </div>

        <button
          type="submit"
          className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700"
        >
          Guardar Cambios ✅
        </button>

      </form>
    </div>
  );
}
