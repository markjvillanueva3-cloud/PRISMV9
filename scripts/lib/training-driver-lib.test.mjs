// scripts/lib/training-driver-lib.test.mjs
// Tests for U-TDP01 print-to-CAM training driver pure core.
//
// Coverage floor (per UserPromptSubmit comprehensive-build enforcement):
//   - Happy path × 3 part_classes (extrude_punch, die, shaft) — variability floor
//   - 3+ failure modes (extract failed, CAD failed, CAM failed, record failed)
//   - 2+ adversarial inputs (NaN/Infinity payload, malformed adapter return)
//   - Real reference values — NO toBeDefined() stubs

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  validateAdapters,
  runPipeline,
  buildOperatorCorrectionEvent,
  aggregateBatch,
  REQUIRED_ADAPTERS,
  STAGE_STATUS,
  STAGE_NAMES,
} from "./training-driver-lib.mjs";

// ── Adapter factory for test stubs ─────────────────────────────────

/** Build a mock adapter set. Each fn returns success: true with a canonical payload. */
function makeAdaptersOk() {
  return {
    extract: async ({ pdf_path, part_class }) => ({
      success: true,
      extraction: { pdf_path, part_class, confidence: 0.92, dimensions: [{ id: "d1", value: 25.4 }] },
    }),
    driveCad: async ({ part_class, use_corpus_evidence }) => ({
      success: true,
      setup_id: `setup-${part_class}-${use_corpus_evidence ? "evi" : "tmpl"}`,
      dispatched: [{ kind: "central_oil_hole", ok: true }, { kind: "bevel_face_chamfer", ok: true }],
      skipped: [],
    }),
    driveCam: async ({ part_class, cad_setup_id }) => ({
      success: true,
      nc_output: `O1234 ; ${part_class} program for ${cad_setup_id}\nM30`,
    }),
    recordEvent: async (event) => ({ success: true, written_at: event.ts }),
  };
}

// ── validateAdapters ───────────────────────────────────────────────

test("validateAdapters: empty/null returns all required names missing", () => {
  assert.deepEqual(validateAdapters(null).sort(), [...REQUIRED_ADAPTERS].sort());
  assert.deepEqual(validateAdapters(undefined).sort(), [...REQUIRED_ADAPTERS].sort());
  assert.deepEqual(validateAdapters({}).sort(), [...REQUIRED_ADAPTERS].sort());
});

test("validateAdapters: partial set reports only missing names", () => {
  const partial = { extract: async () => ({}), driveCad: async () => ({}) };
  const missing = validateAdapters(partial);
  assert.ok(!missing.includes("extract"));
  assert.ok(!missing.includes("driveCad"));
  assert.ok(missing.includes("driveCam"));
  assert.ok(missing.includes("recordEvent"));
});

test("validateAdapters: non-function values flagged as missing", () => {
  const bad = { extract: 123, driveCad: "not a fn", driveCam: null, recordEvent: { not: "a fn" } };
  assert.deepEqual(validateAdapters(bad).sort(), [...REQUIRED_ADAPTERS].sort());
});

test("validateAdapters: complete valid set returns empty array", () => {
  assert.deepEqual(validateAdapters(makeAdaptersOk()), []);
});

// ── runPipeline happy paths (variability floor: 3 part_classes) ────

test("runPipeline happy: extrude_punch — all 4 stages OK", async () => {
  const r = await runPipeline(
    { pdf_path: "test/punch.pdf", part_class: "extrude_punch" },
    makeAdaptersOk(),
    { now: () => "2026-05-18T16:00:00Z" },
  );
  assert.equal(r.success, true);
  assert.equal(r.stages.extract.status, STAGE_STATUS.OK);
  assert.equal(r.stages.cad.status, STAGE_STATUS.OK);
  assert.equal(r.stages.cam.status, STAGE_STATUS.OK);
  assert.equal(r.stages.record.status, STAGE_STATUS.OK);
  assert.equal(r.event.payload.accurate, true);
  assert.equal(r.event.payload.extraction_confidence, 0.92);
  assert.equal(r.event.payload.cad_dispatched_count, 2);
  assert.equal(r.event.payload.cam_nc_output_present, true);
  assert.equal(r.summary.stagesReached, 4);
});

