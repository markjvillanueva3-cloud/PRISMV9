#!/usr/bin/env node
/**
 * cleanup-orchestrator.mjs — U-CLEANUP-E3
 *
 * Single-call wrapper that runs the 5 existing cleanup helpers in sequence and
 * emits one unified result line. Pure delegator — NO new kill logic per R1.
 *
 * Sub-cleaners (executed in registry order):
 *   1. git-lock-sweeper.mjs        (hook-style: drains stdin, emits JSON)
 *   2. chat-bus-reap.mjs           (CLI: --json [--dry-run])
 *   3. zombie-reaper-daemon.mjs    (CLI: no args; prints only when reaped>0)
 *   4. node-orphan-cleaner.mjs     (CLI: --reason=... [--dry-run] [--force])
 *   5. bash-orphan-cleaner.mjs     (hook-style: drains stdin, emits JSON)
 *
 * NOTE: chat-bus → zombies ordering matters. chat-bus refreshes liveSessions
 * first; zombies then sweeps what chat-bus left behind. Neither uses an
 * atomic-write for ATOMIC_CLAIMS.json / AGENT_COORDINATION_STATUS.json — a
 * peer-chat write between them can race. Pre-existing in those sub-cleaners.
 *
 * Why an orchestrator: operators currently run these one at a time during fleet
 * hygiene. Five separate forks + five separate stdout shapes to parse is high
 * friction. This script:
 *   - Calls each subprocess with the correct invocation style for its mode.
 *   - Parses each output format.
 *   - Aggregates into one operator-readable line (or JSON with --json).
 *   - Reports per-cleaner outcomes so a single failure doesn't hide the others.
 *
 * Best-effort: a sub-cleaner failure (non-zero exit, timeout, parse error) is
 * recorded but never aborts the orchestrator — matches the "always continue"
 * design of all five inputs.
 *
 * Multi-chat safety: bash-orphan-cleaner scopes to THIS process's claude.exe
 * ancestor, so peer chats are untouched. node-orphan-cleaner has its own
 * RUN_THROTTLE_MS (90s) that the orchestrator respects by default — running
 * twice within 90s will surface a "throttled" status from node-orphans. Pass
 * `--force-throttled` to bypass (operator opt-in, never default).
 *
 * Usage:
 *   node cleanup-orchestrator.mjs                # run all, text output
 *   node cleanup-orchestrator.mjs --dry-run      # forward dry-run where supported
 *   node cleanup-orchestrator.mjs --json         # machine-readable summary
 *   node cleanup-orchestrator.mjs --skip=zombies,chat-bus  # skip by name
 *   node cleanup-orchestrator.mjs --force-throttled  # bypass node-orphans 90s throttle
 *   node cleanup-orchestrator.mjs --verbose      # include raw subprocess output
 *
 * Exit codes:
 *   0 — all cleaners reported ok (exit 0)
 *   1 — at least one cleaner failed; orchestrator completed
 *   2 — misuse (unknown flag, unknown --skip target)
 */

import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, renameSync, statSync, unlinkSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..", "..");
const LOG_DIR = join(REPO_ROOT, "state", "shared");
const LOG_FILE = join(LOG_DIR, "cleanup-orchestrator.log");
const LOG_ROTATE_BYTES = 256 * 1024; // rotate when log exceeds 256 KiB
const LOG_ROTATED = `${LOG_FILE}.1`;

/** Cleaner registry — order is intentional (cheap ones first, kill-heavy last). */
const CLEANERS = [
  {
    name: "git-locks",
    script: ".claude/hooks/git-lock-sweeper.mjs",
    mode: "hook",
    timeoutMs: 5000,
    supportsDryRun: false,
    parse: parseHookJson,
  },
  {
    name: "chat-bus",
    script: ".claude/helpers/chat-bus-reap.mjs",
    mode: "cli",
    timeoutMs: 8000,
    supportsDryRun: true,
    dryRunArgs: ["--dry-run"],
    extraArgs: ["--json"],
    parse: parseChatBusJson,
  },
  {
    name: "zombies",
    script: ".claude/helpers/zombie-reaper-daemon.mjs",
    mode: "cli",
    timeoutMs: 8000,
    supportsDryRun: false,
    parse: parseZombieText,
  },
  {
    name: "node-orphans",
    script: ".claude/helpers/node-orphan-cleaner.mjs",
    mode: "cli",
    // 25s = node-orphan-cleaner's 15s PowerShell tasklist + 5s per-PID taskkill
    // batch + 5s buffer. Confirmed against node-orphan-cleaner.mjs:154,192.
    timeoutMs: 25000,
    supportsDryRun: true,
    dryRunArgs: ["--dry-run"],
    extraArgs: ["--reason=cleanup-orchestrator"],
    // Operator opt-in to bypass node-orphan-cleaner's 90s RUN_THROTTLE_MS.
    forceThrottledArgs: ["--force"],
    parse: parseNodeOrphanJson,
  },
  {
    name: "bash-orphans",
    script: ".claude/hooks/bash-orphan-cleaner.mjs",
    mode: "hook",
    // 30s = bash-orphan-cleaner's 8s PS_ENUMERATE_TIMEOUT + worst-case 20 kills
    // × 3s TASKKILL_TIMEOUT each (capped by MAX_KILLS_PER_RUN=20) interleaved
    // with cleanup. In practice kills are <100ms each; 30s is safe upper bound.
    timeoutMs: 30000,
    supportsDryRun: false,
    parse: parseHookJson,
  },
];

