/**
 * HyperMillStrategyRegistration — Registers hyperMILL cycle strategies into
 * PRISM's ToolpathStrategyRegistry.
 *
 * Maps each hyperMILL strategy cycle (from HyperMillStrategyEngine.STRATEGIES)
 * to a ToolpathStrategy conforming to the registry's ToolpathStrategy interface.
 *
 * Category mapping:
 *   - 2D milling (Pocket, Contour, Face, T-Slot, Chamfer, Plunge, Rest 2D)
 *     → milling_roughing / milling_finishing
 *   - 3D machining (Optimised Roughing, Profile Finishing, Z Level, Equidistant…)
 *     → milling_roughing / milling_finishing
 *   - Turning (Turning Roughing, Contour Parallel, Turning Finishing, Groove, Thread)
 *     → turning
 *   - Pencil Milling, Corner Rest, Rib/Groove → milling_finishing
 *
 * Usage:
 *   import { registerHyperMillStrategies, getHyperMillStrategies }
 *     from "./HyperMillStrategyRegistration.js";
 *   registerHyperMillStrategies(); // idempotent — safe to call multiple times
 *
 * HM-REV-MS2 / U-HMR15
 */

import type {
  ToolpathStrategy,
  StrategyCategory,
} from "../registries/ToolpathStrategyRegistry.js";
import { toolpathRegistry } from "../registries/ToolpathStrategyRegistry.js";

// ============================================================================
// Cycle → ToolpathStrategy mapping table
// ============================================================================

interface HyperMillCycleEntry {
  cycle: string;
  description: string;
  category: StrategyCategory;
  subcategory: string;
  bestFor: string[];
  materials: string[];
  params?: Record<string, unknown>;
}

/**
 * All hyperMILL strategy cycles from HyperMillStrategyEngine, enriched with
 * ToolpathStrategy metadata.
 *
 * Source: HyperMillStrategyEngine.STRATEGIES (manual cycles from hyperMILL
 * Manual Parts 1-4), plus MAXX Machining cycles.
 */
