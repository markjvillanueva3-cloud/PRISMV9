/**
 * HardnessConversionEngine — L2-P4-MS1 PASS2 Specialty
 *
 * Converts between hardness scales per ASTM E140.
 * Rockwell (HRC, HRB), Brinell (HBW), Vickers (HV), Knoop (HK),
 * and approximate tensile strength correlation.
 *
 * Actions: hardness_convert, hardness_batch, hardness_validate
 */

// ============================================================================
// TYPES
// ============================================================================

export type HardnessScale = "HRC" | "HRB" | "HBW" | "HV" | "HK" | "HRA";

export interface HardnessConvertInput {
  value: number;
  from_scale: HardnessScale;
  to_scale: HardnessScale;
}

export interface HardnessConvertResult {
  input_value: number;
  input_scale: HardnessScale;
  converted_value: number;
  output_scale: HardnessScale;
  tensile_strength_MPa: number;
  accuracy: "exact" | "interpolated" | "extrapolated";
  notes: string;
}

// ============================================================================
// CONVERSION TABLES (ASTM E140 excerpts)
// ============================================================================

// HRC → HV → HBW → tensile (MPa) reference points
const TABLE: { hrc: number; hv: number; hbw: number; tensile: number }[] = [
  { hrc: 68, hv: 940, hbw: 0, tensile: 0 },
  { hrc: 65, hv: 832, hbw: 0, tensile: 0 },
  { hrc: 60, hv: 697, hbw: 0, tensile: 2220 },
  { hrc: 55, hv: 595, hbw: 560, tensile: 1965 },
  { hrc: 50, hv: 513, hbw: 481, tensile: 1720 },
  { hrc: 45, hv: 446, hbw: 421, tensile: 1500 },
  { hrc: 40, hv: 392, hbw: 371, tensile: 1310 },
  { hrc: 35, hv: 345, hbw: 327, tensile: 1160 },
  { hrc: 30, hv: 302, hbw: 286, tensile: 1020 },
  { hrc: 25, hv: 266, hbw: 253, tensile: 900 },
  { hrc: 20, hv: 238, hbw: 226, tensile: 810 },
];

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class HardnessConversionEngine {
  convert(input: HardnessConvertInput): HardnessConvertResult {
    // Normalize to HRC first, then convert to target
    const hrcValue = this._toHRC(input.value, input.from_scale);
    const converted = this._fromHRC(hrcValue, input.to_scale);
    const tensile = this._hrcToTensile(hrcValue);

    const accuracy: HardnessConvertResult["accuracy"] =
      hrcValue >= 20 && hrcValue <= 65 ? "interpolated" : "extrapolated";

    const notes = input.from_scale === input.to_scale
      ? "Same scale — no conversion needed"
      : `Converted via ASTM E140 reference table (${accuracy})`;

    return {
      input_value: input.value,
      input_scale: input.from_scale,
      converted_value: Math.round(converted * 10) / 10,
      output_scale: input.to_scale,
      tensile_strength_MPa: Math.round(tensile),
      accuracy,
      notes,
    };
  }

  batchConvert(values: number[], from: HardnessScale, to: HardnessScale): HardnessConvertResult[] {
    return values.map(v => this.convert({ value: v, from_scale: from, to_scale: to }));
  }

  private _toHRC(value: number, scale: HardnessScale): number {
    if (scale === "HRC") return value;
    if (scale === "HV") return this._interpolate(TABLE, "hv", "hrc", value);
    if (scale === "HBW") return this._interpolate(TABLE.filter(r => r.hbw > 0), "hbw", "hrc", value);
    if (scale === "HRA") return (value - 26.7) / 1.12; // approximate
    if (scale === "HRB") return (value - 60) / 2.5; // very approximate, only valid for soft materials
    if (scale === "HK") return this._interpolate(TABLE, "hv", "hrc", value * 0.95); // HK ≈ HV * 1.05
    return value;
  }

  private _fromHRC(hrc: number, scale: HardnessScale): number {
    if (scale === "HRC") return hrc;
    if (scale === "HV") return this._interpolate(TABLE, "hrc", "hv", hrc);
    if (scale === "HBW") {
      const filtered = TABLE.filter(r => r.hbw > 0);
      return filtered.length > 0 ? this._interpolate(filtered, "hrc", "hbw", hrc) : 0;
    }
    if (scale === "HRA") return hrc * 1.12 + 26.7;
    if (scale === "HRB") return hrc * 2.5 + 60;
    if (scale === "HK") return this._interpolate(TABLE, "hrc", "hv", hrc) * 1.05;
    return hrc;
  }

  private _hrcToTensile(hrc: number): number {
    const valid = TABLE.filter(r => r.tensile > 0);
    if (valid.length < 2) return 0;
    return this._interpolate(valid, "hrc", "tensile", hrc);
  }

  private _interpolate(table: Record<string, number>[], fromKey: string, toKey: string, value: number): number {
    // Find bounding rows
    let lower = table[table.length - 1];
    let upper = table[0];

    for (let i = 0; i < table.length - 1; i++) {
      const a = table[i];
      const b = table[i + 1];
      if ((a[fromKey] >= value && b[fromKey] <= value) || (a[fromKey] <= value && b[fromKey] >= value)) {
        upper = a;
        lower = b;
        break;
      }
    }

    const range = upper[fromKey] - lower[fromKey];
    if (Math.abs(range) < 0.001) return upper[toKey];
    const fraction = (value - lower[fromKey]) / range;
    return lower[toKey] + fraction * (upper[toKey] - lower[toKey]);
  }
}

export const hardnessConversionEngine = new HardnessConversionEngine();
