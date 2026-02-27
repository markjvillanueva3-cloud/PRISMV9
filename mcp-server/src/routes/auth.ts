/**
 * PRISM MCP Server — Auth Routes
 * Authentication, session management, and API key handling
 */
import { Router } from "express";
import { requireFields } from "../middleware/validation.js";
import type { CallToolFn } from "./index.js";

export function createAuthRouter(callTool: CallToolFn): Router {
  const router = Router();

  // POST /api/v1/auth/login — User login
  router.post("/login", requireFields("username", "password"), async (req, res, next) => {
    try {
      const result = await callTool("prism_auth", "login", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/auth/register — User registration
  router.post("/register", requireFields("username", "email", "password"), async (req, res, next) => {
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

  // GET /api/v1/auth/me — Get current user info
  router.get("/me", async (req, res, next) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      const result = await callTool("prism_auth", "whoami", { token });
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/auth/api-key — Generate API key
  router.post("/api-key", async (req, res, next) => {
    try {
      const result = await callTool("prism_auth", "generate_key", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  return router;
}
