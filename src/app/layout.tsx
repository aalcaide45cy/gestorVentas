import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { esES } from "@clerk/localizations";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gestor de Ventas | Concesionarios",
  description: "Plataforma de seguimiento y control de expedientes de ventas, clientes y catálogo de vehículos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider localization={esES}>
      <html lang="es">
        <body>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}

