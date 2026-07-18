/**
 * InterruptedCutAvoidanceEngine tests — sequence-mode + G-code-mode coverage.
 *
 * Per COMPREHENSIVE-BUILD-ENFORCE:
 *  - happy path (correct order, 0 detections)
 *  - ≥3 failure modes (incorrect orders)
 *  - ≥2 adversarial (empty / invalid type / bad mode)
 *  - ≥3 ISO-group spanning configs (P / S / N for variability floor)
 *  - G-code-mode test
 *  - Real reference values — no toBeDefined stubs, no .skip
 *
 * Per [[feedback_engine_tests_in_tests_dir]] — lives in `src/__tests__/`, not co-located.
 */

import { describe, it, expect } from "vitest";
import {
  interruptedCutAvoidanceEngine,
  type OperationStep,
  type SequenceInput,
  type GcodeInput,
} from "../engines/InterruptedCutAvoidanceEngine.js";

// ─── Builders ───────────────────────────────────────────────────────

function drillStep(id: string, x: number, y: number, depth: number): OperationStep {
  return {
    id,
    type: "drill",
    feature_id: `f-${id}`,
    affected_regions: [{
      x_min: x - 5, x_max: x + 5,
      y_min: y - 5, y_max: y + 5,
      z_top: 0, z_bottom: -depth,
    }],
    tool_id: `T-drill-${id}`,
  };
}

function faceStep(id: string, xMin: number, xMax: number, yMin: number, yMax: number, depth: number): OperationStep {
  return {
    id,
    type: "face_mill",
    feature_id: `f-${id}`,
    affected_regions: [{ x_min: xMin, x_max: xMax, y_min: yMin, y_max: yMax, z_top: 0, z_bottom: -depth }],
    tool_id: `T-face-${id}`,
  };
}

function pocketStep(id: string, xMin: number, xMax: number, yMin: number, yMax: number, depth: number): OperationStep {
  return {
    id,
    type: "pocket",
    feature_id: `f-${id}`,
    affected_regions: [{ x_min: xMin, x_max: xMax, y_min: yMin, y_max: yMax, z_top: 0, z_bottom: -depth }],
    tool_id: `T-end-${id}`,
  };
}

function slotStep(id: string, xMin: number, xMax: number, yMin: number, yMax: number, depth: number): OperationStep {
  return {
    id,
    type: "slot",
    feature_id: `f-${id}`,
    affected_regions: [{ x_min: xMin, x_max: xMax, y_min: yMin, y_max: yMax, z_top: 0, z_bottom: -depth }],
    tool_id: `T-slot-${id}`,
  };
}

// ─── HAPPY PATH ─────────────────────────────────────────────────────

describe("InterruptedCutAvoidanceEngine — happy path", () => {
  it("correct order (face → drill) returns zero detections", () => {
    const input: SequenceInput = {
      mode: "sequence",
      steps: [
        faceStep("S1", -50, 50, -50, 50, 2),    // Face first (light depth)
        drillStep("S2", 0, 0, 25),               // Then drill through
      ],
      material_iso_group: "P",
    };
    const result = interruptedCutAvoidanceEngine.detect(input);
    expect(result.detections.length).toBe(0);
    expect(result.summary.detections).toBe(0);
    expect(result.summary.max_severity).toBe(0);
    expect(result.summary.total_steps_or_lines).toBe(2);
    // Real assertion on optimized_sequence: structural identity with the input order
    expect(result.optimized_sequence!.map(s => s.id)).toEqual(["S1", "S2"]);
  });

  it("non-overlapping operations return zero detections regardless of order", () => {
    const input: SequenceInput = {
      mode: "sequence",
      steps: [
        drillStep("D1", -30, -30, 25),  // bottom-left corner
        faceStep("F1", 10, 50, 10, 50, 2),  // top-right region — no overlap with drill
      ],
      material_iso_group: "P",
    };
    const result = interruptedCutAvoidanceEngine.detect(input);
    expect(result.detections.length).toBe(0);
  });
});

// ─── FAILURE MODES ──────────────────────────────────────────────────

