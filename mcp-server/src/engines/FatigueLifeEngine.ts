/**
 * FatigueLifeEngine — S-N Fatigue Life Estimator
 *
 * Models: Stress-life (S-N) approach for metallic components.
 * - Modified Goodman, Gerber, Soderberg criteria
 * - Endurance limit with Marin factors (surface, size, reliability, temp)
 * - Stress concentration with notch sensitivity
 * - Cumulative damage (Miner's rule) for variable amplitude
 * - Cycles to failure from S-N curve
 *
 * Key physics: Se = ka×kb×kc×kd×ke × Se'. Modified Goodman:
 * σa/Se + σm/Sut = 1/n. Miner: Σ(ni/Ni) = 1.
 *
 * Reference: Shigley Ch.6 (Fatigue Failure),
 *            FKM Guideline (analytical strength assessment),
 *            ASTM E739 (statistical analysis of S-N data)
 *
 * Actions: fatigue_life_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface FatigueLifeInput {
  ultimate_strength_mpa?: number;
  yield_strength_mpa?: number;
  stress_amplitude_mpa?: number;
  mean_stress_mpa?: number;
  stress_ratio_r?: number;
  surface_finish?: "mirror" | "ground" | "machined" | "hot_rolled" | "forged" | "as_cast";
  part_diameter_mm?: number;
  reliability_pct?: number;
  operating_temp_c?: number;
  kt_geometric?: number;
  notch_radius_mm?: number;
  criterion?: "goodman" | "gerber" | "soderberg";
  load_blocks?: { stress_amplitude: number; cycles: number }[];
}

export interface FatigueLifeResult {
  endurance_limit: AtomicValue;
  ka_surface: AtomicValue;
  kb_size: AtomicValue;
  kc_reliability: AtomicValue;
  kd_temperature: AtomicValue;
  kf_fatigue_conc: AtomicValue;
  safety_factor: AtomicValue;
  cycles_to_failure: AtomicValue;
  miner_damage: AtomicValue;
  infinite_life: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Surface finish factor coefficients: ka = a × Sut^b */
const SURFACE_COEFF: Record<string, [number, number]> = {
  mirror: [1.58, -0.085],
  ground: [1.58, -0.085],
  machined: [4.51, -0.265],
  hot_rolled: [57.7, -0.718],
  forged: [272, -0.995],
  as_cast: [272, -0.995],
};

/** Reliability factor */
const RELIABILITY: Record<number, number> = {
  50: 1.000, 90: 0.897, 95: 0.868, 99: 0.814,
  99.9: 0.753, 99.99: 0.702,
};

// ── Engine ─────────────────────────────────────────────────────────

