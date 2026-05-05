/**
 * Configuración centralizada de modelos de IA.
 * Cambia los valores aquí para actualizar todo el sistema.
 */
export const AI_MODELS = {
  // Modelo principal (Claude)
  CLAUDE_MAIN: 'claude-3-5-sonnet-latest',
  
  // Modelo para resúmenes automáticos (Claude)
  CLAUDE_SUMMARY: 'claude-3-5-haiku-latest',

  // Modelo de Gemini para el "Plan B" (si falla Claude en el chat)
  GEMINI_FALLBACK: 'gemini-flash-latest',

  // Modelo de Gemini para transcripción de notas de voz
  GEMINI_TRANSCRIBE: 'gemini-flash-latest',
  
  // Modelo de Gemini para resúmenes (fallback si falla Claude)
  GEMINI_SUMMARY: 'gemini-flash-latest'
};
