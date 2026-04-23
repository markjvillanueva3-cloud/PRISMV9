/**
 * SurfaceIntegrityPredictorEngine — Predict surface integrity from cutting parameters.
 *
 * Models: roughness (Ra, Rz, Rt), residual stress, microhardness, white layer,
 * and subsurface damage as functions of cutting speed, feed, and tool geometry.
 *
 * Uses empirical+physics models: scallop height, Brammertz formula,
 * Merchant force model for residual stress estimation.
 */

interface AtomicValue<T> { value: T; unit: string; formula?: string; confidence?: number; }

export interface SurfaceIntegrityInput {
  tool: {
    nose_radius_mm: number;
    edge_radius_um?: number;
    rake_angle_deg?: number;
    flank_wear_vb_mm?: number;
  };
  cutting: {
    feed_per_rev_mm?: number;
    feed_per_tooth_mm?: number;
    flute_count?: number;
    cutting_speed_m_min: number;
    axial_depth_mm: number;
    radial_depth_mm?: number;
  };
  material: {
    iso_group: "P" | "M" | "K" | "N" | "S" | "H";
    hardness_hrc?: number;
    yield_strength_mpa?: number;
    thermal_conductivity_w_mk?: number;
  };
  process: "turning" | "milling" | "grinding";
  coolant: "flood" | "mist" | "mql" | "dry" | "cryogenic";
}

export interface SurfaceIntegrityResult {
  roughness: {
    ra_um: number;
    rz_um: number;
    rt_um: number;
    model_used: string;
  };
  residual_stress: {
    surface_mpa: number;
    type: "compressive" | "tensile" | "neutral";
    depth_of_influence_um: number;
    max_compressive_mpa: number;
    crossover_depth_um: number;
  };
  subsurface: {
    white_layer_risk: "none" | "low" | "medium" | "high";
    white_layer_depth_um: number;
    affected_zone_depth_um: number;
    microhardness_change_pct: number;
  };
  quality_grade: "N1" | "N2" | "N3" | "N4" | "N5" | "N6" | "N7" | "N8" | "N9" | "N10";
  process_recommendations: string[];
}

const YIELD_STRENGTH: Record<string, number> = {
  P: 600, M: 450, K: 350, N: 250, S: 900, H: 1200,
};

const THERMAL_K: Record<string, number> = {
  P: 50, M: 15, K: 80, N: 170, S: 7, H: 30,
};

