#!/usr/bin/env node
/**
 * assemble-fleet-lora-corpus.mjs -- the MANIFEST CONSUMER (U-LORA-CORPUS-ASSEMBLE,
 * slot:india 2026-06-10).
 *
 * THE DORMANCY THIS CLOSES: the vault -> LoRA chain dead-ended at the manifest.
 * scripts/vault-to-lora-dataset.mjs PRODUCES Alpaca-triple datasets and
 * build-fleet-training-corpus-inventory.mjs REGISTERS them as
 * kind:'lora-training-jsonl' sources -- but NOTHING read the manifest to actually
 * assemble a training set (verified by grep: only the producer + the manifest
 * builder + the unrelated export-ledger-lora family touched these). This script
 * is that missing consumer: it reads the fleet-training corpus inventory, unions
 * every PRESENT lora-training-jsonl source into ONE deduped, weighted, staged
 * training corpus, and flags `trainingReady` once it clears a row threshold.
 *
 * Staging contract mirrors scripts/export-ledger-lora.mjs (U-CLEANUP-B12):
 * read-only assembly, NOT fine-tuning. The actual LoRA fine-tune (GPU, Blackwell)
 * is the explicit downstream operator step that consumes THIS staged corpus.
 *
 * Trust weighting (R7 -- the two signals are kept distinct, not blended): a
 * source whose id/description marks it advisory (the galaxy-synthesis brains, which
 * are LLM-distilled/mustHumanVerify) gets ADVISORY_WEIGHT; hand-authored verified
 * doctrine + parameter sets get VERIFIED_WEIGHT. Each emitted row carries its
 * `weight` + `source` + `advisory` so a downstream trainer can up/down-weight or
 * filter, never confusing advisory synthesis with verified doctrine.
 *
 * Output schema (each combined row): { instruction, input, output, weight,
 * source, advisory } -- a superset of the Alpaca triple; a trainer that only
 * wants the triple ignores the extra keys.
 *
 * Usage:
 *   node scripts/assemble-fleet-lora-corpus.mjs            # dry-run: counts + per-source breakdown
 *   node scripts/assemble-fleet-lora-corpus.mjs --json     # machine-readable summary
 *   node scripts/assemble-fleet-lora-corpus.mjs --out      # write combined JSONL + stats sidecar
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const INVENTORY_PATH = path.join(ROOT, "state", "shared", "training", "fleet-training-corpus-inventory.json");
const DEFAULT_OUT = path.join(ROOT, "state", "shared", "lora", "fleet-lora-combined.jsonl");

/**
 * The stats sidecar always sits NEXT TO the corpus it describes:
 * <name>.jsonl -> <name>.stats.json. Deriving it from the (possibly custom) --out
 * path keeps the pair together -- a fixed stats path would orphan the sidecar at
 * the default location when --out points elsewhere. [closes 3-of-3 A-P1]
 */
export function deriveStatsPath(outPath) {
  return String(outPath || DEFAULT_OUT).replace(/\.jsonl$/i, "") + ".stats.json";
}

// Mirror export-ledger-lora.mjs: a staged corpus is `trainingReady` only once it
// clears a row floor -- below it the artifact is staging, not a training input.
const MIN_TRAINING_ROWS = 1000;
const VERIFIED_WEIGHT = 1.0;
const ADVISORY_WEIGHT = 0.5;

/**
 * Trust weight for a manifest source. Advisory/LLM-distilled corpora (the
 * galaxy-synthesis brains) are down-weighted; everything else is verified.
 * Detected from the source id/description so no manifest schema change is needed.
 */
export function sourceWeight(source) {
  // The explicit manifest `advisory` flag (set in build-fleet-training-corpus-
  // inventory.mjs SOURCES) is AUTHORITATIVE. Only when it is absent do we fall back
  // to a heuristic -- and that heuristic matches the CONTROLLED source `id` only,
  // never the free-text `description` (a verified source whose description merely
  // contains "synthesis" must not be silently down-weighted). [closes 3-of-3 C-P2]
  if (typeof (source && source.advisory) === "boolean") {
    return source.advisory ? ADVISORY_WEIGHT : VERIFIED_WEIGHT;
  }
  const id = String((source && source.id) || "").toLowerCase();
  return /advisor|synthesis/.test(id) ? ADVISORY_WEIGHT : VERIFIED_WEIGHT;
}

export function isAdvisorySource(source) {
  return sourceWeight(source) < VERIFIED_WEIGHT;
}

/**
 * Load the fleet-training corpus inventory. Fails LOUD (R12) if absent -- the
 * manifest is the contract; a missing one means the builder never ran, which the
 * operator must see, not a silent empty corpus.
 */
