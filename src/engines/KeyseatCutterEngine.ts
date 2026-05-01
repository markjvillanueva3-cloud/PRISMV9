/**
 * KeyseatCutterEngine — Keyseat/Woodruff Key Slot Calculations
 *
 * Calculates parameters for keyseat (keyway) milling on shafts:
 * - Standard keyway dimensions per shaft diameter (DIN 6885/ANSI B17.1)
 * - Keyseat cutter sizing and speed/feed
 * - Woodruff key slot dimensions (DIN 6888)
 * - Depth tolerance and fit class
 * - Straddle milling parameters for wider slots
 *
 * Reference: DIN 6885 (parallel keys), ANSI B17.1 (keys & keyseats),
 *            DIN 6888 (Woodruff keys), Machinery's Handbook Ch.22
 *
 * Actions: keyseat_calc, woodruff_calc, keyseat_dimensions
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export type FitClass = "normal" | "close" | "interference";

export interface KeyseatInput {
  shaft_diameter_mm: number;
  key_width_mm?: number;
  key_height_mm?: number;
  slot_length_mm?: number;
  fit_class?: FitClass;
  material_iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  num_flutes?: number;
}

export interface KeyseatResult {
  key_width: AtomicValue;
  key_height: AtomicValue;
  shaft_depth: AtomicValue;
  hub_depth: AtomicValue;
  cutter_diameter: AtomicValue;
  slot_tolerance: AtomicValue;
  spindle_rpm: AtomicValue;
  feed_rate: AtomicValue;
  cycle_time: AtomicValue;
  standard: string;
  warnings: string[];
}

export interface WoodruffInput {
  shaft_diameter_mm: number;
  key_number?: string;
  material_iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
}

export interface WoodruffResult {
  key_number: string;
  cutter_diameter: AtomicValue;
  cutter_width: AtomicValue;
  slot_depth: AtomicValue;
  key_height: AtomicValue;
  spindle_rpm: AtomicValue;
  feed_rate: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/**
 * DIN 6885 parallel key dimensions by shaft diameter range.
 * [min_shaft, max_shaft, key_width, key_height]
 */
const DIN6885_KEYS: Array<[number, number, number, number]> = [
  [6,    8,   2,  2],
  [8,   10,   3,  3],
  [10,  12,   4,  4],
  [12,  17,   5,  5],
  [17,  22,   6,  6],
  [22,  30,   8,  7],
  [30,  38,  10,  8],
  [38,  44,  12,  8],
  [44,  50,  14,  9],
  [50,  58,  16, 10],
  [58,  65,  18, 11],
  [65,  75,  20, 12],
  [75,  85,  22, 14],
  [85, 95,   25, 14],
  [95, 110,  28, 16],
  [110, 130, 32, 18],
];

/**
 * Woodruff key sizes: key_number → [cutter_dia, width, height]
 */
const WOODRUFF_KEYS: Record<string, [number, number, number]> = {
  "202":  [15.88,  1.59, 3.18],
  "303":  [19.05,  2.38, 4.76],
  "404":  [25.40,  3.18, 6.35],
  "405":  [31.75,  3.18, 7.93],
  "505":  [31.75,  3.97, 7.93],
  "506":  [38.10,  3.97, 9.53],
  "607":  [44.45,  4.76, 11.11],
  "608":  [50.80,  4.76, 12.70],
  "609":  [57.15,  4.76, 14.29],
  "810":  [63.50,  6.35, 15.88],
  "812":  [76.20,  6.35, 19.05],
  "1012": [76.20,  7.94, 19.05],
  "1212": [76.20,  9.53, 19.05],
};

/** Slot tolerance (mm) by fit class */
const SLOT_TOLERANCES: Record<FitClass, number> = {
  normal: 0.030,
  close: 0.015,
  interference: 0.006,
};

/** Cutting speed for keyseat cutters (m/min) */
const KEYSEAT_SPEEDS: Record<string, number> = {
  P: 20, M: 15, K: 25, N: 50, S: 8, H: 10,
};

/** Feed per tooth for keyseat cutters (mm/tooth) */
const KEYSEAT_FPT: Record<string, number> = {
  P: 0.03, M: 0.025, K: 0.04, N: 0.05, S: 0.015, H: 0.015,
};

// ── Engine ─────────────────────────────────────────────────────────

