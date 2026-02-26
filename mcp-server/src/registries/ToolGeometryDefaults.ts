/**
 * PRISM MCP Server — Tool Geometry Default Lookup Tables
 * S1-MS1 P2-U01: Enrichment data for rake_angle, relief_angle, helix_angle
 *
 * Sources: Sandvik Coromant Technical Guide, ISO 3002-1, Machinery's Handbook 31st ed.
 * These are conservative industry-standard defaults per tool type.
 * Actual values vary by manufacturer, substrate, and application — these serve as
 * reasonable fallbacks for SFC calculations when catalog data is unavailable.
 *
 * SAFETY NOTE: These defaults are used only when catalog-specific values are missing.
 * The SFC engine applies a 10% safety margin on top of calculated forces.
 */

// ============================================================================
// GEOMETRY DEFAULTS BY TOOL TYPE
// ============================================================================

export interface ToolGeometryDefault {
  /** Radial rake angle in degrees (positive = sharp, negative = strong) */
  rake_angle_deg: number;
  /** Primary relief/clearance angle in degrees */
  relief_angle_deg: number;
  /** Helix angle in degrees (0 for straight flute) */
  helix_angle_deg: number;
  /** Typical flute count */
  flute_count: number;
  /** Confidence level: "measured" | "catalog" | "handbook" | "estimated" */
  confidence: "measured" | "catalog" | "handbook" | "estimated";
  /** Notes about the default values */
  notes: string;
}

/**
 * Geometry defaults keyed by normalized tool type.
 * Keys are lowercased, underscore-separated canonical forms.
 */
