/**
 * PRISM Manufacturing Intelligence — Cutting Simulation Engine
 * R16-MS1: Time-Domain Cutting Simulation
 *
 * Provides time-domain simulation of the cutting process, computing
 * force, thermal, and vibration profiles as the tool advances through
 * the workpiece. Combines Kienzle force model, Loewen-Shaw thermal
 * partition, and damped harmonic vibration into a unified time-stepping
 * simulation.
 *
 * MCP actions:
 *   sim_cutting         — Full time-domain simulation (force + thermal + vibration)
 *   sim_force_profile   — Force-only time profile (tangential, radial, axial)
 *   sim_thermal_profile — Tool-tip and workpiece temperature profile
 *   sim_vibration       — Forced vibration response with chatter detection
 *
 * @version 1.0.0  R16-MS1
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export interface CuttingSimInput {
  // Workpiece
  material: string;
  hardness_hrc?: number;
  // Tool
  tool_diameter_mm: number;
  number_of_flutes: number;
  rake_angle_deg?: number;
  helix_angle_deg?: number;
  // Cutting parameters
  spindle_rpm: number;
  feed_per_tooth_mm: number;
  axial_depth_mm: number;
  radial_depth_mm: number;
  // Simulation control
  duration_revolutions?: number;  // How many revolutions to simulate (default: 10)
  time_steps_per_rev?: number;    // Resolution (default: 360)
  // Machine dynamics (optional, for vibration)
  natural_frequency_hz?: number;
  stiffness_n_per_m?: number;
  damping_ratio?: number;
}

export interface ForceProfile {
  time_ms: number[];
  Ft_N: number[];        // Tangential
  Fr_N: number[];        // Radial
  Fa_N: number[];        // Axial
  Fres_N: number[];      // Resultant
  torque_Nm: number[];
  power_kW: number[];
}

export interface ThermalProfile {
  time_ms: number[];
  tool_temp_C: number[];
  chip_temp_C: number[];
  workpiece_temp_C: number[];
  heat_partition_ratio: number;
}

export interface VibrationProfile {
  time_ms: number[];
  displacement_um: number[];
  velocity_mm_s: number[];
  is_chatter: boolean;
  chatter_frequency_hz?: number;
  max_displacement_um: number;
  rms_displacement_um: number;
}

export interface CuttingSimResult {
  material: string;
  duration_ms: number;
  revolutions: number;
  time_step_ms: number;
  forces: {
    peak_Ft_N: number;
    peak_Fr_N: number;
    peak_Fa_N: number;
    avg_Ft_N: number;
    avg_Fr_N: number;
    avg_Fa_N: number;
    peak_torque_Nm: number;
    avg_power_kW: number;
    profile: ForceProfile;
  };
  thermal: {
    peak_tool_temp_C: number;
    steady_state_tool_temp_C: number;
    peak_chip_temp_C: number;
    heat_partition: number;
    profile: ThermalProfile;
  };
  vibration: {
    is_chatter: boolean;
    max_displacement_um: number;
    chatter_frequency_hz?: number;
    profile: VibrationProfile;
  };
  safety: { score: number; flags: string[] };
}

// ============================================================================
// MATERIAL DATABASE (Kienzle coefficients + thermal properties)
// ============================================================================

interface MaterialProps {
  kc1_1: number;    // Kienzle specific cutting force at h=1mm, b=1mm [N/mm²]
  mc: number;       // Kienzle exponent
  k_thermal: number; // Thermal conductivity [W/m·K]
  rho: number;      // Density [kg/m³]
  cp: number;       // Specific heat [J/kg·K]
  melting_C: number; // Melting point [°C]
}

const MATERIAL_DB: Record<string, MaterialProps> = {
  steel:       { kc1_1: 1780, mc: 0.26, k_thermal: 50,  rho: 7850, cp: 486, melting_C: 1500 },
  stainless:   { kc1_1: 2150, mc: 0.22, k_thermal: 15,  rho: 8000, cp: 500, melting_C: 1400 },
  aluminum:    { kc1_1:  750, mc: 0.23, k_thermal: 237, rho: 2700, cp: 897, melting_C: 660 },
  titanium:    { kc1_1: 1450, mc: 0.23, k_thermal: 6.7, rho: 4430, cp: 523, melting_C: 1668 },
  cast_iron:   { kc1_1: 1200, mc: 0.28, k_thermal: 52,  rho: 7200, cp: 460, melting_C: 1200 },
  inconel:     { kc1_1: 2800, mc: 0.25, k_thermal: 11,  rho: 8440, cp: 435, melting_C: 1350 },
  copper:      { kc1_1:  580, mc: 0.18, k_thermal: 401, rho: 8960, cp: 385, melting_C: 1085 },
  brass:       { kc1_1:  620, mc: 0.18, k_thermal: 120, rho: 8500, cp: 380, melting_C: 930 },
  tool_steel:  { kc1_1: 2200, mc: 0.25, k_thermal: 25,  rho: 7800, cp: 460, melting_C: 1400 },
};

function getMaterial(name: string): MaterialProps {
  const key = name.toLowerCase().replace(/[\s-_]+/g, '_');
  for (const [k, v] of Object.entries(MATERIAL_DB)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return MATERIAL_DB.steel; // Default
}

// ============================================================================
// KIENZLE FORCE MODEL (time-resolved)
// ============================================================================

/**
 * Compute instantaneous cutting force at a given engagement angle.
 * Uses Kienzle model: Fc = kc1_1 * h^(1-mc) * b
 * where h = fz * sin(phi), b = ap / cos(helix)
 */
