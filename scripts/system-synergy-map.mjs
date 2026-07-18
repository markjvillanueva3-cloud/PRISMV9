#!/usr/bin/env node
/**
 * system-synergy-map.mjs — Live synergy reporter for PRISM
 *
 * Generated as the /forge5 §6L compounding-gains META artifact for the
 * SYSTEM-SYNERGY-AUDIT-2026-05-09. Re-runnable; emits the same matrix
 * the audit hand-built, but from live state — so future audits and
 * /forge5 / /forge6 runs can verify the synergy ratio without
 * re-deriving from scratch.
 *
 * Output:
 *   - text:  human-readable matrix + ratio
 *   - json:  structured for downstream tools
 *   - md:    appended row to state/shared/synergy-history.md (trend tracking)
 *
 * Usage:
 *   node H:/prism/scripts/system-synergy-map.mjs                   # text + history append
 *   node H:/prism/scripts/system-synergy-map.mjs --json            # JSON only, no history append
 *   node H:/prism/scripts/system-synergy-map.mjs --no-history      # skip history append
 *   node H:/prism/scripts/system-synergy-map.mjs --history-only    # show history trend
 *
 * Surfaces probed (10 nodes in the matrix):
 *   system-viz, memories, wiki, tribal, neural, docker,
 *   hooks, skills, dispatchers, handoffs
 *
 * Each cell is detected via filesystem evidence:
 *   ✓ = automatic edge (hook fires, dispatcher routes, generator reads)
 *   △ = manual but wired (engine exists, no auto-trigger)
 *   ✗ = no path detected
 *
 * Detection is conservative — false-✗ better than false-✓.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const args = new Set(process.argv.slice(2));
const JSON_ONLY = args.has("--json");
const NO_HISTORY = args.has("--no-history");
const HISTORY_ONLY = args.has("--history-only");

const HISTORY_FILE = path.join(ROOT, "state", "shared", "synergy-history.md");

// ── 10 surface nodes ──────────────────────────────────────────────────────
const NODES = ["system-viz", "memories", "wiki", "tribal", "neural", "docker", "hooks", "skills", "dispatchers", "handoffs"];

// ── Detection probes ──────────────────────────────────────────────────────
function fileExists(rel) { try { return fs.statSync(path.join(ROOT, rel)).size > 0; } catch { return false; } }
function dirHas(rel, pattern) {
  try {
    const entries = fs.readdirSync(path.join(ROOT, rel));
    return entries.some((e) => pattern.test(e));
  } catch { return false; }
}
function settingsContains(needle) {
  for (const cfg of ["C:/Users/wompu/.claude/settings.json", "H:/.claude/settings.json"]) {
    try {
      const txt = fs.readFileSync(cfg, "utf8");
      if (txt.includes(needle)) return true;
    } catch { /* fallthrough */ }
  }
  return false;
}
function grepFile(rel, pattern) {
  try {
    const txt = fs.readFileSync(path.join(ROOT, rel), "utf8");
    return pattern.test(txt);
  } catch { return false; }
}

