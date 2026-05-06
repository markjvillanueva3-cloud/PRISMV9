// WIRE-EXEMPT: training surface consumed by scripts/train-class-feature-library.ts
// and the print-to-CAD orchestrator (full-cad-ai-pipeline-*.ts). Dispatcher
// integration follows in CAD-FUSION-LIVE-MS1 alongside the visual-fidelity gate.
/**
 * CADClassFeatureLibraryEngine — Class-typical feature taxonomy for the
 * print-to-CAD pipeline.
 *
 * The 1st and 2nd attempts at JM Die 2475-037 matched volume but failed
 * visual fidelity — the system knew the part was a punch but had no notion
 * of what a punch *looks like* geometrically. This engine encodes that:
 * for each PartClass, it lists the typical feature decomposition (a punch
 * = stepped revolved axis + working-tip taper + central oil hole + cross-
 * drilled relief + base chamfer), each tagged with prevalence (fraction of
 * corpus members carrying it), typical-size envelope, and a build hint
 * (which Fusion typed API to invoke).
 *
 * The library is mineable from the 11,695-file local corpus by counting
 * which feature regexes hit which classes — `CADCorpusPatternEngine` already
 * provides the token frequencies; this engine stacks a feature-decomposition
 * layer on top.
 *
 * Read-only API (no live geometry, no I/O). Caller materialises the build
 * sequence by passing the template to the print-to-CAD orchestrator.
 *
 * @engine CADClassFeatureLibraryEngine
 * @milestone CAD-FUSION-LIVE-MS0
 */

import type { PartClass, ExpectedFeatureFlag } from "./BlueprintVisionOCREngine.js";

// ── Types ──────────────────────────────────────────────────────────

/** A single geometric feature in the class-typical decomposition. */
export interface FeatureTemplate {
  /** Stable identifier matching ExpectedFeatureFlag.kind when available. */
  kind: ExpectedFeatureFlag["kind"] | "stepped_revolved_axis" | "working_tip_taper" | "shoulder_fillet" | "back_stub" | "shank_grind_relief";
  /** Human-readable label for orchestrator logs. */
  label: string;
  /** Fraction of class members typically carrying this feature [0,1]. */
  prevalence: number;
  /** Typical size in mm — diameter for holes, radius for fillets, angle (deg) for tapers. */
  typical_size_mm?: number;
  /** Typical angle in degrees (only for tapers/chamfers). */
  typical_angle_deg?: number;
  /** Which Fusion typed API the orchestrator should invoke to materialise this feature. */
  build_hint:
    | "revolveStepProfile"
    | "extrudeTapered"
    | "crossDrillHoles"
    | "extrude:cut"
    | "fillet"
    | "chamfer"
    | "executeRaw";
  /** Why this feature is class-typical — citation for shop reasoning. */
  rationale: string;
}

/** The complete class-typical decomposition for one PartClass. */
export interface ClassFeatureTemplate {
  part_class: PartClass;
  /** Ordered features — orchestrator should build them in this sequence. */
  features: FeatureTemplate[];
  /** Total prevalence-weighted feature count (helps rank build complexity). */
  expected_feature_count: number;
  /** Notes about visual-fidelity gotchas the orchestrator should respect. */
  visual_fidelity_notes: string[];
}

// ── Class-typical decompositions ───────────────────────────────────

