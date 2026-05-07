/**
 * WorkholdingSelectionEngine — MIO-MS0/U-MIO14
 *
 * AI-driven workholding selection engine that recommends fixture type
 * based on part geometry, forces, accuracy requirements, and production volume.
 *
 * Decision Tree:
 *   1. Simple prismatic, low volume → Standard vise
 *   2. Simple prismatic, high volume → Dedicated fixture
 *   3. Complex datum scheme → Custom fixture required
 *   4. Thin/flexible parts → Soft jaws or vacuum
 *   5. Round parts → Collet/chuck
 *   6. High accuracy → Precision fixture with dowels
 *
 * Factors considered:
 * - Part geometry (prismatic, cylindrical, complex)
 * - Production volume (prototype, low, medium, high)
 * - Accuracy requirements (tolerance, surface finish)
 * - Cutting forces (clamping adequacy)
 * - Part rigidity (thin walls, deflection risk)
 * - Datum scheme complexity
 *
 * @module engines/WorkholdingSelectionEngine
 * @milestone MIO-MS0
 */

import { log } from "../utils/Logger.js";

export type WorkholdingType =
  | "standard_vise"
  | "precision_vise"
  | "soft_jaws"
  | "dedicated_fixture"
  | "modular_fixture"
  | "vacuum"
  | "magnetic"
  | "collet"
  | "3_jaw_chuck"
  | "4_jaw_chuck"
  | "custom_fixture";

export type PartGeometry = "prismatic" | "cylindrical" | "complex" | "thin_wall" | "irregular";
export type ProductionVolume = "prototype" | "low" | "medium" | "high";

export interface WorkholdingInput {
  part_geometry: PartGeometry;
  part_dimensions_mm: { length: number; width: number; height: number };
  production_volume: ProductionVolume;
  tolerance_mm?: number;
  surface_finish_ra_um?: number;
  cutting_force_n?: number;
  wall_thickness_mm?: number;
  datum_count?: number;
  has_complex_datums?: boolean;
  material?: string;
  is_magnetic?: boolean;
  operations?: string[];
}

export interface WorkholdingScore {
  type: WorkholdingType;
  score: number;
  pros: string[];
  cons: string[];
}

export interface WorkholdingResult {
  recommended: WorkholdingType;
  confidence: number;
  alternatives: WorkholdingScore[];
  requires_custom_fixture: boolean;
  custom_fixture_triggers: string[];
  clamping_force_adequate: boolean;
  estimated_setup_time_min: number;
  estimated_fixture_cost_usd: number;
  justification: string[];
  ai_reasoning: string[];
}

// Setup times by fixture type (minutes)
const SETUP_TIMES: Record<WorkholdingType, number> = {
  standard_vise: 10,
  precision_vise: 15,
  soft_jaws: 25,
  dedicated_fixture: 5,
  modular_fixture: 20,
  vacuum: 15,
  magnetic: 8,
  collet: 5,
  "3_jaw_chuck": 10,
  "4_jaw_chuck": 20,
  custom_fixture: 5,
};

// Approximate fixture costs (USD)
const FIXTURE_COSTS: Record<WorkholdingType, number> = {
  standard_vise: 0,
  precision_vise: 0,
  soft_jaws: 150,
  dedicated_fixture: 2000,
  modular_fixture: 500,
  vacuum: 300,
  magnetic: 0,
  collet: 50,
  "3_jaw_chuck": 0,
  "4_jaw_chuck": 0,
  custom_fixture: 5000,
};

class WorkholdingSelectionEngine {
  /**
   * Select optimal workholding method
   */
  select(input: WorkholdingInput): WorkholdingResult {
    const reasoning: string[] = [];
    const justification: string[] = [];
    const customTriggers: string[] = [];

    reasoning.push(`[WORKHOLD] Analyzing: ${input.part_geometry}, ${input.production_volume} volume`);
    reasoning.push(`[WORKHOLD] Part: ${input.part_dimensions_mm.length}×${input.part_dimensions_mm.width}×${input.part_dimensions_mm.height}mm`);

    // Check for custom fixture triggers
    if (input.has_complex_datums) {
      customTriggers.push("Complex datum scheme requires custom fixture");
    }
    if (input.datum_count && input.datum_count > 3) {
      customTriggers.push(`Multiple datums (${input.datum_count}) require dedicated fixturing`);
    }
    if (input.production_volume === "high" && input.part_geometry !== "cylindrical") {
      customTriggers.push("High volume production justifies dedicated fixture investment");
    }
    if (input.tolerance_mm && input.tolerance_mm < 0.02) {
      customTriggers.push(`Tight tolerance (±${input.tolerance_mm * 1000}µm) requires precision fixturing`);
    }

    // Score each workholding type
    const scores = this.scoreWorkholding(input, reasoning);

    // Sort by score
    scores.sort((a, b) => b.score - a.score);

    const recommended = scores[0].type;
    const confidence = scores[0].score;
    const alternatives = scores.slice(1, 4);

    // Build justification
    justification.push(`Selected ${recommended} based on:`);
    justification.push(...scores[0].pros.map(p => `  + ${p}`));
    if (scores[0].cons.length > 0) {
      justification.push("Considerations:");
      justification.push(...scores[0].cons.map(c => `  - ${c}`));
    }

    // Check clamping adequacy
    const clampingAdequate = this.checkClampingAdequacy(recommended, input.cutting_force_n || 500);

    reasoning.push(`[WORKHOLD] Recommended: ${recommended} (confidence: ${(confidence * 100).toFixed(0)}%)`);
    if (customTriggers.length > 0) {
      reasoning.push(`[WORKHOLD] Custom fixture triggers: ${customTriggers.length}`);
    }

    return {
      recommended,
      confidence,
      alternatives,
      requires_custom_fixture: customTriggers.length > 0 || recommended === "custom_fixture",
      custom_fixture_triggers: customTriggers,
      clamping_force_adequate: clampingAdequate,
      estimated_setup_time_min: SETUP_TIMES[recommended],
      estimated_fixture_cost_usd: FIXTURE_COSTS[recommended],
      justification,
      ai_reasoning: reasoning,
    };
  }

