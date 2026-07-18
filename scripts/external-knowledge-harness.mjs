#!/usr/bin/env node
// scripts/external-knowledge-harness.mjs
//
// ENGINEERED EXTERNAL-KNOWLEDGE LOOP (the /goal's "utilize engineered loops,
// harnesses and crons" + "add reputable outside sources (college textbooks, MIT
// courses, standards) ... make it auto-pullable").
//
// The auto-pull approach-knowledge layer (scripts/lib/<d>-approach-knowledge.mjs)
// fires 170 verified gates + tracks a specialist verify-backlog of cited
// UNVERIFIED gaps. This harness keeps that backlog GROWING from OUTSIDE sources:
// per domain it asks a strong reasoning model (Hermes proxy -> falls back to
// local Ollama) for NET-NEW canonical external rules, dedups them against the
// live gates+gaps, and STAGES the survivors to a ledger for specialist review.
//
// SAFETY (the load-bearing invariants -- do NOT weaken):
//   1. It NEVER edits a live *-approach-knowledge.mjs lib and NEVER touches the
//      firing GATES/GOTCHAS registry. It writes ONLY the staging ledger.
//   2. Every staged candidate is UNVERIFIED. A domain specialist confirms it vs
//      the cited source and applies it to the lib's *_UNVERIFIED_GAPS by hand
//      (the same human/opus-verified path used to seed the backlog). Promotion
//      of a gap to a fired gate stays specialist/operator-gated. So a runaway
//      cron can, at worst, append cited-but-unverified rows to a JSONL file --
//      it can never make a rule FIRE.
//   3. Per-domain cap (default 2) + dedup vs the existing corpus bound growth so
//      the backlog does not bloat; the model is told what PRISM already covers.
//   4. Copyright rail: the prompt demands FACTUAL rules/formulas + a canonical
//      cite only, never reproduced prose. Fetches nothing; the model states facts.
//
// The network call (Hermes) is DEPENDENCY-INJECTED (askImpl) exactly like the
// coverage module's importImpl/readImpl, so the test is hermetic (no proxy, no
// $ spend) and the cron supplies the real ask-hermes spawn.
//
// Run:
//   node scripts/external-knowledge-harness.mjs --dry-run              # prompts + plan, no ask, no write
//   node scripts/external-knowledge-harness.mjs --domain cam --cap 2   # live: ask + stage to ledger
//   node scripts/external-knowledge-harness.mjs                        # all 10 domains, live
// Test:
//   node scripts/external-knowledge-harness.test.mjs
//
// Cron (Windows scheduled task, throttled -- see the install note at EOF).

import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { DOMAINS } from "./six-domain-autofire-coverage.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "..");
export const LEDGER = "state/shared/external-knowledge-candidates.jsonl";
const DEFAULT_MODEL = "nvidia/nemotron-3-ultra-550b-a55b";
const DEFAULT_CAP = 2;

const isObj = (x) => x && typeof x === "object";

// ---- corpus: what PRISM already covers for a domain (gate ids + gap texts) ----
// Read from the live lib so the "already covered" summary + the dedup corpus can
// never drift from what actually fires. Fail-soft: a broken import yields empties.
export async function loadDomainCorpus(domain, importImpl) {
  const doImport = importImpl || ((p) => import(pathToFileURL(resolve(REPO, p)).href));
  try {
    const mod = await doImport(domain.lib);
    const internals = isObj(mod._internals) ? mod._internals : {};
    const gatesObj = ["GATES", "GOTCHAS"].map((k) => internals[k]).find(isObj) || {};
    const gateNames = Object.keys(gatesObj);
    const gapsKey = Object.keys(mod).find((k) => /_UNVERIFIED_GAPS$/.test(k));
    const gapTexts = gapsKey && Array.isArray(mod[gapsKey]) ? mod[gapsKey].map(String) : [];
    return { gateNames, gapTexts, ok: true };
  } catch (e) {
    return { gateNames: [], gapTexts: [], ok: false, error: String((e && e.message) || e) };
  }
}

// ---- prompt: ask for NET-NEW cited external rules, told what's already covered ----
// The format/copyright contract lives in a SYSTEM message (SYSTEM_CONTRACT) and the
// domain content in the user message. v1 folded both into one user message and the
// model ECHOED the covered-lists back as bullets instead of emitting items (live
// catch 2026-07-01) -- the same prompts split system/user produced clean numbered
// lists in the manual batches.
export const SYSTEM_CONTRACT = [
  "You are a manufacturing-engineering reference mapper. Output ONLY a numbered list, no",
  "preamble, no restating of the input. Cite REAL canonical sources (textbook+edition+chapter,",
  "MIT-OCW course number, or ISO/ASME/ANSI/OSHA standard). Formulas and engineering rules are",
  "facts -- state them tersely; NEVER reproduce copyrighted prose. Each item = ONE line:",
  "RULE | SOURCE | CLASS (categorical OR numeric-threshold) | WHY-NEW.",
  "Be HONEST: return fewer items or none rather than padding with near-duplicates.",
].join(" ");

