#!/usr/bin/env node
/**
 * hook-wiring-vs-fire-categorize.mjs — U-OBF-F4 categorizer
 *
 * The hook-fire-rank.mjs reports 516 hooks-on-disk that never fired in the
 * telemetry window. That's a SPLIT population:
 *   - WIRED-but-silent: in settings.json but never produced a telemetry event
 *     (the genuine fork-storm / xmalloc risk — load-on-every-event for no
 *     payoff). High-leverage disable candidates.
 *   - UNWIRED-on-disk: no path into settings.json at all. Already inert —
 *     disabling them in settings.json is a no-op (they aren't there). The
 *     real action for these is to ARCHIVE them off the live hooks/ dir per
 *     [[feedback_never_delete_only_disable]] so they stop bloating searches.
 *
 * Mass-disabling all 516 based on the ranker output alone would target a
 * 73%-noise population. This script splits the two buckets so an operator
 * can act surgically: disable wired-silents first (real risk reduction),
 * archive unwired-on-disk separately (housekeeping).
 *
 * Pure core (`categorize`) + thin CLI shell. No state mutation —
 * advisory artifact only. Per the BRAVO-TASK-QUEUE doctrine: "if the
 * never-fire ratio verifies, disable dead hooks" — this script's output
 * IS the verification (which hooks are actually disable-eligible vs
 * which are misleading-no-op-noise).
 *
 * Usage:
 *   node scripts/hook-wiring-vs-fire-categorize.mjs              # human
 *   node scripts/hook-wiring-vs-fire-categorize.mjs --json
 *   node scripts/hook-wiring-vs-fire-categorize.mjs --top-N 25   # cap output
 *
 * Exit: 0 ok, 2 input failure.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");

// settings.json lives outside the repo by design — both the C: harness path
// (where Claude Code reads it) and the H: mirror (auto-synced by the
// c-to-h-mirror hook). We accept both as canonical sources; either alone is
// authoritative since the mirror keeps them byte-equal.
const SETTINGS_CANDIDATES = [
  "C:/Users/Mark Villanueva/.claude/settings.json",
  "H:/.claude/settings.json",
  resolve(REPO_ROOT, ".claude/settings.json"),
];

const DEFAULT_TOP_N = 50;

// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract every hook-script basename referenced in a settings.json command
 * string. The harness shells out commands like `node .claude/hooks/foo.mjs`
 * or `"H:/.claude/bin/portable-node" .claude/hooks/bar.mjs` — we want the
 * basename of any `.mjs` referenced under a `hooks/` segment.
 *
 * Returns the array of basenames WITHOUT the `.mjs` suffix (matching the
 * shape the ranker emits in its `zero_fire[]` list).
 */
export function extractWiredBasenames(settingsObj) {
  if (!settingsObj || typeof settingsObj !== "object") return [];
  const wired = new Set();
  const recur = (node) => {
    if (node == null) return;
    if (typeof node === "string") {
      // Match `.../hooks/<name>.mjs` (path separator either / or \)
      const m = node.match(/[\/\\]hooks[\/\\]([A-Za-z0-9_.-]+)\.mjs/g);
      if (m) {
        for (const hit of m) {
          const name = hit.replace(/.*[\/\\]/, "").replace(/\.mjs$/, "");
          wired.add(name);
        }
      }
    } else if (Array.isArray(node)) {
      for (const v of node) recur(v);
    } else if (typeof node === "object") {
      for (const k of Object.keys(node)) recur(node[k]);
    }
  };
  recur(settingsObj);
  return [...wired].sort();
}

/**
 * Pure categorizer. Given the ranker's zero_fire list (basenames) and the
 * set of wired-hook basenames, splits into wired-but-silent vs
 * unwired-on-disk. Both inputs are arrays of strings; output is two sorted
 * arrays + summary counters.
 *
 * Defensive: undefined / null inputs treated as []; duplicates de-dup'd.
 */
