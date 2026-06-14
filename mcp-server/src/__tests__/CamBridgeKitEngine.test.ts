/**
 * CamBridgeKitEngine Tests — ECHO-CAM-BRIDGES-MS0
 *
 * 5 bridges: cad_cam_handoff, operator_gates_emit, sfc_fusion_bridge,
 * sfc_hypermill_bridge, sfc_inventorhsm_bridge.
 *
 * @milestone ECHO-CAM-BRIDGES-MS0
 */

import { describe, it, expect } from "vitest";
import {
  camBridgeKitEngine,
  type SFCResult,
  type CADGeometry,
} from "../engines/CamBridgeKitEngine.js";
import { ACTIONS as camActions } from "../tools/dispatchers/camDispatcher.js";

// ============================================================================
// FIXTURES
// ============================================================================

const SFC_STEEL_ROUGH: SFCResult = {
  vc_m_min: 180,
  fz_mm_tooth: 0.12,
  ap_mm: 6.0,
  ae_mm: 4.5,
  rpm: 2865,
  feed_mm_min: 1375,
  tool_diameter_mm: 20,
  tool_teeth: 4,
  material_iso_group: "P",
  confidence: 0.9,
};

const SFC_ALUM_FINISH: SFCResult = {
  vc_m_min: 600,
  fz_mm_tooth: 0.05,
  ap_mm: 0.5,
  ae_mm: 0.25,
  rpm: 19099,
  feed_mm_min: 3819,
  tool_diameter_mm: 10,
  tool_teeth: 4,
  material_iso_group: "N",
  confidence: 0.95,
};

const CAD_PART_WITH_POCKET: CADGeometry = {
  part_id: "PART-001",
  source: "cad_ai_generate",
  bounding_box_mm: { x: 100, y: 80, z: 30 },
  features: [
    { id: "F1", type: "face", cycle_hint: "face", tolerance_total_mm: 0.05 },
    { id: "F2", type: "pocket", cycle_hint: "pocket", tolerance_total_mm: 0.025 },
    { id: "F3", type: "drill_hole" },
  ],
  material_iso_group: "P",
  datums: ["A", "B", "C"],
};

// ============================================================================
// 1. cad_cam_handoff
// ============================================================================

