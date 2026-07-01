#!/usr/bin/env node
/**
 * lint-wiki-contradictions.mjs  (OLLAMA-SYNERGY / U-WIKI-NLI-LINT)
 *
 * Advisory pairwise natural-language-inference (NLI) lint over CURATED wiki
 * entries: finds page PAIRS whose core claims CONTRADICT each other, using a
 * local Ollama model (gpt-oss:20b by default) for the NLI judgment. Nothing
 * else in PRISM catches "lesson A says X, lesson B says not-X" drift.
 *
 * Why this shape (see state/shared/specs/OLLAMA-SYNERGY-AUDIT-2026-06-09.md #4):
 *   - CORPUS SCOPE: knowledge/wiki/ has ~39K files, almost all auto-generated
 *     field-dumps that cannot meaningfully contradict. We scope to the CURATED
 *     human-authored subdirs (concepts/decisions/lessons/patterns/
 *     software-engineering/ux-design/trajectories/entities); architecture/** and
 *     code-tribal/** are excluded (generated / tribal-tips handled elsewhere).
 *     --include-arch opts the generated bulk back in.
 *   - CANDIDATES, NOT ALL-PAIRS: an inverted index (topic-token -> page idxs)
 *     yields only pairs that share >=2 significant topic tokens, capped by
 *     --limit. Too-common token buckets are skipped. This bounds the LLM calls.
 *   - FAIL-SOFT (R12): Ollama down / model missing / a per-pair call error never
 *     throws -- the pair is recorded `unchecked` and the report says so honestly.
 *   - ADVISORY: writes state/shared/wiki-contradictions.json. v1 writes NO wiki
 *     body (no churn) and does NOT touch the dormant prism_wiki dispatcher.
 *
 * Pure functions (tokenizeForTopic / candidatePairs / selectClaim /
 * buildNliPrompt / parseNliVerdict / runNliLint) are exported for hermetic tests
 * (callOllama is injectable -> no GPU/network in unit tests).
 *
 * CLI: node scripts/lint-wiki-contradictions.mjs [--write] [--limit N]
 *        [--model M] [--include-arch] [--section]
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, realpathSync } from "node:fs";
import { resolve, dirname, join, basename, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { callOllama } from "./ask-ollama.mjs";
import { fetchInstalledModels } from "./lib/host-aware-synthesis-model.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PRISM_ROOT = resolve(__dirname, "..");
const WIKI_DIR = resolve(PRISM_ROOT, "knowledge/wiki");
const OUT_PATH = resolve(PRISM_ROOT, "state/shared/wiki-contradictions.json");

/** Curated, human-authored subdirs where a contradiction is meaningful. */
export const CURATED_SUBDIRS = [
  "concepts",
  "decisions",
  "lessons",
  "patterns",
  "software-engineering",
  "ux-design",
  "trajectories",
  "entities",
];

/** Default local NLI model + per-pair budget. gpt-oss:20b is a harmony reasoning
 *  model -> needs a generous num_predict or it emits an empty `.response`
 *  (the harmony empty-output failure mode; see U-WEEKLY-SYNTH-NUMPREDICT). */
export const DEFAULT_NLI_MODEL = "gpt-oss:20b";
export const NLI_MODEL_PREFERENCE = ["gpt-oss:20b", "qwen2.5-coder:32b", "gpt-oss:120b"];
export const NLI_NUM_PREDICT = 1024;
export const NLI_TIMEOUT_MS = 90_000; // cold-load headroom; under GPU contention calls still time out -> circuit breaker below
export const MIN_CALL_TIMEOUT_MS = 20_000; // floor for the budget-shrunk per-call timeout: don't starve a legit slow call when the wall-clock budget nears its end (bounds budget overshoot to ~this)
export const MAX_CONSECUTIVE_FAILURES = 5; // abort the whole run if Ollama is systemically unavailable (don't grind every pair at the full timeout for hours)
export const DEFAULT_LIMIT = 150;
export const MIN_SHARED_TOKENS = 2;
export const MAX_BUCKET = 60; // skip topic tokens shared by > this many pages (too generic)
export const CLAIM_MAX_CHARS = 600;
export const MIN_TOKEN_LEN = 4; // drop tokens shorter than this from topic sets

