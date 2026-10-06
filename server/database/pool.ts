import pg, { type PoolClient, type QueryResult, type QueryResultRow } from "pg";
import type { DatabaseConfig } from "./config.js";
export type DatabaseErrorCode =
  | "unavailable"
  | "timeout"
  | "constraint"
  | "closed"
  | "transaction_retry"
  | "cancelled";
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
    code === "40001" || code === "40P01"
      ? "transaction_retry"
      : code === "57014" || code === "55P03"
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
  /** Session lock with autocommit: delivery intent must survive an uncertain external response.
   * Never hold a database transaction open across HTTP. Busy callers skip rather than queue. */
  async exclusive<T>(key: string, work: (connection: SqlConnection) => Promise<T>): Promise<T | undefined> {
    if (this.closed) throw new DatabaseError("closed");
    let client: PoolClient | undefined;
    let locked = false, failed = false;
    try {
      client = await this.pool.connect();
      locked = (await client.query('SELECT pg_try_advisory_lock(hashtextextended($1, 918274)) AS locked', [key])).rows[0].locked;
      if (!locked) return undefined;
      return await work({query: (sql, values = []) => client!.query(sql, values)});
    } catch (error) { failed = true; throw safeDatabaseError(error); }
    finally {
      if (locked && client) { try { await client.query('SELECT pg_advisory_unlock(hashtextextended($1, 918274))', [key]); } catch { failed = true; } }
      client?.release(failed);
    }
  }
}
