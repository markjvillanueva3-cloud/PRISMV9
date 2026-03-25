/**
 * CADDrawingKnowledgeEngine — Drawing Procedures, GD&T Rules, Feature Modeling,
 * DFM Checks, and Fusion 360 Modeling Sequences
 *
 * Covers the engineering drawing and design intelligence that connects
 * CAD modeling to manufacturing:
 *   - GD&T symbol selection and datum scheme design
 *   - Drawing view layouts (orthographic, section, detail, auxiliary)
 *   - Feature-based modeling sequence (sketch→extrude→fillet order)
 *   - DFM design rules by process (milling, turning, sheet metal)
 *   - Tolerance/fit selection (ISO 286 hole/shaft basis)
 *   - Title block and BOM conventions
 *   - Fusion 360 modeling best practices and feature tree ordering
 *
 * Wires to: cadDispatcher, Fusion360CodeGeneratorEngine, Fusion360LiveBridgeEngine,
 *           GDTStackupEngine, MachiningKnowledgeBaseEngine
 *
 * @module engines/CADDrawingKnowledgeEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// GD&T SYMBOL SELECTION
// ============================================================================

/**
 * GD&T geometric tolerance types per ASME Y14.5-2018.
 * Source: ASME Y14.5-2018, Henzold "Geometrical Dimensioning and Tolerancing"
 */
export type GDTSymbol =
  | "straightness" | "flatness" | "circularity" | "cylindricity"
  | "profile_line" | "profile_surface"
  | "perpendicularity" | "angularity" | "parallelism"
  | "position" | "concentricity" | "symmetry"
  | "circular_runout" | "total_runout";

export type GDTCategory = "form" | "orientation" | "location" | "runout" | "profile";

export interface GDTRule {
  symbol: GDTSymbol;
  category: GDTCategory;
  unicode: string;
  needs_datum: boolean;
  typical_tolerance_mm: { tight: number; standard: number; loose: number };
  best_for: string;
  machining_impact: string;
  inspection_method: string;
  source: string;
}

