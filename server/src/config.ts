export type Config = Readonly<{
  nodeEnv: "development" | "test" | "production";
  port: number;
  databaseUrl: string;
  corsOrigins: ReadonlySet<string>;
  sessionCookieName: string;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  trustProxy: boolean;
}>;

const required = (name: string, env: NodeJS.ProcessEnv): string => {
  const value = env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

const positiveInteger = (name: string, value: string): number => {
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result < 1) throw new Error(`${name} must be a positive integer`);
  return result;
};

export const loadConfig = (env: NodeJS.ProcessEnv = process.env): Config => {
  const nodeEnv = (env.NODE_ENV ?? "development") as Config["nodeEnv"];
  if (!(["development", "test", "production"] as const).includes(nodeEnv)) throw new Error("NODE_ENV must be development, test, or production");
  const databaseUrl = required("DATABASE_URL", env);
  const origins = required("CORS_ORIGINS", env).split(",").map((origin) => origin.trim()).filter(Boolean);
  if (!origins.length || origins.some((origin) => origin === "*")) throw new Error("CORS_ORIGINS must contain explicit origins only");
  for (const origin of origins) {
    const parsed = new URL(origin);
    if (parsed.origin !== origin || (nodeEnv === "production" && parsed.protocol !== "https:")) throw new Error(`Invalid CORS origin: ${origin}`);
  }
  return Object.freeze({
    nodeEnv,
    port: positiveInteger("PORT", env.PORT ?? "8080"),
    databaseUrl,
    corsOrigins: new Set(origins),
    sessionCookieName: env.SESSION_COOKIE_NAME?.trim() || "school_link_session",
    rateLimitWindowMs: positiveInteger("RATE_LIMIT_WINDOW_MS", env.RATE_LIMIT_WINDOW_MS ?? "60000"),
    rateLimitMaxRequests: positiveInteger("RATE_LIMIT_MAX_REQUESTS", env.RATE_LIMIT_MAX_REQUESTS ?? "120"),
    trustProxy: env.TRUST_PROXY === "1",
  });
};
