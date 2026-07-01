#!/usr/bin/env node
/**
 * inline-const-classify.mjs (DISCOVERY-EFFICIENCY, slot:tango 2026-06-15)
 *
 * Pure classifier for inline Kienzle kc1.1 physics constants. Separates the
 * "matches-canonical" subset (equals an ISO-group representative -> an unambiguous
 * refactor-to-import candidate) from the "divergent" subset (a value that is NOT a
 * group representative).
 *
 * IMPORTANT (verified on live data, slot:tango 2026-06-15): divergent is NOT
 * auto-a-bug. The 6 canonical values are per-ISO-GROUP representatives; real engines
 * legitimately carry per-MATERIAL kc1.1 tables that differ from the group value by
 * design (KienzleForceModelEngine line 260: AISI 1045 = 1780, iso_group P;
 * CryogenicCuttingEngine: aluminium = 750). Divergent therefore means "review whether
 * this should reference MATERIAL_DB instead of an inline table" -- a physics-reviewer
 * triage signal, occasionally a real drift bug (the historical CryogenicCutting
 * 1500/0.26-below-ISO-3685 case), but mostly legitimate.
 *
 * Canonical kc1.1 per ISO group (constants.ts KIENZLE_BY_ISO):
 *   P=1800  M=2100  K=1100  N=700  S=2800  H=3200.
 *
 * Motivation: the legacy assess-engine-algo-improvements.mjs regex matched only the
 * CANONICAL values, so it flagged the matches-canonical subset and was BLIND to any
 * non-canonical value. This classifier broadens the VALUE side to ANY number and
 * splits the two so the clean refactor candidates are separable from the triage set.
 *
 * No FS / no side effects -- safe to import + unit-test in isolation.
 *
 * @module scripts/lib/inline-const-classify
 */

// Canonical kc1.1 values (N/mm^2) for ISO groups P/M/K/N/S/H (constants.ts).
export const CANONICAL_KC = new Set([1800, 2100, 1100, 700, 2800, 3200]);

// Matches an inline kc1.1 definition: `kc1_1: 1800`, `kc11 = 1500`, `kc1.1: 700.0`.
// Field-name forms mirror the legacy detector (kc1 / kc1_1 / kc1.1 / kc11); the
// VALUE side is broadened to ANY 2-5 digit number (optionally decimal) so divergent
// values are caught (the legacy regex matched only canonical values).
export const INLINE_KC_VAL_RE = /\bkc1[_.]?1?\b\s*[:=]\s*(\d{2,5})(?:\.\d+)?/g;

/**
 * Classify every inline kc1.1 definition in a source string.
 * @param {string} src TypeScript/JS source text.
 * @returns {{values:number[], divergent:number[], matchesCanonical:number[]}}
 *   values          -- every inline kc1.1 number found (rounded to integer N/mm^2).
 *   divergent       -- the subset NOT equal to a canonical group value (per-material
 *                      values or drift; a triage signal, NOT an auto-confirmed bug).
 *   matchesCanonical-- the subset that equals a canonical value (refactor candidates).
 */
export function classifyInlineKc(src) {
  const values = [];
  const divergent = [];
  const matchesCanonical = [];
  if (typeof src !== "string" || src.length === 0) return { values, divergent, matchesCanonical };
  for (const m of src.matchAll(INLINE_KC_VAL_RE)) {
    const v = Number(m[1]);
    if (!Number.isFinite(v)) continue;
    values.push(v);
    if (CANONICAL_KC.has(v)) matchesCanonical.push(v);
    else divergent.push(v);
  }
  return { values, divergent, matchesCanonical };
}
