#!/usr/bin/env node
/**
 * checkin-recall.mjs — local-compute recall + Ollama distill for the /checkin pipeline.
 *
 * WHY THIS EXISTS
 * The /checkin pipeline's Steps 8-11 + High-ROI table NAMED many capability
 * surfaces but never INVOKED them ("named-not-invoked" regression class,
 * CLAUDE.md). The user directive (2026-05-16) is: auto-invoke every named
 * surface, BUT keep the token cost bounded by routing through Obsidian (local
 * file indexes — zero Claude tokens) and Ollama (local 7b — offloads the
 * summarize/distill that Claude would otherwise pay for).
 *
 * This helper is the single composition point those auto-invoke steps call.
 * Claude only ever reads the ≤3 compact distilled lines this prints — the
 * search + summarize happen in local compute.
 *
 * COMPOSES (does not reinvent — R8/dedup):
 *   - scripts/lib/master-index-search-lib.mjs  → runMasterIndexSearch / runTribalSearch
 *   - knowledge/wiki/index.md                  → local BM25 wiki recall
 *   - <memory dir>/*.md                        → local memory-vault grep
 *   - .claude/commands/*.md                    → local skill match
 *   - http://localhost:11434/api/generate      → Ollama local distill (optional)
 *
 * SUBCOMMANDS
 *   recall   --source <master-index|tribal|memory|wiki|skill> --query "<q>"
 *            [--limit N] [--ollama-distill] [--model <name>]
 *   roi-gate --args "<$ARGUMENTS>" --topic "<$TOPIC>"
 *
 * INVARIANTS
 *   - Never throws (top-level guard → prints "(recall: <reason>)" + exits 0).
 *   - Never blocks /checkin — degraded inputs = empty section, exit 0.
 *   - Bounded output (≤ limit lines, ≤120 chars/line) so §Report can't explode.
 *   - Ollama call is bounded (PRISM_CHECKIN_RECALL_OLLAMA_TIMEOUT_MS, default
 *     6000) and fail-soft → raw hits on any Ollama failure.
 */

import { readFileSync, readdirSync, existsSync, statSync, writeFileSync, unlinkSync } from "node:fs";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";

const PRISM_ROOT = "H:/prism";
const MEMORY_DIR = "C:/Users/wompu/.claude/projects/h--prism/memory";
const WIKI_INDEX = path.join(PRISM_ROOT, "knowledge/wiki/index.md");
const COMMANDS_DIR = path.join(PRISM_ROOT, ".claude/commands");
const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.PRISM_CHECKIN_RECALL_MODEL || "qwen2.5-coder:7b";
const OLLAMA_TIMEOUT_MS = Number(process.env.PRISM_CHECKIN_RECALL_OLLAMA_TIMEOUT_MS) || 6000;
const GRAPH_QUERY_TIMEOUT_MS = Number(process.env.PRISM_CHECKIN_RECALL_GRAPH_TIMEOUT_MS) || 15000;
const MAX_LINE = 120;

function parseArgs(argv) {
  const a = {};
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i];
    if (k.startsWith("--")) {
      const key = k.slice(2);
      const nx = argv[i + 1];
      if (nx && !nx.startsWith("--")) { a[key] = nx; i++; } else { a[key] = true; }
    } else if (!a._cmd) {
      a._cmd = k;
    }
  }
  return a;
}

