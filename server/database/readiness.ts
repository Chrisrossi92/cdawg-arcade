import { databaseConfig, type DatabaseConfig } from "./config.js";
import { Database } from "./pool.js";
import { schemaStatus, type SchemaCategory } from "./migrations.js";
export type PersistenceCategory =
  | SchemaCategory
  | "absent"
  | "disabled"
  | "invalid_configuration"
  | "unreachable"
  | "closed";
export interface PersistenceStatus {
  status: "available" | "unavailable";
  schema: PersistenceCategory;
}
export interface Persistence {
  check(): Promise<PersistenceStatus>;
  close(): Promise<void>;
}
export function createPersistence(
  config: DatabaseConfig = databaseConfig(),
  options: {
    now?: () => number;
    ttlMs?: number;
    probe?: () => Promise<SchemaCategory>;
    database?: Database;
  } = {},
): Persistence {
  const now = options.now ?? Date.now;
  let database = options.database;
  let cached: PersistenceStatus | undefined;
  let expires = 0;
  let pending: Promise<PersistenceStatus> | undefined;
  let closed = false;
  const unavailable = (schema: PersistenceCategory): PersistenceStatus => ({
    status: "unavailable",
    schema,
  });
  return {
    async check() {
      if (closed) return unavailable("closed");
      if (config.mode !== "configured") return unavailable(config.mode);
      if (cached && now() < expires) return cached;
      if (pending) return pending;
      pending = (async () => {
        try {
          const schema = options.probe
            ? await options.probe()
            : await schemaStatus((database ??= new Database(config)));
          cached = {
            status: schema === "compatible" ? "available" : "unavailable",
            schema,
          };
        } catch {
          cached = unavailable("unreachable");
        }
        expires = now() + (options.ttlMs ?? 10000);
        return cached;
      })().finally(() => {
        pending = undefined;
      });
      return pending;
    },
    async close() {
      closed = true;
      await pending;
      await database?.close();
    },
  };
}
