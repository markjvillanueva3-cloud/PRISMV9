// scripts/detect-newly-built.test.mjs
// Integration test for the oversize-guard fix shipped 2026-05-27.
// Verifies the degraded-marker emit path + exit 0 on oversize graph.
// Run: node --test scripts/detect-newly-built.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(__dirname, "detect-newly-built.mjs");

function makeTempViz() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "detect-newly-built-test-"));
  const vizDir = path.join(dir, "state", "shared", "system-viz");
  fs.mkdirSync(vizDir, { recursive: true });
  return { tmpRoot: dir, vizDir };
}

function runScript({ tmpRoot, maxBytes }) {
  const env = {
    ...process.env,
    PRISM_DETECT_NEWLY_BUILT_MAX_BYTES: String(maxBytes),
  };
  // The script resolves ROOT via __dirname + ".." (its own location). We can't
  // override that via env, so the test instead points the SCRIPT at its own
  // dir via cwd + symlinks would be complex on Windows. Pragmatic approach:
  // copy the script into the tmp tree where state/shared/system-viz already
  // exists, then run it from there.
  const localScript = path.join(tmpRoot, "scripts", "detect-newly-built.mjs");
  fs.mkdirSync(path.dirname(localScript), { recursive: true });
  fs.copyFileSync(SCRIPT, localScript);
  return spawnSync(process.execPath, [localScript], {
    cwd: tmpRoot,
    env,
    encoding: "utf8",
  });
}

test("graceful degradation: oversize graph triggers degraded marker + exit 0", () => {
  const { tmpRoot, vizDir } = makeTempViz();
  // Write a 'graph' that exceeds the tiny 100-byte threshold we'll set.
  const fakeGraph = JSON.stringify({ nodes: [], edges: [], xxxxxxxxxxxxx: "padding to exceed 100 bytes ".repeat(20) });
  fs.writeFileSync(path.join(vizDir, "system-graph.json"), fakeGraph);
  // Need a previous snapshot too (or the script writes baseline and exits 0 trivially)
  fs.writeFileSync(path.join(vizDir, "system-graph.previous.json"), JSON.stringify({ nodes: [] }));

  const r = runScript({ tmpRoot, maxBytes: 100 });
  assert.equal(r.status, 0, `expected exit 0, got ${r.status}. stderr: ${r.stderr}`);
  assert.match(r.stderr, /DEGRADED: graph oversize/);

  const out = JSON.parse(fs.readFileSync(path.join(vizDir, "newly-built.json"), "utf8"));
  assert.equal(out.degraded, true);
  assert.equal(out.reason, "oversize");
  assert.ok(out.sizeBytes > 100, "sizeBytes should reflect actual file size");
  assert.equal(out.maxSafeBytes, 100);
  assert.equal(out.totals.totalNew, 0);
  assert.deepEqual(out.entries, []);
});

test("normal path: small graph parses + emits baseline on first run", () => {
  const { tmpRoot, vizDir } = makeTempViz();
  // Small in-spec graph; no previous snapshot → baseline branch
  fs.writeFileSync(
    path.join(vizDir, "system-graph.json"),
    JSON.stringify({ nodes: [{ id: "n1", label: "Node 1", layer: 1 }] }),
  );

  const r = runScript({ tmpRoot, maxBytes: 10 * 1024 * 1024 }); // 10MB cap, well above
  assert.equal(r.status, 0);
  assert.doesNotMatch(r.stderr, /DEGRADED/);
  assert.match(r.stdout, /baseline established/);

  const out = JSON.parse(fs.readFileSync(path.join(vizDir, "newly-built.json"), "utf8"));
  assert.equal(out.degraded, undefined);
  assert.match(out.note, /baseline established/);
  assert.equal(out.entries.length, 0);
});

test("PRISM_DETECT_NEWLY_BUILT_MAX_BYTES env knob overrides default threshold", () => {
  const { tmpRoot, vizDir } = makeTempViz();
  // 500-byte file; default 400MB cap would NOT trigger degraded, but env knob
  // of 50 bytes WILL trigger it.
  const padding = JSON.stringify({ nodes: [], edges: [], filler: "x".repeat(500) });
  fs.writeFileSync(path.join(vizDir, "system-graph.json"), padding);
  fs.writeFileSync(path.join(vizDir, "system-graph.previous.json"), JSON.stringify({ nodes: [] }));

  // With cap=50 the file exceeds → degraded
  const r1 = runScript({ tmpRoot, maxBytes: 50 });
  assert.equal(r1.status, 0);
  assert.match(r1.stderr, /DEGRADED/);
  const out1 = JSON.parse(fs.readFileSync(path.join(vizDir, "newly-built.json"), "utf8"));
  assert.equal(out1.maxSafeBytes, 50);

  // With cap=10000 the file fits → normal path (no degraded marker)
  const r2 = runScript({ tmpRoot, maxBytes: 10000 });
  assert.equal(r2.status, 0);
  assert.doesNotMatch(r2.stderr, /DEGRADED/);
  const out2 = JSON.parse(fs.readFileSync(path.join(vizDir, "newly-built.json"), "utf8"));
  assert.notEqual(out2.degraded, true);
});
