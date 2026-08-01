import { createServer } from "node:http";
import { Pool } from "pg";
import { authenticate } from "./auth.js";
import { loadConfig } from "./config.js";
import { applyCors, clientAddress, RateLimiter, requestId, sendJson } from "./http.js";

const config = loadConfig();
const pool = new Pool({ connectionString: config.databaseUrl, max: 10, ssl: config.nodeEnv === "production" && !config.databaseUrl.includes("@postgres:") ? { rejectUnauthorized: true } : undefined });
const limiter = new RateLimiter(config.rateLimitWindowMs, config.rateLimitMaxRequests);

const server = createServer(async (request, response) => {
  const id = requestId(request);
  response.setHeader("X-Request-Id", id);
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "no-referrer");
  if (!applyCors(request, response, config)) return sendJson(response, 403, { error: "origin_not_allowed", requestId: id });
  if (request.method === "OPTIONS") { response.statusCode = 204; return response.end(); }
  const rate = limiter.take(clientAddress(request, config.trustProxy));
  if (!rate.allowed) { response.setHeader("Retry-After", String(rate.retryAfterSeconds)); return sendJson(response, 429, { error: "rate_limited", requestId: id }); }
  if (request.method !== "GET") return sendJson(response, 405, { error: "method_not_allowed", requestId: id });
  if (request.url === "/api/v1/health") return sendJson(response, 200, { status: "ok", requestId: id });
  if (request.url === "/api/v1/ready") {
    try { await pool.query("SELECT 1"); return sendJson(response, 200, { status: "ready", requestId: id }); }
    catch { return sendJson(response, 503, { status: "unavailable", requestId: id }); }
  }
  if (request.url === "/api/v1/session") {
    const auth = authenticate(request, config.sessionCookieName);
    return sendJson(response, 401, { error: "unauthenticated", reason: auth.reason, requestId: id });
  }
  return sendJson(response, 404, { error: "not_found", requestId: id });
});

server.listen(config.port, () => console.info(JSON.stringify({ event: "server_started", port: config.port })));
const shutdown = async () => { server.close(); await pool.end(); };
process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());
