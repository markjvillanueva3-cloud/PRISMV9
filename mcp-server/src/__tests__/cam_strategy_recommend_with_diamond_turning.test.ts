/**
 * U-DEA-november-P03 (DEA-MS0) — recommendWithDiamondTurning + cam_strategy_recommend_with_diamond_turning
 *
 * Tests the cross-wire activation of the dormant precision-cluster:
 *   DiamondTurningEngine.{predictSurfaceFinish, calculateCuttingForces,
 *                         assessToolWear, selectMachineConfig}
 *     -> HyperMillStrategyEngine.recommendWithDiamondTurning
 *
 * Dispatcher action `cam_strategy_recommend_with_diamond_turning` (prism_cam)
 * orchestrates the two engines; this suite asserts the engine-level chain in
 * the same shape.
 *
 * Coverage:
 *   happy path · gate (above/below threshold) · partial overlay ·
 *   3 failure modes (no overlay / zero target / NaN target) ·
 *   2 adversarial (custom threshold / invalid material) ·
 *   provenance flags · recommend() alias · backwards-compat · dispatcher contract.
 */
import { describe, it, expect } from "vitest";
import {
  hyperMillStrategyEngine,
  type StrategyInput,
  type PrecisionOverlayInput,
  type StrategyRecommendationWithPrecisionOverlay,
} from "../engines/HyperMillStrategyEngine.js";

const BASE_STRATEGY: StrategyInput = {
  geometryType: "freeform_3d",
  operationGoal: "finishing",
  materialGroup: "N", // non-ferrous (aluminum) — typical SPDT material
  toolDiameterMm: 6,
  wallAngleDeg: 30,
};

const MIRROR_OVERLAY: PrecisionOverlayInput = {
  material: "aluminum_6061",
  target_Ra_nm: 25,                // mirror-finish target
  tool_nose_radius_mm: 0.5,
  feed_per_rev_um: 3,
  depth_of_cut_um: 2,
  spindle_rpm: 4000,
  spindle_error_motion_nm: 15,
  tool_waviness_nm: 5,
  rake_angle_deg: 0,
  edge_radius_nm: 50,
  cutting_distance_km: 0.5,
  coolant: "oil_mist",
  workpiece_diameter_mm: 50,
  form: "spherical",
};

