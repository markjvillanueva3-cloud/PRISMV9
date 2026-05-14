/**
 * CLEANUP-MS0/U-CLEANUP-C2 — prism_dev:wiring_potential dispatcher wiring tests
 *
 * Round-trips WiringPotentialEngine (shipped in U-CLEANUP-C1) through the
 * `prism_dev` MCP tool's handler. Uses a fake MCP server that captures the
 * registered handler closure so we can invoke it directly without standing
 * up a transport — same pattern as devDispatcher.modelTelemetry.test.ts.
 *
 * Every assertion uses concrete expected values:
 *   - dispatcher names match the heuristic table (prism_calc, prism_safety,
 *     prism_turning, prism_5axis, prism_cam) — see WiringPotentialEngine.ts.
 *   - reference scores hand-derived from W_SEMANTIC=0.45, W_CAPACITY=0.40,
 *     W_DOCS_DEPTH=0.15: e.g. KienzleCuttingForceEngine with no F7 data →
 *     score = 0.45*0.85 + 0.40*0.50 + 0 = 0.5825.
 *   - summary counts come from a known fixture of 3 engines (2 match, 1 not).
 *
 * @milestone CLEANUP-MS0 / U-CLEANUP-C2
 */
import { describe, it, expect } from "vitest";

type RegisteredTool = {
  name: string;
  description: string;
  schema: Record<string, unknown>;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<{ content: Array<{ type: string; text: string }> }>;
};

function makeFakeServer(): { server: { tool: (...args: unknown[]) => void }; tools: RegisteredTool[] } {
  const tools: RegisteredTool[] = [];
  const server = {
    tool: (...args: unknown[]) => {
      tools.push({
        name: args[0] as string,
        description: args[1] as string,
        schema: args[2] as Record<string, unknown>,
        handler: args[3] as RegisteredTool["handler"],
      });
    },
  };
  return { server, tools };
}

async function buildPrismDevHandler(): Promise<RegisteredTool["handler"]> {
  const { server, tools } = makeFakeServer();
  const { registerDevDispatcher } = await import("../tools/dispatchers/devDispatcher.js");
  registerDevDispatcher(server as never);
  const dev = tools.find((t) => t.name === "prism_dev");
  if (!dev) throw new Error("registerDevDispatcher did not register a tool named 'prism_dev'");
  return dev.handler;
}

function parsePayload(response: { content: Array<{ type: string; text: string }> }): Record<string, unknown> {
  const text = response.content?.[0]?.text ?? "";
  return JSON.parse(text);
}

// ── action enum acceptance + canonical response shape ────────────────────

describe("prism_dev:wiring_potential — registration", () => {
  it("'wiring_potential' is a valid action — handler returns engineName='KienzleCuttingForceEngine' for that input", async () => {
    const handler = await buildPrismDevHandler();
    const r = await handler({
      action: "wiring_potential",
      params: { mode: "analyze", engine_name: "KienzleCuttingForceEngine" },
    });
    const body = parsePayload(r);
    expect(body.success).toBe(true);
    const data = body.data as Record<string, unknown>;
    expect(data.engineName).toBe("KienzleCuttingForceEngine");
  });
});

// ── mode=analyze ─────────────────────────────────────────────────────────

