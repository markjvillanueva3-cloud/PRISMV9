/**
 * PRISM Benchmark Parts -- 15 canonical test parts with hand-calculated reference answers.
 * Each part has geometry, material, machine, tool specs, and pre-computed optimal S/F values.
 *
 * Kienzle constants by ISO group:
 *   P (steel 1045):      kc1.1=1800, mc=0.25, Taylor C=250, n=0.25
 *   M (304 SS):           kc1.1=2100, mc=0.25, Taylor C=150, n=0.20
 *   K (cast iron GG25):   kc1.1=1100, mc=0.25, Taylor C=300, n=0.30
 *   N (6061-T6 Al):       kc1.1=800,  mc=0.20, Taylor C=900, n=0.40
 *   S (Inconel 718):      kc1.1=2800, mc=0.28, Taylor C=40,  n=0.15
 *   H (hardened D2 60HRC):kc1.1=3500, mc=0.30, Taylor C=80,  n=0.18
 *
 * Reference formulas:
 *   Fc = kc1.1 * ap * fz^(1-mc)                       [N]
 *   P  = Fc * Vc / 60000                               [kW]
 *   T  = (C / Vc)^(1/n)                                [min]
 *   Ra = fz^2 / (32 * r_nose) * 1000                   [um]
 *   delta = Fc * L^3 / (3 * E * I)  where I = pi*d^4/64 [um] (multiply m->um at end)
 *   MRR = ap * ae * vf / 1000                          [cm3/min]  vf = fz * z * rpm
 */

export interface BenchmarkPart {
  id: string;
  name: string;
  description: string;
  features: Array<{
    type: 'pocket' | 'hole' | 'slot' | 'contour' | 'face' | 'thread' | 'bore' | 'groove' | 'turn_od' | 'turn_id';
    dimensions: Record<string, number>;
    tolerance_mm?: number;
    surface_finish_Ra_um?: number;
  }>;
  material: {
    name: string;
    iso_group: 'P' | 'M' | 'K' | 'N' | 'S' | 'H';
    kc1_1: number;
    mc: number;
    taylor_C: number;
    taylor_n: number;
    density_kg_m3: number;
    E_GPa: number;
  };
  tool: {
    diameter_mm: number;
    flutes: number;
    helix_angle_deg: number;
    rake_angle_deg: number;
    nose_radius_mm: number;
    overhang_mm: number;
    tool_material: 'carbide' | 'HSS' | 'ceramic' | 'CBN' | 'PCD';
    coating?: string;
    E_GPa: number;
  };
  machine: {
    name: string;
    max_rpm: number;
    max_power_kW: number;
    max_torque_Nm: number;
    x_travel_mm: number;
    y_travel_mm: number;
    z_travel_mm: number;
  };
  cut_params: {
    ae_mm: number; // radial depth of cut (stepover)
  };
  reference_answers: {
    optimal_rpm: number;
    optimal_feed_mm_per_tooth: number;
    optimal_depth_mm: number;
    cutting_speed_m_per_min: number;
    Fc_N: number;
    power_kW: number;
    tool_life_min: number;
    Ra_um: number;
    deflection_um: number;
    MRR_cm3_per_min: number;
    cost_per_part?: number;
    cycle_time_min?: number;
    formulas: Record<string, string>;
  };
}

// ---------------------------------------------------------------------------
// Kienzle / Taylor material constants (shared reference)
// ---------------------------------------------------------------------------
export const KIENZLE_CONSTANTS: Record<string, { kc1_1: number; mc: number; taylor_C: number; taylor_n: number }> = {
  P: { kc1_1: 1800, mc: 0.25, taylor_C: 250, taylor_n: 0.25 },
  M: { kc1_1: 2100, mc: 0.25, taylor_C: 150, taylor_n: 0.20 },
  K: { kc1_1: 1100, mc: 0.25, taylor_C: 300, taylor_n: 0.30 },
  N: { kc1_1: 800, mc: 0.20, taylor_C: 900, taylor_n: 0.40 },
  S: { kc1_1: 2800, mc: 0.28, taylor_C: 40, taylor_n: 0.15 },
  H: { kc1_1: 3500, mc: 0.30, taylor_C: 80, taylor_n: 0.18 },
};

