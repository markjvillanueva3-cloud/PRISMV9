/**
 * SpringbackPredictionEngine — Elastic recovery after machining thin walls/floors.
 *
 * Predicts dimensional error from workpiece springback when cutting forces
 * are removed. Critical for thin-wall aerospace parts (ribs, webs, flanges).
 *
 * Models:
 * - Cantilever beam springback for thin walls
 * - Plate bending for thin floors
 * - Residual stress-induced distortion
 * - Compensation strategy (overcut amount)
 *
 * Ref: Ratchev et al. (2004), Wan & Zhang (2006).
 */

interface AtomicValue<T> { value: T; unit: string; formula?: string; confidence?: number; }

export interface SpringbackInput {
  feature: {
    type: "thin_wall" | "thin_floor" | "rib" | "web" | "flange";
    thickness_mm: number;
    height_mm: number;         // wall height or floor span
    length_mm: number;
    support_condition: "cantilever" | "simply_supported" | "fixed_fixed";
  };
  material: {
    iso_group: "P" | "M" | "K" | "N" | "S" | "H";
    youngs_modulus_gpa?: number;
    yield_strength_mpa?: number;
    poissons_ratio?: number;
  };
  cutting: {
    radial_force_n: number;     // force normal to thin wall
    axial_depth_mm: number;
    feed_per_tooth_mm: number;
    passes: number;             // number of finishing passes
  };
  tolerance_mm: number;
}

export interface SpringbackResult {
  max_deflection_mm: number;
  springback_mm: number;         // elastic recovery after tool passes
  residual_distortion_mm: number; // permanent from residual stress
  total_error_mm: number;
  within_tolerance: boolean;
  compensation: {
    overcut_mm: number;           // how much to overcut to compensate
    strategy: string;
    extra_passes: number;
    recommended_depth_mm: number;
  };
  stiffness_ratio: number;       // wall stiffness / cutting force ratio
  natural_frequency_hz: number;  // first mode — chatter risk if near tooth passing freq
  recommendations: string[];
}

const E_MOD: Record<string, number> = {
  P: 210, M: 200, K: 120, N: 70, S: 114, H: 210,
};
const YIELD: Record<string, number> = {
  P: 500, M: 400, K: 300, N: 280, S: 900, H: 1200,
};
const DENSITY: Record<string, number> = {
  P: 7850, M: 8000, K: 7200, N: 2700, S: 4500, H: 7850,
};

