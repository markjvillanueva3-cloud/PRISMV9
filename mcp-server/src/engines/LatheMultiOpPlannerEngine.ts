/**
 * LATHE-PRO-MS3, U-LPS03
 * LatheMultiOpPlannerEngine — Op1/Op2 Flip Planning
 *
 * Detects which features require two-sided access and generates:
 * - Op1 program plan (from bar or blank)
 * - Op2 program plan (flip in soft jaws gripping finished OD)
 * - Soft jaw boring program (G71/G70 bore cycle with clearances)
 * - Z-reference transfer between Op1 and Op2
 * - Concentricity preservation strategy (bore soft jaws to finished OD)
 *
 * Key principles:
 * - Op1 machines the "chuck end" features — the side gripped in raw stock
 * - Op2 machines the "tailstock end" features — requires flip
 * - Soft jaws are bored to Op1 finished OD for concentricity
 * - Z datum transfers via face reference or shoulder
 * - Leave extra stock on Op1 part-off face for Op2 facing
 *
 * Reference: Peter Smid "CNC Programming Handbook" Ch. 2 — Multi-operation turning
 * Reference: Machinery's Handbook, 31st Ed. — Workholding
 */

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

export type FeatureAccess = "op1_only" | "op2_only" | "either" | "both_ops";

export interface MultiOpFeature {
  id: string;
  type: string;
  /** Which end of the part is this feature on? */
  position: "chuck_end" | "tailstock_end" | "middle" | "through";
  /** Nominal diameter in mm */
  diameter_mm?: number;
  /** Length in mm */
  length_mm?: number;
  /** Tolerance in mm */
  tolerance_mm?: number;
  /** Is this a bore feature? */
  is_bore?: boolean;
  /** Is this a through feature (accessible from either end)? */
  is_through?: boolean;
  /** Does this feature require facing? */
  requires_facing?: boolean;
  /** Does this feature have threads? */
  has_threads?: boolean;
}

export interface MultiOpInput {
  /** Part overall length in mm */
  part_length_mm: number;
  /** Part max OD in mm */
  max_od_mm: number;
  /** Features to machine */
  features: MultiOpFeature[];
  /** Stock bar diameter in mm */
  stock_od_mm?: number;
  /** Tightest concentricity requirement in mm */
  concentricity_mm?: number;
  /** Material ISO group */
  iso_group?: string;
  /** Controller for G-code generation */
  controller?: "fanuc" | "okuma" | "haas" | "mazak" | "siemens";
}

export interface OpPlan {
  op_number: 1 | 2;
  description: string;
  features: string[];
  operations: string[];
  workholding: string;
  z_datum: string;
  notes: string[];
}

export interface SoftJawBoringProgram {
  bore_diameter_mm: number;
  bore_depth_mm: number;
  bore_tolerance_mm: number;
  gcode: string;
  notes: string[];
}

export interface ZTransfer {
  method: "face_reference" | "shoulder_reference" | "groove_reference" | "measured_length";
  op1_z_datum: string;
  op2_z_datum: string;
  op2_face_stock_mm: number;
  notes: string[];
}

export interface ConcentricityStrategy {
  method: "soft_jaw_bore_to_od" | "expanding_mandrel" | "between_centers" | "indicator_alignment";
  target_tir_mm: number;
  jaw_bore_diameter_mm?: number;
  steps: string[];
}

export interface MultiOpResult {
  needs_flip: boolean;
  reasoning: string[];
  op1: OpPlan;
  op2: OpPlan | null;
  soft_jaw_boring: SoftJawBoringProgram | null;
  z_transfer: ZTransfer | null;
  concentricity: ConcentricityStrategy | null;
  total_operations: number;
  estimated_setup_changes: number;
}

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

/** Extra stock left on part-off face for Op2 facing (mm) */
const OP2_FACE_STOCK_MM = 0.5;

/** Soft jaw bore clearance over finished OD (mm) */
const SOFT_JAW_BORE_CLEARANCE_MM = 0.05;

/** Minimum jaw grip depth (mm) */
const MIN_JAW_GRIP_MM = 8;

/** Default soft jaw bore depth (mm) */
const DEFAULT_JAW_DEPTH_MM = 15;

// ═══════════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════════

