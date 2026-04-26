/**
 * SFCInferenceGateWireEngine Tests — U-PPG-SFC-05
 * ================================================
 *
 * Tests for the SFC inference gate that wraps SFC outputs through
 * InferenceLoRAGate for LoRA adapter delivery.
 *
 * @module __tests__/engines/sfcInferenceGateWireEngine.test
 * @milestone PSAU-PPG-SFC U-PPG-SFC-05
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  SFCInferenceGateWireEngine,
  sfcInferenceGateWireEngine,
} from "../../engines/SFCInferenceGateWireEngine.js";
import { InferenceLoRAGateEngine } from "../../engines/InferenceLoRAGateEngine.js";
import type { SFCInferenceGateInput } from "../../schemas/sfcInferenceGateSchema.js";

describe("SFCInferenceGateWireEngine", () => {
  describe("apply() — gate-miss scenario", () => {
    it("returns baseline unchanged when no adapter matches", () => {
      const engine = new SFCInferenceGateWireEngine();
      const input: SFCInferenceGateInput = {
        engine: "UltimateSpeedFeedEngine",
        baseline: {
          vc: 200,
          rpm: 3000,
          fpt: 0.1,
          feed_rate: 600,
          doc: 3,
          woc: 10,
        },
        material: "Aluminum 6061",
        iso_group: "N",
        tool_class: "endmill",
        operation: "roughing",
      };

      const result = engine.apply(input);

      expect(result.ok).toBe(true);
      expect(result.adapter_hit).toBe(false);
      expect(result.adapter_used).toBeNull();
      expect(result.adapter_status).toBeNull();
      expect(result.confidence).toBe(0);
      expect(Object.keys(result.residual_applied).length).toBe(0);
      // Baseline passes through unchanged
      expect(result.adapted.vc).toBe(200);
      expect(result.adapted.rpm).toBe(3000);
      expect(result.adapted.fpt).toBe(0.1);
    });

    it("populates match_context from input", () => {
      const engine = new SFCInferenceGateWireEngine();
      const input: SFCInferenceGateInput = {
        engine: "TestEngine",
        baseline: { vc: 100 },
        material: "Steel 4140",
        operation: "finishing",
        machine_id: "VMC-001",
        customer: "ACME",
      };

      const result = engine.apply(input);

      expect(result.match_context.material).toBe("Steel 4140");
      expect(result.match_context.operation).toBe("finishing");
      expect(result.match_context.machine).toBe("VMC-001");
      expect(result.match_context.customer).toBe("ACME");
    });

    it("includes gate_version and timestamp", () => {
      const engine = new SFCInferenceGateWireEngine();
      const result = engine.apply({
        engine: "Test",
        baseline: { vc: 100 },
      });

      expect(result.gate_version).toBe("1.0.0");
      expect(result.timestamp.length).toBeGreaterThan(0);
      // ISO8601 format check
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });

    it("passes through lineage_id when provided", () => {
      const engine = new SFCInferenceGateWireEngine();
      const result = engine.apply({
        engine: "Test",
        baseline: { vc: 100 },
        lineage_id: "lineage-12345",
      });

      expect(result.lineage_id).toBe("lineage-12345");
    });
  });

  describe("apply() — adapter-hit scenario", () => {
    it("applies adapter residuals when adapter matches", () => {
      // Create mock gate that returns an adapter hit
      const mockGate = {
        apply: vi.fn().mockReturnValue({
          adapted: { vc: 210, rpm: 3150 }, // +5% residuals
          baseline: { vc: 200, rpm: 3000 },
          adapter_used: "steel-roughing-adapter-v1",
          adapter_status: "active",
          residual_applied: { vc: 10, rpm: 150 },
          confidence: 0.85,
          provenance: {},
        }),
      } as unknown as InferenceLoRAGateEngine;

      const engine = new SFCInferenceGateWireEngine(mockGate);
      const result = engine.apply({
        engine: "UltimateSpeedFeedEngine",
        baseline: { vc: 200, rpm: 3000 },
        material: "Steel 4140",
        iso_group: "P",
        tool_class: "endmill",
        operation: "roughing",
        machine_id: "VMC-001",
      });

      expect(result.ok).toBe(true);
      expect(result.adapter_hit).toBe(true);
      expect(result.adapter_used).toBe("steel-roughing-adapter-v1");
      expect(result.adapter_status).toBe("active");
      expect(result.confidence).toBe(0.85);
      expect(result.adapted.vc).toBe(210);
      expect(result.adapted.rpm).toBe(3150);
      expect(result.residual_applied.vc).toBe(10);
      expect(result.residual_applied.rpm).toBe(150);
    });

    it("builds correct context for adapter matching", () => {
      const mockGate = {
        apply: vi.fn().mockReturnValue({
          adapted: { vc: 100 },
          baseline: { vc: 100 },
          adapter_used: null,
          adapter_status: null,
          residual_applied: {},
          confidence: 0,
          provenance: {},
        }),
      } as unknown as InferenceLoRAGateEngine;

      const engine = new SFCInferenceGateWireEngine(mockGate);
      engine.apply({
        engine: "TestEngine",
        baseline: { vc: 100 },
        material: "Titanium Ti-6Al-4V",
        iso_group: "S",
        tool_class: "ball_endmill",
        machine_id: "5AX-DMG",
        machine_type: "5axis",
        operation: "finishing",
        customer: "AEROSPACE-CO",
      });

      expect(mockGate.apply).toHaveBeenCalledWith(
        expect.objectContaining({
          engine_name: "TestEngine",
          domain: "sfc",
          context: expect.objectContaining({
            material: "Titanium Ti-6Al-4V",
            operation: "finishing",
            machine: "5AX-DMG",
            customer: "AEROSPACE-CO",
            tool_geometry_class: "ball_endmill",
          }),
        }),
      );
    });
  });

  describe("applyToSFCResult() — SFC result integration", () => {
    it("extracts baseline from OptimizedValue structures", () => {
      const mockGate = {
        apply: vi.fn().mockReturnValue({
          adapted: { vc: 220, rpm: 3300 },
          baseline: { vc: 200, rpm: 3000 },
          adapter_used: "test-adapter",
          adapter_status: "active",
          residual_applied: { vc: 20, rpm: 300 },
          confidence: 0.9,
          provenance: {},
        }),
      } as unknown as InferenceLoRAGateEngine;

      const engine = new SFCInferenceGateWireEngine(mockGate);

      const sfcResult = {
        cutting_speed: { value: 200, unit: "m/min", source: "Kienzle" },
        spindle_rpm: { value: 3000, unit: "rpm", source: "calculated" },
        feed_per_tooth: { value: 0.1, unit: "mm", source: "catalog" },
      };

      const { result, gateOutput } = engine.applyToSFCResult(sfcResult, {
        engine: "UltimateSpeedFeedEngine",
        material: "Steel",
        operation: "roughing",
      });

      // Gate receives extracted baseline
      expect(mockGate.apply).toHaveBeenCalledWith(
        expect.objectContaining({
          baseline: expect.objectContaining({
            vc: 200,
            rpm: 3000,
            fpt: 0.1,
          }),
        }),
      );

      // Result has adapted values merged back
      expect((result.cutting_speed as { value: number }).value).toBe(220);
      expect((result.spindle_rpm as { value: number }).value).toBe(3300);
      expect(gateOutput.adapter_hit).toBe(true);
    });

    it("marks adapted fields with adapted: true", () => {
      const mockGate = {
        apply: vi.fn().mockReturnValue({
          adapted: { vc: 210 },
          baseline: { vc: 200 },
          adapter_used: "adapter-1",
          adapter_status: "active",
          residual_applied: { vc: 10 },
          confidence: 0.8,
          provenance: {},
        }),
      } as unknown as InferenceLoRAGateEngine;

      const engine = new SFCInferenceGateWireEngine(mockGate);
      const sfcResult = {
        cutting_speed: { value: 200, unit: "m/min", source: "calc" },
      };

      const { result } = engine.applyToSFCResult(sfcResult, {
        engine: "Test",
        material: "Steel",
      });

      const cuttingSpeed = result.cutting_speed as { value: number; adapted: boolean };
      expect(cuttingSpeed.value).toBe(210);
      expect(cuttingSpeed.adapted).toBe(true);
    });
  });

  describe("wouldMatch() — probe without applying", () => {
    it("returns true when adapter would match", () => {
      const mockGate = {
        apply: vi.fn().mockReturnValue({
          adapted: { vc: 100 },
          baseline: { vc: 100 },
          adapter_used: "some-adapter",
          adapter_status: "active",
          residual_applied: {},
          confidence: 0.7,
          provenance: {},
        }),
      } as unknown as InferenceLoRAGateEngine;

      const engine = new SFCInferenceGateWireEngine(mockGate);
      const wouldHit = engine.wouldMatch({
        material: "Steel 4140",
        tool_class: "endmill",
        operation: "roughing",
      });

      expect(wouldHit).toBe(true);
    });

    it("returns false when no adapter would match", () => {
      const mockGate = {
        apply: vi.fn().mockReturnValue({
          adapted: { vc: 100 },
          baseline: { vc: 100 },
          adapter_used: null,
          adapter_status: null,
          residual_applied: {},
          confidence: 0,
          provenance: {},
        }),
      } as unknown as InferenceLoRAGateEngine;

      const engine = new SFCInferenceGateWireEngine(mockGate);
      const wouldHit = engine.wouldMatch({
        material: "Exotic Material XYZ",
        tool_class: "unknown",
      });

      expect(wouldHit).toBe(false);
    });
  });

  describe("measureHitRate() — batch coverage testing", () => {
    it("calculates hit rate across multiple contexts", () => {
      let callCount = 0;
      const mockGate = {
        apply: vi.fn().mockImplementation(() => {
          callCount++;
          // First 3 calls hit, next 7 miss
          const hit = callCount <= 3;
          return {
            adapted: { vc: 100 },
            baseline: { vc: 100 },
            adapter_used: hit ? "adapter" : null,
            adapter_status: hit ? "active" : null,
            residual_applied: {},
            confidence: hit ? 0.8 : 0,
            provenance: {},
          };
        }),
      } as unknown as InferenceLoRAGateEngine;

      const engine = new SFCInferenceGateWireEngine(mockGate);
      const contexts = Array.from({ length: 10 }, (_, i) => ({
        material: `Material-${i}`,
        tool_class: "endmill",
        operation: "roughing",
      }));

      const stats = engine.measureHitRate(contexts);

      expect(stats.hits).toBe(3);
      expect(stats.misses).toBe(7);
      expect(stats.hit_rate).toBeCloseTo(0.3, 2);
    });

    it("returns 0 hit rate for empty context list", () => {
      const engine = new SFCInferenceGateWireEngine();
      const stats = engine.measureHitRate([]);

      expect(stats.hit_rate).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });

  describe("getSelfAwareness()", () => {
    it("returns complete self-awareness metadata", () => {
      const awareness = SFCInferenceGateWireEngine.getSelfAwareness();

      expect(awareness.name).toBe("SFCInferenceGateWireEngine");
      expect(awareness.version).toBe("1.0.0");
      expect(awareness.milestone).toBe("PSAU-PPG-SFC U-PPG-SFC-05");
      expect(awareness.capabilities).toContain("apply");
      expect(awareness.capabilities).toContain("applyToSFCResult");
      expect(awareness.capabilities).toContain("wouldMatch");
      expect(awareness.capabilities).toContain("measureHitRate");
      expect(awareness.dependencies).toContain("InferenceLoRAGateEngine");
      expect(awareness.surfaces_into).toContain("SFCProvenanceWireEngine.adapter_info");
    });
  });

  describe("singleton export", () => {
    it("exports a singleton instance", () => {
      expect(sfcInferenceGateWireEngine).toBeInstanceOf(SFCInferenceGateWireEngine);
    });
  });

  describe("edge cases", () => {
    it("handles missing baseline fields gracefully", () => {
      const engine = new SFCInferenceGateWireEngine();
      const result = engine.apply({
        engine: "Test",
        baseline: {}, // Empty baseline
        material: "Steel",
      });

      expect(result.ok).toBe(true);
      expect(result.adapter_hit).toBe(false);
      expect(Object.keys(result.baseline).length).toBe(0);
    });

    it("handles NaN values in baseline by filtering them", () => {
      const engine = new SFCInferenceGateWireEngine();
      const result = engine.apply({
        engine: "Test",
        baseline: {
          vc: 200,
          rpm: NaN, // Should be filtered out
          fpt: 0.1,
        },
        material: "Steel",
      });

      expect(result.ok).toBe(true);
      expect(result.baseline.vc).toBe(200);
      expect(result.baseline.fpt).toBe(0.1);
      expect("rpm" in result.baseline).toBe(false);
    });

    it("uses iso_group as fallback for material in context", () => {
      const mockGate = {
        apply: vi.fn().mockReturnValue({
          adapted: { vc: 100 },
          baseline: { vc: 100 },
          adapter_used: null,
          adapter_status: null,
          residual_applied: {},
          confidence: 0,
          provenance: {},
        }),
      } as unknown as InferenceLoRAGateEngine;

      const engine = new SFCInferenceGateWireEngine(mockGate);
      engine.apply({
        engine: "Test",
        baseline: { vc: 100 },
        iso_group: "P", // No material provided
        operation: "roughing",
      });

      expect(mockGate.apply).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            material: "P", // Falls back to iso_group
          }),
        }),
      );
    });

    it("uses machine_type as fallback for machine in context", () => {
      const mockGate = {
        apply: vi.fn().mockReturnValue({
          adapted: { vc: 100 },
          baseline: { vc: 100 },
          adapter_used: null,
          adapter_status: null,
          residual_applied: {},
          confidence: 0,
          provenance: {},
        }),
      } as unknown as InferenceLoRAGateEngine;

      const engine = new SFCInferenceGateWireEngine(mockGate);
      engine.apply({
        engine: "Test",
        baseline: { vc: 100 },
        machine_type: "vmc", // No machine_id provided
      });

      expect(mockGate.apply).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            machine: "vmc", // Falls back to machine_type
          }),
        }),
      );
    });
  });
});
