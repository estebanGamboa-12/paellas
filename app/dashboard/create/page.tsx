"use client";
export const dynamic = "force-dynamic";


import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

type PaellaForm = {
  servings: string;
  rice_type: string;
  hasDeposit: boolean;
  deposit: string;
};

export default function CreatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [client, setClient] = useState({
    first_name: "",
    last_name: "",
    phone: "",
  });

  const [paellas, setPaellas] = useState<PaellaForm[]>([
    { servings: "2", rice_type: "Mixta", hasDeposit: true, deposit: "10" }
  ]);

  function updatePaella<T extends keyof PaellaForm>(
    index: number,
    key: T,
    value: PaellaForm[T]
  ) {
    setPaellas((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [key]: value };
      return copy;
    });
  }

  function addPaella() {
    setPaellas((prev) => [
      ...prev,
      { servings: "2", rice_type: "Mixta", hasDeposit: true, deposit: "10" }
    ]);
  }

  const totalDeposit = paellas.reduce(
    (sum, p) => sum + (p.hasDeposit ? Number(p.deposit || 0) : 0),
    0
  );

  async function handleSubmit(e: any) {
    e.preventDefault();
    setLoading(true);

    // 1) Crear cliente
    const { data: newClient, error } = await supabase
      .from("clients")
      .insert({
        first_name: client.first_name,
        last_name: client.last_name,
        phone: client.phone || null,
        status: "pendiente",
      })
      .select()
      .single();

    if (error || !newClient) {
      alert("Error creando cliente");
      setLoading(false);
      return;
    }

    // 2) Crear paellas vinculadas
    const formattedPaellas = paellas.map((p) => ({
      client_id: newClient.id,
      servings: Number(p.servings),
      rice_type: p.rice_type,
      status: "pendiente",
      notes: JSON.stringify({
        deposit: p.hasDeposit ? Number(p.deposit || 0) : null,
      })
    }));

    await supabase.from("paellas").insert(formattedPaellas);

    router.push("/dashboard");
  }

  return (
    <div className="max-w-lg mx-auto p-6 space-y-6">

      <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
        <span className="text-purple-600 text-3xl">＋</span>
        Nuevo Cliente
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">

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

        {/* PAELLAS */}
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
                required
                className="w-full border rounded-lg px-3 py-2"
                value={p.servings}
                onChange={(e) => {
                  const raw = e.target.value;
                  const sanitized = raw === "" ? "" : raw.replace(/^0+(?=\d)/, "");
                  updatePaella(i, "servings", sanitized);
                }}
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
                  value={p.deposit}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const sanitized = raw === "" ? "" : raw.replace(/^0+(?=\d)/, "");
                    updatePaella(i, "deposit", sanitized);
                  }}
                />
              </div>
            )}
          </div>
        ))}

        {/* ADD PAELLA */}
        <button
          type="button"
          onClick={addPaella}
          className="w-full py-2 rounded-lg bg-blue-500 text-white text-sm font-medium shadow hover:bg-blue-600"
        >
          ＋ Añadir otra paella
        </button>

        {/* TOTAL FIANZA */}
        <div className="text-right text-slate-700 font-medium">
          💰 Total fianza: <span className="font-bold">{totalDeposit}€</span>
        </div>

        {/* SUBMIT */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700"
        >
          {loading ? "Guardando..." : "Guardar ✅"}
        </button>

      </form>
    </div>
  );
}
