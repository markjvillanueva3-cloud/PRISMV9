/**
 * sfc_parameter_refinement_compute — calcDispatcher wiring test
 * =============================================================
 * OSCAR-SFC-SELFLEARN-WIRE (bravo, 2026-06-11): wires the orphan
 * `SFCParameterRefinementEngine` (false `// WIRE-EXEMPT` marker; zero real
 * callers) into `prism_calc:sfc_parameter_refinement_compute`.
 *
 * The engine reads shop-floor actuals off the disk-backed OutcomeCaptureBus
 * SINGLETON and computes median+IQR multiplicative correction factors per
 * machine/material context. To round-trip THROUGH the dispatcher without
 * polluting the production `state/outcomes/` shards, we monkeypatch the
 * singleton's `query()` to return in-memory fixtures (the established repo
 * pattern — see CADExecutionOutcomeBusEngine.test.ts), mirroring the engine's
 * own `mkBus` filter logic (kind ? filter : all), then restore in `finally`.
 *
 * Every assertion is a concrete numeric/string value — the median/IQR/
 * confidence math is reproduced from the engine's own test suite, but here
 * the value must survive the dispatcher → engine → singleton.query() path.
 */

import { describe, it, expect } from "vitest";
import { registerCalcDispatcher } from "../tools/dispatchers/calcDispatcher.js";
import { outcomeCaptureBusEngine } from "../engines/OutcomeCaptureBusEngine.js";
import { sfcParameterRefinementEngine } from "../engines/SFCParameterRefinementEngine.js";
import type { OutcomeEvent } from "../schemas/outcomeEventSchema.js";

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params: Record<string, unknown> }) => Promise<{ content?: Array<{ text: string }> } | unknown>;
}

function createMockServer(): { server: { tool: (n: string, d: string, s: unknown, h: CapturedTool["handler"]) => void }; tools: CapturedTool[] } {
  const tools: CapturedTool[] = [];
  const server = {
    tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
      tools.push({ name, description, schema, handler });
    },
  };
  return { server, tools };
}

async function callAction(tool: CapturedTool, action: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  const result = await tool.handler({ action, params });
  const r = result as { content?: Array<{ text: string }> };
  const text = r?.content?.[0]?.text;
  return text ? (JSON.parse(text) as Record<string, unknown>) : (result as Record<string, unknown>);
}

const { server, tools } = createMockServer();
registerCalcDispatcher(server);
const calc = tools[0];

// --- fixture builders (cloned from SFCParameterRefinementEngine.test.ts) ----

let _seq = 0;
function mkEvent(partial: Partial<OutcomeEvent>): OutcomeEvent {
  return {
    schemaVersion: "1.1.0",
    event_id: partial.event_id ?? "evt-" + (_seq++).toString(36),
    lineage_id: partial.lineage_id ?? "lin-default",
    domain: partial.domain ?? "speed_feed",
    kind: partial.kind ?? "operator_override",
    severity: partial.severity ?? "info",
    source: partial.source ?? "operator",
    timestamp: partial.timestamp ?? "2026-05-19T00:00:00.000Z",
    agent_id: partial.agent_id,
    context: partial.context ?? {},
    recommended: partial.recommended,
    actual: partial.actual,
    delta: partial.delta,
    confidence: partial.confidence,
    note: partial.note,
    numeric_features: partial.numeric_features,
  } as OutcomeEvent;
}

function mkRecAndOverride(args: {
  lineageId: string;
  recommendedSfm: number;
  actualSfm: number;
  material?: string;
  machine_id?: string;
}): [OutcomeEvent, OutcomeEvent] {
  const ctx = { material: args.material ?? "D2", machine_id: args.machine_id ?? "M-08" };
  const rec = mkEvent({
    lineage_id: args.lineageId,
    kind: "recommendation_emitted",
    source: "system",
    context: ctx,
    recommended: { summary: { sfm: args.recommendedSfm }, raw: { sfm: args.recommendedSfm } },
    timestamp: "2026-05-19T12:00:00.000Z",
  });
  const ovr = mkEvent({
    lineage_id: args.lineageId,
    kind: "operator_override",
    source: "operator",
    context: ctx,
    actual: { sfm: args.actualSfm },
    timestamp: "2026-05-19T12:00:00.000Z",
  });
  return [rec, ovr];
}

/**
 * Run `fn` with the SINGLETON bus's `query` temporarily replaced by an
 * in-memory fixture reader (mirrors the engine's own mkBus: kind ? filter :
 * all; `since_iso` is intentionally ignored so fixture dates never matter).
 * Restores the original in `finally` even if `fn` throws → zero disk writes,
 * zero cross-test leakage. `angry` makes the patched query throw (bus_error).
 */
