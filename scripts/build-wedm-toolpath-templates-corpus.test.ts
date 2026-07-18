/**
 * Tests for the Phase A2 toolpath-template corpus builder.
 *   npx tsx --test scripts/build-wedm-toolpath-templates-corpus.test.ts
 *
 * These verify INTENT (R9), not shape: every emitted multipass template is
 * re-parsed through the cascade harness independently (the test does NOT trust
 * the builder's own internal self-validation), every pair is re-checked to be
 * in-envelope, and the split is proven deterministic + stratified + disjoint.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildTemplatePairs, splitByType } from "./build-wedm-toolpath-templates-corpus.js";
import { WEDM_TOOLPATH_TYPES, validateAgainstEnvelope } from "../mcp-server/src/data/wedm-toolpath-types.js";
import { checkCascade } from "./lib/wedm-cascade-correctness.mjs";

const { pairs, cascadesValidated } = buildTemplatePairs();
const REGISTRY_IDS = new Set(WEDM_TOOLPATH_TYPES.map((t) => t.id));

/** Reconstruct the swept job from a pair's encoded meta.id "tpl:type:material:thk:wire". */
function jobOf(p: typeof pairs[number]) {
  const [, , material, thickness, wire] = p.meta.id.split(":");
  const taper = p.meta.toolpath_type === "taper_uv";
  return { type: p.meta.toolpath_type, material, thickness_mm: Number(thickness), wire_diameter_mm: Number(wire), taper_angle_deg: taper ? 2 : 0, taper };
}

test("builds a non-trivial, fully-deduped corpus across the registry", () => {
  assert.ok(pairs.length >= 100, "expected >=100 template pairs, got " + pairs.length);
  const ids = new Set(pairs.map((p) => p.meta.id));
  assert.equal(ids.size, pairs.length, "meta.id must be unique (dedup)");
  const covered = new Set(pairs.map((p) => p.meta.toolpath_type));
  for (const c of covered) assert.ok(REGISTRY_IDS.has(c), "covered type not in registry: " + c);
  // the print->program priority types + both build-status types must be present.
  for (const must of ["straight_profile_multipass", "taper_uv", "closely_spaced_cannelure", "micro_fine_wire"]) {
    assert.ok(covered.has(must), "missing required toolpath type in corpus: " + must);
  }
});

test("EVERY multipass template re-validates as a correct cascade (independent re-parse)", () => {
  let checked = 0;
  for (const p of pairs) {
    if (p.meta.kind !== "template_multipass") continue;
    const text = p.output.slice(p.output.indexOf("\n") + 1); // strip the "Toolpath type:" header line
    const r = checkCascade(text, { taper: p.meta.toolpath_type === "taper_uv" });
    assert.ok(r.valid, "invalid cascade in corpus (" + p.meta.id + "): " + JSON.stringify(r.violations));
    checked += 1;
  }
  assert.ok(checked > 0, "expected at least one multipass template");
  assert.equal(checked, cascadesValidated, "every multipass pair must have been self-validated by the builder");
});

test("EVERY pair is in-envelope for its swept job (no out-of-envelope leak)", () => {
  for (const p of pairs) {
    const j = jobOf(p);
    const feas = validateAgainstEnvelope(j.type, { material: j.material, thickness_mm: j.thickness_mm, wire_diameter_mm: j.wire_diameter_mm, taper_angle_deg: j.taper_angle_deg });
    assert.ok(feas.feasible, "out-of-envelope pair leaked into corpus: " + p.meta.id + " -> " + JSON.stringify(feas.blockers ?? feas));
  }
});

test("split is deterministic, disjoint, and stratified by type", () => {
  const a = splitByType(pairs, 42);
  const b = splitByType(pairs, 42);
  assert.deepEqual(a.train.map((p) => p.meta.id), b.train.map((p) => p.meta.id), "same seed => identical split");

  const total = a.train.length + a.val.length + a.test.length;
  assert.equal(total, pairs.length, "split must partition every pair exactly once");
  const seen = new Set<string>();
  for (const p of [...a.train, ...a.val, ...a.test]) {
    assert.ok(!seen.has(p.meta.id), "split overlap: " + p.meta.id);
    seen.add(p.meta.id);
  }
  // stratified: every covered type must appear in the train split (no type lost to val/test only).
  const trainTypes = new Set(a.train.map((p) => p.meta.toolpath_type));
  for (const p of pairs) assert.ok(trainTypes.has(p.meta.toolpath_type), "type absent from train split: " + p.meta.toolpath_type);
});
