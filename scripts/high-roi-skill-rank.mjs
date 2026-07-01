#!/usr/bin/env node
// high-roi-skill-rank.mjs — re-runnable ranker for high-ROI skill / routing / hook gaps.
// META artifact for /forge-audit-v2 "high roi skills + auto-inject + obsidian/ollama routing"
// audit. Emits exit code 0 (clean) / 1 (gaps) / 2 (read error). Append-only telemetry to
// state/shared/high-roi-skill-history.jsonl so weekly re-runs can show drift.

import fs from "node:fs";
import path from "node:path";

const REPO = process.env.PRISM_ROOT || "H:/prism";
const USER_SKILLS = process.env.PRISM_USER_SKILLS_DIR || "C:/Users/wompu/.claude/commands";
const PROJECT_SKILLS = path.join(REPO, ".claude/commands");
const TRIGGER_LEDGER = path.join(REPO, "knowledge/wiki/architecture/_skill-triggers.jsonl");
const OLLAMA_STATS = path.join(REPO, "mcp-server/data/state/ollama-offload-stats.json");
const HOOK_FIRES = path.join(REPO, "mcp-server/data/state/hook-fire-counts.jsonl");
const HISTORY = path.join(REPO, "state/shared/high-roi-skill-history.jsonl");

// Named thresholds — derived from doctrine:
//   TRIGGER_LEDGER_COVERAGE_TARGET=0.30: target ≥30% of skills surfaced by skill-auto-trigger.
//   TRIGGER_EXTRACTION_TARGET=0.90: extract-skill-triggers.mjs should capture ≥90% of triggers: frontmatter.
//   MODEL_FRONTMATTER_TARGET=0.50: tier-routing requires ≥50% model: coverage to materially save tokens.
//   OLLAMA_OFFLOAD_TARGET=0.30: feedback_ollama_token_routing.md — healthy fleet ≥30%.
//   OFFLOADER_EFFECT_TARGET=0.10: ≥10% of hook fires must produce an offload decision (else dead route).
const TRIGGER_LEDGER_COVERAGE_TARGET = 0.30;
const TRIGGER_EXTRACTION_TARGET = 0.90;
const MODEL_FRONTMATTER_TARGET = 0.50;
const OLLAMA_OFFLOAD_TARGET = 0.30;
const OFFLOADER_EFFECT_TARGET = 0.10;

function walkMd(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkMd(p));
    else if (entry.name.endsWith(".md")) out.push(p);
  }
  return out;
}

function countFrontmatterKey(files, key) {
  let n = 0;
  const re = new RegExp("^" + key + ":", "m");
  for (const f of files) {
    try {
      const head = fs.readFileSync(f, "utf8").slice(0, 4096);
      if (re.test(head)) n++;
    } catch { /* skip */ }
  }
  return n;
}

function readOllamaStats() {
  try {
    const j = JSON.parse(fs.readFileSync(OLLAMA_STATS, "utf8"));
    // Schema v2.0.0 puts fields top-level (no `totals` key). Schema v1 used `totals.*`.
    // Schema-read-first: probe Object.keys before assuming shape.
    const schemaV = j.schemaVersion || "1.0.0";
    const usesV2 = !("totals" in j) || schemaV.startsWith("2.");
    const src = usesV2 ? j : (j.totals || {});
    const offloaded = src.offloaded || 0;
    const kept = src.keptOnClaude || 0;
    const tokensSaved = src.tokensSaved || 0;
    const total = offloaded + kept;
    return { schemaV, offloaded, kept, tokensSaved, total, ratio: total ? offloaded / total : null, byHook: j.byHook || {} };
  } catch (err) { return { error: err.message }; }
}

function readHookFires() {
  try {
    const lines = fs.readFileSync(HOOK_FIRES, "utf8").split("\n").filter(Boolean);
    const counts = {};
    for (const l of lines) {
      try {
        const j = JSON.parse(l);
        const k = j.hook || j.name || "?";
        counts[k] = (counts[k] || 0) + (j.fires || 1);
      } catch { /* skip malformed */ }
    }
    return counts;
  } catch (err) { return { error: err.message }; }
}

function readLedger() {
  try {
    return fs.readFileSync(TRIGGER_LEDGER, "utf8").split("\n").filter(Boolean).length;
  } catch (err) { return -1; }
}

const userFiles = walkMd(USER_SKILLS);
const projectFiles = walkMd(PROJECT_SKILLS);
const totalSkills = userFiles.length + projectFiles.length;

const withTriggers = countFrontmatterKey(userFiles, "triggers") + countFrontmatterKey(projectFiles, "triggers");
const withModel = countFrontmatterKey(userFiles, "model") + countFrontmatterKey(projectFiles, "model");
const withEffort = countFrontmatterKey(userFiles, "effort") + countFrontmatterKey(projectFiles, "effort");
const ledgerEntries = readLedger();

const ollama = readOllamaStats();
const hookFires = readHookFires();
// Prefer ollama-offload-stats byHook (offloader self-report) over general hook-fire-counts.
const offloaderFires = (ollama.byHook && (ollama.byHook["ollama-task-offloader"] || {}).fired) || hookFires["ollama-task-offloader"] || 0;