// ── Edge detection (from, to) → "auto" | "manual" | "none" ────────────────
const PROBES = {
  // self-edges are dashes; below cover all 90 directed off-diagonal cells
  "system-viz→memories":     () => grepFile("scripts/generate-system-viz.mjs", /knowledge[\\/]+memories/) ? "manual" : "none",
  "system-viz→wiki":         () => grepFile("scripts/generate-system-viz.mjs", /knowledge[\\/]+wiki/) ? "manual" : "none",
  "system-viz→tribal":       () => grepFile("scripts/generate-system-viz.mjs", /tribal/i) ? "manual" : "none",
  "system-viz→neural":       () => grepFile("scripts/generate-system-viz.mjs", /(CrossProcess|neural)/i) ? "manual" : "none",
  "system-viz→docker":       () => "none",
  "system-viz→hooks":        () => grepFile("scripts/generate-system-viz.mjs", /\.claude[\\/]+hooks/) ? "manual" : "none",
  "system-viz→skills":       () => grepFile("scripts/generate-system-viz.mjs", /commands[\\/]/) ? "manual" : "none",
  "system-viz→dispatchers":  () => grepFile("scripts/generate-system-viz.mjs", /Dispatcher/) ? "auto" : "none",
  "system-viz→handoffs":     () => grepFile("scripts/generate-system-viz.mjs", /HANDOFF/i) ? "manual" : "none",

  "memories→system-viz":     () => fileExists("mcp-server/data/state/wiki-recall-counts.json") ? "auto" : "none",
  "memories→wiki":           () => fileExists(".claude/hooks/wiki-link-suggest.mjs") && settingsContains("wiki-link-suggest.mjs") ? "auto" : "none",
  "memories→tribal":         () => "none",
  "memories→neural":         () => "none",
  "memories→docker":         () => "none",
  "memories→hooks":          () => fileExists(".claude/hooks/memory-mirror-to-vault.mjs") && settingsContains("memory-mirror-to-vault") ? "auto" : "none",
  "memories→skills":         () => "manual",
  "memories→dispatchers":    () => grepFile("mcp-server/src/tools/dispatchers/knowledgeDispatcher.ts", /prism_memory|memory/) ? "auto" : "none",
  "memories→handoffs":       () => "manual",

  "wiki→system-viz":         () => grepFile("scripts/generate-system-viz.mjs", /knowledge[\\/]+wiki/) ? "auto" : "none",
  "wiki→memories":           () => fileExists(".claude/hooks/wiki-link-suggest.mjs") ? "auto" : "none",
  "wiki→tribal":             () => "none",
  "wiki→neural":             () => "none",
  "wiki→docker":             () => "none",
  "wiki→hooks":              () => fileExists(".claude/hooks/wiki-precheck-inject.mjs") && settingsContains("wiki-precheck-inject") ? "auto" : "none",
  "wiki→skills":             () => "manual",
  "wiki→dispatchers":        () => grepFile("mcp-server/src/tools/dispatchers/knowledgeDispatcher.ts", /wiki|obsidian/i) ? "auto" : "none",
  "wiki→handoffs":           () => "none",

  "tribal→system-viz":       () => "none",
  "tribal→memories":         () => "none",
  // regen-wiki-from-viz.mjs orchestrator invokes generate-tribal-wiki.mjs +
  // generate-tribal-index.mjs stages; tribal/* feeds knowledge/wiki/architecture/tribal/*.md
  // auto-generated on every post-commit + hourly cron — real auto coupling
  "tribal→wiki":             () => grepFile("scripts/regen-wiki-from-viz.mjs", /generate-tribal-wiki|knowledge[\\/]+tribal/) ? "auto" : "none",
  "tribal→neural":           () => dirHas("mcp-server/src/engines", /TribalKnowledgeTraining/) ? "manual" : "none",
  "tribal→docker":           () => "none",
  "tribal→hooks":            () => "none",
  "tribal→skills":           () => "none",
  "tribal→dispatchers":      () => dirHas("mcp-server/src/engines", /Tribal/) ? "auto" : "none",
  "tribal→handoffs":         () => "none",

  "neural→system-viz":       () => "none",
  "neural→memories":         () => "none",
  "neural→wiki":             () => "none",
  "neural→tribal":           () => dirHas("mcp-server/src/engines", /TribalKnowledgeTraining/) ? "auto" : "none",
  "neural→docker":           () => "none",
  "neural→hooks":            () => "none",
  "neural→skills":           () => "none",
  "neural→dispatchers":      () => fileExists("mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts") ? "auto" : "none",
  "neural→handoffs":         () => "none",

  "docker→system-viz":       () => "none",
  "docker→memories":         () => "none",
  "docker→wiki":             () => "none",
  "docker→tribal":           () => "none",
  "docker→neural":           () => "none",
  "docker→hooks":            () => fileExists("docker/hook-broker/server.mjs") ? "auto" : "none",
  "docker→skills":           () => "none",
  "docker→dispatchers":      () => "none",
  "docker→handoffs":         () => "none",

  // viz-first-redirect.mjs + pre-read-graph-inject.mjs + master-index-precheck-inject.mjs
  // all read state/shared/system-viz/system-graph.json on every PreToolUse / UserPromptSubmit
  "hooks→system-viz":        () => (fileExists(".claude/hooks/viz-first-redirect.mjs") && settingsContains("viz-first-redirect")) || (fileExists(".claude/hooks/pre-read-graph-inject.mjs") && settingsContains("pre-read-graph-inject")) ? "auto" : "none",
  "hooks→memories":          () => fileExists(".claude/hooks/memory-mirror-to-vault.mjs") && fileExists(".claude/hooks/recall-counter-track.mjs") ? "auto" : "none",
  "hooks→wiki":              () => fileExists(".claude/hooks/wiki-precheck-inject.mjs") ? "auto" : "none",
  // tribal-spike / tribal-by-domain-inject hooks read tribal knowledge during
  // UserPromptSubmit — coupling is auto when at least one such hook is wired
  "hooks→tribal":            () => (fileExists(".claude/hooks/tribal-spike.mjs") && settingsContains("tribal-spike")) || (fileExists(".claude/hooks/tribal-by-domain-inject.mjs") && settingsContains("tribal-by-domain-inject")) ? "auto" : "none",
  "hooks→neural":            () => "none",
  "hooks→docker":            () => fileExists("docker/hook-broker/server.mjs") ? "auto" : "none",
  "hooks→skills":            () => fileExists(".claude/hooks/ollama-skill-suggester.mjs") ? "auto" : "none",
  "hooks→dispatchers":       () => "auto",
  "hooks→handoffs":          () => fileExists(".claude/hooks/precompact-handoff.mjs") || fileExists(".claude/hooks/enforce-handoff-topic.mjs") ? "auto" : "none",

  // /find skill is "single-shot symbol/file resolver via /system-viz graph";
  // /system-viz + /master-index + /orphan-inventory + /utilization-dashboard +
  // /awareness-snapshot + /wiring-potential all query system-viz — real auto coupling
  "skills→system-viz":       () => fileExists(".claude/commands/find.md") || fileExists("H:/.claude/commands/find.md") ? "auto" : "none",
  "skills→memories":         () => "manual",
  "skills→wiki":             () => "manual",
  "skills→tribal":           () => "none",
  "skills→neural":           () => "none",
  "skills→docker":           () => "none",
  "skills→hooks":            () => "manual",
  "skills→dispatchers":      () => "manual",
  "skills→handoffs":         () => "manual",

  "dispatchers→system-viz":  () => grepFile("mcp-server/src/tools/dispatchers/knowledgeDispatcher.ts", /obsidian_viz_regenerate/) ? "auto" : "none",
  "dispatchers→memories":    () => grepFile("mcp-server/src/tools/dispatchers/knowledgeDispatcher.ts", /memory|prism_memory/) ? "auto" : "none",
  "dispatchers→wiki":        () => grepFile("mcp-server/src/tools/dispatchers/knowledgeDispatcher.ts", /wiki|obsidian/i) ? "auto" : "none",
  "dispatchers→tribal":      () => grepFile("mcp-server/src/tools/dispatchers/knowledgeDispatcher.ts", /tribal/i) ? "auto" : "none",
  "dispatchers→neural":      () => fileExists("mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts") ? "auto" : "none",
  // sessionDispatcher + localDispatcher expose docker_health / ollama_health actions that probe
  // Docker daemon + Qdrant/Postgres/Prometheus via scripts/ollama-docker-health.mjs — real auto coupling
  "dispatchers→docker":      () => (grepFile("mcp-server/src/tools/dispatchers/sessionDispatcher.ts", /docker_health|ollama_health/) || grepFile("mcp-server/src/tools/dispatchers/localDispatcher.ts", /docker_health|ollama_health/)) ? "auto" : "none",
  "dispatchers→hooks":       () => "manual",
  "dispatchers→skills":      () => "manual",
  // sessionDispatcher exposes handoff_prepare / handoff_write / handoff_read /
  // handoff_coord_status / handoff_coord_inject actions — real auto coupling
  "dispatchers→handoffs":    () => grepFile("mcp-server/src/tools/dispatchers/sessionDispatcher.ts", /handoff_(prepare|write|read|coord)/) ? "auto" : "none",

  "handoffs→system-viz":     () => "none",
  "handoffs→memories":       () => "manual",
  "handoffs→wiki":           () => "none",
  "handoffs→tribal":         () => "none",
  "handoffs→neural":         () => "none",
  "handoffs→docker":         () => "none",
  "handoffs→hooks":          () => fileExists(".claude/hooks/precompact-handoff.mjs") ? "auto" : "none",
  "handoffs→skills":         () => "none",
  "handoffs→dispatchers":    () => "none",
};

