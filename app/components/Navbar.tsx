"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  async function handleLogout() {
    await supabase.auth.signOut();
    toast.success("Sesión cerrada 👋");
    router.push("/login");
  }

  const link = (href: string, label: string) => (
    <Link
      key={href}
      href={href}
      className={`px-3 py-2 text-sm font-medium transition ${
        pathname === href
          ? "text-blue-600"
          : "text-slate-600 hover:text-slate-800"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <nav className="border-b bg-white">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/dashboard" className="text-xl font-semibold text-blue-600">
          Bon<span className="text-slate-700">Vivant</span>
        </Link>

        {session && (
          <>
            <button
              type="button"
              className="md:hidden p-2 rounded-md border text-slate-600 hover:text-slate-800 hover:border-slate-300 transition"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-label="Abrir menú"
            >
              ☰
            </button>

            <div className="hidden md:flex gap-2 items-center">
              {link("/dashboard", "Inicio")}
              {link("/dashboard/create", "Nueva")}

              <button
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-md text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 transition"
              >
                Cerrar sesión
              </button>
            </div>
          </>
        )}
      </div>

      {session && (
        <div
          className={`md:hidden border-t border-slate-100 bg-white transition-[max-height] duration-300 overflow-hidden ${
            isMenuOpen ? "max-h-40" : "max-h-0"
          }`}
        >
          <div className="px-4 py-3 flex flex-col gap-3">
            {link("/dashboard", "Inicio")}
            {link("/dashboard/create", "Nueva")}
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-md text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 transition text-left"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