export function buildDomainPrompt(domain, corpus) {
  const gates = corpus.gateNames.length ? corpus.gateNames.join(", ") : "(none)";
  // gap texts are long; send only the leading clause of each so the model sees
  // the topic without a huge prompt (and so dedup, not the prompt, is authoritative).
  const gapHeads = corpus.gapTexts
    .map((g) => g.split(/[:.(]/)[0].trim())
    .filter(Boolean)
    .slice(0, 40)
    .join("; ");
  return [
    `Domain: ${domain.key} (manufacturing). PRISM already FIRES these rules: ${gates}.`,
    `PRISM already TRACKS these gaps: ${gapHeads || "(none)"}.`,
    `Give up to ${DEFAULT_CAP + 3} NET-NEW canonical external-source rules NOT in either list,`,
    `from real textbooks / MIT-OCW / ISO-ASME-ANSI-OSHA standards, that this domain's engine`,
    `should surface at point-of-use.`,
  ].join(" ");
}

// ---- parse the "RULE | SOURCE | CLASS | WHY-NEW" numbered list (tolerant) ----
export function parseCandidates(text) {
  if (typeof text !== "string" || !text.trim()) return [];
  const out = [];
  for (let raw of text.split(/\r?\n/)) {
    let line = raw.trim();
    if (!line) continue;
    // strip a leading "1." / "1)" / "- " / "* " and markdown bold
    line = line.replace(/^\s*(?:\d+[.)]|[-*])\s*/, "").replace(/\*\*/g, "").trim();
    if (!line.includes("|")) continue;
    // reject an echoed FORMAT/HEADER line -- a weaker model often parrots the
    // prompt's "RULE | SOURCE | CLASS | WHY-NEW" spec (or a "Format:/Output:"
    // preamble) back as a literal list item; that must never reach the ledger
    // (live-validation catch 2026-07-01: an Ollama-fallback answer did exactly this).
    if (/\bRULE\b\s*\|\s*\bSOURCE\b/i.test(line)) continue;
    const parts = line.split("|").map((p) => p.trim());
    if (parts.length < 2) continue;
    const [rule, source = "", cls = "", whyNew = ""] = parts;
    if (rule.length < 8) continue; // reject fragments
    if (/^(?:format|output|numbered list|each item|note)\b/i.test(rule)) continue; // preamble echo
    if (rule.toUpperCase() === "RULE" || source.toUpperCase() === "SOURCE") continue; // header token echo
    const classNorm = /numeric/i.test(cls) ? "numeric-threshold" : /categor/i.test(cls) ? "categorical" : cls || "unspecified";
    out.push({ rule, source, cls: classNorm, whyNew });
  }
  return out;
}

// ---- dedup vs the existing corpus (conservative: fewer staged > bloat) ----
// A candidate is a DUP if a strong majority of its distinctive tokens already
// appear somewhere in the combined gate-ids + gap-texts. Lexical + deterministic;
// a false-positive only DROPS a candidate (the human never sees noise), never a
// false-negative that would let a real dup through un-flagged.
const STOP = new Set(["the","and","for","with","that","this","from","into","not","are","its","per","vs","via","use","uses","must","when","than","then","before","after","each","only","rule","gate","rules"]);
function sigTokens(s) {
  return [...new Set(String(s).toLowerCase().match(/[a-z][a-z0-9-]{4,}/g) || [])].filter((t) => !STOP.has(t));
}
export function dedupeCandidates(cands, corpus, { cap = DEFAULT_CAP, threshold = 0.6 } = {}) {
  const corpusText = (corpus.gateNames.join(" ") + " " + corpus.gapTexts.join(" ")).toLowerCase();
  const kept = [];
  const dropped = [];
  for (const c of cands) {
    const toks = sigTokens(c.rule);
    if (toks.length === 0) { dropped.push({ ...c, why: "no-signature" }); continue; }
    const hits = toks.filter((t) => corpusText.includes(t)).length;
    const overlap = hits / toks.length;
    if (overlap >= threshold) { dropped.push({ ...c, why: `overlap ${overlap.toFixed(2)}` }); continue; }
    // also dedup within THIS run's kept set
    if (kept.some((k) => { const kt = sigTokens(k.rule); const inter = toks.filter((t) => kt.includes(t)).length; return inter / Math.min(toks.length, kt.length || 1) >= 0.7; })) {
      dropped.push({ ...c, why: "intra-run-dup" });
      continue;
    }
    kept.push(c);
    if (kept.length >= cap) break;
  }
  return { kept, dropped };
}

