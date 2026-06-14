// scripts/ollama-offload.test.mjs
// U-VERIFIED-OFFLOAD-CONSUMER (2026-06-09, slot:alpha): the offload primitives must
// (1) accept an Ollama classification ONLY if it's in the allowed enum, (2) fall
// back safely on a hallucinated label / empty result, (3) always hand the digest
// caller a usable string. Hermetic via injected runImpl -- NO network (R9).
import { test } from "node:test";
import assert from "node:assert/strict";

import { offloadClassify, offloadDigest, offloadFilesDigest } from "./ollama-offload.mjs";

test("offloadClassify: a valid in-enum label is accepted (source ollama)", async () => {
  const r = await offloadClassify("a mill facing pass at 0.005 ipr", ["mill", "lathe", "wedm"], { runImpl: async () => "mill" });
  assert.equal(r.source, "ollama");
  assert.equal(r.verified, true);
  assert.equal(r.value, "mill");
});

test("offloadClassify: case/space near-match snaps to the canonical member", async () => {
  const r = await offloadClassify("x", ["mill", "lathe"], { runImpl: async () => "  Lathe\n" });
  assert.equal(r.value, "lathe");
  assert.equal(r.source, "ollama");
});

test("offloadClassify: a HALLUCINATED label is rejected -> fallback null (the 100% guarantee)", async () => {
  const r = await offloadClassify("x", ["mill", "lathe"], { runImpl: async () => "grinding" });
  assert.equal(r.source, "fallback");
  assert.equal(r.value, null);
  assert.equal(r.reason, "verify-failed");
});

test("offloadClassify: ollama empty/unreachable -> fallback null, never throws", async () => {
  const r = await offloadClassify("x", ["mill", "lathe"], { runImpl: async () => "" });
  assert.equal(r.source, "fallback");
  assert.equal(r.value, null);
});

test("offloadClassify: a custom fallback is honored", async () => {
  const r = await offloadClassify("x", ["mill", "lathe"], { runImpl: async () => "nonsense", fallback: () => "unknown" });
  assert.equal(r.value, "unknown");
});

test("offloadClassify: empty allowed -> throws (misuse guard)", async () => {
  await assert.rejects(() => offloadClassify("x", []), /non-empty array/);
});

test("offloadDigest: a non-empty summary is accepted", async () => {
  const r = await offloadDigest("long text here ...", { runImpl: async () => "a concise twelve plus character summary" });
  assert.equal(r.source, "ollama");
  assert.equal(r.verified, true);
  assert.ok(r.value.length >= 12);
});

test("offloadDigest: too-short/empty summary -> fallback to the truncated raw text (caller always gets something)", async () => {
  const raw = "the original source text that must survive a digest failure";
  const r = await offloadDigest(raw, { runImpl: async () => "tiny", fallbackChars: 20 });
  assert.equal(r.source, "fallback");
  assert.equal(r.value, raw.slice(0, 20));
  assert.ok(r.value.length > 0, "digest failure must NEVER blank the field");
});

// ---- offloadFilesDigest (consumer #9: chat-bus / multi-handoff condense) ----

const fakeFs = (map) => (p) => (Object.prototype.hasOwnProperty.call(map, p) ? map[p] : null);

test("offloadFilesDigest: aggregates N readable files + verified summary, sources listed", async () => {
  const readImpl = fakeFs({ "a.md": "alpha content here", "b.jsonl": "bravo message body" });
  const r = await offloadFilesDigest(["a.md", "b.jsonl"], {
    readImpl, runImpl: async () => "a concise twelve plus character digest of both",
  });
  assert.equal(r.source, "ollama");
  assert.equal(r.verified, true);
  assert.deepEqual(r.sources, ["a.md", "b.jsonl"], "both readable files recorded");
});

test("offloadFilesDigest: a missing/unreadable file is SKIPPED fail-soft (not fatal)", async () => {
  const readImpl = fakeFs({ "present.md": "real content" }); // 'gone.md' returns null
  const r = await offloadFilesDigest(["gone.md", "present.md"], {
    readImpl, runImpl: async () => "twelve plus char digest of the one present file",
  });
  assert.deepEqual(r.sources, ["present.md"], "only the readable file is a source");
  assert.equal(r.source, "ollama");
});

test("offloadFilesDigest: leading @ on a path is tolerated (CLI @file form)", async () => {
  const readImpl = fakeFs({ "h.md": "handoff body text" });
  const r = await offloadFilesDigest(["@h.md"], { readImpl, runImpl: async () => "digest twelve plus chars of handoff" });
  assert.deepEqual(r.sources, ["h.md"], "@ stripped before read + in the source list");
});

test("offloadFilesDigest: NOTHING readable -> reason no-readable-files, never throws (R12)", async () => {
  const r = await offloadFilesDigest(["x.md", "y.md"], { readImpl: () => null, runImpl: async () => "unused" });
  assert.equal(r.source, "none");
  assert.equal(r.reason, "no-readable-files");
  assert.deepEqual(r.sources, []);
  assert.equal(r.value, "");
});

test("offloadFilesDigest: ollama down -> fallback to truncated raw aggregate (caller always gets content)", async () => {
  const readImpl = fakeFs({ "a.md": "the aggregate body that must survive an ollama outage" });
  const r = await offloadFilesDigest(["a.md"], { readImpl, runImpl: async () => "", fallbackChars: 30 });
  assert.equal(r.source, "fallback");
  assert.ok(r.value.length > 0, "digest failure must never blank the field");
  assert.deepEqual(r.sources, ["a.md"]);
});

test("offloadFilesDigest: total aggregate is bounded by maxChars (no unbounded read)", async () => {
  const big = "z".repeat(50000);
  const readImpl = fakeFs({ "huge.md": big });
  let seenPromptLen = 0;
  const r = await offloadFilesDigest(["huge.md"], {
    readImpl, maxChars: 1000,
    runImpl: async (prompt) => { seenPromptLen = prompt.length; return "bounded digest twelve plus chars"; },
  });
  assert.equal(r.source, "ollama");
  // offloadDigest re-caps at 16000, but our maxChars=1000 bound must apply first:
  // the aggregate fed in is <= ~1000 + the label, far below the 50000 raw size.
  assert.ok(seenPromptLen < 2000, `prompt should reflect the bounded aggregate, got ${seenPromptLen}`);
});

test("offloadFilesDigest: empty/non-array paths -> throws (misuse guard)", async () => {
  await assert.rejects(() => offloadFilesDigest([]), /non-empty array/);
  await assert.rejects(() => offloadFilesDigest("a.md"), /non-empty array/);
});
