// scripts/lib/blueprint-extractor-lib.test.mjs
//
// U-TDP07 - tests for the pure-core blueprint extractor library.
// Run: node --test scripts/lib/blueprint-extractor-lib.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  GT_KINDS,
  VECTOR_AGGREGATION,
  classifyToken,
  aggregateTokenSignals,
  buildVlmPrompt,
  parseVlmJsonResponse,
  mergeStages,
  filterToAllowedKinds,
} from "./blueprint-extractor-lib.mjs";

// ============================================================================
// GT_KINDS — taxonomy invariants
// ============================================================================

test("GT_KINDS — exactly 9 kinds matching CAD + CNC GT libs", () => {
  const expected = [
    "stepped_revolved_axis",
    "central_oil_hole",
    "cross_drilled_relief_holes",
    "bevel_face_chamfer",
    "working_tip_taper",
    "shoulder_fillet",
    "blade_root_fillet",
    "leading_edge_fillet",
    "trailing_edge_fillet",
  ];
  assert.deepEqual([...GT_KINDS], expected);
  assert.equal(GT_KINDS.length, 9);
});

test("GT_KINDS — Object.freeze prevents mutation", () => {
  // strict-mode throws on mutation of frozen array; in sloppy mode it's a silent no-op
  assert.throws(() => { GT_KINDS[0] = "x"; }, /assign|read-only|frozen/i);
  assert.equal(GT_KINDS.length, 9);
});

test("VECTOR_AGGREGATION — threshold contract", () => {
  // Frozen + named thresholds — pin the values so a silent retune fails loudly.
  assert.equal(VECTOR_AGGREGATION.steppedRevolvedAxisMinDiameters, 1);
  assert.equal(VECTOR_AGGREGATION.centralOilHoleMinDiameters, 2);
  assert.equal(VECTOR_AGGREGATION.crossDrilledMinHoleSignals, 3);
  assert.equal(VECTOR_AGGREGATION.bevelChamferMinTokens, 1);
  assert.equal(VECTOR_AGGREGATION.workingTipTaperMinTokens, 2);
  assert.equal(VECTOR_AGGREGATION.shoulderFilletMinTokens, 1);
  assert.equal(VECTOR_AGGREGATION.bladeRootFilletMinTokens, 2);
  assert.equal(VECTOR_AGGREGATION.leadingEdgeMinTokens, 1);
  assert.equal(VECTOR_AGGREGATION.trailingEdgeMinTokens, 1);
  assert.throws(() => { VECTOR_AGGREGATION.steppedRevolvedAxisMinDiameters = 99; });
});

// ============================================================================
// classifyToken — per-pattern matrix
// ============================================================================

test("classifyToken — diameter patterns (Ø, ⌀, DIA, PHI)", () => {
  // Each canonical form from JM Die prints.
  assert.ok(classifyToken("Ø1.27").has("diameter"));
  assert.ok(classifyToken("Ø 6.35").has("diameter"));
  assert.ok(classifyToken("⌀0.05").has("diameter"));
  assert.ok(classifyToken("DIA 0.5").has("diameter"));
  assert.ok(classifyToken("PHI 12").has("diameter"));
  // Bare symbol (value on next token)
  assert.ok(classifyToken("Ø").has("diameter"));
  assert.ok(classifyToken("⌀").has("diameter"));
  assert.ok(classifyToken("DIA").has("diameter"));
});

test("classifyToken — thread patterns fire as 'hole'", () => {
  assert.ok(classifyToken("M6").has("hole"));
  assert.ok(classifyToken("M6x1").has("hole"));
  assert.ok(classifyToken("M6×1").has("hole"));
  assert.ok(classifyToken("1/4-20").has("hole"));
  assert.ok(classifyToken("#8-32").has("hole"));
  assert.ok(classifyToken("UNC").has("hole"));
  assert.ok(classifyToken("TAP").has("hole"));
});

test("classifyToken — hole keywords", () => {
  for (const t of ["HOLE", "HOLES", "DRILL", "DRILLED", "REAM", "BORE", "CBORE", "CSK"]) {
    assert.ok(classifyToken(t).has("hole"), t + " should fire hole");
  }
});

test("classifyToken — chamfer", () => {
  assert.ok(classifyToken("CHAMFER").has("chamfer"));
  assert.ok(classifyToken("CHAM").has("chamfer"));
  assert.ok(classifyToken("CSK").has("chamfer"));
  // Standalone angle token "1x45°" or "1X45"
  assert.ok(classifyToken("1x45°").has("chamfer"));
  assert.ok(classifyToken("1X45").has("chamfer"));
});

