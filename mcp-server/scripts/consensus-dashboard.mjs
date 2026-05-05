#!/usr/bin/env node
/**
 * consensus-dashboard.mjs — print the consensus learning dashboard as
 * markdown for terminal/cron use.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / U-CONSENSUS-DASHBOARD-CLI.
 *
 * Reads:
 *   - mcp-server/data/state/consensus-model-performance.json (perf state)
 *   - state/shared/CONSENSUS_NEURAL_FEED.jsonl (training feed, optional)
 *
 * Writes: stdout. Exit 0 on success, 1 on engine load failure.
 *
 * Usage:
 *   node scripts/consensus-dashboard.mjs
 *   node scripts/consensus-dashboard.mjs --no-trend --no-probes
 *   node scripts/consensus-dashboard.mjs --top-k 10 --probes-limit 20
 *   node scripts/consensus-dashboard.mjs --perf-state /path/to/perf.json
 *   node scripts/consensus-dashboard.mjs --feed /path/to/feed.jsonl
 *   node scripts/consensus-dashboard.mjs --stale-after-days 30
 *   node scripts/consensus-dashboard.mjs --json   # raw JSON instead of markdown
 *
 * Exits non-zero if the engine module cannot be loaded (e.g. tsx mode
 * has not been used to compile). Recommended invocation:
 *   npx tsx scripts/consensus-dashboard.mjs
 */
// Engine loading strategy: try compiled dist first (cheap), fall back to
// .ts source. When run under tsx (`npx tsx scripts/consensus-dashboard.mjs`),
// tsx auto-maps "../src/engines/X.js" → "../src/engines/X.ts". When run
// under plain node, only the dist path will resolve.
let dashboardEngine, rendererEngine, runLogEngine;
try {
  ({ consensusPerformanceDashboardEngine: dashboardEngine } =
    await import("../dist/engines/ConsensusPerformanceDashboardEngine.js"));
  ({ consensusDashboardRendererEngine: rendererEngine } =
    await import("../dist/engines/ConsensusDashboardRendererEngine.js"));
  ({ consensusCreditRunLogEngine: runLogEngine } =
    await import("../dist/engines/ConsensusCreditRunLogEngine.js"));
} catch {
  try {
    ({ consensusPerformanceDashboardEngine: dashboardEngine } =
      await import("../src/engines/ConsensusPerformanceDashboardEngine.js"));
    ({ consensusDashboardRendererEngine: rendererEngine } =
      await import("../src/engines/ConsensusDashboardRendererEngine.js"));
    ({ consensusCreditRunLogEngine: runLogEngine } =
      await import("../src/engines/ConsensusCreditRunLogEngine.js"));
  } catch (e) {
    console.error(
      "Failed to load consensus dashboard engines.\n" +
      "  Try: npx tsx scripts/consensus-dashboard.mjs\n" +
      "  Or build first: npm run build:fast\n" +
      `  Error: ${e?.message ?? e}`,
    );
    process.exit(1);
  }
}

// ---- arg parsing (minimal — no external deps) ----

function parseArgs(argv) {
  const opts = {
    json: false,
    showTrend: true,
    showProbes: true,
    showRunLog: true,
    topK: undefined,
    probesLimit: undefined,
    runLogLimit: undefined,
    withRuns: 0,
    runLogPath: undefined,
    perfStatePath: undefined,
    feedPath: undefined,
    staleAfterDays: undefined,
    title: undefined,
    expectedVendors: undefined,
    expectedTaskTypes: undefined,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case "--json":             opts.json = true; break;
      case "--no-trend":         opts.showTrend = false; break;
      case "--no-probes":        opts.showProbes = false; break;
      case "--no-runs":          opts.showRunLog = false; break;
      case "--top-k":            opts.topK = parseIntOrThrow(next(), "--top-k"); break;
      case "--probes-limit":     opts.probesLimit = parseIntOrThrow(next(), "--probes-limit"); break;
      case "--with-runs":        opts.withRuns = parseIntOrThrow(next(), "--with-runs"); break;
      case "--runs-limit":       opts.runLogLimit = parseIntOrThrow(next(), "--runs-limit"); break;
      case "--run-log":          opts.runLogPath = next(); break;
      case "--perf-state":       opts.perfStatePath = next(); break;
      case "--feed":             opts.feedPath = next(); break;
      case "--stale-after-days": opts.staleAfterDays = parseFloatOrThrow(next(), "--stale-after-days"); break;
      case "--title":            opts.title = next(); break;
      case "--vendors":          opts.expectedVendors = next().split(",").map((s) => s.trim()).filter(Boolean); break;
      case "--task-types":       opts.expectedTaskTypes = next().split(",").map((s) => s.trim()).filter(Boolean); break;
      case "-h":
      case "--help":
        printHelp();
        process.exit(0);
        break;
      default:
        console.error(`Unknown argument: ${a}`);
        printHelp();
        process.exit(2);
    }
  }
  return opts;
}

