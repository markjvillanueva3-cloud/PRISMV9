/**
 * py-subprocess-bridge.mjs — BLACKWELL-AI-MS0 / U-PY-BRIDGE-LIB
 *
 * The ONE canonical Node->Python spawn primitive for the Blackwell training
 * stack. Every GPU job that Node orchestrates but Python executes — the GNN
 * GATv2/H2GCN retrain, QLoRA fine-tunes, the full-corpus GPU embedder, the
 * Bradley-Terry reward model — spawns its Python through this bridge so the
 * contract (interpreter resolution, NDJSON streaming, CUDA env, FAIL-LOUD exit
 * handling, Windows tree-kill) lives in exactly one tested place instead of
 * being re-hand-rolled (and silently mis-handled) in each script.
 *
 * THE CARDINAL RULE: NEVER SWALLOW A NON-ZERO EXIT.
 *   A Python training job that exits non-zero (CUDA OOM, a CPU-only wheel caught
 *   by gpu_health.py, a NaN loss, a missing dependency) MUST surface that to the
 *   caller as a loud, structured failure. The bridge therefore always returns
 *   the real `exitCode`, the parsed JSON `result` (Python emits JSON even on its
 *   failure paths — see gpu_health.py), and the captured `stderr`. `ok` is true
 *   ONLY on spawn-success AND exit 0 AND a parseable result object. A caller that
 *   wants exceptions instead of a value uses {@link runPythonJsonOrThrow}.
 *
 * THE NDJSON CONTRACT (what a Python script writes to stdout):
 *   - stdout carries newline-delimited JSON: zero or more objects, PARSED
 *     INCREMENTALLY as whole lines arrive (so `onProgress` truly streams, and a
 *     huge final result line is never corrupted by the diagnostic tail-cap).
 *   - An object MAY carry `{"event":"progress", ...}` for streamed progress; each
 *     such object is forwarded to `onProgress` and collected in `progress[]`.
 *   - The RESULT is the last object tagged `{"event":"result", ...}` if any, else
 *     the LAST parseable object on stdout. (gpu_health.py emits a single untagged
 *     object — it becomes the result. A long trainer streams progress then a
 *     final result.)
 *   - stdout is the machine channel; human logs go to stderr (captured separately).
 *
 * INTERPRETER RESOLUTION (fail-loud, never a silent wrong-interpreter):
 *   opts.pythonPath  ->  $PRISM_PYTHON_GPU_PATH  ->  $PRISM_PYTHON_PATH  ->  "python".
 *   The resolved path AND its `pythonSource` are returned in every result so a
 *   consumer (e.g. GpuStackHealthEngine) can refuse a run whose source is
 *   "default" (bare `python` = likely the 3.14.5 portable interpreter whose
 *   cu314 wheels are CPU-only today) and confirm it ran the dedicated 3.13 GPU
 *   venv. (Provenance only — GPU-readiness is gpu_health.py's `torch_ready`.)
 *
 * CUDA ENV: by default `CUDA_VISIBLE_DEVICES=0` is injected (prevents a silent
 *   CPU fallback when a subprocess import does not see the device). Override via
 *   opts.env or opts.cudaVisibleDevices (null leaves it unset).
 *
 * WINDOWS TREE-KILL: on timeout the bridge reaps the WHOLE process tree. On
 *   win32 a bare `child.kill()` only TerminateProcess()es the direct `python.exe`
 *   and would orphan the CUDA worker grandchildren (a ~30GB-VRAM leak on every
 *   timed-out training run); we use `taskkill /pid <pid> /T /F` there. On POSIX
 *   we SIGKILL. Even so, callers running real training jobs MUST set a realistic
 *   `timeoutMs` (see {@link TRAINING_PY_TIMEOUT_MS}) — the default is sized for
 *   short probes and WILL kill a long job, loudly (a stderr warning + a `warnings`
 *   entry distinguish a default-timeout kill from a caller-chosen one).
 *
 * The interpreter and spawn are injectable (opts.pythonPath / opts._spawn), so
 * tests drive the full spawn/stream/exit-code/timeout machinery hermetically by
 * pointing it at `process.execPath` (node) running a mock NDJSON script — no
 * Python required — while a skip-soft real-Python E2E exercises the live readers
 * (RGS-MS1 lesson: a mock that passes while the real path never runs is a lie).
 *
 * @module scripts/lib/py-subprocess-bridge
 * @milestone BLACKWELL-AI-MS0-U-PY-BRIDGE-LIB
 */

import { spawn } from "node:child_process";

