import { GoogleGenerativeAI } from '@google/generative-ai';

export async function transcribeAudioWithGemini(audioUrl: string): Promise<string> {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.warn("No GEMINI_API_KEY found, skipping transcription.");
      return "";
    }
    
    console.log(`🎙️ [Gemini] Descargando audio para transcribir: ${audioUrl}`);
    const response = await fetch(audioUrl);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Audio = buffer.toString('base64');

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    console.log(`🎙️ [Gemini] Transcribiendo...`);
    const result = await model.generateContent([
      "Por favor, transcribe exactamente lo que dice esta nota de voz en el idioma en el que está hablada. No agregues comentarios tuyos ni descripciones, devuelve EXCLUSIVAMENTE el texto hablado.",
      {
        inlineData: {
          data: base64Audio,
          mimeType: "audio/ogg"
        }
      }
    ]);
    
    const text = result.response.text();
    console.log(`🎙️ [Gemini] Resultado: ${text}`);
    return text.trim();
  } catch (error) {
    console.error("❌ Error transcribiendo audio con Gemini:", error);
    return "";
  }
}
