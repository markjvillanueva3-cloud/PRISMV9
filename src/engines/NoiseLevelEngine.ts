/**
 * NoiseLevelEngine — Industrial Noise Assessment Calculator
 *
 * Models: Sound pressure level, exposure, and barrier design.
 * - SPL addition of multiple sources
 * - Distance attenuation (inverse square law)
 * - OSHA TWA noise dose calculation
 * - Barrier insertion loss (Maekawa)
 * - A-weighting correction
 * - Hearing protection NRR derating
 *
 * Key physics: L_total = 10×log10(Σ10^(Li/10)).
 * Distance: L2 = L1 - 20×log10(r2/r1). Barrier: IL = 10×log10(3+20N).
 * Fresnel number N = 2δ/λ.
 *
 * Reference: OSHA 29 CFR 1910.95,
 *            NIOSH Noise Criteria,
 *            ISO 9613 — Outdoor Sound Propagation
 *
 * Actions: noise_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface NoiseLevelInput {
  source_levels_dba?: number[];
  source_distance_m?: number;
  receiver_distance_m?: number;
  exposure_hours?: number;
  barrier_height_m?: number;
  source_height_m?: number;
  receiver_height_m?: number;
  barrier_distance_m?: number;
  hearing_protection_nrr?: number;
  machine_type?: "lathe" | "mill" | "grinder" | "press" | "saw" | "compressor";
}

export interface NoiseLevelResult {
  combined_level: AtomicValue;
  level_at_receiver: AtomicValue;
  osha_twa: AtomicValue;
  noise_dose_pct: AtomicValue;
  barrier_insertion_loss: AtomicValue;
  protected_level: AtomicValue;
  max_exposure_hours: AtomicValue;
  distance_for_85dba: AtomicValue;
  hearing_protection_needed: AtomicValue;
  action_level_exceeded: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Typical noise levels by machine type (dBA at 1m) */
const MACHINE_NOISE: Record<string, number> = {
  lathe: 82, mill: 85, grinder: 92, press: 95, saw: 98, compressor: 90,
};

// ── Engine ─────────────────────────────────────────────────────────

