/**
 * dispatcher.ledgerRetention.test.ts — round-trip coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-LRE dispatcher wiring (LedgerRetentionEngine).
 *
 * Drives 6 pure actions through real `prism_dev`. getTier(Date) NOT wired
 * (Date isn't JSON-serializable over MCP); same semantics available via
 * lre_classify(age_days) + lre_tier_of({at}).
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { ledgerRetentionEngine } from "../engines/LedgerRetentionEngine.js";

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

let devHandler: CapturedTool["handler"];

beforeAll(() => {
  const srv = makeStubServer();
  registerDevDispatcher(srv as unknown as Parameters<typeof registerDevDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_dev");
  if (!t) throw new Error("prism_dev not registered");
  devHandler = t.handler;
});

// Fixed deterministic 'now' for all tier math: 2026-05-17T00:00:00Z
const FROZEN_NOW_ISO = "2026-05-17T00:00:00.000Z";
const FROZEN_NOW_MS = Date.parse(FROZEN_NOW_ISO);
const ONE_DAY = 24 * 60 * 60 * 1000;

describe("WIRE-UNWIRED-MS0/U-WIRE-LRE — Zod schemas", () => {
  it("lre_get_config / lre_get_retention_policy accept {}", () => {
    expect(ACTION_DEV_SCHEMAS["lre_get_config"].safeParse({}).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["lre_get_retention_policy"].safeParse({}).success).toBe(true);
  });

  it("lre_classify rejects negative age_days", () => {
    expect(ACTION_DEV_SCHEMAS["lre_classify"].safeParse({ age_days: -1 }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["lre_classify"].safeParse({ age_days: 0 }).success).toBe(true);
  });

  it("lre_classify caps age at 36500 days (~100 years; DoS guard)", () => {
    expect(ACTION_DEV_SCHEMAS["lre_classify"].safeParse({ age_days: 36501 }).success).toBe(false);
  });

  it("lre_tier_of requires entry with at OR timestamp (refine)", () => {
    expect(ACTION_DEV_SCHEMAS["lre_tier_of"].safeParse({ entry: {} }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["lre_tier_of"].safeParse({ entry: { at: "2026-01-01T00:00:00Z" } }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["lre_tier_of"].safeParse({ entry: { timestamp: "2026-01-01T00:00:00Z" } }).success).toBe(true);
  });

  it("lre_plan caps entries at 50000 (DoS guard)", () => {
    const big = Array.from({ length: 50_001 }, () => ({ at: "2026-01-01T00:00:00Z" }));
    expect(ACTION_DEV_SCHEMAS["lre_plan"].safeParse({ entries: big }).success).toBe(false);
  });

  it("lre_archive_dir_for requires non-empty iso", () => {
    expect(ACTION_DEV_SCHEMAS["lre_archive_dir_for"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["lre_archive_dir_for"].safeParse({ iso: "" }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["lre_archive_dir_for"].safeParse({ iso: "2026-05-17T00:00:00Z" }).success).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-LRE — prism_dev :: lre_get_config + policy", () => {
  it("returns {hotAgeDays, warmAgeDays} config", async () => {
    const r = await invokeHandler(devHandler, "lre_get_config", {});
    const c = (r as { config: { hotAgeDays: number; warmAgeDays: number } }).config;
    expect(typeof c.hotAgeDays).toBe("number");
    expect(typeof c.warmAgeDays).toBe("number");
    expect(c.warmAgeDays).toBeGreaterThanOrEqual(c.hotAgeDays);
  });

  it("returns retention policy with hot.maxDays, warm.maxDays, cold.archivePath", async () => {
    const r = await invokeHandler(devHandler, "lre_get_retention_policy", {});
    const p = (r as { policy: { hot: { maxDays: number }; warm: { maxDays: number }; cold: { archivePath: string } } }).policy;
    expect(typeof p.hot.maxDays).toBe("number");
    expect(typeof p.warm.maxDays).toBe("number");
    expect(p.cold.archivePath).toMatch(/archive/);
  });

  it("ROUTING PROOF — wire config byte-equals engine-direct getConfig()", async () => {
    const r = await invokeHandler(devHandler, "lre_get_config", {});
    const wire = (r as { config: unknown }).config;
    const direct = ledgerRetentionEngine.getConfig();
    expect(JSON.stringify(wire)).toBe(JSON.stringify(direct));
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-LRE — prism_dev :: lre_classify", () => {
  it("age=3 days → hot (default config hotAgeDays=7)", async () => {
    const r = await invokeHandler(devHandler, "lre_classify", { age_days: 3 });
    expect((r as { tier?: string }).tier).toBe("hot");
  });

  it("age=15 days → warm (between hot=7 and warm=30)", async () => {
    const r = await invokeHandler(devHandler, "lre_classify", { age_days: 15 });
    expect((r as { tier?: string }).tier).toBe("warm");
  });

  it("age=90 days → cold (past warm=30)", async () => {
    const r = await invokeHandler(devHandler, "lre_classify", { age_days: 90 });
    expect((r as { tier?: string }).tier).toBe("cold");
  });

  it("VARIABILITY — 3 distinct tiers across age_days={3, 15, 90}", async () => {
    const ages = [3, 15, 90];
    const tiers: Array<string | undefined> = [];
    for (const age_days of ages) {
      const r = await invokeHandler(devHandler, "lre_classify", { age_days });
      tiers.push((r as { tier?: string }).tier);
    }
    expect(new Set(tiers).size).toBe(3);
  });

  it("boundary: age=7 → hot (inclusive upper), age=7.0001 → warm", async () => {
    const a = await invokeHandler(devHandler, "lre_classify", { age_days: 7 });
    const b = await invokeHandler(devHandler, "lre_classify", { age_days: 7.0001 });
    expect((a as { tier?: string }).tier).toBe("hot");
    expect((b as { tier?: string }).tier).toBe("warm");
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-LRE — prism_dev :: lre_tier_of", () => {
  it("entry 3 days old → hot tier with ageDays≈3", async () => {
    const at = new Date(FROZEN_NOW_MS - 3 * ONE_DAY).toISOString();
    const r = await invokeHandler(devHandler, "lre_tier_of", { entry: { at }, now_ms: FROZEN_NOW_MS });
    const t = (r as { tiered: { tier: string; ageDays: number } }).tiered;
    expect(t.tier).toBe("hot");
    expect(t.ageDays).toBeCloseTo(3, 5);
  });

  it("entry 60 days old → cold tier", async () => {
    const at = new Date(FROZEN_NOW_MS - 60 * ONE_DAY).toISOString();
    const r = await invokeHandler(devHandler, "lre_tier_of", { entry: { at }, now_ms: FROZEN_NOW_MS });
    expect((r as { tiered: { tier: string } }).tiered.tier).toBe("cold");
  });

  it("entry with 'timestamp' instead of 'at' also works", async () => {
    const timestamp = new Date(FROZEN_NOW_MS - 15 * ONE_DAY).toISOString();
    const r = await invokeHandler(devHandler, "lre_tier_of", { entry: { timestamp }, now_ms: FROZEN_NOW_MS });
    expect((r as { tiered: { tier: string } }).tiered.tier).toBe("warm");
  });

  it("unparseable timestamp → engine throws → dispatcher emits error envelope", async () => {
    const r = await invokeHandler(devHandler, "lre_tier_of", { entry: { at: "not-an-iso-date" }, now_ms: FROZEN_NOW_MS });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-LRE — prism_dev :: lre_plan", () => {
  it("3 entries spanning all tiers → {hot:1, warm:1, cold:1} + 3 actions", async () => {
    const entries = [
      { at: new Date(FROZEN_NOW_MS - 3 * ONE_DAY).toISOString() },
      { at: new Date(FROZEN_NOW_MS - 15 * ONE_DAY).toISOString() },
      { at: new Date(FROZEN_NOW_MS - 60 * ONE_DAY).toISOString() },
    ];
    const r = await invokeHandler(devHandler, "lre_plan", { entries, now_ms: FROZEN_NOW_MS });
    const p = (r as { plan: { hot: number; warm: number; cold: number; actions: unknown[] } }).plan;
    expect(p.hot).toBe(1);
    expect(p.warm).toBe(1);
    expect(p.cold).toBe(1);
    expect(p.actions.length).toBe(3);
    expect((r as { action_count?: number }).action_count).toBe(3);
  });

  it("empty entries → all-zero counts + 1 unconditional hot action (engine invariant)", async () => {
    // Engine ALWAYS emits the hot action (even count=0) — warm/cold actions only
    // appear when their count > 0. Test reflects the actual engine contract.
    const r = await invokeHandler(devHandler, "lre_plan", { entries: [], now_ms: FROZEN_NOW_MS });
    const p = (r as { plan: { hot: number; warm: number; cold: number; actions: Array<{ tier: string; count: number }> } }).plan;
    expect(p.hot).toBe(0);
    expect(p.warm).toBe(0);
    expect(p.cold).toBe(0);
    expect(p.actions.length).toBe(1);
    expect(p.actions[0]!.tier).toBe("hot");
    expect(p.actions[0]!.count).toBe(0);
    expect((r as { action_count?: number }).action_count).toBe(1);
  });

  it("ROUTING PROOF — wire plan byte-equals engine-direct plan() with frozen now_ms", async () => {
    const entries = [
      { at: new Date(FROZEN_NOW_MS - 5 * ONE_DAY).toISOString() },
      { at: new Date(FROZEN_NOW_MS - 20 * ONE_DAY).toISOString() },
    ];
    const r = await invokeHandler(devHandler, "lre_plan", { entries, now_ms: FROZEN_NOW_MS });
    const wire = (r as { plan: unknown }).plan;
    const direct = ledgerRetentionEngine.plan(entries, FROZEN_NOW_MS);
    expect(JSON.stringify(wire)).toBe(JSON.stringify(direct));
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-LRE — prism_dev :: lre_archive_dir_for", () => {
  it("yields 'YYYY-MM' for valid ISO (engine emits bare subdir name)", async () => {
    // Engine returns the bare 'YYYY-MM' subdir name; the caller (e.g.
    // rotate-ledgers.ts) is responsible for prefixing 'archive/'.
    const r = await invokeHandler(devHandler, "lre_archive_dir_for", { iso: "2026-05-17T00:00:00Z" });
    const dir = (r as { archive_dir?: string }).archive_dir ?? "";
    expect(dir).toBe("2026-05");
  });

  it("ROUTING PROOF — wire archive_dir byte-equals engine-direct archiveDirFor()", async () => {
    const iso = "2026-05-17T00:00:00Z";
    const r = await invokeHandler(devHandler, "lre_archive_dir_for", { iso });
    const wire = (r as { archive_dir?: string }).archive_dir;
    const direct = ledgerRetentionEngine.archiveDirFor(iso);
    expect(wire).toBe(direct);
  });

  it("unparseable iso → engine throws → dispatcher emits error envelope", async () => {
    const r = await invokeHandler(devHandler, "lre_archive_dir_for", { iso: "totally-not-a-date" });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-LRE — error envelope", () => {
  it("lre_classify without age_days → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "lre_classify", {});
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("lre_tier_of with empty entry → schema rejects (refine)", async () => {
    const r = await invokeHandler(devHandler, "lre_tier_of", { entry: {} });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("lre_archive_dir_for without iso → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "lre_archive_dir_for", {});
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });
});