class LatheMultiOpPlannerEngine {
  /**
   * Plan Op1/Op2 split for a turned part.
   *
   * @param input Part geometry, features, and constraints
   * @returns Multi-op plan with soft jaw boring program
   */
  plan(input: MultiOpInput): MultiOpResult {
    const reasoning: string[] = [];

    // ── Step 1: Determine feature access ─────────────────────────────
    const featureAccess = this.classifyFeatureAccess(input.features);

    const op2Features = input.features.filter(f =>
      featureAccess.get(f.id) === "op2_only" || featureAccess.get(f.id) === "both_ops"
    );

    const needsFlip = op2Features.length > 0;

    if (!needsFlip) {
      reasoning.push("All features accessible from Op1 — no flip required");
    } else {
      reasoning.push(`${op2Features.length} feature(s) require Op2 access: ${op2Features.map(f => f.id).join(", ")}`);
    }

    // ── Step 2: Build Op1 plan ───────────────────────────────────────
    const op1Features = input.features.filter(f =>
      featureAccess.get(f.id) === "op1_only" ||
      featureAccess.get(f.id) === "either" ||
      featureAccess.get(f.id) === "both_ops"
    );

    const op1Ops = this.buildOpOperations(op1Features, 1, needsFlip);

    const op1: OpPlan = {
      op_number: 1,
      description: needsFlip
        ? "Machine chuck-end features from bar stock; leave face stock for Op2"
        : "Complete part from bar stock",
      features: op1Features.map(f => f.id),
      operations: op1Ops,
      workholding: "3-jaw chuck on bar stock / collet",
      z_datum: "Bar face (Z0 at part face after facing)",
      notes: needsFlip
        ? [`Leave ${OP2_FACE_STOCK_MM}mm face stock for Op2 cleanup`, "Part-off with extra length"]
        : [],
    };

    // ── Step 3: Build Op2 plan (if needed) ───────────────────────────
    let op2: OpPlan | null = null;
    let softJawBoring: SoftJawBoringProgram | null = null;
    let zTransfer: ZTransfer | null = null;
    let concentricity: ConcentricityStrategy | null = null;

    if (needsFlip) {
      const op2Ops = this.buildOpOperations(op2Features, 2, false);

      // Determine grip diameter (largest finished OD from Op1)
      const gripDiameter = this.findGripDiameter(input, op1Features);
      const jawBoreDia = gripDiameter + SOFT_JAW_BORE_CLEARANCE_MM;
      const jawDepth = Math.max(MIN_JAW_GRIP_MM, Math.min(input.part_length_mm * 0.3, DEFAULT_JAW_DEPTH_MM));

      op2 = {
        op_number: 2,
        description: "Flip part; grip on Op1 finished OD in soft jaws; machine tailstock-end features",
        features: op2Features.map(f => f.id),
        operations: ["face_cleanup", ...op2Ops],
        workholding: `Soft jaws bored to Ø${jawBoreDia.toFixed(3)}mm × ${jawDepth.toFixed(1)}mm deep`,
        z_datum: `Op2 face (Z0 at faced surface, total length = ${input.part_length_mm}mm)`,
        notes: [
          `Grip on Ø${gripDiameter.toFixed(3)}mm finished OD from Op1`,
          `Jaw bore: Ø${jawBoreDia.toFixed(3)}mm (${SOFT_JAW_BORE_CLEARANCE_MM}mm clearance)`,
          "Indicate bore TIR before running Op2",
        ],
      };

      // Soft jaw boring program
      softJawBoring = this.generateSoftJawBoring(jawBoreDia, jawDepth, input.controller ?? "fanuc");

      // Z-reference transfer
      zTransfer = this.buildZTransfer(input, needsFlip);

      // Concentricity strategy
      concentricity = this.buildConcentricityStrategy(input, gripDiameter, jawBoreDia);

      reasoning.push(`Soft jaw bore: Ø${jawBoreDia.toFixed(3)}mm to grip finished OD`);
      reasoning.push(`Z transfer: face reference with ${OP2_FACE_STOCK_MM}mm cleanup stock`);
    }

    return {
      needs_flip: needsFlip,
      reasoning,
      op1,
      op2,
      soft_jaw_boring: softJawBoring,
      z_transfer: zTransfer,
      concentricity,
      total_operations: op1.operations.length + (op2?.operations.length ?? 0),
      estimated_setup_changes: needsFlip ? 1 : 0,
    };
  }

