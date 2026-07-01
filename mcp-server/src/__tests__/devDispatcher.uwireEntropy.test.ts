/**
 * devDispatcher U-WIRE-ENTROPY round-trip tests — EntropyTrackerEngine.
 *
 * Validates the 3 new compute actions (entropy_report / entropy_measure_asset /
 * entropy_recommend) wire through prism_dev and that the engine's Shannon-entropy /
 * Gini / Simpson diversity math behaves per its information-theory contract
 * (MIT 6.050J): a uniform distribution over N categories has normalized entropy 1.0
 * (max diversity); an all-in-one distribution has entropy 0 (full concentration).
 *
 * Pattern: a LIVE dispatcher round-trip (registerDevDispatcher(shim) → capture
 * handler → invoke → assert JSON). The singleton is reset() in beforeEach so the
 * history-dependent round-trip assertions are deterministic; engine-direct value
 * tests use isolated `new EntropyTrackerEngine()` instances.
 *
 * Wired slot:papa 2026-06-13 — continues WIRE-UNWIRED-PAPA (Loki/TenantOnboard/SBOM
 * landed this session; this exposes the asset-diversity metric engine).
 *
 * @milestone WIRE-UNWIRED-PAPA
 * @unit U-WIRE-ENTROPY
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import {
  EntropyTrackerEngine,
  entropyTrackerEngine,
  type AssetDistribution,
  type DomainDistribution,
} from "../engines/EntropyTrackerEngine.js";

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ name, description, schema, handler });
  }
}

async function call(
  server: MockMCPServer,
  action: string,
  params: Record<string, unknown> = {},
): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const tool = server.tools[0]!;
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false; error: string; action: string; dispatcher: string };
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw as unknown as Record<string, unknown> };
  }
  const envelope = raw as { content: { type: string; text: string }[] };
  const text = envelope.content[0]!.text;
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(text); } catch { return { ok: false, data: { rawText: text } }; }
  if (parsed && typeof parsed === "object" && ("engine_error" in parsed || ("error" in parsed && !("success" in parsed)))) {
    return { ok: false, data: parsed };
  }
  return { ok: true, data: parsed };
}

function assetDist(over: Partial<AssetDistribution> = {}): AssetDistribution {
  const base = { engines: 10, actions: 10, formulas: 10, hooks: 10, skills: 10, scripts: 10, dispatchers: 10 };
  const merged = { ...base, ...over };
  const total = (over as { total?: number }).total
    ?? merged.engines + merged.actions + merged.formulas + merged.hooks + merged.skills + merged.scripts + merged.dispatchers;
  return { ...merged, total };
}

function domainDist(over: Partial<DomainDistribution> = {}): DomainDistribution {
  const base = { force: 5, thermal: 5, surface: 5, tool_life: 5, stability: 5, safety: 5, quality: 5, business: 5, cad_cam: 5, infrastructure: 5 };
  const merged = { ...base, ...over };
  const total = (over as { total?: number }).total
    ?? Object.values(merged).reduce((a, b) => a + b, 0);
  return { ...merged, total };
}

let server: MockMCPServer;

beforeEach(() => {
  server = new MockMCPServer();
  registerDevDispatcher(server as unknown as { tool: MockMCPServer["tool"] });
  entropyTrackerEngine.reset(); // clear history for deterministic round-trip
});

// ── Engine-direct reference values (information theory) ──────────────────────
describe("U-WIRE-ENTROPY — Shannon entropy reference values", () => {
  it("a uniform 7-category distribution has normalized entropy 1.0 (max diversity)", () => {
    const m = new EntropyTrackerEngine().measureAssetTypeEntropy(assetDist());
    expect(m.normalizedEntropy).toBeCloseTo(1.0, 5);
    expect(m.maxEntropy).toBeCloseTo(Math.log2(7), 6);
    expect(m.dominantShare).toBeCloseTo(1 / 7, 5);
  });

  it("an all-in-one distribution has entropy 0 (full concentration)", () => {
    const m = new EntropyTrackerEngine().measureAssetTypeEntropy(
      assetDist({ engines: 100, actions: 0, formulas: 0, hooks: 0, skills: 0, scripts: 0, dispatchers: 0 }),
    );
    expect(m.entropy).toBe(0);
    expect(m.normalizedEntropy).toBe(0);
    expect(m.dominantCategory).toBe("engines");
    expect(m.dominantShare).toBe(1);
  });

  it("recommendDiversification flags every under-represented category", () => {
    // engines=100, rest=0 → ideal=100/7≈14.3, half=7.1; all 6 zero cats are below → 6 recs
    const recs = new EntropyTrackerEngine().recommendDiversification(
      assetDist({ engines: 100, actions: 0, formulas: 0, hooks: 0, skills: 0, scripts: 0, dispatchers: 0 }),
    );
    expect(recs.length).toBe(6);
    expect(recs.every(r => /Increase/.test(r))).toBe(true);
  });

  it("a balanced distribution is diverse; a concentrated one is not", () => {
    const e = new EntropyTrackerEngine();
    expect(e.isDiverse(assetDist())).toBe(true);
    expect(e.isDiverse(assetDist({ engines: 100, actions: 0, formulas: 0, hooks: 0, skills: 0, scripts: 0, dispatchers: 0 }))).toBe(false);
  });
});

// ── generateReport: alerts, diversity indices (spanning configs) ────────────
describe("U-WIRE-ENTROPY — full report", () => {
  it("a concentrated distribution raises dominance + low-entropy + Gini alerts", () => {
    const rep = new EntropyTrackerEngine().generateReport(
      assetDist({ engines: 100, actions: 0, formulas: 0, hooks: 0, skills: 0, scripts: 0, dispatchers: 0 }),
      domainDist({ force: 50, thermal: 0, surface: 0, tool_life: 0, stability: 0, safety: 0, quality: 0, business: 0, cad_cam: 0, infrastructure: 0 }),
    );
    expect(rep.alerts.some(a => /dominates/.test(a))).toBe(true);
    expect(rep.diversity.giniIndex).toBeGreaterThan(0.5);
    expect(rep.assetTypeEntropy.normalizedEntropy).toBe(0);
  });

  it("a uniform distribution is healthy with ~7 effective categories and no dominance alert", () => {
    const rep = new EntropyTrackerEngine().generateReport(assetDist(), domainDist());
    expect(rep.diversity.effectiveCategories).toBeCloseTo(7, 1);
    expect(rep.diversity.giniIndex).toBeLessThan(0.1);
    expect(rep.alerts.some(a => /dominates/.test(a))).toBe(false);
  });
});

// ── Adversarial / degenerate inputs ─────────────────────────────────────────
describe("U-WIRE-ENTROPY — adversarial inputs", () => {
  it("an all-zero distribution yields entropy 0 without throwing", () => {
    const e = new EntropyTrackerEngine();
    const zero = assetDist({ engines: 0, actions: 0, formulas: 0, hooks: 0, skills: 0, scripts: 0, dispatchers: 0, total: 0 });
    expect(() => e.measureAssetTypeEntropy(zero)).not.toThrow();
    expect(e.measureAssetTypeEntropy(zero).entropy).toBe(0);
  });

  it("a two-category even split has entropy 1.0 bit (the classic fair-coin result)", () => {
    const m = new EntropyTrackerEngine().measureAssetTypeEntropy(
      assetDist({ engines: 50, actions: 50, formulas: 0, hooks: 0, skills: 0, scripts: 0, dispatchers: 0 }),
    );
    expect(m.entropy).toBeCloseTo(1.0, 6); // H(1/2,1/2) = 1 bit
  });
});

// ── LIVE round-trip through prism_dev (the wire proof) ──────────────────────
describe("U-WIRE-ENTROPY — dispatcher round-trip (prism_dev)", () => {
  it("entropy_measure_asset returns normalized entropy 1.0 for a uniform dist", async () => {
    const r = await call(server, "entropy_measure_asset", { assetDist: assetDist() });
    expect(r.ok).toBe(true);
    expect(r.data.normalizedEntropy as number).toBeCloseTo(1.0, 5);
  });

  it("entropy_report returns a full report whose uniform asset entropy is 1.0", async () => {
    const r = await call(server, "entropy_report", { assetDist: assetDist(), domainDist: domainDist() });
    expect(r.ok).toBe(true);
    expect((r.data.assetTypeEntropy as Record<string, number>).normalizedEntropy).toBeCloseTo(1.0, 5);
    expect((r.data.assetTypeEntropy as Record<string, number>).dominantShare).toBeCloseTo(1 / 7, 5);
    expect((r.data.diversity as Record<string, number>).effectiveCategories).toBeCloseTo(7, 1);
    // NB: alerts:[] for a healthy uniform dist is stripped by slimResponse (empty-array elision,
    // universal across prism dispatchers) — alert behavior is covered by the engine-direct
    // concentrated-dist report test above, not asserted here on the empty path.
  });

  it("entropy_recommend wraps the recommendation list under `recommendations`", async () => {
    const r = await call(server, "entropy_recommend", {
      assetDist: assetDist({ engines: 100, actions: 0, formulas: 0, hooks: 0, skills: 0, scripts: 0, dispatchers: 0 }),
    });
    expect(r.ok).toBe(true);
    expect((r.data.recommendations as string[]).length).toBe(6);
  });

  it("total is auto-filled when omitted (caller need not pre-sum)", async () => {
    // pass assetDist WITHOUT total — dispatcher computes it; uniform → normalized 1.0
    const noTotal = { engines: 10, actions: 10, formulas: 10, hooks: 10, skills: 10, scripts: 10, dispatchers: 10 };
    const r = await call(server, "entropy_measure_asset", { assetDist: noTotal });
    expect(r.ok).toBe(true);
    expect(r.data.normalizedEntropy as number).toBeCloseTo(1.0, 5);
  });

  it("all 3 entropy_* actions are accepted by the registered dispatcher", async () => {
    const calls: Array<[string, Record<string, unknown>]> = [
      ["entropy_report", { assetDist: assetDist(), domainDist: domainDist() }],
      ["entropy_measure_asset", { assetDist: assetDist() }],
      ["entropy_recommend", { assetDist: assetDist() }],
    ];
    for (const [action, params] of calls) {
      const r = await call(server, action, params);
      expect(r.ok, `${action} should succeed`).toBe(true);
    }
  });
});

// ── Schema validation through the dispatcher (adversarial) ──────────────────
describe("U-WIRE-ENTROPY — schema rejection (prism_dev)", () => {
  it("entropy_report rejects a missing domainDist", async () => {
    const r = await call(server, "entropy_report", { assetDist: assetDist() });
    expect(r.ok).toBe(false);
  });

  it("entropy_measure_asset rejects a negative count", async () => {
    const r = await call(server, "entropy_measure_asset", {
      assetDist: { engines: -1, actions: 10, formulas: 10, hooks: 10, skills: 10, scripts: 10, dispatchers: 10 },
    });
    expect(r.ok).toBe(false);
  });

  it("entropy_measure_asset rejects a missing required field (hooks)", async () => {
    const r = await call(server, "entropy_measure_asset", {
      assetDist: { engines: 10, actions: 10, formulas: 10, skills: 10, scripts: 10, dispatchers: 10 },
    });
    expect(r.ok).toBe(false);
  });
});
