#!/usr/bin/env node
// SIERRA-VAULT-OPS/U-VAULT-CONTRADICT-MEMORY -- memory-vault contradiction lint (slot:sierra, 2026-06-17).
//
// Extends the proven wiki NLI contradiction-linter (lint-wiki-contradictions.mjs,
// OLLAMA-SYNERGY/U-WIKI-NLI-LINT) to the MEMORY vault -- the assessment's named #2
// 2nd-brain gap ("no dedicated contradiction-detector" for memories). REUSES that
// tool's engine wholesale (tokenizeForTopic / selectClaim / candidatePairs /
// buildNliPrompt / parseNliVerdict / runNliLint / resolveNliModel) -- the ONLY new
// code is a memory-corpus loader, so the NLI judgment + candidate-pairing + fail-
// soft circuit-breaker logic stay single-sourced and can't drift from the wiki tool.
//
// Sibling of the supersession detector (vault-supersession-detector.mjs): THAT
// catches TEMPORAL staleness (a dated memo with a newer dated sibling); THIS catches
// LOGICAL conflict (two UNDATED doctrine memos asserting opposite facts -- e.g. an
// unmarked `feedback_X_owns_reaper` vs `feedback_Z_owns_reaper`).
//
// Scope: the CURATED doctrine namespaces (feedback/, patterns/) -- NOT the ~19.9K
// node-pointer stubs + dated session/ship snapshots (those cannot meaningfully
// contradict and would blow the per-pair LLM budget). EXCLUDES already-[SUPERSEDED]
// memos (the resolved side of a known conflict -- reuses isSupersededMemory) and
// node-pointer stubs (reuses isNodePointerStub).
//
// Advisory + fail-soft (R12): Ollama down/model-missing -> pairs recorded `unchecked`
// and the report says so; never throws, never edits/deletes a memo. Writes
// state/shared/memory-contradictions.json.
//
// CLI (the report at state/shared/memory-contradictions.json is written by DEFAULT):
//   node scripts/lint-memory-contradictions.mjs            # lint feedback+patterns
//   node scripts/lint-memory-contradictions.mjs --limit 80 # cap candidate pairs (also --limit=80)
//   node scripts/lint-memory-contradictions.mjs --section  # print each CONTRADICT pair
//   node scripts/lint-memory-contradictions.mjs --include-reference  # also scan reference/ (noisy)
//   node scripts/lint-memory-contradictions.mjs --no-write # console only, do not persist the report
//   node scripts/lint-memory-contradictions.mjs --confirm 2 # re-sample each CONTRADICT to a 2-of-3 majority
//                                                           # (default 2; 0 disables; env PRISM_NLI_CONFIRM_SAMPLES)
//   node scripts/lint-memory-contradictions.mjs --budget-ms 75000 # interactive refresh: cap wall-clock + write a
//                                                           # PARTIAL honest report (default 0=unbounded cron run;
//                                                           # env PRISM_NLI_BUDGET_MS). A full run is ~18min and is
//                                                           # harness-killed at ~100s with NO write -- use ~75-80s.

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, realpathSync } from "node:fs";
import { resolve, dirname, join, basename, relative } from "node:path";
import { fileURLToPath } from "node:url";
import {
  tokenizeForTopic, selectClaim, candidatePairs, runNliLint, resolveNliModel, DEFAULT_LIMIT,
} from "./lint-wiki-contradictions.mjs";
import { isSupersededMemory, isNodePointerStub } from "./lib/memory-index-search-lib.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PRISM_ROOT = resolve(__dirname, "..");
const MEM_DIR = resolve(PRISM_ROOT, "knowledge/memories");
const OUT_PATH = resolve(PRISM_ROOT, "state/shared/memory-contradictions.json");

// Doctrine namespaces where a contradiction is meaningful (vs node-pointers / snapshots).
export const DOCTRINE_SUBDIRS = ["feedback", "patterns"];

