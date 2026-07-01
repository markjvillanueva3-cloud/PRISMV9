/**
 * SpeedFeedDownstreamSubscriberEngine — tests
 *
 * Validates: subscriber registration is idempotent, all 5 caches receive
 * auto-emit events, key-based lookup, totalVersionCount monotonic.
 *
 * @module __tests__/SpeedFeedDownstreamSubscriberEngine.test
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  speedFeedDownstreamSubscriberEngine,
} from "../engines/SpeedFeedDownstreamSubscriberEngine.js";
import { speedFeedPropagationBridgeEngine } from "../engines/SpeedFeedPropagationBridgeEngine.js";
import {
  speedFeedNineAxisOrchestratorEngine,
  type NineAxisInput,
} from "../engines/SpeedFeedNineAxisOrchestratorEngine.js";

const sub = speedFeedDownstreamSubscriberEngine;
const bridge = speedFeedPropagationBridgeEngine;
const orchestrator = speedFeedNineAxisOrchestratorEngine;

const MILL_STEEL: NineAxisInput = {
  machine: { name: "Haas-VF4SS", power_kw: 22.4, max_rpm: 12000 },
  material: { name: "steel", hardness_hb: 180 },
  tooling: { tool_diameter_mm: 12, flutes: 4, tool_material: "carbide" },
  toolpath: { operation: "milling", cut_type: "roughing" },
  part_volume_cm3: 50,
};

const LATHE_STEEL: NineAxisInput = {
  machine: { name: "Okuma-LB3000", kinematics: "lathe_2axis", max_rpm: 4500 },
  material: { name: "steel" },
  tooling: { tool_diameter_mm: 25, tool_material: "carbide", stickout_mm: 80 },
  toolpath: { operation: "turning", cut_type: "roughing" },
};

const MILL_STEEL_KEY = { machine_name: "Haas-VF4SS", material_name: "steel", tool_diameter_mm: 12 };
const LATHE_STEEL_KEY = { machine_name: "Okuma-LB3000", material_name: "steel", tool_diameter_mm: 25 };

beforeEach(() => {
  sub.clear();
  bridge.clear();
});

describe("SpeedFeedDownstreamSubscriberEngine — registration lifecycle", () => {
  it("registerAllSubscribers returns all 5 domain names when first invoked", () => {
    const r = sub.registerAllSubscribers();
    expect(r.alreadyActive).toBe(false);
    expect(r.registered).toContain("post_processor");
    expect(r.registered).toContain("mill_wizard");
    expect(r.registered).toContain("lathe_wizard");
    expect(r.registered).toContain("wedm_wizard");
    expect(r.registered).toContain("print_to_program");
    expect(r.registered.length).toBe(5);
  });

  it("registerAllSubscribers is idempotent — second call returns alreadyActive=true", () => {
    sub.registerAllSubscribers();
    const r2 = sub.registerAllSubscribers();
    expect(r2.alreadyActive).toBe(true);
    expect(r2.registered.length).toBe(0);
  });

  it("isRegistered reports true after register / false after unregister", () => {
    expect(sub.isRegistered()).toBe(false);
    sub.registerAllSubscribers();
    expect(sub.isRegistered()).toBe(true);
    sub.unregisterAllSubscribers();
    expect(sub.isRegistered()).toBe(false);
  });

  it("subscriber count on the bridge bumps by 5 after registerAllSubscribers", () => {
    expect(bridge.subscriberCount("post_processor")).toBe(0);
    sub.registerAllSubscribers();
    expect(bridge.subscriberCount("post_processor")).toBe(1);
    expect(bridge.subscriberCount("mill_wizard")).toBe(1);
    expect(bridge.subscriberCount("lathe_wizard")).toBe(1);
    expect(bridge.subscriberCount("wedm_wizard")).toBe(1);
    expect(bridge.subscriberCount("print_to_program")).toBe(1);
  });
});

describe("SpeedFeedDownstreamSubscriberEngine — cache fill on auto-emit", () => {
  it("orchestrator.run() fills all 5 caches via auto-emit chain", () => {
    sub.registerAllSubscribers();
    orchestrator.run(MILL_STEEL);
    const snapshot = sub.cacheSnapshot();
    expect(snapshot.post_processor).toBe(1);
    expect(snapshot.mill_wizard).toBe(1);
    expect(snapshot.lathe_wizard).toBe(1);
    expect(snapshot.wedm_wizard).toBe(1);
    expect(snapshot.print_to_program).toBe(1);
  });

  it("two different keys produce two cache entries per domain", () => {
    sub.registerAllSubscribers();
    orchestrator.run(MILL_STEEL);
    orchestrator.run(LATHE_STEEL);
    const snapshot = sub.cacheSnapshot();
    expect(snapshot.post_processor).toBe(2);
    expect(snapshot.print_to_program).toBe(2);
  });

  it("re-running same key only updates (not appends) the cache entry", () => {
    sub.registerAllSubscribers();
    orchestrator.run(MILL_STEEL);
    orchestrator.run(MILL_STEEL);
    orchestrator.run(MILL_STEEL);
    expect(sub.cacheSnapshot().post_processor).toBe(1);
  });

  it("totalVersionCount sums across all caches monotonically", () => {
    sub.registerAllSubscribers();
    orchestrator.run(MILL_STEEL); // v=1, sums to 5 (1 per cache)
    const first = sub.totalVersionCount();
    orchestrator.run(MILL_STEEL); // v=2, sums to 10
    const second = sub.totalVersionCount();
    expect(second).toBeGreaterThan(first);
  });
});

describe("SpeedFeedDownstreamSubscriberEngine — per-domain cache lookups", () => {
  it("getPostProcessorPack returns pack with positive spindle_rpm", () => {
    sub.registerAllSubscribers();
    orchestrator.run(MILL_STEEL);
    const pack = sub.getPostProcessorPack(MILL_STEEL_KEY);
    expect(pack?.spindle_rpm).toBeGreaterThan(0);
    expect(pack?.coolant_code).toMatch(/^M0[789]$/);
  });

  it("getMillWizardDefaults returns pack with positive Vc and balance class", () => {
    sub.registerAllSubscribers();
    orchestrator.run(MILL_STEEL);
    const pack = sub.getMillWizardDefaults(MILL_STEEL_KEY);
    expect(pack?.cutting_speed_mpm).toBeGreaterThan(0);
    expect(["g0_4", "g1", "g2_5", "g6_3", "g16", "g40"]).toContain(pack?.recommended_balance_class ?? "");
  });

  it("getLatheWizardDefaults returns Sandvik-class insert recommendation", () => {
    sub.registerAllSubscribers();
    orchestrator.run(LATHE_STEEL);
    const pack = sub.getLatheWizardDefaults(LATHE_STEEL_KEY);
    expect(pack?.insert_recommendation).toMatch(/GC4225|KCP25|P25|carbide/i);
  });

  it("getWedmWizardDefaults returns applicable=false (wire EDM is not SFC)", () => {
    sub.registerAllSubscribers();
    orchestrator.run(MILL_STEEL);
    const pack = sub.getWedmWizardDefaults(MILL_STEEL_KEY);
    expect(pack?.applicable).toBe(false);
  });

  it("getPrintToProgramPack returns ordered rough≥finish rpm", () => {
    sub.registerAllSubscribers();
    orchestrator.run(MILL_STEEL);
    const pack = sub.getPrintToProgramPack(MILL_STEEL_KEY);
    const rough = pack?.stage_overrides.rough_strategy.rpm ?? 0;
    const finish = pack?.stage_overrides.finish_strategy.rpm ?? 0;
    expect(rough).toBeGreaterThanOrEqual(finish);
  });

  it("lookup for un-published key returns the falsy result (no cache pollution)", () => {
    sub.registerAllSubscribers();
    orchestrator.run(MILL_STEEL);
    const unknown = sub.getPostProcessorPack({ machine_name: "Unknown", material_name: "steel", tool_diameter_mm: 12 });
    expect(unknown).toBe(undefined);
  });
});

describe("SpeedFeedDownstreamSubscriberEngine — unregister stops cache updates", () => {
  it("after unregisterAllSubscribers a new orchestrator.run() does NOT fill caches", () => {
    sub.registerAllSubscribers();
    orchestrator.run(MILL_STEEL); // fills caches v=1
    sub.unregisterAllSubscribers();
    orchestrator.run(MILL_STEEL); // bridge gets v=2 but sub doesn't update
    const pack = sub.getPostProcessorPack(MILL_STEEL_KEY);
    expect(pack?.snapshot_version).toBe(1);
  });
});

describe("SpeedFeedDownstreamSubscriberEngine — cache version mirrors snapshot version", () => {
  it("pack.snapshot_version is monotonic across re-runs for same key", () => {
    sub.registerAllSubscribers();
    orchestrator.run(MILL_STEEL); // v=1
    const v1 = sub.getPostProcessorPack(MILL_STEEL_KEY)?.snapshot_version ?? 0;
    orchestrator.run(MILL_STEEL); // v=2
    const v2 = sub.getPostProcessorPack(MILL_STEEL_KEY)?.snapshot_version ?? 0;
    expect(v2).toBeGreaterThan(v1);
  });

  it("mill_wizard + print_to_program packs share the same version after a run", () => {
    sub.registerAllSubscribers();
    orchestrator.run(MILL_STEEL);
    const mw = sub.getMillWizardDefaults(MILL_STEEL_KEY)?.snapshot_version;
    const pp = sub.getPrintToProgramPack(MILL_STEEL_KEY)?.snapshot_version;
    expect(mw).toBe(pp);
  });
});
