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
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
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
      const response = await originalFetch(...args);
      const isServerAction = args[1]?.headers && typeof args[1].headers === 'object' && 'Next-Action' in (args[1].headers as Record<string, string>);
      
      if (isServerAction && !response.ok) {
        checkVersion();
      }
      return response;
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
    <div 
      className="fixed top-0 left-0 w-full z-[100] bg-blue-600 text-white px-4 py-3 flex items-center justify-center space-x-3 shadow-lg cursor-pointer hover:bg-blue-700 transition-colors animate-in slide-in-from-top"
      onClick={() => window.location.reload()}
    >
      <RefreshCw className="w-4 h-4 animate-spin" />
      <span className="text-sm font-medium">Hay una nueva versión disponible. Haz clic aquí para actualizar</span>
    </div>
  );
}
