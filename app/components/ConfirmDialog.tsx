"use client";

import { useEffect, useState } from "react";

type Props = {
  open: boolean;
  title?: string;
  message?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  open,
  title = "¿Seguro?",
  message = "Esta acción no se puede deshacer.",
  onConfirm,
  onCancel,
}: Props) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (open) setShow(true);
    else setTimeout(() => setShow(false), 300); // tiempo de fade out
  }, [open]);

  if (!open && !show) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-200 
      ${open ? "opacity-100 bg-black/40" : "opacity-0 bg-black/0"}`}>

      <div
        className={`bg-white rounded-lg shadow-lg p-6 w-full max-w-sm space-y-4 transform transition-all duration-200
        ${open ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}
      >
        <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
        <p className="text-sm text-slate-600">{message}</p>

        <div className="flex justify-end gap-3 pt-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-md text-sm bg-slate-200 text-slate-700 hover:bg-slate-300"
          >
            Cancelar
          </button>

          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-md text-sm bg-red-600 text-white hover:bg-red-700"
          >
            Sí, eliminar
          </button>
        </div>
      </div>
    </div>
  );
}
