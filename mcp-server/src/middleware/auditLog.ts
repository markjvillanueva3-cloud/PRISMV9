/**
 * PRISM MCP Server — Audit Logging Middleware
 * *** SECURITY CRITICAL ***
 *
 * Logs all write operations (POST, PUT, DELETE, PATCH) with user context,
 * endpoint, timestamp, and request summary. Read operations are not logged
 * to avoid excessive volume.
 *
 * Audit entries are emitted via the structured logger and can be piped
 * to a persistent store (file, DB, SIEM) via log transport config.
 */
import type { Request, Response, NextFunction } from "express";
import { log } from "../utils/Logger.js";

export interface AuditEntry {
  timestamp: string;
  method: string;
  path: string;
  user_id: string | undefined;
  roles: string[] | undefined;
  ip: string;
  user_agent: string;
  status_code: number;
  duration_ms: number;
  body_keys: string[];
}

const WRITE_METHODS = new Set(["POST", "PUT", "DELETE", "PATCH"]);

/**
 * Audit logging middleware. Logs all mutating requests with user context.
 * Attach after verifyToken (or optionalToken) so req.userId is available.
 */
export function auditLog(req: Request, res: Response, next: NextFunction): void {
  if (!WRITE_METHODS.has(req.method)) {
    next();
    return;
  }

  const start = Date.now();

  // Use 'finish' event — fires when response is written, no monkey-patching needed
  res.on("finish", () => {
    const entry: AuditEntry = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.originalUrl,
      user_id: req.userId,
      roles: req.userRoles,
      ip: (req.ip ?? req.socket.remoteAddress ?? "unknown").replace("::ffff:", ""),
      user_agent: req.headers["user-agent"] ?? "unknown",
      status_code: res.statusCode,
      duration_ms: Date.now() - start,
      body_keys: req.body ? Object.keys(req.body) : [],
    };

    log.info(
      `[Audit] ${entry.method} ${entry.path} ` +
      `by=${entry.user_id ?? "anon"} ` +
      `status=${entry.status_code} ${entry.duration_ms}ms`
    );
  });

  next();
}