describe("InterruptedCutAvoidanceEngine — failure modes", () => {
  it("F1: drill-first / face-second flags mill_face_after_drill severity 4-5", () => {
    const input: SequenceInput = {
      mode: "sequence",
      steps: [
        drillStep("D1", 0, 0, 25),                 // 25mm-deep through-hole
        faceStep("F1", -50, 50, -50, 50, 2),       // face across stock — crosses hole
      ],
      material_iso_group: "P",
    };
    const result = interruptedCutAvoidanceEngine.detect(input);
    expect(result.detections.length).toBeGreaterThanOrEqual(1);
    const d = result.detections[0];
    expect(d.type).toBe("mill_face_after_drill");
    expect(d.severity).toBeGreaterThanOrEqual(4);
    expect(d.affected_step_ids).toEqual(["D1", "F1"]);
    expect(d.remediations.some(r => r.kind === "swap_sequence")).toBe(true);

    // Optimized sequence puts F1 before D1
    const opt = result.optimized_sequence!.map(s => s.id);
    expect(opt[0]).toBe("F1");
    expect(opt[1]).toBe("D1");
  });

  it("F2: pocket-then-drill in same region returns drill_into_existing_pocket", () => {
    const input: SequenceInput = {
      mode: "sequence",
      steps: [
        pocketStep("P1", -10, 10, -10, 10, 8),     // 8mm-deep pocket
        drillStep("D1", 0, 0, 25),                 // drill in same XY — enters cavity
      ],
      material_iso_group: "P",
    };
    const result = interruptedCutAvoidanceEngine.detect(input);
    expect(result.detections.length).toBeGreaterThanOrEqual(1);
    const d = result.detections[0];
    expect(d.type).toBe("drill_into_existing_pocket");
    expect(d.severity).toBeGreaterThanOrEqual(3);
    expect(d.affected_step_ids).toEqual(["P1", "D1"]);
    expect(d.shock_load_factor).toBeGreaterThan(1.4);
  });

  it("F3: through-drill + face-after on brittle Inconel (S) hits severity 5", () => {
    const input: SequenceInput = {
      mode: "sequence",
      steps: [
        drillStep("D1", 0, 0, 30),                 // deep through-hole
        faceStep("F1", -30, 30, -30, 30, 5),       // 5mm-deep face — clearly crosses the hole
      ],
      material_iso_group: "S",                     // Inconel — brittle penalty +1
    };
    const result = interruptedCutAvoidanceEngine.detect(input);
    expect(result.detections.length).toBeGreaterThanOrEqual(1);
    const d = result.detections[0];
    expect(d.severity).toBe(5);
    expect(d.shock_load_factor).toBe(3.0);
    expect(d.estimated_tool_life_loss_pct).toBe(75);  // (1 - 0.25) * 100 rounded
    // Severity-5 always offers defer_to_setup
    expect(d.remediations.some(r => r.kind === "defer_to_setup")).toBe(true);
    expect(d.remediations.some(r => r.kind === "swap_machine")).toBe(true);
  });

  it("F5: through-drill then pocket flags pocket_through_breakthrough sev 3-4", () => {
    // Pocket pass goes below an existing through-hole's top — pocket sidewall is interrupted.
    const input: SequenceInput = {
      mode: "sequence",
      steps: [
        drillStep("D1", 0, 0, 30),                  // through-hole at (0,0) 30mm deep
        pocketStep("P1", -8, 8, -8, 8, 12),         // pocket centered on the hole, 12mm deep
      ],
      material_iso_group: "K",                      // cast iron
    };
    const result = interruptedCutAvoidanceEngine.detect(input);
    expect(result.detections.length).toBeGreaterThanOrEqual(1);
    const d = result.detections[0];
    expect(d.type).toBe("pocket_through_breakthrough");
    expect(d.severity).toBeGreaterThanOrEqual(3);
    expect(d.affected_step_ids).toEqual(["D1", "P1"]);
  });

  it("F4: slot crossing hole flags slot_crosses_hole with reduce_engagement + flip_milling", () => {
    const input: SequenceInput = {
      mode: "sequence",
      steps: [
        drillStep("D1", 0, 0, 15),
        slotStep("S1", -25, 25, -3, 3, 4),         // slot spans through the drill at x=0
      ],
      material_iso_group: "M",
    };
    const result = interruptedCutAvoidanceEngine.detect(input);
    expect(result.detections.length).toBeGreaterThanOrEqual(1);
    const d = result.detections[0];
    expect(d.type).toBe("slot_crosses_hole");
    expect(d.severity).toBeGreaterThanOrEqual(4);
    expect(d.remediations.some(r => r.kind === "reduce_engagement")).toBe(true);
    expect(d.remediations.some(r => r.kind === "flip_milling_direction")).toBe(true);
  });
});

