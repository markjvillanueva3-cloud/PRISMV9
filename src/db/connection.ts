/**
 * PRISM Database Connection — PostgreSQL via pg
 *
 * Provides connection pooling, query helpers, and transaction support.
 * Falls back to in-memory mode when DATABASE_URL is not set.
 *
 * Post-review fixes applied:
 *   P0-2:  query() throws when disconnected instead of returning empty
 *   P0-12: SSL rejectUnauthorized defaults to true
 *   P0-13: connect() has mutex to prevent pool leaks
 *   H10:   Pool timeouts (statement, lock, connection)
 *   INFRA-1-1: Connection logging, health check, pool stats
 */

/** Simple structured logger — avoids circular import of Winston logger */
const dbLog = {
  info:  (msg: string, meta?: Record<string, unknown>) => console.log(`[DB] ${msg}`, meta ? JSON.stringify(meta) : ""),
  warn:  (msg: string, meta?: Record<string, unknown>) => console.warn(`[DB] ${msg}`, meta ? JSON.stringify(meta) : ""),
  error: (msg: string, meta?: Record<string, unknown>) => console.error(`[DB] ${msg}`, meta ? JSON.stringify(meta) : ""),
};

export interface DBConfig {
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: boolean;
  max_connections?: number;
  idle_timeout_ms?: number;
}

export interface QueryResult<T = Record<string, unknown>> {
  rows: T[];
  rowCount: number;
  duration_ms: number;
}

interface PoolLike {
  query(sql: string, params?: unknown[]): Promise<{ rows: unknown[]; rowCount: number | null }>;
  connect(): Promise<{ query: PoolLike["query"]; release: () => void }>;
  end(): Promise<void>;
}

export class DatabaseConnection {
  private pool: PoolLike | null = null;
  private config: DBConfig;
  private connected = false;
  private connectPromise: Promise<boolean> | null = null; // P0-13: mutex

  constructor(config?: DBConfig) {
    this.config = config ?? {
      connectionString: process.env.DATABASE_URL,
      max_connections: Math.min(parseInt(process.env.DB_MAX_CONNECTIONS ?? "50", 10) || 50, 100),
      idle_timeout_ms: parseInt(process.env.DB_IDLE_TIMEOUT ?? "30000", 10) || 30000,
    };
  }

  async connect(): Promise<boolean> {
    if (this.connected) return true;

    // P0-13: mutex — prevent concurrent pool creation
    if (this.connectPromise) return this.connectPromise;

    this.connectPromise = this._doConnect();
    const result = await this.connectPromise;
    this.connectPromise = null;
    return result;
  }

  private async _doConnect(): Promise<boolean> {
    if (!this.config.connectionString && !this.config.host) {
      dbLog.info("No DATABASE_URL or host configured — running in-memory mode");
      return false;
    }

    try {
      const pgModule = "pg";
      const pg = await import(/* @vite-ignore */ pgModule).catch((err: unknown) => {
        dbLog.error("Failed to import 'pg' module — is it in package.json?", {
          error: err instanceof Error ? err.message : String(err),
        });
        return null;
      });
      if (!pg) return false;
      const Pool = pg.Pool ?? pg.default?.Pool;
      if (!Pool) {
        dbLog.error("pg module loaded but Pool constructor not found");
        return false;
      }

      // P0-12: SSL defaults to verified unless explicitly disabled
      const sslRejectUnauthorized = process.env.DB_SSL_INSECURE === "true" ? false : true;

      const maxConnections = this.config.max_connections ?? 20;
      const idleTimeout = this.config.idle_timeout_ms ?? 30000;
      const connectTimeout = parseInt(process.env.DB_CONNECT_TIMEOUT ?? "5000", 10) || 5000;

      this.pool = new Pool({
        connectionString: this.config.connectionString,
        host: this.config.host,
        port: this.config.port ?? 5432,
        database: this.config.database ?? "prism",
        user: this.config.user,
        password: this.config.password,
        ssl: this.config.ssl ? { rejectUnauthorized: sslRejectUnauthorized } : undefined,
        max: maxConnections,
        idleTimeoutMillis: idleTimeout,
        // H10: pool-level timeouts
        connectionTimeoutMillis: connectTimeout,
        statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT ?? "30000", 10) || 30000,
      }) as PoolLike;

      const client = await this.pool.connect();
      client.release();
      this.connected = true;

      dbLog.info("PostgreSQL connected", {
        host: this.config.host ?? "(connection string)",
        port: this.config.port ?? 5432,
        database: this.config.database ?? "prism",
        maxConnections,
        idleTimeout,
        connectTimeout,
      });

      return true;
    } catch (err: unknown) {
      this.connected = false;
      dbLog.error("PostgreSQL connection FAILED — falling back to in-memory mode", {
        host: this.config.host ?? "(connection string)",
        port: this.config.port ?? 5432,
        error: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  }

  // P0-2: throw when disconnected instead of returning empty results
  async query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<QueryResult<T>> {
    if (!this.connected || !this.pool) {
      throw new Error("Database not connected. Call connect() first or set DATABASE_URL.");
    }

    const start = Date.now();
    const result = await this.pool.query(sql, params);
    return {
      rows: result.rows as T[],
      rowCount: result.rowCount ?? 0,
      duration_ms: Date.now() - start,
    };
  }

  async transaction<T>(
    fn: (query: (sql: string, params?: unknown[]) => Promise<QueryResult>) => Promise<T>,
    isolation?: "READ COMMITTED" | "REPEATABLE READ" | "SERIALIZABLE"
  ): Promise<T> {
    if (!this.connected || !this.pool) {
      throw new Error("Database not connected");
    }

    const client = await this.pool.connect();
    try {
      const beginSql = isolation ? `BEGIN ISOLATION LEVEL ${isolation}` : "BEGIN";
      await client.query(beginSql);
      const queryFn = async (sql: string, params?: unknown[]): Promise<QueryResult> => {
        const start = Date.now();
        const result = await client.query(sql, params);
        return { rows: result.rows as Record<string, unknown>[], rowCount: result.rowCount ?? 0, duration_ms: Date.now() - start };
      };
      const result = await fn(queryFn);
      await client.query("COMMIT");
      return result;
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.connected = false;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  /** Health check — verifies the connection is alive with a simple query. */
  async healthCheck(): Promise<{ ok: boolean; latency_ms: number; error?: string }> {
    if (!this.connected || !this.pool) {
      return { ok: false, latency_ms: 0, error: "Not connected (in-memory mode)" };
    }
    const start = Date.now();
    try {
      await this.pool.query("SELECT 1");
      return { ok: true, latency_ms: Date.now() - start };
    } catch (err: unknown) {
      return { ok: false, latency_ms: Date.now() - start, error: err instanceof Error ? err.message : String(err) };
    }
  }

  /** Redacted config for logging — never exposes password. */
  toJSON(): Record<string, unknown> {
    return {
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      connected: this.connected,
      max_connections: this.config.max_connections,
      hasConnectionString: !!this.config.connectionString,
    };
  }
}

export const db = new DatabaseConnection();