export const GDT_RULES: GDTRule[] = [
  // Form (no datum required)
  { symbol: "flatness", category: "form", unicode: "⏥", needs_datum: false,
    typical_tolerance_mm: { tight: 0.005, standard: 0.025, loose: 0.1 },
    best_for: "Mating surfaces, sealing faces, datum features",
    machining_impact: "Requires face milling with sharp tool, light finish pass, no chatter",
    inspection_method: "Surface plate + indicator, CMM plane scan",
    source: "ASME Y14.5-2018 §5.3" },
  { symbol: "straightness", category: "form", unicode: "⏤", needs_datum: false,
    typical_tolerance_mm: { tight: 0.005, standard: 0.02, loose: 0.1 },
    best_for: "Shafts, edges, axis control on cylindrical features",
    machining_impact: "Requires between-centers or collet grip, light DOC finish",
    inspection_method: "V-blocks + indicator, optical comparator",
    source: "ASME Y14.5-2018 §5.2" },
  { symbol: "circularity", category: "form", unicode: "○", needs_datum: false,
    typical_tolerance_mm: { tight: 0.005, standard: 0.02, loose: 0.05 },
    best_for: "Bearing journals, seal bores, rotating shafts",
    machining_impact: "Requires rigid setup, low chatter, round insert or boring bar",
    inspection_method: "V-block rotation + indicator, roundness tester",
    source: "ASME Y14.5-2018 §5.4" },
  { symbol: "cylindricity", category: "form", unicode: "⌭", needs_datum: false,
    typical_tolerance_mm: { tight: 0.008, standard: 0.03, loose: 0.08 },
    best_for: "Bearing bores/journals where both roundness and straightness matter",
    machining_impact: "Most demanding form tolerance — grinding or honing often needed",
    inspection_method: "CMM cylinder scan, roundness tester at multiple Z heights",
    source: "ASME Y14.5-2018 §5.5" },

  // Profile
  { symbol: "profile_surface", category: "profile", unicode: "⌓", needs_datum: true,
    typical_tolerance_mm: { tight: 0.01, standard: 0.05, loose: 0.2 },
    best_for: "3D contour surfaces, complex molds, aerodynamic shapes",
    machining_impact: "Requires 5-axis or 3D finish milling, ball endmill, small scallop",
    inspection_method: "CMM scan, structured light scanner, GOM/ATOS",
    source: "ASME Y14.5-2018 §8" },
  { symbol: "profile_line", category: "profile", unicode: "⌒", needs_datum: true,
    typical_tolerance_mm: { tight: 0.01, standard: 0.05, loose: 0.15 },
    best_for: "2D profiles, cam shapes, seal grooves",
    machining_impact: "CNC profile milling with cutter comp, or wire EDM",
    inspection_method: "Optical comparator, CMM line scan",
    source: "ASME Y14.5-2018 §8" },

  // Orientation (needs datum)
  { symbol: "perpendicularity", category: "orientation", unicode: "⟂", needs_datum: true,
    typical_tolerance_mm: { tight: 0.01, standard: 0.03, loose: 0.1 },
    best_for: "Shoulders, faces perpendicular to bores/shafts, mounting surfaces",
    machining_impact: "Machine in single setup if possible, or use precision fixture",
    inspection_method: "Height gauge on surface plate, CMM",
    source: "ASME Y14.5-2018 §6.4" },
  { symbol: "parallelism", category: "orientation", unicode: "∥", needs_datum: true,
    typical_tolerance_mm: { tight: 0.008, standard: 0.025, loose: 0.08 },
    best_for: "Parallel faces (vise jaws, guide rails), bearing shoulders",
    machining_impact: "Both faces in same setup, or flip with precision datum",
    inspection_method: "Indicator on surface plate, CMM",
    source: "ASME Y14.5-2018 §6.3" },
  { symbol: "angularity", category: "orientation", unicode: "∠", needs_datum: true,
    typical_tolerance_mm: { tight: 0.01, standard: 0.04, loose: 0.15 },
    best_for: "Angled faces, V-grooves, tapers",
    machining_impact: "Sine bar setup or 5-axis indexed machining",
    inspection_method: "Sine bar + indicator, CMM angular scan",
    source: "ASME Y14.5-2018 §6.2" },

  // Location (needs datum)
  { symbol: "position", category: "location", unicode: "⌖", needs_datum: true,
    typical_tolerance_mm: { tight: 0.05, standard: 0.15, loose: 0.5 },
    best_for: "Hole patterns, bolt circles, pin locations — THE most common GD&T callout",
    machining_impact: "CNC drilling with accurate work offset, spot drill first",
    inspection_method: "CMM, go/no-go pin gauges with functional gauge",
    source: "ASME Y14.5-2018 §7" },
  { symbol: "concentricity", category: "location", unicode: "◎", needs_datum: true,
    typical_tolerance_mm: { tight: 0.015, standard: 0.05, loose: 0.1 },
    best_for: "Coaxial features (bore-to-OD, multi-diameter shafts)",
    machining_impact: "Machine both features in same chuck/setup, or use mandrel",
    inspection_method: "V-block rotation, CMM axis comparison",
    source: "ASME Y14.5-2018 §7.6" },

  // Runout (needs datum)
  { symbol: "circular_runout", category: "runout", unicode: "↗", needs_datum: true,
    typical_tolerance_mm: { tight: 0.01, standard: 0.03, loose: 0.08 },
    best_for: "Bearing journals, seal surfaces, rotating assemblies",
    machining_impact: "Turn between centers or in collet, no re-chucking",
    inspection_method: "Between centers + indicator rotation",
    source: "ASME Y14.5-2018 §9" },
  { symbol: "total_runout", category: "runout", unicode: "↗↗", needs_datum: true,
    typical_tolerance_mm: { tight: 0.015, standard: 0.05, loose: 0.1 },
    best_for: "Full surface runout control (shaft OD, face to axis)",
    machining_impact: "Most demanding runout — grinding or precision turning",
    inspection_method: "Between centers + indicator, full surface traverse",
    source: "ASME Y14.5-2018 §9" },
];

/**
 * Select GD&T symbol for a given feature and intent.
 */
export function selectGDT(params: {
  feature_type: "hole" | "shaft" | "face" | "slot" | "contour" | "bore" | "boss" | "thread";
  intent: "location" | "form" | "orientation" | "runout" | "profile" | "fit";
  mating_condition?: "clearance" | "transition" | "interference";
}): { recommended: GDTSymbol; alternatives: GDTSymbol[]; reasoning: string } {
  const { feature_type, intent } = params;

  if (intent === "location" && (feature_type === "hole" || feature_type === "boss" || feature_type === "bore")) {
    return { recommended: "position", alternatives: ["concentricity"], reasoning: "Position is the standard for locating holes/bores/bosses per Y14.5" };
  }
  if (intent === "form" && feature_type === "face") {
    return { recommended: "flatness", alternatives: ["profile_surface"], reasoning: "Flatness controls face form without datum reference" };
  }
  if (intent === "form" && (feature_type === "shaft" || feature_type === "bore")) {
    return { recommended: "cylindricity", alternatives: ["circularity", "straightness"], reasoning: "Cylindricity is the complete form control for round features" };
  }
  if (intent === "orientation" && feature_type === "face") {
    return { recommended: "perpendicularity", alternatives: ["parallelism", "angularity"], reasoning: "Perpendicularity is default for faces relative to datum axis" };
  }
  if (intent === "runout") {
    return { recommended: "circular_runout", alternatives: ["total_runout", "concentricity"], reasoning: "Circular runout for rotating parts; total runout for full surface control" };
  }
  if (intent === "profile" || feature_type === "contour") {
    return { recommended: "profile_surface", alternatives: ["profile_line"], reasoning: "Profile of a surface for 3D contours" };
  }
  return { recommended: "position", alternatives: ["profile_surface"], reasoning: "Position is the most common GD&T callout" };
}

