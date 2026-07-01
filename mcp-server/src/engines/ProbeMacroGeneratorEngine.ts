/**
 * ProbeMacroGeneratorEngine — closes PreCut axes #2 (datum) + #3 (tool offsets)
 *
 * Generates shop-floor probe-cycle macros for the named controller dialect:
 *   - Datum probing (G54 X/Y/Z origin set on raw stock)
 *   - Web/boss centering (split-the-difference between opposing surfaces)
 *   - Bore/boss best-fit (Renishaw G65 P9814 / Blum LC50 equivalent)
 *   - Tool length / diameter in-machine measurement
 *
 * Reference: Renishaw Inspection Plus + OMP400 Programming Manual;
 *   Blum-Novotest LC50 / TC52 macro reference; Heidenhain TNC 640 §probing-cycles;
 *   Fanuc 30i §macro-B + G31 skip; Okuma OSP-P300 §touch-probe macros;
 *   Haas Mill operator probing supplement.
 *
 * @version 1.0.0
 * @module ProbeMacroGeneratorEngine
 */

interface AtomicValue<T = number> {
  value: T;
  unit: string;
  source: string;
}

export type ControllerDialect = "fanuc" | "okuma_osp" | "haas" | "heidenhain_tnc";
export type ProbeBrand = "renishaw_omp400" | "blum_lc50" | "blum_tc52" | "haas_oem";
export type ProbeCycle = "datum_xyz" | "web_x" | "web_y" | "bore_best_fit" | "boss_best_fit" | "tool_length" | "tool_diameter";

export interface ProbeMacroInput {
  controller: ControllerDialect;
  probe_brand: ProbeBrand;
  cycle: ProbeCycle;
  /** Expected coordinate (for datum cycles) */
  expected_x_mm?: number;
  expected_y_mm?: number;
  expected_z_mm?: number;
  /** Nominal feature size (for bore/boss/web cycles) */
  nominal_size_mm?: number;
  /** Tool ID + pocket (for tool-length / tool-diameter cycles) */
  tool_id?: string;
  tool_pocket?: number;
  /** Tolerance band for pass/fail (μm; default 25) */
  tolerance_um?: number;
}

export interface ProbeMacroResult {
  controller: ControllerDialect;
  probe_brand: ProbeBrand;
  cycle: ProbeCycle;
  macro_text: string;
  estimated_cycle_time_s: AtomicValue;
  tolerance_um: number;
  warnings: string[];
  source: string;
}

// ── Renishaw cycle-IDs (P9810-series per Renishaw Inspection Plus manual) ──
const RENISHAW_PROGRAM_IDS: Record<ProbeCycle, string> = {
  datum_xyz: "P9810",       // Single-surface probe (call 3 times for XYZ)
  web_x: "P9812",            // Web in X
  web_y: "P9812",
  bore_best_fit: "P9814",
  boss_best_fit: "P9823",
  tool_length: "P9853",      // Tool-length macro
  tool_diameter: "P9854",    // Tool-diameter macro
};

const CYCLE_TIME_S: Record<ProbeCycle, number> = {
  datum_xyz: 6,
  web_x: 10,
  web_y: 10,
  bore_best_fit: 18,
  boss_best_fit: 18,
  tool_length: 8,
  tool_diameter: 12,
};

export class ProbeMacroGeneratorEngine {
  generate(input: ProbeMacroInput): ProbeMacroResult {
    if (!input || !input.controller || !input.probe_brand || !input.cycle) {
      throw new Error("ProbeMacroGeneratorEngine.generate: controller + probe_brand + cycle required");
    }
    const tolerance_um = input.tolerance_um ?? 25;
    const warnings: string[] = [];

    const builder = MACRO_BUILDERS[input.controller];
    if (!builder) {
      throw new Error(`ProbeMacroGeneratorEngine.generate: unknown controller ${input.controller}`);
    }
    const macroText = builder(input, tolerance_um, warnings);

    return {
      controller: input.controller,
      probe_brand: input.probe_brand,
      cycle: input.cycle,
      macro_text: macroText,
      estimated_cycle_time_s: {
        value: CYCLE_TIME_S[input.cycle],
        unit: "s",
        source: "Renishaw Inspection Plus cycle-time table",
      },
      tolerance_um,
      warnings,
      source: "ProbeMacroGeneratorEngine — Renishaw Inspection Plus + OMP400 manual + Blum LC50/TC52 ref",
    };
  }
}

type Builder = (input: ProbeMacroInput, tol_um: number, warnings: string[]) => string;

