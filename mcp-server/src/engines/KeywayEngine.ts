/**
 * KeywayEngine — Keyway/Keyseat Machining Calculator
 *
 * Calculates keyway machining parameters:
 * - Standard keyway dimensions from shaft diameter (DIN 6885/ANSI B17.1)
 * - Broaching force estimation
 * - End mill keyway cutting parameters
 * - Fit class (slide, normal, tight)
 * - Depth tolerance for shaft and hub
 *
 * Key physics: Keyways transmit torque between shaft and hub.
 * Width and depth are standardized to shaft diameter. Broaching
 * is preferred for production, end milling for one-offs.
 * The broaching force depends on shear strength, cross-section
 * area, and number of teeth cutting simultaneously.
 *
 * Reference: DIN 6885 (Parallel keys),
 *            ANSI B17.1 (Keys and keyseats),
 *            Machinery's Handbook Ch.24 (Keys & Keyseats)
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

export interface KeywayInput {
  shaft_diameter_mm: number;
  keyway_length_mm?: number;
  fit_class?: "slide" | "normal" | "tight";
  machining_method?: "broach" | "end_mill" | "wire_edm";
  material_type?: "steel" | "aluminum" | "stainless"
    | "cast_iron" | "bronze";
  material_tensile_mpa?: number;
}

export interface KeywayResult {
  key_width: AtomicValue;
  key_height: AtomicValue;
  shaft_depth: AtomicValue;
  hub_depth: AtomicValue;
  width_tolerance_shaft: AtomicValue;
  width_tolerance_hub: AtomicValue;
  corner_radius: AtomicValue;
  broaching_force: AtomicValue;
  end_mill_diameter: AtomicValue;
  milling_feed: AtomicValue;
  milling_rpm: AtomicValue;
  torque_capacity: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/**
 * Standard key dimensions per DIN 6885 / ISO 773
 * [shaft_min, shaft_max, width, height]
 */
const KEY_TABLE: Array<[number, number, number, number]> = [
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

/** Fit class tolerances (width tolerance range in mm) */
const FIT_TOL: Record<string, { shaft: [number, number]; hub: [number, number] }> = {
  slide: { shaft: [-0.030, 0], hub: [0.020, 0.060] },
  normal: { shaft: [0, 0.030], hub: [0.020, 0.060] },
  tight: { shaft: [0.012, 0.042], hub: [0, 0.030] },
};

const MAT_SHEAR: Record<string, number> = {
  steel: 350,
  aluminum: 150,
  stainless: 400,
  cast_iron: 200,
  bronze: 180,
};

// ── Engine ─────────────────────────────────────────────────────────

export class KeywayEngine {
  calculate(input: KeywayInput): KeywayResult {
    const warnings: string[] = [];
    const D = input.shaft_diameter_mm;
    const mat = input.material_type ?? "steel";
    const fit = input.fit_class ?? "normal";
    const method = input.machining_method ?? "broach";

    // Look up standard key dimensions
    const entry = KEY_TABLE.find(
      ([min, max]) => D >= min && D < max
    );
    if (!entry) {
      warnings.push(
        D < 6
          ? "Shaft < 6mm — no standard parallel key, use pin"
          : "Shaft > 130mm — consult DIN 6885 extended tables"
      );
    }
    const W = entry ? entry[2] : Math.round(D * 0.25);
    const H = entry ? entry[3] : Math.round(D * 0.22);

    // Shaft depth = H/2, Hub depth = H/2 (approximately)
    const shaftDepth = r2(H / 2);
    const hubDepth = r2(H - shaftDepth);

    // Corner radius (r ≈ 0.4mm for small keys, scales up)
    const cornerR = W <= 6 ? 0.25 : W <= 10 ? 0.4 : 0.6;

    // Tolerances from fit class
    const tol = FIT_TOL[fit] ?? FIT_TOL.normal;

    // Keyway length
    const L = input.keyway_length_mm ?? D * 1.5;

    // Broaching force: F = shear_strength × width × depth_per_tooth × simultaneous_teeth
    const shearStr = input.material_tensile_mpa
      ? input.material_tensile_mpa * 0.6
      : MAT_SHEAR[mat] ?? 350;
    const depthPerTooth = 0.06; // typical broach rise per tooth
    const simTeeth = Math.ceil(L / 12); // teeth in contact
    const broachForce = shearStr * W * depthPerTooth * simTeeth;

    // End mill parameters
    const emDia = W; // end mill = keyway width
    const Vc = mat === "aluminum" ? 150
      : mat === ("titanium" as string) ? 30
      : mat === "stainless" ? 50 : 80;
    const emRpm = r0((Vc * 1000) / (Math.PI * emDia));
    const emFz = mat === "aluminum" ? 0.04
      : mat === "stainless" ? 0.02 : 0.03;
    const emFeed = r1(emFz * 2 * emRpm); // 2 flutes typical

    // Torque capacity: T = F × D/2 where F = shear × W × L
    const allowableShear = shearStr * 0.4; // safety factor
    const torqueCapacity = (allowableShear * W * L * (D / 2))
      / 1e6; // N·m

    // Warnings
    if (L < D) {
      warnings.push(
        "Keyway length < shaft diameter — may be too short for torque"
      );
    }
    if (method === "broach" && mat === "stainless") {
      warnings.push(
        "Stainless work-hardens — use sharp broach with proper lubricant"
      );
    }
    if (method === "end_mill" && L > D * 3) {
      warnings.push(
        "Long keyway by end milling — consider multiple passes for straightness"
      );
    }
    if (D > 130 && !entry) {
      warnings.push(
        "Large shaft — verify key dimensions with DIN 6885 Part 1"
      );
    }

    return {
      key_width: av(W, "mm", 0,
        `DIN 6885 for Ø${D}mm shaft`),
      key_height: av(H, "mm", 0,
        `DIN 6885 for Ø${D}mm shaft`),
      shaft_depth: av(shaftDepth, "mm", 0.02,
        "H / 2"),
      hub_depth: av(hubDepth, "mm", 0.02,
        "H - shaft_depth"),
      width_tolerance_shaft: av(
        (tol.shaft[0] + tol.shaft[1]) / 2, "mm", 0.005,
        `${fit} fit: ${tol.shaft[0]}/${tol.shaft[1]}`
      ),
      width_tolerance_hub: av(
        (tol.hub[0] + tol.hub[1]) / 2, "mm", 0.005,
        `${fit} fit: ${tol.hub[0]}/${tol.hub[1]}`
      ),
      corner_radius: av(cornerR, "mm", 0.05,
        "Standard fillet per key width"),
      broaching_force: av(r0(broachForce), "N", 50,
        `τ=${r0(shearStr)}MPa × W=${W} × ${simTeeth} teeth`),
      end_mill_diameter: av(emDia, "mm", 0,
        "End mill = key width"),
      milling_feed: av(emFeed, "mm/min", 5,
        `fz=${emFz} × 2fl × ${emRpm}rpm`),
      milling_rpm: av(emRpm, "rpm", 5,
        `Vc=${Vc} m/min at Ø${emDia}mm`),
      torque_capacity: av(r1(torqueCapacity), "N·m", 5,
        `τ_allow × W × L × D/2`),
      warnings,
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function av(
  value: number, unit: string,
  uncertainty: number, source: string
): AtomicValue {
  return { value, unit, uncertainty, source };
}

function r0(n: number): number { return Math.round(n); }
function r1(n: number): number { return Math.round(n * 10) / 10; }
function r2(n: number): number { return Math.round(n * 100) / 100; }

export const keywayEngine = new KeywayEngine();
