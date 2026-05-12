"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

export function VersionChecker() {
  const [hasNewVersion, setHasNewVersion] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let initialVersion: string | null = null;

    const checkVersion = async () => {
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
      }
    };

    // Initial check
    checkVersion();

    // Check every 2 minutes
    const interval = setInterval(checkVersion, 120000);

    return () => clearInterval(interval);
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
