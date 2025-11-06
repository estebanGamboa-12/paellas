export default function PaellaCard({ paella, onToggle }: any) {
  return (
    <div className="p-4 rounded-xl bg-white shadow flex items-center justify-between">
      <div>
        <p className="font-semibold">{paella.clients.first_name} {paella.clients.last_name}</p>
        <p className="text-sm text-slate-500">{paella.servings} personas — {paella.rice_type}</p>
        <span className="text-xs px-2 py-1 rounded-full bg-slate-200">{paella.status}</span>
      </div>

      <button
        className="px-3 py-1 rounded-md text-sm bg-brand text-white"
        onClick={onToggle}
      >
        Cambiar
      </button>
    </div>
  );
}
