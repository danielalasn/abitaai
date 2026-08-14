import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const GEMINI_FALLBACK = 'gemini-3.7-flash';

async function runTest() {
  console.log(`Configured Gemini Fallback Model: ${GEMINI_FALLBACK}`);
  console.log('Testing connection to Gemini API...');
  
  if (!process.env.GEMINI_API_KEY) {
    console.error('Error: GEMINI_API_KEY is missing in .env');
    return;
  }
  
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  
  try {
    const model = genAI.getGenerativeModel({ model: GEMINI_FALLBACK });
    
    console.log('Sending prompt: "Hola, ¿qué modelo de IA eres y cómo te llamas?"');
    const result = await model.generateContent("Hola, ¿qué modelo de IA eres y cómo te llamas?");
    
    const response = await result.response;
    const text = response.text();
    
    console.log('\n--- RESPUESTA DE GEMINI ---');
    console.log(text);
    console.log('---------------------------\n');
    console.log('Test completado con éxito.');
  } catch (error) {
    console.error('Error al probar Gemini:', error);
  }
}

runTest();
