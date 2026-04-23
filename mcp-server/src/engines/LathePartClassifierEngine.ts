/**
 * LATHE-PRO-MS3, U-LPS01
 * LathePartClassifierEngine — 15 Part Family Classifier
 *
 * Classifies turned parts into 15 families based on geometry ratios,
 * stock form, and feature signatures. Each family drives:
 * - Default workholding selection (chuck type, jaw style)
 * - Roughing cycle strategy (G71 stock removal vs G73 pattern repeat)
 * - Operation sequence template
 * - Thermal management approach
 *
 * Reference: Peter Smid "CNC Programming Handbook" Ch. 2 (Process Planning)
 * Reference: Machinery's Handbook, 31st Ed. — Workholding chapter
 */

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

/** The 15 lathe part families */
export type LathePartFamily =
  | "shaft"           // L/D > 3, solid, multi-diameter steps
  | "flange"          // L/D < 0.5, large OD with bolt circle
  | "disc"            // L/D < 0.3, thin flat part
  | "sleeve"          // hollow cylinder, through bore, wall thickness uniform
  | "bushing"         // short hollow, press-fit bore, ID tolerance tight
  | "pulley"          // grooved OD for belt drive
  | "coupling"        // symmetric, keyway, set screw features
  | "hub"             // bore + flange + web, typically welded assembly
  | "spacer"          // simple ring, minimal features
  | "cap"             // closed-end hollow (blind bore)
  | "plug"            // short solid cylinder, often threaded OD
  | "nipple"          // short tube, threaded both ends
  | "forging_blank"   // near-net shape from forging → G73 pattern repeat
  | "casting_blank"   // near-net shape from casting → G73 pattern repeat
  | "tube_hollow";    // thin-wall tube stock, controlled clamping

export type StockForm = "bar" | "forging" | "casting" | "hex_bar" | "tube" | "pre_machined";

export type RoughingCycle = "G71" | "G73" | "G72" | "G71_G72";

export type WorkholdingDefault =
  | "3_jaw_hard"
  | "3_jaw_soft"
  | "collet"
  | "6_jaw"
  | "expanding_mandrel"
  | "face_driver"
  | "soft_jaw_custom"
  | "between_centers"
  | "controlled_pressure";

export interface PartGeometryInput {
  /** Overall length in mm */
  length_mm: number;
  /** Maximum OD in mm */
  max_od_mm: number;
  /** Minimum OD in mm (0 if no step-down) */
  min_od_mm?: number;
  /** Through bore diameter in mm (0 or undefined if solid) */
  bore_id_mm?: number;
  /** Minimum wall thickness in mm (computed if bore exists) */
  wall_thickness_mm?: number;
  /** Stock form */
  stock_form?: StockForm;
  /** Feature signature keywords */
  features?: string[];
  /** Tightest tolerance in mm */
  tightest_tolerance_mm?: number;
  /** Has bolt circle / mounting holes */
  has_bolt_circle?: boolean;
  /** Has keyway */
  has_keyway?: boolean;
  /** Has threads */
  has_threads?: boolean;
  /** Has groove(s) for belts / O-rings / retaining rings */
  has_grooves?: boolean;
  /** Number of OD step diameters */
  od_step_count?: number;
  /** Blind bore (not through) */
  blind_bore?: boolean;
  /** Both ends threaded */
  threaded_both_ends?: boolean;
  /** Material ISO group */
  iso_group?: string;
}

export interface ClassificationResult {
  family: LathePartFamily;
  confidence: number;
  reasoning: string[];
  workholding_default: WorkholdingDefault;
  workholding_justification: string;
  roughing_cycle: RoughingCycle;
  roughing_justification: string;
  sequence_template: string[];
  thermal_approach: "standard" | "rough_cool_finish" | "controlled_coolant" | "cryogenic_option";
  thin_wall_risk: boolean;
  secondary_families: LathePartFamily[];
}

