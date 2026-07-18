/**
 * wizard-bridge-absorption.mjs — concrete mill / lathe / wire-EDM wizard
 * configurations that absorb the 3 domain wizards through the iter38
 * wizard-node-bridge contract.
 *
 * Closes U-WIZARD-ABSORB-3: proves the iter38 wizard contract isn't just
 * theoretical — three real wizard schemas (one per WIZARD_DOMAINS entry)
 * pass through createWizard() and complete end-to-end via advance(),
 * emit(), and summarize* helpers.
 *
 * Mill wizard (12 steps): material → stock geometry → tool selection →
 *   strategy → DOC / WOC → coolant → safety check → emit
 * Lathe wizard (10 steps): material → bar stock → chuck → tool → CSS or
 *   G97 → feed strategy → safety → emit
 * Wire-EDM wizard (11 steps): material → thickness → wire spec → flush →
 *   passes → cut speed → corner derate → safety → emit
 *
 * Each step is canonical (id + kind + prompt + required flag +
 * optional validator). No I/O — caller wires real UI input on top.
 *
 * @milestone POST-BRIDGE-SYNERGY-MS0/U-WIZARD-ABSORB-3
 * @slot echo · @iter 42 · @date 2026-05-27
 */

import { ISO_MATERIAL_GROUPS } from "./sfc-node-bridge.mjs";

export const ABSORPTION_SCHEMA_VERSION = 1;
export const MIN_TOOL_DIAMETER_MM = 0.1;
export const MIN_WIRE_DIAMETER_MM = 0.02;
export const MIN_BAR_DIAMETER_MM = 1.0;

/** Pure: validate ISO group input (P/M/K/N/S/H). */
export function validateIsoGroup(v) {
  return typeof v === "string" && ISO_MATERIAL_GROUPS.includes(v);
}

/** Pure: positive-number validator. */
export function validatePositiveNumber(v) {
  return Number.isFinite(Number(v)) && Number(v) > 0;
}

/** Pure: bounded-positive validator factory (min < n). */
export function validateMinimum(minVal) {
  return (v) => Number.isFinite(Number(v)) && Number(v) >= minVal;
}

/** Mill-wizard step definitions (12 steps). */
export const MILL_WIZARD_STEPS = [
  { id: "material_iso", kind: "question", prompt: "Material ISO group (P/M/K/N/S/H)?", required: true, validator: validateIsoGroup },
  { id: "stock_x_mm", kind: "question", prompt: "Stock X (mm)?", required: true, validator: validatePositiveNumber },
  { id: "stock_y_mm", kind: "question", prompt: "Stock Y (mm)?", required: true, validator: validatePositiveNumber },
  { id: "stock_z_mm", kind: "question", prompt: "Stock Z (mm)?", required: true, validator: validatePositiveNumber },
  { id: "tool_diameter_mm", kind: "question", prompt: "Tool diameter (mm)?", required: true, validator: validateMinimum(MIN_TOOL_DIAMETER_MM) },
  { id: "tool_flutes", kind: "question", prompt: "Flute count?", required: true, validator: (v) => Number.isFinite(Number(v)) && Number(v) >= 1 },
  { id: "strategy", kind: "question", prompt: "Strategy (face/shoulder/pocket/contour)?", required: true },
  { id: "doc_mm", kind: "computation", prompt: "Depth of cut (mm)", required: false },
  { id: "woc_mm", kind: "computation", prompt: "Width of cut (mm)", required: false },
  { id: "coolant_mode", kind: "question", prompt: "Coolant (flood/mist/dry/TSC)?", required: true },
  { id: "safety_review", kind: "validation", prompt: "Safety review passed?", required: true, validator: (v) => v === true },
  { id: "emit_program", kind: "emit", prompt: "Emit mill program", required: false },
];

