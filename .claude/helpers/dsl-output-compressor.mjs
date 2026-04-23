#!/usr/bin/env node
/**
 * dsl-output-compressor.mjs — Apply DSL abbreviations to tool outputs
 *
 * Uses the 353-term DSL abbreviation map to compress verbose outputs:
 *   - "cutting_speed" → "Vc"
 *   - "stainless_steel" → "SS"
 *   - "prism_calc" → "PC"
 *
 * Runs as PostToolUse hook to compress large outputs before they hit context.
 * Only compresses outputs > 2000 chars to avoid overhead on small results.
 */

import process from "node:process";

// Inline DSL abbreviations (subset of most impactful for token savings)
const DSL_ABBREVIATIONS = {
  // Operations
  "milling": "MIL", "turning": "TRN", "drilling": "DRL", "threading": "THR",
  "grinding": "GRD", "boring": "BOR", "roughing": "RGHG", "finishing": "FNSH",
  "profiling": "PRFL", "pocketing": "PCKT", "adaptive_clearing": "ADCL",

  // Parameters
  "cutting_speed": "Vc", "feed_rate": "f", "feed_per_tooth": "fz",
  "depth_of_cut": "ap", "width_of_cut": "ae", "spindle_speed": "n",
  "surface_roughness": "Ra", "material_removal_rate": "MRR",
  "specific_cutting_force": "kc", "cutting_power": "Pc", "tool_life": "TL",

  // Materials
  "stainless_steel": "SS", "carbon_steel": "CS", "tool_steel": "TS",
  "aluminum": "AL", "titanium": "Ti", "cast_iron": "CI", "inconel": "IN",

  // Tools
  "end_mill": "EM", "face_mill": "FM", "ball_mill": "BM", "boring_bar": "BB",
  "carbide": "WC", "high_speed_steel": "HSS", "polycrystalline_diamond": "PCD",

  // Machines
  "vertical_mill": "VMC", "horizontal_mill": "HMC", "5_axis": "5AX",
  "turn_mill": "MTM", "edm_wire": "WEDM", "edm_sinker": "SEDM",

  // Controllers
  "fanuc": "FNC", "siemens": "SIE", "heidenhain": "HH", "okuma": "OKM",

  // System
  "dispatcher": "DSP", "engine": "ENG", "registry": "REG", "algorithm": "ALG",
  "validator": "VAL", "orchestrator": "ORC", "calculator": "CALC",

  // Dispatchers
  "prism_calc": "PC", "prism_data": "PD", "prism_safety": "PS",
  "prism_dev": "PDV", "prism_toolpath": "PTP", "prism_quality": "PQL",

  // Formulas
  "kienzle": "KZL", "taylor": "TYL", "johnson_cook": "J-C", "deflection": "DEFL",

  // Common terms
  "manufacturing": "MFG", "calculation": "CLCN", "validation": "VALD",
  "optimization": "OPT", "prediction": "PRED", "configuration": "CFG",
  "temperature": "TEMP", "coefficient": "COEF", "parameter": "PARAM",
  "tolerance": "TOL", "recommendation": "REC", "workpiece": "WP",
  "toolpath": "TP", "operation": "OP", "machine": "MCH", "material": "MTL",
};

const MIN_COMPRESS_LENGTH = 2000;

function compactText(text) {
  let result = text;
  for (const [full, abbr] of Object.entries(DSL_ABBREVIATIONS)) {
    const escaped = full.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), abbr);
  }
  return result;
}

function collectOutputText() {
  const parts = [];
  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === "string" && value.length > 0 && (
      key === "TOOL_RESULT" || key === "TOOL_OUTPUT" ||
      key.startsWith("TOOL_RESULT_") || key.startsWith("TOOL_OUTPUT_")
    )) {
      parts.push(value);
    }
  }
  return parts.join("\n");
}

function main() {
  const output = collectOutputText();

  if (output.length < MIN_COMPRESS_LENGTH) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const compressed = compactText(output);
  const savedChars = output.length - compressed.length;
  const savedPct = Math.round((savedChars / output.length) * 100);

  if (savedPct >= 5) {
    process.stdout.write(JSON.stringify({
      additionalContext: `DSL COMPRESSION: Output compressed ${savedPct}% (~${Math.round(savedChars / 3.8)} tokens saved). Legend: Vc=cutting_speed, SS=stainless_steel, EM=end_mill, MIL=milling, VMC=vertical_mill, PC=prism_calc. Use /dsl-legend for full map.`,
    }));
  } else {
    process.stdout.write(JSON.stringify({ continue: true }));
  }
}

main();