function parseIntOrThrow(v, name) {
  const n = Number.parseInt(v, 10);
  if (!Number.isFinite(n) || n < 0) {
    console.error(`${name} must be a non-negative integer (got: ${v})`);
    process.exit(2);
  }
  return n;
}

function parseFloatOrThrow(v, name) {
  const n = Number.parseFloat(v);
  if (!Number.isFinite(n) || n < 0) {
    console.error(`${name} must be a non-negative number (got: ${v})`);
    process.exit(2);
  }
  return n;
}

function printHelp() {
  console.log(`consensus-dashboard.mjs — print the consensus learning dashboard

Usage:
  node scripts/consensus-dashboard.mjs [options]

Options:
  --json                       Emit raw dashboard JSON instead of markdown
  --no-trend                   Suppress the recent-trend section
  --no-probes                  Suppress the suggested-probes section
  --no-runs                    Suppress the recent credit-cron runs section
  --top-k <N>                  Cap vendors shown per task (default 5)
  --probes-limit <N>           Cap probe rows shown (default 10)
  --with-runs <N>              Include the last N credit-cron runs section
  --runs-limit <N>             Cap rows shown in the runs table (default 10)
  --run-log <path>             Override credit-cron run log path
  --perf-state <path>          Override perf state path
  --feed <path>                Override JSONL feed path
  --stale-after-days <N>       Flag observations older than N days as stale (0 = disabled)
  --title <text>               Override the markdown H1 title
  --vendors <a,b,c>            Override expected vendor pool (comma-separated)
  --task-types <a,b,c>         Override expected task-type pool (comma-separated)
  -h, --help                   Show this help

Examples:
  node scripts/consensus-dashboard.mjs
  node scripts/consensus-dashboard.mjs --no-trend --top-k 10
  node scripts/consensus-dashboard.mjs --json | jq '.suggestedProbes[:5]'
  node scripts/consensus-dashboard.mjs --stale-after-days 14
`);
}

// ---- main ----

const opts = parseArgs(process.argv.slice(2));

const dashboard = dashboardEngine.compute({
  perfStatePath: opts.perfStatePath,
  feedPath: opts.feedPath,
  expectedVendors: opts.expectedVendors,
  expectedTaskTypes: opts.expectedTaskTypes,
  topK: opts.topK,
  staleAfterDays: opts.staleAfterDays,
});

// Optional: load credit-cron run log when --with-runs N is specified.
// Builds a RunLogPayload by pairing tail-history with aggregate stats.
let runLogPayload;
if (opts.withRuns > 0 && opts.showRunLog !== false) {
  try {
    const history = runLogEngine.getHistory({ limit: opts.withRuns, logPath: opts.runLogPath });
    const stats = runLogEngine.getStats({ limit: opts.withRuns, logPath: opts.runLogPath });
    runLogPayload = { history, stats };
  } catch (e) {
    console.error(`Failed to load run log: ${e?.message ?? e}`);
    // Fail-open: continue without run-log section.
  }
}

if (opts.json) {
  const out = runLogPayload
    ? { ...dashboard, runLog: runLogPayload }
    : dashboard;
  process.stdout.write(JSON.stringify(out, null, 2) + "\n");
} else {
  const md = rendererEngine.render(dashboard, {
    showTrend: opts.showTrend,
    showProbes: opts.showProbes,
    showRunLog: opts.showRunLog,
    probesLimit: opts.probesLimit,
    runLogLimit: opts.runLogLimit ?? opts.withRuns,
    title: opts.title,
    runLog: runLogPayload,
  });
  process.stdout.write(md);
}
