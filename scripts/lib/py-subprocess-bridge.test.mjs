// node:test (vite-config in this repo only globs src/__tests__/*.ts).
// BLACKWELL-AI-MS0 / U-PY-BRIDGE-LIB tests.
//
// Hermetic: the bridge spawns `<interpreter> <script> <args>`, so we drive the
// FULL spawn/stream/exit-code/timeout/stdin machinery by pointing it at
// `process.execPath` (node) running a mock NDJSON script — no Python required.
// Plus a skip-soft REAL-PYTHON E2E against the live gpu_health.py so we never
// ship "mock passes, real path never runs" (RGS-MS1 lesson).

import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, unlinkSync, existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { EventEmitter } from "node:events";
import {
  resolvePythonPath,
  runPythonJson,
  runPythonJsonOrThrow,
  DEFAULT_PY_TIMEOUT_MS,
  TRAINING_PY_TIMEOUT_MS,
  MAX_CAPTURE_BYTES,
  PY_BRIDGE_ERRORS,
} from "./py-subprocess-bridge.mjs";

// ── Mock "python" = a node script implementing the NDJSON contract by mode ──
const MOCK = `
import fs from "node:fs";
const mode = process.argv[2] || "result";
const w = (o) => process.stdout.write(JSON.stringify(o) + "\\n");
if (mode === "result") { w({ event: "result", ok: true, value: 42 }); process.exit(0); }
else if (mode === "untagged") { w({ ready: false, torch_ready: false, note: "gpu_health-shape" }); process.exit(0); }
else if (mode === "progress") { w({ event: "progress", step: 1 }); w({ event: "progress", step: 2 }); w({ event: "result", ok: true, steps: 2 }); process.exit(0); }
else if (mode === "fail") { w({ event: "result", ok: false, reason: "boom" }); process.exit(1); }
else if (mode === "nojson") { process.stdout.write("hello not json\\nstill not json\\n"); process.exit(0); }
else if (mode === "hang") { setInterval(() => {}, 1000); }
else if (mode === "big-result") { const pad = "x".repeat(5 * 1024 * 1024); w({ event: "progress", step: 1 }); w({ event: "result", ok: true, padLen: pad.length, pad }); process.exit(0); }
else if (mode === "throwing-progress") { w({ event: "progress", step: 1 }); w({ event: "result", ok: true }); process.exit(0); }
else if (mode === "stdin-echo") { const buf = fs.readFileSync(0, "utf8"); let parsed = null; try { parsed = JSON.parse(buf); } catch {} w({ event: "result", echoed: parsed }); process.exit(0); }
else if (mode === "env-echo") { w({ event: "result", cuda: process.env.CUDA_VISIBLE_DEVICES ?? null }); process.exit(0); }
else { w({ event: "result", unknownMode: mode }); process.exit(0); }
`;

const dir = mkdtempSync(join(tmpdir(), "pybridge-"));
const mockPath = join(dir, "mock-ndjson.mjs");
writeFileSync(mockPath, MOCK, "utf8");
const NODE = process.execPath;
const run = (mode, opts = {}) =>
  runPythonJson(mockPath, { pythonPath: NODE, args: [mode], ...opts });

process.on("exit", () => { try { unlinkSync(mockPath); } catch {} });

// ── resolvePythonPath ──
test("resolvePythonPath: explicit pythonPath wins over env", () => {
  const r = resolvePythonPath({ pythonPath: "C:/x/py.exe" }, { PRISM_PYTHON_GPU_PATH: "ignored" });
  assert.equal(r.pythonPath, "C:/x/py.exe");
  assert.equal(r.source, "explicit");
});
test("resolvePythonPath: PRISM_PYTHON_GPU_PATH next, then PRISM_PYTHON_PATH, then default", () => {
  assert.deepEqual(resolvePythonPath({}, { PRISM_PYTHON_GPU_PATH: "g.exe" }), { pythonPath: "g.exe", source: "PRISM_PYTHON_GPU_PATH" });
  assert.deepEqual(resolvePythonPath({}, { PRISM_PYTHON_PATH: "p.exe" }), { pythonPath: "p.exe", source: "PRISM_PYTHON_PATH" });
  assert.deepEqual(resolvePythonPath({}, {}), { pythonPath: "python", source: "default" });
});

// ── runPythonJson core paths ──
test("result-tagged object → ok, result captured, exit 0", async () => {
  const r = await run("result");
  assert.equal(r.ok, true);
  assert.equal(r.exitCode, 0);
  assert.equal(r.error, null);
  assert.equal(r.result.value, 42);
  assert.equal(r.pythonPath, NODE);
  assert.equal(r.pythonSource, "explicit");
});

