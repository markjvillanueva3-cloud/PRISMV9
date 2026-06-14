#!/usr/bin/env node
// tier: T0
/**
 * tsc-baseline-regression-gate — PreToolUse hook on Bash.
 *
 * Bounds compounding type-error damage at exactly 1 commit. Pure decision
 * logic lives in ./lib/autonomous-foolproof-logic.mjs.
 *
 * U-AF02 of AUTONOMOUS-FOOLPROOF-MS0.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { spawnSync } from "node:child_process";
import {
  isGitCommitCommand,
  decideTscRegressionGate,
  classifyTscRun,
} from "./lib/autonomous-foolproof-logic.mjs";

const BASELINE_RELATIVE = "state/shared/TSC_BASELINE_ERRORS.json";
const CACHE_RELATIVE = "state/shared/TSC_BASELINE_CACHE.json";
// Internal subprocess budget. MUST stay strictly below the hook's own
// timeout in settings.json (currently 60s on PreToolUse). Previously 90s,
// which let the harness SIGTERM tsc on a cold cache → null result →
// silent gate bypass. Held at 50s to leave 10s margin for stdout parsing
// and JSON write.
const TSC_TIMEOUT_MS = 50 * 1000;
// Source roots to fingerprint for cache invalidation. tsc only matters when
// these change. Build artifacts (dist/, node_modules/) are excluded.
const TSC_SCAN_ROOTS = ["mcp-server/src"];

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}

function findProjectRoot(startCwd = process.cwd()) {
  let cur = startCwd;
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(cur, ".claude", "settings.json"))) return cur;
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  return startCwd;
}

function loadBaseline(baselinePath) {
  try {
    if (!fs.existsSync(baselinePath)) return null;
    const parsed = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
    if (typeof parsed.error_count === "number" && Number.isFinite(parsed.error_count)) {
      return parsed.error_count;
    }
    return null;
  } catch {
    return null;
  }
}

function writeBaseline(baselinePath, count) {
  try {
    fs.mkdirSync(path.dirname(baselinePath), { recursive: true });
    fs.writeFileSync(
      baselinePath,
      JSON.stringify(
        {
          schemaVersion: "1.0.0",
          error_count: count,
          updated_at: new Date().toISOString(),
        },
        null,
        2,
      ),
      "utf8",
    );
  } catch {
    /* best-effort */
  }
}

/**
 * Fingerprint the .ts file tree under TSC_SCAN_ROOTS — file count + max mtime.
 * If cache holds the same fingerprint, we can skip tsc entirely. Walk is
 * iterative + bounded; ignores node_modules and dist.
 */
function fingerprintSources(projectRoot) {
  const SKIP = new Set(["node_modules", "dist", ".git", ".cache", "coverage"]);
  let fileCount = 0;
  let mtimeMax = 0;
  const stack = TSC_SCAN_ROOTS.map((r) => path.join(projectRoot, r)).filter((p) => fs.existsSync(p));
  while (stack.length > 0) {
    const dir = stack.pop();
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const ent of entries) {
      if (SKIP.has(ent.name)) continue;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) { stack.push(full); continue; }
      if (!ent.isFile()) continue;
      if (!ent.name.endsWith(".ts") && !ent.name.endsWith(".tsx")) continue;
      try {
        const st = fs.statSync(full);
        fileCount++;
        if (st.mtimeMs > mtimeMax) mtimeMax = st.mtimeMs;
      } catch { /* unreadable file — skip */ }
    }
  }
  return { fileCount, mtimeMax };
}

function loadCache(cachePath) {
  try {
    if (!fs.existsSync(cachePath)) return null;
    const c = JSON.parse(fs.readFileSync(cachePath, "utf8"));
    if (typeof c.error_count !== "number") return null;
    if (typeof c.file_count !== "number") return null;
    if (typeof c.mtime_max !== "number") return null;
    return c;
  } catch { return null; }
}

function writeCache(cachePath, errorCount, fingerprint) {
  try {
    fs.mkdirSync(path.dirname(cachePath), { recursive: true });
    fs.writeFileSync(cachePath, JSON.stringify({
      schemaVersion: "1.0.0",
      error_count: errorCount,
      file_count: fingerprint.fileCount,
      mtime_max: fingerprint.mtimeMax,
      generated_at: new Date().toISOString(),
    }, null, 2), "utf8");
  } catch { /* best-effort */ }
}