test("classifyToken — taper", () => {
  assert.ok(classifyToken("TAPER").has("taper"));
  assert.ok(classifyToken("TAPERED").has("taper"));
  assert.ok(classifyToken("CONICAL").has("taper"));
});

test("classifyToken — fillet / radius", () => {
  assert.ok(classifyToken("FILLET").has("fillet"));
  assert.ok(classifyToken("RAD").has("fillet"));
  assert.ok(classifyToken("R6").has("fillet"));
  assert.ok(classifyToken("R 12.5").has("fillet"));
});

test("classifyToken — leading/trailing edge airfoil cues", () => {
  assert.ok(classifyToken("LEADING EDGE").has("leadingEdge"));
  assert.ok(classifyToken("L.E.").has("leadingEdge"));
  assert.ok(classifyToken("AIRFOIL").has("leadingEdge"));
  assert.ok(classifyToken("TRAILING EDGE").has("trailingEdge"));
  assert.ok(classifyToken("T.E.").has("trailingEdge"));
});

test("classifyToken — oil hole keyword fires both 'hole' and 'oilHole'", () => {
  const out = classifyToken("OIL HOLE");
  assert.ok(out.has("hole"));
  assert.ok(out.has("oilHole"));
});

test("classifyToken — adversarial inputs are safe", () => {
  // Reviewer-B asked for explicit coverage of these.
  assert.equal(classifyToken("").size, 0);
  assert.equal(classifyToken(null).size, 0);
  assert.equal(classifyToken(undefined).size, 0);
  assert.equal(classifyToken(42).size, 0);
  assert.equal(classifyToken({}).size, 0);
  assert.equal(classifyToken([]).size, 0);
  // Very long string — no ReDoS or hang
  const start = Date.now();
  classifyToken("X".repeat(10000));
  assert.ok(Date.now() - start < 200, "classifyToken should be sub-200ms on 10k chars");
  // Unicode garbage shouldn't crash
  assert.equal(classifyToken("ñ漢字🔧").size, 0);
});

test("classifyToken — non-firing tokens return empty Set", () => {
  // Plain numbers, plain dimensional labels without symbols — no fire.
  assert.equal(classifyToken("1.27").size, 0);
  assert.equal(classifyToken("123").size, 0);
  assert.equal(classifyToken("Note:").size, 0);
});

// ============================================================================
// aggregateTokenSignals — each kind threshold
// ============================================================================

function dimsOf(records) {
  return new Set((records.dimensions || []).map((d) => d.kind));
}

test("aggregateTokenSignals — single Ø token fires stepped_revolved_axis only", () => {
  const r = aggregateTokenSignals([{ text: "Ø1.27" }]);
  assert.ok(dimsOf(r).has("stepped_revolved_axis"));
  assert.equal(r.signals.diameter, 1);
  // Below the central_oil_hole threshold (needs >=2).
  assert.ok(!dimsOf(r).has("central_oil_hole"));
});

test("aggregateTokenSignals — 2 diameters fire stepped_revolved + central_oil_hole", () => {
  const r = aggregateTokenSignals([
    { text: "Ø6.35" }, { text: "Ø1.27" },
  ]);
  const dims = dimsOf(r);
  assert.ok(dims.has("stepped_revolved_axis"));
  assert.ok(dims.has("central_oil_hole"));
});

test("aggregateTokenSignals — OIL HOLE keyword promotes to central_oil_hole at any count", () => {
  const r = aggregateTokenSignals([{ text: "OIL HOLE" }]);
  // Token fires both hole and oilHole signals (1 oilHole signal → central_oil_hole)
  assert.ok(dimsOf(r).has("central_oil_hole"));
});

test("aggregateTokenSignals — 3 hole signals fire cross_drilled_relief_holes", () => {
  const r = aggregateTokenSignals([
    { text: "HOLE" }, { text: "DRILL" }, { text: "BORE" },
  ]);
  assert.equal(r.signals.hole, 3);
  assert.ok(dimsOf(r).has("cross_drilled_relief_holes"));
});

test("aggregateTokenSignals — chamfer fires bevel_face_chamfer", () => {
  const r = aggregateTokenSignals([{ text: "CHAMFER" }]);
  assert.ok(dimsOf(r).has("bevel_face_chamfer"));
});

test("aggregateTokenSignals — 2 tapers fire working_tip_taper", () => {
  const r = aggregateTokenSignals([{ text: "TAPER" }, { text: "TAPERED" }]);
  assert.equal(r.signals.taper, 2);
  assert.ok(dimsOf(r).has("working_tip_taper"));
});