export class KeyseatCutterEngine {
  /**
   * Calculate keyseat (keyway) milling parameters.
   */
  calculate(input: KeyseatInput): KeyseatResult {
    const warnings: string[] = [];
    const iso = input.material_iso_group ?? "P";
    const shaftDia = input.shaft_diameter_mm;
    const fitClass = input.fit_class ?? "normal";

    // Find standard key dimensions
    let keyW: number;
    let keyH: number;
    let standard = "DIN 6885";

    const stdRow = DIN6885_KEYS.find(
      ([min, max]) => shaftDia >= min && shaftDia < max
    );

    if (input.key_width_mm && input.key_height_mm) {
      keyW = input.key_width_mm;
      keyH = input.key_height_mm;
      standard = "Custom dimensions";
    } else if (stdRow) {
      keyW = input.key_width_mm ?? stdRow[2];
      keyH = input.key_height_mm ?? stdRow[3];
    } else if (shaftDia < 6) {
      warnings.push(
        "Shaft < 6mm — below DIN 6885 range, using estimated dims"
      );
      keyW = Math.max(1, Math.round(shaftDia * 0.25));
      keyH = keyW;
      standard = "Estimated (below DIN range)";
    } else {
      warnings.push(
        "Shaft > 130mm — above standard table, using estimated dims"
      );
      keyW = Math.round(shaftDia * 0.25);
      keyH = Math.round(shaftDia * 0.15);
      standard = "Estimated (above DIN range)";
    }

    // Shaft keyway depth = key_height / 2 (approximately)
    // More precisely: t1 = h - (d/2 - sqrt((d/2)² - (b/2)²))
    // where d=shaft dia, b=key width, h=key height
    const r = shaftDia / 2;
    const halfW = keyW / 2;
    const segmentCorrection = halfW < r
      ? r - Math.sqrt(r * r - halfW * halfW)
      : 0;
    const shaftDepth = keyH / 2 + segmentCorrection;
    const hubDepth = keyH - shaftDepth + segmentCorrection;

    // Cutter diameter (keyseat cutter ≈ shaft diameter)
    const cutterDia = Math.max(keyW * 2, shaftDia * 0.8);

    // Slot tolerance
    const tolerance = SLOT_TOLERANCES[fitClass];

    // Speed/feed
    const z = input.num_flutes ?? Math.max(2, Math.round(cutterDia / 5));
    const vc = KEYSEAT_SPEEDS[iso] ?? 20;
    const rpm = (vc * 1000) / (Math.PI * cutterDia);
    const fpt = KEYSEAT_FPT[iso] ?? 0.03;
    const feedRate = fpt * z * rpm;

    // Cycle time (plunge + traverse)
    const slotLength = input.slot_length_mm ?? shaftDia * 1.5;
    const cycleTime = (slotLength / feedRate) +
      (shaftDepth / (feedRate * 0.3)); // plunge at 30% feed

    // Warnings
    if (keyW > shaftDia * 0.35) {
      warnings.push(
        "Key width > 35% of shaft — may weaken shaft"
      );
    }
    if (shaftDepth > shaftDia * 0.15) {
      warnings.push(
        "Deep keyway — verify shaft stress concentration"
      );
    }

    return {
      key_width: av(keyW, "mm", 0, standard),
      key_height: av(keyH, "mm", 0, standard),
      shaft_depth: av(r3(shaftDepth), "mm", 0.05,
        "h/2 + segment correction"),
      hub_depth: av(r3(hubDepth), "mm", 0.05,
        "Total key height - shaft depth"),
      cutter_diameter: av(r1(cutterDia), "mm", 0.05,
        "Keyseat cutter sizing"),
      slot_tolerance: av(tolerance, "mm", 0,
        `${fitClass} fit per DIN 6885`),
      spindle_rpm: av(Math.round(rpm), "rev/min", 0.05,
        "Vc × 1000 / (π × D_cutter)"),
      feed_rate: av(Math.round(feedRate), "mm/min", 0.1,
        "fpt × z × RPM"),
      cycle_time: av(r2(cycleTime), "min", 0.2,
        "traverse + plunge time"),
      standard,
      warnings,
    };
  }

  /**
   * Calculate Woodruff key slot parameters.
   */
  woodruff(input: WoodruffInput): WoodruffResult {
    const warnings: string[] = [];
    const iso = input.material_iso_group ?? "P";
    const shaftDia = input.shaft_diameter_mm;

    // Select Woodruff key
    let keyNum: string;
    let cutterDia: number;
    let width: number;
    let height: number;

    if (input.key_number && WOODRUFF_KEYS[input.key_number]) {
      keyNum = input.key_number;
      [cutterDia, width, height] = WOODRUFF_KEYS[keyNum];
    } else {
      // Auto-select: cutter diameter ≈ shaft diameter × 0.7
      const targetDia = shaftDia * 0.7;
      let bestKey = "404";
      let bestDiff = Infinity;

      for (const [num, [dia]] of Object.entries(WOODRUFF_KEYS)) {
        const diff = Math.abs(dia - targetDia);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestKey = num;
        }
      }

      keyNum = bestKey;
      [cutterDia, width, height] = WOODRUFF_KEYS[keyNum];
    }

    // Slot depth = height - (cutter_dia/2 - sqrt((cutter_dia/2)² - (width/2)²))
    // Simplified: slot depth ≈ height × 0.6
    const slotDepth = height * 0.6;

    // Speed/feed
    const vc = (KEYSEAT_SPEEDS[iso] ?? 20) * 0.8;
    const rpm = (vc * 1000) / (Math.PI * cutterDia);
    const fpr = (KEYSEAT_FPT[iso] ?? 0.03) * 2; // Woodruff = plunge only
    const feedRate = fpr * rpm;

    if (cutterDia > shaftDia * 0.9) {
      warnings.push(
        "Woodruff cutter nearly as large as shaft — " +
        "verify clearance"
      );
    }

    return {
      key_number: keyNum,
      cutter_diameter: av(r2(cutterDia), "mm", 0,
        `Woodruff key #${keyNum}`),
      cutter_width: av(r2(width), "mm", 0,
        `Woodruff key #${keyNum}`),
      slot_depth: av(r2(slotDepth), "mm", 0.1,
        "height × 0.6 (approximate)"),
      key_height: av(r2(height), "mm", 0,
        `Woodruff key #${keyNum}`),
      spindle_rpm: av(Math.round(rpm), "rev/min", 0.05,
        "Vc × 1000 / (π × D_cutter) × 0.8"),
      feed_rate: av(Math.round(feedRate), "mm/min", 0.1,
        "Plunge feed rate"),
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

function r1(n: number): number { return Math.round(n * 10) / 10; }
function r2(n: number): number { return Math.round(n * 100) / 100; }
function r3(n: number): number { return Math.round(n * 1000) / 1000; }

export const keyseatCutterEngine = new KeyseatCutterEngine();