export class FatigueLifeEngine {
  calculate(input: FatigueLifeInput): FatigueLifeResult {
    const warnings: string[] = [];
    const Sut = input.ultimate_strength_mpa ?? 600;
    const Sy = input.yield_strength_mpa ?? Sut * 0.85;
    const criterion = input.criterion ?? "goodman";

    // Endurance limit prime (Se')
    let Se_prime: number;
    if (Sut <= 1400) {
      Se_prime = 0.5 * Sut; // steel, Sut ≤ 1400 MPa
    } else {
      Se_prime = 700; // cap at 700 MPa
    }

    // Marin factors
    // ka — surface
    const surfKey = input.surface_finish ?? "machined";
    const [a, b] = SURFACE_COEFF[surfKey] ?? SURFACE_COEFF.machined;
    const ka = a * Math.pow(Sut, b);

    // kb — size (rotating round)
    const dia = input.part_diameter_mm ?? 25;
    let kb: number;
    if (dia <= 8) kb = 1.0;
    else if (dia <= 51) kb = 1.24 * Math.pow(dia, -0.107);
    else if (dia <= 254) kb = 1.51 * Math.pow(dia, -0.157);
    else kb = 0.6;

    // kc — reliability
    const relPct = input.reliability_pct ?? 99;
    const kc = closestReliability(relPct);

    // kd — temperature
    const temp = input.operating_temp_c ?? 20;
    let kd: number;
    if (temp <= 50) kd = 1.0;
    else if (temp <= 450) kd = 1.0 - 0.0005 * (temp - 50);
    else kd = 0.8;

    // ke — miscellaneous = 1.0 (default)

    // Kf — fatigue stress concentration
    const Kt = input.kt_geometric ?? 1.0;
    const r = input.notch_radius_mm ?? 2;
    // Neuber notch sensitivity: q = 1/(1 + a/r), a = (300/Sut)^1.8 for steel
    const neuberA = Math.pow(300 / Sut, 1.8);
    const q = 1 / (1 + neuberA / Math.max(r, 0.1));
    const Kf = 1 + q * (Kt - 1);

    // Modified endurance limit
    const Se = ka * kb * kc * kd * Se_prime / Kf;

    // Stress state
    let sigA: number; // alternating
    let sigM: number; // mean
    if (input.stress_amplitude_mpa !== undefined) {
      sigA = input.stress_amplitude_mpa;
      sigM = input.mean_stress_mpa ?? 0;
    } else if (input.stress_ratio_r !== undefined) {
      // R = σmin/σmax, default with max = Sy/2
      const R = input.stress_ratio_r;
      const sigMax = Sy / 2;
      const sigMin = R * sigMax;
      sigA = (sigMax - sigMin) / 2;
      sigM = (sigMax + sigMin) / 2;
    } else {
      sigA = Se * 0.8; // default to 80% of endurance for a demo
      sigM = 0;
    }

    // Safety factor by criterion
    let nf: number;
    if (criterion === "goodman") {
      nf = 1 / (sigA / Se + sigM / Sut);
    } else if (criterion === "gerber") {
      nf = sigA > 0 ? (1 / (sigA / Se)) *
        (1 - (sigM / Sut) ** 2) : 99;
    } else {
      // Soderberg
      nf = 1 / (sigA / Se + sigM / Sy);
    }
    nf = Math.min(nf, 99);

    // Cycles to failure (S-N curve: log-log, S = a × N^b)
    // At 1e3 cycles: S = 0.9 × Sut. At 1e6: S = Se
    // log(0.9Sut) = log(a) + 3×b, log(Se) = log(a) + 6×b
    const f09Sut = 0.9 * Sut;
    const bSN = Math.log10(f09Sut / Se) / 3; // slope per decade
    const aSN = f09Sut / Math.pow(1e3, bSN);
    let Nf: number;
    if (sigA <= Se) {
      Nf = Infinity; // infinite life
    } else if (sigA >= f09Sut) {
      Nf = 1; // immediate failure
    } else {
      Nf = Math.pow(sigA / aSN, 1 / bSN);
    }

    // Miner's damage
    let minerDamage = 0;
    if (input.load_blocks && input.load_blocks.length > 0) {
      for (const block of input.load_blocks) {
        const Si = block.stress_amplitude;
        let Ni: number;
        if (Si <= Se) {
          Ni = Infinity;
        } else {
          Ni = Math.pow(Si / aSN, 1 / bSN);
        }
        minerDamage += block.cycles / Ni;
      }
    }

    const infiniteLife = sigA <= Se && (sigM === 0 || nf >= 1.0);

    // Warnings
    if (nf < 1.0) {
      warnings.push("CRITICAL: Safety factor < 1.0 — fatigue failure expected");
    }
    if (nf >= 1.0 && nf < 1.5) {
      warnings.push(`Low fatigue SF=${r2(nf)} — consider redesign for margin`);
    }
    if (Kt > 1.0 && !input.notch_radius_mm) {
      warnings.push("Stress concentration present — verify notch radius for Kf accuracy");
    }
    if (temp > 400) {
      warnings.push(`${temp}°C — creep-fatigue interaction may dominate; S-N approach limited`);
    }
    if (minerDamage > 0.8) {
      warnings.push(`Miner damage sum ${r2(minerDamage)} approaching 1.0 — near end of life`);
    }
    if (surfKey === "as_cast" || surfKey === "forged") {
      warnings.push(`${surfKey} surface — significant ka derating, consider machining critical areas`);
    }

    const src = "FatigueLifeEngine (Shigley/FKM)";

    return {
      endurance_limit: mkAv(r0(Se), "MPa", Se * 0.1, `Se'=${r0(Se_prime)} × Marin factors`),
      ka_surface: mkAv(r3(Math.min(ka, 1)), "factor", 0.02, `${surfKey}, Sut=${Sut}`),
      kb_size: mkAv(r3(kb), "factor", 0.01, `d=${dia}mm`),
      kc_reliability: mkAv(r3(kc), "factor", 0, `${relPct}%`),
      kd_temperature: mkAv(r3(kd), "factor", 0.01, `${temp}°C`),
      kf_fatigue_conc: mkAv(r2(Kf), "Kf", 0.1, `Kt=${Kt}, q=${r2(q)}`),
      safety_factor: mkAv(r2(nf), "×", 0.1,
        `${criterion}: σa=${r0(sigA)}, σm=${r0(sigM)}`),
      cycles_to_failure: mkAv(
        isFinite(Nf) ? r0(Nf) : 1e9, isFinite(Nf) ? "cycles" : "∞",
        isFinite(Nf) ? Nf * 0.3 : 0, src),
      miner_damage: mkAv(r3(minerDamage), "D", minerDamage * 0.2,
        input.load_blocks ? `${input.load_blocks.length} blocks` : "No blocks"),
      infinite_life: mkAv(infiniteLife ? 1 : 0,
        infiniteLife ? "YES" : "NO", 0, src),
      warnings,
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function closestReliability(pct: number): number {
  const keys = [50, 90, 95, 99, 99.9, 99.99];
  let best = 50;
  for (const k of keys) {
    if (Math.abs(k - pct) < Math.abs(best - pct)) best = k;
  }
  return RELIABILITY[best] ?? 1.0;
}

function mkAv(value: number, unit: string, uncertainty: number, source: string): AtomicValue {
  return { value, unit, uncertainty, source };
}
function r0(n: number): number { return Math.round(n); }
function r2(n: number): number { return Math.round(n * 100) / 100; }
function r3(n: number): number { return Math.round(n * 1000) / 1000; }

export const fatigueLifeEngine = new FatigueLifeEngine();