test("aggregateTokenSignals — 1 fillet -> shoulder_fillet only; 2 fillets -> +blade_root_fillet", () => {
  const r1 = aggregateTokenSignals([{ text: "FILLET" }]);
  assert.ok(dimsOf(r1).has("shoulder_fillet"));
  assert.ok(!dimsOf(r1).has("blade_root_fillet"));
  const r2 = aggregateTokenSignals([{ text: "FILLET" }, { text: "R 6" }]);
  assert.ok(dimsOf(r2).has("shoulder_fillet"));
  assert.ok(dimsOf(r2).has("blade_root_fillet"));
});

test("aggregateTokenSignals — leading + trailing edge cues fire fillet kinds", () => {
  const r = aggregateTokenSignals([{ text: "LEADING EDGE" }, { text: "TRAILING EDGE" }]);
  const dims = dimsOf(r);
  assert.ok(dims.has("leading_edge_fillet"));
  assert.ok(dims.has("trailing_edge_fillet"));
});

test("aggregateTokenSignals — empty input returns empty dimensions", () => {
  const r = aggregateTokenSignals([]);
  assert.deepEqual(r.dimensions, []);
});

test("aggregateTokenSignals — malformed input is safe (R12 fail-soft)", () => {
  // Bad input shapes must not throw — degrade to empty.
  assert.deepEqual(aggregateTokenSignals(null).dimensions, []);
  assert.deepEqual(aggregateTokenSignals(undefined).dimensions, []);
  assert.deepEqual(aggregateTokenSignals("not-an-array").dimensions, []);
  assert.deepEqual(aggregateTokenSignals([null, "x", { not_text: true }]).dimensions, []);
});

test("aggregateTokenSignals — every emitted dimension has presence_only:true and kind in GT_KINDS", () => {
  // Conservation invariant: NO kind ever emitted outside the allowlist.
  const everything = [
    "Ø1", "Ø2", "Ø3", "HOLE", "DRILL", "BORE", "OIL HOLE",
    "CHAMFER", "TAPER", "TAPERED", "FILLET", "R 6", "R 8",
    "LEADING EDGE", "TRAILING EDGE",
  ].map((t) => ({ text: t }));
  const r = aggregateTokenSignals(everything);
  assert.ok(r.dimensions.length > 0);
  for (const d of r.dimensions) {
    assert.equal(d.presence_only, true);
    assert.ok(GT_KINDS.includes(d.kind), "kind " + d.kind + " is in GT_KINDS");
  }
});

// ============================================================================
// buildVlmPrompt
// ============================================================================

test("buildVlmPrompt — default lists all GT kinds and asks for JSON-only output", () => {
  const p = buildVlmPrompt();
  for (const k of GT_KINDS) {
    assert.ok(p.includes(k), "prompt should mention " + k);
  }
  assert.ok(p.includes("JSON"), "prompt should ask for JSON output");
  assert.ok(p.includes("present"), "prompt should mention the 'present' key");
});

test("buildVlmPrompt — custom kinds override defaults", () => {
  const p = buildVlmPrompt(["hole_only_universe"]);
  assert.ok(p.includes("hole_only_universe"));
  // Should NOT include other GT kinds when an explicit list is given.
  assert.ok(!p.includes("stepped_revolved_axis"));
});

test("buildVlmPrompt — empty/garbage allowedKinds falls back to GT_KINDS", () => {
  const p1 = buildVlmPrompt([]);
  const p2 = buildVlmPrompt(null);
  for (const p of [p1, p2]) {
    for (const k of GT_KINDS) assert.ok(p.includes(k));
  }
});

// ============================================================================
// parseVlmJsonResponse — robustness
// ============================================================================

test("parseVlmJsonResponse — pure JSON parses cleanly", () => {
  const r = parseVlmJsonResponse('{"present":["central_oil_hole","bevel_face_chamfer"]}');
  assert.equal(r.parseOk, true);
  assert.equal(r.dimensions.length, 2);
  const kinds = new Set(r.dimensions.map((d) => d.kind));
  assert.ok(kinds.has("central_oil_hole"));
  assert.ok(kinds.has("bevel_face_chamfer"));
  for (const d of r.dimensions) assert.equal(d.presence_only, true);
});

test("parseVlmJsonResponse — fenced markdown ```json``` block", () => {
  const r = parseVlmJsonResponse('Here is the result:\n```json\n{"present": ["stepped_revolved_axis"]}\n```');
  assert.equal(r.parseOk, true);
  assert.equal(r.dimensions[0].kind, "stepped_revolved_axis");
});

