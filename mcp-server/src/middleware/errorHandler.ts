/**
 * PRISM MCP Server — Error Handler Middleware
 * Consistent error responses across all API routes
 */
import type { Request, Response, NextFunction } from "express";
import { log } from "../utils/Logger.js";

/** Api Error configuration/data structure.
 */
export interface ApiError {
  status: number;
  message: string;
  code?: string;
  details?: unknown;
}

/** Creates api error.
 * @param status - status value
 * @param message - message string
 * @param code - code string
 * @param details - details
 * @returns api error
 */
export function createApiError(status: number, message: string, code?: string, details?: unknown): ApiError {
  return { status, message, code, details };
}

/** Error Handler.
 * @param err - err
 * @param _req - _req
 * @param res - res
 * @param _next - _next
  * @returns void
 */
export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction): void {
  const status = err.status || 500;
  const message = err.message || "Internal server error";
  const code = err.code || "INTERNAL_ERROR";

  if (status >= 500) {
    log.error(`[API] ${status} ${code}: ${message}`);
  } else {
    log.warn(`[API] ${status} ${code}: ${message}`);
  }

  res.status(status).json({
    error: { status, message, code },
    timestamp: new Date().toISOString()
  });
}
