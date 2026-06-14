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

import { statSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { PartClass, ExpectedFeatureFlag } from "./BlueprintVisionOCREngine.js";
import type { LearnedPrevalenceOverlay } from "./CADCorpusFeaturePrevalenceLearnerEngine.js";

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

const IMPELLER_FEATURES: FeatureTemplate[] = [
  {
    kind: "stepped_revolved_axis",
    label: "Hub disk + back disc (revolved profile)",
    prevalence: 1.0,
    build_hint: "revolveStepProfile",
    rationale: "Every impeller is built around a revolved hub. Blades attach to its outer face.",
  },
  {
    kind: "blade_root_fillet",
    label: "Blade-to-hub root fillet (R.020–.060)",
    prevalence: 1.0,
    typical_size_mm: 1.0,
    build_hint: "fillet",
    rationale: "Centrifugal stress at the blade root governs impeller life. R.020 minimum on every CFD-validated design.",
  },
  {
    kind: "leading_edge_fillet",
    label: "Vane leading-edge radius (Ø.005–.020\")",
    prevalence: 0.95,
    typical_size_mm: 0.4,
    build_hint: "fillet",
    rationale: "Inlet stagnation control + erosion resistance.",
  },
  {
    kind: "trailing_edge_fillet",
    label: "Vane trailing-edge radius (Ø.005–.015\")",
    prevalence: 0.9,
    typical_size_mm: 0.25,
    build_hint: "fillet",
    rationale: "Wake characteristics + stress concentration.",
  },
  {
    kind: "balance_hole",
    label: "Balance holes at the rim",
    prevalence: 0.85,
    typical_size_mm: 4.0,
    build_hint: "extrude:cut",
    rationale: "All centrifugal impellers carry balance corrections after first-spin test.",
  },
];

const TURBINE_BLADE_FEATURES: FeatureTemplate[] = [
  {
    kind: "leading_edge_fillet",
    label: "Leading edge radius (Ø.005–.015\")",
    prevalence: 1.0,
    typical_size_mm: 0.25,
    build_hint: "fillet",
    rationale: "Aero stagnation point — controls stage efficiency.",
  },
  {
    kind: "trailing_edge_fillet",
    label: "Trailing edge radius (Ø.003–.010\")",
    prevalence: 1.0,
    typical_size_mm: 0.15,
    build_hint: "fillet",
    rationale: "Wake geometry + tool-deflection management on 5-axis finish.",
  },
  {
    kind: "blade_root_fillet",
    label: "Blade-to-platform root fillet (R.030–.080)",
    prevalence: 1.0,
    typical_size_mm: 1.5,
    build_hint: "fillet",
    rationale: "Highest-stress location on a turbine blade. Fatigue-critical.",
  },
  {
    kind: "tip_clearance",
    label: "Tip-shroud or squealer relief",
    prevalence: 0.9,
    typical_size_mm: 0.5,
    build_hint: "extrude:cut",
    rationale: "Active tip clearance control. HPT blades carry this almost universally.",
  },
];

const BRACKET_FEATURES: FeatureTemplate[] = [
  {
    kind: "edge_distance_callout",
    label: "Bolt-hole edge distance (e/D ≥ 1.5)",
    prevalence: 0.85,
    build_hint: "executeRaw",
    rationale: "Aerospace structural rule — fatigue + bearing strength.",
  },
  {
    kind: "shoulder_fillet",
    label: "Internal-corner fillets (R.060–.250)",
    prevalence: 0.9,
    typical_size_mm: 3.0,
    build_hint: "fillet",
    rationale: "Brackets get most of their fatigue life from their fillet radius. No sharp internal corners.",
  },
  {
    kind: "fatigue_finish_callout",
    label: "Surface finish on fillet radii",
    prevalence: 0.7,
    build_hint: "executeRaw",
    rationale: "Aerospace brackets routinely call out Ra ≤ 1.6 μm in fatigue zones.",
  },
];

const BUSHING_FEATURES: FeatureTemplate[] = [
  {
    kind: "stepped_revolved_axis",
    label: "Bore + OD revolved profile",
    prevalence: 1.0,
    build_hint: "revolveStepProfile",
    rationale: "All bushings are revolved bodies.",
  },
  {
    kind: "bevel_face_chamfer",
    label: "Lead chamfers on bore + OD ends",
    prevalence: 0.95,
    typical_angle_deg: 30,
    typical_size_mm: 0.5,
    build_hint: "chamfer",
    rationale: "Press-fit installation requires a lead chamfer on the entering end. Typically 30°×.030.",
  },
  {
    kind: "shoulder_fillet",
    label: "Internal flange fillet",
    prevalence: 0.5,
    typical_size_mm: 0.5,
    build_hint: "fillet",
    rationale: "Flanged bushings get a small fillet at the flange-to-shank transition for rotation life.",
  },
];

const CASING_FEATURES: FeatureTemplate[] = [
  {
    kind: "shoulder_fillet",
    label: "Internal corner fillets (R.030–.125)",
    prevalence: 0.95,
    typical_size_mm: 2.0,
    build_hint: "fillet",
    rationale: "Cast/forged casings have fillets everywhere — never sharp internal corners.",
  },
  {
    kind: "datum_relief",
    label: "Mounting-flange relief",
    prevalence: 0.7,
    typical_size_mm: 1.0,
    build_hint: "extrude:cut",
    rationale: "Bolt-circle flanges commonly have a relieved mating surface to ensure flatness contact.",
  },
  {
    kind: "central_oil_hole",
    label: "Lubrication / coolant passages",
    prevalence: 0.6,
    typical_size_mm: 4.0,
    build_hint: "extrude:cut",
    rationale: "Bearing casings + gearbox housings carry internal oil/coolant feed channels.",
  },
];

const LUG_FEATURES: FeatureTemplate[] = [
  {
    kind: "edge_distance_callout",
    label: "Eye-hole edge distance (e/D ≥ 2.0)",
    prevalence: 1.0,
    build_hint: "executeRaw",
    rationale: "Aerospace clevis lug rule — bearing + tear-out strength. NASA-CR/MIL-HDBK-5 mandate.",
  },
  {
    kind: "fatigue_finish_callout",
    label: "Eye-bore Ra ≤ 1.6 μm (fatigue surface)",
    prevalence: 0.95,
    build_hint: "executeRaw",
    rationale: "Lug eye is the load-bearing fatigue surface. Polished bore standard.",
  },
  {
    kind: "shot_peen_zone",
    label: "Shot-peen zone around the eye",
    prevalence: 0.7,
    build_hint: "executeRaw",
    rationale: "Almen .010–.016A peening doubles fatigue life. Common spec on flight-critical lugs.",
  },
  {
    kind: "bushing_press_fit",
    label: "Pressed-in bushing in the eye",
    prevalence: 0.65,
    build_hint: "executeRaw",
    rationale: "Steel/bronze bushing protects the lug from bolt fretting. Press-fit interference toleranced.",
  },
  {
    kind: "lockwire_hole",
    label: "Lockwire hole through retaining bolt area",
    prevalence: 0.5,
    typical_size_mm: 1.0,
    build_hint: "extrude:cut",
    rationale: "AS567 / NAS768 lockwire on flight-critical fasteners.",
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
  impeller: {
    part_class: "impeller",
    features: IMPELLER_FEATURES,
    expected_feature_count: IMPELLER_FEATURES.reduce((a, f) => a + f.prevalence, 0),
    visual_fidelity_notes: [
      "Vane profile is sweep-revolved 3D — never simplify to a 2D extrusion.",
      "Hub/back-disc thickness ratio drives stress profile under spin — match the print.",
      "Balance holes are typically NOT on the macro print but ARE on every produced impeller.",
    ],
  },
  turbine_blade: {
    part_class: "turbine_blade",
    features: TURBINE_BLADE_FEATURES,
    expected_feature_count: TURBINE_BLADE_FEATURES.reduce((a, f) => a + f.prevalence, 0),
    visual_fidelity_notes: [
      "Airfoil profile is non-trivial — coordinate-defined per ASME B89.4.1, never approximate with simple curves.",
      "LE/TE radii are sub-millimeter and tightly toleranced — the visual difference between R.005 and R.015 is huge.",
      "Root attachment (fir-tree, dovetail) is platform-specific — verify against engine family before building.",
    ],
  },
  bracket: {
    part_class: "bracket",
    features: BRACKET_FEATURES,
    expected_feature_count: BRACKET_FEATURES.reduce((a, f) => a + f.prevalence, 0),
    visual_fidelity_notes: [
      "Internal corners are ALWAYS filleted on aerospace brackets — apply default R if not specified.",
      "Bolt-hole edge-distance violations are immediate cause for rework. Validate before commit.",
    ],
  },
  bushing: {
    part_class: "bushing",
    features: BUSHING_FEATURES,
    expected_feature_count: BUSHING_FEATURES.reduce((a, f) => a + f.prevalence, 0),
    visual_fidelity_notes: [
      "Lead chamfers are nearly universal — render them even if the print doesn't show.",
      "Press-fit interference dimensions matter more than nominal — capture upper deviation.",
    ],
  },
  casing: {
    part_class: "casing",
    features: CASING_FEATURES,
    expected_feature_count: CASING_FEATURES.reduce((a, f) => a + f.prevalence, 0),
    visual_fidelity_notes: [
      "Casings are 3D solid bodies, NOT revolved profiles — use box/extrude primitives, not revolveStepProfile.",
      "Internal coolant/oil passages are commonly hidden in section views — easy to miss without Detail recursion.",
    ],
  },
  lug: {
    part_class: "lug",
    features: LUG_FEATURES,
    expected_feature_count: LUG_FEATURES.reduce((a, f) => a + f.prevalence, 0),
    visual_fidelity_notes: [
      "Edge-distance / fatigue finish / shot peen / bushing press-fit are the FOUR aerospace musts on every clevis lug.",
      "Lockwire hole orientation matters — drilled at 90° to bolt axis, position determined by fastener geometry.",
    ],
  },
};

// ── Tunable thresholds ─────────────────────────────────────────────

/**
 * Template-prevalence threshold above which a corpus-vs-template disagreement
 * (low evidence_ratio) emits a drift caveat. 0.7 = "the template thinks this
 * feature is class-typical (≥70% of the canonical decomposition)" — if the
 * trained corpus disagrees, that's a retrain signal.
 */
const DRIFT_TEMPLATE_PREVALENCE_THRESHOLD = 0.7;

// ── U-FGE03: learned-prevalence overlay (the default-path wiring) ───
//
// `templateFor()` is the single read seam every build-sequence path goes
// through (`buildSequenceFor`, `buildSequenceForEvidence`,
// `predictVisualFidelity`). U-FGE01/02 added OPT-IN corpus-evidence
// surfaces; this overlay closes the memory's R12 gap by making the trained
// blend auto-apply on the DEFAULT path: when a durable overlay exists,
// `templateFor()` returns a clone whose feature prevalences are the
// persisted blend. When NO overlay exists (the default everywhere today),
// `templateFor()` returns the exact static template object unchanged —
// byte-identical, so every pre-U-FGE03 test/caller is unaffected.
//
// Fail-soft by construction (R12): a missing overlay → static template
// silently (the normal state); a CORRUPT/oversized/out-of-range overlay →
// static template + a recorded `error` surfaced via `overlayStatus()` —
// NEVER silently applies garbage prevalences to a build sequence.

/** 16 MB cap — mirrors the U-FGE01 dispatcher convention (host has hit V8
 * string-cap OOMs on >512MB JSON 3× this month; same class). */
const MAX_OVERLAY_BYTES = 16 * 1024 * 1024;

interface OverlayCacheEntry {
  path: string;
  mtimeMs: number;
  overlay: LearnedPrevalenceOverlay | null;
  error: string | null;
}
let _overlayCache: OverlayCacheEntry | null = null;

/** Call-time (NOT module-load) so per-test env overrides take effect. */
function overlayPathResolved(): string {
  const envPath = process.env.PRISM_CAD_PREVALENCE_OVERLAY_PATH;
  if (envPath && envPath.trim()) return envPath.trim();
  // dist/engines/CADClassFeatureLibraryEngine.js -> ../.. = mcp-server/
  const engineDir = dirname(fileURLToPath(import.meta.url));
  const mcpRoot = resolve(engineDir, "..", "..");
  return resolve(mcpRoot, "data/state/cad-learned-prevalence-overlay.json");
}

function overlayDisabled(): boolean {
  return process.env.PRISM_CAD_PREVALENCE_OVERLAY_DISABLE === "1";
}

/**
 * Lazily load + mtime-cache the overlay. Pure of throw — every failure path
 * yields `{ overlay:null, error }` so `templateFor` degrades to the static
 * template loudly (the error is surfaced through `overlayStatus()`).
 */
function loadPrevalenceOverlay(): OverlayCacheEntry {
  const path = overlayPathResolved();
  if (overlayDisabled()) {
    return { path, mtimeMs: 0, overlay: null, error: null };
  }
  let mtimeMs = 0;
  try {
    const st = statSync(path);
    mtimeMs = st.mtimeMs;
    if (_overlayCache && _overlayCache.path === path && _overlayCache.mtimeMs === mtimeMs) {
      return _overlayCache;
    }
    if (st.size > MAX_OVERLAY_BYTES) {
      const entry: OverlayCacheEntry = {
        path, mtimeMs, overlay: null,
        error: `overlay exceeds ${MAX_OVERLAY_BYTES} byte cap (size=${st.size}) — refusing to JSON.parse`,
      };
      _overlayCache = entry;
      return entry;
    }
    const raw = readFileSync(path, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (
      !parsed || typeof parsed !== "object" ||
      typeof (parsed as LearnedPrevalenceOverlay).prevalence !== "object" ||
      (parsed as LearnedPrevalenceOverlay).prevalence === null ||
      Array.isArray((parsed as LearnedPrevalenceOverlay).prevalence)
    ) {
      const entry: OverlayCacheEntry = {
        path, mtimeMs, overlay: null,
        error: "overlay parsed but shape invalid (expected { prevalence: Record<class, Record<feature, number>> })",
      };
      _overlayCache = entry;
      return entry;
    }
    const entry: OverlayCacheEntry = {
      path, mtimeMs, overlay: parsed as LearnedPrevalenceOverlay, error: null,
    };
    _overlayCache = entry;
    return entry;
  } catch (e: unknown) {
    const code = (e as { code?: string }).code;
    if (code === "ENOENT") {
      // The normal state today — no overlay persisted yet. Not an error.
      const entry: OverlayCacheEntry = { path, mtimeMs: 0, overlay: null, error: null };
      _overlayCache = entry;
      return entry;
    }
    const entry: OverlayCacheEntry = {
      path, mtimeMs, overlay: null,
      error: e instanceof Error ? e.message : String(e),
    };
    _overlayCache = entry;
    return entry;
  }
}

/**
 * Apply the overlay's blended prevalences over a static template, returning
 * a NEW object (the static `LIBRARY` const is never mutated). Only finite,
 * in-[0,1] overlay values override; anything else leaves the static value
 * intact. `expected_feature_count` is recomputed as Σ prevalence so
 * `predictVisualFidelity`'s `covered/total` invariant (score ≤ 1 when all
 * features planned) is preserved under the overlay.
 */
function applyOverlay(tmpl: ClassFeatureTemplate, byKind: Record<string, number>): ClassFeatureTemplate {
  let changed = false;
  const features = tmpl.features.map((f) => {
    const v = byKind[f.kind];
    if (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1 && v !== f.prevalence) {
      changed = true;
      return { ...f, prevalence: v };
    }
    return f;
  });
  if (!changed) return tmpl;
  const expected_feature_count = features.reduce((s, f) => s + f.prevalence, 0);
  return { ...tmpl, features, expected_feature_count };
}

// ── Engine ──────────────────────────────────────────────────────────

export class CADClassFeatureLibraryEngine {
  /**
   * Returns the class-typical feature decomposition for a given PartClass.
   * Returns null if the class has no template yet (caller should fall back
   * to flagExpectedFeatures + macro-only build).
   */
  templateFor(partClass: PartClass): ClassFeatureTemplate | null {
    const tmpl = LIBRARY[partClass] ?? null;
    if (!tmpl) return null;
    // U-FGE03: auto-apply the persisted learned-prevalence blend on the
    // DEFAULT path. No overlay (the state everywhere today) → static
    // template returned by identity, byte-identical to pre-U-FGE03.
    const { overlay } = loadPrevalenceOverlay();
    if (!overlay) return tmpl;
    const byKind = overlay.prevalence?.[partClass];
    if (!byKind || typeof byKind !== "object") return tmpl;
    return applyOverlay(tmpl, byKind);
  }

  /**
   * U-FGE03 — the RAW static template, overlay NEVER applied. This is the
   * pre-U-FGE03 `templateFor` behavior, preserved deliberately for the
   * U-FGE01 evidence path.
   *
   * `buildSequenceForEvidence` uses this (not the overlay-aware
   * `templateFor`) as its drift-comparison baseline. FGE01's drift signal is
   * DEFINED as "the *hand-tuned/static* template thinks this feature is
   * class-typical (≥0.7), but the trained corpus disagrees → retrain
   * signal." If that baseline were the overlay-blended prevalence (which
   * already incorporates corpus evidence via `applyLearned`'s α-blend), the
   * comparison degenerates toward corpus-vs-corpus and systematically
   * UNDER-reports drift — silently blinding a fail-loud diagnostic that
   * exists specifically to catch model rot (per-file scrutiny arm B, P1-1).
   * The default build path (`buildSequenceFor` / `predictVisualFidelity` /
   * orchestrator) intentionally keeps the overlay-aware `templateFor`.
   */
  templateForStatic(partClass: PartClass): ClassFeatureTemplate | null {
    return LIBRARY[partClass] ?? null;
  }

  /**
   * U-FGE03 — R12 visibility into whether the learned-prevalence overlay is
   * present, fresh, and being applied to the default build-sequence path.
   * Surfaced via the `cad_corpus_overlay_status` dispatcher action so an
   * operator can confirm the trained blend actually reaches inference (the
   * exact thing that was silently NOT happening pre-U-FGE03).
   */
  overlayStatus(): {
    present: boolean;
    applied: boolean;
    disabled: boolean;
    path: string;
    generated_at: string | null;
    source: string | null;
    classes_count: number;
    error: string | null;
  } {
    const disabled = overlayDisabled();
    const entry = loadPrevalenceOverlay();
    const ov = entry.overlay;
    return {
      present: ov !== null,
      applied: ov !== null && !disabled,
      disabled,
      path: entry.path,
      generated_at: ov?.generated_at ?? null,
      source: ov?.source ?? null,
      classes_count: ov ? Object.keys(ov.prevalence ?? {}).length : 0,
      error: entry.error,
    };
  }

  /**
   * Test seam — drop the memoized overlay so the next `templateFor()` /
   * `overlayStatus()` re-reads from disk. Production never needs this (the
   * mtime check auto-invalidates when a peer rewrites the overlay).
   *
   * SCOPE: `_overlayCache` is a MODULE-level singleton, shared by every
   * `CADClassFeatureLibraryEngine` instance AND the exported
   * `cadClassFeatureLibraryEngine` AND any `await import()` caller in the
   * same process. This method clears that one shared cell. Test contract:
   * any suite that writes an overlay MUST call `clearOverlayCache()` in
   * `afterEach` and point `PRISM_CAD_PREVALENCE_OVERLAY_PATH` at a per-test
   * tmp file (never the real `data/state/` default) so a written overlay
   * cannot leak into a sibling test via the shared cache.
   */
  clearOverlayCache(): void {
    _overlayCache = null;
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
   *
   * U-FGE03 regime note: this uses the overlay-aware `templateFor`, so when
   * a learned-prevalence overlay is active the score is computed against the
   * TRAINED prevalences, not the static ones. The covered/total invariant
   * (score ≤ 1 when all features planned) still holds — `applyOverlay`
   * recomputes `expected_feature_count` as Σ blended prevalence so numerator
   * and denominator stay consistent. The worked example above is the
   * STATIC-regime (no-overlay) walkthrough; under an active overlay the
   * literal numbers shift toward the corpus-measured prevalences by design.
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

  /**
   * Evidence-driven build sequence — same as `buildSequenceFor` but ranks +
   * filters features by LIVE corpus evidence (count / files_examined) instead
   * of the static template prevalence. This closes the gap where a static
   * template prevalence drifts from what the trained STEP geometry corpus
   * actually shows for that part_class.
   *
   * Pure (no I/O). Caller injects the corpus report via `opts.corpus_report`;
   * the dispatcher reads `state/cad-corpus-step-geometry-report.json` and
   * passes it through. When the corpus has no entry for `partClass`, falls
   * back to template prevalence with an explicit caveat (R12 fail-loud — never
   * silently substitutes).
   *
   * Feature ordering: descending by `evidence_ratio`. Ties broken by static
   * template prevalence (which preserves the build-axis-first convention —
   * `stepped_revolved_axis` always at the top because its template prevalence
   * is 1.0).
   *
   * @param partClass — class identifier matching the static template.
   * @param opts — corpus report + thresholds.
   * @returns sequence + caveats + corpus_class_found flag for caller diagnostics.
   */
  buildSequenceForEvidence(
    partClass: PartClass,
    opts: BuildSequenceEvidenceOpts,
  ): BuildSequenceEvidenceResult {
    const minRatio = opts.min_evidence_ratio ?? 0.3;
    const fallbackPrev = opts.fallback_prevalence_threshold ?? 0.5;
    const caveats: string[] = [];

    // U-FGE03 P1-1: STATIC template (overlay NEVER applied) is the drift
    // baseline. FGE01's drift caveat = "static template vs trained corpus";
    // using the overlay-blended prevalence here would degenerate to
    // corpus-vs-corpus and silently under-report drift (per-file scrutiny
    // arm B). The DEFAULT path keeps the overlay-aware `templateFor`.
    const tmpl = this.templateForStatic(partClass);
    if (!tmpl) {
      caveats.push(`no template for part_class "${partClass}" — empty sequence`);
      return { sequence: [], caveats, corpus_class_found: false };
    }

    const corpus = opts.corpus_report;
    if (!corpus || !Array.isArray(corpus.per_class)) {
      caveats.push("corpus_report missing or malformed — falling back to template prevalence");
      const fallback = tmpl.features
        .filter((f) => f.prevalence >= fallbackPrev)
        .map((f) => ({ ...f, evidence_count: 0, evidence_ratio: 0, source: "template_fallback" as const }));
      return { sequence: fallback, caveats, corpus_class_found: false };
    }

    const classEntry = corpus.per_class.find((c) => c.part_class === partClass);
    if (!classEntry) {
      caveats.push(`corpus has no entry for part_class "${partClass}" — falling back to template prevalence`);
      const fallback = tmpl.features
        .filter((f) => f.prevalence >= fallbackPrev)
        .map((f) => ({ ...f, evidence_count: 0, evidence_ratio: 0, source: "template_fallback" as const }));
      return { sequence: fallback, caveats, corpus_class_found: false };
    }

    const examined = classEntry.files_examined;
    if (!Number.isFinite(examined) || examined <= 0) {
      caveats.push(`corpus entry for "${partClass}" has files_examined=${examined} (invalid) — falling back`);
      const fallback = tmpl.features
        .filter((f) => f.prevalence >= fallbackPrev)
        .map((f) => ({ ...f, evidence_count: 0, evidence_ratio: 0, source: "template_fallback" as const }));
      return { sequence: fallback, caveats, corpus_class_found: false };
    }

    const counts = classEntry.feature_evidence_counts || {};

    // Hardened count reader — handles NaN-poisoning from corrupt/hostile corpus
    // entries (e.g. `{ central_oil_hole: { nested: 5 } }` → `Number({...}) = NaN`).
    // Non-finite values become 0 with a per-feature caveat so the drift signal
    // doesn't silently fail (NaN < minRatio is `false`, which would suppress
    // drift detection — exactly the load-bearing diagnostic of this method).
    const safeCount = (rawKind: string): number => {
      const raw = counts[rawKind];
      const n = Number(raw ?? 0);
      if (!Number.isFinite(n)) {
        caveats.push(`corrupt corpus count for feature "${rawKind}" (value ${JSON.stringify(raw)} → not finite); treated as 0`);
        return 0;
      }
      return n;
    };

    // Drift caveats fire BEFORE the ranked-length check — drift is most useful
    // exactly when corpus evidence disagrees with template prevalence (low-ratio
    // case). Flag template-listed features that the corpus says are RARER than
    // expected (template prevalence high but corpus evidence_ratio below the
    // inclusion threshold). These are signals for the next training pass.
    for (const f of tmpl.features) {
      const count = safeCount(f.kind);
      const ratio = count / examined;
      if (f.prevalence >= DRIFT_TEMPLATE_PREVALENCE_THRESHOLD && ratio < minRatio) {
        caveats.push(
          `drift: feature "${f.kind}" template_prevalence=${f.prevalence} but corpus_evidence_ratio=${ratio.toFixed(3)} ` +
          `(${count}/${examined}) — consider retraining template`,
        );
      }
    }

    const ranked = tmpl.features
      .map((f) => {
        const count = safeCount(f.kind);
        const ratio = count / examined;
        return { ...f, evidence_count: count, evidence_ratio: ratio, source: "corpus" as const };
      })
      .filter((f) => f.evidence_ratio >= minRatio)
      .sort((a, b) => {
        if (b.evidence_ratio !== a.evidence_ratio) return b.evidence_ratio - a.evidence_ratio;
        return b.prevalence - a.prevalence;
      });

    if (ranked.length === 0) {
      caveats.push(
        `no template features cleared min_evidence_ratio=${minRatio} for "${partClass}" ` +
        `(examined=${examined}); template_prevalence_threshold=${fallbackPrev} fallback applied`,
      );
      const fallback = tmpl.features
        .filter((f) => f.prevalence >= fallbackPrev)
        .map((f) => {
          const count = safeCount(f.kind);
          return { ...f, evidence_count: count, evidence_ratio: count / examined, source: "template_fallback" as const };
        });
      return { sequence: fallback, caveats, corpus_class_found: true };
    }

    return { sequence: ranked, caveats, corpus_class_found: true };
  }
}

export const cadClassFeatureLibraryEngine = new CADClassFeatureLibraryEngine();

// ── Evidence-driven build-sequence types ───────────────────────────

/** Live STEP geometry corpus report shape (subset consumed here). */
export interface CADCorpusStepGeometryReport {
  per_class: Array<{
    part_class: string;
    files_examined: number;
    files_parse_ok?: number;
    feature_evidence_counts: Record<string, number>;
  }>;
}

/** Opts for `buildSequenceForEvidence`. */
export interface BuildSequenceEvidenceOpts {
  /** Live corpus report. Pass `null` to force template-prevalence fallback. */
  corpus_report: CADCorpusStepGeometryReport | null;
  /** Minimum evidence_ratio (count / files_examined) to include a feature. Default 0.3. */
  min_evidence_ratio?: number;
  /** Static prevalence threshold used when corpus is unavailable. Default 0.5. */
  fallback_prevalence_threshold?: number;
}

/** Result of `buildSequenceForEvidence`. */
export interface BuildSequenceEvidenceResult {
  sequence: Array<FeatureTemplate & {
    evidence_count: number;
    evidence_ratio: number;
    source: "corpus" | "template_fallback";
  }>;
  caveats: string[];
  corpus_class_found: boolean;
}
