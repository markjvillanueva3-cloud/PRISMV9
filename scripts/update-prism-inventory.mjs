#!/usr/bin/env node
/**
 * PRISM Inventory Auto-Updater
 *
 * Regenerates PRISM-INVENTORY-<YYYY-MM-DD>.md with live counts scanned from
 * the repo. Also writes PRISM-INVENTORY-LATEST.md (copy, not symlink — Windows
 * compat), updates mcp-server/data/state/BASELINE_INVENTORY.json in place,
 * and prints a delta report comparing the new snapshot against the previous.
 *
 * Design goals:
 *  - <5s wall time for the default scan
 *  - Deterministic — same repo state produces same output
 *  - Non-destructive — old dated snapshots stay; only LATEST is overwritten
 *  - Safe — all file writes atomic (write to temp, rename)
 *
 * Usage:
 *   node scripts/update-prism-inventory.mjs              # normal run
 *   node scripts/update-prism-inventory.mjs --quiet      # suppress delta report
 *   node scripts/update-prism-inventory.mjs --dry-run    # scan only, no writes
 *   node scripts/update-prism-inventory.mjs --date=YYYY-MM-DD
 *
 * Related: referenced by /forge-audit and .claude/hooks/inventory-refresh.mjs.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const MCP = path.join(REPO_ROOT, "mcp-server");
const BASELINE_PATH = path.join(MCP, "data", "state", "BASELINE_INVENTORY.json");

const QUIET = process.argv.includes("--quiet");
const DRY = process.argv.includes("--dry-run");
const dateArg = process.argv.find((a) => a.startsWith("--date="));
const TODAY = dateArg ? dateArg.split("=")[1] : new Date().toISOString().slice(0, 10);

function walk(dir, filter) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(cur, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const full = path.join(cur, e.name);
      if (e.isDirectory()) {
        if (e.name === "node_modules" || e.name === ".git" || e.name === "dist" || e.name === "__pycache__") continue;
        stack.push(full);
      } else if (filter(full, e.name)) {
        out.push(full);
      }
    }
  }
  return out;
}

function countDirFiles(dir, ext) {
  if (!fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir).filter((f) => f.endsWith(ext) && !f.endsWith(".test.ts") && !f.endsWith(".d.ts")).length;
}

function countEngines() {
  return countDirFiles(path.join(MCP, "src", "engines"), ".ts");
}

function countDispatchers() {
  return countDirFiles(path.join(MCP, "src", "tools", "dispatchers"), ".ts");
}

function countActions() {
  // Dispatchers typically use either:
  //   const ACTIONS = ["a", "b", ...] as const;   and  z.enum(ACTIONS)
  //   or  z.enum(["a", "b", ...])  inline
  // Count the union of both patterns, deduplicated per file to avoid
  // double-counting when a file redeclares the array.
  const dir = path.join(MCP, "src", "tools", "dispatchers");
  if (!fs.existsSync(dir)) return 0;
  let count = 0;
  for (const f of fs.readdirSync(dir).filter((n) => n.endsWith(".ts"))) {
    const src = fs.readFileSync(path.join(dir, f), "utf8");
    const perFile = new Set();

    // Pattern 1: inline z.enum([...])
    for (const m of src.matchAll(/z\.enum\(\s*\[([\s\S]*?)\]\s*\)/g)) {
      for (const lit of m[1].matchAll(/["']([a-zA-Z0-9_\-.]+)["']/g)) {
        perFile.add(lit[1]);
      }
    }

    // Pattern 2: const ACTIONS = [...] as const; — only the canonical name
    // (avoids counting feature-flag arrays, category lists, etc.)
    for (const m of src.matchAll(/const\s+(ACTIONS|ACTION_NAMES|TOOL_ACTIONS|DISPATCHER_ACTIONS|ALL_ACTIONS)\s*=\s*\[([\s\S]*?)\]\s*(?:as\s+const)?\s*;/g)) {
      const inner = m[2];
      for (const lit of inner.matchAll(/["']([a-zA-Z_][a-zA-Z0-9_\-.]*)["']/g)) {
        perFile.add(lit[1]);
      }
    }

    count += perFile.size;
  }
  return count;
}

function countAlgorithms() {
  return countDirFiles(path.join(MCP, "src", "algorithms"), ".ts");
}

function countRegistries() {
  return countDirFiles(path.join(MCP, "src", "registries"), ".ts");
}

function countTests() {
  return walk(path.join(MCP, "src", "__tests__"), (_, name) => name.endsWith(".test.ts")).length;
}

function countSourceHooks() {
  return walk(path.join(MCP, "src", "hooks"), (_, name) => name.endsWith(".ts")).length;
}

function countClaudeHooks() {
  return walk(path.join(REPO_ROOT, ".claude", "hooks"), (_, name) => name.endsWith(".mjs") || name.endsWith(".cjs")).length;
}

function countScripts() {
  const repoScripts = walk(path.join(REPO_ROOT, "scripts"), (full, name) => {
    if (full.includes("_archive") || full.includes("_completed_utilities")) return false;
    return /\.(mjs|cjs|js|ts)$/.test(name) && !name.endsWith(".d.ts");
  }).length;
  const mcpScripts = walk(path.join(MCP, "scripts"), (_, name) => /\.(mjs|cjs|js|ts)$/.test(name)).length;
  return repoScripts + mcpScripts;
}

function countSlashCommands() {
  const local = walk(path.join(REPO_ROOT, ".claude", "commands"), (_, n) => n.endsWith(".md")).length;
  const userCmds = path.join(process.env.USERPROFILE || process.env.HOME || "", ".claude", "commands");
  const user = walk(userCmds, (_, n) => n.endsWith(".md")).length;
  return { local, user, total: local + user };
}

function countMigrations() {
  return countDirFiles(path.join(MCP, "src", "migrations"), ".ts");
}

function loadBaseline() {
  try {
    return JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8"));
  } catch {
    return null;
  }
}

function atomicWrite(filePath, content) {
  if (DRY) return;
  const tmp = `${filePath}.tmp.${process.pid}`;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(tmp, content, "utf8");
  fs.renameSync(tmp, filePath);
}

function scan() {
  const t0 = Date.now();
  const engines = countEngines();
  const dispatchers = countDispatchers();
  const actions = countActions();
  const algorithms = countAlgorithms();
  const registries = countRegistries();
  const tests = countTests();
  const sourceHooks = countSourceHooks();
  const claudeHooks = countClaudeHooks();
  const scripts = countScripts();
  const slash = countSlashCommands();
  const migrations = countMigrations();
  const elapsedMs = Date.now() - t0;

  return {
    timestamp: new Date().toISOString(),
    date: TODAY,
    elapsedMs,
    counts: {
      engines,
      dispatchers,
      actions,
      algorithms,
      registries,
      tests,
      sourceHooks,
      claudeHooks,
      scripts,
      slashCommandsLocal: slash.local,
      slashCommandsUser: slash.user,
      slashCommandsTotal: slash.total,
      migrations,
    },
  };
}

function buildMarkdown(snap, baseline) {
  const c = snap.counts;
  const b = baseline?.inventory ?? {};
  const regEntries = b.registry_entries ?? "n/a";
  const formulas = b.formulas?.registered ?? "n/a";
  const materials = b.materials ?? "n/a";
  const tools = b.tools ?? "n/a";
  const machines = b.machines ?? "n/a";
  const tribal = b.tribal_tips ?? "n/a";
  const strategies = b.toolpath_strategies ?? "n/a";
  const posts = b.post_processors ?? "n/a";

  return `# PRISM Complete Asset Inventory
**Generated:** ${snap.date}
**Updated:** ${snap.timestamp}
**Source:** live scan (${snap.elapsedMs}ms) — via scripts/update-prism-inventory.mjs

> This file is auto-generated. Edit \`scripts/update-prism-inventory.mjs\` to
> change counts or categories. Values labeled **(baseline)** come from
> \`mcp-server/data/state/BASELINE_INVENTORY.json\` and require manual refresh.

## Summary

| Category | Count | Source |
|----------|-------|--------|
| **Engines** | ${c.engines} | live: \`src/engines/*.ts\` |
| **Dispatchers** | ${c.dispatchers} | live: \`src/tools/dispatchers/*.ts\` |
| **Actions** | ${c.actions} | live: \`z.enum\` count across dispatchers |
| **Algorithms** | ${c.algorithms} | live: \`src/algorithms/*.ts\` |
| **Registries** | ${c.registries} | live: \`src/registries/*.ts\` |
| **Tests** | ${c.tests} | live: \`src/__tests__/**/*.test.ts\` |
| **Source Hooks** | ${c.sourceHooks} | live: \`src/hooks/**/*.ts\` |
| **Claude Hooks** | ${c.claudeHooks} | live: \`.claude/hooks/**/*.mjs\` |
| **Scripts** | ${c.scripts} | live: \`scripts/\` + \`mcp-server/scripts/\` |
| **Slash Commands (local)** | ${c.slashCommandsLocal} | live: \`.claude/commands/\` |
| **Slash Commands (user)** | ${c.slashCommandsUser} | live: \`~/.claude/commands/\` |
| **Migrations** | ${c.migrations} | live: \`src/migrations/*.ts\` |
| **Formulas** | ${formulas} | (baseline) |
| **Registry Entries** | ${regEntries} | (baseline) |
| **Toolpath Strategies** | ${strategies} | (baseline) |
| **Post Processors** | ${posts} | (baseline) |
| **Materials** | ${materials} | (baseline) |
| **Tools** | ${tools} | (baseline) |
| **Machines** | ${machines} | (baseline) |
| **Tribal Tips** | ${tribal} | (baseline) |

---

## Live Scan Detail

\`\`\`
scan duration: ${snap.elapsedMs}ms
engines:            ${c.engines.toString().padStart(6)}
dispatchers:        ${c.dispatchers.toString().padStart(6)}
actions (z.enum):   ${c.actions.toString().padStart(6)}
algorithms:         ${c.algorithms.toString().padStart(6)}
registries:         ${c.registries.toString().padStart(6)}
tests:              ${c.tests.toString().padStart(6)}
source hooks:       ${c.sourceHooks.toString().padStart(6)}
claude hooks:       ${c.claudeHooks.toString().padStart(6)}
scripts:            ${c.scripts.toString().padStart(6)}
slash cmds (local): ${c.slashCommandsLocal.toString().padStart(6)}
slash cmds (user):  ${c.slashCommandsUser.toString().padStart(6)}
migrations:         ${c.migrations.toString().padStart(6)}
\`\`\`

---

## Auto-Update Protocol

This file is regenerated by:
1. **Manual:** \`node scripts/update-prism-inventory.mjs\`
2. **SessionStart hook:** \`.claude/hooks/inventory-refresh.mjs\` (24h throttle)
3. **\`/forge-audit\` preflight:** slash command invokes the updater before scanning

### What requires manual refresh
Registry counts (formulas, materials, tools, machines, tribal tips, strategies,
post processors) live in \`BASELINE_INVENTORY.json\` and are not re-scanned by
this script — they require running registry-specific counters. Update them
by editing \`mcp-server/data/state/BASELINE_INVENTORY.json\`.

### File locations
\`\`\`
H:/prism/
├── PRISM-INVENTORY-<YYYY-MM-DD>.md    # dated snapshots (history)
├── PRISM-INVENTORY-LATEST.md          # always current (overwrite target)
├── scripts/update-prism-inventory.mjs # this script
├── .claude/hooks/inventory-refresh.mjs # session-start hook
└── mcp-server/data/state/BASELINE_INVENTORY.json  # registry counts
\`\`\`

---

## Wiki Capability (KNOWLEDGE-WIKI-MS0)

PRISM ships a Karpathy-style compounding markdown wiki at \`H:/prism/knowledge/wiki/\`.
Query \`wiki/index.md\` BEFORE re-deriving from digests. Full protocol in \`H:/prism/WIKI_SCHEMA.md\`.

| Layer | Count | Files |
|-------|-------|-------|
| Engines | 8 | \`Wiki{Pattern,Coding,Error,SelfAwareness,Ingest,Lint,Index,Log}*Engine.ts\` |
| Dispatcher | 1 | \`prism_wiki\` (\`src/tools/dispatchers/wikiDispatcher.ts\`) |
| Actions | 11 | wiki_ingest_run, wiki_ingest_finalize, wiki_lint, wiki_harvest_patterns, wiki_harvest_tribal, wiki_harvest_lessons, wiki_sync_self_awareness, wiki_index_read, wiki_index_upsert, wiki_log_append, wiki_log_read |
| Slash commands | 8 | \`/wiki-{ingest,query,lint,morning,sync,harvest,page,bootstrap}\` |
| Hooks | 4 | wiki-query-first (UserPromptSubmit), wiki-auto-ingest-suggest (UserPromptSubmit), wiki-log-on-commit (PostToolUse[Bash]), wiki-lint-periodic (Stop) |
| Cron | 1 | \`wiki-harvest-h-drive\` (daily; cron-templates.json) |

**Engines (8):** WikiPatternHarvesterEngine, WikiCodingTribalEngine, WikiErrorLearningBridgeEngine,
WikiSelfAwarenessSyncEngine, WikiIngestRouterEngine, WikiLintEngine, WikiIndexMaintainerEngine,
WikiLogAppenderEngine.

**Token-economy split:** Ollama owns ≥70% of wiki maintenance (summarize, lint, embed, cross-ref).
Claude owns synthesis, contradiction resolution, and schema evolution.
`;
}

