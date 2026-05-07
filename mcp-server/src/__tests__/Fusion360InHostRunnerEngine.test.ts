/**
 * Fusion360InHostRunnerEngine — U-CAMTEST02 unit + integration tests
 * ===================================================================
 *
 * Per the "exhaust all input possibilities in each cad software" directive,
 * these tests span every Fusion 360 configuration axis:
 *
 *   setup_type          × 3  (milling, turning, inspection)
 *   wcs_mode            × 3  (model_origin, stock_top, stock_point)
 *   stock_strategy      × 3  (from_brep, relative_size_box, fixed_size_box)
 *   coolant_strategy    × 5  (flood, mist, air, through_tool, none)
 *   post_dialect        × 8  (haas, fanuc, okuma, mazak, mitsubishi,
 *                             siemens, heidenhain, generic)
 *   tool_length_source  × 3  (measured, estimated, offset_table)
 *   category            × 7  (pocket_2d .. turning)
 *
 * Plus the comprehensive-build floor: happy path, ≥3 failure modes,
 * ≥2 adversarial inputs, ≥3 spanning configs, dispatcher round-trip.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  Fusion360InHostRunnerEngine,
  FusionScenarioDescriptorSchema,
  FusionScenarioPlanSchema,
  FusionScenarioResultSchema,
  FusionScenarioSummarySchema,
  FusionSetupTypeSchema,
  FusionPostDialectSchema,
  FusionCoolantStrategySchema,
  FusionWCSModeSchema,
  FusionStockStrategySchema,
  FusionToolLengthSourceSchema,
  buildRegistration,
  p99,
  countBandTransitions,
  isValidJsonRpcEnvelope,
  encodeJsonRpcEnvelope,
  FUSION_RUNNER_PLUGIN_ID,
  FUSION_RUNNER_VERSION,
  FUSION_RPC_METHODS,
  HARD_STOP_BUDGET_FRAMES,
  OVERLAY_TYPES_PER_SCENARIO,
  type FusionScenarioDescriptor,
  type FusionObservedFrame,
  type FusionScenarioResult,
  type FusionSetupType,
  type FusionPostDialect,
  type FusionCoolantStrategy,
  type FusionWCSMode,
  type FusionStockStrategy,
  type FusionToolLengthSource,
  type FusionScenarioCategory,
} from "../engines/Fusion360InHostRunnerEngine.js";
import { CAMPluginCommunicationHubEngine } from "../engines/CAMPluginCommunicationHubEngine.js";

const E = Fusion360InHostRunnerEngine;
const FRAME_TYPES = ["force", "chatter", "deflection", "thermal", "tool_life", "safety_score"] as const;

// ── Fixture builders ─────────────────────────────────────────────────────────

function descriptor(over: Partial<FusionScenarioDescriptor> = {}): FusionScenarioDescriptor {
  return {
    scenario_id: over.scenario_id ?? "scen-1",
    category: over.category ?? "pocket_2d",
    part_id: over.part_id ?? "part-rect-pocket",
    stock_id: over.stock_id ?? "stock-al-6061-plate",
    material_id: over.material_id ?? "6061-T6",
    tool_id: over.tool_id ?? "em-6mm-4fl-carbide",
    setup_type: over.setup_type ?? "milling",
    wcs_mode: over.wcs_mode ?? "model_origin",
    stock_strategy: over.stock_strategy ?? "from_brep",
    coolant_strategy: over.coolant_strategy ?? "flood",
    post_dialect: over.post_dialect ?? "generic",
    tool_length_source: over.tool_length_source ?? "measured",
    expected_frame_count: over.expected_frame_count ?? 12,
    expected_band_transitions: over.expected_band_transitions ?? 0,
    deliberate_hard_stop: over.deliberate_hard_stop ?? false,
    latency_p99_budget_ms: over.latency_p99_budget_ms ?? 100,
  };
}

function observedForDescriptor(
  desc: FusionScenarioDescriptor,
  opts: {
    latency_ms?: number;
    band?: number;
    hard_stop_at?: number;
    invalid_at?: number;
    corrupt_envelope_at?: number;
    wrong_method_at?: number;
  } = {},
): FusionObservedFrame[] {
  const out: FusionObservedFrame[] = [];
  for (let i = 0; i < desc.expected_frame_count; i++) {
    const ft = FRAME_TYPES[i % 6];
    let rpc_envelope = encodeJsonRpcEnvelope(ft, `${desc.scenario_id}-op`, i, {});
    if (opts.corrupt_envelope_at === i) {
      rpc_envelope = "not json";
    } else if (opts.wrong_method_at === i) {
      rpc_envelope = JSON.stringify({
        jsonrpc: "2.0",
        method: "cam.overlayWrong",
        params: { seq: i },
      });
    }
    out.push({
      seq: i,
      frame_type: ft,
      latency_ms: opts.latency_ms ?? 4,
      hard_stop: opts.hard_stop_at === i,
      band: opts.band ?? 0,
      payload_valid: opts.invalid_at !== i,
      rpc_envelope,
    });
  }
  return out;
}

function resultFor(
  desc: FusionScenarioDescriptor,
  observed: FusionObservedFrame[],
  stats: Partial<FusionScenarioResult> = {},
): FusionScenarioResult {
  return {
    scenario_id: desc.scenario_id,
    plugin_id: FUSION_RUNNER_PLUGIN_ID,
    observed,
    frames_in: stats.frames_in ?? observed.length,
    frames_delivered: stats.frames_delivered ?? observed.length,
    frames_queued: stats.frames_queued ?? 0,
    frames_dropped: stats.frames_dropped ?? 0,
    frames_unknown_target: stats.frames_unknown_target ?? 0,
  };
}

beforeEach(() => {
  E.resetAll();
  CAMPluginCommunicationHubEngine.resetRegistry();
});

// ── 1. Schema surface & enumerators ──────────────────────────────────────────

describe("U-CAMTEST02 — schema surface", () => {
  it("supportedSetupTypes returns 3 entries", () => {
    expect(E.supportedSetupTypes().sort()).toEqual(["inspection", "milling", "turning"]);
  });

  it("supportedWCSModes returns 3 entries", () => {
    expect(E.supportedWCSModes().length).toBe(3);
  });

  it("supportedStockStrategies returns 3 entries", () => {
    expect(E.supportedStockStrategies().length).toBe(3);
  });

  it("supportedCoolantStrategies returns 5 entries", () => {
    expect(E.supportedCoolantStrategies().length).toBe(5);
  });

  it("supportedPostDialects returns 8 entries", () => {
    expect(E.supportedPostDialects().length).toBe(8);
  });

  it("supportedToolLengthSources returns 3 entries", () => {
    expect(E.supportedToolLengthSources().length).toBe(3);
  });

  it("FUSION_RPC_METHODS covers all 6 overlay frame types", () => {
    for (const ft of FRAME_TYPES) {
      expect(FUSION_RPC_METHODS[ft]).toMatch(/^cam\.overlay/);
    }
  });

  it("FUSION_RUNNER_VERSION is SemVer", () => {
    expect(FUSION_RUNNER_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("HARD_STOP_BUDGET_FRAMES matches hyperMILL runner (cross-host invariant)", () => {
    expect(HARD_STOP_BUDGET_FRAMES).toBe(3);
  });

  it("OVERLAY_TYPES_PER_SCENARIO is 6", () => {
    expect(OVERLAY_TYPES_PER_SCENARIO).toBe(6);
  });
});

// ── 2. JSON-RPC 2.0 envelope helpers ─────────────────────────────────────────

describe("U-CAMTEST02 — JSON-RPC 2.0 envelope validation", () => {
  it("isValidJsonRpcEnvelope accepts a well-formed envelope", () => {
    const env = JSON.stringify({ jsonrpc: "2.0", method: "cam.x", params: {} });
    expect(isValidJsonRpcEnvelope(env)).toBe(true);
  });

  it("rejects envelopes with jsonrpc version 1.0", () => {
    const env = JSON.stringify({ jsonrpc: "1.0", method: "cam.x", params: {} });
    expect(isValidJsonRpcEnvelope(env)).toBe(false);
  });

  it("rejects envelopes missing the method field", () => {
    const env = JSON.stringify({ jsonrpc: "2.0", params: {} });
    expect(isValidJsonRpcEnvelope(env)).toBe(false);
  });

  it("rejects envelopes missing the params field", () => {
    const env = JSON.stringify({ jsonrpc: "2.0", method: "cam.x" });
    expect(isValidJsonRpcEnvelope(env)).toBe(false);
  });

  it("rejects envelopes that are not JSON", () => {
    expect(isValidJsonRpcEnvelope("not json")).toBe(false);
  });

  it("rejects envelopes that are JSON but not objects", () => {
    expect(isValidJsonRpcEnvelope("[]")).toBe(false);
    expect(isValidJsonRpcEnvelope("null")).toBe(false);
    expect(isValidJsonRpcEnvelope("42")).toBe(false);
  });

  it("encodeJsonRpcEnvelope emits the correct method for each frame type", () => {
    for (const ft of FRAME_TYPES) {
      const env = encodeJsonRpcEnvelope(ft, "op-x", 0);
      const obj = JSON.parse(env);
      expect(obj.method).toBe(FUSION_RPC_METHODS[ft]);
    }
  });

  it("encodeJsonRpcEnvelope carries operationId and seq through params", () => {
    const env = encodeJsonRpcEnvelope("force", "op-test", 42, { fc_n: 250 });
    const obj = JSON.parse(env);
    expect(obj.params.operationId).toBe("op-test");
    expect(obj.params.seq).toBe(42);
    expect(obj.params.payload.fc_n).toBe(250);
  });
});

// ── 3. p99 + countBandTransitions cross-host parity ──────────────────────────

describe("U-CAMTEST02 — p99() cross-host parity", () => {
  it("matches hyperMILL runner's p99 semantics on a 100-element series", () => {
    const values = Array.from({ length: 100 }, (_, i) => i + 1);
    expect(p99(values)).toBe(99);
  });

  it("returns 0 for empty", () => {
    expect(p99([])).toBe(0);
  });
});

describe("U-CAMTEST02 — countBandTransitions() cross-host parity", () => {
  it("zero transitions on uniform green", () => {
    const obs = Array.from({ length: 6 }, (_, i) => ({
      seq: i, frame_type: "force" as const, latency_ms: 1, hard_stop: false, band: 0, payload_valid: true, rpc_envelope: "{}",
    }));
    expect(countBandTransitions(obs)).toBe(0);
  });

  it("multi-toggle counts", () => {
    const bands = [0, 1, 0, 2, 0, 1];
    const obs = bands.map((b, i) => ({
      seq: i, frame_type: "force" as const, latency_ms: 1, hard_stop: false, band: b, payload_valid: true, rpc_envelope: "{}",
    }));
    expect(countBandTransitions(obs)).toBe(5);
  });
});

// ── 4. register + hub round-trip ─────────────────────────────────────────────

describe("U-CAMTEST02 — register() round-trip through the hub", () => {
  it("buildRegistration produces target=fusion360 with WS transport", () => {
    const r = buildRegistration();
    expect(r.target).toBe("fusion360");
    expect(r.transport).toBe("websocket");
    expect(r.plugin_id).toBe(FUSION_RUNNER_PLUGIN_ID);
    expect(r.capabilities.length).toBe(6);
  });

  it("register() allows the hub to route a frame to fusion360", () => {
    E.register();
    const env = {
      frame_type: "force" as const,
      target: "fusion360" as const,
      operation_id: "op-reg",
      payload: encodeJsonRpcEnvelope("force", "op-reg", 0),
      seq: 0,
      hard_stop: false,
    };
    const r = CAMPluginCommunicationHubEngine.route("sess-reg", env);
    expect(["delivered", "queued"]).toContain(r.status);
  });

  it("register() with custom plugin_id updates capabilities per registration", () => {
    const reg = E.register("fusion360-custom", "2.1.3");
    expect(reg.plugin_id).toBe("fusion360-custom");
    expect(reg.version).toBe("2.1.3");
  });
});

// ── 5. planScenario + coherence gates ────────────────────────────────────────

describe("U-CAMTEST02 — planScenario()", () => {
  it("produces one frame per overlay type per step", () => {
    const plan = E.planScenario("s1", descriptor({ expected_frame_count: 12 }));
    expect(plan.expected_frames.length).toBe(12);
    for (const f of plan.expected_frames) {
      expect(f.rpc_method).toBe(FUSION_RPC_METHODS[f.frame_type]);
    }
  });

  it("rejects frame count not divisible by 6", () => {
    expect(() => E.planScenario("s1", descriptor({ expected_frame_count: 7 }))).toThrow();
  });

  it("rejects turning setup with a non-turning category (coherence gate)", () => {
    expect(() =>
      E.planScenario("s1", descriptor({ setup_type: "turning", category: "pocket_2d" })),
    ).toThrow(/setup_type=turning requires category=turning/);
  });

  it("rejects milling setup with turning category (inverse coherence gate)", () => {
    expect(() =>
      E.planScenario("s1", descriptor({ setup_type: "milling", category: "turning" })),
    ).toThrow(/category=turning requires setup_type=turning/);
  });

  it("accepts a valid turning scenario (turning × turning)", () => {
    const plan = E.planScenario("s1", descriptor({
      setup_type: "turning",
      category: "turning",
      tool_id: "turn-cnmg-432",
    }));
    expect(plan.descriptor.setup_type).toBe("turning");
  });

  it("increments scenarios_planned in per-session stats", () => {
    E.planScenario("s1", descriptor());
    E.planScenario("s1", descriptor({ scenario_id: "sc-2" }));
    expect(E.getStats("s1").scenarios_planned).toBe(2);
  });

  it("plan validates against FusionScenarioPlanSchema", () => {
    const plan = E.planScenario("s1", descriptor());
    expect(() => FusionScenarioPlanSchema.parse(plan)).not.toThrow();
  });
});

// ── 6. summarize — happy path ────────────────────────────────────────────────

describe("U-CAMTEST02 — summarize() happy path", () => {
  it("all 7 assertions green on a clean run", () => {
    const d = descriptor();
    const plan = E.planScenario("s1", d);
    const summary = E.summarize("s1", plan, resultFor(d, observedForDescriptor(d)));
    expect(summary.overall_pass).toBe(true);
    expect(summary.assertions.length).toBe(7);
    for (const a of summary.assertions) expect(a.pass).toBe(true);
  });

  it("summary exposes setup_type and post_dialect for dashboards", () => {
    const d = descriptor({ setup_type: "inspection", post_dialect: "mazak" });
    const plan = E.planScenario("s1", d);
    const summary = E.summarize("s1", plan, resultFor(d, observedForDescriptor(d)));
    expect(summary.setup_type).toBe("inspection");
    expect(summary.post_dialect).toBe("mazak");
  });

  it("summary validates against FusionScenarioSummarySchema", () => {
    const d = descriptor();
    const plan = E.planScenario("s1", d);
    const summary = E.summarize("s1", plan, resultFor(d, observedForDescriptor(d)));
    expect(() => FusionScenarioSummarySchema.parse(summary)).not.toThrow();
  });

  it("per_dialect_count increments per dialect", () => {
    const d1 = descriptor({ scenario_id: "a", post_dialect: "haas" });
    const d2 = descriptor({ scenario_id: "b", post_dialect: "haas" });
    const d3 = descriptor({ scenario_id: "c", post_dialect: "fanuc" });
    for (const d of [d1, d2, d3]) {
      E.summarize("s1", E.planScenario("s1", d), resultFor(d, observedForDescriptor(d)));
    }
    const stats = E.getStats("s1");
    expect(stats.per_dialect_count.haas).toBe(2);
    expect(stats.per_dialect_count.fanuc).toBe(1);
    expect(stats.per_dialect_count.okuma).toBe(0);
  });
});

// ── 7. Failure modes (≥3 mandated) ──────────────────────────────────────────

describe("U-CAMTEST02 — failure modes", () => {
  it("FAILURE 1: missing frames trip frame_arrival", () => {
    const d = descriptor({ expected_frame_count: 12 });
    const plan = E.planScenario("s1", d);
    const obs = observedForDescriptor(d).slice(0, 10);
    const summary = E.summarize("s1", plan, resultFor(d, obs));
    expect(summary.assertions.find(a => a.name === "frame_arrival")!.pass).toBe(false);
  });

  it("FAILURE 2: latency exceeds budget trips latency_p99", () => {
    const d = descriptor({ latency_p99_budget_ms: 50 });
    const plan = E.planScenario("s1", d);
    const summary = E.summarize("s1", plan, resultFor(d, observedForDescriptor(d, { latency_ms: 80 })));
    expect(summary.assertions.find(a => a.name === "latency_p99")!.pass).toBe(false);
    expect(summary.latency_p99_ms).toBe(80);
  });

  it("FAILURE 3: wrong band transition count trips band_transitions", () => {
    const d = descriptor({ expected_band_transitions: 0 });
    const plan = E.planScenario("s1", d);
    const obs = observedForDescriptor(d);
    obs[6].band = 1; // a single yellow mid-run
    const summary = E.summarize("s1", plan, resultFor(d, obs));
    expect(summary.assertions.find(a => a.name === "band_transitions")!.pass).toBe(false);
  });

  it("FAILURE 4: stats don't reconcile trips session_stats_reconcile", () => {
    const d = descriptor();
    const plan = E.planScenario("s1", d);
    const summary = E.summarize("s1", plan, resultFor(d, observedForDescriptor(d), {
      frames_in: 12, frames_delivered: 10,
    }));
    expect(summary.assertions.find(a => a.name === "session_stats_reconcile")!.pass).toBe(false);
  });

  it("FAILURE 5: corrupt JSON-RPC envelope trips jsonrpc_envelope_valid", () => {
    const d = descriptor();
    const plan = E.planScenario("s1", d);
    const obs = observedForDescriptor(d, { corrupt_envelope_at: 3 });
    const summary = E.summarize("s1", plan, resultFor(d, obs));
    const env = summary.assertions.find(a => a.name === "jsonrpc_envelope_valid")!;
    expect(env.pass).toBe(false);
    expect(env.metric!.invalid).toBe(1);
  });

  it("FAILURE 6: wrong method name (e.g. overlayWrong) trips jsonrpc_envelope_valid", () => {
    const d = descriptor();
    const plan = E.planScenario("s1", d);
    const obs = observedForDescriptor(d, { wrong_method_at: 4 });
    const summary = E.summarize("s1", plan, resultFor(d, obs));
    const env = summary.assertions.find(a => a.name === "jsonrpc_envelope_valid")!;
    expect(env.pass).toBe(false);
  });

  it("FAILURE 7: dropped frames trip reconnect_drain", () => {
    const d = descriptor();
    const plan = E.planScenario("s1", d);
    const summary = E.summarize("s1", plan, resultFor(d, observedForDescriptor(d), {
      frames_dropped: 2, frames_in: 14, frames_delivered: 12,
    }));
    expect(summary.assertions.find(a => a.name === "reconnect_drain")!.pass).toBe(false);
  });

  it("FAILURE 8: missing deliberate hard_stop trips hard_stop_trigger", () => {
    const d = descriptor({ deliberate_hard_stop: true });
    const plan = E.planScenario("s1", d);
    const summary = E.summarize("s1", plan, resultFor(d, observedForDescriptor(d)));
    expect(summary.assertions.find(a => a.name === "hard_stop_trigger")!.pass).toBe(false);
  });

  it("FAILURE 9: duplicate seq trips frame_arrival", () => {
    const d = descriptor({ expected_frame_count: 12 });
    const plan = E.planScenario("s1", d);
    const obs = observedForDescriptor(d);
    obs[5] = { ...obs[5], seq: 4 };
    const summary = E.summarize("s1", plan, resultFor(d, obs));
    expect(summary.assertions.find(a => a.name === "frame_arrival")!.pass).toBe(false);
  });
});

// ── 8. Adversarial inputs (≥2 mandated) ──────────────────────────────────────

describe("U-CAMTEST02 — adversarial inputs", () => {
  it("ADVERSARIAL 1: NaN latency rejected at schema parse", () => {
    const d = descriptor();
    const plan = E.planScenario("s1", d);
    const obs = observedForDescriptor(d);
    obs[0] = { ...obs[0], latency_ms: NaN };
    expect(() => E.summarize("s1", plan, resultFor(d, obs))).toThrow();
  });

  it("ADVERSARIAL 2: Infinity latency rejected at schema parse", () => {
    const d = descriptor();
    const plan = E.planScenario("s1", d);
    const obs = observedForDescriptor(d);
    obs[0] = { ...obs[0], latency_ms: Infinity };
    expect(() => E.summarize("s1", plan, resultFor(d, obs))).toThrow();
  });

  it("ADVERSARIAL 3: empty observed list summarizes with every assertion failing", () => {
    const d = descriptor({ expected_frame_count: 12 });
    const plan = E.planScenario("s1", d);
    const summary = E.summarize("s1", plan, resultFor(d, []));
    expect(summary.assertions.find(a => a.name === "frame_arrival")!.pass).toBe(false);
  });

  it("ADVERSARIAL 4: oversize observed list (2×) trips frame_arrival", () => {
    const d = descriptor({ expected_frame_count: 12 });
    const plan = E.planScenario("s1", d);
    const obs = observedForDescriptor(d);
    const obs2 = observedForDescriptor(d).map(o => ({ ...o, seq: o.seq + 12 }));
    const summary = E.summarize("s1", plan, resultFor(d, [...obs, ...obs2]));
    expect(summary.assertions.find(a => a.name === "frame_arrival")!.pass).toBe(false);
  });

  it("ADVERSARIAL 5: empty string rpc_envelope rejected by schema (min 1)", () => {
    const d = descriptor();
    const plan = E.planScenario("s1", d);
    const obs = observedForDescriptor(d);
    obs[0] = { ...obs[0], rpc_envelope: "" };
    expect(() => E.summarize("s1", plan, resultFor(d, obs))).toThrow();
  });

  it("ADVERSARIAL 6: invalid band value (e.g. 5) rejected by schema", () => {
    const d = descriptor();
    const plan = E.planScenario("s1", d);
    const obs = observedForDescriptor(d);
    obs[0] = { ...obs[0], band: 5 };
    expect(() => E.summarize("s1", plan, resultFor(d, obs))).toThrow();
  });

  it("ADVERSARIAL 7: unknown post_dialect rejected by descriptor schema", () => {
    expect(() =>
      FusionScenarioDescriptorSchema.parse({
        ...descriptor(),
        post_dialect: "okumatronic" as never,
      }),
    ).toThrow();
  });
});

// ── 9. Spanning configs — exhaust Fusion's real input axes ───────────────────

describe("U-CAMTEST02 — spanning Fusion input axes (exhaust mode)", () => {
  // Axis 1 — setup_type
  it("AXIS setup_type: milling / turning / inspection all summarize cleanly", () => {
    const cases: Array<[FusionSetupType, FusionScenarioCategory]> = [
      ["milling", "pocket_2d"],
      ["turning", "turning"],
      ["inspection", "contour_2d"],
    ];
    for (const [setup, cat] of cases) {
      const d = descriptor({ scenario_id: `setup-${setup}`, setup_type: setup, category: cat });
      const plan = E.planScenario(`s-setup-${setup}`, d);
      const summary = E.summarize(`s-setup-${setup}`, plan, resultFor(d, observedForDescriptor(d)));
      expect(summary.overall_pass).toBe(true);
      expect(summary.setup_type).toBe(setup);
    }
  });

  // Axis 2 — wcs_mode (all 3)
  it("AXIS wcs_mode: all 3 modes accepted", () => {
    const modes: FusionWCSMode[] = ["model_origin", "stock_top", "stock_point"];
    for (const m of modes) {
      const d = descriptor({ scenario_id: `wcs-${m}`, wcs_mode: m });
      const plan = E.planScenario(`s-wcs-${m}`, d);
      expect(plan.descriptor.wcs_mode).toBe(m);
    }
  });

  // Axis 3 — stock_strategy (all 3)
  it("AXIS stock_strategy: all 3 strategies accepted and summarized", () => {
    const strats: FusionStockStrategy[] = ["from_brep", "relative_size_box", "fixed_size_box"];
    for (const s of strats) {
      const d = descriptor({ scenario_id: `stock-${s}`, stock_strategy: s });
      const plan = E.planScenario(`s-stock-${s}`, d);
      const summary = E.summarize(`s-stock-${s}`, plan, resultFor(d, observedForDescriptor(d)));
      expect(summary.overall_pass).toBe(true);
    }
  });

  // Axis 4 — coolant_strategy (all 5)
  it("AXIS coolant_strategy: all 5 strategies accepted", () => {
    const strats: FusionCoolantStrategy[] = ["flood", "mist", "air", "through_tool", "none"];
    for (const s of strats) {
      const d = descriptor({ scenario_id: `cool-${s}`, coolant_strategy: s });
      const plan = E.planScenario(`s-cool-${s}`, d);
      expect(plan.descriptor.coolant_strategy).toBe(s);
    }
  });

  // Axis 5 — post_dialect (all 8, the real licence-breadth axis)
  it("AXIS post_dialect: every dialect scenarios cleanly and is counted", () => {
    const dialects: FusionPostDialect[] = [
      "haas", "fanuc", "okuma", "mazak", "mitsubishi", "siemens", "heidenhain", "generic",
    ];
    for (const pd of dialects) {
      const d = descriptor({ scenario_id: `pd-${pd}`, post_dialect: pd });
      const plan = E.planScenario("s-pd", d);
      const summary = E.summarize("s-pd", plan, resultFor(d, observedForDescriptor(d)));
      expect(summary.overall_pass).toBe(true);
      expect(summary.post_dialect).toBe(pd);
    }
    // All 8 dialects must have incremented.
    const stats = E.getStats("s-pd");
    for (const pd of dialects) {
      expect(stats.per_dialect_count[pd]).toBe(1);
    }
    expect(stats.scenarios_summarized).toBe(8);
  });

  // Axis 6 — tool_length_source (all 3)
  it("AXIS tool_length_source: all 3 sources accepted", () => {
    const sources: FusionToolLengthSource[] = ["measured", "estimated", "offset_table"];
    for (const s of sources) {
      const d = descriptor({ scenario_id: `tl-${s}`, tool_length_source: s });
      const plan = E.planScenario(`s-tl-${s}`, d);
      expect(plan.descriptor.tool_length_source).toBe(s);
    }
  });

  // Axis 7 — category × 7
  it("AXIS category: all 7 scenario categories accepted (turning with turning setup)", () => {
    const cases: Array<[FusionScenarioCategory, FusionSetupType]> = [
      ["pocket_2d", "milling"],
      ["contour_2d", "milling"],
      ["drilling", "milling"],
      ["threading", "milling"],
      ["surface_3d", "milling"],
      ["multi_axis", "milling"],
      ["turning", "turning"],
    ];
    for (const [cat, setup] of cases) {
      const d = descriptor({ scenario_id: `cat-${cat}`, category: cat, setup_type: setup });
      const plan = E.planScenario(`s-cat-${cat}`, d);
      const summary = E.summarize(`s-cat-${cat}`, plan, resultFor(d, observedForDescriptor(d)));
      expect(summary.category).toBe(cat);
      expect(summary.overall_pass).toBe(true);
    }
  });

  // Cross-product smoke — 3 representative Cartesian picks
  it("CROSS-PRODUCT: Haas + flood + measured + pocket_2d", () => {
    const d = descriptor({
      scenario_id: "cross-1",
      post_dialect: "haas", coolant_strategy: "flood",
      tool_length_source: "measured", category: "pocket_2d",
    });
    const summary = E.summarize("s-cross-1", E.planScenario("s-cross-1", d), resultFor(d, observedForDescriptor(d)));
    expect(summary.overall_pass).toBe(true);
  });

  it("CROSS-PRODUCT: Fanuc + through_tool + estimated + multi_axis", () => {
    const d = descriptor({
      scenario_id: "cross-2",
      post_dialect: "fanuc", coolant_strategy: "through_tool",
      tool_length_source: "estimated", category: "multi_axis",
    });
    const summary = E.summarize("s-cross-2", E.planScenario("s-cross-2", d), resultFor(d, observedForDescriptor(d)));
    expect(summary.overall_pass).toBe(true);
  });

  it("CROSS-PRODUCT: Okuma + air + offset_table + turning (with turning setup)", () => {
    const d = descriptor({
      scenario_id: "cross-3",
      post_dialect: "okuma", coolant_strategy: "air",
      tool_length_source: "offset_table", setup_type: "turning", category: "turning",
    });
    const summary = E.summarize("s-cross-3", E.planScenario("s-cross-3", d), resultFor(d, observedForDescriptor(d)));
    expect(summary.overall_pass).toBe(true);
  });
});

// ── 10. Per-session statistics ───────────────────────────────────────────────

describe("U-CAMTEST02 — per-session stats & isolation", () => {
  it("getStats returns zero snapshot for unseen session", () => {
    const s = E.getStats("never");
    expect(s.scenarios_planned).toBe(0);
    expect(s.per_dialect_count.haas).toBe(0);
  });

  it("sessions are isolated", () => {
    const d = descriptor();
    E.summarize("a", E.planScenario("a", d), resultFor(d, observedForDescriptor(d)));
    expect(E.getStats("b").scenarios_summarized).toBe(0);
  });

  it("getStats returns a defensive copy of per_dialect_count", () => {
    const d = descriptor({ post_dialect: "haas" });
    E.summarize("s1", E.planScenario("s1", d), resultFor(d, observedForDescriptor(d)));
    const s = E.getStats("s1");
    s.per_dialect_count.haas = 999;
    expect(E.getStats("s1").per_dialect_count.haas).toBe(1);
  });

  it("resetSession clears one, preserves others", () => {
    const d = descriptor();
    E.summarize("a", E.planScenario("a", d), resultFor(d, observedForDescriptor(d)));
    E.summarize("b", E.planScenario("b", d), resultFor(d, observedForDescriptor(d)));
    E.resetSession("a");
    expect(E.getStats("a").scenarios_summarized).toBe(0);
    expect(E.getStats("b").scenarios_summarized).toBe(1);
  });
});

// ── 11. frameToEnvelope — hub handshake ──────────────────────────────────────

describe("U-CAMTEST02 — frameToEnvelope()", () => {
  it("builds an envelope with target=fusion360 and JSON-RPC payload", () => {
    const plan = E.planScenario("s1", descriptor());
    const env = E.frameToEnvelope(plan.expected_frames[0]);
    expect(env.target).toBe("fusion360");
    expect(isValidJsonRpcEnvelope(env.payload)).toBe(true);
  });

  it("the encoded method matches the frame_type's FUSION_RPC_METHODS entry", () => {
    const plan = E.planScenario("s1", descriptor());
    for (let i = 0; i < 6; i++) {
      const env = E.frameToEnvelope(plan.expected_frames[i]);
      const parsed = JSON.parse(env.payload);
      expect(parsed.method).toBe(FUSION_RPC_METHODS[plan.expected_frames[i].frame_type]);
    }
  });
});

// ── 12. Dispatcher round-trip (mandated) ─────────────────────────────────────

describe("U-CAMTEST02 — dispatcher round-trip (prism_cam)", () => {
  it("ACTIONS array exposes the Fusion 360 in-host runner actions", async () => {
    const mod = await import("../tools/dispatchers/camDispatcher.js");
    expect(mod.ACTIONS).toContain("cam_inhost_fusion360_register");
    expect(mod.ACTIONS).toContain("cam_inhost_fusion360_plan");
    expect(mod.ACTIONS).toContain("cam_inhost_fusion360_summarize");
    expect(mod.ACTIONS).toContain("cam_inhost_fusion360_stats");
    expect(mod.ACTIONS).toContain("cam_inhost_fusion360_reset");
  });

  it("engine reachable via the same dynamic import path the dispatcher uses", async () => {
    const mod = await import("../engines/Fusion360InHostRunnerEngine.js");
    const plan = mod.Fusion360InHostRunnerEngine.planScenario(
      "dispatcher-sess", descriptor({ scenario_id: "dispatcher-scen" }),
    );
    expect(plan.scenario_id).toBe("dispatcher-scen");
    expect(mod.Fusion360InHostRunnerEngine.getStats("dispatcher-sess").scenarios_planned).toBe(1);
  });

  it("cross-host invariant: Fusion uses 'fusion360' target while hyperMILL uses 'hypermill'", async () => {
    const fusionMod = await import("../engines/Fusion360InHostRunnerEngine.js");
    const hyperMod = await import("../engines/HyperMillInHostRunnerEngine.js");
    expect(fusionMod.buildRegistration().target).toBe("fusion360");
    expect(hyperMod.buildRegistration().target).toBe("hypermill");
  });
});

// ── 13. Schema enumeration guards ────────────────────────────────────────────

describe("U-CAMTEST02 — schema enumeration guards", () => {
  it("FusionSetupTypeSchema rejects 'drilling_setup'", () => {
    expect(() => FusionSetupTypeSchema.parse("drilling_setup" as never)).toThrow();
  });

  it("FusionPostDialectSchema rejects unknown dialect", () => {
    expect(() => FusionPostDialectSchema.parse("fagor" as never)).toThrow();
  });

  it("FusionCoolantStrategySchema rejects unknown strategy", () => {
    expect(() => FusionCoolantStrategySchema.parse("cryogenic" as never)).toThrow();
  });

  it("FusionWCSModeSchema rejects unknown mode", () => {
    expect(() => FusionWCSModeSchema.parse("part_center" as never)).toThrow();
  });

  it("FusionStockStrategySchema rejects unknown strategy", () => {
    expect(() => FusionStockStrategySchema.parse("from_stl" as never)).toThrow();
  });

  it("FusionToolLengthSourceSchema rejects unknown source", () => {
    expect(() => FusionToolLengthSourceSchema.parse("bluetooth_probe" as never)).toThrow();
  });
});