test("untagged single object (gpu_health.py shape) becomes the result", async () => {
  const r = await run("untagged");
  assert.equal(r.ok, true);
  assert.equal(r.result.note, "gpu_health-shape");
  assert.equal(r.result.torch_ready, false);
});

test("progress streaming → onProgress fires per progress, result is the tagged object", async () => {
  const seen = [];
  const r = await run("progress", { onProgress: (p) => seen.push(p.step) });
  assert.deepEqual(seen, [1, 2]);
  assert.equal(r.progress.length, 2);
  assert.equal(r.result.steps, 2);
  assert.equal(r.ok, true);
});

test("CARDINAL: non-zero exit is surfaced, never swallowed (result still parsed)", async () => {
  const r = await run("fail");
  assert.equal(r.ok, false);
  assert.equal(r.exitCode, 1);
  assert.equal(r.error, "nonzero_exit");
  assert.equal(r.result.reason, "boom"); // python emits JSON even on failure — we keep it
});

test("no JSON on stdout + exit 0 → ok:false, error no_json_output, malformed counted", async () => {
  const r = await run("nojson");
  assert.equal(r.ok, false);
  assert.equal(r.error, "no_json_output");
  assert.equal(r.result, null);
  assert.equal(r.malformedLines, 2);
});

test("timeout kills the child and fails loud", async () => {
  const r = await run("hang", { timeoutMs: 300 });
  assert.equal(r.ok, false);
  assert.equal(r.error, "timeout");
  assert.equal(r.signal, "SIGKILL");
});

test("stdin input is JSON-serialized and delivered to the child", async () => {
  const r = await run("stdin-echo", { input: { hello: "world", n: 7 } });
  assert.equal(r.ok, true);
  assert.deepEqual(r.result.echoed, { hello: "world", n: 7 });
});

test("CUDA_VISIBLE_DEVICES defaults to 0 and is overridable", async () => {
  const a = await run("env-echo");
  assert.equal(a.result.cuda, "0");
  const b = await run("env-echo", { cudaVisibleDevices: "1" });
  assert.equal(b.result.cuda, "1");
});

test("spawn failure (bad interpreter) → ok:false, error spawn_failed, not a throw", async () => {
  const r = await runPythonJson(mockPath, { pythonPath: join(dir, "definitely-not-a-binary-xyz"), args: ["result"] });
  assert.equal(r.ok, false);
  assert.equal(r.error, "spawn_failed");
  assert.equal(r.exitCode, null);
});

test("runPythonJsonOrThrow throws on failure, carries .bridge with the exit code", async () => {
  await assert.rejects(
    () => runPythonJsonOrThrow(mockPath, { pythonPath: NODE, args: ["fail"] }),
    (err) => {
      assert.ok(err instanceof Error);
      assert.equal(err.bridge.exitCode, 1);
      assert.equal(err.bridge.result.reason, "boom");
      return true;
    },
  );
});

test("runPythonJsonOrThrow resolves on success", async () => {
  const r = await runPythonJsonOrThrow(mockPath, { pythonPath: NODE, args: ["result"] });
  assert.equal(r.ok, true);
  assert.equal(r.result.value, 42);
});

test("missing scriptPath rejects with TypeError (programmer error, not a value)", async () => {
  await assert.rejects(() => runPythonJson(""), TypeError);
});

test("constants exported sanely", () => {
  assert.ok(DEFAULT_PY_TIMEOUT_MS >= 1000);
  assert.ok(TRAINING_PY_TIMEOUT_MS > DEFAULT_PY_TIMEOUT_MS);
  assert.ok(MAX_CAPTURE_BYTES >= 100_000);
  assert.equal(PY_BRIDGE_ERRORS.NONZERO_EXIT, "nonzero_exit");
  assert.ok(Object.isFrozen(PY_BRIDGE_ERRORS));
});

test("error codes reference the frozen PY_BRIDGE_ERRORS enum (not bare strings)", async () => {
  const r = await run("fail");
  assert.equal(r.error, PY_BRIDGE_ERRORS.NONZERO_EXIT);
});

test("P2-C fix: a result line larger than MAX_CAPTURE_BYTES still parses (incremental, not tail-capped)", async () => {
  const r = await run("big-result");
  assert.equal(r.ok, true, "oversize result must NOT be misclassified as no_json_output");
  assert.equal(r.error, null);
  assert.equal(r.result.padLen, 5 * 1024 * 1024);
  assert.ok(r.stdoutRaw.length <= MAX_CAPTURE_BYTES, "diagnostic raw IS tail-capped");
});

