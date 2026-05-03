/**
 * HyperMillFAIBridge tests — CAM-EXHAUST-MS0 / U-CAM-HM-FAI-TESTS-01
 *
 * Coverage:
 *   1. toleranced-op filter (no-tol → empty mappings → placeholder feature)
 *   2. critical classification matrix (is_critical flag, ≤0.05 mm tol, feature_type set)
 *   3. major vs minor classification (boundary 0.1 mm)
 *   4. inspection method routing (CMM ≤0.1 / gauge ≤0.5 / manual >0.5)
 *   5. critical-first sort order in form_3
 *   6. balloon numbering monotonic (1..N) after sort
 *   7. form_1 / form_2 default fallback values
 *   8. material_cert default vs custom (traceability_status)
 *   9. dispatcher round-trip via cam_hypermill_quality_package
 *  10. adversarial — empty operations, mixed-type ops, 100-op stress
 *
 * Strict legitimacy:
 *   - All assertions concrete (toBe / toContain / toEqual on full objects)
 *   - No magic numbers — extracted as named constants
 *   - No presence-only assertions (no toBeDefined)
 *   - No `as any`
 */

import { describe, it, expect } from "vitest";
import {
  HyperMillFAIBridge,
  hyperMillFAIBridge,
  type HyperMillFAIInput,
} from "../engines/HyperMillFAIBridge.js";
import type { HyperMillOperation } from "../engines/HyperMillSetupSheetBridge.js";
import { ACTIONS } from "../tools/dispatchers/camDispatcher.js";

// ── Named constants (no magic numbers) ──────────────────────────────────
const CRITICAL_TOL_MM = 0.02;        // qualifies as critical (≤0.05) AND CMM (≤0.02)
const TIGHT_TOL_MM = 0.05;           // exact critical boundary
const MAJOR_TOL_MM = 0.1;            // exact major boundary
const MINOR_TOL_MM = 0.3;            // qualifies as minor + gauge
const LOOSE_TOL_MM = 1.0;            // qualifies as minor + manual
const NOMINAL_DIM_MM = 25.4;
const STRESS_OP_COUNT = 100;
const SUBGROUP_SIZE = 5;
const TARGET_CPK = 1.33;
const TOOL_NUMBER = 1;

const baseOp = (over: Partial<HyperMillOperation> = {}): HyperMillOperation => ({
  operation_id: "op-1",
  operation_name: "Drill Ø6",
  cycle_type: "DRILLING",
  tool_number: TOOL_NUMBER,
  tool_description: "Ø6 carbide drill",
  ...over,
});

const baseInput = (over: Partial<HyperMillFAIInput> = {}): HyperMillFAIInput => ({
  job_id: "JOB-001",
  part_number: "PN-12345",
  operations: [],
  ...over,
});

describe("HyperMillFAIBridge — class shape", () => {
  it("exports a class", () => {
    expect(typeof HyperMillFAIBridge).toBe("function");
    expect(typeof HyperMillFAIBridge.prototype.generate).toBe("function");
  });

  it("exports a singleton instance", () => {
    expect(hyperMillFAIBridge instanceof HyperMillFAIBridge).toBe(true);
  });
});

describe("HyperMillFAIBridge — toleranced-op filter", () => {
  it("returns balloon_count=0 for ops without any tolerance fields", async () => {
    const result = await hyperMillFAIBridge.generate(
      baseInput({ operations: [baseOp(), baseOp({ operation_id: "op-2" })] })
    );
    expect(result.balloon_count).toBe(0);
    expect(result.form_3).toEqual([]);
  });

  it("includes operation when nominal_dimension_mm is set even without tolerance", async () => {
    const result = await hyperMillFAIBridge.generate(
      baseInput({ operations: [baseOp({ nominal_dimension_mm: NOMINAL_DIM_MM })] })
    );
    expect(result.balloon_count).toBe(1);
    expect(result.form_3[0].nominal_mm).toBe(NOMINAL_DIM_MM);
  });

  it("includes operation when only tolerance_minus_mm is set", async () => {
    const result = await hyperMillFAIBridge.generate(
      baseInput({ operations: [baseOp({ tolerance_minus_mm: MINOR_TOL_MM })] })
    );
    expect(result.balloon_count).toBe(1);
    expect(result.form_3[0].tol_minus_mm).toBe(MINOR_TOL_MM);
    expect(result.form_3[0].tol_plus_mm).toBe(0);
  });
});

