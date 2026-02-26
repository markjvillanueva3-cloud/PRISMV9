/**
 * PRISM DSL Abbreviation Map — Token Density Optimization
 * ========================================================
 *
 * Maps common PRISM terms to compact abbreviations for token savings.
 * Used by the token density system to compress verbose outputs.
 *
 * @module config/dslAbbreviations
 * @version 1.0.0
 */

/** Common PRISM term abbreviations for token density optimization */
export const DSL_ABBREVIATIONS: Record<string, string> = {
  // Operations
  "milling": "MIL",
  "turning": "TRN",
  "drilling": "DRL",
  "threading": "THR",
  "grinding": "GRD",
  "boring": "BOR",
  "reaming": "REM",
  "tapping": "TAP",

  // Parameters
  "cutting_speed": "Vc",
  "feed_rate": "f",
  "feed_per_tooth": "fz",
  "depth_of_cut": "ap",
  "width_of_cut": "ae",
  "spindle_speed": "n",
  "surface_roughness": "Ra",
  "material_removal_rate": "MRR",
  "specific_cutting_force": "kc",
  "chip_thickness": "hm",

  // Materials
  "stainless_steel": "SS",
  "carbon_steel": "CS",
  "aluminum": "AL",
  "titanium": "Ti",
  "inconel": "IN",
  "cast_iron": "CI",

  // Components
  "dispatcher": "DSP",
  "engine": "ENG",
  "registry": "REG",
  "validator": "VAL",
  "orchestrator": "ORC",
  "calculator": "CALC",

  // System
  "manufacturing": "MFG",
  "calculation": "CALC",
  "validation": "VALD",
  "optimization": "OPT",
  "prediction": "PRED",
  "configuration": "CFG",
  "specification": "SPEC",
  "temperature": "TEMP",
  "coefficient": "COEF",
  "parameter": "PARAM",
  "tolerance": "TOL",
  "dimension": "DIM",
};

/** Reverse map for expansion */
export const DSL_EXPANSIONS: Record<string, string> = Object.fromEntries(
  Object.entries(DSL_ABBREVIATIONS).map(([k, v]) => [v, k])
);

/** Apply abbreviations to a text string */
export function compactText(text: string): string {
  let result = text;
  for (const [full, abbr] of Object.entries(DSL_ABBREVIATIONS)) {
    result = result.replace(new RegExp(`\\b${full}\\b`, 'gi'), abbr);
  }
  return result;
}

/** Expand abbreviations back to full terms */
export function expandText(text: string): string {
  let result = text;
  for (const [abbr, full] of Object.entries(DSL_EXPANSIONS)) {
    result = result.replace(new RegExp(`\\b${abbr}\\b`, 'g'), full);
  }
  return result;
}
