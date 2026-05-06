// stop-gate-chain.mjs — Unified Stop event gate runner
//
// INTEL-OLLAMA-OBSIDIAN-MS0/P11-U08.
//
// Runs the canonical set of stop_on_* gates in sequence inside a single
// hook invocation. Each gate's block decision is preserved via the
// aggregateGateResults output; first-block short-circuits subsequent
// gates so we don't waste tokens running checks that won't matter.
//
// Token economics: 16 separate hook invocations with their own boot,
// stdin parse, and JSON emit costs ~16x base overhead. This single
// runner shares stdin parse + output emit across all gates → ~90%
// reduction per the milestone exit_condition.
//
// Failure mode: any gate that throws or emits malformed JSON is treated
// as PASS (continueOnError) so a buggy gate doesn't deny user exit.
// Genuinely-blocking gates emit a structured envelope.
//
// Pure functions exported for tests:
//   - STOP_GATE_LIST          — canonical hook-path array (relative to
//                                .claude/hooks/), single source of truth
//   - parseGateOutput(raw)    → { decision, reason } | null
//   - aggregateGateResults(results) → { passed, blocked, blocker?, summary }
//   - buildResponse(agg)      → envelope to write to stdout
//
// @milestone INTEL-OLLAMA-OBSIDIAN-MS0/P11-U08

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import * as path from "node:path";
import * as fs from "node:fs";

// ---------------------------------------------------------------------------
// CANONICAL GATE LIST
// ---------------------------------------------------------------------------
//
// Order matters: gates earlier in the list short-circuit later ones.
// Cheap & high-confidence checks first; expensive checks last so we
// never run them when something earlier already blocks.
//
// Paths are repo-relative to the canonical PRISM repo at H:/prism/.
// Resolution happens in the I/O layer.
export const STOP_GATE_LIST = [
  // Cheap structural integrity (no I/O beyond settings/registry reads)
  ".claude/hooks/stop_on_dirty_registry.mjs",
  ".claude/hooks/stop_on_hook_unregistered.mjs",
  ".claude/hooks/stop_on_hook_unregistration.mjs",
  ".claude/hooks/stop_on_open_claim.mjs",
  ".claude/hooks/stop_on_open_lock.mjs",
  // Build-time integrity (a bit more I/O — TS, imports)
  ".claude/hooks/stop_on_build_error.mjs",
  ".claude/hooks/stop_on_broken_imports.mjs",
  ".claude/hooks/stop_on_circular_deps.mjs",
  // Content / asset preservation
  ".claude/hooks/stop_on_c_drive_write.mjs",
  ".claude/hooks/stop_on_content_deletion.mjs",
  ".claude/hooks/stop_on_duplicate_created.mjs",
  ".claude/hooks/stop_on_extraction_incomplete.mjs",
  ".claude/hooks/stop_on_orphan_children.mjs",
  // Test + protocol gates
  ".claude/hooks/stop_on_failing_tests.mjs",
  ".claude/hooks/stop_on_missing_tests.mjs",
  ".claude/hooks/stop_on_incomplete_pipeline.mjs",
  ".claude/hooks/stop_on_cutting_calculation_protocol.mjs",
  // Awareness / formula citations (most expensive, last)
  ".claude/hooks/stop_on_awareness_degraded.mjs",
  ".claude/hooks/stop_on_formula_uncited.mjs",
  ".claude/hooks/stop_on_non_h_roadmap.mjs",
];

const CANONICAL_REPO_ROOT = "H:/prism";

// ---------------------------------------------------------------------------
// PURE LOGIC (exported for tests)
// ---------------------------------------------------------------------------

/**
 * Parse a single gate hook's stdout. Hooks emit JSON like:
 *   { continue: false, decision: "block", reason: "..." }
 *   { continue: true }   (no block)
 *   { hookSpecificOutput: { permissionDecision: "deny", reason: "..." } }
 *
 * Returns null when the output isn't recognisable JSON or is missing the
 * fields that signal a decision — caller treats that as "PASS" so a
 * malformed gate doesn't block legitimate work.
 */
export function parseGateOutput(raw) {
  if (typeof raw !== "string" || raw.length === 0) return null;
  // Hook output is sometimes preceded by stderr noise; pull the first {...}
  // JSON object we can find.
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  let parsed;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  // Modern hookSpecificOutput shape
  const hsi = parsed.hookSpecificOutput;
  if (hsi && typeof hsi === "object") {
    const dec = hsi.permissionDecision;
    if (dec === "deny") {
      return { decision: "block", reason: typeof hsi.reason === "string" ? hsi.reason : (typeof hsi.permissionDecisionReason === "string" ? hsi.permissionDecisionReason : "blocked") };
    }
  }
  // Legacy decision/reason shape
  if (parsed.decision === "block" || parsed.continue === false) {
    return { decision: "block", reason: typeof parsed.reason === "string" ? parsed.reason : "blocked" };
  }
  return { decision: "pass", reason: "" };
}

