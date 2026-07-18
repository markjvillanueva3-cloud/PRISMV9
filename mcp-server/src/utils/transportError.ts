/**
 * PRISM MCP Server - Transport error responder
 *
 * Shared, unit-testable error path for the POST /mcp handler. Hoisted out of
 * the inline handler so the catch logic (log + headers-aware 500 vs end) can be
 * asserted WITHOUT booting the server (importing index.ts starts it).
 *
 * Closes the gap where `await reqServer.connect(transport)` /
 * `await transport.handleRequest(...)` threw/rejected as the last statements of
 * the async handler -> escaped as a process-level unhandledRejection, invisible
 * to operators and, mid-write, leaving a half-emitted response.
 *
 * @module utils/transportError
 */
import { log } from "./Logger.js";

/** Minimal subset of express.Response this helper touches (keeps it testable). */
export interface TransportErrorRes {
  headersSent: boolean;
  status(code: number): { json(body: unknown): unknown };
  end(): unknown;
}

/**
 * Respond to a transport/handleRequest failure on the MCP POST path.
 *
 * If headers are not yet sent, emit a JSON-RPC 500; otherwise best-effort end
 * the half-written response. Always logs. Never throws (a throw here would
 * re-enter the unhandledRejection path this exists to close).
 *
 * @param res - the express response (or a compatible subset)
 * @param e - the thrown error / rejection reason
 * @param id - the JSON-RPC request id to echo (or null)
 * @returns void
 */
export function respondTransportError(res: TransportErrorRes, e: unknown, id: unknown): void {
  const message = e instanceof Error ? e.message : String(e);
  const stack = e instanceof Error ? e.stack : undefined;
  log.error("[MCP] handleRequest failed", { message, stack });
  try {
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32000, message },
        id: id ?? null,
      });
    } else {
      res.end();
    }
  } catch {
    /* best-effort - the socket may already be torn down */
  }
}
