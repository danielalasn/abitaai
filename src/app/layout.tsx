import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
export const metadata: Metadata = {
  title: "Abita AI",
  description: "Plataforma de ventas y atención al cliente con Inteligencia Artificial",
  manifest: "/manifest.json",
  icons: {
    apple: "/icon-192x192.png",
  },
  other: {
    "facebook-domain-verification": "iunrwlqy60te8rusq9asd8lxke9qf1",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#1A1714",
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
      <head>
        {/* 
          Viewport lock: captura la altura REAL del dispositivo en el primer frame,
          antes de cualquier scroll. Esto evita el bug de Android Chrome donde la
          barra de URL al desaparecer/aparecer cambia el viewport height y genera
          un scrollbar fantasma al hacer refresh.
        */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            var h = window.innerHeight;
            document.documentElement.style.setProperty('--app-height', h + 'px');
          })();
        `}} />
      </head>
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        <VersionChecker />
        <Providers>{children}</Providers>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.deferredPwaPrompt = null;
              window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                window.deferredPwaPrompt = e;
                window.dispatchEvent(new Event('pwa-prompt-ready'));
              });
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(err) {
                    console.log('ServiceWorker registration failed: ', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
