// Tests for populate-qdrant-wiki.mjs (HMEMV09 wiki corpus -> Qdrant producer)
// AND the shared streamPopulateQdrant it relies on (populate-qdrant.mjs has no
// test file of its own; the wiki producer is its first consumer).
// Run: node --test scripts/populate-qdrant-wiki.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  wikiValidate,
  ensureWikiCollection,
  DIM,
  DEFAULT_COLLECTION,
} from "./populate-qdrant-wiki.mjs";
import { streamPopulateQdrant } from "./populate-qdrant.mjs";

// --- fixtures -------------------------------------------------------------
const vec = (n, base = 1) => Array.from({ length: n }, (_, i) => (((i * 7 + base) % 127) - 63));
const jsonl = (objs) => objs.map((o) => JSON.stringify(o)); // array of lines (sync-iterable; for-await accepts it)
const okSend = () => ({ status: 0, stdout: '{"result":{"status":"completed"},"status":"ok"}', stderr: "" });

// --- wikiValidate (pure dim/shape guard) ----------------------------------
test("wikiValidate accepts a full-DIM {n,q} and strips t/h/s", () => {
  const r = wikiValidate({ n: "mill-engine", t: "architecture", h: "abc", s: 0.001, q: vec(DIM, 1) });
  assert.deepEqual(Object.keys(r).sort(), ["n", "q"]);
  assert.equal(r.n, "mill-engine");
  assert.equal(r.q.length, DIM);
});

test("wikiValidate rejects a wrong-length vector (truncated/empty-text page)", () => {
  assert.equal(wikiValidate({ n: "truncated", q: vec(3) }), null);
  assert.equal(wikiValidate({ n: "empty", q: [] }), null);
});

test("wikiValidate rejects non-array q / non-string n / nullish", () => {
  assert.equal(wikiValidate({ n: "x", q: "not-an-array" }), null);
  assert.equal(wikiValidate({ n: 42, q: vec(DIM) }), null);
  assert.equal(wikiValidate({ n: "x" }), null);          // missing q
  assert.equal(wikiValidate(null), null);
  assert.equal(wikiValidate(undefined), null);
});

// --- ensureWikiCollection -------------------------------------------------
test("ensureWikiCollection PUTs dim-768 Cosine and confirms via GET", () => {
  const calls = [];
  const spawnImpl = (_cmd, args, opts) => {
    const method = args[4];
    calls.push({ method, body: opts.input });
    if (method === "PUT") return { status: 0, stdout: '{"result":true,"status":"ok"}', stderr: "" };
    return { status: 0, stdout: '{"result":{"status":"green"},"status":"ok"}', stderr: "" };
  };
  const ok = ensureWikiCollection("http://x:6333", DEFAULT_COLLECTION, { spawnImpl });
  assert.equal(ok, true);
  const body = JSON.parse(calls.find((c) => c.method === "PUT").body);
  assert.equal(body.vectors.size, DIM, "vector dim 768");
  assert.equal(body.vectors.distance, "Cosine", "Cosine distance (scale-invariant)");
});

test("ensureWikiCollection returns false when GET shows no result", () => {
  const spawnImpl = (_cmd, args) => (args[4] === "PUT")
    ? { status: 0, stdout: "{}", stderr: "" }
    : { status: 0, stdout: '{"status":"error"}', stderr: "" };
  assert.equal(ensureWikiCollection("http://x:6333", "prism_wiki", { spawnImpl }), false);
});

test("ensureWikiCollection returns false on malformed GET stdout (catch, never throws)", () => {
  const spawnImpl = (_cmd, args) => (args[4] === "PUT")
    ? { status: 0, stdout: "ok", stderr: "" }
    : { status: 0, stdout: "<<not json>>", stderr: "" };
  assert.equal(ensureWikiCollection("http://x:6333", "prism_wiki", { spawnImpl }), false);
});

// --- streamPopulateQdrant + wikiValidate (the live path) ------------------
test("streamPopulateQdrant(wikiValidate) dry-run: sends valid, drops bad, skips __meta", async () => {
  const lines = jsonl([
    { __meta: true, dim: DIM, count: 4 },   // 4 entry lines below (the dim-bad one is a real, written line)
    { n: "n1", q: vec(DIM, 1) },
    { n: "bad", q: vec(4) },              // parses fine -> counted in scanned, dropped by the dim guard
    { n: "n2", q: vec(DIM, 2) },
    { n: "n3", q: vec(DIM, 3) },
  ]);
  const r = await streamPopulateQdrant({ lineIter: lines, dryRun: true, validate: wikiValidate, batchSize: 2 });
  assert.equal(r.ok, true);
  assert.equal(r.sent, 3, "3 full-dim vectors");
  assert.equal(r.dropped, 1, "the dim-4 entry dropped by the guard");
  assert.equal(r.scanned, 4, "4 non-meta entry lines scanned (incl. the dim-bad one)");
  assert.equal(r.malformed, 0, "the dim-bad entry parses -> it is dropped, not malformed");
  assert.equal(r.batches, 2, "batchSize 2 over 3 records -> 2 batches");
});

test("streamPopulateQdrantsendImpl receives byte-identical point payloads", async () => {
  const seen = [];
  const sendImpl = (_m, _u, body) => { seen.push(JSON.parse(body)); return okSend(); };
  const lines = jsonl([{ n: "alpha", q: vec(DIM, 5) }]);
  const r = await streamPopulateQdrant({ lineIter: lines, validate: wikiValidate, sendImpl, batchSize: 10 });
  assert.equal(r.ok, true);
  const pt = seen[0].points[0];
  assert.equal(pt.payload.node_id, "alpha", "payload carries node_id (what ANN consumers read back)");
  assert.equal(pt.vector.length, DIM);
  assert.ok(Math.abs(pt.vector[0] - vec(DIM, 5)[0] / 127) < 1e-9, "dequantized q/127 (Cosine-correct)");
});