/** Default timeout (ms) — sized for SHORT probes (gpu_health, capability checks).
 *  A real training job MUST pass its own larger `timeoutMs`; see {@link TRAINING_PY_TIMEOUT_MS}. */
export const DEFAULT_PY_TIMEOUT_MS = 120_000;
/** Recommended timeout (ms) for long GPU training jobs (GNN retrain, QLoRA). 60 min.
 *  Exported so trainers reference a named value instead of re-inventing a magic number. */
export const TRAINING_PY_TIMEOUT_MS = 3_600_000;
/** Cap retained stdout/stderr (bytes) so a runaway script cannot OOM the Node host.
 *  This caps only the DIAGNOSTIC raw buffers — NDJSON is parsed incrementally per
 *  line as it streams, so the result object is never a tail-cap truncation victim. */
export const MAX_CAPTURE_BYTES = 4_000_000;

/** Machine error codes (frozen) — consumers compare against these symbols, never
 *  bare strings, so a typo'd comparison is a reference error, not a silent miss. */
export const PY_BRIDGE_ERRORS = Object.freeze({
  SPAWN_FAILED: "spawn_failed",
  TIMEOUT: "timeout",
  NONZERO_EXIT: "nonzero_exit",
  NO_JSON_OUTPUT: "no_json_output",
});

/**
 * Resolve which Python interpreter to spawn, fail-loud about the source so a
 * caller can verify it (never a silent wrong-interpreter).
 *
 * @param {object} [opts]
 * @param {string} [opts.pythonPath] explicit interpreter path (wins).
 * @param {NodeJS.ProcessEnv} [env] environment to read (defaults to process.env).
 * @returns {{ pythonPath: string, source: "explicit"|"PRISM_PYTHON_GPU_PATH"|"PRISM_PYTHON_PATH"|"default" }}
 */
export function resolvePythonPath(opts = {}, env = process.env) {
  if (typeof opts.pythonPath === "string" && opts.pythonPath.length > 0) {
    return { pythonPath: opts.pythonPath, source: "explicit" };
  }
  if (typeof env.PRISM_PYTHON_GPU_PATH === "string" && env.PRISM_PYTHON_GPU_PATH.length > 0) {
    return { pythonPath: env.PRISM_PYTHON_GPU_PATH, source: "PRISM_PYTHON_GPU_PATH" };
  }
  if (typeof env.PRISM_PYTHON_PATH === "string" && env.PRISM_PYTHON_PATH.length > 0) {
    return { pythonPath: env.PRISM_PYTHON_PATH, source: "PRISM_PYTHON_PATH" };
  }
  return { pythonPath: "python", source: "default" };
}

/** Append to a capped buffer; keeps the TAIL (the final result + most recent
 *  stderr are what matter). Diagnostic-only — NDJSON parsing is incremental. */
function _capAppend(buf, chunk) {
  const next = buf + chunk;
  if (next.length <= MAX_CAPTURE_BYTES) return next;
  return next.slice(next.length - MAX_CAPTURE_BYTES);
}

/** Kill the whole process tree (the python.exe AND its CUDA worker grandchildren).
 *  On win32 a bare child.kill() orphans grandchildren; taskkill /T reaps the tree. */
function _killTree(child, spawnFn) {
  if (!child || child.pid === undefined) return;
  if (process.platform === "win32") {
    try {
      // Detached, ignore I/O — a best-effort reaper; we never await it.
      const tk = spawnFn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
        windowsHide: true,
        stdio: "ignore",
      });
      if (tk && typeof tk.on === "function") tk.on("error", () => {});
    } catch {
      try { child.kill("SIGKILL"); } catch { /* already gone */ }
    }
  } else {
    try { child.kill("SIGKILL"); } catch { /* already gone */ }
  }
}

/**
 * Incremental NDJSON line processor. Feed it complete lines as they stream;
 * it mutates `state` ({ progress, result, lastObj, malformed }) and fires
 * onProgress in real time. Keeping the result live (not re-parsed from a capped
 * buffer at the end) means a multi-megabyte final result line can never be
 * corrupted by the diagnostic tail-cap.
 */
function _consumeLine(line, state, onProgress) {
  const t = line.trim();
  if (t.length === 0) return;
  let obj;
  try {
    obj = JSON.parse(t);
  } catch {
    state.malformed += 1;
    return;
  }
  if (obj === null || typeof obj !== "object") {
    state.malformed += 1;
    return;
  }
  state.lastObj = obj;
  if (obj.event === "result") {
    state.result = obj;
  } else if (obj.event === "progress") {
    state.progress.push(obj);
    if (typeof onProgress === "function") {
      try { onProgress(obj); } catch { /* a progress sink must never break the run */ }
    }
  }
  // Untagged objects are candidate results; resolved at finish (last parseable).
}