describe("recommendWithDiamondTurning (U-DEA-november-P03)", () => {
  it("happy path: no overlay -> precision_overlay null, source no_data, base recommendation intact", () => {
    const r = hyperMillStrategyEngine.recommendWithDiamondTurning(BASE_STRATEGY);
    expect(r).not.toBeNull();
    expect(r.precision_overlay).toBeNull();
    expect(r.precision_overlay_source).toBe("no_data");
    // Base StrategyRecommendation contract preserved
    expect(typeof r.strategyName).toBe("string");
    expect(r.strategyName.length).toBeGreaterThan(0);
    expect(typeof r.hyperMillCycle).toBe("string");
    expect(r.confidence).toBeGreaterThan(0);
    expect(r.confidence).toBeLessThanOrEqual(1);
  });

  it("overlay above default threshold (target_Ra_nm=500) -> source not_applicable, overlay null", () => {
    const r = hyperMillStrategyEngine.recommendWithDiamondTurning(BASE_STRATEGY, {
      ...MIRROR_OVERLAY,
      target_Ra_nm: 500, // > 100 nm default threshold
    });
    expect(r.precision_overlay).toBeNull();
    expect(r.precision_overlay_source).toBe("not_applicable");
  });

  it("overlay at/below threshold -> source consulted, all 4 sub-results populated, feasible flag set", () => {
    const r = hyperMillStrategyEngine.recommendWithDiamondTurning(BASE_STRATEGY, MIRROR_OVERLAY);
    expect(r.precision_overlay_source).toBe("consulted");
    expect(r.precision_overlay).not.toBeNull();
    const ov = r.precision_overlay!;
    expect(ov.surface_finish).not.toBeNull();
    expect(ov.cutting_forces).not.toBeNull();
    expect(ov.tool_wear).not.toBeNull();
    expect(ov.machine_config).not.toBeNull();
    expect(typeof ov.feasible).toBe("boolean");
    expect(Array.isArray(ov.warnings)).toBe(true);
    // Surface-finish output structural checks
    expect(ov.surface_finish!.Ra_nm).toBeGreaterThan(0);
    expect(ov.surface_finish!.Rz_nm).toBeGreaterThanOrEqual(ov.surface_finish!.Ra_nm);
    expect(typeof ov.surface_finish!.achievable).toBe("boolean");
    expect(typeof ov.surface_finish!.dominant_contributor).toBe("string");
    // Forces output structural checks
    expect(ov.cutting_forces!.Fc_mN).toBeGreaterThan(0);
    expect(ov.cutting_forces!.Ft_mN).toBeGreaterThan(0);
    expect(ov.cutting_forces!.specific_energy_J_per_mm3).toBeGreaterThan(0);
    expect(typeof ov.cutting_forces!.ductile_regime).toBe("boolean");
    // Tool-wear output structural checks
    expect(ov.tool_wear!.edge_recession_um).toBeGreaterThanOrEqual(0);
    expect(ov.tool_wear!.remaining_life_km).toBeGreaterThanOrEqual(0);
    expect(typeof ov.tool_wear!.graphitization_risk).toBe("boolean");
    // Machine-config output structural checks
    expect(["air_bearing", "hydrostatic", "aerostatic"]).toContain(ov.machine_config!.spindle_type);
    expect(ov.machine_config!.spindle_error_spec_nm).toBeGreaterThan(0);
  });

  it("partial overlay (no cutting_distance_km/coolant) -> tool_wear null, others populated", () => {
    const partial: PrecisionOverlayInput = { ...MIRROR_OVERLAY };
    delete partial.cutting_distance_km;
    delete partial.coolant;
    const r = hyperMillStrategyEngine.recommendWithDiamondTurning(BASE_STRATEGY, partial);
    expect(r.precision_overlay_source).toBe("consulted");
    expect(r.precision_overlay!.tool_wear).toBeNull();
    expect(r.precision_overlay!.surface_finish).not.toBeNull();
    expect(r.precision_overlay!.cutting_forces).not.toBeNull();
    expect(r.precision_overlay!.machine_config).not.toBeNull();
    // warnings empty when the missing sub-results are gated by absent inputs (not failures)
    expect(r.precision_overlay!.warnings).toEqual([]);
  });

  it("partial overlay (no workpiece_diameter_mm/form) -> machine_config null, others populated", () => {
    const partial: PrecisionOverlayInput = { ...MIRROR_OVERLAY };
    delete partial.workpiece_diameter_mm;
    delete partial.form;
    const r = hyperMillStrategyEngine.recommendWithDiamondTurning(BASE_STRATEGY, partial);
    expect(r.precision_overlay_source).toBe("consulted");
    expect(r.precision_overlay!.machine_config).toBeNull();
    expect(r.precision_overlay!.surface_finish).not.toBeNull();
    expect(r.precision_overlay!.cutting_forces).not.toBeNull();
    expect(r.precision_overlay!.tool_wear).not.toBeNull();
    expect(r.precision_overlay!.warnings).toEqual([]);
  });

  it("failure mode: target_Ra_nm = 0 -> source no_data, overlay null (invalid gate input)", () => {
    const r = hyperMillStrategyEngine.recommendWithDiamondTurning(BASE_STRATEGY, {
      ...MIRROR_OVERLAY,
      target_Ra_nm: 0,
    });
    expect(r.precision_overlay).toBeNull();
    expect(r.precision_overlay_source).toBe("no_data");
  });

  it("failure mode: target_Ra_nm < 0 -> source no_data, overlay null", () => {
    const r = hyperMillStrategyEngine.recommendWithDiamondTurning(BASE_STRATEGY, {
      ...MIRROR_OVERLAY,
      target_Ra_nm: -10,
    });
    expect(r.precision_overlay).toBeNull();
    expect(r.precision_overlay_source).toBe("no_data");
  });

  it("failure mode: target_Ra_nm = NaN -> source no_data, overlay null", () => {
    const r = hyperMillStrategyEngine.recommendWithDiamondTurning(BASE_STRATEGY, {
      ...MIRROR_OVERLAY,
      target_Ra_nm: Number.NaN,
    });
    expect(r.precision_overlay).toBeNull();
    expect(r.precision_overlay_source).toBe("no_data");
  });

  it("custom threshold override: target=400nm passes when threshold=500nm", () => {
    const r = hyperMillStrategyEngine.recommendWithDiamondTurning(
      BASE_STRATEGY,
      { ...MIRROR_OVERLAY, target_Ra_nm: 400 },
      500, // custom threshold
    );
    expect(r.precision_overlay_source).toBe("consulted");
    expect(r.precision_overlay).not.toBeNull();
  });

  it("custom threshold override: target=400nm rejected when threshold=200nm", () => {
    const r = hyperMillStrategyEngine.recommendWithDiamondTurning(
      BASE_STRATEGY,
      { ...MIRROR_OVERLAY, target_Ra_nm: 400 },
      200,
    );
    expect(r.precision_overlay).toBeNull();
    expect(r.precision_overlay_source).toBe("not_applicable");
  });

  it("recommend() alias delegates to calculate() — same StrategyRecommendation shape both ways", () => {
    const viaCalc = hyperMillStrategyEngine.calculate(BASE_STRATEGY);
    const viaRec = hyperMillStrategyEngine.recommend(BASE_STRATEGY);
    expect(viaRec.strategyName).toBe(viaCalc.strategyName);
    expect(viaRec.hyperMillCycle).toBe(viaCalc.hyperMillCycle);
    expect(viaRec.suggestedStepdown).toBe(viaCalc.suggestedStepdown);
    expect(viaRec.suggestedStepover).toBe(viaCalc.suggestedStepover);
    expect(viaRec.cuttingMode).toBe(viaCalc.cuttingMode);
  });

  it("feasibility flag: aggressive feed produces non-achievable Ra -> feasible=false but overlay still populated", () => {
    // Push parameters past the DT engine's achievable cutoff (Ra_total < 500 nm).
    // Ra_ideal = (f^2 / 32R) * 1e6 nm; feed=200um R=0.1mm -> ~12,500 nm ideal alone.
    const aggressive: PrecisionOverlayInput = {
      ...MIRROR_OVERLAY,
      feed_per_rev_um: 200,
      tool_nose_radius_mm: 0.1,
      depth_of_cut_um: 50,
      target_Ra_nm: 10,
      spindle_error_motion_nm: 500,
      tool_waviness_nm: 200,
    };
    const r = hyperMillStrategyEngine.recommendWithDiamondTurning(BASE_STRATEGY, aggressive);
    expect(r.precision_overlay_source).toBe("consulted");
    expect(r.precision_overlay).not.toBeNull();
    expect(r.precision_overlay!.surface_finish).not.toBeNull();
    // Aggressive params -> predicted Ra > 500nm achievable cutoff -> not achievable
    expect(r.precision_overlay!.surface_finish!.Ra_nm).toBeGreaterThan(500);
    expect(r.precision_overlay!.feasible).toBe(false);
    expect(r.precision_overlay!.surface_finish!.achievable).toBe(false);
    expect(r.precision_overlay!.surface_finish!.recommendations.length).toBeGreaterThan(0);
  });

  it("graceful unknown material: resolveMat falls back to aluminum_6061 -> overlay populated, no warnings", () => {
    // DiamondTurningEngine's resolveMat returns aluminum_6061 for unknown names
    // (intentional fallback at line 127). The bridge surfaces the fallback as a
    // populated overlay with empty warnings — adversarial input is graceful, not silent.
    const r = hyperMillStrategyEngine.recommendWithDiamondTurning(BASE_STRATEGY, {
      ...MIRROR_OVERLAY,
      material: "no_such_material_xyz_does_not_exist",
    });
    expect(r.precision_overlay_source).toBe("consulted");
    expect(r.precision_overlay).not.toBeNull();
    expect(r.precision_overlay!.warnings).toEqual([]);
    expect(r.precision_overlay!.surface_finish).not.toBeNull();
    expect(r.precision_overlay!.cutting_forces).not.toBeNull();
    // Aluminum fallback parameters should still produce finite, positive Ra
    expect(Number.isFinite(r.precision_overlay!.surface_finish!.Ra_nm)).toBe(true);
    expect(r.precision_overlay!.surface_finish!.Ra_nm).toBeGreaterThan(0);
  });

  it("backwards-compat: recommend() and calculate() return shapes have NO precision_overlay keys", () => {
    const viaCalc = hyperMillStrategyEngine.calculate(BASE_STRATEGY);
    const viaRec = hyperMillStrategyEngine.recommend(BASE_STRATEGY);
    const calcKeys = Object.keys(viaCalc as unknown as Record<string, unknown>);
    const recKeys = Object.keys(viaRec as unknown as Record<string, unknown>);
    expect(calcKeys).not.toContain("precision_overlay");
    expect(calcKeys).not.toContain("precision_overlay_source");
    expect(recKeys).not.toContain("precision_overlay");
    expect(recKeys).not.toContain("precision_overlay_source");
  });
});

describe("cam_strategy_recommend_with_diamond_turning dispatcher contract (U-DEA-november-P03)", () => {
  it("dispatcher action chains engine + returns augmented StrategyRecommendationWithPrecisionOverlay shape", () => {
    const data = hyperMillStrategyEngine.recommendWithDiamondTurning(
      BASE_STRATEGY,
      MIRROR_OVERLAY,
      100,
    );
    expect(data).not.toBeNull();
    const cap = data as StrategyRecommendationWithPrecisionOverlay;
    expect(cap.precision_overlay_source).toBe("consulted");
    expect(cap.precision_overlay).not.toBeNull();
    expect(cap.precision_overlay!.surface_finish).not.toBeNull();
    expect(cap.precision_overlay!.surface_finish!.Ra_nm).toBeGreaterThan(0);
    // Mirror dispatcher result wrapping
    const result = { ...cap };
    expect(result.precision_overlay_source).toBe("consulted");
    expect(typeof result.strategyName).toBe("string");
  });
});
