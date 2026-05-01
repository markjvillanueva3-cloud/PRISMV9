/**
 * MachiningAcousticsEngine — First-principles audible machining noise prediction
 * and hearing protection calculation.
 *
 * Covers airborne and structure-borne sound in machining environments:
 *   1. Cutting noise prediction (Kopac empirical model, A-weighting)
 *   2. Spindle & machine background noise (Harris bearing, gear, hydraulic)
 *   3. Shop floor noise aggregation (Sabine reverberant field, distance attenuation)
 *   4. Hearing protection requirements (OSHA / NIOSH / EU 2003/10/EC)
 *   5. Noise control engineering (enclosure TL, barrier IL, absorption)
 *   6. Chatter-induced noise signature detection
 *
 * Distinct from AcousticEmissionMonitoringEngine which handles ultrasonic AE
 * signals (100 kHz–1 MHz) for tool condition monitoring. This engine operates
 * in the audible range (20 Hz–20 kHz) for occupational noise assessment.
 *
 * References:
 *   Kopac & Bahor (1999) "Noise during cutting process",
 *   Harris & Piersol (2002) "Harris' Shock and Vibration Handbook",
 *   ISO 4869 hearing protector selection,
 *   OSHA 1910.95 occupational noise exposure,
 *   NIOSH 98-126 criteria for recommended standard,
 *   ISO 4872 acoustics — measurement of airborne noise from machines,
 *   Bies & Hansen "Engineering Noise Control" (mass law, barriers)
 *
 * @version 1.0.0
 * @module MachiningAcousticsEngine
 */

// ─── AtomicValue (local pattern) ────────────────────────────────────
interface AtomicValue<T> { value: T; unit: string; formula?: string; confidence?: number; }

