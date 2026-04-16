/**
 * SurfaceFinishPredictorEngine — CAMK-MS2/U04
 * Predicts surface finish quality along novel toolpath segments.
 *
 * Models:
 * - Brammertz: Ra = f^2/(32R) + re/2 (theoretical roughness from feed & geometry)
 * - Scallop height: h = R - sqrt(R^2 - (ae/2)^2) for ball; ae^2/(8R) for flat end
 * - Waviness: Wt from vibration amplitude, tool deflection, thermal drift
 * - Composite: combines kinematic roughness + dynamic effects
 *
 * References:
 *   [1] Brammertz, P.H. (1961). "Die Entstehung der Oberflachenrauheit beim
 *       Feindrehen". Industrie-Anzeiger, 83(2), 25-32.
 *       (Foundational kinematic roughness model: Ra = f^2/(32R) + r_e/2)
 *   [2] Whitehouse, D.J. (2002). "Surfaces and their Measurement". Kogan Page
 *       Science. ISBN 978-1903996010.
 *       (Comprehensive treatment of surface texture parameters and measurement)
 *   [3] ISO 4287:1997. "Geometrical Product Specifications (GPS) — Surface
 *       texture: Profile method — Terms, definitions and surface texture
 *       parameters". (Defines Ra, Rz, Rt and evaluation procedures)
 *   [4] Benardos, P.G. & Vosniakos, G.-C. (2003). "Predicting surface roughness
 *       in machining: a review". Int. J. Mach. Tools Manuf., 43(8), 833-844.
 *       doi:10.1016/S0890-6955(03)00059-2
 */

import { machiningPlaybookEngine } from "./MachiningPlaybookEngine.js";
import { tribalKnowledgeEngine, type KnowledgeTip } from "./TribalKnowledgeEngine.js";

// ── Types ──────────────────────────────────────────────────────────────────

interface SegmentPoint {
  x: number; y: number; z: number;
  i?: number; j?: number; k?: number;
  ae_mm: number; ap_mm: number;
  rpm: number; feed_mmmin: number;
  fz_mm?: number;            // feed per tooth (if known)
}

interface ToolSpec {
  type: "flat" | "ball" | "barrel" | "bull_nose";
  diameter_mm: number;
  corner_radius_mm?: number;   // for bull_nose
  barrel_radius_mm?: number;   // for barrel
  edge_radius_um?: number;     // cutting edge radius (µm)
  flute_count?: number;
}

interface SurfaceFinishInput {
  segments: SegmentPoint[];
  tool: ToolSpec;
  algorithm?: string;
  target_ra_um?: number;       // target Ra in µm
  material?: string;           // for material correction factor
  coolant?: string;            // dry | flood | mist | mql | cryogenic
}

interface PointFinish {
  segment_idx: number;
  ra_um: number;               // arithmetic mean roughness
  rt_um: number;               // peak-to-valley roughness
  rz_um: number;               // ten-point height (≈ Rt for regular)
  scallop_um: number;          // scallop height from stepover
  waviness_um: number;         // dynamic waviness estimate
  composite_ra_um: number;     // combined kinematic + dynamic
  meets_target: boolean;
}

interface FinishSummary {
  mean_ra_um: number;
  max_ra_um: number;
  min_ra_um: number;
  std_ra_um: number;
  mean_scallop_um: number;
  max_scallop_um: number;
  pct_meeting_target: number;
  worst_segment_idx: number;
}

interface AlgorithmEffect {
  algorithm: string;
  effect: string;
  ra_correction_factor: number;
}

interface SurfaceFinishResult {
  points: PointFinish[];
  summary: FinishSummary;
  algorithm_effects: AlgorithmEffect[];
  recommendations: string[];
  target_ra_um: number;
  tribal_tips?: KnowledgeTip[];
}

interface QuickFinishResult {
  mean_ra_um: number;
  max_ra_um: number;
  mean_scallop_um: number;
  pct_meeting_target: number;
  recommendation: string;
}

// ── Material correction factors ──────────────────────────────────────────
const MATERIAL_RA_FACTOR: Record<string, number> = {
  aluminum: 0.85,       // softer → smoother
  "6061-T6": 0.85,
  "7075-T6": 0.88,
  mild_steel: 1.0,
  "4140": 1.05,
  stainless: 1.10,
  "316L": 1.12,
  titanium: 1.15,
  "Ti-6Al-4V": 1.18,
  inconel: 1.25,
  "Inconel 718": 1.25,
  cast_iron: 0.95,
  copper: 0.80,
  brass: 0.78,
};

const COOLANT_RA_FACTOR: Record<string, number> = {
  dry: 1.15,
  flood: 0.92,
  mist: 0.97,
  mql: 0.90,
  cryogenic: 0.88,
};

