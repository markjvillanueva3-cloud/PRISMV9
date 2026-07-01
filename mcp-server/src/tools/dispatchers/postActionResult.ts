/**
 * postActionResult -- honest success/failure verdict for post-processor dispatcher actions.
 * (U-PP-HONEST-SUCCESS-HELPER, slot:echo 2026-06-27)
 *
 * MANY camDispatcher post actions were written as:
 *     result = { success: true, data: (engine as any).method?.(params) ?? { note: "method not callable" } };
 * That hardcodes `success: true` over BOTH (a) the not-callable fallback object and (b) an engine
 * error/empty result -- the R12 "success:true is a lie if it emitted nothing" class the closed-loop
 * post-training harness surfaced on `master_post_unified_agi_generate`.
 *
 * This helper derives an HONEST verdict, designed to be STRICTLY SAFER than the legacy hardcode:
 * it returns `success: false` ONLY on a CONFIDENT failure signal, and otherwise preserves the legacy
 * `success: true`. So adopting it on a site can only ADD honesty (catch the clear failures) and can
 * NEVER regress a working action whose result shape this helper does not recognize (unknown shape ->
 * success:true, exactly as before). No false-negative on a real program.
 *
 * Confident failure signals (in order):
 *   1. value is null / not an object              -> the action produced nothing
 *   2. value.note matches /not callable/i          -> the dispatcher's own not-callable fallback fired
 *   3. value.success === false                     -> the engine explicitly reported failure
 *   4. a recognizably EMPTY program                -> line_count===0, or an empty gcode/lines/program
 *      field (string "" / empty array). Only fires when the shape EXPOSES such a field; a shape with
 *      no program field is left as success:true (no regression).
 */

export interface PostActionVerdict {
  success: boolean;
  error?: string;
  data: unknown;
}

/** A reason string pulled from an engine result's common error/warning fields, if present. */
function firstReason(value: Record<string, unknown>): string | undefined {
  if (typeof value.error === "string" && value.error.trim()) return value.error;
  const warnings = value.warnings;
  if (Array.isArray(warnings)) {
    const w = warnings.find((x) => typeof x === "string" && x.trim());
    if (typeof w === "string") return w;
  }
  return undefined;
}

/**
 * True when `value` exposes a program field that is recognizably EMPTY. Returns false when no
 * program field is present (unknown shape) -- so the caller keeps success:true (no false-negative).
 */
function isEmptyProgram(value: Record<string, unknown>): boolean {
  if (value.line_count === 0) return true;
  const gcode = value.gcode;
  if (typeof gcode === "string" && gcode.trim() === "") return true;
  if (Array.isArray(gcode) && gcode.length === 0) return true;
  for (const key of ["lines", "program", "nc", "output"]) {
    const v = value[key];
    if (Array.isArray(v) && v.length === 0) return true;
    if (typeof v === "string" && key !== "output" && v.trim() === "") return true;
  }
  return false;
}

/**
 * Build an honest `{ success, error?, data }` verdict for a post dispatcher action.
 * @param engineLabel  the engine name (for the error message + the no-result data stub)
 * @param value        the engine method's return value (or the `?? { note }` fallback)
 */
export function postActionResult(engineLabel: string, value: unknown): PostActionVerdict {
  if (value == null || typeof value !== "object") {
    return { success: false, error: `${engineLabel}: action returned no result`, data: { engine: engineLabel } };
  }
  const obj = value as Record<string, unknown>;

  // 1. dispatcher not-callable fallback object
  if (typeof obj.note === "string" && /not callable/i.test(obj.note)) {
    return { success: false, error: String(obj.note), data: obj };
  }
  // 2. engine explicitly reported failure
  if (obj.success === false) {
    return { success: false, error: firstReason(obj) || `${engineLabel}: reported failure`, data: obj };
  }
  // 3. recognizably empty program
  if (isEmptyProgram(obj)) {
    return { success: false, error: firstReason(obj) || `${engineLabel}: emitted an empty program`, data: obj };
  }
  // Otherwise: preserve the legacy success:true (no regression on an unrecognized shape).
  return { success: true, data: obj };
}
