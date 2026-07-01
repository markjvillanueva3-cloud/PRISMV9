#!/usr/bin/env node
/**
 * Probe 11 high-value dormant post-processor files for class/function
 * signatures so we can cross-check whether the surface is already in
 * mcp-server under a different name.
 *
 * Slot:echo · 2026-05-27 · response to /checkin-echo work order
 * "check H:/PRISM/extracted{,_modules} for dormant post processor features".
 */
import fs from "node:fs";
import path from "node:path";

const FILES = [
  "PRISM_POST_ANALYSIS_AI.js",
  "PRISM_KALMAN_CONTROLLER.js",
  "PRISM_OKUMA_OSP_CONTROL_ENGINE.js",
  "PRISM_OKUMA_THREADING_ENGINE.js",
  "PRISM_OKUMA_LATHE_GCODE_DATABASE.js",
  "PRISM_OKUMA_LATHE_MCODE_DATABASE.js",
  "PRISM_OKUMA_LATHE_INTEGRATION.js",
  "PRISM_TOOLPATH_GCODE_BRIDGE.js",
  "PRISM_MACHINE_SPECIFIC_POST_TEMPLATES.js",
  "PRISM_GUARANTEED_POST_PROCESSOR.js",
  "PRISM_GCODE_BACKPLOT_ENGINE.js",
  "PRISM_UNIVERSAL_POST_GENERATOR_V2.js",
  "PRISM_POST_PROCESSOR_DEVELOPMENT_ENGINE.js",
  "PRISM_OPTIMIZED_POSTS_V2.js",
  "PRISM_VERIFIED_POST_DATABASE_V2.js",
  "PRISM_POST_PROCESSOR_GENERATOR.js",
  "PRISM_INTERNAL_POST_ENGINE.js",
  "PRISM_ENHANCED_POST_DATABASE_V2.js",
  "PRISM_POST_PROCESSOR_UI.js",
  "PRISM_CONTROLLER_OUTPUT.js",
];

const ROOTS = [
  "H:/PRISM/extracted_modules/complete_extraction",
  "H:/PRISM/extracted_modules/COMPLETE",
  "H:/PRISM/extracted_modules/GIANT",
  "H:/PRISM/extracted_modules/priority_extraction",
  "H:/PRISM/extracted/engines/post_processor",
  "H:/PRISM/extracted/engines/optimization",
];

const reClass = /class\s+(\w+)/g;
const reFunc = /\bfunction\s+(\w+)/g;
const reExport = /(?:module\.exports|exports)\s*\.?\s*(\w+)\s*=/g;
const reConst = /\b(?:const|let|var)\s+([A-Z]\w+)\s*=/g;
const reHeader = /^\s*\/\*[\s\S]*?\*\//;

for (const fname of FILES) {
  let found = null;
  for (const r of ROOTS) {
    const p = path.join(r, fname);
    if (fs.existsSync(p)) { found = p; break; }
  }
  if (!found) { console.log(`-- ${fname} (MISSING from probe roots)`); continue; }
  const stat = fs.statSync(found);
  const content = fs.readFileSync(found, "utf-8");
  const headerMatch = content.match(reHeader);
  const header = headerMatch ? headerMatch[0].split("\n").slice(0, 3).map(l => l.replace(/^\s*[\/\*]+\s*/, "").trim()).filter(l => l && !l.startsWith("=") && l.length > 5).slice(0, 2) : [];
  const classes = [...content.matchAll(reClass)].map(m => m[1]).slice(0, 5);
  const funcs = [...content.matchAll(reFunc)].map(m => m[1]).slice(0, 8);
  const exports = [...content.matchAll(reExport)].map(m => m[1]).slice(0, 5);
  const constants = [...content.matchAll(reConst)].map(m => m[1]).slice(0, 5);

  console.log(`\n== ${fname}  (${(stat.size/1024).toFixed(1)}KB)`);
  if (header.length) console.log(`   header: ${header.join(" | ")}`);
  if (classes.length) console.log(`   classes: ${classes.join(", ")}`);
  if (funcs.length) console.log(`   funcs:   ${funcs.join(", ")}`);
  if (exports.length) console.log(`   exports: ${exports.join(", ")}`);
  if (constants.length) console.log(`   consts:  ${constants.join(", ")}`);
}
