/**
 * ThreeDPrintedFixtureEngine — L2-P4-MS1 PASS2 Specialty
 *
 * Evaluates feasibility and designs parameters for 3D-printed fixtures.
 * Covers FDM (PETG, ABS, Nylon), SLA/DLP (rigid resin), SLS (PA12),
 * and metal (DMLS). Calculates wall thickness, infill, expected deflection,
 * and cost comparison vs. conventional fixture.
 *
 * Actions: fixture_3dp_evaluate, fixture_3dp_design, fixture_3dp_compare
 */

// ============================================================================
// TYPES
// ============================================================================

export type PrintProcess = "FDM" | "SLA" | "SLS" | "DMLS";
export type PrintMaterial = "PLA" | "PETG" | "ABS" | "Nylon_FDM" | "PA12_SLS" | "Rigid_Resin" | "AlSi10Mg" | "316L";

export interface ThreeDPrintFixtureInput {
  process: PrintProcess;
  material: PrintMaterial;
  fixture_volume_cm3: number;
  max_cutting_force_N: number;
  max_temperature_C: number;
  coolant_exposure: boolean;
  required_accuracy_mm: number;
  batch_size: number;
  conventional_cost_USD: number;
  conventional_lead_days: number;
}

export interface ThreeDPrintFixtureResult {
  feasible: boolean;
  recommended_wall_mm: number;
  recommended_infill_pct: number;
  estimated_deflection_mm: number;
  print_time_hours: number;
  material_cost_USD: number;
  total_cost_USD: number;
  lead_time_days: number;
  max_service_temperature_C: number;
  cost_savings_pct: number;
  expected_life_cycles: number;
  recommendations: string[];
}

// ============================================================================
// MATERIAL PROPERTIES
// ============================================================================

