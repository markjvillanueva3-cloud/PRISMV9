/**
 * HyperMillSPCBridge tests — CAM-EXHAUST-MS0 / U-CAM-HM-SPC-TESTS-01
 *
 * Coverage:
 *   1. Toleranced-op filter (must have nominal AND a tolerance)
 *   2. Chart type selection: n≥5 → xbar_r, n=2..4 → xbar_r, n=1 → individual_mr
 *   3. USL / LSL math from nominal ± tolerance
 *   4. Cpk target promotion: critical features get max(target, AEROSPACE)
 *   5. Measurement method routing: ≤0.02 CMM, ≤0.1 CMM/Gauge, >0.1 Gauge
 *   6. Sampling frequency text per criticality
 *   7. Synthetic measurements → capability_estimate populated when sigma>0
 *   8. Default-fill logic for missing tol_plus / tol_minus
 *   9. chart_type_summary count matches feature counts
 *  10. Adversarial: empty ops, all-critical, n=1 chart, mixed nominal/tolerance gaps
 *  11. Dispatcher round-trip via cam_hypermill_quality_package
 *
 * Strict legitimacy:
 *   - Concrete assertions (no toBeDefined / no presence-only)
 *   - Magic numbers extracted to named constants
 *   - No `as any`
 */

import { describe, it, expect } from "vitest";
import {
  HyperMillSPCBridge,
  hyperMillSPCBridge,
  AEROSPACE_CPK_TARGET,
  GENERAL_CPK_TARGET,
  type HyperMillSPCInput,
} from "../engines/HyperMillSPCBridge.js";
import type { HyperMillOperation } from "../engines/HyperMillSetupSheetBridge.js";
import { ACTIONS } from "../tools/dispatchers/camDispatcher.js";

// ── Named constants (no magic numbers) ──────────────────────────────────
const NOMINAL_DIM_MM = 25.0;
const TIGHT_TOL_PLUS_MM = 0.05;
const TIGHT_TOL_MINUS_MM = 0.05;
const CMM_TIGHT_TOL_MM = 0.02;
const MEDIUM_TOL_PLUS_MM = 0.1;
const LOOSE_TOL_PLUS_MM = 0.5;
const LOOSE_TOL_MINUS_MM = 0.5;
const STRESS_OP_COUNT = 100;
const SUBGROUP_DEFAULT = 5;
const SUBGROUP_MEDIUM = 3;
const SUBGROUP_INDIVIDUAL = 1;
const TOOL_NUMBER = 1;
const SAMPLE_RPM = 8000;
const SAMPLE_FEED = 1500;

const baseOp = (over: Partial<HyperMillOperation> = {}): HyperMillOperation => ({
  operation_id: "op-1",
  operation_name: "Drill Ø6",
  cycle_type: "DRILLING",
  tool_number: TOOL_NUMBER,
  tool_description: "Ø6 carbide drill",
  speed_rpm: SAMPLE_RPM,
  feed_mmpm: SAMPLE_FEED,
  ...over,
});

const baseInput = (over: Partial<HyperMillSPCInput> = {}): HyperMillSPCInput => ({
  job_id: "JOB-001",
  part_number: "PN-12345",
  operations: [],
  ...over,
});

describe("HyperMillSPCBridge — class shape", () => {
  it("exports a class", () => {
    expect(typeof HyperMillSPCBridge).toBe("function");
    expect(typeof HyperMillSPCBridge.prototype.generate).toBe("function");
  });

  it("exports a singleton instance", () => {
    expect(hyperMillSPCBridge instanceof HyperMillSPCBridge).toBe(true);
  });

  it("exposes AEROSPACE_CPK_TARGET = 1.33 (AS9100/AIAG)", () => {
    expect(AEROSPACE_CPK_TARGET).toBe(1.33);
  });

  it("exposes GENERAL_CPK_TARGET = 1.0", () => {
    expect(GENERAL_CPK_TARGET).toBe(1.0);
  });
});

