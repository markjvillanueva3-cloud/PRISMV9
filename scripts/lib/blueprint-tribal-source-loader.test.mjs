/**
 * U-BPA-RAG-TRIBAL-DEFAULT (slot:india) -- tests the blueprint-extraction tribal
 * source loader/adapter: corpus jsonl -> RetrievedSource[] (kind:"tribal"), with
 * fail-soft on missing/malformed input, topK cap, and a LIVE-corpus smoke that
 * proves the real blueprint-vision-tribal-corpus.jsonl loads with valid shape.
 * Run: node scripts/lib/blueprint-tribal-source-loader.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  adaptCorpusBlob,
  loadBlueprintTribalSources,
  DEFAULT_CORPUS_FILE,
  TRIBAL_PRIOR_SCORE,
} from "./blueprint-tribal-source-loader.mjs";

const REC = (o) => JSON.stringify(o);
const FIXTURE = [
  REC({ id: "bpv-1", slug: "verify-names", kind: "failure-mode", tip: "Verify every engine name on disk." }),
  REC({ slug: "split-before-ocr", kind: "process", tip: "Split a multi-print PDF BEFORE OCR." }), // no id -> slug
  REC({ kind: "convention", tip: "Per-field confidence 0.70 floor -> operator-confirm." }),       // no id/slug -> fallback
].join("\n");

test("adaptCorpusBlob maps each tip to a RetrievedSource{kind:tribal,id,title,score}", () => {
  const out = adaptCorpusBlob(FIXTURE);
  assert.equal(out.length, 3);
  for (const s of out) {
    assert.equal(s.kind, "tribal");
    assert.equal(typeof s.id, "string");
    assert.ok(s.id.length > 0);
    assert.equal(typeof s.title, "string");
    assert.ok(s.title.length > 0);
    assert.equal(s.score, TRIBAL_PRIOR_SCORE);
    assert.ok(s.score >= 0 && s.score <= 1);
  }
  assert.equal(out[0].id, "bpv-1");            // explicit id wins
  assert.equal(out[1].id, "split-before-ocr"); // slug fallback
  assert.ok(out[2].id.startsWith("bpv-tribal-")); // synthesized fallback
  assert.equal(out[0].title, "Verify every engine name on disk.");
});

test("adaptCorpusBlob skips malformed lines and tipless records (never throws)", () => {
  const blob = [
    "{not json}",
    REC({ id: "x", tip: "" }),          // empty tip -> dropped
    REC({ id: "y" }),                    // no tip field -> dropped
    REC({ id: "z", tip: "real tip" }),   // kept
    "   ",                                // blank
  ].join("\n");
  const out = adaptCorpusBlob(blob);
  assert.equal(out.length, 1);
  assert.equal(out[0].id, "z");
});

test("adaptCorpusBlob on empty/null/non-string -> []", () => {
  assert.deepEqual(adaptCorpusBlob(""), []);
  assert.deepEqual(adaptCorpusBlob(null), []);
  assert.deepEqual(adaptCorpusBlob(42), []);
});

test("loadBlueprintTribalSources respects topK (cap + 0)", () => {
  const readImpl = () => FIXTURE;
  assert.equal(loadBlueprintTribalSources({ readImpl }).length, 3);
  assert.equal(loadBlueprintTribalSources({ readImpl, topK: 2 }).length, 2);
  assert.equal(loadBlueprintTribalSources({ readImpl, topK: 0 }).length, 0);
});

test("no topK => NO cap: a corpus larger than any fixed number returns ALL tips (cliff fix)", () => {
  const big = Array.from({ length: 12 }, (_, i) => REC({ id: `b${i}`, tip: `tip ${i}` })).join("\n");
  const all = loadBlueprintTribalSources({ readImpl: () => big });
  assert.equal(all.length, 12);              // not silently capped at 7
  const capped = loadBlueprintTribalSources({ readImpl: () => big, topK: 5 });
  assert.equal(capped.length, 5);            // an explicit topK still caps
});

test("loadBlueprintTribalSources fail-soft: missing/unreadable corpus -> []", () => {
  assert.deepEqual(loadBlueprintTribalSources({ corpusFile: "Z:/does/not/exist.jsonl" }), []);
  const throwingRead = () => { throw new Error("EACCES"); };
  assert.deepEqual(loadBlueprintTribalSources({ readImpl: throwingRead }), []);
});

test("LIVE corpus: the real blueprint-vision-tribal-corpus.jsonl loads with valid shape", () => {
  const live = loadBlueprintTribalSources(); // reads DEFAULT_CORPUS_FILE
  assert.ok(live.length >= 1, `expected >=1 live tribal source from ${DEFAULT_CORPUS_FILE}`);
  for (const s of live) {
    assert.equal(s.kind, "tribal");
    assert.ok(typeof s.id === "string" && s.id.length > 0);
    assert.ok(typeof s.title === "string" && s.title.length > 0);
    assert.ok(s.score >= 0 && s.score <= 1);
  }
});