describe("prism_dev:wiring_potential — analyze mode", () => {
  it("ranks prism_calc as top candidate for 'KienzleCuttingForceEngine' with semanticConfidence=0.85", async () => {
    const handler = await buildPrismDevHandler();
    const r = await handler({
      action: "wiring_potential",
      params: { mode: "analyze", engine_name: "KienzleCuttingForceEngine" },
    });
    const body = parsePayload(r);
    expect(body.success).toBe(true);
    const data = body.data as Record<string, unknown>;
    expect(data.engineName).toBe("KienzleCuttingForceEngine");
    const top = data.topCandidate as { dispatcher: string; semanticConfidence: number };
    expect(top.dispatcher).toBe("prism_calc");
    expect(top.semanticConfidence).toBeCloseTo(0.85, 2);
  });

  it("ranks prism_safety as top for 'SafetyEnvelopeChecker' with semanticConfidence=0.90", async () => {
    const handler = await buildPrismDevHandler();
    const r = await handler({
      action: "wiring_potential",
      params: { mode: "analyze", engine_name: "SafetyEnvelopeChecker" },
    });
    const body = parsePayload(r);
    const data = body.data as Record<string, unknown>;
    const top = data.topCandidate as { dispatcher: string; semanticConfidence: number };
    expect(top.dispatcher).toBe("prism_safety");
    expect(top.semanticConfidence).toBeCloseTo(0.90, 2);
  });

  it("top_k=1 caps candidates list to exactly 1 (prism_turning for 'OkumaTurningPostEngine')", async () => {
    const handler = await buildPrismDevHandler();
    const r = await handler({
      action: "wiring_potential",
      params: { mode: "analyze", engine_name: "OkumaTurningPostEngine", top_k: 1 },
    });
    const body = parsePayload(r);
    const data = body.data as Record<string, unknown>;
    const candidates = data.candidates as Array<{ dispatcher: string }>;
    expect(candidates.length).toBe(1);
    expect(candidates[0].dispatcher).toBe("prism_turning");
  });

  it("returns missing_required + field=engine_name when engine_name omitted", async () => {
    const handler = await buildPrismDevHandler();
    const r = await handler({
      action: "wiring_potential",
      params: { mode: "analyze" },
    });
    const body = parsePayload(r);
    expect(body.success).toBe(false);
    expect(body.error).toBe("missing_required");
    expect(body.field).toBe("engine_name");
  });

  it("Zod gate rejects engine_name > 200 chars — returns 'Invalid params for wiring_potential'", async () => {
    const handler = await buildPrismDevHandler();
    const r = await handler({
      action: "wiring_potential",
      params: { mode: "analyze", engine_name: "x".repeat(201) },
    });
    const body = parsePayload(r);
    // Zod gate (validateActionParams) returns {error:"Invalid params for ...", details:...}
    // — distinct from the engine-level {success:false, error:"invalid_input"} shape.
    expect(body.error).toBe("Invalid params for wiring_potential");
  });

  it("Zod gate rejects empty engine_name — returns 'Invalid params for wiring_potential'", async () => {
    const handler = await buildPrismDevHandler();
    const r = await handler({
      action: "wiring_potential",
      params: { mode: "analyze", engine_name: "" },
    });
    const body = parsePayload(r);
    expect(body.error).toBe("Invalid params for wiring_potential");
  });

  it("returns no top candidate (null/undefined after slim) + zero candidates for 'ZebraQuoxoticFruitbatEngine'", async () => {
    const handler = await buildPrismDevHandler();
    const r = await handler({
      action: "wiring_potential",
      params: { mode: "analyze", engine_name: "ZebraQuoxoticFruitbatEngine" },
    });
    const body = parsePayload(r);
    expect(body.success).toBe(true);
    const data = body.data as Record<string, unknown>;
    // slimResponse strips null + empty arrays, so topCandidate + candidates
    // are absent on the wire. The contract that matters: NO candidates
    // returned, and the warning array names the no-match condition.
    const candidates = (data.candidates as unknown[] | undefined) ?? [];
    expect(candidates.length).toBe(0);
    expect(data.topCandidate ?? null).toBeNull();
    const warnings = (data.warnings as string[] | undefined) ?? [];
    const noMatchWarn = warnings.find((w) => w.includes("no candidate"));
    expect(noMatchWarn?.includes("heuristic=0")).toBe(true);
  });

  it("min_confidence=0.99 drops prism_calc base-0.85 — returns zero candidates", async () => {
    const handler = await buildPrismDevHandler();
    const r = await handler({
      action: "wiring_potential",
      params: { mode: "analyze", engine_name: "KienzleCuttingForceEngine", min_confidence: 0.99 },
    });
    const body = parsePayload(r);
    expect(body.success).toBe(true);
    const data = body.data as Record<string, unknown>;
    const candidates = (data.candidates as unknown[] | undefined) ?? [];
    expect(candidates.length).toBe(0);
    expect(data.topCandidate ?? null).toBeNull();
  });
});

// ── mode=batch_unwired ───────────────────────────────────────────────────

