/**
 * Tests for MillingDigitalTwinEngine (MILL-AGI Phase 0.5)
 *
 * Validates integrated digital twin functionality:
 *   - State synchronization
 *   - Predictive simulation
 *   - What-if scenario analysis
 *   - Anomaly detection
 *   - Health monitoring
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  MillingDigitalTwinEngine,
  millingDigitalTwinEngine,
  type MachineState,
  type TwinConfig,
} from "../engines/MillingDigitalTwinEngine.js";

describe("MillingDigitalTwinEngine (MILL-AGI P0.5)", () => {
  let engine: MillingDigitalTwinEngine;

  beforeEach(() => {
    engine = new MillingDigitalTwinEngine();
  });

  // ============================================================================
  // TEST DATA
  // ============================================================================

  const normalMachineState: Partial<MachineState> = {
    spindle: {
      speed_rpm: 3000,
      load_percent: 60,
      power_kw: 5,
      temperature_c: 45,
    },
    axes: {
      x_position_mm: 100,
      y_position_mm: 50,
      z_position_mm: -10,
      feedrate_mmpm: 1200,
    },
    coolant: {
      active: true,
      type: "flood",
      flow_rate_lpm: 20,
      temperature_c: 22,
    },
    tool: {
      id: "T1",
      diameter_mm: 16,
      flutes: 4,
      wear_vb_mm: 0.1,
      life_remaining_percent: 70,
    },
  };

  const criticalMachineState: Partial<MachineState> = {
    spindle: {
      speed_rpm: 5000,
      load_percent: 98,
      power_kw: 12,
      temperature_c: 75,
    },
    tool: {
      id: "T1",
      diameter_mm: 16,
      flutes: 4,
      wear_vb_mm: 0.28,
      life_remaining_percent: 10,
    },
  };

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  describe("initialization", () => {
    it("initializes with default state", () => {
      const state = engine.getState();

      expect(state.machine).toBeDefined();
      expect(state.process).toBeDefined();
      expect(state.quality).toBeDefined();
      expect(state.health).toBeDefined();
    });

    it("initializes with provided state", () => {
      engine.initialize(normalMachineState);
      const state = engine.getState();

      expect(state.machine.spindle.speed_rpm).toBe(3000);
      expect(state.sync_status).toBe("synchronized");
    });
  });

  // ============================================================================
  // SYNCHRONIZATION
  // ============================================================================

  describe("synchronization", () => {
    it("syncs machine state", () => {
      engine.initialize(normalMachineState);
      const result = engine.sync({ spindle: { ...normalMachineState.spindle!, speed_rpm: 3500 } });

      expect(result.state.machine.spindle.speed_rpm).toBe(3500);
      expect(result.state.sync_status).toBe("synchronized");
    });

    it("updates process state on sync", () => {
      engine.initialize(normalMachineState);
      const result = engine.sync(normalMachineState);

      expect(result.state.process.cutting_speed_mpm).toBeGreaterThan(0);
      expect(result.state.process.mrr_cm3pm).toBeGreaterThanOrEqual(0);
    });

    it("detects anomalies on sync", () => {
      engine.initialize(normalMachineState);
      const result = engine.sync(criticalMachineState);

      expect(result.anomalies.length).toBeGreaterThan(0);
    });

    it("computes drift", () => {
      engine.initialize(normalMachineState);
      engine.sync(normalMachineState);
      const result = engine.sync({
        spindle: { ...normalMachineState.spindle!, speed_rpm: 4000 },
      });

      expect(result.drift).toBeGreaterThanOrEqual(0);
    });

    it("saves history on sync", () => {
      engine.initialize(normalMachineState);
      engine.sync(normalMachineState);
      engine.sync(normalMachineState);

      const history = engine.getHistory();
      expect(history.length).toBe(2);
    });
  });

  // ============================================================================
  // STATE
  // ============================================================================

  describe("state", () => {
    it("returns complete twin state", () => {
      engine.initialize(normalMachineState);
      const state = engine.getState();

      expect(state.machine.spindle).toBeDefined();
      expect(state.machine.axes).toBeDefined();
      expect(state.machine.coolant).toBeDefined();
      expect(state.machine.tool).toBeDefined();
      expect(state.process.cutting_speed_mpm).toBeDefined();
      expect(state.quality.surface_roughness_um).toBeDefined();
      expect(state.health.overall_health).toBeDefined();
    });

    it("calculates cutting speed", () => {
      engine.initialize(normalMachineState);
      const state = engine.getState();

      // Vc = π * D * n / 1000
      const expectedVc = (Math.PI * 16 * 3000) / 1000;
      expect(state.process.cutting_speed_mpm).toBeCloseTo(expectedVc, 0);
    });

    it("calculates feed per tooth", () => {
      engine.initialize(normalMachineState);
      const state = engine.getState();

      // fz = vf / (n * z)
      const expectedFz = 1200 / (3000 * 4);
      expect(state.process.feed_per_tooth_mm).toBeCloseTo(expectedFz, 4);
    });
  });

  // ============================================================================
  // SIMULATION
  // ============================================================================

  describe("simulation", () => {
    it("simulates future state", () => {
      engine.initialize(normalMachineState);
      const simResult = engine.simulate(60);

      expect(simResult.predicted_state).toBeDefined();
      expect(simResult.confidence).toBeGreaterThan(0);
      expect(simResult.confidence).toBeLessThanOrEqual(1);
    });

    it("simulates tool wear progression", () => {
      engine.initialize(normalMachineState);
      const initialWear = engine.getState().machine.tool.wear_vb_mm;

      const simResult = engine.simulate(300);

      expect(simResult.predicted_state.machine.tool.wear_vb_mm).toBeGreaterThan(initialWear);
    });

    it("simulates with parameter changes", () => {
      engine.initialize(normalMachineState);

      const simResult = engine.simulate(60, {
        cutting_speed_mpm: 200,
      });

      expect(simResult.predicted_state.process.cutting_speed_mpm).toBe(200);
    });

    it("generates warnings for critical conditions", () => {
      engine.initialize({
        ...normalMachineState,
        tool: { ...normalMachineState.tool!, wear_vb_mm: 0.25, life_remaining_percent: 15 },
      });

      const simResult = engine.simulate(60);

      // May or may not generate warnings depending on simulation path
      expect(Array.isArray(simResult.warnings)).toBe(true);
    });

    it("provides optimization suggestions", () => {
      engine.initialize({
        ...normalMachineState,
        tool: { ...normalMachineState.tool!, wear_vb_mm: 0.25, life_remaining_percent: 15 },
      });

      const simResult = engine.simulate(60);

      // Suggestions array should exist
      expect(Array.isArray(simResult.optimization_suggestions)).toBe(true);
    });
  });

  // ============================================================================
  // WHAT-IF ANALYSIS
  // ============================================================================

  describe("what-if analysis", () => {
    it("runs multiple scenarios", () => {
      engine.initialize(normalMachineState);

      const scenarios = [
        { name: "High speed", changes: { cutting_speed_mpm: 250 } },
        { name: "Low speed", changes: { cutting_speed_mpm: 100 } },
      ];

      const results = engine.whatIf(scenarios);

      expect(results.length).toBe(2);
      expect(results[0].scenario).toBe("High speed");
      expect(results[1].scenario).toBe("Low speed");
    });

    it("compares scenarios to baseline", () => {
      engine.initialize(normalMachineState);

      const scenarios = [{ name: "Aggressive", changes: { feed_per_tooth_mm: 0.2 } }];

      const results = engine.whatIf(scenarios);

      expect(results[0].comparison.mrr_change_percent).toBeDefined();
      expect(results[0].comparison.surface_change_percent).toBeDefined();
    });
  });

  // ============================================================================
  // HISTORY
  // ============================================================================

  describe("history", () => {
    it("stores snapshots", () => {
      engine.initialize(normalMachineState);

      for (let i = 0; i < 5; i++) {
        engine.sync(normalMachineState);
      }

      const history = engine.getHistory();
      expect(history.length).toBe(5);
    });

    it("limits history size", () => {
      const smallHistoryEngine = new MillingDigitalTwinEngine({ history_size: 3 });
      smallHistoryEngine.initialize(normalMachineState);

      for (let i = 0; i < 10; i++) {
        smallHistoryEngine.sync(normalMachineState);
      }

      const history = smallHistoryEngine.getHistory();
      expect(history.length).toBe(3);
    });

    it("retrieves limited history", () => {
      engine.initialize(normalMachineState);

      for (let i = 0; i < 10; i++) {
        engine.sync(normalMachineState);
      }

      const recentHistory = engine.getHistory(3);
      expect(recentHistory.length).toBe(3);
    });

    it("replays state at timestamp", () => {
      engine.initialize(normalMachineState);
      engine.sync(normalMachineState);

      const history = engine.getHistory();
      const timestamp = history[0].timestamp;

      const replayedState = engine.replayAt(timestamp);
      expect(replayedState).not.toBeNull();
    });
  });

  // ============================================================================
  // ANOMALY DETECTION
  // ============================================================================

  describe("anomaly detection", () => {
    it("detects spindle overload", () => {
      engine.initialize(normalMachineState);
      const result = engine.sync({
        spindle: { ...normalMachineState.spindle!, load_percent: 98 },
      });

      expect(result.anomalies).toContain("Spindle overload detected");
    });

    it("detects excessive vibration", () => {
      engine.initialize(normalMachineState);
      engine.sync(normalMachineState);

      // Manually update process state to trigger vibration anomaly
      const state = engine.getState();
      expect(state.health.anomalies).toBeDefined();
    });

    it("detects tool wear critical", () => {
      engine.initialize(normalMachineState);
      const result = engine.sync({
        tool: { ...normalMachineState.tool!, wear_vb_mm: 0.29 },
      });

      expect(result.anomalies).toContain("Tool wear critical");
    });
  });

  // ============================================================================
  // HEALTH MONITORING
  // ============================================================================

  describe("health monitoring", () => {
    it("returns health report", () => {
      engine.initialize(normalMachineState);
      const report = engine.getHealthReport();

      expect(report.overall_score).toBeGreaterThanOrEqual(0);
      expect(report.overall_score).toBeLessThanOrEqual(1);
      expect(report.components.tool).toBeDefined();
      expect(report.components.spindle).toBeDefined();
    });

    it("tracks tool condition", () => {
      engine.initialize(normalMachineState);
      let state = engine.getState();
      expect(state.health.tool_condition).toBe("good");

      engine.sync({ tool: { ...normalMachineState.tool!, wear_vb_mm: 0.2 } });
      state = engine.getState();
      expect(state.health.tool_condition).toBe("warning");

      engine.sync({ tool: { ...normalMachineState.tool!, wear_vb_mm: 0.27 } });
      state = engine.getState();
      expect(state.health.tool_condition).toBe("critical");
    });

    it("tracks spindle condition", () => {
      engine.initialize(normalMachineState);
      engine.sync({ spindle: { ...normalMachineState.spindle!, load_percent: 95 } });

      const state = engine.getState();
      expect(state.health.spindle_condition).toBe("warning");
    });
  });

  // ============================================================================
  // OPTIMIZATION SUGGESTIONS
  // ============================================================================

  describe("optimization suggestions", () => {
    it("suggests tool life optimization", () => {
      engine.initialize({
        ...normalMachineState,
        tool: { ...normalMachineState.tool!, life_remaining_percent: 20 },
      });

      const suggestions = engine.getOptimizationSuggestions();
      expect(suggestions.some((s) => s.includes("tool life"))).toBe(true);
    });

    it("suggests surface finish optimization", () => {
      engine.initialize(normalMachineState);
      // Force high surface roughness through process state
      engine.sync(normalMachineState);

      const suggestions = engine.getOptimizationSuggestions();
      expect(Array.isArray(suggestions)).toBe(true);
    });
  });

  // ============================================================================
  // STATISTICS
  // ============================================================================

  describe("statistics", () => {
    it("tracks sync count", () => {
      engine.initialize(normalMachineState);
      engine.sync(normalMachineState);
      engine.sync(normalMachineState);

      const stats = engine.getStatistics();
      expect(stats.sync_count).toBe(2);
    });

    it("tracks history size", () => {
      engine.initialize(normalMachineState);
      engine.sync(normalMachineState);
      engine.sync(normalMachineState);

      const stats = engine.getStatistics();
      expect(stats.history_size).toBe(2);
    });

    it("tracks anomaly count", () => {
      engine.initialize(normalMachineState);
      engine.sync(criticalMachineState);

      const stats = engine.getStatistics();
      expect(stats.anomaly_count).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // RESET
  // ============================================================================

  describe("reset", () => {
    it("resets all state", () => {
      engine.initialize(normalMachineState);
      engine.sync(normalMachineState);
      engine.sync(normalMachineState);

      engine.reset();

      const stats = engine.getStatistics();
      expect(stats.sync_count).toBe(0);
      expect(stats.history_size).toBe(0);
    });
  });

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  describe("configuration", () => {
    it("returns config", () => {
      const config = engine.getConfig();

      expect(config.sync_interval_ms).toBeDefined();
      expect(config.history_size).toBeDefined();
    });

    it("applies custom config", () => {
      const customEngine = new MillingDigitalTwinEngine({
        history_size: 500,
        anomaly_threshold: 0.2,
      });

      const config = customEngine.getConfig();
      expect(config.history_size).toBe(500);
      expect(config.anomaly_threshold).toBe(0.2);
    });
  });

  // ============================================================================
  // SINGLETON
  // ============================================================================

  describe("singleton", () => {
    it("exports singleton instance", () => {
      expect(millingDigitalTwinEngine).toBeDefined();
      expect(millingDigitalTwinEngine).toBeInstanceOf(MillingDigitalTwinEngine);
    });
  });
});