// ── Engine ──────────────────────────────────────────────────────────────────

class SurfaceFinishPredictorEngine {
  /**
   * Brammertz kinematic roughness model.
   * Rt = fz²/(8R) + re/2   (simplified for round inserts)
   * Ra ≈ Rt / 4            (for regular periodic profiles)
   */
  brammertzRa(fz_mm: number, toolRadius_mm: number, edgeRadius_um: number = 5): { ra_um: number; rt_um: number } {
    if (fz_mm <= 0 || toolRadius_mm <= 0) return { ra_um: 0, rt_um: 0 };
    const re_mm = edgeRadius_um / 1000;
    // Rt = f²/(8R) + re/2 (Brammertz 1961)
    const Rt_mm = (fz_mm * fz_mm) / (8 * toolRadius_mm) + re_mm / 2;
    const Rt_um = Rt_mm * 1000;
    const Ra_um = Rt_um / 4;
    return { ra_um: Math.max(Ra_um, 0.001), rt_um: Math.max(Rt_um, 0.004) };
  }

  /**
   * Scallop height from stepover (ae) and tool geometry.
   * Ball endmill: h = R - sqrt(R² - (ae/2)²)
   * Flat endmill: h = ae²/(8R) for cusp on inclined surface (approximation)
   * Barrel: h = R_barrel - sqrt(R_barrel² - (ae/2)²)
   */
  scallopHeight(ae_mm: number, tool: ToolSpec): number {
    if (ae_mm <= 0) return 0;
    const R = tool.diameter_mm / 2;

    switch (tool.type) {
      case "ball": {
        const half_ae = ae_mm / 2;
        if (half_ae >= R) return R * 1000; // full radius scallop (µm)
        return (R - Math.sqrt(R * R - half_ae * half_ae)) * 1000;
      }
      case "barrel": {
        const Rb = tool.barrel_radius_mm ?? 250;
        const half_ae = ae_mm / 2;
        if (half_ae >= Rb) return Rb * 1000;
        return (Rb - Math.sqrt(Rb * Rb - half_ae * half_ae)) * 1000;
      }
      case "bull_nose": {
        const cr = tool.corner_radius_mm ?? 1;
        const half_ae = ae_mm / 2;
        if (half_ae >= cr) return cr * 1000;
        return (cr - Math.sqrt(cr * cr - half_ae * half_ae)) * 1000;
      }
      case "flat":
      default: {
        // For flat endmill on inclined surface, cusp ≈ ae²/(8R)
        return (ae_mm * ae_mm / (8 * R)) * 1000;
      }
    }
  }

  /**
   * Dynamic waviness estimate from cutting conditions.
   * Wt ≈ k_vib × (Fc / k_tool) + k_thermal × ap
   * Simplified: proportional to force proxy and depth of cut.
   */
  wavinessEstimate(ap_mm: number, ae_mm: number, rpm: number, feed_mmmin: number, toolDia_mm: number): number {
    // Force proxy: ae × ap × feed (proportional to MRR)
    const forceProxy = ae_mm * ap_mm * (feed_mmmin / 1000);
    // Tool stiffness proxy: d⁴ (beam stiffness)
    const stiffProxy = Math.PI * Math.pow(toolDia_mm, 4) / 64; // I = π·d⁴/64
    // Vibration contribution
    const vibContrib = forceProxy / (stiffProxy + 0.01) * 0.5;
    // RPM-dependent dynamic effect (resonance risk at high RPM)
    const rpmFactor = rpm > 15000 ? 1.3 : rpm > 10000 ? 1.1 : 1.0;
    // Convert to µm, capped at reasonable range
    return Math.min(vibContrib * rpmFactor, 50);
  }