export class SurfaceIntegrityPredictorEngine {
  compute(input: SurfaceIntegrityInput): AtomicValue<SurfaceIntegrityResult> {
    const { tool, cutting, material, process, coolant } = input;

    // Feed per rev calculation
    const fpr = cutting.feed_per_rev_mm ||
      (cutting.feed_per_tooth_mm && cutting.flute_count
        ? cutting.feed_per_tooth_mm * cutting.flute_count
        : 0.15);

    const Rn = tool.nose_radius_mm;
    const vc = cutting.cutting_speed_m_min;
    const yieldStr = material.yield_strength_mpa || YIELD_STRENGTH[material.iso_group] || 600;
    const thermalK = material.thermal_conductivity_w_mk || THERMAL_K[material.iso_group] || 50;

    // ── Roughness Models ──

    let ra: number, rz: number, rt: number;
    let modelUsed: string;

    if (process === "turning" || process === "milling") {
      // Brammertz formula: Rt = f²/(8r) + r_e (minimum uncut chip thickness effect)
      const edgeRadius = (tool.edge_radius_um || 5) / 1000; // mm
      const kinematicRt = (fpr * fpr) / (8 * Rn);
      const ploughingEffect = edgeRadius * 0.5;

      // Tool wear effect
      const wearEffect = (tool.flank_wear_vb_mm || 0) * 2;

      rt = kinematicRt + ploughingEffect + wearEffect;

      // Speed effect on roughness (BUE at low speed, thermal at high speed)
      const speedFactor = vc < 50 ? 1.3 : vc > 300 ? 1.1 : 1.0;
      rt *= speedFactor;

      // Ra ≈ Rt / 4 (typical for periodic profiles)
      ra = rt / 4;
      // Rz ≈ Rt × 0.8
      rz = rt * 0.8;

      // Coolant effect
      const coolantFactor = coolant === "flood" ? 0.85 : coolant === "mql" ? 0.9 :
        coolant === "cryogenic" ? 0.82 : coolant === "mist" ? 0.92 : 1.0;
      ra *= coolantFactor;
      rz *= coolantFactor;
      rt *= coolantFactor;

      modelUsed = "Brammertz+speed_correction+wear_effect";
    } else {
      // Grinding: Ra depends on wheel grain size and infeed
      ra = 0.2 + cutting.axial_depth_mm * 0.5;
      rz = ra * 4;
      rt = rz * 1.3;
      modelUsed = "grinding_empirical";
    }

    // ── Residual Stress ──

    // Mechanical effect: compressive (proportional to force)
    const mechanicalStress = -yieldStr * 0.3 * (fpr / 0.1); // compressive at low feed

    // Thermal effect: tensile (proportional to temperature)
    const tempEstimate = 300 * Math.pow(vc / 100, 0.5) * Math.pow(fpr / 0.1, 0.3) / Math.pow(thermalK / 50, 0.4);
    const thermalStress = yieldStr * 0.15 * (tempEstimate / 500);

    // Net surface stress
    const surfaceStress = mechanicalStress + thermalStress;

    // Dry/high-speed tends toward tensile; flood/low-speed toward compressive
    const coolantStressFactor = coolant === "flood" ? 0.7 : coolant === "cryogenic" ? 0.5 :
      coolant === "dry" ? 1.3 : 1.0;
    const netStress = Math.round(surfaceStress * coolantStressFactor);

    const stressType = netStress < -50 ? "compressive" as const
      : netStress > 50 ? "tensile" as const
      : "neutral" as const;

    // Depth of influence (typically 50-300 μm)
    const depthOfInfluence = Math.round(50 + vc * 0.3 + fpr * 200);
    const maxCompressive = Math.round(Math.min(netStress, mechanicalStress * 0.8));
    const crossoverDepth = Math.round(depthOfInfluence * 0.4);

    // ── Subsurface Damage ──

    // White layer risk (thermal damage)
    const tempScore = tempEstimate / 700; // normalize to typical threshold
    const whiteLayerRisk = tempScore > 1.5 ? "high" as const
      : tempScore > 1.0 ? "medium" as const
      : tempScore > 0.6 ? "low" as const
      : "none" as const;

    const whiteLayerDepth = whiteLayerRisk === "high" ? Math.round(tempScore * 15)
      : whiteLayerRisk === "medium" ? Math.round(tempScore * 8) : 0;

    const affectedZone = Math.round(depthOfInfluence * 1.5);
    const hardnessChange = Math.round((tempScore - 0.5) * 15);

    // ── Quality Grade (ISO 1302) ──
    const grade = ra <= 0.012 ? "N1" as const : ra <= 0.025 ? "N2" as const
      : ra <= 0.05 ? "N3" as const : ra <= 0.1 ? "N4" as const
      : ra <= 0.2 ? "N5" as const : ra <= 0.4 ? "N6" as const
      : ra <= 0.8 ? "N7" as const : ra <= 1.6 ? "N8" as const
      : ra <= 3.2 ? "N9" as const : "N10" as const;

    // ── Recommendations ──
    const recs: string[] = [];
    if (stressType === "tensile" && netStress > 200) {
      recs.push(`High tensile residual stress (${netStress}MPa) — reduces fatigue life. Use flood coolant or lower speed.`);
    }
    if (whiteLayerRisk === "high" || whiteLayerRisk === "medium") {
      recs.push(`White layer risk: ${whiteLayerRisk} — reduce cutting speed or use cryogenic cooling.`);
    }
    if (ra > 1.6 && fpr > 0.15) {
      recs.push(`Ra ${ra.toFixed(2)}μm — reduce feed per rev to improve surface finish.`);
    }
    if (tool.flank_wear_vb_mm && tool.flank_wear_vb_mm > 0.2) {
      recs.push(`Tool wear VB=${tool.flank_wear_vb_mm}mm — replace tool to improve surface integrity.`);
    }
    if (coolant === "dry" && material.iso_group === "S") {
      recs.push("Dry machining of ISO S material — high thermal damage risk. Use MQL or cryogenic.");
    }

    const result: SurfaceIntegrityResult = {
      roughness: {
        ra_um: Math.round(ra * 1000) / 1000,
        rz_um: Math.round(rz * 1000) / 1000,
        rt_um: Math.round(rt * 1000) / 1000,
        model_used: modelUsed,
      },
      residual_stress: {
        surface_mpa: netStress,
        type: stressType,
        depth_of_influence_um: depthOfInfluence,
        max_compressive_mpa: maxCompressive,
        crossover_depth_um: crossoverDepth,
      },
      subsurface: {
        white_layer_risk: whiteLayerRisk,
        white_layer_depth_um: whiteLayerDepth,
        affected_zone_depth_um: affectedZone,
        microhardness_change_pct: hardnessChange,
      },
      quality_grade: grade,
      process_recommendations: recs,
    };

    return {
      value: result,
      unit: "surface_integrity",
      formula: "Brammertz+Merchant+thermal_model",
      confidence: 0.78,
    };
  }
}

export const surfaceIntegrityPredictorEngine = new SurfaceIntegrityPredictorEngine();