  /**
   * Generate a soft jaw boring program.
   *
   * @param boreDia Target bore diameter in mm
   * @param depth Bore depth in mm
   * @param controller CNC controller dialect
   * @returns G-code program for boring soft jaws
   */
  generateSoftJawBoring(boreDia: number, depth: number, controller: string = "fanuc"): SoftJawBoringProgram {
    const finishDia = boreDia;
    const roughDia = boreDia - 0.2; // 0.1mm radial stock for finish
    const roughDepth = depth + 1; // 1mm deeper for clearance

    let gcode = "";
    const notes: string[] = [];

    switch (controller) {
      case "fanuc":
      case "haas":
        gcode = [
          `(SOFT JAW BORING - DIA ${finishDia.toFixed(3)}mm)`,
          `(DEPTH ${depth.toFixed(1)}mm)`,
          "G21 G40 G80",
          "T0800 (BORING BAR)",
          "G97 S800 M03",
          "G00 X0 Z2.0",
          `(ROUGH BORE - G71)`,
          `G00 X${(roughDia - 2).toFixed(3)} Z1.0`,
          `G71 U1.0 R0.5`,
          `G71 P100 Q200 U-0.1 W0.05 F0.15`,
          `N100 G00 X${roughDia.toFixed(3)}`,
          `G01 Z-${roughDepth.toFixed(1)} F0.15`,
          `N200 G00 X${(roughDia - 2).toFixed(3)}`,
          `(FINISH BORE - G70)`,
          `G70 P300 Q400`,
          `N300 G00 X${finishDia.toFixed(3)}`,
          `G01 Z-${depth.toFixed(1)} F0.08`,
          `N400 G00 X${(finishDia - 2).toFixed(3)}`,
          "G00 X0 Z50.0",
          "M30",
        ].join("\n");
        notes.push("Use G71/G70 rough-finish bore cycle");
        break;

      case "okuma":
        gcode = [
          `(SOFT JAW BORING - DIA ${finishDia.toFixed(3)}mm)`,
          "G21 G40 G80",
          "T08",
          "G97 S800 M03",
          `GROV X${roughDia.toFixed(3)} Z-${roughDepth.toFixed(1)} U1.0 F0.15`,
          `GFIN X${finishDia.toFixed(3)} Z-${depth.toFixed(1)} F0.08`,
          "G00 X0 Z50.0",
          "M30",
        ].join("\n");
        notes.push("Okuma GROV/GFIN bore cycle");
        break;

      case "mazak":
        gcode = [
          `(SOFT JAW BORING - DIA ${finishDia.toFixed(3)}mm)`,
          "G21 G40 G80",
          "T0800",
          "G97 S800 M03",
          `G71 U1.0 R0.5`,
          `G71 P100 Q200 U-0.1 W0.05 F0.15`,
          `N100 G00 X${roughDia.toFixed(3)}`,
          `G01 Z-${roughDepth.toFixed(1)} F0.15`,
          `N200 G00 X${(roughDia - 2).toFixed(3)}`,
          `G70 P100 Q200`,
          "M30",
        ].join("\n");
        notes.push("Mazak G71/G70 bore cycle (Fanuc-compatible)");
        break;

      case "siemens":
        gcode = [
          `; SOFT JAW BORING - DIA ${finishDia.toFixed(3)}mm`,
          "G21 G40 G80",
          "T8 D1",
          "G97 S800 M03",
          `CYCLE95("JAWBORE",0.1,0.05,0.15,0.08,1.0,0)`,
          `; Profile: X${finishDia.toFixed(3)} Z-${depth.toFixed(1)}`,
          "M30",
        ].join("\n");
        notes.push("Siemens CYCLE95 stock removal cycle");
        break;

      default:
        gcode = [
          `(SOFT JAW BORING - DIA ${finishDia.toFixed(3)}mm)`,
          "G21 G40 G80",
          "T0800",
          "G97 S800 M03",
          `G71 U1.0 R0.5`,
          `G71 P100 Q200 U-0.1 W0.05 F0.15`,
          `N100 G00 X${roughDia.toFixed(3)}`,
          `G01 Z-${roughDepth.toFixed(1)} F0.15`,
          `N200 G00 X${(roughDia - 2).toFixed(3)}`,
          `G70 P100 Q200`,
          "M30",
        ].join("\n");
    }

    notes.push(
      `Rough to Ø${roughDia.toFixed(3)}mm, finish to Ø${finishDia.toFixed(3)}mm`,
      `Depth: ${depth.toFixed(1)}mm + 1mm clearance for rough`,
      "Verify bore with gauge/micrometer before loading part",
    );

    return {
      bore_diameter_mm: finishDia,
      bore_depth_mm: depth,
      bore_tolerance_mm: 0.025,
      gcode,
      notes,
    };
  }

  // ── Private helpers ────────────────────────────────────────────────