const MATERIAL_PROPS: Record<PrintMaterial, {
  modulus_MPa: number;
  strength_MPa: number;
  max_temp_C: number;
  cost_per_cm3_USD: number;
  print_rate_cm3_per_hr: number;
  coolant_resistant: boolean;
}> = {
  PLA:          { modulus_MPa: 3500,   strength_MPa: 50,  max_temp_C: 55,  cost_per_cm3_USD: 0.03, print_rate_cm3_per_hr: 20, coolant_resistant: false },
  PETG:         { modulus_MPa: 2100,   strength_MPa: 45,  max_temp_C: 75,  cost_per_cm3_USD: 0.04, print_rate_cm3_per_hr: 18, coolant_resistant: true },
  ABS:          { modulus_MPa: 2300,   strength_MPa: 40,  max_temp_C: 95,  cost_per_cm3_USD: 0.04, print_rate_cm3_per_hr: 18, coolant_resistant: true },
  Nylon_FDM:    { modulus_MPa: 1700,   strength_MPa: 55,  max_temp_C: 110, cost_per_cm3_USD: 0.08, print_rate_cm3_per_hr: 15, coolant_resistant: true },
  PA12_SLS:     { modulus_MPa: 1700,   strength_MPa: 48,  max_temp_C: 175, cost_per_cm3_USD: 0.12, print_rate_cm3_per_hr: 30, coolant_resistant: true },
  Rigid_Resin:  { modulus_MPa: 4000,   strength_MPa: 65,  max_temp_C: 70,  cost_per_cm3_USD: 0.10, print_rate_cm3_per_hr: 25, coolant_resistant: false },
  AlSi10Mg:     { modulus_MPa: 70000,  strength_MPa: 350, max_temp_C: 300, cost_per_cm3_USD: 1.50, print_rate_cm3_per_hr: 5,  coolant_resistant: true },
  "316L":       { modulus_MPa: 193000, strength_MPa: 500, max_temp_C: 500, cost_per_cm3_USD: 2.50, print_rate_cm3_per_hr: 3,  coolant_resistant: true },
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class ThreeDPrintedFixtureEngine {
  evaluate(input: ThreeDPrintFixtureInput): ThreeDPrintFixtureResult {
    const props = MATERIAL_PROPS[input.material];

    // Temperature feasibility
    const tempOk = input.max_temperature_C <= props.max_temp_C;
    const coolantOk = !input.coolant_exposure || props.coolant_resistant;

    // Wall thickness for required stiffness
    // Simplified beam model: deflection = F*L^3/(3*E*I), I = b*h^3/12
    // Solve for h given target deflection = required_accuracy/2
    const beamLength = Math.cbrt(input.fixture_volume_cm3) * 10; // mm estimate
    const targetDeflection = input.required_accuracy_mm / 2;
    const beamWidth = beamLength * 0.5;
    const requiredI = (input.max_cutting_force_N * Math.pow(beamLength, 3)) / (3 * props.modulus_MPa * Math.max(targetDeflection, 0.001));
    const requiredH = Math.cbrt((12 * requiredI) / Math.max(beamWidth, 1));
    const wallThickness = Math.max(2, Math.min(20, requiredH));

    // Infill
    const stressRatio = input.max_cutting_force_N / (props.strength_MPa * wallThickness * beamWidth);
    const infill = Math.min(100, Math.max(20, stressRatio * 200));

    // Deflection estimate at recommended wall
    const I = beamWidth * Math.pow(wallThickness, 3) / 12 * (infill / 100);
    const deflection = (input.max_cutting_force_N * Math.pow(beamLength, 3)) / (3 * props.modulus_MPa * Math.max(I, 0.01));

    // Force feasibility
    const forceOk = deflection < input.required_accuracy_mm;

    const feasible = tempOk && coolantOk && forceOk;

    // Cost
    const materialCost = input.fixture_volume_cm3 * props.cost_per_cm3_USD * (infill / 100);
    const printTime = input.fixture_volume_cm3 / props.print_rate_cm3_per_hr * (infill / 100) + 1;
    const machineRate = input.process === "DMLS" ? 50 : input.process === "SLS" ? 15 : 5;
    const totalCost = materialCost + printTime * machineRate + 10; // $10 post-processing
    const leadTime = Math.ceil(printTime / 8) + 1; // working days

    const costSavings = input.conventional_cost_USD > 0
      ? ((input.conventional_cost_USD - totalCost) / input.conventional_cost_USD) * 100
      : 0;

    // Expected life (polymer fixtures wear)
    const lifeCycles = input.process === "DMLS" ? 10000
      : input.material === "PA12_SLS" ? 500
      : input.material === "Nylon_FDM" ? 200
      : 50;

    const recs: string[] = [];
    if (!tempOk) recs.push(`${input.material} max temp ${props.max_temp_C}°C < required ${input.max_temperature_C}°C — choose higher-temp material`);
    if (!coolantOk) recs.push(`${input.material} not coolant resistant — use PETG, ABS, Nylon, or metal`);
    if (!forceOk) recs.push(`Estimated deflection ${deflection.toFixed(3)}mm exceeds accuracy ${input.required_accuracy_mm}mm — increase wall or use stiffer material`);
    if (input.batch_size > lifeCycles) recs.push(`Batch ${input.batch_size} exceeds expected life ${lifeCycles} cycles — multiple fixtures or metal print needed`);
    if (costSavings < 0) recs.push("3D-printed fixture costs more than conventional — justified only by lead time savings");
    if (recs.length === 0) recs.push("3D-printed fixture feasible — proceed with design");

    return {
      feasible,
      recommended_wall_mm: Math.round(wallThickness * 10) / 10,
      recommended_infill_pct: Math.round(infill),
      estimated_deflection_mm: Math.round(deflection * 1000) / 1000,
      print_time_hours: Math.round(printTime * 10) / 10,
      material_cost_USD: Math.round(materialCost * 100) / 100,
      total_cost_USD: Math.round(totalCost * 100) / 100,
      lead_time_days: leadTime,
      max_service_temperature_C: props.max_temp_C,
      cost_savings_pct: Math.round(costSavings),
      expected_life_cycles: lifeCycles,
      recommendations: recs,
    };
  }
}

export const threeDPrintedFixtureEngine = new ThreeDPrintedFixtureEngine();
