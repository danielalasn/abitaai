import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "abita.ai",
  description: "Plataforma de ventas y atención al cliente con Inteligencia Artificial",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

import { Providers } from "./providers";
import { VersionChecker } from "@/components/VersionChecker";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning className="h-full antialiased">
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        <VersionChecker />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