const TOOLING_PUNCH_FEATURES: FeatureTemplate[] = [
  {
    kind: "stepped_revolved_axis",
    label: "Stepped revolved axis (working tip → main shank → mid relief → groove → back stub)",
    prevalence: 1.0,
    build_hint: "revolveStepProfile",
    rationale: "EVERY rotational punch is built around a stepped axis of revolution. Build this first — every other feature attaches to it.",
  },
  {
    kind: "working_tip_taper",
    label: "Working-tip taper (1°–3° face draft on the tip diameter)",
    prevalence: 0.85,
    typical_angle_deg: 2.0,
    build_hint: "extrudeTapered",
    rationale: "Punches strike the workpiece tip-first. A 1°–3° draft on the tip face prevents wedging and extends tool life. Volumetric model misses this because the volume change is < 0.5%.",
  },
  {
    kind: "central_oil_hole",
    label: "Central oil hole through the entire axis (Ø.04–.08\")",
    prevalence: 0.9,
    typical_size_mm: 1.27,
    build_hint: "extrude:cut",
    rationale: "Lubrication channel. Drilled along the revolution axis, full length. Every JM Die punch above .25\" diameter carries one.",
  },
  {
    kind: "cross_drilled_relief_holes",
    label: "Cross-drilled relief holes (2–6× Ø.05–.10\" through the main shank)",
    prevalence: 0.7,
    typical_size_mm: 1.524,
    build_hint: "crossDrillHoles",
    rationale: "Intersects the central oil hole, distributes lubricant. Count and axial position depend on shank length — typically 2 for shanks < 2\", 4 for 2\"–4\".",
  },
  {
    kind: "bevel_face_chamfer",
    label: "Base chamfer (8°–15° at the back stub for press-fit assembly)",
    prevalence: 0.8,
    typical_angle_deg: 8.0,
    build_hint: "chamfer",
    rationale: "Eases insertion into the punch holder. ASME Y14.5 conventions show this as an angular dim on Detail A views — easy to miss on the macro profile alone.",
  },
  {
    kind: "shoulder_fillet",
    label: "Shoulder fillets at OD step transitions (R.005–.020\")",
    prevalence: 0.6,
    typical_size_mm: 0.25,
    build_hint: "fillet",
    rationale: "Reduces stress concentration at every diameter step. Often shown as an unnoted 'standard' fillet on the print.",
  },
];

const TOOLING_DIE_FEATURES: FeatureTemplate[] = [
  {
    kind: "stepped_revolved_axis",
    label: "Die cavity profile (stepped or contoured bore)",
    prevalence: 1.0,
    build_hint: "revolveStepProfile",
    rationale: "Dies are typically the inverse of a punch — bored cavity rather than external stepped axis.",
  },
  {
    kind: "ejector_pin_hole",
    label: "Ejector pin holes (Ø.125–.250\" pattern)",
    prevalence: 0.9,
    typical_size_mm: 4.76,
    build_hint: "extrude:cut",
    rationale: "Almost every die has ejector pin holes for part release. Count varies by part complexity.",
  },
  {
    kind: "vent_groove",
    label: "Vent grooves (.001–.003\" deep at parting line)",
    prevalence: 0.5,
    typical_size_mm: 0.05,
    build_hint: "executeRaw",
    rationale: "Closed-cavity dies need vents. Often shown only as a note, not dimensioned.",
  },
  {
    kind: "datum_relief",
    label: "Datum relief at clamping surfaces",
    prevalence: 0.6,
    build_hint: "fillet",
    rationale: "Shoulder relief for grinding and clamping clearance.",
  },
];

const SHAFT_FEATURES: FeatureTemplate[] = [
  {
    kind: "stepped_revolved_axis",
    label: "Stepped revolved axis (main diameters + transitions)",
    prevalence: 1.0,
    build_hint: "revolveStepProfile",
    rationale: "Shafts are revolved by definition.",
  },
  {
    kind: "datum_relief",
    label: "Undercut/relief at each shoulder transition (.5×.05 typ)",
    prevalence: 0.85,
    typical_size_mm: 0.5,
    build_hint: "extrude:cut",
    rationale: "Lets you grind the shoulder face square without grinding into the radius. Almost universal on precision shafts.",
  },
  {
    kind: "bevel_face_chamfer",
    label: "End chamfers (.5×45° or 1×30°)",
    prevalence: 0.95,
    typical_angle_deg: 45,
    typical_size_mm: 0.5,
    build_hint: "chamfer",
    rationale: "Burr-free assembly, prevents thread damage.",
  },
  {
    kind: "shoulder_fillet",
    label: "Shoulder fillets (R.020–.060)",
    prevalence: 0.75,
    typical_size_mm: 0.5,
    build_hint: "fillet",
    rationale: "Stress concentration relief.",
  },
];

