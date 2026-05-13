// tier: T4
// hook-runner.mjs — parallel hook execution library for U-D3 bundles.
// Spawns each hook as a child process, pipes stdin, collects stdout/stderr,
// enforces per-hook timeout, aggregates results.
//
// Hook protocol (Claude Code):
//   stdin  = JSON {tool_name, tool_input, ...}
//   stdout = JSON {decision?, reason?, additionalContext?, hookSpecificOutput?}
//          | empty / non-JSON => no-op success
//   exit 0 = continue, exit 1 = warning, exit 2 = block
//
// Aggregation rules:
//   - ANY hook returning decision="deny" or permissionDecision="deny" → bundle blocks
//   - All additionalContext strings concatenated with newlines
//   - Slowest hook caps wall time (Promise.all)
//   - Per-hook timeout kills + records "timeout" reason

import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { isatty } from "node:tty";

// Use whatever node is currently running. On Windows the portable-node
// distribution ships as a bash-style entry without .exe suffix, so spawning
// it directly via child_process.spawn() fails. process.execPath is the
// resolved binary the current process is running — guaranteed to exist.
const NODE_BIN = process.execPath;

/**
 * Run one hook child process with stdin + timeout.
 * @param {string} hookPath - absolute path to hook .mjs file
 * @param {string} stdinPayload - JSON string passed to hook stdin
 * @param {number} timeoutMs - kill after this many ms
 * @returns {Promise<HookResult>}
 */
export function runHook(hookPath, stdinPayload, timeoutMs = 3000) {
  return new Promise((resolve) => {
    const start = Date.now();
    let timer = null;
    let hardTimer = null;
    let settled = false;
    const finish = (r) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      if (hardTimer) clearTimeout(hardTimer);
      resolve(r);
    };

    let child;
    try {
      child = spawn(NODE_BIN, [hookPath], { stdio: ["pipe", "pipe", "pipe"], windowsHide: true });
    } catch (err) {
      // spawn can throw *synchronously* under fork-storm pressure (EAGAIN /
      // STATUS_DLL_INIT_FAILED 0xC0000142). Don't let that bubble out of the
      // bundle — degrade to a no-op result like a normal spawn 'error'.
      return resolve({ hook: hookPath, exitCode: -1, elapsed: Date.now() - start, timedOut: false, parsed: null, stdoutRaw: "", stderr: String(err) });
    }

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const buildResult = (code) => {
      let parsed = null;
      if (stdout.trim()) { try { parsed = JSON.parse(stdout.trim()); } catch { /* non-json output */ } }
      return { hook: hookPath, exitCode: code, elapsed: Date.now() - start, timedOut, parsed, stdoutRaw: stdout, stderr };
    };

    timer = setTimeout(() => {
      timedOut = true;
      try { child.kill("SIGKILL"); } catch { /* already gone */ }
      // SIGKILL kills the child but not its descendants. A hook that spawned a
      // grandchild (eslint, git, powershell, …) leaves it orphaned on timeout —
      // exactly the process leak this subsystem exists to prevent. On Windows,
      // `taskkill /T` tears down the whole tree. Fire-and-forget; if taskkill
      // itself can't spawn under extreme fork pressure we've at least killed the
      // direct child above.
      if (process.platform === "win32" && child.pid) {
        try {
          const tk = spawn("taskkill", ["/T", "/F", "/PID", String(child.pid)], { stdio: "ignore", windowsHide: true });
          tk.on("error", () => { /* taskkill missing / spawn failed — best-effort */ });
          tk.unref?.();
        } catch { /* */ }
      }
      // SIGKILL alone is also not enough to settle the promise: `child.on("close")`
      // only fires once the child's stdout/stderr pipes have *no remaining
      // writers*. If a grandchild inherited those pipes (or Windows is slow to
      // reap the killed child), 'close' may never fire and this Promise pins
      // forever → the whole bundle hangs → the tool call hangs → the chat
      // stalls. Detach the parent's read ends and arm a hard fallback resolve.
      try { child.stdout?.destroy(); } catch { /* */ }
      try { child.stderr?.destroy(); } catch { /* */ }
      hardTimer = setTimeout(() => finish(buildResult(null)), 1000);
      hardTimer.unref?.();
    }, timeoutMs);
    timer.unref?.();

    child.stdout.on("data", (d) => { stdout += d.toString(); });
    child.stderr.on("data", (d) => { stderr += d.toString(); });

    child.on("close", (code) => finish(buildResult(code)));

    child.on("error", (err) => finish({
      hook: hookPath,
      exitCode: -1,
      elapsed: Date.now() - start,
      timedOut,
      parsed: null,
      stdoutRaw: stdout,
      stderr: stderr || String(err),
    }));

    try {
      child.stdin.write(stdinPayload);
      child.stdin.end();
    } catch { /* child may have died */ }
  });
}

// Cap how many sub-hooks of a bundle can run concurrently. The previous
// implementation used Promise.all which fanned out ALL sub-hooks at once:
// edit-bundle has 25+ entries, so a single Edit tool call spawned ~26
// Windows processes at the same instant. Across 6 concurrent Claude chats
// that's >150 simultaneous bash → node.exe forks and the OS process table
// saturates with errno 11 / 0xC0000142 (STATUS_DLL_INIT_FAILED).
//
// Bounded pool keeps semantics identical (results array still preserves
// hookSpecs order; Aggregation logic in runBundle works either way) but
// limits peak fork pressure. Default 6 is empirically a sweet spot for
// Windows under multi-chat load. Set PRISM_HOOK_BUNDLE_CONCURRENCY=0 to
// revert to unbounded Promise.all for benchmarking.
const DEFAULT_BUNDLE_CONCURRENCY = 6;

