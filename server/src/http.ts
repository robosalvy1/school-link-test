import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Config } from "./config.js";

export const requestId = (request: IncomingMessage): string => {
  const supplied = request.headers["x-request-id"];
  return typeof supplied === "string" && /^[a-zA-Z0-9_-]{8,128}$/.test(supplied) ? supplied : randomUUID();
};

export const clientAddress = (request: IncomingMessage, trustProxy: boolean): string => {
  if (trustProxy) {
    const forwarded = request.headers["x-forwarded-for"];
    if (typeof forwarded === "string") return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.socket.remoteAddress ?? "unknown";
};

export class RateLimiter {
  private readonly entries = new Map<string, { count: number; resetAt: number }>();
  constructor(private readonly windowMs: number, private readonly maxRequests: number) {}
  take(key: string, now = Date.now()): { allowed: boolean; retryAfterSeconds: number } {
    const current = this.entries.get(key);
    const entry = !current || current.resetAt <= now ? { count: 0, resetAt: now + this.windowMs } : current;
    entry.count += 1;
    this.entries.set(key, entry);
    return { allowed: entry.count <= this.maxRequests, retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)) };
  }
}

export const applyCors = (request: IncomingMessage, response: ServerResponse, config: Config): boolean => {
  const origin = request.headers.origin;
  if (!origin) return true;
  if (typeof origin !== "string" || !config.corsOrigins.has(origin)) return false;
  response.setHeader("Access-Control-Allow-Origin", origin);
  response.setHeader("Vary", "Origin");
  response.setHeader("Access-Control-Allow-Credentials", "true");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Request-Id, X-CSRF-Token");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  return true;
};

export const hasTrustedOrigin = (request: IncomingMessage, config: Config): boolean =>
  typeof request.headers.origin === "string" && config.corsOrigins.has(request.headers.origin);

export const sendJson = (response: ServerResponse, status: number, body: unknown): void => {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(body));
};