  /**
   * Score all workholding types
   */
  private scoreWorkholding(input: WorkholdingInput, reasoning: string[]): WorkholdingScore[] {
    const scores: WorkholdingScore[] = [];

    // Standard vise
    scores.push(this.scoreStandardVise(input));

    // Precision vise
    scores.push(this.scorePrecisionVise(input));

    // Soft jaws
    scores.push(this.scoreSoftJaws(input));

    // Dedicated fixture
    scores.push(this.scoreDedicatedFixture(input));

    // Modular fixture
    scores.push(this.scoreModularFixture(input));

    // Vacuum
    scores.push(this.scoreVacuum(input));

    // Magnetic (if applicable)
    if (input.is_magnetic !== false) {
      scores.push(this.scoreMagnetic(input));
    }

    // Cylindrical options
    if (input.part_geometry === "cylindrical") {
      scores.push(this.scoreCollet(input));
      scores.push(this.score3JawChuck(input));
    }

    return scores;
  }

  private scoreStandardVise(input: WorkholdingInput): WorkholdingScore {
    let score = 0.5;
    const pros: string[] = [];
    const cons: string[] = [];

    if (input.part_geometry === "prismatic") {
      score += 0.3;
      pros.push("Ideal for prismatic parts");
    }
    if (input.production_volume === "prototype" || input.production_volume === "low") {
      score += 0.2;
      pros.push("Quick setup for low volume");
    }
    if (input.part_dimensions_mm.width <= 150) {
      score += 0.1;
      pros.push("Part fits standard vise jaw width");
    } else {
      score -= 0.3;
      cons.push("Part too wide for standard vise");
    }
    if (input.tolerance_mm && input.tolerance_mm < 0.025) {
      score -= 0.2;
      cons.push("May not achieve tight tolerance");
    }

    return { type: "standard_vise", score: Math.max(0, Math.min(1, score)), pros, cons };
  }

  private scorePrecisionVise(input: WorkholdingInput): WorkholdingScore {
    let score = 0.4;
    const pros: string[] = [];
    const cons: string[] = [];

    if (input.part_geometry === "prismatic") score += 0.2;
    if (input.tolerance_mm && input.tolerance_mm < 0.025) {
      score += 0.3;
      pros.push("High accuracy vise for tight tolerances");
    }
    if (input.production_volume === "low" || input.production_volume === "medium") {
      score += 0.1;
      pros.push("Good for low-medium volume precision work");
    }
    if (input.part_dimensions_mm.width > 150) {
      score -= 0.3;
      cons.push("Part exceeds jaw capacity");
    }

    return { type: "precision_vise", score: Math.max(0, Math.min(1, score)), pros, cons };
  }

  private scoreSoftJaws(input: WorkholdingInput): WorkholdingScore {
    let score = 0.4;
    const pros: string[] = [];
    const cons: string[] = [];

    if (input.part_geometry === "complex" || input.part_geometry === "irregular") {
      score += 0.3;
      pros.push("Conforms to irregular shapes");
    }
    if (input.wall_thickness_mm && input.wall_thickness_mm < 3) {
      score += 0.25;
      pros.push("Distributed clamping protects thin walls");
    }
    if (input.production_volume === "medium" || input.production_volume === "high") {
      score += 0.1;
      pros.push("Justifies jaw machining time");
    }
    cons.push("Requires machining custom jaws");

    return { type: "soft_jaws", score: Math.max(0, Math.min(1, score)), pros, cons };
  }