function instantaneousForce(
  phi: number,              // Current angular position [rad]
  engageStart: number,      // Start of engagement arc [rad]
  engageEnd: number,        // End of engagement arc [rad]
  fz: number,               // Feed per tooth [mm]
  ap: number,               // Axial depth [mm]
  mat: MaterialProps,
  helixAngle: number,       // Helix angle [rad]
  rakeAngle: number,        // Rake angle [rad]
): { Ft: number; Fr: number; Fa: number } {
  // Check if flute is engaged
  if (phi < engageStart || phi > engageEnd) {
    return { Ft: 0, Fr: 0, Fa: 0 };
  }

  // Uncut chip thickness (Martellotti model)
  const h = Math.abs(fz * Math.sin(phi));
  if (h < 0.001) return { Ft: 0, Fr: 0, Fa: 0 };

  // Chip width
  const b = ap / Math.cos(helixAngle);

  // Kienzle specific cutting force
  const kc = mat.kc1_1 * Math.pow(h, -mat.mc);

  // Force components
  const Ft = kc * h * b;                             // Tangential
  const Fr = Ft * (0.3 + 0.2 * Math.abs(rakeAngle)); // Radial (empirical ratio)
  const Fa = Ft * 0.25 * Math.tan(helixAngle);       // Axial (helix driven)

  return { Ft, Fr, Fa };
}

// ============================================================================
// THERMAL MODEL (Loewen-Shaw + transient)
// ============================================================================