/**
 * Spawn a Python script, stream its NDJSON stdout, and return a structured,
 * FAIL-LOUD result. Never throws on a Python failure — the failure is the
 * returned value (`ok:false` + `exitCode` + `result` + `stderr` + `error`).
 * Only programmer errors (bad scriptPath, un-serializable input) throw.
 *
 * @param {string} scriptPath absolute path to the .py script.
 * @param {object} [opts]
 * @param {string[]} [opts.args] CLI args passed after the script path.
 * @param {object}   [opts.input] JSON-serialized to the child's stdin (then closed).
 * @param {string}   [opts.pythonPath] interpreter override (see resolvePythonPath).
 * @param {string}   [opts.cwd] working directory.
 * @param {object}   [opts.env] extra env vars (merged over process.env).
 * @param {string|number|null} [opts.cudaVisibleDevices="0"] CUDA_VISIBLE_DEVICES (null to leave unset).
 * @param {number}   [opts.timeoutMs] kill the tree + fail after this many ms (default {@link DEFAULT_PY_TIMEOUT_MS}).
 * @param {(p:object)=>void} [opts.onProgress] called per `event:"progress"` object, in real time.
 * @param {(opts:object,env:object)=>{pythonPath:string,source:string}} [opts._resolve] DI for tests.
 * @param {typeof spawn} [opts._spawn] DI spawn for tests.
 * @returns {Promise<PyBridgeResult>}
 *
 * @typedef {object} PyBridgeResult
 * @property {boolean} ok                spawn ok AND exit 0 AND a result object parsed.
 * @property {number|null} exitCode      child exit code (null if killed/never spawned).
 * @property {string|null} signal        kill signal, if any.
 * @property {object|null} result        final parsed JSON object (or null).
 * @property {object[]} progress         streamed progress objects.
 * @property {string} stdoutRaw          captured stdout (tail-capped; diagnostic).
 * @property {string} stderr             captured stderr (tail-capped).
 * @property {string|null} error         one of {@link PY_BRIDGE_ERRORS} or null.
 * @property {string[]} warnings         non-fatal advisories (e.g. default-timeout kill).
 * @property {number} malformedLines     count of non-JSON stdout lines.
 * @property {number} durationMs         wall time.
 * @property {string} pythonPath         interpreter actually used.
 * @property {string} pythonSource       where pythonPath came from.
 * @property {string} scriptPath         the script run.
 */