function diffReport(snap, baseline) {
  const b = baseline?.inventory;
  if (!b) return "No previous baseline — this is the first snapshot.";
  const lines = ["Deltas vs BASELINE_INVENTORY.json:"];
  const bEng = typeof b.engines === "number" ? b.engines : b.engines?.files;
  const deltas = [
    ["engines", snap.counts.engines, bEng],
    ["dispatchers", snap.counts.dispatchers, b.dispatchers],
    ["actions", snap.counts.actions, b.actions],
    ["algorithms", snap.counts.algorithms, b.algorithms],
    ["registries", snap.counts.registries, b.registries],
    ["tests", snap.counts.tests, b.test_count],
    ["scripts", snap.counts.scripts, b.scripts],
  ];
  for (const [name, now, prev] of deltas) {
    if (typeof prev !== "number") continue;
    const d = now - prev;
    const sign = d > 0 ? `+${d}` : d < 0 ? `${d}` : "=";
    lines.push(`  ${name.padEnd(14)} ${prev.toString().padStart(6)} -> ${now.toString().padStart(6)} (${sign})`);
  }
  return lines.join("\n");
}

function updateBaselineInPlace(snap, baseline) {
  if (!baseline) return;
  const now = new Date().toISOString();
  baseline.previous_baseline = {
    timestamp: baseline.timestamp,
    milestone: baseline.milestone,
    dispatchers: baseline.inventory?.dispatchers,
    actions: baseline.inventory?.actions,
    engines: typeof baseline.inventory?.engines === "number" ? baseline.inventory.engines : baseline.inventory?.engines?.files,
  };
  baseline.timestamp = now;
  baseline.milestone = "INV-AUTO-UPDATE";
  baseline.inventory = {
    ...baseline.inventory,
    dispatchers: snap.counts.dispatchers,
    actions: snap.counts.actions,
    engines: { files: snap.counts.engines, exported: snap.counts.engines, note: "live scan" },
    registries: snap.counts.registries,
    algorithms: snap.counts.algorithms,
    test_count: snap.counts.tests,
    scripts: snap.counts.scripts,
  };
  atomicWrite(BASELINE_PATH, JSON.stringify(baseline, null, 2) + "\n");
}

function main() {
  const baseline = loadBaseline();
  const snap = scan();
  const md = buildMarkdown(snap, baseline);

  const datedPath = path.join(REPO_ROOT, `PRISM-INVENTORY-${snap.date}.md`);
  const latestPath = path.join(REPO_ROOT, "PRISM-INVENTORY-LATEST.md");
  atomicWrite(datedPath, md);
  atomicWrite(latestPath, md);
  updateBaselineInPlace(snap, baseline);

  if (!QUIET) {
    console.log(`PRISM inventory updated (${snap.elapsedMs}ms)`);
    console.log(`  -> ${path.relative(REPO_ROOT, datedPath)}`);
    console.log(`  -> ${path.relative(REPO_ROOT, latestPath)}`);
    console.log(diffReport(snap, baseline));
    if (DRY) console.log("[dry-run] no files written");
  }
}

main();
