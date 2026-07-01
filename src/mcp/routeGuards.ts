/**
 * PRISM Web Route Guards — PROD-MS1 P1-U03
 *
 * Maps web application routes to required authentication roles.
 * Used by Express middleware to redirect unauthenticated users
 * to the login page.
 *
 * Role hierarchy: viewer < operator < programmer < admin
 * Public routes: login, signup, health, API docs
 * Protected routes: everything else with role-based minimums
 *
 * @module mcp/routeGuards
 */

import type { Request, Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "./authMiddleware.js";
import { ROLE_HIERARCHY, type OAuthRole } from "./authConfig.js";

// ═══════════════════════════════════════════════════════════════
// Route → Role Mapping
// ═══════════════════════════════════════════════════════════════

/** Routes that require no authentication */
const PUBLIC_ROUTES = new Set([
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/health",
  "/ready",
  "/live",
  "/api/docs",
]);

/** Route prefix → minimum required role */
const ROUTE_ROLE_MAP: Array<{ prefix: string; role: OAuthRole }> = [
  // Admin-only routes
  { prefix: "/admin", role: "admin" },
  { prefix: "/settings/users", role: "admin" },
  { prefix: "/settings/auth", role: "admin" },
  { prefix: "/api/v2/admin", role: "admin" },

  // Programmer routes (create/edit programs, CAM, post-processing)
  { prefix: "/programs", role: "programmer" },
  { prefix: "/cam", role: "programmer" },
  { prefix: "/post-processor", role: "programmer" },
  { prefix: "/toolpath", role: "programmer" },
  { prefix: "/api/v2/cam", role: "programmer" },
  { prefix: "/api/v2/program", role: "programmer" },

  // Operator routes (run jobs, view setup sheets, basic calculators)
  { prefix: "/jobs", role: "operator" },
  { prefix: "/setup-sheets", role: "operator" },
  { prefix: "/calculator", role: "operator" },
  { prefix: "/alarm", role: "operator" },
  { prefix: "/quality", role: "operator" },
  { prefix: "/shop-floor", role: "operator" },
  { prefix: "/tool-life", role: "operator" },
  { prefix: "/api/v2/calc", role: "operator" },
  { prefix: "/api/v2/machine", role: "operator" },

  // Viewer routes (dashboards, reports, learning — lowest auth)
  { prefix: "/dashboard", role: "viewer" },
  { prefix: "/reports", role: "viewer" },
  { prefix: "/learning", role: "viewer" },
  { prefix: "/academy", role: "viewer" },
  { prefix: "/data", role: "viewer" },
  { prefix: "/api/v2/data", role: "viewer" },
  { prefix: "/api/v2/knowledge", role: "viewer" },
];

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

/**
 * Get the minimum role required for a given path.
 * Returns null for public routes.
 */
export function getRequiredRoleForPath(
  path: string
): OAuthRole | null {
  // Normalize path
  const normalized = path.toLowerCase().split("?")[0];

  // Public routes
  if (PUBLIC_ROUTES.has(normalized)) return null;

  // Static assets never need auth
  if (
    normalized.startsWith("/assets/") ||
    normalized.startsWith("/static/") ||
    normalized.endsWith(".js") ||
    normalized.endsWith(".css") ||
    normalized.endsWith(".ico") ||
    normalized.endsWith(".png") ||
    normalized.endsWith(".svg")
  ) {
    return null;
  }

  // Check route map (longest prefix match wins)
  let bestMatch: { prefix: string; role: OAuthRole } | null = null;
  for (const entry of ROUTE_ROLE_MAP) {
    if (
      normalized.startsWith(entry.prefix) &&
      (!bestMatch || entry.prefix.length > bestMatch.prefix.length)
    ) {
      bestMatch = entry;
    }
  }

  if (bestMatch) return bestMatch.role;

  // Default: require at least viewer for any non-public path
  return "viewer";
}

/**
 * Check if a user role meets the minimum required role.
 */
function hasMinimumRole(
  userRole: OAuthRole,
  requiredRole: OAuthRole
): boolean {
  const userLevel = ROLE_HIERARCHY.indexOf(userRole);
  const requiredLevel = ROLE_HIERARCHY.indexOf(requiredRole);
  return userLevel >= requiredLevel;
}

// ═══════════════════════════════════════════════════════════════
// Express Middleware
// ═══════════════════════════════════════════════════════════════

/**
 * Route guard middleware for web application routes.
 *
 * - Public routes pass through
 * - Protected routes check for authentication
 * - Unauthenticated → redirect to /login (HTML) or 401 (API)
 * - Insufficient role → 403
 */
export function routeGuardMiddleware() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const requiredRole = getRequiredRoleForPath(req.path);

    // Public route — no auth needed
    if (!requiredRole) {
      next();
      return;
    }

    const authReq = req as AuthenticatedRequest;
    const user = authReq.prismAuth;

    // Not authenticated
    if (!user?.authenticated) {
      const isApiRequest =
        req.path.startsWith("/api/") ||
        req.headers.accept?.includes("application/json");

      if (isApiRequest) {
        res.status(401).json({
          error: "authentication_required",
          message: "This endpoint requires authentication",
          loginUrl: "/login",
        });
      } else {
        // Redirect to login with return URL
        const returnUrl = encodeURIComponent(req.originalUrl);
        res.redirect(`/login?returnUrl=${returnUrl}`);
      }
      return;
    }

    // Check role
    const userRole = (user.user.role as OAuthRole) ?? "viewer";
    if (!hasMinimumRole(userRole, requiredRole)) {
      const isApiRequest =
        req.path.startsWith("/api/") ||
        req.headers.accept?.includes("application/json");

      if (isApiRequest) {
        res.status(403).json({
          error: "insufficient_permissions",
          message: `This endpoint requires '${requiredRole}' role`,
          currentRole: userRole,
        });
      } else {
        res.status(403).send(`
          <h1>Access Denied</h1>
          <p>This page requires '${requiredRole}' role. Your role: '${userRole}'.</p>
          <a href="/dashboard">Return to Dashboard</a>
        `);
      }
      return;
    }

    next();
  };
}

/**
 * Summary of route protection for documentation/debugging
 */
export function getRouteGuardSummary(): {
  publicRoutes: string[];
  protectedRoutes: Array<{ prefix: string; role: OAuthRole }>;
  defaultRole: OAuthRole;
} {
  return {
    publicRoutes: Array.from(PUBLIC_ROUTES),
    protectedRoutes: [...ROUTE_ROLE_MAP],
    defaultRole: "viewer",
  };
}
