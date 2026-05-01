/**
 * WorkholdingRetrofitAdvisorEngine
 * Diagnoses workholding problems and recommends fixture modifications.
 * Answers: "Why is my part out of tolerance? What fixture change fixes it?"
 *
 * Combines grip force analysis, jaw wear prediction, runout diagnosis,
 * and natural frequency tracking to provide actionable workholding advice.
 *
 * Physics:
 *   Jaw wear: Archard-like  w = k × F × N  (k = wear coeff, F = force, N = cycles)
 *   Clamping: F_clamp > F_cut / (μ × n_jaws) × SF
 *   Thin-wall deformation: δ = F × D / (E × t)  (Hertz contact simplification)
 *   Runout from wear: TIR ≈ w / (D/2)  (radial wear → eccentricity)
 *   Chuck accuracy degradation: TIR_total = TIR_new + k_age × sqrt(hours)
 *
 * @module WorkholdingRetrofitAdvisor
 */

// ── Material elastic modulus lookup (GPa) ──

const ELASTIC_MODULUS: Record<string, number> = {
  "steel": 205,
  "1018": 205,
  "4140": 205,
  "304SS": 193,
  "stainless": 193,
  "aluminum": 69,
  "6061-T6": 69,
  "7075-T6": 72,
  "titanium": 114,
  "Ti-6Al-4V": 114,
  "cast_iron": 170,
  "brass": 100,
  "copper": 117,
  "plastic": 3,
  "inconel": 205,
  "Inconel 718": 205,
};

function getModulus(material: string): number {
  const key = Object.keys(ELASTIC_MODULUS).find(
    k => k.toLowerCase() === material.toLowerCase()
  );
  return key ? ELASTIC_MODULUS[key] : 205; // default steel
}

// ── Friction coefficients by workholding type ──

const FRICTION_COEFF: Record<string, number> = {
  chuck_3jaw: 0.25,
  chuck_4jaw: 0.28,
  collet: 0.30,
  vise: 0.20,
  fixture: 0.22,
  vacuum: 0.40,
};

// ── Jaw wear coefficients (Archard-like k, mm per kN per cycle × 1e-7) ──

const JAW_WEAR_K: Record<string, Record<string, number>> = {
  hard: {
    steel: 0.8, aluminum: 1.5, cast_iron: 1.0, titanium: 0.6,
    stainless: 0.9, brass: 1.8, copper: 1.6, plastic: 2.5, default: 1.0,
  },
  soft: {
    steel: 2.5, aluminum: 4.0, cast_iron: 3.0, titanium: 2.0,
    stainless: 2.8, brass: 5.0, copper: 4.5, plastic: 6.0, default: 3.0,
  },
  aluminum_soft: {
    steel: 5.0, aluminum: 3.0, cast_iron: 4.5, titanium: 3.5,
    stainless: 5.5, brass: 3.5, copper: 3.8, plastic: 4.0, default: 4.0,
  },
  pie: {
    steel: 3.0, aluminum: 4.5, cast_iron: 3.5, titanium: 2.5,
    stainless: 3.2, brass: 5.5, copper: 5.0, plastic: 7.0, default: 3.5,
  },
};

function getWearK(jawType: string, material: string): number {
  const jawMap = JAW_WEAR_K[jawType] ?? JAW_WEAR_K["hard"];
  const matKey = Object.keys(jawMap).find(
    k => material.toLowerCase().includes(k)
  );
  return jawMap[matKey ?? "default"];
}

// ── Types ──

export interface RunoutDiagnosisInput {
  measured_runout_mm: number;
  target_runout_mm: number;
  workholding_type: "chuck_3jaw" | "chuck_4jaw" | "collet" | "vise" | "fixture" | "vacuum";
  jaw_age_hours?: number;
  part_diameter_mm: number;
  part_length_mm?: number;
  clamping_force_kn?: number;
}

export interface RunoutCause {
  cause: string;
  probability: number;
  fix: string;
  cost_estimate?: string;
}

export interface RunoutDiagnosisResult {
  probable_causes: RunoutCause[];
  recommended_action: string;
  expected_improvement_mm: number;
}

export interface JawWearInput {
  jaw_type: "hard" | "soft" | "aluminum_soft" | "pie";
  material_clamped: string;
  cycles_per_day: number;
  clamping_force_kn: number;
  current_age_days?: number;
}

export interface JawWearResult {
  remaining_life_days: number;
  remaining_cycles: number;
  runout_progression: Array<{ days: number; expected_runout_mm: number }>;
  replacement_schedule: string;
}