export const TOOL_GEOMETRY_DEFAULTS: Record<string, ToolGeometryDefault> = {
  // === MILLING — End Mills ===
  "endmill": {
    rake_angle_deg: 10,
    relief_angle_deg: 12,
    helix_angle_deg: 30,
    flute_count: 4,
    confidence: "handbook",
    notes: "General-purpose carbide endmill, ISO 3002-1 standard geometry"
  },
  "ball_nose": {
    rake_angle_deg: 8,
    relief_angle_deg: 10,
    helix_angle_deg: 30,
    flute_count: 2,
    confidence: "handbook",
    notes: "Ball nose endmill — lower rake due to center cutting geometry"
  },
  "corner_radius": {
    rake_angle_deg: 10,
    relief_angle_deg: 12,
    helix_angle_deg: 35,
    flute_count: 4,
    confidence: "handbook",
    notes: "Corner radius endmill — similar to standard endmill with radiused corners"
  },
  "high_feed": {
    rake_angle_deg: 6,
    relief_angle_deg: 8,
    helix_angle_deg: 42,
    flute_count: 4,
    confidence: "catalog",
    notes: "High-feed milling — shallow DOC, high feed, positive rake for chip thinning"
  },
  "roughing_endmill": {
    rake_angle_deg: 8,
    relief_angle_deg: 10,
    helix_angle_deg: 35,
    flute_count: 4,
    confidence: "handbook",
    notes: "Roughing endmill with serrated/chipbreaker flutes"
  },
  "finishing_endmill": {
    rake_angle_deg: 12,
    relief_angle_deg: 14,
    helix_angle_deg: 45,
    flute_count: 6,
    confidence: "handbook",
    notes: "Finishing endmill — high flute count, high helix for smooth surface finish"
  },
  "variable_helix": {
    rake_angle_deg: 10,
    relief_angle_deg: 12,
    helix_angle_deg: 38,
    flute_count: 4,
    confidence: "catalog",
    notes: "Variable helix endmill — helix value is average; actual varies 35-42 deg"
  },

  // === MILLING — Face/Shell Mills ===
  "face_mill": {
    rake_angle_deg: 5,
    relief_angle_deg: 8,
    helix_angle_deg: 0,
    flute_count: 6,
    confidence: "handbook",
    notes: "Indexable face mill — axial rake 5°, radial rake varies by insert"
  },
  "shell_mill": {
    rake_angle_deg: 5,
    relief_angle_deg: 8,
    helix_angle_deg: 0,
    flute_count: 8,
    confidence: "handbook",
    notes: "Shell mill — similar to face mill, arbor-mounted"
  },

  // === DRILLING ===
  "drill": {
    rake_angle_deg: 6,
    relief_angle_deg: 12,
    helix_angle_deg: 30,
    flute_count: 2,
    confidence: "handbook",
    notes: "Standard twist drill — rake angle effective at periphery"
  },
  "center_drill": {
    rake_angle_deg: 0,
    relief_angle_deg: 10,
    helix_angle_deg: 0,
    flute_count: 2,
    confidence: "handbook",
    notes: "Center drill — zero rake, straight flute"
  },
  "spot_drill": {
    rake_angle_deg: 0,
    relief_angle_deg: 10,
    helix_angle_deg: 0,
    flute_count: 2,
    confidence: "handbook",
    notes: "Spot drill — zero rake, straight flute, 90° or 120° point"
  },
  "step_drill": {
    rake_angle_deg: 6,
    relief_angle_deg: 12,
    helix_angle_deg: 30,
    flute_count: 2,
    confidence: "handbook",
    notes: "Step drill — same geometry as standard drill per step"
  },
  "indexable_drill": {
    rake_angle_deg: 3,
    relief_angle_deg: 8,
    helix_angle_deg: 0,
    flute_count: 2,
    confidence: "catalog",
    notes: "Indexable-insert drill — rake depends on insert geometry"
  },
  "gun_drill": {
    rake_angle_deg: 0,
    relief_angle_deg: 8,
    helix_angle_deg: 0,
    flute_count: 1,
    confidence: "handbook",
    notes: "Gun drill — single flute, straight, internal coolant"
  },

  // === HOLE FINISHING ===
  "reamer": {
    rake_angle_deg: 5,
    relief_angle_deg: 7,
    helix_angle_deg: 15,
    flute_count: 6,
    confidence: "handbook",
    notes: "Machine reamer — low rake, many flutes for precision"
  },
  "boring_bar": {
    rake_angle_deg: 6,
    relief_angle_deg: 7,
    helix_angle_deg: 0,
    flute_count: 1,
    confidence: "handbook",
    notes: "Single-point boring bar — geometry set by insert"
  },
  "fine_boring_head": {
    rake_angle_deg: 6,
    relief_angle_deg: 7,
    helix_angle_deg: 0,
    flute_count: 1,
    confidence: "handbook",
    notes: "Fine boring head — micrometer-adjustable, insert geometry dominant"
  },
  "counterbore": {
    rake_angle_deg: 5,
    relief_angle_deg: 8,
    helix_angle_deg: 0,
    flute_count: 4,
    confidence: "handbook",
    notes: "Counterbore — pilot-guided, moderate rake"
  },
  "countersink": {
    rake_angle_deg: 5,
    relief_angle_deg: 10,
    helix_angle_deg: 0,
    flute_count: 3,
    confidence: "handbook",
    notes: "Countersink — multi-flute, straight or spiral"
  },

  // === THREADING ===
  "tap": {
    rake_angle_deg: 8,
    relief_angle_deg: 10,
    helix_angle_deg: 15,
    flute_count: 3,
    confidence: "handbook",
    notes: "Standard spiral-point tap — moderate rake for chip evacuation"
  },
  "thread_mill": {
    rake_angle_deg: 8,
    relief_angle_deg: 10,
    helix_angle_deg: 0,
    flute_count: 3,
    confidence: "handbook",
    notes: "Thread mill — helical interpolation, straight or helical flutes"
  },
  "form_tap": {
    rake_angle_deg: 0,
    relief_angle_deg: 0,
    helix_angle_deg: 0,
    flute_count: 0,
    confidence: "handbook",
    notes: "Form/roll tap — no cutting geometry, forms thread by displacement"
  },

  // === TURNING INSERTS ===
  "cnmg_insert": {
    rake_angle_deg: -6,
    relief_angle_deg: 0,
    helix_angle_deg: 0,
    flute_count: 0,
    confidence: "catalog",
    notes: "CNMG insert — negative rake (C=80° diamond, N=negative, M=±0.1mm, G=chipbreaker)"
  },
  "tnmg_insert": {
    rake_angle_deg: -6,
    relief_angle_deg: 0,
    helix_angle_deg: 0,
    flute_count: 0,
    confidence: "catalog",
    notes: "TNMG insert — negative rake (T=60° triangle, N=negative)"
  },
  "dnmg_insert": {
    rake_angle_deg: -6,
    relief_angle_deg: 0,
    helix_angle_deg: 0,
    flute_count: 0,
    confidence: "catalog",
    notes: "DNMG insert — negative rake (D=55° diamond, N=negative)"
  },
  "vnmg_insert": {
    rake_angle_deg: -6,
    relief_angle_deg: 0,
    helix_angle_deg: 0,
    flute_count: 0,
    confidence: "catalog",
    notes: "VNMG insert — negative rake (V=35° diamond, N=negative)"
  },
  "wnmg_insert": {
    rake_angle_deg: -6,
    relief_angle_deg: 0,
    helix_angle_deg: 0,
    flute_count: 0,
    confidence: "catalog",
    notes: "WNMG insert — negative rake (W=80° trigon, N=negative)"
  },
  "indexable_insert": {
    rake_angle_deg: -6,
    relief_angle_deg: 0,
    helix_angle_deg: 0,
    flute_count: 0,
    confidence: "handbook",
    notes: "Generic negative-rake insert — default for unclassified inserts"
  },
  "ccmt_insert": {
    rake_angle_deg: 7,
    relief_angle_deg: 7,
    helix_angle_deg: 0,
    flute_count: 0,
    confidence: "catalog",
    notes: "CCMT insert — positive rake (C=80° diamond, C=7° clearance)"
  },
  "dcmt_insert": {
    rake_angle_deg: 7,
    relief_angle_deg: 7,
    helix_angle_deg: 0,
    flute_count: 0,
    confidence: "catalog",
    notes: "DCMT insert — positive rake (D=55°, C=7° clearance)"
  },
  "tcmt_insert": {
    rake_angle_deg: 7,
    relief_angle_deg: 7,
    helix_angle_deg: 0,
    flute_count: 0,
    confidence: "catalog",
    notes: "TCMT insert — positive rake (T=60° triangle, C=7° clearance)"
  },
  "vcmt_insert": {
    rake_angle_deg: 7,
    relief_angle_deg: 7,
    helix_angle_deg: 0,
    flute_count: 0,
    confidence: "catalog",
    notes: "VCMT insert — positive rake (V=35°, C=7° clearance)"
  },

  // === SPECIALTY ===
  "chamfer_mill": {
    rake_angle_deg: 5,
    relief_angle_deg: 10,
    helix_angle_deg: 0,
    flute_count: 4,
    confidence: "handbook",
    notes: "Chamfer mill — straight flute, 45° or 60° included angle"
  },
  "slot_drill": {
    rake_angle_deg: 10,
    relief_angle_deg: 12,
    helix_angle_deg: 30,
    flute_count: 2,
    confidence: "handbook",
    notes: "Slot drill — 2-flute center-cutting endmill optimized for plunge/slot"
  },
  "woodruff_cutter": {
    rake_angle_deg: 5,
    relief_angle_deg: 8,
    helix_angle_deg: 0,
    flute_count: 8,
    confidence: "handbook",
    notes: "Woodruff keyseat cutter — form cutter, many teeth"
  },
  "t_slot_cutter": {
    rake_angle_deg: 5,
    relief_angle_deg: 8,
    helix_angle_deg: 0,
    flute_count: 6,
    confidence: "handbook",
    notes: "T-slot cutter — staggered teeth, straight flute"
  },
  "dovetail_cutter": {
    rake_angle_deg: 8,
    relief_angle_deg: 10,
    helix_angle_deg: 0,
    flute_count: 4,
    confidence: "handbook",
    notes: "Dovetail cutter — angled form, 45° or 60°"
  },
  "fly_cutter": {
    rake_angle_deg: 8,
    relief_angle_deg: 10,
    helix_angle_deg: 0,
    flute_count: 1,
    confidence: "handbook",
    notes: "Fly cutter — single-point, geometry set by ground tool bit"
  },

  // === TOOLHOLDERS (no cutting geometry) ===
  "er_collet_chuck": {
    rake_angle_deg: 0,
    relief_angle_deg: 0,
    helix_angle_deg: 0,
    flute_count: 0,
    confidence: "measured",
    notes: "ER collet chuck — toolholder, no cutting geometry"
  },
  "shrink_fit": {
    rake_angle_deg: 0,
    relief_angle_deg: 0,
    helix_angle_deg: 0,
    flute_count: 0,
    confidence: "measured",
    notes: "Shrink-fit holder — toolholder, no cutting geometry"
  },
  "hydraulic_expansion": {
    rake_angle_deg: 0,
    relief_angle_deg: 0,
    helix_angle_deg: 0,
    flute_count: 0,
    confidence: "measured",
    notes: "Hydraulic expansion holder — toolholder, no cutting geometry"
  },
  "weldon_side_lock": {
    rake_angle_deg: 0,
    relief_angle_deg: 0,
    helix_angle_deg: 0,
    flute_count: 0,
    confidence: "measured",
    notes: "Weldon side-lock holder — toolholder, no cutting geometry"
  },
  "anti_vibration_slim": {
    rake_angle_deg: 0,
    relief_angle_deg: 0,
    helix_angle_deg: 0,
    flute_count: 0,
    confidence: "measured",
    notes: "Anti-vibration slim holder — toolholder, no cutting geometry"
  },
  "straight_extension": {
    rake_angle_deg: 0,
    relief_angle_deg: 0,
    helix_angle_deg: 0,
    flute_count: 0,
    confidence: "measured",
    notes: "Straight extension holder — toolholder, no cutting geometry"
  },
  "milling_chuck": {
    rake_angle_deg: 0,
    relief_angle_deg: 0,
    helix_angle_deg: 0,
    flute_count: 0,
    confidence: "measured",
    notes: "Milling chuck — toolholder, no cutting geometry"
  },
  "power_milling_chuck": {
    rake_angle_deg: 0,
    relief_angle_deg: 0,
    helix_angle_deg: 0,
    flute_count: 0,
    confidence: "measured",
    notes: "Power milling chuck — toolholder, no cutting geometry"
  },
  "morse_taper": {
    rake_angle_deg: 0,
    relief_angle_deg: 0,
    helix_angle_deg: 0,
    flute_count: 0,
    confidence: "measured",
    notes: "Morse taper adapter — toolholder, no cutting geometry"
  },
  "modular_adapter": {
    rake_angle_deg: 0,
    relief_angle_deg: 0,
    helix_angle_deg: 0,
    flute_count: 0,
    confidence: "measured",
    notes: "Modular adapter — toolholder, no cutting geometry"
  },
};