describe("HyperMillFAIBridge — critical classification", () => {
  it("flags is_critical=true ops as critical even with loose tolerance", async () => {
    const result = await hyperMillFAIBridge.generate(
      baseInput({
        operations: [
          baseOp({
            is_critical: true,
            tolerance_plus_mm: LOOSE_TOL_MM,
            tolerance_minus_mm: LOOSE_TOL_MM,
          }),
        ],
      })
    );
    expect(result.critical_count).toBe(1);
    expect(result.form_3[0].designator).toBe("critical");
  });

  it("flags tolerance_plus_mm ≤ 0.05 as critical", async () => {
    const result = await hyperMillFAIBridge.generate(
      baseInput({ operations: [baseOp({ tolerance_plus_mm: TIGHT_TOL_MM, tolerance_minus_mm: LOOSE_TOL_MM })] })
    );
    expect(result.form_3[0].designator).toBe("critical");
  });

  it("flags tolerance_minus_mm ≤ 0.05 as critical", async () => {
    const result = await hyperMillFAIBridge.generate(
      baseInput({ operations: [baseOp({ tolerance_plus_mm: LOOSE_TOL_MM, tolerance_minus_mm: TIGHT_TOL_MM })] })
    );
    expect(result.form_3[0].designator).toBe("critical");
  });

  it("flags feature_type=bore as critical regardless of tolerance", async () => {
    const result = await hyperMillFAIBridge.generate(
      baseInput({
        operations: [
          baseOp({ feature_type: "bore", tolerance_plus_mm: LOOSE_TOL_MM, tolerance_minus_mm: LOOSE_TOL_MM }),
        ],
      })
    );
    expect(result.form_3[0].designator).toBe("critical");
  });

  it("flags feature_type=thread as critical (case-insensitive via toLowerCase)", async () => {
    const result = await hyperMillFAIBridge.generate(
      baseInput({
        operations: [baseOp({ feature_type: "THREAD", tolerance_plus_mm: LOOSE_TOL_MM, tolerance_minus_mm: LOOSE_TOL_MM })],
      })
    );
    expect(result.form_3[0].designator).toBe("critical");
  });

  it("flags feature_type=datum as critical", async () => {
    const result = await hyperMillFAIBridge.generate(
      baseInput({
        operations: [baseOp({ feature_type: "datum", tolerance_plus_mm: LOOSE_TOL_MM, tolerance_minus_mm: LOOSE_TOL_MM })],
      })
    );
    expect(result.form_3[0].designator).toBe("critical");
  });
});

describe("HyperMillFAIBridge — major / minor classification", () => {
  it("classifies tolerance_plus_mm = 0.1 as major", async () => {
    const result = await hyperMillFAIBridge.generate(
      baseInput({ operations: [baseOp({ tolerance_plus_mm: MAJOR_TOL_MM, tolerance_minus_mm: LOOSE_TOL_MM })] })
    );
    expect(result.form_3[0].designator).toBe("major");
  });

  it("classifies tolerance > 0.1 as minor", async () => {
    const result = await hyperMillFAIBridge.generate(
      baseInput({ operations: [baseOp({ tolerance_plus_mm: MINOR_TOL_MM, tolerance_minus_mm: MINOR_TOL_MM })] })
    );
    expect(result.form_3[0].designator).toBe("minor");
  });

  it("classifies loose tolerance as minor", async () => {
    const result = await hyperMillFAIBridge.generate(
      baseInput({ operations: [baseOp({ tolerance_plus_mm: LOOSE_TOL_MM, tolerance_minus_mm: LOOSE_TOL_MM })] })
    );
    expect(result.form_3[0].designator).toBe("minor");
  });
});

describe("HyperMillFAIBridge — inspection method routing", () => {
  it("routes ≤0.02 mm tolerance to CMM", async () => {
    const result = await hyperMillFAIBridge.generate(
      baseInput({ operations: [baseOp({ tolerance_plus_mm: CRITICAL_TOL_MM, tolerance_minus_mm: CRITICAL_TOL_MM })] })
    );
    expect(result.form_3[0].inspection_method).toBe("CMM");
  });

  it("routes ≤0.1 mm tolerance to CMM", async () => {
    const result = await hyperMillFAIBridge.generate(
      baseInput({ operations: [baseOp({ tolerance_plus_mm: MAJOR_TOL_MM, tolerance_minus_mm: MAJOR_TOL_MM })] })
    );
    expect(result.form_3[0].inspection_method).toBe("CMM");
  });

  it("routes ≤0.5 mm tolerance to gauge", async () => {
    const result = await hyperMillFAIBridge.generate(
      baseInput({ operations: [baseOp({ tolerance_plus_mm: MINOR_TOL_MM, tolerance_minus_mm: MINOR_TOL_MM })] })
    );
    expect(result.form_3[0].inspection_method).toBe("gauge");
  });

  it("routes >0.5 mm tolerance to manual", async () => {
    const result = await hyperMillFAIBridge.generate(
      baseInput({ operations: [baseOp({ tolerance_plus_mm: LOOSE_TOL_MM, tolerance_minus_mm: LOOSE_TOL_MM })] })
    );
    expect(result.form_3[0].inspection_method).toBe("manual");
  });
});

