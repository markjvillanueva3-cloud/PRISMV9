#!/usr/bin/env node
/**
 * audit-galaxy-soul-claude-quality.mjs -- grade every galaxy's SOUL.md + CLAUDE.md
 * quality on the LOCAL Blackwell GPU via ollama-fanout (AI-SYNERGY-AUDIT-MS0, slot:charlie).
 *
 * WHY LOCAL, NOT CLAUDE AGENTS (the lesson that birthed this):
 *   A 34-Claude-subagent Workflow fan-out burst past Anthropic's org-wide RPM/TPM throttle
 *   ("Server is temporarily limiting requests") and STARVED a sibling operator session -- the
 *   exact failure scripts/lib/ollama-fanout.mjs was built to ELIMINATE. The org rate limit is a
 *   hard ceiling SHARED across every session on the account; more concurrent Claude agents make
 *   sibling-starvation worse, not better. Mechanical judgment at scale (grade/classify/summarize,
 *   R5 "not safety-critical") belongs on the local 96GB GPU: zero Anthropic rate limit, $0 cost,
 *   reserve the scarce Claude quota for final human-facing synthesis only.
 *
 * This grades each galaxy's domain-specialist identity (SOUL.md) + Bibryam-cascade sentinel
 * (CLAUDE.md) and writes a ranked fleet report. Reusable: re-run any time the doctrine changes.
 *
 * Usage:
 *   node scripts/audit-galaxy-soul-claude-quality.mjs                 # all galaxies, default model
 *   node scripts/audit-galaxy-soul-claude-quality.mjs --model qwen2.5-coder:32b --concurrency 5
 *   node scripts/audit-galaxy-soul-claude-quality.mjs --limit 4       # smoke (first 4 galaxies)
 *
 * Knobs: PRISM_FANOUT_MODEL, PRISM_FANOUT_CONCURRENCY (see ollama-fanout.mjs).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ollamaFanoutWithFallback, DEFAULT_FANOUT_MODEL } from "./lib/ollama-fanout.mjs";
import { extractJsonObject } from "./lib/extract-json-object.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ENG = path.join(ROOT, "mcp-server/src/engines");
const OUT_JSON = path.join(ROOT, "state/shared/specs/GALAXY-SOUL-CLAUDE-QUALITY.json");
const OUT_MD = path.join(ROOT, "state/shared/specs/GALAXY-SOUL-CLAUDE-QUALITY.md");
const SOUL_CAP = 4000; // souls are ~1-1.5KB; full read
const CLAUDE_CAP = 7000; // CLAUDE.md sentinels are 6-20KB; lead prefix carries the doctrine shape

/** Galaxy dirs = engine subdirs with a CLAUDE.md, excluding the stray `.claude`. */
export function enumerateGalaxies() {
  const out = [];
  for (const e of fs.readdirSync(ENG, { withFileTypes: true })) {
    if (!e.isDirectory() || e.name.startsWith(".")) continue;
    if (fs.existsSync(path.join(ENG, e.name, "CLAUDE.md"))) out.push(e.name);
  }
  return out.sort();
}

function readCapped(p, cap) {
  try {
    return fs.readFileSync(p, "utf8").slice(0, cap);
  } catch {
    return "";
  }
}

/** Build the per-galaxy grading prompt (deterministic; PURE for testing). */
export function buildGradePrompt(galaxy, soulText, claudeText) {
  return `You are a strict doctrine-quality auditor for a manufacturing-intelligence platform (PRISM). Grade ONE galaxy's two doctrine files. A galaxy is a domain (mill/lathe/wedm=machining, quoting=pricing, cad=geometry, business=ERP, system-viz=the system graph, speed-feed=cutting physics, etc.).

SOUL.md should be a DOMAIN-SPECIALIST IDENTITY: a specific persona with domain-grounded "refuses" (things it must never do), a domain filter, and a substantive body tied to THIS galaxy's real domain -- NOT generic boilerplate with only the name swapped.
CLAUDE.md should be a Bibryam-cascade GALAXY SENTINEL: real domain doctrine (engine/dispatcher pointers, domain rules, gotchas, safety rails) that auto-loads when an engineer edits this subdir -- NOT a copy of the root playbook.

GALAXY: ${galaxy}

=== SOUL.md ===
${soulText || "(missing)"}

=== CLAUDE.md (lead prefix) ===
${claudeText || "(missing)"}

Grade rigorously and HONESTLY (do not inflate). Respond with ONLY a single JSON object, no prose, no markdown fence:
{"galaxy":"${galaxy}","soulGrade":<0..1>,"claudeGrade":<0..1>,"isStubSoul":<bool>,"isStubClaude":<bool>,"coherent":<bool>,"soulVerdict":"<=120 chars","claudeVerdict":"<=120 chars","topIssues":["specific issue", "..."]}`;
}