function clip(s, n = MAX_LINE) {
  s = String(s == null ? "" : s).replace(/\s+/g, " ").trim();
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

// ── local recall backends (all zero-Claude-token) ───────────────────────────

// system-graph.json is ~324MB — over master-index-search-lib's 200MB cap, so
// runMasterIndexSearch() returns []. The purpose-built scripts/system-viz-
// query.mjs streams the big graph and is checkin.md Step 9's own canonical
// command. Shell out with process.execPath (NOT bare "node" — portable-node
// ENOENT class, fixed this session in precompact-handoff.mjs:419).
// system-viz-query `find` is a whole-query SUBSTRING match (params.join(" ")).
// A multi-word natural query ("kienzle force model verification") matches no
// node label and returns 0 hits, while the precise phrase / a topic slug DOES
// match. Strategy: try the full query first (precise for slug-like topics);
// only on zero hits, retry with the single most-distinctive token. ≤2 spawns.
const GENERIC_TOKENS = new Set([
  "model", "force", "system", "engine", "check", "verification", "verify",
  "data", "file", "code", "test", "the", "and", "for", "with", "from",
  "this", "that", "node", "build", "fix", "wire", "task", "unit", "work",
]);

function vizFind(script, queryStr, limit) {
  const r = spawnSync(process.execPath, [script, "find", queryStr], {
    encoding: "utf8", timeout: GRAPH_QUERY_TIMEOUT_MS, windowsHide: true,
  });
  if (r.error || r.status !== 0) return [];
  return String(r.stdout || "").split(/\r?\n/)
    .filter((l) => /^\s+\S/.test(l) && !/^Found \d/.test(l.trim()))
    .slice(0, limit)
    .map((l) => clip(l.trim()));
}

function recallGraph(query, limit) {
  try {
    const script = path.join(PRISM_ROOT, "scripts/system-viz-query.mjs");
    if (!existsSync(script)) return [];
    let hits = vizFind(script, query, limit);
    if (hits.length) return hits;
    // Zero hits → retry with the most distinctive single token. Split on ALL
    // non-alphanumerics (NOT tokenize() — its regex keeps `-`/`_`, so a
    // hyphenated topic slug like "bravo-blueprint-ocr-training-ms1" would
    // stay one 32-char unsplittable token and miss the graph again).
    const toks = String(query).toLowerCase().split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 4 && !GENERIC_TOKENS.has(t) && !/^ms\d+$/.test(t));
    if (!toks.length) return [];
    toks.sort((a, b) => b.length - a.length);
    return vizFind(script, toks[0], limit);
  } catch { return []; }
}

function recallTribal(query, limit) {
  try {
    const lib = path.join(PRISM_ROOT, "scripts/lib/master-index-search-lib.mjs");
    return import(`file:///${lib.replace(/\\/g, "/")}`).then((m) => {
      const r = m.runTribalSearch(query, { topK: limit });
      return (r.hits || []).slice(0, limit).map((h) =>
        clip(`${h.title || h.id || "?"} — ${h.text || h.snippet || ""}`));
    }).catch(() => []);
  } catch { return Promise.resolve([]); }
}

// Unicode-aware: \p{L}\p{N} so an accented query word ("café résumé") is one
// token, not the fragments "caf"/"sum" an ASCII-only [a-z0-9] class produces —
// fragment tokens silently search for garbage and look like a clean "no hits".
function tokenize(q) {
  return String(q || "").toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}_-]+/gu) || [];
}

