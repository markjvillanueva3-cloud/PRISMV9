export interface ToolpathStrategy {
  id: string;
  label: string;
  category: "roughing" | "finishing" | "holemaking" | "secondary";
  /** Which operation categories this strategy applies to */
  operationCategories: string[];
  /** DOC multiplier relative to operation default */
  docMultiplier: number;
  /** WOC multiplier relative to operation default */
  wocMultiplier: number;
  /** Feed rate multiplier */
  feedMultiplier: number;
  /** Speed multiplier */
  speedMultiplier: number;
  /** Description shown in UI */
  description: string;
  /** Minimum CAM level needed (null = any) */
  minCamLevel?: string;
}

/**
 * Toolpath strategies matching PRISM v8 layout.
 * Strategies are filtered by the selected operation category.
 * Each strategy modifies DOC/WOC/feed/speed from base calculation.
 */
export const TOOLPATH_STRATEGIES: ToolpathStrategy[] = [
  // Roughing strategies (milling)
  {
    id: "face_milling",
    label: "Face Milling",
    category: "roughing",
    operationCategories: ["milling"],
    docMultiplier: 1.0,
    wocMultiplier: 1.0,
    feedMultiplier: 1.0,
    speedMultiplier: 1.0,
    description: "Full-width facing for stock removal",
  },
  {
    id: "adaptive_clearing",
    label: "Adaptive Clearing",
    category: "roughing",
    operationCategories: ["milling"],
    docMultiplier: 2.5,
    wocMultiplier: 0.15,
    feedMultiplier: 1.3,
    speedMultiplier: 1.1,
    description: "High-speed adaptive with constant chip load — deep DOC, light WOC",
  },
  {
    id: "pocket_2d",
    label: "2D Pocket",
    category: "roughing",
    operationCategories: ["milling"],
    docMultiplier: 1.0,
    wocMultiplier: 0.6,
    feedMultiplier: 1.0,
    speedMultiplier: 1.0,
    description: "Rectangular pocket clearing with stepover",
  },
  {
    id: "trochoidal",
    label: "Trochoidal Milling",
    category: "roughing",
    operationCategories: ["milling"],
    docMultiplier: 3.0,
    wocMultiplier: 0.1,
    feedMultiplier: 1.4,
    speedMultiplier: 1.15,
    description: "Circular arc engagement — maximum depth, minimal radial load",
    minCamLevel: "mill_3d",
  },
  {
    id: "plunge_roughing",
    label: "Plunge Roughing",
    category: "roughing",
    operationCategories: ["milling"],
    docMultiplier: 1.0,
    wocMultiplier: 0.7,
    feedMultiplier: 0.5,
    speedMultiplier: 0.8,
    description: "Z-axis plunging for deep cavities and weak setups",
  },

  // Finishing strategies (milling)
  {
    id: "contour_2d",
    label: "2D Contour",
    category: "finishing",
    operationCategories: ["milling"],
    docMultiplier: 1.0,
    wocMultiplier: 0.05,
    feedMultiplier: 0.8,
    speedMultiplier: 1.1,
    description: "Profile edge finishing with spring passes",
  },
  {
    id: "surface_3d",
    label: "3D Surface Finishing",
    category: "finishing",
    operationCategories: ["milling"],
    docMultiplier: 0.3,
    wocMultiplier: 0.15,
    feedMultiplier: 0.7,
    speedMultiplier: 1.15,
    description: "Scallop-height controlled surface finishing",
    minCamLevel: "mill_3d",
  },
  {
    id: "pencil_trace",
    label: "Pencil Trace",
    category: "finishing",
    operationCategories: ["milling"],
    docMultiplier: 0.2,
    wocMultiplier: 0.05,
    feedMultiplier: 0.6,
    speedMultiplier: 1.1,
    description: "Corner cleanup along internal radii",
    minCamLevel: "mill_3d",
  },

  // Holemaking strategies (drilling)
  {
    id: "spot_drill",
    label: "Spot Drilling",
    category: "holemaking",
    operationCategories: ["drilling"],
    docMultiplier: 0.3,
    wocMultiplier: 1.0,
    feedMultiplier: 0.7,
    speedMultiplier: 0.8,
    description: "Center marking with 90° or 120° spot drill",
  },
  {
    id: "peck_drill",
    label: "Peck Drilling (G83)",
    category: "holemaking",
    operationCategories: ["drilling"],
    docMultiplier: 1.0,
    wocMultiplier: 1.0,
    feedMultiplier: 0.85,
    speedMultiplier: 1.0,
    description: "Deep hole peck cycle with chip clearing retract",
  },
  {
    id: "through_drill",
    label: "Through Drilling (G81)",
    category: "holemaking",
    operationCategories: ["drilling"],
    docMultiplier: 1.0,
    wocMultiplier: 1.0,
    feedMultiplier: 1.0,
    speedMultiplier: 1.0,
    description: "Standard single-pass through hole",
  },
  {
    id: "ream",
    label: "Reaming",
    category: "holemaking",
    operationCategories: ["drilling"],
    docMultiplier: 0.1,
    wocMultiplier: 1.0,
    feedMultiplier: 0.5,
    speedMultiplier: 0.6,
    description: "Precision hole finishing to tight tolerance",
  },

  // Secondary operations
  {
    id: "chamfer",
    label: "Chamfer",
    category: "secondary",
    operationCategories: ["milling", "drilling"],
    docMultiplier: 0.3,
    wocMultiplier: 0.3,
    feedMultiplier: 0.6,
    speedMultiplier: 0.9,
    description: "Edge breaking with chamfer mill",
  },
  {
    id: "deburr",
    label: "Deburring",
    category: "secondary",
    operationCategories: ["milling", "drilling"],
    docMultiplier: 0.1,
    wocMultiplier: 0.1,
    feedMultiplier: 0.4,
    speedMultiplier: 0.7,
    description: "Burr removal pass",
  },

  // Turning strategies
  {
    id: "rough_od",
    label: "Rough OD Turning",
    category: "roughing",
    operationCategories: ["turning"],
    docMultiplier: 1.0,
    wocMultiplier: 1.0,
    feedMultiplier: 1.0,
    speedMultiplier: 1.0,
    description: "External diameter roughing with constant depth",
  },
  {
    id: "finish_od",
    label: "Finish OD Turning",
    category: "finishing",
    operationCategories: ["turning"],
    docMultiplier: 0.2,
    wocMultiplier: 1.0,
    feedMultiplier: 0.5,
    speedMultiplier: 1.15,
    description: "Light finishing pass for surface finish",
  },
  {
    id: "rough_id",
    label: "Rough ID Boring",
    category: "roughing",
    operationCategories: ["turning"],
    docMultiplier: 0.7,
    wocMultiplier: 1.0,
    feedMultiplier: 0.85,
    speedMultiplier: 0.9,
    description: "Internal diameter roughing — reduced DOC for rigidity",
  },
  {
    id: "finish_id",
    label: "Finish ID Boring",
    category: "finishing",
    operationCategories: ["turning"],
    docMultiplier: 0.15,
    wocMultiplier: 1.0,
    feedMultiplier: 0.4,
    speedMultiplier: 1.1,
    description: "Internal finish boring for tolerance and finish",
  },
  {
    id: "grooving",
    label: "Grooving / Parting",
    category: "secondary",
    operationCategories: ["turning"],
    docMultiplier: 1.0,
    wocMultiplier: 1.0,
    feedMultiplier: 0.6,
    speedMultiplier: 0.75,
    description: "Radial grooving or part-off operation",
  },
];

