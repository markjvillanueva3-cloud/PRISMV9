/**
 * PRISM MCP Server — OAuth 2.1 Auth Middleware
 *
 * Express middleware for HTTP transport authentication.
 * Extracts Bearer token from Authorization header, validates JWT,
 * attaches user context to request, and checks dispatcher permissions.
 *
 * Bypasses authentication for:
 *   - stdio transport (local = trusted)
 *   - Health/metrics endpoints
 *   - OAuth discovery endpoints
 *   - When PRISM_AUTH_ENABLED=false
 *
 * @module mcp/authMiddleware
 */

import type { Request, Response, NextFunction } from "express";
import { getOAuthServer, hasPermission, getRequiredRole, type AuthUser } from "./auth.js";
import { getAuthConfig, type OAuthRole, ROLE_HIERARCHY } from "./authConfig.js";

// ============================================================================
// Types
// ============================================================================

/** Express request augmented with PRISM auth context */
export interface AuthenticatedRequest extends Request {
  prismAuth?: {
    user: AuthUser;
    authenticated: boolean;
    transport: "http" | "stdio";
  };
}

/** Paths that bypass authentication entirely */
const PUBLIC_PATHS = new Set([
  "/health",
  "/metrics",
  "/.well-known/mcp.json",
  "/.well-known/oauth-authorization-server",
  "/.well-known/oauth-protected-resource",
  "/oauth/discovery",
]);

/** Path prefixes that bypass authentication */
const PUBLIC_PREFIXES = ["/oauth/"];

// ============================================================================
// Main Authentication Middleware
// ============================================================================

/**
 * Express middleware: authenticate requests via Bearer token.
 *
 * Behavior:
 *   1. If auth is disabled (config), passes through with admin context
 *   2. If path is public (health/metrics/discovery), passes through
 *   3. Extracts Bearer token from Authorization header
 *   4. Validates JWT via PrismOAuthServer
 *   5. Attaches user context to req.prismAuth
 *   6. Returns 401 if token missing/invalid, 403 never (permission checked separately)
 */
export function authMiddleware() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const config = getAuthConfig();

    // ── Auth disabled: pass through with full admin context ─────────────
    if (!config.enabled) {
      authReq.prismAuth = {
        user: {
          sub: "local",
          role: "admin",
          scope: "read operate program admin",
        },
        authenticated: true,
        transport: "http",
      };
      next();
      return;
    }

    // ── Public paths: no auth required ─────────────────────────────────
    if (PUBLIC_PATHS.has(req.path)) {
      next();
      return;
    }
    if (PUBLIC_PREFIXES.some((p) => req.path.startsWith(p))) {
      next();
      return;
    }

    // ── Extract Bearer token ───────────────────────────────────────────
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        error: "unauthorized",
        message: "Missing or malformed Authorization header. Expected: Bearer <token>",
        hint: "Obtain a token via the OAuth 2.1 PKCE flow at /oauth/discovery",
      });
      return;
    }

    const token = authHeader.slice(7); // Strip "Bearer "
    if (!token) {
      res.status(401).json({
        error: "unauthorized",
        message: "Empty Bearer token",
      });
      return;
    }

    // ── Validate JWT ───────────────────────────────────────────────────
    const oauthServer = getOAuthServer();
    if (!oauthServer) {
      res.status(500).json({
        error: "server_error",
        message: "OAuth server not initialized",
      });
      return;
    }

    const result = await oauthServer.validateToken(token);
    if (!result.valid || !result.user) {
      res.status(401).json({
        error: "invalid_token",
        message: result.error || "Token validation failed",
      });
      return;
    }

    // ── Attach user context ────────────────────────────────────────────
    authReq.prismAuth = {
      user: result.user,
      authenticated: true,
      transport: "http",
    };

    next();
  };
}

// ============================================================================
// Permission Checking Middleware
// ============================================================================

/**
 * Express middleware factory: check permission for a specific dispatcher.
 *
 * Usage:
 *   app.post("/api/calc", requirePermission("prism_calc"), handler);
 *
 * Returns 401 if not authenticated, 403 if insufficient role.
 */
export function requirePermission(dispatcherName: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.prismAuth?.authenticated) {
      res.status(401).json({
        error: "unauthorized",
        message: "Authentication required",
      });
      return;
    }

    const userRole = authReq.prismAuth.user.role;
    if (!hasPermission(userRole, dispatcherName)) {
      const required = getRequiredRole(dispatcherName);
      res.status(403).json({
        error: "forbidden",
        message: `Insufficient permissions for ${dispatcherName}`,
        required_role: required,
        your_role: userRole,
        hint: `This tool requires '${required}' role. Your role '${userRole}' is insufficient. ` +
          `Contact your shop admin to upgrade your role.`,
      });
      return;
    }

    next();
  };
}

/**
 * Express middleware factory: require a minimum role level.
 *
 * Usage:
 *   app.delete("/api/users/:id", requireRole("admin"), handler);
 */
export function requireRole(minRole: OAuthRole) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.prismAuth?.authenticated) {
      res.status(401).json({
        error: "unauthorized",
        message: "Authentication required",
      });
      return;
    }

    const userRole = authReq.prismAuth.user.role;
    const userIdx = ROLE_HIERARCHY.indexOf(userRole);
    const reqIdx = ROLE_HIERARCHY.indexOf(minRole);

    if (userIdx < reqIdx) {
      res.status(403).json({
        error: "forbidden",
        message: `This endpoint requires '${minRole}' role`,
        your_role: userRole,
      });
      return;
    }

    next();
  };
}

// ============================================================================
// Stdio Transport Bypass
// ============================================================================

/**
 * Create an AuthUser context for stdio transport (local = trusted = admin).
 * Used when the server runs in stdio mode without HTTP transport.
 */
export function createStdioAuthContext(): AuthenticatedRequest["prismAuth"] {
  return {
    user: {
      sub: "local-stdio",
      role: "admin",
      scope: "read operate program admin",
    },
    authenticated: true,
    transport: "stdio",
  };
}

/**
 * Check if a request is from a trusted stdio transport.
 */
export function isStdioTransport(req: AuthenticatedRequest): boolean {
  return req.prismAuth?.transport === "stdio";
}

// ============================================================================
// MCP Tool-Level Permission Check
// ============================================================================

/**
 * Check dispatcher permission for an MCP tool call.
 * Used inside MCP tool handlers (not Express middleware).
 *
 * @param user - The authenticated user (from token or stdio context)
 * @param dispatcherName - The dispatcher being called (e.g., "prism_calc")
 * @returns null if allowed, error object if denied
 */
export function checkToolPermission(
  user: AuthUser | undefined,
  dispatcherName: string
): { error: string; required_role: OAuthRole; user_role: OAuthRole } | null {
  // No user context = unauthenticated (shouldn't happen if middleware is wired)
  if (!user) {
    return {
      error: "Authentication required to call MCP tools",
      required_role: getRequiredRole(dispatcherName),
      user_role: "viewer" as OAuthRole,
    };
  }

  if (!hasPermission(user.role, dispatcherName)) {
    return {
      error: `Insufficient permissions for ${dispatcherName}. Required: ${getRequiredRole(dispatcherName)}, have: ${user.role}`,
      required_role: getRequiredRole(dispatcherName),
      user_role: user.role,
    };
  }

  return null; // Allowed
}
