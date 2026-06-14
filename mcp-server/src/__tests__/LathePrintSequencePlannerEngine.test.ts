/**
 * LathePrintSequencePlannerEngine Tests — U-LTH37
 *
 * JM Die samples, precedence validation, stock evolution, setup tracking,
 * dispatcher integration, adversarial inputs.
 *
 * @milestone LATHE-MASTER U-LTH37
 */

import { describe, it, expect } from "vitest";
import {
  lathePrintSequencePlannerEngine,
  type StockInput,
} from "../engines/LathePrintSequencePlannerEngine.js";
import {
  lathePrintFeatureStrategySelectorEngine,
  type FeatureInput,
  type MaterialInput,
} from "../engines/LathePrintFeatureStrategySelectorEngine.js";
import { ACTIONS as camActions } from "../tools/dispatchers/camDispatcher.js";

// ============================================================================
// JM DIE SAMPLES
// ============================================================================

const ALCOA_DIE_PIN: FeatureInput[] = [
  { id: "F1", type: "face", diameter_mm: 25.4, depth_mm: 2, tolerance_total_mm: 0.05, ra_um_target: 3.2 },
  { id: "F2", type: "od_turn", diameter_mm: 25.4, length_mm: 50, tolerance_total_mm: 0.025, ra_um_target: 1.6, is_critical: true },
  { id: "F3", type: "chamfer_od", diameter_mm: 25.4, depth_mm: 1.5, tolerance_total_mm: 0.1 },
  { id: "F4", type: "groove_od", diameter_mm: 20, depth_mm: 2.5, tolerance_total_mm: 0.05, ra_um_target: 3.2 },
];

const ALUMINUM: MaterialInput = {
  name: "6061-T6 Aluminum",
  iso_group: "N",
  hardness_hrc: 0,
  tensile_strength_mpa: 310,
  machinability_factor: 1.5,
};

const ITW_CONNECTOR: FeatureInput[] = [
  { id: "C1", type: "center_drill", diameter_mm: 3.2, depth_mm: 5 },
  { id: "C2", type: "drill", diameter_mm: 8.5, depth_mm: 30, tolerance_total_mm: 0.1 },
  { id: "C3", type: "face", diameter_mm: 19.05, depth_mm: 1.5, tolerance_total_mm: 0.05 },
  { id: "C4", type: "od_turn", diameter_mm: 19.05, length_mm: 40, tolerance_total_mm: 0.025, ra_um_target: 1.6 },
  { id: "C5", type: "thread_external", diameter_mm: 19.05, length_mm: 20, tolerance_total_mm: 0.05, ra_um_target: 3.2 },
];

const STAINLESS: MaterialInput = {
  name: "303 Stainless",
  iso_group: "M",
  hardness_hrc: 0,
  tensile_strength_mpa: 620,
  machinability_factor: 0.5,
};

const STOCK_STANDARD: StockInput = {
  od_mm: 30,
  length_mm: 80,
  id_mm: 0,
};

const STOCK_LARGE: StockInput = {
  od_mm: 50,
  length_mm: 150,
  id_mm: 0,
};

// ============================================================================
// HAPPY PATH
// ============================================================================

