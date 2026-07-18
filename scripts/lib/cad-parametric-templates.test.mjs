/**
 * Tests for cad-parametric-templates.mjs (slot:delta, U-CAD-PARAMETRIC). The equation-based templates must:
 *  - emit the driving dimensions as NAMED VARIABLES (not baked literals) at the top of the script;
 *  - express the geometry over those variable names + the derived EQUATIONS (radius = dia/2, inner =
 *    outer - 2*wall, construction = size - 2*inset, groove floor = dia/2 - depth, ...);
 *  - map an emitter's dimsMm to the driving params (incl. the square-tube outer/inner -> outer/wall remap);
 *  - reproduce the hard-coded emit's geometry EXACTLY (proven live in the build; here a structural check).
 *   run: node --test scripts/lib/cad-parametric-templates.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { TEMPLATES, renderParametricScript, renderParametricFunction, paramsFromDims, templateSpec, hasTemplate, alterParams, alterScript } from "./cad-parametric-templates.mjs";

test("renderParametricScript: driving dims become NAMED VARIABLES + the geometry uses them (not literals)", () => {
  const s = renderParametricScript("cylinder", { dia: 38.1, length: 25.4 });
  assert.match(s, /^dia = 38\.1\b/m, "dia is a named variable");
  assert.match(s, /^length = 25\.4\b/m, "length is a named variable");
  assert.match(s, /result = cq\.Workplane\("XY"\)\.circle\(dia\/2\)\.extrude\(length\)/, "geometry uses the variable names + the radius=dia/2 equation");
  assert.ok(!/circle\(19\.05\)/.test(s), "the radius is NOT a baked literal -- it is dia/2");
});

test("paramsFromDims: default is positional zip; square-tube remaps [outer,inner,len] -> {outer,wall,len}", () => {
  assert.deepEqual(paramsFromDims("counterbore", [38.1, 25.4, 12.7, 19.05, 9.525]),
    { base_dia: 38.1, base_height: 25.4, bore_dia: 12.7, cbore_dia: 19.05, cbore_depth: 9.525 });
  // square tube emitter stores [outer, inner, length]; the template is driven by outer/wall/length -> wall=(o-i)/2
  const p = paramsFromDims("square-tube", [38.1, 25.4, 76.2]);
  assert.ok(Math.abs(p.outer - 38.1) < 1e-9 && Math.abs(p.wall - 6.35) < 1e-9 && Math.abs(p.length - 76.2) < 1e-9, "wall = (38.1-25.4)/2 = 6.35");
});

test("renderParametricScript: derived EQUATIONS appear for square-tube (inner) + corner-holes (constr)", () => {
  const st = renderParametricScript("square-tube", { outer: 38.1, wall: 6.35, length: 76.2 });
  assert.match(st, /^inner = outer - 2\*wall$/m, "square tube derives inner as an equation");
  assert.match(st, /\.rect\(inner, inner\)/, "geometry uses the derived inner");
  const ch = renderParametricScript("corner-holes", { size: 50.8, thickness: 9.525, hole_dia: 12.7, inset: 9.525 });
  assert.match(ch, /^constr = size - 2\*inset$/m, "corner holes derive the construction-rect size");
  assert.match(ch, /\.rect\(constr, constr, forConstruction=True\)/, "geometry uses the derived constr");
});

test("renderParametricScript: validity relationships are emitted as assertions (accuracy guard)", () => {
  const s = renderParametricScript("counterbore", { base_dia: 38.1, base_height: 25.4, bore_dia: 12.7, cbore_dia: 19.05, cbore_depth: 9.525 });
  assert.match(s, /assert cbore_dia > bore_dia/, "the counterbore relationship is asserted");
  // opts.assert=false suppresses the assertions (for CAD targets that validate elsewhere)
  assert.ok(!/assert /.test(renderParametricScript("counterbore", { base_dia: 38.1, base_height: 25.4, bore_dia: 12.7, cbore_dia: 19.05, cbore_depth: 9.525 }, { assert: false })));
});

test("renderParametricFunction: reusable def make_<shape>(driving params) with equations + return", () => {
  const fn = renderParametricFunction("counterbore");
  assert.match(fn, /^def make_counterbore\(base_dia, base_height, bore_dia, cbore_dia, cbore_depth\):/m);
  assert.match(fn, /return cq\.Workplane\("XY"\)\.circle\(base_dia\/2\)/);
  // a derived-equation template carries the equation inside the function body
  assert.match(renderParametricFunction("square-tube"), /\n {4}inner = outer - 2\*wall\n/);
});

test("templateSpec: CAD-agnostic spec separates driving params / equations / constraints / geometry", () => {
  const spec = templateSpec("shaft-groove", { dia: 19.05, length: 63.5, groove_width: 2.3825, groove_depth: 1.5875, groove_pos: 9.525 });
  assert.equal(spec.shape, "shaft-groove");
  assert.equal(spec.parameters.length, 5);
  assert.equal(spec.parameters[0].name, "dia");
  assert.equal(spec.parameters[0].value, 19.05);
  assert.equal(spec.parameters[0].unit, "mm");
  assert.ok(spec.equations.some((e) => /floor_r = dia\/2 - groove_depth/.test(e)), "the groove-floor equation is exposed");
  assert.ok(spec.constraints.length > 0, "validity constraints exposed");
  assert.ok(/\.cut\(/.test(spec.geometry), "geometry recipe exposed");
});

test("coverage: every shape the emitters produce has a parametric template", () => {
  // the 20 shape families shipped by the emitter series (#1-#14)
  const shapes = ["cube", "cylinder", "tube", "cone", "square-tube", "box-hole", "round-hole", "counterbore",
    "bore-keyway", "stepped-shaft", "two-body", "shouldered-disc", "chamfer-box", "chamfer-cyl", "pocket-box",
    "plate-slot", "plate-thruslot", "shaft-keyway", "shaft-groove", "v-groove", "corner-holes"];
  for (const sh of shapes) assert.ok(hasTemplate(sh), `template missing for ${sh}`);
  // and every template renders a non-null function
  for (const sh of Object.keys(TEMPLATES)) assert.ok(renderParametricFunction(sh), `no function for ${sh}`);
});

test("alterParams: override a DRIVING dim; derived values recompute via the script equation (not overridable)", () => {
  const base = { outer: 38.1, wall: 6.35, length: 76.2 };
  const { params, changed } = alterParams("square-tube", base, { outer: 50.8 });
  assert.deepEqual(changed, ["outer"]);
  assert.equal(params.outer, 50.8);
  assert.equal(params.wall, 6.35, "wall unchanged");
  // `inner` is DERIVED -> not a driving param -> cannot be overridden directly (it recomputes: 50.8-2*6.35)
  assert.throws(() => alterParams("square-tube", base, { inner: 40 }), /not a driving parameter/);
  // the re-rendered script carries the new outer + the SAME equation (inner recomputes at runtime)
  const s = alterScript("square-tube", base, { outer: 50.8 });
  assert.match(s, /^outer = 50\.8\b/m);
  assert.match(s, /^inner = outer - 2\*wall$/m, "the equation is unchanged -- inner tracks the new outer");
});

test("alterParams: rejects unknown params, non-positive values, keeps unchanged (R12 -- never silently ignore)", () => {
  const base = { dia: 44.5, length: 12.7 };
  assert.throws(() => alterParams("cylinder", base, { radius: 10 }), /not a driving parameter of cylinder/);
  assert.throws(() => alterParams("cylinder", base, { dia: -5 }), /must be a positive number/);
  assert.throws(() => alterParams("cylinder", base, { dia: "abc" }), /must be a positive number/);
  const { changed } = alterParams("cylinder", base, { dia: 44.5 }); // same value
  assert.deepEqual(changed, [], "no-op override is not reported as a change");
  // multi-param alter
  const { params, changed: c2 } = alterParams("counterbore", { base_dia: 38.1, base_height: 25.4, bore_dia: 12.7, cbore_dia: 19.05, cbore_depth: 9.525 }, { base_dia: 50, bore_dia: 16 });
  assert.deepEqual(c2.sort(), ["base_dia", "bore_dia"]);
  assert.equal(params.base_dia, 50); assert.equal(params.bore_dia, 16); assert.equal(params.cbore_dia, 19.05);
});

test("renderParametricScript: null on unknown shape or a missing driving dimension (R12 -- no half a part)", () => {
  assert.equal(renderParametricScript("not-a-shape", {}), null);
  assert.equal(renderParametricScript("cylinder", { dia: 38.1 }), null, "missing length -> null, never emit an incomplete part");
});