// ---- real Hermes ask: IN-PROCESS HTTP to the proxy (no child process) ----
// v1 spawned ask-hermes.mjs per ask; the first full production pass (2026-07-01)
// failed 0/10 on exactly that: (a) 6 domains died with exit 0xC0000142 (Windows
// process-launch failure -- the box's known node-spawn-starvation class), and
// (b) the 60s cap starved Hermes on the 550B model, degrading to the Ollama
// fallback whose echo the parser rejects. Fix: POST /chat/completions directly
// (zero subprocesses, 120s budget). On Hermes-down the harness SKIPS the domain
// (R12 loud in the summary; the weekly cron simply retries next run) -- an
// echo-prone local fallback stages nothing anyway, so it earns no complexity here.
async function realAsk(prompt, { model = DEFAULT_MODEL, timeoutMs = 120000 } = {}) {
  const base = (process.env.PRISM_HERMES_PROXY_URL || "http://127.0.0.1:8645/v1").replace(/\/+$/, "");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    // Same bearer resolution as ask-hermes.mjs:85 -- the :8645 OAuth proxy ignores
    // the value, but when PRISM_HERMES_PROXY_URL points at the direct NVIDIA
    // endpoint the key IS required (first re-run 401'd on exactly this). The env
    // var is operator-managed; never logged.
    const token = process.env.PRISM_HERMES_TOKEN || process.env.NVIDIA_API_KEY || "prism";
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      // max_tokens 4000: the NIM endpoint serves nemotron-ultra as a REASONING model
      // whose think-trace precedes the answer INSIDE the completion budget -- at 900
      // the trace consumed the whole budget (finish_reason:length, zero list emitted;
      // live catch 2026-07-01). The pipe-format parser ignores reasoning prose.
      body: JSON.stringify({ model, messages: [{ role: "system", content: SYSTEM_CONTRACT }, { role: "user", content: prompt }], max_tokens: 4000 }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`hermes proxy HTTP ${res.status}`);
    const j = await res.json();
    const text = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
    if (!text) throw new Error("hermes proxy: empty completion");
    return text;
  } finally {
    clearTimeout(timer);
  }
}

function realAppend(records) {
  if (!records.length) return;
  mkdirSync(resolve(REPO, dirname(LEDGER)), { recursive: true });
  const lines = records.map((r) => JSON.stringify(r)).join("\n") + "\n";
  appendFileSync(resolve(REPO, LEDGER), lines, "utf8");
}

// Rules ALREADY staged for a domain -- joined into the dedup corpus so a
// recurring cron never re-stages last week's candidates (cross-RUN dedup;
// the lib-corpus dedup only covers what a specialist already applied).
// Fail-soft: unreadable/absent ledger = no prior rules.
function realLedgerRules(domainKey) {
  try {
    return readFileSync(resolve(REPO, LEDGER), "utf8")
      .split(/\r?\n/)
      .filter(Boolean)
      .map((l) => { try { return JSON.parse(l); } catch { return null; } })
      .filter((r) => r && r.domain === domainKey && typeof r.rule === "string")
      .map((r) => r.rule);
  } catch {
    return [];
  }
}