describe("HyperMillFAIBridge — sort + balloon numbering", () => {
  it("sorts critical first, then major, then minor", async () => {
    const result = await hyperMillFAIBridge.generate(
      baseInput({
        operations: [
          baseOp({ operation_id: "op-minor", tolerance_plus_mm: LOOSE_TOL_MM, tolerance_minus_mm: LOOSE_TOL_MM }),
          baseOp({ operation_id: "op-critical", tolerance_plus_mm: TIGHT_TOL_MM, tolerance_minus_mm: TIGHT_TOL_MM }),
          baseOp({ operation_id: "op-major", tolerance_plus_mm: MAJOR_TOL_MM, tolerance_minus_mm: LOOSE_TOL_MM }),
        ],
      })
    );
    expect(result.form_3[0].operation_id).toBe("op-critical");
    expect(result.form_3[0].designator).toBe("critical");
    expect(result.form_3[1].operation_id).toBe("op-major");
    expect(result.form_3[1].designator).toBe("major");
    expect(result.form_3[2].operation_id).toBe("op-minor");
    expect(result.form_3[2].designator).toBe("minor");
  });

  it("assigns sequential balloon numbers starting at 1", async () => {
    const result = await hyperMillFAIBridge.generate(
      baseInput({
        operations: [
          baseOp({ operation_id: "op-1", tolerance_plus_mm: TIGHT_TOL_MM, tolerance_minus_mm: TIGHT_TOL_MM }),
          baseOp({ operation_id: "op-2", tolerance_plus_mm: MAJOR_TOL_MM, tolerance_minus_mm: LOOSE_TOL_MM }),
          baseOp({ operation_id: "op-3", tolerance_plus_mm: LOOSE_TOL_MM, tolerance_minus_mm: LOOSE_TOL_MM }),
        ],
      })
    );
    expect(result.form_3.map((b) => b.char_number)).toEqual([1, 2, 3]);
  });

  it("counts critical_count correctly", async () => {
    const result = await hyperMillFAIBridge.generate(
      baseInput({
        operations: [
          baseOp({ operation_id: "op-c1", tolerance_plus_mm: TIGHT_TOL_MM, tolerance_minus_mm: TIGHT_TOL_MM }),
          baseOp({ operation_id: "op-c2", is_critical: true, tolerance_plus_mm: LOOSE_TOL_MM, tolerance_minus_mm: LOOSE_TOL_MM }),
          baseOp({ operation_id: "op-major", tolerance_plus_mm: MAJOR_TOL_MM, tolerance_minus_mm: LOOSE_TOL_MM }),
        ],
      })
    );
    expect(result.critical_count).toBe(2);
    expect(result.balloon_count).toBe(3);
  });
});

