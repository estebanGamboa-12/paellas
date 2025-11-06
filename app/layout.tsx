import "./globals.css";
import Navbar from "./components/Navbar";
import { Toaster } from "react-hot-toast";

export const metadata = {
  title: "Bon Vivant",
  description: "Gestión de paellas sencilla y elegante",
};


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        {/* ✅ Hace que la app se pueda instalar */}
        <link rel="manifest" href="/manifest.json" />

        {/* ✅ Color de barra superior en móviles */}
        <meta name="theme-color" content="#1e293b" />
      </head>

      <body className="bg-[#f5f6f8] text-slate-800">
        <Navbar />
        <main className="max-w-4xl mx-auto p-4">{children}</main>

        {/* ✅ Sistema de notificaciones global */}
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 2000,
            style: {
              background: "#ffffff",
              color: "#1e293b",
              border: "1px solid #e2e8f0",
            },
          }}
        />
        {/* ✅ Registrar Service Worker */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js')
                  .then(() => console.log("SW registrado"))
                  .catch(err => console.log("SW error:", err));
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
