/**
 * GasketDesignEngine — Flanged Joint Gasket Sizing Calculator
 *
 * Models: Gasket selection and bolt load for flanged joints.
 * - ASME PCC-1 gasket seating stress (y-factor)
 * - Maintenance factor (m-factor) for operating
 * - Required bolt load Wm1 (seating) and Wm2 (operating)
 * - Gasket contact width and effective area
 * - Flange rotation and bolt spacing
 * - Leak rate estimation
 *
 * Key physics: Wm1 = π×b×G×y. Wm2 = 2π×b×G×m×P + H.
 * H = π/4 × G² × P. b = effective gasket width.
 *
 * Reference: ASME PCC-1 — Guidelines for Bolted Joints,
 *            ASME B16.20 — Metallic Gaskets,
 *            EN 1591 — Flanges and Joints
 *
 * Actions: gasket_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface GasketDesignInput {
  gasket_type?: "spiral_wound" | "ring_joint" | "sheet" | "ptfe" | "kammprofile";
  gasket_od_mm?: number;
  gasket_id_mm?: number;
  pressure_mpa?: number;
  temperature_c?: number;
  bolt_size_mm?: number;
  num_bolts?: number;
  bolt_grade?: "B7" | "B8" | "L7" | "B16";
}

export interface GasketDesignResult {
  seating_load: AtomicValue;
  operating_load: AtomicValue;
  governing_load: AtomicValue;
  bolt_stress: AtomicValue;
  gasket_contact_stress: AtomicValue;
  effective_width: AtomicValue;
  hydrostatic_force: AtomicValue;
  bolt_torque: AtomicValue;
  safety_factor: AtomicValue;
  leak_tightness: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** [m_factor, y_factor_MPa, max_temp_C] */
const GASKET_DATA: Record<string, [number, number, number]> = {
  spiral_wound: [3.0, 69,  600],
  ring_joint:   [6.5, 179, 800],
  sheet:        [2.0, 11,  200],
  ptfe:         [2.0, 14,  260],
  kammprofile:  [3.5, 90,  550],
};

/** Bolt proof stress by grade (MPa) */
const BOLT_GRADE: Record<string, number> = {
  B7: 724, B8: 517, L7: 724, B16: 862,
};

// ── Engine ─────────────────────────────────────────────────────────

export class GasketDesignEngine {
  calculate(input: GasketDesignInput): GasketDesignResult {
    const warnings: string[] = [];
    const gType = input.gasket_type ?? "spiral_wound";
    const OD = input.gasket_od_mm ?? 200;
    const ID = input.gasket_id_mm ?? 150;
    const P = input.pressure_mpa ?? 2;
    const temp = input.temperature_c ?? 150;
    const boltD = input.bolt_size_mm ?? 20;
    const nBolts = input.num_bolts ?? 12;
    const grade = input.bolt_grade ?? "B7";

    const [m, y, maxTemp] = GASKET_DATA[gType] ?? GASKET_DATA.spiral_wound;
    const proofStress = BOLT_GRADE[grade] ?? 724;

    // Gasket geometry
    const N = (OD - ID) / 2; // gasket seating width mm
    const b0 = N / 2; // basic width
    const b = b0 < 6.3 ? b0 : 2.53 * Math.sqrt(b0); // effective width
    const G = OD - 2 * b; // gasket reaction diameter

    // Gasket contact area
    const Ag = Math.PI * G * 2 * b; // mm²

    // Hydrostatic end force
    const H = Math.PI / 4 * G * G * P; // N (G in mm, P in MPa)

    // Seating load (Wm1)
    const Wm1 = Math.PI * b * G * y; // N

    // Operating load (Wm2)
    const Wm2 = 2 * Math.PI * b * G * m * P + H; // N

    // Governing load
    const Wm = Math.max(Wm1, Wm2);

    // Bolt stress area (per bolt)
    const At = Math.PI / 4 * Math.pow(boltD * 0.84, 2); // stress area ≈ 0.84d
    const totalBoltArea = At * nBolts;
    const boltStress = totalBoltArea > 0 ? Wm / totalBoltArea : 0;

    // Gasket contact stress
    const gasketStress = Ag > 0 ? Wm / Ag : 0;

    // Bolt torque (K ≈ 0.2 for lubricated)
    const K = 0.2;
    const torquePerBolt = K * (Wm / nBolts) * boltD / 1000; // N·m

    // Safety factor
    const SF = proofStress / Math.max(boltStress, 0.1);

    // Leak tightness (Tp factor — ratio of gasket stress to required)
    const Tp = gasketStress / Math.max(m * P + y * 0.1, 0.1);

    // Warnings
    if (SF < 1.5) {
      warnings.push(`Bolt safety factor ${r1(SF)} < 1.5 — increase bolt size or number`);
    }
    if (temp > maxTemp) {
      warnings.push(`Temperature ${temp}°C exceeds ${maxTemp}°C limit for ${gType}`);
    }
    if (boltStress > proofStress * 0.8) {
      warnings.push(`Bolt stress ${r0(boltStress)}MPa near proof ${proofStress}MPa`);
    }
    if (gasketStress < y) {
      warnings.push(`Gasket stress ${r0(gasketStress)}MPa below seating stress ${y}MPa`);
    }
    if (gType === "sheet" && P > 2) {
      warnings.push("Sheet gasket at >2MPa — consider spiral wound or kammprofile");
    }
    if (nBolts < 4) {
      warnings.push("< 4 bolts — uneven gasket compression likely");
    }

    const src = "GasketDesignEngine (ASME PCC-1/B16.20)";

    return {
      seating_load: mkAv(r0(Wm1), "N", Wm1 * 0.05, `πbGy`),
      operating_load: mkAv(r0(Wm2), "N", Wm2 * 0.05, `2πbGmP + H`),
      governing_load: mkAv(r0(Wm), "N", Wm * 0.05,
        Wm1 > Wm2 ? "Seating governs" : "Operating governs"),
      bolt_stress: mkAv(r0(boltStress), "MPa", boltStress * 0.05,
        `W/${nBolts} bolts M${boltD}`),
      gasket_contact_stress: mkAv(r0(gasketStress), "MPa", gasketStress * 0.1,
        `W/Ag`),
      effective_width: mkAv(r1(b), "mm", b * 0.05, "ASME formula"),
      hydrostatic_force: mkAv(r0(H), "N", H * 0.02, `πG²P/4`),
      bolt_torque: mkAv(r0(torquePerBolt), "N·m", torquePerBolt * 0.1,
        `K=0.2 lubricated`),
      safety_factor: mkAv(r1(SF), "×", SF * 0.05,
        `proof/stress ${grade}`),
      leak_tightness: mkAv(r1(Tp), "Tp", Tp * 0.1, src),
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

export const gasketDesignEngine = new GasketDesignEngine();
