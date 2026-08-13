'use server';

import Anthropic from '@anthropic-ai/sdk';
import * as cheerio from 'cheerio';

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export interface GeneratedBotConfig {
  identity: string;
  instructions: string;
  knowledgeRaw: string;
  faq: string;
  handoffRules: string;
  leadScoringRules: string;
}

// Supported formats (not exported — 'use server' only allows async function exports)
const SUPPORTED_EXTENSIONS = ['pdf', 'docx', 'doc', 'xlsx', 'xls', 'txt', 'csv', 'md'];

// ─────────────────────────────────────────────────────────────
// SYSTEM PROMPT (shared)
// ─────────────────────────────────────────────────────────────

const EXTRACTION_SYSTEM_PROMPT = `Eres un experto en configuración de chatbots de ventas y atención al cliente para negocios en Latinoamérica.
Tu tarea es analizar el documento o contenido web de un cliente y extraer TODO el contenido relevante para configurar un bot de IA de ventas.

CONTEXTO IMPORTANTE: Las siguientes etiquetas de sistema YA ESTÁN configuradas globalmente y NO debes mencionarlas ni incluirlas en las instrucciones:
- [ACTION: HANDOFF] — ya está en las reglas globales
- [ACTION: SCORE_BUMP] — ya está en las reglas globales  
- [ACTION: UPDATE_EMAIL] — ya está en las reglas globales
- [ACTION: UNANSWERED_QUESTION] — ya está en las reglas globales

REGLAS CRÍTICAS:
- NO OMITAS NINGÚN DATO. Si hay precios, horarios, reglas, productos, restricciones, beneficios, contactos, políticas — TODO debe aparecer en la sección correcta.
- NO inventes información que no esté en el documento.
- Las instrucciones deben ser concretas y específicas al negocio, no genéricas.
- El tono de identidad debe reflejar exactamente la marca y personalidad del negocio.

Devuelve ÚNICAMENTE un JSON válido con exactamente estas 6 claves. Sin markdown, sin explicaciones fuera del JSON.

ESTRUCTURA EXACTA:
{
  "identity": "string — Identidad completa del bot: nombre del negocio, giro comercial, nombre del bot (si aplica), tono de voz (formal/casual/amigable), cómo debe presentarse al inicio, a quién representa. Ejemplo: 'Eres el asistente virtual de [Negocio], una empresa dedicada a [giro]. Tu nombre es [nombre]. Tu tono es [tono]. Cuando alguien llegue por primera vez, salúdalo cálidamente y pregunta en qué puedes ayudarle.'",
  
  "instructions": "string — Instrucciones de comportamiento MUY ESPECÍFICAS al negocio: flujo de conversación recomendado, cómo manejar objeciones típicas del sector, qué preguntas hacer para calificar al prospecto, qué hacer si preguntan por algo que no está en el knowledge base, horarios de atención y cómo manejar consultas fuera de horario, políticas específicas del negocio. NO incluyas instrucciones genéricas de sistema ni menciones las etiquetas [ACTION:] — esas son globales.",
  
  "knowledgeRaw": "string — TODO el conocimiento del negocio transcrito del documento: productos con descripción completa, servicios con detalle, precios exactos y rangos, áreas de servicio o cobertura geográfica, especificaciones técnicas, equipo o personal destacado, historia y valores de la empresa, sucursales y direcciones, horarios exactos, métodos de pago aceptados, garantías, políticas de devolución, proceso de compra o contratación, restricciones o limitaciones. INCLUYE ABSOLUTAMENTE TODO.",
  
  "faq": "string — Preguntas frecuentes en formato exacto:\\nP: [pregunta natural como la haría un cliente]\\nR: [respuesta completa y detallada]\\n\\nGenera mínimo 12 FAQs basadas en lo que un cliente típico de este sector preguntaría. Incluye preguntas sobre precios, proceso, tiempos, garantías, diferenciales vs competencia, formas de contacto, y las dudas más comunes del sector.",
  
  "handoffRules": "string — Lista específica de situaciones donde el bot debe transferir a un humano, basada en el tipo de negocio. Incluye: cuando el cliente quiere negociar precio directamente, cuando requiere una cotización personalizada, cuando hay una queja o problema serio, cuando la consulta es muy técnica o específica, cuando el cliente ha demostrado alto interés de compra. Sé muy específico al negocio.",
  
  "leadScoringRules": "string — JSON array con reglas de scoring muy específicas al sector y tipo de negocio. REGLA CRÍTICA: Los puntos de todas las reglas deben sumar EXACTAMENTE 100. El sistema usa escala de 0-100 donde: 0-30 = frío, 31-70 = tibio, 71-100 = caliente. Diseña las reglas con ese contexto: acciones de bajo interés (5-10 pts), interés medio (15-25 pts), alto interés (30-45 pts). La suma total debe ser exactamente 100. Cada regla debe tener 'condition' (descripción de la acción del lead) y 'score' (puntos). Ejemplo válido con suma=100: [{\"condition\": \"Pregunta qué servicios ofreces\", \"score\": 10}, {\"condition\": \"Pregunta por precios\", \"score\": 15}, {\"condition\": \"Pide disponibilidad o fechas\", \"score\": 25}, {\"condition\": \"Menciona que tiene presupuesto definido\", \"score\": 30}, {\"condition\": \"Solicita iniciar el proceso o firmar\", \"score\": 20}]. Suma=100. Genera entre 6 y 12 reglas proporcionales al tipo de negocio."
}`;

