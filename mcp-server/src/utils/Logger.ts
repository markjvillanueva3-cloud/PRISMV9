/**
 * Logger Stub for mcp-server dispatchers
 * Provides basic console logging interface
 */

/**
 * Format an optional structured-context object as a trailing " {k=v, ...}"
 * suffix. Unknown shapes (strings, arrays, primitives) get JSON.stringify'd.
 * Returns "" when no context is supplied so plain log.info("msg") still works.
 */
function formatContext(ctx?: unknown): string {
  if (ctx === undefined || ctx === null) return "";
  try {
    if (typeof ctx === "string") return ` ${ctx}`;
    return " " + JSON.stringify(ctx);
  } catch {
    return " [unserialisable-context]";
  }
}

export const log = {
  info: (msg: string, context?: unknown) =>
    console.error(`[INFO] ${msg}${formatContext(context)}`),
  warn: (msg: string, context?: unknown) =>
    console.error(`[WARN] ${msg}${formatContext(context)}`),
  error: (msg: string, context?: unknown) =>
    console.error(`[ERROR] ${msg}${formatContext(context)}`),
  debug: (msg: string, context?: unknown) =>
    console.error(`[DEBUG] ${msg}${formatContext(context)}`),
};

// Legacy alias: many engines import `logger` — keep in sync with `log`.
export const logger = log;