  private scoreDedicatedFixture(input: WorkholdingInput): WorkholdingScore {
    let score = 0.3;
    const pros: string[] = [];
    const cons: string[] = [];

    if (input.production_volume === "high") {
      score += 0.4;
      pros.push("Fastest cycle time for high volume");
    }
    if (input.has_complex_datums) {
      score += 0.3;
      pros.push("Ensures consistent datum location");
    }
    if (input.production_volume === "prototype") {
      score -= 0.4;
      cons.push("Cost not justified for prototype");
    }
    cons.push("Requires design and manufacturing time");

    return { type: "dedicated_fixture", score: Math.max(0, Math.min(1, score)), pros, cons };
  }

  private scoreModularFixture(input: WorkholdingInput): WorkholdingScore {
    let score = 0.45;
    const pros: string[] = [];
    const cons: string[] = [];

    if (input.production_volume === "medium") {
      score += 0.2;
      pros.push("Flexible for medium volume variety");
    }
    if (input.part_geometry === "prismatic") {
      score += 0.15;
      pros.push("Modular elements suit prismatic parts");
    }
    pros.push("Reusable components reduce long-term cost");
    cons.push("Longer setup than dedicated fixture");

    return { type: "modular_fixture", score: Math.max(0, Math.min(1, score)), pros, cons };
  }

  private scoreVacuum(input: WorkholdingInput): WorkholdingScore {
    let score = 0.3;
    const pros: string[] = [];
    const cons: string[] = [];

    if (input.part_geometry === "thin_wall") {
      score += 0.4;
      pros.push("No clamping deformation on thin parts");
    }
    if (input.wall_thickness_mm && input.wall_thickness_mm < 2) {
      score += 0.2;
      pros.push("Ideal for very thin sections");
    }
    if (input.cutting_force_n && input.cutting_force_n > 500) {
      score -= 0.3;
      cons.push("Limited holding force for heavy cuts");
    }
    cons.push("Requires flat reference surface");

    return { type: "vacuum", score: Math.max(0, Math.min(1, score)), pros, cons };
  }

  private scoreMagnetic(input: WorkholdingInput): WorkholdingScore {
    let score = 0.3;
    const pros: string[] = [];
    const cons: string[] = [];

    if (input.is_magnetic === true) {
      score += 0.3;
      pros.push("Quick setup for ferrous materials");
    }
    if (input.part_geometry === "prismatic" && input.part_dimensions_mm.height < 20) {
      score += 0.2;
      pros.push("Low profile parts suit magnetic chuck");
    }
    if (input.cutting_force_n && input.cutting_force_n > 300) {
      score -= 0.2;
      cons.push("Limited holding force");
    }
    cons.push("Only for ferrous materials");

    return { type: "magnetic", score: Math.max(0, Math.min(1, score)), pros, cons };
  }

  private scoreCollet(input: WorkholdingInput): WorkholdingScore {
    let score = 0.6;
    const pros: string[] = [];
    const cons: string[] = [];

    pros.push("Excellent concentricity for cylindrical parts");
    pros.push("Quick tool change");
    if (input.tolerance_mm && input.tolerance_mm < 0.02) {
      score += 0.2;
      pros.push("High accuracy for precision turning");
    }
    cons.push("Limited to specific diameter range");

    return { type: "collet", score: Math.max(0, Math.min(1, score)), pros, cons };
  }

  private score3JawChuck(input: WorkholdingInput): WorkholdingScore {
    let score = 0.55;
    const pros: string[] = [];
    const cons: string[] = [];

    pros.push("Self-centering for cylindrical parts");
    pros.push("Wide diameter range");
    if (input.production_volume === "low" || input.production_volume === "prototype") {
      score += 0.15;
      pros.push("Quick setup for varied diameters");
    }
    cons.push("Lower accuracy than collet");

    return { type: "3_jaw_chuck", score: Math.max(0, Math.min(1, score)), pros, cons };
  }

  /**
   * Check if workholding provides adequate clamping
   */
  private checkClampingAdequacy(type: WorkholdingType, cuttingForce: number): boolean {
    const maxForces: Record<WorkholdingType, number> = {
      standard_vise: 2000,
      precision_vise: 1500,
      soft_jaws: 1800,
      dedicated_fixture: 5000,
      modular_fixture: 3000,
      vacuum: 500,
      magnetic: 400,
      collet: 1000,
      "3_jaw_chuck": 2000,
      "4_jaw_chuck": 2500,
      custom_fixture: 10000,
    };

    return cuttingForce <= (maxForces[type] || 1000);
  }

  /**
   * Quick selection for orchestrator
   */
  quickSelect(
    geometry: PartGeometry,
    volume: ProductionVolume
  ): { type: WorkholdingType; confidence: number } {
    const result = this.select({
      part_geometry: geometry,
      part_dimensions_mm: { length: 100, width: 80, height: 50 },
      production_volume: volume,
    });

    return { type: result.recommended, confidence: result.confidence };
  }
}

export const workholdingSelectionEngine = new WorkholdingSelectionEngine();