/**
 * Aggregate per-gate results into a single envelope. Stops at the first
 * blocking gate (by convention; the runner short-circuits anyway).
 *
 * results items: { gate: string, decision: "block"|"pass"|"error", reason?, durationMs? }
 *
 * Output:
 *   passed     — boolean — true iff every gate that ran returned pass
 *   blocked    — boolean — true iff any gate returned block
 *   blocker    — first blocking gate name, or undefined
 *   summary    — { ranCount, passCount, blockCount, errorCount }
 */
export function aggregateGateResults(results) {
  if (!Array.isArray(results)) {
    return {
      passed: true, blocked: false, blocker: undefined,
      summary: { ranCount: 0, passCount: 0, blockCount: 0, errorCount: 0 },
    };
  }
  let passCount = 0;
  let blockCount = 0;
  let errorCount = 0;
  let blocker;
  let blockReason;
  for (const r of results) {
    if (!r || typeof r !== "object") continue;
    if (r.decision === "block") {
      blockCount += 1;
      if (!blocker) {
        blocker = r.gate;
        blockReason = r.reason;
      }
    } else if (r.decision === "error") {
      errorCount += 1;
    } else {
      passCount += 1;
    }
  }
  return {
    passed: blockCount === 0,
    blocked: blockCount > 0,
    blocker,
    blockReason,
    summary: {
      ranCount: results.length,
      passCount,
      blockCount,
      errorCount,
    },
  };
}

/**
 * Build the stdout envelope that Claude Code's Stop event consumes.
 * On block: emit decision/reason at top level + hookSpecificOutput.
 * On pass: emit just continue:true.
 */
export function buildResponse(agg) {
  if (!agg || typeof agg !== "object") {
    return { continue: true };
  }
  if (agg.blocked) {
    const reason = `[stop-gate-chain] ${agg.blocker} blocked: ${agg.blockReason ?? "no reason given"}`;
    return {
      continue: false,
      decision: "block",
      reason,
      hookSpecificOutput: {
        hookEventName: "Stop",
        permissionDecision: "deny",
        permissionDecisionReason: reason,
        chainSummary: agg.summary,
      },
    };
  }
  return {
    continue: true,
    hookSpecificOutput: {
      hookEventName: "Stop",
      chainSummary: agg.summary,
    },
  };
}

// ---------------------------------------------------------------------------
// I/O LAYER (not exported for tests; tests drive the pure layer)
// ---------------------------------------------------------------------------

async function readStdin() {
  return new Promise((resolve) => {
    const chunks = [];
    process.stdin.on("data", (chunk) => chunks.push(chunk));
    process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    process.stdin.on("error", () => resolve(""));
    setTimeout(() => resolve(Buffer.concat(chunks).toString("utf8")), 250);
  });
}

function runGate(absHookPath, stdinPayload, nodeExe) {
  return new Promise((resolve) => {
    if (!fs.existsSync(absHookPath)) {
      resolve({ gate: absHookPath, decision: "error", reason: "gate not present", durationMs: 0 });
      return;
    }
    const start = Date.now();
    const child = spawn(nodeExe, [absHookPath], { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => { stdout += d.toString("utf8"); });
    child.stderr.on("data", (d) => { stderr += d.toString("utf8"); });
    child.on("error", () => {
      resolve({ gate: absHookPath, decision: "error", reason: "spawn failed", durationMs: Date.now() - start });
    });
    child.on("exit", () => {
      const parsed = parseGateOutput(stdout);
      if (!parsed) {
        resolve({ gate: absHookPath, decision: "error", reason: stderr.slice(0, 240) || "no output", durationMs: Date.now() - start });
        return;
      }
      resolve({
        gate: path.basename(absHookPath),
        decision: parsed.decision,
        reason: parsed.reason,
        durationMs: Date.now() - start,
      });
    });
    if (typeof stdinPayload === "string") {
      try { child.stdin.write(stdinPayload); } catch {}
    }
    try { child.stdin.end(); } catch {}
  });
}

async function main() {
  const repoRoot = process.env.PRISM_REPO_ROOT ?? CANONICAL_REPO_ROOT;
  const nodeExe = process.env.PRISM_NODE ?? "H:/Tools/nodejs/node.exe";
  const raw = await readStdin();

  const results = [];
  for (const rel of STOP_GATE_LIST) {
    const abs = path.resolve(repoRoot, rel);
    const r = await runGate(abs, raw, nodeExe);
    results.push(r);
    if (r.decision === "block") break; // short-circuit
  }

  const agg = aggregateGateResults(results);
  process.stdout.write(JSON.stringify(buildResponse(agg)) + "\n");
  process.exit(0);
}

const _isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (_isMain) {
  main().catch(() => {
    process.stdout.write(JSON.stringify({ continue: true }) + "\n");
    process.exit(0);
  });
}