// ---------------------------------------------------------------------------
// Helper: compute reference answers from inputs
// ---------------------------------------------------------------------------
function computeReference(
  mat: { kc1_1: number; mc: number; taylor_C: number; taylor_n: number },
  tool: { diameter_mm: number; flutes: number; nose_radius_mm: number; overhang_mm: number; E_GPa: number },
  ap: number,
  fz: number,
  ae: number,
  Vc: number,
): Omit<BenchmarkPart['reference_answers'], 'cost_per_part' | 'cycle_time_min' | 'formulas'> {
  const rpm = (Vc * 1000) / (Math.PI * tool.diameter_mm);
  const Fc = mat.kc1_1 * ap * Math.pow(fz, 1 - mat.mc);
  const power = (Fc * Vc) / 60000;
  const T = Math.pow(mat.taylor_C / Vc, 1 / mat.taylor_n);
  const Ra = (Math.pow(fz, 2) / (32 * tool.nose_radius_mm)) * 1000;
  const I = (Math.PI * Math.pow(tool.diameter_mm / 1000, 4)) / 64; // m^4
  const L = tool.overhang_mm / 1000; // m
  const E = tool.E_GPa * 1e9; // Pa
  const deflection_m = (Fc * Math.pow(L, 3)) / (3 * E * I);
  const deflection_um = deflection_m * 1e6;
  const vf = fz * tool.flutes * rpm; // mm/min
  const MRR = (ap * ae * vf) / 1000; // cm3/min

  return {
    optimal_rpm: Math.round(rpm),
    optimal_feed_mm_per_tooth: fz,
    optimal_depth_mm: ap,
    cutting_speed_m_per_min: Vc,
    Fc_N: Math.round(Fc * 100) / 100,
    power_kW: Math.round(power * 1000) / 1000,
    tool_life_min: Math.round(T * 100) / 100,
    Ra_um: Math.round(Ra * 1000) / 1000,
    deflection_um: Math.round(deflection_um * 1000) / 1000,
    MRR_cm3_per_min: Math.round(MRR * 1000) / 1000,
  };
}

const STANDARD_FORMULAS: Record<string, string> = {
  Fc: 'Fc = kc1.1 * ap * fz^(1-mc)',
  power: 'P = Fc * Vc / 60000',
  taylor: 'T = (C / Vc)^(1/n)',
  Ra: 'Ra = fz^2 / (32 * r_nose) * 1000',
  deflection: 'delta = Fc * L^3 / (3 * E * I), I = pi*d^4/64',
  MRR: 'MRR = ap * ae * vf / 1000, vf = fz * z * rpm',
};

// ---------------------------------------------------------------------------
// BP-001: Simple Block -- Steel 1045 face mill
// ---------------------------------------------------------------------------
const bp001Mat = KIENZLE_CONSTANTS.P;
const bp001Tool = { diameter_mm: 50, flutes: 4, helix_angle_deg: 30, rake_angle_deg: 10, nose_radius_mm: 0.8, overhang_mm: 60, tool_material: 'carbide' as const, coating: 'TiAlN', E_GPa: 580 };
const bp001Ref = computeReference(bp001Mat, bp001Tool, 2.0, 0.15, 35, 180);

const bp002Mat = KIENZLE_CONSTANTS.P;
const bp002Tool = { diameter_mm: 12, flutes: 3, helix_angle_deg: 35, rake_angle_deg: 8, nose_radius_mm: 0.4, overhang_mm: 40, tool_material: 'carbide' as const, coating: 'TiAlN', E_GPa: 580 };
const bp002Ref = computeReference(bp002Mat, bp002Tool, 1.0, 0.08, 8, 150);

const bp003Mat = KIENZLE_CONSTANTS.N;
const bp003Tool = { diameter_mm: 16, flutes: 3, helix_angle_deg: 45, rake_angle_deg: 15, nose_radius_mm: 0.5, overhang_mm: 48, tool_material: 'carbide' as const, coating: 'ZrN', E_GPa: 580 };
const bp003Ref = computeReference(bp003Mat, bp003Tool, 3.0, 0.12, 10, 500);

const bp004Mat = KIENZLE_CONSTANTS.H;
const bp004Tool = {
  diameter_mm: 8, flutes: 4, helix_angle_deg: 40,
  rake_angle_deg: -6, nose_radius_mm: 0.4, overhang_mm: 32,
  tool_material: 'CBN' as const, coating: 'TiAlN', E_GPa: 680,
};
const bp004Ref = computeReference(bp004Mat, bp004Tool, 0.3, 0.04, 5, 70);