// Generic local BM25-lite: score lines/files by query-token hit count.
function recallFileLines(file, query, limit) {
  if (!existsSync(file)) return [];
  let txt;
  try { txt = readFileSync(file, "utf8"); } catch { return []; }
  const toks = tokenize(query);
  if (toks.length < 2) return [];
  const scored = [];
  for (const line of txt.split(/\r?\n/)) {
    const lc = line.toLowerCase();
    let s = 0;
    for (const t of toks) if (lc.includes(t)) s++;
    if (s >= 2) scored.push({ s, line });
  }
  scored.sort((a, b) => b.s - a.s);
  return scored.slice(0, limit).map((x) => clip(x.line.replace(/^[#\-*\s]+/, "")));
}

function recallMemory(query, limit) {
  if (!existsSync(MEMORY_DIR)) return [];
  const toks = tokenize(query);
  if (toks.length < 2) return [];
  let files;
  try { files = readdirSync(MEMORY_DIR).filter((f) => f.endsWith(".md") && f !== "MEMORY.md"); }
  catch { return []; }
  const scored = [];
  for (const f of files) {
    let head;
    try { head = readFileSync(path.join(MEMORY_DIR, f), "utf8").slice(0, 1200).toLowerCase(); }
    catch { continue; }
    let s = 0;
    for (const t of toks) if (head.includes(t)) s++;
    if (s >= 2) scored.push({ s, f });
  }
  scored.sort((a, b) => b.s - a.s);
  return scored.slice(0, limit).map((x) => clip(`${x.f} (match ${x.s})`));
}

function recallSkill(query, limit) {
  if (!existsSync(COMMANDS_DIR)) return [];
  const toks = tokenize(query);
  if (toks.length < 2) return [];
  let files;
  try { files = readdirSync(COMMANDS_DIR).filter((f) => f.endsWith(".md")); }
  catch { return []; }
  const scored = [];
  for (const f of files) {
    let head;
    try { head = readFileSync(path.join(COMMANDS_DIR, f), "utf8").slice(0, 600).toLowerCase(); }
    catch { continue; }
    let s = 0;
    for (const t of toks) if (head.includes(t)) s++;
    if (s >= 2) scored.push({ s, f: f.replace(/\.md$/, "") });
  }
  scored.sort((a, b) => b.s - a.s);
  return scored.slice(0, limit).map((x) => clip(`/${x.f}`));
}

// ── Ollama local distill (offloads summarize from Claude) ────────────────────

// Ollama distill — MUST use a curl subprocess, NOT node fetch/http. On this
// Windows setup node fetch to localhost:11434 fails ("fetch failed"); curl
// works. This is the documented OLLAMA-PIPELINE-MS0 pattern (ollama-docker-
// health.mjs uses the same). A fetch-based path here would silently fall back
// to raw on EVERY call → the user's "use Ollama for token cost" directive
// would be silently unmet (named-not-invoked class). Body goes via a temp
// file (`curl -d @file`) so arbitrary recall text can't break argv quoting.
function ollamaDistill(rawLines, query) {
  if (!rawLines.length) return rawLines;
  const prompt =
    `Given these raw recall hits for the query "${clip(query, 80)}", output AT MOST 3 ` +
    `single-line bullets (no preamble), each <=90 chars, keeping only what is ` +
    `decision-relevant for a developer about to start this work:\n` +
    rawLines.slice(0, 12).map((l) => `- ${l}`).join("\n");
  const bodyFile = path.join(os.tmpdir(), `prism-checkin-distill-${process.pid}-${Date.now()}.json`);
  try {
    writeFileSync(bodyFile, JSON.stringify({
      model: OLLAMA_MODEL, prompt, stream: false,
      options: { temperature: 0.1, num_predict: 220 },
    }), "utf8");
    const r = spawnSync("curl", [
      "-s", "-m", String(Math.ceil(OLLAMA_TIMEOUT_MS / 1000)),
      `${OLLAMA_URL}/api/generate`, "-H", "Content-Type: application/json",
      "-d", `@${bodyFile}`,
    ], { encoding: "utf8", timeout: OLLAMA_TIMEOUT_MS + 2000, windowsHide: true });
    if (r.error || r.status !== 0 || !r.stdout) return rawLines;
    let resp;
    try { resp = JSON.parse(r.stdout).response; } catch { return rawLines; }
    const out = String(resp || "").split(/\r?\n/)
      .map((l) => l.replace(/^[\s\-*•\d.]+/, "").trim())
      .filter(Boolean).slice(0, 3).map((l) => clip(l, 90));
    return out.length ? out : rawLines;
  } catch {
    return rawLines; // Ollama down / timeout → raw hits (still zero Claude tokens)
  } finally {
    try { unlinkSync(bodyFile); } catch { /* best-effort temp cleanup */ }
  }
}

// ── deterministic High-ROI auto-match gate (category-3) ──────────────────────
// Encodes the checkin.md "High-ROI features" table trigger keywords. Scans
// $ARGUMENTS+$TOPIC and prints exactly which conditional surfaces MUST fire.
const ROI_RULES = [
  ["ATCS (prism_atcs:task_init)", ["multi-session", "resume", "long-running", "atcs"]],
  ["/forge-audit-v2", ["audit", "quality scan", "codebase quality", "forge-audit"]],
  ["/close-out-audit", ["close out", "close-out", "envelope drift", "shipped but pending", "stale milestone"]],
  ["/run-continuous", ["run-continuous", "continuous", "all units", "roadmap pass"]],
  ["/pick-build-close", ["pick-build-close", "pick build close"]],
  ["/verify-loop", ["verify-loop", "verification loop", "verify loop"]],
  ["/sparc", ["sparc", "structured problem"]],
  ["prism_sp:cognitive_*", ["reinforcement", "bayes", "bayesian", "ilp", "kv-cache", "attention anchor"]],
  ["Tier-6 octopus-neural", ["consensus", "multi-provider", "octopus", "cross-vendor"]],
  ["prism_guard:agi_containment_evaluate", ["agi", "containment", "agi-tier"]],
  ["prism_omega:compute / auto_score", ["omega", "quality score", "s(x)", "ω("]],
  ["prism_safety:*", ["collision", "coolant", "spindle", "workholding", "cutting", "feed", "speed", "physics", "kienzle", "taylor", "g-code", "gcode", "toolpath"]],
  ["/awareness-snapshot", ["awareness", "fresh session", "system digest"]],
  ["/orphan-inventory", ["orphan", "unwired", "wiring milestone", "wire engine"]],
  ["/utilization-dashboard", ["utilization", "hubs", "sinks", "ghosts", "node classification"]],
  ["/deep-search", ["deep search", "deep-search", "low confidence"]],
  ["prism_telemetry:get_dashboard", ["slow", "latency", "telemetry", "perf"]],
  ["prism_hook:hook_efficiency_roi", ["hook cost", "hook efficiency", "hook roi"]],
  ["prism_memory:semantic_search", ["solved before", "did this before", "memory recall", "prior solution"]],
  ["prism_intake:webhook_ingest", ["webhook", "rss", "x post", "intake", "ingest external"]],
];

// Word-boundary match, NOT raw substring: substring `includes` makes "feed"
// hit "feedback", "speed" hit "speedy", "ilp" hit "philip" — falsely flagging
// prism_safety:* / cognitive surfaces as MUST-invoke on unrelated dev tasks.
// Keywords may contain regex metachars (s(x), ω() and internal spaces — both
// are escaped + handled. Boundary = non-alphanumeric or string edge.
function kwMatch(hay, kw) {
  const esc = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${esc}([^a-z0-9]|$)`, "i").test(hay);
}

function roiGate(args, topic) {
  const hay = `${args || ""} ${topic || ""}`.toLowerCase();
  const must = [];
  for (const [surface, kws] of ROI_RULES) {
    if (kws.some((k) => kwMatch(hay, k))) must.push(surface);
  }
  return must;
}

// ── main ────────────────────────────────────────────────────────────────────

async function main() {
  const a = parseArgs(process.argv);
  const cmd = a._cmd;

  if (cmd === "roi-gate") {
    const must = roiGate(a.args || "", a.topic || "");
    if (!must.length) { console.log("(roi-gate: no conditional surface triggered by args/topic)"); return; }
    console.log(must.map((m) => `  • MUST invoke: ${m}`).join("\n"));
    return;
  }

  if (cmd === "recall") {
    const source = a.source || "master-index";
    const query = (a.query || "").toString();
    const limit = Math.max(1, Math.min(5, Number(a.limit) || 3));
    if (tokenize(query).length < 2) { console.log(`(recall ${source}: query too thin — skipped)`); return; }

    let raw = [];
    if (source === "master-index") raw = await recallGraph(query, limit);
    else if (source === "tribal") raw = await recallTribal(query, limit);
    else if (source === "memory") raw = recallMemory(query, limit);
    else if (source === "wiki") raw = recallFileLines(WIKI_INDEX, query, limit);
    else if (source === "skill") raw = recallSkill(query, limit);
    else { console.log(`(recall: unknown source "${source}")`); return; }

    if (!raw.length) { console.log(`(recall ${source}: no hits for "${clip(query, 60)}")`); return; }

    const lines = a["ollama-distill"] ? ollamaDistill(raw, query) : raw.slice(0, limit);
    console.log(lines.map((l) => `  • ${l}`).join("\n"));
    return;
  }

  console.log("(checkin-recall: usage — recall --source <s> --query <q> [--ollama-distill] | roi-gate --args <a> --topic <t>)");
}

const __isCli = (() => {
  const argv1 = (process.argv[1] || "").replace(/\\/g, "/");
  return argv1.endsWith("checkin-recall.mjs");
})();
if (__isCli) {
  main().catch((e) => { console.log(`(checkin-recall: ${(e && e.message) || "error"})`); process.exit(0); });
}

export { roiGate, recallMemory, recallSkill, recallFileLines, ollamaDistill, tokenize, clip };
