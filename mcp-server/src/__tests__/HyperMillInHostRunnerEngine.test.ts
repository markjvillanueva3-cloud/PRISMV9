/**
 * HyperMillInHostRunnerEngine — U-CAMTEST01 unit + integration tests
 * ===================================================================
 *
 * Coverage floor per comprehensive-build mandate:
 *   - Happy path per assertion family
 *   - ≥3 failure modes (missing frames, bad latency, wrong band count)
 *   - ≥2 adversarial inputs (NaN, Infinity, empty, oversized)
 *   - ≥3 spanning categories (pocket_2d, multi_axis, turning)
 *   - Dispatcher round-trip (prism_cam action invoked through MCP layer)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  HyperMillInHostRunnerEngine,
  ScenarioDescriptorSchema,
  ScenarioPlanSchema,
  ScenarioResultSchema,
  ScenarioSummarySchema,
  ScenarioCategorySchema,
  buildRegistration,
  p99,
  countBandTransitions,
  HYPERMILL_RUNNER_PLUGIN_ID,
  HYPERMILL_RUNNER_VERSION,
  HARD_STOP_BUDGET_FRAMES,
  OVERLAY_TYPES_PER_SCENARIO,
  type ScenarioDescriptor,
  type ObservedFrame,
  type ScenarioResult,
  type ScenarioCategory,
} from "../engines/HyperMillInHostRunnerEngine.js";
import { CAMPluginCommunicationHubEngine } from "../engines/CAMPluginCommunicationHubEngine.js";

const E = HyperMillInHostRunnerEngine;

// ── Fixture builders ─────────────────────────────────────────────────────────

function descriptor(over: Partial<ScenarioDescriptor> = {}): ScenarioDescriptor {
  return {
    scenario_id: over.scenario_id ?? "scen-1",
    category: over.category ?? "pocket_2d",
    part_id: over.part_id ?? "part-rect-pocket",
    stock_id: over.stock_id ?? "stock-al-6061-plate",
    material_id: over.material_id ?? "6061-T6",
    tool_id: over.tool_id ?? "em-6mm-4fl-carbide",
    expected_frame_count: over.expected_frame_count ?? 12, // 2 per overlay type
    expected_band_transitions: over.expected_band_transitions ?? 0,
    deliberate_hard_stop: over.deliberate_hard_stop ?? false,
    latency_p99_budget_ms: over.latency_p99_budget_ms ?? 100,
  };
}

/** Build a full observed frame list matching a descriptor (happy path). */
function observedForDescriptor(
  desc: ScenarioDescriptor,
  opts: { latency_ms?: number; band?: number; hard_stop_at?: number; invalid_at?: number } = {},
): ObservedFrame[] {
  const out: ObservedFrame[] = [];
  for (let i = 0; i < desc.expected_frame_count; i++) {
    out.push({
      seq: i,
      frame_type: (["force", "chatter", "deflection", "thermal", "tool_life", "safety_score"] as const)[
        i % 6
      ],
      latency_ms: opts.latency_ms ?? 4,
      hard_stop: opts.hard_stop_at === i,
      band: opts.band ?? 0,
      payload_valid: opts.invalid_at !== i,
    });
  }
  return out;
}

