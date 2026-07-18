/**
 * Tests for cad-fusion-params.mjs (slot:delta, U-CAD-FUSION-PARAMS). The emitter must turn a PRISM parametric
 * spec (templateSpec / assemblySpec) into FUSION user-parameters + parameter-equations matching the
 * Fusion360CADGeneratorAdapter contract (parameter_declare / parameter_equation), mm-native (no cm=2.54 trap),
 * with derived equations becoming Fusion expressions over the driving parameters.
 *   run: node --test scripts/lib/cad-fusion-params.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { parseEquationLine, specToFusionOps, renderFusionParams } from "./cad-fusion-params.mjs";
import { templateSpec, paramsFromDims } from "./cad-parametric-templates.mjs";
import { assemblySpec } from "./cad-parametric-assembly.mjs";

test("parseEquationLine: splits 'name = expr' and strips the trailing comment", () => {
  assert.deepEqual(parseEquationLine("inner = outer - 2*wall"), { name: "inner", expression: "outer - 2*wall" });
  assert.deepEqual(parseEquationLine("bushing_id = shaft_dia + 2*clearance     # slip fit"), { name: "bushing_id", expression: "shaft_dia + 2*clearance" });
  assert.equal(parseEquationLine("import math"), null, "not an assignment");
  assert.equal(parseEquationLine("for i in range(n):"), null, "a loop is not a parameter equation");
  assert.equal(parseEquationLine("# just a comment"), null);
});

test("specToFusionOps: driving params -> declare; derived equation -> declare(0) + equation", () => {
  const spec = templateSpec("square-tube", { outer: 38.1, wall: 6.35, length: 76.2 });
  const { ops } = specToFusionOps(spec);
  // 3 driving declares + 1 derived declare + 1 equation
  const declares = ops.filter((o) => o.op === "parameter_declare");
  const eqs = ops.filter((o) => o.op === "parameter_equation");
  assert.equal(declares.length, 4, "outer, wall, length + inner");
  assert.equal(eqs.length, 1);
  assert.deepEqual(eqs[0], { op: "parameter_equation", name: "inner", expression: "outer - 2*wall" });
  // driving values carried through in mm
  assert.deepEqual(declares.find((d) => d.name === "outer"), { op: "parameter_declare", name: "outer", value: 38.1, unit: "mm" });
  // the derived param is declared with a placeholder BEFORE its expression is set
  const innerIdx = ops.findIndex((o) => o.op === "parameter_declare" && o.name === "inner");
  const innerEqIdx = ops.findIndex((o) => o.op === "parameter_equation" && o.name === "inner");
  assert.ok(innerIdx >= 0 && innerIdx < innerEqIdx, "inner declared before its expression");
});

test("renderFusionParams: emits the adapter's exact user-parameter API, mm-native (no cm=2.54 trap)", () => {
  const spec = templateSpec("cylinder", { dia: 38.1, length: 25.4 });
  const py = renderFusionParams(spec, { header: false });
  // matches Fusion360CADGeneratorAdapter parameter_declare emit shape, explicit mm unit via createByString
  assert.match(py, /design\.userParameters\.add\("dia", adsk\.core\.ValueInput\.createByString\("38\.1 mm"\), "mm", ""\)/);
  assert.match(py, /design\.userParameters\.add\("length", adsk\.core\.ValueInput\.createByString\("25\.4 mm"\)/);
  // NEVER createByReal (a raw number would be read as cm -- the 2.54 trap)
  assert.ok(!/createByReal/.test(py), "must not use createByReal (cm trap)");
  // binary-float noise is trimmed
  const st = renderFusionParams(templateSpec("square-tube", { outer: 38.099999999999994, wall: 6.35, length: 76.2 }), { header: false });
  assert.match(st, /createByString\("38\.1 mm"\)/, "38.099999999999994 -> 38.1");
});

test("renderFusionParams: assembly fit + position equations become Fusion expressions over the drivers", () => {
  const py = renderFusionParams(assemblySpec("shaft-bushing-housing"), { header: false });
  assert.match(py, /design\.userParameters\.add\("shaft_dia", adsk\.core\.ValueInput\.createByString\("10 mm"\)/, "driving param");
  // the slip-fit + press-fit equations are Fusion expressions (comment stripped)
  assert.match(py, /design\.userParameters\.itemByName\("bushing_id"\)\.expression = "shaft_dia \+ 2\*clearance"/);
  assert.match(py, /design\.userParameters\.itemByName\("housing_bore"\)\.expression = "bushing_od - interference"/);
  assert.ok(!/# slip fit/.test(py), "the python comment from the equation source is stripped");
});

test("specToFusionOps: null/empty spec -> null; a spec with no equations -> declares only", () => {
  assert.equal(specToFusionOps(null), null);
  assert.equal(specToFusionOps({}), null);
  const cube = specToFusionOps(templateSpec("cube", { length: 50, width: 30, height: 20 }));
  assert.equal(cube.ops.length, 3, "cube has 3 driving params, no equations");
  assert.ok(cube.ops.every((o) => o.op === "parameter_declare"));
});
