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

/**
 * Run a list of hooks in parallel and aggregate results per Claude Code hook contract.
 * @param {Array<{path: string, timeout?: number}>} hookSpecs
 * @param {string} stdinPayload
 * @returns {Promise<AggregatedResult>}
 */
export async function runBundle(hookSpecs, stdinPayload) {
  const start = Date.now();
  const results = await Promise.all(
    hookSpecs.map((s) => runHook(s.path, stdinPayload, s.timeout || 3000))
  );

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
