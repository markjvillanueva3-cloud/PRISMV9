/**
 * BurrFormationEngine — Predict exit burr formation in milling/drilling.
 *
 * Models burr height, thickness, and type based on:
 * - Exit angle and material ductility
 * - Feed rate and depth of cut
 * - Tool geometry (edge radius, rake angle)
 * - Workpiece edge geometry (sharp edge, chamfer, fillet)
 *
 * Ref: Gillespie & Blotter (1976), Hashimura et al. (1999),
 * Chern (2006) — Milling burr formation mechanisms.
 */

interface AtomicValue<T> { value: T; unit: string; formula?: string; confidence?: number; }

export interface BurrInput {
  operation: "milling" | "drilling" | "turning";
  tool: {
    diameter_mm: number;
    helix_angle_deg?: number;
    rake_angle_deg?: number;
    edge_radius_um?: number;
    point_angle_deg?: number;   // for drilling
  };
  cutting: {
    feed_per_tooth_mm?: number;
    feed_per_rev_mm?: number;
    axial_depth_mm: number;
    radial_depth_mm?: number;
    cutting_speed_m_min: number;
  };
  material: {
    iso_group: "P" | "M" | "K" | "N" | "S" | "H";
    ductility?: "low" | "medium" | "high";
    yield_strength_mpa?: number;
    elongation_pct?: number;
  };
  workpiece_edge: {
    type: "sharp" | "chamfered" | "radiused";
    chamfer_mm?: number;
    radius_mm?: number;
    exit_angle_deg?: number;  // angle of tool exit relative to edge (0=parallel, 90=perpendicular)
  };
}

export interface BurrPrediction {
  burr_type: "rollover" | "tear" | "poisson" | "cutoff" | "entrance";
  burr_height_um: number;
  burr_thickness_um: number;
  burr_root_radius_um: number;
  formation_mechanism: string;
  severity: "negligible" | "minor" | "moderate" | "severe";
  deburring_difficulty: "easy" | "medium" | "hard";
}

export interface BurrResult {
  exit_burrs: BurrPrediction[];
  entrance_burr: BurrPrediction | null;
  worst_case: BurrPrediction;
  total_deburring_time_s: number;
  cost_deburring_per_edge: number;
  prevention_strategies: {
    strategy: string;
    expected_reduction_pct: number;
    difficulty: "easy" | "medium" | "hard";
  }[];
  recommendations: string[];
}

const DUCTILITY: Record<string, string> = {
  P: "high", M: "medium", K: "low", N: "high", S: "medium", H: "low",
};

const YIELD_STR: Record<string, number> = {
  P: 600, M: 450, K: 350, N: 250, S: 900, H: 1200,
};

