#!/usr/bin/env node
/**
 * domain-corpus-to-lora-dataset.mjs  (slot:papa 2026-06-24)
 *
 * THE MISSING PLUMBING: turn the rescued per-domain knowledge (the resource-pdf specs
 * that reclassify-domain-feeders-ollama.mjs lifted out of the keyword-unclassified
 * residual) into ACTUAL LoRA training data.
 *
 * getDomainCorpus + the per-domain tribal corpora are a POINTER/orchestration index --
 * each tip says "read the source PDF". This script closes the last leg: it reads the
 * real PDF text (pdftotext, the proven extractor batch-pdf-extract.mjs already uses) and
 * emits domain-tagged Alpaca {instruction, input, output} triples onto the SAME schema
 * the fleet LoRA builders use (vault-to-lora-dataset.mjs), so assemble-fleet-lora-corpus.mjs
 * folds them into the staged training corpus once registered in the inventory.
 *
 * SOURCE = the override sidecar's high-confidence rescued slugs (domains[] + conf>=0.7).
 * Multi-label: a spec feeding N domains emits N pairs (one per galaxy's LoRA).
 * GIGO-safe: a pair is emitted ONLY when the source PDF exists AND pdftotext yields
 * usable text (>= MIN_TEXT_CHARS of real words) -- never a pointer-only or empty row.
 * advisory:true -> the downstream trainer down-weights this heuristic raw-text grounding
 * vs hand-authored verified pairs (same trust contract as the templated machine-lathe set).
 *
 * Deterministic raw-text core (no Ollama) so it is fully testable + reproducible. The
 * quality upgrade (Ollama-distilled Q&A per page) is a documented follow-on; this core
 * lands real, registered, assemble-able rows first (R13 verifiable core).
 *
 * Usage:
 *   node scripts/domain-corpus-to-lora-dataset.mjs                 # dry-run: counts only
 *   node scripts/domain-corpus-to-lora-dataset.mjs --limit 10      # bound PDFs processed
 *   node scripts/domain-corpus-to-lora-dataset.mjs --out           # write the jsonl
 *   node scripts/domain-corpus-to-lora-dataset.mjs --pages 6 --out
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { extractSpecSignal } from "./reclassify-domain-feeders-ollama.mjs";
import { OVERRIDES_PATH, SPECS_DIR } from "./build-domain-knowledge-feeders.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");
export const SCHEMA_VERSION = "1.0.0";
export const DEFAULT_OUT = path.join(ROOT, "state", "shared", "lora", "domain-knowledge-dataset.jsonl");
export const SOURCE_TAG = "domain-corpus-to-lora-dataset.mjs";
export const MIN_TEXT_CHARS = 200;   // below this the extraction is garbage/empty -> skip (GIGO)
export const MAX_OUTPUT_CHARS = 2400; // bound the training `output` so a manual TOC dump stays sane
export const ADVISORY_WEIGHT = 0.5;
// distill-mode resume: a spec that fell to RAW FALLBACK (Ollama transiently down / VRAM-evicted)
// is RE-ATTEMPTED on the next run instead of being frozen as a raw row -- but capped so a
// deterministically-undistillable spec (answer always below the distill floor) still terminates to
// a raw row rather than retrying forever. (Observed: a chunk run during VRAM contention distilled
// 1/102; raw-fallback silently baked the failure in. R12 fail-loud, sibling of the OCR/tribal lessons.)
export const MAX_DISTILL_ATTEMPTS = Number(process.env.PRISM_DISTILL_MAX_ATTEMPTS) > 0
  ? Number(process.env.PRISM_DISTILL_MAX_ATTEMPTS) : 3;
// C0/C1 + DEL control bytes (excluding \t \n \r) -- pdftotext emits these on broken-encoding /
// scanned PDFs; they must NEVER reach a LoRA training row (tokenizer poison). GIGO.
export const CONTROL_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;
export const OLLAMA_GEN = (process.env.OLLAMA_URL || "http://127.0.0.1:11434") + "/api/generate";

function arg(name, dflt) {
  const i = process.argv.indexOf("--" + name);
  if (i < 0) return dflt;
  const v = process.argv[i + 1];
  return v && !v.startsWith("--") ? v : true;
}

// ---- pure: the high-confidence rescued slugs (domains[] + conf>=0.7) from the sidecar ----
export function loadRescued(overrides) {
  const decided = (overrides && overrides.decided) || {};
  const out = [];
  for (const [slug, v] of Object.entries(decided)) {
    if (v && Array.isArray(v.domains) && v.domains.length && Number(v.conf) >= 0.7) {
      out.push({ slug, domains: v.domains });
    }
  }
  return out;
}

// ---- pure: parse the resume cursor (one {slug,n,distilled,attempts,ts} JSON per line) ----
// Mirrors the OCR-loop resumable fix (reference_xray_ocr_corpus_resumable_multipage): a long
// --distill run streams per-entry; the cursor records every PROCESSED slug so a reaped/killed run
// resumes without redoing finished work. Returns a Map slug -> {distilled, attempts}: `distilled`
// is true once ANY attempt distilled the spec; `attempts` counts the cursor lines for that slug.
// Tolerates a torn final line (R12).
export function parseCursorState(cursorText) {
  const state = new Map();
  if (typeof cursorText !== "string") return state;
  for (const line of cursorText.split("\n")) {
    const s = line.trim();
    if (!s) continue;
    let o; try { o = JSON.parse(s); } catch { continue; } // torn last line -> skip (slug re-processes; safe)
    if (!o || typeof o.slug !== "string" || !o.slug) continue;
    const prev = state.get(o.slug) || { distilled: false, attempts: 0 };
    const didDistill = o.distilled === true || (typeof o.distilled === "number" && o.distilled > 0);
    state.set(o.slug, { distilled: prev.distilled || didDistill, attempts: prev.attempts + 1 });
  }
  return state;
}

// ---- pure: the set of slugs the cursor has SEEN (back-compat: raw --resume = processed-at-all = done) ----
export function parseCursorDoneSet(cursorText) {
  return new Set(parseCursorState(cursorText).keys());
}

// ---- pure: split rescued entries into {todo, skipped} given the cursor's done-slug set (raw resume) ----
export function partitionByResumeCursor(rescued, doneSet) {
  const set = doneSet instanceof Set ? doneSet : new Set();
  const todo = [], skipped = [];
  for (const e of Array.isArray(rescued) ? rescued : []) (set.has(e.slug) ? skipped : todo).push(e);
  return { todo, skipped };
}

// ---- pure: distill-aware split -- a spec is DONE only once it distilled OR hit the attempts cap;
// a raw-fallback spec under the cap is re-attempted (transient Ollama failure self-heals). ----
export function partitionForDistill(rescued, stateMap, maxAttempts = MAX_DISTILL_ATTEMPTS) {
  const m = stateMap instanceof Map ? stateMap : new Map();
  const todo = [], done = [];
  for (const e of Array.isArray(rescued) ? rescued : []) {
    const st = m.get(e.slug);
    const isDone = !!st && (st.distilled || st.attempts >= maxAttempts);
    (isDone ? done : todo).push(e);
  }
  return { todo, done };
}

// ---- pure: snapshot the live output to *.raw-baseline.jsonl BEFORE a fresh-cursor --distill truncate ----
// A fresh-cursor --distill run truncates the populated outPath (so distilled rows REPLACE the raw ones).
// If the long Ollama run is then reaped mid-flight, the live dataset is left at a regressed, partially-
// distilled count -- silently feeding a smaller LoRA corpus (the documented count-regression footgun).
// This snapshots the pre-truncate rows so a reaped run recovers with one `cp` (no PDF re-extraction), and
// makes the truncate LOUD not silent. Shrink-guard: never overwrite a LARGER existing baseline with a
// smaller current output (a 2nd fresh-cursor run over an already-partial dataset must not clobber the good
// baseline). Injected impls keep it pure + testable. Returns {snapshotted, baselinePath, rows, reason}.
export function snapshotRawBaselineBeforeTruncate(outPath, {
  readImpl = (p) => fs.readFileSync(p, "utf8"),
  writeImpl = (p, c) => fs.writeFileSync(p, c),
  existsImpl = (p) => fs.existsSync(p),
} = {}) {
  const baselinePath = String(outPath).replace(/\.jsonl$/i, "") + ".raw-baseline.jsonl";
  const countRows = (s) => s.split("\n").filter((l) => l.trim()).length; // trim: a whitespace-only line is not a data row
  if (!existsImpl(outPath)) return { snapshotted: false, baselinePath, rows: 0, reason: "no-existing-output" };
  try {
    const cur = readImpl(outPath);
    const curRows = countRows(cur);
    if (curRows === 0) return { snapshotted: false, baselinePath, rows: 0, reason: "empty-output" };
    if (existsImpl(baselinePath)) {
      const prevRows = countRows(readImpl(baselinePath));
      if (prevRows > curRows) return { snapshotted: false, baselinePath, rows: prevRows, reason: "kept-larger-baseline" };
    }
    writeImpl(baselinePath, cur);
    return { snapshotted: true, baselinePath, rows: curRows, reason: "snapshotted" };
  } catch (e) {
    // Best-effort safety net: a snapshot I/O failure (V8 utf8 512-MiB string cap on a huge growing
    // corpus, ENOSPC/read-only dir, TOCTOU unlink between existsImpl and readImpl) must NEVER block the
    // distill it protects -- fail SOFT so the caller proceeds to truncate (the live dataset is
    // gitignored/regenerable). Returns the reason; the caller logs it loud.
    return { snapshotted: false, baselinePath, rows: 0, reason: "snapshot-error", error: String((e && e.message) || e) };
  }
}

// ---- pure: is this pdftotext output usable as training grounding? ----
export function isUsableText(text) {
  if (typeof text !== "string") return false;
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length < MIN_TEXT_CHARS) return false;
  // must be mostly real words, not a wall of symbols/control chars (scanned-image garbage)
  const words = clean.match(/[A-Za-z]{3,}/g) || [];
  return words.length >= 30;
}

// ---- pure: normalize + bound the extracted PDF text for the training `output` field ----
export function cleanText(raw) {
  if (typeof raw !== "string") return "";
  let t = raw
    .replace(/\r/g, "")
    .replace(/\f/g, "\n")          // form-feed (page break) -> newline
    .replace(CONTROL_RE, " ")      // strip C0/C1/DEL bytes -> space (GIGO: no binary noise in a LoRA row)
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (t.length > MAX_OUTPUT_CHARS) t = t.slice(0, MAX_OUTPUT_CHARS).replace(/\s+\S*$/, "") + " ...";
  return t;
}

const DOMAIN_LABEL = {
  mill: "milling", lathe: "turning/lathe", wedm: "wire-EDM", "speed-feed": "speeds & feeds",
  "post-processor": "post-processor / G-code", quality: "quality / inspection", tooling: "cutting tools / tooling",
  grinding: "grinding", business: "quoting / business", safety: "shop safety",
};

// ---- pure: synthesize a domain-aware instruction from the spec title + domain ----
export function synthInstruction(domain, title, kind) {
  const label = DOMAIN_LABEL[domain] || domain;
  const t = (title || "a manufacturing reference document").replace(CONTROL_RE, " ").replace(/\.pdf$/i, "").replace(/\s+/g, " ").trim();
  return `Summarize the key ${label} guidance from the CNC manufacturing reference "${t}" (document kind: ${kind || "manual"}).`;
}

// ---- pure: build the Alpaca pairs for one rescued entry given its extracted text ----
// Multi-label: one pair per domain so each galaxy's LoRA receives the grounding.
export function toAlpacaPairs(entry, signal, text) {
  const cleaned = cleanText(text);
  if (!isUsableText(cleaned)) return [];
  const title = signal.title || entry.slug;
  return entry.domains.map((domain) => ({
    instruction: synthInstruction(domain, title, signal.kind),
    input: `domain=${domain} | kind=${signal.kind || "manual"} | source=${title}`,
    output: cleaned,
    schemaVersion: SCHEMA_VERSION,
    domain,
    slug: entry.slug,
    source: signal.source || "",
    spawned_by: SOURCE_TAG,
    advisory: true,
    weight: ADVISORY_WEIGHT,
  }));
}

// ---- distill (optional --distill): synthesize a grounded Q&A pair via local Ollama (R5) ----
// Better LoRA than a raw text dump: ONE focused instruction + a factual answer drawn ONLY from
// the source text. Falls back to the raw pair on ANY Ollama failure (GIGO-safe, never blocks).
export function distillPrompt(domain, title, text) {
  const label = DOMAIN_LABEL[domain] || domain;
  return `You are creating ONE instruction-tuning pair for a CNC manufacturing AI, grounded ONLY in the SOURCE TEXT (do not invent facts). Domain: ${label}. Document: "${title}".
Reply ONLY with JSON: {"instruction":"<a specific ${label} question a machinist/programmer would ask that THIS text answers>","answer":"<concise factual answer drawn ONLY from the source, 2-5 sentences>"}. No prose outside the JSON.
SOURCE TEXT:
${String(text || "").slice(0, 4000)}`;
}

// ---- pure: parse + GIGO-sanitize a distilled {instruction, answer} verdict ----
export function parseDistilled(raw) {
  let obj;
  try { obj = typeof raw === "string" ? JSON.parse(raw) : raw; } catch { return null; }
  if (!obj || typeof obj.instruction !== "string" || typeof obj.answer !== "string") return null;
  const instruction = obj.instruction.replace(CONTROL_RE, " ").replace(/\s+/g, " ").trim();
  const output = obj.answer.replace(CONTROL_RE, " ").replace(/[ \t]+/g, " ").trim();
  const words = output.match(/[A-Za-z]{3,}/g) || [];
  // distilled answers are short (2-5 sentences) so the 200-char raw floor does not apply; use a
  // distill-appropriate floor instead, but still reject one-liners / garbage.
  if (instruction.length < 12 || output.length < 60 || words.length < 12) return null;
  return { instruction, output };
}

// keep_alive keeps the qwen model RESIDENT between calls so a rapid distill run is not fast-failed
// by VRAM eviction (a competing GPU job evicts the model -> the next call returns a ~0.3s error,
// not 3-5s inference -> the burst-wedge that gave 1/102 distilled). In-call retry-with-backoff rides
// out a transient eviction / model-load so most specs distil in a SINGLE pass; the committed
// cross-pass MAX_DISTILL_ATTEMPTS self-heal is the backstop for a PERSISTENT wedge.
export const DISTILL_KEEP_ALIVE = process.env.PRISM_DISTILL_KEEP_ALIVE || "30m";
export const DISTILL_RETRIES = process.env.PRISM_DISTILL_RETRIES !== undefined && Number(process.env.PRISM_DISTILL_RETRIES) >= 0
  ? Number(process.env.PRISM_DISTILL_RETRIES) : 2;

// ---- I/O: one distill request (injectable fetch). Returns the parsed pair or null. ----
async function distillOnce(text, domain, title, { model, fetchImpl, ollama, timeoutMs }) {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const body = JSON.stringify({ model, prompt: distillPrompt(domain, title, text), stream: false, format: "json", keep_alive: DISTILL_KEEP_ALIVE, options: { temperature: 0.2 } });
    const r = await fetchImpl(ollama, { method: "POST", body, signal: ctrl.signal });
    const j = await r.json();
    return parseDistilled(j.response);
  } catch { return null; } finally { clearTimeout(to); }
}

// ---- I/O: distill one Q&A pair with keep_alive + retry-with-backoff (injectable for tests) ----
export async function distillViaOllama(text, domain, title, opts = {}) {
  const {
    model = "qwen2.5-coder:14b", fetchImpl = fetch, ollama = OLLAMA_GEN, timeoutMs = 60_000,
    retries = DISTILL_RETRIES, sleepImpl = (ms) => new Promise((r) => setTimeout(r, ms)),
  } = opts;
  let wait = 1200;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const r = await distillOnce(text, domain, title, { model, fetchImpl, ollama, timeoutMs });
    if (r) return r;
    if (attempt < retries) { await sleepImpl(wait); wait = Math.min(wait * 2, 8000); }
  }
  return null;
}

// Build the pairs for one entry: distilled (per domain) when distill=true AND Ollama succeeds,
// else the deterministic raw-text pairs. Always GIGO-safe (reuses toAlpacaPairs' text gate).
export async function buildPairsForEntry(entry, signal, text, { distill = false, model, fetchImpl, sleepImpl } = {}) {
  const raw = toAlpacaPairs(entry, signal, text);
  if (!distill || !raw.length) return raw;
  const out = [];
  for (const base of raw) {
    const d = await distillViaOllama(text, base.domain, signal.title || entry.slug, { model, fetchImpl, sleepImpl });
    out.push(d ? { ...base, instruction: d.instruction, output: d.output, distilled: true } : base);
  }
  return out;
}

// ---- I/O: read first N pages of a PDF as text (injectable spawn for tests) ----
export function pdfToText(pdfPath, pages = 6, spawnImpl = spawnSync) {
  if (!pdfPath || !fs.existsSync(pdfPath)) return "";
  try {
    const r = spawnImpl("pdftotext", ["-f", "1", "-l", String(pages), "-q", pdfPath, "-"], {
      encoding: "utf8", maxBuffer: 64 * 1024 * 1024, timeout: 60_000, windowsHide: true,
    });
    if (r.status !== 0 || !r.stdout) return "";
    return r.stdout;
  } catch { return ""; }
}

// ---- I/O: resolve a rescued slug -> its spec signal (title/kind/source) ----
export function resolveSignal(slug, specsDir = SPECS_DIR) {
  const f = path.join(specsDir, `AUTOGEN-EXTRACT-SPEC-${slug}.md`);
  if (!fs.existsSync(f)) return null;
  try { return extractSpecSignal(fs.readFileSync(f, "utf8")); } catch { return null; }
}

export async function main() {
  const limit = Number.isFinite(parseInt(arg("limit", ""), 10)) ? parseInt(arg("limit", ""), 10) : Infinity;
  const pages = Number.isFinite(parseInt(arg("pages", ""), 10)) ? parseInt(arg("pages", ""), 10) : 6;
  const write = arg("out", false) !== false;
  const distill = arg("distill", false) !== false;   // --distill -> Ollama Q&A (better LoRA than raw text)
  const distillModel = typeof arg("model", false) === "string" ? arg("model", false) : "qwen2.5-coder:14b";
  const outPath = typeof arg("out", false) === "string" ? arg("out", false) : DEFAULT_OUT;

  const overrides = fs.existsSync(OVERRIDES_PATH) ? JSON.parse(fs.readFileSync(OVERRIDES_PATH, "utf8")) : { decided: {} };
  const rescued = loadRescued(overrides);

  // Reap-resumable streaming: --distill is a long (~65 Ollama calls) run that the harness
  // auto-backgrounds and the fleet-reaper kills mid-flight -> a single end-write loses everything
  // (the OCR-loop burn class, reference_xray_ocr_corpus_resumable_multipage). When streaming, append
  // each entry's pairs to outPath + record the slug in a sibling cursor so a killed run resumes with
  // re-distill=0. Auto-on under --distill; also opt-in via --resume. The non-streaming raw path stays
  // byte-identical (back-compat with the existing tests + assemble-fleet-lora-corpus contract).
  const resume = write && (distill || arg("resume", false) !== false);
  const cursorPath = outPath + ".cursor.jsonl";
  let cursorState = new Map();
  if (resume) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    if (fs.existsSync(cursorPath)) cursorState = parseCursorState(fs.readFileSync(cursorPath, "utf8"));
    // fresh run (no prior cursor): truncate so distilled rows REPLACE any stale raw-text rows for the same 65 specs
    if (cursorState.size === 0) {
      const snap = snapshotRawBaselineBeforeTruncate(outPath);
      if (snap.snapshotted) console.warn(`WARN: --distill fresh cursor TRUNCATES ${path.relative(ROOT, outPath)} (${snap.rows} rows); snapshotted -> ${path.relative(ROOT, snap.baselinePath)}. If reaped mid-distill, recover: cp "${snap.baselinePath}" "${outPath}"`);
      else if (snap.reason === "kept-larger-baseline") console.warn(`WARN: kept existing larger raw-baseline (${snap.rows} rows) -- current ${path.relative(ROOT, outPath)} is smaller, not overwriting the baseline.`);
      else if (snap.reason === "snapshot-error") console.warn(`WARN: raw-baseline snapshot failed (${snap.error}) -- proceeding with truncate (live dataset is gitignored/regenerable).`);
      fs.writeFileSync(outPath, ""); fs.writeFileSync(cursorPath, "");
    }
  }
  // distill mode re-attempts raw-fallback specs (transient Ollama failure self-heals) until they
  // distil OR hit MAX_DISTILL_ATTEMPTS; raw --resume = processed-once-is-done.
  const todo = !resume ? rescued
    : distill ? partitionForDistill(rescued, cursorState).todo
    : partitionByResumeCursor(rescued, new Set(cursorState.keys())).todo;
  console.log(`rescued specs: ${rescued.length} | pages/pdf: ${pages} | limit: ${limit === Infinity ? "all" : limit}` +
    (resume ? ` | resume: ${rescued.length - todo.length} done, ${todo.length} to process${distill ? ` (retry-fallbacks, cap ${MAX_DISTILL_ATTEMPTS})` : ""}` : ""));

  const ts = new Date().toISOString();
  const pairs = [];
  let processed = 0, skippedNoSig = 0, skippedNoText = 0, distilledSpecs = 0, rawFallbackSpecs = 0, perDomain = {};
  for (const entry of todo) {
    if (processed >= limit) break;
    const signal = resolveSignal(entry.slug);
    if (!signal || !signal.source) { skippedNoSig++; continue; }
    processed++;
    const text = pdfToText(signal.source, pages);
    const emitted = await buildPairsForEntry(entry, signal, text, { distill, model: distillModel });
    if (!emitted.length) {
      skippedNoText++;
      // deterministically no-text PDF: force past the attempts cap so a resume never re-attempts it
      if (resume) fs.appendFileSync(cursorPath, JSON.stringify({ slug: entry.slug, n: 0, distilled: false, attempts: MAX_DISTILL_ATTEMPTS, ts }) + "\n");
      continue;
    }
    const distilledN = emitted.filter((p) => p.distilled === true).length;
    if (distilledN > 0) distilledSpecs++; else rawFallbackSpecs++;
    if (resume) {
      const priorAttempts = (cursorState.get(entry.slug) || { attempts: 0 }).attempts;
      // COMMIT rows only when the spec distilled OR exhausted its retries (a non-final raw fallback
      // writes NO rows -> the next resume retries it, and there is no stale raw row to later duplicate).
      const isFinal = !distill || distilledN > 0 || (priorAttempts + 1) >= MAX_DISTILL_ATTEMPTS;
      if (isFinal) {
        // per-entry durable append: one complete jsonl line per pair -> a kill never tears a row.
        // DATA-FIRST then cursor (at-least-once): a kill in the 1-syscall window re-processes the
        // slug (assemble-fleet-lora-corpus de-dupes raw by instruction+output) rather than dropping it.
        fs.appendFileSync(outPath, emitted.map((p) => JSON.stringify(p)).join("\n") + "\n");
        for (const p of emitted) { pairs.push(p); perDomain[p.domain] = (perDomain[p.domain] || 0) + 1; }
      }
      fs.appendFileSync(cursorPath, JSON.stringify({ slug: entry.slug, n: isFinal ? emitted.length : 0, distilled: distilledN, attempts: priorAttempts + 1, ts }) + "\n");
    } else {
      for (const p of emitted) { pairs.push(p); perDomain[p.domain] = (perDomain[p.domain] || 0) + 1; }
    }
  }

  console.log(`processed ${processed} PDFs | committed -> ${pairs.length} pairs | specs: distilled ${distilledSpecs}, raw-fallback ${rawFallbackSpecs}, no-text ${skippedNoText}, no-spec ${skippedNoSig}`);
  for (const [d, n] of Object.entries(perDomain).sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${d}`);
  if (write && resume) {
    const fileRows = fs.existsSync(outPath) ? fs.readFileSync(outPath, "utf8").split("\n").filter(Boolean) : [];
    const distilledRows = fileRows.filter((l) => /"distilled":\s*true/.test(l)).length;
    const finalState = fs.existsSync(cursorPath) ? parseCursorState(fs.readFileSync(cursorPath, "utf8")) : new Map();
    const pending = partitionForDistill(rescued, finalState).todo.length;
    console.log(`streamed ${pairs.length} new pairs -> ${path.relative(ROOT, outPath)} (${fileRows.length} total rows, ${distilledRows} distilled; ${finalState.size}/${rescued.length} specs cursored, ${pending} still pending distill)`);
    if (distill && pending > 0) console.log(`  -> re-run the same command to retry the ${pending} raw-fallback spec(s) (Ollama may have been contended)`);
    console.log(`register in build-fleet-training-corpus-inventory.mjs (kind:lora-training-jsonl) then: node scripts/assemble-fleet-lora-corpus.mjs --out`);
  } else if (write) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, pairs.map((p) => JSON.stringify(p)).join("\n") + (pairs.length ? "\n" : ""));
    console.log(`wrote ${pairs.length} pairs -> ${path.relative(ROOT, outPath)}`);
    console.log(`register in build-fleet-training-corpus-inventory.mjs (kind:lora-training-jsonl) then: node scripts/assemble-fleet-lora-corpus.mjs --out`);
  } else {
    console.log(`dry-run (no write). Re-run with --out to emit the jsonl.`);
  }
  return 0;
}

const isMain = (() => { try { return process.argv[1] && path.normalize(fs.realpathSync(process.argv[1])) === path.normalize(fileURLToPath(import.meta.url)); } catch { return false; } })();
if (isMain) main().then((c) => process.exit(c || 0)).catch((e) => { console.error(e); process.exit(1); });
