/**
 * SpeedFeedPropagationBridgeEngine — tests
 *
 * Validates: versioned snapshot store, subscribers fire on publish, 5 domain
 * bridges produce expected shape, propagateAll convenience method.
 *
 * @module __tests__/SpeedFeedPropagationBridgeEngine.test
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  speedFeedPropagationBridgeEngine,
  type PropagationEvent,
} from "../engines/SpeedFeedPropagationBridgeEngine.js";
import {
  speedFeedNineAxisOrchestratorEngine,
  type NineAxisInput,
} from "../engines/SpeedFeedNineAxisOrchestratorEngine.js";

const bridge = speedFeedPropagationBridgeEngine;
const orchestrator = speedFeedNineAxisOrchestratorEngine;

const MILL_STEEL: NineAxisInput = {
  machine: { name: "Haas-VF4SS", power_kw: 22.4, max_rpm: 12000 },
  material: { name: "steel", hardness_hb: 180 },
  tooling: { tool_diameter_mm: 12, flutes: 4, tool_material: "carbide", coating: "TiAlN" },
  toolpath: { operation: "milling", cut_type: "roughing", strategy: "conventional" },
  part_volume_cm3: 50,
};

const LATHE_STEEL: NineAxisInput = {
  machine: { name: "Okuma-LB3000", kinematics: "lathe_2axis", power_kw: 18.5, max_rpm: 4500 },
  material: { name: "steel", hardness_hb: 200 },
  tooling: { tool_diameter_mm: 25, tool_material: "carbide", stickout_mm: 80 },
  toolpath: { operation: "turning", cut_type: "roughing" },
  part_volume_cm3: 200,
};

// Drilling-op fixture bypasses orchestrator.run() — UltimateSpeedFeedEngine's
// drilling path currently throws on Kienzle chip_width validation (pre-existing
// upstream issue). Construct a synthetic milling-result + mutate resolved_axes
// to exercise the drilling conditional branch in bridgeToPrintToProgram.
const ALUM_MILL_FOR_DRILL_BRANCH: NineAxisInput = {
  machine: { name: "Brother-Speedio", max_rpm: 16000 },
  material: { name: "aluminum_6061" },
  tooling: { tool_diameter_mm: 8, flutes: 2, tool_material: "carbide" },
  toolpath: { operation: "milling", cut_type: "roughing" },
  part_volume_cm3: 20,
};

beforeEach(() => bridge.clear());

describe("SpeedFeedPropagationBridgeEngine — versioned snapshot store (auto-emit contract)", () => {
  it("auto-emit on orchestrator.run() bumps version monotonically for the same key", () => {
    // Each orchestrator.run() auto-publishes — explicit bridge.publish() not needed.
    orchestrator.run(MILL_STEEL); // v=1
    orchestrator.run(MILL_STEEL); // v=2
    orchestrator.run(MILL_STEEL); // v=3
    const current = bridge.getCurrent({
      machine_name: "Haas-VF4SS",
      material_name: "steel",
      tool_diameter_mm: 12,
    });
    expect(current?.version).toBe(3);
  });

  it("different keys (machine/material/tool) get independent version counters", () => {
    orchestrator.run(MILL_STEEL);
    orchestrator.run(LATHE_STEEL);
    const m = bridge.getCurrent({ machine_name: "Haas-VF4SS", material_name: "steel", tool_diameter_mm: 12 });
    const l = bridge.getCurrent({ machine_name: "Okuma-LB3000", material_name: "steel", tool_diameter_mm: 25 });
    expect(m?.version).toBe(1);
    expect(l?.version).toBe(1);
  });

  it("getCurrent returns the latest auto-published snapshot", () => {
    orchestrator.run(MILL_STEEL);
    orchestrator.run(MILL_STEEL);
    const current = bridge.getCurrent({
      machine_name: "Haas-VF4SS",
      material_name: "steel",
      tool_diameter_mm: 12,
    });
    expect(current?.version).toBe(2);
  });

  it("listSnapshots returns one entry per unique key", () => {
    orchestrator.run(MILL_STEEL);
    orchestrator.run(LATHE_STEEL);
    const list = bridge.listSnapshots();
    expect(list.length).toBe(2);
  });

  it("published_at is a valid ISO-8601 timestamp", () => {
    orchestrator.run(MILL_STEEL);
    const current = bridge.getCurrent({ machine_name: "Haas-VF4SS", material_name: "steel", tool_diameter_mm: 12 });
    const parsed = new Date(current?.published_at ?? "");
    expect(Number.isNaN(parsed.getTime())).toBe(false);
    expect(current?.published_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});

describe("SpeedFeedPropagationBridgeEngine — subscriber broadcast (auto-emit only)", () => {
  it("subscribers fire on orchestrator.run() auto-emit", () => {
    const events: PropagationEvent[] = [];
    const unsub = bridge.subscribe("post_processor", e => events.push(e));
    orchestrator.run(MILL_STEEL);
    expect(events.length).toBe(1);
    expect(events[0]!.domain).toBe("post_processor");
    expect(events[0]!.snapshot.version).toBe(1);
    unsub();
  });

  it("multiple subscribers all receive the auto-emit event", () => {
    let countA = 0;
    let countB = 0;
    bridge.subscribe("mill_wizard", () => countA++);
    bridge.subscribe("mill_wizard", () => countB++);
    orchestrator.run(MILL_STEEL);
    expect(countA).toBe(1);
    expect(countB).toBe(1);
  });

  it("unsubscribe stops further auto-emit events for that callback", () => {
    let count = 0;
    const unsub = bridge.subscribe("lathe_wizard", () => count++);
    orchestrator.run(LATHE_STEEL);
    expect(count).toBe(1);
    unsub();
    orchestrator.run(LATHE_STEEL);
    expect(count).toBe(1);
  });

  it("subscriber error does not break the broadcast chain", () => {
    let goodCount = 0;
    bridge.subscribe("mill_wizard", () => { throw new Error("bad subscriber"); });
    bridge.subscribe("mill_wizard", () => goodCount++);
    orchestrator.run(MILL_STEEL);
    expect(goodCount).toBe(1);
  });

  it("subscriberCount reflects live subscriptions", () => {
    expect(bridge.subscriberCount("post_processor")).toBe(0);
    const u1 = bridge.subscribe("post_processor", () => {});
    const u2 = bridge.subscribe("post_processor", () => {});
    expect(bridge.subscriberCount("post_processor")).toBe(2);
    u1();
    expect(bridge.subscriberCount("post_processor")).toBe(1);
    u2();
    expect(bridge.subscriberCount("post_processor")).toBe(0);
  });
});

describe("SpeedFeedPropagationBridgeEngine — bridgeToPostProcessor", () => {
  it("emits M08 coolant code for flood coolant input", () => {
    const r = orchestrator.run({ ...MILL_STEEL, coolant: { type: "flood" } });
    const s = bridge.publish(MILL_STEEL, r);
    const pack = bridge.bridgeToPostProcessor(s);
    expect(pack.coolant_code).toBe("M08");
  });

  it("emits M09 coolant code for dry cut", () => {
    const r = orchestrator.run({ ...MILL_STEEL, coolant: { type: "dry" } });
    const s = bridge.publish(MILL_STEEL, r);
    const pack = bridge.bridgeToPostProcessor(s);
    expect(pack.coolant_code).toBe("M09");
  });

  it("cycle_overrides.roughing rpm >= semi_finishing rpm >= finishing rpm (monotonic by mode)", () => {
    const r = orchestrator.run(MILL_STEEL);
    const s = bridge.publish(MILL_STEEL, r);
    const pack = bridge.bridgeToPostProcessor(s);
    // aggressive band Vc >= balanced >= conservative, so RPM ordering follows
    expect(pack.cycle_overrides.roughing.rpm).toBeGreaterThanOrEqual(
      pack.cycle_overrides.semi_finishing.rpm,
    );
    expect(pack.cycle_overrides.semi_finishing.rpm).toBeGreaterThanOrEqual(
      pack.cycle_overrides.finishing.rpm,
    );
  });

  it("snapshot_version on the pack matches the publish version", () => {
    const r = orchestrator.run(MILL_STEEL);
    const s = bridge.publish(MILL_STEEL, r);
    const pack = bridge.bridgeToPostProcessor(s);
    expect(pack.snapshot_version).toBe(s.version);
  });

  it("max_safe_rpm respects balance-class derate (G6.3 default → ≤12000)", () => {
    const r = orchestrator.run(MILL_STEEL);
    const s = bridge.publish(MILL_STEEL, r);
    const pack = bridge.bridgeToPostProcessor(s);
    expect(pack.max_safe_rpm).toBeLessThanOrEqual(12000);
  });

  it("spindle_direction is M03 forward (conventional cutting default)", () => {
    const r = orchestrator.run(MILL_STEEL);
    const s = bridge.publish(MILL_STEEL, r);
    const pack = bridge.bridgeToPostProcessor(s);
    expect(pack.spindle_direction).toBe("M03");
  });
});

describe("SpeedFeedPropagationBridgeEngine — bridgeToMillWizard", () => {
  it("recommended_coolant_type matches input coolant", () => {
    const r = orchestrator.run({ ...MILL_STEEL, coolant: { type: "through_tool" } });
    const s = bridge.publish(MILL_STEEL, r);
    const w = bridge.bridgeToMillWizard(s);
    expect(w.recommended_coolant_type).toBe("through_tool");
  });

  it("recommended_balance_class is derived from target RPM", () => {
    const r = orchestrator.run(MILL_STEEL);
    const s = bridge.publish(MILL_STEEL, r);
    const w = bridge.bridgeToMillWizard(s);
    expect(["g0_4", "g1", "g2_5", "g6_3", "g16", "g40"]).toContain(w.recommended_balance_class);
  });

  it("workholding_feasible flag mirrors the orchestrator's underlying check", () => {
    const input: NineAxisInput = {
      ...MILL_STEEL,
      // Light finishing cut → Kurt 35kN is feasible
      toolpath: { operation: "milling", cut_type: "finishing", axial_depth_mm: 1.5, radial_depth_pct: 10 },
      workholding: { type: "kurt_vise", clamp_force_available_kn: 35 },
    };
    const r = orchestrator.run(input);
    const s = bridge.publish(input, r);
    const w = bridge.bridgeToMillWizard(s);
    expect(w.workholding_feasible).toBe(r.workholding_check.feasible);
  });

  it("mode matches the orchestrator's published mode", () => {
    const r = orchestrator.run({ ...MILL_STEEL, mode: "aggressive_rush" });
    const s = bridge.publish(MILL_STEEL, r);
    const w = bridge.bridgeToMillWizard(s);
    expect(w.mode).toBe("aggressive_rush");
  });
});

describe("SpeedFeedPropagationBridgeEngine — bridgeToLatheWizard", () => {
  it("ISO P (steel) gets Sandvik GC4225-class insert recommendation", () => {
    const r = orchestrator.run(LATHE_STEEL);
    const s = bridge.publish(LATHE_STEEL, r);
    const w = bridge.bridgeToLatheWizard(s);
    expect(w.insert_recommendation).toMatch(/GC4225|KCP25|P25/);
  });

  it("aggressive_rush mode picks heavy chip-breaker (MR or KR)", () => {
    const r = orchestrator.run({ ...LATHE_STEEL, mode: "aggressive_rush" });
    const s = bridge.publish(LATHE_STEEL, r);
    const w = bridge.bridgeToLatheWizard(s);
    expect(w.chip_breaker_recommendation).toMatch(/MR|KR|heavy/i);
  });

  it("stickout L/D > 4 triggers bar_vibration_warning", () => {
    // 80mm stickout / 25mm dia = 3.2 → no warning. Force L/D = 6.
    const r = orchestrator.run({
      ...LATHE_STEEL,
      tooling: { ...LATHE_STEEL.tooling, stickout_mm: 150 },
    });
    const s = bridge.publish(LATHE_STEEL, r);
    const w = bridge.bridgeToLatheWizard(s);
    expect(w.bar_vibration_warning).toMatch(/L\/D|vibration|steady rest/i);
  });

  it("short stickout (L/D < 4) does NOT trigger bar_vibration_warning", () => {
    const r = orchestrator.run({
      ...LATHE_STEEL,
      tooling: { ...LATHE_STEEL.tooling, stickout_mm: 60 },
    });
    const s = bridge.publish(LATHE_STEEL, r);
    const w = bridge.bridgeToLatheWizard(s);
    expect(w.bar_vibration_warning).toBe(undefined);
  });

  it("feed_per_rev_mm > 0 for valid lathe input", () => {
    const r = orchestrator.run(LATHE_STEEL);
    const s = bridge.publish(LATHE_STEEL, r);
    const w = bridge.bridgeToLatheWizard(s);
    expect(w.feed_per_rev_mm).toBeGreaterThan(0);
  });
});

describe("SpeedFeedPropagationBridgeEngine — bridgeToWedmWizard", () => {
  it("returns applicable=false (wire EDM is not SFC physics)", () => {
    const r = orchestrator.run(MILL_STEEL);
    const s = bridge.publish(MILL_STEEL, r);
    const w = bridge.bridgeToWedmWizard(s);
    expect(w.applicable).toBe(false);
    expect(w.note).toMatch(/spark|erosion|not chip/i);
  });

  it("points at prism_wedm dispatcher actions for cut params", () => {
    const r = orchestrator.run(MILL_STEEL);
    const s = bridge.publish(MILL_STEEL, r);
    const w = bridge.bridgeToWedmWizard(s);
    expect(w.use_dispatcher_actions.length).toBeGreaterThanOrEqual(2);
    expect(w.use_dispatcher_actions[0]).toMatch(/prism_wedm/);
  });
});

describe("SpeedFeedPropagationBridgeEngine — bridgeToPrintToProgram", () => {
  it("stage_overrides.rough rpm > stage_overrides.finish rpm (Pareto ordering)", () => {
    const r = orchestrator.run(MILL_STEEL);
    const s = bridge.publish(MILL_STEEL, r);
    const pack = bridge.bridgeToPrintToProgram(s);
    expect(pack.stage_overrides.rough_strategy.rpm).toBeGreaterThanOrEqual(
      pack.stage_overrides.finish_strategy.rpm,
    );
  });

  it("drilling op gets drilling_strategy block", () => {
    // Synthesize a milling result then flip operation tag to drilling
    // (the bridge reads result.resolved_axes.toolpath.operation).
    const r = orchestrator.run(ALUM_MILL_FOR_DRILL_BRANCH);
    const drillR = {
      ...r,
      resolved_axes: {
        ...r.resolved_axes,
        toolpath: { ...r.resolved_axes.toolpath, operation: "drilling" as const },
      },
    };
    const s = bridge.publish(ALUM_MILL_FOR_DRILL_BRANCH, drillR);
    const pack = bridge.bridgeToPrintToProgram(s);
    expect(pack.stage_overrides.drilling_strategy?.feed_per_rev).toBeGreaterThan(0);
  });

  it("milling op (no drilling) omits drilling_strategy", () => {
    const r = orchestrator.run(MILL_STEEL);
    const s = bridge.publish(MILL_STEEL, r);
    const pack = bridge.bridgeToPrintToProgram(s);
    expect(pack.stage_overrides.drilling_strategy).toBe(undefined);
  });

  it("cost_per_part_usd is null when part_volume_cm3 not given (fail-loud)", () => {
    const r = orchestrator.run({ ...MILL_STEEL, part_volume_cm3: undefined });
    const s = bridge.publish(MILL_STEEL, r);
    const pack = bridge.bridgeToPrintToProgram(s);
    expect(pack.cost_per_part_usd).toBeNull();
    expect(pack.cycle_time_min).toBeNull();
  });

  it("full result block is preserved for downstream stage consumption", () => {
    const r = orchestrator.run(MILL_STEEL);
    const s = bridge.publish(MILL_STEEL, r);
    const pack = bridge.bridgeToPrintToProgram(s);
    expect(pack.result.recommendation.spindle_rpm).toBe(r.recommendation.spindle_rpm);
    expect(pack.result.mode).toBe(r.mode);
  });
});

describe("SpeedFeedPropagationBridgeEngine — propagateAll (one-shot fan-out)", () => {
  it("returns snapshot + all 5 domain packs aligned on the same version", () => {
    const r = orchestrator.run(MILL_STEEL); // auto-emit (v=1)
    const all = bridge.propagateAll(MILL_STEEL, r); // explicit (v=2)
    // All 5 domain packs share the propagateAll snapshot version, not the auto-emit one.
    expect(all.snapshot.version).toBe(2);
    expect(all.post_processor.snapshot_version).toBe(2);
    expect(all.mill_wizard.snapshot_version).toBe(2);
    expect(all.lathe_wizard.snapshot_version).toBe(2);
    expect(all.wedm_wizard.snapshot_version).toBe(2);
    expect(all.print_to_program.snapshot_version).toBe(2);
  });

  it("propagateAll + auto-emit fire every subscribed domain twice (orchestrator emit + explicit propagateAll)", () => {
    // U-OSC9-03 auto-emit semantics: orchestrator.run() emits to subscribers,
    // then propagateAll emits again. Each subscriber sees both events.
    let postCount = 0;
    let millCount = 0;
    let latheCount = 0;
    bridge.subscribe("post_processor", () => postCount++);
    bridge.subscribe("mill_wizard", () => millCount++);
    bridge.subscribe("lathe_wizard", () => latheCount++);
    bridge.propagateAll(MILL_STEEL, orchestrator.run(MILL_STEEL));
    expect(postCount).toBe(2);
    expect(millCount).toBe(2);
    expect(latheCount).toBe(2);
  });

  it("propagateAll snapshot version is monotonic across multiple calls", () => {
    // orchestrator.run() now auto-publishes (U-OSC9-03) — each call advances
    // the version by 2 (auto-emit + explicit publish/propagateAll). Verify
    // the monotonic invariant rather than a specific count.
    const a = bridge.propagateAll(MILL_STEEL, orchestrator.run(MILL_STEEL));
    const b = bridge.propagateAll(MILL_STEEL, orchestrator.run(MILL_STEEL));
    const c = bridge.propagateAll(MILL_STEEL, orchestrator.run(MILL_STEEL));
    expect(a.snapshot.version).toBeLessThan(b.snapshot.version);
    expect(b.snapshot.version).toBeLessThan(c.snapshot.version);
  });

  it("auto-emit on orchestrator.run() publishes WITHOUT an explicit bridge call", () => {
    // The new auto-propagation contract: simply running the orchestrator
    // makes the snapshot available to downstream subscribers.
    let received = 0;
    bridge.subscribe("post_processor", () => received++);
    orchestrator.run(MILL_STEEL); // no bridge.publish() — auto-emit only
    expect(received).toBe(1);
  });
});

describe("SpeedFeedPropagationBridgeEngine — clear (test isolation)", () => {
  it("clear resets all snapshots and subscribers", () => {
    bridge.subscribe("post_processor", () => {});
    bridge.publish(MILL_STEEL, orchestrator.run(MILL_STEEL));
    expect(bridge.listSnapshots().length).toBe(1);
    expect(bridge.subscriberCount("post_processor")).toBe(1);
    bridge.clear();
    expect(bridge.listSnapshots().length).toBe(0);
    expect(bridge.subscriberCount("post_processor")).toBe(0);
  });
});