function thermalStep(
  Ft: number,
  vc: number,              // Cutting speed [m/min]
  mat: MaterialProps,
  dt: number,              // Time step [s]
  prevToolTemp: number,
  prevChipTemp: number,
  prevWpTemp: number,
): { toolTemp: number; chipTemp: number; wpTemp: number; partition: number } {
  // Power dissipated
  const power_W = Ft * vc / 60; // vc in m/min → N·m/s = W

  // Heat partition (Loewen-Shaw simplified)
  const R = 0.754 * Math.sqrt(mat.k_thermal * mat.rho * mat.cp);
  const chipPartition = 0.5 + 0.3 * Math.exp(-R / 1e5); // 50-80% to chip
  const toolPartition = 1 - chipPartition - 0.1;          // ~10% to workpiece

  // Temperature rise (lumped parameter, first-order)
  const chipHeatCapacity = 0.002; // Effective thermal mass [J/K] for thin chip
  const toolHeatCapacity = 0.05;  // Effective thermal mass of tool tip
  const wpHeatCapacity = 0.5;     // Workpiece local thermal mass

  const toolTemp = prevToolTemp + (power_W * toolPartition * dt) / toolHeatCapacity
    - (prevToolTemp - 20) * 0.001 * dt; // Convective cooling
  const chipTemp = prevChipTemp + (power_W * chipPartition * dt) / chipHeatCapacity
    - (prevChipTemp - 20) * 0.01 * dt;
  const wpTemp = prevWpTemp + (power_W * 0.1 * dt) / wpHeatCapacity
    - (prevWpTemp - 20) * 0.0005 * dt;

  // Clamp to melting point
  const clampedChip = Math.min(chipTemp, mat.melting_C * 0.95);
  const clampedTool = Math.min(toolTemp, 1200); // Carbide softening ~1200°C

  return {
    toolTemp: clampedTool,
    chipTemp: clampedChip,
    wpTemp: Math.min(wpTemp, mat.melting_C * 0.5),
    partition: chipPartition,
  };
}

// ============================================================================
// VIBRATION MODEL (forced damped SDOF)
// ============================================================================

function vibrationStep(
  force: number,           // Instantaneous force [N]
  dt: number,              // Time step [s]
  wn: number,              // Natural frequency [rad/s]
  zeta: number,            // Damping ratio
  k: number,               // Stiffness [N/m]
  prevX: number,           // Previous displacement [m]
  prevV: number,           // Previous velocity [m/s]
): { x: number; v: number } {
  // Newmark-beta integration (average acceleration)
  const a = (force / (k > 0 ? k : 1e6) * wn * wn) - 2 * zeta * wn * prevV - wn * wn * prevX;
  const v = prevV + a * dt;
  const x = prevX + prevV * dt + 0.5 * a * dt * dt;
  return { x, v };
}

// ============================================================================
// MAIN SIMULATION: sim_cutting
// ============================================================================

