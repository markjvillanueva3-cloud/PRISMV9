/**
 * PRISM MCP Server -- Auth Routes
 * Authentication, session management, and API key handling
 */
import { Router } from "express";
import { requireFields } from "../middleware/validation.js";
import { rateLimitMiddleware } from "../middleware/rateLimit.js";
import { verifyToken } from "../middleware/auth.js";
import type { CallToolFn } from "./index.js";

/** Creates auth router.
 * @param callTool - call tool
 * @returns router
 */
export function createAuthRouter(callTool: CallToolFn): Router {
  const router = Router();

  // POST /api/v1/auth/login -- User login (rate-limited by IP)
  router.post("/login", rateLimitMiddleware("RL-AUTH", "ip"), requireFields("username", "password"), async (req, res, next) => {
    try {
      const result = await callTool("prism_auth", "login", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/auth/register -- User registration (rate-limited by IP)
  router.post("/register", rateLimitMiddleware("RL-AUTH", "ip"), requireFields("username", "email", "password"), async (req, res, next) => {
    try {
      const result = await callTool("prism_auth", "register", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/auth/refresh -- Refresh token. The real prism_auth action is `refresh_token`
  // (NOT `refresh`), and the engine reads params.refresh_token -- map the SPA's refreshToken field.
  router.post("/refresh", requireFields("refreshToken"), async (req, res, next) => {
    try {
      const result = await callTool("prism_auth", "refresh_token", {
        refresh_token: req.body.refreshToken ?? req.body.refresh_token,
      });
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/auth/logout -- Logout (invalidate session). There is no standalone `logout`
  // action; `session_manage` is the real invalidation path (revoke / revoke_all).
  // NOTE: this route has no verifyToken middleware (pre-existing) -- session ownership comes from
  // the request body. Tightening to token-derived identity is a flagged follow-up.
  router.post("/logout", async (req, res, next) => {
    try {
      const result = await callTool("prism_auth", "session_manage", {
        operation: req.body.operation ?? "revoke_all",
        user_id: req.body.user_id,
        session_id: req.body.session_id,
      });
      res.json({ result });
    } catch (e) { next(e); }
  });

  // GET /api/v1/auth/me -- Get current user info (requires auth). verifyToken already decoded +
  // validated the bearer token, so the identity is req.userId/userRoles/userPermissions. There is
  // no prism_auth `whoami` action -- the middleware IS the source of truth; return it directly.
  router.get("/me", verifyToken, async (req, res, next) => {
    try {
      res.json({ result: { user_id: req.userId, roles: req.userRoles, permissions: req.userPermissions } });
    } catch (e) { next(e); }
  });

  // POST /api/v1/auth/api-key -- Generate API key (requires auth). No prism_auth API-key action
  // exists; fail loud (501) with a detectable body instead of a silent 200+{error} the SPA cannot
  // see (R12). Wire when a real user-API-key engine/action lands.
  router.post("/api-key", verifyToken, async (_req, res) => {
    res.status(501).json({
      message: "user API-key generation not yet wired -- no prism_auth action exists",
      error: "not_implemented",
    });
  });

  return router;
}
