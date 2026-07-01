/**
 * PRISM MCP Server -- Admin Routes
 * System administration, user management, diagnostics
 */
import { Router } from "express";
import type { Request, Response } from "express";
import type { CallToolFn } from "./index.js";
import { verifyToken, requireRole } from "../middleware/auth.js";
import { subscriptionStore } from "../engines/SubscriptionStore.js";
import { entitlementOverrideStore } from "../engines/EntitlementOverrideStore.js";
import { GATED_FEATURES, isGatedFeature } from "../middleware/tierGate.js";
import type { Plan } from "../engines/AuthEngineV7.js";

const VALID_PLANS: readonly Plan[] = ["free", "starter", "pro", "shop", "enterprise"];

/** Creates admin router.
 * @param callTool - call tool
 * @returns router
 */
export function createAdminRouter(callTool: CallToolFn): Router {
  const router = Router();

  // All admin routes require authentication + admin role
  router.use(verifyToken);
  router.use(requireRole("admin"));

  // GET /api/v1/admin/status -- Full system status. Real action: `server_info` (prior `status` did
  // not exist on prism_dev -> silent 200+{error}). devDispatcher passes params through (no strict
  // per-action validation) and server_info reads none, so {} is safe.
  router.get("/status", async (_req, res, next) => {
    try {
      const result = await callTool("prism_dev", "server_info", {});
      res.json({ result });
    } catch (e) { next(e); }
  });

  // GET /api/v1/admin/registries -- Registry / resource statistics. Real action: `resource_census`
  // (prior `registry_stats` did not exist). Reads optional params; {} yields a full census.
  router.get("/registries", async (_req, res, next) => {
    try {
      const result = await callTool("prism_dev", "resource_census", {});
      res.json({ result });
    } catch (e) { next(e); }
  });

  // GET /api/v1/admin/dispatchers -- Dispatcher inventory. prism_dev has no single all-dispatcher
  // inventory action that accepts {}: `asc_get_dispatcher_actions` REQUIRES params.dispatcher_name
  // (returns empty without it -- the arm-C param-contract trap). Fail loud (501) rather than mislabel;
  // /status (server_info) already returns dispatcher_files for a fleet listing. Wire prism_session:
  // dispatcher_map_compact here if a richer per-dispatcher inventory is needed.
  router.get("/dispatchers", async (_req, res) => {
    res.status(501).json({
      message: "dispatcher inventory not yet wired -- no prism_dev all-dispatcher action accepts an empty request (asc_get_dispatcher_actions needs dispatcher_name). Use /status (server_info.dispatcher_files) or wire prism_session:dispatcher_map_compact.",
      error: "not_implemented",
    });
  });

  // POST /api/v1/admin/users -- Manage users. prism_tenant STRICT-validates per action and has NO
  // `user_manage`; user management there is a COMPOSITE of create/delete/get/list/suspend/reactivate.
  // Fail loud (501) rather than fabricate a single-action mapping; wire an operation-dispatch
  // (req.body.operation -> the matching prism_tenant action) or per-operation endpoints.
  router.post("/users", async (_req, res) => {
    res.status(501).json({
      message: "user management not yet wired -- prism_tenant has no user_manage action; it exposes create/delete/get/list/suspend/reactivate separately. Add an operation-dispatch or per-operation routes.",
      error: "not_implemented",
    });
  });

  // GET /api/v1/admin/audit-log -- View audit log. prism_compliance STRICT-validates per action and
  // has NO `audit_log`; the candidate is `audit_trail`, but its Zod schema must be confirmed to accept
  // {limit, offset} before wiring (an unverified mapping risks the same 200+{error} param-contract
  // trap). Fail loud (501) until the audit_trail param contract is verified + mapped.
  router.get("/audit-log", async (_req, res) => {
    res.status(501).json({
      message: "audit log view not yet wired -- prism_compliance has no audit_log action; candidate audit_trail must be schema-verified to accept {limit, offset} before mapping (strict validation).",
      error: "not_implemented",
    });
  });

  // POST /api/v1/admin/cache/clear -- Clear system cache. Real action: `cache_manage` (prior
  // `cache_clear` did not exist). devDispatcher passes params through; pass an explicit clear intent.
  router.post("/cache/clear", async (_req, res, next) => {
    try {
      const result = await callTool("prism_dev", "cache_manage", { operation: "clear" });
      res.json({ result });
    } catch (e) { next(e); }
  });

  // ==========================================================================
  // U-COMM-05 -- per-seat entitlement administration (admin-gated by router.use
  // above). The shop admin sees each user's plan + per-feature overrides and can
  // revoke a feature below the plan ceiling, or set a user's plan manually.
  // ==========================================================================

  // GET /api/v1/admin/entitlements -- all users' plan + overrides (for the Q6 UI)
  router.get("/entitlements", (_req: Request, res: Response) => {
    const overrides = entitlementOverrideStore.listAll();
    const userIds = new Set<string>(Object.keys(overrides));
    // Include any user with a subscription record too (so admins see plan-only users).
    for (const uid of subscriptionStore.listUserIds()) userIds.add(uid);
    const users = Array.from(userIds).sort().map((userId) => {
      const rec = subscriptionStore.getRecord(userId);
      return {
        userId,
        plan: rec?.plan ?? "free",
        status: rec?.status ?? "none",
        effectivePlan: subscriptionStore.getPlan(userId),
        overrides: overrides[userId] ?? {},
      };
    });
    res.json({ result: { users, count: users.length } });
  });

  // GET /api/v1/admin/entitlements/:userId -- one user's plan + overrides
  router.get("/entitlements/:userId", (req: Request, res: Response) => {
    const userId = String(req.params.userId ?? "");
    const rec = subscriptionStore.getRecord(userId);
    res.json({
      result: {
        userId,
        plan: rec?.plan ?? "free",
        status: rec?.status ?? "none",
        effectivePlan: subscriptionStore.getPlan(userId),
        overrides: entitlementOverrideStore.getOverrides(userId),
      },
    });
  });

  // POST /api/v1/admin/entitlements -- set/clear a per-seat feature override.
  // body: { userId, feature, granted }  (granted=false denies; true clears the denial)
  router.post("/entitlements", (req: Request, res: Response) => {
    const { userId, feature, granted } = (req.body ?? {}) as { userId?: string; feature?: string; granted?: boolean };
    if (!userId || !feature || typeof granted !== "boolean") {
      res.status(400).json({
        error: { status: 400, message: "userId (string), feature (string), and granted (boolean) are required", code: "MISSING_FIELD" },
        timestamp: new Date().toISOString(),
      });
      return;
    }
    // Reject a feature the entitlement layer does NOT enforce -- otherwise the
    // override would be a silent no-op (admin UI shows "revoked" while the user
    // keeps access). Honesty gate (scrutiny P1).
    if (!isGatedFeature(feature)) {
      res.status(400).json({
        error: { status: 400, message: `feature "${feature}" is not an enforceable entitlement key; valid: ${GATED_FEATURES.join(", ")}`, code: "UNENFORCEABLE_FEATURE" },
        timestamp: new Date().toISOString(),
      });
      return;
    }
    const overrides = entitlementOverrideStore.setOverride(userId, feature, granted);
    res.json({ result: { userId, overrides } });
  });

  // POST /api/v1/admin/users/plan -- set a user's subscription plan manually.
  // body: { userId, plan, status? }
  router.post("/users/plan", (req: Request, res: Response) => {
    const { userId, plan, status } = (req.body ?? {}) as { userId?: string; plan?: Plan; status?: string };
    if (!userId || !plan) {
      res.status(400).json({
        error: { status: 400, message: "userId and plan are required", code: "MISSING_FIELD" },
        timestamp: new Date().toISOString(),
      });
      return;
    }
    if (!VALID_PLANS.includes(plan)) {
      res.status(400).json({
        error: { status: 400, message: `invalid plan "${plan}"; valid: ${VALID_PLANS.join(", ")}`, code: "INVALID_PLAN" },
        timestamp: new Date().toISOString(),
      });
      return;
    }
    const rec = subscriptionStore.setPlan(userId, plan, (status as never) ?? "active");
    res.json({ result: rec });
  });

  return router;
}
