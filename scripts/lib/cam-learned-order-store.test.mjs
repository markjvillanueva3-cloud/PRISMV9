/**
 * Tests for cam-learned-order-store.mjs — the persist/load half of the CAM self-improvement loop.
 * Real-data grounded: the validity + round-trip cases use the planner's ACTUAL exported
 * LATHE_OP_ORDER (15-family curated map), so a future edit that breaks the invariants the store
 * enforces fails here. IO is hermetic via injected readImpl — no real fs touched.
 *
 *   node --test scripts/lib/cam-learned-order-store.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateOrderMap, buildLearnedOrderArtifact, loadLearnedOrder, deriveProvenanceFromReport, sortOrderMap,
  writeLearnedOrderArtifact, ROUGH_BEFORE_FINISH,
  LEARNED_ORDER_SCHEMA_VERSION, LEARNED_ORDER_KIND, DEFAULT_LEARNED_ORDER_PATH, MAX_ORDER_FAMILIES,
} from "./cam-learned-order-store.mjs";
import { LATHE_OP_ORDER } from "./cam-part-program-planner.mjs";

const NOW = "2026-06-02T16:00:00.000Z";
const enoent = () => { const e = new Error("no file"); e.code = "ENOENT"; throw e; };
const silent = () => {}; // swallow warn in tests

// ── validateOrderMap ──────────────────────────────────────────────────────────
test("validateOrderMap accepts the real curated LATHE_OP_ORDER", () => {
  const v = validateOrderMap(LATHE_OP_ORDER);
  assert.equal(v.valid, true, v.reason);
});

test("validateOrderMap rejects non-objects, arrays, empty", () => {
  assert.equal(validateOrderMap(null).valid, false);
  assert.equal(validateOrderMap("x").valid, false);
  assert.equal(validateOrderMap([1, 2]).valid, false);
  assert.equal(validateOrderMap({}).reason, "empty");
});

test("validateOrderMap rejects non-finite ranks (NaN, Infinity, string)", () => {
  assert.match(validateOrderMap({ facing: 10, parting_cutoff: 99, OD_roughing: NaN }).reason, /non-finite-rank:OD_roughing/);
  assert.match(validateOrderMap({ facing: 10, parting_cutoff: Infinity }).reason, /non-finite-rank/);
  assert.match(validateOrderMap({ facing: 10, parting_cutoff: "99" }).reason, /non-finite-rank/);
});

test("validateOrderMap requires the invariant families", () => {
  assert.match(validateOrderMap({ OD_roughing: 20, parting_cutoff: 99 }).reason, /missing-invariant-family:facing/);
  assert.match(validateOrderMap({ facing: 10, OD_roughing: 20 }).reason, /missing-invariant-family:parting_cutoff/);
});

test("validateOrderMap rejects facing-not-earliest / parting-not-last (destructive-sequence guard)", () => {
  // facing later than OD_roughing
  assert.match(validateOrderMap({ facing: 30, OD_roughing: 20, parting_cutoff: 99 }).reason, /facing-not-earliest/);
  // parting_cutoff earlier than threading
  assert.match(validateOrderMap({ facing: 10, threading: 70, parting_cutoff: 50 }).reason, /parting_cutoff-not-last/);
});

test("validateOrderMap allows ties at the boundaries (facing tied-earliest, parting tied-last)", () => {
  assert.equal(validateOrderMap({ facing: 10, datum: 10, parting_cutoff: 99, eject: 99 }).valid, true);
});

test("validateOrderMap rejects the degenerate all-equal / facing===parting collapse (parting-first guard)", () => {
  // all ranks equal: facing===min===max===parting, the ==min/==max checks would pass — strict check catches it.
  assert.match(validateOrderMap({ facing: 10, parting_cutoff: 10, OD_roughing: 10 }).reason, /facing-not-strictly-before-parting/);
  // facing == parting but a middle family lower → facing not even min; still rejected
  assert.match(validateOrderMap({ facing: 50, OD_roughing: 20, parting_cutoff: 50 }).reason, /facing-not-earliest/);
});

test("validateOrderMap enforces rough-before-finish only when BOTH families present (no false-reject)", () => {
  // violation: finishing ranked before roughing
  assert.match(validateOrderMap({ facing: 10, OD_finishing: 20, OD_roughing: 40, parting_cutoff: 99 }).reason, /OD_roughing-not-before-OD_finishing/);
  assert.match(validateOrderMap({ facing: 10, bore_finish: 30, ID_boring: 50, parting_cutoff: 99 }).reason, /ID_boring-not-before-bore_finish/);
  // only ONE of the pair present → not enforced (partial taxonomy is legal)
  assert.equal(validateOrderMap({ facing: 10, OD_finishing: 40, parting_cutoff: 99 }).valid, true);
  assert.equal(validateOrderMap({ facing: 10, ID_boring: 50, parting_cutoff: 99 }).valid, true);
});

test("validateOrderMap rejects forbidden keys (__proto__/prototype/constructor) and oversize maps — never throws", () => {
  assert.match(validateOrderMap(JSON.parse('{"facing":10,"parting_cutoff":99,"__proto__":50}')).reason, /forbidden-key:__proto__/);
  // oversize: build a map > MAX_ORDER_FAMILIES — must return invalid (NOT RangeError from Math.min spread)
  const huge = { facing: 0, parting_cutoff: 1e6 };
  for (let i = 0; i < MAX_ORDER_FAMILIES + 50; i++) huge[`fam_${i}`] = i + 1;
  let res;
  assert.doesNotThrow(() => { res = validateOrderMap(huge); });
  assert.match(res.reason, /too-large/);
});

test("loadLearnedOrder canonicalizes (re-sorts) order on load regardless of on-disk key order", () => {
  // a hand-edited artifact with keys in scrambled order still loads as rank-ascending
  const artifact = {
    schemaVersion: LEARNED_ORDER_SCHEMA_VERSION, kind: LEARNED_ORDER_KIND, learnedAt: NOW, source: "hand-edit",
    order: { parting_cutoff: 99, facing: 10, OD_finishing: 40, OD_roughing: 20 }, provenance: {},
  };
  const res = loadLearnedOrder("/p", {}, { readImpl: () => JSON.stringify(artifact), warn: silent });
  assert.equal(res.valid, true);
  assert.deepEqual(Object.keys(res.order), ["facing", "OD_roughing", "OD_finishing", "parting_cutoff"]);
});

test("sortOrderMap orders by rank then family name, deterministically", () => {
  const s = sortOrderMap({ b: 20, a: 20, facing: 10, z: 5 });
  assert.deepEqual(Object.keys(s), ["z", "facing", "a", "b"]); // 5, 10, then 20-tie broken by name a<b
});

// ── buildLearnedOrderArtifact ───────────────────────────────────────────────────
test("buildLearnedOrderArtifact produces a schema-stamped, deterministically-sorted artifact", () => {
  const art = buildLearnedOrderArtifact(
    { order: { parting_cutoff: 99, facing: 10, OD_roughing: 20 }, source: "unit-test", provenance: { sampled: 5 } },
    NOW,
  );
  assert.equal(art.schemaVersion, LEARNED_ORDER_SCHEMA_VERSION);
  assert.equal(art.kind, LEARNED_ORDER_KIND);
  assert.equal(art.learnedAt, NOW);
  assert.equal(art.source, "unit-test");
  assert.deepEqual(art.provenance, { sampled: 5 });
  // sorted by rank ascending regardless of input key order
  assert.deepEqual(Object.keys(art.order), ["facing", "OD_roughing", "parting_cutoff"]);
});

test("buildLearnedOrderArtifact round-trips the real LATHE_OP_ORDER value-for-value", () => {
  const art = buildLearnedOrderArtifact({ order: LATHE_OP_ORDER, source: "curated" }, NOW);
  for (const [fam, rank] of Object.entries(LATHE_OP_ORDER)) assert.equal(art.order[fam], rank);
  assert.equal(Object.keys(art.order).length, Object.keys(LATHE_OP_ORDER).length);
});

test("buildLearnedOrderArtifact fails LOUD on missing nowIso / source / bad provenance / invalid order", () => {
  assert.throws(() => buildLearnedOrderArtifact({ order: LATHE_OP_ORDER, source: "x" }), /nowIso/);
  assert.throws(() => buildLearnedOrderArtifact({ order: LATHE_OP_ORDER }, NOW), /source/);
  assert.throws(() => buildLearnedOrderArtifact({ order: LATHE_OP_ORDER, source: "x", provenance: [1] }, NOW), /provenance must be a plain object/);
  assert.throws(() => buildLearnedOrderArtifact({ order: { foo: 1 }, source: "x" }, NOW), /invalid order map/);
});

// ── writeLearnedOrderArtifact (hermetic IO) ─────────────────────────────────────
test("writeLearnedOrderArtifact persists a valid artifact as pretty JSON + trailing newline", () => {
  const art = buildLearnedOrderArtifact({ order: LATHE_OP_ORDER, source: "curated", provenance: { sampled: 2000 } }, NOW);
  let captured = null;
  const path = writeLearnedOrderArtifact("/fake/learned-op-order.json", art, { writeImpl: (p, t) => { captured = { p, t }; } });
  assert.equal(path, "/fake/learned-op-order.json");
  assert.equal(captured.p, "/fake/learned-op-order.json");
  assert.ok(captured.t.endsWith("\n"), "trailing newline for clean diffs");
  // the written bytes round-trip back through loadLearnedOrder
  const res = loadLearnedOrder("/p", {}, { readImpl: () => captured.t, warn: silent });
  assert.equal(res.valid, true);
  assert.deepEqual(res.order, art.order);
});

test("writeLearnedOrderArtifact fails LOUD on a non-artifact / invalid order (single write path can't persist garbage)", () => {
  const noop = () => {};
  assert.throws(() => writeLearnedOrderArtifact("/p", null, { writeImpl: noop }), /not a learned-order artifact/);
  assert.throws(() => writeLearnedOrderArtifact("/p", { kind: "wrong", order: LATHE_OP_ORDER }, { writeImpl: noop }), /not a learned-order artifact/);
  assert.throws(() => writeLearnedOrderArtifact("/p", { kind: LEARNED_ORDER_KIND, order: { foo: 1 } }, { writeImpl: noop }), /artifact\.order invalid/);
});

// ── loadLearnedOrder (hermetic IO) ──────────────────────────────────────────────
test("loadLearnedOrder returns the artifact order on a valid file", () => {
  const art = buildLearnedOrderArtifact({ order: LATHE_OP_ORDER, source: "curated", provenance: { sampled: 2000 } }, NOW);
  const readImpl = () => JSON.stringify(art);
  const res = loadLearnedOrder("/fake/path.json", { facing: 1, parting_cutoff: 2 }, { readImpl, warn: silent });
  assert.equal(res.valid, true);
  assert.equal(res.source, "learned-artifact");
  assert.equal(res.learnedAt, NOW);
  assert.equal(res.order.OD_roughing, LATHE_OP_ORDER.OD_roughing);
});

test("loadLearnedOrder degrades QUIETLY to fallback when artifact is absent (ENOENT)", () => {
  let warned = false;
  const res = loadLearnedOrder("/none", LATHE_OP_ORDER, { readImpl: enoent, warn: () => { warned = true; } });
  assert.equal(res.source, "default-fallback");
  assert.equal(res.reason, "artifact-absent");
  assert.equal(res.order, LATHE_OP_ORDER); // exact fallback reference
  assert.equal(warned, false); // absence is normal — no noise
});

test("loadLearnedOrder degrades LOUDLY on parse error / kind mismatch / invalid order / IO error", () => {
  const V = LEARNED_ORDER_SCHEMA_VERSION;
  const cases = [
    { readImpl: () => "{not json", wantReason: "parse-error" },
    { readImpl: () => JSON.stringify({ kind: "wrong", schemaVersion: V, order: LATHE_OP_ORDER }), wantReason: /kind-mismatch/ },
    { readImpl: () => JSON.stringify({ kind: LEARNED_ORDER_KIND, schemaVersion: V, order: { foo: 1 } }), wantReason: /invalid-order/ },
    { readImpl: () => { const e = new Error("disk"); e.code = "EIO"; throw e; }, wantReason: /read-error:EIO/ },
    { readImpl: () => JSON.stringify({ kind: LEARNED_ORDER_KIND, schemaVersion: V, order: [1, 2] }), wantReason: /invalid-order/ },
    { readImpl: () => "[1,2,3]", wantReason: "not-an-object" },
    // schema major-version guard: a v2 artifact (or a missing schemaVersion) degrades loudly, not as "invalid-order"
    { readImpl: () => JSON.stringify({ kind: LEARNED_ORDER_KIND, schemaVersion: "2.0.0", order: LATHE_OP_ORDER }), wantReason: /schema-mismatch:2\.0\.0/ },
    { readImpl: () => JSON.stringify({ kind: LEARNED_ORDER_KIND, order: LATHE_OP_ORDER }), wantReason: /schema-mismatch:absent/ },
  ];
  for (const c of cases) {
    let warned = false;
    const res = loadLearnedOrder("/p", LATHE_OP_ORDER, { readImpl: c.readImpl, warn: () => { warned = true; } });
    assert.equal(res.source, "default-fallback");
    assert.equal(res.order, LATHE_OP_ORDER);
    if (c.wantReason instanceof RegExp) assert.match(res.reason, c.wantReason);
    else assert.equal(res.reason, c.wantReason);
    assert.equal(warned, true, `expected a warn for reason ${res.reason}`);
  }
});

test("loadLearnedOrder never throws even when the injected warn throws (logging is best-effort)", () => {
  // A logging failure must not crash the planner's order load — safeWarn swallows it and the
  // function still returns the fallback cleanly. This asserts the R12 no-throw guarantee directly.
  const res = loadLearnedOrder("/p", LATHE_OP_ORDER, {
    readImpl: () => "{bad json", warn: () => { throw new Error("logger exploded"); },
  });
  assert.equal(res.source, "default-fallback");
  assert.equal(res.reason, "parse-error");
  assert.equal(res.order, LATHE_OP_ORDER);
});

test("buildLearnedOrderArtifact -> loadLearnedOrder round-trips through serialization", () => {
  const art = buildLearnedOrderArtifact({ order: LATHE_OP_ORDER, source: "rt", provenance: { sampled: 7 } }, NOW);
  const wire = JSON.stringify(art, null, 2) + "\n"; // exactly how it's persisted
  const res = loadLearnedOrder("/p", {}, { readImpl: () => wire, warn: silent });
  assert.equal(res.valid, true);
  assert.deepEqual(res.order, art.order);
  assert.equal(res.learnedAt, NOW);
});

// ── deriveProvenanceFromReport ──────────────────────────────────────────────────
test("deriveProvenanceFromReport extracts the audit-report provenance fields", () => {
  const report = {
    kind: "cam_order_learn_report", sampled: 2005, programs_with_ops: 2000,
    minSupport: 50, minConfidence: 0.75,
    corpus_suggested_order: ["facing", "OD_roughing"], disagreements: [],
  };
  const p = deriveProvenanceFromReport(report);
  assert.equal(p.sampled, 2005);
  assert.equal(p.programs_with_ops, 2000);
  assert.equal(p.minSupport, 50);
  assert.equal(p.minConfidence, 0.75);
  assert.deepEqual(p.corpus_suggested_order, ["facing", "OD_roughing"]);
  assert.equal(p.disagreements_applied, 0);
  assert.equal(p.report_kind, "cam_order_learn_report");
});

test("deriveProvenanceFromReport is tolerant of null / partial / array input", () => {
  assert.deepEqual(deriveProvenanceFromReport(null), {});
  assert.deepEqual(deriveProvenanceFromReport([1, 2]), {});
  const p = deriveProvenanceFromReport({ sampled: 3 });
  assert.equal(p.sampled, 3);
  assert.equal(p.programs_with_ops, null);
  assert.equal(p.corpus_suggested_order, null);
});

test("DEFAULT_LEARNED_ORDER_PATH resolves under state/shared/cam-drive", () => {
  assert.match(DEFAULT_LEARNED_ORDER_PATH.replace(/\\/g, "/"), /state\/shared\/cam-drive\/learned-op-order\.json$/);
});

test("KEEP-IN-SYNC: every ROUGH_BEFORE_FINISH family exists in the real LATHE_OP_ORDER (rename guard)", () => {
  // If the planner renames OD_roughing/OD_finishing/ID_boring/bore_finish, the rough-before-finish
  // invariant would silently stop firing (both has() checks return false). This fails loudly instead.
  for (const [rough, finish] of ROUGH_BEFORE_FINISH) {
    assert.ok(rough in LATHE_OP_ORDER, `ROUGH_BEFORE_FINISH family '${rough}' missing from LATHE_OP_ORDER`);
    assert.ok(finish in LATHE_OP_ORDER, `ROUGH_BEFORE_FINISH family '${finish}' missing from LATHE_OP_ORDER`);
    assert.ok(LATHE_OP_ORDER[rough] < LATHE_OP_ORDER[finish], `${rough} must rank before ${finish} in the curated map`);
  }
});
