import pg, { type PoolClient, type QueryResult, type QueryResultRow } from "pg";
import type { DatabaseConfig } from "./config.js";
export type DatabaseErrorCode =
  | "unavailable"
  | "timeout"
  | "constraint"
  | "closed";
export class DatabaseError extends Error {
  constructor(readonly code: DatabaseErrorCode) {
    super(`Database operation ${code}`);
    this.name = "DatabaseError";
  }
}
export function safeDatabaseError(error: unknown): DatabaseError {
  if (error instanceof DatabaseError) return error;
  const code = (error as { code?: string })?.code ?? "";
  return new DatabaseError(
    code === "57014" || code === "55P03"
      ? "timeout"
      : code.startsWith("23")
        ? "constraint"
        : "unavailable",
  );
}
export interface SqlConnection {
  query<R extends QueryResultRow = QueryResultRow>(
    sql: string,
    values?: unknown[],
  ): Promise<QueryResult<R>>;
}
export class Database implements SqlConnection {
  private readonly pool: pg.Pool;
  private closed = false;
  constructor(config: DatabaseConfig) {
    if (config.mode !== "configured" || !config.pool)
      throw new DatabaseError("unavailable");
    this.pool = new pg.Pool(config.pool);
    // Idle disconnects must not become unhandled errors or leak driver details.
    this.pool.on("error", () => {});
  }
  async query<R extends QueryResultRow = QueryResultRow>(
    sql: string,
    values: unknown[] = [],
  ): Promise<QueryResult<R>> {
    if (this.closed) throw new DatabaseError("closed");
    try {
      return await this.pool.query<R>(sql, values);
    } catch (error) {
      throw safeDatabaseError(error);
    }
  }
  async transaction<T>(
    work: (connection: SqlConnection) => Promise<T>,
  ): Promise<T> {
    if (this.closed) throw new DatabaseError("closed");
    let client: PoolClient | undefined;
    let failed = false;
    try {
      client = await this.pool.connect();
      await client.query("BEGIN");
      const connection: SqlConnection = {
        query: async <R extends QueryResultRow>(
          sql: string,
          values: unknown[] = [],
        ) => client!.query<R>(sql, values),
      };
      const value = await work(connection);
      await client.query("COMMIT");
      return value;
    } catch (error) {
      failed = true;
      await client?.query("ROLLBACK").catch(() => {});
      throw safeDatabaseError(error);
    } finally {
      client?.release(failed);
    }
  }
  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    await this.pool.end();
  }
}
