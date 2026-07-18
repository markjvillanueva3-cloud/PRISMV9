/**
 * blueprint-tribal-source-loader (U-BPA-RAG-TRIBAL-DEFAULT, slot:india)
 *
 * Loads the blueprint-EXTRACTION tribal corpus (state/shared/blueprint-vision-
 * tribal-corpus.jsonl -- xray's domain doctrine: verify-engine-names, split-
 * multi-print-before-OCR, per-field 0.70 confidence floor, etc.) and adapts each
 * tip to the BlueprintExtractionRAGEngine `RetrievedSource` shape
 * ({kind:"tribal", id, title, score}) so the MCP `blueprint_rag_extract` path can
 * inject shop tribal priors BY DEFAULT when the caller supplies no precomputed
 * tribal sources. This is the EXTRACTION-domain analogue of the CAD-draw tribal
 * injection wired into the text->CAD loop (U-CAD-TEXT-TRIBAL-INJECT) -- and it
 * deliberately uses the blueprint-vision corpus, NOT the CAD-draw GENERATION
 * corpus (CAD_DRAW_TRIBAL_TIPS), which is the wrong domain for dimension reading.
 *
 * Fail-soft: a missing/unreadable/empty corpus returns [] (the engine then
 * proceeds with no tribal priors -- never throws). Pure + injectable for tests.
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// scripts/lib/ -> ../.. = repo root (mirrors blueprint-accuracy-event-writer.mjs).
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

export const DEFAULT_CORPUS_FILE =
  process.env.PRISM_BPV_TRIBAL_CORPUS ||
  join(REPO_ROOT, "state", "shared", "blueprint-vision-tribal-corpus.jsonl");

// These 7 tips are broadly-applicable EXTRACTION doctrine (not similarity-matched
// retrieval hits), so they carry a uniform moderate prior rather than a per-tip
// relevance score. Per-request relevance ranking is a future enhancement; today
// the whole (small) corpus is relevant doctrine for any extraction.
export const TRIBAL_PRIOR_SCORE = 0.6;

/**
 * Parse the corpus jsonl into RetrievedSource[] (kind:"tribal").
 * @param {string} blob - raw jsonl contents
 * @returns {Array<{kind:"tribal", id:string, title:string, score:number}>}
 */
export function adaptCorpusBlob(blob) {
  if (typeof blob !== "string" || blob.length === 0) return [];
  const out = [];
  for (const line of blob.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let rec;
    try { rec = JSON.parse(trimmed); } catch { continue; } // skip malformed line, never throw
    if (!rec || typeof rec !== "object") continue;
    const tip = typeof rec.tip === "string" ? rec.tip : (typeof rec.text === "string" ? rec.text : "");
    if (!tip) continue; // a tribal source with no text is useless -- drop it
    const id = typeof rec.id === "string" && rec.id ? rec.id
      : (typeof rec.slug === "string" && rec.slug ? rec.slug : `bpv-tribal-${out.length}`);
    out.push({ kind: "tribal", id, title: tip, score: TRIBAL_PRIOR_SCORE });
  }
  return out;
}

/**
 * Load the blueprint-extraction tribal corpus as RetrievedSource[].
 * @param {{topK?: number, corpusFile?: string, readImpl?: (p:string)=>string}} [opts]
 * @returns {Array<{kind:"tribal", id:string, title:string, score:number}>}
 */
export function loadBlueprintTribalSources(opts = {}) {
  const corpusFile = opts.corpusFile || DEFAULT_CORPUS_FILE;
  // topK unspecified => NO cap (return the whole corpus). The engine always passes
  // its resolved topK (DEFAULT_TOP_K=5) on the MCP path, so the budget is honored
  // there; a no-topK direct caller then gets EVERY tip rather than a silent cap --
  // avoids a coverage cliff if the curated corpus grows past a hard-coded number.
  const hasTopK = Number.isInteger(opts.topK) && opts.topK >= 0;
  const topK = hasTopK ? opts.topK : null;
  const read = opts.readImpl || ((p) => (existsSync(p) ? readFileSync(p, "utf8") : ""));
  let blob = "";
  try { blob = read(corpusFile); } catch { return []; } // fail-soft on I/O
  const sources = adaptCorpusBlob(blob);
  if (topK === 0) return [];
  return topK === null ? sources : sources.slice(0, topK);
}
