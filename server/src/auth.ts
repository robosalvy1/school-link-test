import { createHash, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Pool } from "pg";

const PASSWORD_MIN_LENGTH = 12;
const PASSWORD_MAX_LENGTH = 128;
const SESSION_BYTES = 32;

export type AuthenticatedUser = { id: string; name: string; role: string };
export type Credentials = { email: string; password: string; name?: string };

function hashToken(value: string) {
  return createHash("sha256").update(value).digest("base64url");
}

function derivePassword(password: string, salt: string, length: number) {
  return new Promise<Buffer>((resolve, reject) => {
    (scryptCallback as unknown as (secret: string, salt: string, keylen: number, options: object, callback: (error: Error | null, key: Buffer) => void) => void)(
      password,
      salt,
      length,
      { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
      (error, key) => error ? reject(error) : resolve(key),
    );
  });
}

export function parseCredentials(value: unknown, requireName: boolean): Credentials | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  if (typeof input.email !== "string" || typeof input.password !== "string") return null;
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  const name = typeof input.name === "string" ? input.name.trim().replace(/\s+/g, " ") : undefined;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return null;
  if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) return null;
  if (requireName && (!name || name.length < 2 || name.length > 80)) return null;
  return { email, password, name };
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const derived = await derivePassword(password, salt, 64);
  return `scrypt$${salt}$${derived.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, salt, encoded] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !encoded) return false;
  const expected = Buffer.from(encoded, "base64url");
  const derived = await derivePassword(password, salt, expected.length);
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

function cookies(request: IncomingMessage) {
  return new Map((request.headers.cookie ?? "").split(";").flatMap((part) => {
    const [name, ...rest] = part.trim().split("=");
    return name && rest.length ? [[name, decodeURIComponent(rest.join("="))] as const] : [];
  }));
}

export async function register(pool: Pool, credentials: Credentials): Promise<AuthenticatedUser | "email_taken"> {
  const passwordHash = await hashPassword(credentials.password);
  try {
    const result = await pool.query<{ id: string; display_name: string; role: string }>(
      "INSERT INTO users (external_subject, email, display_name, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, display_name, role",
      [`local:${randomUUID()}`, credentials.email, credentials.name!, passwordHash],
    );
    const user = result.rows[0]!;
    return { id: user.id, name: user.display_name, role: user.role };
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "23505") return "email_taken";
    throw error;
  }
}

export async function authenticatePassword(pool: Pool, credentials: Credentials): Promise<AuthenticatedUser | null> {
  const result = await pool.query<{ id: string; display_name: string; role: string; password_hash: string | null }>(
    "SELECT id, display_name, role, password_hash FROM users WHERE email = $1 AND active = true LIMIT 1",
    [credentials.email],
  );
  const user = result.rows[0];
  if (!user?.password_hash || !(await verifyPassword(credentials.password, user.password_hash))) return null;
  return { id: user.id, name: user.display_name, role: user.role };
}

export async function createSession(pool: Pool, user: AuthenticatedUser, ttlHours: number) {
  const token = randomBytes(SESSION_BYTES).toString("base64url");
  await pool.query("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, now() + ($3 * interval '1 hour'))", [hashToken(token), user.id, ttlHours]);
  return { token };
}

export async function sessionForRequest(pool: Pool, request: IncomingMessage, cookieName: string): Promise<AuthenticatedUser | null> {
  const token = cookies(request).get(cookieName);
  if (!token) return null;
  const result = await pool.query<{ id: string; display_name: string; role: string }>(
    "SELECT u.id, u.display_name, u.role FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > now() AND u.active = true LIMIT 1",
    [hashToken(token)],
  );
  const user = result.rows[0];
  return user ? { id: user.id, name: user.display_name, role: user.role } : null;
}

export async function revokeSession(pool: Pool, request: IncomingMessage, cookieName: string) {
  const token = cookies(request).get(cookieName);
  if (token) await pool.query("UPDATE sessions SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL", [hashToken(token)]);
}

export function setSessionCookie(response: ServerResponse, cookieName: string, token: string, production: boolean, ttlHours: number) {
  const secure = production ? "; Secure" : "";
  response.setHeader("Set-Cookie", `${cookieName}=${encodeURIComponent(token)}; Path=/api/v1; HttpOnly; SameSite=Lax; Max-Age=${ttlHours * 3600}${secure}`);
}

export function clearSessionCookie(response: ServerResponse, cookieName: string, production: boolean) {
  const secure = production ? "; Secure" : "";
  response.setHeader("Set-Cookie", `${cookieName}=; Path=/api/v1; HttpOnly; SameSite=Lax; Max-Age=0${secure}`);
}
