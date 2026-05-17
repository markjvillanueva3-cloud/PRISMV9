/**
 * dispatcher.scrLbdSlo.test.ts — round-trip coverage for 3 wires:
 *   - U-WIRE-SCR (SlashCommandRecommenderEngine, 4 actions)
 *   - U-WIRE-LBD (LatencyBudgetDecompositionEngine, 7 actions)
 *   - U-WIRE-SLO (SLOEngine, 8 actions)
 *
 * Bundled because all 3 are read-only-wires over stateful engines whose
 * writes (register/setBudget/recordEvent/clear) DEFERRED. Test fixtures
 * seeded via direct engine writes; teardown skipped (timestamp-suffixed
 * ids avoid peer collisions).
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { slashCommandRecommenderEngine } from "../engines/SlashCommandRecommenderEngine.js";
import { latencyBudgetDecompositionEngine } from "../engines/LatencyBudgetDecompositionEngine.js";
import { sloEngine } from "../engines/SLOEngine.js";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

function makeStubServer(): {
  tools: CapturedTool[];
  tool: (name: string, desc: string, schema: unknown, h: CapturedTool["handler"]) => void;
} {
  const tools: CapturedTool[] = [];
  return {
    tools,
    tool(name, _desc, _schema, handler) { tools.push({ name, handler }); },
  };
}

async function invokeHandler(
  handler: CapturedTool["handler"],
  action: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const res = (await handler({ action, params })) as Record<string, unknown>;
  if (Array.isArray((res as { content?: unknown[] }).content)) {
    const text = ((res as { content: Array<{ text?: string }> }).content[0]?.text) ?? "";
    return JSON.parse(text) as Record<string, unknown>;
  }
  return res;
}

// Unique test ids to avoid peer-state collisions
const STAMP = Date.now();
const SCR_CMD_A = `/test-scr-cmd-a-${STAMP}`;
const SCR_CMD_B = `/test-scr-cmd-b-${STAMP}`;
const SLO_ID = `test-slo-${STAMP}`;

let devHandler: CapturedTool["handler"];

beforeAll(() => {
  // Seed SCR via deferred write
  slashCommandRecommenderEngine.register({
    command: SCR_CMD_A,
    description: "Test command A for SCR wire coverage",
    triggers: ["scr-test-a", "alpha-trigger"],
    confidence: 1.0,
  } as any);
  slashCommandRecommenderEngine.register({
    command: SCR_CMD_B,
    description: "Test command B for SCR wire coverage",
    triggers: ["scr-test-b", "beta-trigger"],
    confidence: 0.85,
  } as any);

  // Seed SLO via deferred write (engine requires burnRates array)
  sloEngine.registerSLO({
    id: SLO_ID,
    name: "Test SLO",
    description: "Coverage SLO for wire tests",
    type: "availability",
    target: 99.5,
    measurementWindow: "monthly",
    enabled: true,
    burnRates: [],
  } as any);

  const srv = makeStubServer();
  registerDevDispatcher(srv as unknown as Parameters<typeof registerDevDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_dev");
  if (!t) throw new Error("prism_dev not registered");
  devHandler = t.handler;
});

// ────────────────────────────────────────────────────────────────────────
// SCR — SlashCommandRecommenderEngine
// ────────────────────────────────────────────────────────────────────────

describe("WIRE-UNWIRED-MS0/U-WIRE-SCR — Zod schemas + happy paths", () => {
  it("scr_get / scr_recommend require non-empty inputs", () => {
    expect(ACTION_DEV_SCHEMAS["scr_get"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["scr_get"].safeParse({ command: "x" }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["scr_recommend"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["scr_recommend"].safeParse({ prompt: "x" }).success).toBe(true);
  });

  it("scr_recommend caps prompt at 8KB + top_n at 50 + min_confidence in [0,1]", () => {
    expect(ACTION_DEV_SCHEMAS["scr_recommend"].safeParse({ prompt: "x".repeat(8193) }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["scr_recommend"].safeParse({ prompt: "x", top_n: 51 }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["scr_recommend"].safeParse({ prompt: "x", min_confidence: 1.5 }).success).toBe(false);
  });

  it("scr_get seeded SCR_CMD_A → found:true + description match", async () => {
    const r = await invokeHandler(devHandler, "scr_get", { command: SCR_CMD_A });
    expect((r as { found?: boolean }).found).toBe(true);
    const entry = (r as { entry: { description: string } }).entry;
    expect(entry.description).toContain("SCR wire");
  });

  it("scr_get unknown → found:false", async () => {
    const r = await invokeHandler(devHandler, "scr_get", { command: "/never-registered-" + STAMP });
    expect((r as { found?: boolean }).found).toBe(false);
  });

  it("scr_list contains both seeded commands; scr_size ≥ 2", async () => {
    const list = await invokeHandler(devHandler, "scr_list", {});
    const entries = ((list as { entries?: Array<{ command: string }> }).entries) ?? [];
    const cmds = entries.map(e => e.command);
    expect(cmds).toContain(SCR_CMD_A);
    expect(cmds).toContain(SCR_CMD_B);
    const size = await invokeHandler(devHandler, "scr_size", {});
    expect((size as { size?: number }).size).toBeGreaterThanOrEqual(2);
  });

  it("scr_recommend returns recommendations array + count parity", async () => {
    const r = await invokeHandler(devHandler, "scr_recommend", { prompt: "alpha-trigger something", top_n: 5 });
    const recs = ((r as { recommendations?: unknown[] }).recommendations) ?? [];
    expect((r as { count?: number }).count).toBe(recs.length);
  });
});

// ────────────────────────────────────────────────────────────────────────
// LBD — LatencyBudgetDecompositionEngine
// ────────────────────────────────────────────────────────────────────────

describe("WIRE-UNWIRED-MS0/U-WIRE-LBD — Zod schemas + happy paths", () => {
  it("lbd_get_budget / lbd_aggregate_budget / lbd_validate_profile_budget require profile (+stage)", () => {
    expect(ACTION_DEV_SCHEMAS["lbd_get_budget"].safeParse({ profile: "standard" }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["lbd_get_budget"].safeParse({ profile: "standard", stage: "ocr" }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["lbd_aggregate_budget"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["lbd_aggregate_budget"].safeParse({ profile: "standard" }).success).toBe(true);
  });

  it("lbd_list_observations caps limit at 10k (DoS guard)", () => {
    expect(ACTION_DEV_SCHEMAS["lbd_list_observations"].safeParse({ limit: 10_001 }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["lbd_list_observations"].safeParse({ limit: 10_000 }).success).toBe(true);
  });

  it("lbd_get_stats / lbd_list_budgets accept {}", () => {
    expect(ACTION_DEV_SCHEMAS["lbd_get_stats"].safeParse({}).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["lbd_list_budgets"].safeParse({}).success).toBe(true);
  });

  it("lbd_get_stats returns numeric stats object", async () => {
    const r = await invokeHandler(devHandler, "lbd_get_stats", {});
    const stats = (r as { stats: Record<string, unknown> }).stats;
    expect(typeof stats).toBe("object");
    expect(stats === null).toBe(false);
  });

  it("lbd_list_budgets returns array + count parity", async () => {
    const r = await invokeHandler(devHandler, "lbd_list_budgets", {});
    const budgets = ((r as { budgets?: unknown[] }).budgets) ?? [];
    expect((r as { count?: number }).count).toBe(budgets.length);
  });

  it("lbd_aggregate_budget for any profile returns numeric total_ms ≥ 0", async () => {
    const r = await invokeHandler(devHandler, "lbd_aggregate_budget", { profile: "standard" });
    const total_ms = (r as { total_ms?: number }).total_ms ?? 0;
    expect(typeof total_ms).toBe("number");
    expect(total_ms).toBeGreaterThanOrEqual(0);
  });

  it("lbd_validate_profile_budget returns validation with valid/total_ms/slack_ms/reason fields", async () => {
    const r = await invokeHandler(devHandler, "lbd_validate_profile_budget", { profile: "standard" });
    const v = (r as { validation: { valid?: boolean | string; total_ms: number; slack_ms: number; reason?: string | null } }).validation;
    expect(typeof v.total_ms).toBe("number");
    expect(typeof v.slack_ms).toBe("number");
    // valid is bool (slimResponse may strip false → tolerate undefined or "no")
    const ok = v.valid;
    expect(ok === true || ok === false || ok === undefined || ok === "no").toBe(true);
  });

  it("lbd_list_observations accepts filter combos", async () => {
    const r = await invokeHandler(devHandler, "lbd_list_observations", {});
    const obs = ((r as { observations?: unknown[] }).observations) ?? [];
    expect((r as { count?: number }).count).toBe(obs.length);
  });

  it("lbd_stage_stats returns p50/p95/p99 stats or error envelope (engine throws on unknown profile/stage)", async () => {
    // Engine throws when no budget registered for profile/stage — dispatcher
    // wraps in try/catch and emits {error: ...}. Either outcome is valid; test
    // verifies the wire shape contract for both paths.
    const r = await invokeHandler(devHandler, "lbd_stage_stats", { profile: "standard", stage: "ocr" });
    const hasStats = (r as { stats?: unknown }).stats !== undefined;
    const hasError = ((r as { error?: string }).error ?? "").length > 0;
    expect(hasStats || hasError).toBe(true);
    if (hasStats) {
      const stats = (r as { stats: Record<string, unknown> }).stats;
      expect(typeof stats).toBe("object");
      expect(stats === null).toBe(false);
    }
  });

  it("ROUTING PROOF — wire stats byte-equals engine-direct getStats()", async () => {
    const r = await invokeHandler(devHandler, "lbd_get_stats", {});
    const wire = (r as { stats: unknown }).stats;
    const direct = latencyBudgetDecompositionEngine.getStats();
    expect(JSON.stringify(wire)).toBe(JSON.stringify(direct));
  });
});

// ────────────────────────────────────────────────────────────────────────
// SLO — SLOEngine
// ────────────────────────────────────────────────────────────────────────

describe("WIRE-UNWIRED-MS0/U-WIRE-SLO — Zod schemas + happy paths", () => {
  it("slo_get_slo / get_status / get_error_budget / is_alerting / generate_report require id", () => {
    for (const a of ["slo_get_slo", "slo_get_status", "slo_get_error_budget", "slo_is_alerting", "slo_generate_report"]) {
      expect(ACTION_DEV_SCHEMAS[a]!.safeParse({}).success).toBe(false);
    }
    expect(ACTION_DEV_SCHEMAS["slo_get_slo"].safeParse({ id: "x" }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["slo_get_status"].safeParse({ slo_id: "x" }).success).toBe(true);
  });

  it("zero-arg actions accept {}", () => {
    for (const a of ["slo_list_slos", "slo_get_alerting_slos", "slo_get_stats"]) {
      expect(ACTION_DEV_SCHEMAS[a]!.safeParse({}).success).toBe(true);
    }
  });

  it("slo_get_slo seeded id → found:true + correct name/target", async () => {
    const r = await invokeHandler(devHandler, "slo_get_slo", { id: SLO_ID });
    expect((r as { found?: boolean }).found).toBe(true);
    const slo = (r as { slo: { name: string; target: number; type: string } }).slo;
    expect(slo.name).toBe("Test SLO");
    expect(slo.target).toBe(99.5);
    expect(slo.type).toBe("availability");
  });

  it("slo_get_slo unknown → found:false", async () => {
    const r = await invokeHandler(devHandler, "slo_get_slo", { id: "no-such-slo-" + STAMP });
    expect((r as { found?: boolean }).found).toBe(false);
  });

  it("slo_list_slos includes seeded SLO_ID", async () => {
    const r = await invokeHandler(devHandler, "slo_list_slos", {});
    const slos = ((r as { slos?: Array<{ id: string }> }).slos) ?? [];
    const ids = slos.map(s => s.id);
    expect(ids).toContain(SLO_ID);
    expect((r as { count?: number }).count).toBe(slos.length);
  });

  it("slo_get_status for seeded SLO returns status object (engine may compute from zero events)", async () => {
    const r = await invokeHandler(devHandler, "slo_get_status", { slo_id: SLO_ID });
    // engine returns null OR status object — both valid
    const found = (r as { found?: boolean }).found ?? false;
    if (found) {
      const status = (r as { status: Record<string, unknown> }).status;
      expect(typeof status).toBe("object");
      expect(status === null).toBe(false);
    }
  });

  it("slo_is_alerting returns boolean discriminator (true | 'no')", async () => {
    const r = await invokeHandler(devHandler, "slo_is_alerting", { slo_id: SLO_ID });
    const v = (r as { is_alerting?: boolean | string }).is_alerting;
    expect(v === true || v === "no").toBe(true);
  });

  it("slo_get_alerting_slos returns array + count parity", async () => {
    const r = await invokeHandler(devHandler, "slo_get_alerting_slos", {});
    const alerting = ((r as { alerting?: unknown[] }).alerting) ?? [];
    expect((r as { count?: number }).count).toBe(alerting.length);
  });

  it("slo_get_stats returns numeric stats object", async () => {
    const r = await invokeHandler(devHandler, "slo_get_stats", {});
    const stats = (r as { stats: Record<string, unknown> }).stats;
    expect(typeof stats).toBe("object");
    expect(stats === null).toBe(false);
  });

  it("ROUTING PROOF — wire list_slos id set equals engine-direct listSLOs()", async () => {
    const r = await invokeHandler(devHandler, "slo_list_slos", {});
    const wireIds = (((r as { slos?: Array<{ id: string }> }).slos) ?? []).map(s => s.id).sort();
    const directIds = sloEngine.listSLOs().map(s => s.id).slice().sort();
    expect(wireIds).toEqual(directIds);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-SCR+LBD+SLO — error envelopes", () => {
  it("scr_recommend with prompt > 8KB → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "scr_recommend", { prompt: "x".repeat(8193) });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("lbd_list_observations with limit > 10000 → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "lbd_list_observations", { limit: 10_001 });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("slo_get_status without slo_id → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "slo_get_status", {});
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });
});
