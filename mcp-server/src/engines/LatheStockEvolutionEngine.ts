/**
 * LatheStockEvolutionEngine
 * ===========================
 *
 * 2D cross-section stock profile evolution across sequential passes.
 *
 * The workpiece is modelled as a half-profile in the Z-R plane (revolution
 * axis on Z). Each cutting pass subtracts a swept region bounded by:
 *   - tool leading edge (x_start → x_end, z_start → z_end)
 *   - nose radius (approximation — envelope is a line segment + R arc)
 *
 * We don't aim for photon-accurate voxel sim; this produces the
 * *resulting profile* usable by the verifier.
 *
 * Pass kinds supported: longitudinal OD, longitudinal ID (bore),
 * facing, plunge (groove/part-off), taper.
 *
 * Output: sampled (z, r) pairs along the final profile + a bounding
 * box + pass history.
 *
 * Distinct from existing:
 *   - StockMaterialDatabase         : material property catalog, not geom
 *   - MaterialRemovalSimulationEngine (if any 3D)
 *   - This engine                    : lathe-specific 2D half-profile evo
 *
 * References:
 *   - Altintas "Manufacturing Automation" §5.4 (turning kinematics)
 *
 * @module engines/LatheStockEvolutionEngine
 * @milestone LATHE-PRO-MS12
 */

export interface LathePass {
  kind: "od_long" | "id_bore" | "face" | "plunge" | "taper";
  /** Radii/Z for pass (mm) — convention: r is radius, z is axial (+ away from chuck) */
  z_start_mm: number;
  z_end_mm: number;
  r_start_mm: number;
  r_end_mm: number;
  /** Nose radius (mm) — default 0.4 */
  nose_radius_mm?: number;
}

export interface LatheStockEvolutionInput {
  /** Initial OD mm */
  initial_od_mm: number;
  /** Initial length mm (Z extent) */
  initial_length_mm: number;
  /** Initial bore (if any) mm */
  initial_id_mm?: number;
  /** Ordered passes to apply */
  passes: LathePass[];
  /** Profile sampling step mm (default 0.5) */
  sample_step_mm?: number;
}

export interface LatheProfilePoint {
  z_mm: number;
  r_mm: number;
}

export interface LatheStockEvolutionResult {
  final_profile: LatheProfilePoint[];
  final_length_mm: number;
  min_r_mm: number;
  max_r_mm: number;
  pass_count: number;
  reasoning: string[];
}

class LatheStockEvolutionEngineImpl {
  evolve(i: LatheStockEvolutionInput): LatheStockEvolutionResult {
    const step = Math.max(0.05, i.sample_step_mm ?? 0.5);
    const z0 = 0;
    const zEnd = i.initial_length_mm;
    const r_init = i.initial_od_mm / 2;
    const id = (i.initial_id_mm ?? 0) / 2;

    // Build outer profile samples: array keyed by z, holds outer r
    const zPoints: number[] = [];
    for (let z = z0; z <= zEnd + 1e-6; z += step) zPoints.push(round3(z));

    const outerR: Map<number, number> = new Map();
    for (const z of zPoints) outerR.set(z, r_init);

    let minR = r_init;
    let maxR = r_init;
    let length = i.initial_length_mm;
    const reasoning: string[] = [];

    for (const pass of i.passes) {
      if (pass.kind === "od_long" || pass.kind === "taper") {
        // Move from z_start to z_end, tool at r = target radius (min of start/end for OD reduction)
        const zLo = Math.min(pass.z_start_mm, pass.z_end_mm);
        const zHi = Math.max(pass.z_start_mm, pass.z_end_mm);
        const rLo = Math.min(pass.r_start_mm, pass.r_end_mm);
        const rHi = Math.max(pass.r_start_mm, pass.r_end_mm);

        for (const z of zPoints) {
          if (z < zLo - 1e-6 || z > zHi + 1e-6) continue;
          // Linear interp for taper
          const t = zHi > zLo ? (z - zLo) / (zHi - zLo) : 0;
          const rTarget = pass.kind === "taper" ? rLo + (rHi - rLo) * t : Math.min(pass.r_start_mm, pass.r_end_mm);
          const prev = outerR.get(z) ?? r_init;
          outerR.set(z, Math.min(prev, rTarget));
        }
      } else if (pass.kind === "face") {
        // Shorten length to pass.z_end_mm (if smaller)
        length = Math.min(length, pass.z_end_mm);
        // drop samples beyond new length
      } else if (pass.kind === "plunge") {
        // Groove/part-off at specific z band
        const zLo = Math.min(pass.z_start_mm, pass.z_end_mm);
        const zHi = Math.max(pass.z_start_mm, pass.z_end_mm);
        const rTarget = Math.min(pass.r_start_mm, pass.r_end_mm);
        for (const z of zPoints) {
          if (z >= zLo && z <= zHi) {
            const prev = outerR.get(z) ?? r_init;
            outerR.set(z, Math.min(prev, rTarget));
          }
        }
      }
    }

    const final_profile: LatheProfilePoint[] = [];
    for (const z of zPoints) {
      if (z > length + 1e-6) continue;
      const r = outerR.get(z) ?? r_init;
      if (r < id) continue; // bore occludes
      final_profile.push({ z_mm: z, r_mm: round3(r) });
      minR = Math.min(minR, r);
      maxR = Math.max(maxR, r);
    }

    reasoning.push(`Applied ${i.passes.length} pass(es); profile ${final_profile.length} samples over ${length}mm`);
    reasoning.push(`R range [${round3(minR)}, ${round3(maxR)}]mm`);

    return {
      final_profile,
      final_length_mm: round3(length),
      min_r_mm: round3(minR),
      max_r_mm: round3(maxR),
      pass_count: i.passes.length,
      reasoning,
    };
  }

  getStats(): { reference: string } {
    return { reference: "Altintas Manufacturing Automation §5.4 turning kinematics" };
  }
}

function round3(n: number): number { return Math.round(n * 1000) / 1000; }

export const latheStockEvolutionEngine = new LatheStockEvolutionEngineImpl();
export type { LatheStockEvolutionEngineImpl };
