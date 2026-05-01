/**
 * HoningProcessEngine — Bore honing process design, stone selection, plateau honing
 *
 * Models: Preston's equation for MRR, crosshatch angle from speed ratio,
 *         Rk/Rpk/Rvk plateau honing parameter model, stone selection logic
 * References: Klocke (2009), SME Honing Handbook, ISO 13565-2 (Rk parameters)
 * Safety: Expansion pressure limits, bore diameter tolerance monitoring
 */

// ─── Types ─────────────────────────────────────────────────────────

export type StoneType = 'vitrified' | 'resinoid' | 'diamond' | 'CBN' | 'silicon_carbide';

export interface HoningDesignInput {
  bore_diameter_mm: number;
  bore_length_mm: number;
  material: string;
  initial_Ra_um: number;
  target_Ra_um: number;
  crosshatch_angle_deg?: number;
}

export interface HoningDesignResult {
  stone_spec: string;
  expansion_pressure_bar: number;
  rotation_rpm: number;
  reciprocation_rate_spm: number;
  stroke_length_mm: number;
  overrun_mm: number;
  expected_cycle_time_sec: number;
  expected_Ra: number;
  crosshatch_angle: number;
}

export interface StoneSelectionInput {
  bore_material: string;
  stock_removal_mm: number;
  finish_required_Ra: number;
}

export interface StoneSelectionResult {
  stone_type: StoneType;
  grit_size: number;
  concentration?: number;
  reasoning: string;
}

export interface PlateauHoningInput {
  bore_diameter_mm: number;
  material: string;
  Rk_target_um: number;
  Rpk_target_um: number;
  Rvk_target_um: number;
}

export interface PlateauHoningStageParams {
  rotation_rpm: number;
  reciprocation_spm: number;
  pressure_bar: number;
  time_sec: number;
}

export interface PlateauHoningResult {
  stage_1: { stone: string; params: PlateauHoningStageParams; time: number };
  stage_2: { stone: string; params: PlateauHoningStageParams; time: number };
  expected_profile: { Rk: number; Rpk: number; Rvk: number; Mr1: number; Mr2: number };
}

// ─── Constants ─────────────────────────────────────────────────────

/** Material machinability factor for honing (1.0 = carbon steel baseline) */
const HONING_MACHINABILITY: Record<string, number> = {
  'aluminum': 2.0,
  'brass': 1.8,
  'cast_iron': 1.5,
  'carbon_steel': 1.0,
  'alloy_steel': 0.8,
  'stainless_steel': 0.6,
  'tool_steel': 0.5,
  'titanium': 0.4,
  'inconel': 0.3,
  'hardened_steel': 0.35,
  'chromium': 0.4,
  'nikasil': 0.6,
};

/** Grit size to achievable Ra mapping (µm) */
const GRIT_TO_RA: Record<number, number> = {
  80: 3.2, 120: 1.6, 180: 0.8, 280: 0.4, 400: 0.2,
  600: 0.1, 800: 0.05, 1000: 0.025, 1500: 0.012,
};

/** Stone type properties */
const STONE_PROPERTIES: Record<StoneType, { max_grit: number; cost_factor: number; life_factor: number }> = {
  silicon_carbide: { max_grit: 600, cost_factor: 0.5, life_factor: 0.6 },
  vitrified: { max_grit: 800, cost_factor: 1.0, life_factor: 1.0 },
  resinoid: { max_grit: 1000, cost_factor: 0.8, life_factor: 0.7 },
  CBN: { max_grit: 1500, cost_factor: 5.0, life_factor: 8.0 },
  diamond: { max_grit: 1500, cost_factor: 8.0, life_factor: 10.0 },
};

function getMaterialKey(material: string): string {
  const m = material.toLowerCase().replace(/[\s-]+/g, '_');
  for (const key of Object.keys(HONING_MACHINABILITY)) {
    if (m.includes(key)) return key;
  }
  return 'carbon_steel';
}

function selectGritForRa(targetRa: number): number {
  const grits = Object.entries(GRIT_TO_RA).sort((a, b) => Number(b[0]) - Number(a[0]));
  for (const [grit, ra] of grits) {
    if (ra <= targetRa) return Number(grit);
  }
  return 1500; // finest available
}

// ─── Engine ────────────────────────────────────────────────────────

