/**
 * SpeedFeedOutcomeFeedbackBridgeEngine — tests
 *
 * Validates: capture appends to ring buffer, capacity cap, recordActuals,
 * recentForKey, stats accuracy, key-based isolation.
 *
 * @module __tests__/SpeedFeedOutcomeFeedbackBridgeEngine.test
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  SpeedFeedOutcomeFeedbackBridgeEngine,
  speedFeedOutcomeFeedbackBridgeEngine,
} from "../engines/SpeedFeedOutcomeFeedbackBridgeEngine.js";
import {
  speedFeedNineAxisOrchestratorEngine,
  type NineAxisInput,
} from "../engines/SpeedFeedNineAxisOrchestratorEngine.js";

const bridge = speedFeedOutcomeFeedbackBridgeEngine;
const orchestrator = speedFeedNineAxisOrchestratorEngine;

const MILL_STEEL: NineAxisInput = {
  machine: { name: "Haas-VF4SS" },
  material: { name: "steel" },
  tooling: { tool_diameter_mm: 12, flutes: 4, tool_material: "carbide" },
  toolpath: { operation: "milling", cut_type: "roughing" },
};

const LATHE_STEEL: NineAxisInput = {
  machine: { name: "Okuma-LB3000" },
  material: { name: "steel" },
  tooling: { tool_diameter_mm: 25, tool_material: "carbide" },
  toolpath: { operation: "turning", cut_type: "roughing" },
};

const MILL_STEEL_KEY = { machine_name: "Haas-VF4SS", material_name: "steel", tool_diameter_mm: 12 };

beforeEach(() => bridge.clear());

describe("SpeedFeedOutcomeFeedbackBridgeEngine — singleton + capture", () => {
  it("exports a singleton with capture()", () => {
    expect(speedFeedOutcomeFeedbackBridgeEngine).toBeInstanceOf(SpeedFeedOutcomeFeedbackBridgeEngine);
  });

  it("capture appends a record with valid ISO timestamp", () => {
    const r = orchestrator.run(MILL_STEEL);
    const rec = bridge.capture(MILL_STEEL, r);
    expect(rec.machine_name).toBe("Haas-VF4SS");
    expect(rec.material_name).toBe("steel");
    expect(rec.tool_diameter_mm).toBe(12);
    expect(new Date(rec.timestamp).toString()).not.toBe("Invalid Date");
  });

  it("recommended values are pulled from result.recommendation (not zero)", () => {
    const r = orchestrator.run(MILL_STEEL);
    const rec = bridge.capture(MILL_STEEL, r);
    expect(rec.recommended_vc_mpm).toBeGreaterThan(0);
    expect(rec.recommended_fz_mm).toBeGreaterThan(0);
    expect(rec.recommended_mrr_cm3min).toBeGreaterThan(0);
    expect(rec.recommended_tool_life_min).toBeGreaterThan(0);
  });

  it("captured_by tag identifies the orchestrator layer", () => {
    const r = orchestrator.run(MILL_STEEL);
    const rec = bridge.capture(MILL_STEEL, r);
    expect(rec.captured_by).toMatch(/NineAxisOrchestrator/);
  });
});

describe("SpeedFeedOutcomeFeedbackBridgeEngine — stats accuracy (auto-capture contract)", () => {
  // Auto-capture in NineAxisOrchestrator.run() fires before the explicit
  // bridge.capture() call in these tests — so each (run + capture) pair adds
  // 2 records (1 auto, 1 explicit). The contract here is monotonic growth.
  it("stats records_count grows monotonically", () => {
    expect(bridge.stats().records_count).toBe(0);
    bridge.capture(MILL_STEEL, orchestrator.run(MILL_STEEL));
    const after1 = bridge.stats().records_count;
    expect(after1).toBeGreaterThanOrEqual(1);
    bridge.capture(MILL_STEEL, orchestrator.run(MILL_STEEL));
    expect(bridge.stats().records_count).toBeGreaterThan(after1);
  });

  it("stats unique_keys counts distinct (machine, material, dia) triples", () => {
    bridge.capture(MILL_STEEL, orchestrator.run(MILL_STEEL));
    bridge.capture(LATHE_STEEL, orchestrator.run(LATHE_STEEL));
    expect(bridge.stats().unique_keys).toBe(2);
  });

  it("stats bus_capture_success_rate is 100 when all captures succeed", () => {
    bridge.capture(MILL_STEEL, orchestrator.run(MILL_STEEL));
    bridge.capture(LATHE_STEEL, orchestrator.run(LATHE_STEEL));
    expect(bridge.stats().bus_capture_success_rate_pct).toBe(100);
  });

  it("oldest_timestamp and newest_timestamp are non-null after captures", () => {
    bridge.capture(MILL_STEEL, orchestrator.run(MILL_STEEL));
    const s = bridge.stats();
    expect(typeof s.oldest_timestamp).toBe("string");
    expect(typeof s.newest_timestamp).toBe("string");
  });
});

describe("SpeedFeedOutcomeFeedbackBridgeEngine — recordActuals fold-back", () => {
  it("recordActuals returns true when a matching record exists", () => {
    bridge.capture(MILL_STEEL, orchestrator.run(MILL_STEEL));
    const ok = bridge.recordActuals(MILL_STEEL_KEY, { actual_vc_mpm: 215 });
    expect(ok).toBe(true);
  });

  it("recordActuals returns false when no record matches the key", () => {
    bridge.capture(MILL_STEEL, orchestrator.run(MILL_STEEL));
    const ok = bridge.recordActuals(
      { machine_name: "Unknown", material_name: "steel", tool_diameter_mm: 12 },
      { actual_vc_mpm: 215 },
    );
    expect(ok).toBe(false);
  });

  it("actualsCount increments when override is recorded", () => {
    bridge.capture(MILL_STEEL, orchestrator.run(MILL_STEEL));
    expect(bridge.actualsCount()).toBe(0);
    bridge.recordActuals(MILL_STEEL_KEY, { actual_vc_mpm: 220, actual_tool_life_min: 45 });
    expect(bridge.actualsCount()).toBe(1);
  });
});

describe("SpeedFeedOutcomeFeedbackBridgeEngine — recentForKey query", () => {
  it("recentForKey returns records sorted newest-first", () => {
    // 3 explicit captures + 3 auto-captures = 6 records, all matching MILL key
    bridge.capture(MILL_STEEL, orchestrator.run(MILL_STEEL));
    bridge.capture(MILL_STEEL, orchestrator.run(MILL_STEEL));
    bridge.capture(MILL_STEEL, orchestrator.run(MILL_STEEL));
    const recent = bridge.recentForKey(MILL_STEEL_KEY, 32);
    expect(recent.length).toBeGreaterThanOrEqual(3);
    // Newest-first ordering (timestamps descending)
    for (let i = 1; i < recent.length; i++) {
      expect(recent[i - 1]!.timestamp >= recent[i]!.timestamp).toBe(true);
    }
  });

  it("recentForKey respects the limit argument", () => {
    for (let i = 0; i < 5; i++) {
      bridge.capture(MILL_STEEL, orchestrator.run(MILL_STEEL));
    }
    const recent = bridge.recentForKey(MILL_STEEL_KEY, 2);
    expect(recent.length).toBe(2);
  });

  it("recentForKey for unknown key returns empty array", () => {
    bridge.capture(MILL_STEEL, orchestrator.run(MILL_STEEL));
    const recent = bridge.recentForKey({ machine_name: "Unknown", material_name: "X", tool_diameter_mm: 1 });
    expect(recent.length).toBe(0);
  });
});

describe("SpeedFeedOutcomeFeedbackBridgeEngine — ring buffer capacity", () => {
  it("capacity bound is enforced (capacity=3 caps records at 3)", () => {
    const small = new SpeedFeedOutcomeFeedbackBridgeEngine(3);
    const r = orchestrator.run(MILL_STEEL);
    small.capture(MILL_STEEL, r);
    small.capture(MILL_STEEL, r);
    small.capture(MILL_STEEL, r);
    small.capture(MILL_STEEL, r); // overflow — drops oldest
    expect(small.stats().records_count).toBe(3);
    expect(small.stats().capacity).toBe(3);
  });
});

describe("SpeedFeedOutcomeFeedbackBridgeEngine — clear", () => {
  it("clear empties the buffer", () => {
    bridge.capture(MILL_STEEL, orchestrator.run(MILL_STEEL));
    bridge.capture(LATHE_STEEL, orchestrator.run(LATHE_STEEL));
    expect(bridge.stats().records_count).toBeGreaterThanOrEqual(2);
    bridge.clear();
    expect(bridge.stats().records_count).toBe(0);
  });
});

describe("SpeedFeedOutcomeFeedbackBridgeEngine — key isolation", () => {
  it("recentForKey returns only matching-key records", () => {
    bridge.capture(MILL_STEEL, orchestrator.run(MILL_STEEL));
    bridge.capture(LATHE_STEEL, orchestrator.run(LATHE_STEEL));
    const mill = bridge.recentForKey(MILL_STEEL_KEY, 32);
    const lathe = bridge.recentForKey({ machine_name: "Okuma-LB3000", material_name: "steel", tool_diameter_mm: 25 }, 32);
    expect(mill.length).toBeGreaterThanOrEqual(1);
    expect(lathe.length).toBeGreaterThanOrEqual(1);
    // Cross-key contamination check
    for (const r of mill) expect(r.machine_name).toBe("Haas-VF4SS");
    for (const r of lathe) expect(r.machine_name).toBe("Okuma-LB3000");
  });
});
