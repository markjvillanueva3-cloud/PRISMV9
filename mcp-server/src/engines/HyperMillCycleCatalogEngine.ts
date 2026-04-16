/**
 * HyperMillCycleCatalogEngine — Complete hyperMILL Cycle Type Reference
 *
 * Encodes all 120+ cycle types from omCycles.txt across 9 categories:
 * Drilling, 2D, Tapping, 3D, 5-Axis, MillTurn, APT, Probing, Grinding.
 *
 * Source: H:/prism/HYPERMILL/hyperVIEW/31.0/core/omCycles.txt
 */

// ============================================================================
// TYPES
// ============================================================================

export type CycleCategory =
  | "drilling"
  | "2d"
  | "tapping"
  | "3d"
  | "5axis"
  | "millturn"
  | "apt"
  | "probing"
  | "grinding";

export interface HyperMillCycle {
  displayName: string;
  code: string; // e.g. "DR:Drilling", "3D:Z-Level Roughing"
  category: CycleCategory;
  aliases: string[];
}

// ============================================================================
// COMPLETE CYCLE DATABASE (from omCycles.txt)
// ============================================================================

const CYCLES: HyperMillCycle[] = [
  // --- Drilling ---
  { displayName: "Drilling", code: "DR:Drilling", category: "drilling", aliases: [] },
  { displayName: "Drill with Pecking", code: "DR:Drill with Pecking", category: "drilling", aliases: ["Pecking"] },
  { displayName: "Drilling with Chip Break", code: "DR:Drilling with Chip Break", category: "drilling", aliases: ["Drilling Cycle with Chip Break"] },

  // --- 2D Milling ---
  { displayName: "Contour Milling", code: "2D:Contour Milling", category: "2d", aliases: ["Contour", "2D Contour Milling"] },
  { displayName: "Contour Plunge Milling", code: "2D:Contour Plunge Milling", category: "2d", aliases: [] },
  { displayName: "Face Milling", code: "2D:Face Milling", category: "2d", aliases: ["2D Face Milling"] },
  { displayName: "Pocket Milling", code: "2D:Pocket Milling", category: "2d", aliases: ["Contour Parallel Pocket", "2D Contour Parallel Pocket"] },
  { displayName: "Pocket Milling (Axisparallel)", code: "2D:Pocket Milling (axisparallel)", category: "2d", aliases: ["2D Axisparallel Pocket"] },
  { displayName: "Rest Machining", code: "2D:Rest Machining", category: "2d", aliases: ["2D Rest Machining"] },
  { displayName: "Circular Pocket", code: "2D:Circular Pocket", category: "2d", aliases: [] },
  { displayName: "Rectangular Pocket", code: "2D:Rectangular Pocket", category: "2d", aliases: [] },
  { displayName: "Inclined Contouring", code: "2D:Inclined Contouring", category: "2d", aliases: ["2D Inclined Contour Milling"] },
  { displayName: "Helical Drilling", code: "2D:Helical Drilling", category: "2d", aliases: ["Milling Drill"] },
  { displayName: "Simple Helical Drilling", code: "2D:Simple Helical Drilling", category: "2d", aliases: [] },
  { displayName: "Canondrilling", code: "2D:Canondrilling", category: "2d", aliases: [] },
  { displayName: "Advanced Deep Hole Drilling", code: "2D:Advanced Deep Hole Drilling", category: "2d", aliases: [] },
  { displayName: "2D Linking", code: "2D:2D Linking", category: "2d", aliases: [] },
  { displayName: "5-Axis Drilling (2D)", code: "2D:5 AXIS Drilling", category: "2d", aliases: ["5-Axis Drilling", "5 Axis Drilling"] },
  { displayName: "5-Axis Drill with Pecking (2D)", code: "2D:5 AXIS Drill with Pecking", category: "2d", aliases: ["5-Axis Pecking"] },
  { displayName: "5-Axis Drilling Chip Break (2D)", code: "2D:5 AXIS Drilling with Chip Break", category: "2d", aliases: ["5-Axis Drilling with Chip Break"] },
  { displayName: "Back Drilling", code: "2D:Back Drilling", category: "2d", aliases: [] },

  // --- Tapping ---
  { displayName: "Thread Milling", code: "TP:Thread Milling", category: "tapping", aliases: ["Tap Milling", "Enhanced Tap Milling"] },
  { displayName: "Tapping", code: "TP:Tapping", category: "tapping", aliases: ["Tap Drilling"] },

  // --- 3D Milling ---
  { displayName: "Curve Milling", code: "3D:Curve Milling", category: "3d", aliases: ["3D Curve Milling"] },
  { displayName: "Curve Rest Machining", code: "3D:Curve Rest Machining", category: "3d", aliases: ["3D Curve Restmachining"] },
  { displayName: "Curve Flowmachining", code: "3D:Curve Flowmachining", category: "3d", aliases: ["3D Curve Flowmachining"] },
  { displayName: "Freepath Milling", code: "3D:Freepath Milling", category: "3d", aliases: ["3D Freepath Milling", "3D Path Milling"] },
  { displayName: "Rework Machining", code: "3D:Rework Machining", category: "3d", aliases: ["3D Rework Machining"] },
  { displayName: "Z-Level Roughing", code: "3D:Z-Level Roughing", category: "3d", aliases: ["3D Z-Level Roughing"] },
  { displayName: "Profile Finishing", code: "3D:Profile Finishing", category: "3d", aliases: ["3D Profile Finishing"] },
  { displayName: "Z-Level Finishing", code: "3D:Z-Level Finishing", category: "3d", aliases: ["3D Z-Level Finishing"] },
  { displayName: "Z-Level Shape Finishing", code: "3D:Z-Level Shape Finishing", category: "3d", aliases: ["3D Z-Level Shape Finishing"] },
  { displayName: "Z-Level Shape Roughing", code: "3D:Z-Level Shape Roughing", category: "3d", aliases: ["3D Z-Level Shape Roughing"] },
  { displayName: "Optimized Rest Roughing", code: "3D:Optimized Rest Roughing", category: "3d", aliases: ["3D Optimized Rest Roughing"] },
  { displayName: "Pencil Milling", code: "3D:Pencil Milling", category: "3d", aliases: ["3D Pencil Milling"] },
  { displayName: "Automatic Rest Machining", code: "3D:Autom. Rest Machining", category: "3d", aliases: ["3D Rest Machining", "3D Automatic Restmachining"] },
  { displayName: "Offset Roughing", code: "3D:Offset Roughing", category: "3d", aliases: ["3D Castoffset Roughing"] },
  { displayName: "Equidistant Machining", code: "3D:Equidistant Machining", category: "3d", aliases: ["3D Scallop Machining"] },
  { displayName: "ISO Machining", code: "3D:ISO Machining", category: "3d", aliases: ["3D Iso Machining"] },
  { displayName: "XY Optimization", code: "3D:XY Optimization", category: "3d", aliases: ["3D Optimize Finishing", "3D Optimization Finishing"] },
  { displayName: "Z-Level Rest Machining", code: "3D:Z-Level Rest Machining", category: "3d", aliases: ["3D Z-Level Restmachining"] },
  { displayName: "Z-Level Stock Roughing", code: "3D:Z-Level Stock Roughing", category: "3d", aliases: ["3D Z-Level Stock Roughing"] },
  { displayName: "3D Plane Machining", code: "3D:3D Plane Machining", category: "3d", aliases: ["3D Plane Machining"] },
  { displayName: "Plunge Roughing", code: "3D:Plunge Roughing", category: "3d", aliases: ["3D Plunge Roughing"] },
  { displayName: "Z-Level Turbine Roughing", code: "3D:Z-Level Turbine Roughing", category: "3d", aliases: ["3D Z-Level Turbine Roughing"] },
  { displayName: "Formpocket", code: "3D:Formpocket", category: "3d", aliases: ["3D Formpocket"] },
  { displayName: "Rib/Groove Machining", code: "3D:3D Rib/groove machining", category: "3d", aliases: ["3D Rib Machining"] },
  { displayName: "NC Recycler", code: "3D:NC Recycler", category: "3d", aliases: [] },
  { displayName: "3D Link", code: "3L:3D Link", category: "3d", aliases: ["3D Link"] },
  { displayName: "Cutting Edge Machining", code: "3D:3D Cutting Edge Machining", category: "3d", aliases: ["3D Cutting Edge Machining"] },
  { displayName: "Corner Rest Machining", code: "3D:3D Corner Rest Machining", category: "3d", aliases: ["3D Corner Rest Machining"] },
  { displayName: "Radial Machining", code: "3D:3D Radial Machining", category: "3d", aliases: ["3D Radial Machining"] },

  // --- 5-Axis ---
  { displayName: "5X Z-Level Finishing", code: "5X:5 Axis Z-level Finishing", category: "5axis", aliases: ["5 Axis Z-Level Finishing"] },
  { displayName: "5X Profile Finishing", code: "5X:5 Axis Profile Finishing", category: "5axis", aliases: [] },
  { displayName: "5X Equidistant Finishing", code: "5X:5 Axis Equidistant Finishing", category: "5axis", aliases: ["3D 5-Axis Scallop Machining"] },
  { displayName: "5X Rest Machining", code: "5X:5 Axis Rest Machining", category: "5axis", aliases: ["3D 5-Axis Restmachining"] },
  { displayName: "5X Swarf Cutting", code: "5X:5 AXIS SWARF Cutting", category: "5axis", aliases: ["3D 5-Axis Side Milling"] },
  { displayName: "5X Swarf Cutting (Side Milling)", code: "5X:5 AXIS SWARF Cutting (Side Milling)", category: "5axis", aliases: ["3D 5-Axis Side Milling 2 Curves"] },
  { displayName: "5X Top Milling", code: "5X:5 AXIS Top Milling", category: "5axis", aliases: ["3D 5-Axis Top Milling"] },
  { displayName: "5X ISO Top Milling", code: "5X:5 AXIS ISO Top Milling", category: "5axis", aliases: ["3D 5-Axis Iso Topmilling"] },
  { displayName: "5X Curve Machining", code: "5X:5 AXIS Curve Machining", category: "5axis", aliases: ["3D 5-Axis Curve Machining"] },
  { displayName: "5X Rework Machining", code: "5X:5 AXIS Rework Machining", category: "5axis", aliases: ["3D 5-Axis Rework Machining"] },
  { displayName: "5X Trim Cutting", code: "5X:5 AXIS Trim Cutting", category: "5axis", aliases: ["3D 5-Axis Trim Cutting"] },
  { displayName: "5X Pencil Milling", code: "5X:5 AXIS Pencil Milling", category: "5axis", aliases: ["3D 5-Axis Pencil Milling"] },
  { displayName: "5X ISO Machining", code: "5X:5 AXIS ISO Machining", category: "5axis", aliases: ["3D 5-Axis Iso Machining"] },
  { displayName: "5X Contouring", code: "5X:5 AXIS Contouring", category: "5axis", aliases: ["3D 5-Axis Contouring"] },
  { displayName: "5X Drilling (LIC)", code: "5X:5 AXIS Drilling", category: "5axis", aliases: ["5-Axis Drilling LIC"] },
  { displayName: "5X Drill with Pecking (LIC)", code: "5X:5 AXIS Drill with Pecking", category: "5axis", aliases: ["5-Axis Pecking LIC"] },
  { displayName: "5X Drilling Chip Break (LIC)", code: "5X:5 AXIS Drilling with Chip Break", category: "5axis", aliases: ["5-Axis Drilling with Chip Break LIC"] },
  { displayName: "5X Spiral Drilling", code: "5X:5 AXIS Spiral Drilling", category: "5axis", aliases: [] },
  { displayName: "5X Turbine Top Milling", code: "5X:5 AXIS Turbine Top Milling", category: "5axis", aliases: ["3D 5-Axis Blade Top Milling"] },
  { displayName: "5X Turbine Swarf Cutting", code: "5X:5 AXIS Turbine SWARF Cutting", category: "5axis", aliases: ["3D 5-Axis Blade Side Milling"] },
  { displayName: "5X Turbine Spiral Roughing", code: "5X:5 AXIS Turbine Spiral Roughing", category: "5axis", aliases: ["3D 5-Axis Blade Roughing"] },
  { displayName: "5X Blade Roughing", code: "5X:5 AXIS Blade Roughing", category: "5axis", aliases: [] },
  { displayName: "5X Blade Fillet Machining", code: "5X:5 AXIS Blade Fillet Machining", category: "5axis", aliases: ["3D 5-Axis Blade Fillet Machining"] },
  { displayName: "5X Blade Platform Machining", code: "5X:5 AXIS Blade Platform Machining", category: "5axis", aliases: ["3D 5-Axis Blade Platform Machining"] },
  { displayName: "5X Blade Tangent Milling", code: "5X:5 AXIS Blade Tangent Milling", category: "5axis", aliases: ["3D 5-Axis Blade Tangent Milling"] },
  { displayName: "5X Tube Milling", code: "5X:5 AXIS Tube Milling", category: "5axis", aliases: ["3D 5-Axis Tube Milling"] },
  { displayName: "5X Tube Roughing", code: "5X:5 AXIS Tube Roughing", category: "5axis", aliases: ["3D 5-Axis Tube Roughing"] },
  { displayName: "5X Tube Finishing", code: "5X:5 AXIS Tube Finishing", category: "5axis", aliases: ["3D 5-Axis Tube Finishing"] },
  { displayName: "5X Slot Machining", code: "5X:5 AXIS Slot Machining", category: "5axis", aliases: ["3D 5-Axis Slot Machining"] },
  { displayName: "5X Boss Machining", code: "5X:5 AXIS Boss Machining", category: "5axis", aliases: ["3D 5-Axis Boss Machining"] },
  { displayName: "5X Boss Roughing", code: "5X:5 AXIS Boss Roughing", category: "5axis", aliases: ["3D 5-Axis Boss Roughing"] },
  { displayName: "5X Z-Level Roughing", code: "5X:5 AXIS Z-level Roughing", category: "5axis", aliases: ["3D 5-Axis Z-Level Roughing"] },
  { displayName: "5X Optimized Rest Roughing", code: "5X:5 AXIS Optimized Rest Roughing", category: "5axis", aliases: [] },
  { displayName: "5X Corner Rest Machining", code: "5X:5 AXIS Corner Rest Machining", category: "5axis", aliases: [] },
  { displayName: "5X Radial Machining", code: "5X:5 AXIS Radial Machining", category: "5axis", aliases: [] },
  { displayName: "5X Impeller Hub Finishing", code: "5X:5 AXIS Impeller Hub Finishing", category: "5axis", aliases: ["3D 5-Axis Impeller Hub Finishing"] },
  { displayName: "5X Impeller Edge Machining", code: "5X:5 AXIS Impeller Edge Mashining", category: "5axis", aliases: ["3D 5-Axis Impeller Edge Machining"] },
  { displayName: "5X Impeller Flank Milling", code: "5X:5 AXIS Impeller Flank Milling", category: "5axis", aliases: ["3D 5-Axis Impeller Flank Milling"] },
  { displayName: "5X Impeller Point Milling", code: "5X:5 AXIS Impeller Point Milling", category: "5axis", aliases: ["3D 5-Axis Impeller Point Milling"] },
  { displayName: "5X Impeller Machining", code: "5X:5 AXIS Impeller Machining", category: "5axis", aliases: ["3D 5-Axis Impeller Machining"] },
  { displayName: "5X Impeller Fillet Machining", code: "5X:5 AXIS Impeller Fillet Machining", category: "5axis", aliases: ["3D 5-Axis Impeller Fillet Machining"] },
  { displayName: "5X Impeller Plunge Roughing", code: "5X:5 AXIS Impeller Plunge Roughing", category: "5axis", aliases: ["3D 5-Axis Impeller Plunge Roughing"] },
  { displayName: "5X Shrouded Impeller Finishing", code: "5X:5 AXIS Shrouded Impeller Finishing", category: "5axis", aliases: ["3D 5-Axis Shrouded Impeller Finishing"] },
  { displayName: "5X Multi-Blade Probe Cycle", code: "5X:5 AXIS Multi Blade Probe Cycle", category: "5axis", aliases: ["3D 5-Axis Impeller Measuring"] },
  { displayName: "5X Tangential Machining", code: "5X:5 AXIS Tangential Machining", category: "5axis", aliases: ["3D 5-Axis Tangential Machining"] },
  { displayName: "5X Plane Machining", code: "5X:5 AXIS Plane Machining", category: "5axis", aliases: ["3D 5-Axis Plane Machining"] },
  { displayName: "5X Shape Level Machining", code: "5X:5 AXIS Shape Level Machining", category: "5axis", aliases: ["3D 5-Axis Flank Contact"] },
  { displayName: "5X Additive Manufacturing", code: "5X:5 AXIS Additive Manufacturing", category: "5axis", aliases: ["3D 5-Axis Additive Manufacturing"] },
  { displayName: "5X Prismatic Fillet Finishing", code: "5X:5 Axis Prismatic Fillet Finishing", category: "5axis", aliases: [] },
  { displayName: "5X Link", code: "5L:5 AXIS Link", category: "5axis", aliases: ["3D 5-Axis Link"] },
  { displayName: "5X Linking", code: "5X:5 AXIS Linking", category: "5axis", aliases: ["3D 5-Axis Linking"] },

  // --- MillTurn ---
  { displayName: "Millturn Roughing", code: "MT:Millturn Roughing", category: "millturn", aliases: ["Turning Roughing"] },
  { displayName: "Millturn Recessing", code: "MT:Millturn Recessing", category: "millturn", aliases: ["Turning Recessing", "Recessing"] },
  { displayName: "Thread Turning", code: "MT:Thread Turning", category: "millturn", aliases: ["openMIND Thread Turning"] },
  { displayName: "Linking Turning", code: "MT:Linking Turning", category: "millturn", aliases: [] },
  { displayName: "Turning Parting", code: "MT:Turning Parting", category: "millturn", aliases: [] },
  { displayName: "Rough Turning", code: "MT:Rough Turning", category: "millturn", aliases: [] },
  { displayName: "Contour Parallel Turning", code: "MT:Contour parallel Turning", category: "millturn", aliases: [] },
  { displayName: "Finish Turning", code: "MT:Finish Turning", category: "millturn", aliases: [] },
  { displayName: "Groove Turning", code: "MT:Groove Turning", category: "millturn", aliases: [] },
  { displayName: "Groove Plunging", code: "MT:Groove Plunging", category: "millturn", aliases: [] },
  { displayName: "Groove Finishing", code: "MT:Groove Finishing", category: "millturn", aliases: [] },
  { displayName: "Face Groove Turning", code: "MT:Face Groove Turning", category: "millturn", aliases: [] },
  { displayName: "Face Groove Plunging", code: "MT:Face Groove Plunging", category: "millturn", aliases: [] },
  { displayName: "Face Groove Finishing", code: "MT:Face Groove Finishing", category: "millturn", aliases: [] },
  { displayName: "B-Axis Rough Turning", code: "MT:B-Axis Rough Turning", category: "millturn", aliases: [] },
  { displayName: "B-Axis Finish Turning", code: "MT:B-Axis Finish Turning", category: "millturn", aliases: [] },
  { displayName: "Roll Turning", code: "MT:Roll Turning", category: "millturn", aliases: [] },
  { displayName: "Turning Part Transfer", code: "MT:Turning Part Transfer", category: "millturn", aliases: [] },

  // --- APT ---
  { displayName: "APT", code: "3D:APT", category: "apt", aliases: [] },
  { displayName: "APT Multax", code: "5X:APT Multax", category: "apt", aliases: [] },

  // --- Probing ---
  { displayName: "3D Probing", code: "2D:Probing", category: "probing", aliases: [] },
  { displayName: "Rectangular Probing", code: "2D:Rectangular Probing", category: "probing", aliases: [] },
  { displayName: "Circular Probing", code: "2D:Circular Probing", category: "probing", aliases: [] },
  { displayName: "Axis Dependent Probing", code: "2D:Axis Dependent Probing", category: "probing", aliases: [] },
  { displayName: "Workpiece Alignment (Edge)", code: "2D:Workpiece alignment along edge", category: "probing", aliases: [] },
  { displayName: "Workpiece Alignment (Holes)", code: "2D:Workpiece alignment with holes", category: "probing", aliases: [] },
  { displayName: "Measure Plane", code: "2D:Measure Plane", category: "probing", aliases: [] },
  { displayName: "Slot-Ridge Probing", code: "2D:Slot-Ridge Probing", category: "probing", aliases: [] },

  // --- Grinding ---
  { displayName: "Contour Grinding on 3D Model", code: "2D:Contour Grinding on 3D Model", category: "grinding", aliases: [] },

  // --- NC Text ---
  { displayName: "NC File", code: "NC:NC Text", category: "2d", aliases: [] },
];

// ============================================================================
// ENGINE
// ============================================================================

export class HyperMillCycleCatalogEngine {
  /** Get all cycles. */
  listAll(): HyperMillCycle[] {
    return CYCLES;
  }

  /** Get cycles by category. */
  byCategory(category: CycleCategory): HyperMillCycle[] {
    return CYCLES.filter((c) => c.category === category);
  }

  /** Search cycles by name or alias (case-insensitive substring). */
  search(query: string): HyperMillCycle[] {
    const q = query.toLowerCase();
    return CYCLES.filter(
      (c) =>
        c.displayName.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.aliases.some((a) => a.toLowerCase().includes(q)),
    );
  }

  /** Look up a cycle by its exact code. */
  lookupByCode(code: string): HyperMillCycle | null {
    return CYCLES.find((c) => c.code === code) ?? null;
  }

  /** Get category counts. */
  stats(): Record<CycleCategory, number> & { total: number } {
    const counts = {} as Record<CycleCategory, number>;
    for (const c of CYCLES) {
      counts[c.category] = (counts[c.category] ?? 0) + 1;
    }
    return { ...counts, total: CYCLES.length };
  }
}

export const hyperMillCycleCatalogEngine = new HyperMillCycleCatalogEngine();
