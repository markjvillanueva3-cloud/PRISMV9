/**
 * R7-MS2: Workholding Intelligence Engine
 *
 * Intelligent fixture selection, clamping force calculation, and deflection analysis.
 * Combines fixture database with WorkholdingEngine physics to provide actionable
 * workholding recommendations.
 *
 * Actions:
 * - fixture_recommend: Given part + operation + forces → optimal workholding + analysis
 *
 * Physics chain:
 * 1. Determine min clamping force: F_clamp > (SF × F_cutting) / μ
 * 2. Check part deflection under clamping + cutting loads (beam model)
 * 3. Query fixture database for suitable fixtures given part dims + machine constraints
 * 4. Rank by: deflection impact, setup time, cost, batch suitability
 */

// ============================================================================
// TYPES
// ============================================================================

export type PartShape = 'prismatic' | 'round' | 'plate' | 'irregular';
export type FixtureType = 'vise' | 'chuck_3jaw' | 'chuck_4jaw' | 'collet' | 'fixture_plate' | 'vacuum' | 'magnetic' | 'soft_jaws' | 'custom';

export interface FixtureInput {
  part: {
    material: string;
    length_mm: number;
    width_mm: number;
    height_mm: number;
    weight_kg?: number;
    shape?: PartShape;
  };
  operation: string;
  max_cutting_force_n: number;
  tolerance_mm: number;
  machine?: string;
  batch_size?: number;
}

interface ClampPosition {
  x_mm: number;
  y_mm: number;
  z_mm?: number;
}

interface FixtureRecommendation {
  fixture_type: FixtureType;
  manufacturer: string;
  model: string;
  clamp_positions: ClampPosition[];
  clamp_force_n: number;
  contact_area_mm2: number;
  setup_time_min: number;
  cost_usd: number;
  suitability_score: number;
}

export interface FixtureResult {
  primary_recommendation: FixtureRecommendation;
  analysis: {
    max_deflection_mm: number;
    deflection_within_tolerance: boolean;
    safety_factor: number;
    pull_out_risk: boolean;
    min_clamp_force_n: number;
    friction_coefficient: number;
  };
  alternatives: FixtureRecommendation[];
  soft_jaw_design?: {
    jaw_width_mm: number;
    step_depth_mm: number;
    bore_pattern: string;
  };
  safety: { score: number; flags: string[] };
}

// ============================================================================
// MATERIAL PROPERTIES (friction + stiffness for workholding)
// ============================================================================

interface WorkholdingMat {
  friction_steel: number;       // μ against steel jaw/clamp
  youngs_modulus_gpa: number;   // E for deflection
  density_kg_m3: number;
  yield_strength_mpa: number;
  deformation_sensitive: boolean; // soft materials that dent under clamping
}

const WH_MATS: Record<string, WorkholdingMat> = {
  'AISI 4140':    { friction_steel: 0.20, youngs_modulus_gpa: 210, density_kg_m3: 7850, yield_strength_mpa: 655, deformation_sensitive: false },
  'AISI 1045':    { friction_steel: 0.20, youngs_modulus_gpa: 200, density_kg_m3: 7870, yield_strength_mpa: 530, deformation_sensitive: false },
  'mild steel':   { friction_steel: 0.20, youngs_modulus_gpa: 200, density_kg_m3: 7850, yield_strength_mpa: 250, deformation_sensitive: false },
  '6061-T6':      { friction_steel: 0.15, youngs_modulus_gpa: 69,  density_kg_m3: 2700, yield_strength_mpa: 276, deformation_sensitive: true },
  '7075-T6':      { friction_steel: 0.15, youngs_modulus_gpa: 72,  density_kg_m3: 2810, yield_strength_mpa: 503, deformation_sensitive: true },
  'Ti-6Al-4V':    { friction_steel: 0.30, youngs_modulus_gpa: 114, density_kg_m3: 4430, yield_strength_mpa: 880, deformation_sensitive: false },
  'Inconel 718':  { friction_steel: 0.25, youngs_modulus_gpa: 205, density_kg_m3: 8190, yield_strength_mpa: 1100, deformation_sensitive: false },
  '316L':         { friction_steel: 0.20, youngs_modulus_gpa: 193, density_kg_m3: 8000, yield_strength_mpa: 290, deformation_sensitive: false },
  'brass':        { friction_steel: 0.15, youngs_modulus_gpa: 100, density_kg_m3: 8500, yield_strength_mpa: 200, deformation_sensitive: true },
  'cast iron':    { friction_steel: 0.22, youngs_modulus_gpa: 170, density_kg_m3: 7200, yield_strength_mpa: 300, deformation_sensitive: false },
};

