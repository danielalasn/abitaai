
/**
 * Utility to redact PII (Personally Identifiable Information) before sending data to LLMs.
 * Helps with GDPR compliance and security posture.
 */
export function redactPII(text: string): string {
  if (!text) return text;
  
  let redacted = text;

  // 1. Redact Emails
  redacted = redacted.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');

  // 2. Redact Credit Cards (Visa, Mastercard, etc. 13-16 digits)
  redacted = redacted.replace(/\b(?:\d[ -]*?){13,16}\b/g, (match) => {
    const digits = match.replace(/[\s-]/g, '');
    if (digits.length >= 13 && digits.length <= 16) {
      return '[CARD]';
    }
    return match;
  });

  // 3. Redact Social Security Numbers (US pattern as example)
  redacted = redacted.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]');

  // 4. Redact potential Passwords/Secrets (heuristic: "password: secret")
  redacted = redacted.replace(/(password|contraseña|secret|clave|pin):\s*\S+/gi, '$1: [REDACTED]');

  return redacted;
}
