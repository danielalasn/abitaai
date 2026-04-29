const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");
const path = require("path");

// Cargar .env desde la raíz del proyecto
dotenv.config({ path: path.join(__dirname, "../.env") });

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "TU_TOKEN_AQUI") {
    console.error("❌ Error: GEMINI_API_KEY no configurado en el archivo .env");
    return;
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  try {
    console.log("🔍 Consultando modelos disponibles en tu cuenta...");
    // El SDK de JS no tiene una función directa simple para listar en todas las versiones, 
    // pero podemos intentar instanciar los más comunes para ver cuál responde.
    
    // O mejor, usamos fetch directo a la API de Google para listar modelos
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();

    if (data.error) {
      console.error("❌ Error de la API:", data.error.message);
      return;
    }

    console.log("\n✅ Modelos a los que tienes acceso:");
    console.log("--------------------------------------------------");
    data.models.forEach(model => {
      if (model.supportedGenerationMethods.includes("generateContent")) {
        console.log(`- ${model.name.replace("models/", "")} (${model.displayName})`);
      }
    });
    console.log("--------------------------------------------------");
    console.log("\nUsa el nombre de la izquierda en el código.");

  } catch (error) {
    console.error("❌ Error al conectar:", error.message);
  }
}

listModels();