export function simulateCutting(input: CuttingSimInput): CuttingSimResult {
  const mat = getMaterial(input.material);
  const D = input.tool_diameter_mm;
  const z = input.number_of_flutes;
  const fz = input.feed_per_tooth_mm;
  const ap = input.axial_depth_mm;
  const ae = input.radial_depth_mm;
  const rpm = input.spindle_rpm;
  const helix = (input.helix_angle_deg ?? 30) * Math.PI / 180;
  const rake = (input.rake_angle_deg ?? 6) * Math.PI / 180;

  const revs = input.duration_revolutions ?? 10;
  const stepsPerRev = input.time_steps_per_rev ?? 360;
  const totalSteps = revs * stepsPerRev;

  // Derived
  const revTime = 60 / rpm;                     // Time per revolution [s]
  const dt = revTime / stepsPerRev;              // Time step [s]
  const vc = Math.PI * D * rpm / 1000;           // Cutting speed [m/min]
  const flutePitch = 2 * Math.PI / z;            // Angular pitch between flutes

  // Engagement angle (up milling)
  const engageEnd = Math.acos(1 - 2 * ae / D);
  const engageStart = 0;

  // Machine dynamics
  const fn = input.natural_frequency_hz ?? 500;
  const wn = 2 * Math.PI * fn;
  const zeta = input.damping_ratio ?? 0.03;
  const k = input.stiffness_n_per_m ?? 5e7;

  // Output arrays
  const time_ms: number[] = [];
  const Ft_arr: number[] = [];
  const Fr_arr: number[] = [];
  const Fa_arr: number[] = [];
  const Fres_arr: number[] = [];
  const torque_arr: number[] = [];
  const power_arr: number[] = [];
  const toolTemp_arr: number[] = [];
  const chipTemp_arr: number[] = [];
  const wpTemp_arr: number[] = [];
  const disp_arr: number[] = [];
  const vel_arr: number[] = [];

  // State
  let toolTemp = 20, chipTemp = 20, wpTemp = 20;
  let vibX = 0, vibV = 0;
  let partition = 0.7;

  // Downsample for output (max 500 points)
  const outputEvery = Math.max(1, Math.floor(totalSteps / 500));

  for (let step = 0; step < totalSteps; step++) {
    const t = step * dt;
    const baseAngle = (step / stepsPerRev) * 2 * Math.PI;

    // Sum forces from all flutes
    let totalFt = 0, totalFr = 0, totalFa = 0;
    for (let f = 0; f < z; f++) {
      const phi = (baseAngle + f * flutePitch) % (2 * Math.PI);
      const forces = instantaneousForce(phi, engageStart, engageEnd, fz, ap, mat, helix, rake);
      totalFt += forces.Ft;
      totalFr += forces.Fr;
      totalFa += forces.Fa;
    }

    // Thermal step
    const th = thermalStep(totalFt, vc, mat, dt, toolTemp, chipTemp, wpTemp);
    toolTemp = th.toolTemp;
    chipTemp = th.chipTemp;
    wpTemp = th.wpTemp;
    partition = th.partition;

    // Vibration step
    const vib = vibrationStep(totalFt, dt, wn, zeta, k, vibX, vibV);
    vibX = vib.x;
    vibV = vib.v;

    // Record output (downsampled)
    if (step % outputEvery === 0) {
      const Fres = Math.sqrt(totalFt * totalFt + totalFr * totalFr + totalFa * totalFa);
      const torque = totalFt * D / 2000; // N·mm → N·m
      const pwr = totalFt * vc / 60000;  // W → kW

      time_ms.push(+(t * 1000).toFixed(3));
      Ft_arr.push(+totalFt.toFixed(1));
      Fr_arr.push(+totalFr.toFixed(1));
      Fa_arr.push(+totalFa.toFixed(1));
      Fres_arr.push(+Fres.toFixed(1));
      torque_arr.push(+torque.toFixed(3));
      power_arr.push(+pwr.toFixed(3));
      toolTemp_arr.push(+toolTemp.toFixed(1));
      chipTemp_arr.push(+chipTemp.toFixed(1));
      wpTemp_arr.push(+wpTemp.toFixed(1));
      disp_arr.push(+(vibX * 1e6).toFixed(2)); // m → μm
      vel_arr.push(+(vibV * 1000).toFixed(2));  // m/s → mm/s
    }
  }

  // Statistics
  const peakFt = Math.max(...Ft_arr);
  const peakFr = Math.max(...Fr_arr);
  const peakFa = Math.max(...Fa_arr);
  const avgFt = Ft_arr.reduce((a, b) => a + b, 0) / Ft_arr.length;
  const avgFr = Fr_arr.reduce((a, b) => a + b, 0) / Fr_arr.length;
  const avgFa = Fa_arr.reduce((a, b) => a + b, 0) / Fa_arr.length;
  const peakTorque = Math.max(...torque_arr);
  const avgPower = power_arr.reduce((a, b) => a + b, 0) / power_arr.length;
  const peakToolTemp = Math.max(...toolTemp_arr);
  const peakChipTemp = Math.max(...chipTemp_arr);
  const maxDisp = Math.max(...disp_arr.map(Math.abs));

  // RMS displacement
  const rmsDisp = Math.sqrt(disp_arr.reduce((a, d) => a + d * d, 0) / disp_arr.length);

  // Chatter detection (if displacement exceeds 10x static deflection or grows)
  const staticDeflection = (avgFt / (k || 1)) * 1e6; // μm
  const isChatter = maxDisp > Math.max(staticDeflection * 10, 5);

  // Chatter frequency estimation via zero-crossing
  let chatterFreq: number | undefined;
  if (isChatter) {
    let crossings = 0;
    for (let i = 1; i < disp_arr.length; i++) {
      if (disp_arr[i - 1] * disp_arr[i] < 0) crossings++;
    }
    const totalTime = time_ms[time_ms.length - 1]! / 1000;
    chatterFreq = +(crossings / (2 * totalTime)).toFixed(1);
  }

  // Safety score
  const flags: string[] = [];
  let safety = 1.0;
  if (isChatter) { flags.push("CHATTER_DETECTED"); safety -= 0.3; }
  if (peakToolTemp > 800) { flags.push("HIGH_TOOL_TEMPERATURE"); safety -= 0.2; }
  if (peakToolTemp > 1000) { flags.push("CRITICAL_TOOL_TEMPERATURE"); safety -= 0.2; }
  if (peakFt > 5000) { flags.push("HIGH_CUTTING_FORCE"); safety -= 0.1; }

  return {
    material: input.material,
    duration_ms: +(revs * revTime * 1000).toFixed(1),
    revolutions: revs,
    time_step_ms: +(dt * 1000).toFixed(4),
    forces: {
      peak_Ft_N: +peakFt.toFixed(1),
      peak_Fr_N: +peakFr.toFixed(1),
      peak_Fa_N: +peakFa.toFixed(1),
      avg_Ft_N: +avgFt.toFixed(1),
      avg_Fr_N: +avgFr.toFixed(1),
      avg_Fa_N: +avgFa.toFixed(1),
      peak_torque_Nm: +peakTorque.toFixed(3),
      avg_power_kW: +avgPower.toFixed(3),
      profile: { time_ms, Ft_N: Ft_arr, Fr_N: Fr_arr, Fa_N: Fa_arr, Fres_N: Fres_arr, torque_Nm: torque_arr, power_kW: power_arr },
    },
    thermal: {
      peak_tool_temp_C: +peakToolTemp.toFixed(1),
      steady_state_tool_temp_C: +toolTemp.toFixed(1),
      peak_chip_temp_C: +peakChipTemp.toFixed(1),
      heat_partition: +partition.toFixed(3),
      profile: { time_ms, tool_temp_C: toolTemp_arr, chip_temp_C: chipTemp_arr, workpiece_temp_C: wpTemp_arr, heat_partition_ratio: partition },
    },
    vibration: {
      is_chatter: isChatter,
      max_displacement_um: +maxDisp.toFixed(2),
      chatter_frequency_hz: chatterFreq,
      profile: { time_ms, displacement_um: disp_arr, velocity_mm_s: vel_arr, is_chatter: isChatter, chatter_frequency_hz: chatterFreq, max_displacement_um: +maxDisp.toFixed(2), rms_displacement_um: +rmsDisp.toFixed(2) },
    },
    safety: { score: +Math.max(0, safety).toFixed(2), flags },
  };
}

