import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";
import path from "path";

// Cargar .env desde la raíz del proyecto
dotenv.config({ path: path.join(process.cwd(), ".env") });

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("❌ No se encontró GEMINI_API_KEY en el .env");
    return;
  }

  console.log(`🔍 Probando API Key: ${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}`);

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    
    if (data.error) {
      console.error("❌ Error de la API:", data.error.message);
      return;
    }

    console.log("\n✅ Conexión exitosa. Modelos disponibles en tu tier:");
    console.log("--------------------------------------------------");
    
    const relevantModels = data.models?.filter((m: any) => 
      m.name.includes("gemini") && !m.name.includes("vision")
    );

    relevantModels?.forEach((m: any) => {
      const name = m.name.replace("models/", "");
      console.log(`${name.padEnd(25)} | ${m.displayName}`);
    });
    
    console.log("--------------------------------------------------");
    console.log("\n💡 Nota: Gemini 1.5 Flash es el recomendado para transcripciones por su velocidad y costo.");

  } catch (error) {
    console.error("❌ Error inesperado:", error);
  }
}

listModels();
