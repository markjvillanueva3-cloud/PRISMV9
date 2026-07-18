/**
 * Tests for the JSONL state store of build-content-summary-index.mjs
 * (SIERRA-VAULT-OPS/U-CONTENT-INDEX-STATE-JSONL). Real behavior: round-trips the
 * streaming state store and the emit, asserting on concrete values -- proves the
 * migration off the monolithic CONTENT_INDEX_STATE.json (which threw V8's 512MB
 * "Cannot create a string longer than 0x1fffffe8" at 1.34M entries) preserves the
 * data. Run: node --test scripts/build-content-summary-index.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { saveStateJsonl, loadStateJsonl, loadState, emitFromState } from "./build-content-summary-index.mjs";

let counter = 0;
function tmpDir() {
  const d = path.join(os.tmpdir(), `cidx-state-${process.pid}-${counter++}`);
  fs.mkdirSync(d, { recursive: true });
  return d;
}

function sampleEntries() {
  return new Map([
    ["H:/prism/mcp-server/src/engines::KienzleForceEngine.ts", { sig: "1234:99", note: "Kienzle cutting force", summary: "computes Fc via kc1.1", summarySource: "deterministic", role: "engine", domain: "cross", sizeMB: 0.01 }],
    ["H:/prism/knowledge::wiki/mill/kienzle.md", { sig: "50:1", note: "kienzle coefficients", summary: null, summarySource: "deterministic", role: "wiki", domain: "mill", sizeMB: 0.001 }],
  ]);
}

test("saveStateJsonl -> loadStateJsonl round-trips every entry byte-for-byte", async () => {
  const d = tmpDir();
  const f = path.join(d, "STATE.jsonl");
  const src = sampleEntries();
  await saveStateJsonl(f, src);
  const back = await loadStateJsonl(f);
  assert.equal(back.size, 2);
  // key is stripped back out and the rest object restored intact
  assert.deepEqual(back.get("H:/prism/mcp-server/src/engines::KienzleForceEngine.ts"),
    { sig: "1234:99", note: "Kienzle cutting force", summary: "computes Fc via kc1.1", summarySource: "deterministic", role: "engine", domain: "cross", sizeMB: 0.01 });
  assert.equal(back.get("H:/prism/knowledge::wiki/mill/kienzle.md").summary, null);
  fs.rmSync(d, { recursive: true, force: true });
});

test("saveStateJsonl is a genuine JSONL file (one JSON object per line, keyed)", async () => {
  const d = tmpDir();
  const f = path.join(d, "STATE.jsonl");
  await saveStateJsonl(f, sampleEntries());
  const lines = fs.readFileSync(f, "utf8").split("\n").filter(Boolean);
  assert.equal(lines.length, 2, "one line per entry");
  for (const l of lines) {
    const o = JSON.parse(l);            // each line parses independently (the whole point)
    assert.ok(typeof o.key === "string" && o.key.includes("::"));
    assert.ok("role" in o && "note" in o);
  }
  fs.rmSync(d, { recursive: true, force: true });
});

test("saveStateJsonl writes atomically (no leftover .tmp)", async () => {
  const d = tmpDir();
  const f = path.join(d, "STATE.jsonl");
  await saveStateJsonl(f, sampleEntries());
  assert.ok(fs.existsSync(f));
  assert.ok(!fs.existsSync(`${f}.tmp`), "temp file renamed away");
  fs.rmSync(d, { recursive: true, force: true });
});

test("loadStateJsonl on a missing file returns an empty Map (not a throw)", async () => {
  const back = await loadStateJsonl(path.join(os.tmpdir(), "does-not-exist-cidx.jsonl"));
  assert.equal(back.size, 0);
});

test("loadStateJsonl skips corrupt lines, keeps the good ones", async () => {
  const d = tmpDir();
  const f = path.join(d, "STATE.jsonl");
  fs.writeFileSync(f, [
    JSON.stringify({ key: "a::x.ts", role: "code", note: "ok" }),
    "{ this is not json",
    "",
    JSON.stringify({ key: "b::y.ts", role: "code", note: "ok2" }),
    JSON.stringify({ note: "no key -- dropped" }),
  ].join("\n") + "\n");
  const back = await loadStateJsonl(f);
  assert.equal(back.size, 2, "2 valid keyed rows; corrupt + keyless dropped");
  assert.equal(back.get("b::y.ts").note, "ok2");
  fs.rmSync(d, { recursive: true, force: true });
});

test("loadState prefers the JSONL store when present", async () => {
  const d = tmpDir();
  await saveStateJsonl(path.join(d, "CONTENT_INDEX_STATE.jsonl"), sampleEntries());
  // a legacy .json also present -- must be ignored in favor of the jsonl
  fs.writeFileSync(path.join(d, "CONTENT_INDEX_STATE.json"), JSON.stringify({ entries: { "legacy::z.ts": { role: "code", note: "should not win" } } }));
  const back = await loadState(d);
  assert.equal(back.size, 2);
  assert.ok(back.has("H:/prism/knowledge::wiki/mill/kienzle.md"));
  assert.ok(!back.has("legacy::z.ts"), "legacy .json ignored when jsonl exists");
  fs.rmSync(d, { recursive: true, force: true });
});

test("loadState forward-migrates a small readable legacy .json to jsonl", async () => {
  const d = tmpDir();
  fs.writeFileSync(path.join(d, "CONTENT_INDEX_STATE.json"),
    JSON.stringify({ schemaVersion: "1.0.0", entries: { "src::a.ts": { sig: "1:1", note: "n", role: "code", domain: "cross" } } }));
  const back = await loadState(d);
  assert.equal(back.size, 1);
  assert.equal(back.get("src::a.ts").note, "n");
  // migration side effect: the jsonl store now exists
  assert.ok(fs.existsSync(path.join(d, "CONTENT_INDEX_STATE.jsonl")), "migrated forward to jsonl");
  fs.rmSync(d, { recursive: true, force: true });
});

test("emitFromState streams content-index.jsonl + dedups by absolute path", async () => {
  const d = tmpDir();
  const out = path.join(d, "out"), vault = path.join(d, "vault");
  // two DISTINCT files + one duplicate (same source/rel resolves to same abs path)
  const entries = new Map([
    ["H:/prism/src::EngineA.ts", { sig: "1:1", note: "A", summary: "does A", summarySource: "deterministic", role: "engine", domain: "cross", sizeMB: 0.02 }],
    ["H:/prism/src::EngineB.ts", { sig: "2:2", note: "B", summary: null, summarySource: "deterministic", role: "engine", domain: "mill", sizeMB: 0.03 }],
    ["H:/prism::src/EngineA.ts", { sig: "1:1", note: "A-dupe", summary: "does A", summarySource: "deterministic", role: "engine", domain: "cross", sizeMB: 0.02 }],
  ]);
  await emitFromState(entries, { out, vault });
  const jsonl = fs.readFileSync(path.join(out, "content-index.jsonl"), "utf8").split("\n").filter(Boolean).map(l => JSON.parse(l));
  assert.equal(jsonl.length, 2, "3 entries, 2 unique abs paths (H:/prism/src/EngineA.ts collides)");
  const a = jsonl.find(r => r.path === "EngineA.ts" || r.path === "src/EngineA.ts");
  assert.ok(a, "EngineA survives once");
  assert.equal(jsonl.find(r => r.note === "B").sig, "2:2", "sig carried into the emitted row");
  const summary = JSON.parse(fs.readFileSync(path.join(out, "content-index-summary.json"), "utf8"));
  assert.equal(summary.processed, 2);
  assert.equal(summary.dupesSkipped, 1);
  assert.ok(fs.existsSync(path.join(vault, "by-role", "engine.md")), "per-role note written");
  fs.rmSync(d, { recursive: true, force: true });
});
