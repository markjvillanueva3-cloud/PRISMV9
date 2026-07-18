/**
 * wedm-cascade-correctness.mjs — the DETERMINISTIC cascade-correctness harness for
 * WEDM multi-pass / H-offset pass schedules (Regimen #3, the verifiable core that
 * the print->program gate reuses; per WEDM-TRAINING-REGIMENS-2026-05-31.md §3.2/§5).
 *
 * This is the LOAD-BEARING eval: it parses an emitted FA-10S pass schedule and
 * asserts the physics/shop invariants that make a schedule machine-runnable —
 *   1. H-offset cascade STRICTLY DECREASES rough->skim (2-axis); a non-decreasing
 *      offset is anti-pattern AP003 (wire re-cuts / leaves stock).
 *   2. TAPER (4-axis UV) schedules carry ALL H-offsets = 0 (post handles taper in
 *      UV coords; non-zero H double-compensates -> wrong angle).
 *   3. Each pass's E-code / feed / offset MATCHES the shop-calibrated oracle.
 *
 * Pure-core + injected oracle (RGS-MS1 lesson): the structural checks (parse,
 * monotonicity, taper-zero) need NO imports and are fully node:test-able. The
 * oracle-match check takes the expected passes as a PARAM — the caller produces
 * them from getECodeForPass/getShopFeedForPass/getShopOffsetForPass. So this file
 * imports nothing and runs under plain node.
 *
 * No ${...} template literals (scripts/ security hook). String concat only.
 *
 * @module scripts/lib/wedm-cascade-correctness
 */

const DEFAULT_FEED_TOL = 0.001; // ipm
const DEFAULT_OFFSET_TOL = 0.00005; // in (half a ten-thousandth)

/**
 * Parse an emitted pass-schedule into structured passes. Tolerant of the two
 * shop formats: "Pass N (type): E-code, F ipm, Hn offset X in" and the per-pass
 * "...feed F ipm (.. mm/min), Hn wire offset X in (.. mm)". Returns [] if none.
 * Reused as the print->program "program-parses" gate.
 */
export function parseScheduleText(text) {
  const out = [];
  const lines = String(text == null ? "" : text).split(/\r?\n/);
  for (const line of lines) {
    const head = line.match(/pass\s+(\d+)\s*\(([^)]+)\)/i);
    if (!head) continue;
    const ec = line.match(/\b(E\d{2,5})\b/i); // a pass line must name an E-code
    if (!ec) continue;
    const hr = line.match(/\b(H\d{1,3})\b/i);
    const feed = line.match(/(\d+(?:\.\d+)?)\s*ipm/i); // absent => operator-set => null
    // offset: prefer the explicit "offset <X> in"; fall back to any "<X> in" (the
    // ipm feed never matches because "in\b" != "ipm").
    const off = line.match(/offset\s+(\d*\.\d+|\d+)\s*in\b/i) || line.match(/(\d*\.\d+|\d+)\s*in\b/i);
    out.push({
      pass_number: Number(head[1]),
      type: head[2].trim().toLowerCase(),
      e_code: ec[1].toUpperCase(),
      feed_ipm: feed ? Number(feed[1]) : null,
      h_register: hr ? hr[1].toUpperCase() : null,
      offset_inches: off ? Number(off[1]) : null,
    });
  }
  return out;
}

/** One finding: { rule, pass, detail }. */
function v(rule, pass, detail) {
  return { rule, pass, detail };
}

/**
 * Structural check (PURE, no oracle): cascade monotonicity + taper-zero rule.
 * - taper=true  -> every offset must be exactly 0.
 * - taper=false -> offsets must strictly DECREASE pass-to-pass (AP003 guard).
 * Returns an array of violations ([] = clean).
 */
export function checkMonotonicCascade(passes, opts = {}) {
  const taper = Boolean(opts.taper);
  const viol = [];
  if (!Array.isArray(passes) || passes.length === 0) {
    return [v("empty", 0, "no passes parsed")];
  }
  if (taper) {
    for (const p of passes) {
      if (Number(p.offset_inches) !== 0) {
        viol.push(v("taper_zero", p.pass_number, "taper pass H-offset must be 0, got " + p.offset_inches));
      }
    }
    return viol;
  }
  for (let i = 1; i < passes.length; i++) {
    const prev = Number(passes[i - 1].offset_inches);
    const cur = Number(passes[i].offset_inches);
    if (!(cur < prev)) {
      viol.push(v("monotonic_decrease_AP003", passes[i].pass_number,
        "offset must strictly decrease: pass " + passes[i].pass_number + " " + cur + " >= prev " + prev));
    }
  }
  return viol;
}