/** Get strategies applicable to a given operation category */
export function getStrategiesForCategory(operationCategory: string): ToolpathStrategy[] {
  return TOOLPATH_STRATEGIES.filter((s) =>
    s.operationCategories.includes(operationCategory)
  );
}

/** Cutting strategy priority presets (v8 parity) */
export type CuttingPriority = "runtime" | "finish" | "balanced" | "ai_enhanced";

export interface CuttingPriorityConfig {
  id: CuttingPriority;
  label: string;
  icon: string;
  description: string;
  /** Global speed multiplier */
  speedMult: number;
  /** Global feed multiplier */
  feedMult: number;
  /** DOC multiplier */
  docMult: number;
}

export const CUTTING_PRIORITIES: CuttingPriorityConfig[] = [
  {
    id: "runtime",
    label: "Runtime",
    icon: "⚡",
    description: "Fastest cycle time",
    speedMult: 1.15,
    feedMult: 1.2,
    docMult: 1.3,
  },
  {
    id: "finish",
    label: "Finish",
    icon: "✨",
    description: "Best surface quality",
    speedMult: 1.1,
    feedMult: 0.6,
    docMult: 0.5,
  },
  {
    id: "balanced",
    label: "Balanced",
    icon: "⚖️",
    description: "Tool life + productivity",
    speedMult: 1.0,
    feedMult: 1.0,
    docMult: 1.0,
  },
  {
    id: "ai_enhanced",
    label: "AI Enhanced",
    icon: "🤖",
    description: "Cost-optimized by PRISM AI",
    speedMult: 1.05,
    feedMult: 1.1,
    docMult: 1.1,
  },
];
