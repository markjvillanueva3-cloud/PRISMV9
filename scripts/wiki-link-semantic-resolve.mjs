#!/usr/bin/env node
// scripts/wiki-link-semantic-resolve.mjs
// VIZ-VAULT-SEMANTIC-LINK-RESOLVER (2026-06-24, slot:sierra)
// ---------------------------------------------------------------------------
// Net-new SEMANTIC DECISION + EXECUTION + APPLY layer on top of the two
// existing PURE string-distance link tools, which neither decide, run Ollama,
// nor apply:
//   - fix-broken-wikilinks.mjs         = case/separator-variant classifier
//   - wiki-broken-link-propose-fix.mjs = Levenshtein top-K proposer (advisory)
//
// PROBLEM (live, verified 2026-06-24): 24,287 broken [[wikilinks]] in the
// vault. The two tools above can only (a) alias trivial case-variants or
// (b) emit edit-distance candidates a human must hand-pick. Neither resolves
// a SEMANTICALLY-equivalent-but-differently-worded link, and neither ever
// applies. So the broken-link count never drops.
//
// THIS tool closes that:
//   1. Levenshtein pre-filter (reuses proposeRenames) narrows each broken link
//      to a candidate set of EXISTING notes only.
//   2. Ollama (local, $0) picks the SINGLE correct existing target, or NONE
//      (semantic disambiguation + false-friend rejection -> higher precision
//      than edit-distance top-1, which is the whole anti-poison lever).
//   3. ANTI-POISON GUARD (validateResolution): the pick is accepted ONLY if it
//      is an exact member of the pre-validated candidate set. Ollama physically
//      CANNOT inject an invented slug -> the brain can never be poisoned by an
//      AI-hallucinated link (the central caution from prior sierra sessions).
//   4. Ollama calls route through ask-ollama.mjs -> recorded as executedOffloads
//      (closes the live executedOffloads:0 adoption gap; "gap is utilization,
//      not capacity").
//   5. Resumable cursor (corpus-ingest pattern) so a cron chips at the 24K set.
//   6. DECIDE (default, dry-run, writes proposals JSON) is separate from APPLY
//      (--apply: deterministic rewrite of the decided set, capped + .bak backup
//      + logged). No file is ever mutated without --apply.
//
// Run:
//   node scripts/wiki-link-semantic-resolve.mjs                 # decide, cap 40
//   node scripts/wiki-link-semantic-resolve.mjs --cap 100 --json
//   node scripts/wiki-link-semantic-resolve.mjs --apply --cap 10 # apply decided
//
// Outputs:
//   state/shared/dashboards/wiki-link-semantic-resolutions.json  (decided set)
//   state/shared/vault-link-resolve-cursor.jsonl                 (resume cursor)

import { readdirSync, readFileSync, statSync, writeFileSync, appendFileSync,
         mkdirSync, existsSync, copyFileSync } from "node:fs";