/**
 * Get geometry defaults for a tool type, with fuzzy matching.
 * Returns undefined if no match found.
 */
export function getToolGeometryDefault(toolType: string): ToolGeometryDefault | undefined {
  if (!toolType) return undefined;

  // Normalize: lowercase, replace hyphens with underscores
  const normalized = toolType.toLowerCase().replace(/-/g, "_").trim();

  // Direct match
  if (TOOL_GEOMETRY_DEFAULTS[normalized]) {
    return TOOL_GEOMETRY_DEFAULTS[normalized];
  }

  // Substring match — try to find the most specific match
  const keys = Object.keys(TOOL_GEOMETRY_DEFAULTS);

  // First try: type contains a key
  for (const key of keys) {
    if (normalized.includes(key)) {
      return TOOL_GEOMETRY_DEFAULTS[key];
    }
  }

  // Second try: key contains the type
  for (const key of keys) {
    if (key.includes(normalized)) {
      return TOOL_GEOMETRY_DEFAULTS[key];
    }
  }

  // Category-level fallback
  if (normalized.includes("insert") || normalized.includes("turning")) {
    return TOOL_GEOMETRY_DEFAULTS["indexable_insert"];
  }
  if (normalized.includes("mill") || normalized.includes("endmill")) {
    return TOOL_GEOMETRY_DEFAULTS["endmill"];
  }
  if (normalized.includes("drill")) {
    return TOOL_GEOMETRY_DEFAULTS["drill"];
  }
  if (normalized.includes("tap") || normalized.includes("thread")) {
    return TOOL_GEOMETRY_DEFAULTS["tap"];
  }
  if (normalized.includes("ream")) {
    return TOOL_GEOMETRY_DEFAULTS["reamer"];
  }
  if (normalized.includes("bore") || normalized.includes("boring")) {
    return TOOL_GEOMETRY_DEFAULTS["boring_bar"];
  }
  if (normalized.includes("holder") || normalized.includes("chuck") || normalized.includes("collet") || normalized.includes("adapter")) {
    return TOOL_GEOMETRY_DEFAULTS["er_collet_chuck"];
  }

  return undefined;
}

/**
 * Check if a tool type represents a toolholder (not a cutting tool).
 */
export function isToolHolder(toolType: string): boolean {
  if (!toolType) return false;
  const n = toolType.toLowerCase().replace(/-/g, "_");
  const holderTypes = [
    "er_collet_chuck", "shrink_fit", "hydraulic_expansion", "weldon_side_lock",
    "anti_vibration_slim", "straight_extension", "milling_chuck", "power_milling_chuck",
    "morse_taper", "modular_adapter", "holder", "chuck", "collet", "adapter",
    "arbor", "stub_arbor", "face_mill_arbor", "shell_mill_arbor",
  ];
  return holderTypes.some(ht => n.includes(ht));
}
