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

// Legacy alias: many engines import `logger` -- keep in sync with `log`.
export const logger = log;

/**
 * Named logger class -- a lightweight console wrapper over `log`, consistent
 * with this module's stub intent (basic console logging, no Winston).
 *
 * BaseRegistry (+ ~15 registry subclasses) does `new Logger("Registry:" + name)`
 * and calls .info/.warn/.error/.debug. Before this class existed the named
 * import `{ Logger }` resolved to `undefined`, so `new Logger()` threw
 * "Logger is not a constructor" and EVERY registry subclass was
 * non-constructable. Additive: the `log`/`logger` consts above are unchanged.
 */
export class Logger {
  private readonly prefix: string;
  constructor(name = "") {
    this.prefix = name ? `[${name}] ` : "";
  }
  info(msg: string, context?: unknown): void { log.info(this.prefix + msg, context); }
  warn(msg: string, context?: unknown): void { log.warn(this.prefix + msg, context); }
  error(msg: string, context?: unknown): void { log.error(this.prefix + msg, context); }
  debug(msg: string, context?: unknown): void { log.debug(this.prefix + msg, context); }
}
