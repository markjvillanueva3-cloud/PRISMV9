/**
 * PRISM MCP Server — Request Validation Middleware
 * Validates request body against required fields
 */
import type { Request, Response, NextFunction } from "express";

/**
 * Validate that required fields exist in request body
 */
export function requireFields(...fields: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const missing = fields.filter(f => req.body[f] === undefined || req.body[f] === null);
    if (missing.length > 0) {
      res.status(400).json({
        error: {
          status: 400,
          message: `Missing required fields: ${missing.join(", ")}`,
          code: "VALIDATION_ERROR"
        },
        timestamp: new Date().toISOString()
      });
      return;
    }
    next();
  };
}

/**
 * Validate numeric query/body parameters
 */
export function requireNumeric(...fields: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const invalid = fields.filter(f => {
      const val = req.body[f] ?? req.query[f];
      return val !== undefined && (isNaN(Number(val)) || val === "");
    });
    if (invalid.length > 0) {
      res.status(400).json({
        error: {
          status: 400,
          message: `Fields must be numeric: ${invalid.join(", ")}`,
          code: "VALIDATION_ERROR"
        },
        timestamp: new Date().toISOString()
      });
      return;
    }
    next();
  };
}