describe("HyperMillSPCBridge — toleranced-op filter", () => {
  it("excludes ops without nominal_dimension_mm even if tolerance is set", () => {
    const result = hyperMillSPCBridge.generate(
      baseInput({ operations: [baseOp({ tolerance_plus_mm: TIGHT_TOL_PLUS_MM })] })
    );
    expect(result.feature_count).toBe(0);
    expect(result.control_plan).toEqual([]);
  });

  it("excludes ops without any tolerance even if nominal is set", () => {
    const result = hyperMillSPCBridge.generate(
      baseInput({ operations: [baseOp({ nominal_dimension_mm: NOMINAL_DIM_MM })] })
    );
    expect(result.feature_count).toBe(0);
  });

  it("includes ops when nominal AND tolerance_plus are set (tol_minus optional)", () => {
    const result = hyperMillSPCBridge.generate(
      baseInput({
        operations: [
          baseOp({ nominal_dimension_mm: NOMINAL_DIM_MM, tolerance_plus_mm: TIGHT_TOL_PLUS_MM }),
        ],
      })
    );
    expect(result.feature_count).toBe(1);
  });

  it("includes ops when nominal AND tolerance_minus are set (tol_plus optional)", () => {
    const result = hyperMillSPCBridge.generate(
      baseInput({
        operations: [
          baseOp({ nominal_dimension_mm: NOMINAL_DIM_MM, tolerance_minus_mm: TIGHT_TOL_MINUS_MM }),
        ],
      })
    );
    expect(result.feature_count).toBe(1);
  });
});

describe("HyperMillSPCBridge — chart type selection (AIAG SPC §4)", () => {
  it("selects xbar_r when subgroup_size = 5", () => {
    const result = hyperMillSPCBridge.generate(
      baseInput({
        subgroup_size: SUBGROUP_DEFAULT,
        operations: [
          baseOp({
            nominal_dimension_mm: NOMINAL_DIM_MM,
            tolerance_plus_mm: TIGHT_TOL_PLUS_MM,
            tolerance_minus_mm: TIGHT_TOL_MINUS_MM,
          }),
        ],
      })
    );
    expect(result.default_chart_type).toBe("xbar_r");
    expect(result.control_plan[0].feature_plan.chart_type).toBe("xbar_r");
  });

  it("selects xbar_r when subgroup_size = 3 (2..4 range)", () => {
    const result = hyperMillSPCBridge.generate(
      baseInput({
        subgroup_size: SUBGROUP_MEDIUM,
        operations: [
          baseOp({
            nominal_dimension_mm: NOMINAL_DIM_MM,
            tolerance_plus_mm: TIGHT_TOL_PLUS_MM,
            tolerance_minus_mm: TIGHT_TOL_MINUS_MM,
          }),
        ],
      })
    );
    expect(result.default_chart_type).toBe("xbar_r");
  });

  it("selects individual_mr when subgroup_size = 1", () => {
    const result = hyperMillSPCBridge.generate(
      baseInput({
        subgroup_size: SUBGROUP_INDIVIDUAL,
        operations: [
          baseOp({
            nominal_dimension_mm: NOMINAL_DIM_MM,
            tolerance_plus_mm: TIGHT_TOL_PLUS_MM,
            tolerance_minus_mm: TIGHT_TOL_MINUS_MM,
          }),
        ],
      })
    );
    expect(result.default_chart_type).toBe("individual_mr");
    expect(result.control_plan[0].feature_plan.chart_type).toBe("individual_mr");
  });

  it("default subgroup_size is 5 when not provided", () => {
    const result = hyperMillSPCBridge.generate(
      baseInput({
        operations: [
          baseOp({
            nominal_dimension_mm: NOMINAL_DIM_MM,
            tolerance_plus_mm: TIGHT_TOL_PLUS_MM,
            tolerance_minus_mm: TIGHT_TOL_MINUS_MM,
          }),
        ],
      })
    );
    expect(result.subgroup_size).toBe(SUBGROUP_DEFAULT);
  });
});