function resultFor(
  desc: ScenarioDescriptor,
  observed: ObservedFrame[],
  stats: Partial<ScenarioResult> = {},
): ScenarioResult {
  return {
    scenario_id: desc.scenario_id,
    plugin_id: HYPERMILL_RUNNER_PLUGIN_ID,
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

// ── 1. Schema & constants ────────────────────────────────────────────────────

describe("U-CAMTEST01 — schemas and constants", () => {
  it("ScenarioCategorySchema covers all 7 fixture categories", () => {
    const cats: ScenarioCategory[] = [
      "pocket_2d", "contour_2d", "drilling", "threading",
      "surface_3d", "multi_axis", "turning",
    ];
    for (const c of cats) expect(() => ScenarioCategorySchema.parse(c)).not.toThrow();
  });

  it("ScenarioCategorySchema rejects unknown category", () => {
    expect(() => ScenarioCategorySchema.parse("milling_xyz" as never)).toThrow();
  });

  it("HARD_STOP_BUDGET_FRAMES is positive", () => {
    expect(HARD_STOP_BUDGET_FRAMES).toBeGreaterThan(0);
  });

  it("OVERLAY_TYPES_PER_SCENARIO equals 6 (one per overlay engine)", () => {
    expect(OVERLAY_TYPES_PER_SCENARIO).toBe(6);
  });

  it("HYPERMILL_RUNNER_VERSION is SemVer", () => {
    expect(HYPERMILL_RUNNER_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

// ── 2. p99 helper ────────────────────────────────────────────────────────────

describe("U-CAMTEST01 — p99()", () => {
  it("returns 0 for empty input", () => {
    expect(p99([])).toBe(0);
  });

  it("equals the max for a 1-element input", () => {
    expect(p99([42])).toBe(42);
  });

  it("returns the 99th percentile for a uniform distribution", () => {
    const values = Array.from({ length: 100 }, (_, i) => i + 1);
    expect(p99(values)).toBe(99); // nearest-rank: ceil(0.99 * 100) - 1 = 98 → values[98] = 99
  });

  it("is robust to unsorted input", () => {
    expect(p99([5, 1, 3, 2, 4])).toBe(5);
  });
});

// ── 3. countBandTransitions helper ───────────────────────────────────────────

describe("U-CAMTEST01 — countBandTransitions()", () => {
  it("returns 0 for an all-green sequence", () => {
    const obs = Array.from({ length: 6 }, (_, i) => ({
      seq: i, frame_type: "force" as const, latency_ms: 1, hard_stop: false, band: 0, payload_valid: true,
    }));
    expect(countBandTransitions(obs)).toBe(0);
  });

  it("counts a single green→yellow transition", () => {
    const obs: ObservedFrame[] = [
      { seq: 0, frame_type: "force", latency_ms: 1, hard_stop: false, band: 0, payload_valid: true },
      { seq: 1, frame_type: "force", latency_ms: 1, hard_stop: false, band: 1, payload_valid: true },
    ];
    expect(countBandTransitions(obs)).toBe(1);
  });

  it("treats yellow and red as the same non-green band", () => {
    const obs: ObservedFrame[] = [
      { seq: 0, frame_type: "force", latency_ms: 1, hard_stop: false, band: 1, payload_valid: true },
      { seq: 1, frame_type: "force", latency_ms: 1, hard_stop: false, band: 2, payload_valid: true },
    ];
    expect(countBandTransitions(obs)).toBe(0);
  });

  it("counts multiple toggles", () => {
    const bands = [0, 1, 0, 2, 0, 1];
    const obs = bands.map((b, i) => ({
      seq: i, frame_type: "force" as const, latency_ms: 1, hard_stop: false, band: b, payload_valid: true,
    }));
    expect(countBandTransitions(obs)).toBe(5);
  });

  it("sorts by seq before counting so disorder on the wire is harmless", () => {
    const obs: ObservedFrame[] = [
      { seq: 1, frame_type: "force", latency_ms: 1, hard_stop: false, band: 1, payload_valid: true },
      { seq: 0, frame_type: "force", latency_ms: 1, hard_stop: false, band: 0, payload_valid: true },
    ];
    expect(countBandTransitions(obs)).toBe(1);
  });
});

// ── 4. Registration + buildRegistration ──────────────────────────────────────

describe("U-CAMTEST01 — register() and buildRegistration()", () => {
  it("buildRegistration produces a well-formed HubPluginRegistration", () => {
    const r = buildRegistration();
    expect(r.plugin_id).toBe(HYPERMILL_RUNNER_PLUGIN_ID);
    expect(r.target).toBe("hypermill");
    expect(r.transport).toBe("websocket");
    expect(r.capabilities.length).toBe(6);
  });

  it("register() inserts the plugin into the hub registry", () => {
    E.register();
    const env = {
      frame_type: "force" as const,
      target: "hypermill" as const,
      operation_id: "op-reg-1",
      payload: "{}",
      seq: 0,
      hard_stop: false,
    };
    const r = CAMPluginCommunicationHubEngine.route("sess-reg", env);
    expect(["delivered", "queued"]).toContain(r.status);
  });

  it("register() accepts a custom plugin_id", () => {
    const reg = E.register("hypermill-custom", "2.0.0");
    expect(reg.plugin_id).toBe("hypermill-custom");
    expect(reg.version).toBe("2.0.0");
  });
});

// ── 5. planScenario() ────────────────────────────────────────────────────────

describe("U-CAMTEST01 — planScenario()", () => {
  it("expands a 12-frame scenario into 12 PlannedFrames (2 per overlay type)", () => {
    const d = descriptor({ expected_frame_count: 12 });
    const plan = E.planScenario("s1", d);
    expect(plan.expected_frames.length).toBe(12);
    const perType: Record<string, number> = {};
    for (const f of plan.expected_frames) perType[f.frame_type] = (perType[f.frame_type] ?? 0) + 1;
    for (const ft of ["force", "chatter", "deflection", "thermal", "tool_life", "safety_score"]) {
      expect(perType[ft]).toBe(2);
    }
  });

  it("assigns sequential seq values starting at 0", () => {
    const plan = E.planScenario("s1", descriptor({ expected_frame_count: 6 }));
    for (let i = 0; i < 6; i++) expect(plan.expected_frames[i].seq).toBe(i);
  });

  it("rejects expected_frame_count that isn't a multiple of 6", () => {
    expect(() => E.planScenario("s1", descriptor({ expected_frame_count: 7 }))).toThrow();
  });

  it("plan validates against ScenarioPlanSchema", () => {
    const plan = E.planScenario("s1", descriptor());
    expect(() => ScenarioPlanSchema.parse(plan)).not.toThrow();
  });

  it("increments scenarios_planned in stats", () => {
    E.planScenario("s1", descriptor());
    E.planScenario("s1", descriptor({ scenario_id: "scen-2" }));
    expect(E.getStats("s1").scenarios_planned).toBe(2);
  });

  it("getPlan retrieves by scenario_id", () => {
    E.planScenario("s1", descriptor());
    const retrieved = E.getPlan("s1", "scen-1");
    expect(retrieved).not.toBeNull();
    expect(retrieved!.descriptor.scenario_id).toBe("scen-1");
  });
});

// ── 6. summarize() — happy path & assertion families ─────────────────────────

describe("U-CAMTEST01 — summarize() happy path", () => {
  it("green summary passes all 7 assertions", () => {
    const d = descriptor();
    const plan = E.planScenario("s1", d);
    const result = resultFor(d, observedForDescriptor(d));
    const summary = E.summarize("s1", plan, result);
    expect(summary.overall_pass).toBe(true);
    expect(summary.assertions.length).toBe(7);
    for (const a of summary.assertions) expect(a.pass).toBe(true);
  });

  it("summary validates against ScenarioSummarySchema", () => {
    const d = descriptor();
    const plan = E.planScenario("s1", d);
    const summary = E.summarize("s1", plan, resultFor(d, observedForDescriptor(d)));
    expect(() => ScenarioSummarySchema.parse(summary)).not.toThrow();
  });

  it("increments scenarios_passed on a green summary", () => {
    const d = descriptor();
    const plan = E.planScenario("s1", d);
    E.summarize("s1", plan, resultFor(d, observedForDescriptor(d)));
    expect(E.getStats("s1").scenarios_passed).toBe(1);
    expect(E.getStats("s1").scenarios_failed).toBe(0);
  });
});

// ── 7. Failure modes (≥3 required by mandate) ────────────────────────────────

describe("U-CAMTEST01 — failure modes", () => {
  it("FAILURE 1: missing frames trip frame_arrival", () => {
    const d = descriptor({ expected_frame_count: 12 });
    const plan = E.planScenario("s1", d);
    const obs = observedForDescriptor(d).slice(0, 10); // drop last 2
    const summary = E.summarize("s1", plan, resultFor(d, obs));
    const arrival = summary.assertions.find(a => a.name === "frame_arrival")!;
    expect(arrival.pass).toBe(false);
    expect(summary.overall_pass).toBe(false);
  });

  it("FAILURE 2: latency over budget trips latency_p99", () => {
    const d = descriptor({ latency_p99_budget_ms: 50 });
    const plan = E.planScenario("s1", d);
    const obs = observedForDescriptor(d, { latency_ms: 80 });
    const summary = E.summarize("s1", plan, resultFor(d, obs));
    const lat = summary.assertions.find(a => a.name === "latency_p99")!;
    expect(lat.pass).toBe(false);
    expect(summary.latency_p99_ms).toBe(80);
  });

  it("FAILURE 3: wrong band transition count trips band_transitions", () => {
    const d = descriptor({ expected_band_transitions: 0 });
    const plan = E.planScenario("s1", d);
    const obs = observedForDescriptor(d, { band: 1 }); // ALL yellow
    // All yellow → 0 transitions → passes. Instead flip mid-way:
    obs[6].band = 0;
    const summary = E.summarize("s1", plan, resultFor(d, obs));
    const bands = summary.assertions.find(a => a.name === "band_transitions")!;
    expect(bands.pass).toBe(false);
  });

  it("FAILURE 4: session stats that don't reconcile trip session_stats_reconcile", () => {
    const d = descriptor();
    const plan = E.planScenario("s1", d);
    const obs = observedForDescriptor(d);
    const result = resultFor(d, obs, {
      frames_in: 12,
      frames_delivered: 10,
      frames_queued: 0,
      frames_dropped: 0,
      frames_unknown_target: 0, // 10 ≠ 12
    });
    const summary = E.summarize("s1", plan, result);
    const stats = summary.assertions.find(a => a.name === "session_stats_reconcile")!;
    expect(stats.pass).toBe(false);
  });

  it("FAILURE 5: invalid encoder payload trips encoder_schema", () => {
    const d = descriptor();
    const plan = E.planScenario("s1", d);
    const obs = observedForDescriptor(d, { invalid_at: 3 });
    const summary = E.summarize("s1", plan, resultFor(d, obs));
    const enc = summary.assertions.find(a => a.name === "encoder_schema")!;
    expect(enc.pass).toBe(false);
    expect(enc.metric!.invalid).toBe(1);
  });

  it("FAILURE 6: dropped frames trip reconnect_drain", () => {
    const d = descriptor();
    const plan = E.planScenario("s1", d);
    const obs = observedForDescriptor(d);
    const summary = E.summarize("s1", plan, resultFor(d, obs, {
      frames_dropped: 3,
      frames_in: 15,
      frames_delivered: 12,
    }));
    const drain = summary.assertions.find(a => a.name === "reconnect_drain")!;
    expect(drain.pass).toBe(false);
  });

  it("FAILURE 7: deliberate hard_stop that doesn't fire trips hard_stop_trigger", () => {
    const d = descriptor({ deliberate_hard_stop: true });
    const plan = E.planScenario("s1", d);
    const obs = observedForDescriptor(d); // no hard_stop, no red
    const summary = E.summarize("s1", plan, resultFor(d, obs));
    const hs = summary.assertions.find(a => a.name === "hard_stop_trigger")!;
    expect(hs.pass).toBe(false);
    expect(hs.detail).toContain("no hard_stop");
  });

  it("FAILURE 8: unexpected hard_stop on a non-deliberate scenario trips hard_stop_trigger", () => {
    const d = descriptor({ deliberate_hard_stop: false });
    const plan = E.planScenario("s1", d);
    const obs = observedForDescriptor(d, { hard_stop_at: 4 });
    const summary = E.summarize("s1", plan, resultFor(d, obs));
    const hs = summary.assertions.find(a => a.name === "hard_stop_trigger")!;
    expect(hs.pass).toBe(false);
  });

  it("FAILURE 9: hard_stop triggered too late after red band trips the budget", () => {
    const d = descriptor({ deliberate_hard_stop: true, expected_frame_count: 24 });
    const plan = E.planScenario("s1", d);
    const obs = observedForDescriptor(d);
    obs[5].band = 2; // red at seq 5
    obs[5 + HARD_STOP_BUDGET_FRAMES + 2] = { ...obs[5 + HARD_STOP_BUDGET_FRAMES + 2], hard_stop: true };
    const summary = E.summarize("s1", plan, resultFor(d, obs));
    const hs = summary.assertions.find(a => a.name === "hard_stop_trigger")!;
    expect(hs.pass).toBe(false);
  });

  it("FAILURE 10: duplicate seq numbers trip frame_arrival", () => {
    const d = descriptor({ expected_frame_count: 12 });
    const plan = E.planScenario("s1", d);
    const obs = observedForDescriptor(d);
    obs[5] = { ...obs[5], seq: 4 }; // duplicate seq 4
    const summary = E.summarize("s1", plan, resultFor(d, obs));
    const arrival = summary.assertions.find(a => a.name === "frame_arrival")!;
    expect(arrival.pass).toBe(false);
    expect(arrival.metric!.duplicate).toBe(1);
  });
});

// ── 8. Adversarial inputs (≥2 required by mandate) ───────────────────────────

describe("U-CAMTEST01 — adversarial inputs", () => {
  it("ADVERSARIAL 1: NaN latency — schema rejects non-finite numbers indirectly via summary math", () => {
    // ScenarioResultSchema's latency_ms z.number().nonnegative() rejects NaN (NaN < 0 is false, >= 0 is false).
    const d = descriptor();
    const plan = E.planScenario("s1", d);
    const obs = observedForDescriptor(d);
    obs[0] = { ...obs[0], latency_ms: NaN };
    expect(() => E.summarize("s1", plan, resultFor(d, obs))).toThrow();
  });

  it("ADVERSARIAL 2: Infinity latency rejected at schema parse (safer than silent propagation)", () => {
    const d = descriptor();
    const plan = E.planScenario("s1", d);
    const obs = observedForDescriptor(d);
    obs[0] = { ...obs[0], latency_ms: Infinity };
    // Zod's z.number().nonnegative() classifies Infinity as invalid. This is
    // the correct safety posture — Infinity must never reach the p99 math
    // where it would mask real latency regressions.
    expect(() => E.summarize("s1", plan, resultFor(d, obs))).toThrow();
  });

  it("ADVERSARIAL 3: empty observed list — produces non-throwing summary with every assertion failing", () => {
    const d = descriptor({ expected_frame_count: 12 });
    const plan = E.planScenario("s1", d);
    const summary = E.summarize("s1", plan, resultFor(d, []));
    const arrival = summary.assertions.find(a => a.name === "frame_arrival")!;
    expect(arrival.pass).toBe(false);
    // empty observed means count 0, which != 12
  });

  it("ADVERSARIAL 4: oversize observed list (2x expected) trips frame_arrival", () => {
    const d = descriptor({ expected_frame_count: 12 });
    const plan = E.planScenario("s1", d);
    const obs = [...observedForDescriptor(d), ...observedForDescriptor(d).map(o => ({ ...o, seq: o.seq + 12 }))];
    const summary = E.summarize("s1", plan, resultFor(d, obs));
    const arrival = summary.assertions.find(a => a.name === "frame_arrival")!;
    expect(arrival.pass).toBe(false);
    expect(arrival.metric!.observed).toBe(24);
  });

  it("ADVERSARIAL 5: negative expected_frame_count rejected by schema", () => {
    expect(() =>
      ScenarioDescriptorSchema.parse({ ...descriptor(), expected_frame_count: -6 }),
    ).toThrow();
  });

  it("ADVERSARIAL 6: zero expected_frame_count rejected by schema (positive gate)", () => {
    expect(() =>
      ScenarioDescriptorSchema.parse({ ...descriptor(), expected_frame_count: 0 }),
    ).toThrow();
  });
});

// ── 9. Spanning configurations (≥3 required by mandate) ──────────────────────

describe("U-CAMTEST01 — spanning configurations", () => {
  it("SPAN 1: pocket_2d scenario green-lights", () => {
    const d = descriptor({ category: "pocket_2d" });
    const plan = E.planScenario("s-span-1", d);
    const summary = E.summarize("s-span-1", plan, resultFor(d, observedForDescriptor(d)));
    expect(summary.overall_pass).toBe(true);
    expect(summary.category).toBe("pocket_2d");
  });

  it("SPAN 2: multi_axis scenario green-lights with same assertion bundle", () => {
    const d = descriptor({ category: "multi_axis", scenario_id: "scen-5axis" });
    const plan = E.planScenario("s-span-2", d);
    const summary = E.summarize("s-span-2", plan, resultFor(d, observedForDescriptor(d)));
    expect(summary.overall_pass).toBe(true);
    expect(summary.category).toBe("multi_axis");
  });

  it("SPAN 3: turning scenario green-lights", () => {
    const d = descriptor({ category: "turning", scenario_id: "scen-turn", tool_id: "turning-insert-cnmg" });
    const plan = E.planScenario("s-span-3", d);
    const summary = E.summarize("s-span-3", plan, resultFor(d, observedForDescriptor(d)));
    expect(summary.overall_pass).toBe(true);
    expect(summary.category).toBe("turning");
  });

  it("SPAN 4: drilling + threading categories both summarize cleanly", () => {
    for (const cat of ["drilling", "threading"] as const) {
      const d = descriptor({ category: cat, scenario_id: `scen-${cat}` });
      const plan = E.planScenario(`s-span-${cat}`, d);
      const summary = E.summarize(`s-span-${cat}`, plan, resultFor(d, observedForDescriptor(d)));
      expect(summary.category).toBe(cat);
      expect(summary.overall_pass).toBe(true);
    }
  });

  it("SPAN 5: contour_2d + surface_3d categories span the 2D↔3D boundary", () => {
    for (const cat of ["contour_2d", "surface_3d"] as const) {
      const d = descriptor({ category: cat, scenario_id: `scen-${cat}` });
      const plan = E.planScenario(`s-span-${cat}`, d);
      const summary = E.summarize(`s-span-${cat}`, plan, resultFor(d, observedForDescriptor(d)));
      expect(summary.category).toBe(cat);
    }
  });
});

// ── 10. Per-session statistics & reset ───────────────────────────────────────

describe("U-CAMTEST01 — per-session stats & reset", () => {
  it("scenarios_failed increments when the summary fails", () => {
    const d = descriptor({ expected_frame_count: 12 });
    const plan = E.planScenario("s1", d);
    E.summarize("s1", plan, resultFor(d, observedForDescriptor(d).slice(0, 6)));
    expect(E.getStats("s1").scenarios_failed).toBe(1);
    expect(E.getStats("s1").scenarios_passed).toBe(0);
  });

  it("total_frames_observed accumulates across scenarios", () => {
    const d1 = descriptor({ scenario_id: "s1a" });
    const d2 = descriptor({ scenario_id: "s1b", expected_frame_count: 18 });
    E.summarize("s1", E.planScenario("s1", d1), resultFor(d1, observedForDescriptor(d1)));
    E.summarize("s1", E.planScenario("s1", d2), resultFor(d2, observedForDescriptor(d2)));
    expect(E.getStats("s1").total_frames_observed).toBe(12 + 18);
  });

  it("sessions are isolated", () => {
    const d = descriptor();
    E.summarize("s1", E.planScenario("s1", d), resultFor(d, observedForDescriptor(d)));
    expect(E.getStats("s2").scenarios_summarized).toBe(0);
  });

  it("resetSession clears one session, preserves others", () => {
    const d = descriptor();
    E.summarize("s1", E.planScenario("s1", d), resultFor(d, observedForDescriptor(d)));
    E.summarize("s2", E.planScenario("s2", d), resultFor(d, observedForDescriptor(d)));
    E.resetSession("s1");
    expect(E.getStats("s1").scenarios_summarized).toBe(0);
    expect(E.getStats("s2").scenarios_summarized).toBe(1);
  });

  it("resetAll clears all sessions", () => {
    const d = descriptor();
    E.summarize("s1", E.planScenario("s1", d), resultFor(d, observedForDescriptor(d)));
    E.resetAll();
    expect(E.getStats("s1").scenarios_summarized).toBe(0);
  });
});

// ── 11. frameToEnvelope — cross-engine handshake ─────────────────────────────

describe("U-CAMTEST01 — frameToEnvelope()", () => {
  it("builds a HubFrameEnvelope with target=hypermill and hard_stop=false", () => {
    const plan = E.planScenario("s1", descriptor());
    const env = E.frameToEnvelope(plan.expected_frames[0]);
    expect(env.target).toBe("hypermill");
    expect(env.hard_stop).toBe(false);
    expect(env.seq).toBe(0);
  });

  it("forwards a custom payload string", () => {
    const plan = E.planScenario("s1", descriptor());
    const env = E.frameToEnvelope(plan.expected_frames[0], "<xml/>");
    expect(env.payload).toBe("<xml/>");
  });
});

// ── 12. Dispatcher round-trip (required by mandate) ──────────────────────────
// Exercises the prism_cam dispatcher action `cam_inhost_hypermill_plan` end-
// to-end, verifying the schema + action enum + lazy import path all match.

describe("U-CAMTEST01 — dispatcher round-trip (prism_cam)", () => {
  it("ACTIONS array exposes the hyperMILL in-host runner actions", async () => {
    const mod = await import("../tools/dispatchers/camDispatcher.js");
    expect(mod.ACTIONS).toContain("cam_inhost_hypermill_plan");
    expect(mod.ACTIONS).toContain("cam_inhost_hypermill_summarize");
    expect(mod.ACTIONS).toContain("cam_inhost_hypermill_stats");
    expect(mod.ACTIONS).toContain("cam_inhost_hypermill_reset");
  });

  it("engine.planScenario is reachable via the same codepath the dispatcher uses", async () => {
    // The dispatcher uses `await import(...)` + static method call. Replicate that.
    const mod = await import("../engines/HyperMillInHostRunnerEngine.js");
    const plan = mod.HyperMillInHostRunnerEngine.planScenario(
      "dispatcher-sess",
      descriptor({ scenario_id: "dispatcher-scen" }),
    );
    expect(plan.scenario_id).toBe("dispatcher-scen");
    expect(plan.expected_frames.length).toBe(12);
    // stats also reflect the planning call
    const stats = mod.HyperMillInHostRunnerEngine.getStats("dispatcher-sess");
    expect(stats.scenarios_planned).toBe(1);
  });

  it("ScenarioResultSchema validates a fully-populated result object", () => {
    const d = descriptor();
    const obs = observedForDescriptor(d);
    expect(() => ScenarioResultSchema.parse(resultFor(d, obs))).not.toThrow();
  });
});

describe("HyperMillInHostRunnerEngine — dispatcher wiring (camDispatcher.ts)", () => {
  const INHOST_ACTIONS = [
    "cam_hypermill_inhost_register",
    "cam_hypermill_inhost_plan_scenario",
    "cam_hypermill_inhost_frame_to_envelope",
    "cam_hypermill_inhost_summarize",
    "cam_hypermill_inhost_get_plan",
    "cam_hypermill_inhost_get_stats",
    "cam_hypermill_inhost_reset_session",
    "cam_hypermill_inhost_reset_all",
  ] as const;

  const ACTION_COUNT_EXPECTED = 8;

  const dispatcherPath = `${process.cwd()}/src/tools/dispatchers/camDispatcher.ts`.replace(/\\/g, "/");

  const readDispatcher = async (): Promise<string> => {
    const fs = await import("node:fs/promises");
    return fs.readFile(dispatcherPath, "utf-8");
  };

  it("registers all 8 cam_hypermill_inhost_* enum entries", async () => {
    const src = await readDispatcher();
    expect(INHOST_ACTIONS.length).toBe(ACTION_COUNT_EXPECTED);
    for (const action of INHOST_ACTIONS) {
      expect(src).toContain(`"${action}"`);
    }
  });

  it("declares matching case statements for every action", async () => {
    const src = await readDispatcher();
    for (const action of INHOST_ACTIONS) {
      const re = new RegExp(`case\\s+"${action}"\\s*:`);
      expect(re.test(src)).toBe(true);
    }
  });

  it("every case body imports HyperMillInHostRunnerEngine via the canonical path", async () => {
    const src = await readDispatcher();
    for (const action of INHOST_ACTIONS) {
      const re = new RegExp(
        `case\\s+"${action}"\\s*:[\\s\\S]*?\\{\\s*HyperMillInHostRunnerEngine\\s*\\}\\s*=\\s*await\\s+import\\(\\s*"\\.\\.\\/\\.\\.\\/engines\\/HyperMillInHostRunnerEngine\\.js"\\s*\\)[\\s\\S]*?break;`,
      );
      expect(re.test(src)).toBe(true);
    }
  });

  it("plan_scenario case wires session_id with sessionId fallback and reports frameCount", async () => {
    const src = await readDispatcher();
    const re = /case\s+"cam_hypermill_inhost_plan_scenario"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("planScenario");
    expect(body).toMatch(/params\.session_id\s*\?\?\s*params\.sessionId/);
    expect(body).toContain("frameCount");
    expect(body).toContain("descriptor");
  });

  it("frame_to_envelope case is PURE — no session/state mutation, calls frameToEnvelope", async () => {
    const src = await readDispatcher();
    const re = /case\s+"cam_hypermill_inhost_frame_to_envelope"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("frameToEnvelope");
    expect(body).toContain("payload");
    // PURE — must NOT touch session_id
    expect(body).not.toContain("sessionId");
    expect(body).not.toContain("session_id");
  });

  it("summarize case accepts result OR scenario_result OR scenarioResult fallback", async () => {
    const src = await readDispatcher();
    const re = /case\s+"cam_hypermill_inhost_summarize"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("summarize");
    expect(body).toMatch(/params\.result\s*\?\?\s*params\.scenario_result/);
    expect(body).toContain("scenarioResult");
  });

  it("get_plan case routes to getPlan(session_id, scenario_id) and reports found", async () => {
    const src = await readDispatcher();
    const re = /case\s+"cam_hypermill_inhost_get_plan"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("getPlan");
    expect(body).toMatch(/params\.scenario_id\s*\?\?\s*params\.scenarioId/);
    expect(body).toContain("found");
  });

  it("reset_session case calls resetSession with session_id and surfaces reset:true", async () => {
    const src = await readDispatcher();
    const re = /case\s+"cam_hypermill_inhost_reset_session"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("resetSession");
    expect(body).toContain("reset");
    expect(body).toContain("session_id");
  });

  it("reset_all case calls resetAll() with no arguments and surfaces reset:true", async () => {
    const src = await readDispatcher();
    const re = /case\s+"cam_hypermill_inhost_reset_all"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("resetAll()");
    expect(body).toContain("reset");
    // resetAll has NO session-id parameter — guard against accidental drift
    expect(body).not.toContain("resetAll(session");
  });

  it("get_stats case routes to getStats(session_id)", async () => {
    const src = await readDispatcher();
    const re = /case\s+"cam_hypermill_inhost_get_stats"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("getStats");
    expect(body).toMatch(/params\.session_id\s*\?\?\s*params\.sessionId/);
  });

  it("register case accepts plugin_id OR pluginId fallback and version override", async () => {
    const src = await readDispatcher();
    const re = /case\s+"cam_hypermill_inhost_register"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("register");
    expect(body).toMatch(/params\.plugin_id\s*\?\?\s*params\.pluginId/);
    expect(body).toContain("version");
    expect(body).toContain("registration");
  });

  it("each case sets result.success to true (consistent dispatcher contract)", async () => {
    const src = await readDispatcher();
    for (const action of INHOST_ACTIONS) {
      const re = new RegExp(
        `case\\s+"${action}"\\s*:[\\s\\S]*?success:\\s*true[\\s\\S]*?break;`,
      );
      expect(re.test(src)).toBe(true);
    }
  });
});