export class BurrFormationEngine {
  compute(input: BurrInput): AtomicValue<BurrResult> {
    const { operation, tool, cutting, material, workpiece_edge: edge } = input;

    const ductility = material.ductility || DUCTILITY[material.iso_group] || "medium";
    const yieldStr = material.yield_strength_mpa || YIELD_STR[material.iso_group] || 600;
    const elongation = material.elongation_pct || (ductility === "high" ? 25 : ductility === "medium" ? 15 : 5);

    const feed = cutting.feed_per_tooth_mm || cutting.feed_per_rev_mm || 0.1;
    const exitAngle = edge.exit_angle_deg ?? 90;
    const edgeRadius = (tool.edge_radius_um ?? 10) / 1000; // mm

    // Ductility factor (higher ductility → larger burrs)
    const ductFactor = elongation / 20; // normalized

    // Feed effect (higher feed → larger burrs, but also more likely to shear off)
    const feedFactor = Math.pow(feed / 0.1, 0.6);

    // Exit angle effect (perpendicular exit → worst burrs)
    const exitFactor = Math.sin((exitAngle * Math.PI) / 180);

    // Speed effect (higher speed → slightly smaller burrs due to temperature-assisted shearing)
    const speedFactor = Math.pow(200 / Math.max(50, cutting.cutting_speed_m_min), 0.2);

    // Edge radius effect (larger edge radius → more ploughing → larger burrs)
    const radiusFactor = Math.pow(edgeRadius / 0.01, 0.3);

    // Workpiece edge preparation effect
    const edgePrepFactor = edge.type === "chamfered" ? 0.4 : edge.type === "radiused" ? 0.6 : 1.0;

    // Base burr height (empirical model)
    const baseHeight = 50 * ductFactor * feedFactor * exitFactor * speedFactor * radiusFactor * edgePrepFactor;

    // Exit burr predictions
    const exitBurrs: BurrPrediction[] = [];

    // Rollover burr (most common in ductile materials)
    if (ductility !== "low") {
      const height = baseHeight * 1.0;
      const thickness = height * 0.3;
      exitBurrs.push({
        burr_type: "rollover",
        burr_height_um: Math.round(height),
        burr_thickness_um: Math.round(thickness),
        burr_root_radius_um: Math.round(edgeRadius * 1000 * 0.5),
        formation_mechanism: "Material rolls over edge without fracture due to ductility",
        severity: height > 200 ? "severe" : height > 100 ? "moderate" : height > 30 ? "minor" : "negligible",
        deburring_difficulty: height > 200 ? "hard" : height > 80 ? "medium" : "easy",
      });
    }

    // Tear burr (at high feed rates)
    if (feed > 0.15) {
      const height = baseHeight * 0.7 * (feed / 0.15);
      const thickness = height * 0.5;
      exitBurrs.push({
        burr_type: "tear",
        burr_height_um: Math.round(height),
        burr_thickness_um: Math.round(thickness),
        burr_root_radius_um: Math.round(edgeRadius * 1000 * 0.8),
        formation_mechanism: "Material tears along shear plane at workpiece edge",
        severity: height > 200 ? "severe" : height > 100 ? "moderate" : height > 30 ? "minor" : "negligible",
        deburring_difficulty: thickness > 50 ? "hard" : "medium",
      });
    }

    // Poisson burr (lateral expansion)
    if (cutting.axial_depth_mm > 2) {
      const height = baseHeight * 0.3 * (cutting.axial_depth_mm / 3);
      exitBurrs.push({
        burr_type: "poisson",
        burr_height_um: Math.round(height),
        burr_thickness_um: Math.round(height * 0.2),
        burr_root_radius_um: Math.round(edgeRadius * 1000 * 0.3),
        formation_mechanism: "Lateral material flow due to Poisson effect under compressive cutting forces",
        severity: height > 100 ? "moderate" : height > 30 ? "minor" : "negligible",
        deburring_difficulty: "easy",
      });
    }

    // Drilling-specific: cutoff burr
    if (operation === "drilling") {
      const drillBurrHeight = baseHeight * 1.5 * Math.pow(tool.diameter_mm / 10, 0.4);
      exitBurrs.push({
        burr_type: "cutoff",
        burr_height_um: Math.round(drillBurrHeight),
        burr_thickness_um: Math.round(drillBurrHeight * 0.4),
        burr_root_radius_um: Math.round(edgeRadius * 1000),
        formation_mechanism: "Cap-type burr at drill exit — material bends before fracture",
        severity: drillBurrHeight > 300 ? "severe" : drillBurrHeight > 150 ? "moderate" : "minor",
        deburring_difficulty: drillBurrHeight > 200 ? "hard" : "medium",
      });
    }

    // Entrance burr (usually small)
    let entranceBurr: BurrPrediction | null = null;
    if (ductility === "high") {
      const height = baseHeight * 0.15;
      entranceBurr = {
        burr_type: "entrance",
        burr_height_um: Math.round(height),
        burr_thickness_um: Math.round(height * 0.2),
        burr_root_radius_um: Math.round(edgeRadius * 1000 * 0.2),
        formation_mechanism: "Small rollover at tool entry in ductile materials",
        severity: height > 50 ? "minor" : "negligible",
        deburring_difficulty: "easy",
      };
    }

    // Worst case
    const allBurrs = [...exitBurrs, ...(entranceBurr ? [entranceBurr] : [])];
    const worstCase = allBurrs.sort((a, b) => b.burr_height_um - a.burr_height_um)[0] || exitBurrs[0];

    // Deburring time estimate (seconds per edge)
    const deburrTime = worstCase.deburring_difficulty === "hard" ? 30
      : worstCase.deburring_difficulty === "medium" ? 15 : 5;
    const deburrCost = deburrTime / 3600 * 50; // $50/hr labor rate

    // Prevention strategies
    const strategies: BurrResult["prevention_strategies"] = [];
    if (edge.type === "sharp") {
      strategies.push({ strategy: "Add 0.2mm chamfer at exit edge in CAD", expected_reduction_pct: 60, difficulty: "easy" });
    }
    if (feed > 0.12) {
      strategies.push({ strategy: `Reduce feed from ${feed}mm to ${(feed * 0.7).toFixed(3)}mm at exit`, expected_reduction_pct: 35, difficulty: "easy" });
    }
    if (exitAngle > 60) {
      strategies.push({ strategy: "Modify toolpath for oblique exit (30-45° exit angle)", expected_reduction_pct: 50, difficulty: "medium" });
    }
    if (ductility === "high" && cutting.cutting_speed_m_min < 200) {
      strategies.push({ strategy: "Increase cutting speed to promote clean shearing", expected_reduction_pct: 20, difficulty: "easy" });
    }
    if (operation === "drilling" && !tool.point_angle_deg) {
      strategies.push({ strategy: "Use 130° point angle drill to reduce exit burr cap", expected_reduction_pct: 25, difficulty: "easy" });
    }
    strategies.push({ strategy: "Use back-spotface or secondary deburring pass", expected_reduction_pct: 90, difficulty: "hard" });

    const recs: string[] = [];
    if (worstCase.severity === "severe") {
      recs.push(`Severe burr predicted (${worstCase.burr_height_um}μm) — mandatory deburring required.`);
    }
    if (exitBurrs.length > 2) {
      recs.push("Multiple burr types predicted — consider workpiece edge preparation.");
    }
    if (deburrCost > 0.5) {
      recs.push(`Deburring cost ~$${deburrCost.toFixed(2)}/edge — prevention strategies save ${strategies[0]?.expected_reduction_pct}%.`);
    }

    return {
      value: {
        exit_burrs: exitBurrs,
        entrance_burr: entranceBurr,
        worst_case: worstCase,
        total_deburring_time_s: deburrTime,
        cost_deburring_per_edge: Math.round(deburrCost * 100) / 100,
        prevention_strategies: strategies,
        recommendations: recs,
      },
      unit: "μm",
      formula: "h_burr = f(ductility, feed, exit_angle, edge_prep) [Chern+Gillespie]",
      confidence: 0.72,
    };
  }
}

export const burrFormationEngine = new BurrFormationEngine();
