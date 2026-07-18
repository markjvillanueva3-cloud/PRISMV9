/**
 * HSMSmoothingFilter — Mill #3.3
 * Emits the controller's high-speed-machining corner-smoothing dialect:
 *   Fanuc AICC2: G05.1 Q1 / G05.1 Q0
 *   Haas SS:    G187 P[1-3]
 *   Heidenhain TCPM: M128 / M129 (with TA tolerance)
 *   Mazak HMS:  G61.1 Pn
 *   Siemens:    SOFT / COMPCAD / TRAFOOF
 *   Okuma:      G09 / G91.1 (NURBS look-ahead)
 */
export type HSMController = "fanuc" | "haas" | "heidenhain" | "mazak" | "siemens" | "okuma";
export type HSMMode = "off" | "rough" | "semi" | "finish";

export interface HSMFilterInput {
  controller: HSMController;
  mode: HSMMode;
  /** Path tolerance mm — affects controller-specific T-word. Default 0.01mm finish, 0.05 semi, 0.10 rough. */
  path_tolerance_mm?: number;
}

export interface HSMFilterResult {
  enable_block: string;
  disable_block: string;
  tolerance_used_mm: number;
  notes: string[];
  source: string;
}

const HSM_VALID = new Set(["off","rough","semi","finish"]);
const DEFAULT_TOL: Record<HSMMode, number> = { off: 0, rough: 0.10, semi: 0.05, finish: 0.01 };

function emit(reason: string): HSMFilterResult {
  return { enable_block: "", disable_block: "", tolerance_used_mm: 0, notes: [reason], source: "HSMSmoothingFilter v1.0.0" };
}

export function generate(input: HSMFilterInput): HSMFilterResult {
  if (!input) return emit("missing input");
  if (!["fanuc","haas","heidenhain","mazak","siemens","okuma"].includes(input.controller)) return emit(`unknown controller: ${input.controller}`);
  if (!HSM_VALID.has(input.mode)) return emit(`unknown mode: ${input.mode}`);
  if (input.path_tolerance_mm !== undefined && (!Number.isFinite(input.path_tolerance_mm) || input.path_tolerance_mm < 0 || input.path_tolerance_mm > 1)) return emit(`path_tolerance_mm ${input.path_tolerance_mm} outside [0, 1]`);
  const tol = Number.isFinite(input.path_tolerance_mm) ? input.path_tolerance_mm! : DEFAULT_TOL[input.mode];

  if (input.mode === "off") {
    const off: Record<HSMController, [string, string]> = {
      fanuc: ["G05.1 Q0", "(HSM AICC2 already off)"],
      haas: ["G187 P0", "(SS smoothing already off)"],
      heidenhain: ["M129", "(TCPM already off)"],
      mazak: ["G61.1 P0", "(HMS already off)"],
      siemens: ["TRAFOOF", "(transformation already off)"],
      okuma: ["G09", "(NURBS look-ahead off)"],
    };
    return { enable_block: off[input.controller][0], disable_block: off[input.controller][1], tolerance_used_mm: 0, notes: ["mode=off: disable block only"], source: "HSMSmoothingFilter v1.0.0" };
  }

  const pLevel = input.mode === "finish" ? 1 : input.mode === "semi" ? 2 : 3;
  let enable = "", disable = "";
  const notes: string[] = [];
  switch (input.controller) {
    case "fanuc": enable = `G05.1 Q1 R${tol.toFixed(3)}`; disable = "G05.1 Q0"; break;
    case "haas":  enable = `G187 P${pLevel} E${tol.toFixed(3)}`; disable = "G187 P0"; break;
    case "heidenhain": enable = `M128 F1000 TA${tol.toFixed(3)}`; disable = "M129"; notes.push("Heidenhain TCPM: TA = path tolerance in mm; verify M128 is supported on machine"); break;
    case "mazak": enable = `G61.1 P${pLevel}`; disable = "G61.1 P0"; break;
    case "siemens": enable = input.mode === "finish" ? "SOFT" : "COMPCAD"; disable = "TRAFOOF"; notes.push("Siemens: SOFT for finish (acceleration-smoothed); COMPCAD for rough/semi (compressor)"); break;
    case "okuma": enable = `G91.1 R${tol.toFixed(3)}`; disable = "G09"; notes.push("Okuma NURBS look-ahead: G91.1 with tolerance R-word"); break;
  }
  return { enable_block: enable, disable_block: disable, tolerance_used_mm: tol, notes, source: "HSMSmoothingFilter v1.0.0" };
}

export const HSMSmoothingFilter = { version: "1.0.0" as const, generate };