test("runPipeline happy: die — variability check", async () => {
  const r = await runPipeline(
    { pdf_path: "test/die.pdf", part_class: "die" },
    makeAdaptersOk(),
  );
  assert.equal(r.success, true);
  assert.equal(r.event.payload.part_class, "die");
  assert.equal(r.event.payload.accurate, true);
});

test("runPipeline happy: shaft — variability check", async () => {
  const r = await runPipeline(
    { pdf_path: "test/shaft.pdf", part_class: "shaft" },
    makeAdaptersOk(),
  );
  assert.equal(r.success, true);
  assert.equal(r.event.payload.part_class, "shaft");
  assert.equal(r.event.payload.accurate, true);
});

test("runPipeline: use_corpus_evidence defaults to true (drives Fusion360 with evidence ranking)", async () => {
  const seen = { use_corpus_evidence: null };
  const ads = makeAdaptersOk();
  ads.driveCad = async (params) => {
    seen.use_corpus_evidence = params.use_corpus_evidence;
    return { success: true, setup_id: "s1", dispatched: [], skipped: [] };
  };
  await runPipeline({ pdf_path: "x.pdf", part_class: "extrude_punch" }, ads);
  assert.equal(seen.use_corpus_evidence, true);
});

test("runPipeline: use_corpus_evidence=false honored (opt-out)", async () => {
  const seen = { use_corpus_evidence: null };
  const ads = makeAdaptersOk();
  ads.driveCad = async (params) => {
    seen.use_corpus_evidence = params.use_corpus_evidence;
    return { success: true, setup_id: "s1", dispatched: [], skipped: [] };
  };
  await runPipeline({ pdf_path: "x.pdf", part_class: "die", use_corpus_evidence: false }, ads);
  assert.equal(seen.use_corpus_evidence, false);
});

// ── Failure modes (≥3 required) ────────────────────────────────────

test("FAILURE 1: extract failed → CAD+CAM skipped, record STILL fires with accurate=false", async () => {
  const ads = makeAdaptersOk();
  ads.extract = async () => ({ success: false, error: "vision LLM timeout" });
  const r = await runPipeline({ pdf_path: "bad.pdf", part_class: "die" }, ads);
  assert.equal(r.stages.extract.status, STAGE_STATUS.FAILED);
  assert.equal(r.stages.extract.reason, "vision LLM timeout");
  assert.equal(r.stages.cad.status, STAGE_STATUS.SKIPPED);
  assert.equal(r.stages.cam.status, STAGE_STATUS.SKIPPED);
  assert.equal(r.stages.record.status, STAGE_STATUS.OK); // ← training signal preserved
  assert.equal(r.event.payload.accurate, false);
  assert.equal(r.event.payload.extract_status, STAGE_STATUS.FAILED);
  assert.equal(r.success, true); // success = record fired
});

test("FAILURE 2: CAD failed → CAM skipped, record fires with extract.ok + cad.failed", async () => {
  const ads = makeAdaptersOk();
  ads.driveCad = async () => ({ success: false, error: "Fusion360 bridge down" });
  const r = await runPipeline({ pdf_path: "x.pdf", part_class: "extrude_punch" }, ads);
  assert.equal(r.stages.extract.status, STAGE_STATUS.OK);
  assert.equal(r.stages.cad.status, STAGE_STATUS.FAILED);
  assert.equal(r.stages.cad.reason, "Fusion360 bridge down");
  assert.equal(r.stages.cam.status, STAGE_STATUS.SKIPPED);
  assert.equal(r.stages.record.status, STAGE_STATUS.OK);
  assert.equal(r.event.payload.accurate, false);
});