test("parseVlmJsonResponse — prose-wrapped JSON via brace-substring rescue", () => {
  const r = parseVlmJsonResponse('OK looking at the print I see: {"present":["central_oil_hole"]} -- that\'s my read.');
  assert.equal(r.parseOk, true);
  assert.equal(r.dimensions[0].kind, "central_oil_hole");
});

test("parseVlmJsonResponse — kinds outside allowlist are silently dropped from dimensions but exposed in raw_kinds", () => {
  const r = parseVlmJsonResponse('{"present":["central_oil_hole","hallucinated_kind","stepped_revolved_axis"]}');
  assert.equal(r.parseOk, true);
  // Hallucinated kind dropped from accepted set.
  const accepted = new Set(r.dimensions.map((d) => d.kind));
  assert.ok(accepted.has("central_oil_hole"));
  assert.ok(accepted.has("stepped_revolved_axis"));
  assert.ok(!accepted.has("hallucinated_kind"));
  // But still surfaced in raw_kinds for operator visibility (R12 honesty).
  assert.ok(r.raw_kinds.includes("hallucinated_kind"));
});

test("parseVlmJsonResponse — completely-non-JSON returns parseOk:false with reason", () => {
  const r = parseVlmJsonResponse("the print shows a punch with a hole in the middle");
  assert.equal(r.parseOk, false);
  assert.equal(r.dimensions.length, 0);
  assert.ok(r.reason && r.reason.startsWith("json-parse-failed"));
});

test("parseVlmJsonResponse — missing 'present' key", () => {
  const r = parseVlmJsonResponse('{"reasoning":"nothing here"}');
  assert.equal(r.parseOk, false);
  assert.equal(r.reason, "missing-present-array");
});

test("parseVlmJsonResponse — empty / null / non-string input", () => {
  assert.equal(parseVlmJsonResponse("").parseOk, false);
  assert.equal(parseVlmJsonResponse("   ").parseOk, false);
  assert.equal(parseVlmJsonResponse(null).parseOk, false);
  assert.equal(parseVlmJsonResponse(undefined).parseOk, false);
  assert.equal(parseVlmJsonResponse(42).parseOk, false);
});

test("parseVlmJsonResponse — bare-array response is accepted (Qwen2.5-VL deviation)", () => {
  // Live observation 2026-05-18: qwen2.5vl:7b sometimes emits a bare array
  // `["kind1","kind2"]` instead of the `{"present":[...]}` wrapper. The
  // parser tolerates both — the contract is "presence list", whichever
  // structural shape the model produces.
  const r = parseVlmJsonResponse('```json\n["stepped_revolved_axis"]\n```');
  assert.equal(r.parseOk, true);
  assert.equal(r.dimensions.length, 1);
  assert.equal(r.dimensions[0].kind, "stepped_revolved_axis");
  // Wrapped object form still works.
  const r2 = parseVlmJsonResponse('{"present":["central_oil_hole"]}');
  assert.equal(r2.parseOk, true);
  assert.equal(r2.dimensions[0].kind, "central_oil_hole");
});

test("parseVlmJsonResponse — custom allowlist passed in", () => {
  const r = parseVlmJsonResponse(
    '{"present":["x","y"]}',
    ["x", "z"],
  );
  // Only 'x' is in the passed allowlist.
  assert.equal(r.dimensions.length, 1);
  assert.equal(r.dimensions[0].kind, "x");
});

// ============================================================================
// mergeStages — cascade union
// ============================================================================

test("mergeStages — union of vector + vlm kinds, presence_only:true everywhere", () => {
  const a = { dimensions: [{ kind: "central_oil_hole" }, { kind: "stepped_revolved_axis" }] };
  const b = { dimensions: [{ kind: "bevel_face_chamfer" }] };
  const r = mergeStages(a, b);
  const kinds = new Set(r.dimensions.map((d) => d.kind));
  assert.equal(r.dimensions.length, 3);
  assert.ok(kinds.has("central_oil_hole"));
  assert.ok(kinds.has("stepped_revolved_axis"));
  assert.ok(kinds.has("bevel_face_chamfer"));
  for (const d of r.dimensions) assert.equal(d.presence_only, true);
});

test("mergeStages — duplicate kinds across stages are deduped", () => {
  const a = { dimensions: [{ kind: "central_oil_hole" }] };
  const b = { dimensions: [{ kind: "central_oil_hole" }] };
  const r = mergeStages(a, b);
  assert.equal(r.dimensions.length, 1);
  // Both sources attributed.
  assert.deepEqual(r.sources, ["vector", "vlm"]);
});

