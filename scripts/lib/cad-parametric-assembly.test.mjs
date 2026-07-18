/**
 * Tests for cad-parametric-assembly.mjs (slot:delta, U-CAD-ASSEMBLY). A parametric assembly must:
 *  - drive every component dimension AND placement from shared named variables via EQUATIONS (fit + position);
 *  - recompute the whole assembly when one driving variable changes (proven live: shaft_dia 10->16 flows
 *    through bushing_id = shaft_dia + 2*clearance to every mating radius);
 *  - reject a non-driving / non-positive override (R12).
 *   run: node --test scripts/lib/cad-parametric-assembly.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { ASSEMBLY_TEMPLATES, renderAssemblyScript, alterAssembly, assemblySpec, hasAssembly, assemblyNames } from "./cad-parametric-assembly.mjs";

test("renderAssemblyScript: shaft-bushing-housing has driving VARIABLES + FIT EQUATIONS (not literals)", () => {
  const s = renderAssemblyScript("shaft-bushing-housing");
  assert.match(s, /^shaft_dia = 10\b/m, "shaft_dia is a named driving variable");
  // the fit relationships are EQUATIONS over the drivers, not baked numbers
  assert.match(s, /^bushing_id = shaft_dia \+ 2\*clearance/m, "slip-fit equation");
  assert.match(s, /^housing_bore = bushing_od - interference/m, "press-fit equation");
  assert.match(s, /^bushing_z = \(shaft_len - bushing_len\) \/ 2/m, "position equation");
  // geometry uses the derived names; placement uses the position equation, never a literal Vector
  assert.match(s, /circle\(bushing_id\/2\)/);
  assert.match(s, /loc=cq\.Location\(cq\.Vector\(0, 0, bushing_z\)\)/);
  assert.match(s, /assy\.export\(/, "exports the assembly (not .save -- deprecated)");
});

test("renderAssemblyScript: bolt-circle positions are trig EQUATIONS over the bolt-circle radius", () => {
  const s = renderAssemblyScript("bolt-circle-plate");
  assert.match(s, /^bc_radius = bolt_circle_dia \/ 2/m);
  assert.match(s, /x = bc_radius \* math\.cos\(angle\)/, "bolt x = R*cos(theta) -- position by equation");
  assert.match(s, /angle = i \* 2 \* math\.pi \/ bolt_count/, "even angular spacing");
});

test("alterAssembly: override a driving var; fit/position equations recompute (proven live shaft_dia 10->16)", () => {
  const { values, changed } = alterAssembly("shaft-bushing-housing", { shaft_dia: 16 });
  assert.deepEqual(changed, ["shaft_dia"]);
  assert.equal(values.shaft_dia, 16);
  assert.equal(values.clearance, 0.05, "untouched driver keeps its default");
  // the rendered script now carries shaft_dia=16; bushing_id is STILL the equation (recomputes to 16+0.1 at runtime)
  const s = renderAssemblyScript("shaft-bushing-housing", values);
  assert.match(s, /^shaft_dia = 16\b/m);
  assert.match(s, /^bushing_id = shaft_dia \+ 2\*clearance/m, "the equation is unchanged -- bore tracks the new shaft_dia");
});

test("alterAssembly: rejects unknown params + non-positive values (R12 -- never silently ignore)", () => {
  assert.throws(() => alterAssembly("shaft-bushing-housing", { bushing_id: 12 }), /not a driving parameter/, "a DERIVED value is not overridable");
  assert.throws(() => alterAssembly("shaft-bushing-housing", { shaft_dia: -5 }), /must be a positive number/);
  assert.throws(() => alterAssembly("bolt-circle-plate", { bolt_count: "six" }), /must be a positive number/);
  const { changed } = alterAssembly("shaft-bushing-housing", { shaft_dia: 10 }); // == default
  assert.deepEqual(changed, [], "no-op override reports no change");
});

test("assemblySpec: CAD-agnostic spec exposes driving params + equations + build recipe", () => {
  const spec = assemblySpec("shaft-bushing-housing");
  assert.equal(spec.assembly, "shaft-bushing-housing");
  assert.ok(spec.parameters.some((p) => p.name === "clearance" && p.driving));
  assert.ok(spec.equations.some((e) => /housing_bore = bushing_od - interference/.test(e)));
  assert.ok(spec.build.some((b) => /assy\.add/.test(b)));
});

test("coverage: all assembly templates render + carry >=1 equation and an export", () => {
  assert.ok(assemblyNames().length >= 3);
  for (const n of assemblyNames()) {
    assert.ok(hasAssembly(n));
    const s = renderAssemblyScript(n);
    assert.ok(s && /assy\.export\(/.test(s), `${n} renders + exports`);
    assert.ok((ASSEMBLY_TEMPLATES[n].derived || []).length >= 1, `${n} has >=1 equation`);
  }
  assert.equal(renderAssemblyScript("not-a-real-assembly"), null);
});
