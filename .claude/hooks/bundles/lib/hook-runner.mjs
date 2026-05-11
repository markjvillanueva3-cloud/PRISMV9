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
    const child = spawn(NODE_BIN, [hookPath], {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      try { child.kill("SIGKILL"); } catch { /* ignore */ }
    }, timeoutMs);

    child.stdout.on("data", (d) => { stdout += d.toString(); });
    child.stderr.on("data", (d) => { stderr += d.toString(); });

    child.on("close", (code) => {
      clearTimeout(timer);
      const elapsed = Date.now() - start;
      let parsed = null;
      if (stdout.trim()) {
        try { parsed = JSON.parse(stdout.trim()); } catch { /* non-json output */ }
      }
      resolve({
        hook: hookPath,
        exitCode: code,
        elapsed,
        timedOut,
        parsed,
        stdoutRaw: stdout,
        stderr,
      });
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({
        hook: hookPath,
        exitCode: -1,
        elapsed: Date.now() - start,
        timedOut: false,
        parsed: null,
        stdoutRaw: "",
        stderr: String(err),
      });
    });

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
 * Read all stdin into a string (for hook entrypoints).
 */
export async function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.on("data", (chunk) => { data += chunk.toString(); });
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", () => resolve(data));
    // If no stdin within 100ms (e.g., manual invocation), resolve empty
    setTimeout(() => resolve(data), 100);
  });
}

/**
 * Emit final response per Claude hook contract.
 */
export function emit(response) {
  process.stdout.write(JSON.stringify(response));
  // Exit 0 unless we're blocking (then exit 2 per Claude contract for tool-use blocks)
  process.exit(response.continue === false ? 2 : 0);
}
