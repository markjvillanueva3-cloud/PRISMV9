/**
 * units-guard.mjs — FLEET-WIDE units-first guard. Resolve inch vs mm from the SOURCE before any
 * geometry/tool/holder/feed/stock/program math. A units mismatch is a 25.4x scale error (see
 * memory feedback_check_units_first: kilo built a part in metric while it was in inches → tool +
 * holder 25.4x too big). NEVER assume units; if unknown, STOP and verify.
 *
 *   detectUnits(source)        → { units: "inch"|"mm"|"unknown", evidence, confidence }
 *   requireUnits(source, opts) → same, but THROWS when units cannot be determined
 *   assertUnitsMatch(exp, act) → THROWS on mismatch (with the 25.4x warning)
 *   convert(value, from, to)   → number  ·  mmToInch / inchToMm  ·  MM_PER_INCH
 *   scaleAnomaly(value, units, kind) → flags a value that looks like the wrong unit regime
 *
 * Pure, dependency-free. Import anywhere: `import { requireUnits } from "./lib/units-guard.mjs"`.
 */

export const MM_PER_INCH = 25.4;
export const mmToInch = (v) => Number(v) / MM_PER_INCH;
export const inchToMm = (v) => Number(v) * MM_PER_INCH;

/** Normalize any unit string/marker to "inch" | "mm" | the lowercased input. */
export function normUnits(u) {
  const s = String(u == null ? "" : u).toLowerCase().trim();
  if (s === "inch" || s === "in" || s === "inches" || s === "imperial" || s === '"') return "inch";
  if (s === "mm" || s === "millimeter" || s === "millimeters" || s === "millimetre" || s === "metric") return "mm";
  if (/\binch|imperial\b/.test(s)) return "inch";
  if (/\bmm\b|milli|metric/.test(s)) return "mm";
  return s;
}

const mk = (units, evidence, confidence) => ({ units, evidence, confidence });

/**
 * Determine units from an authoritative source: an object with .units/.unit, an NC/G-code string
 * (G20/G21, G70/G71), or a STEP string (CONVERSION_BASED_UNIT 0.0254 = inch; SI MILLI METRE = mm).
 * Returns units:"unknown" (confidence 0) when there is NO evidence — the caller must then STOP.
 */
