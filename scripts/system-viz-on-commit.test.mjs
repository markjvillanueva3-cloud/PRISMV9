import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { foldDebtVerdict, rebuildMasterIndexSidecar } from "./system-viz-on-commit.mjs";
import { runMasterIndexSearch } from "./lib/master-index-search-lib.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(__dirname, "system-viz-on-commit.mjs");
const BUILD_INDEX = path.join(__dirname, "build-graph-index.mjs");
// Windows: dynamic import() needs a file:// URL, not a raw `H:\...` path.
const SCRIPT_URL = pathToFileURL(SCRIPT).href;

// Real-process helper: run the script/module in a fresh node with env-pointed
// fixture paths so the REAL reader wiring is exercised (RGS-TOOL-AUTOINVOKE-MS1
// lesson: hermetic in-process fakes hide key-mismatch bugs — this is the
// real-data E2E oracle that catches them).
function runNode(code, env) {
  return spawnSync(process.execPath, ["-e", code], {
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
}

// W1 / U-FOLD-DEFAULT — pure verdict logic for the fold-debt staleness gate.
// Date.now() is injected (nowMs) so every branch is deterministic.

const NOW = Date.parse("2026-05-16T12:00:00.000Z");
const hrsAgo = (h) => new Date(NOW - h * 3.6e6).toISOString();

test("no marker → clean, exit 0 (chain never skipped a fold)", () => {
  const v = foldDebtVerdict(null, 6, NOW);
  assert.equal(v.ok, true);
  assert.equal(v.code, 0);
  assert.match(v.message, /no marker yet/);
});

test("status=folded → clean regardless of age (fold happened in-commit)", () => {
  const v = foldDebtVerdict({ status: "folded", pendingCount: 12, ts: hrsAgo(99) }, 6, NOW);
  assert.equal(v.ok, true);
  assert.equal(v.code, 0);
  assert.match(v.message, /clean/);
});

test("status=skipped, pendingCount=0 → clean (nothing was actually pending)", () => {
  const v = foldDebtVerdict({ status: "skipped", pendingCount: 0, ts: hrsAgo(48) }, 6, NOW);
  assert.equal(v.ok, true);
  assert.equal(v.code, 0);
  assert.match(v.message, /pendingCount=0/);
});

test("status=skipped, fresh (age ≤ maxHrs) → clean, next round-2 will fold", () => {
  const v = foldDebtVerdict({ status: "skipped", pendingCount: 5, ts: hrsAgo(2) }, 6, NOW);
  assert.equal(v.ok, true);
  assert.equal(v.code, 0);
  assert.match(v.message, /next commit's round-2/);
});

test("status=skipped, STUCK (age > maxHrs, pending>0) → FAIL exit 1 with remedy", () => {
  const v = foldDebtVerdict({ status: "skipped", pendingCount: 7, ts: hrsAgo(9) }, 6, NOW);
  assert.equal(v.ok, false);
  assert.equal(v.code, 1);
  assert.match(v.message, /STUCK/);
  assert.match(v.message, /FOLD_NEWLY_BUILT=1/);
  assert.match(v.message, /7 newly-built/);
});

test("boundary: age exactly == maxHrs is NOT stuck (strict > threshold)", () => {
  const v = foldDebtVerdict({ status: "skipped", pendingCount: 3, ts: hrsAgo(6) }, 6, NOW);
  assert.equal(v.ok, true, "age == maxHrs must be treated as still-fresh (strict >)");
  assert.equal(v.code, 0);
});

test("adversarial: malformed ts → treated as infinitely old → STUCK when pending>0", () => {
  const v = foldDebtVerdict({ status: "skipped", pendingCount: 2, ts: "not-a-date" }, 6, NOW);
  assert.equal(v.ok, false, "unparseable ts must fail-loud as stuck, not silently pass");
  assert.equal(v.code, 1);
});

test("adversarial: missing ts field → infinitely old → STUCK when pending>0", () => {
  const v = foldDebtVerdict({ status: "skipped", pendingCount: 1 }, 6, NOW);
  assert.equal(v.ok, false);
  assert.equal(v.code, 1);
});

test("adversarial: unknown status string → not folded, not skipped → treated as skipped-path", () => {
  // Defensive: an unexpected status with stale ts + pending must not silently pass.
  const v = foldDebtVerdict({ status: "garbage", pendingCount: 4, ts: hrsAgo(99) }, 6, NOW);
  assert.equal(v.ok, false, "unknown status with stale pending debt must fail-loud");
  assert.equal(v.code, 1);
});

test("variability: large maxHrs window keeps an old skip clean", () => {
  const v = foldDebtVerdict({ status: "skipped", pendingCount: 9, ts: hrsAgo(20) }, 48, NOW);
  assert.equal(v.ok, true, "with a 48h window a 20h-old skip is still fresh");
  assert.equal(v.code, 0);
});

// ---------------------------------------------------------------------------
// REAL-DATA integration (subprocess, env-pointed fixtures). These would have
// caught the P0 where readNewlyBuiltCount() read the wrong key and returned 0
// against the actual detect-newly-built.mjs output shape.
// ---------------------------------------------------------------------------

test("readNewlyBuiltCount reads the REAL detect-newly-built shape {totals:{totalNew}}", () => {
  const tmp = path.join(os.tmpdir(), `prism-nb-real-${Date.now()}.json`);
  // EXACT shape detect-newly-built.mjs:148-155 writes.
  fs.writeFileSync(tmp, JSON.stringify({
    generatedAt: new Date().toISOString(),
    sinceCommit: "abc1234",
    prevGeneratedAt: null,
    totals: { added: 51756, wired: 1, needsWiring: 1, totalNew: 51758 },
    headlineDelta: {},
    entries: new Array(51758).fill({ id: "x" }),
  }));
  try {
    const r = runNode(
      `import(${JSON.stringify(SCRIPT_URL)}).then(m=>process.stdout.write(String(m.readNewlyBuiltCount())))`,
      { PRISM_NEWLY_BUILT_PATH: tmp }
    );
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout.trim(), "51758", "must read totals.totalNew, NOT return 0 on the real shape");
  } finally {
    fs.rmSync(tmp, { force: true });
  }
});

test("readNewlyBuiltCount falls back to entries.length when totals absent", () => {
  const tmp = path.join(os.tmpdir(), `prism-nb-entries-${Date.now()}.json`);
  fs.writeFileSync(tmp, JSON.stringify({ entries: [{ id: 1 }, { id: 2 }, { id: 3 }] }));
  try {
    const r = runNode(
      `import(${JSON.stringify(SCRIPT_URL)}).then(m=>process.stdout.write(String(m.readNewlyBuiltCount())))`,
      { PRISM_NEWLY_BUILT_PATH: tmp }
    );
    assert.equal(r.stdout.trim(), "3");
  } finally { fs.rmSync(tmp, { force: true }); }
});

test("readNewlyBuiltCount returns 0 on a missing file (no throw)", () => {
  const r = runNode(
    `import(${JSON.stringify(SCRIPT_URL)}).then(m=>process.stdout.write(String(m.readNewlyBuiltCount())))`,
    { PRISM_NEWLY_BUILT_PATH: path.join(os.tmpdir(), `prism-nb-absent-${Date.now()}.json`) }
  );
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout.trim(), "0");
});

test("--fold-debt-status exits 1 when a real STUCK marker is present (the verification channel itself)", () => {
  const tmp = path.join(os.tmpdir(), `prism-fd-stuck-${Date.now()}.json`);
  fs.writeFileSync(tmp, JSON.stringify({
    status: "skipped",
    pendingCount: 42,
    ts: new Date(Date.now() - 9 * 3.6e6).toISOString(), // 9h ago > 6h default
  }));
  try {
    const r = spawnSync(process.execPath, [SCRIPT, "--fold-debt-status"], {
      encoding: "utf8",
      env: { ...process.env, PRISM_FOLD_DEBT_PATH: tmp },
    });
    assert.equal(r.status, 1, `stuck marker must exit 1; got ${r.status} / ${r.stdout} / ${r.stderr}`);
    assert.match(r.stdout, /STUCK/);
    assert.match(r.stdout, /42 newly-built/);
  } finally { fs.rmSync(tmp, { force: true }); }
});

test("--fold-debt-status exits 0 on a folded marker (round-trip green path)", () => {
  const tmp = path.join(os.tmpdir(), `prism-fd-ok-${Date.now()}.json`);
  fs.writeFileSync(tmp, JSON.stringify({
    status: "folded", pendingCount: 5, ts: new Date().toISOString(),
  }));
  try {
    const r = spawnSync(process.execPath, [SCRIPT, "--fold-debt-status"], {
      encoding: "utf8",
      env: { ...process.env, PRISM_FOLD_DEBT_PATH: tmp },
    });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /clean/);
  } finally { fs.rmSync(tmp, { force: true }); }
});