test("FAILURE 3: CAM failed → record STILL fires (cad_dispatched + cam_status=failed)", async () => {
  const ads = makeAdaptersOk();
  ads.driveCam = async () => ({ success: false, error: "post-processor missing for machine" });
  const r = await runPipeline({ pdf_path: "x.pdf", part_class: "shaft" }, ads);
  assert.equal(r.stages.extract.status, STAGE_STATUS.OK);
  assert.equal(r.stages.cad.status, STAGE_STATUS.OK);
  assert.equal(r.stages.cam.status, STAGE_STATUS.FAILED);
  assert.equal(r.stages.cam.reason, "post-processor missing for machine");
  assert.equal(r.stages.record.status, STAGE_STATUS.OK);
  assert.equal(r.event.payload.cad_dispatched_count, 2); // CAD did happen
  assert.equal(r.event.payload.accurate, false);
});

test("FAILURE 4: record stage failed → success=false (silent training-signal loss is unacceptable)", async () => {
  const ads = makeAdaptersOk();
  ads.recordEvent = async () => ({ success: false, error: "events JSONL append failed (EACCES)" });
  const r = await runPipeline({ pdf_path: "x.pdf", part_class: "die" }, ads);
  assert.equal(r.stages.record.status, STAGE_STATUS.FAILED);
  assert.equal(r.success, false); // ← THIS is the load-bearing invariant
});

test("FAILURE 5: extract adapter THROWS → caught, normalized to FAILED status, downstream skipped", async () => {
  const ads = makeAdaptersOk();
  ads.extract = async () => { throw new Error("boom — synchronous throw inside async"); };
  const r = await runPipeline({ pdf_path: "x.pdf", part_class: "die" }, ads);
  assert.equal(r.stages.extract.status, STAGE_STATUS.FAILED);
  assert.ok(r.stages.extract.reason.includes("boom"));
  assert.equal(r.stages.record.status, STAGE_STATUS.OK);
});

// ── Adversarial inputs (≥2 required) ───────────────────────────────

test("ADVERSARIAL 1: adapter returns malformed (no success field) → normalized to FAILED", async () => {
  const ads = makeAdaptersOk();
  ads.driveCad = async () => ({ random: "garbage", no_success_field: true });
  const r = await runPipeline({ pdf_path: "x.pdf", part_class: "die" }, ads);
  assert.equal(r.stages.cad.status, STAGE_STATUS.FAILED);
  assert.ok(r.stages.cad.reason.includes("malformed"));
});

test("ADVERSARIAL 2: extraction confidence is NaN → recorded as-is (caller's signal), accurate still computed honestly", async () => {
  const ads = makeAdaptersOk();
  ads.extract = async () => ({ success: true, extraction: { confidence: NaN } });
  const r = await runPipeline({ pdf_path: "x.pdf", part_class: "die" }, ads);
  // We do NOT coerce NaN → 0 silently. The training signal MUST include the
  // anomaly so the consumer can route it to xproc_replay_add.
  assert.equal(Number.isNaN(r.event.payload.extraction_confidence), true);
  assert.equal(r.event.payload.accurate, true); // all stages still ok
});

test("ADVERSARIAL 3: extraction is null but stage reports success → confidence becomes null, no crash", async () => {
  const ads = makeAdaptersOk();
  ads.extract = async () => ({ success: true, extraction: null });
  const r = await runPipeline({ pdf_path: "x.pdf", part_class: "die" }, ads);
  assert.equal(r.stages.extract.status, STAGE_STATUS.OK);
  assert.equal(r.event.payload.extraction_confidence, null);
});

test("ADVERSARIAL 4: oversize built_kinds array (10K items) does not break orchestrator", async () => {
  const huge = Array.from({ length: 10000 }, (_, i) => `feature_${i}`);
  const seen = { built_kinds_len: 0 };
  const ads = makeAdaptersOk();
  ads.driveCad = async (params) => {
    seen.built_kinds_len = params.built_kinds.length;
    return { success: true, setup_id: "s", dispatched: [], skipped: [] };
  };
  const r = await runPipeline({ pdf_path: "x.pdf", part_class: "die", built_kinds: huge }, ads);
  assert.equal(seen.built_kinds_len, 10000);
  assert.equal(r.success, true);
});

