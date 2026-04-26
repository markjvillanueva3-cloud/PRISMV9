/**
 * PPGInferenceGateWireEngine Tests — U-PPG-SFC-06
 * ================================================
 *
 * Integration tests for the PPG inference gate that wraps PPG outputs through
 * InferenceLoRAGate for LoRA adapter delivery. Uses real engine instances.
 *
 * @module __tests__/engines/ppgInferenceGateWireEngine.test
 * @milestone PSAU-PPG-SFC U-PPG-SFC-06
 */

import { describe, it, expect } from "vitest";
import {
  PPGInferenceGateWireEngine,
  ppgInferenceGateWireEngine,
} from "../../engines/PPGInferenceGateWireEngine.js";
import type { PPGInferenceGateInput } from "../../schemas/ppgInferenceGateSchema.js";

describe("PPGInferenceGateWireEngine", () => {
  describe("apply() — gate-miss scenario (no adapters registered)", () => {
    it("returns baseline unchanged when no adapter matches", () => {
      const engine = new PPGInferenceGateWireEngine();
      const input: PPGInferenceGateInput = {
        engine: "PostProcessorEngine",
        baseline: {
          feed_rate_override: 100,
          spindle_override: 100,
          rapid_override: 50,
          coolant_pressure: 70,
          dwell_time: 500,
        },
        controller: "fanuc",
        machine_class: "vmc",
        dialect_family: "fanuc_31i",
        operation: "roughing",
      };

      const result = engine.apply(input);

      expect(result.ok).toBe(true);
      expect(result.adapter_hit).toBe(false);
      expect(result.adapter_used).toBeNull();
      expect(result.adapter_status).toBeNull();
      expect(result.confidence).toBe(0);
      expect(Object.keys(result.residual_applied).length).toBe(0);
      expect(result.adapted.feed_rate_override).toBe(100);
      expect(result.adapted.spindle_override).toBe(100);
      expect(result.adapted.rapid_override).toBe(50);
    });

    it("preserves all baseline fields through gate-miss", () => {
      const engine = new PPGInferenceGateWireEngine();
      const result = engine.apply({
        engine: "TestEngine",
        baseline: {
          feed_rate_override: 85,
          spindle_override: 110,
          rapid_override: 75,
          coolant_pressure: 45,
          dwell_time: 250,
          retract_height: 5,
          approach_feed: 500,
          plunge_feed: 200,
          lead_in_radius: 2,
          lead_out_radius: 2,
        },
        controller: "siemens",
      });

      expect(result.adapted.feed_rate_override).toBe(85);
      expect(result.adapted.spindle_override).toBe(110);
      expect(result.adapted.rapid_override).toBe(75);
      expect(result.adapted.coolant_pressure).toBe(45);
      expect(result.adapted.dwell_time).toBe(250);
      expect(result.adapted.retract_height).toBe(5);
      expect(result.adapted.approach_feed).toBe(500);
      expect(result.adapted.plunge_feed).toBe(200);
      expect(result.adapted.lead_in_radius).toBe(2);
      expect(result.adapted.lead_out_radius).toBe(2);
    });

    it("populates match_context from input fields", () => {
      const engine = new PPGInferenceGateWireEngine();
      const result = engine.apply({
        engine: "TestEngine",
        baseline: { feed_rate_override: 100 },
        controller: "siemens",
        machine_class: "hmc",
        dialect_family: "sinumerik_840d",
        customer: "AEROSPACE-CO",
      });

      expect(result.match_context.controller).toBe("siemens");
      expect(result.match_context.machine_class).toBe("hmc");
      expect(result.match_context.dialect_family).toBe("sinumerik_840d");
      expect(result.match_context.customer).toBe("AEROSPACE-CO");
    });

    it("includes gate_version 1.0.0 in result", () => {
      const result = ppgInferenceGateWireEngine.apply({
        engine: "Test",
        baseline: { feed_rate_override: 100 },
      });

      expect(result.gate_version).toBe("1.0.0");
    });

    it("includes valid ISO8601 timestamp in result", () => {
      const result = ppgInferenceGateWireEngine.apply({
        engine: "Test",
        baseline: { feed_rate_override: 100 },
      });

      expect(result.timestamp.length).toBeGreaterThan(0);
      const parsed = new Date(result.timestamp);
      expect(parsed.toISOString()).toBe(result.timestamp);
    });

    it("passes through lineage_id when provided", () => {
      const result = ppgInferenceGateWireEngine.apply({
        engine: "Test",
        baseline: { feed_rate_override: 100 },
        lineage_id: "lineage-ppg-12345",
      });

      expect(result.lineage_id).toBe("lineage-ppg-12345");
    });
  });

  describe("controller normalization", () => {
    it("normalizes Sinumerik to siemens", () => {
      const result = ppgInferenceGateWireEngine.apply({
        engine: "Test",
        baseline: { feed_rate_override: 100 },
        controller: "sinumerik",
      });

      expect(result.match_context.controller).toBe("siemens");
    });

    it("normalizes OSP to okuma", () => {
      const result = ppgInferenceGateWireEngine.apply({
        engine: "Test",
        baseline: { feed_rate_override: 100 },
        controller: "osp",
      });

      expect(result.match_context.controller).toBe("okuma");
    });

    it("normalizes TNC to heidenhain", () => {
      const result = ppgInferenceGateWireEngine.apply({
        engine: "Test",
        baseline: { feed_rate_override: 100 },
        controller: "tnc",
      });

      expect(result.match_context.controller).toBe("heidenhain");
    });

    it("normalizes Mazatrol to mazak", () => {
      const result = ppgInferenceGateWireEngine.apply({
        engine: "Test",
        baseline: { feed_rate_override: 100 },
        controller: "mazatrol",
      });

      expect(result.match_context.controller).toBe("mazak");
    });

    it("normalizes GE_Fanuc to fanuc", () => {
      const result = ppgInferenceGateWireEngine.apply({
        engine: "Test",
        baseline: { feed_rate_override: 100 },
        controller: "ge_fanuc",
      });

      expect(result.match_context.controller).toBe("fanuc");
    });

    it("normalizes WinMax to hurco", () => {
      const result = ppgInferenceGateWireEngine.apply({
        engine: "Test",
        baseline: { feed_rate_override: 100 },
        controller: "winmax",
      });

      expect(result.match_context.controller).toBe("hurco");
    });

    it("normalizes Meldas to mitsubishi", () => {
      const result = ppgInferenceGateWireEngine.apply({
        engine: "Test",
        baseline: { feed_rate_override: 100 },
        controller: "meldas",
      });

      expect(result.match_context.controller).toBe("mitsubishi");
    });

    it("normalizes DMG to dmg_mori", () => {
      const result = ppgInferenceGateWireEngine.apply({
        engine: "Test",
        baseline: { feed_rate_override: 100 },
        controller: "dmg",
      });

      expect(result.match_context.controller).toBe("dmg_mori");
    });

    it("preserves unknown controllers as lowercase with underscore normalization", () => {
      const result = ppgInferenceGateWireEngine.apply({
        engine: "Test",
        baseline: { feed_rate_override: 100 },
        controller: "Custom-Controller",
      });

      expect(result.match_context.controller).toBe("custom_controller");
    });

    it("handles case variations correctly", () => {
      const result = ppgInferenceGateWireEngine.apply({
        engine: "Test",
        baseline: { feed_rate_override: 100 },
        controller: "FANUC",
      });

      expect(result.match_context.controller).toBe("fanuc");
    });
  });

  describe("applyToPPGResult() — PPG result integration", () => {
    it("extracts baseline from flat PPG result structure", () => {
      const ppgResult = {
        feed_rate_override: 100,
        spindle_override: 100,
        rapid_override: 50,
        coolant_mode: "flood",
        some_other_field: "value",
      };

      const { result, gateOutput } = ppgInferenceGateWireEngine.applyToPPGResult(ppgResult, {
        engine: "PostProcessorEngine",
        controller: "fanuc",
        machine_class: "vmc",
        operation: "roughing",
      });

      expect(gateOutput.ok).toBe(true);
      expect(gateOutput.adapter_hit).toBe(false);
      expect(gateOutput.baseline.feed_rate_override).toBe(100);
      expect(gateOutput.baseline.spindle_override).toBe(100);
      expect(gateOutput.baseline.rapid_override).toBe(50);
      expect(result.feed_rate_override).toBe(100);
      expect(result.coolant_mode).toBe("flood");
    });

    it("extracts from nested overrides object", () => {
      const ppgResult = {
        overrides: { feed: 95, spindle: 105, rapid: 60 },
        program_number: 1234,
      };

      const { gateOutput } = ppgInferenceGateWireEngine.applyToPPGResult(ppgResult, {
        engine: "Test",
        controller: "fanuc",
      });

      expect(gateOutput.baseline.feed_rate_override).toBe(95);
      expect(gateOutput.baseline.spindle_override).toBe(105);
      expect(gateOutput.baseline.rapid_override).toBe(60);
    });

    it("extracts from nested motion_params object", () => {
      const ppgResult = {
        motion_params: { approach_feed: 500, plunge_feed: 200, retract_height: 5 },
      };

      const { gateOutput } = ppgInferenceGateWireEngine.applyToPPGResult(ppgResult, {
        engine: "Test",
        controller: "okuma",
      });

      expect(gateOutput.baseline.approach_feed).toBe(500);
      expect(gateOutput.baseline.plunge_feed).toBe(200);
      expect(gateOutput.baseline.retract_height).toBe(5);
    });

    it("preserves non-baseline fields in result", () => {
      const ppgResult = {
        feed_rate_override: 100,
        custom_field: "preserved",
        nested: { data: 42 },
      };

      const { result } = ppgInferenceGateWireEngine.applyToPPGResult(ppgResult, {
        engine: "Test",
        controller: "haas",
      });

      expect(result.custom_field).toBe("preserved");
      expect((result.nested as { data: number }).data).toBe(42);
    });
  });

  describe("wouldMatch() — probe without applying", () => {
    it("returns false when no adapters are registered", () => {
      const wouldHit = ppgInferenceGateWireEngine.wouldMatch({
        controller: "fanuc",
        machine_class: "vmc",
        dialect_family: "fanuc_31i",
        operation: "roughing",
      });

      expect(wouldHit).toBe(false);
    });

    it("returns false for exotic controller with no adapter", () => {
      const wouldHit = ppgInferenceGateWireEngine.wouldMatch({
        controller: "exotic_controller",
        machine_class: "unknown",
      });

      expect(wouldHit).toBe(false);
    });
  });

  describe("measureHitRate() — batch coverage testing", () => {
    it("returns 0% hit rate when no adapters registered", () => {
      const contexts = [
        { controller: "fanuc", machine_class: "vmc", operation: "roughing" },
        { controller: "siemens", machine_class: "hmc", operation: "finishing" },
        { controller: "okuma", machine_class: "lathe", operation: "turning" },
        { controller: "haas", machine_class: "vmc", operation: "drilling" },
        { controller: "mazak", machine_class: "mill_turn", operation: "milling" },
      ];

      const stats = ppgInferenceGateWireEngine.measureHitRate(contexts);

      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(5);
      expect(stats.hit_rate).toBe(0);
    });

    it("returns 0 hit rate for empty context list", () => {
      const stats = ppgInferenceGateWireEngine.measureHitRate([]);

      expect(stats.hit_rate).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });

  describe("getControllerAliases()", () => {
    it("returns complete controller alias mapping", () => {
      const aliases = PPGInferenceGateWireEngine.getControllerAliases();

      expect(aliases.sinumerik).toBe("siemens");
      expect(aliases.osp).toBe("okuma");
      expect(aliases.tnc).toBe("heidenhain");
      expect(aliases.mazatrol).toBe("mazak");
      expect(aliases.ge_fanuc).toBe("fanuc");
      expect(aliases.meldas).toBe("mitsubishi");
      expect(aliases.winmax).toBe("hurco");
      expect(aliases.dmg).toBe("dmg_mori");
      expect(aliases.mori).toBe("dmg_mori");
    });

    it("returns a copy not the original (immutability)", () => {
      const aliases1 = PPGInferenceGateWireEngine.getControllerAliases();
      const aliases2 = PPGInferenceGateWireEngine.getControllerAliases();

      expect(aliases1).not.toBe(aliases2);
      expect(aliases1).toEqual(aliases2);
    });
  });

  describe("getSelfAwareness()", () => {
    it("returns engine name and version", () => {
      const awareness = PPGInferenceGateWireEngine.getSelfAwareness();

      expect(awareness.name).toBe("PPGInferenceGateWireEngine");
      expect(awareness.version).toBe("1.0.0");
    });

    it("returns correct milestone identifier", () => {
      const awareness = PPGInferenceGateWireEngine.getSelfAwareness();

      expect(awareness.milestone).toBe("PSAU-PPG-SFC U-PPG-SFC-06");
    });

    it("lists all four public capabilities", () => {
      const awareness = PPGInferenceGateWireEngine.getSelfAwareness();

      expect(awareness.capabilities).toContain("apply");
      expect(awareness.capabilities).toContain("applyToPPGResult");
      expect(awareness.capabilities).toContain("wouldMatch");
      expect(awareness.capabilities).toContain("measureHitRate");
      expect(awareness.capabilities.length).toBe(4);
    });

    it("lists InferenceLoRAGateEngine as dependency", () => {
      const awareness = PPGInferenceGateWireEngine.getSelfAwareness();

      expect(awareness.dependencies).toContain("InferenceLoRAGateEngine");
      expect(awareness.dependencies).toContain("LoRAAdapterRegistryEngine");
    });

    it("surfaces into PPGProvenanceWireEngine", () => {
      const awareness = PPGInferenceGateWireEngine.getSelfAwareness();

      expect(awareness.surfaces_into).toContain("PPGProvenanceWireEngine.adapter_info");
    });
  });

  describe("singleton export", () => {
    it("exports a singleton instance of correct type", () => {
      expect(ppgInferenceGateWireEngine).toBeInstanceOf(PPGInferenceGateWireEngine);
    });

    it("singleton produces consistent results", () => {
      const result1 = ppgInferenceGateWireEngine.apply({
        engine: "Test",
        baseline: { feed_rate_override: 100 },
        controller: "fanuc",
      });
      const result2 = ppgInferenceGateWireEngine.apply({
        engine: "Test",
        baseline: { feed_rate_override: 100 },
        controller: "fanuc",
      });

      expect(result1.ok).toBe(result2.ok);
      expect(result1.adapter_hit).toBe(result2.adapter_hit);
      expect(result1.adapted.feed_rate_override).toBe(result2.adapted.feed_rate_override);
    });
  });

  describe("edge cases", () => {
    it("handles empty baseline gracefully", () => {
      const result = ppgInferenceGateWireEngine.apply({
        engine: "Test",
        baseline: {},
        controller: "fanuc",
      });

      expect(result.ok).toBe(true);
      expect(result.adapter_hit).toBe(false);
      expect(Object.keys(result.baseline).length).toBe(0);
      expect(Object.keys(result.adapted).length).toBe(0);
    });

    it("filters NaN values from baseline", () => {
      const result = ppgInferenceGateWireEngine.apply({
        engine: "Test",
        baseline: {
          feed_rate_override: 100,
          spindle_override: NaN,
          rapid_override: 50,
        },
        controller: "fanuc",
      });

      expect(result.ok).toBe(true);
      expect(result.baseline.feed_rate_override).toBe(100);
      expect(result.baseline.rapid_override).toBe(50);
      expect("spindle_override" in result.baseline).toBe(false);
    });

    it("handles missing controller with undefined in match_context", () => {
      const result = ppgInferenceGateWireEngine.apply({
        engine: "Test",
        baseline: { feed_rate_override: 100 },
      });

      expect(result.ok).toBe(true);
      expect(result.match_context.controller).toBe(undefined);
    });

    it("uses machine_class when machine_id is not provided", () => {
      const result = ppgInferenceGateWireEngine.apply({
        engine: "Test",
        baseline: { feed_rate_override: 100 },
        machine_class: "5axis",
      });

      expect(result.ok).toBe(true);
      expect(result.match_context.machine_class).toBe("5axis");
    });

    it("handles zero baseline values correctly", () => {
      const result = ppgInferenceGateWireEngine.apply({
        engine: "Test",
        baseline: {
          feed_rate_override: 0,
          dwell_time: 0,
        },
        controller: "fanuc",
      });

      expect(result.adapted.feed_rate_override).toBe(0);
      expect(result.adapted.dwell_time).toBe(0);
    });

    it("handles negative baseline values correctly", () => {
      const result = ppgInferenceGateWireEngine.apply({
        engine: "Test",
        baseline: {
          retract_height: -5,
        },
        controller: "fanuc",
      });

      expect(result.adapted.retract_height).toBe(-5);
    });

    it("handles large baseline values correctly", () => {
      const result = ppgInferenceGateWireEngine.apply({
        engine: "Test",
        baseline: {
          feed_rate_override: 999999,
          dwell_time: 1e10,
        },
        controller: "fanuc",
      });

      expect(result.adapted.feed_rate_override).toBe(999999);
      expect(result.adapted.dwell_time).toBe(1e10);
    });
  });
});