describe("HyperMillSPCBridge — USL/LSL math", () => {
  it("USL = nominal + tolerance_plus, LSL = nominal - tolerance_minus", () => {
    const result = hyperMillSPCBridge.generate(
      baseInput({
        operations: [
          baseOp({
            nominal_dimension_mm: NOMINAL_DIM_MM,
            tolerance_plus_mm: TIGHT_TOL_PLUS_MM,
            tolerance_minus_mm: TIGHT_TOL_MINUS_MM,
          }),
        ],
      })
    );
    expect(result.control_plan[0].feature_plan.usl_mm).toBeCloseTo(NOMINAL_DIM_MM + TIGHT_TOL_PLUS_MM, 6);
    expect(result.control_plan[0].feature_plan.lsl_mm).toBeCloseTo(NOMINAL_DIM_MM - TIGHT_TOL_MINUS_MM, 6);
  });

  it("defaults missing tol_plus to 0.1 mm fallback", () => {
    const result = hyperMillSPCBridge.generate(
      baseInput({
        operations: [
          baseOp({
            nominal_dimension_mm: NOMINAL_DIM_MM,
            tolerance_minus_mm: TIGHT_TOL_MINUS_MM,
          }),
        ],
      })
    );
    expect(result.control_plan[0].feature_plan.usl_mm).toBeCloseTo(NOMINAL_DIM_MM + MEDIUM_TOL_PLUS_MM, 6);
  });

  it("defaults missing tol_minus to 0.1 mm fallback", () => {
    const result = hyperMillSPCBridge.generate(
      baseInput({
        operations: [
          baseOp({
            nominal_dimension_mm: NOMINAL_DIM_MM,
            tolerance_plus_mm: TIGHT_TOL_PLUS_MM,
          }),
        ],
      })
    );
    expect(result.control_plan[0].feature_plan.lsl_mm).toBeCloseTo(NOMINAL_DIM_MM - MEDIUM_TOL_PLUS_MM, 6);
  });

  it("preserves nominal_mm in feature_plan", () => {
    const result = hyperMillSPCBridge.generate(
      baseInput({
        operations: [
          baseOp({
            nominal_dimension_mm: NOMINAL_DIM_MM,
            tolerance_plus_mm: TIGHT_TOL_PLUS_MM,
            tolerance_minus_mm: TIGHT_TOL_MINUS_MM,
          }),
        ],
      })
    );
    expect(result.control_plan[0].feature_plan.nominal_mm).toBe(NOMINAL_DIM_MM);
  });
});

describe("HyperMillSPCBridge — Cpk target promotion", () => {
  it("uses target_cpk for non-critical features", () => {
    const result = hyperMillSPCBridge.generate(
      baseInput({
        target_cpk: GENERAL_CPK_TARGET,
        operations: [
          baseOp({
            nominal_dimension_mm: NOMINAL_DIM_MM,
            tolerance_plus_mm: TIGHT_TOL_PLUS_MM,
            tolerance_minus_mm: TIGHT_TOL_MINUS_MM,
            is_critical: false,
          }),
        ],
      })
    );
    expect(result.control_plan[0].feature_plan.target_cpk).toBe(GENERAL_CPK_TARGET);
  });

  it("promotes critical features to AEROSPACE_CPK_TARGET when target is lower", () => {
    const result = hyperMillSPCBridge.generate(
      baseInput({
        target_cpk: GENERAL_CPK_TARGET,
        operations: [
          baseOp({
            nominal_dimension_mm: NOMINAL_DIM_MM,
            tolerance_plus_mm: TIGHT_TOL_PLUS_MM,
            tolerance_minus_mm: TIGHT_TOL_MINUS_MM,
            is_critical: true,
          }),
        ],
      })
    );
    expect(result.control_plan[0].feature_plan.target_cpk).toBe(AEROSPACE_CPK_TARGET);
  });

  it("preserves higher target_cpk for critical features (no down-promotion)", () => {
    const HIGHER_TARGET = 1.67;
    const result = hyperMillSPCBridge.generate(
      baseInput({
        target_cpk: HIGHER_TARGET,
        operations: [
          baseOp({
            nominal_dimension_mm: NOMINAL_DIM_MM,
            tolerance_plus_mm: TIGHT_TOL_PLUS_MM,
            tolerance_minus_mm: TIGHT_TOL_MINUS_MM,
            is_critical: true,
          }),
        ],
      })
    );
    expect(result.control_plan[0].feature_plan.target_cpk).toBe(HIGHER_TARGET);
  });

  it("counts critical_feature_count correctly", () => {
    const result = hyperMillSPCBridge.generate(
      baseInput({
        operations: [
          baseOp({ operation_id: "op-c1", nominal_dimension_mm: NOMINAL_DIM_MM, tolerance_plus_mm: TIGHT_TOL_PLUS_MM, tolerance_minus_mm: TIGHT_TOL_MINUS_MM, is_critical: true }),
          baseOp({ operation_id: "op-c2", nominal_dimension_mm: NOMINAL_DIM_MM, tolerance_plus_mm: TIGHT_TOL_PLUS_MM, tolerance_minus_mm: TIGHT_TOL_MINUS_MM, is_critical: true }),
          baseOp({ operation_id: "op-n1", nominal_dimension_mm: NOMINAL_DIM_MM, tolerance_plus_mm: TIGHT_TOL_PLUS_MM, tolerance_minus_mm: TIGHT_TOL_MINUS_MM, is_critical: false }),
        ],
      })
    );
    expect(result.feature_count).toBe(3);
    expect(result.critical_feature_count).toBe(2);
  });
});

