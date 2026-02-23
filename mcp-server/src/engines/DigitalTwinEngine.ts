/**
 * PRISM Manufacturing Intelligence — Digital Twin Engine
 * R16-MS2: Workpiece Digital Twin
 *
 * Tracks the workpiece state through multi-operation machining processes:
 *   - Material removal tracking per operation
 *   - Geometry evolution (stock → final part)
 *   - Accumulated thermal/residual stress state
 *   - Surface condition history
 *   - Tolerance consumption tracking
 *
 * MCP actions:
 *   twin_create          — Initialize a workpiece twin from stock dimensions
 *   twin_remove_material — Apply a machining operation (removes material, updates state)
 *   twin_state           — Query current twin state
 *   twin_compare         — Compare twin state against target (nominal part)
 *
 * @version 1.0.0  R16-MS2
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export interface StockDimensions {
  shape: 'rectangular' | 'cylindrical' | 'custom';
  length_mm: number;
  width_mm?: number;       // For rectangular
  height_mm?: number;      // For rectangular
  diameter_mm?: number;    // For cylindrical
  material: string;
  hardness_hrc?: number;
}

export interface MachiningOperation {
  operation_id: string;
  type: 'facing' | 'roughing' | 'finishing' | 'drilling' | 'boring' | 'turning' | 'grooving' | 'threading';
  surface_id: string;           // Which surface this op targets
  depth_of_cut_mm: number;
  feed_mmrev: number;
  cutting_speed_mpm: number;
  tool_nose_radius_mm?: number;
  tool_material?: string;
  coolant?: string;
  axial_length_mm?: number;     // Length of cut along axis
  radial_depth_mm?: number;     // Radial engagement
}

export interface SurfaceState {
  surface_id: string;
  Ra_um: number;
  Rz_um: number;
  residual_stress_MPa: number;  // Negative = compressive, positive = tensile
  hardness_change_hrc: number;  // Delta from base
  temperature_history_peak_C: number;
  operations_applied: string[];
}

export interface TwinState {
  twin_id: string;
  material: string;
  stock: StockDimensions;
  current_volume_mm3: number;
  material_removed_mm3: number;
  removal_percentage: number;
  operations_count: number;
  operations_log: OperationLog[];
  surfaces: Record<string, SurfaceState>;
  accumulated_thermal_C: number;
  estimated_total_time_min: number;
  tolerance_budget_consumed_pct: number;
  safety: { score: number; flags: string[] };
}

interface OperationLog {
  operation_id: string;
  type: string;
  volume_removed_mm3: number;
  surface_id: string;
  Ra_achieved_um: number;
  Rz_achieved_um: number;
  time_min: number;
  power_kW: number;
}

export interface TwinCompareResult {
  twin_id: string;
  target_met: boolean;
  dimension_checks: Array<{
    surface_id: string;
    target_Ra_um?: number;
    achieved_Ra_um: number;
    target_Rz_um?: number;
    achieved_Rz_um: number;
    ra_pass: boolean;
    rz_pass: boolean;
  }>;
  overall_Ra_worst_um: number;
  overall_Rz_worst_um: number;
  tolerance_budget_remaining_pct: number;
  recommendations: string[];
}

// ============================================================================
// MATERIAL PROPERTIES
// ============================================================================

interface TwinMaterialProps {
  density_kg_m3: number;
  hardness_base_hrc: number;
  thermal_conductivity: number;
  specific_cutting_energy_j_mm3: number;
}

const TWIN_MATERIALS: Record<string, TwinMaterialProps> = {
  steel:       { density_kg_m3: 7850, hardness_base_hrc: 25, thermal_conductivity: 50,  specific_cutting_energy_j_mm3: 3.5 },
  stainless:   { density_kg_m3: 8000, hardness_base_hrc: 20, thermal_conductivity: 15,  specific_cutting_energy_j_mm3: 4.2 },
  aluminum:    { density_kg_m3: 2700, hardness_base_hrc: 10, thermal_conductivity: 237, specific_cutting_energy_j_mm3: 0.9 },
  titanium:    { density_kg_m3: 4430, hardness_base_hrc: 36, thermal_conductivity: 6.7, specific_cutting_energy_j_mm3: 4.0 },
  cast_iron:   { density_kg_m3: 7200, hardness_base_hrc: 22, thermal_conductivity: 52,  specific_cutting_energy_j_mm3: 2.5 },
  inconel:     { density_kg_m3: 8440, hardness_base_hrc: 38, thermal_conductivity: 11,  specific_cutting_energy_j_mm3: 5.5 },
  copper:      { density_kg_m3: 8960, hardness_base_hrc:  8, thermal_conductivity: 401, specific_cutting_energy_j_mm3: 1.2 },
  tool_steel:  { density_kg_m3: 7800, hardness_base_hrc: 55, thermal_conductivity: 25,  specific_cutting_energy_j_mm3: 4.8 },
};

function getTwinMaterial(name: string): TwinMaterialProps {
  const key = name.toLowerCase().replace(/[\s-_]+/g, '_');
  for (const [k, v] of Object.entries(TWIN_MATERIALS)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return TWIN_MATERIALS.steel;
}

// ============================================================================
// IN-MEMORY TWIN STORE
// ============================================================================

const twins = new Map<string, TwinState>();
let twinCounter = 0;

// ============================================================================
// SURFACE FINISH PREDICTION (simplified — ties into R15 physics)
// ============================================================================

function predictSurfaceFinish(op: MachiningOperation, matProps: TwinMaterialProps): { Ra: number; Rz: number } {
  const f = op.feed_mmrev;
  const re = op.tool_nose_radius_mm ?? 0.8;

  // Theoretical Ra from kinematic model
  let Ra_theo: number;
  if (op.type === 'turning' || op.type === 'boring' || op.type === 'facing') {
    // Turning: Ra ≈ f² / (32·rε) [mm] → [μm]
    Ra_theo = (f * f / (32 * re)) * 1000;
  } else if (op.type === 'roughing') {
    Ra_theo = (f * f / (32 * re)) * 1000 * 1.5; // Roughing: worse
  } else if (op.type === 'finishing') {
    Ra_theo = (f * f / (32 * re)) * 1000 * 0.8; // Finishing: better
  } else {
    Ra_theo = (f * f / (32 * Math.max(re, 0.4))) * 1000 * 1.2;
  }

  // Material correction (harder = better surface)
  const hardnessCorr = 1 - (matProps.hardness_base_hrc - 25) * 0.005;
  Ra_theo *= Math.max(0.6, Math.min(1.4, hardnessCorr));

  // Rz from first-principles ratio (Brammertz)
  const Rz_theo = Ra_theo * 4.0;

  return {
    Ra: +Math.max(0.1, Ra_theo).toFixed(2),
    Rz: +Math.max(0.4, Rz_theo).toFixed(2),
  };
}

// ============================================================================
// VOLUME CALCULATION
// ============================================================================

function computeStockVolume(stock: StockDimensions): number {
  if (stock.shape === 'rectangular') {
    return (stock.length_mm ?? 100) * (stock.width_mm ?? 100) * (stock.height_mm ?? 50);
  } else if (stock.shape === 'cylindrical') {
    const r = (stock.diameter_mm ?? 50) / 2;
    return Math.PI * r * r * (stock.length_mm ?? 100);
  }
  return stock.length_mm * (stock.width_mm ?? 100) * (stock.height_mm ?? 50);
}

function computeRemovalVolume(op: MachiningOperation): number {
  const ap = op.depth_of_cut_mm;
  const ae = op.radial_depth_mm ?? op.depth_of_cut_mm;
  const length = op.axial_length_mm ?? 50;

  switch (op.type) {
    case 'facing':
      return length * ae * ap;
    case 'roughing':
    case 'finishing':
      return length * ae * ap;
    case 'turning':
      // Cylindrical shell: π * ((R² - (R-ap)²)) * length
      return Math.PI * (2 * (ae / 2) * ap - ap * ap) * length;
    case 'drilling': {
      const r = ae / 2;
      return Math.PI * r * r * ap;
    }
    case 'boring': {
      const rOuter = ae / 2;
      const rInner = rOuter - ap;
      return Math.PI * (rOuter * rOuter - Math.max(0, rInner * rInner)) * length;
    }
    case 'grooving':
      return ap * ae * length;
    case 'threading':
      return ap * ae * length * 0.5; // Approximate thread profile
    default:
      return length * ae * ap;
  }
}

// ============================================================================
// twin_create
// ============================================================================

export function twinCreate(stock: StockDimensions): TwinState {
  const id = `twin_${++twinCounter}`;
  const volume = computeStockVolume(stock);

  const twin: TwinState = {
    twin_id: id,
    material: stock.material,
    stock,
    current_volume_mm3: +volume.toFixed(1),
    material_removed_mm3: 0,
    removal_percentage: 0,
    operations_count: 0,
    operations_log: [],
    surfaces: {},
    accumulated_thermal_C: 20,
    estimated_total_time_min: 0,
    tolerance_budget_consumed_pct: 0,
    safety: { score: 1.0, flags: [] },
  };

  twins.set(id, twin);
  log.info(`[DigitalTwin] Created twin ${id}: ${stock.shape} ${stock.material}`);
  return twin;
}

// ============================================================================
// twin_remove_material
// ============================================================================

export function twinRemoveMaterial(twinId: string, op: MachiningOperation): TwinState {
  const twin = twins.get(twinId);
  if (!twin) throw new Error(`Twin not found: ${twinId}. Available: ${[...twins.keys()].join(', ')}`);

  const matProps = getTwinMaterial(twin.material);
  const volumeRemoved = computeRemovalVolume(op);
  const surface = predictSurfaceFinish(op, matProps);

  // MRR and time
  const mrr = op.depth_of_cut_mm * (op.radial_depth_mm ?? op.depth_of_cut_mm) * op.feed_mmrev * op.cutting_speed_mpm * 1000 / (Math.PI * 50);
  const time_min = mrr > 0 ? volumeRemoved / mrr / 60 : 1;

  // Power estimate
  const power_kW = matProps.specific_cutting_energy_j_mm3 * (mrr > 0 ? mrr : 1) / 60 / 1000;

  // Thermal accumulation (simplified)
  const tempRise = power_kW * 50 / (matProps.thermal_conductivity + 1); // Rough
  twin.accumulated_thermal_C += tempRise * 0.1; // 10% retained

  // Residual stress estimate
  const stressSign = (op.type === 'finishing' && op.depth_of_cut_mm < 0.5) ? -1 : 1; // Finishing = compressive
  const residualStress = stressSign * (100 + power_kW * 20);

  // Hardness change
  const hardnessChange = tempRise > 200 ? -2 : (op.type === 'finishing' ? 1 : 0);

  // Update or create surface
  const existing = twin.surfaces[op.surface_id];
  const surfaceState: SurfaceState = {
    surface_id: op.surface_id,
    Ra_um: surface.Ra,
    Rz_um: surface.Rz,
    residual_stress_MPa: existing ? existing.residual_stress_MPa + residualStress : residualStress,
    hardness_change_hrc: existing ? existing.hardness_change_hrc + hardnessChange : hardnessChange,
    temperature_history_peak_C: Math.max(existing?.temperature_history_peak_C ?? 20, twin.accumulated_thermal_C),
    operations_applied: [...(existing?.operations_applied ?? []), op.operation_id],
  };
  twin.surfaces[op.surface_id] = surfaceState;

  // Update twin state
  twin.current_volume_mm3 = +(twin.current_volume_mm3 - volumeRemoved).toFixed(1);
  twin.material_removed_mm3 = +(twin.material_removed_mm3 + volumeRemoved).toFixed(1);
  const stockVol = computeStockVolume(twin.stock);
  twin.removal_percentage = +((twin.material_removed_mm3 / stockVol) * 100).toFixed(1);
  twin.operations_count++;
  twin.estimated_total_time_min = +(twin.estimated_total_time_min + time_min).toFixed(2);

  // Tolerance budget (consumed based on surface quality)
  const toleranceDelta = (surface.Ra > 3.2) ? 15 : (surface.Ra > 1.6) ? 8 : (surface.Ra > 0.8) ? 4 : 2;
  twin.tolerance_budget_consumed_pct = Math.min(100, twin.tolerance_budget_consumed_pct + toleranceDelta);

  twin.operations_log.push({
    operation_id: op.operation_id,
    type: op.type,
    volume_removed_mm3: +volumeRemoved.toFixed(1),
    surface_id: op.surface_id,
    Ra_achieved_um: surface.Ra,
    Rz_achieved_um: surface.Rz,
    time_min: +time_min.toFixed(2),
    power_kW: +power_kW.toFixed(2),
  });

  // Safety assessment
  const flags: string[] = [];
  let score = 1.0;
  if (twin.accumulated_thermal_C > 100) { flags.push("THERMAL_ACCUMULATION"); score -= 0.15; }
  if (twin.removal_percentage > 85) { flags.push("HIGH_MATERIAL_REMOVAL"); score -= 0.1; }
  if (twin.current_volume_mm3 < 0) { flags.push("NEGATIVE_VOLUME_ERROR"); score -= 0.5; twin.current_volume_mm3 = 0; }
  twin.safety = { score: +Math.max(0, score).toFixed(2), flags };

  return twin;
}

// ============================================================================
// twin_state
// ============================================================================

export function twinGetState(twinId: string): TwinState {
  const twin = twins.get(twinId);
  if (!twin) throw new Error(`Twin not found: ${twinId}. Available: ${[...twins.keys()].join(', ')}`);
  return twin;
}

// ============================================================================
// twin_compare
// ============================================================================

export interface TwinCompareInput {
  twin_id: string;
  targets: Array<{
    surface_id: string;
    target_Ra_um?: number;
    target_Rz_um?: number;
  }>;
}

export function twinCompare(input: TwinCompareInput): TwinCompareResult {
  const twin = twins.get(input.twin_id);
  if (!twin) throw new Error(`Twin not found: ${input.twin_id}`);

  const checks: TwinCompareResult['dimension_checks'] = [];
  let worstRa = 0, worstRz = 0;
  let allPass = true;

  for (const target of input.targets) {
    const surface = twin.surfaces[target.surface_id];
    const achievedRa = surface?.Ra_um ?? 99;
    const achievedRz = surface?.Rz_um ?? 99;

    const raPassed = !target.target_Ra_um || achievedRa <= target.target_Ra_um;
    const rzPassed = !target.target_Rz_um || achievedRz <= target.target_Rz_um;

    if (!raPassed || !rzPassed) allPass = false;
    if (achievedRa > worstRa) worstRa = achievedRa;
    if (achievedRz > worstRz) worstRz = achievedRz;

    checks.push({
      surface_id: target.surface_id,
      target_Ra_um: target.target_Ra_um,
      achieved_Ra_um: achievedRa,
      target_Rz_um: target.target_Rz_um,
      achieved_Rz_um: achievedRz,
      ra_pass: raPassed,
      rz_pass: rzPassed,
    });
  }

  // Recommendations
  const recs: string[] = [];
  for (const check of checks) {
    if (!check.ra_pass) {
      recs.push(`Surface ${check.surface_id}: Ra ${check.achieved_Ra_um}μm exceeds target ${check.target_Ra_um}μm — reduce feed or add finishing pass`);
    }
    if (!check.rz_pass) {
      recs.push(`Surface ${check.surface_id}: Rz ${check.achieved_Rz_um}μm exceeds target ${check.target_Rz_um}μm — increase nose radius or reduce feed`);
    }
  }
  if (twin.accumulated_thermal_C > 80) {
    recs.push("High thermal accumulation — consider inter-operation cooling dwell or improved coolant");
  }

  return {
    twin_id: input.twin_id,
    target_met: allPass,
    dimension_checks: checks,
    overall_Ra_worst_um: +worstRa.toFixed(2),
    overall_Rz_worst_um: +worstRz.toFixed(2),
    tolerance_budget_remaining_pct: +(100 - twin.tolerance_budget_consumed_pct).toFixed(1),
    recommendations: recs,
  };
}

// ============================================================================
// DISPATCHER
// ============================================================================

export function executeDigitalTwinAction(action: string, params: Record<string, unknown>): unknown {
  log.info(`[DigitalTwin] action=${action}`);

  switch (action) {
    case 'twin_create':
      return twinCreate(params as unknown as StockDimensions);
    case 'twin_remove_material':
      return twinRemoveMaterial(params.twin_id as string, params.operation as unknown as MachiningOperation);
    case 'twin_state':
      return twinGetState(params.twin_id as string);
    case 'twin_compare':
      return twinCompare(params as unknown as TwinCompareInput);
    default:
      throw new Error(`Unknown DigitalTwin action: ${action}`);
  }
}
