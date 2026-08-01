import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { loadConfig } from "./config.js";

const config = loadConfig();
const pool = new Pool({ connectionString: config.databaseUrl });
const migrationsPath = fileURLToPath(new URL("../migrations", import.meta.url));

try {
  await pool.query("SELECT pg_advisory_lock(hashtext('school-link-migrations'))");
  await pool.query("CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
  for (const name of (await readdir(migrationsPath)).filter((file) => file.endsWith(".sql")).sort()) {
    const known = await pool.query("SELECT 1 FROM schema_migrations WHERE name = $1", [name]);
    if (known.rowCount) continue;
    const client = await pool.connect();
    try { await client.query("BEGIN"); await client.query(await readFile(join(migrationsPath, name), "utf8")); await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [name]); await client.query("COMMIT"); }
    catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  }
} finally { await pool.end(); }