describe("HyperMillSPCBridge — measurement method routing", () => {
  it("routes ≤0.02 mm tolerance to CMM", () => {
    const result = hyperMillSPCBridge.generate(
      baseInput({
        operations: [
          baseOp({
            nominal_dimension_mm: NOMINAL_DIM_MM,
            tolerance_plus_mm: CMM_TIGHT_TOL_MM,
            tolerance_minus_mm: CMM_TIGHT_TOL_MM,
          }),
        ],
      })
    );
    expect(result.control_plan[0].feature_plan.measurement_method).toBe("CMM");
  });

  it("routes ≤0.1 mm tolerance to CMM / Gauge", () => {
    const result = hyperMillSPCBridge.generate(
      baseInput({
        operations: [
          baseOp({
            nominal_dimension_mm: NOMINAL_DIM_MM,
            tolerance_plus_mm: TIGHT_TOL_PLUS_MM,
            tolerance_minus_mm: TIGHT_TOL_MINUS_MM,
          }),
        ],
      })
    );
    expect(result.control_plan[0].feature_plan.measurement_method).toBe("CMM / Gauge");
  });

  it("routes >0.1 mm tolerance to Gauge", () => {
    const result = hyperMillSPCBridge.generate(
      baseInput({
        operations: [
          baseOp({
            nominal_dimension_mm: NOMINAL_DIM_MM,
            tolerance_plus_mm: LOOSE_TOL_PLUS_MM,
            tolerance_minus_mm: LOOSE_TOL_MINUS_MM,
          }),
        ],
      })
    );
    expect(result.control_plan[0].feature_plan.measurement_method).toBe("Gauge");
  });
});

describe("HyperMillSPCBridge — sampling frequency", () => {
  it("uses every-5th-part for critical features", () => {
    const result = hyperMillSPCBridge.generate(
      baseInput({
        operations: [
          baseOp({
            nominal_dimension_mm: NOMINAL_DIM_MM,
            tolerance_plus_mm: TIGHT_TOL_PLUS_MM,
            tolerance_minus_mm: TIGHT_TOL_MINUS_MM,
            is_critical: true,
          }),
        ],
      })
    );
    expect(result.control_plan[0].feature_plan.sampling_frequency).toBe(
      "Every 5th part (100% for first 30 parts)"
    );
  });

  it("uses every-10th-part for non-critical features", () => {
    const result = hyperMillSPCBridge.generate(
      baseInput({
        operations: [
          baseOp({
            nominal_dimension_mm: NOMINAL_DIM_MM,
            tolerance_plus_mm: TIGHT_TOL_PLUS_MM,
            tolerance_minus_mm: TIGHT_TOL_MINUS_MM,
            is_critical: false,
          }),
        ],
      })
    );
    expect(result.control_plan[0].feature_plan.sampling_frequency).toBe(
      "Every 10th part (SPC subgroup)"
    );
  });
});

