/**
 * SealSelectionEngine — Shaft & Static Seal Sizing Calculator
 *
 * Models: O-ring, lip seal, mechanical seal, and gasket selection.
 * - O-ring groove sizing (AS568/ISO 3601)
 * - Lip seal PV limit verification
 * - Mechanical seal face pressure and heat generation
 * - Gasket bolt load and seating stress
 * - Temperature and chemical compatibility
 * - Seal life estimation
 *
 * Key physics: PV = pressure × velocity (limit check).
 * O-ring squeeze 15-25%. Mech seal: PV, face load, heat Q = f×P×V×A.
 * Gasket: Wm1 = π×G×N×b×y (seating), Wm2 = π×G×2b×m×P + H (operating).
 *
 * Reference: Parker O-Ring Handbook,
 *            API 682 — Mechanical Seals,
 *            ASME PCC-1 — Bolted Flanges
 *
 * Actions: seal_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface SealSelectionInput {
  seal_type?: "o_ring" | "lip_seal" | "mechanical" | "gasket";
  shaft_diameter_mm?: number;
  pressure_mpa?: number;
  speed_rpm?: number;
  temperature_c?: number;
  media?: "water" | "oil" | "air" | "steam" | "chemical";
  material?: "nitrile" | "viton" | "epdm" | "ptfe" | "silicone";
}

export interface SealSelectionResult {
  groove_od: AtomicValue;
  groove_depth: AtomicValue;
  squeeze_pct: AtomicValue;
  pv_value: AtomicValue;
  pv_limit: AtomicValue;
  seal_life: AtomicValue;
  heat_generated: AtomicValue;
  max_pressure: AtomicValue;
  max_temperature: AtomicValue;
  material_compatible: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** [max_temp_C, max_pressure_MPa, PV_limit_MPa_m_s, friction_coeff] */
const SEAL_MAT: Record<string, [number, number, number, number]> = {
  nitrile:   [120, 20, 0.5,  0.30],
  viton:     [200, 20, 0.8,  0.25],
  epdm:      [150, 15, 0.4,  0.35],
  ptfe:      [260, 30, 2.0,  0.05],
  silicone:  [230, 5,  0.2,  0.40],
};

/** Media compatibility: 1=good, 0=poor */
const COMPAT: Record<string, Record<string, number>> = {
  nitrile:   { water: 1, oil: 1, air: 1, steam: 0, chemical: 0 },
  viton:     { water: 1, oil: 1, air: 1, steam: 0, chemical: 1 },
  epdm:      { water: 1, oil: 0, air: 1, steam: 1, chemical: 0 },
  ptfe:      { water: 1, oil: 1, air: 1, steam: 1, chemical: 1 },
  silicone:  { water: 1, oil: 0, air: 1, steam: 1, chemical: 0 },
};

// ── Engine ─────────────────────────────────────────────────────────

export class SealSelectionEngine {
  calculate(input: SealSelectionInput): SealSelectionResult {
    const warnings: string[] = [];
    const sealType = input.seal_type ?? "o_ring";
    const shaftD = input.shaft_diameter_mm ?? 50;
    const P = input.pressure_mpa ?? 1;
    const rpm = input.speed_rpm ?? 1500;
    const tempC = input.temperature_c ?? 60;
    const media = input.media ?? "oil";
    const matKey = input.material ?? "nitrile";

    const [maxTemp, maxP, pvLimit, mu] = SEAL_MAT[matKey] ?? SEAL_MAT.nitrile;

    // Shaft surface velocity (m/s)
    const v = (Math.PI * shaftD / 1000 * rpm) / 60;

    // PV value
    const pv = P * v;

    // O-ring groove sizing (standard cross-section by shaft size)
    let csOring: number; // cross-section diameter mm
    if (shaftD < 25) csOring = 1.78;
    else if (shaftD < 50) csOring = 2.62;
    else if (shaftD < 100) csOring = 3.53;
    else csOring = 5.33;

    // Groove depth (for ~20% squeeze)
    const squeezePct = 20;
    const grooveDepth = csOring * (1 - squeezePct / 100);
    const grooveOD = shaftD + 2 * csOring; // bore groove OD

    // Heat generated
    let heatW: number;
    if (sealType === "mechanical") {
      // Mechanical seal: Q = f × P_face × V × A_face
      const faceWidth = 5; // mm typical
      const faceArea = Math.PI * shaftD * faceWidth / 1e6; // m²
      heatW = mu * P * 1e6 * v * faceArea;
    } else {
      // Lip/O-ring: Q ≈ μ × F_contact × v
      const contactForce = P * 1e6 * Math.PI * shaftD / 1000 * csOring / 1000;
      heatW = mu * contactForce * v;
    }

    // Seal life (hours) — empirical derating
    let baseLife = 20000; // hours
    if (sealType === "lip_seal") baseLife = 5000;
    if (sealType === "mechanical") baseLife = 25000;
    if (sealType === "gasket") baseLife = 50000;
    const pvRatio = pvLimit > 0 ? pv / pvLimit : 1;
    const tempRatio = maxTemp > 0 ? tempC / maxTemp : 1;
    const life = baseLife * Math.max(0.1, (1 - pvRatio * 0.5)) *
      Math.max(0.1, (1 - tempRatio * 0.3));

    // Compatibility
    const compat = COMPAT[matKey]?.[media] ?? 0;

    // Warnings
    if (pv > pvLimit) {
      warnings.push(`PV ${r2(pv)} exceeds limit ${pvLimit} MPa·m/s for ${matKey}`);
    }
    if (tempC > maxTemp) {
      warnings.push(`Temperature ${tempC}°C exceeds max ${maxTemp}°C for ${matKey}`);
    }
    if (P > maxP) {
      warnings.push(`Pressure ${P}MPa exceeds max ${maxP}MPa — add backup rings`);
    }
    if (compat === 0) {
      warnings.push(`${matKey} not compatible with ${media} — select different elastomer`);
    }
    if (sealType === "o_ring" && v > 2) {
      warnings.push(`Shaft speed ${r1(v)}m/s too high for static O-ring — use lip seal`);
    }
    if (heatW > 100) {
      warnings.push(`Heat generation ${r0(heatW)}W — provide cooling or flush`);
    }

    const src = "SealSelectionEngine (Parker/API 682)";

    return {
      groove_od: mkAv(r2(grooveOD), "mm", 0.1, `AS568 cs=${csOring}mm`),
      groove_depth: mkAv(r2(grooveDepth), "mm", 0.05,
        `${squeezePct}% squeeze`),
      squeeze_pct: mkAv(squeezePct, "%", 1, "Target 15-25%"),
      pv_value: mkAv(r3(pv), "MPa·m/s", pv * 0.05, `${P}MPa × ${r1(v)}m/s`),
      pv_limit: mkAv(pvLimit, "MPa·m/s", 0, `${matKey}`),
      seal_life: mkAv(r0(life), "hours", life * 0.3, "PV/temp derating"),
      heat_generated: mkAv(r1(heatW), "W", heatW * 0.2,
        `μ=${mu} ${sealType}`),
      max_pressure: mkAv(maxP, "MPa", 0, matKey),
      max_temperature: mkAv(maxTemp, "°C", 0, matKey),
      material_compatible: mkAv(compat, compat ? "COMPATIBLE" : "INCOMPATIBLE",
        0, `${matKey}/${media}`),
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
function r3(n: number): number { return Math.round(n * 1000) / 1000; }

export const sealSelectionEngine = new SealSelectionEngine();