export function loadInventory(p = INVENTORY_PATH, readImpl = fs.readFileSync) {
  let raw;
  try {
    raw = readImpl(p, "utf8");
  } catch {
    throw new Error(
      `fleet-training-corpus-inventory not found at ${p} -- run: node scripts/build-fleet-training-corpus-inventory.mjs`,
    );
  }
  return JSON.parse(raw);
}

/** Select the PRESENT lora-training-jsonl sources from the inventory. */
export function selectLoraSources(inventory) {
  const sources = (inventory && inventory.sources) || [];
  return sources.filter((s) => s && s.kind === "lora-training-jsonl" && s.status === "present");
}

/**
 * Parse JSONL text into valid Alpaca rows. A row is valid only with non-empty
 * string instruction + output (input optional); anything else is counted invalid
 * and skipped (never silently emitted as a degenerate pair).
 */
/**
 * Normalize one parsed row to the Alpaca shape, accepting BOTH conventions:
 *   - native  {instruction, input?, output}            (vault-feedback / galaxy-synthesis / bridge)
 *   - aliased {prompt, completion}                      (the OpenAI-fine-tune convention;
 *             e.g. wiki-canonical-to-training-pairs.mjs emits prompt/completion -- the SAME
 *             instruction-tuning signal under different keys). instruction<-prompt, output<-completion.
 * The native keys win when both are present. Returns null when neither convention yields a
 * non-empty instruction AND output (counted invalid by the caller, never emitted as a
 * degenerate pair). Pure -> hermetically testable.
 */
export function normalizeAlpacaRow(o) {
  if (!o || typeof o !== "object") return null;
  const instruction =
    typeof o.instruction === "string" && o.instruction.trim() ? o.instruction
    : typeof o.prompt === "string" && o.prompt.trim() ? o.prompt
    : null;
  const output =
    typeof o.output === "string" && o.output.trim() ? o.output
    : typeof o.completion === "string" && o.completion.trim() ? o.completion
    : null;
  if (!instruction || !output) return null;
  const row = { instruction, input: typeof o.input === "string" ? o.input : "", output };
  // Preserve a structured galaxy tag if present (galaxy-synthesis rows carry it; verified-
  // feedback + wiki-canonical rows do not) so per-galaxy slicing survives the union.
  if (typeof o.galaxy === "string" && o.galaxy) row.galaxy = o.galaxy;
  return row;
}

export function parseAlpacaJsonl(text) {
  const rows = [];
  let invalid = 0;
  for (const line of String(text || "").split("\n")) {
    const t = line.trim();
    if (!t) continue;
    let o;
    try { o = JSON.parse(t); } catch { invalid++; continue; }
    const row = normalizeAlpacaRow(o);
    if (!row) { invalid++; continue; }
    rows.push(row);
  }
  return { rows, invalid };
}

function rowKey(r) {
  return JSON.stringify([r.instruction, r.output]);
}

/**
 * Assemble the combined corpus from an inventory object. Reads each present
 * lora-training-jsonl source, dedupes across ALL sources by (instruction,output),
 * tags each row with its source weight/advisory flag. Pure w.r.t. the injected
 * readImpl so it is hermetically testable (no disk).
 */
export function assembleCorpus(inventory, { readImpl = fs.readFileSync } = {}) {
  const selected = selectLoraSources(inventory);
  const seen = new Set();
  const rows = [];
  const bySource = {};
  let duplicates = 0;
  let invalidTotal = 0;
  for (const src of selected) {
    const p = src.resolvedPath || src.path;
    let text = "";
    try { text = readImpl(p, "utf8"); }
    catch { bySource[src.id] = { error: "read-failed", rows: 0, added: 0, duplicates: 0, invalid: 0 }; continue; }
    const { rows: parsed, invalid } = parseAlpacaJsonl(text);
    invalidTotal += invalid;
    const weight = sourceWeight(src);
    const advisory = isAdvisorySource(src);
    let added = 0;
    let dups = 0;
    for (const r of parsed) {
      const k = rowKey(r);
      if (seen.has(k)) { dups++; duplicates++; continue; }
      seen.add(k);
      const row = { instruction: r.instruction, input: r.input, output: r.output, weight, source: src.id, advisory };
      if (r.galaxy) row.galaxy = r.galaxy; // carry the per-galaxy track field through the union
      rows.push(row);
      added++;
    }
    bySource[src.id] = { rows: parsed.length, added, duplicates: dups, invalid, weight, advisory };
  }
  const totalRows = rows.length;
  const advisoryRows = rows.reduce((n, r) => n + (r.advisory ? 1 : 0), 0);
  // Per-galaxy coverage: how many rows carry each galaxy tag (rows without a tag --
  // the cross-cutting verified-feedback doctrine -- are not counted here). This is
  // the "no dormant nodes across all galaxies" verification surface: a galaxy with
  // 0 rows has no training signal.
  const byGalaxy = {};
  for (const r of rows) { if (r.galaxy) byGalaxy[r.galaxy] = (byGalaxy[r.galaxy] || 0) + 1; }
  return {
    rows,
    bySource,
    byGalaxy,
    galaxiesCovered: Object.keys(byGalaxy).length,
    sources: selected.length,
    totalRows,
    verifiedRows: totalRows - advisoryRows,
    advisoryRows,
    duplicates,
    invalid: invalidTotal,
    minTrainingRows: MIN_TRAINING_ROWS,
    trainingReady: totalRows >= MIN_TRAINING_ROWS,
  };
}

