import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto';
export const secret = () => randomBytes(32).toString('base64url');
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export const csrfFor = (token: string) => createHash('sha256').update('arcade-csrf-v1:').update(token).digest('base64url');
export function equal(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
// Process-local encryption deliberately invalidates unfinished challenges on restart.
// Sessions need no encryption key: provider tokens and instance identifiers are not retained.
export class ChallengeVault {
  private readonly key = randomBytes(32);
  seal(value: string): Buffer {
    const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', this.key, iv);
    return Buffer.concat([iv, cipher.update(value, 'utf8'), cipher.final(), cipher.getAuthTag()]);
  }
  open(value: Buffer): string {
    const decipher = createDecipheriv('aes-256-gcm', this.key, value.subarray(0, 12));
    decipher.setAuthTag(value.subarray(-16));
    return Buffer.concat([decipher.update(value.subarray(12, -16)), decipher.final()]).toString('utf8');
  }
}
