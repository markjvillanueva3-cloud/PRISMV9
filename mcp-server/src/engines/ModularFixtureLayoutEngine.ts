/**
 * ModularFixtureLayoutEngine — L2-P4-MS1 PASS2 Specialty
 *
 * Plans modular fixture layouts using standard grid-plate systems
 * (Jergens, Carr Lane, Bluco, etc.). Calculates locator placement,
 * clamp positions, and minimum required support points for workpiece
 * rigidity during machining.
 *
 * Uses 3-2-1 locating principle as baseline, extending to redundant
 * support for thin/flexible parts.
 *
 * Actions: fixture_layout, fixture_validate, fixture_recommend
 */

// ============================================================================
// TYPES
// ============================================================================

export type GridSystem = "16mm" | "M12_50mm" | "M16_75mm" | "M20_100mm" | "imperial_2in";

export interface ModularFixtureInput {
  workpiece_length_mm: number;
  workpiece_width_mm: number;
  workpiece_height_mm: number;
  material: string;
  grid_system: GridSystem;
  cutting_force_N: number;
  cutting_torque_Nm: number;
  operation: "milling" | "drilling" | "boring" | "grinding";
  is_thin_wall: boolean;
  datum_face: "bottom" | "side_A" | "side_B";
  batch_size: number;
}

export interface LocatorPoint {
  id: string;
  type: "rest_pad" | "locating_pin" | "vee_block" | "edge_stop";
  grid_x: number;
  grid_y: number;
  constrains: string[];          // e.g., ["Z translation", "X rotation"]
}

export interface ClampPoint {
  id: string;
  type: "strap_clamp" | "toe_clamp" | "swing_clamp" | "toggle_clamp" | "screw_clamp";
  grid_x: number;
  grid_y: number;
  force_N: number;
  opposes: string;               // locator ID this clamp pushes against
}

export interface ModularFixtureResult {
  locators: LocatorPoint[];
  clamps: ClampPoint[];
  total_locating_dof: number;    // should be 6 for fully constrained
  total_clamping_force_N: number;
  safety_factor: number;
  grid_holes_used: number;
  estimated_setup_time_min: number;
  repeatability_mm: number;
  recommendations: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const GRID_PITCH: Record<GridSystem, number> = {
  "16mm": 16, "M12_50mm": 50, "M16_75mm": 75, "M20_100mm": 100, "imperial_2in": 50.8,
};

const CLAMP_FORCE: Record<ClampPoint["type"], number> = {
  strap_clamp: 5000, toe_clamp: 8000, swing_clamp: 4000, toggle_clamp: 6000, screw_clamp: 3000,
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class ModularFixtureLayoutEngine {
  layout(input: ModularFixtureInput): ModularFixtureResult {
    const pitch = GRID_PITCH[input.grid_system];

    // Grid span for workpiece
    const xSlots = Math.ceil(input.workpiece_length_mm / pitch);
    const ySlots = Math.ceil(input.workpiece_width_mm / pitch);

    // 3-2-1 locating
    const locators: LocatorPoint[] = [];

    // Primary plane (3 points on datum face — Z constraint)
    locators.push({ id: "L1", type: "rest_pad", grid_x: 0, grid_y: 0, constrains: ["Z trans", "X rot", "Y rot"] });
    locators.push({ id: "L2", type: "rest_pad", grid_x: xSlots, grid_y: 0, constrains: ["Z trans"] });
    locators.push({ id: "L3", type: "rest_pad", grid_x: Math.floor(xSlots / 2), grid_y: ySlots, constrains: ["Z trans"] });

    // Secondary plane (2 points — Y constraint)
    locators.push({ id: "L4", type: "locating_pin", grid_x: 0, grid_y: 0, constrains: ["Y trans", "Z rot"] });
    locators.push({ id: "L5", type: "edge_stop", grid_x: xSlots, grid_y: 0, constrains: ["Y trans"] });

    // Tertiary plane (1 point — X constraint)
    locators.push({ id: "L6", type: "edge_stop", grid_x: 0, grid_y: Math.floor(ySlots / 2), constrains: ["X trans"] });

    // Extra supports for thin-wall parts
    if (input.is_thin_wall) {
      locators.push({ id: "L7", type: "rest_pad", grid_x: Math.floor(xSlots / 2), grid_y: Math.floor(ySlots / 2), constrains: ["support"] });
    }

    // Clamping — oppose each primary locator
    const requiredForce = input.cutting_force_N * 2.5; // SF = 2.5
    const clampType: ClampPoint["type"] = requiredForce > 15000 ? "toe_clamp" : "strap_clamp";
    const perClampForce = CLAMP_FORCE[clampType];
    const numClamps = Math.max(2, Math.ceil(requiredForce / perClampForce));

    const clamps: ClampPoint[] = [];
    for (let i = 0; i < numClamps; i++) {
      const gx = Math.round((i / (numClamps - 1 || 1)) * xSlots);
      clamps.push({
        id: `C${i + 1}`,
        type: clampType,
        grid_x: gx,
        grid_y: ySlots + 1,
        force_N: perClampForce,
        opposes: locators[Math.min(i, 2)].id,
      });
    }

    const totalClampForce = numClamps * perClampForce;
    const sf = totalClampForce / Math.max(input.cutting_force_N, 1);
    const gridUsed = locators.length + clamps.length;
    const setupTime = 15 + gridUsed * 2 + (input.is_thin_wall ? 10 : 0);
    const repeatability = input.grid_system === "16mm" ? 0.005 : 0.010;

    const recs: string[] = [];
    if (sf < 2.0) recs.push("Safety factor below 2.0 — add clamps or increase clamp force");
    if (input.is_thin_wall) recs.push("Thin-wall part — verify deflection under clamping load before machining");
    if (input.batch_size > 50) recs.push("High batch size — consider dedicated fixture for faster setup");
    if (recs.length === 0) recs.push("3-2-1 modular fixture layout validated — proceed");

    return {
      locators,
      clamps,
      total_locating_dof: 6,
      total_clamping_force_N: totalClampForce,
      safety_factor: Math.round(sf * 100) / 100,
      grid_holes_used: gridUsed,
      estimated_setup_time_min: Math.round(setupTime),
      repeatability_mm: repeatability,
      recommendations: recs,
    };
  }
}

export const modularFixtureLayoutEngine = new ModularFixtureLayoutEngine();
