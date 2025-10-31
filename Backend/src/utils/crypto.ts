import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const TOKEN_ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY;

function resolveKey(): Buffer {
  if (!TOKEN_ENCRYPTION_KEY) {
    throw new Error('TOKEN_ENCRYPTION_KEY is not configured');
  }
  return createHash('sha256').update(TOKEN_ENCRYPTION_KEY, 'utf8').digest();
}

export function encryptSecret(plain: string): string {
  const key = resolveKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString('base64'), ciphertext.toString('base64'), authTag.toString('base64')].join('.');
}

export function decryptSecret(payload: string): string {
  const [ivB64, cipherB64, authTagB64] = payload.split('.');
  if (!ivB64 || !cipherB64 || !authTagB64) {
    throw new Error('Invalid encrypted payload');
  }
  const iv = Buffer.from(ivB64, 'base64');
  const ciphertext = Buffer.from(cipherB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');
  const key = resolveKey();
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}