function parseArgs(argv) {
  const out = { json: false, write: false, outPath: DEFAULT_OUT };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") out.json = true;
    else if (a === "--out") { out.write = true; const nxt = argv[i + 1]; if (nxt && !nxt.startsWith("--")) out.outPath = argv[++i]; }
    else if (a === "--help" || a === "-h") {
      console.error("usage: assemble-fleet-lora-corpus [--json] [--out [<path.jsonl>]]");
      process.exit(0);
    }
  }
  return out;
}

function writeJsonlAtomic(outPath, rows) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const lines = rows.map((r) => JSON.stringify(r));
  const tmp = `${outPath}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, lines.join("\n") + (rows.length ? "\n" : ""), "utf8");
  fs.renameSync(tmp, outPath);
}

/**
 * Clobber-guard (slot:zulu 2026-06-12): REFUSE to overwrite an existing
 * populated combined corpus with a >50% shrink (or an empty assembly). Live
 * near-miss: the 2026-06-12T11:26 inventory regen left 0 'present'
 * lora-training-jsonl sources, so a --out run would have written 0 rows over
 * the 1219-row LEG-B gate artifact -- the exact fail-open class that destroyed
 * the tribal index (8bf1873577; guard pattern from a3e6d3ca97). Bypass for an
 * intentional shrink: PRISM_LORA_ALLOW_SHRINK=1.
 */
export function assertNoClobber(outPath, newRowCount, fsImpl = fs, env = process.env) {
  if (env.PRISM_LORA_ALLOW_SHRINK === "1") return;
  let existing = 0;
  try {
    existing = fsImpl.readFileSync(outPath, "utf8").split("\n").filter((l) => l.trim() !== "").length;
  } catch { return; } // no existing file -> nothing to clobber
  if (existing > 0 && newRowCount < existing * 0.5) {
    throw new Error(
      `REFUSING to write ${newRowCount} rows over the existing ${existing}-row ${outPath} ` +
      `(>50% shrink = clobber-class). Likely cause: the inventory has no 'present' ` +
      `lora-training-jsonl sources -- rerun build-fleet-training-corpus-inventory.mjs and re-check. ` +
      `Intentional shrink: PRISM_LORA_ALLOW_SHRINK=1.`,
    );
  }
}

export function main() {
  const opts = parseArgs(process.argv.slice(2));
  const inventory = loadInventory();
  const result = assembleCorpus(inventory);

  if (opts.json) {
    const { rows, ...summary } = result;
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(`Sources: ${result.sources} | combined rows: ${result.totalRows} (verified ${result.verifiedRows} / advisory ${result.advisoryRows}) | dedup-dropped: ${result.duplicates} | invalid-skipped: ${result.invalid}`);
    console.log(`training_ready: ${result.trainingReady} (floor ${result.minTrainingRows}) | galaxies covered: ${result.galaxiesCovered}`);
    for (const [id, s] of Object.entries(result.bySource)) {
      console.log(`  - ${id}: ${s.error ? s.error : `${s.added} added (w=${s.weight}${s.advisory ? ", advisory" : ""}, ${s.duplicates} dup, ${s.invalid} invalid)`}`);
    }
  }

  if (opts.write) {
    assertNoClobber(opts.outPath, result.rows.length);
    writeJsonlAtomic(opts.outPath, result.rows);
    const statsPath = deriveStatsPath(opts.outPath);
    const { rows, ...summary } = result;
    const stats = { ...summary, generatedAt: inventory.generatedAt || null, out: opts.outPath };
    fs.mkdirSync(path.dirname(statsPath), { recursive: true });
    const tmp = `${statsPath}.tmp-${process.pid}`;
    fs.writeFileSync(tmp, JSON.stringify(stats, null, 2), "utf8");
    fs.renameSync(tmp, statsPath);
    console.log(`Wrote ${result.totalRows} combined rows -> ${opts.outPath}`);
    console.log(`Wrote stats -> ${statsPath}`);
  }
}

const isMain = (() => {
  try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); }
  catch { return false; }
})();
if (isMain) main();
