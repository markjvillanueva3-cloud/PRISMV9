/**
 * Tests for index-quoting-data-files.mjs — classify/relevance/purpose/peek/buildIndex.
 * Real-value assertions + adversarial inputs. Run: node --test scripts/index-quoting-data-files.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  categoryOf, isQuotingData, purposeFor, peekShape, buildDataIndex, renderDataIndexMd, indexDataFiles,
} from "./index-quoting-data-files.mjs";

test("categoryOf: path → category", () => {
  assert.equal(categoryOf("mcp-server/data/quoting-lora-smoke-out/quoting_lora_train.jsonl"), "lora-dataset");
  assert.equal(categoryOf("state/shared/calibration/quoting-calibration-active.json"), "calibration");
  assert.equal(categoryOf("state/shared/databases/jm-customers.jsonl"), "database");
  assert.equal(categoryOf("state/shared/quoting/latest-drift-alert.json"), "drift");
  assert.equal(categoryOf("state/shared/quoting/baseline-records-corpus-with-synth.json"), "corpus");
  assert.equal(categoryOf("state/shared/quoting/quoting-knowledge-index.json"), "index");
});

test("isQuotingData: relevant data files only", () => {
  assert.equal(isQuotingData("state/shared/quoting/baseline-records-corpus-with-synth.json"), true);
  assert.equal(isQuotingData("state/shared/databases/jm-customers.jsonl"), true);
  assert.equal(isQuotingData("state/shared/quoting/QUOTING-AWARENESS.md"), true);
  assert.equal(isQuotingData("state/shared/quoting/foo.test.json"), false, "test files excluded");
  assert.equal(isQuotingData("state/shared/quoting/x.json.tmp-123"), false, "tmp excluded");
  assert.equal(isQuotingData("state/shared/mill/mill-data.json"), false, "non-quoting excluded");
  assert.equal(isQuotingData(null), false);
  assert.equal(isQuotingData("x.png"), false, "non-data extension excluded");
});

test("purposeFor: curated purpose for known files, inferred fallback otherwise", () => {
  assert.ok(purposeFor("state/shared/quoting/baseline-records-corpus-with-synth.json").includes("47,905"));
  assert.ok(purposeFor("state/shared/databases/jm-customers.jsonl").includes("473"));
  assert.equal(purposeFor("state/shared/quoting/some-new-thing.json"), "quoting data file");
});

test("peekShape: jsonl first-record keys + record estimate", () => {
  const head = '{"customer":"ACME","part_id":"P1","revenue":100}\n{"customer":"B","part_id":"P2","revenue":50}\n';
  const s = peekShape(head, "jsonl", 4900, false);
  assert.deepEqual(s.topKeys, ["customer", "part_id", "revenue"]);
  assert.equal(s.exact, false);
  assert.ok(s.recordEstimate > 0, "estimates records from avg line length");
});

test("peekShape: small json full-parse → exact array length + keys", () => {
  const arr = JSON.stringify([{ a: 1, b: 2 }, { a: 3, b: 4 }, { a: 5, b: 6 }]);
  const s = peekShape(arr, "json", arr.length, true);
  assert.equal(s.recordEstimate, 3);
  assert.equal(s.exact, true);
  assert.deepEqual(s.topKeys, ["a", "b"]);
});

test("peekShape: json wrapper object with array field → that array's length", () => {
  const obj = JSON.stringify({ schemaVersion: "1", entries: [{ x: 1 }, { x: 2 }] });
  const s = peekShape(obj, "json", obj.length, true);
  assert.equal(s.recordEstimate, 2);
  assert.ok(s.topKeys.includes("entries"));
});

test("peekShape: large json (no full-parse) → head-scanned keys, no count", () => {
  const head = '{"schemaVersion":"1.0.0","model":"nomic","dim":768,"entries":[{"id":"x"';
  const s = peekShape(head, "json", 400 * 1024 * 1024, false);
  assert.ok(s.topKeys.includes("schemaVersion"));
  assert.equal(s.recordEstimate, null);
});

test("buildDataIndex: entries in knowledge-index-compatible schema; counts by category", () => {
  const files = [
    { relPath: "state/shared/quoting/baseline-records-corpus-with-synth.json", sizeBytes: 17_800_000, head: '{"records":[' },
    { relPath: "state/shared/databases/jm-customers.jsonl", sizeBytes: 50000, head: '{"name":"ACME","id":1}\n' },
    { relPath: "state/shared/mill/mill-feeds.json", sizeBytes: 100, head: "{}" }, // excluded (non-quoting)
  ];
  const idx = buildDataIndex(files);
  assert.equal(idx.counts.total, 2, "non-quoting excluded");
  assert.ok(idx.entries.every((e) => e.source === "data" && e.id && e.title && Array.isArray(e.keywords) && e.path));
  assert.ok(idx.counts.byCategory.corpus >= 1 && idx.counts.byCategory.database >= 1);
});

test("buildDataIndex: database files tagged owner=juliett (cross-galaxy); rest charlie", () => {
  const files = [
    { relPath: "state/shared/databases/jm-customers.jsonl", sizeBytes: 50000, head: '{"name":"ACME"}\n' },
    { relPath: "state/shared/quoting/baseline-records-corpus-with-synth.json", sizeBytes: 1000, head: '{"records":[]}' },
  ];
  const idx = buildDataIndex(files);
  const db = idx.entries.find((e) => e.category === "database");
  const corpus = idx.entries.find((e) => e.category === "corpus");
  assert.equal(db.owner, "juliett", "jm-* databases are juliett's domain");
  assert.equal(corpus.owner, "charlie", "corpus is charlie's");
});

test("renderDataIndexMd: database section names the juliett owner", () => {
  const idx = buildDataIndex([{ relPath: "state/shared/databases/jm-customers.jsonl", sizeBytes: 50000, head: '{"name":"ACME"}\n' }]);
  const md = renderDataIndexMd(idx, "2026-05-29", "H:/prism");
  assert.ok(/owned by \*\*juliett\*\*/.test(md), "database section credits juliett");
});

test("buildDataIndex: defensive on null/non-array", () => {
  assert.equal(buildDataIndex(null).entries.length, 0);
  assert.equal(buildDataIndex(42).counts.total, 0);
});

test("renderDataIndexMd: stable shape", () => {
  const idx = buildDataIndex([{ relPath: "state/shared/quoting/latest-drift-alert.json", sizeBytes: 200, head: '{"level":"info"}' }]);
  const md = renderDataIndexMd(idx, "2026-05-29", "H:/prism");
  assert.ok(md.includes("QUOTING-DATA-INDEX"));
  assert.ok(md.includes("data files indexed"));
  assert.ok(md.includes("latest-drift-alert.json"));
});

test("indexDataFiles: end-to-end on injected files (no fs)", () => {
  const { json } = indexDataFiles({
    root: "H:/prism",
    files: [{ relPath: "state/shared/quoting/quoting-knowledge-index.json", sizeBytes: 30000, head: '{"entries":[{"id":"a"}]}' }],
    generatedAtIso: "2026-05-29",
  });
  assert.equal(json.counts.total, 1);
  assert.equal(json.entries[0].source, "data");
});