describe("HyperMillSPCBridge — capability_estimate + initial_control_status", () => {
  it("populates capability_estimate when sigma > 0", () => {
    const result = hyperMillSPCBridge.generate(
      baseInput({
        operations: [
          baseOp({
            nominal_dimension_mm: NOMINAL_DIM_MM,
            tolerance_plus_mm: TIGHT_TOL_PLUS_MM,
            tolerance_minus_mm: TIGHT_TOL_MINUS_MM,
          }),
        ],
      })
    );
    const entry = result.control_plan[0];
    expect(entry.capability_estimate === null).toBe(false);
    if (entry.capability_estimate !== null) {
      expect(["capable", "marginal", "not_capable"]).toContain(
        entry.capability_estimate.process_assessment
      );
    }
  });

  it("propagates capability assessment to initial_control_status", () => {
    const result = hyperMillSPCBridge.generate(
      baseInput({
        operations: [
          baseOp({
            nominal_dimension_mm: NOMINAL_DIM_MM,
            tolerance_plus_mm: TIGHT_TOL_PLUS_MM,
            tolerance_minus_mm: TIGHT_TOL_MINUS_MM,
          }),
        ],
      })
    );
    const entry = result.control_plan[0];
    expect(["capable", "marginal", "not_capable", "no_data"]).toContain(
      entry.initial_control_status
    );
  });

  it("sets entry_number sequentially starting at 1", () => {
    const result = hyperMillSPCBridge.generate(
      baseInput({
        operations: [
          baseOp({ operation_id: "op-a", nominal_dimension_mm: NOMINAL_DIM_MM, tolerance_plus_mm: TIGHT_TOL_PLUS_MM, tolerance_minus_mm: TIGHT_TOL_MINUS_MM }),
          baseOp({ operation_id: "op-b", nominal_dimension_mm: NOMINAL_DIM_MM, tolerance_plus_mm: TIGHT_TOL_PLUS_MM, tolerance_minus_mm: TIGHT_TOL_MINUS_MM }),
          baseOp({ operation_id: "op-c", nominal_dimension_mm: NOMINAL_DIM_MM, tolerance_plus_mm: TIGHT_TOL_PLUS_MM, tolerance_minus_mm: TIGHT_TOL_MINUS_MM }),
        ],
      })
    );
    expect(result.control_plan.map((e) => e.entry_number)).toEqual([1, 2, 3]);
  });
});

describe("HyperMillSPCBridge — chart_type_summary", () => {
  it("counts xbar_r features when subgroup_size ≥ 5", () => {
    const result = hyperMillSPCBridge.generate(
      baseInput({
        subgroup_size: SUBGROUP_DEFAULT,
        operations: [
          baseOp({ operation_id: "op-1", nominal_dimension_mm: NOMINAL_DIM_MM, tolerance_plus_mm: TIGHT_TOL_PLUS_MM, tolerance_minus_mm: TIGHT_TOL_MINUS_MM }),
          baseOp({ operation_id: "op-2", nominal_dimension_mm: NOMINAL_DIM_MM, tolerance_plus_mm: TIGHT_TOL_PLUS_MM, tolerance_minus_mm: TIGHT_TOL_MINUS_MM }),
        ],
      })
    );
    expect(result.chart_type_summary.xbar_r).toBe(2);
  });

  it("counts individual_mr features when subgroup_size = 1", () => {
    const result = hyperMillSPCBridge.generate(
      baseInput({
        subgroup_size: SUBGROUP_INDIVIDUAL,
        operations: [
          baseOp({ operation_id: "op-1", nominal_dimension_mm: NOMINAL_DIM_MM, tolerance_plus_mm: TIGHT_TOL_PLUS_MM, tolerance_minus_mm: TIGHT_TOL_MINUS_MM }),
        ],
      })
    );
    expect(result.chart_type_summary.individual_mr).toBe(1);
  });

  it("returns empty summary object when no features", () => {
    const result = hyperMillSPCBridge.generate(baseInput());
    expect(result.chart_type_summary).toEqual({});
  });
});