export function detectUnits(source) {
  if (source && typeof source === "object" && !Array.isArray(source)) {
    const raw = source.units ?? source.unit ?? source.system;
    if (raw != null) {
      const n = normUnits(raw);
      if (n === "inch" || n === "mm") return mk(n, "explicit units field", 1);
    }
  }
  const text = source == null ? "" : String(source);
  if (!text.trim()) return mk("unknown", "empty source", 0);

  // NC / G-code dialect
  if (/(^|\s)G20(\s|$)/m.test(text)) return mk("inch", "NC G20", 1);
  if (/(^|\s)G21(\s|$)/m.test(text)) return mk("mm", "NC G21", 1);
  if (/(^|\s)G70(\s|$)/m.test(text)) return mk("inch", "NC G70", 0.9);
  if (/(^|\s)G71(\s|$)/m.test(text)) return mk("mm", "NC G71", 0.9);

  // STEP / CAD. NOTE: a STEP can declare an SI base unit (.METRE.) AND a CONVERSION_BASED_UNIT
  // that the geometry actually references — the CONVERSION_BASED_UNIT wins (real catch: Kurt-DX6
  // .STEP has SI_UNIT .METRE. base lines but CONVERSION_BASED_UNIT('INCH'), and a 13.2 extent = inch).
  const hasInchConv = /CONVERSION_BASED_UNIT\s*\(\s*'IN(?:CH|CHES)?'/i.test(text) || (/CONVERSION_BASED_UNIT/i.test(text) && /0\.0254/.test(text));
  if (hasInchConv) return mk("inch", "STEP CONVERSION_BASED_UNIT 'INCH'", 1);
  if (/\.MILLI\.\s*,\s*\.METRE\./i.test(text)) return mk("mm", "STEP SI_UNIT MILLI METRE", 1);
  // bare SI metre with NO inch conversion → mm (millimeters are the metre-based CAD default)
  if (/SI_UNIT\s*\(\s*\$?\s*,\s*\.METRE\./i.test(text)) return mk("mm", "STEP SI_UNIT METRE (no inch conversion)", 0.7);

  // weak literal hints (low confidence — verify)
  if (/\bINCHES?\b/i.test(text)) return mk("inch", "literal 'inch'", 0.5);
  if (/\bMILLIMET(?:ER|RE)S?\b/i.test(text)) return mk("mm", "literal 'millimeter'", 0.5);

  return mk("unknown", "no unit evidence in source", 0);
}

/** detectUnits but THROW when units can't be determined — enforces "check units FIRST". */
export function requireUnits(source, opts = {}) {
  const r = detectUnits(source, opts);
  if (r.units === "unknown") {
    throw new Error(
      `UNITS UNKNOWN — resolve inch vs mm from the source BEFORE proceeding (${r.evidence}).` +
      (opts.hint ? ` Hint: ${opts.hint}` : " Do not assume; check the program header / CAD unit / print title block."));
  }
  return r;
}

/** Throw if two unit markers disagree — the 25.4x guard. */
export function assertUnitsMatch(expected, actual, ctx = "") {
  const e = normUnits(expected), a = normUnits(actual);
  if (e !== a) {
    throw new Error(
      `UNITS MISMATCH${ctx ? ` (${ctx})` : ""}: expected ${e}, got ${a}. ` +
      `A ${a} value used as ${e} is off by ${MM_PER_INCH}x — STOP and reconcile units first.`);
  }
  return true;
}

export function convert(value, from, to) {
  const f = normUnits(from), t = normUnits(to);
  if (f !== "inch" && f !== "mm") throw new Error(`convert: unknown 'from' units '${from}'`);
  if (t !== "inch" && t !== "mm") throw new Error(`convert: unknown 'to' units '${to}'`);
  if (f === t) return Number(value);
  return f === "inch" ? inchToMm(value) : mmToInch(value);
}

/**
 * Heuristic: does a value look like it's in the WRONG unit regime for `kind`? Catches the kilo
 * mistake (an inch tool dia treated as mm, or vice-versa) BEFORE it scales geometry 25.4x.
 * Returns { anomaly:boolean, reason, suggestUnits } — advisory, not a hard gate.
 */
export function scaleAnomaly(value, units, kind = "toolDiameter") {
  const u = normUnits(units);
  const v = Math.abs(Number(value));
  if (!Number.isFinite(v) || v === 0 || (u !== "inch" && u !== "mm")) return { anomaly: false, reason: "n/a" };
  // plausible ranges per kind (endmill/drill dia, holder dia, stock dim)
  const RANGES = {
    toolDiameter: { inch: [0.015, 4], mm: [0.4, 100] },
    holderDiameter: { inch: [0.2, 6], mm: [5, 160] },
    stockDim: { inch: [0.05, 48], mm: [1.3, 1220] },
  };
  const r = RANGES[kind] || RANGES.toolDiameter;
  const inRange = (x, [lo, hi]) => x >= lo && x <= hi;
  if (inRange(v, r[u])) return { anomaly: false, reason: "within plausible range" };
  const other = u === "inch" ? "mm" : "inch";
  // The kilo mistake is a MISLABEL: the same number is implausible as `u` but plausible as `other`
  // (e.g. 12.7 tagged "inch" is really 12.7 mm = 0.5"). Check the raw number in the other unit's range.
  if (inRange(v, r[other]))
    return { anomaly: true, reason: `${v} is out of range for a ${kind} in ${u}, but plausible as ${other} — likely a units mislabel (a ${u}/${other} mix-up is the ${MM_PER_INCH}x error)`, suggestUnits: other };
  return { anomaly: true, reason: `${v} ${u} is outside the plausible ${kind} range — verify`, suggestUnits: null };
}