function countTscErrors(projectRoot) {
  try {
    const mcpServer = path.join(projectRoot, "mcp-server");
    if (!fs.existsSync(mcpServer)) return null;

    // Run tsc with a generous V8 heap so it does not OOM under host memory
    // pressure. A bare `npx tsc` defaults to ~4GB and gets SIGKILLed mid-walk
    // on a loaded box, leaving a TRUNCATED error stream -- counting that stream
    // returns a falsely-low number that poisons the cache + baseline. spawnSync
    // (not execSync) exposes the kill .signal so classifyTscRun can detect it.
    const heapMb = (() => {
      const v = Number(process.env.PRISM_TSC_GUARD_HEAP_MB);
      return Number.isFinite(v) && v >= 2048 ? Math.floor(v) : 8192;
    })();
    const spawnOpts = {
      cwd: mcpServer,
      timeout: TSC_TIMEOUT_MS,
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
    };
    const tscBin = path.join(mcpServer, "node_modules", "typescript", "bin", "tsc");
    const res = fs.existsSync(tscBin)
      ? spawnSync(process.execPath, ["--max-old-space-size=" + heapMb, tscBin, "--noEmit"], spawnOpts)
      : spawnSync("npx", ["--no-install", "tsc", "--noEmit"], { ...spawnOpts, shell: true, env: Object.assign({}, process.env, { NODE_OPTIONS: ((process.env.NODE_OPTIONS || "") + " --max-old-space-size=" + heapMb).trim() }) });

    const output = (res.stdout ?? "") + (res.stderr ?? "");
    const verdict = classifyTscRun({
      status: res.status,
      signal: res.signal,
      timedOut: res.error?.code === "ETIMEDOUT",
      error: res.error,
      stdout: output,
    });
    // INCOMPLETE run -> return the safe null sentinel. decideTscRegressionGate
    // maps null to "tsc-unavailable": no cache write, no baseline init, no block.
    // NEVER count a truncated stream -- that is the false-green poisoning bug.
    if (!verdict.completed) return null;

    // Complete run: classifier already counted (same per-line grep, trust-gated).
    return verdict.errorCount;
  } catch {
    return null;
  }
}

async function main() {
  const isAutonomous = process.env.PRISM_AUTONOMOUS === "1";
  const allowRegression = process.env.PRISM_TSC_ALLOW_REGRESSION === "1";

  const raw = readStdinSafe();
  let payload = {};
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    payload = {};
  }

  const cmd = payload?.tool_input?.command ?? "";
  const isCommit = isGitCommitCommand(cmd);

  if (!isCommit) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const root = findProjectRoot();
  const baselinePath = path.join(root, BASELINE_RELATIVE);
  const cachePath = path.join(root, CACHE_RELATIVE);
  const baseline = loadBaseline(baselinePath);

  // Fast path: if cache fingerprint matches current source tree, no .ts file
  // changed since the last full tsc run → reuse cached error count. This
  // avoids the 60-90s tsc invocation on every commit when the model is
  // editing non-TS files (settings, hooks, markdown). Sub-second.
  const fingerprint = fingerprintSources(root);
  const cache = loadCache(cachePath);
  let current;
  if (cache &&
      cache.file_count === fingerprint.fileCount &&
      cache.mtime_max === fingerprint.mtimeMax) {
    current = cache.error_count;
  } else {
    current = countTscErrors(root);
    if (current !== null) writeCache(cachePath, current, fingerprint);
  }

  const result = decideTscRegressionGate({
    isAutonomous,
    isCommit,
    allowRegression,
    baseline,
    current,
  });

  if (result.initialize_to !== undefined) {
    writeBaseline(baselinePath, result.initialize_to);
  }

  if (result.continue === false) {
    const human = [
      "🚧 TSC BASELINE REGRESSION GATE — commit blocked.",
      "",
      `Baseline: ${result.baseline} errors`,
      `Current:  ${result.current} errors  (+${result.delta})`,
      "",
      "The autonomous loop introduced a TypeScript error regression.",
      "Resolve the new errors, OR set PRISM_TSC_ALLOW_REGRESSION=1 to override.",
      "",
      `Baseline file: ${path.relative(root, baselinePath)}`,
    ].join("\n");

    console.log(JSON.stringify({
      continue: false,
      decision: "block",
      reason: human,
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: human,
        regression: {
          baseline: result.baseline,
          current: result.current,
          delta: result.delta,
        },
      },
    }));
    return;
  }

  if (result.reason === "regression-warned") {
    const warning = `⚠️ TSC regression detected: ${result.baseline} → ${result.current} (+${result.delta}). Not blocking (non-autonomous mode). Set PRISM_AUTONOMOUS=1 to enforce.`;
    console.log(JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        additionalContext: warning,
      },
    }));
    return;
  }

  console.log(JSON.stringify({ continue: true }));
}

if (process.argv[1]?.endsWith("tsc-baseline-regression-gate.mjs")) {
  main();
}
