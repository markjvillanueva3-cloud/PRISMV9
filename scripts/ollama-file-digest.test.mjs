// scripts/ollama-file-digest.test.mjs
// U-VERIFIED-OFFLOAD-FILEDIGEST (2026-06-09, slot:alpha): the line-anchored digest
// must (1) KEEP only claims whose snippet truly appears at the cited line, (2) REJECT
// a digest where no claim verifies (-> fallback), (3) attach file metadata, (4) never
// throw on a read failure. Hermetic: injected runImpl + tmp fixtures, NO network (R9).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { lineAnchoredVerifier, offloadFileDigest, parseCliArgs } from "./ollama-file-digest.mjs";

const FILE = ["const ALPHA = 1;", "function compute(x) { return x * ALPHA; }", "export { compute };"];
const LINES = FILE; // verifier takes a line array directly

// async fs throughout (alpha soul refuses sync-fs-in-async).
async function withFixture(content, fn) {
  const dir = await mkdtemp(join(tmpdir(), "ofd-"));
  const p = join(dir, "fixture.txt");
  await writeFile(p, content);
  try { return await fn(p); } finally { await rm(dir, { recursive: true, force: true }); }
}

// ---- lineAnchoredVerifier (pure, the trust mechanism) ----
test("verifier: claims whose snippet matches the cited line are kept", () => {
  const v = lineAnchoredVerifier(LINES);
  const r = v(JSON.stringify({ summary: "defines compute", claims: [
    { line: 1, snippet: "const ALPHA = 1;" },
    { line: 2, snippet: "function compute" },
  ] }));
  assert.equal(r.ok, true);
  assert.equal(r.value.summary, "defines compute");
  assert.deepEqual(r.value.claims, [
    { line: 1, snippet: "const ALPHA = 1;" },
    { line: 2, snippet: "function compute" },
  ]);
});

test("verifier: a hallucinated snippet (not at the cited line) is DROPPED", () => {
  const v = lineAnchoredVerifier(LINES);
  const r = v(JSON.stringify({ summary: "x", claims: [
    { line: 1, snippet: "const ALPHA = 1;" },          // real -> kept
    { line: 1, snippet: "import nonsense from sky" },   // not at line 1 -> dropped
  ] }));
  assert.equal(r.ok, true);
  assert.equal(r.value.claims.length, 1);
  assert.equal(r.value.claims[0].snippet, "const ALPHA = 1;");
});

test("verifier: when NO claim verifies, the whole digest is rejected (-> fallback)", () => {
  const v = lineAnchoredVerifier(LINES);
  assert.equal(v(JSON.stringify({ summary: "x", claims: [{ line: 2, snippet: "totally fabricated text" }] })), false);
});

test("verifier: out-of-range line numbers are dropped", () => {
  const v = lineAnchoredVerifier(LINES);
  assert.equal(v(JSON.stringify({ summary: "x", claims: [{ line: 99, snippet: "const ALPHA = 1;" }] })), false);
  assert.equal(v(JSON.stringify({ summary: "x", claims: [{ line: 0, snippet: "const ALPHA = 1;" }] })), false);
});

test("verifier: a too-short snippet (< min len) is dropped (match-anything noise)", () => {
  const v = lineAnchoredVerifier(LINES);
  assert.equal(v(JSON.stringify({ summary: "x", claims: [{ line: 1, snippet: "co" }] })), false);
});

test("verifier: non-JSON and JSON-array replies are rejected", () => {
  const v = lineAnchoredVerifier(LINES);
  assert.equal(v("not json at all"), false);
  assert.equal(v(JSON.stringify(["a", "b"])), false);
});

test("verifier: whitespace differences between snippet and source still match", () => {
  const v = lineAnchoredVerifier(LINES);
  const r = v(JSON.stringify({ summary: "x", claims: [{ line: 2, snippet: "function   compute(x)" }] }));
  assert.equal(r.ok, true);
  assert.equal(r.value.claims.length, 1);
});

// ---- offloadFileDigest (file read + verified offload + metadata) ----
test("offloadFileDigest: a valid model digest is accepted with metadata attached", async () => {
  await withFixture(FILE.join("\n"), async (p) => {
    const r = await offloadFileDigest(p, { runImpl: async () => JSON.stringify({
      summary: "defines a compute helper", claims: [{ line: 3, snippet: "export { compute };" }],
    }) });
    assert.equal(r.source, "ollama");
    assert.equal(r.verified, true);
    assert.equal(r.value.claims[0].line, 3);
    assert.equal(r.value.path, p);
    assert.equal(r.value.lineCount, 3);
    assert.equal(typeof r.value.sha, "string");
    assert.equal(r.value.sha.length, 8);
  });
});

test("offloadFileDigest: an all-hallucinated digest falls back to head+tail (degraded), metadata still attached", async () => {
  await withFixture(FILE.join("\n"), async (p) => {
    const r = await offloadFileDigest(p, { runImpl: async () => JSON.stringify({
      summary: "wrong", claims: [{ line: 1, snippet: "this is not in the file" }],
    }) });
    assert.equal(r.source, "fallback");
    assert.equal(r.value.degraded, true);
    assert.deepEqual(r.value.claims, []);
    assert.ok(typeof r.value.headTail === "string" && r.value.headTail.length > 0);
    assert.equal(r.value.lineCount, 3);
  });
});

test("offloadFileDigest: ollama empty/unreachable -> fallback, never throws", async () => {
  await withFixture(FILE.join("\n"), async (p) => {
    const r = await offloadFileDigest(p, { runImpl: async () => "" });
    assert.equal(r.source, "fallback");
    assert.equal(r.value.degraded, true);
  });
});

test("offloadFileDigest: a missing file -> fallback reason read-failed, never throws", async () => {
  const r = await offloadFileDigest(join(tmpdir(), "definitely-missing-ofd-fixture-xyz.txt"), { runImpl: async () => "{}" });
  assert.equal(r.source, "fallback");
  assert.equal(r.reason, "read-failed");
  assert.equal(r.value, null);
});

// ---- parseCliArgs (the --max-lines value must NOT be mistaken for the path) ----
test("parseCliArgs: path only", () => {
  assert.deepEqual(parseCliArgs(["file.txt"]), { path: "file.txt", maxLines: undefined });
});

test("parseCliArgs: path then --max-lines", () => {
  assert.deepEqual(parseCliArgs(["file.txt", "--max-lines", "50"]), { path: "file.txt", maxLines: 50 });
});

test("parseCliArgs: --max-lines then path (the value 50 must NOT become the path)", () => {
  assert.deepEqual(parseCliArgs(["--max-lines", "50", "file.txt"]), { path: "file.txt", maxLines: 50 });
});

test("parseCliArgs: only flag+value, no path -> path undefined", () => {
  assert.deepEqual(parseCliArgs(["--max-lines", "50"]), { path: undefined, maxLines: 50 });
});

test("parseCliArgs: empty argv -> path undefined", () => {
  assert.deepEqual(parseCliArgs([]), { path: undefined, maxLines: undefined });
});