  /**
   * Algorithm-specific surface finish effects.
   */
  algorithmEffects(algorithm?: string): AlgorithmEffect[] {
    if (!algorithm) return [];
    const effects: AlgorithmEffect[] = [];
    const algo = algorithm.toUpperCase();

    if (algo === "HRAF") {
      effects.push({
        algorithm: "HRAF",
        effect: "Harmonic-resonance avoidance reduces chatter marks, improving Ra by ~15%",
        ra_correction_factor: 0.85,
      });
    }
    if (algo === "CFSF") {
      effects.push({
        algorithm: "CFSF",
        effect: "Constant-force control stabilizes cutting, reducing Ra variation by ~10%",
        ra_correction_factor: 0.90,
      });
    }
    if (algo === "PTDC") {
      effects.push({
        algorithm: "PTDC",
        effect: "Predictive deflection compensation improves geometric accuracy, Ra ~8% better",
        ra_correction_factor: 0.92,
      });
    }
    if (algo === "HBCF") {
      effects.push({
        algorithm: "HBCF",
        effect: "Barrel cutter finishing achieves ultra-low scallop with large effective radius",
        ra_correction_factor: 0.80,
      });
    }
    if (algo === "MACS") {
      effects.push({
        algorithm: "MACS",
        effect: "Multi-axis swarf cutting — surface quality depends on tool-surface conformity",
        ra_correction_factor: 0.95,
      });
    }
    if (algo === "TGAR") {
      effects.push({
        algorithm: "TGAR",
        effect: "Thermal-gradient roughing — finish is secondary, Ra typically higher",
        ra_correction_factor: 1.15,
      });
    }
    if (algo === "VCER") {
      effects.push({
        algorithm: "VCER",
        effect: "Vortex chip evacuation — improved chip clearing reduces re-cutting marks",
        ra_correction_factor: 0.93,
      });
    }
    if (algo === "MTHZD") {
      effects.push({
        algorithm: "MTHZD",
        effect: "Multi-tool hybrid zones — finish varies by zone, check per-zone Ra",
        ra_correction_factor: 1.0,
      });
    }
    return effects;
  }

  /**
   * Full surface finish prediction along toolpath segments.
   */
  predict(input: SurfaceFinishInput): SurfaceFinishResult {
    const { segments, tool, algorithm, target_ra_um = 1.6, material, coolant } = input;

    if (segments.length === 0) {
      return {
        points: [],
        summary: {
          mean_ra_um: 0, max_ra_um: 0, min_ra_um: 0, std_ra_um: 0,
          mean_scallop_um: 0, max_scallop_um: 0,
          pct_meeting_target: 100, worst_segment_idx: -1,
        },
        algorithm_effects: [],
        recommendations: [],
        target_ra_um,
      };
    }

    // For Ra formula: use nose/corner radius for flat/bull_nose, D/2 for ball endmills
    const R = tool.type === "ball" ? tool.diameter_mm / 2
      : (tool.corner_radius_mm ?? tool.diameter_mm / 2);
    const flutes = tool.flute_count ?? 2;
    const edgeR = tool.edge_radius_um ?? 5;
    const matFactor = (material && MATERIAL_RA_FACTOR[material]) ? MATERIAL_RA_FACTOR[material] : 1.0;
    const coolFactor = (coolant && COOLANT_RA_FACTOR[coolant]) ? COOLANT_RA_FACTOR[coolant] : 1.0;

    const algoEffects = this.algorithmEffects(algorithm);
    const algoFactor = algoEffects.reduce((acc, e) => acc * e.ra_correction_factor, 1.0);

    const points: PointFinish[] = segments.map((seg, idx) => {
      // Feed per tooth
      const fz = seg.fz_mm ?? (seg.feed_mmmin / (seg.rpm * flutes));

      // Brammertz kinematic roughness
      const { ra_um, rt_um } = this.brammertzRa(fz, R, edgeR);

      // Scallop from stepover
      const scallop_um = this.scallopHeight(seg.ae_mm, tool);

      // Dynamic waviness
      const waviness_um = this.wavinessEstimate(seg.ap_mm, seg.ae_mm, seg.rpm, seg.feed_mmmin, tool.diameter_mm);

      // Composite Ra: kinematic + scallop contribution + waviness
      // RSS combination: Ra_composite = sqrt(Ra_kinematic² + (scallop/4)² + waviness²)
      const scallop_ra_equiv = scallop_um / 4;
      const raw_composite = Math.sqrt(ra_um * ra_um + scallop_ra_equiv * scallop_ra_equiv + waviness_um * waviness_um);

      // Apply correction factors
      const composite_ra_um = raw_composite * matFactor * coolFactor * algoFactor;
      const corrected_ra = ra_um * matFactor * coolFactor * algoFactor;
      const rz_um = rt_um * 0.85; // Rz ≈ 0.85 × Rt for machined surfaces

      return {
        segment_idx: idx,
        ra_um: corrected_ra,
        rt_um: rt_um * matFactor * coolFactor,
        rz_um: rz_um * matFactor * coolFactor,
        scallop_um,
        waviness_um,
        composite_ra_um,
        meets_target: composite_ra_um <= target_ra_um,
      };
    });

    // Summary statistics
    const raValues = points.map(p => p.composite_ra_um);
    const scallopValues = points.map(p => p.scallop_um);
    const mean_ra = raValues.reduce((s, v) => s + v, 0) / raValues.length;
    const max_ra = Math.max(...raValues);
    const min_ra = Math.min(...raValues);
    const std_ra = Math.sqrt(raValues.reduce((s, v) => s + (v - mean_ra) ** 2, 0) / raValues.length);
    const mean_scallop = scallopValues.reduce((s, v) => s + v, 0) / scallopValues.length;
    const max_scallop = Math.max(...scallopValues);
    const meeting = points.filter(p => p.meets_target).length;
    const worst_idx = raValues.indexOf(max_ra);

    // Recommendations
    const recommendations: string[] = [];
    if (max_ra > target_ra_um) {
      recommendations.push(`Worst Ra ${max_ra.toFixed(2)}µm exceeds target ${target_ra_um}µm at segment ${worst_idx}`);
    }
    if (max_scallop > target_ra_um * 4) {
      recommendations.push(`Scallop height ${max_scallop.toFixed(1)}µm too high — reduce stepover or use ball/barrel cutter`);
    }
    if (std_ra > mean_ra * 0.3) {
      recommendations.push("High Ra variation — check for inconsistent cutting conditions along path");
    }
    if (mean_ra <= target_ra_um * 0.5) {
      recommendations.push("Surface finish well below target — consider increasing feed for productivity");
    }
    if (tool.type === "flat" && max_scallop > 10) {
      recommendations.push("Flat endmill scallop is high — consider ball or barrel cutter for better surface conformity");
    }

    const result: SurfaceFinishResult = {
      points,
      summary: {
        mean_ra_um: mean_ra,
        max_ra_um: max_ra,
        min_ra_um: min_ra,
        std_ra_um: std_ra,
        mean_scallop_um: mean_scallop,
        max_scallop_um: max_scallop,
        pct_meeting_target: (meeting / points.length) * 100,
        worst_segment_idx: worst_idx,
      },
      algorithm_effects: algoEffects,
      recommendations,
      target_ra_um,
    };

    const pbResult = machiningPlaybookEngine.advise({
      categories: ["finishing", "material_tip", "toolpath_strategy"],
      ...(segments.length > 0 ? { spindle_rpm: segments[0].rpm } : {}),
    });
    for (const rule of pbResult.rules) {
      if (rule.severity === "critical" || rule.severity === "important") {
        result.recommendations.push(`[Playbook ${rule.id}] ${rule.title}`);
      }
    }

    // ── TK-2: Tribal knowledge consumer wiring ──
    let tribal_tips: KnowledgeTip[] | undefined;
    try {
      tribal_tips = tribalKnowledgeEngine.search({
        category: "surface_finish",
        material_iso_group: (input as any).material_iso_group ?? (input as any).iso_group,
        query: "surface finish",
        min_confidence: 70,
        limit: 5,
      });
    } catch { /* tribal tips are advisory — never block prediction */ }
    result.tribal_tips = tribal_tips;

    return result;
  }