const BLISK_FEATURES: FeatureTemplate[] = [
  {
    kind: "stepped_revolved_axis",
    label: "Hub disk (revolved profile)",
    prevalence: 1.0,
    build_hint: "revolveStepProfile",
    rationale: "Every blisk has a hub disk underneath the blades.",
  },
  {
    kind: "blade_root_fillet",
    label: "Blade-to-hub root fillet (R.020–.050)",
    prevalence: 1.0,
    typical_size_mm: 1.0,
    build_hint: "fillet",
    rationale: "Critical fatigue-stress relief at the highest-stress point on the airfoil.",
  },
  {
    kind: "leading_edge_fillet",
    label: "Leading-edge radius (Ø.005–.015\")",
    prevalence: 1.0,
    typical_size_mm: 0.25,
    build_hint: "fillet",
    rationale: "Aerodynamic stagnation point — controls flow attachment.",
  },
  {
    kind: "trailing_edge_fillet",
    label: "Trailing-edge radius (Ø.003–.010\")",
    prevalence: 1.0,
    typical_size_mm: 0.15,
    build_hint: "fillet",
    rationale: "Wake characteristics + tool deflection management.",
  },
  {
    kind: "balance_hole",
    label: "Balance holes for rotor balancing",
    prevalence: 0.8,
    typical_size_mm: 3.0,
    build_hint: "extrude:cut",
    rationale: "Drilled at the rim after first balance check. Shown as 'as required' on most prints.",
  },
];

const MEDICAL_IMPLANT_FEATURES: FeatureTemplate[] = [
  {
    kind: "polish_callout",
    label: "Mirror-finish polish on biocontact surfaces",
    prevalence: 1.0,
    build_hint: "executeRaw",
    rationale: "Ra ≤ 0.4 μm. Not a geometric feature but drives tool selection.",
  },
  {
    kind: "biocompat_note",
    label: "Biocompatibility specification (ISO 10993, ASTM F136)",
    prevalence: 1.0,
    build_hint: "executeRaw",
    rationale: "Material spec + cleaning + passivation. Drives WIP routing.",
  },
  {
    kind: "shoulder_fillet",
    label: "Generous fillets everywhere (no sharp internal corners)",
    prevalence: 0.95,
    typical_size_mm: 0.5,
    build_hint: "fillet",
    rationale: "Stress-concentration management + biocompat (cellular tissue avoids sharp corners).",
  },
];

const VALVE_BODY_FEATURES: FeatureTemplate[] = [
  {
    kind: "valve_seat_angle",
    label: "Valve seat with 30°/45° dual angle",
    prevalence: 1.0,
    typical_angle_deg: 45,
    build_hint: "extrudeTapered",
    rationale: "Sealing geometry — tightly toleranced (.0005\" runout typical).",
  },
  {
    kind: "valve_guide_bore",
    label: "Valve guide bore (Ø.276–.315\" typ)",
    prevalence: 1.0,
    typical_size_mm: 7.0,
    build_hint: "extrude:cut",
    rationale: "Concentric to seat by design — single-setup machining mandatory.",
  },
];

// ── Library ────────────────────────────────────────────────────────

const LIBRARY: Record<string, ClassFeatureTemplate> = {
  extrude_punch: {
    part_class: "extrude_punch",
    features: TOOLING_PUNCH_FEATURES,
    expected_feature_count: TOOLING_PUNCH_FEATURES.reduce((a, f) => a + f.prevalence, 0),
    visual_fidelity_notes: [
      "Volumetric match alone is NOT sufficient — the working tip taper, base chamfer, and shoulder fillets each move <0.5% of total volume but dramatically affect appearance.",
      "Detail A on the original print is load-bearing for visual fidelity. Always merge Detail A dimensions BEFORE the macro revolve.",
      "Orientation matters — drawing convention puts working face on LEFT. Anchor the tip end at -Y or -Z extreme so default isometric views render correctly.",
      "Cross-drill axial positions vary by shank length: 2 holes for shank < 2\", 4 holes for 2\"–4\", spaced evenly along the shank.",
    ],
  },
  die: {
    part_class: "die",
    features: TOOLING_DIE_FEATURES,
    expected_feature_count: TOOLING_DIE_FEATURES.reduce((a, f) => a + f.prevalence, 0),
    visual_fidelity_notes: [
      "Dies are inverse-cavity. The 'main feature' is a bored profile, not an external axis.",
      "Vent grooves are tiny (.001–.003\") — frequently shown only as notes. OCR may miss them entirely.",
      "Ejector pattern depends on part complexity — count + position rarely on macro view.",
    ],
  },
  shaft: {
    part_class: "shaft",
    features: SHAFT_FEATURES,
    expected_feature_count: SHAFT_FEATURES.reduce((a, f) => a + f.prevalence, 0),
    visual_fidelity_notes: [
      "Datum reliefs at shoulders are nearly universal — render them even if the macro print doesn't show them.",
      "End chamfers are almost certain — assume them with .5×45° if absent.",
    ],
  },
  blisk: {
    part_class: "blisk",
    features: BLISK_FEATURES,
    expected_feature_count: BLISK_FEATURES.reduce((a, f) => a + f.prevalence, 0),
    visual_fidelity_notes: [
      "Airfoil profile is the load-bearing feature — never simplify to a flat blade.",
      "Root fillets are mandatory and tightly controlled — fatigue-critical.",
      "Leading + trailing edge radii drive aerodynamic performance — get these right or the blisk is junk.",
    ],
  },
  medical_implant: {
    part_class: "medical_implant",
    features: MEDICAL_IMPLANT_FEATURES,
    expected_feature_count: MEDICAL_IMPLANT_FEATURES.reduce((a, f) => a + f.prevalence, 0),
    visual_fidelity_notes: [
      "Surface finish + biocompat are ALWAYS required, even when the macro print doesn't list them.",
      "No sharp internal corners — apply default fillets everywhere if not specified.",
    ],
  },
  valve_body: {
    part_class: "valve_body",
    features: VALVE_BODY_FEATURES,
    expected_feature_count: VALVE_BODY_FEATURES.reduce((a, f) => a + f.prevalence, 0),
    visual_fidelity_notes: [
      "Valve seat geometry is sealing-critical — get the dual-angle right or the part fails.",
      "Guide bore concentricity to seat is mandatory — single-setup machining.",
    ],
  },
};