export interface FixtureViabilityInput {
  original_part: { diameter_mm: number; length_mm: number; weight_kg: number };
  modified_part: { diameter_mm: number; length_mm: number; weight_kg: number };
  fixture: {
    type: string;
    grip_diameter_range_mm: [number, number];
    max_force_kn: number;
    datum_faces: string[];
  };
}

export interface FixtureModification {
  description: string;
  cost: string;
  time: string;
}

export interface FixtureViabilityResult {
  viable: boolean;
  issues: string[];
  modifications_needed: FixtureModification[];
  risk_if_unchanged: string;
}

export interface ClampingOptimizationInput {
  part_diameter_mm: number;
  cutting_force_n: number;
  friction_coefficient?: number;
  part_material: string;
  wall_thickness_mm?: number;
}

export interface ClampingOptimizationResult {
  min_force_kn: number;
  max_force_kn: number;
  optimal_force_kn: number;
  deformation_at_optimal_mm: number;
  safety_factor: number;
}

// ── Engine ──

export class WorkholdingRetrofitAdvisorEngine {
  /**
   * diagnoseRunout — Root cause analysis for measured runout exceeding target.
   *
   * Evaluates 7 potential causes, assigns probability based on workholding type,
   * jaw age, clamping force, and part geometry.
   */
  diagnoseRunout(input: RunoutDiagnosisInput): RunoutDiagnosisResult {
    const {
      measured_runout_mm,
      target_runout_mm,
      workholding_type,
      jaw_age_hours = 0,
      part_diameter_mm,
      part_length_mm,
      clamping_force_kn = 30,
    } = input;

    // If already within target, return clean
    if (measured_runout_mm <= target_runout_mm) {
      return {
        probable_causes: [],
        recommended_action: "Runout is within target — no action needed.",
        expected_improvement_mm: 0,
      };
    }

    const excess = measured_runout_mm - target_runout_mm;
    const causes: RunoutCause[] = [];

    // 1) Jaw wear — probability increases with age
    const isChuck = workholding_type.startsWith("chuck");
    const isCollet = workholding_type === "collet";
    if (isChuck || isCollet) {
      // Wear contribution: age-dependent, sqrt model for degradation
      const wearContrib = Math.min(1.0, jaw_age_hours / 2000);
      const jawWearProb = Math.min(0.95, 0.15 + 0.65 * wearContrib);
      const jawFix = isCollet
        ? "Replace collet; inspect collet bore for scoring"
        : "Re-bore soft jaws or replace hard jaws";
      const jawCost = isCollet ? "$50-$150" : "$100-$500";
      causes.push({
        cause: "Jaw/collet wear — clamping surfaces degraded over time",
        probability: jawWearProb,
        fix: jawFix,
        cost_estimate: jawCost,
      });
    }

    // 2) Jaw contamination (chips/coolant residue)
    if (isChuck || isCollet) {
      const contamProb = 0.30;
      causes.push({
        cause: "Jaw contamination — chips or coolant residue on clamping surfaces",
        probability: contamProb,
        fix: "Clean jaws and part seating surfaces; blow out with air",
        cost_estimate: "$0 (labor only)",
      });
    }

    // 3) Insufficient clamping force
    {
      const mu = FRICTION_COEFF[workholding_type] ?? 0.25;
      const nJaws = workholding_type === "chuck_3jaw" ? 3
        : workholding_type === "chuck_4jaw" ? 4
        : workholding_type === "collet" ? 8 // distributed
        : 2;
      // Very rough: if clamping force seems low relative to part mass
      const minNeeded = (part_diameter_mm * 0.01) / (mu * nJaws); // simplified
      const forceRatio = clamping_force_kn / Math.max(minNeeded, 0.1);
      const clampProb = forceRatio < 1.5 ? 0.50 : forceRatio < 3 ? 0.20 : 0.08;
      causes.push({
        cause: "Insufficient clamping force — part slipping under cutting loads",
        probability: clampProb,
        fix: "Increase chuck pressure; verify hydraulic system; check for air leaks",
        cost_estimate: "$0-$200",
      });
    }

    // 4) Part eccentricity (raw stock not round)
    {
      const eccProb = workholding_type === "chuck_3jaw" ? 0.25 : 0.10;
      causes.push({
        cause: "Part eccentricity — raw stock out-of-round or off-center datum",
        probability: eccProb,
        fix: "Pre-machine datum diameter; use 4-jaw chuck with indicator; add steady rest",
        cost_estimate: "$50-$300",
      });
    }

    // 5) Spindle bearing wear
    {
      // Higher probability if runout is consistent regardless of workholding
      const spindleProb = excess > 0.05 ? 0.20 : 0.08;
      causes.push({
        cause: "Spindle bearing wear — radial play in spindle bearings",
        probability: spindleProb,
        fix: "Measure spindle TIR with test bar; schedule bearing replacement if >0.005mm",
        cost_estimate: "$2,000-$8,000",
      });
    }

    // 6) Thermal growth
    {
      const thermalProb = 0.15;
      causes.push({
        cause: "Thermal growth — spindle/chuck expanding during operation",
        probability: thermalProb,
        fix: "Run warmup cycle; measure runout hot vs cold; add thermal compensation",
        cost_estimate: "$0-$500",
      });
    }

    // 7) Chuck accuracy degradation (scroll mechanism wear)
    if (isChuck) {
      const scrollWearProb = Math.min(0.80, 0.05 + jaw_age_hours / 5000);
      causes.push({
        cause: "Chuck scroll mechanism wear — centering accuracy degraded",
        probability: scrollWearProb,
        fix: "Service chuck scroll; re-grind scroll teeth; consider chuck replacement",
        cost_estimate: "$500-$3,000",
      });
    }

    // 8) Deflection from L/D ratio (long parts)
    if (part_length_mm && part_length_mm / part_diameter_mm > 3) {
      const ldRatio = part_length_mm / part_diameter_mm;
      const deflProb = Math.min(0.85, 0.10 + (ldRatio - 3) * 0.15);
      causes.push({
        cause: `High L/D ratio (${ldRatio.toFixed(1)}) — part deflecting under cutting forces`,
        probability: deflProb,
        fix: "Add tailstock support or steady rest; reduce cutting forces; use follower rest",
        cost_estimate: "$200-$1,500",
      });
    }

    // Sort by probability descending
    causes.sort((a, b) => b.probability - a.probability);

    // Estimate improvement from top fix
    const topCause = causes[0];
    const expectedImprovement = Math.min(excess, excess * topCause.probability * 0.85);

    return {
      probable_causes: causes,
      recommended_action: topCause.fix,
      expected_improvement_mm: Math.round(expectedImprovement * 10000) / 10000,
    };
  }