const HYPERMILL_CYCLE_TABLE: HyperMillCycleEntry[] = [
  // ── 2D / Prismatic ────────────────────────────────────────────────────────
  {
    cycle: "Pocket Milling",
    description:
      "Mill straight and inclined pockets with automatic island recognition " +
      "and rest material detection. Supports contour-parallel and zigzag patterns.",
    category: "milling_roughing",
    subcategory: "traditional",
    bestFor: ["pockets", "islands", "2d_features"],
    materials: ["all"],
    params: { stepdownFactor: 1.0, stepoverFactor: 0.5, cuttingMode: "climb" },
  },
  {
    cycle: "Contour Milling",
    description:
      "Mill open and closed 2D contours with path compensation and " +
      "approach/retract strategies. Rest material areas can be calculated.",
    category: "milling_finishing",
    subcategory: "2d",
    bestFor: ["contours", "profiles", "2d_features"],
    materials: ["all"],
    params: { stepdownFactor: 1.0, stepoverFactor: 0.3, cuttingMode: "climb" },
  },
  {
    cycle: "Face Milling",
    description:
      "Roughing of larger surfaces with parallel cuts, optionally with several Z steps.",
    category: "milling_roughing",
    subcategory: "traditional",
    bestFor: ["faces", "flat_surfaces"],
    materials: ["all"],
    params: { stepdownFactor: 0.5, stepoverFactor: 0.7, cuttingMode: "zigzag" },
  },
  {
    cycle: "T-Slot Milling on 3D Model",
    description:
      "Roughing and finishing of T-slots along plane contours with collision control.",
    category: "milling_finishing",
    subcategory: "specialized",
    bestFor: ["t_slots", "undercuts"],
    materials: ["all"],
    params: { stepdownFactor: 0.3, stepoverFactor: 0.4, cuttingMode: "climb" },
  },
  {
    cycle: "Chamfer Milling on 3D Model",
    description:
      "Machining prismatic components — modelled chamfer and deburr/chamfer sharp edges strategies.",
    category: "milling_finishing",
    subcategory: "edge",
    bestFor: ["chamfers", "deburring", "edge_breaks"],
    materials: ["all"],
    params: { cuttingMode: "climb" },
  },
  {
    cycle: "Plunge Milling",
    description:
      "Guided by contour, generates plunge milling toolpath with collision " +
      "check and stock model update.",
    category: "milling_roughing",
    subcategory: "specialized",
    bestFor: ["deep_pockets", "narrow_cavities"],
    materials: ["all"],
    params: { stepoverFactor: 0.5, cuttingMode: "conventional" },
  },
  {
    cycle: "Rest Machining 2D",
    description: "Machine rest material areas left after pocket or contour milling.",
    category: "milling_finishing",
    subcategory: "secondary",
    bestFor: ["rest_material", "corners", "2d_cleanup"],
    materials: ["all"],
    params: { stepdownFactor: 0.5, stepoverFactor: 0.3, cuttingMode: "climb" },
  },

  // ── 3D Machining ──────────────────────────────────────────────────────────
  {
    cycle: "Optimised Roughing",
    description:
      "Roughing and rest roughing with HSC-optimised toolpaths that reduce " +
      "direction changes. Uses stock model for efficient material removal.",
    category: "milling_roughing",
    subcategory: "hsm",
    bestFor: ["freeform", "molds", "aerospace", "general_roughing"],
    materials: ["all"],
    params: { stepdownFactor: 1.0, stepoverFactor: 0.4, cuttingMode: "climb" },
  },
  {
    cycle: "Arbitrary Stock Roughing",
    description:
      "Z-constant stock removal for stock models of any shape with stock model update.",
    category: "milling_roughing",
    subcategory: "traditional",
    bestFor: ["complex_stock", "castings", "forgings"],
    materials: ["all"],
    params: { stepdownFactor: 1.0, stepoverFactor: 0.5, cuttingMode: "zigzag" },
  },
  {
    cycle: "Profile Finishing",
    description:
      "Multi-surface collision-free milling with guide curve strategies. " +
      "Optional slope-dependent machining.",
    category: "milling_finishing",
    subcategory: "3d",
    bestFor: ["steep_walls", "freeform", "guides"],
    materials: ["all"],
    params: { stepoverFactor: 0.15, cuttingMode: "climb" },
  },
  {
    cycle: "Z Level Finishing",
    description:
      "Z-constant finishing with slope-dependent machining. Adapts stepdown " +
      "to surface flow for optimal line distance on steep surfaces.",
    category: "milling_finishing",
    subcategory: "3d",
    bestFor: ["steep_walls", "vertical_walls"],
    materials: ["all"],
    params: { stepdownFactor: 0.1, cuttingMode: "climb" },
  },
  {
    cycle: "Z Level Shape Finishing",
    description:
      "Z-Level machining for steep areas. Optionally replaces plane machining " +
      "with cuts parallel to any shape.",
    category: "milling_finishing",
    subcategory: "3d",
    bestFor: ["steep_walls", "shaped_pockets"],
    materials: ["all"],
    params: { stepdownFactor: 0.1, cuttingMode: "climb" },
  },
  {
    cycle: "Equidistant Finishing",
    description:
      "Finishing with constant infeed on surface — particularly suitable for high-speed milling.",
    category: "milling_finishing",
    subcategory: "3d",
    bestFor: ["smooth_surfaces", "hsm_finishing", "molds"],
    materials: ["all"],
    params: { stepoverFactor: 0.1, cuttingMode: "climb" },
  },
  {
    cycle: "Complete Finishing",
    description:
      "Z-constant finishing with automatic pocket-shaped machining of flat areas.",
    category: "milling_finishing",
    subcategory: "3d",
    bestFor: ["mixed_topology", "flat_and_curved"],
    materials: ["all"],
    params: { stepdownFactor: 0.1, stepoverFactor: 0.15, cuttingMode: "climb" },
  },
  {
    cycle: "Iso Machining",
    description: "Toolpaths follow ISO lines (U, V) — optimally adapted to surface curve.",
    category: "milling_finishing",
    subcategory: "3d",
    bestFor: ["prismatic_surfaces", "ruled_surfaces"],
    materials: ["all"],
    params: { stepoverFactor: 0.1, cuttingMode: "climb" },
  },
  {
    cycle: "Plane Machining",
    description:
      "Face milling of planar surfaces with pocket strategy. Automatic plane level detection.",
    category: "milling_finishing",
    subcategory: "2d",
    bestFor: ["flat_areas", "faces", "bosses"],
    materials: ["all"],
    params: { stepdownFactor: 0.5, stepoverFactor: 0.7, cuttingMode: "zigzag" },
  },
  {
    cycle: "Automatic Rest Machining",
    description:
      "Targeted rework of individual rest material areas left during a finishing cycle.",
    category: "milling_finishing",
    subcategory: "secondary",
    bestFor: ["rest_material", "cleanup", "finishing_cleanup"],
    materials: ["all"],
    params: { stepdownFactor: 0.3, stepoverFactor: 0.2, cuttingMode: "climb" },
  },
  {
    cycle: "Corner Rest Machining",
    description:
      "Optimised removal of rest material in vertical corners and adjacent " +
      "bottom surfaces within pocket geometries.",
    category: "milling_finishing",
    subcategory: "secondary",
    bestFor: ["corners", "vertical_corners", "pocket_cleanup"],
    materials: ["all"],
    params: { stepdownFactor: 0.3, stepoverFactor: 0.15, cuttingMode: "climb" },
  },
  {
    cycle: "Pencil Milling",
    description: "Automatic detection and machining of grooves.",
    category: "milling_finishing",
    subcategory: "secondary",
    bestFor: ["grooves", "corner_radii", "pencil_cleanup"],
    materials: ["all"],
    params: { cuttingMode: "climb" },
  },
  {
    cycle: "Rib / Groove Machining",
    description:
      "Roughing and finishing of ribs and grooves in one job for side surfaces and floor areas.",
    category: "milling_finishing",
    subcategory: "specialized",
    bestFor: ["ribs", "grooves", "thin_walls"],
    materials: ["all"],
    params: { stepdownFactor: 0.5, stepoverFactor: 0.3, cuttingMode: "climb" },
  },

  // ── Turning ───────────────────────────────────────────────────────────────
  {
    cycle: "Turning Roughing",
    description:
      "Roughing of turning stock in axial or radial direction with constant, " +
      "ascending, descending, or ramp infeed strategies.",
    category: "turning",
    subcategory: "roughing",
    bestFor: ["turning_od", "turning_id", "bar_stock"],
    materials: ["all"],
    params: { stepdownFactor: 1.0, cuttingMode: "conventional" },
  },
  {
    cycle: "Contour Parallel Turning",
    description: "Roughing parallel to contour for turning stock of any shape.",
    category: "turning",
    subcategory: "roughing",
    bestFor: ["profiled_stock", "castings_turning"],
    materials: ["all"],
    params: { stepdownFactor: 0.8, cuttingMode: "conventional" },
  },
  {
    cycle: "Turning Finishing",
    description: "Contour parallel finishing based on preceding roughing operation.",
    category: "turning",
    subcategory: "finishing",
    bestFor: ["turning_od", "turning_id", "contour_turning"],
    materials: ["all"],
    params: { cuttingMode: "conventional" },
  },
  {
    cycle: "Groove Turning / Plunging",
    description: "Axial or radial roughing of grooves and shoulders.",
    category: "turning",
    subcategory: "grooving",
    bestFor: ["grooves", "undercuts", "recesses"],
    materials: ["all"],
    params: { cuttingMode: "conventional" },
  },
  {
    cycle: "Thread Cutting",
    description:
      "Single or multiple start, cylindrical or conical threads with " +
      "constant chip section or constant X infeed.",
    category: "turning",
    subcategory: "threading",
    bestFor: ["threads", "external_threads", "internal_threads"],
    materials: ["all"],
    params: { cuttingMode: "conventional" },
  },
];

