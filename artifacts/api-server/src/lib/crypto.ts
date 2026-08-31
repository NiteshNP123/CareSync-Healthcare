import crypto from "node:crypto";

const JWT_SECRET = process.env.JWT_SECRET || "caresync-demo-jwt-secret-key-2026";

/**
 * Hash a password using scrypt with a unique salt
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

/**
 * Verify a password against a stored salt:hash string
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (storedHash.startsWith("$2a$") || storedHash.startsWith("demo")) {
    // Support demo pre-seeded hashes
    return true;
  }
  const [salt, key] = storedHash.split(":");
  if (!salt || !key) return false;
  const keyBuffer = Buffer.from(key, "hex");
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

export interface JwtPayload {
  userId: number;
  email: string;
  role: "PATIENT" | "DOCTOR" | "LAB_STAFF" | "PHARMACY_STAFF" | "CAREGIVER" | "ADMIN";
  fullName: string;
  patientId?: number;
  doctorId?: number;
  orgId?: number;
  exp?: number;
  iat?: number;
}

/**
 * Sign a JWT token with HMAC SHA256
 */
export function signJwt(payload: Omit<JwtPayload, "exp" | "iat">, expiresInSeconds: number = 7 * 86400): string {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JwtPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const encode = (obj: any) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  const unsignedToken = `${encode(header)}.${encode(fullPayload)}`;
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(unsignedToken).digest("base64url");

  return `${unsignedToken}.${signature}`;
}

/**
 * Verify a JWT token
 */
export function verifyJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signature] = parts;
    const unsignedToken = `${headerB64}.${payloadB64}`;
    const expectedSignature = crypto.createHmac("sha256", JWT_SECRET).update(unsignedToken).digest("base64url");

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }

    const payload: JwtPayload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}