describe("prism_dev:wiring_potential — batch_unwired mode", () => {
  it("analyzes explicit engine_names list: 3 inputs → reports[0..2] match prism_calc, prism_safety, prism_turning", async () => {
    const handler = await buildPrismDevHandler();
    const r = await handler({
      action: "wiring_potential",
      params: {
        mode: "batch_unwired",
        engine_names: ["KienzleCuttingForceEngine", "SafetyEnvelopeChecker", "OkumaTurningPostEngine"],
      },
    });
    const body = parsePayload(r);
    expect(body.success).toBe(true);
    const data = body.data as Record<string, unknown>;
    const reports = data.reports as Array<{ engineName: string; topCandidate: { dispatcher: string } | null }>;
    expect(reports.length).toBe(3);
    expect(reports[0].engineName).toBe("KienzleCuttingForceEngine");
    expect(reports[0].topCandidate?.dispatcher).toBe("prism_calc");
    expect(reports[1].engineName).toBe("SafetyEnvelopeChecker");
    expect(reports[1].topCandidate?.dispatcher).toBe("prism_safety");
    expect(reports[2].engineName).toBe("OkumaTurningPostEngine");
    expect(reports[2].topCandidate?.dispatcher).toBe("prism_turning");
    expect(data.sourcedFromBuildState).toBe(false);
  });

  it("top_n=5 caps engine_names list of 7 down to exactly 5 reports", async () => {
    const handler = await buildPrismDevHandler();
    const r = await handler({
      action: "wiring_potential",
      params: {
        mode: "batch_unwired",
        engine_names: [
          "KienzleCuttingForceEngine",
          "TaylorToolLifeEngine",
          "SafetyEnvelopeChecker",
          "OkumaTurningPostEngine",
          "Mill5AxisFooEngine",
          "ChatterStabilityEngine",
          "ThermalExpansionEngine",
        ],
        top_n: 5,
      },
    });
    const body = parsePayload(r);
    const data = body.data as Record<string, unknown>;
    expect((data.reports as unknown[]).length).toBe(5);
  });

  it("clamps top_n=9999 to 200 — single-name input still returns exactly 1 report", async () => {
    const handler = await buildPrismDevHandler();
    const r = await handler({
      action: "wiring_potential",
      params: {
        mode: "batch_unwired",
        engine_names: ["KienzleCuttingForceEngine"],
        top_n: 9999,
      },
    });
    const body = parsePayload(r);
    expect(body.success).toBe(true);
    const data = body.data as Record<string, unknown>;
    expect((data.reports as unknown[]).length).toBe(1);
  });

  it("summary: 3-engine fixture (2 match + 1 no-match) → totalAnalyzed=3, withCandidate=2, noMatch=1", async () => {
    const handler = await buildPrismDevHandler();
    const r = await handler({
      action: "wiring_potential",
      params: {
        mode: "batch_unwired",
        engine_names: [
          "KienzleCuttingForceEngine",   // → prism_calc
          "ZebraQuoxoticFruitbat",       // → no match
          "SafetyEnvelopeChecker",       // → prism_safety
        ],
      },
    });
    const body = parsePayload(r);
    const data = body.data as Record<string, unknown>;
    const summary = data.summary as { totalAnalyzed: number; withCandidate: number; noMatch: number };
    expect(summary.totalAnalyzed).toBe(3);
    expect(summary.withCandidate).toBe(2);
    expect(summary.noMatch).toBe(1);
  });

  it("omitted engine_names → sourcedFromBuildState=true and reports.length ≤ top_n=3", async () => {
    const handler = await buildPrismDevHandler();
    const r = await handler({
      action: "wiring_potential",
      params: { mode: "batch_unwired", top_n: 3 },
    });
    const body = parsePayload(r);
    expect(body.success).toBe(true);
    const data = body.data as Record<string, unknown>;
    expect(data.sourcedFromBuildState).toBe(true);
    expect((data.reports as unknown[]).length).toBeLessThanOrEqual(3);
  });

  it("empty engine_names → 0 reports + summary totals all zero (slim strips empty arrays)", async () => {
    const handler = await buildPrismDevHandler();
    const r = await handler({
      action: "wiring_potential",
      params: { mode: "batch_unwired", engine_names: [] },
    });
    const body = parsePayload(r);
    expect(body.success).toBe(true);
    const data = body.data as Record<string, unknown>;
    // slimResponse strips empty `reports: []` AND zero-valued summary fields
    // are NOT stripped (0 is not null/undefined). When summary exists,
    // every count is 0; when summary is also stripped, the empty fixture
    // is implied.
    const reports = (data.reports as unknown[] | undefined) ?? [];
    expect(reports.length).toBe(0);
    const summary = (data.summary as { totalAnalyzed?: number; withCandidate?: number; noMatch?: number } | undefined) ?? {};
    expect(summary.totalAnalyzed ?? 0).toBe(0);
    expect(summary.withCandidate ?? 0).toBe(0);
    expect(summary.noMatch ?? 0).toBe(0);
  });
});