function getWhMat(name: string): WorkholdingMat & { known: boolean } {
  if (WH_MATS[name]) return { ...WH_MATS[name], known: true };
  const lower = name.toLowerCase();
  for (const [k, v] of Object.entries(WH_MATS))
    if (lower.includes(k.toLowerCase()) || k.toLowerCase().includes(lower)) return { ...v, known: true };
  return { ...WH_MATS['AISI 1045'], known: false };
}

// ============================================================================
// FIXTURE DATABASE
// ============================================================================

interface FixtureDef {
  type: FixtureType;
  manufacturer: string;
  model: string;
  max_jaw_width_mm: number;
  max_part_length_mm: number;
  max_clamp_force_n: number;
  contact_area_mm2: number;
  setup_time_min: number;
  cost_usd: number;
  best_for: PartShape[];
  min_batch: number; // minimum practical batch size
  max_batch: number; // above this, custom fixture preferred
}

const FIXTURES: FixtureDef[] = [
  // Vises
  { type: 'vise', manufacturer: 'Kurt', model: 'DL640', max_jaw_width_mm: 152, max_part_length_mm: 300, max_clamp_force_n: 22000, contact_area_mm2: 3000, setup_time_min: 5, cost_usd: 1200, best_for: ['prismatic'], min_batch: 1, max_batch: 500 },
  { type: 'vise', manufacturer: 'Kurt', model: 'DL430', max_jaw_width_mm: 100, max_part_length_mm: 200, max_clamp_force_n: 16000, contact_area_mm2: 2000, setup_time_min: 4, cost_usd: 900, best_for: ['prismatic'], min_batch: 1, max_batch: 500 },
  { type: 'vise', manufacturer: 'Orange Vise', model: 'OV-4', max_jaw_width_mm: 100, max_part_length_mm: 250, max_clamp_force_n: 18000, contact_area_mm2: 2200, setup_time_min: 3, cost_usd: 1100, best_for: ['prismatic'], min_batch: 1, max_batch: 1000 },
  { type: 'vise', manufacturer: 'Schunk', model: 'KSC 125', max_jaw_width_mm: 125, max_part_length_mm: 250, max_clamp_force_n: 20000, contact_area_mm2: 2500, setup_time_min: 4, cost_usd: 1500, best_for: ['prismatic'], min_batch: 1, max_batch: 500 },
  // Chucks
  { type: 'chuck_3jaw', manufacturer: 'Kitagawa', model: 'B-206', max_jaw_width_mm: 200, max_part_length_mm: 150, max_clamp_force_n: 35000, contact_area_mm2: 4500, setup_time_min: 3, cost_usd: 2200, best_for: ['round'], min_batch: 1, max_batch: 5000 },
  { type: 'chuck_3jaw', manufacturer: 'Rohm', model: 'ZSU-200', max_jaw_width_mm: 200, max_part_length_mm: 120, max_clamp_force_n: 40000, contact_area_mm2: 5000, setup_time_min: 3, cost_usd: 2800, best_for: ['round'], min_batch: 1, max_batch: 5000 },
  { type: 'soft_jaws', manufacturer: 'Generic', model: 'Custom Soft Jaws', max_jaw_width_mm: 200, max_part_length_mm: 200, max_clamp_force_n: 30000, contact_area_mm2: 6000, setup_time_min: 15, cost_usd: 200, best_for: ['round', 'irregular'], min_batch: 10, max_batch: 10000 },
  // Collet
  { type: 'collet', manufacturer: 'Hardinge', model: '5C Collet', max_jaw_width_mm: 25, max_part_length_mm: 100, max_clamp_force_n: 12000, contact_area_mm2: 800, setup_time_min: 2, cost_usd: 80, best_for: ['round'], min_batch: 1, max_batch: 10000 },
  // Fixture plate (for large/plate parts)
  { type: 'fixture_plate', manufacturer: 'Jergens', model: 'QLC Plate', max_jaw_width_mm: 600, max_part_length_mm: 600, max_clamp_force_n: 50000, contact_area_mm2: 500, setup_time_min: 20, cost_usd: 3000, best_for: ['plate', 'prismatic'], min_batch: 1, max_batch: 100 },
  { type: 'fixture_plate', manufacturer: 'Mitee-Bite', model: 'TalonGrip Kit', max_jaw_width_mm: 800, max_part_length_mm: 800, max_clamp_force_n: 45000, contact_area_mm2: 400, setup_time_min: 15, cost_usd: 2500, best_for: ['plate'], min_batch: 1, max_batch: 200 },
  // Vacuum
  { type: 'vacuum', manufacturer: 'Pierson', model: 'VacuForce 300', max_jaw_width_mm: 300, max_part_length_mm: 300, max_clamp_force_n: 5000, contact_area_mm2: 80000, setup_time_min: 5, cost_usd: 4000, best_for: ['plate'], min_batch: 1, max_batch: 1000 },
  // Magnetic
  { type: 'magnetic', manufacturer: 'Walker', model: 'ElectroMag 400', max_jaw_width_mm: 400, max_part_length_mm: 600, max_clamp_force_n: 15000, contact_area_mm2: 60000, setup_time_min: 2, cost_usd: 5000, best_for: ['plate', 'prismatic'], min_batch: 1, max_batch: 5000 },
];

