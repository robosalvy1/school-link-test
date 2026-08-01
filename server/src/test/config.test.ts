import assert from "node:assert/strict";
import test from "node:test";
import { loadConfig } from "../config.js";

const base = { DATABASE_URL: "postgresql://user:password@localhost:5432/db", CORS_ORIGINS: "https://app.example.edu", NODE_ENV: "production" };
test("production config rejects wildcard and insecure CORS origins", () => {
  assert.throws(() => loadConfig({ ...base, CORS_ORIGINS: "*" }));
  assert.throws(() => loadConfig({ ...base, CORS_ORIGINS: "http://app.example.edu" }));
  assert.equal(loadConfig(base).corsOrigins.has("https://app.example.edu"), true);
});
