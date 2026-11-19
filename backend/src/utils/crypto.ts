// Web Crypto API password hashing (PBKDF2-HMAC-SHA256, 100,000 iterations)
// Tương thích 100% với Cloudflare Workers Edge runtime

const PBKDF2_ITERATIONS = 100000;
const KEY_LENGTH_BITS = 256;

function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.length % 2 === 0 ? hex : '0' + hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function generateRandomHex(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bufferToHex(bytes);
}

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return bufferToHex(digest);
}

export async function hashPassword(
  password: string,
  providedSaltHex?: string
): Promise<{ hash: string; salt: string }> {
  const saltHex = providedSaltHex || generateRandomHex(16);
  const saltBytes = hexToBytes(saltHex);
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes as unknown as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    passwordKey,
    KEY_LENGTH_BITS
  );

  return {
    hash: bufferToHex(derivedBits),
    salt: saltHex,
  };
}

export async function verifyPassword(
  password: string,
  storedHashHex: string,
  storedSaltHex: string
): Promise<boolean> {
  const { hash } = await hashPassword(password, storedSaltHex);
  if (hash.length !== storedHashHex.length) return false;
  let diff = 0;
  for (let i = 0; i < hash.length; i++) {
    diff |= hash.charCodeAt(i) ^ storedHashHex.charCodeAt(i);
  }
  return diff === 0;
}

export interface SignedSessionPayload {
  uid: number;
  role: 'patient' | 'doctor' | 'admin';
  exp: number;
  jti: string;
}

function toBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (input.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

async function hmacSha256Hex(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return bufferToHex(signature);
}

export async function signSessionToken(
  uid: number,
  role: 'patient' | 'doctor' | 'admin',
  secret: string,
  ttlSeconds = 7 * 24 * 60 * 60
): Promise<string> {
  const payload: SignedSessionPayload = {
    uid,
    role,
    exp: Date.now() + ttlSeconds * 1000,
    jti: generateRandomHex(12),
  };
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const sig = await hmacSha256Hex(`ns1.${encodedPayload}`, secret);
  return `ns1.${encodedPayload}.${sig}`;
}

export async function verifySessionToken(
  token: string,
  secret: string
): Promise<SignedSessionPayload | null> {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== 'ns1') return null;

  const [, encodedPayload, providedSig] = parts;
  if (!encodedPayload || !providedSig) return null;

  try {
    const expectedSig = await hmacSha256Hex(`ns1.${encodedPayload}`, secret);
    if (expectedSig.length !== providedSig.length) return null;
    let diff = 0;
    for (let i = 0; i < expectedSig.length; i++) {
      diff |= expectedSig.charCodeAt(i) ^ providedSig.charCodeAt(i);
    }
    if (diff !== 0) return null;

    const payload = JSON.parse(fromBase64Url(encodedPayload)) as SignedSessionPayload;
    if (
      !payload ||
      typeof payload.uid !== 'number' ||
      payload.uid <= 0 ||
      typeof payload.exp !== 'number' ||
      payload.exp <= Date.now()
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

