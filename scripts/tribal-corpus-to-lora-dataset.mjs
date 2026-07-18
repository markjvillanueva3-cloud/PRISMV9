#!/usr/bin/env node
/**
 * tribal-corpus-to-lora-dataset.mjs  (slot:papa 2026-06-25)
 *
 * SIBLING of domain-corpus-to-lora-dataset.mjs. The per-domain `state/shared/*-tribal-corpus.jsonl`
 * files (cam 809, tooling 313, mill 71, post-processor 63, lathe 18, cad 12, speed-feed 8,
 * database-expansion 7, blueprint-vision 7, wedm 2 -- ~1310 entries) are POINTER tips: every
 * `tip` says "read AUTOGEN-EXTRACT-SPEC-<slug>.md ... then ingest source file". So they are
 * absent from LoRA training entirely -- feeding the raw pointer text would be GIGO (it teaches
 * the model to say "read X.md", not the actual knowledge).
 *
 * This closes that leg the way the rescued-residual domain-corpus converter closed its own: read
 * each tribal entry's REAL `source` PDF (pdftotext) and emit domain-tagged Alpaca
 * {instruction, input, output} pairs onto the SAME schema the fleet LoRA builders use, so
 * assemble-fleet-lora-corpus.mjs folds them in once registered in the inventory.
 *
 * It REUSES the domain-corpus converter's proven primitives (pdfToText, buildPairsForEntry =
 * distill+GIGO-gate, parseCursorState/partitionForDistill = reap-resumable cursor) -- NO
 * duplication of the distill/GIGO/resume logic (R8/dedup). This driver only adapts the tribal
 * jsonl shape -> the {entry, signal} contract those primitives expect, and streams with a cursor.
 *
 * OVERLAP-GUARD: a (slug, domain) pair already emitted by domain-knowledge-dataset.jsonl is
 * skipped, so the two converters are strictly additive (R16 fit-the-whole, no duplicate row).
 * cad/cam are definitionally non-overlapping (domain-knowledge-lora is the 10 NON-cadcam domains)
 * -- the guard is the safety net for the other 8 domains when --domains is widened.
 *
 * GIGO-safe: a pair is emitted ONLY when the source PDF exists AND pdftotext yields usable text
 * (>= MIN_TEXT_CHARS real words) -- never a pointer-only / empty row. advisory:true -> the trainer
 * down-weights this heuristic grounding vs hand-authored verified pairs.
 *
 * Usage:
 *   node scripts/tribal-corpus-to-lora-dataset.mjs                       # dry-run (cad,cam): counts only
 *   node scripts/tribal-corpus-to-lora-dataset.mjs --limit 5             # bound PDFs processed
 *   node scripts/tribal-corpus-to-lora-dataset.mjs --out                 # write the jsonl (raw text core)
 *   node scripts/tribal-corpus-to-lora-dataset.mjs --distill --out       # Ollama-distilled Q&A (better LoRA), resumable
 *   node scripts/tribal-corpus-to-lora-dataset.mjs --domains all --distill --out   # all 10 tribal corpora
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ROOT, SCHEMA_VERSION, MAX_DISTILL_ATTEMPTS,
  pdfToText, buildPairsForEntry,
  parseCursorState, partitionForDistill, partitionByResumeCursor,
  snapshotRawBaselineBeforeTruncate,
} from "./domain-corpus-to-lora-dataset.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const TRIBAL_DIR = path.join(ROOT, "state", "shared");
export const DEFAULT_OUT = path.join(ROOT, "state", "shared", "lora", "tribal-knowledge-dataset.jsonl");
export const DOMAIN_KNOWLEDGE_OUT = path.join(ROOT, "state", "shared", "lora", "domain-knowledge-dataset.jsonl");
export const SOURCE_TAG = "tribal-corpus-to-lora-dataset.mjs";
// the operator's tick #2b set: the two tribal corpora the non-cadcam domain-knowledge-lora never covers.
export const DEFAULT_DOMAINS = ["cad", "cam"];

function arg(name, dflt) {
  const i = process.argv.indexOf("--" + name);
  if (i < 0) return dflt;
  const v = process.argv[i + 1];
  return v && !v.startsWith("--") ? v : true;
}

// ---- pure: list the *-tribal-corpus.jsonl files, optionally filtered to a domain set ----
// `domains` null/empty -> DEFAULT_DOMAINS (cad,cam); "all" (or ["all"]) -> every corpus file.
export function tribalCorpusFiles(dir = TRIBAL_DIR, domains = null, readdirImpl = fs.readdirSync) {
  let files;
  try { files = readdirImpl(dir); } catch { return []; }
  const want = !domains || (Array.isArray(domains) && domains.length === 0) ? DEFAULT_DOMAINS : domains;
  const all = want === "all" || (Array.isArray(want) && want.includes("all"));
  const set = all ? null : new Set(Array.isArray(want) ? want : [want]);
  return files
    .filter((f) => /-tribal-corpus\.jsonl$/.test(f))
    .map((f) => ({ domain: f.replace(/-tribal-corpus\.jsonl$/, ""), path: path.join(dir, f) }))
    .filter((e) => !set || set.has(e.domain))
    .sort((a, b) => a.domain.localeCompare(b.domain));
}

// ---- pure: one tribal-corpus row -> the {slug, domain, signal} shape the primitives expect ----
// tribal row: {domain, slug, id, kind, source (PDF path, may be windows-backslashed), tip, ...}
// Returns null on a structurally-unusable row (no slug / no domain / no source) -- GIGO at the gate.
export function tribalRowToAdapter(o) {
  if (!o || typeof o.slug !== "string" || !o.slug) return null;
  if (typeof o.domain !== "string" || !o.domain) return null;
  const source = typeof o.source === "string" ? o.source.split("\\").join("/") : "";
  if (!source) return null;
  const title = (typeof o.id === "string" && o.id) ? o.id : o.slug;
  return { slug: o.slug, domain: o.domain, signal: { title, kind: o.kind || "manual", source } };
}

// ---- pure: the (slug|domain) keys already covered by domain-knowledge-dataset.jsonl ----
// So a tribal pair never duplicates a domain-corpus pair for the same source+galaxy (R16).
export function loadOverlapKeys(datasetPath = DOMAIN_KNOWLEDGE_OUT, readImpl = fs.readFileSync) {
  const keys = new Set();
  let txt; try { txt = readImpl(datasetPath, "utf8"); } catch { return keys; }
  for (const line of txt.split("\n")) {
    const s = line.trim(); if (!s) continue;
    let o; try { o = JSON.parse(s); } catch { continue; }
    if (o && typeof o.slug === "string" && typeof o.domain === "string") keys.add(o.slug + "|" + o.domain);
  }
  return keys;
}

// ---- pure: read the tribal corpus files -> GROUPED, overlap-guarded adapter entries ----
// Grouped by slug into {entry:{slug,domains[]}, signal} (matches the domain-corpus multi-domain
// entry shape exactly, so the slug-keyed cursor + buildPairsForEntry multi-label both work
// unchanged). A (slug,domain) in overlapKeys is dropped; a slug whose every domain is overlapped
// is dropped entirely. Within the tribal corpora the same (slug,domain) seen twice is de-duped.
export function loadTribalEntries(files, { overlapKeys = new Set(), readImpl = fs.readFileSync } = {}) {
  const bySlug = new Map(); // slug -> { slug, domains:Set, signal }
  for (const fEntry of Array.isArray(files) ? files : []) {
    let txt; try { txt = readImpl(fEntry.path, "utf8"); } catch { continue; }
    for (const line of txt.split("\n")) {
      const s = line.trim(); if (!s) continue;
      let o; try { o = JSON.parse(s); } catch { continue; }
      const a = tribalRowToAdapter(o);
      if (!a) continue;
      if (overlapKeys.has(a.slug + "|" + a.domain)) continue;  // strictly additive vs domain-knowledge-lora
      const g = bySlug.get(a.slug) || { slug: a.slug, domains: new Set(), signal: a.signal };
      g.domains.add(a.domain);
      if (!g.signal.source && a.signal.source) g.signal = a.signal;
      bySlug.set(a.slug, g);
    }
  }
  return [...bySlug.values()]
    .filter((g) => g.domains.size > 0)
    .map((g) => ({ entry: { slug: g.slug, domains: [...g.domains].sort() }, signal: g.signal }));
}

// ---- pure: a one-line progress string for a long --distill run ----
// A full --distill run makes ~one Ollama call per text-bearing entry and prints ONLY an end summary,
// so it is SILENT for many minutes -- un-monitorable AND prone to an idle-output watchdog/reaper kill
// mid-flight (observed: a foreground full run was killed ~5min in at 69/398). Emitting a periodic
// progress line to stderr keeps the run observable + non-silent (the resumable cursor still owns
// completion across reaped runs). `every` entries between lines; env PRISM_TRIBAL_PROGRESS_EVERY.
export const PROGRESS_EVERY = Number(process.env.PRISM_TRIBAL_PROGRESS_EVERY) > 0
  ? Number(process.env.PRISM_TRIBAL_PROGRESS_EVERY) : 25;
export function progressLine(processed, total, distilled, rawFallback, noText) {
  const pct = total > 0 ? Math.round((processed / total) * 100) : 0;
  return `  distill progress: ${processed}/${total} entries (${pct}%) -- distilled ${distilled}, raw-fallback ${rawFallback}, no-text ${noText}`;
}

// ---- pure: re-tag a buildPairsForEntry result with THIS converter's provenance ----
// toAlpacaPairs hardcodes the domain-corpus SOURCE_TAG; override so the fleet can attribute a
// tribal-sourced row (and the assemble step's provenance stays honest). Behaviour-neutral.
export function retagTribal(pairs) {
  return (Array.isArray(pairs) ? pairs : []).map((p) => ({ ...p, spawned_by: SOURCE_TAG, from: "tribal-corpus" }));
}

// ---- pure: the resume-cursor path, keyed by the DOMAIN SET being processed ----
// The reused cursor is keyed on slug ALONE, but a single slug can carry different domains across
// corpora (a CIMCO post PDF lands in BOTH cam and post-processor). If a wider `--domains all` run
// reused the cad/cam run's cursor, partitionForDistill would skip every already-cursored slug and
// SILENTLY DROP its newly-grouped labels (mill/post-proc/...). Keying the cursor by the domain-set
// makes each distinct `--domains` invocation resume independently: a fresh `--domains all` run gets
// its own empty cursor -> truncates + rebuilds the COMPLETE dataset (cad/cam included), no silent
// loss. Default (cad,cam) and explicit `--domains cad,cam` share one cursor (same sorted set).
export function cursorPathFor(outPath, domainsArg) {
  const key = (Array.isArray(domainsArg) && domainsArg.length ? [...domainsArg].sort() : DEFAULT_DOMAINS).join("-");
  return outPath + "." + key + ".cursor.jsonl";
}

// ---- pure: domains in the existing output that THIS run's set would DISCARD on a fresh truncate ----
// R12 (never silently clobber): the shared outPath is truncated on a fresh-cursor run so distilled rows
// REPLACE raw. But a NARROWER set re-run after a populated wider run (e.g. cad/cam after --domains all)
// would silently shrink the dataset to cad/cam-only. This returns the at-risk domains so main() warns
// LOUDLY before truncating. (Recoverable -- a fresh `--domains all` rebuilds it -- but never silent.)
export function clobberLostDomains(existingRows, domainsArg) {
  if (Array.isArray(domainsArg) && domainsArg.includes("all")) return []; // "all" is a superset of every domain
  const set = new Set(Array.isArray(domainsArg) && domainsArg.length ? domainsArg : DEFAULT_DOMAINS);
  const lost = new Set();
  for (const line of Array.isArray(existingRows) ? existingRows : []) {
    const s = typeof line === "string" ? line.trim() : ""; if (!s) continue;
    let o; try { o = JSON.parse(s); } catch { continue; }
    if (o && typeof o.domain === "string" && !set.has(o.domain)) lost.add(o.domain);
  }
  return [...lost].sort();
}

export async function main() {
  const limit = Number.isFinite(parseInt(arg("limit", ""), 10)) ? parseInt(arg("limit", ""), 10) : Infinity;
  const pages = Number.isFinite(parseInt(arg("pages", ""), 10)) ? parseInt(arg("pages", ""), 10) : 6;
  const write = arg("out", false) !== false;
  const distill = arg("distill", false) !== false;
  const distillModel = typeof arg("model", false) === "string" ? arg("model", false) : "qwen2.5-coder:14b";
  const outPath = typeof arg("out", false) === "string" ? arg("out", false) : DEFAULT_OUT;
  const domainsArg = typeof arg("domains", false) === "string" ? arg("domains", false).split(",").map((d) => d.trim()).filter(Boolean) : null;

  const files = tribalCorpusFiles(TRIBAL_DIR, domainsArg);
  const overlapKeys = loadOverlapKeys();
  const entries = loadTribalEntries(files, { overlapKeys });

  // Reap-resumable streaming (same contract as domain-corpus): --distill is a long Ollama run the
  // harness backgrounds + the reaper can kill mid-flight -> stream each entry's pairs + a cursor line
  // so a killed run resumes with re-distill=0. The non-streaming raw path stays single-write.
  const resume = write && (distill || arg("resume", false) !== false);
  const cursorPath = cursorPathFor(outPath, domainsArg);  // domain-set-keyed: a wider --domains run resumes independently (no silent label drop)
  let cursorState = new Map();
  if (resume) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    if (fs.existsSync(cursorPath)) cursorState = parseCursorState(fs.readFileSync(cursorPath, "utf8"));
    if (cursorState.size === 0) {
      // R12 loud-clobber guard: a fresh narrower-set run truncates the shared outPath -- warn if that
      // would discard existing rows from domains this run does not cover (reverse-order misuse).
      if (fs.existsSync(outPath)) {
        const lost = clobberLostDomains(fs.readFileSync(outPath, "utf8").split("\n"), domainsArg);
        if (lost.length) console.warn(`WARN (R12): truncating ${path.relative(ROOT, outPath)} discards existing rows from domains [${lost.join(", ")}] not in this run's set -- re-run with --domains all to rebuild the full dataset.`);
      }
      const snap = snapshotRawBaselineBeforeTruncate(outPath);
      if (snap.snapshotted) console.warn(`WARN: --distill fresh cursor TRUNCATES ${path.relative(ROOT, outPath)} (${snap.rows} rows); snapshotted -> ${path.relative(ROOT, snap.baselinePath)}. If reaped mid-distill, recover: cp "${snap.baselinePath}" "${outPath}"`);
      else if (snap.reason === "kept-larger-baseline") console.warn(`WARN: kept existing larger raw-baseline (${snap.rows} rows) -- current is smaller, not overwriting the baseline.`);
      else if (snap.reason === "snapshot-error") console.warn(`WARN: raw-baseline snapshot failed (${snap.error}) -- proceeding with truncate (live dataset is gitignored/regenerable).`);
      fs.writeFileSync(outPath, ""); fs.writeFileSync(cursorPath, "");
    }
  }
  const todo = !resume ? entries
    : distill ? partitionForDistill(entries.map((e) => e.entry), cursorState).todo
      .map((t) => entries.find((e) => e.entry.slug === t.slug)).filter(Boolean)
    : partitionByResumeCursor(entries.map((e) => e.entry), new Set(cursorState.keys())).todo
      .map((t) => entries.find((e) => e.entry.slug === t.slug)).filter(Boolean);

  console.log(`tribal corpora: ${files.map((f) => f.domain).join(",") || "(none)"} | entries: ${entries.length}` +
    ` | overlap-skipped vs domain-knowledge: keys=${overlapKeys.size}` +
    ` | pages/pdf: ${pages} | limit: ${limit === Infinity ? "all" : limit}` +
    (resume ? ` | resume: ${entries.length - todo.length} done, ${todo.length} to process${distill ? ` (cap ${MAX_DISTILL_ATTEMPTS})` : ""}` : ""));

  const ts = new Date().toISOString();
  const pairs = [];
  let processed = 0, skippedNoText = 0, distilledSpecs = 0, rawFallbackSpecs = 0, perDomain = {};
  for (const e of todo) {
    if (processed >= limit) break;
    processed++;
    // keep a long --distill run observable + non-silent (idle-kill resistance); cursor owns completion
    if (distill && processed % PROGRESS_EVERY === 0) console.error(progressLine(processed, todo.length, distilledSpecs, rawFallbackSpecs, skippedNoText));
    const text = pdfToText(e.signal.source, pages);
    const emitted = retagTribal(await buildPairsForEntry(e.entry, e.signal, text, { distill, model: distillModel }));
    if (!emitted.length) {
      skippedNoText++;
      if (resume) fs.appendFileSync(cursorPath, JSON.stringify({ slug: e.entry.slug, n: 0, distilled: false, attempts: MAX_DISTILL_ATTEMPTS, ts }) + "\n");
      continue;
    }
    const distilledN = emitted.filter((p) => p.distilled === true).length;
    if (distilledN > 0) distilledSpecs++; else rawFallbackSpecs++;
    if (resume) {
      const priorAttempts = (cursorState.get(e.entry.slug) || { attempts: 0 }).attempts;
      const isFinal = !distill || distilledN > 0 || (priorAttempts + 1) >= MAX_DISTILL_ATTEMPTS;
      if (isFinal) {
        fs.appendFileSync(outPath, emitted.map((p) => JSON.stringify(p)).join("\n") + "\n");
        for (const p of emitted) { pairs.push(p); perDomain[p.domain] = (perDomain[p.domain] || 0) + 1; }
      }
      fs.appendFileSync(cursorPath, JSON.stringify({ slug: e.entry.slug, n: isFinal ? emitted.length : 0, distilled: distilledN, attempts: priorAttempts + 1, ts }) + "\n");
    } else {
      for (const p of emitted) { pairs.push(p); perDomain[p.domain] = (perDomain[p.domain] || 0) + 1; }
    }
  }

  console.log(`processed ${processed} PDFs | committed -> ${pairs.length} pairs | specs: distilled ${distilledSpecs}, raw-fallback ${rawFallbackSpecs}, no-text ${skippedNoText}`);
  for (const [d, n] of Object.entries(perDomain).sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${d}`);
  if (write && resume) {
    const fileRows = fs.existsSync(outPath) ? fs.readFileSync(outPath, "utf8").split("\n").filter(Boolean) : [];
    const distilledRows = fileRows.filter((l) => /"distilled":\s*true/.test(l)).length;
    const finalState = fs.existsSync(cursorPath) ? parseCursorState(fs.readFileSync(cursorPath, "utf8")) : new Map();
    const pending = partitionForDistill(entries.map((e) => e.entry), finalState).todo.length;
    console.log(`streamed ${pairs.length} new pairs -> ${path.relative(ROOT, outPath)} (${fileRows.length} total rows, ${distilledRows} distilled; ${finalState.size}/${entries.length} entries cursored, ${pending} still pending distill)`);
    if (distill && pending > 0) console.log(`  -> re-run to retry the ${pending} raw-fallback entr(y/ies) (Ollama may have been contended)`);
    console.log(`registered as 'tribal-knowledge-lora' in build-fleet-training-corpus-inventory.mjs -> node scripts/assemble-fleet-lora-corpus.mjs --out`);
  } else if (write) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, pairs.map((p) => JSON.stringify(p)).join("\n") + (pairs.length ? "\n" : ""));
    console.log(`wrote ${pairs.length} pairs -> ${path.relative(ROOT, outPath)}`);
  } else {
    console.log(`dry-run (no write). Re-run with --out (raw) or --distill --out (Q&A) to emit the jsonl.`);
  }
  return 0;
}

const isMain = (() => { try { return process.argv[1] && path.normalize(fs.realpathSync(process.argv[1])) === path.normalize(fileURLToPath(import.meta.url)); } catch { return false; } })();
if (isMain) main().then((c) => process.exit(c || 0)).catch((e) => { console.error(e); process.exit(1); });
