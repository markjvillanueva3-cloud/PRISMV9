/**
 * LoggingEngine — L2-P3-MS1 Infrastructure Layer
 *
 * Structured logging with levels, namespaces, context enrichment,
 * log rotation, and query capabilities.
 *
 * Actions: log_write, log_query, log_stats, log_configure
 */

// ============================================================================
// TYPES
// ============================================================================

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

export interface LogEntry {
  id: number;
  timestamp: string;
  level: LogLevel;
  namespace: string;
  message: string;
  context?: Record<string, unknown>;
  correlation_id?: string;
  duration_ms?: number;
  source?: string;
}

export interface LogQuery {
  level?: LogLevel;
  namespace?: string;
  since?: string;
  until?: string;
  search?: string;
  correlation_id?: string;
  limit?: number;
}

export interface LogStats {
  total_entries: number;
  by_level: Record<LogLevel, number>;
  by_namespace: Record<string, number>;
  errors_last_hour: number;
  oldest_entry: string;
  newest_entry: string;
}

export interface LogConfig {
  min_level: LogLevel;
  max_entries: number;
  namespaces_enabled: string[];  // empty = all
  namespaces_disabled: string[];
}

// ============================================================================
// LEVEL ORDER
// ============================================================================

const LEVEL_ORDER: Record<LogLevel, number> = { trace: 0, debug: 1, info: 2, warn: 3, error: 4, fatal: 5 };

// ============================================================================
// ENGINE CLASS
// ============================================================================

let logIdCounter = 0;

export class LoggingEngine {
  private entries: LogEntry[] = [];
  private config: LogConfig = {
    min_level: "info",
    max_entries: 10000,
    namespaces_enabled: [],
    namespaces_disabled: [],
  };

  log(level: LogLevel, namespace: string, message: string, context?: Record<string, unknown>, correlationId?: string): LogEntry | undefined {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[this.config.min_level]) return undefined;

    if (this.config.namespaces_disabled.includes(namespace)) return undefined;
    if (this.config.namespaces_enabled.length > 0 && !this.config.namespaces_enabled.includes(namespace)) return undefined;

    logIdCounter++;
    const entry: LogEntry = {
      id: logIdCounter,
      timestamp: new Date().toISOString(),
      level, namespace, message,
      context, correlation_id: correlationId,
    };

    this.entries.push(entry);
    while (this.entries.length > this.config.max_entries) this.entries.shift();

    return entry;
  }

  trace(ns: string, msg: string, ctx?: Record<string, unknown>): LogEntry | undefined { return this.log("trace", ns, msg, ctx); }
  debug(ns: string, msg: string, ctx?: Record<string, unknown>): LogEntry | undefined { return this.log("debug", ns, msg, ctx); }
  info(ns: string, msg: string, ctx?: Record<string, unknown>): LogEntry | undefined { return this.log("info", ns, msg, ctx); }
  warn(ns: string, msg: string, ctx?: Record<string, unknown>): LogEntry | undefined { return this.log("warn", ns, msg, ctx); }
  error(ns: string, msg: string, ctx?: Record<string, unknown>): LogEntry | undefined { return this.log("error", ns, msg, ctx); }
  fatal(ns: string, msg: string, ctx?: Record<string, unknown>): LogEntry | undefined { return this.log("fatal", ns, msg, ctx); }

  query(q: LogQuery): LogEntry[] {
    let result = [...this.entries];

    if (q.level) {
      const minOrder = LEVEL_ORDER[q.level];
      result = result.filter(e => LEVEL_ORDER[e.level] >= minOrder);
    }
    if (q.namespace) result = result.filter(e => e.namespace === q.namespace || e.namespace.startsWith(q.namespace + "."));
    if (q.since) { const ts = new Date(q.since).getTime(); result = result.filter(e => new Date(e.timestamp).getTime() >= ts); }
    if (q.until) { const ts = new Date(q.until).getTime(); result = result.filter(e => new Date(e.timestamp).getTime() <= ts); }
    if (q.search) { const s = q.search.toLowerCase(); result = result.filter(e => e.message.toLowerCase().includes(s)); }
    if (q.correlation_id) result = result.filter(e => e.correlation_id === q.correlation_id);

    const limit = q.limit || 100;
    return result.slice(-limit);
  }

  stats(): LogStats {
    const byLevel: Record<LogLevel, number> = { trace: 0, debug: 0, info: 0, warn: 0, error: 0, fatal: 0 };
    const byNs: Record<string, number> = {};
    const oneHourAgo = Date.now() - 3600000;
    let errorsLastHour = 0;

    for (const e of this.entries) {
      byLevel[e.level]++;
      byNs[e.namespace] = (byNs[e.namespace] || 0) + 1;
      if ((e.level === "error" || e.level === "fatal") && new Date(e.timestamp).getTime() > oneHourAgo) {
        errorsLastHour++;
      }
    }

    return {
      total_entries: this.entries.length,
      by_level: byLevel,
      by_namespace: byNs,
      errors_last_hour: errorsLastHour,
      oldest_entry: this.entries.length > 0 ? this.entries[0].timestamp : "",
      newest_entry: this.entries.length > 0 ? this.entries[this.entries.length - 1].timestamp : "",
    };
  }

  configure(config: Partial<LogConfig>): LogConfig {
    Object.assign(this.config, config);
    return { ...this.config };
  }

  getConfig(): LogConfig { return { ...this.config }; }

  clear(): void { this.entries = []; logIdCounter = 0; }
}

export const loggingEngine = new LoggingEngine();
