/**
 * PRISM MCP Server — Auth Middleware
 * *** SECURITY CRITICAL ***
 *
 * Express middleware for JWT-like token verification, role-based access
 * control, and permission enforcement. Wires AuthEngine to HTTP layer.
 *
 * Usage:
 *   router.get("/protected", verifyToken, handler)
 *   router.post("/admin", verifyToken, requireRole("admin"), handler)
 *   router.delete("/job/:id", verifyToken, requirePermission("job:delete"), handler)
 */
import type { Request, Response, NextFunction } from "express";
import { authEngine } from "../engines/AuthEngine.js";
import { log } from "../utils/Logger.js";

// Extend Express Request to carry authenticated user info
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRoles?: string[];
      userPermissions?: string[];
    }
  }
}

/**
 * Verify Bearer token from Authorization header.
 * Sets req.userId, req.userRoles, req.userPermissions on success.
 * Returns 401 if missing/invalid/expired.
 */
export function verifyToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      error: { status: 401, message: "Missing or invalid Authorization header", code: "AUTH_REQUIRED" },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const token = authHeader.slice(7); // strip "Bearer "
  const validation = authEngine.validateToken(token);

  if (!validation.valid) {
    res.status(401).json({
      error: { status: 401, message: validation.reason ?? "Invalid or expired token", code: "AUTH_INVALID" },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  req.userId = validation.user_id;
  req.userRoles = validation.roles;
  req.userPermissions = validation.permissions;
  next();
}

/**
 * Optional token verification — sets user info if token present, but doesn't block.
 * Useful for endpoints that behave differently for authenticated users.
 */
export function optionalToken(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const validation = authEngine.validateToken(token);
    if (validation.valid) {
      req.userId = validation.user_id;
      req.userRoles = validation.roles;
      req.userPermissions = validation.permissions;
    }
  }
  next();
}

/**
 * Require user to have at least one of the specified roles.
 * Must be used after verifyToken.
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.userId || !req.userRoles) {
      res.status(401).json({
        error: { status: 401, message: "Authentication required", code: "AUTH_REQUIRED" },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const hasRole = req.userRoles.some(r => roles.includes(r));
    if (!hasRole) {
      log.warn(`[Auth] User ${req.userId} denied: requires role [${roles.join("|")}], has [${req.userRoles.join(",")}]`);
      res.status(403).json({
        error: { status: 403, message: `Insufficient role. Required: ${roles.join(" or ")}`, code: "FORBIDDEN" },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  };
}

/**
 * Require user to have a specific permission (or wildcard).
 * Must be used after verifyToken.
 */
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.userId) {
      res.status(401).json({
        error: { status: 401, message: "Authentication required", code: "AUTH_REQUIRED" },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const check = authEngine.checkPermission(req.userId, permission);
    if (!check.allowed) {
      log.warn(`[Auth] User ${req.userId} denied permission '${permission}': ${check.reason}`);
      res.status(403).json({
        error: { status: 403, message: check.reason, code: "FORBIDDEN" },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  };
}