// ---- orchestrate: per domain -> ask (backoff) -> parse -> dedup -> stage ----
// askImpl / importImpl / appendImpl are injected for the hermetic test. nowIso
// is injected because Date.now() is unavailable in some sandboxes + keeps the
// test deterministic. Returns a summary + the staged records (never throws;
// a domain that fails ask after retries is recorded as skipped, R12).
export async function runHarness({
  askImpl = realAsk,
  importImpl,
  appendImpl = realAppend,
  ledgerRulesImpl = realLedgerRules,
  domains = DOMAINS,
  cap = DEFAULT_CAP,
  model = DEFAULT_MODEL,
  nowIso = "unknown",
  dryRun = false,
  retries = 2,
  retryDelayMs = 0, // CLI passes 3000; tests keep 0 (no wall-clock in the hermetic suite)
  log = () => {},
} = {}) {
  const summary = [];
  const staged = [];
  for (const d of domains) {
    const corpus = await loadDomainCorpus(d, importImpl);
    const prompt = buildDomainPrompt(d, corpus);
    if (dryRun) {
      summary.push({ domain: d.key, slot: d.slot, corpusOk: corpus.ok, gates: corpus.gateNames.length, gaps: corpus.gapTexts.length, promptChars: prompt.length, dryRun: true });
      continue;
    }
    let text = null, err = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
      if (attempt > 0 && retryDelayMs > 0) await new Promise((r) => setTimeout(r, retryDelayMs));
      try { text = await askImpl(prompt, { model }); break; }
      catch (e) { err = String((e && e.message) || e); log(`[${d.key}] ask attempt ${attempt + 1} failed: ${err}`); }
    }
    if (text == null) {
      summary.push({ domain: d.key, slot: d.slot, skipped: true, reason: `ask failed after ${retries + 1} tries: ${err}` });
      continue;
    }
    const parsed = parseCandidates(text);
    // dedup corpus = live lib (gates + gaps) + rules ALREADY staged in the ledger
    // for this domain, so a recurring run never re-stages a prior candidate.
    const priorLedger = ledgerRulesImpl(d.key) || [];
    const dedupCorpus = priorLedger.length ? { gateNames: corpus.gateNames, gapTexts: [...corpus.gapTexts, ...priorLedger] } : corpus;
    const { kept, dropped } = dedupeCandidates(parsed, dedupCorpus, { cap });
    const recs = kept.map((c) => ({
      domain: d.key, slot: d.slot, rule: c.rule, source: c.source, class: c.cls, whyNew: c.whyNew,
      status: "staged-unverified", stagedAt: nowIso, model,
      note: "UNVERIFIED external candidate -- specialist confirms vs the cited source before hand-applying to *_UNVERIFIED_GAPS; NEVER auto-fires.",
    }));
    staged.push(...recs);
    // append PER DOMAIN, not batched at the end: a mid-run kill (box reaper /
    // timeout) must never lose the domains that already completed (live catch
    // 2026-07-01 -- two full runs died mid-pass and the end-batch lost everything).
    if (!dryRun && recs.length) appendImpl(recs);
    summary.push({ domain: d.key, slot: d.slot, parsed: parsed.length, staged: recs.length, deduped: dropped.length });
    log(`[${d.key}] done: parsed ${parsed.length}, staged ${recs.length}, deduped ${dropped.length}`);
  }
  return { summary, staged, ledger: LEDGER };
}

// ---- CLI ----
function parseArgs(argv) {
  const a = { domain: null, cap: DEFAULT_CAP, dryRun: false, model: DEFAULT_MODEL };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--dry-run") a.dryRun = true;
    else if (t === "--domain") a.domain = argv[++i];
    else if (t === "--cap") a.cap = Math.max(1, parseInt(argv[++i], 10) || DEFAULT_CAP);
    else if (t === "--model") a.model = argv[++i];
  }
  return a;
}

const __isCLI = process.argv[1] && (() => {
  try { return fileURLToPath(import.meta.url) === process.argv[1]; } catch { return false; }
})();
if (__isCLI) {
  const a = parseArgs(process.argv.slice(2));
  const domains = a.domain ? DOMAINS.filter((d) => d.key === a.domain) : DOMAINS;
  if (!domains.length) { console.error(`unknown domain: ${a.domain}`); process.exit(2); }
  // stamp time here (Date is available in a real CLI run; the harness core stays pure)
  const nowIso = new Date().toISOString();
  runHarness({ domains, cap: a.cap, model: a.model, dryRun: a.dryRun, nowIso, retryDelayMs: 3000, log: (m) => process.stderr.write(m + "\n") })
    .then((r) => {
      console.log(JSON.stringify({ ...r, dryRun: a.dryRun }, null, 2));
      const total = r.staged.length;
      process.stderr.write(`\nexternal-knowledge-harness: ${a.dryRun ? "DRY-RUN (no ask/write)" : `staged ${total} candidate(s) -> ${r.ledger}`}\n`);
    })
    .catch((e) => { console.error("harness error:", e); process.exit(1); });
}

// CRON (throttled -- weekly is plenty; the backlog, not generation, is the bottleneck):
//   schtasks /Create /TN "PRISM External Knowledge Harness" /SC WEEKLY /D SUN /ST 04:17 \
//     /TR "\"H:\.claude\bin\portable-node\" H:\prism\scripts\external-knowledge-harness.mjs" /F
// It only STAGES to the ledger; a specialist drains the ledger into the libs by hand.