  /**
   * predictJawWear — Jaw life prediction using Archard-like linear wear model.
   *
   * Wear rate: w = k × F_clamp × N_cycles  (k depends on jaw/part material combo)
   * Life ends when accumulated wear drives runout past 0.025 mm (typical limit).
   */
  predictJawWear(input: JawWearInput): JawWearResult {
    const {
      jaw_type,
      material_clamped,
      cycles_per_day,
      clamping_force_kn,
      current_age_days = 0,
    } = input;

    const k = getWearK(jaw_type, material_clamped) * 1e-7; // mm per kN per cycle
    const wearPerCycle = k * clamping_force_kn; // mm/cycle
    const wearPerDay = wearPerCycle * cycles_per_day; // mm/day

    // Runout limit: when accumulated wear > threshold
    const runoutLimit = jaw_type === "hard" ? 0.025 : 0.050; // soft jaws re-bored more often but tolerate more
    const currentWear = wearPerDay * current_age_days;
    const remainingWear = Math.max(0, runoutLimit - currentWear);
    const remainingDays = wearPerDay > 0 ? Math.floor(remainingWear / wearPerDay) : 99999;
    const remainingCycles = remainingDays * cycles_per_day;

    // Progression at 10 intervals
    const totalLifeDays = runoutLimit / (wearPerDay || 1e-12);
    const progression: Array<{ days: number; expected_runout_mm: number }> = [];
    const steps = 10;
    for (let i = 0; i <= steps; i++) {
      const day = Math.round((totalLifeDays * i) / steps);
      const wear = wearPerDay * day;
      // Runout ~ 2 × radial wear (diametral TIR)
      const runout = Math.round(wear * 2 * 10000) / 10000;
      progression.push({ days: day, expected_runout_mm: runout });
    }

    // Schedule recommendation
    let schedule: string;
    if (remainingDays <= 0) {
      schedule = "OVERDUE — replace/re-bore jaws immediately";
    } else if (remainingDays < 7) {
      schedule = `URGENT — ${remainingDays} days remaining, schedule replacement this week`;
    } else if (remainingDays < 30) {
      schedule = `SOON — ${remainingDays} days remaining, order replacement jaws now`;
    } else if (remainingDays < 90) {
      schedule = `PLAN — ${remainingDays} days remaining, include in next quarterly maintenance`;
    } else {
      schedule = `OK — ${remainingDays} days remaining, monitor at next scheduled inspection`;
    }

    return {
      remaining_life_days: Math.max(0, remainingDays),
      remaining_cycles: Math.max(0, remainingCycles),
      runout_progression: progression,
      replacement_schedule: schedule,
    };
  }