export function categorize({ zeroFire, wiredBasenames }) {
  const zeroSet = new Set(Array.isArray(zeroFire) ? zeroFire : []);
  const wiredSet = new Set(Array.isArray(wiredBasenames) ? wiredBasenames : []);
  const wiredButSilent = [];
  const unwiredOnDisk = [];
  for (const name of zeroSet) {
    if (wiredSet.has(name)) wiredButSilent.push(name);
    else unwiredOnDisk.push(name);
  }
  wiredButSilent.sort();
  unwiredOnDisk.sort();
  return {
    counts: {
      totalZeroFire: zeroSet.size,
      wiredButSilent: wiredButSilent.length,
      unwiredOnDisk: unwiredOnDisk.length,
      totalWired: wiredSet.size,
    },
    wiredButSilent,
    unwiredOnDisk,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// IO shell (impure)
// ─────────────────────────────────────────────────────────────────────────────

export function readSettingsJson(candidates = SETTINGS_CANDIDATES) {
  for (const p of candidates) {
    if (!existsSync(p)) continue;
    try {
      const raw = readFileSync(p, "utf8");
      return { source: p, json: JSON.parse(raw) };
    } catch (e) {
      // Continue probing; surface only if NONE work.
      if (process.env.PRISM_HOOK_CATEGORIZE_VERBOSE === "1") {
        process.stderr.write(`settings.json parse error at ${p}: ${e.message}\n`);
      }
    }
  }
  return { source: null, json: null };
}

export function readRankerOutput() {
  // Re-shell the ranker rather than re-parse its inputs — keeps the
  // single source of truth on what "zero_fire" means.
  const r = spawnSync(process.execPath, [
    resolve(REPO_ROOT, "scripts/hook-fire-rank.mjs"),
    "--include-zero",
    "--json",
  ], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  if (r.status !== 0) {
    throw new Error(`hook-fire-rank exited ${r.status}: ${r.stderr || r.stdout}`);
  }
  return JSON.parse(r.stdout);
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI
// ─────────────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const out = { json: false, topN: DEFAULT_TOP_N };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") out.json = true;
    else if (a === "--top-N" || a === "--top") {
      const n = Number(argv[++i]);
      if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1 || n > 1000) {
        console.error(`--top-N requires integer in [1,1000], got: ${argv[i]}`);
        process.exit(2);
      }
      out.topN = n;
    } else if (a === "--help" || a === "-h") {
      console.log(`hook-wiring-vs-fire-categorize.mjs
  --json         emit JSON
  --top-N N      cap each list to N (default ${DEFAULT_TOP_N})`);
      process.exit(0);
    } else {
      console.error(`unknown flag: ${a}`);
      process.exit(2);
    }
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const { source: settingsSource, json: settings } = readSettingsJson();
  if (!settings) {
    console.error("could not read any settings.json from candidates:");
    for (const c of SETTINGS_CANDIDATES) console.error(`  - ${c}`);
    process.exit(2);
  }
  const wiredBasenames = extractWiredBasenames(settings);

  let ranker;
  try {
    ranker = readRankerOutput();
  } catch (e) {
    console.error(`hook-fire-rank failed: ${e.message}`);
    process.exit(2);
  }
  const zeroFire = Array.isArray(ranker.zero_fire) ? ranker.zero_fire : [];

  const result = categorize({ zeroFire, wiredBasenames });
  const out = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    settingsSource,
    ledgerWindowHours: ranker?.window?.hours,
    ...result,
    wiredButSilentSample: result.wiredButSilent.slice(0, args.topN),
    unwiredOnDiskSample: result.unwiredOnDisk.slice(0, args.topN),
  };

  if (args.json) {
    console.log(JSON.stringify(out, null, 2));
    process.exit(0);
  }

  // Human readable
  const { counts } = out;
  console.log("─── Hook Wiring × Fire Categorization ───");
  console.log(`Generated: ${out.generatedAt}  ·  Settings: ${settingsSource}`);
  console.log(`Ledger window: ${(out.ledgerWindowHours || 0).toFixed(1)}h`);
  console.log("");
  console.log(`Total wired (unique paths in settings.json): ${counts.totalWired}`);
  console.log(`Total zero-fire reported by ranker:          ${counts.totalZeroFire}`);
  console.log(`  → WIRED but never fired (real risk):       ${counts.wiredButSilent}`);
  console.log(`  → UNWIRED on disk (already inert):         ${counts.unwiredOnDisk}`);
  console.log("");
  console.log(`First ${Math.min(args.topN, counts.wiredButSilent)} WIRED-but-SILENT (highest-leverage disable candidates):`);
  for (const name of out.wiredButSilentSample) console.log(`  ${name}`);
  console.log("");
  console.log(`First ${Math.min(args.topN, counts.unwiredOnDisk)} UNWIRED-on-disk (archive candidates, no settings.json action needed):`);
  for (const name of out.unwiredOnDiskSample) console.log(`  ${name}`);
  process.exit(0);
}

// Only run when invoked as a script (not when imported by tests).
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}` ||
    import.meta.url.endsWith(basename(process.argv[1] || ""))) {
  main();
}
