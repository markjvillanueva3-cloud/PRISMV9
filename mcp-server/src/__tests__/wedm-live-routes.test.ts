/**
 * wedm-live-routes.test.ts -- U-WEDM-LIVE-ROUTES (slot:quebec).
 *
 * POST /api/v1/wedm-live/{safety-envelope,autonomy,rul,maintenance} back the 4 status
 * calls WireEdmWizardPage has polled since U-P2PFS32/33 -- previously 404 (no router),
 * silently swallowed -> 4 permanently-loading panels.
 *
 * WIRE REALISM (R9):
 *  - autonomy mocks the POST-PEEL **slimmed** AutonomyStatusSnapshot: prism_edm wraps
 *    slimResponse(result) (edmDispatcher.ts:3412) which strips null fields and EMPTY
 *    arrays -- so the mock OMITS promotionBlockers/nextLevelRequirements to prove the
 *    route re-defaults them instead of forwarding undefined.
 *  - safety/rul/maintenance run the REAL engines (pure in-memory singletons) -- reference
 *    values assert the DEFAULT_ENVELOPE limits (gap_V min 20 soft 5) and the degradation
 *    model's 5 tracked components, not convenient fabricated shapes.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { vi } from "vitest";

vi.mock("../middleware/auth.js", () => ({
  verifyToken: (req: any, res: any, next: () => void) => {
    if (req.headers["x-test-anon"] === "1") {
      res.status(401).json({ error: "AUTH_REQUIRED" });
      return;
    }
    req.userId = "test-user";
    req.userRoles = ["employee"];
    next();
  },
  requireRole: () => (_req: any, _res: any, next: () => void) => next(),
  requireSelfOrAdmin: (_req: any, _res: any, next: () => void) => next(),
  validateTimestamp: (_req: any, _res: any, next: () => void) => next(),
}));

import { createServer, type Server } from "http";
import express from "express";
import { createWedmLiveRouter } from "../routes/wedm-live.js";
import { wedmDegradationModelEngine } from "../engines/WEDMDegradationModelEngine.js";
import type { CallToolFn } from "../routes/index.js";

let autonomyResult: unknown = null;
const callTool: CallToolFn = (async (tool: string, action: string) => {
  if (tool === "prism_edm" && action === "wedm_autonomy_gate_status") return autonomyResult;
  throw new Error(`unexpected callTool ${tool}:${action}`);
}) as unknown as CallToolFn;

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use("/api/v1/wedm-live", createWedmLiveRouter(callTool));
  await new Promise<void>((resolve) => {
    server = createServer(app).listen(0, () => {
      const addr = server.address();
      baseUrl = `http://127.0.0.1:${typeof addr === "object" && addr ? addr.port : 0}`;
      resolve();
    });
  });
});

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

// FULL mount prefix (a bare path 404s and makes every assertion vacuous).
async function post(path: string, body: unknown = {}, headers: Record<string, string> = {}) {
  const res = await fetch(`${baseUrl}/api/v1/wedm-live${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

describe("POST /api/v1/wedm-live/* (U-WEDM-LIVE-ROUTES)", () => {
  it("anon -> 401 on all four routes", async () => {
    for (const path of ["/safety-envelope", "/autonomy", "/rul", "/maintenance"]) {
      const { status } = await post(path, {}, { "x-test-anon": "1" });
      expect(status, path).toBe(401);
    }
  });

  it("safety-envelope: empty reading -> safe/[] (the ENGINE's own semantics, not fabricated)", async () => {
    const { status, json } = await post("/safety-envelope");
    expect(status).toBe(200);
    expect(json.ok).toBe(true); // DataResponse contract (web/src/api/types.ts): ok, not success
    expect(json.data.level).toBe("safe");
    expect(json.data.score).toBe(1);
    expect(json.data.factors).toEqual([]);
    expect(json.data.violations).toEqual([]);
    expect(typeof json.data.last_updated).toBe("string");
  });

  it("safety-envelope: gap_V below DEFAULT_ENVELOPE min (20) -> critical, score 0, factor fail", async () => {
    const { status, json } = await post("/safety-envelope", { reading: { gap_V: 10 } });
    expect(status).toBe(200);
    expect(json.data.level).toBe("critical");
    expect(json.data.score).toBe(0);
    const factor = json.data.factors.find((f: any) => f.name === "gap_V");
    expect(factor.status).toBe("fail");
    expect(factor.value).toBe(10);
    expect(factor.threshold).toBe(20); // edge-aware: the VIOLATED low bound, not max 80
    expect(json.data.violations.length).toBeGreaterThan(0);
  });

  it("safety-envelope: gap_V in the soft band (22 <= 20+5) -> warning, score 0.7", async () => {
    const { json } = await post("/safety-envelope", { reading: { gap_V: 22 } });
    expect(json.data.level).toBe("warning");
    expect(json.data.score).toBe(0.7);
    expect(json.data.factors.find((f: any) => f.name === "gap_V").status).toBe("warn");
  });

  it("safety-envelope: non-numeric / unknown body keys are NEVER forwarded", async () => {
    const { json } = await post("/safety-envelope", { reading: { gap_V: "not-a-number", evil_key: 1 } });
    expect(json.data.level).toBe("safe"); // nothing valid measured
    expect(json.data.factors).toEqual([]);
  });

  it("autonomy: adapts a SLIMMED snapshot (stripped empty arrays re-defaulted, confidence absent)", async () => {
    // slimResponse strips promotionBlockers:[] and nextLevelRequirements:null -- omit them.
    autonomyResult = {
      currentLevel: 2,
      levelName: "Partial",
      humanRole: "monitor",
      metrics: { errorRate: 1.5, awarenessAdoption: 0.8 },
      eligibleForPromotion: true,
      capabilities: { suggest_params: true, auto_execute: false },
    };
    const { status, json } = await post("/autonomy");
    expect(status).toBe(200);
    expect(json.data.level).toBe(2);
    expect(json.data.level_label).toBe("Partial");
    expect(json.data.can_promote).toBe(true);
    expect(json.data.promote_blocked_by).toEqual([]); // re-defaulted, not undefined
    expect(json.data.active_rules).toEqual(["suggest_params"]); // only enabled capabilities
    expect("confidence" in json.data).toBe(false); // no honest source -> absent, FE renders "--"
  });

  it("autonomy: dispatcher failure (bare {error} from callTool catch) -> 502 clean", async () => {
    autonomyResult = { error: "substrate gate offline" };
    const { status, json } = await post("/autonomy");
    expect(status).toBe(502);
    expect(json.error).toBe("substrate gate offline");
  });

  it("rul: real degradation model -> all 5 tracked components with honest null hours (no usage feed)", async () => {
    const { status, json } = await post("/rul");
    expect(status).toBe(200);
    const comps = json.data.components;
    expect(comps.map((c: any) => c.component).sort()).toEqual([
      "filter_capacity", "filter_clogging", "guide_wear", "wire_erosion", "wire_fatigue",
    ]);
    for (const c of comps) {
      expect(c.rul_pct).toBeGreaterThanOrEqual(0);
      expect(c.rul_pct).toBeLessThanOrEqual(100);
      expect(c.hours_remaining).toBeNull(); // rates={} -> Infinity -> null ("not aging")
      expect(typeof c.label).toBe("string");
      expect(["imminent", "soon", "planned", "healthy"]).toContain(c.band);
    }
    expect(typeof json.data.worst_component).toBe("string");
  });

  it("maintenance: real chain (snapshot -> RUL -> plan) -> FE shape with coherent overdue_count", async () => {
    const { status, json } = await post("/maintenance");
    expect(status).toBe(200);
    expect(Array.isArray(json.data.items)).toBe(true);
    expect(json.data.overdue_count).toBe(json.data.items.filter((i: any) => i.type === "overdue").length);
    for (const item of json.data.items) {
      expect(["scheduled", "predictive", "overdue"]).toContain(item.type);
      expect(["low", "medium", "high", "critical"]).toContain(item.priority);
      expect(Number.isNaN(new Date(item.due_date).getTime())).toBe(false);
    }
    // next_scheduled is the earliest due date, or null when no tasks.
    if (json.data.items.length === 0) expect(json.data.next_scheduled).toBeNull();
    else expect(json.data.next_scheduled).toBe([...json.data.items.map((i: any) => i.due_date)].sort()[0]);
  });

  it("maintenance: a SEEDED degraded component drives a REAL task through the band/priority mapping (non-vacuous)", async () => {
    // Fresh default state -> zero tasks -> the vocab loop above runs zero times; an inverted
    // BAND_TO_TYPE/PRIORITY_LABEL would pass green (arm-B finding). Seed guide_wear at/past
    // capacity so rul=0 -> band imminent -> a task MUST exist and MUST map to overdue.
    wedmDegradationModelEngine.load({ guide_wear: { state: 5, capacity: 1 } });
    try {
      const { status, json } = await post("/maintenance");
      expect(status).toBe(200);
      expect(json.data.items.length).toBeGreaterThan(0);
      const guideItem = json.data.items.find((i: any) => i.component === "Wire Guides");
      expect(guideItem.type).toBe("overdue"); // imminent band -> overdue
      expect(["critical", "high", "medium"]).toContain(guideItem.priority);
      expect(json.data.overdue_count).toBeGreaterThan(0);
      expect(typeof json.data.next_scheduled).toBe("string");

      // The seeded component also flows through /rul with a finite (zero) RUL.
      const rul = await post("/rul");
      const guide = rul.json.data.components.find((c: any) => c.component === "guide_wear");
      expect(guide.hours_remaining).toBe(0);
      expect(guide.band).toBe("imminent");
    } finally {
      // Restore the shared singleton so ordering never leaks into other tests.
      wedmDegradationModelEngine.load({ guide_wear: { state: 0, capacity: 1 } });
    }
  });
});