// ═══════════════════════════════════════════════════════════════════════
// FAMILY PROFILES — workholding + roughing defaults per family
// ═══════════════════════════════════════════════════════════════════════

interface FamilyProfile {
  workholding: WorkholdingDefault;
  workholding_reason: string;
  roughing: RoughingCycle;
  roughing_reason: string;
  sequence: string[];
  thermal: "standard" | "rough_cool_finish" | "controlled_coolant" | "cryogenic_option";
}

const FAMILY_PROFILES: Record<LathePartFamily, FamilyProfile> = {
  shaft: {
    workholding: "3_jaw_hard",
    workholding_reason: "Standard chuck grip on bar stock; tailstock support for L/D > 4",
    roughing: "G71",
    roughing_reason: "Cylindrical stock removal along Z axis",
    sequence: ["face", "center_drill", "rough_od", "finish_od", "groove", "thread", "part_off"],
    thermal: "standard",
  },
  flange: {
    workholding: "3_jaw_soft",
    workholding_reason: "Soft jaws bored to OD for concentricity; short part doesn't need tailstock",
    roughing: "G71_G72",
    roughing_reason: "G71 for OD profile, G72 for face steps",
    sequence: ["face", "rough_od", "finish_od", "drill", "bore", "bolt_circle_prep", "part_off"],
    thermal: "standard",
  },
  disc: {
    workholding: "3_jaw_soft",
    workholding_reason: "Soft jaws for thin disc; minimize jaw pressure to prevent distortion",
    roughing: "G72",
    roughing_reason: "Face-dominant geometry — G72 facing cycle more efficient",
    sequence: ["face_op1", "rough_od", "finish_od", "flip", "face_op2", "finish"],
    thermal: "rough_cool_finish",
  },
  sleeve: {
    workholding: "collet",
    workholding_reason: "Uniform wall needs concentric grip; collet distributes force evenly",
    roughing: "G71",
    roughing_reason: "OD and ID roughing from bar/tube stock",
    sequence: ["face", "rough_od", "drill", "rough_bore", "finish_bore", "finish_od", "part_off"],
    thermal: "standard",
  },
  bushing: {
    workholding: "collet",
    workholding_reason: "Tight ID tolerance requires concentric, repeatable grip",
    roughing: "G71",
    roughing_reason: "Standard cylindrical roughing for short part",
    sequence: ["face", "rough_od", "drill", "rough_bore", "finish_bore", "finish_od", "chamfer", "part_off"],
    thermal: "rough_cool_finish",
  },
  pulley: {
    workholding: "3_jaw_soft",
    workholding_reason: "Soft jaws bored to finished OD; grooves need rigid grip",
    roughing: "G71",
    roughing_reason: "OD profile with groove features",
    sequence: ["face", "rough_od", "finish_od", "groove_belt", "drill", "bore", "keyway_prep", "part_off"],
    thermal: "standard",
  },
  coupling: {
    workholding: "3_jaw_soft",
    workholding_reason: "Soft jaws for concentricity; keyway cut in second op",
    roughing: "G71",
    roughing_reason: "Symmetric cylindrical profile",
    sequence: ["face", "rough_od", "finish_od", "drill", "bore", "groove", "part_off"],
    thermal: "standard",
  },
  hub: {
    workholding: "3_jaw_soft",
    workholding_reason: "Flange + bore geometry needs custom soft jaws for rigid grip",
    roughing: "G71_G72",
    roughing_reason: "G71 for OD steps, G72 for face/web features",
    sequence: ["face", "rough_od", "rough_web", "drill", "bore", "finish_od", "finish_bore", "part_off"],
    thermal: "standard",
  },
  spacer: {
    workholding: "collet",
    workholding_reason: "Simple ring geometry suits collet; fast setup for batch",
    roughing: "G71",
    roughing_reason: "Minimal material removal from bar",
    sequence: ["face", "rough_od", "finish_od", "chamfer", "part_off"],
    thermal: "standard",
  },
  cap: {
    workholding: "3_jaw_soft",
    workholding_reason: "Blind bore requires soft jaw grip on OD; Op2 on mandrel possible",
    roughing: "G71",
    roughing_reason: "OD profile + blind bore drilling/boring",
    sequence: ["face", "rough_od", "finish_od", "drill", "bore_blind", "finish_bore", "chamfer", "part_off"],
    thermal: "standard",
  },
  plug: {
    workholding: "collet",
    workholding_reason: "Short solid cylinder; collet gives fast changeover for batch",
    roughing: "G71",
    roughing_reason: "Simple OD from bar stock",
    sequence: ["face", "rough_od", "finish_od", "thread_od", "chamfer", "part_off"],
    thermal: "standard",
  },
  nipple: {
    workholding: "collet",
    workholding_reason: "Tube/bar stock in collet; thread both ends requires Op1/Op2",
    roughing: "G71",
    roughing_reason: "Minimal OD removal, thread-dominant",
    sequence: ["face", "rough_od", "thread_end1", "part_off", "flip", "face", "thread_end2"],
    thermal: "standard",
  },
  forging_blank: {
    workholding: "soft_jaw_custom",
    workholding_reason: "Near-net forging shape needs custom soft jaws matching rough contour",
    roughing: "G73",
    roughing_reason: "Pattern repeat follows near-net forging contour — removes uniform skin",
    sequence: ["face", "g73_rough_od", "finish_od", "drill", "bore", "finish_bore", "groove", "part_off"],
    thermal: "rough_cool_finish",
  },
  casting_blank: {
    workholding: "soft_jaw_custom",
    workholding_reason: "Casting OD irregular; custom soft jaws grip the as-cast surface",
    roughing: "G73",
    roughing_reason: "Pattern repeat follows near-net casting contour — removes scale + skin",
    sequence: ["face", "g73_rough_od", "finish_od", "drill", "bore", "finish_bore", "part_off"],
    thermal: "rough_cool_finish",
  },
  tube_hollow: {
    workholding: "controlled_pressure",
    workholding_reason: "Thin-wall tube requires low clamping pressure to prevent trilobe distortion",
    roughing: "G71",
    roughing_reason: "Light OD/ID passes from tube stock",
    sequence: ["face", "rough_od", "rough_bore", "finish_bore", "finish_od", "part_off"],
    thermal: "controlled_coolant",
  },
};