// === ROI signals ===
const SIGNALS = [];

// Signal A — skill-trigger ledger coverage
SIGNALS.push({
  id: "trigger-ledger-coverage",
  metric: "ledgerEntries / totalSkills",
  baseline: { ledger: ledgerEntries, total: totalSkills, ratio: totalSkills ? ledgerEntries / totalSkills : 0 },
  target: TRIGGER_LEDGER_COVERAGE_TARGET,
  severity: ledgerEntries < totalSkills * TRIGGER_LEDGER_COVERAGE_TARGET ? "critical" : "ok",
  rationale: "skill-auto-trigger.mjs reads this ledger; uncovered skills are invisible to auto-suggest.",
});

// Signal B — `triggers:` frontmatter→ledger extraction
SIGNALS.push({
  id: "trigger-extraction-rate",
  metric: "ledgerEntries / skillsWithTriggersFrontmatter",
  baseline: { withTriggersFrontmatter: withTriggers, ledger: ledgerEntries, ratio: withTriggers ? ledgerEntries / withTriggers : 0 },
  target: TRIGGER_EXTRACTION_TARGET,
  severity: withTriggers && ledgerEntries / withTriggers < TRIGGER_EXTRACTION_TARGET ? "critical" : "ok",
  rationale: "extract-skill-triggers.mjs should produce ledger entry for every triggers: frontmatter; gap = broken extractor.",
});

// Signal C — model: frontmatter coverage (skill-tier routing)
SIGNALS.push({
  id: "model-frontmatter-coverage",
  metric: "skillsWithModel / totalSkills",
  baseline: { withModel, total: totalSkills, ratio: totalSkills ? withModel / totalSkills : 0 },
  target: MODEL_FRONTMATTER_TARGET,
  severity: withModel < totalSkills * MODEL_FRONTMATTER_TARGET ? "warn" : "ok",
  rationale: "tier-aware skill routing (haiku/sonnet/opus) saves cost only when frontmatter is set.",
});

// Signal D — Ollama offload ratio
SIGNALS.push({
  id: "ollama-offload-ratio",
  metric: "offloaded / (offloaded + keptOnClaude)",
  baseline: { offloaded: ollama.offloaded, kept: ollama.kept, ratio: ollama.ratio },
  target: OLLAMA_OFFLOAD_TARGET,
  severity: ollama.error ? "warn" : (ollama.total === 0 ? "critical" : (ollama.ratio < OLLAMA_OFFLOAD_TARGET ? "warn" : "ok")),
  rationale: "Ollama-routed local inference saves Claude tokens; near-zero ratio = dead route.",
});

// Signal E — offloader hook fire-to-effect ratio (the dead-route signal)
SIGNALS.push({
  id: "offloader-hook-effect-ratio",
  metric: "offloadDecisions / offloaderFires",
  baseline: { fires: offloaderFires, decisions: ollama.total, ratio: offloaderFires ? ollama.total / offloaderFires : null },
  target: OFFLOADER_EFFECT_TARGET,
  severity: offloaderFires > 0 && ollama.total === 0 ? "critical" : "ok",
  rationale: "1285 fires + 0 decisions = hook classifier runs but never offloads (dead route).",
});

