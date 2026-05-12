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
            setHasNewVersion(true);
          }
        }
      } catch (error) {
        console.error("Error checking version:", error);
      } finally {
        isChecking = false;
      }
    };

    // Initial check
    checkVersion();

    // Interceptar fetch para detectar errores en Server Actions antes de que pasen los 2 min
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        
        const isServerAction = args[1]?.headers && 
          (
            (typeof args[1].headers === 'object' && 'Next-Action' in (args[1].headers as Record<string, string>)) ||
            (args[1].headers instanceof Headers && args[1].headers.has('Next-Action'))
          );
        
        if (isServerAction && (response.status === 404 || response.status === 500)) {
          // Esperar un poco antes de verificar la versión por si Render está en medio de un despliegue
          setTimeout(checkVersion, 2000);
        }
        
        return response;
      } catch (err) {
        const isServerAction = args[1]?.headers && 
          (
            (typeof args[1].headers === 'object' && 'Next-Action' in (args[1].headers as Record<string, string>)) ||
            (args[1].headers instanceof Headers && args[1].headers.has('Next-Action'))
          );
        if (isServerAction) setTimeout(checkVersion, 2000);
        throw err;
      }
    };

    // Check every 2 minutes
    const interval = setInterval(checkVersion, 120000);

    return () => {
      clearInterval(interval);
      window.fetch = originalFetch;
    };
  }, []);

  if (!hasNewVersion) return null;

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-md px-4 animate-in slide-in-from-top-8 duration-500 ease-out">
      <div 
        onClick={() => window.location.reload()}
        className="group relative flex items-center gap-4 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-orange-500/20 dark:border-orange-500/30 p-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
      >
        {/* Decorative background glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-amber-500/5 rounded-2xl -z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
        
        <div className="flex-shrink-0 w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:rotate-180 transition-transform duration-700">
          <RefreshCw className="w-5 h-5 text-white" />
        </div>

        <div className="flex-1">
          <h4 className="text-sm font-bold text-zinc-900 dark:text-white leading-tight">
            Actualización disponible
          </h4>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
            Hemos mejorado abita.ai. Haz clic para refrescar.
          </p>
        </div>

        <div className="flex-shrink-0 px-3 py-1.5 bg-zinc-100 dark:bg-white/5 rounded-lg text-[10px] font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider group-hover:bg-orange-500 group-hover:text-white transition-colors">
          Actualizar
        </div>
      </div>
    </div>
  );
}