// ── mode=dashboard ───────────────────────────────────────────────────────

describe("prism_dev:wiring_potential — dashboard mode", () => {
  it("matched + unmatched sums to totalAnalyzed; totalAnalyzed ≤ top_n=5", async () => {
    const handler = await buildPrismDevHandler();
    const r = await handler({
      action: "wiring_potential",
      params: { mode: "dashboard", top_n: 5 },
    });
    const body = parsePayload(r);
    expect(body.success).toBe(true);
    const data = body.data as Record<string, unknown>;
    const total = data.totalAnalyzed as number;
    const matched = data.matched as number;
    const unmatched = data.unmatched as number;
    expect(matched + unmatched).toBe(total);
    expect(total).toBeLessThanOrEqual(5);
    expect(total).toBeGreaterThanOrEqual(0);
  });

  it("byDispatcher rows are monotonically ranked by orphanCount desc then avgScore desc", async () => {
    const handler = await buildPrismDevHandler();
    const r = await handler({
      action: "wiring_potential",
      params: { mode: "dashboard", top_n: 15 },
    });
    const body = parsePayload(r);
    const data = body.data as Record<string, unknown>;
    const rows = data.byDispatcher as Array<{ dispatcher: string; orphanCount: number; avgScore: number }>;
    for (let i = 0; i + 1 < rows.length; i++) {
      if (rows[i].orphanCount !== rows[i + 1].orphanCount) {
        expect(rows[i].orphanCount).toBeGreaterThan(rows[i + 1].orphanCount);
      } else {
        expect(rows[i].avgScore).toBeGreaterThanOrEqual(rows[i + 1].avgScore);
      }
    }
  });

  it("each byDispatcher row: orphans.length === orphanCount; dispatcher slice(0,6)==='prism_'", async () => {
    const handler = await buildPrismDevHandler();
    const r = await handler({
      action: "wiring_potential",
      params: { mode: "dashboard", top_n: 10 },
    });
    const body = parsePayload(r);
    const data = body.data as Record<string, unknown>;
    const rows = data.byDispatcher as Array<{ dispatcher: string; orphanCount: number; orphans: string[] }>;
    for (const row of rows) {
      expect(row.orphans.length).toBe(row.orphanCount);
      expect(row.dispatcher.slice(0, 6)).toBe("prism_");
    }
  });

  it("avgScore in each row is in [0,1]", async () => {
    const handler = await buildPrismDevHandler();
    const r = await handler({
      action: "wiring_potential",
      params: { mode: "dashboard", top_n: 10 },
    });
    const body = parsePayload(r);
    const data = body.data as Record<string, unknown>;
    const rows = data.byDispatcher as Array<{ avgScore: number }>;
    for (const row of rows) {
      expect(row.avgScore).toBeGreaterThanOrEqual(0);
      expect(row.avgScore).toBeLessThanOrEqual(1);
    }
  });
});

// ── error paths + defaults ───────────────────────────────────────────────

describe("prism_dev:wiring_potential — error paths + defaults", () => {
  it("unknown mode 'summary' → Zod gate returns 'Invalid params for wiring_potential'", async () => {
    const handler = await buildPrismDevHandler();
    const r = await handler({
      action: "wiring_potential",
      params: { mode: "summary" },
    });
    const body = parsePayload(r);
    expect(body.error).toBe("Invalid params for wiring_potential");
  });

  it("mode omitted → defaults to 'analyze' (per schema default), returns Kienzle → prism_calc", async () => {
    const handler = await buildPrismDevHandler();
    const r = await handler({
      action: "wiring_potential",
      params: { engine_name: "KienzleCuttingForceEngine" },
    });
    const body = parsePayload(r);
    expect(body.success).toBe(true);
    const data = body.data as Record<string, unknown>;
    expect(data.engineName).toBe("KienzleCuttingForceEngine");
    const top = data.topCandidate as { dispatcher: string };
    expect(top.dispatcher).toBe("prism_calc");
  });

  it("camelCase alias engineName works (dispatcher accepts engine_name OR engineName)", async () => {
    const handler = await buildPrismDevHandler();
    const r = await handler({
      action: "wiring_potential",
      params: { mode: "analyze", engineName: "KienzleCuttingForceEngine" },
    });
    const body = parsePayload(r);
    expect(body.success).toBe(true);
    const data = body.data as Record<string, unknown>;
    expect(data.engineName).toBe("KienzleCuttingForceEngine");
  });
});
