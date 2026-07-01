// blueprint_vl_train_lora.test.mjs — BLACKWELL-AI-MS0 / U-XRAY-VL-TRAINER
//
// CI test for the real Qwen2.5-VL PEFT trainer (blueprint_vl_train_lora.py). The full fine-tune
// CANNOT run here (no Blackwell-compatible torch / peft) — so this asserts the two contracts that
// MUST hold in any environment, exercised THROUGH the real Node->Python bridge the production
// runner uses (py-subprocess-bridge), not a mock:
//
//   1. PURE-LOGIC: `--self-test` runs in any interpreter (stdlib-only) and reports all 13 pure
//      checks (parse_pair / match_prediction / brier_score / train_val_split) passing.
//   2. FAIL-LOUD CONTRACT (R12): a real --bundle run with the env/data NOT ready emits a STRUCTURED
//      result object (parseable JSON, ok:false, a known error code, non-zero exit) — NEVER a raw
//      traceback the bridge can't parse (error would be NO_JSON_OUTPUT). This is the anti-regression
//      that keeps india's blocked-state diagnosable instead of an opaque crash.
//
// Skip-soft (RGS-MS1 lesson — a mock that passes while the real path never runs is a lie): if no
// Python interpreter can be spawned on this host, the tests SKIP rather than fail.
//
// Run: node --test mcp-server/scripts/blueprint_vl_train_lora.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, writeFileSync, rmSync, mkdtempSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

import { runPythonJson, PY_BRIDGE_ERRORS } from "../../scripts/lib/py-subprocess-bridge.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TRAINER = join(HERE, "blueprint_vl_train_lora.py");
const KNOWN_FAILLOUD_ERRORS = new Set(["missing_dependency", "gpu_unusable", "insufficient_data"]);

// Resolve a spawnable interpreter: explicit env first, then the portable python, then bare names.
// The bridge does the same chain, but we pin it so the test is deterministic across hosts.
function resolvePython() {
  for (const c of [process.env.PRISM_PYTHON_GPU_PATH, process.env.PRISM_PYTHON_PATH,
                   "H:/Tools/python/python.exe"]) {
    if (c && existsSync(c)) return c;
  }
  return "python"; // last resort — if it can't spawn, runs below skip-soft on SPAWN_FAILED
}
const PY = resolvePython();
const RUN_OPTS = { pythonPath: PY, timeoutMs: 120_000, cudaVisibleDevices: null };

function spawnFailed(res) {
  return !res.ok && res.error === PY_BRIDGE_ERRORS.SPAWN_FAILED;
}

test("trainer exists on disk", () => {
  assert.ok(existsSync(TRAINER), `trainer script missing: ${TRAINER}`);
});

test("--self-test passes all pure-logic checks (via the real bridge)", async (t) => {
  const res = await runPythonJson(TRAINER, { ...RUN_OPTS, args: ["--self-test"] });
  if (spawnFailed(res)) { t.skip(`no spawnable python (${PY}) — skip-soft`); return; }
  assert.equal(res.ok, true, `bridge not ok: ${res.error} / stderr: ${res.stderr.slice(-300)}`);
  assert.ok(res.result && typeof res.result === "object", "no result object emitted");
  assert.equal(res.result.event, "result");
  assert.equal(res.result.ok, true, `self-test reported failures: ${JSON.stringify(res.result.failed)}`);
  assert.equal(res.result.mode, "self_test");
  assert.deepEqual(res.result.failed, [], "every pure-logic check must pass");
  // The pure checks must actually be present (guards against an empty-checks false green).
  assert.ok(res.result.checks && Object.keys(res.result.checks).length >= 12,
    "expected >=12 named pure-logic checks");
  assert.ok(Object.values(res.result.checks).every((v) => v === true));
});

test("real --bundle run fails LOUD with a structured result (never a raw crash)", async (t) => {
  // Two well-formed rows whose image paths do NOT exist → in this dep-less env the trainer fails at
  // the dependency preflight; on a deps-present host it would reach insufficient_data (0 resolvable
  // images). BOTH are valid structured fail-loud outcomes — we assert the CONTRACT, not the env.
  const dir = mkdtempSync(join(tmpdir(), "xray-vl-trainer-"));
  const bundle = join(dir, "bundle.jsonl");
  try {
    writeFileSync(bundle,
      '{"prompt":"Print: /nonexistent/a.pdf Context: diameter","completion":"12.7"}\n' +
      '{"prompt":"Print: /nonexistent/b.pdf Context: radius","completion":"3.0"}\n');
    const res = await runPythonJson(TRAINER, { ...RUN_OPTS, args: ["--bundle", bundle] });
    if (spawnFailed(res)) { t.skip(`no spawnable python (${PY}) — skip-soft`); return; }
    // Belt-and-suspenders (a non-zero exit yields NONZERO_EXIT, so NO_JSON_OUTPUT is structurally
    // unreachable here) — the REAL anti-raw-crash teeth are the result.event/result.ok asserts and
    // the per-line NDJSON loop below: an uncaught traceback produces no {event:"result"} object.
    assert.notEqual(res.error, PY_BRIDGE_ERRORS.NO_JSON_OUTPUT,
      `trainer emitted no parseable result — likely a raw crash. stderr: ${res.stderr.slice(-400)}`);
    assert.ok(res.result && typeof res.result === "object",
      `no structured result object — raw crash? stderr: ${res.stderr.slice(-400)}`);
    assert.equal(res.result.event, "result");
    assert.equal(res.result.ok, false, "a blocked run must report ok:false, not silent success");
    assert.ok(KNOWN_FAILLOUD_ERRORS.has(res.result.error),
      `unexpected error code: ${res.result.error} (want one of ${[...KNOWN_FAILLOUD_ERRORS].join(", ")})`);
    assert.notEqual(res.exitCode, 0, "a fail-loud path must exit non-zero");
    // stdout is the machine channel: every non-empty stdout line must be valid JSON (NDJSON contract).
    for (const line of res.stdoutRaw.split(/\r?\n/)) {
      if (!line.trim()) continue;
      assert.doesNotThrow(() => JSON.parse(line), `non-JSON line on stdout: ${line.slice(0, 120)}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("missing --bundle (and no --self-test) fails loud with bad_args, exit 2", async (t) => {
  const res = await runPythonJson(TRAINER, { ...RUN_OPTS, args: [] });
  if (spawnFailed(res)) { t.skip(`no spawnable python (${PY}) — skip-soft`); return; }
  assert.ok(res.result && typeof res.result === "object", "no structured result");
  assert.equal(res.result.ok, false);
  assert.equal(res.result.error, "bad_args");
  assert.equal(res.exitCode, 2, "bad args must exit with EXIT_BAD_INPUT (2)");
});