test("--fold-debt-status honors PRISM_FOLD_DEBT_MAX_HRS (48h window keeps 9h skip clean)", () => {
  const tmp = path.join(os.tmpdir(), `prism-fd-window-${Date.now()}.json`);
  fs.writeFileSync(tmp, JSON.stringify({
    status: "skipped", pendingCount: 3, ts: new Date(Date.now() - 9 * 3.6e6).toISOString(),
  }));
  try {
    const r = spawnSync(process.execPath, [SCRIPT, "--fold-debt-status"], {
      encoding: "utf8",
      env: { ...process.env, PRISM_FOLD_DEBT_PATH: tmp, PRISM_FOLD_DEBT_MAX_HRS: "48" },
    });
    assert.equal(r.status, 0, `48h window must keep a 9h skip clean; got ${r.status}`);
  } finally { fs.rmSync(tmp, { force: true }); }
});

// ---------------------------------------------------------------------------
// U-GO-B3 — the on-commit chain rebuilds the master-index sidecar.
// system-graph.json exceeds master-index-search-lib's 200 MB loadGraph cap,
// so master-index search depends ENTIRELY on the system-graph-index.json
// sidecar; a regen that advances the graph without rebuilding the sidecar
// degrades the whole fleet's search. These tests pin (a) the on-commit wiring
// and (b) the build→sidecar→search contract it depends on.
// ---------------------------------------------------------------------------