// ============================================================================
// DATUM SCHEME DESIGN
// ============================================================================

export interface DatumScheme {
  primary: string;
  secondary: string;
  tertiary: string;
  reasoning: string[];
  setup_implications: string[];
}

export function designDatumScheme(params: {
  part_type: "prismatic" | "cylindrical" | "sheet" | "complex";
  primary_feature: string;
  functional_requirements: string[];
}): DatumScheme {
  const { part_type, primary_feature } = params;

  if (part_type === "cylindrical") {
    return {
      primary: "A — Axis of largest diameter (OD or bore)",
      secondary: "B — Perpendicular face (shoulder or end face)",
      tertiary: "C — Keyway, flat, or anti-rotation feature",
      reasoning: [
        "Cylindrical parts: axis is natural primary datum",
        "Face establishes axial position",
        "Anti-rotation feature (keyway/flat) completes constraint",
      ],
      setup_implications: [
        "Lathe: grip on datum A (OD), face datum B first",
        "Mill: V-block or collet on datum A, face B on parallels",
        "CMM: align axis A, then clock face B",
      ],
    };
  }
  if (part_type === "prismatic") {
    return {
      primary: "A — Largest flat face (seating surface)",
      secondary: "B — Longest edge or perpendicular face",
      tertiary: "C — Remaining perpendicular face or pin hole",
      reasoning: [
        "3-2-1 constraint: A removes 3 DOF (tilt + Z translation)",
        "B removes 2 DOF (Y translation + rotation about Z)",
        "C removes 1 DOF (X translation)",
        `Primary feature: ${primary_feature}`,
      ],
      setup_implications: [
        "Vise: datum A on parallels, datum B against fixed jaw",
        "Fixture plate: datum A on surface, B against stop, C against pin",
        "CMM: touch 3 points on A, 2 on B, 1 on C",
      ],
    };
  }
  return {
    primary: "A — Largest/most stable surface",
    secondary: "B — Perpendicular to A, functional mating surface",
    tertiary: "C — Completes 6-DOF constraint",
    reasoning: ["General 3-2-1 datum scheme"],
    setup_implications: ["Define based on functional requirements and machining access"],
  };
}

// ============================================================================
// DRAWING VIEW LAYOUT
// ============================================================================

export interface DrawingViewLayout {
  views: Array<{
    type: "front" | "top" | "right" | "left" | "bottom" | "back" | "isometric"
      | "section" | "detail" | "auxiliary" | "broken";
    purpose: string;
    scale?: string;
    notes: string[];
  }>;
  sheet_size: string;
  title_block_fields: string[];
  general_notes: string[];
}

