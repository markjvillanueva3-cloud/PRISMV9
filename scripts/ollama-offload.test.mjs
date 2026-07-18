// scripts/ollama-offload.test.mjs
// U-VERIFIED-OFFLOAD-CONSUMER (2026-06-09, slot:alpha): the offload primitives must
// (1) accept an Ollama classification ONLY if it's in the allowed enum, (2) fall
// back safely on a hallucinated label / empty result, (3) always hand the digest
// caller a usable string. Hermetic via injected runImpl -- NO network (R9).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { offloadClassify, offloadDigest, offloadFilesDigest, offloadClassifyStrong, offloadDigestStrong, recordLocalOffload } from "./ollama-offload.mjs";

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

// ---- offloadClassifyStrong / offloadDigestStrong (U-HERMES-VERIFIED-TIER-WIRE) ----
// The strong variants route the SAME verified classify/digest through Hermes -> Ollama
// -> the SAME safe fallback. Hermetic via injected hermesRunImpl/ollamaRunImpl/record
// (record stubbed so the real offload-stats file is never touched).

test("offloadClassifyStrong: Hermes verifies -> source hermes, Ollama NOT called", async () => {
  let ollamaCalls = 0;
  const r = await offloadClassifyStrong("a mill facing pass", ["mill", "lathe", "wedm"], {
    hermesRunImpl: async () => "mill",
    ollamaRunImpl: async () => { ollamaCalls++; return "mill"; },
    record: () => {},
  });
  assert.equal(r.source, "hermes");
  assert.equal(r.tier, "strong");
  assert.equal(r.value, "mill");
  assert.equal(r.verified, true);
  assert.equal(ollamaCalls, 0); // strong success short-circuits
});

test("offloadClassifyStrong: a HALLUCINATED Hermes label is rejected -> descends to Ollama", async () => {
  const r = await offloadClassifyStrong("x", ["mill", "lathe"], {
    hermesRunImpl: async () => "grinding", // not in enum -> rejected, must descend
    ollamaRunImpl: async () => "lathe",
    record: () => {},
  });
  assert.equal(r.source, "ollama-fallback");
  assert.equal(r.value, "lathe");
  assert.notEqual(r.value, "grinding"); // the hallucination never surfaces
});

test("offloadClassifyStrong: BOTH tiers fail -> safe fallback null (identical floor to offloadClassify)", async () => {
  const r = await offloadClassifyStrong("x", ["mill", "lathe"], {
    hermesRunImpl: async () => "junk", ollamaRunImpl: async () => "", record: () => {},
  });
  assert.equal(r.source, "kept");
  assert.equal(r.value, null);
});

test("offloadClassifyStrong: a custom fallback is honored when both tiers fail", async () => {
  const r = await offloadClassifyStrong("x", ["mill", "lathe"], {
    hermesRunImpl: async () => "junk", ollamaRunImpl: async () => "nonsense",
    fallback: () => "unknown", record: () => {},
  });
  assert.equal(r.value, "unknown");
});

test("offloadClassifyStrong: empty allowed -> throws (misuse guard)", async () => {
  await assert.rejects(() => offloadClassifyStrong("x", []), /non-empty array/);
});

test("offloadClassifyStrong: telemetry sink receives the off-Claude call (source hermes)", async () => {
  const rec = [];
  await offloadClassifyStrong("x", ["mill", "lathe"], {
    hermesRunImpl: async () => "mill", record: (call) => rec.push(call),
  });
  assert.equal(rec.length, 1);
  assert.equal(rec[0].source, "hermes");
  assert.equal(rec[0].mode, "classify");
  assert.ok(rec[0].tokensSaved > 0);
});

test("offloadClassifyStrong: the built classify prompt reaches the runner", async () => {
  let seen = "";
  await offloadClassifyStrong("a facing pass at 0.005 ipr", ["mill", "lathe"], {
    hermesRunImpl: async (prompt) => { seen = prompt; return "mill"; }, record: () => {},
  });
  assert.match(seen, /Classify the following into EXACTLY ONE/);
  assert.match(seen, /a facing pass at 0.005 ipr/);
});