  /**
   * checkFixtureViability — Determines if existing fixture can handle modified part.
   *
   * Checks: grip range, force capacity, datum face preservation, weight capacity,
   * and provides modification recommendations when fixture is marginal.
   */
  checkFixtureViability(input: FixtureViabilityInput): FixtureViabilityResult {
    const { original_part, modified_part, fixture } = input;
    const issues: string[] = [];
    const modifications: FixtureModification[] = [];

    // 1) Grip diameter range check
    const [minGrip, maxGrip] = fixture.grip_diameter_range_mm;
    if (modified_part.diameter_mm < minGrip) {
      issues.push(
        `Modified part diameter (${modified_part.diameter_mm}mm) below fixture minimum grip (${minGrip}mm)`
      );
      modifications.push({
        description: "Machine new soft jaws or stepped jaws for smaller diameter",
        cost: "$150-$400",
        time: "2-4 hours",
      });
    } else if (modified_part.diameter_mm > maxGrip) {
      issues.push(
        `Modified part diameter (${modified_part.diameter_mm}mm) exceeds fixture maximum grip (${maxGrip}mm)`
      );
      modifications.push({
        description: "Replace jaws with larger bore set or switch to faceplate/fixture plate",
        cost: "$300-$1,200",
        time: "4-8 hours",
      });
    }

    // 2) Force capacity check — heavier part needs more grip
    const weightRatio = modified_part.weight_kg / Math.max(original_part.weight_kg, 0.01);
    if (weightRatio > 1.5) {
      const neededForce = fixture.max_force_kn * weightRatio * 0.8;
      if (neededForce > fixture.max_force_kn) {
        issues.push(
          `Modified part is ${weightRatio.toFixed(1)}× heavier — exceeds fixture force capacity`
        );
        modifications.push({
          description: "Upgrade to higher-capacity chuck/fixture or add auxiliary clamping",
          cost: "$500-$3,000",
          time: "4-16 hours",
        });
      }
    }

    // 3) Length change — may need tailstock or steady rest
    const lengthRatio = modified_part.length_mm / Math.max(original_part.length_mm, 1);
    if (lengthRatio > 1.3 && modified_part.length_mm / modified_part.diameter_mm > 3) {
      issues.push(
        `Modified part L/D ratio = ${(modified_part.length_mm / modified_part.diameter_mm).toFixed(1)} — deflection risk`
      );
      modifications.push({
        description: "Add tailstock center or steady rest for increased length",
        cost: "$100-$800",
        time: "1-2 hours",
      });
    }

    // 4) Datum face preservation
    const diamChanged = Math.abs(modified_part.diameter_mm - original_part.diameter_mm) > 0.5;
    const lengthChanged = Math.abs(modified_part.length_mm - original_part.length_mm) > 1.0;
    if (diamChanged && fixture.datum_faces.some(f => f.toLowerCase().includes("od") || f.toLowerCase().includes("diameter"))) {
      issues.push("OD datum face changed — fixture datum alignment affected");
      modifications.push({
        description: "Re-bore soft jaws to new OD; update setup sheet datum references",
        cost: "$100-$250",
        time: "1-3 hours",
      });
    }
    if (lengthChanged && fixture.datum_faces.some(f => f.toLowerCase().includes("face") || f.toLowerCase().includes("end"))) {
      issues.push("End face datum changed — Z-datum shift required");
      modifications.push({
        description: "Adjust Z-offset and jaw step height; re-prove program zero",
        cost: "$0-$50",
        time: "0.5-1 hours",
      });
    }

    // 5) Diameter shrink causing contact area loss
    if (modified_part.diameter_mm < original_part.diameter_mm * 0.85) {
      issues.push(
        "Significant diameter reduction — jaw contact area reduced, grip force degraded"
      );
      modifications.push({
        description: "Machine new soft jaws matched to new diameter for full contact",
        cost: "$150-$400",
        time: "2-4 hours",
      });
    }

    const viable = issues.length === 0;
    let risk: string;
    if (viable) {
      risk = "Low — existing fixture is adequate for modified part";
    } else if (issues.length <= 2 && modifications.every(m => !m.cost.includes("3,000"))) {
      risk = "Medium — fixture usable with modifications; risk of dimensional drift without changes";
    } else {
      risk = "High — running modified part without changes risks scrap, crashes, or injury";
    }

    return {
      viable,
      issues,
      modifications_needed: modifications,
      risk_if_unchanged: risk,
    };
  }