export function planDrawingLayout(params: {
  part_type: "prismatic" | "cylindrical" | "sheet_metal" | "weldment" | "assembly";
  complexity: "simple" | "moderate" | "complex";
  has_internal_features: boolean;
  has_threads: boolean;
  max_dimension_mm: number;
}): DrawingViewLayout {
  const { part_type, complexity, has_internal_features, has_threads, max_dimension_mm } = params;

  // Sheet size selection
  const sheet = max_dimension_mm > 500 ? "C (22×17)" : max_dimension_mm > 200 ? "B (17×11)" : "A (11×8.5)";

  const views: DrawingViewLayout["views"] = [];

  if (part_type === "cylindrical") {
    views.push(
      { type: "front", purpose: "Primary view showing profile and length dimensions", notes: ["Horizontal axis convention", "Show centerlines"] },
      { type: "right", purpose: "End view showing cross-section and bolt pattern", notes: ["Show hidden lines for bores"] },
    );
    if (has_internal_features) {
      views.push({ type: "section", purpose: "Full longitudinal section showing bores, grooves, threads", scale: "1:1", notes: ["Section A-A through centerline", "Show thread callouts in section"] });
    }
  } else if (part_type === "prismatic") {
    views.push(
      { type: "front", purpose: "Primary view — most features visible", notes: ["Orient to show most detail"] },
      { type: "top", purpose: "Plan view — hole patterns, pocket layouts", notes: ["Show hole callouts here"] },
      { type: "right", purpose: "Side view — depth dimensions, profiles", notes: ["Show hidden lines if needed"] },
    );
    if (has_internal_features) {
      views.push({ type: "section", purpose: "Cross-section through pockets/bores", notes: ["Section A-A, hatching per material"] });
    }
  } else if (part_type === "sheet_metal") {
    views.push(
      { type: "isometric", purpose: "3D view of formed part", notes: ["Show bend directions"] },
      { type: "front", purpose: "Flat pattern with bend lines", notes: ["Show bend radii, K-factor notes"] },
    );
  } else if (part_type === "assembly") {
    views.push(
      { type: "isometric", purpose: "Exploded isometric with balloons", notes: ["Item numbers match BOM"] },
      { type: "front", purpose: "Cross-section showing internal assembly", notes: ["Section through critical interfaces"] },
    );
  }

  // Add detail views for complex parts
  if (complexity === "complex") {
    views.push({ type: "detail", purpose: "Enlarged view of tight-tolerance features", scale: "2:1", notes: ["Circle detail area on parent view"] });
  }
  if (has_threads) {
    views.push({ type: "detail", purpose: "Thread callout detail", scale: "2:1", notes: ["Show thread major/minor dia, class, pitch"] });
  }

  // Always add isometric for context
  if (!views.some(v => v.type === "isometric")) {
    views.push({ type: "isometric", purpose: "3D orientation reference", notes: ["No dimensions on iso view"] });
  }

  return {
    views,
    sheet_size: sheet,
    title_block_fields: [
      "Part Number", "Part Name", "Material", "Finish",
      "Drawn By", "Checked By", "Approved By", "Date",
      "Scale", "Sheet __ of __", "Revision", "Weight",
      "Third Angle Projection symbol",
    ],
    general_notes: [
      "UNLESS OTHERWISE SPECIFIED:",
      "1. DIMENSIONS ARE IN MILLIMETERS",
      "2. TOLERANCES: LINEAR ±0.1, ANGULAR ±0.5°",
      "3. SURFACE FINISH: Ra 3.2 µm",
      "4. BREAK SHARP EDGES 0.2-0.5mm",
      "5. INTERPRET PER ASME Y14.5-2018",
      "6. MATERIAL CERT REQUIRED PER [SPEC]",
      ...(has_threads ? ["7. THREADS PER ASME B1.1 (UNIFIED) OR ISO 261 (METRIC)"] : []),
    ],
  };
}

// ============================================================================
// FEATURE-BASED MODELING SEQUENCE
// ============================================================================

/**
 * Fusion 360 / parametric CAD modeling rules.
 * Source: Autodesk Fusion 360 best practices, PTC Creo guidelines, industry experience
 */
export const MODELING_SEQUENCE_RULES = {
  general_order: [
    "1. Base feature: largest extrusion or revolution (defines overall shape)",
    "2. Major subtractive features: through-holes, large pockets, cutouts",
    "3. Secondary additive features: bosses, ribs, gussets",
    "4. Secondary subtractive features: smaller holes, counterbores, slots",
    "5. Patterns: linear/circular patterns of repeated features",
    "6. Fillets: largest first, then progressively smaller",
    "7. Chamfers: after fillets (chamfers on filleted edges = complex intersection)",
    "8. Cosmetic features: engravings, logos, textures (last — don't constrain on these)",
    "9. Sheet metal bends (if applicable) — after all flat features",
  ],
  fusion360_tips: [
    "Start sketches from origin planes (XY, XZ, YZ) — not offset planes when possible",
    "Use construction geometry for reference, not real geometry",
    "Constrain sketches FULLY (black = constrained, blue = under-constrained)",
    "Use 'Capture Design History' for parametric modeling (timeline-based)",
    "Name features and sketches meaningfully (not 'Sketch1', 'Extrude1')",
    "Use user parameters for all key dimensions (Design → Parameters → +)",
    "Create components early — don't model everything in one body",
    "Use joints for assemblies, not manually positioning bodies",
    "Mirror features instead of duplicating — maintains symmetry",
    "Avoid tiny features early in the tree — they make later operations fragile",
  ],
  anti_patterns: [
    "DON'T: Create fillets before finishing all prismatic features (fillets break edges)",
    "DON'T: Pattern features that have fillets (pattern the raw feature, then fillet)",
    "DON'T: Use 'Push/Pull' for parametric dimensions (use extrude with value)",
    "DON'T: Sketch on faces of existing features (fragile parent-child — use offset planes)",
    "DON'T: Combine bodies before you're sure of the design (union is hard to undo)",
    "DON'T: Use tiny draft angles before filleting (order matters for injection mold features)",
    "DON'T: Forget to check 'Symmetric' for center-origin bosses/pockets",
  ],
  source: "Autodesk Fusion 360 best practices, PTC Creo modeling standards",
};

