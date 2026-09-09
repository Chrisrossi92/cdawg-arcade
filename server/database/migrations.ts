import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Database, DatabaseError, type SqlConnection } from "./pool.js";
import { MAX_SCHEMA_VERSION, MIN_SCHEMA_VERSION } from "./config.js";
export interface Migration {
  version: number;
  name: string;
  sql: string;
  checksum: string;
}
export function readMigrations(
  directory = fileURLToPath(new URL("./migrations/", import.meta.url)),
): Migration[] {
  const files = readdirSync(directory)
    .filter((x) => /^\d{3}_[a-z0-9_]+\.sql$/.test(x))
    .sort();
  const migrations = files.map((name) => {
    const sql = readFileSync(`${directory}/${name}`, "utf8");
    return {
      version: Number(name.slice(0, 3)),
      name,
      sql,
      checksum: createHash("sha256").update(sql).digest("hex"),
    };
  });
  if (!migrations.length || migrations.some((m, i) => m.version !== i + 1))
    throw new DatabaseError("unavailable");
  return migrations;
}
export type SchemaCategory =
  | "empty"
  | "too_old"
  | "too_new"
  | "checksum_mismatch"
  | "incomplete"
  | "compatible";
export const foundationTables = [
  "players",
  "guilds",
  "guild_participations",
  "game_versions",
  "application_sessions",
  "auth_challenges",
  "attempt_authorizations",
  "game_attempts",
  "attempt_traces",
  "personal_game_stats",
  "guild_leaderboard_entries",
  "guild_game_records",
  "guild_record_events",
  "security_events",
] as const;
export async function schemaStatus(
  connection: SqlConnection,
  migrations: Migration[] = readMigrations(),
): Promise<SchemaCategory> {
  const exists = await connection.query("SELECT to_regclass($1) AS relation", [
    "arcade.schema_migrations",
  ]);
  if (!exists.rows[0].relation) return "empty";
  const rows = (
    await connection.query<{ version: number; name: string; checksum: string }>(
      "SELECT version, name, checksum FROM arcade.schema_migrations ORDER BY version",
    )
  ).rows;
  const version = rows.at(-1)?.version ?? 0;
  if (version > MAX_SCHEMA_VERSION) return "too_new";
  if (
    rows.some(
      (r, i) =>
        r.version !== i + 1 ||
        r.name !== migrations[i]?.name ||
        r.checksum !== migrations[i]?.checksum,
    )
  )
    return "checksum_mismatch";
  if (version < MIN_SCHEMA_VERSION) return "too_old";
  const tables = await connection.query(
    "SELECT to_regclass(name) AS relation FROM unnest($1::text[]) AS name",
    [foundationTables.map((t) => `arcade.${t}`)],
  );
  return tables.rows.every((r) => r.relation) ? "compatible" : "incomplete";
}
export async function migrate(
  database: Database,
  migrations: Migration[] = readMigrations(),
): Promise<number> {
  return database.transaction(async (connection) => {
    await connection.query("SELECT set_config('lock_timeout', $1, true)", [
      "5000",
    ]);
    await connection.query("SELECT pg_advisory_xact_lock($1, $2)", [724821, 1]);
    await connection.query("CREATE SCHEMA IF NOT EXISTS arcade");
    await connection.query("REVOKE ALL ON SCHEMA arcade FROM PUBLIC");
    await connection.query(
      "CREATE TABLE IF NOT EXISTS arcade.schema_migrations (version integer PRIMARY KEY CHECK (version > 0), name varchar(100) NOT NULL, checksum char(64) NOT NULL CHECK (checksum ~ '^[a-f0-9]{64}$'), applied_at timestamptz NOT NULL DEFAULT clock_timestamp())",
    );
    const rows = (
      await connection.query<{
        version: number;
        name: string;
        checksum: string;
      }>(
        "SELECT version, name, checksum FROM arcade.schema_migrations ORDER BY version",
      )
    ).rows;
    if (
      rows.some(
        (r, i) =>
          r.version !== i + 1 ||
          r.name !== migrations[i]?.name ||
          r.checksum !== migrations[i]?.checksum,
      )
    )
      throw new DatabaseError("constraint");
    let count = 0;
    for (const migration of migrations.slice(rows.length)) {
      // SQL is an immutable, checked-in migration, never request input.
      await connection.query(migration.sql);
      await connection.query(
        "INSERT INTO arcade.schema_migrations(version, name, checksum) VALUES ($1, $2, $3)",
        [migration.version, migration.name, migration.checksum],
      );
      count++;
    }
    return count;
  });
}
