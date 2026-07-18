/**
 * KeywayDesignEngine — Key & Keyway Joint Calculator
 *
 * Models: Parallel and Woodruff key connections.
 * - Shear stress in key: τ = 2T/(d×b×L)
 * - Bearing/crushing stress: σ = 4T/(d×h×L)
 * - Key length sizing from torque
 * - Stress concentration at keyway
 * - Fatigue derating of shaft
 * - Standard key selection (DIN 6885)
 *
 * Key physics: τ_key = F/A_shear = 2T/(d×b×L).
 * σ_crush = F/A_bearing = 4T/(d×h×L).
 *
 * Reference: DIN 6885 — Parallel Keys,
 *            Shigley — Mechanical Engineering Design,
 *            ASME B17.1 — Keys and Keyseats
 *
 * Actions: keyway_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface KeywayDesignInput {
  shaft_diameter_mm?: number;
  key_type?: "parallel" | "woodruff";
  key_width_mm?: number;
  key_height_mm?: number;
  key_length_mm?: number;
  torque_nm?: number;
  shaft_material_yield_mpa?: number;
  key_material_yield_mpa?: number;
  rpm?: number;
  load_type?: "steady" | "light_shock" | "heavy_shock";
}

export interface KeywayDesignResult {
  shear_stress: AtomicValue;
  crushing_stress: AtomicValue;
  shear_safety: AtomicValue;
  crushing_safety: AtomicValue;
  min_key_length: AtomicValue;
  tangential_force: AtomicValue;
  keyway_stress_concentration: AtomicValue;
  shaft_fatigue_derating: AtomicValue;
  recommended_key: AtomicValue;
  power_transmitted: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Standard key sizes by shaft diameter (DIN 6885) */
/** [min_d, max_d, width, height] */
const STD_KEYS: [number, number, number, number][] = [
  [6, 8, 2, 2],
  [8, 10, 3, 3],
  [10, 12, 4, 4],
  [12, 17, 5, 5],
  [17, 22, 6, 6],
  [22, 30, 8, 7],
  [30, 38, 10, 8],
  [38, 44, 12, 8],
  [44, 50, 14, 9],
  [50, 58, 16, 10],
  [58, 65, 18, 11],
  [65, 75, 20, 12],
  [75, 85, 22, 14],
  [85, 95, 25, 14],
  [95, 110, 28, 16],
  [110, 130, 32, 18],
];

/** Load type service factor */
const LOAD_SF: Record<string, number> = {
  steady: 1.0, light_shock: 1.5, heavy_shock: 2.5,
};

// ── Engine ─────────────────────────────────────────────────────────

export class KeywayDesignEngine {
  calculate(input: KeywayDesignInput): KeywayDesignResult {
    const warnings: string[] = [];
    const d = input.shaft_diameter_mm ?? 40;
    const kType = input.key_type ?? "parallel";
    const T = input.torque_nm ?? 200;
    const sigYshaft = input.shaft_material_yield_mpa ?? 350;
    const sigYkey = input.key_material_yield_mpa ?? 300;
    const rpm = input.rpm ?? 1500;
    const loadType = input.load_type ?? "steady";

    // Standard key lookup
    const stdKey = STD_KEYS.find(k => d >= k[0] && d < k[1]);
    const b = input.key_width_mm ?? (stdKey ? stdKey[2] : d / 4);
    const h = input.key_height_mm ?? (stdKey ? stdKey[3] : d / 4);
    const Ldefault = Math.max(1.5 * d, 20);
    const L = input.key_length_mm ?? Ldefault;

    const Ksf = LOAD_SF[loadType] ?? 1.0;

    // Tangential force
    const Tmm = T * 1000; // N·mm
    const Ft = 2 * Tmm / d; // N

    // Shear stress in key
    const tauKey = Ft * Ksf / (b * L);

    // Crushing/bearing stress (on half-height in contact)
    const sigCrush = Ft * Ksf / ((h / 2) * L);

    // Allowable stresses
    const tauAllow = sigYkey * 0.577; // von Mises
    const sigCrushAllow = Math.min(sigYkey, sigYshaft);

    // Safety factors
    const sfShear = tauAllow / Math.max(tauKey, 0.1);
    const sfCrush = sigCrushAllow / Math.max(sigCrush, 0.1);

    // Minimum key length (from crushing, more critical)
    const Lmin = Ft * Ksf / ((h / 2) * sigCrushAllow);

    // Keyway stress concentration factor
    const Kt = kType === "woodruff" ? 1.5 : 2.0;

    // Shaft fatigue derating from keyway
    const fatigueDerate = 1 / Kt;

    // Power transmitted
    const omega = rpm * 2 * Math.PI / 60;
    const power = T * omega / 1000; // kW

    // Recommended key description
    const recKey = `${b}×${h}×${Math.max(r0(Lmin), r0(L))}`;

    // Warnings
    if (sfShear < 2) {
      warnings.push(
        `Shear SF ${r1(sfShear)} < 2 — increase key length`
      );
    }
    if (sfCrush < 2) {
      warnings.push(
        `Crushing SF ${r1(sfCrush)} < 2 — use longer key`
      );
    }
    if (L < Lmin) {
      warnings.push(
        `Key length ${L}mm < min ${r0(Lmin)}mm`
      );
    }
    if (L > 2.5 * d) {
      warnings.push(
        `Key length ${L}mm > 2.5d — use two keys at 120°`
      );
    }
    if (kType === "woodruff" && T > 500) {
      warnings.push(
        "Woodruff key not suited for high torque — use parallel"
      );
    }
    if (loadType === "heavy_shock" && sfCrush < 3) {
      warnings.push("Heavy shock — SF should be ≥ 3");
    }

    const src = "KeywayDesignEngine (DIN 6885/Shigley)";

    return {
      shear_stress: mkAv(r0(tauKey), "MPa",
        tauKey * 0.05, `2T/(d×b×L)`),
      crushing_stress: mkAv(r0(sigCrush), "MPa",
        sigCrush * 0.05, `4T/(d×h×L)`),
      shear_safety: mkAv(r1(sfShear), "×",
        sfShear * 0.1, `τ_allow/τ`),
      crushing_safety: mkAv(r1(sfCrush), "×",
        sfCrush * 0.1, `σ_allow/σ`),
      min_key_length: mkAv(r0(Lmin), "mm",
        Lmin * 0.05, "from crushing"),
      tangential_force: mkAv(r0(Ft), "N",
        Ft * 0.02, `2T/d`),
      keyway_stress_concentration: mkAv(Kt, "×", 0,
        kType),
      shaft_fatigue_derating: mkAv(r2(fatigueDerate), "×",
        0, `1/Kt`),
      recommended_key: mkAv(b, recKey, 0, src),
      power_transmitted: mkAv(r1(power), "kW",
        power * 0.02, `Tω`),
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

export const keywayDesignEngine = new KeywayDesignEngine();