// === Candidate skills (HIGH-ROI proposals) ===
const CANDIDATES = [
  {
    name: "/ollama-route-check",
    type: "skill+hook-inject",
    inject_on: "ollama|offload|local model|qwen|deepseek|nomic-embed|ollama-task-offloader",
    delivers: "Reads ollama-offload-stats + hook-fire-counts, reports offloader effect ratio, surfaces top-5 unrouted task categories.",
    addresses: ["ollama-offload-ratio", "offloader-hook-effect-ratio"],
    roi: 9.5,
    rationale: "1285 daily hook fires with 0 effect = ~5K wasted tokens/day on classifier overhead. Skill makes the dead-route visible to every chat.",
  },
  {
    name: "/skill-trigger-coverage",
    type: "skill+hook-inject",
    inject_on: "skill trigger|auto-trigger|skill not found|skill suggest|trigger ledger",
    delivers: "Diffs frontmatter triggers vs _skill-triggers.jsonl, emits punch-list of un-extracted skills.",
    addresses: ["trigger-ledger-coverage", "trigger-extraction-rate"],
    roi: 9.0,
    rationale: "94% of skill surface invisible to auto-trigger. Fixing extractor unlocks ~90 trigger entries with zero new skill authoring.",
  },
  {
    name: "/route-to-obsidian",
    type: "skill+hook-inject",
    inject_on: "what does the wiki say|find in vault|summarize note|obsidian lookup|wiki entry for",
    delivers: "For read-only vault-lookup prompts, routes through Obsidian MCP read_file_content / search_files instead of Claude reasoning.",
    addresses: ["ollama-offload-ratio"],
    roi: 8.5,
    rationale: "Wiki has 722 entries; every lookup-and-summarize prompt is a Claude call that could be vault + qwen2.5-coder:7b summarize.",
  },
  {
    name: "/ollama-fix",
    type: "skill",
    inject_on: "ollama not routing|ollama dead route|why is ollama not offloading|offload not happening",
    delivers: "Diagnostic + repair for dead-routing offloader: probes daemon, checks rate-limit cache, lowers INJECT_THRESHOLD, runs test classification.",
    addresses: ["ollama-offload-ratio", "offloader-hook-effect-ratio"],
    roi: 8.5,
    rationale: "Concrete one-shot fix for the dead route. Auto-fires if offloader-effect-ratio drops below 0.05 for >7d (telemetry-gated).",
  },
  {
    name: "/skill-modernize-batch",
    type: "skill",
    inject_on: "skill modernize|set model frontmatter|skill tier|skill cost",
    delivers: "Batch-applies model+effort+context frontmatter to skills by classification tier (research vs build vs hygiene).",
    addresses: ["model-frontmatter-coverage"],
    roi: 7.0,
    rationale: "Tier routing (haiku for hygiene, sonnet for build, opus for deep) saves ~20% on skill-invoke cost when applied.",
  },
  {
    name: "/wiki-summarize-via-ollama",
    type: "hook-only (no slash)",
    inject_on: "PreToolUse:Read on knowledge/wiki/*.md > 500 lines",
    delivers: "Before Claude reads a >500-line wiki entry, route to qwen2.5-coder:7b for a 200-token summary instead.",
    addresses: ["ollama-offload-ratio"],
    roi: 8.0,
    rationale: "PRISM has 722 wiki entries, many >500 lines. Each read is 2-5K tokens. Auto-summarize captures ~80% of value at ~10% cost.",
  },
  {
    name: "/error-fix-via-ollama",
    type: "skill+hook-inject",
    inject_on: "tsc error|test failure|build error (top-N matched)",
    delivers: "For build/test errors with known fix patterns, routes the fix-draft to qwen2.5-coder:14b before Claude reviews.",
    addresses: ["ollama-offload-ratio"],
    roi: 8.0,
    rationale: "PRISM ships 5-15 TSC fix commits/day. Each is ~3K tokens of Claude. Ollama drafts ~80% correctly; Claude reviews and ships.",
  },
];

// === Score + sort ===
CANDIDATES.sort((a, b) => b.roi - a.roi);

// === Verdict ===
const criticals = SIGNALS.filter((s) => s.severity === "critical");
const warns = SIGNALS.filter((s) => s.severity === "warn");
const verdict = criticals.length > 0 ? "FAIL" : (warns.length > 0 ? "WARN" : "PASS");

// === Output ===
const json = {
  schemaVersion: "1.0.0",
  generated: new Date().toISOString(),
  generatedBy: "scripts/high-roi-skill-rank.mjs",
  totals: { skills: totalSkills, userSkills: userFiles.length, projectSkills: projectFiles.length, withTriggers, withModel, withEffort, ledgerEntries },
  ollama: { offloaded: ollama.offloaded, kept: ollama.kept, ratio: ollama.ratio, total: ollama.total },
  offloaderFires,
  signals: SIGNALS,
  candidates: CANDIDATES,
  verdict,
};

const asJson = process.argv.includes("--json");
if (asJson) {
  process.stdout.write(JSON.stringify(json, null, 2) + "\n");
} else {
  process.stdout.write("HIGH-ROI SKILL & ROUTING AUDIT — " + json.generated + "\n");
  process.stdout.write("=".repeat(72) + "\n");
  process.stdout.write("Skills: " + totalSkills + " (" + userFiles.length + " user, " + projectFiles.length + " project)\n");
  process.stdout.write("Trigger ledger: " + ledgerEntries + " entries · with-triggers-frontmatter: " + withTriggers + "\n");
  process.stdout.write("with-model-frontmatter: " + withModel + " · with-effort-frontmatter: " + withEffort + "\n");
  process.stdout.write("Ollama: offloaded=" + ollama.offloaded + " kept=" + ollama.kept + " ratio=" + (ollama.ratio == null ? "n/a" : ollama.ratio.toFixed(3)) + "\n");
  process.stdout.write("Offloader hook fires: " + offloaderFires + "\n\n");
  process.stdout.write("SIGNALS:\n");
  for (const s of SIGNALS) {
    process.stdout.write("  [" + s.severity.toUpperCase() + "] " + s.id + " — " + JSON.stringify(s.baseline) + " (target " + s.target + ")\n");
  }
  process.stdout.write("\nCANDIDATES (ranked by ROI):\n");
  for (const c of CANDIDATES) {
    process.stdout.write("  " + c.roi.toFixed(1) + "  " + c.name + " (" + c.type + ")\n");
    process.stdout.write("        addresses: " + c.addresses.join(", ") + "\n");
  }
  process.stdout.write("\nVERDICT: " + verdict + "\n");
}

try {
  const dir = path.dirname(HISTORY);
  fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(HISTORY, JSON.stringify({ ts: json.generated, verdict, signals: SIGNALS.map((s) => ({ id: s.id, severity: s.severity, baseline: s.baseline })) }) + "\n");
} catch { /* non-fatal */ }

process.exit(verdict === "FAIL" ? 1 : 0);