  private classifyFeatureAccess(features: MultiOpFeature[]): Map<string, FeatureAccess> {
    const result = new Map<string, FeatureAccess>();

    for (const f of features) {
      if (f.is_through) {
        // Through features can be machined from either end
        result.set(f.id, "either");
      } else if (f.position === "chuck_end") {
        result.set(f.id, "op1_only");
      } else if (f.position === "tailstock_end") {
        result.set(f.id, "op2_only");
      } else if (f.position === "middle") {
        // Middle features usually accessible from Op1 side
        result.set(f.id, "op1_only");
      } else {
        // Default: Op1
        result.set(f.id, "op1_only");
      }
    }

    return result;
  }

  private buildOpOperations(features: MultiOpFeature[], opNum: 1 | 2, willFlip: boolean): string[] {
    const ops: string[] = [];

    // Face is always first
    if (opNum === 1 || features.some(f => f.requires_facing)) {
      ops.push("face");
    }

    // OD roughing/finishing
    const hasOdFeatures = features.some(f => !f.is_bore && f.diameter_mm);
    if (hasOdFeatures) {
      ops.push("rough_od", "finish_od");
    }

    // Bore features
    const boreFeatures = features.filter(f => f.is_bore);
    if (boreFeatures.length > 0) {
      ops.push("drill", "rough_bore", "finish_bore");
    }

    // Thread features
    const threadFeatures = features.filter(f => f.has_threads);
    for (const tf of threadFeatures) {
      ops.push(tf.is_bore ? "thread_id" : "thread_od");
    }

    // Chamfer/deburr
    ops.push("chamfer");

    // Part-off only in Op1 and only if not flipping (or if single-op)
    if (opNum === 1 && !willFlip) {
      ops.push("part_off");
    } else if (opNum === 1 && willFlip) {
      ops.push("part_off"); // Part off with extra stock for Op2
    }

    return ops;
  }

  private findGripDiameter(input: MultiOpInput, op1Features: MultiOpFeature[]): number {
    // Find the largest finished OD from Op1 features
    const odFeatures = op1Features.filter(f => !f.is_bore && f.diameter_mm);
    if (odFeatures.length > 0) {
      return Math.max(...odFeatures.map(f => f.diameter_mm!));
    }
    // Fallback to max OD
    return input.max_od_mm;
  }

  private buildZTransfer(input: MultiOpInput, _needsFlip: boolean): ZTransfer {
    return {
      method: "face_reference",
      op1_z_datum: "Z0 at part face (after facing)",
      op2_z_datum: `Z0 at Op2 faced surface (total length = ${input.part_length_mm}mm)`,
      op2_face_stock_mm: OP2_FACE_STOCK_MM,
      notes: [
        `Op1 parts off at L = ${(input.part_length_mm + OP2_FACE_STOCK_MM).toFixed(1)}mm (includes ${OP2_FACE_STOCK_MM}mm face stock)`,
        `Op2 faces to final length ${input.part_length_mm}mm`,
        "Touch off Z on Op2 face before running program",
        "Verify total length with micrometer after Op2 facing",
      ],
    };
  }

  private buildConcentricityStrategy(
    input: MultiOpInput,
    gripDia: number,
    jawBoreDia: number,
  ): ConcentricityStrategy {
    const targetTir = input.concentricity_mm ?? 0.025;

    // Choose method based on tolerance
    if (targetTir < 0.010) {
      return {
        method: "indicator_alignment",
        target_tir_mm: targetTir,
        jaw_bore_diameter_mm: jawBoreDia,
        steps: [
          `Bore soft jaws to Ø${jawBoreDia.toFixed(3)}mm`,
          "Load part in soft jaws",
          `Indicate on Ø${gripDia.toFixed(3)}mm OD — adjust until TIR < ${(targetTir * 1000).toFixed(0)}µm`,
          "Lock jaws and re-verify TIR",
          "Run Op2 program",
        ],
      };
    }

    return {
      method: "soft_jaw_bore_to_od",
      target_tir_mm: targetTir,
      jaw_bore_diameter_mm: jawBoreDia,
      steps: [
        `Bore soft jaws to Ø${jawBoreDia.toFixed(3)}mm (clearance fit to Ø${gripDia.toFixed(3)}mm finished OD)`,
        "Load part in soft jaws — jaws center on Op1 finished OD",
        `Expected TIR: < ${Math.max(10, targetTir * 1000 * 0.5).toFixed(0)}µm (from jaw bore accuracy)`,
        "Face Op2 end to establish Z datum",
        "Run Op2 program",
      ],
    };
  }
}

export const latheMultiOpPlannerEngine = new LatheMultiOpPlannerEngine();
