/**
 * PRISM MCP Server — Auth Routes
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

  // POST /api/v1/auth/login — User login (rate-limited by IP)
  router.post("/login", rateLimitMiddleware("RL-AUTH", "ip"), requireFields("username", "password"), async (req, res, next) => {
    try {
      const result = await callTool("prism_auth", "login", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/auth/register — User registration (rate-limited by IP)
  router.post("/register", rateLimitMiddleware("RL-AUTH", "ip"), requireFields("username", "email", "password"), async (req, res, next) => {
    try {
      const result = await callTool("prism_auth", "register", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/auth/refresh — Refresh token
  router.post("/refresh", requireFields("refreshToken"), async (req, res, next) => {
    try {
      const result = await callTool("prism_auth", "refresh", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/auth/logout — Logout (invalidate token)
  router.post("/logout", async (req, res, next) => {
    try {
      const result = await callTool("prism_auth", "logout", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // GET /api/v1/auth/me — Get current user info (requires auth)
  router.get("/me", verifyToken, async (req, res, next) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      const result = await callTool("prism_auth", "whoami", { token });
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/auth/api-key — Generate API key (requires auth)
  router.post("/api-key", verifyToken, async (req, res, next) => {
    try {
      const result = await callTool("prism_auth", "generate_key", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  return router;
}
