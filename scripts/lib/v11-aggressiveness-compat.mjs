/**
 * v11-aggressiveness-compat.mjs — backward-compat shim for v8.9's single
 * global `prismAggressivenessLevel` property. v11 broke it into per-tool
 * `prismT<N>Aggressiveness` (lines 2347, 2595, 2843, 3041... in
 * HURCO_VM30i_PRISM_v11.cps) with NO global fallback path — operators
 * who upgraded from v8.9 silently lost their saved global setting and
 * fell back to the Fusion default (typically 0 / "balanced").
 *
 * This pure library resolves a tool's aggressiveness in three tiers:
 *   1. modern per-tool prismT<N>Aggressiveness if set
 *   2. legacy global prismAggressivenessLevel if per-tool unset
 *   3. DEFAULT_AGGR_LEVEL (4 = mid-range Balanced) if both unset
 *
 * All levels clamped to [1, 8] integer.
 *
 * @milestone POST-BRIDGE-SYNERGY-MS0/U-V11-AGGRESSIVENESS-RENAME-SHIM
 * @slot echo · @iter 27 · @date 2026-05-26
 */

export const LEGACY_AGGR_PROP = "prismAggressivenessLevel";
export const DEFAULT_AGGR_LEVEL = 4;
export const AGGR_MIN = 1;
export const AGGR_MAX = 8;

/** Pure: clamp + integer-coerce an aggressiveness level. Invalid → null. */
export function clampLevel(value) {
  if (value == null) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const intVal = Math.floor(n);
  if (intVal < AGGR_MIN) return AGGR_MIN;
  if (intVal > AGGR_MAX) return AGGR_MAX;
  return intVal;
}

/** Pure: resolve an aggressiveness level using the 3-tier waterfall. */
export function resolveAggressiveness(globalLevel, perToolLevel) {
  const perTool = clampLevel(perToolLevel);
  if (perTool !== null) {
    return { level: perTool, source: "per_tool" };
  }
  const global = clampLevel(globalLevel);
  if (global !== null) {
    return { level: global, source: "legacy_global" };
  }
  return { level: DEFAULT_AGGR_LEVEL, source: "default" };
}

/** Pure: derive the per-tool property name v11 expects for tool number N. */
export function perToolPropName(toolNumber) {
  const n = Number(toolNumber);
  if (!Number.isFinite(n) || n <= 0 || Math.floor(n) !== n) return null;
  return `prismT${n}Aggressiveness`;
}

/** Pure: render a one-line operator notice when the legacy global path is used. */
export function migrationNotice(globalLevel) {
  const clamped = clampLevel(globalLevel);
  if (clamped === null) return null;
  return `(PRISM: legacy prismAggressivenessLevel=${clamped} mapped to per-tool default; set prismT<N>Aggressiveness to override)`;
}

/** Pure: resolve aggressiveness for all tools using a property-bag accessor. */
export function resolveAllTools(propGetter, toolNumbers) {
  if (typeof propGetter !== "function" || !Array.isArray(toolNumbers)) return [];
  const globalRaw = propGetter(LEGACY_AGGR_PROP);
  return toolNumbers.map((t) => {
    const propName = perToolPropName(t);
    const perToolRaw = propName ? propGetter(propName) : null;
    const resolved = resolveAggressiveness(globalRaw, perToolRaw);
    return {
      tool: t,
      propName,
      level: resolved.level,
      source: resolved.source,
    };
  });
}