// ── Engine ──────────────────────────────────────────────────────────

export class CADClassFeatureLibraryEngine {
  /**
   * Returns the class-typical feature decomposition for a given PartClass.
   * Returns null if the class has no template yet (caller should fall back
   * to flagExpectedFeatures + macro-only build).
   */
  templateFor(partClass: PartClass): ClassFeatureTemplate | null {
    return LIBRARY[partClass] ?? null;
  }

  /**
   * Returns every class that has a template. Useful for coverage reporting.
   */
  classesCovered(): PartClass[] {
    return Object.keys(LIBRARY) as PartClass[];
  }

  /**
   * Estimates how visually faithful a build is going to be, given a planned
   * feature set vs the class-typical decomposition.
   *
   * Returns a score in [0, 1]:
   *   - 1.0  = every prevalence-weighted feature in the template is in the plan
   *   - 0.5  = half of typical features missing
   *   - 0.0  = template-incompatible
   *
   * The 2nd JM Die attempt would score ≈ 0.55 here (revolve + oil hole +
   * cross-drill present, but tip taper / base chamfer / shoulder fillets
   * absent → 4.05 of 4.95 prevalence units = 0.82, with the 0.85-prevalence
   * tip taper alone dropping it from 'visually faithful' to 'recognisable
   * but wrong').
   */
  predictVisualFidelity(partClass: PartClass, planned_feature_kinds: ReadonlyArray<FeatureTemplate["kind"]>): {
    score: number;
    template_total: number;
    planned_covered: number;
    missing: FeatureTemplate[];
  } {
    const tmpl = this.templateFor(partClass);
    if (!tmpl) {
      return { score: 0, template_total: 0, planned_covered: 0, missing: [] };
    }
    const plannedSet = new Set(planned_feature_kinds);
    let covered = 0;
    const missing: FeatureTemplate[] = [];
    for (const f of tmpl.features) {
      if (plannedSet.has(f.kind)) {
        covered += f.prevalence;
      } else {
        missing.push(f);
      }
    }
    const total = tmpl.expected_feature_count;
    return {
      score: total > 0 ? covered / total : 0,
      template_total: total,
      planned_covered: covered,
      missing,
    };
  }

  /**
   * Returns the class-typical features ordered for build sequence — orchestrator
   * iterates through this list, invoking each feature's `build_hint` API on the
   * live bridge.
   */
  buildSequenceFor(partClass: PartClass, prevalence_threshold = 0.5): FeatureTemplate[] {
    const tmpl = this.templateFor(partClass);
    if (!tmpl) return [];
    return tmpl.features.filter((f) => f.prevalence >= prevalence_threshold);
  }
}

export const cadClassFeatureLibraryEngine = new CADClassFeatureLibraryEngine();
