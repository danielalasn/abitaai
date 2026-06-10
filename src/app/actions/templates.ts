'use server';

import { getCurrentProject } from '@/lib/auth-server';
import { decrypt } from '@/lib/encryption';
import { unstable_noStore as noStore } from 'next/cache';

const API_VERSION = process.env.GRAPH_API_VERSION || 'v25.0';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────
export type TemplateStatus = 'APPROVED' | 'PENDING' | 'REJECTED' | 'PAUSED' | 'DISABLED' | 'IN_APPEAL';

export interface MetaTemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'LOCATION';
  text?: string;
  buttons?: MetaTemplateButton[];
  example?: {
    header_handle?: string[];
    body_text?: string[][];
  };
}

export interface MetaTemplateButton {
  type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER' | 'COPY_CODE' | 'OTP';
  text: string;
  url?: string;
  phone_number?: string;
}

export interface MetaTemplate {
  id: string;
  name: string;
  status: TemplateStatus;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  language: string;
  components: MetaTemplateComponent[];
  quality_score?: { score: string };
  rejected_reason?: string;
}

// ──────────────────────────────────────────────
// Fetch ALL templates (all statuses)
// ──────────────────────────────────────────────
export async function fetchAllTemplates(): Promise<{ templates: MetaTemplate[]; error: string | null }> {
  noStore();
  try {
    const project = await getCurrentProject() as any;
    if (!project?.whatsappBusinessId || !project?.whatsappToken) {
      return { error: 'Configura WhatsApp en Configuración primero.', templates: [] };
    }

    const token = decrypt(project.whatsappToken);
    const url = `https://graph.facebook.com/${API_VERSION}/${project.whatsappBusinessId}/message_templates?fields=id,name,status,category,language,components,quality_score,rejected_reason&limit=100`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    const data = await res.json();
    if (!res.ok) {
      return { error: data.error?.message || 'Error al cargar plantillas.', templates: [] };
    }

    return { templates: (data.data as MetaTemplate[]) ?? [], error: null };
  } catch (err: any) {
    return { error: err.message || 'Error de red.', templates: [] };
  }
}

// ──────────────────────────────────────────────
// Create a new template and submit to Meta
// ──────────────────────────────────────────────
export interface CreateTemplateInput {
  name: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  language: string;
  header?: {
    format: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
    text?: string; // only for TEXT format
  };
  body: string;
  footer?: string;
  buttons?: MetaTemplateButton[];
}

export async function createMetaTemplate(input: CreateTemplateInput): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const project = await getCurrentProject() as any;
    if (!project?.whatsappBusinessId || !project?.whatsappToken) {
      return { success: false, error: 'Configura WhatsApp en Configuración primero.' };
    }

    const token = decrypt(project.whatsappToken);
    const url = `https://graph.facebook.com/${API_VERSION}/${project.whatsappBusinessId}/message_templates`;

    const components: MetaTemplateComponent[] = [];

    // Header component
    if (input.header) {
      const header: any = {
        type: 'HEADER',
        format: input.header.format,
      };
      if (input.header.format === 'TEXT' && input.header.text) {
        header.text = input.header.text;
      } else if (input.header.format === 'IMAGE') {
        header.example = { header_url: ['https://abitaai.com/favicon.ico'] };
      } else if (input.header.format === 'DOCUMENT') {
        header.example = { header_url: ['https://abitaai.com/privacy'] };
      } else if (input.header.format === 'VIDEO') {
        // Dummy video URL if needed, but we might just skip it or provide a generic one
      }
      components.push(header);
    }

    // Body component (required)
    const varMatches = input.body.match(/\{\{(\d+)\}\}/g) || [];
    const uniqueVars = [...new Set(varMatches.map(m => m.replace(/[{}]/g, '')))].sort((a, b) => Number(a) - Number(b));
    
    const bodyComponent: any = { type: 'BODY', text: input.body };
    if (uniqueVars.length > 0) {
      bodyComponent.example = {
        body_text: [uniqueVars.map(v => `ejemplo_${v}`)]
      };
    }
    components.push(bodyComponent);

    // Footer
    if (input.footer) {
      components.push({ type: 'FOOTER', text: input.footer });
    }

    // Buttons
    if (input.buttons && input.buttons.length > 0) {
      components.push({ type: 'BUTTONS', buttons: input.buttons });
    }

    const payload = {
      name: input.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
      category: input.category,
      language: input.language,
      components,
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error?.message || 'Error al crear la plantilla.' };
    }

    return { success: true, id: data.id };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error de red.' };
  }
}

// ──────────────────────────────────────────────
// Delete a template
// ──────────────────────────────────────────────
export async function deleteMetaTemplate(templateName: string): Promise<{ success: boolean; error?: string }> {
  try {
    const project = await getCurrentProject() as any;
    if (!project?.whatsappBusinessId || !project?.whatsappToken) {
      return { success: false, error: 'Sin credenciales.' };
    }

    const token = decrypt(project.whatsappToken);
    const url = `https://graph.facebook.com/${API_VERSION}/${project.whatsappBusinessId}/message_templates?name=${encodeURIComponent(templateName)}`;

    const res = await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const data = await res.json();
      return { success: false, error: data.error?.message || 'Error al eliminar.' };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