test("streamPopulateQdrant honors --limit (trims the final batch)", async () => {
  const lines = jsonl([
    { n: "a", q: vec(DIM, 1) }, { n: "b", q: vec(DIM, 2) },
    { n: "c", q: vec(DIM, 3) }, { n: "d", q: vec(DIM, 4) },
  ]);
  const r = await streamPopulateQdrant({ lineIter: lines, dryRun: true, validate: wikiValidate, batchSize: 10, limit: 2 });
  assert.equal(r.sent, 2, "stops after 2 accepted records");
});

test("streamPopulateQdrant aborts loud on a curl/send failure (no silent partial-success)", async () => {
  const sendImpl = () => ({ status: 7, stdout: "", stderr: "connection refused" });
  const lines = jsonl([{ n: "a", q: vec(DIM, 1) }, { n: "b", q: vec(DIM, 2) }]);
  const r = await streamPopulateQdrant({ lineIter: lines, validate: wikiValidate, sendImpl, batchSize: 1 });
  assert.equal(r.ok, false);
  assert.match(r.error, /curl exit 7/);
  assert.equal(r.sent, 0, "first batch failed -> nothing reported as sent");
});

test("streamPopulateQdrant fails loud (no-records) when every entry is dropped", async () => {
  const lines = jsonl([{ n: "x", q: vec(7) }, { n: "y", q: vec(2) }]);
  const r = await streamPopulateQdrant({ lineIter: lines, dryRun: true, validate: wikiValidate });
  assert.equal(r.ok, false);
  assert.equal(r.error, "no-records");
  assert.equal(r.dropped, 2);
});

test("streamPopulateQdrant default validate accepts native {n,q} (no dim guard)", async () => {
  const lines = jsonl([{ n: "raw", q: [1, 2, 3] }]); // short, but default validate is shape-only
  const r = await streamPopulateQdrant({ lineIter: lines, dryRun: true, batchSize: 5 });
  assert.equal(r.ok, true);
  assert.equal(r.sent, 1, "default validate is dimension-agnostic; the wiki dim guard is opt-in");
});

test("streamPopulateQdrant tolerates malformed JSON lines (skips, counts, never throws)", async () => {
  const lines = ["{not json", JSON.stringify({ n: "a", q: vec(DIM, 1) }), ""];
  const r = await streamPopulateQdrant({ lineIter: lines, dryRun: true, validate: wikiValidate });
  assert.equal(r.ok, true, "no __meta line -> no integrity cross-check, stays ok");
  assert.equal(r.sent, 1, "the one good line is sent; the bad/blank lines are skipped");
  assert.equal(r.malformed, 1, "the unparseable line is COUNTED, not silently dropped");
  assert.match(r.warning, /1 malformed/, "malformed>0 surfaces an honest warning");
});

test("streamPopulateQdrant FAILS LOUD on a torn/truncated corpus (meta.count mismatch)", async () => {
  // meta says 5 entries; only 3 valid + 1 truncated reach us -> 1 entry is just GONE.
  const lines = [
    JSON.stringify({ __meta: true, dim: DIM, count: 5 }),
    JSON.stringify({ n: "a", q: vec(DIM, 1) }),
    JSON.stringify({ n: "b", q: vec(DIM, 2) }),
    '{"n":"truncat',                    // torn last write
    JSON.stringify({ n: "c", q: vec(DIM, 3) }),
  ];
  const r = await streamPopulateQdrant({ lineIter: lines, dryRun: true, validate: wikiValidate });
  assert.equal(r.ok, false, "scanned(3)+malformed(1)=4 != meta.count 5 -> partial populate must NOT report ok");
  assert.match(r.error, /corpus-incomplete/);
  assert.equal(r.malformed, 1);
});

test("streamPopulateQdrant: a complete corpus with one corrupt entry is ok+warning (count still matches)", async () => {
  // 4 entry lines present (none missing), 1 corrupt -> benign single-entry loss.
  const lines = [
    JSON.stringify({ __meta: true, dim: DIM, count: 4 }),
    JSON.stringify({ n: "a", q: vec(DIM, 1) }),
    "not-json-but-a-present-line",
    JSON.stringify({ n: "b", q: vec(DIM, 2) }),
    JSON.stringify({ n: "c", q: vec(DIM, 3) }),
  ];
  const r = await streamPopulateQdrant({ lineIter: lines, dryRun: true, validate: wikiValidate });
  assert.equal(r.ok, true, "scanned(3)+malformed(1)=4 == meta.count 4 -> no lines missing, just one corrupt");
  assert.match(r.warning, /1 malformed/);
  assert.equal(r.sent, 3);
});

test("streamPopulateQdrant: --limit skips the integrity check (intentional partial read)", async () => {
  const lines = [
    JSON.stringify({ __meta: true, dim: DIM, count: 4 }),
    JSON.stringify({ n: "a", q: vec(DIM, 1) }),
    JSON.stringify({ n: "b", q: vec(DIM, 2) }),
    JSON.stringify({ n: "c", q: vec(DIM, 3) }),
    JSON.stringify({ n: "d", q: vec(DIM, 4) }),
  ];
  const r = await streamPopulateQdrant({ lineIter: lines, dryRun: true, validate: wikiValidate, limit: 2 });
  assert.equal(r.ok, true, "deliberate --limit read must NOT trip the meta.count corpus-incomplete guard");
  assert.equal(r.sent, 2);
});