  /**
   * Quick prediction — returns summary only without per-point data.
   */
  quickPredict(input: SurfaceFinishInput): QuickFinishResult {
    const full = this.predict(input);
    const rec = full.recommendations.length > 0
      ? full.recommendations[0]
      : "Surface finish within target";
    return {
      mean_ra_um: full.summary.mean_ra_um,
      max_ra_um: full.summary.max_ra_um,
      mean_scallop_um: full.summary.mean_scallop_um,
      pct_meeting_target: full.summary.pct_meeting_target,
      recommendation: rec,
    };
  }

  /**
   * Compute optimal feed per tooth for target Ra.
   * From Brammertz: fz = sqrt(8R × (Ra_target × 4 / 1000 - re/2))
   */
  optimalFeedForRa(target_ra_um: number, toolRadius_mm: number, edgeRadius_um: number = 5): number {
    const re_mm = edgeRadius_um / 1000;
    const Rt_target_mm = (target_ra_um * 4) / 1000; // Ra ≈ Rt/4
    const inner = 8 * toolRadius_mm * (Rt_target_mm - re_mm / 2);
    if (inner <= 0) return 0; // edge radius alone exceeds target
    return Math.sqrt(inner);
  }

  /**
   * Compute optimal stepover for target scallop height (ball endmill).
   * ae = 2√(2Rh) where h = target scallop
   */
  optimalStepoverForScallop(target_scallop_um: number, tool: ToolSpec): number {
    const h_mm = target_scallop_um / 1000;
    if (tool.type === "ball") {
      const R = tool.diameter_mm / 2;
      return 2 * Math.sqrt(2 * R * h_mm);
    }
    if (tool.type === "barrel") {
      const Rb = tool.barrel_radius_mm ?? 250;
      return 2 * Math.sqrt(2 * Rb * h_mm);
    }
    // Flat: ae = sqrt(8Rh)
    const R = tool.diameter_mm / 2;
    return Math.sqrt(8 * R * h_mm);
  }
}

export const surfaceFinishPredictorEngine = new SurfaceFinishPredictorEngine();
export { SurfaceFinishPredictorEngine };