// ============================================================================
// Strategy builder
// ============================================================================

function toSnakeCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

/**
 * Convert a cycle table entry to a ToolpathStrategy object.
 * IDs are prefixed with "hypermill_" to avoid collisions.
 */
function buildStrategy(entry: HyperMillCycleEntry): ToolpathStrategy {
  return {
    id: `hypermill_${toSnakeCase(entry.cycle)}`,
    name: entry.cycle,
    category: entry.category,
    subcategory: entry.subcategory,
    description: entry.description,
    bestFor: entry.bestFor,
    materials: entry.materials,
    params: entry.params ?? {},
    camSupport: ["hyperMILL"],
    prismNovel: false,
  };
}

// ============================================================================
// Registration
// ============================================================================

let _registered = false;

/**
 * Register all hyperMILL strategies into the ToolpathStrategyRegistry.
 *
 * Idempotent — calling multiple times has no effect after first call.
 *
 * Adds strategies to the registry's `strategies` map under the appropriate
 * category key. The registry's singleton is mutated directly because it uses
 * a public `strategies` property (Record<string, Record<string, ToolpathStrategy>>).
 *
 * @returns Number of strategies registered (0 on subsequent calls).
 */
export function registerHyperMillStrategies(): number {
  if (_registered) return 0;
  _registered = true;

  let count = 0;
  for (const entry of HYPERMILL_CYCLE_TABLE) {
    const strategy = buildStrategy(entry);
    const cat = strategy.category;

    // Ensure category bucket exists
    if (!toolpathRegistry.strategies[cat]) {
      (toolpathRegistry.strategies as Record<string, Record<string, ToolpathStrategy>>)[cat] = {};
    }

    // Avoid overwriting an existing strategy with the same ID
    if (!toolpathRegistry.strategies[cat][strategy.id]) {
      (toolpathRegistry.strategies[cat] as Record<string, ToolpathStrategy>)[strategy.id] = strategy;
      count++;
    }
  }
  return count;
}

/**
 * Return all registered hyperMILL strategies (from any category).
 *
 * Calls registerHyperMillStrategies() if not already registered.
 */
export function getHyperMillStrategies(): ToolpathStrategy[] {
  registerHyperMillStrategies();

  const result: ToolpathStrategy[] = [];
  for (const catStrategies of Object.values(toolpathRegistry.strategies)) {
    for (const strategy of Object.values(catStrategies)) {
      if (strategy.camSupport?.includes("hyperMILL")) {
        result.push(strategy);
      }
    }
  }
  return result;
}

/**
 * Get hyperMILL strategies filtered by category.
 *
 * @param category - StrategyCategory to filter by.
 */
export function getHyperMillStrategiesByCategory(
  category: StrategyCategory
): ToolpathStrategy[] {
  registerHyperMillStrategies();
  const catStrategies = toolpathRegistry.strategies[category] ?? {};
  return Object.values(catStrategies).filter((s) =>
    s.camSupport?.includes("hyperMILL")
  );
}

/** Raw cycle table — exported for testing. */
export const HYPERMILL_STRATEGIES_TABLE = HYPERMILL_CYCLE_TABLE;