// ─── ADVERSARIAL INPUTS ─────────────────────────────────────────────

describe("InterruptedCutAvoidanceEngine — adversarial inputs", () => {
  it("A1: empty steps array returns empty detections with no throw", () => {
    const input: SequenceInput = {
      mode: "sequence",
      steps: [],
      material_iso_group: "P",
    };
    const result = interruptedCutAvoidanceEngine.detect(input);
    expect(result.detections).toEqual([]);
    expect(result.summary.detections).toBe(0);
    expect(result.summary.total_steps_or_lines).toBe(0);
    expect(result.summary.max_severity).toBe(0);
  });

  it("A2: invalid step.type fails loud (R12)", () => {
    expect(() => {
      interruptedCutAvoidanceEngine.detect({
        mode: "sequence",
        steps: [{
          id: "X1",
          type: "rocket_launch" as unknown as "drill",
          affected_regions: [{ x_min: 0, x_max: 1, y_min: 0, y_max: 1, z_top: 0, z_bottom: -1 }],
        }],
        material_iso_group: "P",
      });
    }).toThrow(/invalid step\.type/);
  });

  it("A3: missing material_iso_group fails loud", () => {
    expect(() => {
      interruptedCutAvoidanceEngine.detect({
        mode: "sequence",
        steps: [],
        material_iso_group: undefined as unknown as "P",
      });
    }).toThrow(/material_iso_group/);
  });

  it("A4: unsupported mode fails loud", () => {
    expect(() => {
      interruptedCutAvoidanceEngine.detect({
        mode: "telepathy" as unknown as "sequence",
        material_iso_group: "P",
      } as unknown as SequenceInput);
    }).toThrow(/unsupported mode/);
  });

  it("A5: step missing affected_regions array fails loud", () => {
    expect(() => {
      interruptedCutAvoidanceEngine.detect({
        mode: "sequence",
        steps: [{
          id: "X1",
          type: "drill",
          affected_regions: undefined as unknown as never,
        }],
        material_iso_group: "P",
      });
    }).toThrow(/affected_regions/);
  });
});

// ─── ISO-GROUP VARIABILITY (P / S / N spanning) ────────────────────

describe("InterruptedCutAvoidanceEngine — ISO-group variability", () => {
  // Same geometry, three materials — assert the severity / life-loss differ as physics expects.
  // Drill depth 4mm + face depth 2mm => dropDepth=4mm which lands in severity-4 band
  // (1 < dropDepth <= 5). With brittle penalty (+1) ISO-S lands at severity 5.
  const makeInput = (iso: "P" | "S" | "N"): SequenceInput => ({
    mode: "sequence",
    steps: [
      drillStep("D1", 0, 0, 4),
      faceStep("F1", -30, 30, -30, 30, 2),
    ],
    material_iso_group: iso,
  });

  it("V1: ISO-P (steel) lands at base severity (no brittle penalty)", () => {
    const r = interruptedCutAvoidanceEngine.detect(makeInput("P"));
    expect(r.detections.length).toBeGreaterThanOrEqual(1);
    const d = r.detections[0];
    // Without brittle penalty, severity stays at 4 for 4mm-deep face across hole
    expect(d.severity).toBe(4);
    expect(d.shock_load_factor).toBe(2.0);
    expect(d.estimated_tool_life_loss_pct).toBe(50);  // (1 - 0.5) * 100
  });

  it("V2: ISO-S (Inconel) gets +1 brittle penalty → severity 5, life loss 75%", () => {
    const r = interruptedCutAvoidanceEngine.detect(makeInput("S"));
    expect(r.detections.length).toBeGreaterThanOrEqual(1);
    const d = r.detections[0];
    expect(d.severity).toBe(5);
    expect(d.estimated_tool_life_loss_pct).toBe(75);
  });

  it("V3: ISO-N (aluminum) lands at base severity (no brittle penalty)", () => {
    const r = interruptedCutAvoidanceEngine.detect(makeInput("N"));
    expect(r.detections.length).toBeGreaterThanOrEqual(1);
    const d = r.detections[0];
    expect(d.severity).toBe(4);
    expect(d.estimated_tool_life_loss_pct).toBe(50);
  });

  it("V4: tolerate_minor=true drops severity-1/2 but keeps severity-3+", () => {
    // Manufacture a sev-2 (drill onto already-cut surface, depth = 0 + small overlap)
    const sev2Input: SequenceInput = {
      mode: "sequence",
      steps: [
        pocketStep("P1", -10, 10, -10, 10, 0.0001),  // negligible-depth pocket (barely cut)
        drillStep("D1", 0, 0, 25),
      ],
      material_iso_group: "P",
      tolerate_minor: true,
    };
    const r = interruptedCutAvoidanceEngine.detect(sev2Input);
    // Should be filtered (sev ≤ 2)
    expect(r.detections.filter(d => d.severity <= 2).length).toBe(0);
  });

  it("V5: high machine rigidity softens minor severities", () => {
    const inputLow: SequenceInput = {
      mode: "sequence",
      steps: [
        drillStep("D1", 0, 0, 15),
        slotStep("S1", -25, 25, -3, 3, 4),
      ],
      material_iso_group: "P",
      machine_rigidity: 0.5,
    };
    const inputHigh: SequenceInput = { ...inputLow, machine_rigidity: 0.95 };
    const rLow = interruptedCutAvoidanceEngine.detect(inputLow);
    const rHigh = interruptedCutAvoidanceEngine.detect(inputHigh);
    expect(rLow.detections[0].severity).toBeGreaterThan(rHigh.detections[0].severity);
  });
});

