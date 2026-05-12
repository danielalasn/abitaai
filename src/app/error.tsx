"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isVersionError = error.message.includes("Failed to find Server Action");

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-gray-900 px-4 text-center">
      <h2 className="text-2xl font-bold mb-4">
        {isVersionError ? "Nueva versión disponible" : "Algo salió mal"}
      </h2>
      <p className="text-gray-600 mb-6 max-w-md">
        {isVersionError 
          ? "Hemos lanzado una actualización mientras usabas la aplicación. Por favor, actualiza la página para continuar."
          : error.message}
      </p>
      <button
        onClick={() => isVersionError ? window.location.reload() : reset()}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 font-medium"
      >
        <RefreshCw className="w-5 h-5" />
        <span>{isVersionError ? "Actualizar ahora" : "Intentar de nuevo"}</span>
      </button>
    </div>
  );
}