const CLEANER_NAMES = new Set(CLEANERS.map((c) => c.name));

function log(msg) {
  try {
    mkdirSync(LOG_DIR, { recursive: true });
    rotateLogIfNeeded();
    appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${msg}\n`, "utf8");
  } catch {
    /* best-effort */
  }
}

function rotateLogIfNeeded() {
  try {
    if (!existsSync(LOG_FILE)) return;
    const st = statSync(LOG_FILE);
    if (st.size < LOG_ROTATE_BYTES) return;
    try { if (existsSync(LOG_ROTATED)) unlinkSync(LOG_ROTATED); } catch { /* */ }
    renameSync(LOG_FILE, LOG_ROTATED);
  } catch {
    /* best-effort — log is non-critical */
  }
}

function parseArgs(argv) {
  const args = {
    dryRun: false,
    json: false,
    verbose: false,
    forceThrottled: false,
    skip: new Set(),
    help: false,
  };
  const errors = [];
  for (const raw of argv) {
    if (raw === "--dry-run") args.dryRun = true;
    else if (raw === "--json") args.json = true;
    else if (raw === "--verbose") args.verbose = true;
    else if (raw === "--force-throttled") args.forceThrottled = true;
    else if (raw === "--help" || raw === "-h") args.help = true;
    else if (raw.startsWith("--skip=")) {
      const names = raw.slice("--skip=".length).split(",").map((s) => s.trim()).filter(Boolean);
      for (const n of names) {
        if (!CLEANER_NAMES.has(n)) {
          errors.push(`unknown --skip target '${n}' (valid: ${[...CLEANER_NAMES].join(", ")})`);
        } else {
          args.skip.add(n);
        }
      }
    } else {
      errors.push(`unknown argument '${raw}'`);
    }
  }
  return { args, errors };
}

function usage() {
  return [
    "cleanup-orchestrator.mjs — run all 5 PRISM cleanup helpers in sequence.",
    "",
    "Usage:",
    "  node cleanup-orchestrator.mjs [--dry-run] [--json] [--verbose] [--skip=name,name]",
    "",
    "Sub-cleaners (in order): " + CLEANERS.map((c) => c.name).join(", "),
    "",
    "Flags:",
    "  --dry-run          Forward dry-run where supported (chat-bus, node-orphans).",
    "                     Hook-style cleaners (git-locks, bash-orphans, zombies) have",
    "                     no dry-run mode and will be skipped under --dry-run.",
    "  --json             Emit machine-readable summary instead of one-line text.",
    "  --verbose          Include raw subprocess stdout/stderr in JSON output.",
    "  --skip=a,b         Skip specific cleaners by name.",
    "  --force-throttled  Bypass node-orphans 90s RUN_THROTTLE_MS (operator opt-in).",
    "  -h, --help         Print this help and exit 0.",
    "",
    "Exit codes:",
    "  0 — all cleaners reported ok",
    "  1 — at least one cleaner failed (orchestrator still completed)",
    "  2 — misuse (unknown flag, unknown skip target)",
  ].join("\n");
}

function buildArgList(cleaner, args) {
  const list = [];
  if (cleaner.extraArgs) list.push(...cleaner.extraArgs);
  if (args.dryRun && cleaner.supportsDryRun && cleaner.dryRunArgs) {
    list.push(...cleaner.dryRunArgs);
  }
  if (args.forceThrottled && cleaner.forceThrottledArgs) {
    list.push(...cleaner.forceThrottledArgs);
  }
  return list;
}

function runOne(cleaner, args) {
  const scriptPath = join(REPO_ROOT, cleaner.script);
  const startedAt = Date.now();

  if (!existsSync(scriptPath)) {
    return {
      name: cleaner.name,
      ok: false,
      reason: "missing-script",
      summary: `${cleaner.name}: missing script ${cleaner.script}`,
      exitCode: null,
      durationMs: 0,
      raw: { stdout: "", stderr: "" },
    };
  }

  // Under --dry-run, skip cleaners that don't support it rather than running
  // them anyway (which would mutate state) and rather than silently dropping
  // them (which would hide intent). Mark `ok: null` (tri-state) so JSON
  // consumers see "not evaluated" — `ok: true` would be misleading.
  if (args.dryRun && !cleaner.supportsDryRun) {
    return {
      name: cleaner.name,
      ok: null,
      reason: "dry-run-skip",
      summary: `${cleaner.name}: skipped (no --dry-run support)`,
      exitCode: null,
      durationMs: 0,
      raw: { stdout: "", stderr: "" },
    };
  }

  const argList = buildArgList(cleaner, args);
  // Hook-style scripts read stdin; give them empty JSON so they don't block.
  // CLI scripts get no stdin (`ignore`) so they never block on a missing TTY.
  const input = cleaner.mode === "hook" ? "{}" : undefined;
  const stdio = cleaner.mode === "hook"
    ? ["pipe", "pipe", "pipe"]
    : ["ignore", "pipe", "pipe"];

  let result;
  try {
    result = spawnSync(process.execPath, [scriptPath, ...argList], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      timeout: cleaner.timeoutMs,
      stdio,
      input,
      windowsHide: true,
    });
  } catch (err) {
    return {
      name: cleaner.name,
      ok: false,
      reason: "spawn-error",
      summary: `${cleaner.name}: spawn error: ${err?.message || err}`,
      exitCode: null,
      durationMs: Date.now() - startedAt,
      raw: { stdout: "", stderr: String(err?.message || err) },
    };
  }

  const durationMs = Date.now() - startedAt;
  const stdout = String(result.stdout || "");
  const stderr = String(result.stderr || "");
  const timedOut = result.error && result.error.code === "ETIMEDOUT";
  const exitCode = result.status;

  if (timedOut) {
    return {
      name: cleaner.name,
      ok: false,
      reason: "timeout",
      summary: `${cleaner.name}: timed out after ${cleaner.timeoutMs}ms`,
      exitCode: null,
      durationMs,
      raw: { stdout, stderr },
    };
  }

  let parsed;
  try {
    parsed = cleaner.parse(stdout, stderr);
  } catch (err) {
    parsed = { detail: `parse-error: ${err?.message || err}`, ok: false };
  }

  const ok = exitCode === 0 && parsed.ok !== false;
  return {
    name: cleaner.name,
    ok,
    reason: ok ? (parsed.reason || null) : (parsed.ok === false ? "parse" : "exit-nonzero"),
    summary: `${cleaner.name}: ${parsed.detail}`,
    detail: parsed.detail,
    counts: parsed.counts || null,
    exitCode,
    durationMs,
    raw: { stdout, stderr },
  };
}

// --- parsers (one per output format) -------------------------------------

/** Hook scripts emit {continue:true, systemMessage?, hookSpecificOutput?:{additionalContext?}} */
function parseHookJson(stdout) {
  const text = stdout.trim();
  // Empty stdout from a hook script is illegitimate (both bash-orphan-cleaner
  // and git-lock-sweeper ALWAYS emit at least {continue:true}). Treat as parse
  // failure rather than silently no-op.
  if (!text) return { ok: false, detail: "empty stdout (hook should always emit JSON)", counts: { acted: 0 } };
  try {
    const obj = JSON.parse(text);
    const msg = obj?.systemMessage
      || obj?.hookSpecificOutput?.additionalContext
      || "";
    if (msg) {
      return { detail: stripHookPrefix(msg), counts: extractCountFromMessage(msg) };
    }
    return { detail: "no-op (nothing to clean)", counts: { acted: 0 } };
  } catch (err) {
    // Non-JSON stdout from a hook is a real failure — fail loud per CLAUDE-md R12.
    return { ok: false, detail: `non-json stdout: ${text.slice(0, 80)} (${err?.message || "parse error"})`, counts: { acted: 0 } };
  }
}

/** chat-bus-reap --json prints a JSON summary object. */
function parseChatBusJson(stdout) {
  const text = stdout.trim();
  if (!text) return { detail: "no output", counts: { acted: 0 } };
  try {
    const obj = JSON.parse(text);
    const live = obj?.counts?.live ?? 0;
    const presence = obj?.counts?.reapedPresence ?? 0;
    const claims = obj?.counts?.reapedClaims ?? 0;
    const dry = obj?.dryRun ? " (dry-run)" : "";
    return {
      detail: `${live} live | reaped ${presence} presence + ${claims} claims${dry}`,
      counts: { live, reapedPresence: presence, reapedClaims: claims, acted: presence + claims },
    };
  } catch (err) {
    return { ok: false, detail: `parse failed: ${err?.message || err}` };
  }
}

/** zombie-reaper-daemon prints "Zombie reaper: N locks, M claims, K sessions" only when total>0. */
function parseZombieText(stdout) {
  const text = stdout.trim();
  if (!text) return { detail: "no-op (no zombies)", counts: { acted: 0 } };
  // Parse each label independently so field-reorder in the sub-cleaner
  // doesn't silently drop us to the slice-fallback path.
  const locksMatch = text.match(/(\d+)\s+locks?/i);
  const claimsMatch = text.match(/(\d+)\s+claims?/i);
  const sessionsMatch = text.match(/(\d+)\s+sessions?/i);
  const locks = locksMatch ? Number(locksMatch[1]) : 0;
  const claims = claimsMatch ? Number(claimsMatch[1]) : 0;
  const sessions = sessionsMatch ? Number(sessionsMatch[1]) : 0;
  if (locksMatch || claimsMatch || sessionsMatch) {
    return {
      detail: `${locks} locks + ${claims} claims + ${sessions} sessions reaped`,
      counts: { locks, claims, sessions, acted: locks + claims + sessions },
    };
  }
  // Sub-cleaner emitted unexpected text — surface for operator to investigate.
  return { detail: `unexpected: ${text.slice(0, 120)}`, counts: null };
}

/**
 * node-orphan-cleaner emits {additionalContext: "Node orphan cleaner: ..."} only
 * when killed>0||denied>0. Empty stdout is the legitimate quiet path — could be
 * (a) nothing transient to kill, or (b) throttled (<90s since last run). Without
 * reading its state file we can't distinguish; surfaced as "quiet-or-throttled"
 * so operators see the ambiguity rather than a misleading "0 killed" claim.
 */
function parseNodeOrphanJson(stdout) {
  const text = stdout.trim();
  if (!text) {
    return { reason: "quiet-or-throttled", detail: "no-op or throttled (<90s since last run)", counts: { acted: 0 } };
  }
  try {
    const obj = JSON.parse(text);
    const ctx = String(obj?.additionalContext || "").trim();
    if (!ctx) return { detail: "no-op", counts: { acted: 0 } };
    return { detail: stripHookPrefix(ctx), counts: extractKilledFromMessage(ctx) };
  } catch (err) {
    return { ok: false, detail: `non-json stdout: ${text.slice(0, 80)} (${err?.message || "parse error"})`, counts: { acted: 0 } };
  }
}

function stripHookPrefix(msg) {
  // Match: <name> optionally followed by " (suffix)" (e.g. git-lock-sweeper's
  // " (PreToolUse:30s)"), then ": " or trailing ":". The ":\s+" terminator
  // (require whitespace after the colon) prevents the regex from biting on
  // a ":" buried inside the optional parenthesized suffix.
  return String(msg).replace(/^(bash-orphan-cleaner|Node closeout stop hook|Node orphan cleaner|git-lock-sweeper)(\s*\([^)]*\))?:\s+/i, "");
}

function extractCountFromMessage(msg) {
  // Best-effort numeric extraction: first integer in the message.
  const m = String(msg).match(/(\d+)/);
  return m ? { acted: Number(m[1]) } : { acted: 0 };
}

function extractKilledFromMessage(msg) {
  const text = String(msg);
  const killed = (text.match(/Killed\s+(\d+)/) || [])[1];
  const freedMB = (text.match(/freed\s+(\d+)MB/) || [])[1];
  const denied = (text.match(/(\d+)\s+access-denied/) || [])[1];
  return {
    killed: killed ? Number(killed) : 0,
    freedMB: freedMB ? Number(freedMB) : 0,
    denied: denied ? Number(denied) : 0,
    acted: killed ? Number(killed) : 0,
  };
}

// --- main ----------------------------------------------------------------

function summarizeText(results, totals, dryRun) {
  const pieces = results.map((r) => {
    if (r.reason === "missing-script") return `${r.name}=MISSING`;
    if (r.reason === "dry-run-skip") return `${r.name}=skipped`;
    if (r.reason === "timeout") return `${r.name}=TIMEOUT`;
    if (r.reason === "spawn-error") return `${r.name}=ERR`;
    if (r.reason === "exit-nonzero") return `${r.name}=exit${r.exitCode}`;
    if (r.reason === "parse") return `${r.name}=PARSE-ERR`;
    if (r.reason === "quiet-or-throttled") return `${r.name}=throttled-or-quiet`;
    const acted = r.counts?.acted ?? 0;
    return `${r.name}=${acted}`;
  });
  const tag = dryRun ? " [dry-run]" : "";
  return `cleanup-orchestrator${tag}: ${pieces.join(" ")} [${totals.okCount}/${totals.total} ok, ${totals.totalDurationMs}ms]`;
}

function main() {
  const { args, errors } = parseArgs(process.argv.slice(2));
  if (errors.length > 0) {
    for (const e of errors) process.stderr.write(`cleanup-orchestrator: ${e}\n`);
    process.stderr.write(usage() + "\n");
    process.exit(2);
  }
  if (args.help) {
    process.stdout.write(usage() + "\n");
    return;
  }

  const startedAt = Date.now();
  const toRun = CLEANERS.filter((c) => !args.skip.has(c.name));
  const results = [];

  for (const cleaner of toRun) {
    const r = runOne(cleaner, args);
    results.push(r);
    log(`${r.name}: ${r.summary} (exit=${r.exitCode}, ${r.durationMs}ms)`);
  }

  const totalDurationMs = Date.now() - startedAt;
  // ok=true counts as ok; ok=false counts as fail; ok=null (dry-run-skip)
  // counts as neither — track it separately so failCount doesn't lie.
  const okCount = results.filter((r) => r.ok === true).length;
  const skippedCount = results.filter((r) => r.ok === null).length;
  const failCount = results.length - okCount - skippedCount;
  const totals = {
    total: results.length,
    okCount,
    skippedCount,
    failCount,
    totalDurationMs,
  };

  if (args.json) {
    const payload = {
      ok: totals.failCount === 0,
      partial: totals.skippedCount > 0,
      dryRun: args.dryRun,
      forceThrottled: args.forceThrottled,
      startedAt: new Date(startedAt).toISOString(),
      totalDurationMs,
      totals,
      skipped: [...args.skip],
      results: results.map((r) => {
        const out = {
          name: r.name,
          ok: r.ok,
          reason: r.reason,
          summary: r.summary,
          detail: r.detail || null,
          counts: r.counts || null,
          exitCode: r.exitCode,
          durationMs: r.durationMs,
        };
        if (args.verbose) out.raw = r.raw;
        return out;
      }),
    };
    process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
  } else {
    process.stdout.write(summarizeText(results, totals, args.dryRun) + "\n");
    for (const r of results) {
      if (!r.ok || r.reason === "dry-run-skip") {
        process.stdout.write(`  - ${r.summary}\n`);
      }
    }
  }

  process.exit(totals.failCount === 0 ? 0 : 1);
}

// CRITICAL: do NOT call main() unconditionally — when the test file imports
// this module, top-level main() would: (a) fork all 5 sub-cleaners against
// live shared state, and (b) call process.exit() killing the vitest worker.
// Guard against import-side execution by checking if this file is the script
// being run (i.e. argv[1] equals this module's path).
const invokedAsCli = (() => {
  try {
    if (!process.argv[1]) return false;
    const argv1Url = pathToFileURL(resolve(process.argv[1])).href;
    return argv1Url === import.meta.url;
  } catch {
    return false;
  }
})();

if (invokedAsCli) {
  try {
    main();
  } catch (err) {
    process.stderr.write(`cleanup-orchestrator: fatal: ${err?.message || err}\n`);
    log(`fatal: ${err?.stack || err}`);
    process.exit(1);
  }
}

// --- exports for testing ------------------------------------------------
// Test harness imports this via dynamic import; runtime CLI never sees these.
export {
  CLEANERS,
  parseArgs,
  parseHookJson,
  parseChatBusJson,
  parseZombieText,
  parseNodeOrphanJson,
  stripHookPrefix,
  extractCountFromMessage,
  extractKilledFromMessage,
  summarizeText,
  buildArgList,
};
