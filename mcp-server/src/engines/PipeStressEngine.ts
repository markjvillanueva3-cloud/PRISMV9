/**
 * PipeStressEngine — Piping Stress Analysis Calculator
 *
 * Models: Pressure piping per ASME B31.3 / B31.1.
 * - Hoop stress from internal pressure
 * - Longitudinal stress (pressure + weight + thermal)
 * - Wall thickness from pressure (Barlow)
 * - Thermal expansion force and stress
 * - Sustained and expansion stress ratios
 * - Code compliance check
 *
 * Key physics: σ_h = PD/(2t). t_min = PD/(2SE + 2yP).
 * σ_L = PD/(4t) + SIF×M/Z. σ_E = SIF×M_range/Z.
 *
 * Reference: ASME B31.3 — Process Piping,
 *            ASME B31.1 — Power Piping,
 *            ASME B36.10 — Welded/Seamless Pipe
 *
 * Actions: pipe_stress_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface PipeStressInput {
  nominal_size_inch?: number;
  schedule?: "5" | "10" | "40" | "80" | "160" | "XXS";
  pipe_od_mm?: number;
  wall_thickness_mm?: number;
  internal_pressure_mpa?: number;
  temperature_c?: number;
  material?: "A106B" | "A312_304" | "A335_P11" | "A312_316";
  span_m?: number;
  contents_density_kg_m3?: number;
  insulation_thickness_mm?: number;
  thermal_delta_c?: number;
}

export interface PipeStressResult {
  hoop_stress: AtomicValue;
  longitudinal_stress: AtomicValue;
  min_wall_thickness: AtomicValue;
  wall_margin: AtomicValue;
  thermal_expansion_stress: AtomicValue;
  sustained_ratio: AtomicValue;
  expansion_ratio: AtomicValue;
  pipe_weight: AtomicValue;
  max_span: AtomicValue;
  code_compliance: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** [allowable_stress_MPa, E_GPa, alpha_um_m_C, density_kg_m3] */
const PIPE_MAT: Record<string, [number, number, number, number]> = {
  A106B:    [138, 200, 11.7, 7850],
  A312_304: [115, 193, 17.3, 8000],
  A335_P11: [118, 200, 12.4, 7750],
  A312_316: [115, 193, 16.0, 8000],
};

/** Schedule → approximate wall thickness ratio (t/OD) */
const SCH_RATIO: Record<string, number> = {
  "5": 0.025, "10": 0.035, "40": 0.065,
  "80": 0.095, "160": 0.14, "XXS": 0.18,
};

// ── Engine ─────────────────────────────────────────────────────────