export function runPythonJson(scriptPath, opts = {}) {
  if (typeof scriptPath !== "string" || scriptPath.length === 0) {
    return Promise.reject(new TypeError("runPythonJson: scriptPath (non-empty string) is required"));
  }
  // Serialize input EAGERLY so an un-serializable input (circular ref / BigInt)
  // is a loud programmer error, not a silently-empty stdin.
  let inputStr;
  if (opts.input !== undefined) {
    try {
      inputStr = JSON.stringify(opts.input);
    } catch (err) {
      return Promise.reject(
        new TypeError("runPythonJson: opts.input is not JSON-serializable: " +
          (err instanceof Error ? err.message : String(err))),
      );
    }
  }

  const args = Array.isArray(opts.args) ? opts.args.map(String) : [];
  const timeoutWasDefault = !(Number.isFinite(opts.timeoutMs) && opts.timeoutMs > 0);
  const timeoutMs = timeoutWasDefault ? DEFAULT_PY_TIMEOUT_MS : opts.timeoutMs;
  const resolveFn = typeof opts._resolve === "function" ? opts._resolve : resolvePythonPath;
  const spawnFn = typeof opts._spawn === "function" ? opts._spawn : spawn;
  const { pythonPath, source: pythonSource } = resolveFn(opts, process.env);
  const startMs = Date.now();

  const env = { ...process.env, ...(opts.env && typeof opts.env === "object" ? opts.env : {}) };
  if (opts.cudaVisibleDevices !== null && env.CUDA_VISIBLE_DEVICES === undefined) {
    env.CUDA_VISIBLE_DEVICES = String(opts.cudaVisibleDevices ?? "0");
  }

  return new Promise((resolve) => {
    let stdoutRaw = "";
    let stderr = "";
    let lineBuf = "";
    const warnings = [];
    const state = { progress: [], result: null, lastObj: null, malformed: 0 };
    let settled = false;
    let timer = null;

    const finish = (over) => {
      if (settled) return;
      settled = true;
      if (timer) { clearTimeout(timer); timer = null; }
      // Flush any trailing partial line (a final result without a newline).
      if (lineBuf.length > 0) { _consumeLine(lineBuf, state, opts.onProgress); lineBuf = ""; }
      const result = state.result ?? state.lastObj;
      const exitCode = over.exitCode ?? null;
      const signal = over.signal ?? null;
      let error = over.error ?? null;
      if (!error) {
        if (exitCode !== 0) error = PY_BRIDGE_ERRORS.NONZERO_EXIT;
        else if (result === null) error = PY_BRIDGE_ERRORS.NO_JSON_OUTPUT;
      }
      resolve({
        ok: error === null,
        exitCode,
        signal,
        result,
        progress: state.progress,
        stdoutRaw,
        stderr,
        error,
        warnings,
        malformedLines: state.malformed,
        durationMs: Date.now() - startMs,
        pythonPath,
        pythonSource,
        scriptPath,
      });
    };

    let child;
    try {
      child = spawnFn(pythonPath, [scriptPath, ...args], {
        cwd: typeof opts.cwd === "string" ? opts.cwd : undefined,
        env,
        windowsHide: true,
        stdio: ["pipe", "pipe", "pipe"],
      });
    } catch (err) {
      // Synchronous spawn throw (rare) — capture BEFORE finish() snapshots stderr.
      stderr = _capAppend(stderr, `spawn threw: ${err instanceof Error ? err.message : String(err)}`);
      finish({ exitCode: null, error: PY_BRIDGE_ERRORS.SPAWN_FAILED, signal: null });
      return;
    }

    // ENOENT (interpreter not found) etc. arrive as an 'error' event.
    child.on("error", (err) => {
      stderr = _capAppend(stderr, `spawn error: ${err instanceof Error ? err.message : String(err)}`);
      finish({ exitCode: null, error: PY_BRIDGE_ERRORS.SPAWN_FAILED, signal: null });
    });

    if (child.stdout) {
      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (d) => {
        stdoutRaw = _capAppend(stdoutRaw, d);
        // Incremental line parse: keep the trailing partial in lineBuf.
        lineBuf += d;
        let nl;
        while ((nl = lineBuf.indexOf("\n")) !== -1) {
          const line = lineBuf.slice(0, nl);
          lineBuf = lineBuf.slice(nl + 1);
          _consumeLine(line, state, opts.onProgress);
        }
      });
    }
    if (child.stderr) {
      child.stderr.setEncoding("utf8");
      child.stderr.on("data", (d) => { stderr = _capAppend(stderr, d); });
    }

    child.on("close", (code, signal) => { finish({ exitCode: code, signal }); });

    // Timeout: reap the whole tree (win32 grandchildren too) and fail loud.
    timer = setTimeout(() => {
      if (timeoutWasDefault) {
        warnings.push(
          `killed by the DEFAULT ${DEFAULT_PY_TIMEOUT_MS}ms timeout — if this is a long training job, ` +
          `pass timeoutMs (e.g. TRAINING_PY_TIMEOUT_MS) explicitly`,
        );
      }
      _killTree(child, spawnFn);
      finish({ exitCode: null, error: PY_BRIDGE_ERRORS.TIMEOUT, signal: "SIGKILL" });
    }, timeoutMs);
    if (typeof timer.unref === "function") timer.unref();

    // Feed stdin if input was provided, then close it. Guard the async EPIPE that
    // a child which never reads stdin raises on Windows (must not crash the host).
    if (child.stdin) {
      child.stdin.on("error", () => { /* broken pipe — child ignored stdin; benign */ });
      if (inputStr !== undefined) {
        try { child.stdin.write(inputStr); } catch { /* error event will fire */ }
      }
      try { child.stdin.end(); } catch { /* ignore */ }
    }
  });
}

/**
 * Strict variant: throws on any non-ok outcome (spawn failure, timeout, non-zero
 * exit, no JSON). The thrown Error carries `.bridge` = the full {@link PyBridgeResult}
 * so the caller still sees the exit code and stderr. Use when a failed Python job
 * should abort the surrounding Node flow rather than be inspected as a value.
 *
 * @param {string} scriptPath
 * @param {object} [opts] same as {@link runPythonJson}.
 * @returns {Promise<PyBridgeResult>} resolves only when ok.
 */
export async function runPythonJsonOrThrow(scriptPath, opts = {}) {
  const res = await runPythonJson(scriptPath, opts);
  if (!res.ok) {
    const err = new Error(
      `python job failed (${res.error}; exit ${res.exitCode}) for ${scriptPath} via ${res.pythonPath}` +
        (res.stderr ? `\nstderr: ${res.stderr.slice(-500)}` : ""),
    );
    err.bridge = res;
    throw err;
  }
  return res;
}
