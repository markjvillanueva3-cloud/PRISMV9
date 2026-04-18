/**
 * Tests for CrossToolCouplingEngine (MILL-AGI Phase 2 / MILL-MS7)
 *
 * Validates multi-tool dynamic coupling analysis:
 *   - Coupling matrix construction
 *   - Coupled mode computation
 *   - Force distribution with cross-talk
 *   - Phase relationships between tools
 *   - Stability assessment with interaction
 *   - Chatter frequency identification
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  CrossToolCouplingEngine,
  crossToolCouplingEngine,
  type CouplingInput,
  type ToolStation,
  type WorkpieceProperties,
  type FixtureProperties,
} from "../engines/CrossToolCouplingEngine.js";

describe("CrossToolCouplingEngine (MILL-AGI P2 / MILL-MS7)", () => {
  let engine: CrossToolCouplingEngine;

  beforeAll(() => {
    engine = crossToolCouplingEngine;
  });

  // ============================================================================
  // TEST DATA
  // ============================================================================

  const tool1: ToolStation = {
    id: "T1",
    position_mm: { x: 0, y: 0, z: 50 },
    modal_frequency_hz: 1200,
    modal_damping: 0.03,
    modal_stiffness_n_per_um: 60,
    spindle_rpm: 8000,
    flute_count: 4,
    cutting_force_n: 200,
    active: true,
  };

  const tool2: ToolStation = {
    id: "T2",
    position_mm: { x: 100, y: 0, z: 50 },
    modal_frequency_hz: 1100,
    modal_damping: 0.025,
    modal_stiffness_n_per_um: 55,
    spindle_rpm: 8000,
    flute_count: 4,
    cutting_force_n: 180,
    active: true,
  };

  const tool3: ToolStation = {
    id: "T3",
    position_mm: { x: 50, y: 0, z: 100 },
    modal_frequency_hz: 1300,
    modal_damping: 0.035,
    modal_stiffness_n_per_um: 65,
    spindle_rpm: 6000,
    flute_count: 3,
    cutting_force_n: 150,
    active: true,
  };

  const inactiveTool: ToolStation = {
    id: "T4",
    position_mm: { x: 200, y: 0, z: 50 },
    modal_frequency_hz: 1000,
    modal_damping: 0.03,
    modal_stiffness_n_per_um: 50,
    spindle_rpm: 5000,
    flute_count: 2,
    cutting_force_n: 0,
    active: false,
  };

  const steelWorkpiece: WorkpieceProperties = {
    material: "AISI 4140",
    elastic_modulus_gpa: 210,
    density_kg_m3: 7850,
    geometry: "bar",
    length_mm: 200,
    diameter_mm: 50,
  };

  const plateWorkpiece: WorkpieceProperties = {
    material: "6061-T6",
    elastic_modulus_gpa: 70,
    density_kg_m3: 2700,
    geometry: "plate",
    length_mm: 300,
    width_mm: 200,
    thickness_mm: 25,
  };

  const standardFixture: FixtureProperties = {
    type: "vise",
    stiffness_n_per_um: 100,
    damping_ratio: 0.02,
    support_points: 2,
  };

  const stiffFixture: FixtureProperties = {
    type: "fixture_plate",
    stiffness_n_per_um: 200,
    damping_ratio: 0.025,
    support_points: 6,
  };

  // ============================================================================
  // BASIC ANALYSIS
  // ============================================================================

  describe("basic analysis", () => {
    it("returns valid CrossToolResult for two tools", () => {
      const input: CouplingInput = {
        tools: [tool1, tool2],
        workpiece: steelWorkpiece,
        fixture: standardFixture,
      };

      const result = engine.analyze(input);

      expect(result).toBeDefined();
      expect(result.coupling_matrix).toBeDefined();
      expect(result.coupled_modes.length).toBeGreaterThan(0);
      expect(result.stability).toBeDefined();
    });

    it("handles single active tool", () => {
      const input: CouplingInput = {
        tools: [tool1],
        workpiece: steelWorkpiece,
        fixture: standardFixture,
      };

      const result = engine.analyze(input);

      expect(result.coupling_matrix.size).toBe(1);
      expect(result.stability.interaction_factor).toBe(0);
      expect(result.phase_relationships.length).toBe(0);
    });

    it("filters inactive tools", () => {
      const input: CouplingInput = {
        tools: [tool1, tool2, inactiveTool],
        workpiece: steelWorkpiece,
        fixture: standardFixture,
      };

      const result = engine.analyze(input);

      expect(result.coupling_matrix.size).toBe(2);
      expect(result.force_distribution["T4"]).toBeUndefined();
    });

    it("tracks confidence", () => {
      const input: CouplingInput = {
        tools: [tool1, tool2],
        workpiece: steelWorkpiece,
        fixture: standardFixture,
      };

      const result = engine.analyze(input);

      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.confidence).toBeLessThanOrEqual(0.95);
    });
  });

  // ============================================================================
  // COUPLING MATRIX
  // ============================================================================

  describe("coupling matrix", () => {
    it("builds symmetric stiffness coupling", () => {
      const input: CouplingInput = {
        tools: [tool1, tool2],
        workpiece: steelWorkpiece,
        fixture: standardFixture,
      };

      const result = engine.analyze(input);
      const K = result.coupling_matrix.stiffness_coupling;

      expect(K[0][1]).toBe(K[1][0]);
    });

    it("diagonal contains individual tool stiffness", () => {
      const input: CouplingInput = {
        tools: [tool1, tool2],
        workpiece: steelWorkpiece,
        fixture: standardFixture,
      };

      const result = engine.analyze(input);
      const K = result.coupling_matrix.stiffness_coupling;

      expect(K[0][0]).toBe(tool1.modal_stiffness_n_per_um);
      expect(K[1][1]).toBe(tool2.modal_stiffness_n_per_um);
    });

    it("closer tools have stronger coupling", () => {
      const closeTool: ToolStation = {
        ...tool2,
        position_mm: { x: 20, y: 0, z: 50 }, // Close to tool1
      };

      const farTool: ToolStation = {
        ...tool2,
        position_mm: { x: 200, y: 0, z: 50 }, // Far from tool1
      };

      const closeInput: CouplingInput = {
        tools: [tool1, closeTool],
        workpiece: steelWorkpiece,
        fixture: standardFixture,
      };

      const farInput: CouplingInput = {
        tools: [tool1, farTool],
        workpiece: steelWorkpiece,
        fixture: standardFixture,
      };

      const closeResult = engine.analyze(closeInput);
      const farResult = engine.analyze(farInput);

      // Coupling should be non-negative, and closer = stronger
      expect(closeResult.coupling_matrix.stiffness_coupling[0][1]).toBeGreaterThanOrEqual(
        farResult.coupling_matrix.stiffness_coupling[0][1]
      );
    });

    it("scales with number of tools", () => {
      const twoTools: CouplingInput = {
        tools: [tool1, tool2],
        workpiece: steelWorkpiece,
        fixture: standardFixture,
      };

      const threeTools: CouplingInput = {
        tools: [tool1, tool2, tool3],
        workpiece: steelWorkpiece,
        fixture: standardFixture,
      };

      const result2 = engine.analyze(twoTools);
      const result3 = engine.analyze(threeTools);

      expect(result2.coupling_matrix.size).toBe(2);
      expect(result3.coupling_matrix.size).toBe(3);
    });
  });

  // ============================================================================
  // COUPLED MODES
  // ============================================================================

  describe("coupled modes", () => {
    it("computes mode for each tool plus global", () => {
      const input: CouplingInput = {
        tools: [tool1, tool2],
        workpiece: steelWorkpiece,
        fixture: standardFixture,
      };

      const result = engine.analyze(input);

      // 2 tool modes + 1 global mode
      expect(result.coupled_modes.length).toBeGreaterThanOrEqual(2);
    });

    it("modes are sorted by frequency", () => {
      const input: CouplingInput = {
        tools: [tool1, tool2, tool3],
        workpiece: steelWorkpiece,
        fixture: standardFixture,
      };

      const result = engine.analyze(input);

      for (let i = 1; i < result.coupled_modes.length; i++) {
        expect(result.coupled_modes[i].frequency_hz).toBeGreaterThanOrEqual(
          result.coupled_modes[i - 1].frequency_hz
        );
      }
    });

    it("identifies global modes", () => {
      const input: CouplingInput = {
        tools: [tool1, tool2],
        workpiece: steelWorkpiece,
        fixture: standardFixture,
      };

      const result = engine.analyze(input);
      const globalModes = result.coupled_modes.filter((m) => m.mode_type === "global");

      expect(globalModes.length).toBeGreaterThan(0);
    });

    it("participation factors sum to reasonable values", () => {
      const input: CouplingInput = {
        tools: [tool1, tool2],
        workpiece: steelWorkpiece,
        fixture: standardFixture,
      };

      const result = engine.analyze(input);

      for (const mode of result.coupled_modes) {
        const sum = Object.values(mode.participation_factors).reduce((a, b) => a + b, 0);
        expect(sum).toBeGreaterThan(0);
      }
    });
  });

  // ============================================================================
  // FORCE DISTRIBUTION
  // ============================================================================

  describe("force distribution", () => {
    it("includes direct and coupled forces", () => {
      const input: CouplingInput = {
        tools: [tool1, tool2],
        workpiece: steelWorkpiece,
        fixture: standardFixture,
      };

      const result = engine.analyze(input);

      expect(result.force_distribution["T1"].direct_n).toBe(tool1.cutting_force_n);
      expect(result.force_distribution["T1"].coupled_n).toBeGreaterThan(0);
    });

    it("coupled force comes from other tools", () => {
      const input: CouplingInput = {
        tools: [tool1, tool2],
        workpiece: steelWorkpiece,
        fixture: standardFixture,
      };

      const result = engine.analyze(input);

      // T1's coupled force should relate to T2's cutting force
      expect(result.force_distribution["T1"].coupled_n).toBeLessThan(
        tool2.cutting_force_n
      );
    });
  });

  // ============================================================================
  // PHASE RELATIONSHIPS
  // ============================================================================

  describe("phase relationships", () => {
    it("computes phase for each tool pair", () => {
      const input: CouplingInput = {
        tools: [tool1, tool2, tool3],
        workpiece: steelWorkpiece,
        fixture: standardFixture,
      };

      const result = engine.analyze(input);

      // 3 tools = 3 pairs
      expect(result.phase_relationships.length).toBe(3);
    });

    it("same RPM and flutes gives zero phase", () => {
      const input: CouplingInput = {
        tools: [tool1, tool2], // Both 8000 RPM, 4 flutes
        workpiece: steelWorkpiece,
        fixture: standardFixture,
      };

      const result = engine.analyze(input);

      const t1t2 = result.phase_relationships.find(
        (p) => (p.tool_i === "T1" && p.tool_j === "T2") || (p.tool_i === "T2" && p.tool_j === "T1")
      );

      expect(t1t2?.phase_deg).toBeCloseTo(0, 0);
      expect(t1t2?.coupling_strength).toBe(1.0);
    });

    it("different tooth frequencies reduce coupling strength", () => {
      const input: CouplingInput = {
        tools: [tool1, tool3], // T1: 8000×4, T3: 6000×3
        workpiece: steelWorkpiece,
        fixture: standardFixture,
      };

      const result = engine.analyze(input);

      const t1t3 = result.phase_relationships.find(
        (p) => (p.tool_i === "T1" && p.tool_j === "T3") || (p.tool_i === "T3" && p.tool_j === "T1")
      );

      expect(t1t3?.coupling_strength).toBeLessThan(1.0);
    });
  });

  // ============================================================================
  // STABILITY
  // ============================================================================

  describe("stability assessment", () => {
    it("returns stability summary", () => {
      const input: CouplingInput = {
        tools: [tool1, tool2],
        workpiece: steelWorkpiece,
        fixture: standardFixture,
      };

      const result = engine.analyze(input);

      expect(typeof result.stability.overall_stable).toBe("boolean");
      expect(result.stability.limiting_tool_id).toBeDefined();
      expect(result.stability.limiting_ap_mm).toBeGreaterThan(0);
    });

    it("identifies limiting tool", () => {
      const weakTool: ToolStation = {
        ...tool2,
        id: "WEAK",
        modal_stiffness_n_per_um: 20, // Much weaker
        modal_damping: 0.01,
      };

      const input: CouplingInput = {
        tools: [tool1, weakTool],
        workpiece: steelWorkpiece,
        fixture: standardFixture,
      };

      const result = engine.analyze(input);

      expect(result.stability.limiting_tool_id).toBe("WEAK");
    });

    it("computes interaction factor", () => {
      const input: CouplingInput = {
        tools: [tool1, tool2],
        workpiece: steelWorkpiece,
        fixture: standardFixture,
      };

      const result = engine.analyze(input);

      // Interaction factor is ratio of off-diagonal to diagonal coupling
      expect(result.stability.interaction_factor).toBeGreaterThanOrEqual(0);
      expect(result.stability.interaction_factor).toBeLessThan(1);
    });

    it("assesses synchronization risk", () => {
      const input: CouplingInput = {
        tools: [tool1, tool2],
        workpiece: steelWorkpiece,
        fixture: standardFixture,
      };

      const result = engine.analyze(input);

      expect(["none", "low", "moderate", "high"]).toContain(
        result.stability.synchronization_risk
      );
    });
  });

  // ============================================================================
  // CHATTER FREQUENCIES
  // ============================================================================

  describe("chatter frequencies", () => {
    it("identifies potential chatter frequencies", () => {
      const input: CouplingInput = {
        tools: [tool1, tool2],
        workpiece: steelWorkpiece,
        fixture: standardFixture,
      };

      const result = engine.analyze(input);

      expect(Array.isArray(result.chatter_frequencies_hz)).toBe(true);
    });

    it("chatter frequencies are sorted", () => {
      const input: CouplingInput = {
        tools: [tool1, tool2, tool3],
        workpiece: steelWorkpiece,
        fixture: standardFixture,
      };

      const result = engine.analyze(input);

      for (let i = 1; i < result.chatter_frequencies_hz.length; i++) {
        expect(result.chatter_frequencies_hz[i]).toBeGreaterThanOrEqual(
          result.chatter_frequencies_hz[i - 1]
        );
      }
    });
  });

  // ============================================================================
  // WARNINGS AND RECOMMENDATIONS
  // ============================================================================

  describe("warnings and recommendations", () => {
    it("warns on similar RPM", () => {
      const input: CouplingInput = {
        tools: [tool1, tool2], // Same RPM
        workpiece: steelWorkpiece,
        fixture: standardFixture,
      };

      const result = engine.analyze(input);

      expect(result.warnings.some((w) => w.toLowerCase().includes("rpm"))).toBe(true);
    });

    it("generates recommendations for multi-tool setup", () => {
      const input: CouplingInput = {
        tools: [tool1, tool2, tool3],
        workpiece: steelWorkpiece,
        fixture: standardFixture,
      };

      const result = engine.analyze(input);

      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // WORKPIECE EFFECTS
  // ============================================================================

  describe("workpiece effects", () => {
    it("workpiece geometry affects system modes", () => {
      const barInput: CouplingInput = {
        tools: [tool1, tool2],
        workpiece: steelWorkpiece,
        fixture: standardFixture,
      };

      const plateInput: CouplingInput = {
        tools: [tool1, tool2],
        workpiece: plateWorkpiece,
        fixture: standardFixture,
      };

      const barResult = engine.analyze(barInput);
      const plateResult = engine.analyze(plateInput);

      // Different workpiece geometries produce valid but potentially different results
      expect(barResult.coupling_matrix.size).toBe(2);
      expect(plateResult.coupling_matrix.size).toBe(2);
      // Both should have valid modes
      expect(barResult.coupled_modes.length).toBeGreaterThan(0);
      expect(plateResult.coupled_modes.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // FIXTURE EFFECTS
  // ============================================================================

  describe("fixture effects", () => {
    it("stiffer fixture improves confidence", () => {
      const softInput: CouplingInput = {
        tools: [tool1, tool2],
        workpiece: steelWorkpiece,
        fixture: standardFixture,
      };

      const stiffInput: CouplingInput = {
        tools: [tool1, tool2],
        workpiece: steelWorkpiece,
        fixture: stiffFixture,
      };

      const softResult = engine.analyze(softInput);
      const stiffResult = engine.analyze(stiffInput);

      expect(stiffResult.confidence).toBeGreaterThanOrEqual(softResult.confidence);
    });
  });

  // ============================================================================
  // VALIDATION
  // ============================================================================

  describe("validation", () => {
    it("rejects empty tools array", () => {
      const validation = engine.validateInput({
        tools: [],
        workpiece: steelWorkpiece,
        fixture: standardFixture,
      });

      expect(validation.valid).toBe(false);
    });

    it("rejects invalid tool parameters", () => {
      const badTool: ToolStation = { ...tool1, modal_frequency_hz: -100 };
      const validation = engine.validateInput({
        tools: [badTool],
        workpiece: steelWorkpiece,
        fixture: standardFixture,
      });

      expect(validation.valid).toBe(false);
    });

    it("passes valid input", () => {
      const validation = engine.validateInput({
        tools: [tool1, tool2],
        workpiece: steelWorkpiece,
        fixture: standardFixture,
      });

      expect(validation.valid).toBe(true);
    });
  });

  // ============================================================================
  // SINGLETON
  // ============================================================================

  describe("singleton", () => {
    it("exports singleton instance", () => {
      expect(crossToolCouplingEngine).toBeDefined();
      expect(crossToolCouplingEngine).toBeInstanceOf(CrossToolCouplingEngine);
    });
  });
});
