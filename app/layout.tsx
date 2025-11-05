import "./globals.css";
import type { Metadata } from "next";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Paellas Express",
  description: "Gestión de pedidos de paellas con Supabase"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-100 text-slate-900">
        <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-8">
          <header className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-slate-900">Paellas Express</h1>
              <p className="text-sm text-slate-600">
                Panel de gestión para pedidos de paellas con Next.js y Supabase
              </p>
            </div>
          </header>
          <main className="flex-1">{children}</main>
          <footer className="mt-12 text-center text-xs text-slate-500">
            Construido con Next.js 14 + Supabase
          </footer>
        </div>
      </body>
    </html>
  );
}