export class NoiseLevelEngine {
  calculate(input: NoiseLevelInput): NoiseLevelResult {
    const warnings: string[] = [];
    const machType = input.machine_type ?? "mill";
    const srcLevels = input.source_levels_dba ??
      [MACHINE_NOISE[machType] ?? 85];
    const srcDist = input.source_distance_m ?? 1;
    const rcvDist = input.receiver_distance_m ?? 3;
    const expHours = input.exposure_hours ?? 8;
    const barrierH = input.barrier_height_m ?? 0;
    const srcH = input.source_height_m ?? 1;
    const rcvH = input.receiver_height_m ?? 1.5;
    const barrierDist = input.barrier_distance_m ?? 2;
    const nrr = input.hearing_protection_nrr ?? 0;

    // Combined level from multiple sources
    let sumPower = 0;
    for (const L of srcLevels) {
      sumPower += Math.pow(10, L / 10);
    }
    const combinedLevel = 10 * Math.log10(sumPower);

    // Distance attenuation (point source, free field)
    const distAtten = 20 * Math.log10(rcvDist / Math.max(srcDist, 0.1));
    const levelAtReceiver = combinedLevel - distAtten;

    // Barrier insertion loss (Maekawa formula)
    let barrierIL = 0;
    if (barrierH > 0) {
      // Path difference δ
      const d1 = Math.sqrt(barrierDist * barrierDist +
        (barrierH - srcH) * (barrierH - srcH));
      const d2 = Math.sqrt((rcvDist - barrierDist) * (rcvDist - barrierDist) +
        (barrierH - rcvH) * (barrierH - rcvH));
      const dDirect = Math.sqrt(rcvDist * rcvDist +
        (rcvH - srcH) * (rcvH - srcH));
      const delta = d1 + d2 - dDirect;
      // Fresnel number at 1kHz (λ ≈ 0.343m)
      const N = 2 * delta / 0.343;
      barrierIL = N > 0 ? 10 * Math.log10(3 + 20 * N) : 0;
    }

    const effectiveLevel = levelAtReceiver - barrierIL;

    // Hearing protection derating (OSHA: (NRR-7)/2)
    const protectedLevel = nrr > 0 ?
      effectiveLevel - (nrr - 7) / 2 : effectiveLevel;

    // OSHA TWA calculation
    // TWA = 16.61 × log10(D/100) + 90
    // Dose at given level: D = 100 × (hours / T_allowed)
    // T_allowed = 8 / 2^((L-90)/5)
    const tAllowed = Math.pow(2, (90 - effectiveLevel) / 5) * 8;
    const dosePct = tAllowed > 0 ? (expHours / tAllowed) * 100 : 999;
    const twa = dosePct > 0 ?
      16.61 * Math.log10(dosePct / 100) + 90 : effectiveLevel;

    // Max exposure at this level
    const maxExp = tAllowed;

    // Distance for 85 dBA
    const dist85 = srcDist * Math.pow(10, (combinedLevel - 85) / 20);

    // Hearing protection needed?
    const hpNeeded = effectiveLevel > 85;

    // Action level exceeded (OSHA: 85 dBA TWA)
    const actionExceeded = twa >= 85;

    // Warnings
    if (effectiveLevel > 115) {
      warnings.push(`Level ${r0(effectiveLevel)}dBA exceeds 115dBA — maximum impulse limit`);
    }
    if (twa > 90) {
      warnings.push(`TWA ${r1(twa)}dBA exceeds OSHA PEL 90dBA — engineering controls required`);
    }
    if (twa > 85) {
      warnings.push(`TWA ${r1(twa)}dBA exceeds action level 85dBA — hearing conservation program required`);
    }
    if (dosePct > 100) {
      warnings.push(`Noise dose ${r0(dosePct)}% exceeds 100% — reduce exposure time or level`);
    }
    if (nrr > 0 && protectedLevel > 85) {
      warnings.push("Hearing protection insufficient — upgrade NRR or add engineering controls");
    }

    const src = "NoiseLevelEngine (OSHA/ISO 9613)";

    return {
      combined_level: mkAv(r1(combinedLevel), "dBA", 1, `${srcLevels.length} sources`),
      level_at_receiver: mkAv(r1(effectiveLevel), "dBA", 1.5,
        `${r1(combinedLevel)} - ${r1(distAtten)} - ${r1(barrierIL)}`),
      osha_twa: mkAv(r1(twa), "dBA", 1, `${expHours}h exposure`),
      noise_dose_pct: mkAv(r0(dosePct), "%", dosePct * 0.1, "OSHA dose calc"),
      barrier_insertion_loss: mkAv(r1(barrierIL), "dB", barrierIL * 0.15,
        "Maekawa formula"),
      protected_level: mkAv(r1(protectedLevel), "dBA", 2,
        nrr > 0 ? `NRR ${nrr} derated` : "No protection"),
      max_exposure_hours: mkAv(r2(maxExp), "hours", maxExp * 0.1,
        `At ${r1(effectiveLevel)}dBA`),
      distance_for_85dba: mkAv(r1(dist85), "m", dist85 * 0.1,
        "Inverse square law"),
      hearing_protection_needed: mkAv(hpNeeded ? 1 : 0,
        hpNeeded ? "REQUIRED" : "NOT_REQUIRED", 0, src),
      action_level_exceeded: mkAv(actionExceeded ? 1 : 0,
        actionExceeded ? "YES" : "NO", 0, src),
      warnings,
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function mkAv(value: number, unit: string, uncertainty: number, source: string): AtomicValue {
  return { value, unit, uncertainty, source };
}
function r0(n: number): number { return Math.round(n); }
function r1(n: number): number { return Math.round(n * 10) / 10; }
function r2(n: number): number { return Math.round(n * 100) / 100; }

export const noiseLevelEngine = new NoiseLevelEngine();