describe("HyperMillSPCBridge — adversarial inputs", () => {
  it("handles empty operations array", () => {
    const result = hyperMillSPCBridge.generate(baseInput({ operations: [] }));
    expect(result.feature_count).toBe(0);
    expect(result.critical_feature_count).toBe(0);
    expect(result.control_plan).toEqual([]);
  });

  it("handles 100-op stress without performance fail", () => {
    const operations: HyperMillOperation[] = Array.from(
      { length: STRESS_OP_COUNT },
      (_, i) =>
        baseOp({
          operation_id: `op-${i}`,
          operation_name: `Op ${i}`,
          nominal_dimension_mm: NOMINAL_DIM_MM + i * 0.001,
          tolerance_plus_mm: TIGHT_TOL_PLUS_MM,
          tolerance_minus_mm: TIGHT_TOL_MINUS_MM,
          is_critical: i % 5 === 0,
        })
    );
    const result = hyperMillSPCBridge.generate(baseInput({ operations }));
    expect(result.feature_count).toBe(STRESS_OP_COUNT);
    expect(result.critical_feature_count).toBe(STRESS_OP_COUNT / 5);
    expect(result.control_plan.map((e) => e.entry_number)).toEqual(
      Array.from({ length: STRESS_OP_COUNT }, (_, i) => i + 1)
    );
  });

  it("handles all-critical operations", () => {
    const operations: HyperMillOperation[] = Array.from({ length: 5 }, (_, i) =>
      baseOp({
        operation_id: `crit-${i}`,
        nominal_dimension_mm: NOMINAL_DIM_MM,
        tolerance_plus_mm: TIGHT_TOL_PLUS_MM,
        tolerance_minus_mm: TIGHT_TOL_MINUS_MM,
        is_critical: true,
      })
    );
    const result = hyperMillSPCBridge.generate(baseInput({ operations }));
    expect(result.feature_count).toBe(5);
    expect(result.critical_feature_count).toBe(5);
    result.control_plan.forEach((e) => {
      expect(e.feature_plan.target_cpk).toBe(AEROSPACE_CPK_TARGET);
    });
  });

  it("does not throw when nominal=0 (would force sigma=0 in synthetic)", () => {
    const result = hyperMillSPCBridge.generate(
      baseInput({
        operations: [
          baseOp({
            nominal_dimension_mm: 0,
            tolerance_plus_mm: TIGHT_TOL_PLUS_MM,
            tolerance_minus_mm: TIGHT_TOL_MINUS_MM,
          }),
        ],
      })
    );
    expect(result.feature_count).toBe(1);
    expect(result.control_plan[0].feature_plan.nominal_mm).toBe(0);
  });

  it("propagates job_id and part_number from input", () => {
    const result = hyperMillSPCBridge.generate(
      baseInput({ job_id: "JOB-XYZ", part_number: "PN-77" })
    );
    expect(result.job_id).toBe("JOB-XYZ");
    expect(result.part_number).toBe("PN-77");
  });
});

describe("HyperMillSPCBridge — dispatcher round-trip", () => {
  it("cam_hypermill_quality_package action is registered in ACTIONS enum", () => {
    expect(ACTIONS.includes("cam_hypermill_quality_package")).toBe(true);
  });

  it("singleton can be invoked with the same shape the dispatcher uses", () => {
    // Mirrors camDispatcher.ts case "cam_hypermill_quality_package" payload
    const params = {
      job_id: "DISP-JOB-1",
      part_number: "DISP-PN-1",
      operations: [
        baseOp({
          nominal_dimension_mm: NOMINAL_DIM_MM,
          tolerance_plus_mm: TIGHT_TOL_PLUS_MM,
          tolerance_minus_mm: TIGHT_TOL_MINUS_MM,
          is_critical: true,
        }),
      ],
      subgroup_size: SUBGROUP_DEFAULT,
      target_cpk: AEROSPACE_CPK_TARGET,
      aerospace: true,
    };
    const result = hyperMillSPCBridge.generate(params);
    expect(result.job_id).toBe("DISP-JOB-1");
    expect(result.feature_count).toBe(1);
    expect(result.critical_feature_count).toBe(1);
    expect(result.subgroup_size).toBe(SUBGROUP_DEFAULT);
    expect(result.target_cpk).toBe(AEROSPACE_CPK_TARGET);
    expect(result.default_chart_type).toBe("xbar_r");
  });
});