// ── Input validation ───────────────────────────────────────────────

test("runPipeline: throws on missing adapters", async () => {
  await assert.rejects(
    () => runPipeline({ pdf_path: "x", part_class: "die" }, {}),
    /missing adapter/,
  );
});

test("runPipeline: throws on null job", async () => {
  await assert.rejects(
    () => runPipeline(null, makeAdaptersOk()),
    /job must be an object/,
  );
});

test("runPipeline: throws on empty pdf_path", async () => {
  await assert.rejects(
    () => runPipeline({ pdf_path: "", part_class: "die" }, makeAdaptersOk()),
    /pdf_path/,
  );
});

test("runPipeline: throws on empty part_class", async () => {
  await assert.rejects(
    () => runPipeline({ pdf_path: "x.pdf", part_class: "" }, makeAdaptersOk()),
    /part_class/,
  );
});

// ── buildOperatorCorrectionEvent ───────────────────────────────────

test("buildOperatorCorrectionEvent: diff count zero → accurate=true", () => {
  const e = buildOperatorCorrectionEvent({
    pdf_path: "p.pdf",
    part_class: "die",
    operator_id: "op-001",
    extracted: { dim1: 25.4, dim2: 12.7 },
    corrected: { dim1: 25.4, dim2: 12.7 },
  }, { now: () => "2026-05-18T16:00:00Z" });
  assert.equal(e.type, "outcome_record");
  assert.equal(e.payload.kind, "operator_correction");
  assert.equal(e.payload.differing_key_count, 0);
  assert.equal(e.payload.accurate, true);
});

test("buildOperatorCorrectionEvent: counts every differing key (deep value)", () => {
  const e = buildOperatorCorrectionEvent({
    pdf_path: "p.pdf",
    part_class: "die",
    operator_id: "op-001",
    extracted: { dim1: 25.4, dim2: 12.7, dim3: { tol: 0.01 } },
    corrected: { dim1: 25.40, dim2: 12.8, dim3: { tol: 0.02 }, dim4: "new" },
  });
  assert.equal(e.payload.differing_key_count, 3); // dim2 + dim3 + dim4
  assert.equal(e.payload.accurate, false);
});

test("buildOperatorCorrectionEvent: throws on missing required fields", () => {
  assert.throws(
    () => buildOperatorCorrectionEvent({ pdf_path: "p.pdf" }),
    /required/,
  );
  assert.throws(
    () => buildOperatorCorrectionEvent({ pdf_path: "p.pdf", part_class: "die", operator_id: "op" }),
    /extracted \+ corrected/,
  );
});

// ── aggregateBatch ─────────────────────────────────────────────────

test("aggregateBatch: aggregates 3-result batch correctly", async () => {
  const ads = makeAdaptersOk();
  const ads2 = makeAdaptersOk();
  ads2.driveCad = async () => ({ success: false, error: "x" });
  const ads3 = makeAdaptersOk();
  ads3.extract = async () => ({ success: false, error: "y" });

  const results = await Promise.all([
    runPipeline({ pdf_path: "a.pdf", part_class: "die" }, ads),
    runPipeline({ pdf_path: "b.pdf", part_class: "die" }, ads2),
    runPipeline({ pdf_path: "c.pdf", part_class: "extrude_punch" }, ads3),
  ]);

  const agg = aggregateBatch(results);
  assert.equal(agg.runCount, 3);
  assert.equal(agg.successCount, 3); // ALL records fired
  assert.equal(agg.fullyHappyPathCount, 1); // only run 1
  assert.equal(agg.byStageStatus.extract.ok, 2);
  assert.equal(agg.byStageStatus.extract.failed, 1);
  assert.equal(agg.byStageStatus.cad.ok, 1);
  assert.equal(agg.byStageStatus.cad.failed, 1);
  assert.equal(agg.byStageStatus.cad.skipped, 1);
  assert.equal(agg.byStageStatus.record.ok, 3);
  assert.deepEqual(agg.partClasses, { die: 2, extrude_punch: 1 });
});

