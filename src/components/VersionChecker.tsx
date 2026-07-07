"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

export function VersionChecker() {
  const [hasNewVersion, setHasNewVersion] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let initialVersion: string | null = null;
    let isChecking = false;

    const checkVersion = async () => {
      if (isChecking) return;
      isChecking = true;
      try {
        // Añadimos timestamp para evitar cache del navegador o CDN
        const res = await fetch(`/api/version?t=${Date.now()}`, { 
          cache: "no-store",
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
        });
        if (!res.ok) return;
        
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          return;
        }

        const data = await res.json();
        
        if (data.version) {
          if (!initialVersion) {
            initialVersion = data.version;
          } else if (initialVersion !== data.version && initialVersion !== "development" && data.version !== "development") {
            // Recargar automáticamente para aplicar la nueva versión
            window.location.reload();
          }
        }
      } catch (error) {
        console.error("Error checking version:", error);
      } finally {
        isChecking = false;
      }
    };

    // Initial check and background polling
    checkVersion();
    const intervalId = setInterval(checkVersion, 60000); // Check every 60 seconds

    // Interceptar fetch para detectar errores en Server Actions
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        
        const method = (args[1]?.method || 'GET').toUpperCase();
        let isServerAction = false;
        
        if (args[1]?.headers) {
          if (args[1].headers instanceof Headers) {
            isServerAction = args[1].headers.has('Next-Action') || args[1].headers.has('next-action');
          } else {
            const h = args[1].headers as Record<string, string>;
            isServerAction = Object.keys(h).some(k => k.toLowerCase() === 'next-action');
          }
        }
        
        // Si es un POST o una Server Action explícita y falla, verificamos versión
        if ((isServerAction || method === 'POST') && (response.status === 404 || response.status === 500)) {
          setTimeout(checkVersion, 500);
        }
        
        return response;
      } catch (err) {
        const method = (args[1]?.method || 'GET').toUpperCase();
        let isServerAction = false;
        
        if (args[1]?.headers) {
          if (args[1].headers instanceof Headers) {
            isServerAction = args[1].headers.has('Next-Action') || args[1].headers.has('next-action');
          } else {
            const h = args[1].headers as Record<string, string>;
            isServerAction = Object.keys(h).some(k => k.toLowerCase() === 'next-action');
          }
        }
        
        if (isServerAction || method === 'POST') {
          setTimeout(checkVersion, 500);
        }
        throw err;
      }
    };

    return () => {
      window.fetch = originalFetch;
      clearInterval(intervalId);
    };
  }, []);

  // Ya no mostramos UI de toast, forzamos recarga automática
  return null;
}