const bp005Mat = KIENZLE_CONSTANTS.N;
const bp005Tool = { diameter_mm: 6, flutes: 2, helix_angle_deg: 45, rake_angle_deg: 15, nose_radius_mm: 0.2, overhang_mm: 30, tool_material: 'carbide' as const, coating: 'DLC', E_GPa: 580 };
const bp005Ref = computeReference(bp005Mat, bp005Tool, 0.5, 0.05, 4, 226);

const bp006Mat = KIENZLE_CONSTANTS.M;
const bp006Tool = { diameter_mm: 10, flutes: 4, helix_angle_deg: 35, rake_angle_deg: 8, nose_radius_mm: 0.5, overhang_mm: 35, tool_material: 'carbide' as const, coating: 'AlTiN', E_GPa: 580 };
const bp006Ref = computeReference(bp006Mat, bp006Tool, 1.0, 0.06, 6, 80);

const bp007Mat = KIENZLE_CONSTANTS.P;
const bp007Tool = { diameter_mm: 16, flutes: 3, helix_angle_deg: 30, rake_angle_deg: 6, nose_radius_mm: 0.8, overhang_mm: 50, tool_material: 'carbide' as const, coating: 'TiAlN', E_GPa: 580 };
const bp007Ref = computeReference(bp007Mat, bp007Tool, 2.0, 0.10, 12, 140);

const bp008Mat = KIENZLE_CONSTANTS.P;
const bp008Tool = { diameter_mm: 20, flutes: 1, helix_angle_deg: 0, rake_angle_deg: 6, nose_radius_mm: 0.8, overhang_mm: 50, tool_material: 'carbide' as const, coating: 'TiN', E_GPa: 580 };
const bp008Ref = computeReference(bp008Mat, bp008Tool, 2.5, 0.15, 20, 100);

const bp009Mat = KIENZLE_CONSTANTS.M;
const bp009Tool = { diameter_mm: 4, flutes: 4, helix_angle_deg: 30, rake_angle_deg: 5, nose_radius_mm: 0.1, overhang_mm: 20, tool_material: 'carbide' as const, coating: 'AlCrN', E_GPa: 580 };
const bp009Ref = computeReference(bp009Mat, bp009Tool, 0.12, 0.015, 2.5, 50);

const bp010Mat = KIENZLE_CONSTANTS.N;
const bp010Tool = { diameter_mm: 20, flutes: 3, helix_angle_deg: 45, rake_angle_deg: 18, nose_radius_mm: 1.0, overhang_mm: 60, tool_material: 'carbide' as const, coating: 'DLC', E_GPa: 580 };
const bp010Ref = computeReference(bp010Mat, bp010Tool, 4.0, 0.15, 14, 753);

const bp011Mat = KIENZLE_CONSTANTS.S;
const bp011Tool = { diameter_mm: 10, flutes: 4, helix_angle_deg: 35, rake_angle_deg: 6, nose_radius_mm: 0.5, overhang_mm: 35, tool_material: 'carbide' as const, coating: 'AlTiN', E_GPa: 580 };
const bp011Ref = computeReference(bp011Mat, bp011Tool, 0.8, 0.04, 6, 25);

const bp012Mat = KIENZLE_CONSTANTS.N;
const bp012Tool = { diameter_mm: 6, flutes: 2, helix_angle_deg: 45, rake_angle_deg: 15, nose_radius_mm: 0.5, overhang_mm: 25, tool_material: 'PCD' as const, E_GPa: 900 };
const bp012Ref = computeReference({ ...KIENZLE_CONSTANTS.N, kc1_1: 600 }, bp012Tool, 0.5, 0.04, 4, 200);

const bp013Mat = KIENZLE_CONSTANTS.K;
const bp013Tool = {
  diameter_mm: 25, flutes: 4, helix_angle_deg: 30,
  rake_angle_deg: 8, nose_radius_mm: 1.0, overhang_mm: 50,
  tool_material: 'carbide' as const, coating: 'TiAlN', E_GPa: 580,
};
const bp013Ref = computeReference(bp013Mat, bp013Tool, 3.0, 0.10, 16, 200);

const bp014Mat = KIENZLE_CONSTANTS.S;
const bp014Tool = {
  diameter_mm: 6, flutes: 4, helix_angle_deg: 38,
  rake_angle_deg: 6, nose_radius_mm: 0.2, overhang_mm: 15,
  tool_material: 'carbide' as const, coating: 'AlTiN', E_GPa: 580,
};
const bp014Ref = computeReference(bp014Mat, bp014Tool, 0.5, 0.03, 3, 20);