test("aggregateBatch: empty/non-array input safe", () => {
  assert.equal(aggregateBatch([]).runCount, 0);
  assert.equal(aggregateBatch(null).runCount, 0);
  assert.equal(aggregateBatch("not an array").runCount, 0);
});

// ── Exports surface check ──────────────────────────────────────────

test("constants: REQUIRED_ADAPTERS lists all 4 adapters", () => {
  assert.deepEqual([...REQUIRED_ADAPTERS].sort(), ["driveCad", "driveCam", "extract", "recordEvent"]);
});

test("constants: STAGE_STATUS values are stable strings", () => {
  assert.equal(STAGE_STATUS.OK, "ok");
  assert.equal(STAGE_STATUS.FAILED, "failed");
  assert.equal(STAGE_STATUS.SKIPPED, "skipped");
});

test("constants: STAGE_NAMES order matches pipeline (extract → cad → cam → record)", () => {
  assert.deepEqual([...STAGE_NAMES], ["extract", "cad", "cam", "record"]);
});

// ── R12 fail-loud regression ───────────────────────────────────────

test("R12: stage results carry reason strings (never silent)", async () => {
  const ads = makeAdaptersOk();
  ads.driveCam = async () => { throw new Error("specific reason text"); };
  const r = await runPipeline({ pdf_path: "x.pdf", part_class: "die" }, ads);
  assert.equal(r.stages.cam.status, STAGE_STATUS.FAILED);
  assert.ok(r.stages.cam.reason.includes("specific reason text"));
});

test("R12: even on full upstream failure, record stage outputs a non-empty event payload", async () => {
  const ads = makeAdaptersOk();
  ads.extract = async () => ({ success: false, error: "x" });
  const captured = { event: null };
  ads.recordEvent = async (event) => { captured.event = event; return { success: true }; };
  const r = await runPipeline({ pdf_path: "x.pdf", part_class: "die" }, ads);
  assert.equal(r.stages.record.status, STAGE_STATUS.OK);
  assert.ok(captured.event.type === "outcome_record");
  assert.ok(captured.event.ts);
  assert.equal(captured.event.payload.pdf_path, "x.pdf");
  assert.equal(captured.event.payload.part_class, "die");
  assert.equal(captured.event.payload.accurate, false);
});

// U-TDP03 contract: event payload MUST carry the full extraction object so
// the aggregator can mine dimensions/features/tolerances. Pre-iter-9 the
// payload only carried `extraction_confidence` (summary scalar), which made
// the aggregator emit empty templates. This test pins the fix.
test("U-TDP03 contract: event payload.extraction is the full extraction object", async () => {
  const ads = makeAdaptersOk();
  const captured = { event: null };
  ads.recordEvent = async (event) => { captured.event = event; return { success: true }; };
  await runPipeline({ pdf_path: "x.pdf", part_class: "extrude_punch" }, ads);
  // The makeAdaptersOk() stub returns extraction={pdf_path, part_class, confidence, dimensions:[{id,value}]}
  assert.ok(captured.event.payload.extraction);
  assert.equal(captured.event.payload.extraction.part_class, "extrude_punch");
  assert.equal(captured.event.payload.extraction.confidence, 0.92);
  assert.ok(Array.isArray(captured.event.payload.extraction.dimensions));
});

test("U-TDP03 contract: when extract failed, payload.extraction is null (not missing)", async () => {
  const ads = makeAdaptersOk();
  ads.extract = async () => ({ success: false, error: "vision down" });
  const captured = { event: null };
  ads.recordEvent = async (event) => { captured.event = event; return { success: true }; };
  await runPipeline({ pdf_path: "x.pdf", part_class: "die" }, ads);
  // Field MUST be present (consumer + aggregator probe for it) but null.
  assert.equal("extraction" in captured.event.payload, true);
  assert.equal(captured.event.payload.extraction, null);
});