// ============================================================================
// DFM (DESIGN FOR MANUFACTURABILITY) RULES
// ============================================================================

export interface DFMRule {
  id: string;
  process: "milling" | "turning" | "drilling" | "sheet_metal" | "injection_mold" | "casting" | "3d_print" | "general";
  rule: string;
  violation_example: string;
  fix: string;
  severity: "critical" | "warning" | "suggestion";
  cost_impact: string;
  source: string;
}

export const DFM_RULES: DFMRule[] = [
  // Milling
  { id: "DFM-M01", process: "milling", rule: "Internal corner radii must equal tool radius (minimum R1mm for practical tools)", violation_example: "Sharp internal corner (R0) in pocket", fix: "Add fillet radius ≥ tool radius + 10%", severity: "critical", cost_impact: "Sharp corners require EDM or special tooling — 5-10× cost increase", source: "Industry standard" },
  { id: "DFM-M02", process: "milling", rule: "Pocket depth ≤ 4× tool diameter for standard tools", violation_example: "20mm wide pocket, 100mm deep", fix: "Reduce depth or widen pocket. If unavoidable, use long-reach tools with reduced speeds", severity: "warning", cost_impact: "Deep pockets need special tooling, multiple passes, risk of chatter", source: "Sandvik GC 2023" },
  { id: "DFM-M03", process: "milling", rule: "Wall thickness ≥ 1.5mm for steel, ≥ 0.8mm for aluminum", violation_example: "0.5mm wall in steel pocket", fix: "Increase wall thickness or add ribs", severity: "critical", cost_impact: "Thin walls deflect during machining — scrap risk", source: "Industry standard" },
  { id: "DFM-M04", process: "milling", rule: "Avoid undercuts unless necessary (requires 5-axis or special tools)", violation_example: "T-slot on 3-axis mill", fix: "Redesign to eliminate undercut or specify 5-axis machining", severity: "warning", cost_impact: "Undercuts add 30-50% to machining cost", source: "Industry standard" },
  { id: "DFM-M05", process: "milling", rule: "Standard hole sizes preferred (1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20mm)", violation_example: "7.3mm hole (non-standard)", fix: "Use nearest standard drill size or specify reamed hole", severity: "suggestion", cost_impact: "Non-standard holes require interpolation or special drills", source: "Machinery's Handbook" },
  { id: "DFM-M06", process: "milling", rule: "Hole depth ≤ 10× diameter for standard drills", violation_example: "5mm hole, 80mm deep", fix: "Use stepped drilling, gun drill, or EDM for L/D > 10", severity: "critical", cost_impact: "Deep holes need special tooling, peck cycles, through-tool coolant", source: "Walter 2009" },

  // Turning
  { id: "DFM-T01", process: "turning", rule: "Avoid sharp corners between diameters — add 0.2-0.5mm radius or 0.5×45° chamfer", violation_example: "Sharp step from Ø30 to Ø20", fix: "Add R0.3 fillet or C0.5 chamfer", severity: "warning", cost_impact: "Sharp corners cause stress concentration + tool breakage risk", source: "Industry standard" },
  { id: "DFM-T02", process: "turning", rule: "Groove width ≥ 2mm for standard tooling", violation_example: "1mm wide groove", fix: "Widen to 2mm or specify narrow grooving insert", severity: "warning", cost_impact: "Narrow grooves need fragile tooling, slower feeds", source: "Sandvik GC 2023" },
  { id: "DFM-T03", process: "turning", rule: "Part L/D ≤ 4 without tailstock, ≤ 8 with tailstock, ≤ 12 with steady rest", violation_example: "Ø20 × 300mm shaft (L/D=15)", fix: "Use steady rest, between-centers, or redesign to shorter length", severity: "critical", cost_impact: "High L/D causes chatter, taper error, poor finish", source: "Haas Lathe Workbook" },
  { id: "DFM-T04", process: "turning", rule: "Thread runout length ≥ 2× pitch", violation_example: "M10×1.5 thread ending at shoulder", fix: "Add 3mm runout groove or undercut before shoulder", severity: "critical", cost_impact: "No runout = thread tool crashes into shoulder", source: "Industry standard" },

  // Drilling
  { id: "DFM-D01", process: "drilling", rule: "Flat entry surface for drill (not angled or curved)", violation_example: "Drilling into a curved surface at 30°", fix: "Add a flat spot-face or use a milled flat before drilling", severity: "warning", cost_impact: "Angled entry deflects drill — position error and breakage risk", source: "Walter 2009" },
  { id: "DFM-D02", process: "drilling", rule: "Hole spacing ≥ 2× diameter center-to-center", violation_example: "Two Ø10 holes with 15mm center distance", fix: "Space holes ≥ 20mm apart", severity: "warning", cost_impact: "Close holes create thin wall — breakout risk", source: "Industry standard" },
  { id: "DFM-D03", process: "drilling", rule: "Threaded hole depth ≥ 1.5× major diameter for steel, ≥ 2× for aluminum", violation_example: "M8 tapped 8mm deep in aluminum", fix: "Tap to 16mm depth for adequate thread engagement", severity: "critical", cost_impact: "Shallow threads strip under load", source: "Machinery's Handbook" },

  // Sheet Metal
  { id: "DFM-S01", process: "sheet_metal", rule: "Bend radius ≥ material thickness", violation_example: "1mm sheet with 0.5mm bend radius", fix: "Use R ≥ 1.0mm (1× thickness)", severity: "critical", cost_impact: "Tight bends crack — scrap", source: "Industry standard" },
  { id: "DFM-S02", process: "sheet_metal", rule: "Hole-to-bend distance ≥ 2× thickness + bend radius", violation_example: "Hole 2mm from bend line in 1.5mm sheet", fix: "Move hole ≥ 4.5mm from bend line", severity: "critical", cost_impact: "Hole distorts during bending", source: "Industry standard" },
  { id: "DFM-S03", process: "sheet_metal", rule: "Flange length ≥ 4× material thickness", violation_example: "3mm flange on 2mm sheet", fix: "Minimum 8mm flange length", severity: "warning", cost_impact: "Short flanges don't grip in press brake die", source: "Industry standard" },

  // General
  { id: "DFM-G01", process: "general", rule: "Avoid tolerances tighter than necessary — each step below ±0.1mm roughly doubles cost", violation_example: "±0.01mm on non-functional dimension", fix: "Use ±0.1mm for non-critical, ±0.025mm for fits, ±0.01mm only where function demands", severity: "suggestion", cost_impact: "Tight tolerance = more passes, slower feed, inspection time", source: "Industry standard" },
  { id: "DFM-G02", process: "general", rule: "Consistent datum scheme — manufacturing and inspection should use same datums", violation_example: "Drawing datums on unmachined surfaces", fix: "Place datums on machined surfaces that are established in Op1", severity: "critical", cost_impact: "Mismatched datums cause cumulative tolerance error", source: "ASME Y14.5-2018" },
];