export class SpringbackPredictionEngine {
  compute(input: SpringbackInput): AtomicValue<SpringbackResult> {
    const { feature: feat, material: mat, cutting, tolerance_mm } = input;

    const E = (mat.youngs_modulus_gpa ?? E_MOD[mat.iso_group] ?? 210) * 1000; // MPa
    const sigma_y = mat.yield_strength_mpa ?? YIELD[mat.iso_group] ?? 500;
    const rho = DENSITY[mat.iso_group] ?? 7850;
    const nu = mat.poissons_ratio ?? 0.3;

    const t = feat.thickness_mm;
    const h = feat.height_mm;
    const L = feat.length_mm;
    const F = cutting.radial_force_n;

    let maxDeflection: number;
    let stiffness: number; // N/mm

    if (feat.type === "thin_floor") {
      // Plate bending: δ = α × F × a² / (E × t³)
      // Simply supported rectangular plate with center load
      const a = Math.min(h, L); // shorter span
      const D = (E * t * t * t) / (12 * (1 - nu * nu)); // plate rigidity
      const alpha = feat.support_condition === "cantilever" ? 0.25
        : feat.support_condition === "simply_supported" ? 0.0116
        : 0.0054; // fixed-fixed
      maxDeflection = alpha * F * a * a / D;
      stiffness = F / Math.max(maxDeflection, 1e-6);
    } else {
      // Wall: cantilever beam
      const I = (L * t * t * t) / 12; // moment of inertia

      if (feat.support_condition === "cantilever") {
        // δ = F × h³ / (3 × E × I)
        maxDeflection = (F * h * h * h) / (3 * E * I);
      } else if (feat.support_condition === "simply_supported") {
        maxDeflection = (F * h * h * h) / (48 * E * I);
      } else {
        // Fixed-fixed
        maxDeflection = (F * h * h * h) / (192 * E * I);
      }
      stiffness = F / Math.max(maxDeflection, 1e-6);
    }

    // Springback = elastic recovery (most of the deflection springs back)
    const plasticRatio = Math.min(1, (F / (L * t)) / sigma_y); // fraction that yields
    const springback = maxDeflection * (1 - plasticRatio);

    // Residual stress distortion (from previous passes)
    const residualStressFraction = 0.05 * cutting.passes; // accumulates per pass
    const residualDistortion = maxDeflection * Math.min(0.3, residualStressFraction);

    const totalError = springback + residualDistortion;
    const withinTolerance = totalError <= tolerance_mm;

    // Natural frequency (first mode cantilever)
    const I_wall = (L * t * t * t) / 12;
    const m_per_length = rho * L * t / 1e9; // kg/mm
    const lambda = 1.875; // first mode
    const fn = (lambda * lambda / (2 * Math.PI * h * h)) * Math.sqrt((E * I_wall) / m_per_length);

    // Compensation strategy
    const overcut = springback * 0.85; // compensate 85% of springback
    const recDepth = Math.min(cutting.axial_depth_mm, t * 0.1); // max 10% of wall thickness per pass
    const extraPasses = Math.ceil(cutting.axial_depth_mm / recDepth) - cutting.passes;

    const stiffnessRatio = stiffness / Math.max(F, 1);

    // Recommendations
    const recs: string[] = [];
    if (!withinTolerance) {
      recs.push(`Total error ${totalError.toFixed(3)}mm exceeds tolerance ${tolerance_mm}mm — compensation required.`);
    }
    if (stiffnessRatio < 10) {
      recs.push(`Low stiffness ratio (${stiffnessRatio.toFixed(1)}) — risk of chatter and poor accuracy.`);
    }
    if (t < 2 && cutting.radial_force_n > 100) {
      recs.push("Thin wall <2mm with >100N radial force — use climb milling and light passes.");
    }
    if (overcut > tolerance_mm * 0.5) {
      recs.push(`Overcut compensation ${overcut.toFixed(3)}mm — program tool offset in CAM.`);
    }
    if (fn < 500) {
      recs.push(`Low natural frequency ${fn.toFixed(0)}Hz — risk of resonance. Use damped toolholder.`);
    }
    if (cutting.passes < 3 && t < 3) {
      recs.push("Increase to 3+ light finishing passes to reduce deflection per pass.");
    }
    if (feat.support_condition === "cantilever" && h / t > 15) {
      recs.push(`H/t ratio ${(h / t).toFixed(1)} — very flexible. Consider leaving stock web for support, machine last.`);
    }

    const strategy = stiffnessRatio < 5
      ? "Multi-pass with progressive depth + overcut compensation"
      : stiffnessRatio < 20
        ? "Light finishing pass with overcut compensation"
        : "Standard machining — springback within tolerance";

    return {
      value: {
        max_deflection_mm: Math.round(maxDeflection * 10000) / 10000,
        springback_mm: Math.round(springback * 10000) / 10000,
        residual_distortion_mm: Math.round(residualDistortion * 10000) / 10000,
        total_error_mm: Math.round(totalError * 10000) / 10000,
        within_tolerance: withinTolerance,
        compensation: {
          overcut_mm: Math.round(overcut * 10000) / 10000,
          strategy,
          extra_passes: Math.max(0, extraPasses),
          recommended_depth_mm: Math.round(recDepth * 1000) / 1000,
        },
        stiffness_ratio: Math.round(stiffnessRatio * 10) / 10,
        natural_frequency_hz: Math.round(fn),
        recommendations: recs,
      },
      unit: "mm",
      formula: "δ = F×L³/(3EI), springback = δ×(1-plastic_ratio) [Ratchev]",
      confidence: 0.75,
    };
  }
}

export const springbackPredictionEngine = new SpringbackPredictionEngine();