// ─────────────────────────────────────────────────────────────
// NORMALIZE SCORING RULES → always sum to exactly 100
// ─────────────────────────────────────────────────────────────

function normalizeScoringRules(raw: string | any[]): string {
  try {
    const rules: { condition: string; score: number }[] = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(rules) || rules.length === 0) return '[]';

    const total = rules.reduce((sum, r) => sum + (Number(r.score) || 0), 0);
    if (total === 0) return JSON.stringify(rules);

    if (total === 100) return JSON.stringify(rules);

    // Scale proportionally so the sum is exactly 100
    let normalized = rules.map(r => ({
      condition: r.condition,
      score: Math.round((Number(r.score) / total) * 100),
    }));

    // Fix rounding drift — add/subtract from the highest-score rule
    const drift = 100 - normalized.reduce((s, r) => s + r.score, 0);
    if (drift !== 0) {
      const maxIdx = normalized.reduce((best, r, i, arr) => r.score > arr[best].score ? i : best, 0);
      normalized[maxIdx].score += drift;
    }

    return JSON.stringify(normalized);
  } catch {
    return typeof raw === 'string' ? raw : '[]';
  }
}

// ─────────────────────────────────────────────────────────────
// PARSE JSON response from Claude
// ─────────────────────────────────────────────────────────────

function parseClaudeJson(text: string): GeneratedBotConfig {
  let cleaned = text.trim();
  if (cleaned.includes("```json")) {
    cleaned = cleaned.split("```json")[1].split("```")[0];
  } else if (cleaned.includes("```")) {
    cleaned = cleaned.split("```")[1].split("```")[0];
  }
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  const parsed = JSON.parse(cleaned.trim());
  return {
    identity: parsed.identity || '',
    instructions: parsed.instructions || '',
    knowledgeRaw: parsed.knowledgeRaw || '',
    faq: parsed.faq || '',
    handoffRules: parsed.handoffRules || '',
    leadScoringRules: normalizeScoringRules(parsed.leadScoringRules || '[]'),
  };
}

// ─────────────────────────────────────────────────────────────
// PDF → Claude natively (no parsing library)
// Claude reads the PDF directly as a base64 document
// ─────────────────────────────────────────────────────────────

async function generateFromPdf(buffer: Buffer, clientName: string): Promise<GeneratedBotConfig> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 16000,
    system: EXTRACTION_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: buffer.toString('base64'),
            },
          } as any,
          {
            type: 'text',
            text: `Nombre del cliente: ${clientName}\n\nAnaliza este documento PDF completo y genera la configuración del bot. NO omitas ningún dato importante.`,
          },
        ],
      },
    ],
  });

  const textBlock = response.content.find((block: any) => block.type === 'text');
  const rawJson = (textBlock as any)?.text || '{}';
  try {
    return parseClaudeJson(rawJson);
  } catch {
    throw new Error('La IA devolvió una respuesta inválida. Intenta de nuevo.');
  }
}

// ─────────────────────────────────────────────────────────────
// TEXT → Claude (Word, Excel, TXT, CSV)
// ─────────────────────────────────────────────────────────────

