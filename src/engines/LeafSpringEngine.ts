/**
 * LeafSpringEngine — Leaf Spring Design Calculator
 *
 * Models: Multi-leaf and mono-leaf spring analysis.
 * - Deflection δ = FL³/(3nEbt³) for cantilever
 * - Stress σ = 6FL/(nbt²)
 * - Spring rate k = F/δ
 * - Nip (initial curvature gap) for graduated leaves
 * - Fatigue life from stress range
 * - U-bolt clamping and effective length
 *
 * Key physics: Multi-leaf equivalent beam theory.
 * σ = 6FL/(nbt²). δ = 6FL³/(nEbt³).
 * With graduated leaves: neff = (3nf + 2ng)/(3(nf + ng)).
 *
 * Reference: SAE Spring Design Manual,
 *            IS 1135 — Leaf Springs,
 *            Wahl — Mechanical Springs
 *
 * Actions: leaf_spring_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface LeafSpringInput {
  num_full_leaves?: number;
  num_graduated_leaves?: number;
  leaf_width_mm?: number;
  leaf_thickness_mm?: number;
  span_mm?: number;
  applied_load_n?: number;
  material_tensile_mpa?: number;
  youngs_modulus_gpa?: number;
  u_bolt_dist_mm?: number;
  camber_mm?: number;
}

export interface LeafSpringResult {
  bending_stress: AtomicValue;
  deflection: AtomicValue;
  spring_rate: AtomicValue;
  effective_leaves: AtomicValue;
  nip_load: AtomicValue;
  full_leaf_stress: AtomicValue;
  graduated_leaf_stress: AtomicValue;
  fatigue_safety: AtomicValue;
  energy_stored: AtomicValue;
  free_camber: AtomicValue;
  warnings: string[];
}

// ── Engine ─────────────────────────────────────────────────────────

export class LeafSpringEngine {
  calculate(input: LeafSpringInput): LeafSpringResult {
    const warnings: string[] = [];
    const nf = input.num_full_leaves ?? 2;
    const ng = input.num_graduated_leaves ?? 6;
    const b = input.leaf_width_mm ?? 60;
    const t = input.leaf_thickness_mm ?? 8;
    const span = input.span_mm ?? 1200;
    const F = input.applied_load_n ?? 20000;
    const sigUlt = input.material_tensile_mpa ?? 1200;
    const E = (input.youngs_modulus_gpa ?? 200) * 1000; // MPa
    const uBolt = input.u_bolt_dist_mm ?? 80;
    const camber = input.camber_mm ?? 80;

    const n = nf + ng; // total leaves

    // Effective length (half-span minus u-bolt clamp)
    const L = (span - uBolt) / 2; // mm

    // Effective number of leaves (accounting for graduated)
    const nEff = (3 * nf + 2 * ng) / (3 * (nf + ng)) * n;

    // Bending stress
    // σ = 6FL / (nEff × b × t²) — for semi-elliptic
    const sigma = 6 * (F / 2) * L / (nEff * b * t * t);

    // Deflection
    // δ = 6FL³ / (nEff × E × b × t³)
    const delta = 6 * (F / 2) * L * L * L
      / (nEff * E * b * t * t * t);

    // Spring rate
    const k = F / Math.max(delta, 0.01); // N/mm

    // Stress in full-length leaves (higher due to nip)
    const sigFull = sigma * n / (3 * nf + 2 * ng) * 3;

    // Stress in graduated leaves
    const sigGrad = sigma * n / (3 * nf + 2 * ng) * 2;

    // Nip load (initial gap load for equalizing stress)
    const Fnip = 2 * nf * ng * b * t * t * sigma
      / (6 * L * n * (nf + ng));

    // Fatigue safety factor (Goodman, Se ≈ 0.4 × Sut for springs)
    const Se = sigUlt * 0.4;
    const sigMean = sigma * 0.5;
    const sigAlt = sigma * 0.5;
    const fatigueN = 1 / (sigMean / sigUlt + sigAlt / Se);

    // Energy stored
    const U = 0.5 * F * delta / 1000; // Joules

    // Free camber (unloaded shape)
    const freeCamber = camber + delta;

    // Warnings
    if (sigma > sigUlt * 0.5) {
      warnings.push(
        `Stress ${r0(sigma)} MPa > 50% Sut — fatigue risk`
      );
    }
    if (fatigueN < 1.5) {
      warnings.push(
        `Fatigue SF ${r1(fatigueN)} < 1.5 — reduce load or add leaves`
      );
    }
    if (t > b / 4) {
      warnings.push(
        `Thickness ${t}mm > b/4 — non-standard aspect ratio`
      );
    }
    if (L / t > 100) {
      warnings.push(
        `L/t ratio ${r0(L / t)} > 100 — excessive flexibility`
      );
    }
    if (delta > span * 0.1) {
      warnings.push(
        `Deflection ${r1(delta)}mm > 10% span — may bottom out`
      );
    }
    if (n > 12) {
      warnings.push(`${n} leaves — consider parabolic spring`);
    }

    const src = "LeafSpringEngine (SAE/IS 1135)";

    return {
      bending_stress: mkAv(r0(sigma), "MPa", sigma * 0.05,
        `6FL/(nEff×b×t²)`),
      deflection: mkAv(r1(delta), "mm", delta * 0.1,
        `6FL³/(nEff×E×b×t³)`),
      spring_rate: mkAv(r0(k), "N/mm", k * 0.05,
        `F/δ`),
      effective_leaves: mkAv(r2(nEff), "leaves", 0,
        `(3nf+2ng)/3(nf+ng)×n`),
      nip_load: mkAv(r0(Fnip), "N", Fnip * 0.1,
        "stress equalization"),
      full_leaf_stress: mkAv(r0(sigFull), "MPa",
        sigFull * 0.05, "full leaves"),
      graduated_leaf_stress: mkAv(r0(sigGrad), "MPa",
        sigGrad * 0.05, "graduated leaves"),
      fatigue_safety: mkAv(r1(fatigueN), "×",
        fatigueN * 0.1, "Goodman"),
      energy_stored: mkAv(r1(U), "J", U * 0.1,
        `½Fδ`),
      free_camber: mkAv(r0(freeCamber), "mm",
        freeCamber * 0.05, src),
      warnings,
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function mkAv(
  value: number, unit: string,
  uncertainty: number, source: string
): AtomicValue {
  return { value, unit, uncertainty, source };
}
function r0(n: number): number { return Math.round(n); }
function r1(n: number): number { return Math.round(n * 10) / 10; }
function r2(n: number): number { return Math.round(n * 100) / 100; }

export const leafSpringEngine = new LeafSpringEngine();
