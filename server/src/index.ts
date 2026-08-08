import { createServer, type IncomingMessage } from "node:http";
import { Pool } from "pg";
import { authenticatePassword, clearSessionCookie, createSession, parseCredentials, register, revokeSession, sessionForRequest, setSessionCookie } from "./auth.js";
import { loadConfig } from "./config.js";
import { applyCors, clientAddress, hasTrustedOrigin, RateLimiter, requestId, sendJson } from "./http.js";

const config = loadConfig();
const pool = new Pool({ connectionString: config.databaseUrl, max: 10, ssl: config.nodeEnv === "production" && !config.databaseUrl.includes("@postgres:") ? { rejectUnauthorized: true } : undefined });
const limiter = new RateLimiter(config.rateLimitWindowMs, config.rateLimitMaxRequests);
const authLimiter = new RateLimiter(15 * 60_000, config.authRateLimitMaxRequests);

async function readJson(request: IncomingMessage): Promise<unknown | null> {
  if (!request.headers["content-type"]?.startsWith("application/json")) return null;
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 8_192) return null;
  }
  try { return JSON.parse(body); } catch { return null; }
}

function authBudget(request: IncomingMessage) {
  return authLimiter.take(clientAddress(request, config.trustProxy));
}

const server = createServer(async (request, response) => {
  const id = requestId(request);
  response.setHeader("X-Request-Id", id);
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "no-referrer");
  if (!applyCors(request, response, config)) return sendJson(response, 403, { error: "origin_not_allowed", requestId: id });
  if (request.method === "OPTIONS") { response.statusCode = 204; return response.end(); }
  if (request.method === "POST" && !hasTrustedOrigin(request, config)) return sendJson(response, 403, { error: "origin_not_allowed", requestId: id });
  const rate = limiter.take(clientAddress(request, config.trustProxy));
  if (!rate.allowed) { response.setHeader("Retry-After", String(rate.retryAfterSeconds)); return sendJson(response, 429, { error: "rate_limited", requestId: id }); }
  if (request.method === "GET" && request.url === "/api/v1/health") return sendJson(response, 200, { status: "ok", requestId: id });
  if (request.method === "GET" && request.url === "/api/v1/ready") {
    try { await pool.query("SELECT 1"); return sendJson(response, 200, { status: "ready", requestId: id }); }
    catch { return sendJson(response, 503, { status: "unavailable", requestId: id }); }
  }
  if (request.method === "GET" && request.url === "/api/v1/session") {
    const user = await sessionForRequest(pool, request, config.sessionCookieName);
    return user ? sendJson(response, 200, { authenticated: true, user }) : sendJson(response, 401, { error: "unauthenticated", requestId: id });
  }
  if (request.method === "POST" && request.url === "/api/v1/auth/signup") {
    const budget = authBudget(request);
    if (!budget.allowed) { response.setHeader("Retry-After", String(budget.retryAfterSeconds)); return sendJson(response, 429, { error: "try_later", requestId: id }); }
    const credentials = parseCredentials(await readJson(request), true);
    if (!credentials) return sendJson(response, 400, { error: "invalid_registration", requestId: id });
    const user = await register(pool, credentials);
    if (user === "email_taken") return sendJson(response, 409, { error: "email_unavailable", requestId: id });
    const session = await createSession(pool, user, config.sessionTtlHours);
    setSessionCookie(response, config.sessionCookieName, session.token, config.nodeEnv === "production", config.sessionTtlHours);
    return sendJson(response, 201, { authenticated: true, user });
  }
  if (request.method === "POST" && request.url === "/api/v1/auth/signin") {
    const budget = authBudget(request);
    if (!budget.allowed) { response.setHeader("Retry-After", String(budget.retryAfterSeconds)); return sendJson(response, 429, { error: "try_later", requestId: id }); }
    const credentials = parseCredentials(await readJson(request), false);
    if (!credentials) return sendJson(response, 400, { error: "invalid_credentials", requestId: id });
    const user = await authenticatePassword(pool, credentials);
    if (!user) return sendJson(response, 401, { error: "invalid_credentials", requestId: id });
    const session = await createSession(pool, user, config.sessionTtlHours);
    setSessionCookie(response, config.sessionCookieName, session.token, config.nodeEnv === "production", config.sessionTtlHours);
    return sendJson(response, 200, { authenticated: true, user });
  }
  if (request.method === "POST" && request.url === "/api/v1/auth/signout") {
    await revokeSession(pool, request, config.sessionCookieName);
    clearSessionCookie(response, config.sessionCookieName, config.nodeEnv === "production");
    return sendJson(response, 204, undefined);
  }
  return sendJson(response, 404, { error: "not_found", requestId: id });
});

server.listen(config.port, () => console.info(JSON.stringify({ event: "server_started", port: config.port })));
const shutdown = async () => { server.close(); await pool.end(); };
process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());