import { join, basename, dirname, resolve as pathResolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
// Reuse the tested pure helpers from the existing Levenshtein proposer (R7:
// extend the more-tested tool, do not fork its candidate generation).
import { extractLinks, levenshtein, proposeRenames }
  from "./wiki-broken-link-propose-fix.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = pathResolve(HERE, "..");
const WIKI_ROOT = join(REPO_ROOT, "knowledge/wiki");
const MEMORY_ROOT = join(REPO_ROOT, "knowledge/memories");
const PROPOSALS_OUT = join(REPO_ROOT, "state/shared/dashboards/wiki-link-semantic-resolutions.json");
const CURSOR_PATH = join(REPO_ROOT, "state/shared/vault-link-resolve-cursor.jsonl");
const ASK_OLLAMA = join(REPO_ROOT, "scripts/ask-ollama.mjs");

// --------------------------------------------------------------------------
// PURE FUNCTIONS (exported, unit-tested)
// --------------------------------------------------------------------------

/** Normalize a slug for case/separator-insensitive resolution (matches how a
 *  vault resolves [[Foo_Bar]] == [[foo-bar]]). */
export function normalizeSlug(s) {
  if (typeof s !== "string") return "";
  return s.trim().toLowerCase().replace(/_/g, "-");
}

/** Build the set of normalized existing-note slugs for O(1) resolution checks. */
export function buildSlugDirectory(canonicalSlugs) {
  const dir = new Set();
  if (!Array.isArray(canonicalSlugs)) return dir;
  for (const s of canonicalSlugs) {
    const n = normalizeSlug(s);
    if (n) dir.add(n);
  }
  return dir;
}

/** A link is resolved iff its normalized form names an existing note. */
export function isResolved(link, normalizedDir) {
  if (!(normalizedDir instanceof Set)) return false;
  return normalizedDir.has(normalizeSlug(link));
}

/**
 * Find broken links across a list of {file, content}. Returns
 * [{file, link, count}] for links whose normalized slug is NOT an existing note.
 * Dedup is per (file, link) so a link used twice in one file counts once.
 */
export function findBrokenLinks(fileContents, normalizedDir) {
  const out = [];
  if (!Array.isArray(fileContents)) return out;
  for (const { file, content } of fileContents) {
    const seen = new Map(); // link -> count
    for (const link of extractLinks(content)) {
      if (isResolved(link, normalizedDir)) continue;
      seen.set(link, (seen.get(link) || 0) + 1);
    }
    for (const [link, count] of seen) out.push({ file, link, count });
  }
  return out;
}

/** Significant tokens of a slug (split on -/_/./space, drop sub-3-char fragments). */
export function significantTokens(slug) {
  return String(slug || "").toLowerCase().split(/[-_./\s]+/).filter(t => t.length >= 3);
}

/**
 * PRECISION GUARD. A candidate is only acceptable if EVERY significant token of
 * the broken link appears (as a substring) in the candidate's concatenated form.
 * This rejects the "dropped a domain/namespace qualifier" false matches that
 * pure edit-distance accepts -- e.g. cad-knowledge-index -> knowledgeindex
 * (drops "cad") or prism_telemetry -> telemetry (drops "prism") -- which are
 * within Levenshtein 6 but semantically WRONG. Verified on live 2026-06-24
 * resolutions: keeps telemetry-engine->telemetryengine, rejects the other two.
 */
export function tokenCoverageOk(brokenLink, candidate) {
  const candConcat = String(candidate || "").toLowerCase().replace(/[-_./\s]+/g, "");
  const toks = significantTokens(brokenLink);
  if (toks.length === 0) return true;
  return toks.every(t => candConcat.includes(t));
}

/**
 * Candidate set for a broken link: existing canonical slugs within Levenshtein
 * maxDistance, top-K closest, THEN filtered by the token-coverage precision
 * guard (default on). Reuses proposeRenames (which already intersects with the
 * existing-slug set). GUARANTEE: every returned slug is an existing note AND
 * preserves every significant token of the broken link.
 */
export function buildCandidateSet(brokenLink, existingSlugSet, { topK = 5, maxDistance = 6, requireTokenCoverage = true } = {}) {
  const set = existingSlugSet instanceof Set ? existingSlugSet : new Set(existingSlugSet || []);
  // widen the Levenshtein pull before filtering so token-coverage doesn't starve topK
  let cands = proposeRenames(brokenLink, set, topK * 3, maxDistance).map(c => c.slug);
  if (requireTokenCoverage) cands = cands.filter(c => tokenCoverageOk(brokenLink, c));
  return cands.slice(0, topK);
}

/** Build a tight, constrained prompt for a small local model. */
export function buildResolvePrompt(brokenLink, candidates, contextSnippet = "") {
  const list = candidates.map(c => `- ${c}`).join("\n");
  const ctx = contextSnippet ? `\nContext line where it appears:\n"${contextSnippet.slice(0, 240)}"\n` : "";
  return [
    `A wiki note link "[[${brokenLink}]]" is broken: no note with that exact name exists.`,
    `Below is a list of EXISTING note names that are close matches.`,
    ctx,
    `Pick the SINGLE existing note that this broken link almost certainly meant.`,
    `If NONE of them is clearly the intended target, answer exactly: NONE`,
    `Reply with ONLY the exact note name copied from the list, or NONE. No explanation, no punctuation.`,
    ``,
    `Existing note candidates:`,
    list,
  ].join("\n");
}

/** Parse a raw model answer down to a single candidate token. */
export function parseOllamaChoice(answer) {
  if (typeof answer !== "string") return "";
  let t = answer.trim();
  // take first non-empty line
  t = (t.split(/\r?\n/).find(l => l.trim().length > 0) || "").trim();
  // strip wrapping wikilink brackets / backticks / quotes / list markers / trailing punctuation
  t = t.replace(/^[-*\d.\s]+/, "")
       .replace(/^\[\[/, "").replace(/\]\]$/, "")
       .replace(/^[`"'\s]+/, "").replace(/[`"'.\s]+$/, "")
       .replace(/\|.*$/, ""); // drop any |alias the model echoed
  return t.trim();
}

/**
 * ANTI-POISON GUARD. Accept the model's choice ONLY if it is an exact member
 * (case/sep-insensitive) of the pre-validated candidate set. Returns the
 * CANONICAL candidate slug, or null with a reason. A garbled / off-menu /
 * invented answer can never resolve -> the vault can never be poisoned.
 */
export function validateResolution(answer, candidates) {
  const cands = Array.isArray(candidates) ? candidates : [];
  const choice = parseOllamaChoice(answer);
  if (!choice) return { slug: null, reason: "empty" };
  if (/^none$/i.test(choice)) return { slug: null, reason: "none" };
  const nChoice = normalizeSlug(choice);
  for (const c of cands) {
    if (normalizeSlug(c) === nChoice) return { slug: c, reason: "matched" };
  }
  return { slug: null, reason: "off-menu" }; // hallucination / not in candidate set
}

/** Stable resume key for a (file, link) pair. */
export function cursorKey(file, link) {
  return `${String(file).replace(/\\/g, "/")}::${link}`;
}

/** Split items into {pending, skipped} by a done-set of cursor keys. */
export function partitionByCursor(items, doneSet, keyFn = (it) => cursorKey(it.file, it.link)) {
  const done = doneSet instanceof Set ? doneSet : new Set(doneSet || []);
  const pending = [], skipped = [];
  for (const it of items || []) (done.has(keyFn(it)) ? skipped : pending).push(it);
  return { pending, skipped };
}

/** Build the exact-link rewrite for apply: [[link]] / [[link|alias]] -> [[resolvedTo(|alias)]]. */
export function rewriteLink(content, brokenLink, resolvedTo) {
  if (typeof content !== "string") return content;
  const esc = brokenLink.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`\\[\\[${esc}(\\|[^\\]]*)?\\]\\]`, "g");
  return content.replace(re, (_m, alias) => `[[${resolvedTo}${alias || ""}]]`);
}

// --------------------------------------------------------------------------
// IMPURE SHELL
// --------------------------------------------------------------------------

function walkMarkdown(root) {
  const out = [];
  (function walk(d) {
    let entries;
    try { entries = readdirSync(d); } catch { return; }
    for (const name of entries) {
      const full = join(d, name);
      let st; try { st = statSync(full); } catch { continue; }
      if (st.isDirectory()) walk(full);
      else if (name.endsWith(".md")) out.push(full);
    }
  })(root);
  return out;
}

function fileToSlug(p) { return basename(p, ".md"); }

function firstContextLine(content, link) {
  for (const line of content.split(/\r?\n/)) {
    if (line.includes(`[[${link}`)) return line.trim();
  }
  return "";
}

function loadDoneSet() {
  const done = new Set();
  if (!existsSync(CURSOR_PATH)) return done;
  try {
    for (const line of readFileSync(CURSOR_PATH, "utf8").split(/\r?\n/)) {
      if (!line.trim()) continue;
      try { const r = JSON.parse(line); if (r && r.k) done.add(r.k); } catch { /* skip torn row */ }
    }
  } catch { /* fresh */ }
  return done;
}

/** Live Ollama call routed through ask-ollama.mjs (records executedOffloads). */
function liveAsk(prompt, { model, timeoutMs }) {
  try {
    const stdout = execFileSync(
      process.execPath,
      [ASK_OLLAMA, "ask", prompt, "--json", "--model", model, "--timeout", String(timeoutMs)],
      { encoding: "utf8", timeout: timeoutMs + 15000, windowsHide: true, maxBuffer: 8 * 1024 * 1024 },
    );
    const j = JSON.parse(stdout);
    return typeof j.answer === "string" ? j.answer : "";
  } catch {
    return ""; // fail-safe: unparseable / ollama down -> empty -> resolves to NONE
  }
}

function parseArgs(argv) {
  // Default to a LIGHT local model (gpt-oss:20b) for this constrained pick task,
  // NOT a 32B model -- the resolver runs in a loop/cron under the 26-chat fleet,
  // so model footprint must stay modest (see the memory-safety lesson in header).
  const a = { cap: 40, topK: 5, maxDistance: 6, model: "gpt-oss:20b",
              timeoutMs: 60000, apply: false, json: false };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--apply") a.apply = true;
    else if (t === "--json") a.json = true;
    else if (t === "--cap") a.cap = Math.max(1, parseInt(argv[++i], 10) || 40);
    else if (t === "--topk") a.topK = Math.max(1, parseInt(argv[++i], 10) || 5);
    else if (t === "--max-distance") a.maxDistance = Math.max(1, parseInt(argv[++i], 10) || 6);
    else if (t === "--model") a.model = argv[++i] || a.model;
    else if (t === "--timeout") a.timeoutMs = Math.max(5000, parseInt(argv[++i], 10) || 60000);
  }
  return a;
}

/** DECIDE mode: ollama-resolve a capped batch of broken links to existing notes. */
async function runDecide(opts, askFn) {
  const files = [...walkMarkdown(WIKI_ROOT), ...walkMarkdown(MEMORY_ROOT)];
  const canonical = files.map(fileToSlug);
  const existingSet = new Set(canonical);
  const normalizedDir = buildSlugDirectory(canonical);

  // STREAM-walk: extract broken links per file WITHOUT retaining all bodies.
  // Retaining ~39K file contents in an array is the memory-pressure trap that
  // got an earlier run reaped (see header + [[reference_sierra_resolver_memory_safe_2026_06_24]]).
  // `findBrokenLinks` is the tested pure spec of this; the shell inlines it so a
  // file body is GC-eligible the moment its links are extracted.
  const broken = []; // {file, link, count}
  for (const f of files) {
    let content; try { content = readFileSync(f, "utf8"); } catch { continue; }
    const seen = new Map();
    for (const link of extractLinks(content)) {
      if (isResolved(link, normalizedDir)) continue;
      seen.set(link, (seen.get(link) || 0) + 1);
    }
    for (const [link, count] of seen) broken.push({ file: f, link, count });
  }

  const doneSet = loadDoneSet();
  const { pending, skipped } = partitionByCursor(broken, doneSet);
  // Evaluate at most `cap` UNPROCESSED links this run. Levenshtein candidate
  // generation (O(existingSlugs) per link) runs ONLY for this capped batch --
  // NEVER for all ~24K broken links at once (the O(24K x 40K) ~1e9-op CPU hang
  // that looked like a runaway process and got reaped). EVERY evaluated link is
  // recorded in the cursor (candidates or not) so re-runs make forward progress.
  const batch = pending.slice(0, opts.cap);

  const resolutions = [];
  let none = 0, offMenu = 0, noCandidates = 0;
  mkdirSync(dirname(CURSOR_PATH), { recursive: true });

  for (const item of batch) {
    const candidates = buildCandidateSet(item.link, existingSet, opts);
    let slug = null, reason = "no-candidates";
    if (candidates.length > 0) {
      let ctx = "";
      try { ctx = firstContextLine(readFileSync(item.file, "utf8"), item.link); } catch { /* context optional */ }
      const answer = await askFn(buildResolvePrompt(item.link, candidates, ctx));
      ({ slug, reason } = validateResolution(answer, candidates));
      if (slug) {
        resolutions.push({ file: item.file.replace(/\\/g, "/"), link: item.link,
                           resolvedTo: slug, candidates, count: item.count });
      } else if (reason === "off-menu") { offMenu++; }
      else { none++; }
    } else { noCandidates++; }
    appendFileSync(CURSOR_PATH, JSON.stringify({
      k: cursorKey(item.file, item.link), link: item.link,
      resolvedTo: slug, reason, at: new Date().toISOString(),
    }) + "\n");
  }

  const out = {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    scanned: { files: files.length, existingNotes: canonical.length },
    broken: { total: broken.length, alreadyProcessed: skipped.length, evaluatedThisRun: batch.length },
    results: { resolved: resolutions.length, none, offMenuBlocked: offMenu, noCandidates },
    resolutions,
  };
  mkdirSync(dirname(PROPOSALS_OUT), { recursive: true });
  // merge with any prior proposals (dedupe by file::link, newest wins)
  let prior = [];
  if (existsSync(PROPOSALS_OUT)) {
    try { prior = (JSON.parse(readFileSync(PROPOSALS_OUT, "utf8")).resolutions) || []; } catch { /* */ }
  }
  const byKey = new Map(prior.map(r => [cursorKey(r.file, r.link), r]));
  for (const r of resolutions) byKey.set(cursorKey(r.file, r.link), r);
  out.resolutions = [...byKey.values()];
  out.results.resolvedCumulative = out.resolutions.length;
  writeFileSync(PROPOSALS_OUT, JSON.stringify(out, null, 2), "utf8");
  return out;
}

/** APPLY mode: rewrite the decided resolutions into the vault (capped, backed up). */
function runApply(opts) {
  if (!existsSync(PROPOSALS_OUT)) {
    return { error: `no proposals file at ${PROPOSALS_OUT} -- run decide first`, applied: 0 };
  }
  const data = JSON.parse(readFileSync(PROPOSALS_OUT, "utf8"));
  const resolutions = (data.resolutions || []).slice(0, opts.cap);
  let applied = 0; const log = [];
  for (const r of resolutions) {
    const abs = pathResolve(REPO_ROOT, r.file);
    if (!existsSync(abs)) { log.push({ file: r.file, skipped: "missing" }); continue; }
    const before = readFileSync(abs, "utf8");
    const after = rewriteLink(before, r.link, r.resolvedTo);
    if (after === before) { log.push({ file: r.file, link: r.link, skipped: "no-match" }); continue; }
    copyFileSync(abs, abs + ".linkbak");       // reversible backup
    writeFileSync(abs, after, "utf8");
    applied++;
    log.push({ file: r.file, link: r.link, resolvedTo: r.resolvedTo, ok: true });
  }
  return { applied, considered: resolutions.length, log };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.apply) {
    const res = runApply(opts);
    console.log(opts.json ? JSON.stringify(res, null, 2)
      : `✓ apply: ${res.applied}/${res.considered ?? 0} links rewritten (backups: *.linkbak)`);
    return res.error ? 2 : 0;
  }
  const askFn = (prompt) => liveAsk(prompt, opts);
  const out = await runDecide(opts, askFn);
  if (opts.json) { console.log(JSON.stringify(out, null, 2)); return 0; }
  console.log(`✓ wiki-link-semantic-resolve (DECIDE)`);
  console.log(`  scanned ${out.scanned.files} files / ${out.scanned.existingNotes} notes`);
  console.log(`  broken: ${out.broken.total} total, ${out.broken.alreadyProcessed} done, ` +
              `${out.broken.evaluatedThisRun} evaluated this run`);
  console.log(`  resolved -> existing note: ${out.results.resolved} | NONE: ${out.results.none} | ` +
              `off-menu blocked (anti-poison): ${out.results.offMenuBlocked} | no-candidates: ${out.results.noCandidates}`);
  console.log(`  cumulative decided: ${out.results.resolvedCumulative} -> ${PROPOSALS_OUT}`);
  return 0;
}

const invokedDirect = process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("wiki-link-semantic-resolve.mjs");
if (invokedDirect) {
  main().then(code => process.exit(code || 0)).catch(e => {
    console.error("wiki-link-semantic-resolve crashed:", e.message);
    process.exit(1);
  });
}