async function withSeededBus<T>(
  events: OutcomeEvent[],
  fn: () => Promise<T>,
  opts: { angry?: boolean } = {},
): Promise<T> {
  const orig = outcomeCaptureBusEngine.query;
  (outcomeCaptureBusEngine as unknown as { query: unknown }).query = (q: { kind?: string }) => {
    if (opts.angry) throw new Error("simulated disk full");
    const sorted = [...events].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    const filtered = q?.kind ? sorted.filter((e) => e.kind === q.kind) : sorted;
    return { events: filtered, truncated: false };
  };
  try {
    return await fn();
  } finally {
    (outcomeCaptureBusEngine as unknown as { query: typeof orig }).query = orig;
  }
}

function sixNinetyPercentPairs(): OutcomeEvent[] {
  const out: OutcomeEvent[] = [];
  for (let i = 1; i <= 6; i++) {
    const [rec, ovr] = mkRecAndOverride({ lineageId: `L${i}`, recommendedSfm: 300, actualSfm: 270 }); // 0.9×
    out.push(rec, ovr);
  }
  return out;
}

describe("sfc_parameter_refinement_compute — wiring", () => {
  // ---- HAPPY 1: factors reach the caller through the dispatcher ----
  it("6 paired actuals (270/300=0.9): sfmFactor≈0.9, sampleSize=6, confidence≈0.3 via dispatcher", async () => {
    const res = await withSeededBus(sixNinetyPercentPairs(), () =>
      callAction(calc, "sfc_parameter_refinement_compute", { context: { material: "D2", machine_id: "M-08" } }),
    );
    expect(res.success).toBe(true);
    expect(res.ok).toBe(true);
    const factors = res.factors as Record<string, number>;
    expect(factors.sfmFactor).toBeCloseTo(0.9, 10);
    expect(factors.fzFactor).toBe(1);
    expect(res.sampleSize).toBe(6);
    expect(res.confidence as number).toBeCloseTo(0.3, 10); // min(1,6/20)×exp(-0/0.5)
    expect((res.perMetricSamples as Record<string, number>).sfmFactor).toBe(6);
    // hashContext sorts keys alphabetically: machine_id < material (…c… < …t…).
    expect(res.contextMatchHash).toBe("ctx:machine_id=M-08|material=D2");
  });

  // ---- HAPPY 2: dispatcher result matches direct engine call (round-trip parity) ----
  it("dispatcher result equals direct engine call on the deterministic fields (lazy-import parity)", async () => {
    const fixtures = sixNinetyPercentPairs();
    const { direct, viaDispatcher } = await withSeededBus(fixtures, async () => {
      const direct = sfcParameterRefinementEngine.computeRefinement({ context: { material: "D2", machine_id: "M-08" } });
      const viaDispatcher = await callAction(calc, "sfc_parameter_refinement_compute", { context: { material: "D2", machine_id: "M-08" } });
      return { direct, viaDispatcher };
    });
    if (!direct.ok) throw new Error("fixture should produce ok:true");
    expect(viaDispatcher.ok).toBe(true);
    // computedAtIso uses real Date.now() and may differ by ms between the two calls — compare the deterministic fields.
    expect((viaDispatcher.factors as Record<string, number>).sfmFactor).toBe(direct.factors.sfmFactor);
    expect(viaDispatcher.sampleSize).toBe(direct.sampleSize);
    expect(viaDispatcher.confidence).toBe(direct.confidence);
    expect(viaDispatcher.contextMatchHash).toBe(direct.contextMatchHash);
    expect((viaDispatcher.evidenceLineageIds as string[]).sort()).toEqual([...direct.evidenceLineageIds].sort());
  });

  // ---- FAILURE 1: empty evidence → ok:false no_evidence (success:true = action ran) ----
  it("empty bus → success:true, ok:false, reason='no_evidence', sampleSize=0", async () => {
    const res = await withSeededBus([], () =>
      callAction(calc, "sfc_parameter_refinement_compute", { context: { material: "D2" } }),
    );
    expect(res.success).toBe(true);
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("no_evidence");
    expect(res.sampleSize).toBe(0);
  });

  // ---- FAILURE 2: below minSamples ----
  it("3 pairs with default minSamples=5 → ok:false, reason='below_min_samples', sampleSize=3", async () => {
    const fixtures = [
      mkRecAndOverride({ lineageId: "L1", recommendedSfm: 300, actualSfm: 285 }),
      mkRecAndOverride({ lineageId: "L2", recommendedSfm: 300, actualSfm: 280 }),
      mkRecAndOverride({ lineageId: "L3", recommendedSfm: 300, actualSfm: 290 }),
    ].flat();
    const res = await withSeededBus(fixtures, () =>
      callAction(calc, "sfc_parameter_refinement_compute", { context: { material: "D2", machine_id: "M-08" } }),
    );
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("below_min_samples");
    expect(res.sampleSize).toBe(3);
    expect(res.message).toContain("sampleSize=3 < minSamples=5");
  });

  // ---- FAILURE 3: bus throws → bus_error surfaced, message names the failure ----
  it("singleton bus.query() throws → ok:false, reason='bus_error', message names the failure", async () => {
    const res = await withSeededBus([], () =>
      callAction(calc, "sfc_parameter_refinement_compute", { context: { material: "D2" } }),
    { angry: true });
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("bus_error");
    expect(res.message).toContain("simulated disk full");
  });

  // ---- ADVERSARIAL 1: missing/invalid context → dispatcher guard rejects with a usable message (no crash) ----
  it("missing context → success:false guard error; non-object context (array) → guard error too", async () => {
    const noCtx = await callAction(calc, "sfc_parameter_refinement_compute", {});
    expect(noCtx.success).toBe(false);
    expect(noCtx.error as string).toContain("context (object) is required");
    const arrCtx = await callAction(calc, "sfc_parameter_refinement_compute", { context: ["D2"] });
    expect(arrCtx.success).toBe(false);
    expect(arrCtx.error as string).toContain("context (object) is required");
  });

  // ---- ADVERSARIAL 2: the hard safety clamp survives the wire ----
  it("8× ratio with maxFactor=2 → sfmFactor clamped to exactly 2 through the dispatcher (safety band intact)", async () => {
    const fixtures: OutcomeEvent[] = [];
    for (let i = 1; i <= 6; i++) {
      const [rec, ovr] = mkRecAndOverride({ lineageId: `L${i}`, recommendedSfm: 100, actualSfm: 800 }); // ratio 8
      fixtures.push(rec, ovr);
    }
    const res = await withSeededBus(fixtures, () =>
      callAction(calc, "sfc_parameter_refinement_compute", { context: { material: "D2", machine_id: "M-08" }, maxFactor: 2 }),
    );
    expect(res.ok).toBe(true);
    expect((res.factors as Record<string, number>).sfmFactor).toBe(2);
  });

  // ---- ADVERSARIAL 3: injection-hole proof — params.bus is NOT forwarded ----
  it("a forged params.bus is IGNORED — result reflects the seeded singleton (0.9), not the injected fake (2.0)", async () => {
    // The seeded singleton returns 0.9× ratios. A malicious caller passes a fake `bus` whose query would yield
    // 2.0× ratios. If the dispatcher forwarded params.bus the result would be 2.0 — proving the hole. It must be 0.9.
    const forgedBus = {
      query: (q: { kind?: string }) => {
        const ctx = { material: "D2", machine_id: "M-08" };
        const evs: OutcomeEvent[] = [];
        for (let i = 1; i <= 6; i++) {
          evs.push(
            mkEvent({ lineage_id: `H${i}`, kind: "recommendation_emitted", context: ctx, recommended: { summary: { sfm: 100 } } }),
            mkEvent({ lineage_id: `H${i}`, kind: "operator_override", context: ctx, actual: { sfm: 200 } }), // 2.0×
          );
        }
        const filtered = q?.kind ? evs.filter((e) => e.kind === q.kind) : evs;
        return { events: filtered, truncated: false };
      },
    };
    const res = await withSeededBus(sixNinetyPercentPairs(), () =>
      callAction(calc, "sfc_parameter_refinement_compute", {
        context: { material: "D2", machine_id: "M-08" },
        bus: forgedBus, // must be stripped by the dispatcher
      }),
    );
    expect(res.ok).toBe(true);
    expect((res.factors as Record<string, number>).sfmFactor).toBeCloseTo(0.9, 10); // seeded singleton, NOT the forged 2.0
  });

  // ---- ADVERSARIAL 4: out-of-band tuning param passes the dispatcher typeof guard but the engine zod REJECTS it ----
  it("maxFactor=5 (> HARD_SAFETY_BAND_MAX=4) → ok:false, reason='invalid_context' (engine zod survives the wire, no silent clamp)", async () => {
    // maxFactor is a number so the dispatcher's typeof-object guard on `context` doesn't catch it; the engine's
    // SFCInputSchema (.max(4.0)) must reject it rather than silently clamping past the safety band. Validation
    // happens before any bus query, so the seeded bus is irrelevant here.
    const res = await withSeededBus(sixNinetyPercentPairs(), () =>
      callAction(calc, "sfc_parameter_refinement_compute", { context: { material: "D2", machine_id: "M-08" }, maxFactor: 5 }),
    );
    expect(res.success).toBe(true);
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("invalid_context");
    expect(res.message as string).toContain("maxFactor");
  });
});