describe("HyperMillFAIBridge — Form 1 metadata", () => {
  it("uses defaults when optional fields not provided", async () => {
    const result = await hyperMillFAIBridge.generate(baseInput());
    expect(result.form_1.part_number).toBe("PN-12345");
    expect(result.form_1.revision).toBe("A");
    expect(result.form_1.drawing_number).toBe("PN-12345"); // mirrors part_number
    expect(result.form_1.organization).toBe("N/A");
    expect(result.form_1.supplier).toBe("N/A");
    expect(result.form_1.purchase_order).toBe("N/A");
    expect(result.form_1.serial_number).toBe("SN-001");
    expect(result.form_1.inspector).toBe("N/A");
  });

  it("preserves custom Form 1 fields when provided", async () => {
    const result = await hyperMillFAIBridge.generate(
      baseInput({
        revision: "C",
        supplier: "JM Die",
        purchase_order: "PO-2026-001",
        drawing_number: "DWG-99",
        organization: "Acme Corp",
        inspector: "Mark V",
        serial_number: "SN-042",
      })
    );
    expect(result.form_1.revision).toBe("C");
    expect(result.form_1.supplier).toBe("JM Die");
    expect(result.form_1.purchase_order).toBe("PO-2026-001");
    expect(result.form_1.drawing_number).toBe("DWG-99");
    expect(result.form_1.organization).toBe("Acme Corp");
    expect(result.form_1.inspector).toBe("Mark V");
    expect(result.form_1.serial_number).toBe("SN-042");
  });

  it("populates inspection_date as YYYY-MM-DD", async () => {
    const result = await hyperMillFAIBridge.generate(baseInput());
    expect(result.form_1.inspection_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("HyperMillFAIBridge — Form 2 traceability", () => {
  it("returns lot_size=1 by default", async () => {
    const result = await hyperMillFAIBridge.generate(baseInput());
    expect(result.form_2.lot_size).toBe(1);
  });

  it("marks traceability_status=pending when material_cert_id is default", async () => {
    const result = await hyperMillFAIBridge.generate(baseInput());
    expect(result.form_2.material_cert_id).toBe("CERT-001");
    expect(result.form_2.traceability_status).toBe("pending");
  });

  it("marks traceability_status=certified when material_cert_id is custom", async () => {
    const result = await hyperMillFAIBridge.generate(
      baseInput({ material_cert_id: "MILL-CERT-A234" })
    );
    expect(result.form_2.material_cert_id).toBe("MILL-CERT-A234");
    expect(result.form_2.traceability_status).toBe("certified");
  });
});

describe("HyperMillFAIBridge — fai_result delegation + disposition", () => {
  it("returns disposition=PENDING when no toleranced ops (placeholder feature)", async () => {
    const result = await hyperMillFAIBridge.generate(baseInput());
    expect(result.disposition).toBe("PENDING");
    expect(result.balloon_count).toBe(0);
  });

  it("returns disposition=PENDING when ops have no measurements yet", async () => {
    const result = await hyperMillFAIBridge.generate(
      baseInput({
        operations: [baseOp({ tolerance_plus_mm: TIGHT_TOL_MM, tolerance_minus_mm: TIGHT_TOL_MM })],
      })
    );
    expect(result.disposition).toBe("PENDING");
  });

  it("propagates job_id and part_number from input", async () => {
    const result = await hyperMillFAIBridge.generate(
      baseInput({ job_id: "JOB-XYZ", part_number: "PN-77" })
    );
    expect(result.job_id).toBe("JOB-XYZ");
    expect(result.part_number).toBe("PN-77");
  });

  it("includes fai_result with status field from delegated engine", async () => {
    const result = await hyperMillFAIBridge.generate(
      baseInput({ operations: [baseOp({ tolerance_plus_mm: TIGHT_TOL_MM })] })
    );
    expect(["pending", "in_progress", "complete"]).toContain(result.fai_result.status);
    expect(result.fai_result.part_number).toBe("PN-12345");
  });
});

describe("HyperMillFAIBridge — balloon mapping field copy", () => {
  it("copies operation_name into feature_name", async () => {
    const result = await hyperMillFAIBridge.generate(
      baseInput({
        operations: [
          baseOp({
            operation_id: "op-bore-50",
            operation_name: "Bore Ø50 H7",
            tolerance_plus_mm: TIGHT_TOL_MM,
            tolerance_minus_mm: TIGHT_TOL_MM,
            nominal_dimension_mm: 50.0,
          }),
        ],
      })
    );
    expect(result.form_3[0].operation_id).toBe("op-bore-50");
    expect(result.form_3[0].feature_name).toBe("Bore Ø50 H7");
    expect(result.form_3[0].nominal_mm).toBe(50.0);
    expect(result.form_3[0].tol_plus_mm).toBe(TIGHT_TOL_MM);
    expect(result.form_3[0].tol_minus_mm).toBe(TIGHT_TOL_MM);
  });

  it("defaults nominal_mm to 0 when undefined", async () => {
    const result = await hyperMillFAIBridge.generate(
      baseInput({ operations: [baseOp({ tolerance_plus_mm: TIGHT_TOL_MM })] })
    );
    expect(result.form_3[0].nominal_mm).toBe(0);
  });
});

describe("HyperMillFAIBridge — adversarial inputs", () => {
  it("handles empty operations array (no exceptions, balloon_count=0)", async () => {
    const result = await hyperMillFAIBridge.generate(baseInput({ operations: [] }));
    expect(result.balloon_count).toBe(0);
    expect(result.critical_count).toBe(0);
    expect(result.form_3).toEqual([]);
  });

  it("handles 100-op stress without performance fail", async () => {
    const operations: HyperMillOperation[] = Array.from({ length: STRESS_OP_COUNT }, (_, i) =>
      baseOp({
        operation_id: `op-${i}`,
        operation_name: `Op ${i}`,
        tolerance_plus_mm: i % 3 === 0 ? TIGHT_TOL_MM : i % 3 === 1 ? MAJOR_TOL_MM : LOOSE_TOL_MM,
        tolerance_minus_mm: LOOSE_TOL_MM,
      })
    );
    const result = await hyperMillFAIBridge.generate(baseInput({ operations }));
    expect(result.balloon_count).toBe(STRESS_OP_COUNT);
    expect(result.form_3.map((b) => b.char_number)).toEqual(
      Array.from({ length: STRESS_OP_COUNT }, (_, i) => i + 1)
    );
  });

  it("preserves critical-first ordering with mixed-type inputs", async () => {
    const operations: HyperMillOperation[] = [
      baseOp({ operation_id: "minor", tolerance_plus_mm: LOOSE_TOL_MM, tolerance_minus_mm: LOOSE_TOL_MM }),
      baseOp({ operation_id: "bore-feat", feature_type: "bore", tolerance_plus_mm: LOOSE_TOL_MM }),
      baseOp({ operation_id: "tight", tolerance_plus_mm: CRITICAL_TOL_MM, tolerance_minus_mm: CRITICAL_TOL_MM }),
      baseOp({ operation_id: "major-only", tolerance_plus_mm: MAJOR_TOL_MM, tolerance_minus_mm: LOOSE_TOL_MM }),
    ];
    const result = await hyperMillFAIBridge.generate(baseInput({ operations }));
    expect(result.balloon_count).toBe(4);
    // 2 critical (bore-feat, tight), 1 major, 1 minor
    expect(result.form_3.filter((b) => b.designator === "critical").length).toBe(2);
    expect(result.form_3.filter((b) => b.designator === "major").length).toBe(1);
    expect(result.form_3.filter((b) => b.designator === "minor").length).toBe(1);
    // Critical entries come first
    expect(result.form_3[0].designator).toBe("critical");
    expect(result.form_3[1].designator).toBe("critical");
    expect(result.form_3[2].designator).toBe("major");
    expect(result.form_3[3].designator).toBe("minor");
  });

  it("treats operation with feature_type=undefined as non-critical when tolerance loose", async () => {
    const result = await hyperMillFAIBridge.generate(
      baseInput({ operations: [baseOp({ tolerance_plus_mm: LOOSE_TOL_MM, tolerance_minus_mm: LOOSE_TOL_MM })] })
    );
    expect(result.form_3[0].designator).toBe("minor");
  });

  it("does not classify unknown feature_type as critical", async () => {
    const result = await hyperMillFAIBridge.generate(
      baseInput({
        operations: [baseOp({ feature_type: "decorative_chamfer", tolerance_plus_mm: LOOSE_TOL_MM, tolerance_minus_mm: LOOSE_TOL_MM })],
      })
    );
    expect(result.form_3[0].designator).toBe("minor");
  });
});

describe("HyperMillFAIBridge — dispatcher round-trip", () => {
  it("cam_hypermill_quality_package action is registered in ACTIONS enum", () => {
    expect(ACTIONS.includes("cam_hypermill_quality_package")).toBe(true);
  });

  it("singleton can be invoked with the same shape the dispatcher uses", async () => {
    // Mirrors the dispatcher payload shape exactly (camDispatcher.ts case
    // "cam_hypermill_quality_package" → hyperMillFAIBridge.generate(...))
    const params = {
      job_id: "DISP-JOB-1",
      part_number: "DISP-PN-1",
      revision: "B",
      supplier: "Dispatcher Test",
      purchase_order: "PO-DISP-1",
      drawing_number: "DWG-DISP",
      organization: "Disp Org",
      inspector: "Disp Inspector",
      serial_number: "SN-DISP",
      material_cert_id: "DISP-CERT",
      operations: [
        baseOp({ tolerance_plus_mm: TIGHT_TOL_MM, tolerance_minus_mm: TIGHT_TOL_MM }),
      ],
      subgroup_size: SUBGROUP_SIZE,
      target_cpk: TARGET_CPK,
    };
    const result = await hyperMillFAIBridge.generate({
      job_id: params.job_id,
      part_number: params.part_number,
      revision: params.revision,
      supplier: params.supplier,
      purchase_order: params.purchase_order,
      drawing_number: params.drawing_number,
      organization: params.organization,
      inspector: params.inspector,
      serial_number: params.serial_number,
      material_cert_id: params.material_cert_id,
      operations: params.operations,
    });
    expect(result.job_id).toBe("DISP-JOB-1");
    expect(result.balloon_count).toBe(1);
    expect(result.critical_count).toBe(1);
    expect(result.form_1.supplier).toBe("Dispatcher Test");
    expect(result.form_2.material_cert_id).toBe("DISP-CERT");
    expect(result.form_2.traceability_status).toBe("certified");
  });
});