test("mergeStages — empty-stage emission does NOT attribute the source", () => {
  // R12 honesty: a stage that ran but found nothing should not appear in sources.
  const r = mergeStages({ dimensions: [] }, { dimensions: [{ kind: "central_oil_hole" }] });
  assert.deepEqual(r.sources, ["vlm"]);
});

test("mergeStages — null / undefined / missing-dimensions inputs are safe", () => {
  const r1 = mergeStages(null, { dimensions: [{ kind: "central_oil_hole" }] });
  assert.equal(r1.dimensions.length, 1);
  const r2 = mergeStages({}, undefined);
  assert.deepEqual(r2.dimensions, []);
  assert.deepEqual(r2.sources, []);
});

test("mergeStages — malformed entries inside dimensions[] are dropped, not thrown", () => {
  const a = { dimensions: [{ kind: "central_oil_hole" }, null, { kind: "" }, { not_kind: 1 }, { kind: "stepped_revolved_axis" }] };
  const r = mergeStages(a, null);
  assert.equal(r.dimensions.length, 2);
});

// ============================================================================
// filterToAllowedKinds
// ============================================================================

test("filterToAllowedKinds — drops out-of-allowlist kinds and dedupes", () => {
  const dims = [
    { kind: "central_oil_hole" },
    { kind: "hallucinated" },
    { kind: "central_oil_hole" }, // duplicate
    { kind: "stepped_revolved_axis" },
  ];
  const out = filterToAllowedKinds(dims);
  assert.equal(out.length, 2);
  const kinds = out.map((d) => d.kind);
  assert.ok(kinds.includes("central_oil_hole"));
  assert.ok(kinds.includes("stepped_revolved_axis"));
  for (const d of out) assert.equal(d.presence_only, true);
});

test("filterToAllowedKinds — custom allowlist", () => {
  const dims = [{ kind: "x" }, { kind: "y" }];
  const out = filterToAllowedKinds(dims, ["x"]);
  assert.equal(out.length, 1);
  assert.equal(out[0].kind, "x");
});

test("filterToAllowedKinds — null / non-array safe", () => {
  assert.deepEqual(filterToAllowedKinds(null), []);
  assert.deepEqual(filterToAllowedKinds("not-an-array"), []);
  assert.deepEqual(filterToAllowedKinds([null, undefined, { kind: "" }]), []);
});

// ============================================================================
// Integration — end-to-end cascade through the U-TDP04 contract
// ============================================================================

test("integration — vector tokens of a punch print produce GT-conforming records", () => {
  // Simulated PyMuPDF output for a typical extrude-punch print (JM Die corpus).
  const tokens = [
    { text: "Ø1.27" },
    { text: "Ø6.35" },
    { text: "OIL HOLE" },
    { text: "CHAMFER" },
    { text: "1X45" },
    { text: "DRILL" },
    { text: "TAP" },
    { text: "M6" },
  ];
  const vector = aggregateTokenSignals(tokens);
  const merged = mergeStages(vector, null);
  // Every emitted dimension must be in GT_KINDS (the benchmark's allowlist).
  for (const d of merged.dimensions) {
    assert.ok(GT_KINDS.includes(d.kind), "kind " + d.kind + " in GT_KINDS");
    assert.equal(d.presence_only, true);
  }
  // Punch should at least fire stepped_revolved_axis + central_oil_hole + bevel chamfer.
  const k = new Set(merged.dimensions.map((d) => d.kind));
  assert.ok(k.has("stepped_revolved_axis"));
  assert.ok(k.has("central_oil_hole"));
  assert.ok(k.has("bevel_face_chamfer"));
});

test("integration — cascade with a VLM that adds a kind the vector missed", () => {
  const vector = aggregateTokenSignals([{ text: "Ø1.27" }]); // only stepped_revolved_axis
  const vlm = parseVlmJsonResponse('{"present":["leading_edge_fillet","trailing_edge_fillet"]}');
  const merged = mergeStages(vector, vlm);
  const k = new Set(merged.dimensions.map((d) => d.kind));
  assert.ok(k.has("stepped_revolved_axis"));    // vector contribution
  assert.ok(k.has("leading_edge_fillet"));      // vlm contribution
  assert.ok(k.has("trailing_edge_fillet"));     // vlm contribution
  assert.deepEqual(merged.sources, ["vector", "vlm"]);
});