export class HoningProcessEngine {
  /**
   * Design a complete honing process for a bore.
   * Calculates stone spec, speeds, pressures, and cycle time.
   */
  designHoningProcess(input: HoningDesignInput): HoningDesignResult {
    const matKey = getMaterialKey(input.material);
    const machinability = HONING_MACHINABILITY[matKey] ?? 1.0;

    // Select grit based on target Ra
    const grit = selectGritForRa(input.target_Ra_um);
    const achievableRa = GRIT_TO_RA[grit] ?? input.target_Ra_um;

    // Stone spec generation: e.g. "CBN-B181-C100" or "SiC-C280"
    const stoneResult = this.selectStone({
      bore_material: input.material,
      stock_removal_mm: (input.initial_Ra_um - input.target_Ra_um) * 0.01, // rough estimate
      finish_required_Ra: input.target_Ra_um,
    });
    const stone_spec = `${stoneResult.stone_type.toUpperCase()}-${grit}`;

    // Rotation speed: Vc = π * D * N / 1000; target Vc = 40-80 m/min for steel
    const targetVc = 60 * machinability; // m/min
    const rotation_rpm = Math.round((targetVc * 1000) / (Math.PI * input.bore_diameter_mm));

    // Reciprocation rate: determines crosshatch angle
    // tan(α/2) = Vc_reciprocation / Vc_rotation
    const targetAngle = input.crosshatch_angle_deg ?? 45; // default 45° for general purpose
    // Unit: π·D[mm]·N[rpm] = mm/min (do NOT divide by 1000 — stroke_length is also in mm)
    const Vc_rotation = Math.PI * input.bore_diameter_mm * rotation_rpm; // mm/min
    const Vc_reciprocation = Vc_rotation * Math.tan((targetAngle / 2) * Math.PI / 180);
    // Convert reciprocation velocity to strokes per minute
    const stroke_length = input.bore_length_mm + 2 * (input.bore_length_mm * 0.15); // with overrun
    const overrun = Math.round(input.bore_length_mm * 0.15);
    const reciprocation_rate = Math.round(Vc_reciprocation / (2 * stroke_length));
    const actual_reciprocation = Math.max(20, Math.min(200, reciprocation_rate));

    // Recalculate actual crosshatch angle from achieved speeds
    const actual_Vc_recip = actual_reciprocation * 2 * stroke_length;
    const crosshatch_angle = Math.round(2 * Math.atan(actual_Vc_recip / Vc_rotation) * 180 / Math.PI);

    // Expansion pressure: 5-20 bar depending on material hardness
    const expansion_pressure = Math.round(Math.max(5, Math.min(20, 10 / machinability)));

    // Cycle time estimate based on Preston's equation: MRR = k_Preston · P · V
    // k_Preston ≈ 1e-4 mm/(bar·(m/min)) empirical for conventional honing stones
    // Ref: Preston (1927); Klocke "Manufacturing Processes 2" (2009) Ch. 9
    const stockToRemove = Math.max(0.005, (input.initial_Ra_um - input.target_Ra_um) * 0.005); // mm
    const k_preston = 1e-4; // mm/(bar·(m/min)) — empirical honing Preston coefficient
    const mrrFactor = expansion_pressure * targetVc * machinability * k_preston; // mm/min
    const cycle_time_sec = Math.max(5, (stockToRemove / Math.max(mrrFactor, 0.001)) * 60);

    return {
      stone_spec,
      expansion_pressure_bar: expansion_pressure,
      rotation_rpm: Math.max(50, rotation_rpm),
      reciprocation_rate_spm: actual_reciprocation,
      stroke_length_mm: Math.round(stroke_length * 10) / 10,
      overrun_mm: overrun,
      expected_cycle_time_sec: Math.round(cycle_time_sec * 10) / 10,
      expected_Ra: achievableRa,
      crosshatch_angle: Math.max(15, Math.min(150, crosshatch_angle)),
    };
  }