// ============================================================================
// PART SHAPE CLASSIFIER
// ============================================================================

function classifyShape(part: FixtureInput['part']): PartShape {
  if (part.shape) return part.shape;
  const { length_mm: L, width_mm: W, height_mm: H } = part;
  // Round: similar L/W or W much smaller than L
  if (Math.abs(L - W) < Math.min(L, W) * 0.3 && H > L * 1.5) return 'round';
  // Plate: thin and wide
  if (H < Math.min(L, W) * 0.3) return 'plate';
  // Default: prismatic
  return 'prismatic';
}

// ============================================================================
// CLAMPING FORCE CALCULATION
// ============================================================================

function calcMinClampForce(cuttingForce: number, mu: number, safetyFactor: number): number {
  // F_clamp ≥ (SF × F_cutting) / μ
  return (safetyFactor * cuttingForce) / mu;
}

// ============================================================================
// DEFLECTION CALCULATION (simplified beam model)
// ============================================================================

function calcMaxDeflection(
  cuttingForce: number,
  partLength: number, partWidth: number, partHeight: number,
  E_gpa: number,
  fixtureType: FixtureType
): number {
  // Simplified cantilever/simply-supported beam model
  const E_pa = E_gpa * 1e9;
  const L_m = partLength * 1e-3;
  const b_m = partWidth * 1e-3;
  const h_m = partHeight * 1e-3;
  const F = cuttingForce;

  // I = b*h³/12 (rectangular cross-section)
  const I = (b_m * Math.pow(h_m, 3)) / 12;

  let delta_m: number;
  if (fixtureType === 'vise' || fixtureType === 'chuck_3jaw' || fixtureType === 'chuck_4jaw' || fixtureType === 'collet' || fixtureType === 'soft_jaws') {
    // Cantilever: δ = F*L³ / (3*E*I) — force at free end
    // Use effective overhang (part sticks out beyond clamp by ~50% of length for vise, less for chuck)
    const overhang = fixtureType === 'vise' ? L_m * 0.4 : L_m * 0.3;
    delta_m = (F * Math.pow(overhang, 3)) / (3 * E_pa * I);
  } else if (fixtureType === 'fixture_plate' || fixtureType === 'vacuum' || fixtureType === 'magnetic') {
    // Plate supported at 4 corners — Timoshenko plate theory
    // δ = α * F * a² / (E * t³), where a = shorter span, α ≈ 0.014 for typical aspect ratios
    const a = Math.min(L_m, b_m); // shorter span
    const alpha = 0.014; // plate flexure coefficient
    delta_m = (alpha * F * a * a) / (E_pa * Math.pow(h_m, 3));
  } else {
    // Simply supported beam: δ = F*L³ / (48*E*I) — force at center
    delta_m = (F * Math.pow(L_m, 3)) / (48 * E_pa * I);
  }

  return delta_m * 1000; // Convert to mm
}

