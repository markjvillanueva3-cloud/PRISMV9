/**
 * PRISM Database Connection — PostgreSQL via pg
 *
 * Provides connection pooling, query helpers, and transaction support.
 * Falls back to in-memory mode when DATABASE_URL is not set.
 */

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

/**
 * Database connection manager.
 * When pg is available and DATABASE_URL is set, uses real Postgres.
 * Otherwise operates in "dry" mode returning empty results.
 */
export class DatabaseConnection {
  private pool: any = null;
  private config: DBConfig;
  private connected = false;

  constructor(config?: DBConfig) {
    this.config = config ?? {
      connectionString: process.env.DATABASE_URL,
      max_connections: parseInt(process.env.DB_MAX_CONNECTIONS ?? "20", 10),
      idle_timeout_ms: parseInt(process.env.DB_IDLE_TIMEOUT ?? "30000", 10),
    };
  }

  async connect(): Promise<boolean> {
    if (this.connected) return true;

    if (!this.config.connectionString && !this.config.host) {
      // No database configured — operate in dry mode
      return false;
    }

    try {
      // Dynamic import — pg is optional, only needed when DATABASE_URL is set
      const pgModule = "pg";
      const pg = await import(/* @vite-ignore */ pgModule).catch(() => null);
      if (!pg) return false;
      const Pool = pg.Pool ?? pg.default?.Pool;
      this.pool = new Pool({
        connectionString: this.config.connectionString,
        host: this.config.host,
        port: this.config.port ?? 5432,
        database: this.config.database ?? "prism",
        user: this.config.user,
        password: this.config.password,
        ssl: this.config.ssl ? { rejectUnauthorized: false } : undefined,
        max: this.config.max_connections ?? 20,
        idleTimeoutMillis: this.config.idle_timeout_ms ?? 30000,
      });

      // Test connection
      const client = await this.pool.connect();
      client.release();
      this.connected = true;
      return true;
    } catch {
      this.connected = false;
      return false;
    }
  }

  async query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<QueryResult<T>> {
    if (!this.connected || !this.pool) {
      return { rows: [], rowCount: 0, duration_ms: 0 };
    }

    const start = Date.now();
    const result = await this.pool.query(sql, params);
    return {
      rows: result.rows as T[],
      rowCount: result.rowCount ?? 0,
      duration_ms: Date.now() - start,
    };
  }

  async transaction<T>(fn: (query: (sql: string, params?: unknown[]) => Promise<QueryResult>) => Promise<T>): Promise<T> {
    if (!this.connected || !this.pool) {
      throw new Error("Database not connected");
    }

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const queryFn = async (sql: string, params?: unknown[]) => {
        const start = Date.now();
        const result = await client.query(sql, params);
        return { rows: result.rows, rowCount: result.rowCount ?? 0, duration_ms: Date.now() - start };
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
}

export const db = new DatabaseConnection();