// ─── Self-contained PRNG (Mulberry32) ───────────────────────────────
class PRNG {
  private state: number;
  constructor(seed: number) { this.state = seed | 0; }
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  normal(mu = 0, sigma = 1): number {
    const u1 = this.next() || 1e-10;
    const u2 = this.next();
    return mu + sigma * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
}

// ─── Input / Output Interfaces ──────────────────────────────────────

/** Machining operation type. */
export type MachiningOperation = 'milling' | 'turning' | 'drilling' | 'grinding';

/** Input for cutting noise prediction. */
export interface CuttingNoiseInput {
  operation: MachiningOperation;
  material: string;
  Vc_m_min: number;
  feed_mm_rev: number;
  ap_mm: number;
  ae_mm?: number;
  tool_diameter_mm?: number;
  n_teeth?: number;
  spindle_rpm?: number;
}

/** Cutting noise prediction result. */
export interface CuttingNoiseResult {
  Lp_dB: number;
  Lp_dBA: number;
  dominant_frequency_Hz: number;
  spectrum: { frequency_Hz: number; level_dB: number }[];
  noise_sources: Record<string, number>;
}

/** Input for machine noise prediction. */
export interface MachineNoiseInput {
  spindle_rpm: number;
  spindle_bearing_bore_mm?: number;
  has_gearbox?: boolean;
  gear_quality_ISO?: number;
  hydraulic_pressure_bar?: number;
  coolant_flow_L_min?: number;
}

/** Machine noise prediction result. */
export interface MachineNoiseResult {
  total_machine_dB: number;
  total_machine_dBA: number;
  breakdown: Record<string, number>;
  dominant_source: string;
}

/** A machine source on the shop floor. */
export interface ShopFloorMachineSource {
  x_m: number;
  y_m: number;
  Lw_dB: number;
}

/** Room geometry and absorption for shop floor noise. */
export interface ShopFloorRoom {
  length_m: number;
  width_m: number;
  height_m: number;
  absorption_coeff: number;
}

/** Input for shop floor noise aggregation. */
export interface ShopFloorNoiseInput {
  machines: ShopFloorMachineSource[];
  room: ShopFloorRoom;
  grid_resolution_m?: number;
}

/** Shop floor noise result. */
export interface ShopFloorNoiseResult {
  max_dBA: number;
  avg_dBA: number;
  noise_map: { x: number; y: number; dBA: number }[];
  hotspots: { x: number; y: number; dBA: number }[];
}

/** Input for hearing protection assessment. */
export interface HearingProtectionInput {
  exposure_dBA: number;
  duration_hours: number;
  standard?: 'OSHA' | 'NIOSH' | 'EU';
}

/** Hearing protection assessment result. */
export interface HearingProtectionResult {
  twa_dBA: number;
  dose_pct: number;
  exceeds_limit: boolean;
  required_NRR: number;
  recommended_protection: string;
  max_exposure_hours_at_level: number;
  risk_category: 'safe' | 'caution' | 'danger' | 'extreme';
}

/** Input for noise control engineering. */
export interface NoiseControlInput {
  current_dBA: number;
  target_dBA: number;
  budget?: number;
  dominant_frequency_Hz?: number;
  noise_type: 'broadband' | 'tonal' | 'impulsive';
}

/** A noise control measure recommendation. */
export interface NoiseControlMeasure {
  name: string;
  reduction_dB: number;
  cost_relative: number;
  effectiveness: string;
  applicability: string;
}

/** Noise control result. */
export interface NoiseControlResult {
  measures: NoiseControlMeasure[];
  recommended_combination: string[];
  predicted_dBA_after: number;
  investment_category: string;
}

/** Input for chatter noise signature analysis. */
export interface ChatterNoiseInput {
  f_natural_Hz: number;
  vibration_amplitude_um: number;
  stable_amplitude_um: number;
  spindle_rpm: number;
  n_teeth: number;
}

/** Chatter noise analysis result. */
export interface ChatterNoiseResult {
  chatter_frequency_Hz: number;
  noise_increase_dB: number;
  detection_confidence: number;
  spectrum_signature: { freq: number; relative_level_dB: number }[];
  is_chatter: boolean;
}

// ─── Constants ──────────────────────────────────────────────────────

/** Kopac coefficients [a0, a1(Vc), a2(f), a3(ap), a4(ae)] by material. */
const KOPAC_COEFFICIENTS: Record<string, [number, number, number, number, number]> = {
  steel:     [72, 8.5, 6.0, 4.5, 3.0],
  aluminum:  [68, 9.0, 5.5, 4.0, 2.8],
  titanium:  [76, 7.5, 7.0, 5.0, 3.5],
  cast_iron: [70, 7.0, 5.0, 4.0, 2.5],
  stainless: [74, 8.0, 6.5, 4.8, 3.2],
};

/** ISO A-weighting corrections by octave band center frequency (Hz). */
const A_WEIGHTING: Record<number, number> = {
  31.5: -39.4, 63: -26.2, 125: -16.1, 250: -8.6,
  500: -3.2, 1000: 0, 2000: 1.2, 4000: 1.0,
  8000: -1.1, 16000: -6.6,
};

const OCTAVE_BANDS = [31.5, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

// ─── Engine ─────────────────────────────────────────────────────────

class MachiningAcousticsEngine {

  // ─── 1. Cutting Noise Prediction ────────────────────────────────

  /**
   * Predict sound pressure level from machining cutting parameters.
   *
   * Uses the Kopac empirical model:
   *   Lp = a₀ + a₁·log(Vc) + a₂·log(f) + a₃·log(ap) + a₄·log(ae)
   * with material-dependent coefficients. Computes frequency spectrum from
   * tooth-passing frequency, spindle rotation, and estimated structural modes.
   * A-weighting applied per IEC 61672.
   *
   * Monte Carlo uncertainty on coefficients (CV 10–15%) provides CI95.
   *
   * @param input Cutting parameters and tool/material info
   * @returns AtomicValue with CuttingNoiseResult payload
   *
   * @see Kopac & Bahor (1999) "Noise during cutting process"
   * @see IEC 61672-1 A-weighting
   */
  cuttingNoise(input: CuttingNoiseInput): AtomicValue<CuttingNoiseResult> {
    const mat = this.resolveMaterial(input.material);
    const coeffs = KOPAC_COEFFICIENTS[mat];

    const Vc = Math.max(input.Vc_m_min, 1);
    const f = Math.max(input.feed_mm_rev, 0.01);
    const ap = Math.max(input.ap_mm, 0.1);
    const ae = Math.max(input.ae_mm ?? input.ap_mm, 0.1);

    // Kopac empirical model
    const Lp_base = coeffs[0]
      + coeffs[1] * Math.log10(Vc)
      + coeffs[2] * Math.log10(f)
      + coeffs[3] * Math.log10(ap)
      + coeffs[4] * Math.log10(ae);

    // Chip breaking contribution: intermittent cuts (milling, drilling) add noise
    const chipBreakingAdd = (input.operation === 'milling' || input.operation === 'drilling')
      ? 3 + 5 * (f / 0.5)  // 3–8 dB range
      : 0;
    const Lp_dB = Math.min(Lp_base + Math.min(chipBreakingAdd, 8), 130);

    // Frequency analysis
    const diam = input.tool_diameter_mm ?? 20;
    const rpm = input.spindle_rpm ?? (Vc * 1000 / (Math.PI * diam));
    const nTeeth = input.n_teeth ?? (input.operation === 'turning' ? 1 : 4);
    const f_tooth = nTeeth * rpm / 60;  // tooth passing frequency
    const f_spindle = rpm / 60;         // spindle rotation frequency
    const f_structural = 2500;          // typical machine tool natural frequency

    // Build octave band spectrum — energy distributed with peak near dominant freq
    const dominantFreq = f_tooth > 20 ? f_tooth : f_spindle > 20 ? f_spindle : 1000;
    const spectrum: { frequency_Hz: number; level_dB: number }[] = [];
    let totalLinear = 0;
    for (const fc of OCTAVE_BANDS) {
      // Distribute energy: peak at dominant frequency band, roll off elsewhere
      const distRatio = Math.abs(Math.log2(fc / dominantFreq));
      const bandLevel = Lp_dB - 10 - 6 * distRatio;
      const clamped = Math.max(bandLevel, 20);
      spectrum.push({ frequency_Hz: fc, level_dB: clamped });
      totalLinear += Math.pow(10, clamped / 10);
    }

    // A-weighted total
    let aWeightedLinear = 0;
    for (const band of spectrum) {
      const aCorr = A_WEIGHTING[band.frequency_Hz] ?? 0;
      aWeightedLinear += Math.pow(10, (band.level_dB + aCorr) / 10);
    }
    const Lp_dBA = 10 * Math.log10(aWeightedLinear);

    // Noise source breakdown
    const noiseSources: Record<string, number> = {
      chip_formation: Lp_base - 5,
      chip_breaking: chipBreakingAdd > 0 ? Lp_base + chipBreakingAdd - 3 : 0,
      tool_workpiece_friction: Lp_base - 8,
      air_turbulence: 55 + 10 * Math.log10(rpm / 1000),
    };

    // Monte Carlo CI95
    const rng = new PRNG(42);
    const mcSamples = 500;
    const lpValues: number[] = [];
    for (let i = 0; i < mcSamples; i++) {
      const cv = (idx: number) => idx === 0 ? 0.02 : 0.12;
      const c = coeffs.map((c0, idx) => c0 * (1 + rng.normal(0, cv(idx))));
      const lp = c[0] + c[1] * Math.log10(Vc) + c[2] * Math.log10(f)
        + c[3] * Math.log10(ap) + c[4] * Math.log10(ae) + Math.min(chipBreakingAdd, 8);
      lpValues.push(lp);
    }
    lpValues.sort((a, b) => a - b);
    const ci95Low = lpValues[Math.floor(mcSamples * 0.025)];
    const ci95High = lpValues[Math.floor(mcSamples * 0.975)];
    const confidence = Math.max(0.5, 1 - (ci95High - ci95Low) / 40);

    return {
      value: {
        Lp_dB: round2(Lp_dB),
        Lp_dBA: round2(Lp_dBA),
        dominant_frequency_Hz: round2(dominantFreq),
        spectrum,
        noise_sources: Object.fromEntries(
          Object.entries(noiseSources).map(([k, v]) => [k, round2(v)])
        ),
      },
      unit: 'dB / dB(A)',
      formula: `Lp = ${coeffs[0]} + ${coeffs[1]}·log(Vc) + ${coeffs[2]}·log(f)`
        + ` + ${coeffs[3]}·log(ap) + ${coeffs[4]}·log(ae) [Kopac]`,
      confidence: round2(confidence),
    };
  }

  // ─── 2. Spindle & Machine Noise ─────────────────────────────────

  /**
   * Predict machine tool background noise from spindle, gearbox, hydraulic,
   * coolant pump, and axis drive sources.
   *
   * Bearing noise uses the simplified Harris model:
   *   Lp_bearing = 10·log10(n·d⁴·B) + C
   * Gear noise based on pitch-line velocity and ISO quality grade.
   * Sources combined via energy summation: Lp_total = 10·log10(Σ 10^(Lp_i/10)).
   *
   * @param input Machine parameters (spindle RPM, bearing bore, etc.)
   * @returns AtomicValue with MachineNoiseResult payload
   *
   * @see Harris & Piersol (2002) bearing noise model
   * @see ISO 1328 gear quality grades
   */
  machineNoise(input: MachineNoiseInput): AtomicValue<MachineNoiseResult> {
    const rpm = Math.max(input.spindle_rpm, 1);
    const boreMM = input.spindle_bearing_bore_mm ?? 70;

    // Spindle bearing noise — Harris simplified
    // Lp = 10·log10(n · d^4 · B) + C, B = bore factor ≈ 1, C = const
    const boreFactor = 1.0;
    const Lp_bearing = 10 * Math.log10(rpm * Math.pow(boreMM / 1000, 4) * boreFactor + 1e-30) + 90;

    // Gear train noise
    let Lp_gear = 0;
    if (input.has_gearbox !== false) {
      // Pitch line velocity approximation (assume gear PCD ≈ 80mm)
      const V_pitch = Math.PI * 0.08 * rpm / 60;
      const gearQuality = input.gear_quality_ISO ?? 6;
      const C_quality = (12 - gearQuality) * 2; // higher quality = lower noise
      const Ft = 500; // typical tangential force N
      Lp_gear = 20 * Math.log10(Math.max(Ft, 1)) + 20 * Math.log10(Math.max(V_pitch, 0.01)) + C_quality + 20;
    }

    // Hydraulic pump noise
    let Lp_hydraulic = 0;
    if (input.hydraulic_pressure_bar !== undefined) {
      const P = input.hydraulic_pressure_bar;
      const Q = 20; // typical flow L/min
      Lp_hydraulic = 10 * Math.log10(Math.max(P * Q, 0.01)) + 50;
    }

    // Coolant pump noise
    let Lp_coolant = 0;
    if (input.coolant_flow_L_min !== undefined && input.coolant_flow_L_min > 0) {
      Lp_coolant = 45 + 15 * Math.log10(Math.max(input.coolant_flow_L_min, 1));
    }

    // Axis drive noise (servo motor + ballscrew at rapid traverse)
    const Lp_axis = 50 + 5 * Math.log10(Math.max(rpm, 1) / 1000);

    // Energy summation
    const sources: Record<string, number> = {
      spindle_bearing: round2(Lp_bearing),
    };
    if (Lp_gear > 0) sources['gear_train'] = round2(Lp_gear);
    if (Lp_hydraulic > 0) sources['hydraulic_pump'] = round2(Lp_hydraulic);
    if (Lp_coolant > 0) sources['coolant_pump'] = round2(Lp_coolant);
    sources['axis_drive'] = round2(Lp_axis);

    const allLevels = Object.values(sources);
    const totalLinear = allLevels.reduce((s, lp) => s + Math.pow(10, lp / 10), 0);
    const total_dB = 10 * Math.log10(totalLinear);

    // Approximate A-weighting for broadband machine noise (typical -2 to -4 dB correction)
    const aCorrection = -3;
    const total_dBA = total_dB + aCorrection;

    // Dominant source
    let dominantSource = 'spindle_bearing';
    let maxLevel = -Infinity;
    for (const [src, lv] of Object.entries(sources)) {
      if (lv > maxLevel) { maxLevel = lv; dominantSource = src; }
    }

    return {
      value: {
        total_machine_dB: round2(total_dB),
        total_machine_dBA: round2(total_dBA),
        breakdown: sources,
        dominant_source: dominantSource,
      },
      unit: 'dB / dB(A)',
      formula: 'Lp_total = 10·log10(Σ 10^(Lp_i/10)) [energy summation]',
      confidence: 0.75,
    };
  }

  // ─── 3. Shop Floor Noise ────────────────────────────────────────

  /**
   * Aggregate noise from multiple machines on a shop floor with room acoustics.
   *
   * Uses distance attenuation (inverse-square law for free field) combined with
   * Sabine reverberant field contribution. Generates a noise map grid and
   * identifies hotspot locations exceeding 85 dB(A).
   *
   * Lp(r) = Lw - 10·log10(4πr²) + 10·log10(1 + 4·S/(A_room)) [near/far blend]
   * A_room = Σ αᵢ·Sᵢ (room absorption area, Sabine)
   *
   * @param input Machine positions with sound power levels, room geometry
   * @returns AtomicValue with ShopFloorNoiseResult payload
   *
   * @see ISO 4872 airborne noise measurement
   * @see Sabine reverberation / room constant
   */
  shopFloorNoise(input: ShopFloorNoiseInput): AtomicValue<ShopFloorNoiseResult> {
    const { machines, room } = input;
    const res = input.grid_resolution_m ?? 1.0;

    // Room absorption area (Sabine): A = α · S_total
    const alpha = Math.max(room.absorption_coeff, 0.01);
    const S_floor = room.length_m * room.width_m;
    const S_walls = 2 * room.height_m * (room.length_m + room.width_m);
    const S_total = 2 * S_floor + S_walls;
    const A_room = alpha * S_total;

    // Reverberant field SPL contribution from Lw: Lp_rev = Lw - 10·log10(A) + 6
    // Direct field: Lp_dir = Lw - 20·log10(r) - 11 (free field point source)

    const nx = Math.max(Math.ceil(room.length_m / res), 2);
    const ny = Math.max(Math.ceil(room.width_m / res), 2);

    const noiseMap: { x: number; y: number; dBA: number }[] = [];
    let maxDBA = -Infinity;
    let sumDBA = 0;
    let count = 0;

    for (let ix = 0; ix < nx; ix++) {
      for (let iy = 0; iy < ny; iy++) {
        const x = (ix + 0.5) * res;
        const y = (iy + 0.5) * res;

        let totalLinear = 0;
        for (const m of machines) {
          const dx = x - m.x_m;
          const dy = y - m.y_m;
          const r = Math.max(Math.sqrt(dx * dx + dy * dy), 0.5);

          // Direct field + reverberant field
          const Lp_direct = m.Lw_dB - 20 * Math.log10(r) - 11;
          const Lp_reverb = m.Lw_dB - 10 * Math.log10(A_room) + 6;
          // Combine: total = 10·log10(10^(Ld/10) + 10^(Lr/10))
          const combinedLinear = Math.pow(10, Lp_direct / 10) + Math.pow(10, Lp_reverb / 10);
          totalLinear += combinedLinear;
        }

        // Apply approximate A-weighting for broadband industrial noise
        const dBA = 10 * Math.log10(totalLinear + 1e-30) - 2;
        noiseMap.push({ x: round2(x), y: round2(y), dBA: round2(dBA) });

        if (dBA > maxDBA) maxDBA = dBA;
        sumDBA += dBA;
        count++;
      }
    }

    const avgDBA = sumDBA / Math.max(count, 1);

    // Hotspots: points above 85 dB(A)
    const hotspots = noiseMap
      .filter(p => p.dBA >= 85)
      .sort((a, b) => b.dBA - a.dBA)
      .slice(0, 20);

    return {
      value: {
        max_dBA: round2(maxDBA),
        avg_dBA: round2(avgDBA),
        noise_map: noiseMap,
        hotspots,
      },
      unit: 'dB(A)',
      formula: 'Lp = Lw - 20·log10(r) - 11 + reverberant [Sabine room]',
      confidence: 0.70,
    };
  }

  // ─── 4. Hearing Protection Requirement ──────────────────────────

  /**
   * Determine hearing protection requirements per OSHA, NIOSH, or EU standards.
   *
   * Calculates Time-Weighted Average (TWA), noise dose percentage,
   * required Noise Reduction Rating (NRR), and recommends protection type.
   *
   * OSHA PEL: 90 dB(A) TWA 8-hr, 5 dB exchange rate.
   * NIOSH REL: 85 dB(A) TWA 8-hr, 3 dB exchange rate.
   * EU 2003/10/EC: lower action 80, upper action 85, limit 87 dB(A).
   *
   * NRR derating (OSHA): effective_dBA = workplace_dBA - (NRR - 7) / 2
   *
   * @param input Exposure level in dB(A), duration, and regulatory standard
   * @returns AtomicValue with HearingProtectionResult payload
   *
   * @see OSHA 1910.95 occupational noise exposure
   * @see NIOSH 98-126 criteria for recommended standard
   * @see ISO 4869 hearing protector selection
   */
  hearingProtection(input: HearingProtectionInput): AtomicValue<HearingProtectionResult> {
    const standard = input.standard ?? 'OSHA';
    const Lp = input.exposure_dBA;
    const hours = input.duration_hours;

    let pel: number;      // permissible exposure limit dB(A)
    let exchangeRate: number;
    let criterion_hours: number;

    switch (standard) {
      case 'NIOSH':
        pel = 85;
        exchangeRate = 3;
        criterion_hours = 8;
        break;
      case 'EU':
        pel = 87; // limit value
        exchangeRate = 3;
        criterion_hours = 8;
        break;
      default: // OSHA
        pel = 90;
        exchangeRate = 5;
        criterion_hours = 8;
        break;
    }

    // Allowed time at this level
    // T = criterion_hours / 2^((Lp - pel) / exchangeRate)
    const T_allowed = criterion_hours / Math.pow(2, (Lp - pel) / exchangeRate);

    // Dose = (C / T) * 100 where C = actual hours, T = allowed hours
    const dose_pct = (hours / T_allowed) * 100;

    // TWA for OSHA: TWA = 16.61·log10(D/100) + 90
    // For NIOSH: TWA = 10·log10(D/100) + 85 (using 3 dB exchange)
    let twa_dBA: number;
    if (standard === 'OSHA') {
      twa_dBA = dose_pct > 0 ? 16.61 * Math.log10(dose_pct / 100) + 90 : 0;
    } else {
      twa_dBA = dose_pct > 0 ? 10 * Math.log10(dose_pct / 100) + pel : 0;
    }

    const exceeds = dose_pct > 100;

    // Required NRR to bring effective level to target
    const targetDBA = standard === 'EU' ? 80 : (standard === 'NIOSH' ? 85 : 90);
    const gap = Lp - targetDBA;
    // OSHA derating: effective = Lp - (NRR-7)/2, so NRR = 2·gap + 7
    const required_NRR = gap > 0 ? Math.ceil(2 * gap + 7) : 0;

    // Recommend protection type
    let recommended: string;
    if (required_NRR <= 0) {
      recommended = 'None required';
    } else if (required_NRR <= 20) {
      recommended = 'Foam earplugs (NRR 22-33)';
    } else if (required_NRR <= 28) {
      recommended = 'Over-ear earmuffs (NRR 25-31)';
    } else if (required_NRR <= 36) {
      recommended = 'Dual protection: earplugs + earmuffs (NRR 33-36)';
    } else {
      recommended = 'Dual protection + administrative controls (reduce exposure time)';
    }

    // Risk category
    let risk: 'safe' | 'caution' | 'danger' | 'extreme';
    if (twa_dBA < 80) risk = 'safe';
    else if (twa_dBA < 85) risk = 'caution';
    else if (twa_dBA < 100) risk = 'danger';
    else risk = 'extreme';

    return {
      value: {
        twa_dBA: round2(twa_dBA),
        dose_pct: round2(dose_pct),
        exceeds_limit: exceeds,
        required_NRR,
        recommended_protection: recommended,
        max_exposure_hours_at_level: round2(T_allowed),
        risk_category: risk,
      },
      unit: 'dB(A) / %',
      formula: standard === 'OSHA'
        ? 'TWA = 16.61·log10(D/100) + 90 [OSHA 5 dB exchange]'
        : `TWA = 10·log10(D/100) + ${pel} [${standard} 3 dB exchange]`,
      confidence: 0.90,
    };
  }

  // ─── 5. Noise Control Engineering ───────────────────────────────

  /**
   * Recommend noise reduction measures and predict post-treatment sound level.
   *
   * Evaluates source control (tooling, speed), path control (enclosure with mass-law
   * transmission loss, barriers with Fresnel number), and receiver control (absorption
   * panels). Ranks by cost-effectiveness and returns a recommended combination.
   *
   * TL (mass law) = 20·log10(f·m) - 47 dB, m = surface density kg/m².
   * Barrier IL = 10·log10(3 + 20·N), N = Fresnel number = 2·δ/λ.
   *
   * @param input Current/target dB(A), dominant frequency, noise type
   * @returns AtomicValue with NoiseControlResult payload
   *
   * @see Bies & Hansen "Engineering Noise Control" Ch. 8
   * @see ISO 11546 enclosure insertion loss
   */
  noiseControl(input: NoiseControlInput): AtomicValue<NoiseControlResult> {
    const gap = input.current_dBA - input.target_dBA;
    const freq = input.dominant_frequency_Hz ?? 1000;

    const measures: NoiseControlMeasure[] = [];

    // Source control — sharper tools
    measures.push({
      name: 'Sharper cutting tools (reduce chip deformation noise)',
      reduction_dB: 3,
      cost_relative: 1,
      effectiveness: 'Moderate — addresses root cause at chip formation',
      applicability: 'All machining operations',
    });

    // Source control — lower speed
    measures.push({
      name: 'Reduce cutting speed by 50%',
      reduction_dB: 6,
      cost_relative: 0.5,
      effectiveness: 'High — 6 dB per speed halving',
      applicability: 'When cycle time increase is acceptable',
    });

    // Source control — damped toolholder
    measures.push({
      name: 'Vibration-damped toolholder',
      reduction_dB: 5,
      cost_relative: 3,
      effectiveness: 'Good for long-overhang and chatter-prone setups',
      applicability: 'Boring, deep pocketing, slender tools',
    });

    // Path control — enclosure
    // TL = 20·log10(f·m) - 47, assume m = 10 kg/m² (2mm steel)
    const m_surface = 10;
    const TL = 20 * Math.log10(freq * m_surface) - 47;
    const alpha_inside = 0.5; // absorptive lining
    const IL_enclosure = Math.max(TL - 10 * Math.log10(1 / alpha_inside), 5);
    measures.push({
      name: `Acoustic enclosure (2mm steel + absorptive lining, TL=${round2(TL)} dB)`,
      reduction_dB: round2(Math.min(IL_enclosure, 35)),
      cost_relative: 8,
      effectiveness: `High — mass law TL = ${round2(TL)} dB at ${freq} Hz`,
      applicability: 'Stationary machines with operator access via openings',
    });

    // Path control — barrier
    // IL = 10·log10(3 + 20·N), N = 2·δ/λ, assume δ = 0.3 m path difference
    const lambda = 343 / freq;
    const delta = 0.3;
    const N_fresnel = 2 * delta / lambda;
    const IL_barrier = 10 * Math.log10(3 + 20 * N_fresnel);
    measures.push({
      name: `Noise barrier (IL=${round2(IL_barrier)} dB, Fresnel N=${round2(N_fresnel)})`,
      reduction_dB: round2(Math.min(IL_barrier, 20)),
      cost_relative: 4,
      effectiveness: `Moderate — depends on barrier height and frequency`,
      applicability: 'Between source and operator, line-of-sight blocked',
    });

    // Absorption panels
    measures.push({
      name: 'Absorptive wall/ceiling panels (α ≈ 0.8)',
      reduction_dB: round2(Math.min(3 + 3 * Math.log10(freq / 250), 8)),
      cost_relative: 3,
      effectiveness: 'Reduces reverberant field by 3–8 dB',
      applicability: 'Hard-walled shops with high reverberation',
    });

    // Active noise control
    if (input.noise_type === 'tonal' && freq < 500) {
      measures.push({
        name: 'Active noise control (ANC)',
        reduction_dB: 15,
        cost_relative: 10,
        effectiveness: 'Very high for low-frequency tonal sources',
        applicability: 'Tonal sources below 500 Hz; requires microphone array',
      });
    }

    // Sort by cost-effectiveness (dB per cost unit)
    measures.sort((a, b) => (b.reduction_dB / b.cost_relative) - (a.reduction_dB / a.cost_relative));

    // Greedy combination to meet target
    let remaining = gap;
    const recommended: string[] = [];
    let totalCost = 0;
    for (const m of measures) {
      if (remaining <= 0) break;
      recommended.push(m.name.split('(')[0].trim());
      // Successive measures have diminishing returns (not fully additive)
      remaining -= m.reduction_dB * 0.8;
      totalCost += m.cost_relative;
    }

    const predicted_after = input.current_dBA - (gap - remaining);

    let investmentCategory: string;
    if (totalCost <= 3) investmentCategory = 'Low (< $5k typical)';
    else if (totalCost <= 10) investmentCategory = 'Medium ($5k–$25k typical)';
    else if (totalCost <= 20) investmentCategory = 'High ($25k–$75k typical)';
    else investmentCategory = 'Very high (> $75k typical)';

    return {
      value: {
        measures,
        recommended_combination: recommended,
        predicted_dBA_after: round2(Math.max(predicted_after, input.target_dBA - 5)),
        investment_category: investmentCategory,
      },
      unit: 'dB reduction',
      formula: 'TL = 20·log10(f·m) - 47 [mass law]; IL = 10·log10(3+20N) [barrier]',
      confidence: 0.70,
    };
  }

  // ─── 6. Chatter-Induced Noise Signature ─────────────────────────

  /**
   * Predict noise increase from regenerative chatter vibration.
   *
   * Chatter produces a narrowband acoustic peak at the workpiece/tool natural
   * frequency with sidebands at f_chatter ± f_tooth. Noise increase is
   * proportional to vibration amplitude ratio: ΔLp = 20·log10(x_chatter / x_stable).
   * Detection threshold at ΔLp > 6 dB indicates likely chatter onset.
   *
   * @param input Natural frequency, vibration amplitudes, spindle/tooth info
   * @returns AtomicValue with ChatterNoiseResult payload
   *
   * @see Altintas "Manufacturing Automation" Ch. 4 chatter stability
   * @see Quintana & Ciurana (2011) "Chatter in machining processes"
   */
  chatterNoise(input: ChatterNoiseInput): AtomicValue<ChatterNoiseResult> {
    const { f_natural_Hz, vibration_amplitude_um, stable_amplitude_um, spindle_rpm, n_teeth } = input;

    const ampRatio = Math.max(vibration_amplitude_um, 0.01) / Math.max(stable_amplitude_um, 0.01);
    const noise_increase_dB = 20 * Math.log10(ampRatio);

    const f_chatter = f_natural_Hz;
    const f_tooth = n_teeth * spindle_rpm / 60;

    // Spectrum signature: main peak + harmonics + sidebands
    const signature: { freq: number; relative_level_dB: number }[] = [];

    // Fundamental chatter frequency
    signature.push({ freq: round2(f_chatter), relative_level_dB: 0 });
    // 2nd harmonic
    signature.push({ freq: round2(2 * f_chatter), relative_level_dB: -12 });
    // 3rd harmonic
    signature.push({ freq: round2(3 * f_chatter), relative_level_dB: -20 });
    // Sideband: f_chatter + f_tooth
    if (f_tooth > 0) {
      signature.push({ freq: round2(f_chatter + f_tooth), relative_level_dB: -6 });
      signature.push({ freq: round2(f_chatter - f_tooth), relative_level_dB: -6 });
      // Tooth passing
      signature.push({ freq: round2(f_tooth), relative_level_dB: -15 });
    }

    // Detection: chatter onset when ΔLp > 6 dB
    const is_chatter = noise_increase_dB > 6;

    // Confidence based on amplitude ratio clarity
    let detection_confidence: number;
    if (noise_increase_dB > 12) detection_confidence = 0.95;
    else if (noise_increase_dB > 6) detection_confidence = 0.80;
    else if (noise_increase_dB > 3) detection_confidence = 0.50;
    else detection_confidence = 0.20;

    return {
      value: {
        chatter_frequency_Hz: round2(f_chatter),
        noise_increase_dB: round2(noise_increase_dB),
        detection_confidence: round2(detection_confidence),
        spectrum_signature: signature,
        is_chatter,
      },
      unit: 'Hz / dB',
      formula: 'ΔLp = 20·log10(x_chatter/x_stable); chatter onset when ΔLp > 6 dB',
      confidence: round2(detection_confidence),
    };
  }

  // ─── Private Helpers ────────────────────────────────────────────

  /** Resolve user material string to known coefficient key. */
  private resolveMaterial(mat: string): string {
    const m = mat.toLowerCase().replace(/[\s_-]+/g, '_');
    const has = (...keys: string[]) => keys.some(k => m.includes(k));
    if (has('alum', '6061', '7075', '2024')) return 'aluminum';
    if (has('titan', 'ti6al', 'ti_6')) return 'titanium';
    if (has('cast', 'iron', 'ductile', 'gray')) return 'cast_iron';
    if (has('stainless', '304', '316', '17_4')) return 'stainless';
    // Ni-superalloys have similar acoustic behavior to titanium
    if (has('inconel', 'hastelloy', 'waspaloy')) return 'titanium';
    return 'steel';
  }
}

// ─── Utility ──────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ─── Exports ──────────────────────────────────────────────────────

export const machiningAcousticsEngine = new MachiningAcousticsEngine();
export { MachiningAcousticsEngine };