  /**
   * Select honing stone material and grit based on bore material and requirements.
   */
  selectStone(input: StoneSelectionInput): StoneSelectionResult {
    const matKey = getMaterialKey(input.bore_material);
    const machinability = HONING_MACHINABILITY[matKey] ?? 1.0;
    const grit = selectGritForRa(input.finish_required_Ra);

    // Decision logic for stone type
    let stoneType: StoneType;
    let reasoning: string;
    let concentration: number | undefined;

    if (matKey === 'hardened_steel' || matKey === 'tool_steel' || machinability <= 0.4) {
      // Hard materials: CBN for steel, diamond for non-ferrous hard
      if (matKey === 'titanium' || matKey === 'inconel') {
        stoneType = 'diamond';
        concentration = 100;
        reasoning = 'Diamond stones recommended for titanium/nickel alloys — superior hardness and chemical inertness prevent stone loading.';
      } else {
        stoneType = 'CBN';
        concentration = 100;
        reasoning = 'CBN stones recommended for hardened ferrous materials (>50 HRC) — high thermal conductivity prevents workpiece damage.';
      }
    } else if (input.stock_removal_mm > 0.1) {
      // Heavy stock removal: silicon carbide or vitrified
      if (matKey === 'cast_iron' || matKey === 'aluminum') {
        stoneType = 'silicon_carbide';
        reasoning = 'Silicon carbide stones for cast iron/aluminum — self-sharpening action, economical for heavy stock removal.';
      } else {
        stoneType = 'vitrified';
        reasoning = 'Vitrified bond for moderate-hard materials with heavy stock removal — good self-dressing and consistent cut rate.';
      }
    } else if (input.finish_required_Ra <= 0.1) {
      // Superfinishing: CBN or diamond
      stoneType = machinability > 1.0 ? 'diamond' : 'CBN';
      concentration = 75;
      reasoning = `${stoneType.toUpperCase()} stones for superfinishing (Ra < 0.1 µm) — consistent grit exposure maintains finish quality.`;
    } else {
      // General purpose
      stoneType = 'vitrified';
      reasoning = 'Vitrified bond is versatile for general honing — good balance of cut rate, finish, and cost.';
    }

    // Verify grit is within stone capability
    const props = STONE_PROPERTIES[stoneType];
    const actualGrit = Math.min(grit, props.max_grit);

    return {
      stone_type: stoneType,
      grit_size: actualGrit,
      concentration,
      reasoning,
    };
  }

  /**
   * Two-stage plateau honing for cylinder liners/bores.
   * Stage 1: Coarse — creates deep valleys (Rvk).
   * Stage 2: Fine — removes peaks, creates plateau (low Rpk, controlled Rk).
   * ISO 13565-2 Rk parameter family.
   */
  plateauHoning(input: PlateauHoningInput): PlateauHoningResult {
    const matKey = getMaterialKey(input.material);
    const machinability = HONING_MACHINABILITY[matKey] ?? 1.0;

    // Stage 1: Create valley structure (coarse stones)
    // Target: establish Rvk valleys for oil retention
    const stage1Grit = input.Rvk_target_um > 2 ? 120 : input.Rvk_target_um > 1 ? 180 : 280;
    const stage1Stone = `SiC-${stage1Grit}`;

    // Stage 1 parameters
    const baseRpm = Math.round((50 * 1000) / (Math.PI * input.bore_diameter_mm)); // ~50 m/min
    const stage1Pressure = Math.round(Math.max(8, Math.min(18, 12 / machinability)));
    const stage1Time = Math.round(Math.max(10, 30 / machinability));

    // Stage 2: Plateau creation (fine stones)
    // Target: flatten peaks (low Rpk), establish Rk core roughness
    const stage2Grit = input.Rpk_target_um < 0.3 ? 600 : input.Rpk_target_um < 0.5 ? 400 : 280;
    const stage2Stone = input.Rpk_target_um < 0.3 ? `CBN-${stage2Grit}` : `Vitrified-${stage2Grit}`;

    const stage2Rpm = Math.round(baseRpm * 1.2); // slightly faster for finishing
    const stage2Pressure = Math.round(Math.max(4, stage1Pressure * 0.6));
    // Stage 2 shorter: just removing peaks
    const stage2Time = Math.round(Math.max(5, stage1Time * 0.5));

    // Expected profile calculation
    // Mr1 (upper material ratio): typically 5-15% for plateau honing
    const Mr1 = Math.round(Math.max(5, Math.min(15, 10 * (input.Rpk_target_um / 0.5))));
    // Mr2 (lower material ratio): typically 80-95%
    const Mr2 = Math.round(Math.max(80, Math.min(95, 90 - (input.Rvk_target_um / 2) * 5)));

    return {
      stage_1: {
        stone: stage1Stone,
        params: {
          rotation_rpm: baseRpm,
          reciprocation_spm: Math.round(baseRpm * 0.4),
          pressure_bar: stage1Pressure,
          time_sec: stage1Time,
        },
        time: stage1Time,
      },
      stage_2: {
        stone: stage2Stone,
        params: {
          rotation_rpm: stage2Rpm,
          reciprocation_spm: Math.round(stage2Rpm * 0.3),
          pressure_bar: stage2Pressure,
          time_sec: stage2Time,
        },
        time: stage2Time,
      },
      expected_profile: {
        Rk: Math.round(input.Rk_target_um * 100) / 100,
        Rpk: Math.round(input.Rpk_target_um * 100) / 100,
        Rvk: Math.round(input.Rvk_target_um * 100) / 100,
        Mr1,
        Mr2,
      },
    };
  }
}

export const honingProcessEngine = new HoningProcessEngine();