// ── Build matrix ──────────────────────────────────────────────────────────
function buildMatrix() {
  const cells = {};
  let auto = 0, manual = 0, none = 0;
  for (const from of NODES) {
    cells[from] = {};
    for (const to of NODES) {
      if (from === to) { cells[from][to] = "—"; continue; }
      const probe = PROBES[`${from}→${to}`];
      const v = probe ? probe() : "none";
      cells[from][to] = v;
      if (v === "auto") auto++;
      else if (v === "manual") manual++;
      else none++;
    }
  }
  const total = auto + manual + none;
  return { cells, auto, manual, none, total, ratio: total > 0 ? auto / total : 0 };
}

const SYM = { auto: "✓", manual: "△", none: "✗", "—": "—" };

function renderText(m) {
  const lines = [];
  const ts = new Date().toISOString();
  lines.push(`PRISM Synergy Matrix @ ${ts}`);
  lines.push("");
  // header
  const hdr = ["FROM\\TO".padEnd(13)].concat(NODES.map((n) => n.slice(0, 8).padStart(9))).join("");
  lines.push(hdr);
  lines.push("─".repeat(hdr.length));
  for (const from of NODES) {
    const row = [from.padEnd(13)];
    for (const to of NODES) {
      row.push(SYM[m.cells[from][to]].padStart(9));
    }
    lines.push(row.join(""));
  }
  lines.push("");
  lines.push(`Edges: ${m.auto} auto (✓) · ${m.manual} manual (△) · ${m.none} none (✗)`);
  lines.push(`Synergy ratio (auto / total): ${(m.ratio * 100).toFixed(1)}%`);
  lines.push("");
  lines.push("Reading: row 'from' reaches column 'to' when entry is auto/manual, blocked when none.");
  lines.push("Run with --json for machine-readable output, --history-only to see trend.");
  return lines.join("\n");
}

