/*
 * Tests for cad-gen-worklist-expand.mjs (slot:delta). Pure deterministic generator (R9).
 * Run: node scripts/cad-gen-worklist-expand.test.mjs (node:test auto-runs on exit; pipe to tail).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { generateSpecs, existingSpecSet, newSpecs, ARCHETYPES } from "./cad-gen-worklist-expand.mjs";

test("generateSpecs: deterministic, non-empty, no unfilled template slots (no undefined/NaN)", () => {
  const a = generateSpecs();
  const b = generateSpecs();
  assert.deepEqual(a, b, "must be deterministic (no RNG)");
  assert.ok(a.length >= 30, `expected a healthy spec count, got ${a.length}`);
  for (const s of a) {
    assert.equal(typeof s, "string");
    assert.ok(s.trim().length > 0);
    assert.ok(!/undefined|NaN|\[object/.test(s), `unfilled template slot in: ${s}`);
    assert.ok(/inch/.test(s), `spec must name inch units (JM convention): ${s}`);
  }
});

test("generateSpecs: all specs unique (dimension sweeps do not collide)", () => {
  const a = generateSpecs();
  assert.equal(new Set(a).size, a.length, "generated specs must be unique");
});

test("ARCHETYPES integrity: each has name + dims[] + spec() producing an inch string", () => {
  for (const arch of ARCHETYPES) {
    assert.ok(arch.name && Array.isArray(arch.dims) && typeof arch.spec === "function", `bad archetype ${arch.name}`);
    assert.ok(arch.dims.length > 0);
    const s = arch.spec(arch.dims[0]);
    assert.ok(typeof s === "string" && /inch/.test(s), `archetype ${arch.name} spec invalid: ${s}`);
  }
});

test("existingSpecSet: parses specs, skips blanks + # comments", () => {
  const set = existingSpecSet("a 1.0 inch cube\n\n# comment\na bushing: 1.0 inch outer diameter\n");
  assert.equal(set.has("a 1.0 inch cube"), true);
  assert.equal(set.has("a bushing: 1.0 inch outer diameter"), true);
  assert.equal(set.size, 2);
});

test("newSpecs: excludes specs already in the worklist (idempotent re-run)", () => {
  const gen = generateSpecs();
  const existing = new Set([gen[0], gen[1]]);
  const fresh = newSpecs(gen, existing);
  assert.equal(fresh.length, gen.length - 2);
  assert.equal(fresh.includes(gen[0]), false);
  // a fully-covered worklist -> zero new (idempotent)
  assert.equal(newSpecs(gen, new Set(gen)).length, 0);
});

test("block-pocket: pocket depth < block thickness for every tuple (no degenerate through-cut)", () => {
  const bp = ARCHETYPES.find((a) => a.name === "block-pocket");
  assert.ok(bp, "block-pocket archetype must exist");
  // dims = [l, w, h(thickness), pd(pocket depth), pw]. A pocket >= the stock thickness is a through-cut /
  // zero-floor -- geometrically contradictory training data. Enforce pd strictly below h.
  for (const [, , h, pd] of bp.dims) {
    assert.ok(pd < h, `block-pocket pocket depth ${pd} >= block thickness ${h} (through-cut)`);
  }
});

test("wave-2 archetypes present + valid-rate invariant (no unproven union/boolean geometry)", () => {
  const names = new Set(ARCHETYPES.map((a) => a.name));
  for (const n of ["v-block", "chamfered-block", "slotted-plate", "counterbore-plate", "stepped-shaft",
    "frustum", "grooved-shaft", "counterbored-boss", "square-tube", "shouldered-disc"]) {
    assert.ok(names.has(n), `missing wave-2 archetype: ${n}`);
  }
  // The 62/62 valid-rate is protected by sticking to proven features -- no spec may ask to union/weld
  // two free bodies (the one geometry class the gen lane has NOT proven). Guards a future bad edit.
  for (const s of generateSpecs()) {
    assert.ok(!/\b(weld|union of|joined to|fused together|attached to|bolted to|combined with|merged)\b/i.test(s), `unproven boolean geometry leaked: '${s}'`);
  }
});