// Parse a MEMORY .md into the page shape runNliLint consumes. Memory frontmatter is
// name:/description:/metadata: (NOT the wiki's title:/tags:) -- this is the only piece
// that differs from the wiki loader, which is why it lives here, not in the engine.
export function parseMemoryPage(content, rel) {
  let name = "", description = "", galaxy = "";
  let body = content;
  // CRLF-tolerant: ~15% of the auto-synced memory vault carries CRLF frontmatter; a
  // \n-only boundary regex would fail to match the closing --- and silently lose
  // name/description/galaxy (shrinking topic tokens -> missed candidate pairs = the
  // exact false-negative this lint exists to catch).
  const fm = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (fm) {
    body = content.slice(fm[0].length);
    for (const line of fm[1].split(/\r?\n/)) {
      const mn = line.match(/^name:\s*(.+)$/);
      const md = line.match(/^(?:description|summary):\s*(.+)$/);
      const mgx = line.match(/^\s*galaxy:\s*(.+)$/);
      if (mn) name = mn[1].trim().replace(/^["']|["']$/g, "");
      if (md) description = md[1].trim().replace(/^["']|["']$/g, "");
      if (mgx) galaxy = mgx[1].trim().replace(/^["']|["']$/g, "");
    }
  }
  const headingM = body.match(/^#{1,3}\s+(.+)$/m);
  const firstHeading = headingM ? headingM[1].trim() : "";
  const title = name || firstHeading || basename(String(rel), ".md");
  return { rel, base: basename(String(rel), ".md"), title, description, galaxy, firstHeading, body };
}

function walkMd(dir, { readdirImpl = readdirSync } = {}) {
  const out = [];
  (function rec(d) {
    let entries;
    try { entries = readdirImpl(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = join(d, e.name);
      if (e.isDirectory()) {
        // memory-vault-specific: skip archived/quarantined memos (the wiki sibling's
        // walkMd has no archive subtree, so this skip is intentional, not a copy-drift).
        if (/^(_archive|archive|quarantine|\.)/i.test(e.name)) continue;
        rec(full);
      } else if (e.isFile() && e.name.endsWith(".md") && !e.name.startsWith("_")) {
        out.push(full);
      }
    }
  })(dir);
  return out;
}

// Load curated doctrine memos as NLI pages, EXCLUDING already-superseded memos (the
// resolved side of a known conflict) and thin node-pointer stubs. Reuses the wiki
// engine's tokenizeForTopic + selectClaim so candidate-pairing is identical.
export function loadMemoryPages({
  memoryRoot = MEM_DIR,
  subdirs = DOCTRINE_SUBDIRS,
  readFileImpl = readFileSync,
  readdirImpl = readdirSync,
} = {}) {
  const pages = [];
  let excludedSuperseded = 0, excludedPointer = 0;
  for (const sub of subdirs) {
    const d = resolve(memoryRoot, sub);
    for (const f of walkMd(d, { readdirImpl })) {
      let content;
      try { content = readFileImpl(f, "utf8"); } catch { continue; }
      if (isSupersededMemory(content)) { excludedSuperseded++; continue; }
      const rel = relative(memoryRoot, f).replace(/\\/g, "/");
      if (isNodePointerStub(basename(rel))) { excludedPointer++; continue; }
      const page = parseMemoryPage(content, rel);
      page.tokens = tokenizeForTopic({ title: page.title, tags: page.galaxy ? [page.galaxy] : [], firstHeading: page.firstHeading });
      page.claim = selectClaim(page);
      if (page.tokens.size && page.claim) pages.push(page);
    }
  }
  pages.excludedSuperseded = excludedSuperseded;
  pages.excludedPointer = excludedPointer;
  return pages;
}

// Accept BOTH `--limit 6` and `--limit=6` -- identical to the wiki sibling's getOpt
// so the CLI contract matches across the pair (R11).
function getOpt(name, dflt) {
  for (const a of process.argv.slice(2)) {
    const m = a.match(new RegExp(`^${name}=(.*)$`));
    if (m) return m[1];
  }
  const idx = process.argv.indexOf(name);
  return idx >= 0 && process.argv[idx + 1] && !process.argv[idx + 1].startsWith("--") ? process.argv[idx + 1] : dflt;
}

// Resolve the confirm-resample count from a raw CLI/env string. Default 2 (=> 2-of-3
// strict majority). UNSET (undefined/null) or an EMPTY/whitespace string -> default
// (an explicitly-empty `PRISM_NLI_CONFIRM_SAMPLES=` means "I didn't set it", NOT
// "disable" -- Number("")===0 would silently disable, a footgun). Only an explicit
// "0" disables. A non-finite or negative value falls back to the default; a float
// floors. Exported so the adversarial-input guard is unit-tested (not just the engine).
export function resolveConfirmSamples(raw, dflt = 2) {
  if (raw == null || (typeof raw === "string" && raw.trim() === "")) return dflt;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : dflt;
}

// Resolve the wall-clock budget (ms) from a raw CLI/env string. Default 0 = UNBOUNDED
// (the cron path -- a full ~18min run is fine for a scheduled task). Set a budget only
// for INTERACTIVE/manual refresh, where the harness kills a Bash call at ~100s before
// the end-of-run report write (so use e.g. 75000-80000 to finish + write before the kill).
// UNSET/empty/garbage/negative -> default; a float floors. Exported for unit-testing.
export function resolveBudgetMs(raw, dflt = 0) {
  if (raw == null || (typeof raw === "string" && raw.trim() === "")) return dflt;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : dflt;
}

async function main() {
  const args = new Set(process.argv.slice(2));
  // Advisory periodic linter: ALWAYS persist the report so the downstream consumer
  // reading the JSON is never silently stale (a prior --write-only gate left
  // --limit/--section/--include-reference runs un-persisted). Opt out with --no-write.
  const write = !args.has("--no-write");
  const section = args.has("--section");
  const limit = Number(getOpt("--limit", DEFAULT_LIMIT)) || DEFAULT_LIMIT;
  const subdirs = args.has("--include-reference") ? [...DOCTRINE_SUBDIRS, "reference"] : DOCTRINE_SUBDIRS;
  const modelOverride = getOpt("--model", null);
  // Stochastic-verdict stabilization: re-sample each CONTRADICT this many EXTRA times
  // and record only on a strict majority (kills gpt-oss:20b single-sample false
  // positives -- see runNliLint's STOCHASTIC-VERDICT note). Default 2 => 2-of-3.
  const confirmSamples = resolveConfirmSamples(getOpt("--confirm", process.env.PRISM_NLI_CONFIRM_SAMPLES));
  // Wall-clock budget for INTERACTIVE refresh (default 0 = unbounded cron run). See
  // resolveBudgetMs / runNliLint's WALL-CLOCK BUDGET note.
  const budgetMs = resolveBudgetMs(getOpt("--budget-ms", process.env.PRISM_NLI_BUDGET_MS));

  if (!existsSync(MEM_DIR)) { console.error("memory dir missing"); process.exit(2); }
  const t0 = Date.now();
  const pages = loadMemoryPages({ subdirs });
  // Full candidate-pair count (pre-limit) so the report can express COVERAGE honestly
  // -- contradictions:0 over 6/1074 pairs must not read like a clean full scan (R12).
  const pairsTotal = candidatePairs(pages, { limit: Infinity }).length;
  const resolved = await resolveNliModel({ envModel: modelOverride || process.env.PRISM_WIKI_NLI_MODEL });
  if (!resolved.model) {
    const report = { schemaVersion: 1, corpus: "memory", model: null, generatedAt: new Date().toISOString(), totals: { pages: pages.length, excludedSuperseded: pages.excludedSuperseded, excludedPointer: pages.excludedPointer, pairsTotal, pairsConsidered: 0, pairsChecked: 0, unchecked: 0, contradictions: 0, coverage: 0 }, contradictions: [], note: resolved.reason || "no NLI model available" };
    if (write) { mkdirSync(dirname(OUT_PATH), { recursive: true }); writeFileSync(OUT_PATH, JSON.stringify(report, null, 2), "utf8"); }
    console.log(`memory-nli: ${pages.length} doctrine memos - NLI SKIPPED (${report.note}) - ${Date.now() - t0}ms`);
    return;
  }
  const report = await runNliLint(pages, { model: resolved.model, limit, confirmSamples, budgetMs });
  report.corpus = "memory";
  report.totals.excludedSuperseded = pages.excludedSuperseded;
  report.totals.excludedPointer = pages.excludedPointer;
  report.totals.pairsTotal = pairsTotal;
  report.totals.coverage = pairsTotal ? Number((report.totals.pairsConsidered / pairsTotal).toFixed(3)) : 1;
  report.generatedAt = new Date().toISOString();
  report.elapsedMs = Date.now() - t0;
  if (resolved.fellBack) report.modelFellBack = true;
  if (write) {
    mkdirSync(dirname(OUT_PATH), { recursive: true });
    writeFileSync(OUT_PATH, JSON.stringify(report, null, 2), "utf8");
    console.log(`wrote ${OUT_PATH}`);
  }
  const T = report.totals;
  const confirmNote = confirmSamples > 0 ? ` (confirm ${confirmSamples}x -> ${T.confirmCalls ?? 0} re-samples, ${confirmSamples + 1}-vote majority)` : "";
  const budgetNote = report.budgetExceeded ? ` [BUDGET ${budgetMs}ms HIT -- PARTIAL: ${T.notAttempted} pair(s) not attempted]` : "";
  console.log(`memory-nli: ${T.pages} doctrine memos (excl ${T.excludedSuperseded} superseded + ${T.excludedPointer} pointer) - ${T.pairsConsidered}/${T.pairsTotal} candidate pairs (coverage ${T.coverage}) - ${T.pairsChecked} checked (${T.unchecked} unchecked) - ${T.contradictions} contradiction(s)${confirmNote}${budgetNote} - model ${report.model} - ${report.elapsedMs}ms`);
  if (section) for (const c of report.contradictions) console.log(`  CONTRADICT  ${c.a}  <>  ${c.b}\n    ${c.reason}`);
}

const isMain = (() => {
  try { return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1] || ""); }
  catch { return false; }
})();
if (isMain) main().catch((e) => { console.error("memory-nli fatal:", e?.message || e); process.exit(1); });
