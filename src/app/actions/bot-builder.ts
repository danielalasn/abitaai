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

const EXTRACTION_SYSTEM_PROMPT = `Eres un experto en configuración de chatbots de ventas y atención al cliente.
Tu única tarea es analizar el documento de un cliente y extraer TODO el contenido relevante para configurar un bot de IA.

REGLA CRÍTICA: NO OMITAS NINGÚN DATO. Si hay precios, horarios, reglas, productos, restricciones, beneficios, contactos — TODO debe aparecer en alguna sección.

Debes incluir OBLIGATORIAMENTE en las instrucciones y en handoffRules que el bot use estas etiquetas cuando aplique:
- [ACTION: HANDOFF] (para transferir a humano)
- [ACTION: UNANSWERED_QUESTION "pregunta"] (si no sabe la respuesta)
- [ACTION: SCORE_BUMP +X REASON: "razón"] (para sumar puntos al lead)
- [ACTION: UPDATE_EMAIL "correo"] (si el cliente da su correo)

Devuelve ÚNICAMENTE un JSON válido con exactamente estas 6 claves. Sin markdown, sin explicaciones.

ESTRUCTURA EXACTA:
{
  "identity": "string — Quién es el bot: nombre del negocio, giro, tono de voz, cómo debe presentarse. Si el documento menciona una persona de contacto o imagen de marca, inclúyela.",
  "instructions": "string — Instrucciones de comportamiento del bot: qué debe hacer, cómo manejar objeciones. DEBES INCLUIR LAS ETIQUETAS DEL SISTEMA ([ACTION: SCORE_BUMP...], [ACTION: UPDATE_EMAIL...], [ACTION: UNANSWERED_QUESTION...]) explicando cuándo usarlas. Para el scoring (SCORE_BUMP), DEBES INCLUIR LA REGLA: 'Solo sumar puntos si es la primera vez que el cliente realiza esa acción en la conversación, si ya se sumaron puntos por eso antes, no lo repitas para evitar duplicados'.",
  "knowledgeRaw": "string — TODO el conocimiento del negocio: productos, servicios, precios, especificaciones, áreas de servicio, equipo, historia, sucursales, horarios, métodos de pago, garantías, políticas. SIN OMITIR NADA.",
  "faq": "string — Todas las preguntas y respuestas que el bot debe saber, en formato:\\nP: [pregunta]\\nR: [respuesta]\\n\\nP: [pregunta]\\nR: [respuesta]\\n\\nGenera al menos 10 FAQs basadas en lo que un cliente típico preguntaría.",
  "handoffRules": "string — Lista detallada de cuándo y cómo transferir la conversación a un humano. DEBES INCLUIR explícitamente que el bot debe usar la etiqueta [ACTION: HANDOFF] cuando se cumplan las condiciones.",
  "leadScoringRules": "string — JSON array de reglas de scoring. Ejemplo: [{\\"condition\\": \\"Pregunta por precio\\", \\"score\\": 20}, {\\"condition\\": \\"Pide una cita\\", \\"score\\": 40}]. Genera al menos 8 reglas basadas en el tipo de negocio."
}`;

// ─────────────────────────────────────────────────────────────
// PARSE JSON response from Claude
// ─────────────────────────────────────────────────────────────

function parseClaudeJson(text: string): GeneratedBotConfig {
  const cleaned = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
  const parsed = JSON.parse(cleaned);
  return {
    identity: parsed.identity || '',
    instructions: parsed.instructions || '',
    knowledgeRaw: parsed.knowledgeRaw || '',
    faq: parsed.faq || '',
    handoffRules: parsed.handoffRules || '',
    leadScoringRules: parsed.leadScoringRules || '[]',
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

  const rawJson = response.content[0].type === 'text' ? response.content[0].text : '{}';
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

  const rawJson = response.content[0].type === 'text' ? response.content[0].text : '{}';
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