test("onProgress that THROWS must not break the run (fail-soft progress sink)", async () => {
  let fired = 0;
  const r = await run("throwing-progress", {
    onProgress: () => { fired += 1; throw new Error("sink blew up"); },
  });
  assert.equal(fired, 1);
  assert.equal(r.ok, true);
  assert.equal(r.result.ok, true);
});

test("passing input to a child that never reads stdin does not crash (EPIPE-safe)", async () => {
  // "result" mode ignores stdin entirely; the async EPIPE must be swallowed.
  const r = await run("result", { input: { unused: true } });
  assert.equal(r.ok, true);
  assert.equal(r.result.value, 42);
});

test("un-serializable input throws TypeError (programmer error), distinct from a runtime failure", async () => {
  const circular = {};
  circular.self = circular;
  await assert.rejects(() => runPythonJson(mockPath, { pythonPath: NODE, args: ["stdin-echo"], input: circular }), TypeError);
});

test("caller-set timeout does NOT emit the default-timeout warning", async () => {
  const r = await run("hang", { timeoutMs: 300 });
  assert.equal(r.error, "timeout");
  assert.equal(r.warnings.length, 0, "explicit timeoutMs → no default-timeout footgun warning");
});

test("win32 timeout reaps the process TREE via taskkill /T (no orphaned CUDA grandchild)", async () => {
  // DI a fake child that never closes + a spy spawn, so we can assert the tree-kill
  // path without a real subprocess. This is the fleet-reaper-critical Windows path.
  const calls = [];
  const fakeChild = new EventEmitter();
  fakeChild.pid = 4242;
  fakeChild.stdout = new EventEmitter();
  fakeChild.stdout.setEncoding = () => {};
  fakeChild.stderr = new EventEmitter();
  fakeChild.stderr.setEncoding = () => {};
  fakeChild.stdin = Object.assign(new EventEmitter(), { write: () => {}, end: () => {} });
  fakeChild.kill = () => { calls.push(["kill"]); };
  const spy = (cmd, args) => {
    calls.push([cmd, args]);
    if (cmd === "taskkill") { const tk = new EventEmitter(); return tk; }
    return fakeChild; // first call = the "python" child
  };
  const r = await runPythonJson("fake.py", { pythonPath: "py", _spawn: spy, timeoutMs: 80 });
  assert.equal(r.error, "timeout");
  if (process.platform === "win32") {
    const tk = calls.find((c) => c[0] === "taskkill");
    assert.ok(tk, "taskkill must be spawned on win32");
    assert.ok(tk[1].includes("/T") && tk[1].includes("/F"), "taskkill must reap the tree (/T /F)");
    assert.ok(tk[1].includes("4242"), "taskkill targets the child pid");
  } else {
    assert.ok(calls.some((c) => c[0] === "kill"), "POSIX uses child.kill(SIGKILL)");
  }
});

// ── REAL-PYTHON E2E (skip-soft) — exercises the live gpu_health.py through the
//    bridge so the injected-reader path is proven against real bytes, not a mock. ──
test("REAL: gpu_health.py via the live host python (skip-soft)", async (t) => {
  const candidates = [
    process.env.PRISM_PYTHON_GPU_PATH,
    process.env.PRISM_PYTHON_PATH,
    "H:/Tools/python/python.exe",
  ].filter(Boolean);
  const py = candidates.find((p) => existsSync(p));
  if (!py) { t.skip("no python interpreter present on host"); return; }
  const script = resolve(process.cwd(), "scripts/py/gpu_health.py");
  if (!existsSync(script)) { t.skip("gpu_health.py not found from cwd"); return; }
  const r = await runPythonJson(script, { pythonPath: py, timeoutMs: 30_000 });
  // On this host (portable 3.14.5, no torch) gpu_health.py exits 1 with a full
  // report. We assert the bridge faithfully surfaced that — NOT that the GPU is
  // ready (which depends on golf's install). The contract: a result object was
  // parsed, ready is a boolean, and a non-zero exit is reported as such.
  assert.ok(r.result !== null, "bridge parsed gpu_health.py JSON");
  assert.equal(typeof r.result.ready, "boolean");
  assert.equal(typeof r.result.torch_ready, "boolean");
  if (r.result.torch_ready === false) {
    assert.equal(r.ok, false, "no-torch host → bridge reports not-ok");
    assert.equal(r.exitCode, 1);
    assert.ok(Array.isArray(r.result.errors) && r.result.errors.length > 0);
  } else {
    // golf has provisioned the GPU stack — gate is green.
    assert.equal(r.ok, true);
    assert.equal(r.exitCode, 0);
  }
});