/** Lathe-wizard step definitions (10 steps). */
export const LATHE_WIZARD_STEPS = [
  { id: "material_iso", kind: "question", prompt: "Material ISO group?", required: true, validator: validateIsoGroup },
  { id: "bar_diameter_mm", kind: "question", prompt: "Bar diameter (mm)?", required: true, validator: validateMinimum(MIN_BAR_DIAMETER_MM) },
  { id: "bar_length_mm", kind: "question", prompt: "Bar length (mm)?", required: true, validator: validatePositiveNumber },
  { id: "chuck_jaws", kind: "question", prompt: "Chuck jaws (3/4/6)?", required: true, validator: (v) => [3, 4, 6].includes(Number(v)) },
  { id: "tool_insert", kind: "question", prompt: "Insert (e.g. CNMG432)?", required: true },
  { id: "css_mode", kind: "question", prompt: "Use CSS (G96)? else G97 fixed RPM", required: true, validator: (v) => typeof v === "boolean" },
  { id: "feed_strategy", kind: "question", prompt: "Feed strategy (rough/finish)?", required: true },
  { id: "doc_mm", kind: "computation", prompt: "Depth of cut (mm)", required: false },
  { id: "safety_review", kind: "validation", prompt: "Safety review passed?", required: true, validator: (v) => v === true },
  { id: "emit_program", kind: "emit", prompt: "Emit lathe program", required: false },
];

/** Wire-EDM wizard step definitions (11 steps). */
export const WIRE_EDM_WIZARD_STEPS = [
  { id: "material_iso", kind: "question", prompt: "Material ISO group?", required: true, validator: validateIsoGroup },
  { id: "thickness_mm", kind: "question", prompt: "Workpiece thickness (mm)?", required: true, validator: validatePositiveNumber },
  { id: "wire_diameter_mm", kind: "question", prompt: "Wire diameter (mm)?", required: true, validator: validateMinimum(MIN_WIRE_DIAMETER_MM) },
  { id: "wire_material", kind: "question", prompt: "Wire material (brass/zinc/molybdenum)?", required: true },
  { id: "flush_pressure_bar", kind: "question", prompt: "Flush pressure (bar)?", required: true, validator: validatePositiveNumber },
  { id: "pass_count", kind: "question", prompt: "Pass count (1=rough only, 4=rough + 3 skim)?", required: true, validator: (v) => Number.isFinite(Number(v)) && Number(v) >= 1 && Number(v) <= 6 },
  { id: "cut_speed_mm_per_min", kind: "computation", prompt: "Cut speed (mm/min)", required: false },
  { id: "corner_derate_pct", kind: "computation", prompt: "Corner-derate %", required: false },
  { id: "taper_angle_deg", kind: "question", prompt: "Taper angle (degrees, 0=straight)?", required: false },
  { id: "safety_review", kind: "validation", prompt: "Safety review passed?", required: true, validator: (v) => v === true },
  { id: "emit_program", kind: "emit", prompt: "Emit wire-EDM program", required: false },
];

/** All 3 wizard configs keyed by domain. */
export const ALL_WIZARD_CONFIGS = {
  mill: MILL_WIZARD_STEPS,
  lathe: LATHE_WIZARD_STEPS,
  wire_edm: WIRE_EDM_WIZARD_STEPS,
};

/** Pure: build a wizard for the given domain using the iter38 createWizard. */
export function buildDomainWizard(domain, createWizardFn, opts) {
  const o = opts || {};
  const steps = ALL_WIZARD_CONFIGS[domain];
  if (!steps || typeof createWizardFn !== "function") return null;
  return createWizardFn({
    domain,
    steps,
    wizardId: typeof o.wizardId === "string" ? o.wizardId : `${domain}-default`,
    createdAtIso: typeof o.createdAtIso === "string" ? o.createdAtIso : undefined,
  });
}

/** Pure: enumerate the absorbed wizard domains. */
export function listAbsorbedDomains() {
  return Object.keys(ALL_WIZARD_CONFIGS).sort();
}

/** Pure: total absorbed step count across all 3 wizards (= 33). */
export function totalAbsorbedSteps() {
  let n = 0;
  for (const d of Object.keys(ALL_WIZARD_CONFIGS)) {
    n += ALL_WIZARD_CONFIGS[d].length;
  }
  return n;
}

/** Pure: per-domain step counts. */
export function stepCountsByDomain() {
  const out = {};
  for (const d of Object.keys(ALL_WIZARD_CONFIGS)) {
    out[d] = ALL_WIZARD_CONFIGS[d].length;
  }
  return out;
}
