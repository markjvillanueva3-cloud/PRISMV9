#!/usr/bin/env node
/**
 * consensus-credit-cron.mjs — scheduled runner for consensus credit
 * assignment backfill. Wraps `applyFromFeed` and records run telemetry
 * to the JSONL run log.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / U-CREDIT-CRON.
 *
 * Schedule this with whatever cron / Task Scheduler / GitHub Actions /
 * npm-cron infrastructure you prefer. Idempotent — re-running over a
 * fully-consumed feed is a no-op (cursor advances only on new data).
 *
 * Exit codes:
 *   0 — run succeeded (processed N lines, possibly 0)
 *   1 — engine load failure
 *   2 — apply_feed returned ok=false
 *   3 — argument parse error
 *
 * Usage:
 *   node scripts/consensus-credit-cron.mjs
 *   node scripts/consensus-credit-cron.mjs --quiet         # only emit on error
 *   node scripts/consensus-credit-cron.mjs --verbose       # emit full result JSON
 *   node scripts/consensus-credit-cron.mjs --dry-run       # compute, don't persist
 *   node scripts/consensus-credit-cron.mjs --batch-size 100
 *   node scripts/consensus-credit-cron.mjs --feed /path/to/feed.jsonl
 *   node scripts/consensus-credit-cron.mjs --cursor /path/to/cursor.json
 *   node scripts/consensus-credit-cron.mjs --perf-state /path/to/perf.json
 *   node scripts/consensus-credit-cron.mjs --log /path/to/runs.jsonl
 *   node scripts/consensus-credit-cron.mjs --trigger systemd
 *
 * Recommended invocation under tsx (no build required):
 *   npx tsx scripts/consensus-credit-cron.mjs
 */

// Engine load: prefer compiled dist, fall back to src/.ts under tsx.
let creditEngine, runLogEngine;
try {
  ({ consensusNeuralCreditAssignmentEngine: creditEngine } =
    await import("../dist/engines/ConsensusNeuralCreditAssignmentEngine.js"));
  ({ consensusCreditRunLogEngine: runLogEngine } =
    await import("../dist/engines/ConsensusCreditRunLogEngine.js"));
} catch {
  try {
    ({ consensusNeuralCreditAssignmentEngine: creditEngine } =
      await import("../src/engines/ConsensusNeuralCreditAssignmentEngine.js"));
    ({ consensusCreditRunLogEngine: runLogEngine } =
      await import("../src/engines/ConsensusCreditRunLogEngine.js"));
  } catch (e) {
    console.error(
      "Failed to load consensus credit engines.\n" +
      "  Try: npx tsx scripts/consensus-credit-cron.mjs\n" +
      "  Or build first: npm run build:fast\n" +
      `  Error: ${e?.message ?? e}`,
    );
    process.exit(1);
  }
}

// ---- arg parsing (minimal) ----

function parseArgs(argv) {
  const opts = {
    quiet: false,
    verbose: false,
    dryRun: false,
    batchSize: undefined,
    feedPath: undefined,
    cursorPath: undefined,
    perfStatePath: undefined,
    logPath: undefined,
    trigger: "cron",
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case "--quiet":       opts.quiet = true; break;
      case "--verbose":     opts.verbose = true; break;
      case "--dry-run":     opts.dryRun = true; break;
      case "--batch-size":  opts.batchSize = parseIntOrThrow(next(), "--batch-size"); break;
      case "--feed":        opts.feedPath = next(); break;
      case "--cursor":      opts.cursorPath = next(); break;
      case "--perf-state":  opts.perfStatePath = next(); break;
      case "--log":         opts.logPath = next(); break;
      case "--trigger":     opts.trigger = next(); break;
      case "-h":
      case "--help":
        printHelp();
        process.exit(0);
        break;
      default:
        console.error(`Unknown argument: ${a}`);
        printHelp();
        process.exit(3);
    }
  }
  return opts;
}

function parseIntOrThrow(v, name) {
  const n = Number.parseInt(v, 10);
  if (!Number.isFinite(n) || n <= 0) {
    console.error(`${name} must be a positive integer (got: ${v})`);
    process.exit(3);
  }
  return n;
}

function printHelp() {
  console.log(`consensus-credit-cron.mjs — scheduled credit-assignment backfill

Usage:
  node scripts/consensus-credit-cron.mjs [options]

Options:
  --quiet               Only emit output on error (good for cron silence)
  --verbose             Emit full result JSON instead of one-line summary
  --dry-run             Compute counts but do NOT persist (no perf state, no cursor, no log)
  --batch-size <N>      Cap lines processed per run (default unlimited)
  --feed <path>         Override JSONL feed path
  --cursor <path>       Override cursor path
  --perf-state <path>   Override perf state path
  --log <path>          Override run log path
  --trigger <name>      Tag the run-log entry's trigger field (default "cron")
  -h, --help            Show this help

Exit codes:
  0 — success (any number of processed lines, including 0)
  1 — engine load failure
  2 — apply_feed returned ok=false (logged as failure)
  3 — argument parse error
`);
}

// ---- main ----

const opts = parseArgs(process.argv.slice(2));
const startedAt = Date.now();

const before = creditEngine.loadCursor(opts.cursorPath);
const beforeOffset = before.last_offset_bytes ?? 0;

const result = creditEngine.applyFromFeed({
  feedPath: opts.feedPath,
  cursorPath: opts.cursorPath,
  perfStatePath: opts.perfStatePath,
  batchSize: opts.batchSize,
  persist: !opts.dryRun,
});

const durationMs = Date.now() - startedAt;
const cursorAdvance = Math.max(0, (result.cursor?.last_offset_bytes ?? 0) - beforeOffset);

// Map perVendor totals → simple {vendor: observation_count} for log compactness.
const perVendor = {};
for (const [vendor, totals] of Object.entries(result.perVendor ?? {})) {
  perVendor[vendor] = totals.observations ?? 0;
}

if (!opts.dryRun) {
  runLogEngine.recordRun({
    ok: result.ok,
    processed: result.processed,
    skipped: result.skipped,
    cursorAdvance,
    cursorOffset: result.cursor?.last_offset_bytes ?? 0,
    perVendor,
    trigger: opts.trigger,
    error: result.error,
    durationMs,
    logPath: opts.logPath,
  });
}

// ---- output ----

if (opts.verbose) {
  process.stdout.write(JSON.stringify({
    ok: result.ok,
    processed: result.processed,
    skipped: result.skipped,
    cursorAdvance,
    cursorOffset: result.cursor?.last_offset_bytes ?? 0,
    perVendor,
    durationMs,
    dryRun: opts.dryRun,
    error: result.error,
  }, null, 2) + "\n");
} else if (!opts.quiet || !result.ok) {
  // One-line summary for cron logs.
  const tag = opts.dryRun ? "[dry-run]" : "[run]";
  const status = result.ok ? "ok" : `FAIL (${result.error ?? "unknown"})`;
  process.stdout.write(
    `${tag} status=${status} processed=${result.processed} skipped=${result.skipped} ` +
    `cursorAdvance=${cursorAdvance} duration=${durationMs}ms\n`,
  );
}

process.exit(result.ok ? 0 : 2);
