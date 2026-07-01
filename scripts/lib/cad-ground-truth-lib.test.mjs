// scripts/lib/cad-ground-truth-lib.test.mjs
// Tests for U-TDP05 CAD-derived ground truth pure core.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  evidenceForFeatureKinds,
  inferPartClassFromCadPath,
  buildGtRecordFromStep,
  groupRecordsByPartClass,
  summarizeBatch,
  CAD_FILENAME_HEURISTICS,
} from "./cad-ground-truth-lib.mjs";

// ── evidenceForFeatureKinds ───────────────────────────────────────

test("evidence: null/empty geometry returns []", () => {
  assert.deepEqual(evidenceForFeatureKinds(null), []);
  assert.deepEqual(evidenceForFeatureKinds({}), []);
});

test("evidence: single cylindrical → stepped_revolved_axis only", () => {
  const r = evidenceForFeatureKinds({ has_cylindrical_holes: true, cylindrical_feature_count: 1 });
  assert.ok(r.includes("stepped_revolved_axis"));
  assert.ok(!r.includes("central_oil_hole"));
});

test("evidence: 2 cylindricals → adds central_oil_hole", () => {
  const r = evidenceForFeatureKinds({ has_cylindrical_holes: true, cylindrical_feature_count: 2 });
  assert.ok(r.includes("stepped_revolved_axis"));
  assert.ok(r.includes("central_oil_hole"));
  assert.ok(!r.includes("cross_drilled_relief_holes"));
});

test("evidence: 3+ cylindricals → adds cross_drilled_relief_holes", () => {
  const r = evidenceForFeatureKinds({ has_cylindrical_holes: true, cylindrical_feature_count: 5 });
  assert.ok(r.includes("cross_drilled_relief_holes"));
});

test("evidence: taper > 0 → bevel_face_chamfer; taper >= 2 → working_tip_taper", () => {
  const r1 = evidenceForFeatureKinds({ has_taper_or_chamfer: true, taper_count: 1 });
  assert.ok(r1.includes("bevel_face_chamfer"));
  assert.ok(!r1.includes("working_tip_taper"));

  const r2 = evidenceForFeatureKinds({ has_taper_or_chamfer: true, taper_count: 3 });
  assert.ok(r2.includes("working_tip_taper"));
});

test("evidence: fillet_count >= 2 → blade_root_fillet", () => {
  const r = evidenceForFeatureKinds({ has_fillets: true, fillet_count: 3 });
  assert.ok(r.includes("shoulder_fillet"));
  assert.ok(r.includes("blade_root_fillet"));
});

test("evidence: freeform surfaces → both leading + trailing edge fillets", () => {
  const r = evidenceForFeatureKinds({ has_freeform_surfaces: true, freeform_count: 1 });
  assert.ok(r.includes("leading_edge_fillet"));
  assert.ok(r.includes("trailing_edge_fillet"));
});

test("evidence: complex geometry (punch-shape) → multiple kinds", () => {
  const r = evidenceForFeatureKinds({
    has_cylindrical_holes: true, cylindrical_feature_count: 4,
    has_taper_or_chamfer: true, taper_count: 2,
    has_fillets: true, fillet_count: 3,
  });
  // Punch-typical: stepped axis + oil hole + cross-drilled + chamfer + taper + shoulder + blade root
  assert.ok(r.includes("stepped_revolved_axis"));
  assert.ok(r.includes("central_oil_hole"));
  assert.ok(r.includes("cross_drilled_relief_holes"));
  assert.ok(r.includes("bevel_face_chamfer"));
  assert.ok(r.includes("working_tip_taper"));
  assert.ok(r.includes("shoulder_fillet"));
});

test("evidence: kinds deduped (Set semantics)", () => {
  const r = evidenceForFeatureKinds({ has_cylindrical_holes: true, cylindrical_feature_count: 100 });
  // Should not have duplicate stepped_revolved_axis entries
  const ax = r.filter((k) => k === "stepped_revolved_axis");
  assert.equal(ax.length, 1);
});

// ── inferPartClassFromCadPath ─────────────────────────────────────

test("inferPartClass: heuristic matches per filename token", () => {
  assert.equal(inferPartClassFromCadPath("test/punch-001.step"), "extrude_punch");
  assert.equal(inferPartClassFromCadPath("die-A.stp"), "die");
  assert.equal(inferPartClassFromCadPath("PUNCH_2475-037.STEP"), "extrude_punch");
});

test("inferPartClass: empty/non-string returns fallback", () => {
  assert.equal(inferPartClassFromCadPath(""), "general");
  assert.equal(inferPartClassFromCadPath(null), "general");
  assert.equal(inferPartClassFromCadPath(undefined, { default: "custom" }), "custom");
});

// ── buildGtRecordFromStep ─────────────────────────────────────────

test("buildGtRecord: happy path produces presence_only dims + derivation provenance", () => {
  const stepResult = {
    file_path: "H:/test/punch-001.step",
    parse_ok: true,
    geometry: {
      has_cylindrical_holes: true,
      cylindrical_feature_count: 4,
      has_taper_or_chamfer: true,
      taper_count: 1,
      complexity: "medium",
    },
  };
  const r = buildGtRecordFromStep(stepResult);
  assert.equal(r.pdf_path, "H:/test/punch-001.step");
  assert.equal(r.cad_source, "H:/test/punch-001.step");
  assert.equal(r.part_class, "extrude_punch"); // inferred from filename
  assert.ok(r.dimensions.length > 0);
  for (const d of r.dimensions) {
    assert.equal(d.presence_only, true);
    assert.equal(typeof d.kind, "string");
  }
  assert.equal(r.derivation.source, "STEPGeometryParserEngine");
  assert.equal(r.derivation.complexity, "medium");
  assert.equal(r.derivation.cylindrical_count, 4);
});