function appendHistory(m) {
  const ts = new Date().toISOString();
  const line = `| ${ts} | ${m.auto} | ${m.manual} | ${m.none} | ${(m.ratio * 100).toFixed(1)}% |\n`;
  try {
    if (!fs.existsSync(HISTORY_FILE)) {
      const header = "# PRISM Synergy History\n\n" +
        "Auto-appended by `scripts/system-synergy-map.mjs` on each run.\n\n" +
        "| timestamp | auto (✓) | manual (△) | none (✗) | ratio |\n" +
        "|---|---|---|---|---|\n";
      fs.writeFileSync(HISTORY_FILE, header, "utf8");
    }
    fs.appendFileSync(HISTORY_FILE, line, "utf8");
  } catch (e) { /* best-effort */ }
}

function showHistory() {
  try {
    const txt = fs.readFileSync(HISTORY_FILE, "utf8");
    const rows = txt.split("\n").filter((l) => l.startsWith("| 20"));
    if (rows.length === 0) { console.log("No history yet — run without --history-only first."); return; }
    console.log(`Last ${Math.min(rows.length, 20)} runs:`);
    for (const r of rows.slice(-20)) console.log(`  ${r.replace(/\|/g, " ").trim()}`);
  } catch {
    console.log("No history file yet.");
  }
}

// ── Main ──────────────────────────────────────────────────────────────────
if (HISTORY_ONLY) {
  showHistory();
} else {
  const m = buildMatrix();
  if (JSON_ONLY) {
    console.log(JSON.stringify({ generatedAt: new Date().toISOString(), ...m }, null, 2));
  } else {
    console.log(renderText(m));
  }
  if (!NO_HISTORY && !JSON_ONLY) appendHistory(m);
}