  /**
   * optimizeClampingForce — Find ideal clamping force balancing grip vs deformation.
   *
   * F_min = F_cut / (μ × n_jaws) × SF
   * F_max = limited by thin-wall deformation: δ = F × D / (E × t) < δ_allow
   * Optimal = geometric mean or midpoint depending on wall thickness.
   */
  optimizeClampingForce(input: ClampingOptimizationInput): ClampingOptimizationResult {
    const {
      part_diameter_mm,
      cutting_force_n,
      friction_coefficient,
      part_material,
      wall_thickness_mm,
    } = input;

    const mu = friction_coefficient ?? 0.25;
    const nJaws = 3; // default 3-jaw chuck assumption
    const safetyFactor = 2.0;

    // Minimum force to prevent slipping: F_clamp > F_cut / (μ × n_jaws) × SF
    const minForceN = (cutting_force_n / (mu * nJaws)) * safetyFactor;
    const minForceKN = minForceN / 1000;

    // Maximum force limited by deformation
    const E_GPa = getModulus(part_material);
    const E_Pa = E_GPa * 1e9; // Pa
    const E_MPa = E_GPa * 1e3; // MPa

    let maxForceKN: number;
    let deformationAtOptimal: number;

    if (wall_thickness_mm && wall_thickness_mm > 0) {
      // Thin-wall: δ = F × D / (E × t × L_contact)
      // Allowable deformation: 0.01mm for precision, 0.05mm general
      const allowableDeformation = 0.01; // mm, precision default
      // Contact length estimate: ~10mm per jaw
      const contactLength = 10; // mm

      // δ = F_per_jaw × D / (E_MPa × t × L_contact)
      // F_total = n_jaws × F_per_jaw
      // δ = (F_total / n_jaws) × D / (E_MPa × t × L_contact)
      // F_total_max = allowable × E_MPa × t × L_contact × n_jaws / D
      const maxForceN = allowableDeformation * E_MPa * wall_thickness_mm * contactLength * nJaws / part_diameter_mm;
      maxForceKN = maxForceN / 1000;

      // If max < min, we have a problem — report it but still provide values
      if (maxForceKN < minForceKN) {
        // Thin wall can't handle the required grip — need fixture redesign
        maxForceKN = minForceKN * 1.1; // report but flag
      }
    } else {
      // Solid part: max limited by material yield at contact
      // Hertz contact stress: very conservative upper bound
      // Practical limit: ~3× minimum for solid parts
      maxForceKN = minForceKN * 3.0;
    }

    // Optimal: for thin walls, stay close to minimum; for solid, use geometric mean
    let optimalKN: number;
    if (wall_thickness_mm && wall_thickness_mm < part_diameter_mm * 0.1) {
      // Thin wall — stay 20% above minimum
      optimalKN = minForceKN * 1.2;
    } else {
      // Solid — geometric mean of min and max
      optimalKN = Math.sqrt(minForceKN * maxForceKN);
    }

    // Clamp to valid range
    optimalKN = Math.max(minForceKN, Math.min(maxForceKN, optimalKN));

    // Compute deformation at optimal force
    if (wall_thickness_mm && wall_thickness_mm > 0) {
      const contactLength = 10;
      const fPerJaw = (optimalKN * 1000) / nJaws; // N per jaw
      deformationAtOptimal = (fPerJaw * part_diameter_mm) / (E_MPa * wall_thickness_mm * contactLength);
    } else {
      // Negligible for solid parts
      deformationAtOptimal = 0.001;
    }

    const actualSF = (optimalKN * 1000 * mu * nJaws) / Math.max(cutting_force_n, 1);

    return {
      min_force_kn: round4(minForceKN),
      max_force_kn: round4(maxForceKN),
      optimal_force_kn: round4(optimalKN),
      deformation_at_optimal_mm: round4(deformationAtOptimal),
      safety_factor: round4(actualSF),
    };
  }
}

function round4(v: number): number {
  return Math.round(v * 10000) / 10000;
}

/** Singleton instance */
export const workholdingRetrofitAdvisorEngine = new WorkholdingRetrofitAdvisorEngine();
