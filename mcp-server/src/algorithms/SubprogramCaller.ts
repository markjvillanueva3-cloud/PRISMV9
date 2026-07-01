/**
 * SubprogramCaller — Post-Processor #6.7
 * Generates a controller-correct subprogram call. Fanuc: M98 P<num> · Haas: M98 P<num> · Heidenhain: CYCL CALL LBL · Mazak: M98 P<num> · Siemens: CALL <label> · Okuma: CALL O<num>.
 */
export type SubprogramController = "fanuc" | "haas" | "heidenhain" | "mazak" | "siemens" | "okuma";

export interface SubprogramCallInput {
  controller: SubprogramController;
  /** Subprogram number/label/name. Heidenhain accepts label name; others use numeric. */
  target: string;
  /** Iteration count L<n>. Default 1. */
  iterations?: number;
}

export interface SubprogramCallResult {
  call_block: string;
  return_block: string;
  notes: string[];
  source: string;
}

const ITERS_MIN = 1;
const ITERS_MAX = 9999;
const VALID_CONTROLLER = new Set(["fanuc","haas","heidenhain","mazak","siemens","okuma"]);

function emit(reason: string): SubprogramCallResult {
  return { call_block: "", return_block: "", notes: [reason], source: "SubprogramCaller v1.0.0" };
}

export function generateCall(input: SubprogramCallInput): SubprogramCallResult {
  if (!input) return emit("missing input");
  if (!VALID_CONTROLLER.has(input.controller)) return emit(`unknown controller: ${input.controller}`);
  if (typeof input.target !== "string" || input.target.length === 0) return emit("target must be non-empty string");
  if (input.target.length > 64) return emit("target exceeds 64 chars");
  const iters = Number.isFinite(input.iterations) ? Math.floor(input.iterations!) : 1;
  if (iters < ITERS_MIN || iters > ITERS_MAX) return emit(`iterations ${iters} outside [${ITERS_MIN}, ${ITERS_MAX}]`);

  const notes: string[] = [];
  let call = "", ret = "";
  switch (input.controller) {
    case "fanuc":
    case "haas":
    case "mazak":
      if (!/^\d+$/.test(input.target)) {
        notes.push(`${input.controller}: target should be numeric (O-number); accepting verbatim`);
      }
      call = iters > 1 ? `M98 P${input.target} L${iters}` : `M98 P${input.target}`;
      ret = "M99";
      break;
    case "heidenhain":
      call = iters > 1 ? `CALL LBL "${input.target}" REP${iters}` : `CALL LBL "${input.target}"`;
      ret = `LBL 0`;
      notes.push("Heidenhain: target is LBL label name (string)");
      break;
    case "siemens":
      call = iters > 1 ? `${input.target} P${iters}` : input.target;
      ret = "M17";
      notes.push("Siemens: subroutine name called directly; M17 returns");
      break;
    case "okuma":
      if (!/^\d+$/.test(input.target)) notes.push("Okuma: numeric O-number expected");
      call = iters > 1 ? `CALL O${input.target} L${iters}` : `CALL O${input.target}`;
      ret = "RTS";
      break;
  }
  return { call_block: call, return_block: ret, notes, source: "SubprogramCaller v1.0.0" };
}

export const SubprogramCaller = { version: "1.0.0" as const, generateCall };
