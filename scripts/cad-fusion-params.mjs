#!/usr/bin/env node
/**
 * cad-fusion-params.mjs -- emit FUSION 360 user-parameters + parameter-equations for a parametric part or
 * assembly (slot:delta, U-CAD-FUSION-PARAMS). Roadmap P4: the canonical PRISM parametric template rendered
 * into a real editable Fusion parameter set (change a parameter in Fusion -> the equations recompute).
 *
 *   node scripts/cad-fusion-params.mjs "<part request>"          # part -> Fusion user-parameters
 *   node scripts/cad-fusion-params.mjs --assembly <name>          # assembly -> Fusion user-parameters
 *   node scripts/cad-fusion-params.mjs --assembly <name> --set shaft_dia=16
 */
import { emitPrimitiveCode } from "./lib/cad-primitive-emit.mjs";
import { emitFeatureCode } from "./lib/cad-feature-emit.mjs";
import { templateSpec, paramsFromDims, hasTemplate } from "./lib/cad-parametric-templates.mjs";
import { assemblySpec, alterAssembly, hasAssembly, assemblyNames } from "./lib/cad-parametric-assembly.mjs";
import { renderFusionParams } from "./lib/cad-fusion-params.mjs";

function main() {
  const argv = process.argv.slice(2);
  const overrides = {};
  for (let i = 0; i < argv.length; i++) if (argv[i] === "--set") { const kv = argv[++i] || ""; const eq = kv.indexOf("="); if (eq > 0) overrides[kv.slice(0, eq).trim()] = kv.slice(eq + 1).trim(); }
  const ai = argv.indexOf("--assembly");

  if (ai !== -1) {
    const name = argv[ai + 1];
    if (!name || !hasAssembly(name)) { console.error(`[cad-fusion-params] unknown assembly (have: ${assemblyNames().join(", ")})`); process.exit(1); }
    let values; try { values = alterAssembly(name, overrides).values; } catch (e) { console.error(`[cad-fusion-params] ${e.message}`); process.exit(1); }
    process.stdout.write(renderFusionParams(assemblySpec(name, values)) + "\n");
    return;
  }

  const request = argv.filter((a) => !a.startsWith("--") && argv[argv.indexOf(a) - 1] !== "--set").join(" ").trim();
  if (!request) { console.error('usage: node scripts/cad-fusion-params.mjs "<request>" | --assembly <name> [--set var=val]'); process.exit(2); }
  const e = emitPrimitiveCode(request) || emitFeatureCode(request);
  if (!e || !hasTemplate(e.shape)) { console.error("[cad-fusion-params] no parametric template for this request."); process.exit(1); }
  process.stdout.write(renderFusionParams(templateSpec(e.shape, paramsFromDims(e.shape, e.dimsMm))) + "\n");
}

main();