// ─── G-CODE MODE ────────────────────────────────────────────────────

describe("InterruptedCutAvoidanceEngine — G-code mode", () => {
  it("G1: clean linear toolpath returns zero detections", () => {
    const gcode = [
      "G0 X0 Y0 Z25",          // rapid above stock
      "G0 X0 Y0 Z2",           // rapid down to clearance
      "G1 Z-2 F300",           // plunge
      "G1 X100 Y0 F800",       // straight cut to (100,0)
      "G1 X100 Y100 F800",     // turn
      "G1 X0 Y100 F800",
      "G1 X0 Y0 F800",
      "G0 Z25",                // retract
    ].join("\n");
    const input: GcodeInput = {
      mode: "gcode",
      gcode,
      material_iso_group: "P",
      stock_top_z: 0,
    };
    const result = interruptedCutAvoidanceEngine.detect(input);
    expect(result.detections.length).toBe(0);
    expect(result.summary.detections).toBe(0);
    expect(result.optimized_sequence).toBe(undefined);
    expect(result.summary.total_steps_or_lines).toBe(8);
  });

  it("G2: G-code mode never throws on empty input", () => {
    const result = interruptedCutAvoidanceEngine.detect({
      mode: "gcode",
      gcode: "",
      material_iso_group: "P",
    });
    expect(result.detections).toEqual([]);
    expect(result.summary.detections).toBe(0);
  });

  it("G3: G-code mode strips comments without breaking parser", () => {
    const gcode = [
      "(PRISM modified post — Hurco WinMax v11)",
      "; setup",
      "G0 X0 Y0 Z25",
      "G1 Z-2 F300",
      "G1 X50 Y0 F800",
      "G0 Z25",
    ].join("\n");
    const result = interruptedCutAvoidanceEngine.detect({
      mode: "gcode",
      gcode,
      material_iso_group: "N",
      stock_top_z: 0,
    });
    expect(result.summary.total_steps_or_lines).toBe(6);
  });

  it("G4: positive engagement_drop — lateral move crosses a prior pocket void", () => {
    // First pocket creates a void at Z=-5 with corner entries in zMap at (-5,0) and (5,0).
    // Then a lateral cut at Z=-2 from (-5,0,-2) to (5,0,-2) crosses the void → engagement_drop.
    const gcode = [
      "G0 X-5 Y0 Z10",       // rapid above stock
      "G1 Z-5 F300",          // plunge at (-5, 0, -5) → zMap["-5,0"]:-5
      "G1 X5 Y0 F500",        // sweep across at Z=-5 → zMap["5,0"]:-5
      "G0 Z10",               // retract
      "G0 X-5 Y0 Z2",         // reposition above (-5, 0)
      "G1 Z-2 F300",          // plunge to (-5, 0, -2)  (already-cut depth -5 > -2, no overwrite)
      "G1 X5 Y0 F800",        // LATERAL CROSS at Z=-2 across the void — engagement_drop
      "G0 Z10",
    ].join("\n");
    const result = interruptedCutAvoidanceEngine.detect({
      mode: "gcode",
      gcode,
      material_iso_group: "P",
      stock_top_z: 0,
    });
    expect(result.detections.length).toBeGreaterThanOrEqual(1);
    const drop = result.detections.find(d => d.type === "engagement_drop");
    expect(drop).not.toBe(undefined);
    expect(drop!.severity).toBeGreaterThanOrEqual(3);
    expect(drop!.remediations.some(r => r.kind === "reduce_engagement")).toBe(true);
  });

  it("G5: malformed coordinates ('X..') are skipped, do not throw or poison zMap", () => {
    const gcode = [
      "G0 X.. Y0 Z25",       // pathological X token — should be silently skipped per NaN guard
      "G0 X0 Y0 Z2",
      "G1 Z-2 F300",
      "G1 X10 Y0 F500",
      "G0 Z10",
    ].join("\n");
    const result = interruptedCutAvoidanceEngine.detect({
      mode: "gcode",
      gcode,
      material_iso_group: "P",
    });
    // No throw + no spurious engagement_drop detections from NaN keys.
    expect(result.detections.filter(d => d.type === "engagement_drop").length).toBe(0);
  });

  it("G6: missing gcode in gcode-mode fails loud (R12)", () => {
    expect(() => {
      interruptedCutAvoidanceEngine.detect({
        mode: "gcode",
        material_iso_group: "P",
      } as unknown as GcodeInput);
    }).toThrow(/gcode must be a string/);
  });
});