describe("CamBridgeKitEngine", () => {
  describe("cad_cam_handoff (BRIDGE-CAD-CAM-HANDOFF)", () => {
    it("produces strategy seeds for every CAD feature", () => {
      const seed = camBridgeKitEngine.cadCamHandoff(CAD_PART_WITH_POCKET);
      expect(seed.source).toBe("cad_cam_handoff");
      expect(seed.candidate_features).toHaveLength(3);
      expect(seed.part_id).toBe("PART-001");
    });

    it("preserves datums per echo refuse-list (drop = R12)", () => {
      const seed = camBridgeKitEngine.cadCamHandoff(CAD_PART_WITH_POCKET);
      expect(seed.preserved_datums).toEqual(["A", "B", "C"]);
    });

    it("maps explicit cycle_hint to known strategy_id", () => {
      const seed = camBridgeKitEngine.cadCamHandoff(CAD_PART_WITH_POCKET);
      const pocketSeed = seed.candidate_features.find(f => f.feature_id === "F2")!;
      expect(pocketSeed.seed_strategy_id).toBe("rough_pocket_adaptive");
    });

    it("infers strategy from feature type when cycle_hint missing", () => {
      const seed = camBridgeKitEngine.cadCamHandoff(CAD_PART_WITH_POCKET);
      const drillSeed = seed.candidate_features.find(f => f.feature_id === "F3")!;
      expect(drillSeed.seed_strategy_id).toBe("drill_peck");
    });

    it("surfaces unhandled cycle_hint per R12 fail-loud", () => {
      const cad: CADGeometry = {
        ...CAD_PART_WITH_POCKET,
        features: [{ id: "X", type: "weird", cycle_hint: "totally_made_up" }],
      };
      const seed = camBridgeKitEngine.cadCamHandoff(cad);
      expect(seed.unhandled_cycle_hints).toContain("totally_made_up");
      // Still produces a seed (fallback to rough_adaptive)
      expect(seed.candidate_features[0].seed_strategy_id).toBe("rough_adaptive");
    });

    it("propagates tolerance_total_mm to seed", () => {
      const seed = camBridgeKitEngine.cadCamHandoff(CAD_PART_WITH_POCKET);
      expect(seed.candidate_features[1].tolerance_total_mm).toBe(0.025);
    });

    it("passes bounding box through unchanged", () => {
      const seed = camBridgeKitEngine.cadCamHandoff(CAD_PART_WITH_POCKET);
      expect(seed.bounding_box_mm).toEqual({ x: 100, y: 80, z: 30 });
    });

    it("rejects empty features array (R12 schema gate)", () => {
      expect(() =>
        camBridgeKitEngine.cadCamHandoff({ ...CAD_PART_WITH_POCKET, features: [] }),
      ).toThrow();
    });
  });

  // ==========================================================================
  // 2. operator_gates_emit
  // ==========================================================================

  describe("operator_gates_emit (BRIDGE-OPERATOR-GATES)", () => {
    it("CAD review defaults to engineer + blocking", () => {
      const req = camBridgeKitEngine.operatorGatesEmit({
        stage: "cad_geometry_review",
        artifact_id: "PART-001",
        artifact_kind: "cad_part",
      });
      expect(req.required_role).toBe("engineer");
      expect(req.blocking).toBe(true);
      expect(req.stage).toBe("cad_geometry_review");
    });

    it("CAM strategy review defaults to programmer + blocking", () => {
      const req = camBridgeKitEngine.operatorGatesEmit({
        stage: "cam_strategy_review",
        artifact_id: "STRAT-001",
        artifact_kind: "cam_strategy",
      });
      expect(req.required_role).toBe("programmer");
      expect(req.blocking).toBe(true);
    });

    it("G-code release defaults to machinist + blocking (shop-floor signoff)", () => {
      const req = camBridgeKitEngine.operatorGatesEmit({
        stage: "gcode_release_review",
        artifact_id: "PRG-001",
        artifact_kind: "gcode",
      });
      expect(req.required_role).toBe("machinist");
      expect(req.blocking).toBe(true);
    });

    it("post processor review is advisory (non-blocking)", () => {
      const req = camBridgeKitEngine.operatorGatesEmit({
        stage: "post_processor_review",
        artifact_id: "POST-001",
        artifact_kind: "post_config",
      });
      expect(req.blocking).toBe(false);
    });

    it("operator overrides required_role when supplied", () => {
      const req = camBridgeKitEngine.operatorGatesEmit({
        stage: "cad_geometry_review",
        artifact_id: "PART-002",
        artifact_kind: "cad_part",
        required_role: "supervisor",
      });
      expect(req.required_role).toBe("supervisor");
    });

    it("default prompt names stage + artifact", () => {
      const req = camBridgeKitEngine.operatorGatesEmit({
        stage: "cam_toolpath_review",
        artifact_id: "TP-99",
        artifact_kind: "toolpath",
      });
      expect(req.prompt).toMatch(/cam_toolpath_review/);
      expect(req.prompt).toMatch(/TP-99/);
    });
  });

  // ==========================================================================
  // 3. sfc_fusion_bridge
  // ==========================================================================

  describe("sfc_fusion_bridge (BRIDGE-SFC-FUSION)", () => {
    it("passes RPM + feed verbatim", () => {
      const f = camBridgeKitEngine.sfcFusionBridge(SFC_STEEL_ROUGH);
      expect(f.rpm).toBe(2865);
      expect(f.feed_mm_min).toBe(1375);
    });

    it("computes stepover_pct from ae / tool_diameter", () => {
      const f = camBridgeKitEngine.sfcFusionBridge(SFC_STEEL_ROUGH);
      // 4.5/20 = 22.5%
      expect(f.stepover_pct).toBeCloseTo(22.5, 5);
    });

    it("stepdown_mm == ap_mm (direct passthrough)", () => {
      const f = camBridgeKitEngine.sfcFusionBridge(SFC_STEEL_ROUGH);
      expect(f.stepdown_mm).toBe(6.0);
    });

    it("default cycle_strategy is Fusion's 'Adaptive Clearing'", () => {
      const f = camBridgeKitEngine.sfcFusionBridge(SFC_STEEL_ROUGH);
      expect(f.cycle_strategy).toBe("Adaptive Clearing");
    });

    it("caller can override cycle_strategy", () => {
      const f = camBridgeKitEngine.sfcFusionBridge(SFC_STEEL_ROUGH, { cycle_strategy: "Pocket Clearing" });
      expect(f.cycle_strategy).toBe("Pocket Clearing");
    });

    it("aluminum finish-pass routes correctly (high RPM, low ap)", () => {
      const f = camBridgeKitEngine.sfcFusionBridge(SFC_ALUM_FINISH);
      expect(f.rpm).toBe(19099);
      expect(f.stepdown_mm).toBe(0.5);
    });
  });

  // ==========================================================================
  // 4. sfc_hypermill_bridge
  // ==========================================================================

  describe("sfc_hypermill_bridge (BRIDGE-SFC-HYPERMILL)", () => {
    it("maps SFC to OptiRough named-pair conventions", () => {
      const h = camBridgeKitEngine.sfcHyperMillBridge(SFC_STEEL_ROUGH);
      expect(h.spindle_speed).toBe(2865);
      expect(h.milling_feedrate).toBe(1375);
      expect(h.cycle_strategy).toBe("OptiRough");
    });

    it("plunge_feedrate defaults to 30% of milling (hyperMILL convention)", () => {
      const h = camBridgeKitEngine.sfcHyperMillBridge(SFC_STEEL_ROUGH);
      expect(h.plunge_feedrate).toBeCloseTo(1375 * 0.3, 5);
    });

    it("custom plunge_factor honored", () => {
      const h = camBridgeKitEngine.sfcHyperMillBridge(SFC_STEEL_ROUGH, { plunge_factor: 0.5 });
      expect(h.plunge_feedrate).toBeCloseTo(1375 * 0.5, 5);
    });

    it("stepover/stepdown use absolute mm (not pct, unlike Fusion)", () => {
      const h = camBridgeKitEngine.sfcHyperMillBridge(SFC_STEEL_ROUGH);
      expect(h.stepover_mm).toBe(4.5);
      expect(h.stepdown_mm).toBe(6.0);
    });
  });

  // ==========================================================================
  // 5. sfc_inventorhsm_bridge
  // ==========================================================================

  describe("sfc_inventorhsm_bridge (BRIDGE-SFC-INVENTORHSM)", () => {
    it("maps SFC to Inventor HSM Adaptive 2D defaults", () => {
      const i = camBridgeKitEngine.sfcInventorHsmBridge(SFC_STEEL_ROUGH);
      expect(i.spindle_rpm).toBe(2865);
      expect(i.cutting_feedrate).toBe(1375);
      expect(i.cycle_strategy).toBe("Adaptive 2D");
    });

    it("optimal_load_mm == ae_mm (HSM engagement control)", () => {
      const i = camBridgeKitEngine.sfcInventorHsmBridge(SFC_STEEL_ROUGH);
      expect(i.optimal_load_mm).toBe(4.5);
    });

    it("max_step_down_mm == ap_mm", () => {
      const i = camBridgeKitEngine.sfcInventorHsmBridge(SFC_STEEL_ROUGH);
      expect(i.max_step_down_mm).toBe(6.0);
    });

    it("caller can override cycle_strategy", () => {
      const i = camBridgeKitEngine.sfcInventorHsmBridge(SFC_STEEL_ROUGH, { cycle_strategy: "3D Adaptive" });
      expect(i.cycle_strategy).toBe("3D Adaptive");
    });
  });

  // ==========================================================================
  // SCHEMA + ROUND-TRIP
  // ==========================================================================

  describe("Schema invariants", () => {
    it("all SFC bridges reject negative RPM (R12)", () => {
      const bad: SFCResult = { ...SFC_STEEL_ROUGH, rpm: -100 };
      expect(() => camBridgeKitEngine.sfcFusionBridge(bad)).toThrow();
      expect(() => camBridgeKitEngine.sfcHyperMillBridge(bad)).toThrow();
      expect(() => camBridgeKitEngine.sfcInventorHsmBridge(bad)).toThrow();
    });

    it("CAD geometry rejects invalid material iso_group", () => {
      const bad = { ...CAD_PART_WITH_POCKET, material_iso_group: "Z" as never };
      expect(() => camBridgeKitEngine.cadCamHandoff(bad as CADGeometry)).toThrow();
    });

    it("operator gate timestamp is ISO 8601 parseable", () => {
      const req = camBridgeKitEngine.operatorGatesEmit({
        stage: "cad_geometry_review",
        artifact_id: "X",
        artifact_kind: "cad_part",
      });
      expect(Number.isNaN(Date.parse(req.surfaced_at))).toBe(false);
    });
  });

  // ==========================================================================
  // DISPATCHER INTEGRATION
  // ==========================================================================

  describe("Dispatcher Integration", () => {
    it("ACTIONS array contains cam_bridge_cad_cam_handoff", () => {
      expect(camActions).toContain("cam_bridge_cad_cam_handoff");
    });
    it("ACTIONS array contains cam_bridge_operator_gates_emit", () => {
      expect(camActions).toContain("cam_bridge_operator_gates_emit");
    });
    it("ACTIONS array contains cam_bridge_sfc_fusion", () => {
      expect(camActions).toContain("cam_bridge_sfc_fusion");
    });
    it("ACTIONS array contains cam_bridge_sfc_hypermill", () => {
      expect(camActions).toContain("cam_bridge_sfc_hypermill");
    });
    it("ACTIONS array contains cam_bridge_sfc_inventorhsm", () => {
      expect(camActions).toContain("cam_bridge_sfc_inventorhsm");
    });
  });
});