// ============================================================================
// FORCE-ONLY PROFILE: sim_force_profile
// ============================================================================

export function simulateForceProfile(input: CuttingSimInput): ForceProfile {
  const result = simulateCutting(input);
  return result.forces.profile;
}

// ============================================================================
// THERMAL-ONLY PROFILE: sim_thermal_profile
// ============================================================================

export function simulateThermalProfile(input: CuttingSimInput): ThermalProfile {
  const result = simulateCutting(input);
  return result.thermal.profile;
}

// ============================================================================
// VIBRATION-ONLY PROFILE: sim_vibration
// ============================================================================

export function simulateVibration(input: CuttingSimInput): VibrationProfile {
  const result = simulateCutting(input);
  return result.vibration.profile;
}

// ============================================================================
// DISPATCHER
// ============================================================================

export function executeCuttingSimAction(action: string, params: Record<string, unknown>): unknown {
  log.info(`[CuttingSim] action=${action}`);

  switch (action) {
    case 'sim_cutting':
      return simulateCutting(params as unknown as CuttingSimInput);
    case 'sim_force_profile':
      return simulateForceProfile(params as unknown as CuttingSimInput);
    case 'sim_thermal_profile':
      return simulateThermalProfile(params as unknown as CuttingSimInput);
    case 'sim_vibration':
      return simulateVibration(params as unknown as CuttingSimInput);
    default:
      throw new Error(`Unknown CuttingSim action: ${action}`);
  }
}