const bp015Mat = KIENZLE_CONSTANTS.P;
const bp015Tool = {
  diameter_mm: 12, flutes: 4, helix_angle_deg: 35,
  rake_angle_deg: 10, nose_radius_mm: 0.4, overhang_mm: 30,
  tool_material: 'carbide' as const, coating: 'TiAlN', E_GPa: 580,
};
const bp015Ref = computeReference(bp015Mat, bp015Tool, 1.5, 0.08, 8, 160);

// ---------------------------------------------------------------------------
// Full part definitions
// ---------------------------------------------------------------------------
export const BENCHMARK_PARTS: BenchmarkPart[] = [
  {
    id: 'BP-001',
    name: 'Simple Block',
    description: 'Basic rectangular steel block with face milling and simple pocket. Entry-level validation of Kienzle and Taylor formulas.',
    features: [
      { type: 'face', dimensions: { length_mm: 200, width_mm: 100, depth_mm: 2 }, tolerance_mm: 0.05, surface_finish_Ra_um: 1.6 },
      { type: 'pocket', dimensions: { length_mm: 80, width_mm: 40, depth_mm: 15 }, tolerance_mm: 0.05 },
    ],
    material: { name: 'AISI 1045 Steel', iso_group: 'P', kc1_1: 1800, mc: 0.25, taylor_C: 250, taylor_n: 0.25, density_kg_m3: 7850, E_GPa: 205 },
    tool: bp001Tool,
    machine: { name: 'Haas VF-2', max_rpm: 8100, max_power_kW: 22.4, max_torque_Nm: 122, x_travel_mm: 762, y_travel_mm: 406, z_travel_mm: 508 },
    cut_params: { ae_mm: 35 },
    reference_answers: { ...bp001Ref, formulas: STANDARD_FORMULAS },
  },
  {
    id: 'BP-002',
    name: 'Tolerance Bracket',
    description: 'Steel bracket with tight-tolerance bores and shoulder faces. Tests finish-pass S/F and deflection limits.',
    features: [
      { type: 'pocket', dimensions: { length_mm: 60, width_mm: 30, depth_mm: 20 }, tolerance_mm: 0.025, surface_finish_Ra_um: 0.8 },
      { type: 'hole', dimensions: { diameter_mm: 12, depth_mm: 25 }, tolerance_mm: 0.012 },
      { type: 'hole', dimensions: { diameter_mm: 8, depth_mm: 20 }, tolerance_mm: 0.012 },
    ],
    material: { name: 'AISI 1045 Steel', iso_group: 'P', kc1_1: 1800, mc: 0.25, taylor_C: 250, taylor_n: 0.25, density_kg_m3: 7850, E_GPa: 205 },
    tool: bp002Tool,
    machine: { name: 'Haas VF-2', max_rpm: 8100, max_power_kW: 22.4, max_torque_Nm: 122, x_travel_mm: 762, y_travel_mm: 406, z_travel_mm: 508 },
    cut_params: { ae_mm: 8 },
    reference_answers: { ...bp002Ref, formulas: STANDARD_FORMULAS },
  },
  {
    id: 'BP-003',
    name: 'Multi-Pocket Plate',
    description: 'Aluminum plate with 6 pockets of varying sizes. Tests high-speed machining S/F for soft alloy.',
    features: [
      { type: 'face', dimensions: { length_mm: 300, width_mm: 200, depth_mm: 1 }, tolerance_mm: 0.05 },
      { type: 'pocket', dimensions: { length_mm: 50, width_mm: 30, depth_mm: 15 }, tolerance_mm: 0.05 },
      { type: 'pocket', dimensions: { length_mm: 40, width_mm: 25, depth_mm: 12 }, tolerance_mm: 0.05 },
      { type: 'pocket', dimensions: { length_mm: 60, width_mm: 35, depth_mm: 20 }, tolerance_mm: 0.05 },
      { type: 'pocket', dimensions: { length_mm: 45, width_mm: 20, depth_mm: 10 }, tolerance_mm: 0.05 },
      { type: 'pocket', dimensions: { length_mm: 55, width_mm: 40, depth_mm: 18 }, tolerance_mm: 0.05 },
      { type: 'pocket', dimensions: { length_mm: 35, width_mm: 25, depth_mm: 8 }, tolerance_mm: 0.05 },
    ],
    material: { name: '6061-T6 Aluminum', iso_group: 'N', kc1_1: 800, mc: 0.20, taylor_C: 900, taylor_n: 0.40, density_kg_m3: 2700, E_GPa: 69 },
    tool: bp003Tool,
    machine: { name: 'Haas VF-2SS', max_rpm: 12000, max_power_kW: 22.4, max_torque_Nm: 122, x_travel_mm: 762, y_travel_mm: 406, z_travel_mm: 508 },
    cut_params: { ae_mm: 10 },
    reference_answers: { ...bp003Ref, formulas: STANDARD_FORMULAS },
  },
  {
    id: 'BP-004',
    name: 'Deep Cavity Mold',
    description: 'Hardened D2 mold cavity (60 HRC). Tests H-group CBN machining with tight deflection control.',
    features: [
      { type: 'pocket', dimensions: { length_mm: 80, width_mm: 60, depth_mm: 50 }, tolerance_mm: 0.02, surface_finish_Ra_um: 0.4 },
      { type: 'contour', dimensions: { length_mm: 240, depth_mm: 50, wall_draft_deg: 1 }, tolerance_mm: 0.02 },
    ],
    material: { name: 'D2 Tool Steel 60HRC', iso_group: 'H', kc1_1: 3500, mc: 0.30, taylor_C: 80, taylor_n: 0.18, density_kg_m3: 7700, E_GPa: 210 },
    tool: bp004Tool,
    machine: { name: 'DMG MORI DMU 50', max_rpm: 14000, max_power_kW: 25, max_torque_Nm: 87, x_travel_mm: 500, y_travel_mm: 450, z_travel_mm: 400 },
    cut_params: { ae_mm: 5 },
    reference_answers: { ...bp004Ref, formulas: STANDARD_FORMULAS },
  },
  {
    id: 'BP-005',
    name: 'Thin Wall Enclosure',
    description: 'Aluminum thin-wall part (1.5 mm walls). Tests vibration-limited feed and deflection control.',
    features: [
      { type: 'pocket', dimensions: { length_mm: 100, width_mm: 60, depth_mm: 40, wall_thickness_mm: 1.5 }, tolerance_mm: 0.03 },
      { type: 'contour', dimensions: { length_mm: 320, depth_mm: 40 }, tolerance_mm: 0.03, surface_finish_Ra_um: 1.6 },
    ],
    material: { name: '6061-T6 Aluminum', iso_group: 'N', kc1_1: 800, mc: 0.20, taylor_C: 900, taylor_n: 0.40, density_kg_m3: 2700, E_GPa: 69 },
    tool: bp005Tool,
    machine: { name: 'Haas VF-2SS', max_rpm: 12000, max_power_kW: 22.4, max_torque_Nm: 122, x_travel_mm: 762, y_travel_mm: 406, z_travel_mm: 508 },
    cut_params: { ae_mm: 4 },
    reference_answers: { ...bp005Ref, formulas: STANDARD_FORMULAS },
  },
  {
    id: 'BP-006',
    name: '3+2 Axis Manifold',
    description: 'Stainless steel manifold with holes on 3 faces requiring 3+2 axis positioning. Tests multi-setup S/F on austenitic SS.',
    features: [
      { type: 'pocket', dimensions: { length_mm: 50, width_mm: 30, depth_mm: 20 }, tolerance_mm: 0.025 },
      { type: 'hole', dimensions: { diameter_mm: 10, depth_mm: 30 }, tolerance_mm: 0.015 },
      { type: 'hole', dimensions: { diameter_mm: 8, depth_mm: 25 }, tolerance_mm: 0.015 },
      { type: 'hole', dimensions: { diameter_mm: 6, depth_mm: 20 }, tolerance_mm: 0.015 },
      { type: 'slot', dimensions: { length_mm: 40, width_mm: 8, depth_mm: 10 }, tolerance_mm: 0.03 },
    ],
    material: { name: '304 Stainless Steel', iso_group: 'M', kc1_1: 2100, mc: 0.25, taylor_C: 150, taylor_n: 0.20, density_kg_m3: 8000, E_GPa: 193 },
    tool: bp006Tool,
    machine: { name: 'DMG MORI DMU 50', max_rpm: 14000, max_power_kW: 25, max_torque_Nm: 87, x_travel_mm: 500, y_travel_mm: 450, z_travel_mm: 400 },
    cut_params: { ae_mm: 6 },
    reference_answers: { ...bp006Ref, formulas: STANDARD_FORMULAS },
  },
  {
    id: 'BP-007',
    name: 'Thread Boss Plate',
    description: 'Steel plate with threaded bosses (M10, M8, M6) and clearance bores. Tests thread-related S/F.',
    features: [
      { type: 'face', dimensions: { length_mm: 150, width_mm: 100, depth_mm: 2 }, tolerance_mm: 0.05 },
      { type: 'thread', dimensions: { diameter_mm: 10, pitch_mm: 1.5, depth_mm: 20 }, tolerance_mm: 0.02 },
      { type: 'thread', dimensions: { diameter_mm: 8, pitch_mm: 1.25, depth_mm: 16 }, tolerance_mm: 0.02 },
      { type: 'thread', dimensions: { diameter_mm: 6, pitch_mm: 1.0, depth_mm: 12 }, tolerance_mm: 0.02 },
      { type: 'bore', dimensions: { diameter_mm: 20, depth_mm: 15 }, tolerance_mm: 0.015 },
    ],
    material: { name: 'AISI 1045 Steel', iso_group: 'P', kc1_1: 1800, mc: 0.25, taylor_C: 250, taylor_n: 0.25, density_kg_m3: 7850, E_GPa: 205 },
    tool: bp007Tool,
    machine: { name: 'Haas VF-2', max_rpm: 8100, max_power_kW: 22.4, max_torque_Nm: 122, x_travel_mm: 762, y_travel_mm: 406, z_travel_mm: 508 },
    cut_params: { ae_mm: 12 },
    reference_answers: { ...bp007Ref, formulas: STANDARD_FORMULAS },
  },
  {
    id: 'BP-008',
    name: 'Turned Shaft',
    description: 'Steel shaft with OD turning, grooving, and threading. Tests lathe-mode S/F with single-point tool.',
    features: [
      { type: 'turn_od', dimensions: { od_mm: 50, length_mm: 150 }, tolerance_mm: 0.025, surface_finish_Ra_um: 1.6 },
      { type: 'turn_od', dimensions: { od_mm: 40, length_mm: 60 }, tolerance_mm: 0.02 },
      { type: 'groove', dimensions: { width_mm: 3, depth_mm: 5, od_mm: 50 }, tolerance_mm: 0.05 },
      { type: 'thread', dimensions: { diameter_mm: 40, pitch_mm: 2.0, length_mm: 30 }, tolerance_mm: 0.02 },
    ],
    material: { name: 'AISI 1045 Steel', iso_group: 'P', kc1_1: 1800, mc: 0.25, taylor_C: 250, taylor_n: 0.25, density_kg_m3: 7850, E_GPa: 205 },
    tool: { ...bp008Tool, helix_angle_deg: 0, rake_angle_deg: 6 },
    machine: { name: 'Haas ST-10', max_rpm: 6000, max_power_kW: 11.2, max_torque_Nm: 102, x_travel_mm: 200, y_travel_mm: 0, z_travel_mm: 356 },
    cut_params: { ae_mm: 20 },
    reference_answers: { ...bp008Ref, formulas: STANDARD_FORMULAS },
  },
  {
    id: 'BP-009',
    name: 'Swiss Micro Part',
    description: 'Tiny stainless steel medical connector for Swiss-type lathe. Tests micro-machining S/F limits.',
    features: [
      { type: 'turn_od', dimensions: { od_mm: 4, length_mm: 12 }, tolerance_mm: 0.005, surface_finish_Ra_um: 0.4 },
      { type: 'groove', dimensions: { width_mm: 0.5, depth_mm: 0.8, od_mm: 4 }, tolerance_mm: 0.01 },
      { type: 'hole', dimensions: { diameter_mm: 1.5, depth_mm: 6 }, tolerance_mm: 0.01 },
      { type: 'thread', dimensions: { diameter_mm: 3, pitch_mm: 0.5, length_mm: 4 }, tolerance_mm: 0.01 },
    ],
    material: { name: '304 Stainless Steel', iso_group: 'M', kc1_1: 2100, mc: 0.25, taylor_C: 150, taylor_n: 0.20, density_kg_m3: 8000, E_GPa: 193 },
    tool: bp009Tool,
    machine: { name: 'Citizen L20', max_rpm: 10000, max_power_kW: 3.7, max_torque_Nm: 10, x_travel_mm: 130, y_travel_mm: 40, z_travel_mm: 205 },
    cut_params: { ae_mm: 2.5 },
    reference_answers: { ...bp009Ref, formulas: STANDARD_FORMULAS },
  },
  {
    id: 'BP-010',
    name: 'Aluminum Heatsink',
    description: 'Complex aluminum heatsink with deep thin fins. Tests HSM strategy with aggressive MRR.',
    features: [
      { type: 'face', dimensions: { length_mm: 150, width_mm: 100, depth_mm: 1 }, tolerance_mm: 0.05 },
      { type: 'slot', dimensions: { length_mm: 140, width_mm: 2, depth_mm: 30 }, tolerance_mm: 0.05 },
      { type: 'slot', dimensions: { length_mm: 140, width_mm: 2, depth_mm: 30 }, tolerance_mm: 0.05 },
      { type: 'pocket', dimensions: { length_mm: 140, width_mm: 90, depth_mm: 25 }, tolerance_mm: 0.1 },
    ],
    material: { name: '6061-T6 Aluminum', iso_group: 'N', kc1_1: 800, mc: 0.20, taylor_C: 900, taylor_n: 0.40, density_kg_m3: 2700, E_GPa: 69 },
    tool: bp010Tool,
    machine: { name: 'Haas VF-2SS', max_rpm: 12000, max_power_kW: 22.4, max_torque_Nm: 122, x_travel_mm: 762, y_travel_mm: 406, z_travel_mm: 508 },
    cut_params: { ae_mm: 14 },
    reference_answers: { ...bp010Ref, formulas: STANDARD_FORMULAS },
  },
  {
    id: 'BP-011',
    name: 'Inconel Bracket',
    description: 'Aerospace Inconel 718 bracket. Tests super-alloy S/F with severe tool life and power constraints.',
    features: [
      { type: 'pocket', dimensions: { length_mm: 60, width_mm: 40, depth_mm: 12 }, tolerance_mm: 0.025 },
      { type: 'contour', dimensions: { length_mm: 200, depth_mm: 15 }, tolerance_mm: 0.03, surface_finish_Ra_um: 1.6 },
      { type: 'hole', dimensions: { diameter_mm: 8, depth_mm: 20 }, tolerance_mm: 0.02 },
    ],
    material: { name: 'Inconel 718', iso_group: 'S', kc1_1: 2800, mc: 0.28, taylor_C: 40, taylor_n: 0.15, density_kg_m3: 8190, E_GPa: 205 },
    tool: bp011Tool,
    machine: { name: 'DMG MORI DMU 50', max_rpm: 14000, max_power_kW: 25, max_torque_Nm: 87, x_travel_mm: 500, y_travel_mm: 450, z_travel_mm: 400 },
    cut_params: { ae_mm: 6 },
    reference_answers: { ...bp011Ref, formulas: STANDARD_FORMULAS },
  },
  {
    id: 'BP-012',
    name: 'CFRP Panel',
    description: 'Carbon-fiber panel with edge trimming and hole patterns. Modeled as N-group with reduced kc for composite.',
    features: [
      { type: 'contour', dimensions: { length_mm: 400, depth_mm: 3 }, tolerance_mm: 0.1, surface_finish_Ra_um: 3.2 },
      { type: 'hole', dimensions: { diameter_mm: 6, depth_mm: 3 }, tolerance_mm: 0.05 },
      { type: 'hole', dimensions: { diameter_mm: 8, depth_mm: 3 }, tolerance_mm: 0.05 },
    ],
    material: { name: 'CFRP Composite (approx N-group)', iso_group: 'N', kc1_1: 600, mc: 0.20, taylor_C: 900, taylor_n: 0.40, density_kg_m3: 1600, E_GPa: 70 },
    tool: bp012Tool,
    machine: { name: 'Haas VF-2SS', max_rpm: 12000, max_power_kW: 22.4, max_torque_Nm: 122, x_travel_mm: 762, y_travel_mm: 406, z_travel_mm: 508 },
    cut_params: { ae_mm: 4 },
    reference_answers: { ...bp012Ref, formulas: { ...STANDARD_FORMULAS, note: 'CFRP uses reduced kc1_1=600 (abrasive composite, PCD tool)' } },
  },
  {
    id: 'BP-013',
    name: 'Cast Iron Housing',
    description: 'GG25 grey cast iron motor housing. Tests K-group dry machining with high cutting speeds.',
    features: [
      { type: 'face', dimensions: { length_mm: 200, width_mm: 150, depth_mm: 3 }, tolerance_mm: 0.05, surface_finish_Ra_um: 3.2 },
      { type: 'bore', dimensions: { diameter_mm: 80, depth_mm: 40 }, tolerance_mm: 0.015, surface_finish_Ra_um: 1.6 },
      { type: 'pocket', dimensions: { length_mm: 50, width_mm: 30, depth_mm: 15 }, tolerance_mm: 0.05 },
      { type: 'hole', dimensions: { diameter_mm: 10, depth_mm: 25 }, tolerance_mm: 0.02 },
    ],
    material: { name: 'GG25 Grey Cast Iron', iso_group: 'K', kc1_1: 1100, mc: 0.25, taylor_C: 300, taylor_n: 0.30, density_kg_m3: 7200, E_GPa: 110 },
    tool: bp013Tool,
    machine: { name: 'Mazak VCN 530C', max_rpm: 12000, max_power_kW: 30, max_torque_Nm: 200, x_travel_mm: 560, y_travel_mm: 530, z_travel_mm: 510 },
    cut_params: { ae_mm: 16 },
    reference_answers: { ...bp013Ref, formulas: STANDARD_FORMULAS },
  },
  {
    id: 'BP-014',
    name: 'Medical Implant',
    description: 'Inconel 718 spinal cage implant. Tests super-alloy micro-milling with tight tolerances.',
    features: [
      { type: 'pocket', dimensions: { length_mm: 20, width_mm: 12, depth_mm: 6 }, tolerance_mm: 0.01, surface_finish_Ra_um: 0.8 },
      { type: 'slot', dimensions: { length_mm: 15, width_mm: 1.5, depth_mm: 4 }, tolerance_mm: 0.015 },
      { type: 'contour', dimensions: { length_mm: 80, depth_mm: 8 }, tolerance_mm: 0.01, surface_finish_Ra_um: 0.4 },
      { type: 'hole', dimensions: { diameter_mm: 3, depth_mm: 8 }, tolerance_mm: 0.01 },
    ],
    material: { name: 'Inconel 718', iso_group: 'S', kc1_1: 2800, mc: 0.28, taylor_C: 40, taylor_n: 0.15, density_kg_m3: 8190, E_GPa: 205 },
    tool: bp014Tool,
    machine: { name: 'Kern Micro HD', max_rpm: 50000, max_power_kW: 6.4, max_torque_Nm: 4, x_travel_mm: 300, y_travel_mm: 280, z_travel_mm: 250 },
    cut_params: { ae_mm: 3 },
    reference_answers: { ...bp014Ref, formulas: STANDARD_FORMULAS },
  },
  {
    id: 'BP-015',
    name: 'Production Run Bracket',
    description: 'High-volume steel bracket (10K pcs/yr). Tests production-optimized S/F with cost and cycle time.',
    features: [
      { type: 'face', dimensions: { length_mm: 120, width_mm: 80, depth_mm: 1.5 }, tolerance_mm: 0.05 },
      { type: 'pocket', dimensions: { length_mm: 40, width_mm: 25, depth_mm: 12 }, tolerance_mm: 0.03 },
      { type: 'hole', dimensions: { diameter_mm: 10, depth_mm: 15 }, tolerance_mm: 0.02 },
      { type: 'hole', dimensions: { diameter_mm: 8, depth_mm: 12 }, tolerance_mm: 0.02 },
      { type: 'slot', dimensions: { length_mm: 30, width_mm: 8, depth_mm: 8 }, tolerance_mm: 0.03 },
    ],
    material: { name: 'AISI 1045 Steel', iso_group: 'P', kc1_1: 1800, mc: 0.25, taylor_C: 250, taylor_n: 0.25, density_kg_m3: 7850, E_GPa: 205 },
    tool: bp015Tool,
    machine: { name: 'Haas VF-2', max_rpm: 8100, max_power_kW: 22.4, max_torque_Nm: 122, x_travel_mm: 762, y_travel_mm: 406, z_travel_mm: 508 },
    cut_params: { ae_mm: 8 },
    reference_answers: {
      ...bp015Ref,
      cost_per_part: 12.50,
      cycle_time_min: 4.2,
      formulas: { ...STANDARD_FORMULAS, cost: 'C_part = (machine_rate * cycle_time + tool_cost/tool_life_parts) / batch_size_factor' },
    },
  },
];
