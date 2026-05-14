import { Router } from "express";
import type { CallToolFn } from "./index.js";

export function createSettingsRouter(_callTool: CallToolFn): Router {
  const router = Router();
  // Settings stored in-memory per session (production would use DB)
  let userSettings: Record<string, unknown> = {};

  router.get("/", (_req, res) => { res.json({ settings: userSettings }); });
  router.put("/", (req, res) => { userSettings = { ...userSettings, ...req.body }; res.json({ settings: userSettings }); });
  router.delete("/", (_req, res) => { userSettings = {}; res.json({ settings: {} }); });

  return router;
}