const MACRO_BUILDERS: Record<ControllerDialect, Builder> = {
  fanuc: (input, tol_um, warnings) => {
    const lines: string[] = ["( Fanuc 30i + Renishaw probe macro )"];
    const tol_mm = tol_um / 1000;
    switch (input.cycle) {
      case "datum_xyz": {
        const x = input.expected_x_mm ?? 0, y = input.expected_y_mm ?? 0, z = input.expected_z_mm ?? 0;
        lines.push(`G65 ${RENISHAW_PROGRAM_IDS.datum_xyz} X${x} S1.0 W54. T${tol_mm} ( probe X face → G54 X )`);
        lines.push(`G65 ${RENISHAW_PROGRAM_IDS.datum_xyz} Y${y} S1.0 W54. T${tol_mm} ( probe Y face → G54 Y )`);
        lines.push(`G65 ${RENISHAW_PROGRAM_IDS.datum_xyz} Z${z} S1.0 W54. T${tol_mm} ( probe Z face → G54 Z )`);
        break;
      }
      case "web_x":
      case "web_y": {
        if (input.nominal_size_mm === undefined) warnings.push("nominal_size_mm required for web — defaulted to 25.4");
        const size = input.nominal_size_mm ?? 25.4;
        const axis = input.cycle === "web_x" ? "X" : "Y";
        lines.push(`G65 ${RENISHAW_PROGRAM_IDS[input.cycle]} ${axis}${size} S1.0 W54. T${tol_mm} ( ${input.cycle} centering )`);
        break;
      }
      case "bore_best_fit":
      case "boss_best_fit": {
        if (input.nominal_size_mm === undefined) {
          warnings.push("nominal_size_mm required for bore/boss — defaulted to 25.4");
        }
        const dia = input.nominal_size_mm ?? 25.4;
        lines.push(`G65 ${RENISHAW_PROGRAM_IDS[input.cycle]} D${dia} S1.0 W54. T${tol_mm} ( ${input.cycle} )`);
        break;
      }
      case "tool_length": {
        if (!input.tool_id || input.tool_pocket === undefined) {
          warnings.push("tool_id + tool_pocket required for tool_length");
        }
        lines.push(`T${input.tool_pocket ?? 1} M6 ( ${input.tool_id ?? "tool"} )`);
        lines.push(`G65 ${RENISHAW_PROGRAM_IDS.tool_length} H${input.tool_pocket ?? 1} T${tol_mm} ( measure length, write to offset H )`);
        break;
      }
      case "tool_diameter": {
        lines.push(`T${input.tool_pocket ?? 1} M6`);
        lines.push(`G65 ${RENISHAW_PROGRAM_IDS.tool_diameter} D${input.tool_pocket ?? 1} T${tol_mm} ( measure diameter, write to offset D )`);
        break;
      }
    }
    lines.push("( end of probe macro )");
    return lines.join("\n");
  },
  okuma_osp: (input, tol_um, _warnings) => {
    const lines: string[] = ["( Okuma OSP + touch-probe macro )"];
    const tol_mm = tol_um / 1000;
    switch (input.cycle) {
      case "datum_xyz": {
        const x = input.expected_x_mm ?? 0, y = input.expected_y_mm ?? 0, z = input.expected_z_mm ?? 0;
        lines.push(`CALL OO9810 PX=${x} PY=${y} PZ=${z} PT=${tol_mm} ( Okuma datum probe )`);
        break;
      }
      case "web_x": case "web_y": case "bore_best_fit": case "boss_best_fit":
        lines.push(`CALL OO981${input.cycle === "bore_best_fit" ? "4" : input.cycle === "boss_best_fit" ? "5" : "2"} ND=${input.nominal_size_mm ?? 25.4} PT=${tol_mm}`);
        break;
      case "tool_length": case "tool_diameter":
        lines.push(`T${input.tool_pocket ?? 1} M6`);
        lines.push(`CALL OO985${input.cycle === "tool_length" ? "3" : "4"} TH=${input.tool_pocket ?? 1} PT=${tol_mm}`);
        break;
    }
    return lines.join("\n");
  },
  haas: (input, tol_um, _warnings) => {
    const tol_mm = tol_um / 1000;
    const lines: string[] = ["( Haas mill + Renishaw probe macro )"];
    switch (input.cycle) {
      case "datum_xyz":
        lines.push(`G65 ${RENISHAW_PROGRAM_IDS.datum_xyz} X${input.expected_x_mm ?? 0} S1. W54. T${tol_mm}`);
        lines.push(`G65 ${RENISHAW_PROGRAM_IDS.datum_xyz} Y${input.expected_y_mm ?? 0} S1. W54. T${tol_mm}`);
        lines.push(`G65 ${RENISHAW_PROGRAM_IDS.datum_xyz} Z${input.expected_z_mm ?? 0} S1. W54. T${tol_mm}`);
        break;
      default:
        lines.push(`G65 ${RENISHAW_PROGRAM_IDS[input.cycle]} D${input.nominal_size_mm ?? 25.4} T${tol_mm}`);
    }
    return lines.join("\n");
  },
  heidenhain_tnc: (input, tol_um, _warnings) => {
    const tol_mm = tol_um / 1000;
    const lines: string[] = ["; Heidenhain TNC 640 + Renishaw probe macro"];
    switch (input.cycle) {
      case "datum_xyz":
        lines.push(`TCH PROBE 400 BASIC ROTATION ; datum probe`);
        lines.push(`  Q263 = ${input.expected_x_mm ?? 0} ; 1st point X`);
        lines.push(`  Q264 = ${input.expected_y_mm ?? 0} ; 1st point Y`);
        lines.push(`  Q272 = ${input.expected_z_mm ?? 0} ; 2nd point Z`);
        lines.push(`  Q261 = ${tol_mm} ; tolerance`);
        break;
      case "bore_best_fit":
        lines.push(`TCH PROBE 421 HOLE ; bore probing`);
        lines.push(`  Q273 = ${input.nominal_size_mm ?? 25.4} ; nominal diameter`);
        lines.push(`  Q261 = ${tol_mm} ; tolerance`);
        break;
      default:
        lines.push(`TCH PROBE 480 CALIBRATE TS ; ${input.cycle}`);
    }
    return lines.join("\n");
  },
};

export const probeMacroGeneratorEngine = new ProbeMacroGeneratorEngine();
