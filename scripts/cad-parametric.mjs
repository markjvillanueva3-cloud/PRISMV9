#!/usr/bin/env node
/**
 * cad-parametric.mjs -- render a text/print request as an EQUATION-BASED PARAMETRIC template instead of a
 * hard-locked script (slot:delta, U-CAD-PARAMETRIC). The deterministic emitters resolve the request to a
 * {shape, dimsMm}; this maps that to the shape's parametric template (named variables + geometric equations)
 * and prints it. Operator directive 2026-07-04: variable templates containing equations for efficiency +
 * accuracy.
 *
 *   node scripts/cad-parametric.mjs "<request>"              # runnable parametric script (variable header)
 *   node scripts/cad-parametric.mjs "<request>" --function   # reusable def make_<shape>(...) function
 *   node scripts/cad-parametric.mjs "<request>" --spec        # CAD-agnostic JSON spec (Fusion/hyperCAD/Mastercam)
 */
import { emitPrimitiveCode } from "./lib/cad-primitive-emit.mjs";
import { emitFeatureCode } from "./lib/cad-feature-emit.mjs";
import { renderParametricScript, renderParametricFunction, templateSpec, paramsFromDims, hasTemplate } from "./lib/cad-parametric-templates.mjs";

function main() {
  const argv = process.argv.slice(2);
  const mode = argv.includes("--function") ? "function" : argv.includes("--spec") ? "spec" : "script";
  const request = argv.filter((a) => !a.startsWith("--")).join(" ").trim();
  if (!request) {
    console.error('usage: node scripts/cad-parametric.mjs "<request>" [--function|--spec]');
    process.exit(2);
  }
  const e = emitPrimitiveCode(request) || emitFeatureCode(request);
  if (!e) {
    console.error("[cad-parametric] no deterministic shape for this request (it would route to the LLM); parametric templates cover the deterministic shape families only.");
    process.exit(1);
  }
  if (!hasTemplate(e.shape)) {
    console.error(`[cad-parametric] shape '${e.shape}' has no parametric template yet.`);
    process.exit(1);
  }
  const params = paramsFromDims(e.shape, e.dimsMm);
  if (mode === "function") process.stdout.write(renderParametricFunction(e.shape) + "\n");
  else if (mode === "spec") process.stdout.write(JSON.stringify(templateSpec(e.shape, params), null, 2) + "\n");
  else process.stdout.write(renderParametricScript(e.shape, params) + "\n");
}

main();