export class PipeStressEngine {
  calculate(input: PipeStressInput): PipeStressResult {
    const warnings: string[] = [];
    const P = input.internal_pressure_mpa ?? 2;
    const temp = input.temperature_c ?? 200;
    const mat = input.material ?? "A106B";
    const span = input.span_m ?? 6;
    const rhoContents = input.contents_density_kg_m3 ?? 1000;
    const tIns = input.insulation_thickness_mm ?? 50;
    const deltaT = input.thermal_delta_c ?? (temp - 25);

    const [Sallow, Egpa, alpha, rhoPipe] =
      PIPE_MAT[mat] ?? PIPE_MAT.A106B;
    const Empa = Egpa * 1000;

    // Pipe geometry
    const sch = input.schedule ?? "40";
    const schRatio = SCH_RATIO[sch] ?? 0.065;
    const OD = input.pipe_od_mm ?? 168.3; // 6" nominal
    const t = input.wall_thickness_mm ?? OD * schRatio;
    const ID = OD - 2 * t;

    // Hoop stress (Barlow)
    const sigHoop = P * OD / (2 * t);

    // Min wall thickness (ASME B31.3)
    const y = 0.4; // temperature coefficient
    const tMin = P * OD / (2 * (Sallow + P * y));

    // Wall margin
    const wallMargin = (t - tMin) / tMin * 100;

    // Longitudinal stress (pressure only)
    const sigLP = P * OD / (4 * t);

    // Pipe weight per meter
    const Apipe = Math.PI / 4 * (OD * OD - ID * ID);
    const wPipe = Apipe * rhoPipe / 1e6; // kg/m
    const wContents = Math.PI / 4 * ID * ID
      * rhoContents / 1e6;
    const wIns = Math.PI * (OD + tIns) * tIns
      * 200 / 1e6; // insulation ~200 kg/m³
    const wTotal = wPipe + wContents + wIns;

    // Section modulus
    const Z = Math.PI / 32
      * (Math.pow(OD, 4) - Math.pow(ID, 4)) / OD;

    // Weight bending moment (simply supported span)
    const Mweight = wTotal * 9.81
      * Math.pow(span * 1000, 2) / 8; // N·mm
    const sigWeight = Mweight / Z;

    // Sustained stress
    const sigSustained = sigLP + sigWeight;
    const sustainedRatio = sigSustained / Sallow;

    // Thermal expansion stress
    const sigThermal = Empa * alpha * 1e-6 * deltaT;
    const Srange = 1.25 * Sallow; // expansion allowable
    const expansionRatio = sigThermal / Srange;

    // Max span (limit deflection to L/400)
    const Ipipe = Math.PI / 64
      * (Math.pow(OD, 4) - Math.pow(ID, 4));
    const maxSpan = Math.pow(
      384 * Empa * Ipipe
      / (5 * wTotal * 9.81 * 400), 0.25
    ) / 1000; // m

    // Code compliance
    const codeOk = sustainedRatio <= 1.0
      && expansionRatio <= 1.0;

    // Warnings
    if (sustainedRatio > 0.9) {
      warnings.push(
        `Sustained ratio ${r2(sustainedRatio)} > 0.9 — near limit`
      );
    }
    if (sustainedRatio > 1.0) {
      warnings.push("Sustained stress EXCEEDS allowable — FAILS code");
    }
    if (expansionRatio > 1.0) {
      warnings.push("Expansion stress EXCEEDS allowable");
    }
    if (wallMargin < 12.5) {
      warnings.push(
        `Wall margin ${r0(wallMargin)}% < 12.5% corrosion allowance`
      );
    }
    if (span > maxSpan) {
      warnings.push(
        `Span ${span}m > max ${r1(maxSpan)}m — add support`
      );
    }
    if (sigHoop > Sallow) {
      warnings.push("Hoop stress exceeds allowable — increase schedule");
    }

    const src = "PipeStressEngine (ASME B31.3)";

    return {
      hoop_stress: mkAv(r0(sigHoop), "MPa",
        sigHoop * 0.02, `PD/(2t)`),
      longitudinal_stress: mkAv(r0(sigSustained), "MPa",
        sigSustained * 0.1, `pressure + weight`),
      min_wall_thickness: mkAv(r1(tMin), "mm",
        tMin * 0.02, "B31.3 formula"),
      wall_margin: mkAv(r0(wallMargin), "%",
        wallMargin * 0.05, `(t-tmin)/tmin`),
      thermal_expansion_stress: mkAv(r0(sigThermal), "MPa",
        sigThermal * 0.1, `EαΔT`),
      sustained_ratio: mkAv(r2(sustainedRatio), "×",
        sustainedRatio * 0.05, `σ/S_allow`),
      expansion_ratio: mkAv(r2(expansionRatio), "×",
        expansionRatio * 0.05, `σ_E/S_range`),
      pipe_weight: mkAv(r1(wTotal), "kg/m",
        wTotal * 0.05, "pipe+contents+ins"),
      max_span: mkAv(r1(maxSpan), "m",
        maxSpan * 0.1, "L/400 deflection"),
      code_compliance: mkAv(codeOk ? 1 : 0,
        codeOk ? "PASS" : "FAIL", 0, src),
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

export const pipeStressEngine = new PipeStressEngine();