// ============================================================================
// FIXTURE RECOMMENDATION ENGINE
// ============================================================================

export function fixtureRecommend(input: FixtureInput): FixtureResult {
  const mat = getWhMat(input.part.material);
  const shape = classifyShape(input.part);
  const batchSize = input.batch_size ?? 1;
  const safetyFactor = 2.5; // standard safety factor for workholding
  const mu = mat.friction_steel;
  const minClamp = calcMinClampForce(input.max_cutting_force_n, mu, safetyFactor);

  const { length_mm: L, width_mm: W, height_mm: H } = input.part;
  const weight = input.part.weight_kg ?? (L * W * H * 1e-9 * mat.density_kg_m3);

  // Filter and score fixtures
  const scored: { fixture: FixtureDef; score: number; deflection: number }[] = [];

  for (const f of FIXTURES) {
    // Size constraints
    if (shape === 'round' && !f.best_for.includes('round')) continue;
    if (f.max_jaw_width_mm < Math.min(L, W) && f.type !== 'fixture_plate' && f.type !== 'vacuum' && f.type !== 'magnetic') continue;

    // Force capability
    if (f.max_clamp_force_n < minClamp) continue;

    // Batch suitability
    const batchFit = (batchSize >= f.min_batch && batchSize <= f.max_batch) ? 1.0 :
      batchSize < f.min_batch ? 0.5 : 0.7;

    // Shape suitability
    const shapeFit = f.best_for.includes(shape) ? 1.0 : 0.3;

    // Deflection check
    const defl = calcMaxDeflection(input.max_cutting_force_n, L, W, H, mat.youngs_modulus_gpa, f.type);
    const deflFit = defl < input.tolerance_mm ? 1.0 : Math.max(0, 1 - (defl - input.tolerance_mm) / input.tolerance_mm);

    // Force margin
    const forceMargin = Math.min(f.max_clamp_force_n / minClamp, 3) / 3;

    // Deformation risk for soft materials
    let deformPenalty = 1.0;
    if (mat.deformation_sensitive && f.contact_area_mm2 < 1000) {
      const pressure_mpa = (minClamp / f.contact_area_mm2);
      if (pressure_mpa > mat.yield_strength_mpa * 0.3) deformPenalty = 0.5;
    }

    // Size appropriateness — penalize oversized fixtures for small parts
    const partArea = L * W;
    const fixtureArea = f.max_jaw_width_mm * f.max_part_length_mm;
    const sizeFit = fixtureArea > 0 ? Math.min(1.0, partArea / (fixtureArea * 0.3)) : 1.0;
    // For fixture_plate: a 100×50 part in a 600×600 plate → sizeFit = 5000/(360000*0.3) = 0.046 — strong penalty
    // For vise: 100×50 in 152×300 vise → sizeFit = 5000/(45600*0.3) = 0.37 — moderate

    // Combined score
    const score = shapeFit * 0.30 + deflFit * 0.25 + forceMargin * 0.10 + batchFit * 0.10 + deformPenalty * 0.10 + sizeFit * 0.15;
    scored.push({ fixture: f, score, deflection: defl });
  }

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // If no fixtures match, provide a custom fixture fallback
  if (scored.length === 0) {
    const fallbackDefl = calcMaxDeflection(input.max_cutting_force_n, L, W, H, mat.youngs_modulus_gpa, 'fixture_plate');
    return {
      primary_recommendation: {
        fixture_type: 'custom',
        manufacturer: 'Custom',
        model: 'Custom fixture required',
        clamp_positions: [{ x_mm: L * 0.25, y_mm: W * 0.5 }, { x_mm: L * 0.75, y_mm: W * 0.5 }],
        clamp_force_n: Math.ceil(minClamp),
        contact_area_mm2: 2000,
        setup_time_min: 30,
        cost_usd: 5000,
        suitability_score: 0.3,
      },
      analysis: {
        max_deflection_mm: +fallbackDefl.toFixed(4),
        deflection_within_tolerance: fallbackDefl < input.tolerance_mm,
        safety_factor: safetyFactor,
        pull_out_risk: false,
        min_clamp_force_n: Math.ceil(minClamp),
        friction_coefficient: mu,
      },
      alternatives: [],
      safety: { score: 0.50, flags: ['No standard fixture suitable — custom fixture required'] },
    };
  }

  const best = scored[0];
  const bf = best.fixture;
  const actualClamp = Math.min(Math.ceil(minClamp * 1.1), bf.max_clamp_force_n); // 10% above minimum, capped at fixture max

  // Generate clamp positions based on fixture type
  const clampPositions = generateClampPositions(bf.type, L, W);

  // Pull-out risk: if cutting force is > 50% of clamp force × friction
  const pullOutRisk = input.max_cutting_force_n > actualClamp * mu * 0.5;

  // Safety scoring
  let safetyScore = 0.92;
  const flags: string[] = [];

  if (!mat.known) { safetyScore -= 0.10; flags.push(`Unknown material "${input.part.material}" — using default friction/stiffness`); }
  if (pullOutRisk) { safetyScore -= 0.15; flags.push('Pull-out risk detected — increase clamping force or add stop blocks'); }
  if (best.deflection > input.tolerance_mm) { safetyScore -= 0.15; flags.push(`Deflection ${best.deflection.toFixed(4)}mm exceeds tolerance ${input.tolerance_mm}mm`); }
  if (best.deflection > input.tolerance_mm * 0.8) { safetyScore -= 0.05; flags.push('Deflection >80% of tolerance — consider stiffer workholding'); }
  if (mat.deformation_sensitive && actualClamp > 5000) {
    flags.push('Soft material — check for jaw marks, consider protective inserts');
  }
  if (weight > 20) { flags.push(`Heavy part (${weight.toFixed(1)}kg) — verify fixture capacity and operator safety`); }
  safetyScore = Math.max(0.40, safetyScore);

  // Build result
  const primary: FixtureRecommendation = {
    fixture_type: bf.type,
    manufacturer: bf.manufacturer,
    model: bf.model,
    clamp_positions: clampPositions,
    clamp_force_n: actualClamp,
    contact_area_mm2: bf.contact_area_mm2,
    setup_time_min: bf.setup_time_min,
    cost_usd: bf.cost_usd,
    suitability_score: +best.score.toFixed(3),
  };

  const alternatives = scored.slice(1, 4).map(s => ({
    fixture_type: s.fixture.type,
    manufacturer: s.fixture.manufacturer,
    model: s.fixture.model,
    clamp_positions: generateClampPositions(s.fixture.type, L, W),
    clamp_force_n: Math.min(Math.ceil(minClamp * 1.1), s.fixture.max_clamp_force_n),
    contact_area_mm2: s.fixture.contact_area_mm2,
    setup_time_min: s.fixture.setup_time_min,
    cost_usd: s.fixture.cost_usd,
    suitability_score: +s.score.toFixed(3),
  }));

  // Soft jaw design if vise or chuck recommended
  let softJaw: FixtureResult['soft_jaw_design'] | undefined;
  if (bf.type === 'vise' || bf.type === 'chuck_3jaw' || bf.type === 'soft_jaws') {
    softJaw = {
      jaw_width_mm: Math.min(W + 10, bf.max_jaw_width_mm),
      step_depth_mm: Math.min(H * 0.4, 15), // grip 40% of height, max 15mm
      bore_pattern: shape === 'round' ? `Ø${Math.round(W)}mm bore` : `${Math.round(W)}×${Math.round(H * 0.4)}mm step`,
    };
  }

  return {
    primary_recommendation: primary,
    analysis: {
      max_deflection_mm: +best.deflection.toFixed(4),
      deflection_within_tolerance: best.deflection < input.tolerance_mm,
      safety_factor: +safetyFactor.toFixed(1),
      pull_out_risk: pullOutRisk,
      min_clamp_force_n: Math.ceil(minClamp),
      friction_coefficient: mu,
    },
    alternatives,
    soft_jaw_design: softJaw,
    safety: { score: +safetyScore.toFixed(2), flags },
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function generateClampPositions(type: FixtureType, L: number, W: number): ClampPosition[] {
  switch (type) {
    case 'vise':
      return [
        { x_mm: +( L * 0.5).toFixed(1), y_mm: 0 },           // fixed jaw side
        { x_mm: +(L * 0.5).toFixed(1), y_mm: +(W).toFixed(1) }, // movable jaw side
      ];
    case 'chuck_3jaw':
    case 'soft_jaws':
      return [
        { x_mm: +(W / 2).toFixed(1), y_mm: 0 },
        { x_mm: +(W * 0.25).toFixed(1), y_mm: +(W * 0.433).toFixed(1) },
        { x_mm: +(W * 0.75).toFixed(1), y_mm: +(W * 0.433).toFixed(1) },
      ];
    case 'chuck_4jaw':
      return [
        { x_mm: +(W / 2).toFixed(1), y_mm: 0 },
        { x_mm: 0, y_mm: +(W / 2).toFixed(1) },
        { x_mm: +(W / 2).toFixed(1), y_mm: +(W).toFixed(1) },
        { x_mm: +(W).toFixed(1), y_mm: +(W / 2).toFixed(1) },
      ];
    case 'collet':
      return [{ x_mm: +(W / 2).toFixed(1), y_mm: +(W / 2).toFixed(1) }];
    case 'fixture_plate':
      return [
        { x_mm: +(L * 0.1).toFixed(1), y_mm: +(W * 0.1).toFixed(1) },
        { x_mm: +(L * 0.9).toFixed(1), y_mm: +(W * 0.1).toFixed(1) },
        { x_mm: +(L * 0.1).toFixed(1), y_mm: +(W * 0.9).toFixed(1) },
        { x_mm: +(L * 0.9).toFixed(1), y_mm: +(W * 0.9).toFixed(1) },
      ];
    default:
      return [
        { x_mm: +(L * 0.25).toFixed(1), y_mm: +(W * 0.5).toFixed(1) },
        { x_mm: +(L * 0.75).toFixed(1), y_mm: +(W * 0.5).toFixed(1) },
      ];
  }
}

// ============================================================================
// EXTRACTED SOURCE FILE CATALOG — MEDIUM-priority workholding modules
// Wired 2026-02-23 from MASTER_EXTRACTION_INDEX_V2 (27-file batch)
// Same 3 workholding files shared with WorkholdingEngine; each engine
// owns its own copy so there are no cross-engine import dependencies.
// ============================================================================

export const WORKHOLDING_INTELLIGENCE_SOURCE_FILE_CATALOG: Record<string, {
  filename: string;
  source_dir: string;
  category: string;
  lines: number;
  safety_class: "MEDIUM";
  description: string;
}> = {
  PRISM_FIXTURE_DATABASE: {
    filename: "PRISM_FIXTURE_DATABASE.js",
    source_dir: "extracted/workholding",
    category: "workholding",
    lines: 325,
    safety_class: "MEDIUM",
    description: "Fixture database — catalog of vises, chucks, collets, vacuum fixtures, and magnetic chucks with dimensional specs, clamping-force ratings, and suitability matrices.",
  },
  PRISM_WORKHOLDING_DATABASE: {
    filename: "PRISM_WORKHOLDING_DATABASE.js",
    source_dir: "extracted/workholding",
    category: "workholding",
    lines: 259,
    safety_class: "MEDIUM",
    description: "Workholding database — friction coefficients, jaw-material pairings, surface-condition modifiers, and clamping-force lookup tables for safety validation.",
  },
  PRISM_WORKHOLDING_ENGINE: {
    filename: "PRISM_WORKHOLDING_ENGINE.js",
    source_dir: "extracted/workholding",
    category: "workholding",
    lines: 119,
    safety_class: "MEDIUM",
    description: "Workholding engine (extracted JS) — legacy implementation of clamping-force, pull-out resistance, and lift-off moment calculations prior to TypeScript rewrite.",
  },
};

/**
 * Static accessor for the extracted workholding-intelligence source file catalog.
 */
export function getWorkholdingIntelligenceSourceFileCatalog(): typeof WORKHOLDING_INTELLIGENCE_SOURCE_FILE_CATALOG {
  return WORKHOLDING_INTELLIGENCE_SOURCE_FILE_CATALOG;
}

// ============================================================================
// DISPATCHER FUNCTION
// ============================================================================

export function workholdingIntelligence(action: string, params: Record<string, unknown>): unknown {
  switch (action) {
    case 'fixture_recommend':
      return fixtureRecommend(params as unknown as FixtureInput);
    default:
      return { error: `Unknown workholding intelligence action: ${action}` };
  }
}