test("offloadDigestStrong: Hermes non-empty summary -> source hermes, verified", async () => {
  const r = await offloadDigestStrong("long source text ...", {
    hermesRunImpl: async () => "a concise twelve plus character summary", record: () => {},
  });
  assert.equal(r.source, "hermes");
  assert.equal(r.verified, true);
  assert.ok(r.value.length >= 12);
});

test("offloadDigestStrong: both tiers fail -> truncated raw fallback (caller always gets content)", async () => {
  const raw = "the original source text that must survive a digest failure across both tiers";
  const r = await offloadDigestStrong(raw, {
    hermesRunImpl: async () => "tiny", ollamaRunImpl: async () => "", fallbackChars: 25, record: () => {},
  });
  assert.equal(r.source, "kept");
  assert.equal(r.value, raw.slice(0, 25));
  assert.ok(r.value.length > 0, "digest failure must never blank the field");
});

// ---- recordLocalOffload (U-LOCAL-OFFLOAD-VISIBLE: make the local CLI offloads VISIBLE) ----
// A verified local offload (classify/digest/digest-files) must land in byHook["ollama-offload-cli"]
// with offloaded>0 (a real off-Claude run the dashboard auto-recognizes) + a per-mode byMode split,
// WITHOUT conflating the ask-ollama-scoped executedOffloads. Sync fixtures (the recorder is sync).
test("recordLocalOffload: folds byHook['ollama-offload-cli'] (fired/offloaded/tokensSaved/byMode); leaves executedOffloads untouched", () => {
  const tmp = join(tmpdir(), `olo-stats-${process.pid}-${Math.floor(performance.now())}.json`);
  writeFileSync(tmp, JSON.stringify({ byHook: {}, executedOffloads: 5 }, null, 2));
  try {
    assert.equal(recordLocalOffload({ mode: "classify", tokensSaved: 120, statsPath: tmp }), true);
    recordLocalOffload({ mode: "digest", tokensSaved: 300, statsPath: tmp });
    recordLocalOffload({ mode: "classify", tokensSaved: 80, statsPath: tmp });
    const h = JSON.parse(readFileSync(tmp, "utf8")).byHook["ollama-offload-cli"];
    assert.equal(h.fired, 3);
    assert.equal(h.offloaded, 3);
    assert.equal(h.tokensSaved, 500);
    assert.equal(h.byMode.classify, 2, "per-mode count tracks classify runs");
    assert.equal(h.byMode.digest, 1, "per-mode count tracks digest runs");
    // R7: these run via callOllamaOnce (distinct lane) -> must NOT bump ask-ollama-scoped executedOffloads.
    assert.equal(JSON.parse(readFileSync(tmp, "utf8")).executedOffloads, 5, "executedOffloads left untouched");
  } finally {
    rmSync(tmp, { force: true });
  }
});

test("recordLocalOffload: MISSING stats file -> false, never creates a parallel store", () => {
  const missing = join(tmpdir(), `olo-missing-${process.pid}.json`);
  assert.equal(recordLocalOffload({ mode: "digest", tokensSaved: 10, statsPath: missing }), false);
  assert.equal(existsSync(missing), false);
});

test("recordLocalOffload: garbage (non-JSON) stats file -> false, never throws", () => {
  const tmp = join(tmpdir(), `olo-garbage-${process.pid}.json`);
  writeFileSync(tmp, "not json {{{");
  try {
    assert.equal(recordLocalOffload({ mode: "digest", tokensSaved: 10, statsPath: tmp }), false);
  } finally {
    rmSync(tmp, { force: true });
  }
});

test("recordLocalOffload: negative/NaN tokensSaved floors to 0 (never a negative saving)", () => {
  const tmp = join(tmpdir(), `olo-neg-${process.pid}.json`);
  writeFileSync(tmp, JSON.stringify({ byHook: {} }));
  try {
    recordLocalOffload({ mode: "digest-files", tokensSaved: -400, statsPath: tmp });
    recordLocalOffload({ mode: "digest-files", tokensSaved: NaN, statsPath: tmp });
    const h = JSON.parse(readFileSync(tmp, "utf8")).byHook["ollama-offload-cli"];
    assert.equal(h.tokensSaved, 0);
    assert.equal(h.offloaded, 2);
    assert.equal(h.byMode["digest-files"], 2);
  } finally {
    rmSync(tmp, { force: true });
  }
});