const STOPWORDS = new Set([
  "the", "and", "for", "with", "from", "that", "this", "into", "via", "per", "not",
  "are", "was", "were", "has", "have", "had", "but", "its", "you", "your",
  "all", "any", "can", "use", "used", "uses", "when", "then", "than", "what", "who",
  "how", "why", "new", "old", "off", "out", "now", "fix", "fixed", "wiki",
  "prism", "claude", "memory", "note", "notes", "reference", "feedback",
]);

/** Lowercase, split, drop stopwords + short tokens -> Set of topic tokens. */
export function tokenizeForTopic({ title = "", tags = [], firstHeading = "" } = {}) {
  const raw = `${title} ${(Array.isArray(tags) ? tags.join(" ") : tags)} ${firstHeading}`.toLowerCase();
  const out = new Set();
  for (const tok of raw.split(/[^a-z0-9]+/)) {
    if (tok.length >= MIN_TOKEN_LEN && !STOPWORDS.has(tok)) out.add(tok);
  }
  return out;
}

/** Parse a wiki .md into the fields the lint needs. Pure (takes content). */
export function parsePage(content, rel) {
  let title = "";
  let description = "";
  const tags = [];
  let body = content;
  const fm = content.match(/^---\n([\s\S]*?)\n---\n?/);
  if (fm) {
    body = content.slice(fm[0].length);
    for (const line of fm[1].split("\n")) {
      const mt = line.match(/^title:\s*(.+)$/);
      const md = line.match(/^(?:description|summary):\s*(.+)$/);
      const mg = line.match(/^tags:\s*\[(.+)\]$/);
      if (mt) title = mt[1].trim().replace(/^["']|["']$/g, "");
      if (md) description = md[1].trim().replace(/^["']|["']$/g, "");
      if (mg) for (const t of mg[1].split(",")) tags.push(t.trim().replace(/^["']|["']$/g, ""));
    }
  }
  const headingM = body.match(/^#{1,3}\s+(.+)$/m);
  const firstHeading = headingM ? headingM[1].trim() : "";
  if (!title) title = firstHeading || basename(rel, ".md");
  return { rel, base: basename(rel, ".md"), title, description, tags, firstHeading, body };
}

/** The core claim text we hand the NLI model: frontmatter description if present,
 *  else the first non-heading, non-blockquote paragraph; trimmed. */
export function selectClaim(page, maxChars = CLAIM_MAX_CHARS) {
  let claim = (page.description || "").trim();
  if (!claim) {
    for (const para of (page.body || "").split(/\n\s*\n/)) {
      const p = para.trim();
      if (!p) continue;
      if (p.startsWith("#") || p.startsWith(">") || p.startsWith("---") || p.startsWith("|")) continue;
      claim = p.replace(/\s+/g, " ");
      break;
    }
  }
  if (claim.length > maxChars) claim = claim.slice(0, maxChars) + "...";
  return claim;
}

/** Inverted-index candidate selection: pairs sharing >= minShared topic tokens,
 *  sorted by shared-count desc, capped at limit. Skips too-common token buckets. */
export function candidatePairs(pages, { minShared = MIN_SHARED_TOKENS, limit = DEFAULT_LIMIT, maxBucket = MAX_BUCKET } = {}) {
  const tokenToIdx = new Map();
  pages.forEach((p, i) => {
    for (const tok of p.tokens) {
      let arr = tokenToIdx.get(tok);
      if (!arr) tokenToIdx.set(tok, (arr = []));
      arr.push(i);
    }
  });
  const pairShared = new Map(); // "i:j" (i<j) -> count
  for (const idxs of tokenToIdx.values()) {
    if (idxs.length < 2 || idxs.length > maxBucket) continue; // singleton or too-generic
    for (let a = 0; a < idxs.length; a++) {
      for (let b = a + 1; b < idxs.length; b++) {
        const i = idxs[a], j = idxs[b];
        const key = i < j ? `${i}:${j}` : `${j}:${i}`;
        pairShared.set(key, (pairShared.get(key) || 0) + 1);
      }
    }
  }
  const pairs = [];
  for (const [key, shared] of pairShared) {
    if (shared >= minShared) {
      const [i, j] = key.split(":").map(Number);
      pairs.push({ i, j, shared });
    }
  }
  pairs.sort((a, b) => b.shared - a.shared);
  return pairs.slice(0, limit);
}

/** NLI prompt: ask for a single verdict word + one-line reason. */
export function buildNliPrompt(claimA, claimB) {
  return `You are a strict natural-language-inference judge for an engineering knowledge base.
Decide the relationship between the two statements. Answer with EXACTLY ONE of these words on the first line:
CONTRADICT  (they cannot both be true)
CONSISTENT  (they agree or one supports the other)
UNRELATED   (different topics; no logical relation)
Then a second line: a one-sentence reason (<=25 words).

Statement A: ${claimA}

Statement B: ${claimB}`;
}

/**
 * Parse the model reply -> one of contradict|consistent|unrelated|unknown + reason.
 *
 * Robustness (scrutiny-hardened): the prompt mandates the verdict word on the
 * FIRST line, so we scan line 1 first (constrained output), then fall back to the
 * whole text. Matching is WORD-BOUNDARY (so "UNRELATEDNESS" is not "unrelated")
 * and a CONTRADICT hit immediately preceded by a negation ("not"/"n't"/"no"/
 * "never"/"cannot") is dropped, so a reasoning leak like "they do not contradict"
 * is never a false CONTRADICT.
 */
export function parseNliVerdict(text) {
  const t = (text || "").trim();
  if (!t) return { verdict: "unknown", reason: "" };
  const lines = t.split("\n").map((l) => l.trim()).filter(Boolean);
  const scan = (s) => {
    const hits = [...s.matchAll(/\b(CONTRADICT|CONSISTENT|UNRELATED)\b/gi)]
      .map((m) => ({ word: m[1].toLowerCase(), idx: m.index ?? 0 }))
      .filter((h) => {
        if (h.word !== "contradict") return true;
        const before = s.slice(Math.max(0, h.idx - 16), h.idx).toLowerCase();
        return !/(\bnot\b|n't|\bno\b|\bnever\b|cannot)\s*$/.test(before);
      })
      .sort((a, b) => a.idx - b.idx);
    return hits.length ? hits[0].word : null;
  };
  const verdict = scan(lines[0] || "") || scan(t) || "unknown";
  // Reason = first content line that is not just a bare verdict keyword.
  let reason = "";
  for (const l of lines) {
    const stripped = l.replace(/^(CONTRADICT|CONSISTENT|UNRELATED)[:\-\s]*/i, "").trim();
    if (stripped) { reason = stripped; break; }
  }
  return { verdict, reason: reason.slice(0, 240) };
}

function walkMd(dir) {
  const out = [];
  (function rec(d) {
    let entries;
    try { entries = readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = join(d, e.name);
      if (e.isDirectory()) rec(full);
      else if (e.isFile() && e.name.endsWith(".md") && !e.name.startsWith("_")) out.push(full);
    }
  })(dir);
  return out;
}

/** Load curated wiki pages (each with topic tokens + claim). */
export function loadPages({ wikiDir = WIKI_DIR, subdirs = CURATED_SUBDIRS, includeArch = false } = {}) {
  const dirs = includeArch ? [...subdirs, "architecture"] : subdirs;
  const pages = [];
  for (const sub of dirs) {
    const d = resolve(wikiDir, sub);
    for (const f of walkMd(d)) {
      let content;
      try { content = readFileSync(f, "utf8"); } catch { continue; }
      const rel = relative(wikiDir, f).replace(/\\/g, "/");
      const page = parsePage(content, rel);
      page.tokens = tokenizeForTopic(page);
      page.claim = selectClaim(page);
      if (page.tokens.size && page.claim) pages.push(page);
    }
  }
  return pages;
}

/**
 * Run the NLI lint over candidate pairs. Pure-shell: `callImpl` is injectable.
 * Never throws; per-pair failure -> recorded in `unchecked`.
 *
 * NOTE: the per-pair calls are INTENTIONALLY sequential (await-in-loop). These
 * are local-LLM inferences on one GPU -- firing all candidate pairs concurrently
 * would thrash Ollama's NUM_PARALLEL queue / VRAM, not speed it up. This is an
 * advisory periodic lint, so wall-clock is not the constraint.
 *
 * STOCHASTIC-VERDICT STABILIZATION (confirmSamples, SIERRA-VAULT-OPS/U-VAULT-NLI-VOTE):
 * gpt-oss:20b is a SAMPLING model -- for a borderline pair it intermittently emits
 * CONTRADICT on one run and CONSISTENT on the next, so a single-sample verdict yields
 * FLAKY false-positive contradictions that only decay when a later run happens to
 * sample CONSISTENT (observed live: the edit-tool A<>B memo pair re-measured 0/3
 * CONTRADICT yet was flagged by a cron run). With confirmSamples>0 a CONTRADICT primary
 * is RE-SAMPLED that many more times and recorded ONLY if a strict majority of the
 * (1+confirmSamples) total votes agree -- a flaky single judge becomes a stable
 * majority judge. Confirm fires ONLY on CONTRADICT (the costly direction): a missed
 * contradiction is cheap (the next run catches it) but a spurious WARN drives an
 * operator memo-decision. Default 0 = single-sample, byte-identical legacy behavior
 * (the shared wiki lint is unaffected unless it opts in).
 *
 * WALL-CLOCK BUDGET (budgetMs, SIERRA-VAULT-OPS/U-VAULT-NLI-BUDGET): a full run is
 * sequential local-LLM inference (~8s/pair -> ~18min for 148 pairs). For a CRON run
 * that is fine; for an INTERACTIVE/manual refresh it is NOT -- the harness backgrounds
 * and KILLS a Bash call at ~100s, and this lint writes its report only at the END, so
 * an interactive run produces NO report at all (observed live 2026-06-18: the refresh
 * exited 255 with the persisted report untouched). With budgetMs>0 the loop stops
 * STARTING new pairs once nowFn()-start >= budgetMs and writes a PARTIAL HONEST report
 * (budgetExceeded + the pairs actually checked + notAttempted); the per-call timeout is
 * also shrunk to the remaining budget (floored at minCallTimeoutMs) so one slow call
 * cannot blow far past the budget. The budget is SOFT -- the in-flight PRIMARY call always
 * completes (we never interrupt a call mid-flight), but confirm resamples STOP once the
 * budget is spent, bounding total overshoot to ~one floored call; a boundary CONTRADICT left
 * unconfirmed is conservatively dropped (votes < majority). Default 0 = unbounded (the
 * cron path, unchanged). Coverage stays honest: pairsChecked drops and downstream readers
 * (vault-health's lowCoverage guard) derive coverage from pairsChecked, not pairsConsidered.
 * nowFn is injectable for hermetic time-travel tests.
 */
export async function runNliLint(pages, {
  callImpl = callOllama,
  model = DEFAULT_NLI_MODEL,
  limit = DEFAULT_LIMIT,
  numPredict = NLI_NUM_PREDICT,
  timeoutMs = NLI_TIMEOUT_MS,
  maxConsecutiveFailures = MAX_CONSECUTIVE_FAILURES,
  confirmSamples = 0,
  budgetMs = 0,
  minCallTimeoutMs = MIN_CALL_TIMEOUT_MS,
  nowFn = Date.now,
} = {}) {
  const pairs = candidatePairs(pages, { limit });
  const contradictions = [];
  const confirmTotal = 1 + Math.max(0, confirmSamples);    // total votes per CONTRADICT pair (primary + confirms)
  const confirmRequired = Math.floor(confirmTotal / 2) + 1; // strict majority; == 1 when confirmSamples == 0 (legacy)
  const startMs = nowFn();
  // SOFT wall-clock budget helpers, re-evaluated before EVERY call (primary AND each confirm):
  //  - budgetSpent(): gates whether to START another call.
  //  - effectiveTimeout(): shrinks a call's timeout to the remaining budget (floored).
  // Re-checking before every call (not once per pair) bounds total overshoot to ~one floored
  // call -- without the per-confirm guard a confirmSamples=2 CONTRADICT pair could overshoot by
  // (1+confirmSamples)*minCallTimeoutMs. No-ops when budgetMs==0 (budgetSpent()==false,
  // effectiveTimeout()==timeoutMs) -> the legacy path is byte-identical.
  const budgetSpent = () => budgetMs > 0 && nowFn() - startMs >= budgetMs;
  const effectiveTimeout = () => budgetMs > 0
    ? Math.max(minCallTimeoutMs, Math.min(timeoutMs, budgetMs - (nowFn() - startMs)))
    : timeoutMs;
  let checked = 0, unchecked = 0, consecutive = 0, aborted = false, budgetExceeded = false, confirmCalls = 0;
  for (const { i, j, shared } of pairs) {
    // Stop STARTING new pairs once the budget is spent -> a partial honest report instead of a
    // harness-killed run with nothing written. The in-flight primary call below still completes.
    if (budgetSpent()) { budgetExceeded = true; break; }
    const a = pages[i], b = pages[j];
    const prompt = buildNliPrompt(a.claim, b.claim);
    let r;
    try {
      r = await callImpl(model, prompt, { numPredict, timeoutMs: effectiveTimeout() });
    } catch (err) {
      r = { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
    if (!r || !r.ok || !r.text) {
      unchecked++;
      consecutive++;
      // Circuit breaker: a saturated/down Ollama makes EVERY call time out at the
      // full timeoutMs -> without this the run grinds all `limit` pairs for hours
      // and checks nothing. Bail honestly once it's clearly systemic.
      if (consecutive >= maxConsecutiveFailures) { aborted = true; break; }
      continue;
    }
    consecutive = 0;
    checked++;
    const { verdict, reason } = parseNliVerdict(r.text);
    if (verdict !== "contradict") continue;
    // CONTRADICT primary -> confirm-resample to a strict majority (stochastic
    // stabilization; see the STOCHASTIC-VERDICT note). confirmSamples == 0 skips the
    // loop and confirmRequired == 1, so a single CONTRADICT records exactly as before.
    // A failed/empty confirm call is a conservative non-contradict vote (never records
    // a finding it could not corroborate) and is NOT fed to the circuit breaker -- the
    // pair already counts as checked, and a truly-down Ollama trips the breaker on the
    // NEXT pair's primary call.
    let contradictVotes = 1;
    for (let s = 0; s < confirmSamples; s++) {
      // Budget guard: stop resampling once the budget is spent, so an in-flight CONTRADICT pair
      // cannot overshoot by (1+confirmSamples) floored calls. The unconfirmed finding is then
      // conservatively DROPPED (votes < majority) -- consistent with the confirm-failure policy;
      // the next full (unbudgeted) run re-checks it with the complete vote.
      if (budgetSpent()) break;
      let cr;
      try { cr = await callImpl(model, prompt, { numPredict, timeoutMs: effectiveTimeout() }); }
      catch { cr = null; }
      confirmCalls++;
      if (cr && cr.ok && cr.text && parseNliVerdict(cr.text).verdict === "contradict") contradictVotes++;
    }
    if (contradictVotes >= confirmRequired) {
      const entry = { a: a.rel, b: b.rel, shared, reason };
      if (confirmSamples > 0) entry.votes = { contradict: contradictVotes, total: confirmTotal };
      contradictions.push(entry);
    }
  }
  const report = {
    schemaVersion: 1,
    model,
    totals: {
      pages: pages.length,
      pairsConsidered: pairs.length,
      pairsChecked: checked,
      unchecked,
      contradictions: contradictions.length,
    },
    contradictions,
  };
  if (confirmSamples > 0) {
    report.totals.confirmSamples = confirmSamples;
    report.totals.confirmCalls = confirmCalls;
  }
  if (budgetMs > 0) {
    report.totals.budgetMs = budgetMs;
    if (budgetExceeded) {
      report.budgetExceeded = true;
      report.totals.notAttempted = pairs.length - checked - unchecked;
      report.budgetReason = `wall-clock budget ${budgetMs}ms reached after ${checked} checked; ${report.totals.notAttempted} pair(s) not attempted`;
    }
  }
  if (aborted) {
    report.aborted = true;
    report.abortReason = `${maxConsecutiveFailures} consecutive call failures (Ollama unavailable / GPU-saturated)`;
  }
  return report;
}

/** Resolve the NLI model: env pin -> default -> first installed preference.
 *  Returns {model, installed} or {model:null} if nothing usable (fail-soft). */
export async function resolveNliModel({ envModel = process.env.PRISM_WIKI_NLI_MODEL, fetchModelsFn = fetchInstalledModels } = {}) {
  const installed = await fetchModelsFn();
  if (!installed.length) return { model: null, installed, reason: "no installed models (ollama down?)" };
  const wanted = (envModel && envModel.trim()) || DEFAULT_NLI_MODEL;
  if (installed.includes(wanted)) return { model: wanted, installed };
  for (const cand of NLI_MODEL_PREFERENCE) {
    if (installed.includes(cand)) return { model: cand, installed, fellBack: true };
  }
  return { model: installed[0], installed, fellBack: true };
}

function getOpt(name, dflt) {
  for (const a of process.argv.slice(2)) {
    const m = a.match(new RegExp(`^${name}=(.*)$`));
    if (m) return m[1];
  }
  const idx = process.argv.indexOf(name);
  return idx >= 0 && process.argv[idx + 1] && !process.argv[idx + 1].startsWith("--") ? process.argv[idx + 1] : dflt;
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const write = args.has("--write") || args.size === 0;
  const includeArch = args.has("--include-arch");
  const section = args.has("--section");
  const limit = Number(getOpt("--limit", DEFAULT_LIMIT)) || DEFAULT_LIMIT;
  const modelOverride = getOpt("--model", null);

  if (!existsSync(WIKI_DIR)) { console.error("wiki dir missing"); process.exit(2); }
  const t0 = Date.now();
  const pages = loadPages({ includeArch });
  const resolved = await resolveNliModel({ envModel: modelOverride || process.env.PRISM_WIKI_NLI_MODEL });
  if (!resolved.model) {
    const report = { schemaVersion: 1, model: null, generatedAt: new Date().toISOString(), totals: { pages: pages.length, pairsConsidered: 0, pairsChecked: 0, unchecked: 0, contradictions: 0 }, contradictions: [], note: resolved.reason || "no NLI model available" };
    if (write) { mkdirSync(dirname(OUT_PATH), { recursive: true }); writeFileSync(OUT_PATH, JSON.stringify(report, null, 2), "utf8"); }
    console.log(`wiki-nli: ${pages.length} pages - NLI SKIPPED (${report.note}) - ${Date.now() - t0}ms`);
    return;
  }
  const report = await runNliLint(pages, { model: resolved.model, limit });
  report.generatedAt = new Date().toISOString();
  report.elapsedMs = Date.now() - t0;
  if (resolved.fellBack) report.modelFellBack = true;
  if (write) {
    mkdirSync(dirname(OUT_PATH), { recursive: true });
    writeFileSync(OUT_PATH, JSON.stringify(report, null, 2), "utf8");
    console.log(`wrote ${OUT_PATH}`);
  }
  const T = report.totals;
  console.log(`wiki-nli: ${T.pages} pages - ${T.pairsConsidered} candidate pairs - ${T.pairsChecked} checked (${T.unchecked} unchecked) - ${T.contradictions} contradiction(s) - model ${report.model} - ${report.elapsedMs}ms`);
  if (section) for (const c of report.contradictions) console.log(`  CONTRADICT  ${c.a}  <>  ${c.b}\n    ${c.reason}`);
}

// Robust entry detection: compare REAL filesystem paths (handles Windows
// drive-letter casing + slash + symlink differences that broke a naive
// pathToFileURL string compare when invoked as `node scripts/...`).
const isMain = (() => {
  try {
    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1] || "");
  } catch { return false; }
})();
if (isMain) main().catch((e) => { console.error("wiki-nli fatal:", e?.message || e); process.exit(1); });