test("U-GO-B3: rebuildMasterIndexSidecar invokes build-graph-index with a raised heap", () => {
  const calls = [];
  const fakeRun = (label, cmd, args) => { calls.push({ label, cmd, args }); return true; };
  const ok = rebuildMasterIndexSidecar("/path/to/node", fakeRun);
  assert.equal(ok, true, "a successful build must surface as true");
  assert.equal(calls.length, 1, "the sidecar build must be invoked exactly once");
  assert.equal(calls[0].cmd, "/path/to/node", "must spawn the injected node binary");
  assert.ok(
    calls[0].args.includes("scripts/build-graph-index.mjs"),
    "must invoke the sidecar builder script",
  );
  assert.ok(
    calls[0].args.some((a) => /^--max-old-space-size=\d+$/.test(a)),
    "must pass a raised V8 heap — parsing the 400 MB+ graph OOMs under the default",
  );
});

test("U-GO-B3: rebuildMasterIndexSidecar propagates a build failure (non-fatal bool, no throw)", () => {
  const ok = rebuildMasterIndexSidecar("/node", () => false);
  assert.equal(ok, false, "a failed sidecar build must surface as false so the sentinel records it");
});

test("U-GO-B3 E2E: build-graph-index produces a sidecar master-index search consumes", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-b3-pos-"));
  try {
    const graphPath = path.join(dir, "system-graph.json");
    const sidecarPath = path.join(dir, "system-graph-index.json");
    fs.writeFileSync(graphPath, JSON.stringify({ nodes: [
      { id: "prism-b3-zorptastic-alpha", label: "B3 Fixture Alpha", info: "unique zorptastic qublveck alpha marker" },
      { id: "prism-b3-zorptastic-beta",  label: "B3 Fixture Beta",  info: "unique zorptastic qublveck beta marker" },
    ] }));
    const r = spawnSync(process.execPath, [BUILD_INDEX, "--graph", graphPath, "--out", sidecarPath], {
      encoding: "utf8",
      env: { ...process.env, PRISM_BUILD_GRAPH_INDEX_NO_REEXEC: "1" },
    });
    assert.equal(r.status, 0, `build-graph-index failed: ${r.stderr}`);
    assert.ok(fs.existsSync(sidecarPath), "sidecar must be written next to the graph");

    // Freshness contract: loadGraph rejects a sidecar whose sourceMtimeMs is
    // older than the graph — a fresh build must stamp it >= the graph mtime.
    const sc = JSON.parse(fs.readFileSync(sidecarPath, "utf8"));
    assert.equal(sc.nodeCount, 2, "both fixture nodes must be indexed");
    assert.ok(
      sc.sourceMtimeMs >= fs.statSync(graphPath).mtimeMs,
      "fresh sidecar must stamp sourceMtimeMs >= graph mtime or loadGraph rejects it",
    );

    // Real wiring: tryLoadSidecar runs before the legacy parse, so a hit here
    // proves search runs THROUGH the freshly-built sidecar.
    const res = runMasterIndexSearch("zorptastic qublveck", { graphPath });
    const ids = res.hits.map((h) => h.id);
    assert.ok(ids.includes("prism-b3-zorptastic-alpha"), `expected fixture hit; got ${JSON.stringify(ids)}`);
    assert.ok(ids.includes("prism-b3-zorptastic-beta"), `expected fixture hit; got ${JSON.stringify(ids)}`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("U-GO-B3 E2E: a graph advancing past its sidecar makes loadGraph fail-loud (the degradation on-commit prevents)", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-b3-stale-"));
  try {
    const graphPath = path.join(dir, "system-graph.json");
    const sidecarPath = path.join(dir, "system-graph-index.json");
    fs.writeFileSync(graphPath, JSON.stringify({ nodes: [
      { id: "prism-b3-stale-node", label: "Stale Fixture", info: "zorptastic qublveck stale marker" },
    ] }));
    let r = spawnSync(process.execPath, [BUILD_INDEX, "--graph", graphPath, "--out", sidecarPath], {
      encoding: "utf8",
      env: { ...process.env, PRISM_BUILD_GRAPH_INDEX_NO_REEXEC: "1" },
    });
    assert.equal(r.status, 0, r.stderr);

    // Simulate a regen that advances the graph but does NOT rebuild the
    // sidecar — exactly the on-commit bug U-GO-B3 fixes (graph fresh, sidecar
    // observed 2 days stale). Push the graph mtime 1 h into the future.
    const future = new Date(Date.now() + 3600_000);
    fs.utimesSync(graphPath, future, future);

    // A fresh subprocess loads the now-mismatched graph: loadGraph's staleness
    // gate must reject the stale sidecar and warn to stderr (R12 fail-loud).
    const libUrl = pathToFileURL(path.join(__dirname, "lib", "master-index-search-lib.mjs")).href;
    r = runNode(
      `import(${JSON.stringify(libUrl)}).then((m) => { m.runMasterIndexSearch("zorptastic qublveck", { graphPath: ${JSON.stringify(graphPath)} }); })`,
      {},
    );
    assert.equal(r.status, 0, r.stderr);
    assert.match(
      r.stderr,
      /sidecar present but stale/,
      "loadGraph must fail-loud when the graph advanced past its sidecar — the exact degradation on-commit's rebuild prevents",
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// U-GO-B4 — fail-loud: the chain stamps a structured failure marker so a
// graceful failure is observable despite the post-commit hook discarding
// stderr (>/dev/null). The marker schema is what the U-GO-B5 staleness inject
// consumes, so it is pinned here.
// ---------------------------------------------------------------------------

test("U-GO-B4: writeRegenFailure stamps a structured failure marker (ok:false + stage/exit/stderr)", () => {
  const tmp = path.join(os.tmpdir(), `prism-regen-fail-${Date.now()}.json`);
  try {
    const r = runNode(
      `import(${JSON.stringify(SCRIPT_URL)}).then((m) => { m.writeRegenFailure({ stage: "merge augmentations", exitCode: 134, signal: null, stderrTail: "heap OOM" }); })`,
      { PRISM_REGEN_FAILURE_PATH: tmp },
    );
    assert.equal(r.status, 0, r.stderr);
    const marker = JSON.parse(fs.readFileSync(tmp, "utf8"));
    assert.equal(marker.ok, false, "a failure marker must record ok:false to distinguish it from the success sentinel");
    assert.equal(marker.stage, "merge augmentations", "must record which stage failed");
    assert.equal(marker.exitCode, 134, "must record the child exit code");
    assert.equal(marker.stderrTail, "heap OOM", "must carry the stderr tail for diagnosis");
    assert.ok(typeof marker.ts === "string" && marker.ts.length > 0, "must carry an ISO timestamp");
    assert.ok(typeof marker.host === "string" && marker.host.length > 0, "must carry the host");
  } finally {
    fs.rmSync(tmp, { force: true });
  }
});