function getBundleConcurrency() {
  const raw = process.env.PRISM_HOOK_BUNDLE_CONCURRENCY;
  if (raw == null || raw === "") return DEFAULT_BUNDLE_CONCURRENCY;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return DEFAULT_BUNDLE_CONCURRENCY;
  return n; // 0 = unbounded (fan out all at once like old Promise.all)
}

/** Run sub-hooks via a bounded async pool. Output order matches hookSpecs
 * order regardless of completion order so downstream aggregation is
 * deterministic. */
async function runPool(hookSpecs, stdinPayload, concurrency) {
  if (concurrency === 0) {
    return Promise.all(
      hookSpecs.map((s) => runHook(s.path, stdinPayload, s.timeout || 3000))
    );
  }
  const results = new Array(hookSpecs.length);
  let nextIdx = 0;
  async function worker() {
    while (true) {
      const my = nextIdx++;
      if (my >= hookSpecs.length) return;
      const s = hookSpecs[my];
      results[my] = await runHook(s.path, stdinPayload, s.timeout || 3000);
    }
  }
  const workerCount = Math.min(concurrency, hookSpecs.length);
  await Promise.all(Array.from({ length: workerCount }, worker));
  return results;
}

/**
 * Run a list of hooks via a bounded concurrent pool and aggregate results
 * per Claude Code hook contract.
 * @param {Array<{path: string, timeout?: number}>} hookSpecs
 * @param {string} stdinPayload
 * @returns {Promise<AggregatedResult>}
 */
export async function runBundle(hookSpecs, stdinPayload) {
  const start = Date.now();
  const results = await runPool(hookSpecs, stdinPayload, getBundleConcurrency());

  // Aggregation
  let blocked = false;
  let blockReason = null;
  const contextParts = [];
  const hookOutputs = [];

  for (const r of results) {
    if (!r.parsed) continue;

    // Decision-based block
    const decision = r.parsed.decision || r.parsed.hookSpecificOutput?.permissionDecision;
    if (decision === "deny" || decision === "block") {
      blocked = true;
      blockReason = blockReason || r.parsed.reason || r.parsed.hookSpecificOutput?.permissionDecisionReason || `Blocked by ${r.hook}`;
    }

    // Continue=false also blocks
    if (r.parsed.continue === false) {
      blocked = true;
      blockReason = blockReason || r.parsed.stopReason || r.parsed.systemMessage || `Stopped by ${r.hook}`;
    }

    // Collect additionalContext
    if (r.parsed.additionalContext) {
      contextParts.push(String(r.parsed.additionalContext));
    }
    if (r.parsed.hookSpecificOutput?.additionalContext) {
      contextParts.push(String(r.parsed.hookSpecificOutput.additionalContext));
    }

    hookOutputs.push({
      hook: r.hook.split(/[\\/]/).pop(),
      elapsed: r.elapsed,
      hadOutput: !!r.parsed,
      blocked: decision === "deny" || decision === "block",
      timedOut: r.timedOut,
    });
  }

  const totalElapsed = Date.now() - start;

  // Build final response per Claude hook contract
  const response = {
    continue: !blocked,
  };

  if (blocked) {
    response.stopReason = blockReason;
    response.systemMessage = blockReason;
    // Use permission-decision form for tool-use blocks
    response.hookSpecificOutput = {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: blockReason,
    };
  } else if (contextParts.length > 0) {
    response.hookSpecificOutput = {
      hookEventName: "PreToolUse",
      additionalContext: contextParts.join("\n\n"),
    };
  }

  // Optional debug telemetry (suppressed unless PRISM_BUNDLE_DEBUG=1)
  if (process.env.PRISM_BUNDLE_DEBUG === "1") {
    response._debug = { totalElapsed, hookOutputs };
  }

  return response;
}

/**
 * Read the hook payload from stdin (for hook entrypoints).
 *
 * Claude Code writes the JSON payload then closes the hook's stdin, so a
 * synchronous read-to-EOF is reliable and — unlike the old 100ms-race version —
 * never truncates. The race version returned an empty/partial payload whenever
 * the parent was slow to write (multi-chat load): the bundle then ran against
 * `{}` and every safety sub-hook silently no-op'd (file_path/content missing) —
 * an accidental gate-bypass disguised as "fast". A TTY short-circuit handles
 * manual `node bundle.mjs` invocation without blocking on operator EOF; using
 * `isatty(0)` rather than `process.stdin.isTTY` avoids lazily constructing the
 * stdin Stream (a referenced pipe socket that would keep the event loop alive
 * after the hook is done — i.e. another stall vector).
 */
export async function readStdin() {
  try {
    if (isatty(0)) return "";
    return readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}

/**
 * Emit final response per Claude hook contract.
 *
 * On Windows a hook's stdout is a pipe and `process.stdout.write()` is
 * asynchronous — calling `process.exit()` immediately after can truncate the
 * JSON before the OS accepts it, so Claude Code sees empty output and treats a
 * *blocking* bundle as a no-op (gate-bypass). Wait for the write to flush, then
 * exit; a short unref'd fallback timer covers the case where the callback never
 * fires (stdout already gone).
 */
export function emit(response) {
  // Exit 0 unless we're blocking (then exit 2 per Claude contract for tool-use blocks)
  const code = response && response.continue === false ? 2 : 0;
  let exited = false;
  const done = () => { if (exited) return; exited = true; process.exit(code); };
  try {
    // The write callback fires once the bytes are flushed (whether or not
    // write() reported backpressure) — exit then so nothing is truncated.
    process.stdout.write(JSON.stringify(response) + "\n", done);
  } catch { return done(); }
  setTimeout(done, 2000).unref?.();
}
