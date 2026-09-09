import type { PoolConfig } from "pg";

export type DatabaseMode =
  | "absent"
  | "disabled"
  | "configured"
  | "invalid_configuration";
export interface DatabaseConfig {
  mode: DatabaseMode;
  pool?: PoolConfig;
  officialScoringEnabled: false;
}
// Schema compatibility is a code contract, never an environment override.
export const MIN_SCHEMA_VERSION = 1;
export const MAX_SCHEMA_VERSION = 1;
export function databaseConfig(
  env: NodeJS.ProcessEnv = process.env,
): DatabaseConfig {
  const result = (mode: DatabaseMode, pool?: PoolConfig): DatabaseConfig => ({
    mode,
    pool,
    officialScoringEnabled: false,
  });
  if (
    env.PERSISTENCE_CONFIGURED === undefined ||
    env.PERSISTENCE_CONFIGURED === "false"
  )
    return result(env.DATABASE_URL ? "disabled" : "absent");
  if (
    env.PERSISTENCE_CONFIGURED !== "true" ||
    (env.OFFICIAL_SCORING_ENABLED !== undefined &&
      env.OFFICIAL_SCORING_ENABLED !== "false")
  )
    return result("invalid_configuration");
  if (!env.DATABASE_URL) return result("absent");
  try {
    const url = new URL(env.DATABASE_URL);
    if (
      !["postgres:", "postgresql:"].includes(url.protocol) ||
      !url.hostname ||
      !url.username ||
      url.pathname.length < 2 ||
      url.search ||
      url.hash
    )
      return result("invalid_configuration");
    const integer = (
      key: string,
      fallback: number,
      min: number,
      max: number,
    ) => {
      const value = env[key] ?? String(fallback);
      if (!/^\d+$/.test(value) || Number(value) < min || Number(value) > max)
        throw new Error("configuration");
      return Number(value);
    };
    const tls = env.DATABASE_TLS_MODE ?? "verify-full";
    const local = ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
    const renderInternal =
      tls === "render-internal" &&
      env.RENDER === "true" &&
      /^dpg-[a-z0-9]+-a$/.test(url.hostname);
    if (
      tls !== "verify-full" &&
      !renderInternal &&
      !(
        tls === "disable" &&
        local &&
        /^\/arcade_test_[a-z0-9_]+$/.test(url.pathname)
      )
    )
      return result("invalid_configuration");
    const statement = integer(
      "DATABASE_STATEMENT_TIMEOUT_MS",
      2000,
      100,
      10000,
    );
    return result("configured", {
      host: url.hostname,
      port: url.port ? integerPort(url.port) : 5432,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: decodeURIComponent(url.pathname.slice(1)),
      ssl: tls === "verify-full" ? { rejectUnauthorized: true } : false,
      max: integer("DATABASE_POOL_MAX", 5, 1, 10),
      min: 0,
      connectionTimeoutMillis: integer(
        "DATABASE_CONNECT_TIMEOUT_MS",
        1500,
        100,
        5000,
      ),
      statement_timeout: statement,
      query_timeout: statement + 500,
      idle_in_transaction_session_timeout: 5000,
      idleTimeoutMillis: 10000,
      application_name: "arcade-foundation",
      options: "-c search_path=arcade,pg_catalog",
    });
  } catch {
    return result("invalid_configuration");
  }
}
function integerPort(value: string): number {
  if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 65535)
    throw new Error("configuration");
  return Number(value);
}
