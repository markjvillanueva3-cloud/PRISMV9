/**
 * Logger Stub for mcp-server dispatchers
 * Provides basic console logging interface
 */

export const log = {
  info: (msg: string) => console.error(`[INFO] ${msg}`),
  warn: (msg: string) => console.error(`[WARN] ${msg}`),
  error: (msg: string) => console.error(`[ERROR] ${msg}`),
  debug: (msg: string) => console.error(`[DEBUG] ${msg}`),
};

// Legacy alias: many engines import `logger` — keep in sync with `log`.
export const logger = log;
