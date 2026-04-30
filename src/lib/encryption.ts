
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

/**
 * Utility to encrypt sensitive data (tokens, keys) using AES-256-GCM.
 * This ensures that even if the database is leaked, tokens remain safe.
 */
export function encrypt(text: string | null | undefined): string | null {
  if (!text) return null;
  
  const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  
  // Format: iv:authTag:encrypted (all in hex)
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Utility to decrypt data encrypted with the function above.
 */
export function decrypt(hash: string | null | undefined): string | null {
  if (!hash) return null;
  
  try {
    const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
    const [ivHex, authTagHex, encryptedHex] = hash.split(':');
    
    if (!ivHex || !authTagHex || !encryptedHex) {
      // If it doesn't match the format, it might be unencrypted (legacy)
      return hash;
    }

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (err) {
    console.error('[Decryption Error] Failed to decrypt data. Returning raw hash as fallback.', err);
    return hash; // Fallback to raw if decryption fails (might be legacy data)
  }
}