// ═══════════════════════════════════════════════════════════════════════
// CLASSIFIER ENGINE
// ═══════════════════════════════════════════════════════════════════════

class LathePartClassifierEngine {
  /**
   * Classify a turned part into one of 15 families.
   *
   * Decision tree priority:
   * 1. Stock form override (forging/casting/tube → family)
   * 2. Geometry ratios (L/D, wall thickness, bore presence)
   * 3. Feature signatures (threads, grooves, bolt circles, keyways)
   *
   * @param input Part geometry and feature description
   * @returns Classification with workholding, roughing, and sequence defaults
   */
  classify(input: PartGeometryInput): ClassificationResult {
    const reasoning: string[] = [];
    const candidates: Array<{ family: LathePartFamily; score: number; reasons: string[] }> = [];

    const ld = input.length_mm / input.max_od_mm;
    const hasBore = (input.bore_id_mm ?? 0) > 0;
    const wallThickness = hasBore
      ? (input.wall_thickness_mm ?? (input.max_od_mm - (input.bore_id_mm ?? 0)) / 2)
      : input.max_od_mm / 2;
    const wallRatio = hasBore ? wallThickness / input.max_od_mm : 1;
    const isThinWall = wallRatio < 0.08; // wall < 8% of OD
    const stockForm = input.stock_form ?? "bar";
    const features = (input.features ?? []).map(f => f.toLowerCase());

    reasoning.push(`L/D ratio: ${ld.toFixed(2)}`);
    reasoning.push(`Bore: ${hasBore ? `ID=${input.bore_id_mm}mm` : "solid"}`);
    if (hasBore) reasoning.push(`Wall thickness: ${wallThickness.toFixed(1)}mm (${(wallRatio * 100).toFixed(1)}% of OD)`);
    reasoning.push(`Stock form: ${stockForm}`);

    // ── Priority 1: Stock form override ──────────────────────────────
    if (stockForm === "forging") {
      candidates.push({ family: "forging_blank", score: 95, reasons: ["Forging stock → G73 pattern repeat"] });
    }
    if (stockForm === "casting") {
      candidates.push({ family: "casting_blank", score: 95, reasons: ["Casting stock → G73 pattern repeat"] });
    }
    if (stockForm === "tube") {
      candidates.push({ family: "tube_hollow", score: 90, reasons: ["Tube stock → controlled clamping pressure"] });
    }

    // ── Priority 2: Thin-wall tube detection (even from bar) ─────────
    if (hasBore && isThinWall && ld > 0.5) {
      candidates.push({
        family: "tube_hollow",
        score: 88,
        reasons: [`Thin wall (${wallThickness.toFixed(1)}mm, ${(wallRatio * 100).toFixed(1)}% of OD) → trilobe risk`],
      });
    }

    // ── Priority 3: Feature-driven classification ────────────────────

    // Nipple: short tube, threaded both ends
    if (input.threaded_both_ends || (features.includes("thread") && features.includes("pipe"))) {
      candidates.push({ family: "nipple", score: 85, reasons: ["Threaded both ends / pipe fitting"] });
    }

    // Flange: short + bolt circle
    if (ld < 0.5 && (input.has_bolt_circle || features.includes("bolt_circle") || features.includes("flange"))) {
      candidates.push({ family: "flange", score: 90, reasons: [`L/D=${ld.toFixed(2)} < 0.5 + bolt circle → flange`] });
    }

    // Disc: very short, no bore dominant
    if (ld < 0.3 && !hasBore) {
      candidates.push({ family: "disc", score: 85, reasons: [`L/D=${ld.toFixed(2)} < 0.3, solid → disc`] });
    }
    if (ld < 0.3 && hasBore && !input.has_bolt_circle) {
      candidates.push({ family: "disc", score: 80, reasons: [`L/D=${ld.toFixed(2)} < 0.3 with bore → disc (hollow disc)`] });
    }

    // Pulley: has belt grooves
    if (input.has_grooves && features.some(f => f.includes("belt") || f.includes("pulley") || f.includes("v_groove"))) {
      candidates.push({ family: "pulley", score: 90, reasons: ["Belt groove features → pulley"] });
    }

    // Coupling: symmetric with keyway
    if (input.has_keyway && hasBore && ld > 0.5 && ld < 3) {
      candidates.push({ family: "coupling", score: 82, reasons: ["Bore + keyway + moderate L/D → coupling"] });
    }

    // Hub: bore + flange-like face + web
    if (hasBore && ld < 1.5 && (input.od_step_count ?? 0) >= 2 && features.some(f => f.includes("hub") || f.includes("web"))) {
      candidates.push({ family: "hub", score: 85, reasons: ["Bore + OD steps + web feature → hub"] });
    }

    // Cap: blind bore
    if (input.blind_bore && ld < 2) {
      candidates.push({ family: "cap", score: 85, reasons: ["Blind bore → cap/closed-end"] });
    }

    // Plug: short solid, often threaded OD
    if (!hasBore && ld < 1.5 && input.has_threads) {
      candidates.push({ family: "plug", score: 82, reasons: ["Short solid + threaded OD → plug"] });
    }

    // Bushing: short hollow, tight bore tolerance
    if (hasBore && ld < 2 && !isThinWall && (input.tightest_tolerance_mm ?? 1) < 0.05) {
      candidates.push({ family: "bushing", score: 83, reasons: ["Short hollow + tight bore tolerance → bushing"] });
    }

    // Sleeve: hollow cylinder, uniform wall, moderate L/D
    if (hasBore && !isThinWall && ld >= 0.5 && ld <= 4) {
      candidates.push({ family: "sleeve", score: 70, reasons: ["Hollow cylinder, uniform wall → sleeve"] });
    }

    // Spacer: simple ring, minimal features
    if (hasBore && ld < 1 && (input.od_step_count ?? 0) <= 1 && !input.has_keyway && !input.has_threads && !input.has_grooves) {
      candidates.push({ family: "spacer", score: 78, reasons: ["Simple ring, no features → spacer"] });
    }

    // Shaft: long solid or near-solid
    if (ld > 3 && !isThinWall) {
      candidates.push({ family: "shaft", score: 88, reasons: [`L/D=${ld.toFixed(2)} > 3 → shaft`] });
    }
    if (ld > 1.5 && ld <= 3 && !hasBore && (input.od_step_count ?? 0) >= 2) {
      candidates.push({ family: "shaft", score: 75, reasons: ["Multi-step OD, moderate L/D → shaft"] });
    }

    // ── Fallback: default by geometry ────────────────────────────────
    if (candidates.length === 0) {
      if (hasBore) {
        candidates.push({ family: "sleeve", score: 50, reasons: ["Fallback: hollow part → sleeve"] });
      } else if (ld > 1.5) {
        candidates.push({ family: "shaft", score: 50, reasons: ["Fallback: long solid → shaft"] });
      } else {
        candidates.push({ family: "disc", score: 50, reasons: ["Fallback: short solid → disc"] });
      }
    }

    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);