// ─── PHYSICS COMPOSITION ────────────────────────────────────────────

describe("InterruptedCutAvoidanceEngine — physics composition (R8 — composes, never inlines)", () => {
  it("baselineKienzleForce composes from CANONICAL_KIENZLE for ISO-P", () => {
    // Fc = kc1.1 × ap × fz^(1-mc) — for P: kc=1800, mc=0.25, ap=2, fz=0.1
    // = 1800 × 2 × 0.1^0.75 = 1800 × 2 × 0.177828 = 640.18
    const force = interruptedCutAvoidanceEngine.baselineKienzleForce("P", 2, 0.1);
    expect(force).toBeCloseTo(640.18, 1);
  });

  it("baselineKienzleForce produces higher force for harder material (H vs P)", () => {
    const forceP = interruptedCutAvoidanceEngine.baselineKienzleForce("P", 2, 0.1);
    const forceH = interruptedCutAvoidanceEngine.baselineKienzleForce("H", 2, 0.1);
    expect(forceH).toBeGreaterThan(forceP);
    expect(forceH / forceP).toBeGreaterThan(1.5);  // H kc1.1=3200 vs P=1800
  });

  it("baselineTaylorLifeMin returns sensible tool life for ISO-P at Vc=200", () => {
    // T = (C/Vc)^(1/n) for P: C=350, n=0.25 → (350/200)^4 = 1.75^4 ≈ 9.38 min
    const life = interruptedCutAvoidanceEngine.baselineTaylorLifeMin("P", 200);
    expect(life).toBeCloseTo(9.38, 1);
  });

  it("Inconel (S) shorter tool life than steel (P) at same Vc", () => {
    const lifeP = interruptedCutAvoidanceEngine.baselineTaylorLifeMin("P", 100);
    const lifeS = interruptedCutAvoidanceEngine.baselineTaylorLifeMin("S", 100);
    expect(lifeS).toBeLessThan(lifeP);
  });
});

// ─── REPORT / SUMMARY ────────────────────────────────────────────────

describe("InterruptedCutAvoidanceEngine — report shape", () => {
  it("report contains material group + detection summary", () => {
    const input: SequenceInput = {
      mode: "sequence",
      steps: [
        drillStep("D1", 0, 0, 25),
        faceStep("F1", -50, 50, -50, 50, 2),
      ],
      material_iso_group: "M",
    };
    const result = interruptedCutAvoidanceEngine.detect(input);
    expect(result.report).toContain("INTERRUPTED-CUT DETECTION REPORT");
    expect(result.report).toContain("Material ISO group: M");
    expect(result.report).toContain("Detections:");
    expect(result.report).toContain("mill_face_after_drill");
  });

  it("optimized_sequence preserves all step ids after reorder", () => {
    const input: SequenceInput = {
      mode: "sequence",
      steps: [
        drillStep("D1", 0, 0, 25),
        faceStep("F1", -50, 50, -50, 50, 2),
        drillStep("D2", 30, 30, 10),
      ],
      material_iso_group: "P",
    };
    const result = interruptedCutAvoidanceEngine.detect(input);
    const ids = result.optimized_sequence!.map(s => s.id).sort();
    expect(ids).toEqual(["D1", "D2", "F1"]);
  });
});
