import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const PREFIX = 'enc:v1:';

function getEncryptionKey(): Buffer {
  const encoded = process.env.PAYMENT_SECRETS_ENCRYPTION_KEY;

  if (!encoded) {
    throw new Error('PAYMENT_SECRETS_ENCRYPTION_KEY manquante.');
  }

  const key = Buffer.from(encoded, 'base64');

  if (key.length !== 32) {
    throw new Error('La clé de chiffrement doit contenir 32 octets.');
  }

  return key;
}

export function encryptPaymentSecret(value: string): string {
  if (!value) return value;

  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(), iv);

  const encrypted = Buffer.concat([
    cipher.update(value, 'utf8'),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return [
    PREFIX.slice(0, -1),
    iv.toString('base64'),
    tag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':');
}

export function decryptPaymentSecret(value: string | null): string | null {
  if (!value) return null;

  // Compatibilité avec les anciennes valeurs non chiffrées.
  if (!value.startsWith(PREFIX)) return value;

  const parts = value.split(':');

  if (parts.length !== 5 || parts[1] !== 'v1') {
    throw new Error('Format de clé de paiement chiffrée invalide.');
  }

  const [, , ivEncoded, tagEncoded, encryptedEncoded] = parts;

  const decipher = createDecipheriv(
    'aes-256-gcm',
    getEncryptionKey(),
    Buffer.from(ivEncoded, 'base64'),
  );

  decipher.setAuthTag(Buffer.from(tagEncoded, 'base64'));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedEncoded, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}
