// Tests for youtube-night-extract.mjs (U-YT-NIGHT-STAGE, slot:zulu 2026-06-12).
// R9: each test pins WHY -- the queue validator keeps the night lane curated
// and flag-injection-proof, the rotation logic prevents nightly re-extraction
// waste while letting FAILED queries retry, runQueries isolates failures with
// durable forensics, and the STAGING-ONLY invariant (--no-ingest --no-wiki) is
// pinned so the clobber-class defect that got the parent script HARD-REJECTED
// from the night lane (wf_eaeb1510) can never silently return.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  queryInvalidReason, parseQueue, parseLedger, dueQueries, runQueries,
  QUEUE_PATH, QUEUE_SCHEMA,
} from "./youtube-night-extract.mjs";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse("2026-06-12T22:30:00Z");
const iso = (ms) => new Date(ms).toISOString();

// -- queue validation (fail-loud curation gate) ------------------------------

test("queryInvalidReason: valid entry passes; missing id/query and FLAG-INJECTION query rejected", () => {
  assert.equal(queryInvalidReason({ id: "mill-1", query: "ytsearch3:cnc milling tram head", domain: "mill" }), null);
  assert.ok(queryInvalidReason({ query: "x" }), "missing id");
  assert.ok(queryInvalidReason({ id: "a" }), "missing query");
  assert.ok(queryInvalidReason(null));
  // A query starting with '-' would be parsed as a FLAG by youtube-free-extract
  // (e.g. '--out C:/x' redirects the staging dir) -- must be rejected.
  assert.match(queryInvalidReason({ id: "evil", query: "--out C:/anywhere" }), /must not start with '-'/);
});

test("parseQueue: corrupt JSON / wrong schema / duplicate ids FAIL LOUD (nothing runs)", () => {
  assert.equal(parseQueue("{ torn").ok, false);
  assert.equal(parseQueue(JSON.stringify({ schemaVersion: "9.9.9", queries: [] })).ok, false);
  const dup = { schemaVersion: QUEUE_SCHEMA, queries: [
    { id: "a", query: "q1" }, { id: "a", query: "q2" },
  ] };
  assert.match(parseQueue(JSON.stringify(dup)).error, /duplicate/);
});

test("parseQueue: the SHIPPED live queue parses clean (real-data gate)", () => {
  const r = parseQueue(readFileSync(QUEUE_PATH, "utf8"));
  assert.equal(r.ok, true, r.error);
  assert.ok(r.queue.queries.length >= 8, "seeded with the 8 closed-loop domain queries");
  const domains = new Set(r.queue.queries.map((q) => q.domain));
  for (const d of ["cad", "cam", "speed-feed", "post-processor", "wedm", "mill", "lathe", "blueprint-vision"]) {
    assert.ok(domains.has(d), `closed-loop domain '${d}' missing from the seed queue`);
  }
});

// -- rotation (cooldown on OK only) ------------------------------------------

test("dueQueries: fresh-OK query skipped; stale-OK due again; FAILED run retries next night; disabled never due", () => {
  const queue = { queries: [
    { id: "fresh", query: "q" }, { id: "stale", query: "q" },
    { id: "failed", query: "q" }, { id: "off", query: "q", enabled: false },
    { id: "never", query: "q" },
  ] };
  const ledger = [
    { ts: iso(NOW - 1 * DAY), queryId: "fresh", ok: true },
    { ts: iso(NOW - 8 * DAY), queryId: "stale", ok: true },
    { ts: iso(NOW - 1 * DAY), queryId: "failed", ok: false }, // failure must NOT start a cooldown
    { ts: iso(NOW - 1 * DAY), queryId: "off", ok: true },
  ];
  const due = dueQueries(queue, ledger, NOW, 7).map((q) => q.id);
  assert.deepEqual(due, ["stale", "failed", "never"]);
});

test("dueQueries: garbage ledger rows (bad ts, missing queryId) are ignored, not crashes", () => {
  const queue = { queries: [{ id: "a", query: "q" }] };
  const due = dueQueries(queue, [{ ts: "not-a-date", queryId: "a", ok: true }, { ok: true }, null], NOW, 7);
  assert.equal(due.length, 1, "unparseable history must not suppress a query");
});

test("parseLedger: torn/garbage JSONL lines skipped, valid rows kept", () => {
  const rows = parseLedger('{"queryId":"a","ok":true,"ts":"2026-06-12T00:00:00Z"}\n{ torn\n\n{"queryId":"b","ok":false,"ts":"2026-06-12T00:00:00Z"}');
  assert.equal(rows.length, 2);
});

// -- runQueries (isolation + forensics + staging invariant) -------------------

test("runQueries: one failure never stops the next; ledger row per query; timeout(null status) maps to -1", () => {
  const logged = [];
  const r = runQueries(
    [{ id: "ok1", query: "a" }, { id: "boom", query: "b" }, { id: "hang", query: "c" }, { id: "ok2", query: "d" }],
    {
      runImpl: (q) => {
        if (q.id === "boom") return { status: 4, stdout: "", stderr: "ollama down" };
        if (q.id === "hang") return { status: null, stdout: "", stderr: "" }; // timeout/kill shape
        return { status: 0, stdout: "fine", stderr: "" };
      },
      logImpl: (row) => logged.push(row),
      nowIso: () => "2026-06-12T23:00:00Z",
    }
  );
  assert.equal(r.ran, 2);
  assert.equal(r.failed, 2);
  assert.equal(logged.length, 4, "every query gets a durable forensics row");
  assert.equal(logged[1].exitCode, 4);
  assert.match(logged[1].tail, /ollama down/);
  assert.equal(logged[2].exitCode, -1, "null status never a silent 0");
  assert.equal(logged[3].queryId, "ok2", "query AFTER failures still ran");
});

test("runQueries: ADVERSARIAL runImpl throw + logImpl throw are both contained", () => {
  const r = runQueries([{ id: "throws", query: "x" }], {
    runImpl: () => { throw new Error("spawn exploded"); },
    logImpl: () => { throw new Error("disk full"); },
  });
  assert.equal(r.failed, 1);
  assert.match(r.rows[0].tail, /spawn exploded/);
});

test("STAGING-ONLY invariant: the default spawn argv carries --no-ingest AND --no-wiki (clobber-defect pin)", () => {
  // The invariant lives in defaultRunImpl's argv. Read the source and assert
  // the flags are adjacent to the spawn -- a regression that drops either flag
  // re-introduces unattended shared-store mutation (the HARD-REJECT reason).
  const src = readFileSync(new URL("./youtube-night-extract.mjs", import.meta.url), "utf8");
  assert.match(src, /q\.query,\s*"--no-ingest",\s*"--no-wiki"/, "staging flags must be hardcoded in defaultRunImpl argv");
});
