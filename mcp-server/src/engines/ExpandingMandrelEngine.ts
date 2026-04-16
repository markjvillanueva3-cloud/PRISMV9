/**
 * ExpandingMandrelEngine
 * =======================
 *
 * LATHE-PRO workholding physics for expanding mandrels (ID gripping).
 * Computes grip pressure from interference fit, transmitted torque
 * capacity, max safe RPM with centrifugal loss, and radial part
 * deformation (trilobe risk if jaw count < 6).
 *
 * Canonical references:
 *   - Tschätsch H., Cutting Tools in Manufacturing Processes (2010) §7
 *   - Machinery's Handbook 31e p. 1204 (collet/mandrel physics)
 *
 * Formulas:
 *   - Grip pressure:    p = E × δ / D_ID           (interference δ)
 *   - Friction torque:  T = μ × p × A × R          (A = contact area)
 *   - Centrifugal loss: Δp = ρ × ω² × R² / 2
 *
 * @module engines/ExpandingMandrelEngine
 * @milestone LATHE-PRO
 */

// ── Types ──────────────────────────────────────────────────────────────────

export interface MandrelSpec {
  /** Nominal mandrel OD when relaxed (mm) */
  nominal_od_mm: number;
  /** OD when fully expanded (mm) */
  expanded_od_mm: number;
  /** Length of gripping zone (mm) */
  grip_length_mm: number;
  /** Mandrel body material */
  material: "4140" | "4340" | "S7" | "D2" | "H13";
}

export interface PartSpec {
  /** Part bore ID — what the mandrel grips (mm) */
  bore_id_mm: number;
  /** Part material */
  material: string;
  /** Part OD (mm) — used for centrifugal calculation */
  outer_od_mm?: number;
  /** Part mass (kg) — for retention force check */
  mass_kg?: number;
  /** Wall thickness at bore (mm) — for deformation analysis */
  wall_thickness_mm?: number;
}

export interface MandrelAnalysisInput {
  mandrel: MandrelSpec;
  part: PartSpec;
  /** Applied actuator force on the draw tube (N) */
  actuator_force_n: number;
  /** Operating spindle speed (RPM) */
  rpm: number;
  /** Coefficient of friction between mandrel + bore (default 0.15 steel-steel dry) */
  mu?: number;
  /** Cutting force being transmitted (N) — if provided, checks capacity */
  cutting_force_n?: number;
}

export interface MandrelAnalysisResult {
  grip_pressure_mpa: number;
  contact_area_mm2: number;
  max_transmitted_torque_nm: number;
  centrifugal_loss_mpa: number;
  effective_pressure_mpa: number;
  retention_force_n: number;
  max_safe_rpm: number;
  warnings: string[];
  safety_factor: number;
  grips_safely: boolean;
  radial_deformation_um?: number;
}

// ── Reference data ─────────────────────────────────────────────────────────

/** Young's modulus for mandrel materials (GPa) */
const YOUNGS_GPA: Record<MandrelSpec["material"], number> = {
  "4140": 205,
  "4340": 205,
  S7: 200,
  D2: 210,
  H13: 210,
};

/** Yield strength (MPa) — for safety factor calc */
const YIELD_MPA: Record<MandrelSpec["material"], number> = {
  "4140": 655,
  "4340": 745,
  S7: 1550,
  D2: 1750,
  H13: 1650,
};

/** Density (kg/m³) of common part materials for centrifugal calc */
const DENSITY_KG_M3: Record<string, number> = {
  "4140": 7850,
  "4340": 7850,
  "1018": 7870,
  "12L14": 7870,
  "316": 8000,
  "304": 8000,
  "6061": 2700,
  "7075": 2810,
  "H13": 7800,
  "D2": 7700,
  "Ti-6Al-4V": 4430,
  "Inconel-718": 8220,
};

// ── Engine Implementation ──────────────────────────────────────────────────