    const winner = candidates[0];
    const profile = FAMILY_PROFILES[winner.family];

    // Collect secondary families (score within 15 points of winner)
    const secondaries = candidates
      .slice(1)
      .filter(c => c.score >= winner.score - 15)
      .map(c => c.family);

    // Override workholding for thin-wall cases
    let whDefault = profile.workholding;
    let whJustification = profile.workholding_reason;
    if (isThinWall && whDefault !== "controlled_pressure") {
      whDefault = "controlled_pressure";
      whJustification = `Thin wall (${wallThickness.toFixed(1)}mm) overrides to controlled pressure clamping`;
    }

    // Override workholding for tight tolerance + batch
    if ((input.tightest_tolerance_mm ?? 1) < 0.02 && whDefault === "3_jaw_hard") {
      whDefault = "collet";
      whJustification = "Tolerance < 0.02mm overrides to collet for concentricity";
    }

    // Thermal approach override for tight tolerance
    let thermal = profile.thermal;
    if ((input.tightest_tolerance_mm ?? 1) < 0.05 && thermal === "standard") {
      thermal = "rough_cool_finish";
    }

    return {
      family: winner.family,
      confidence: winner.score / 100,
      reasoning: [...reasoning, ...winner.reasons],
      workholding_default: whDefault,
      workholding_justification: whJustification,
      roughing_cycle: profile.roughing,
      roughing_justification: profile.roughing_reason,
      sequence_template: profile.sequence,
      thermal_approach: thermal,
      thin_wall_risk: isThinWall,
      secondary_families: secondaries,
    };
  }

  /**
   * Batch classify multiple parts.
   */
  classifyBatch(parts: PartGeometryInput[]): ClassificationResult[] {
    return parts.map(p => this.classify(p));
  }

  /**
   * Get the family profile (workholding, roughing, sequence defaults)
   * for a known family without running the full classifier.
   */
  getFamilyProfile(family: LathePartFamily): FamilyProfile & { family: LathePartFamily } {
    return { family, ...FAMILY_PROFILES[family] };
  }

  /**
   * List all 15 families with their default profiles.
   */
  listFamilies(): Array<{ family: LathePartFamily; workholding: WorkholdingDefault; roughing: RoughingCycle }> {
    return (Object.keys(FAMILY_PROFILES) as LathePartFamily[]).map(f => ({
      family: f,
      workholding: FAMILY_PROFILES[f].workholding,
      roughing: FAMILY_PROFILES[f].roughing,
    }));
  }
}

export const lathePartClassifierEngine = new LathePartClassifierEngine();