/** Parse a model grade response into a clamped grade record (fail-soft). PURE. */
export function parseGrade(text, galaxy) {
  if (typeof text !== "string" || !text.trim()) return { galaxy, parseError: "empty", soulGrade: null, claudeGrade: null };
  const obj = extractJsonObject(text); // shared balanced-JSON extractor (fence/prose/brace safe)
  if (!obj) {
    // distinguish "no object at all" from "object present but unparseable" for the report
    const pe = text.replace(/```[a-z]*\n?/gi, "").indexOf("{") < 0 ? "no-json" : text.includes("}") ? "json" : "unterminated";
    return { galaxy, parseError: pe, soulGrade: null, claudeGrade: null };
  }
  // clamp numerics defensively. Guard the Number(null)===0 / Number("")===0 gotcha: a missing
  // or null grade must stay null (NOT collapse to 0, which would fake a "worst" grade).
  const num = (v) => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : null;
  };
  return {
    galaxy: obj.galaxy || galaxy,
    soulGrade: num(obj.soulGrade),
    claudeGrade: num(obj.claudeGrade),
    isStubSoul: !!obj.isStubSoul,
    isStubClaude: !!obj.isStubClaude,
    coherent: obj.coherent !== false,
    soulVerdict: String(obj.soulVerdict || "").slice(0, 160),
    claudeVerdict: String(obj.claudeVerdict || "").slice(0, 160),
    topIssues: Array.isArray(obj.topIssues) ? obj.topIssues.map((x) => String(x).slice(0, 160)).slice(0, 5) : [],
  };
}

function mean(xs) {
  const v = xs.filter((x) => Number.isFinite(x));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

function renderReport(grades, meta) {
  const ok = grades.filter((g) => Number.isFinite(g.soulGrade) || Number.isFinite(g.claudeGrade));
  const ms = mean(ok.map((g) => g.soulGrade));
  const mc = mean(ok.map((g) => g.claudeGrade));
  const stubSoul = ok.filter((g) => g.isStubSoul || (g.soulGrade !== null && g.soulGrade < 0.5));
  const stubClaude = ok.filter((g) => g.isStubClaude || (g.claudeGrade !== null && g.claudeGrade < 0.5));
  const incoherent = ok.filter((g) => g.coherent === false);
  const bySoul = [...ok].sort((a, b) => (a.soulGrade ?? 1) - (b.soulGrade ?? 1));
  const byClaude = [...ok].sort((a, b) => (a.claudeGrade ?? 1) - (b.claudeGrade ?? 1));
  const L = [];
  L.push("# Galaxy SOUL.md + CLAUDE.md Quality Audit");
  L.push("");
  L.push(`> Graded on the LOCAL Blackwell GPU via ollama-fanout (model \`${meta.model}\`, concurrency ${meta.concurrency}, peak ${meta.peakConcurrency}). ZERO Claude API -- no org rate-limit, no sibling-session starvation. ${meta.okCount}/${meta.total} graded.`);
  L.push("");
  if (meta.fallback && meta.fallback.needed) {
    L.push(`> **OLLAMA-FALLBACK -> SONNET:** ${meta.fallback.failedCount}/${meta.fallback.total} grade tasks could not run locally (${meta.fallback.reason}). Re-run them on bounded Sonnet agents (\`agent(prompt,{model:'sonnet'})\`, <=4 concurrent) -- NOT Opus. ${meta.fallback.directive}`);
    L.push("");
  }
  L.push(`**Fleet mean:** soulGrade ${ms == null ? "n/a" : ms.toFixed(3)} | claudeGrade ${mc == null ? "n/a" : mc.toFixed(3)} | stub souls ${stubSoul.length} | stub CLAUDE.md ${stubClaude.length} | incoherent ${incoherent.length} | parse-failed ${grades.length - ok.length}`);
  L.push("");
  L.push("## Worst souls (bottom 10 by soulGrade)");
  L.push("| galaxy | soul | claude | verdict |");
  L.push("|---|---|---|---|");
  for (const g of bySoul.slice(0, 10)) L.push(`| ${g.galaxy} | ${g.soulGrade ?? "?"} | ${g.claudeGrade ?? "?"} | ${(g.soulVerdict || "").replace(/\|/g, "/")} |`);
  L.push("");
  L.push("## Worst CLAUDE.md (bottom 10 by claudeGrade)");
  L.push("| galaxy | claude | soul | verdict |");
  L.push("|---|---|---|---|");
  for (const g of byClaude.slice(0, 10)) L.push(`| ${g.galaxy} | ${g.claudeGrade ?? "?"} | ${g.soulGrade ?? "?"} | ${(g.claudeVerdict || "").replace(/\|/g, "/")} |`);
  L.push("");
  L.push("## All grades (alphabetical)");
  L.push("| galaxy | soul | claude | stubSoul | stubClaude | top issue |");
  L.push("|---|---|---|---|---|---|");
  for (const g of [...ok].sort((a, b) => a.galaxy.localeCompare(b.galaxy))) {
    L.push(`| ${g.galaxy} | ${g.soulGrade ?? "?"} | ${g.claudeGrade ?? "?"} | ${g.isStubSoul ? "Y" : ""} | ${g.isStubClaude ? "Y" : ""} | ${((g.topIssues || [])[0] || "").replace(/\|/g, "/")} |`);
  }
  if (grades.length - ok.length) {
    L.push("");
    L.push("## Parse-failed (re-run to grade)");
    for (const g of grades.filter((x) => !Number.isFinite(x.soulGrade) && !Number.isFinite(x.claudeGrade))) L.push(`- ${g.galaxy}: ${g.parseError || "unknown"}`);
  }
  return L.join("\n") + "\n";
}

export async function runAudit(opts = {}) {
  const model = opts.model || process.env.PRISM_FANOUT_MODEL || DEFAULT_FANOUT_MODEL;
  const concurrency = Number(opts.concurrency) || Number(process.env.PRISM_FANOUT_CONCURRENCY) || 3;
  let galaxies = enumerateGalaxies();
  if (opts.limit) galaxies = galaxies.slice(0, opts.limit);

  const tasks = galaxies.map((g) => ({
    id: g,
    prompt: buildGradePrompt(g, readCapped(path.join(ENG, g, "SOUL.md"), SOUL_CAP), readCapped(path.join(ENG, g, "CLAUDE.md"), CLAUDE_CAP)),
  }));

  process.stdout.write(`Grading ${tasks.length} galaxies on LOCAL ${model} (concurrency ${concurrency}) -- 0 Claude API...\n`);
  let done = 0;
  const fan = await ollamaFanoutWithFallback(tasks, {
    model,
    concurrency,
    timeoutMs: 300000,
    fallbackReason: "galaxy SOUL/CLAUDE.md grading -- local Ollama unreachable",
    onResult: (r) => {
      done++;
      process.stdout.write(`  [${done}/${tasks.length}] ${r.id} ${r.ok ? "ok" : "FAIL:" + (r.error || "").slice(0, 50)}\n`);
    },
  });

  const grades = fan.results.map((r) => (r && r.ok ? parseGrade(r.text, r.id) : { galaxy: r ? r.id : "?", parseError: r ? r.error : "null", soulGrade: null, claudeGrade: null }));
  // fallback: when Ollama is DOWN/REAPED this batch yields okCount:0 -- instead of a useless
  // "0/N graded" report, surface the operator's Sonnet-fallback directive (re-run the failed
  // grade tasks on bounded Sonnet agents, never Opus). See ollama-fanout.ollamaFanoutWithFallback.
  const meta = { model, concurrency, peakConcurrency: fan.peakConcurrency, total: fan.total, okCount: fan.okCount, fallback: fan.fallback || { needed: false }, generatedAt: new Date().toISOString() };

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify({ meta, grades }, null, 2));
  fs.writeFileSync(OUT_MD, renderReport(grades, meta));
  return { meta, grades, mdPath: OUT_MD, jsonPath: OUT_JSON };
}

async function main() {
  const argv = process.argv.slice(2);
  const get = (flag) => { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : undefined; };
  const r = await runAudit({
    model: get("--model"),
    concurrency: get("--concurrency"),
    limit: get("--limit") ? Number(get("--limit")) : 0,
  });
  const ok = r.grades.filter((g) => Number.isFinite(g.soulGrade));
  const ms = mean(ok.map((g) => g.soulGrade));
  const mc = mean(ok.map((g) => g.claudeGrade));
  process.stdout.write(`\nDONE -> ${path.relative(ROOT, r.mdPath)}\n  fleet mean: soul ${ms == null ? "n/a" : ms.toFixed(3)} | claude ${mc == null ? "n/a" : mc.toFixed(3)} | graded ${ok.length}/${r.grades.length}\n`);
  if (r.meta.fallback && r.meta.fallback.needed) {
    process.stderr.write(`\n[ollama-fallback] ${r.meta.fallback.failedCount}/${r.meta.fallback.total} grade tasks need the SONNET lane (Ollama unreachable). ${r.meta.fallback.directive}\n`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    process.stderr.write(`audit-galaxy-soul-claude-quality failed: ${e && e.message}\n`);
    process.exit(1);
  });
}