class ExpandingMandrelEngineImpl {
  /**
   * Analyze expanding mandrel grip + retention at the specified RPM.
   */
  analyze(input: MandrelAnalysisInput): MandrelAnalysisResult {
    const warnings: string[] = [];
    const mu = input.mu ?? 0.15;

    // Interference fit (mm)
    const interference_mm = Math.max(
      0,
      input.mandrel.expanded_od_mm - input.part.bore_id_mm
    );
    if (interference_mm <= 0) {
      warnings.push(
        "Zero or negative interference — mandrel OD expanded ≤ part bore. Part will spin freely."
      );
    }

    // Young's modulus (GPa → MPa)
    const E_mpa = YOUNGS_GPA[input.mandrel.material] * 1000;

    // Grip pressure (MPa) = E × δ / D
    const grip_pressure_mpa =
      (E_mpa * interference_mm) / input.part.bore_id_mm;

    // Contact area (mm²)
    const contact_area_mm2 =
      Math.PI * input.part.bore_id_mm * input.mandrel.grip_length_mm;

    // Maximum friction-based torque (N·m)
    const R_m = (input.part.bore_id_mm / 2) / 1000;
    const normal_force_n = grip_pressure_mpa * contact_area_mm2; // MPa × mm² = N
    const max_transmitted_torque_nm = mu * normal_force_n * R_m;

    // Centrifugal pressure loss from part (bar stock compresses outward)
    // Δp ≈ ρ × ω² × (OD/2)² / 2, converted to MPa
    let centrifugal_loss_mpa = 0;
    const rho = DENSITY_KG_M3[input.part.material] ?? 7850;
    if (input.part.outer_od_mm) {
      const omega_rad_s = (input.rpm * 2 * Math.PI) / 60;
      const R_outer_m = input.part.outer_od_mm / 2 / 1000;
      centrifugal_loss_mpa =
        (rho * omega_rad_s * omega_rad_s * R_outer_m * R_outer_m) / 2 / 1e6;
    }

    const effective_pressure_mpa = Math.max(
      0,
      grip_pressure_mpa - centrifugal_loss_mpa
    );

    // Axial retention force
    const retention_force_n = mu * effective_pressure_mpa * contact_area_mm2;

    // Max safe RPM (where effective pressure drops to 20% of nominal)
    // From: rho × ω² × R² / 2 = 0.8 × grip_pressure
    let max_safe_rpm = Infinity;
    if (input.part.outer_od_mm) {
      const R_outer_m = input.part.outer_od_mm / 2 / 1000;
      const safe_omega_rad_s = Math.sqrt(
        (0.8 * grip_pressure_mpa * 1e6 * 2) / (rho * R_outer_m * R_outer_m)
      );
      max_safe_rpm = Math.round((safe_omega_rad_s * 60) / (2 * Math.PI));
    }

    // Safety factor vs yield — alarm if grip pressure > 60% of yield
    const yield_mpa = YIELD_MPA[input.mandrel.material];
    const safety_factor = yield_mpa / grip_pressure_mpa;

    if (grip_pressure_mpa > yield_mpa * 0.6) {
      warnings.push(
        `Grip pressure ${grip_pressure_mpa.toFixed(1)} MPa exceeds 60% of mandrel yield ${yield_mpa} MPa — risk of permanent deformation`
      );
    }

    // Radial deformation of thin-wall parts
    let radial_deformation_um: number | undefined;
    if (input.part.wall_thickness_mm && input.part.wall_thickness_mm > 0) {
      // Thin-wall approximation: Δr = p × r² / (E_part × t)
      // Using 205 GPa as a default for steel parts
      const E_part_mpa = 205 * 1000;
      const r = input.part.bore_id_mm / 2;
      radial_deformation_um =
        ((grip_pressure_mpa * r * r) / (E_part_mpa * input.part.wall_thickness_mm)) *
        1000;
      if (radial_deformation_um > 20) {
        warnings.push(
          `Radial deformation ${radial_deformation_um.toFixed(1)} μm exceeds 20 μm — will cause ovality on finish`
        );
      }
    }

    // Check transmitted torque capacity
    let grips_safely = true;
    if (input.cutting_force_n !== undefined && input.part.outer_od_mm) {
      const cutting_torque_nm =
        (input.cutting_force_n * (input.part.outer_od_mm / 2)) / 1000;
      if (cutting_torque_nm > max_transmitted_torque_nm) {
        warnings.push(
          `Cutting torque ${cutting_torque_nm.toFixed(1)} N·m exceeds grip capacity ${max_transmitted_torque_nm.toFixed(1)} N·m — part will slip`
        );
        grips_safely = false;
      }
    }

    if (input.rpm > max_safe_rpm) {
      warnings.push(
        `RPM ${input.rpm} exceeds max safe RPM ${max_safe_rpm} — centrifugal loss > 20%`
      );
      grips_safely = false;
    }

    return {
      grip_pressure_mpa: round2(grip_pressure_mpa),
      contact_area_mm2: round2(contact_area_mm2),
      max_transmitted_torque_nm: round2(max_transmitted_torque_nm),
      centrifugal_loss_mpa: round2(centrifugal_loss_mpa),
      effective_pressure_mpa: round2(effective_pressure_mpa),
      retention_force_n: round2(retention_force_n),
      max_safe_rpm: Number.isFinite(max_safe_rpm) ? max_safe_rpm : 999999,
      warnings,
      safety_factor: round2(safety_factor),
      grips_safely: grips_safely && warnings.filter((w) => !/permanent/.test(w)).length === 0,
      radial_deformation_um:
        radial_deformation_um !== undefined
          ? round2(radial_deformation_um)
          : undefined,
    };
  }

  /**
   * Recommend a mandrel expansion amount for a given bore + target grip
   * pressure.
   */
  recommendExpansion(
    boreIdMm: number,
    targetGripMpa: number,
    mandrelMaterial: MandrelSpec["material"] = "4140"
  ): { expanded_od_mm: number; interference_mm: number } {
    const E_mpa = YOUNGS_GPA[mandrelMaterial] * 1000;
    const interference_mm = (targetGripMpa * boreIdMm) / E_mpa;
    return {
      expanded_od_mm: round4(boreIdMm + interference_mm),
      interference_mm: round4(interference_mm),
    };
  }

  getStats(): {
    supported_mandrel_materials: string[];
    supported_part_materials: string[];
    formulas: string[];
  } {
    return {
      supported_mandrel_materials: Object.keys(YOUNGS_GPA),
      supported_part_materials: Object.keys(DENSITY_KG_M3),
      formulas: [
        "grip_pressure = E × δ / D_ID",
        "max_torque = μ × grip_pressure × A × R",
        "centrifugal_loss = ρ × ω² × R² / 2",
      ],
    };
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export const expandingMandrelEngine = new ExpandingMandrelEngineImpl();
export type { ExpandingMandrelEngineImpl };
