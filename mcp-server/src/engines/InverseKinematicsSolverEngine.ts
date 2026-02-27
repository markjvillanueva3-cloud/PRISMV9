/**
 * InverseKinematicsSolverEngine — L2-P4-MS1 PASS2 Specialty
 *
 * Solves inverse kinematics for 5-axis CNC machines.
 * Given desired tool tip position and orientation, calculates
 * required axis positions for the machine's kinematic chain.
 *
 * Handles multiple solutions (up to 4 for table-table configs)
 * and selects the one with minimum axis motion.
 *
 * Actions: ik_solve, ik_multi_solution, ik_validate
 */

// ============================================================================
// TYPES
// ============================================================================

export type IKKinematicType = "table_table_AC" | "table_table_BC" | "head_head_AC" | "head_head_BC" | "mixed";

export interface IKInput {
  kinematic_type: IKKinematicType;
  // Desired tool tip position (workpiece coordinates)
  tip_x_mm: number;
  tip_y_mm: number;
  tip_z_mm: number;
  // Desired tool axis orientation (unit vector)
  axis_i: number;
  axis_j: number;
  axis_k: number;
  // Machine geometry
  pivot_length_mm: number;            // pivot point to spindle face
  tool_gauge_length_mm: number;
  // Previous axis positions (for minimum motion selection)
  prev_A_deg?: number;
  prev_B_deg?: number;
  prev_C_deg?: number;
}

export interface IKSolution {
  X_mm: number;
  Y_mm: number;
  Z_mm: number;
  A_deg?: number;
  B_deg?: number;
  C_deg: number;
  total_axis_motion_deg: number;      // sum of angular changes from previous
  is_preferred: boolean;
}

export interface IKResult {
  solutions: IKSolution[];
  selected: IKSolution;
  num_solutions: number;
  degenerate: boolean;                // near singularity
  recommendations: string[];
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class InverseKinematicsSolverEngine {
  solve(input: IKInput): IKResult {
    const { axis_i: i, axis_j: j, axis_k: k } = input;

    // Normalize tool axis
    const mag = Math.sqrt(i * i + j * j + k * k);
    const ni = i / mag, nj = j / mag, nk = k / mag;

    // Check for degeneracy (tool axis parallel to rotary axis)
    const degenerate = Math.abs(nk) > 0.999;

    const solutions: IKSolution[] = [];

    if (input.kinematic_type.includes("AC")) {
      // A-C kinematics
      // A = acos(k)  (tilt from Z)
      const A_rad = Math.acos(Math.max(-1, Math.min(1, nk)));
      const A_deg = A_rad * 180 / Math.PI;

      // C = atan2(i, -j) for tool axis projection in XY
      let C_deg: number;
      if (Math.abs(Math.sin(A_rad)) > 0.001) {
        C_deg = Math.atan2(ni, -nj) * 180 / Math.PI;
      } else {
        C_deg = input.prev_C_deg || 0; // at singularity, keep previous C
      }

      // Solution 1: direct
      const sol1 = this._computeLinearAxes(input, A_deg, C_deg, "A");
      solutions.push({ ...sol1, A_deg, C_deg, is_preferred: false, total_axis_motion_deg: 0 });

      // Solution 2: alternate (A negated, C + 180°)
      if (!degenerate) {
        const A2 = -A_deg;
        const C2 = C_deg + 180;
        const sol2 = this._computeLinearAxes(input, A2, C2, "A");
        solutions.push({ ...sol2, A_deg: A2, C_deg: C2, is_preferred: false, total_axis_motion_deg: 0 });
      }
    } else {
      // B-C kinematics
      const B_rad = Math.acos(Math.max(-1, Math.min(1, nk)));
      const B_deg = B_rad * 180 / Math.PI;

      let C_deg: number;
      if (Math.abs(Math.sin(B_rad)) > 0.001) {
        C_deg = Math.atan2(-ni, nj) * 180 / Math.PI;
      } else {
        C_deg = input.prev_C_deg || 0;
      }

      const sol1 = this._computeLinearAxes(input, B_deg, C_deg, "B");
      solutions.push({ ...sol1, B_deg, C_deg, is_preferred: false, total_axis_motion_deg: 0 });

      if (!degenerate) {
        const B2 = -B_deg;
        const C2 = C_deg + 180;
        const sol2 = this._computeLinearAxes(input, B2, C2, "B");
        solutions.push({ ...sol2, B_deg: B2, C_deg: C2, is_preferred: false, total_axis_motion_deg: 0 });
      }
    }

    // Calculate total motion from previous position
    for (const sol of solutions) {
      let motion = 0;
      if (input.prev_A_deg !== undefined && sol.A_deg !== undefined) {
        motion += Math.abs(sol.A_deg - input.prev_A_deg);
      }
      if (input.prev_B_deg !== undefined && sol.B_deg !== undefined) {
        motion += Math.abs(sol.B_deg - input.prev_B_deg);
      }
      if (input.prev_C_deg !== undefined) {
        let dC = Math.abs(sol.C_deg - input.prev_C_deg);
        if (dC > 180) dC = 360 - dC;
        motion += dC;
      }
      sol.total_axis_motion_deg = Math.round(motion * 100) / 100;
    }

    // Select solution with minimum motion
    solutions.sort((a, b) => a.total_axis_motion_deg - b.total_axis_motion_deg);
    if (solutions.length > 0) solutions[0].is_preferred = true;

    const selected = solutions[0] || {
      X_mm: input.tip_x_mm, Y_mm: input.tip_y_mm, Z_mm: input.tip_z_mm,
      C_deg: 0, total_axis_motion_deg: 0, is_preferred: true,
    };

    const recs: string[] = [];
    if (degenerate) {
      recs.push("Near-singular orientation — C-axis position is ambiguous; using previous value");
    }
    if (selected.total_axis_motion_deg > 90) {
      recs.push("Large axis motion (>90°) — consider alternative solution or toolpath smoothing");
    }
    if (recs.length === 0) {
      recs.push("IK solution found — verify with machine simulation");
    }

    return {
      solutions,
      selected,
      num_solutions: solutions.length,
      degenerate,
      recommendations: recs,
    };
  }

  private _computeLinearAxes(
    input: IKInput, rotary1_deg: number, C_deg: number, primaryAxis: "A" | "B",
  ): { X_mm: number; Y_mm: number; Z_mm: number } {
    // Compute linear axis positions to place tool tip at desired location
    // accounting for rotary axis offsets
    const r1 = rotary1_deg * Math.PI / 180;
    const c = C_deg * Math.PI / 180;
    const L = input.tool_gauge_length_mm + input.pivot_length_mm;

    let dx = 0, dy = 0, dz = 0;

    if (primaryAxis === "A") {
      dx = L * Math.sin(r1) * Math.sin(c);
      dy = -L * Math.sin(r1) * Math.cos(c);
      dz = L * (1 - Math.cos(r1));
    } else {
      dx = L * Math.sin(r1) * Math.cos(c);
      dy = L * Math.sin(r1) * Math.sin(c);
      dz = L * (1 - Math.cos(r1));
    }

    return {
      X_mm: Math.round((input.tip_x_mm + dx) * 1000) / 1000,
      Y_mm: Math.round((input.tip_y_mm + dy) * 1000) / 1000,
      Z_mm: Math.round((input.tip_z_mm + dz) * 1000) / 1000,
    };
  }
}

export const inverseKinematicsSolverEngine = new InverseKinematicsSolverEngine();