describe("LathePrintSequencePlannerEngine", () => {
  describe("Happy Path — JM Die Samples", () => {
    it("Alcoa Die Pin: plans 4 operations in correct precedence", () => {
      const stratPlan = lathePrintFeatureStrategySelectorEngine.generateStrategyPlan(
        ALCOA_DIE_PIN,
        ALUMINUM
      );

      const seqPlan = lathePrintSequencePlannerEngine.planSequence(
        stratPlan,
        STOCK_STANDARD,
        ALCOA_DIE_PIN
      );

      expect(seqPlan.operations.length).toBe(4);
      expect(seqPlan.valid).toBe(true);
      expect(seqPlan.violations.filter(v => v.severity === "error")).toEqual([]);

      // Face must come before chamfer on OD
      const faceIdx = seqPlan.operations.findIndex(o => o.featureId === "F1");
      const chamferIdx = seqPlan.operations.findIndex(o => o.featureId === "F3");
      expect(faceIdx).toBeLessThan(chamferIdx);

      // OD turn before chamfer
      const odIdx = seqPlan.operations.findIndex(o => o.featureId === "F2");
      expect(odIdx).toBeLessThan(chamferIdx);
    });

    it("ITW Connector: center_drill → drill → face → thread precedence respected", () => {
      const stratPlan = lathePrintFeatureStrategySelectorEngine.generateStrategyPlan(
        ITW_CONNECTOR,
        STAINLESS
      );

      const seqPlan = lathePrintSequencePlannerEngine.planSequence(
        stratPlan,
        STOCK_STANDARD,
        ITW_CONNECTOR
      );

      expect(seqPlan.operations.length).toBe(5);

      const centerIdx = seqPlan.operations.findIndex(o => o.featureId === "C1");
      const drillIdx = seqPlan.operations.findIndex(o => o.featureId === "C2");
      const faceIdx = seqPlan.operations.findIndex(o => o.featureId === "C3");
      const odIdx = seqPlan.operations.findIndex(o => o.featureId === "C4");
      const threadIdx = seqPlan.operations.findIndex(o => o.featureId === "C5");

      expect(centerIdx).toBeLessThan(drillIdx);
      expect(faceIdx).toBeLessThan(odIdx);
      expect(odIdx).toBeLessThan(threadIdx);
    });

    it("Stock evolution: OD reduces after od_turn operation", () => {
      const stratPlan = lathePrintFeatureStrategySelectorEngine.generateStrategyPlan(
        ALCOA_DIE_PIN,
        ALUMINUM
      );
      const seqPlan = lathePrintSequencePlannerEngine.planSequence(
        stratPlan,
        STOCK_LARGE,  // 50mm OD
        ALCOA_DIE_PIN
      );

      const odOp = seqPlan.operations.find(o => o.featureType === "od_turn");
      expect(odOp).toBeDefined();
      // Stock OD should reduce from 50mm → 25.4mm (feature diameter)
      expect(odOp!.stock_after.od_mm).toBeCloseTo(25.4, 1);
      expect(odOp!.stock_after.od_mm).toBeLessThan(odOp!.stock_before.od_mm);
    });
  });

  // ============================================================================
  // PRECEDENCE & VALIDATION
  // ============================================================================

  describe("Precedence & Validation", () => {
    it("detects thread before drill (if order is shuffled)", () => {
      // Build an intentionally misordered plan
      const stratPlan = lathePrintFeatureStrategySelectorEngine.generateStrategyPlan(
        ITW_CONNECTOR,
        STAINLESS
      );
      // Reverse order to force violations
      stratPlan.recommendations.reverse();

      const seqPlan = lathePrintSequencePlannerEngine.planSequence(
        stratPlan,
        STOCK_STANDARD,
        ITW_CONNECTOR
      );

      // The planner re-sorts internally, so it should still produce valid output
      expect(seqPlan.operations.length).toBe(5);
      const centerIdx = seqPlan.operations.findIndex(o => o.featureId === "C1");
      const drillIdx = seqPlan.operations.findIndex(o => o.featureId === "C2");
      expect(centerIdx).toBeLessThan(drillIdx);
    });

    it("autoFix repairs precedence violations", () => {
      const stratPlan = lathePrintFeatureStrategySelectorEngine.generateStrategyPlan(
        ITW_CONNECTOR,
        STAINLESS
      );
      const seqPlan = lathePrintSequencePlannerEngine.planSequence(
        stratPlan,
        STOCK_STANDARD,
        ITW_CONNECTOR
      );

      const fixed = lathePrintSequencePlannerEngine.autoFix(seqPlan, ITW_CONNECTOR);
      expect(fixed.valid).toBe(true);
      expect(fixed.violations.filter(v => v.severity === "error").length).toBe(0);
    });

    it("summarize returns correct metrics", () => {
      const stratPlan = lathePrintFeatureStrategySelectorEngine.generateStrategyPlan(
        ALCOA_DIE_PIN,
        ALUMINUM
      );
      const seqPlan = lathePrintSequencePlannerEngine.planSequence(
        stratPlan,
        STOCK_LARGE,
        ALCOA_DIE_PIN
      );

      const summary = lathePrintSequencePlannerEngine.summarize(seqPlan);
      expect(summary.op_count).toBe(4);
      expect(summary.setup_count).toBeGreaterThanOrEqual(1);
      expect(summary.cycle_time_min).toBeGreaterThan(0);
      expect(summary.volume_removed_cm3).toBeGreaterThan(0);
      expect(summary.valid).toBe(true);
    });
  });

  // ============================================================================
  // TOOL CHANGE TRACKING
  // ============================================================================

  describe("Tool Change Tracking", () => {
    it("assigns different tool stations for different strategies", () => {
      const stratPlan = lathePrintFeatureStrategySelectorEngine.generateStrategyPlan(
        ITW_CONNECTOR,
        STAINLESS
      );
      const seqPlan = lathePrintSequencePlannerEngine.planSequence(
        stratPlan,
        STOCK_STANDARD,
        ITW_CONNECTOR
      );

      const stations = seqPlan.operations.map(o => o.tool_station);
      // Should have at least 3 distinct stations (center_drill, drill, turning, threading)
      const uniqueStations = new Set(stations);
      expect(uniqueStations.size).toBeGreaterThanOrEqual(3);
    });

    it("tracks tool change count (excludes first tool)", () => {
      const stratPlan = lathePrintFeatureStrategySelectorEngine.generateStrategyPlan(
        ITW_CONNECTOR,
        STAINLESS
      );
      const seqPlan = lathePrintSequencePlannerEngine.planSequence(
        stratPlan,
        STOCK_STANDARD,
        ITW_CONNECTOR
      );

      expect(seqPlan.tool_change_count).toBeGreaterThanOrEqual(0);
      expect(seqPlan.tool_change_count).toBeLessThan(seqPlan.operations.length);
    });

    it("total cycle time includes tool change overhead", () => {
      const stratPlan = lathePrintFeatureStrategySelectorEngine.generateStrategyPlan(
        ITW_CONNECTOR,
        STAINLESS
      );
      const seqPlan = lathePrintSequencePlannerEngine.planSequence(
        stratPlan,
        STOCK_STANDARD,
        ITW_CONNECTOR
      );

      const opTime = seqPlan.operations.reduce((s, o) => s + o.estimated_time_sec, 0);
      expect(seqPlan.total_cycle_time_sec).toBeGreaterThanOrEqual(opTime);
      // Overhead = total - op sum should match tool_change_time
      const overhead = seqPlan.total_cycle_time_sec - opTime;
      expect(overhead).toBeCloseTo(seqPlan.total_tool_change_time_sec, 1);
    });
  });

  // ============================================================================
  // STOCK STATE TRACKING
  // ============================================================================

  describe("Stock State Evolution", () => {
    it("initial stock volume equals calculated annular volume", () => {
      const stratPlan = lathePrintFeatureStrategySelectorEngine.generateStrategyPlan(
        ALCOA_DIE_PIN,
        ALUMINUM
      );
      const seqPlan = lathePrintSequencePlannerEngine.planSequence(
        stratPlan,
        { od_mm: 30, length_mm: 80, id_mm: 0 },
        ALCOA_DIE_PIN
      );

      // Solid bar: V = π/4 * D² * L = π/4 * 9 * 8 = 56.55 cm³
      const expected = Math.PI * 9 * 8 / 4;
      expect(seqPlan.initial_stock.remaining_volume_cm3).toBeCloseTo(expected, 1);
    });

    it("drilling increases ID", () => {
      const drillFeatures: FeatureInput[] = [
        { id: "D1", type: "drill", diameter_mm: 10, depth_mm: 50 },
      ];
      const stratPlan = lathePrintFeatureStrategySelectorEngine.generateStrategyPlan(
        drillFeatures,
        ALUMINUM
      );
      const seqPlan = lathePrintSequencePlannerEngine.planSequence(
        stratPlan,
        { od_mm: 25, length_mm: 60, id_mm: 0 },
        drillFeatures
      );

      const drillOp = seqPlan.operations[0];
      expect(drillOp.stock_after.id_mm).toBeCloseTo(10, 1);
      expect(drillOp.stock_after.remaining_volume_cm3).toBeLessThan(
        drillOp.stock_before.remaining_volume_cm3
      );
    });

    it("facing reduces length", () => {
      const faceFeatures: FeatureInput[] = [
        { id: "F1", type: "face", diameter_mm: 25, depth_mm: 3 },
      ];
      const stratPlan = lathePrintFeatureStrategySelectorEngine.generateStrategyPlan(
        faceFeatures,
        ALUMINUM
      );
      const seqPlan = lathePrintSequencePlannerEngine.planSequence(
        stratPlan,
        { od_mm: 25, length_mm: 60, id_mm: 0 },
        faceFeatures
      );

      const faceOp = seqPlan.operations[0];
      expect(faceOp.stock_after.length_mm).toBeCloseTo(57, 1);
    });
  });

  // ============================================================================
  // EDGE CASES & FAILURE MODES
  // ============================================================================

  describe("Edge Cases", () => {
    it("single feature plan produces 1 operation", () => {
      const single: FeatureInput[] = [
        { id: "X1", type: "od_turn", diameter_mm: 20, length_mm: 30 },
      ];
      const stratPlan = lathePrintFeatureStrategySelectorEngine.generateStrategyPlan(
        single,
        ALUMINUM
      );
      const seqPlan = lathePrintSequencePlannerEngine.planSequence(
        stratPlan,
        STOCK_STANDARD,
        single
      );

      expect(seqPlan.operations.length).toBe(1);
      expect(seqPlan.setup_count).toBe(1);
      expect(seqPlan.tool_change_count).toBe(0);
    });

    it("empty strategy plan produces empty sequence", () => {
      const stratPlan = lathePrintFeatureStrategySelectorEngine.generateStrategyPlan(
        [],
        ALUMINUM
      );
      const seqPlan = lathePrintSequencePlannerEngine.planSequence(
        stratPlan,
        STOCK_STANDARD,
        []
      );

      expect(seqPlan.operations).toEqual([]);
      expect(seqPlan.total_cycle_time_sec).toBe(0);
      expect(seqPlan.valid).toBe(true);
    });

    it("parallel candidate detection for drilling", () => {
      const stratPlan = lathePrintFeatureStrategySelectorEngine.generateStrategyPlan(
        ITW_CONNECTOR,
        STAINLESS
      );
      const seqPlan = lathePrintSequencePlannerEngine.planSequence(
        stratPlan,
        STOCK_STANDARD,
        ITW_CONNECTOR
      );

      const drillOp = seqPlan.operations.find(o => o.featureType === "drill");
      expect(drillOp?.parallel_candidate).toBe(true);

      const threadOp = seqPlan.operations.find(o => o.featureType === "thread_external");
      expect(threadOp?.parallel_candidate).toBe(false);
    });
  });

  // ============================================================================
  // ADVERSARIAL INPUTS
  // ============================================================================

  describe("Adversarial Inputs", () => {
    it("throws on invalid strategy plan (null)", () => {
      expect(() => {
        lathePrintSequencePlannerEngine.planSequence(
          null as any,
          STOCK_STANDARD,
          ALCOA_DIE_PIN
        );
      }).toThrow(/Invalid strategy plan/);
    });

    it("throws on invalid strategy plan (missing recommendations)", () => {
      expect(() => {
        lathePrintSequencePlannerEngine.planSequence(
          { plan_id: "bad" } as any,
          STOCK_STANDARD,
          ALCOA_DIE_PIN
        );
      }).toThrow(/Invalid strategy plan/);
    });

    it("rejects OD below 0.1mm via schema", () => {
      const stratPlan = lathePrintFeatureStrategySelectorEngine.generateStrategyPlan(
        ALCOA_DIE_PIN,
        ALUMINUM
      );
      expect(() => {
        lathePrintSequencePlannerEngine.planSequence(
          stratPlan,
          { od_mm: 0.05, length_mm: 80 },
          ALCOA_DIE_PIN
        );
      }).toThrow();
    });

    it("rejects OD above 500mm via schema", () => {
      const stratPlan = lathePrintFeatureStrategySelectorEngine.generateStrategyPlan(
        ALCOA_DIE_PIN,
        ALUMINUM
      );
      expect(() => {
        lathePrintSequencePlannerEngine.planSequence(
          stratPlan,
          { od_mm: 600, length_mm: 80 },
          ALCOA_DIE_PIN
        );
      }).toThrow();
    });

    it("rejects NaN length via schema", () => {
      const stratPlan = lathePrintFeatureStrategySelectorEngine.generateStrategyPlan(
        ALCOA_DIE_PIN,
        ALUMINUM
      );
      expect(() => {
        lathePrintSequencePlannerEngine.planSequence(
          stratPlan,
          { od_mm: 30, length_mm: Number.NaN },
          ALCOA_DIE_PIN
        );
      }).toThrow();
    });

    it("handles features with missing diameter (uses default)", () => {
      const noDim: FeatureInput[] = [
        { id: "M1", type: "face" },
        { id: "M2", type: "od_turn" },
      ];
      const stratPlan = lathePrintFeatureStrategySelectorEngine.generateStrategyPlan(
        noDim,
        ALUMINUM
      );
      const seqPlan = lathePrintSequencePlannerEngine.planSequence(
        stratPlan,
        STOCK_STANDARD,
        noDim
      );

      expect(seqPlan.operations.length).toBe(2);
    });
  });

  // ============================================================================
  // VARIABILITY — MATERIAL GROUPS
  // ============================================================================

  describe("Material Variability", () => {
    const materials: MaterialInput[] = [
      { name: "1018 Steel", iso_group: "P", tensile_strength_mpa: 440 },
      { name: "316 Stainless", iso_group: "M", tensile_strength_mpa: 580 },
      { name: "Gray Cast Iron", iso_group: "K", tensile_strength_mpa: 250 },
      { name: "Inconel 718", iso_group: "S", tensile_strength_mpa: 1350 },
    ];

    it.each(materials)("plans valid sequence for $name (ISO $iso_group)", (mat) => {
      const stratPlan = lathePrintFeatureStrategySelectorEngine.generateStrategyPlan(
        ALCOA_DIE_PIN,
        mat
      );
      const seqPlan = lathePrintSequencePlannerEngine.planSequence(
        stratPlan,
        STOCK_STANDARD,
        ALCOA_DIE_PIN
      );

      expect(seqPlan.operations.length).toBe(ALCOA_DIE_PIN.length);
      expect(seqPlan.valid).toBe(true);
      expect(seqPlan.total_cycle_time_sec).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // DISPATCHER INTEGRATION
  // ============================================================================

  describe("Dispatcher Integration", () => {
    it("ACTIONS array contains lathe_p2p_sequence_plan", () => {
      expect(camActions).toContain("lathe_p2p_sequence_plan");
    });

    it("ACTIONS array contains lathe_p2p_sequence_summarize", () => {
      expect(camActions).toContain("lathe_p2p_sequence_summarize");
    });

    it("ACTIONS array contains lathe_p2p_sequence_autofix", () => {
      expect(camActions).toContain("lathe_p2p_sequence_autofix");
    });

    it("ACTIONS array contains lathe_p2p_sequence_plan_consensus", () => {
      expect(camActions).toContain("lathe_p2p_sequence_plan_consensus");
    });
  });

  // ============================================================================
  // CONSENSUS-GATED SEQUENCING — LATHE-P2P-CONSENSUS-MS4/P0-U02
  // ============================================================================

  describe("Consensus-Gated Sequencing (P0-U02)", () => {
    it("generateCandidatePlans returns 3 distinct candidate orderings", () => {
      const stratPlan = lathePrintFeatureStrategySelectorEngine.generateStrategyPlan(
        ALCOA_DIE_PIN,
        ALUMINUM,
      );
      const candidates = lathePrintSequencePlannerEngine.generateCandidatePlans(
        stratPlan,
        STOCK_STANDARD,
        ALCOA_DIE_PIN,
      );
      expect(candidates).toHaveProperty("A_precedence");
      expect(candidates).toHaveProperty("B_tool_minimized");
      expect(candidates).toHaveProperty("C_setup_minimized");
      // All 3 candidates must have the same op count (lossless re-ordering)
      const opCounts = [
        candidates.A_precedence.operations.length,
        candidates.B_tool_minimized.operations.length,
        candidates.C_setup_minimized.operations.length,
      ];
      expect(new Set(opCounts).size).toBe(1);
      expect(opCounts[0]).toBe(ALCOA_DIE_PIN.length);
    });

    it("deterministic case — unanimous consensus on A_precedence at confidence 0.95", async () => {
      const stratPlan = lathePrintFeatureStrategySelectorEngine.generateStrategyPlan(
        ALCOA_DIE_PIN,
        ALUMINUM,
      );
      const result = await lathePrintSequencePlannerEngine.planSequenceWithConsensus(
        stratPlan,
        STOCK_STANDARD,
        ALCOA_DIE_PIN,
        {
          consensusDecide: async (_q) => ({
            answer: "A_precedence",
            confidence: 0.95,
            voters: ["claude", "codex", "gemini", "ollama"],
            auditId: "audit-test-unanimous",
          }),
          publish: () => {},
        },
      );
      expect(result.selected_label).toBe("A_precedence");
      expect(result.consensus.confidence).toBeCloseTo(0.95, 5);
      expect(result.consensus.voters).toHaveLength(4);
      expect(result.consensus.agreement_met).toBe(true);
      expect(result.escalated_to_human).toBe(false);
      expect(result.consensus.auditId).toBe("audit-test-unanimous");
      expect(result.selected_plan.valid).toBe(true);
    });

    it("ambiguous case — winner at threshold (0.75) is accepted, no escalation", async () => {
      const stratPlan = lathePrintFeatureStrategySelectorEngine.generateStrategyPlan(
        ALCOA_DIE_PIN,
        ALUMINUM,
      );
      const result = await lathePrintSequencePlannerEngine.planSequenceWithConsensus(
        stratPlan,
        STOCK_STANDARD,
        ALCOA_DIE_PIN,
        {
          agreementThreshold: 0.75,
          consensusDecide: async (_q) => ({
            answer: "B_tool_minimized",
            confidence: 0.75,
            voters: ["claude", "codex", "ollama"],
          }),
          publish: () => {},
        },
      );
      expect(result.selected_label).toBe("B_tool_minimized");
      expect(result.consensus.agreement_met).toBe(true);
      expect(result.escalated_to_human).toBe(false);
    });

    it("below-threshold confidence flags escalated_to_human (still returns plan)", async () => {
      const stratPlan = lathePrintFeatureStrategySelectorEngine.generateStrategyPlan(
        ALCOA_DIE_PIN,
        ALUMINUM,
      );
      const result = await lathePrintSequencePlannerEngine.planSequenceWithConsensus(
        stratPlan,
        STOCK_STANDARD,
        ALCOA_DIE_PIN,
        {
          agreementThreshold: 0.75,
          consensusDecide: async (_q) => ({
            answer: "C_setup_minimized",
            confidence: 0.4,
            voters: ["claude"],
          }),
          publish: () => {},
        },
      );
      expect(result.selected_label).toBe("C_setup_minimized");
      expect(result.consensus.confidence).toBeCloseTo(0.4, 5);
      expect(result.consensus.agreement_met).toBe(false);
      expect(result.escalated_to_human).toBe(true);
      // Plan is still returned — operator decides, pipeline does not hard-fail.
      expect(result.selected_plan.operations.length).toBe(ALCOA_DIE_PIN.length);
    });

    it("seam failure (consensus throws) → fail-open to A_precedence", async () => {
      const stratPlan = lathePrintFeatureStrategySelectorEngine.generateStrategyPlan(
        ALCOA_DIE_PIN,
        ALUMINUM,
      );
      const result = await lathePrintSequencePlannerEngine.planSequenceWithConsensus(
        stratPlan,
        STOCK_STANDARD,
        ALCOA_DIE_PIN,
        {
          consensusDecide: async () => {
            throw new Error("all voices down");
          },
          publish: () => {},
        },
      );
      expect(result.selected_label).toBe("A_precedence");
      expect(result.consensus.confidence).toBe(0);
      expect(result.consensus.voters).toHaveLength(0);
      expect(result.escalated_to_human).toBe(true);
    });

    it("unknown-vote answer falls back to A_precedence (input validation)", async () => {
      const stratPlan = lathePrintFeatureStrategySelectorEngine.generateStrategyPlan(
        ALCOA_DIE_PIN,
        ALUMINUM,
      );
      const result = await lathePrintSequencePlannerEngine.planSequenceWithConsensus(
        stratPlan,
        STOCK_STANDARD,
        ALCOA_DIE_PIN,
        {
          consensusDecide: async () => ({
            answer: "nonexistent_label",
            confidence: 0.9,
            voters: ["claude"],
          }),
          publish: () => {},
        },
      );
      expect(result.selected_label).toBe("A_precedence");
    });

    it("publishes one outcome event per call (observability seam)", async () => {
      const stratPlan = lathePrintFeatureStrategySelectorEngine.generateStrategyPlan(
        ALCOA_DIE_PIN,
        ALUMINUM,
      );
      const events: unknown[] = [];
      await lathePrintSequencePlannerEngine.planSequenceWithConsensus(
        stratPlan,
        STOCK_STANDARD,
        ALCOA_DIE_PIN,
        {
          consensusDecide: async () => ({
            answer: "A_precedence",
            confidence: 0.9,
            voters: ["claude", "codex"],
          }),
          publish: (e) => events.push(e),
        },
      );
      expect(events).toHaveLength(1);
      const evt = events[0] as { kind: string; domain: string; lineage_id: string; schemaVersion: string };
      expect(evt.kind).toBe("cross_process_decision");
      expect(evt.domain).toBe("lathe");
      expect(evt.schemaVersion).toBe("1.1.0");
      expect(typeof evt.lineage_id).toBe("string");
      expect(evt.lineage_id.length).toBeGreaterThan(0);
    });

    it("default consensus seam throws under VITEST (R12 guard)", async () => {
      const stratPlan = lathePrintFeatureStrategySelectorEngine.generateStrategyPlan(
        ALCOA_DIE_PIN,
        ALUMINUM,
      );
      // No consensusDecide injected → default seam fires the vitestConsensusGuard.
      // The engine catches the throw (fail-open) but the verdict is empty.
      const result = await lathePrintSequencePlannerEngine.planSequenceWithConsensus(
        stratPlan,
        STOCK_STANDARD,
        ALCOA_DIE_PIN,
        { publish: () => {} },
      );
      expect(result.selected_label).toBe("A_precedence");
      expect(result.consensus.voters).toHaveLength(0);
    });

    it("invalid strategy plan throws (R12 fail-loud on bad input)", async () => {
      await expect(
        lathePrintSequencePlannerEngine.planSequenceWithConsensus(
          { plan_id: "bogus" } as never,
          STOCK_STANDARD,
          ALCOA_DIE_PIN,
          { publish: () => {} },
        ),
      ).rejects.toThrow(/Invalid strategy plan/);
    });

    it("custom agreementThreshold respected (e.g. 0.9 strict)", async () => {
      const stratPlan = lathePrintFeatureStrategySelectorEngine.generateStrategyPlan(
        ALCOA_DIE_PIN,
        ALUMINUM,
      );
      const result = await lathePrintSequencePlannerEngine.planSequenceWithConsensus(
        stratPlan,
        STOCK_STANDARD,
        ALCOA_DIE_PIN,
        {
          agreementThreshold: 0.9,
          consensusDecide: async () => ({
            answer: "A_precedence",
            confidence: 0.85, // would pass default 0.75, fails strict 0.9
            voters: ["claude", "codex", "gemini"],
          }),
          publish: () => {},
        },
      );
      expect(result.consensus.threshold).toBeCloseTo(0.9, 5);
      expect(result.consensus.agreement_met).toBe(false);
      expect(result.escalated_to_human).toBe(true);
    });

    it("jobId is propagated when supplied (cross-stage event linkage)", async () => {
      const stratPlan = lathePrintFeatureStrategySelectorEngine.generateStrategyPlan(
        ALCOA_DIE_PIN,
        ALUMINUM,
      );
      const result = await lathePrintSequencePlannerEngine.planSequenceWithConsensus(
        stratPlan,
        STOCK_STANDARD,
        ALCOA_DIE_PIN,
        {
          jobId: "job-jm-die-pin-2026-05-23",
          consensusDecide: async () => ({
            answer: "A_precedence",
            confidence: 0.95,
            voters: ["claude"],
          }),
          publish: () => {},
        },
      );
      expect(result.job_id).toBe("job-jm-die-pin-2026-05-23");
    });
  });
});