/**
 * Oracle-match check (PURE; oracle injected): each emitted pass must match the
 * expected E-code / offset / feed. `expected` is [{pass_number,e_code,offset_inches,feed_ipm}]
 * produced by the caller from the tech-table getters. feed/offset compared within tol;
 * a null expected feed (operator-set) is not penalized.
 */
export function gradeAgainstExpected(passes, expected, opts = {}) {
  const feedTol = typeof opts.feedTol === "number" ? opts.feedTol : DEFAULT_FEED_TOL;
  const offTol = typeof opts.offsetTol === "number" ? opts.offsetTol : DEFAULT_OFFSET_TOL;
  const viol = [];
  if (!Array.isArray(passes) || !Array.isArray(expected)) {
    return [v("shape", 0, "passes/expected not arrays")];
  }
  if (passes.length !== expected.length) {
    viol.push(v("pass_count", 0, "emitted " + passes.length + " passes, expected " + expected.length));
  }
  const byNum = new Map(expected.map((e) => [Number(e.pass_number), e]));
  for (const p of passes) {
    const e = byNum.get(Number(p.pass_number));
    if (!e) { viol.push(v("unknown_pass", p.pass_number, "no expected pass " + p.pass_number)); continue; }
    if (String(p.e_code).toUpperCase() !== String(e.e_code).toUpperCase()) {
      viol.push(v("e_code", p.pass_number, "got " + p.e_code + " expected " + e.e_code));
    }
    if (Math.abs(Number(p.offset_inches) - Number(e.offset_inches)) > offTol) {
      viol.push(v("offset", p.pass_number, "got " + p.offset_inches + " expected " + e.offset_inches));
    }
    if (e.feed_ipm != null && p.feed_ipm != null && Math.abs(Number(p.feed_ipm) - Number(e.feed_ipm)) > feedTol) {
      viol.push(v("feed", p.pass_number, "got " + p.feed_ipm + " expected " + e.feed_ipm));
    }
  }
  return viol;
}

/**
 * Full cascade check. `passes` may be a parsed array or raw schedule text.
 * opts: { taper, expected (oracle passes for the family), feedTol, offsetTol }.
 * Returns { valid, checked, violations, passes }.
 */
export function checkCascade(passesOrText, opts = {}) {
  const passes = typeof passesOrText === "string" ? parseScheduleText(passesOrText) : passesOrText;
  // Resolve taper: an EXPLICIT opts.taper boolean always wins (back-compat — existing
  // callers pass `taper: fam.axes === 4`). When taper is NOT specified (e.g. graded model
  // generations that carry no taper flag), auto-detect from a POSITIVE declared taper
  // marker — the E28xx UV-taper E-code family or an explicit "taper_uv" toolpath type.
  // This is NOT a weakening: a 2-axis schedule never carries E28xx / "taper_uv", so it can
  // never mask a real AP003 monotonicity bug; and a taper schedule with a wrongly non-zero
  // offset still fails the taper_zero rule below. Closes the grading gap where correct
  // all-H=0 taper generations were mis-failed as monotonicity violations.
  let taper = opts.taper;
  if (typeof taper !== "boolean") {
    const text = typeof passesOrText === "string" ? passesOrText : "";
    const fromText = /\btaper_uv\b|\bE28\d{2}\b/i.test(text);
    const fromPasses = Array.isArray(passes) && passes.length > 0 &&
      passes.every((p) => /^E28\d{2}$/i.test(String(p.e_code || "")));
    taper = fromText || fromPasses;
  }
  const resolvedOpts = taper === opts.taper ? opts : { ...opts, taper };
  const violations = [];
  violations.push(...checkMonotonicCascade(passes, resolvedOpts));
  if (Array.isArray(opts.expected)) {
    violations.push(...gradeAgainstExpected(passes, opts.expected, opts));
  }
  return {
    valid: violations.length === 0,
    checked: Array.isArray(passes) ? passes.length : 0,
    violations,
    passes,
    taper_resolved: taper,
  };
}
