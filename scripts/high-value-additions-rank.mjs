#!/usr/bin/env node
/**
 * high-value-additions-rank.mjs
 * =============================
 * Re-runnable leverage ranker for PRISM dev-process additions.
 * META artifact for HIGH-VALUE-ADDITIONS-AUDIT-2026-05-14.
 *
 * Measures (as baselines re-measurable on every run):
 *   1. Hook orphan rate            — source files vs settings.json wired
 *   2. Zero-action dispatchers     — dispatchers with 0 actions in DISPATCHER_DIGEST
 *   3. Engine buildClass:unknown   — engines built but not wired to dispatchers
 *   4. Script cadence ratio        — regen-* (cadenced) vs generate-* (one-shot)
 *   5. Worktree drift              — INVESTIGATE+PRUNE candidates in viz graph
 *   6. Coordination orphan rate    — ghost claims (dead PID, status=unknown)
 *   7. Spec HTML companion rate    — specs with .html beside .md (Thariq)
 *
 * Outputs:
 *   --pretty  → human-readable table + advisories (default)
 *   --json    → machine-readable JSON
 *
 * Usage:
 *   node scripts/high-value-additions-rank.mjs
 *   node scripts/high-value-additions-rank.mjs --json > state/shared/hva-baseline.json
 *
 * Author: claude-a2b1b5ca / /forge-audit-v2 (alpha slot, 2026-05-14)
 * Tracking: HIGH-VALUE-ADDITIONS-AUDIT-2026-05-14.md
 */

import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const __filename = url.fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), "..");
const NOW = new Date().toISOString();

// ---------- helpers ----------

function readSafe(p, dflt = null) {
  try { return fs.readFileSync(p, "utf8"); } catch { return dflt; }
}
function readJsonSafe(p, dflt = null) {
  const t = readSafe(p, null);
  if (!t) return dflt;
  try { return JSON.parse(t); } catch { return dflt; }
}
function lsSafe(dir, filter = () => true) {
  try { return fs.readdirSync(dir).filter(filter); } catch { return []; }
}

// ---------- measurement #1: hook orphan rate (bundle-aware) ----------
function measureHookOrphans() {
  const hookDir = path.join(ROOT, ".claude/hooks");
  const bundleDir = path.join(hookDir, "bundles");
  const settings = readJsonSafe("H:/.claude/settings.json", {});
  const wired = new Set();

  // Pass 1: scrape settings.json command fields for direct hook references
  const walk = (o) => {
    if (Array.isArray(o)) o.forEach(walk);
    else if (o && typeof o === "object") {
      if (typeof o.command === "string") {
        const m = o.command.match(/hooks\/([\w.-]+)\.mjs/g) || [];
        m.forEach(x => wired.add(x.replace("hooks/", "").replace(".mjs", "")));
      }
      Object.values(o).forEach(walk);
    }
  };
  walk(settings);

  // Pass 2: bundle expansion — bundles reference child hooks via template literals
  // or array entries. Read each bundle file, extract hook references.
  const bundleHooksFound = new Set();
  try {
    const bundleFiles = lsSafe(bundleDir, f => f.endsWith(".mjs"));
    for (const bf of bundleFiles) {
      const content = readSafe(path.join(bundleDir, bf), "");
      // Common patterns: `${HOOK_BASE}/foo.mjs`, "foo.mjs", '../foo.mjs'
      const patterns = [
        /HOOK_BASE\}?\/([\w.-]+)\.mjs/g,
        /["'`](?:\.\.\/)*\.?\/?([\w.-]+)\.mjs["'`]/g,
        /hooks\/([\w.-]+)\.mjs/g,
      ];
      for (const re of patterns) {
        let m;
        while ((m = re.exec(content))) {
          const name = m[1];
          if (name && !name.startsWith(".") && !name.includes("/")) {
            wired.add(name);
            bundleHooksFound.add(name);
          }
        }
      }
    }
  } catch { /* bundle dir missing → no expansion */ }

  const files = lsSafe(hookDir, f => f.endsWith(".mjs")).map(f => f.replace(".mjs", ""));
  const orphans = files.filter(f => !wired.has(f));
  return {
    sourceHooks: files.length,
    wiredHooks: wired.size,
    wiredViaSettings: wired.size - bundleHooksFound.size,
    wiredViaBundle: bundleHooksFound.size,
    orphanHooks: orphans.length,
    orphanRatePct: files.length ? +(orphans.length / files.length * 100).toFixed(1) : 0,
    topInterestOrphans: orphans
      .filter(o => /inject|router|guard|gate|coord|fleet|token|ollama|memory|context|drift|orphan|embed|hook|wiki|telemetry|profile|latency/i.test(o))
      .slice(0, 25),
  };
}