async function generateFromText(rawText: string, clientName: string): Promise<GeneratedBotConfig> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 16000,
    system: EXTRACTION_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Nombre del cliente: ${clientName}\n\nDOCUMENTO COMPLETO:\n${rawText}\n\nAnaliza este documento y genera la configuración completa del bot. NO omitas ningún dato importante.`,
      },
    ],
  });

  const textBlock = response.content.find((block: any) => block.type === 'text');
  const rawJson = (textBlock as any)?.text || '{}';
  try {
    return parseClaudeJson(rawJson);
  } catch {
    throw new Error('La IA devolvió una respuesta inválida. Intenta de nuevo.');
  }
}

// ─────────────────────────────────────────────────────────────
// MAIN ENTRY POINT
// ─────────────────────────────────────────────────────────────

export async function generateBotConfigFromFile(
  formData: FormData,
  clientName: string
): Promise<GeneratedBotConfig> {
  const file = formData.get('file') as File;
  if (!file) throw new Error('No se recibió ningún archivo.');

  const fileName = file.name;
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const buffer = Buffer.from(await file.arrayBuffer());

  // PDF: send directly to Claude (native support, no parsing lib needed)
  if (ext === 'pdf') {
    return generateFromPdf(buffer, clientName);
  }

  // Word
  if (ext === 'docx' || ext === 'doc') {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    if (!result.value.trim()) throw new Error('El archivo Word no contiene texto extraíble.');
    return generateFromText(result.value, clientName);
  }

  // Excel
  if (ext === 'xlsx' || ext === 'xls') {
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const lines: string[] = [];
    for (const sheetName of workbook.SheetNames) {
      const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]);
      lines.push(`=== Hoja: ${sheetName} ===\n${csv}`);
    }
    const rawText = lines.join('\n\n');
    if (!rawText.trim()) throw new Error('El archivo Excel no contiene datos.');
    return generateFromText(rawText, clientName);
  }

  // Plain text
  if (['txt', 'csv', 'md'].includes(ext)) {
    const rawText = buffer.toString('utf-8');
    if (!rawText.trim()) throw new Error('El archivo está vacío.');
    return generateFromText(rawText, clientName);
  }

  throw new Error(`Formato no soportado: .${ext}. Usa PDF, Word, Excel o TXT.`);
}

// ─────────────────────────────────────────────────────────────
// URL → Claude (web scraping via cheerio)
// ─────────────────────────────────────────────────────────────

export async function generateBotConfigFromUrl(
  url: string,
  clientName: string
): Promise<GeneratedBotConfig> {
  // Normalize the URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
  } catch {
    throw new Error('La URL ingresada no es válida. Asegúrate de que tenga el formato correcto (ej: https://ejemplo.com).');
  }

  // Fetch the page HTML
  let html: string;
  try {
    const res = await fetch(parsedUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AbitaBot/1.0; +https://abitaai.com)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'es,en;q=0.9',
      },
      signal: AbortSignal.timeout(15000),
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error(`El servidor respondió con error ${res.status}. Verifica que la URL sea pública y accesible.`);
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      throw new Error('La URL no devuelve una página HTML. Solo se pueden analizar páginas web.');
    }

    html = await res.text();
  } catch (err: any) {
    if (err.name === 'TimeoutError') {
      throw new Error('La página tardó demasiado en responder (más de 15 segundos). Intenta con otra URL.');
    }
    throw new Error(err.message || 'No se pudo acceder a la página. Verifica que la URL sea correcta y pública.');
  }

  // Parse HTML and extract readable text with cheerio
  const $ = cheerio.load(html);

  // Remove noise elements
  $('script, style, noscript, iframe, svg, canvas, head, nav, footer, header, .nav, .navbar, .footer, .header, .menu, .sidebar, [role="navigation"], [role="banner"], [role="contentinfo"]').remove();

  // Extract page title
  const pageTitle = $('title').text().trim() || $('h1').first().text().trim();

  // Extract meta description
  const metaDesc = $('meta[name="description"]').attr('content') || '';

  // Extract all meaningful text blocks
  const textBlocks: string[] = [];

  // Headings and sections
  $('h1, h2, h3, h4, h5, h6').each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 2) textBlocks.push(`\n## ${text}`);
  });

  // Paragraphs, list items, table cells
  $('p, li, td, th, article, section, .content, main, [class*="about"], [class*="service"], [class*="product"], [class*="precio"], [class*="price"]').each((_, el) => {
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (text.length > 30) textBlocks.push(text);
  });

  // Deduplicate text blocks
  const seen = new Set<string>();
  const uniqueBlocks = textBlocks.filter(t => {
    if (seen.has(t)) return false;
    seen.add(t);
    return true;
  });

  const extractedText = [
    `Página Web: ${parsedUrl.toString()}`,
    pageTitle ? `Título: ${pageTitle}` : '',
    metaDesc ? `Descripción: ${metaDesc}` : '',
    '',
    '=== CONTENIDO DE LA PÁGINA ===',
    ...uniqueBlocks,
  ].filter(Boolean).join('\n');

  if (extractedText.replace(/\s/g, '').length < 200) {
    throw new Error(
      'No se pudo extraer suficiente contenido de esta página. ' +
      'Es posible que el sitio use JavaScript para renderizar el contenido (SPA). ' +
      'Intenta descargar el texto de la página manualmente y súbelo como archivo TXT.'
    );
  }

  console.log(`[BotBuilder] URL scraping success: ${parsedUrl.toString()} — ${extractedText.length} chars extracted`);

  return generateFromText(extractedText, clientName);
}