// ============================================================================
// ISO 286 FIT SELECTION
// ============================================================================

export interface FitRecommendation {
  fit_type: "clearance" | "transition" | "interference";
  hole_tolerance: string;
  shaft_tolerance: string;
  example: string;
  application: string;
}

export const COMMON_FITS: FitRecommendation[] = [
  // Clearance fits
  { fit_type: "clearance", hole_tolerance: "H7", shaft_tolerance: "f6", example: "H7/f6", application: "Running fit — bearings, rotating shafts, sliding fits" },
  { fit_type: "clearance", hole_tolerance: "H7", shaft_tolerance: "g6", example: "H7/g6", application: "Sliding fit — pistons, close-running fits, spigot joints" },
  { fit_type: "clearance", hole_tolerance: "H9", shaft_tolerance: "d9", example: "H9/d9", application: "Loose running fit — agricultural equipment, rough mechanisms" },
  { fit_type: "clearance", hole_tolerance: "H11", shaft_tolerance: "c11", example: "H11/c11", application: "Very loose fit — large clearance, easy assembly" },

  // Transition fits
  { fit_type: "transition", hole_tolerance: "H7", shaft_tolerance: "k6", example: "H7/k6", application: "Push fit — dowel pins, location features, light press" },
  { fit_type: "transition", hole_tolerance: "H7", shaft_tolerance: "js6", example: "H7/js6", application: "Precision location — accurate alignment, easy assembly/disassembly" },
  { fit_type: "transition", hole_tolerance: "H7", shaft_tolerance: "m6", example: "H7/m6", application: "Tight push fit — may need rubber mallet, keyed assemblies" },

  // Interference fits
  { fit_type: "interference", hole_tolerance: "H7", shaft_tolerance: "p6", example: "H7/p6", application: "Light press fit — bearings into housings, pulleys on shafts" },
  { fit_type: "interference", hole_tolerance: "H7", shaft_tolerance: "r6", example: "H7/r6", application: "Medium press fit — permanent assembly, gear on shaft" },
  { fit_type: "interference", hole_tolerance: "H7", shaft_tolerance: "s6", example: "H7/s6", application: "Heavy press fit — shrink fit, requires heating/cooling" },
];