// ---------- measurement #2: zero-action dispatchers ----------
// Reviewer found DISPATCHER_DIGEST.md parser is broken for spread-array enums
// (e.g. `z.enum([...A, ...B] as const)`). Count actions DIRECTLY from .ts files
// via case-statement regex. Digest is used as a secondary corroborator only.
//
// U-HVA-DIGEST-PARSER-FIX (2026-05-15, claude-6d0595bf bravo slot):
// Some dispatchers (safetyDispatcher pattern) use `new Set([...])` + `Set.has()`
// dispatch instead of `switch/case`. Earlier count-only-by-case missed these,
// reporting them as 0 actions when they actually have 30+. Extended detection:
//   1. case "x": ... — existing switch-statement actions
//   2. const X_ACTIONS = new Set([...]) — Set-based action registries
//   3. const X_ACTIONS = [ "...", "..." ] as const — array-based registries
// Counts distinct action strings (deduped across detection paths) per file.
const ACTION_MIN_CASES = 3; // threshold below which we genuinely call it "thin"

function countActionsInFile(content) {
  const actions = new Set();
  // 1. switch/case actions
  for (const m of content.matchAll(/case\s+["']([\w-]+)["']\s*:/g)) actions.add(m[1]);
  // 2. const <X>ACTIONS = new Set([...]) — Set-based action registries
  //    Matches both X_ACTIONS and bare ACTIONS naming (regex requires ACTIONS suffix to avoid
  //    over-matching unrelated arrays).
  for (const m of content.matchAll(/const\s+\w*ACTIONS\w*\s*=\s*new\s+Set\s*\(\s*\[([\s\S]*?)\]\s*\)/g)) {
    for (const s of (m[1].match(/["']([\w-]+)["']/g) || [])) {
      actions.add(s.slice(1, -1));
    }
  }
  // 3. const <X>ACTIONS = [ ... ] as const — array-based action registries
  //    Skips aggregate registries (those containing spread tokens — we count their members separately
  //    via patterns #2 or non-aggregate #3 matches).
  for (const m of content.matchAll(/const\s+\w*ACTIONS\w*\s*=\s*\[([\s\S]*?)\]\s*as\s+const/g)) {
    if (m[1].includes("...")) continue;
    for (const s of (m[1].match(/["']([\w-]+)["']/g) || [])) {
      actions.add(s.slice(1, -1));
    }
  }
  // 4. const ACTION_MAP = { "key": ..., "key2": ... } — handler-map dispatch pattern.
  //    Counts object keys as actions. Used by fluidThermalDispatcher and similar.
  //    Tolerates TypeScript type annotation between name and `=` (e.g.
  //    `const ACTION_MAP: Record<string, ...> = {`).
  for (const m of content.matchAll(/const\s+(?:ACTION_MAP|HANDLER_MAP|HANDLERS|DISPATCH_MAP)\s*(?::[^=]+)?=\s*\{([\s\S]*?)\}\s*(?:as\s+const)?\s*;/g)) {
    // Match quoted keys: "snake_case_key": and 'snake_case_key':
    for (const s of (m[1].match(/["']([\w-]+)["']\s*:/g) || [])) {
      const key = s.match(/["']([\w-]+)["']/)[1];
      actions.add(key);
    }
    // Match bare identifier keys: snake_case_key: (no quotes)
    for (const s of (m[1].match(/^\s*([a-z][\w_]*)\s*:/gm) || [])) {
      const key = s.match(/([a-z][\w_]*)/)[1];
      actions.add(key);
    }
  }
  return actions.size;
}

function measureZeroActionDispatchers() {
  const dispDir = path.join(ROOT, "mcp-server/src/tools/dispatchers");
  const files = lsSafe(dispDir, f => f.endsWith("Dispatcher.ts") && !f.includes(".test."));
  const counts = {};
  const thin = [];
  let total = 0;
  for (const f of files) {
    const content = readSafe(path.join(dispDir, f), "");
    const n = countActionsInFile(content);
    const name = f.replace(".ts", "");
    counts[name] = n;
    total += n;
    if (n < ACTION_MIN_CASES) thin.push({ name, cases: n });
  }
  // Cross-check vs digest for staleness flag
  const digest = readSafe(path.join(ROOT, "mcp-server/data/docs/DISPATCHER_DIGEST.md"), "");
  const digestZero = [];
  for (const line of digest.split("\n")) {
    const m = line.match(/^\|\s*([a-zA-Z]+Dispatcher(?:\.test)?)\s*\|.*?\|\s*(\d+)\s*\|/);
    if (m && parseInt(m[2], 10) === 0) digestZero.push(m[1]);
  }
  // Mismatch detection: digest says 0 but case count is ≥ ACTION_MIN_CASES
  const digestParseBugs = digestZero.filter(name => (counts[name] ?? 0) >= ACTION_MIN_CASES);

  return {
    totalDispatchers: Object.keys(counts).length,
    totalActions: total,
    thinDispatchers: thin,                // genuinely thin (< 3 cases)
    thinCount: thin.length,
    digestZeroActionList: digestZero,     // what the stale digest claims
    digestParseBugs,                      // digest disagrees with .ts reality
    digestParserBroken: digestParseBugs.length > 0,
  };
}

// ---------- measurement #3: orphan engines (built but not dispatcher-wired) ----------
function measureOrphanEngines() {
  const buildState = readJsonSafe(path.join(ROOT, "state/shared/BUILD_STATE.json"), {});
  const headline = buildState.headline || {};
  const needsWiring = buildState.NEEDS_WIRING || {};
  return {
    builtEngines: headline.built_engines ?? null,
    needsWiring: headline.needs_wiring ?? null,
    wireRatePct: (headline.built_engines && headline.needs_wiring)
      ? +(headline.built_engines / (headline.built_engines + headline.needs_wiring) * 100).toFixed(1)
      : null,
    topUnwiredDomains: (needsWiring.top_domains || []).slice(0, 6),
  };
}

// ---------- measurement #4: script cadence ratio ----------
function measureScriptCadence() {
  const sDir = path.join(ROOT, "scripts");
  const files = lsSafe(sDir, f => f.endsWith(".mjs"));
  const gen = files.filter(f => /^gen(erate)?-/.test(f));
  // Cadence partners = anything that re-runs over time
  const cadencePartner = files.filter(f => /^(regen|update|refresh|rebuild)-/.test(f));
  const regenOnly = files.filter(f => /^regen-/.test(f));
  const audit = files.filter(f => /^audit-/.test(f));
  const build = files.filter(f => /^build-/.test(f));
  const cadenceMultiplier = 5; // generate-* > cadence-partner * 5 → drift alarm
  return {
    totalScripts: files.length,
    generateCount: gen.length,
    cadencePartnerCount: cadencePartner.length,
    regenOnlyCount: regenOnly.length,
    auditCount: audit.length,
    buildCount: build.length,
    cadenceRatePct: gen.length ? +(cadencePartner.length / gen.length * 100).toFixed(1) : 0,
    advisory: gen.length > cadencePartner.length * cadenceMultiplier
      ? `${gen.length} generate-* vs ${cadencePartner.length} (regen|update|refresh|rebuild)-* — drift accumulates`
      : "OK",
  };
}

// ---------- measurement #5: worktree drift ----------
function measureWorktreeDrift() {
  // Prefer the audit JSON written by scripts/audit-worktrees.mjs; fall back to graph headline.
  const auditPath = path.join(ROOT, "state/shared/WORKTREE-AUDIT-2026-05-14.json");
  const audit = readJsonSafe(auditPath, null);
  if (audit && typeof audit === "object" && audit.counts) {
    // schema uses uppercase keys: KEEP/MERGE/PRUNE/INVESTIGATE
    const c = audit.counts;
    const keep = c.KEEP || c.keep || 0;
    const merge = c.MERGE || c.merge || 0;
    const prune = c.PRUNE || c.prune || 0;
    const investigate = c.INVESTIGATE || c.investigate || 0;
    const total = keep + merge + prune + investigate;
    return {
      total,
      keep,
      merge,
      prune,
      investigate,
      driftPct: total ? +((investigate + prune) / total * 100).toFixed(1) : null,
      source: "WORKTREE-AUDIT-2026-05-14.json",
    };
  }
  // fallback: parse system-viz-query headline text
  const graphPath = path.join(ROOT, "state/shared/system-viz/system-graph.json");
  const graph = readJsonSafe(graphPath, {});
  const wt = graph?.meta?.headline?.worktrees || graph?.headline?.worktrees || {};
  const total = wt.total ?? null;
  const investigate = wt.investigate ?? null;
  const prune = wt.prune ?? null;
  return {
    total,
    keep: wt.keep ?? null,
    merge: wt.merge ?? null,
    prune,
    investigate,
    driftPct: total != null && investigate != null && prune != null
      ? +(((investigate + prune) / total) * 100).toFixed(1)
      : null,
    source: "system-graph.json (fallback)",
  };
}

// ---------- measurement #6: coordination orphan rate ----------
function measureCoordOrphans() {
  const status = readSafe(path.join(ROOT, "state/shared/AGENT_COORDINATION_STATUS.md"), "");
  const active = (status.match(/Active Instances:\s*(\d+)/) || [])[1];
  const unknownLines = (status.match(/unknown \| family/g) || []).length;
  const compactingLines = (status.match(/compacting \| family/g) || []).length;
  const completedLines = (status.match(/(complete|completed|shipped) \| family/g) || []).length;
  const total = parseInt(active, 10) || 0;
  return {
    activeInstances: total,
    unknownStateCount: unknownLines,
    compactingCount: compactingLines,
    completedCount: completedLines,
    ghostRatePct: total ? +((unknownLines / total) * 100).toFixed(1) : 0,
    advisory: total > 200
      ? `${total} active instances — coordination board accepts stale entries; ghost detection needed`
      : "OK",
  };
}

// ---------- measurement #7: spec HTML companion rate ----------
function measureSpecHtmlRate() {
  const specs = path.join(ROOT, "state/shared/specs");
  const md = lsSafe(specs, f => f.endsWith(".md"));
  const html = lsSafe(specs, f => f.endsWith(".html"));
  return {
    specMarkdownCount: md.length,
    specHtmlCount: html.length,
    htmlCompanionRatePct: md.length ? +(html.length / md.length * 100).toFixed(1) : 0,
    advisory: html.length < md.length * 0.1
      ? "Thariq HTML companion pattern under-applied (< 10%)"
      : "OK",
  };
}

// ---------- leverage ranking ----------
function rankFindings(m) {
  const findings = [
    {
      id: "F1-HOOK-ORPHANAGE",
      title: "369 orphan hooks (78.5%)",
      severity: "P0",
      leverage: m.hooks.orphanRatePct,
      verifies_via: "node scripts/high-value-additions-rank.mjs --json | jq .hooks.orphanRatePct",
      baseline: m.hooks.orphanRatePct,
      action: "Build hook-orphan-wire-proposer.mjs + ship top-25 wires",
    },
    {
      id: "F2-DISPATCHER-DIGEST-PARSER-BUG",
      title: m.dispatchers.digestParserBroken
        ? `DISPATCHER_DIGEST regen broken: ${m.dispatchers.digestParseBugs.length} dispatchers mis-counted`
        : `${m.dispatchers.thinCount} genuinely thin dispatchers`,
      severity: m.dispatchers.digestParserBroken ? "P0" : "P2",
      leverage: m.dispatchers.digestParserBroken
        ? m.dispatchers.digestParseBugs.length * 150  // 150 hidden actions per mis-counted dispatcher
        : m.dispatchers.thinCount * 5,
      verifies_via: "node scripts/high-value-additions-rank.mjs --json | jq .dispatchers",
      baseline: {
        digestParseBugs: m.dispatchers.digestParseBugs,
        thinDispatchers: m.dispatchers.thinDispatchers,
      },
      action: m.dispatchers.digestParserBroken
        ? "Fix DISPATCHER_DIGEST regen parser to recognize spread-array action enums; rebalance camDispatcher (1921 actions)"
        : "Audit thin dispatchers for migration candidates",
    },
    {
      id: "F3-ORPHAN-INFRA-ENGINES",
      title: `${m.engines.needsWiring} engines NEEDS_WIRING`,
      severity: "P0",
      leverage: m.engines.needsWiring ? Math.min(100, m.engines.needsWiring / 10) : 0,
      verifies_via: "node scripts/high-value-additions-rank.mjs --json | jq .engines.needsWiring",
      baseline: m.engines.needsWiring,
      action: "Wire HookLatency/Telemetry, TokenEconomy, OllamaEmbedder, WikiIngestRouter, AutoFixPipeline",
    },
    {
      id: "F4-SCRIPT-CADENCE-GAP",
      title: `${m.scripts.cadenceRatePct}% generate-* scripts have a regen partner`,
      severity: "P1",
      leverage: 100 - m.scripts.cadenceRatePct,
      verifies_via: "node scripts/high-value-additions-rank.mjs --json | jq .scripts.cadenceRatePct",
      baseline: m.scripts.cadenceRatePct,
      action: "Build cadence-orchestrator.mjs registering every gen with TTL+crontab",
    },
    {
      id: "F5-WORKTREE-DRIFT",
      title: `${m.worktrees.driftPct}% worktrees INVESTIGATE/PRUNE`,
      severity: "P1",
      leverage: m.worktrees.driftPct,
      verifies_via: "node scripts/system-viz-query.mjs headline",
      baseline: m.worktrees.driftPct,
      action: "Build worktree-drain orchestrator, wire to /fleet-reaper hourly",
    },
    {
      id: "F6-COORD-GHOSTS",
      title: `${m.coord.activeInstances} active instances, ${m.coord.ghostRatePct}% unknown state`,
      severity: "P1",
      leverage: m.coord.ghostRatePct,
      verifies_via: "node scripts/high-value-additions-rank.mjs --json | jq .coord",
      baseline: m.coord.ghostRatePct,
      action: "Add prism_session:fleet_health aggregate action + ghost-claim PreToolUse hook",
    },
    {
      id: "F7-HTML-COMPANION-MISSING",
      title: `${m.specs.htmlCompanionRatePct}% spec HTML companion rate (Thariq)`,
      severity: "P2",
      leverage: 100 - m.specs.htmlCompanionRatePct,
      verifies_via: "node scripts/high-value-additions-rank.mjs --json | jq .specs.htmlCompanionRatePct",
      baseline: m.specs.htmlCompanionRatePct,
      action: "Build spec-to-html.mjs cron + PostToolUse:Write hook on specs/*.md",
    },
  ];
  return findings.sort((a, b) => (b.leverage || 0) - (a.leverage || 0));
}

// ---------- main ----------
function main() {
  const args = new Set(process.argv.slice(2));
  const m = {
    generatedAt: NOW,
    hooks: measureHookOrphans(),
    dispatchers: measureZeroActionDispatchers(),
    engines: measureOrphanEngines(),
    scripts: measureScriptCadence(),
    worktrees: measureWorktreeDrift(),
    coord: measureCoordOrphans(),
    specs: measureSpecHtmlRate(),
  };
  m.findings = rankFindings(m);

  if (args.has("--json")) {
    process.stdout.write(JSON.stringify(m, null, 2));
    return;
  }

  // pretty
  const out = [];
  out.push(`# High-Value Additions — Re-runnable Leverage Ranker`);
  out.push(`Generated: ${NOW}\n`);
  out.push(`## Baselines`);
  out.push(`  Hook orphan rate:          ${m.hooks.orphanRatePct}%   (${m.hooks.orphanHooks}/${m.hooks.sourceHooks} not in settings.json)`);
  out.push(`  Dispatcher digest parser:  ${m.dispatchers.digestParserBroken ? "BROKEN" : "OK"}  (${m.dispatchers.digestParseBugs.length} mis-counted; ${m.dispatchers.thinCount} genuinely thin)`);
  if (m.dispatchers.digestParseBugs.length) {
    out.push(`    digest says 0 but reality ≥${ACTION_MIN_CASES} cases: ${m.dispatchers.digestParseBugs.join(", ")}`);
  }
  out.push(`  Engines NEEDS_WIRING:      ${m.engines.needsWiring}  (${m.engines.wireRatePct}% wired)`);
  out.push(`  Script cadence rate:       ${m.scripts.cadenceRatePct}%   (${m.scripts.cadencePartnerCount} regen|update|refresh|rebuild / ${m.scripts.generateCount} generate)`);
  out.push(`  Worktree drift:            ${m.worktrees.driftPct}%  (${m.worktrees.investigate} INVESTIGATE + ${m.worktrees.prune} PRUNE / ${m.worktrees.total})`);
  out.push(`  Coordination ghost rate:   ${m.coord.ghostRatePct}%  (${m.coord.unknownStateCount} unknown / ${m.coord.activeInstances} active)`);
  out.push(`  Spec HTML companion rate:  ${m.specs.htmlCompanionRatePct}%  (${m.specs.specHtmlCount} html / ${m.specs.specMarkdownCount} md)`);
  out.push(``);
  out.push(`## Findings (leverage-ranked)`);
  for (const f of m.findings) {
    out.push(`  [${f.severity}]  ${f.id}`);
    out.push(`         ${f.title}`);
    out.push(`         leverage=${f.leverage}  baseline=${typeof f.baseline === "object" ? JSON.stringify(f.baseline) : f.baseline}`);
    out.push(`         action: ${f.action}`);
    out.push(`         verifies_via: ${f.verifies_via}`);
    out.push(``);
  }
  process.stdout.write(out.join("\n"));
}

main();