test("buildGtRecord: parse_failed returns null", () => {
  const r = buildGtRecordFromStep({ file_path: "x.step", parse_ok: false, parse_error: "bad file" });
  assert.equal(r, null);
});

test("buildGtRecord: no features detected returns null (anti-spurious)", () => {
  const r = buildGtRecordFromStep({
    file_path: "x.step",
    parse_ok: true,
    geometry: {}, // no flags
  });
  assert.equal(r, null);
});

test("buildGtRecord: explicit part_class overrides filename inference", () => {
  const r = buildGtRecordFromStep(
    { file_path: "punch.step", parse_ok: true, geometry: { has_cylindrical_holes: true, cylindrical_feature_count: 1 } },
    { part_class: "die" },
  );
  assert.equal(r.part_class, "die");
});

test("buildGtRecord: malformed input returns null", () => {
  assert.equal(buildGtRecordFromStep(null), null);
  assert.equal(buildGtRecordFromStep({}), null);
  assert.equal(buildGtRecordFromStep({ file_path: "x" }), null); // missing parse_ok
});

// ── groupRecordsByPartClass ───────────────────────────────────────

test("groupRecords: groups by part_class, emits one catalog per class", () => {
  const records = [
    { part_class: "die", pdf_path: "a.step", cad_source: "a.step", dimensions: [] },
    { part_class: "die", pdf_path: "b.step", cad_source: "b.step", dimensions: [] },
    { part_class: "extrude_punch", pdf_path: "c.step", cad_source: "c.step", dimensions: [] },
  ];
  const groups = groupRecordsByPartClass(records);
  assert.equal(groups.length, 2);
  const die = groups.find((g) => g.part_class === "die");
  assert.equal(die.prints.length, 2);
  assert.equal(die.schemaVersion, 1);
  assert.equal(die.source, "cad-derived");
});

test("groupRecords: empty/non-array returns []", () => {
  assert.deepEqual(groupRecordsByPartClass([]), []);
  assert.deepEqual(groupRecordsByPartClass(null), []);
});

test("groupRecords: skips records without part_class", () => {
  const records = [
    { pdf_path: "no-class.step", dimensions: [] }, // skipped
    { part_class: "die", pdf_path: "ok.step", dimensions: [] },
  ];
  const groups = groupRecordsByPartClass(records);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].prints.length, 1);
});

// ── summarizeBatch ────────────────────────────────────────────────

test("summarizeBatch: tracks ok/failed/no-features/produced counts + byPartClass", () => {
  const results = [
    { file_path: "punch-1.step", parse_ok: true, geometry: { has_cylindrical_holes: true, cylindrical_feature_count: 2 } },
    { file_path: "punch-2.step", parse_ok: true, geometry: { has_cylindrical_holes: true, cylindrical_feature_count: 2 } },
    { file_path: "die-A.step", parse_ok: true, geometry: { has_cylindrical_holes: true, cylindrical_feature_count: 1 } },
    { file_path: "empty.step", parse_ok: true, geometry: {} }, // no features
    { file_path: "broken.step", parse_ok: false, parse_error: "bad" },
  ];
  const s = summarizeBatch(results);
  assert.equal(s.total, 5);
  assert.equal(s.parse_ok, 4);
  assert.equal(s.parse_failed, 1);
  assert.equal(s.no_features, 1);
  assert.equal(s.gt_produced, 3);
  assert.equal(s.byPartClass["extrude_punch"], 2);
  assert.equal(s.byPartClass["die"], 1);
});

test("summarizeBatch: empty/non-array returns zero counts", () => {
  const s = summarizeBatch([]);
  assert.equal(s.total, 0);
  assert.equal(s.gt_produced, 0);
});

// ── Constants surface ─────────────────────────────────────────────

test("CAD_FILENAME_HEURISTICS: has 10 heuristic entries, all with token + part_class", () => {
  assert.ok(CAD_FILENAME_HEURISTICS.length >= 10);
  for (const h of CAD_FILENAME_HEURISTICS) {
    assert.equal(typeof h.token, "string");
    assert.equal(typeof h.part_class, "string");
  }
});

// ── ADVERSARIAL ──────────────────────────────────────────────────

test("ADVERSARIAL: NaN cylindrical_feature_count → no kinds added (no NaN-poison)", () => {
  const r = evidenceForFeatureKinds({ has_cylindrical_holes: true, cylindrical_feature_count: NaN });
  // has_cylindrical_holes=true still triggers stepped_revolved_axis (presence flag)
  assert.ok(r.includes("stepped_revolved_axis"));
  // But NaN >= 2 is false, so no central_oil_hole
  assert.ok(!r.includes("central_oil_hole"));
});

test("ADVERSARIAL: 1000-file batch summarizes correctly + classes deduped", () => {
  const results = [];
  for (let i = 0; i < 1000; i++) {
    results.push({
      file_path: `punch-${i}.step`,
      parse_ok: true,
      geometry: { has_cylindrical_holes: true, cylindrical_feature_count: 2 },
    });
  }
  const s = summarizeBatch(results);
  assert.equal(s.total, 1000);
  assert.equal(s.gt_produced, 1000);
  assert.equal(s.byPartClass["extrude_punch"], 1000);
});