export function selectFit(params: {
  application: "rotating" | "sliding" | "locating" | "press_fit" | "shrink_fit" | "loose";
  size_range_mm?: number;
}): FitRecommendation {
  switch (params.application) {
    case "rotating": return COMMON_FITS.find(f => f.example === "H7/f6")!;
    case "sliding": return COMMON_FITS.find(f => f.example === "H7/g6")!;
    case "locating": return COMMON_FITS.find(f => f.example === "H7/k6")!;
    case "press_fit": return COMMON_FITS.find(f => f.example === "H7/p6")!;
    case "shrink_fit": return COMMON_FITS.find(f => f.example === "H7/s6")!;
    case "loose": return COMMON_FITS.find(f => f.example === "H9/d9")!;
    default: return COMMON_FITS.find(f => f.example === "H7/g6")!;
  }
}

// ============================================================================
// ADVANCED G-CODE PATTERNS (Macros / Subprograms)
// ============================================================================

/**
 * Common G-code macro patterns for production programming.
 * Source: Haas Macro Programming, Fanuc Custom Macro B
 */
export const GCODE_MACRO_PATTERNS = {
  tool_wear_check: {
    description: "Auto-offset tool wear compensation using probing",
    gcode: [
      "#100 = #5021 (Read current X machine position)",
      "#101 = #[5201 + [#4120 * 20]] (Read active tool offset)",
      "G65 P9995 T#4120 (Measure tool on setter)",
      "#102 = #5021 (Post-probe X position)",
      "IF [ABS[#102 - #100] GT 0.05] GOTO 999 (Breakage alarm if > 0.05mm)",
    ],
    source: "Haas Macro Programming Guide",
  },
  part_counter: {
    description: "Count parts, stop for inspection at interval",
    gcode: [
      "#500 = #500 + 1 (Increment part counter — persistent variable)",
      "IF [#500 MOD 25 EQ 0] GOTO 100 (Every 25 parts → inspection stop)",
      "GOTO 200 (Skip inspection)",
      "N100 M00 (STOP — INSPECT PART #500)",
      "N200 (Continue machining)",
    ],
    source: "Haas Macro Programming",
  },
  parametric_bolt_circle: {
    description: "Macro for drilling any bolt circle pattern",
    gcode: [
      "(G65 P9100 D#holes C#diameter A#start_angle Z#depth R#retract F#feed)",
      "O9100 (Bolt circle macro)",
      "#10 = #7 (D = number of holes)",
      "#11 = #3 (C = bolt circle diameter)",
      "#12 = [360 / #10] (Angular spacing)",
      "#13 = #1 (A = start angle)",
      "WHILE [#10 GT 0] DO1",
      "  #14 = [#11/2 * COS[#13]] (X position)",
      "  #15 = [#11/2 * SIN[#13]] (Y position)",
      "  G81 X#14 Y#15 Z#26 R#18 F#9",
      "  #13 = #13 + #12 (Next angle)",
      "  #10 = #10 - 1",
      "END1",
      "G80 M99",
    ],
    source: "Fanuc Custom Macro B, Haas Macro",
  },
  adaptive_feed_override: {
    description: "Dynamic feed adjustment based on spindle load",
    gcode: [
      "#100 = #3028 (Read current spindle load %)",
      "IF [#100 GT 80] THEN #101 = 70 (High load → 70% feed)",
      "IF [#100 GT 60 AND #100 LE 80] THEN #101 = 90 (Medium → 90%)",
      "IF [#100 LE 60] THEN #101 = 100 (Low load → 100%)",
      "(Apply: embed in cutting loop, set feed override #101%)",
    ],
    source: "Haas Macro Programming, adaptive machining concept",
  },
  subprogram_multi_fixture: {
    description: "Run same program on multiple fixtures/work offsets",
    gcode: [
      "O0001 (Main program)",
      "#501 = 54 (Start at G54)",
      "WHILE [#501 LE 57] DO1 (G54 through G57 — 4 fixtures)",
      "  G[#501] (Activate work offset)",
      "  M98 P0002 (Call machining subprogram)",
      "  #501 = #501 + 1",
      "END1",
      "M30",
      "",
      "O0002 (Machining subprogram)",
      "(All machining operations here)",
      "M99 (Return to main)",
    ],
    source: "Haas Programming Workbook",
  },
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class CADDrawingKnowledgeEngine {
  readonly name = "CADDrawingKnowledgeEngine";
  readonly version = "1.0.0";

  calculate(action: string, params: Record<string, unknown>): unknown {
    switch (action) {
      case "cad_select_gdt": return selectGDT(params as any);
      case "cad_get_gdt_rules": return { rules: GDT_RULES, count: GDT_RULES.length };
      case "cad_design_datums": return designDatumScheme(params as any);
      case "cad_plan_drawing": return planDrawingLayout(params as any);
      case "cad_modeling_rules": return MODELING_SEQUENCE_RULES;
      case "cad_dfm_check": return this.dfmCheckEnhanced(params);
      case "cad_get_dfm_rules": return this.getDfmRulesEnhanced();
      case "cad_select_fit": return selectFit(params as any);
      case "cad_get_fits": return { fits: COMMON_FITS };
      case "cad_get_macro_patterns": return GCODE_MACRO_PATTERNS;
      case "cad_fusion_modeling_tips": return {
        sequence: MODELING_SEQUENCE_RULES.general_order,
        tips: MODELING_SEQUENCE_RULES.fusion360_tips,
        anti_patterns: MODELING_SEQUENCE_RULES.anti_patterns,
      };
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  /**
   * Enhanced DFM check — delegates to existing DfMRulesEngine (630 lines)
   * when available, falls back to our inline DFM_RULES for supplementary checks.
   * This avoids duplicating the existing 630-line engine.
   */
  private async getDfmRulesEnhanced() {
    try {
      const { checkDfMRules } = await import("./DfMRulesEngine.js");
      return { existing_engine: "DfMRulesEngine (630 lines)", supplementary_rules: DFM_RULES, total: DFM_RULES.length, note: "Primary DFM: use checkDfMRules() from DfMRulesEngine. Supplementary rules here." };
    } catch {
      return { rules: DFM_RULES, count: DFM_RULES.length };
    }
  }

  private async dfmCheckEnhanced(params: Record<string, unknown>) {
    // Try delegating to existing DfMRulesEngine first
    try {
      const { checkDfMRules } = await import("./DfMRulesEngine.js");
      const result = checkDfMRules(params as any);
      if (result) {
        return { ...result, source: "DfMRulesEngine (primary)", supplementary_check: this.dfmCheckLocal(params) };
      }
    } catch { /* fall through to local check */ }
    return this.dfmCheckLocal(params);
  }

  private dfmCheckLocal(params: Record<string, unknown>) {
    const processes = (params.processes as string[]) || ["milling", "general"];
    const violations: DFMRule[] = [];
    const suggestions: DFMRule[] = [];

    // Filter rules by requested processes
    const relevant = DFM_RULES.filter(r => processes.includes(r.process) || r.process === "general");

    // If specific features are provided, match against rules
    const features = params.features as Array<{ type: string; dimension_mm?: number; [key: string]: unknown }>;
    if (features) {
      for (const feat of features) {
        // Internal corner check
        if (feat.type === "pocket" && (!feat.corner_radius_mm || (feat.corner_radius_mm as number) < 1)) {
          violations.push(DFM_RULES.find(r => r.id === "DFM-M01")!);
        }
        // Deep pocket check
        if (feat.type === "pocket" && feat.depth_mm && feat.width_mm && (feat.depth_mm as number) > (feat.width_mm as number) * 2) {
          violations.push(DFM_RULES.find(r => r.id === "DFM-M02")!);
        }
        // Thin wall check
        if (feat.type === "wall" && feat.dimension_mm && feat.dimension_mm < 1.5) {
          violations.push(DFM_RULES.find(r => r.id === "DFM-M03")!);
        }
        // Deep hole check
        if (feat.type === "hole" && feat.depth_mm && feat.diameter_mm &&
            (feat.depth_mm as number) > (feat.diameter_mm as number) * 10) {
          violations.push(DFM_RULES.find(r => r.id === "DFM-M06")!);
        }
      }
    }

    return {
      applicable_rules: relevant.length,
      violations: violations.filter(Boolean),
      violation_count: violations.filter(Boolean).length,
      all_rules: relevant,
      pass: violations.filter(Boolean).length === 0,
    };
  }
}

/** Singleton instance. */
export const cadDrawingKnowledgeEngine = new CADDrawingKnowledgeEngine();
