#!/usr/bin/env node
/**
 * cadcam-reclassify-ollama.mjs  (slot:zulu 2026-06-24)
 *
 * The consolidator (consolidate-cadcam-corpus.mjs) classifies each resource PDF as
 * cad/cam by a FILENAME-KEYWORD regex. That starves the CAD feeder: ~861 of 883 corpus
 * entries land in the 788-strong "other-pdf" bucket because their filenames (part
 * numbers, "2D_Drawing.pdf") carry no domain keyword -- even though many ARE CAD docs.
 *
 * This recovers them by asking a LOCAL Ollama model (free, R5 lane) to classify each
 * entry from its id + kind + path -- which it reads far better than a regex -- with NO
 * OCR (cheap, bounded). GIGO-safe: only HIGH-confidence (>= CONF_MIN) cad/both verdicts
 * are written as overrides. Output is a durable sidecar the consolidator applies, so the
 * enrichment survives every regen.
 *
 * Resumable: already-decided slugs are skipped, so bounded passes (LIMIT) accumulate.
 *
 * Usage:  node scripts/cadcam-reclassify-ollama.mjs [--limit N] [--model id] [--conf 0.7]
 * Knobs:  OLLAMA_URL (default http://127.0.0.1:11434)
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CORPUS = path.join(ROOT, "state/shared/cadcam-consolidated-corpus.json");
const OVERRIDES = path.join(ROOT, "state/shared/cadcam-classify-overrides.json");
const OLLAMA = (process.env.OLLAMA_URL || "http://127.0.0.1:11434") + "/api/generate";

function arg(name, dflt) {
  const i = process.argv.indexOf("--" + name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
}
const LIMIT = parseInt(arg("limit", "200"), 10);
const MODEL = arg("model", "qwen2.5-coder:32b");
const CONF_MIN = parseFloat(arg("conf", "0.7"));
// Single-item default: small local models reliably return ONE {i,domain,conf} object
// per call (proven), but drop items in a multi-item batch under format:json. --batch >1
// only with a model that reliably emits a full N-element array.
const BATCH = parseInt(arg("batch", "1"), 10);

const PROMPT_HEAD =
`You are a CAD/CAM domain classifier for a CNC manufacturing knowledge base.
Classify each document by its id, kind, and file path into exactly one domain:
- "cad": engineering drawings, blueprints, 3D models, GD&T/tolerancing, part geometry/design, CAD software (SolidWorks/Fusion/Inventor/Catia/Creo/NX/Rhino/FreeCAD).
- "cam": toolpaths, machining, G-code/posts, mill/lathe/EDM/grinding, CAM software (Mastercam/hyperMILL/Esprit/PowerMill), cutting tools/inserts/holders/catalogs, speeds & feeds.
- "both": clearly covers CAD design AND CAM machining.
- "neither": safety, business, HR, generic shop paperwork, or unrelated.
Reply ONLY with a JSON array, one object per input: {"i": <index>, "domain": "cad|cam|both|neither", "conf": <0..1>}. No prose.`;

async function classifyBatch(items) {
  const lines = items.map((e, i) =>
    `${i}. id="${e.id}" kind="${e.kind}" path="${String(e.source || "").replace(/\\/g, "/").slice(-90)}"`).join("\n");
  const body = JSON.stringify({
    model: MODEL,
    prompt: PROMPT_HEAD + "\n\nINPUTS:\n" + lines,
    stream: false,
    format: "json",
    options: { temperature: 0 },
  });
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 90_000);
  try {
    const r = await fetch(OLLAMA, { method: "POST", body, signal: ctrl.signal });
    const j = await r.json();
    const raw = JSON.parse(j.response);
    // format:json yields valid JSON but NOT necessarily an array: it may be a bare
    // array, a wrapper {results:[...]}, a numeric-keyed map {"0":{...}}, or (for a
    // single input) a lone {i,domain,conf}. Normalize all shapes to an array.
    let arr = [];
    if (Array.isArray(raw)) arr = raw;
    else if (raw && typeof raw === "object") {
      for (const k of ["results", "classifications", "items", "data", "verdicts"]) {
        if (Array.isArray(raw[k])) { arr = raw[k]; break; }
      }
      if (!arr.length) {
        if ("domain" in raw) arr = [raw];
        else arr = Object.entries(raw)
          .map(([k, v]) => (v && typeof v === "object") ? { i: v.i != null ? v.i : Number(k), ...v } : null)
          .filter(Boolean);
      }
    }
    return arr;
  } catch (e) {
    process.stderr.write(`batch failed: ${e.message}\n`);
    return [];
  } finally { clearTimeout(to); }
}

async function main() {
  if (!fs.existsSync(CORPUS)) { console.error("no consolidated corpus"); return 1; }
  const corpus = JSON.parse(fs.readFileSync(CORPUS, "utf8"));
  const seen = new Set();
  const all = [...(corpus.cad || []), ...(corpus.cam || []), ...(corpus.both || [])]
    .filter(e => { if (seen.has(e.slug)) return false; seen.add(e.slug); return true; });

  const overrides = fs.existsSync(OVERRIDES) ? JSON.parse(fs.readFileSync(OVERRIDES, "utf8")) : { schemaVersion: "1.0.0", decided: {}, generatedBy: "cadcam-reclassify-ollama.mjs" };
  const decided = overrides.decided;

  // recovery pool: not already cad, and not already decided this/prior run
  const pool = all.filter(e => !e.classification.cad && !decided[e.slug]).slice(0, LIMIT);
  console.log(`pool=${pool.length} (of ${all.filter(e => !e.classification.cad).length} not-cad) | model=${MODEL} conf>=${CONF_MIN}`);
  if (!pool.length) { console.log("nothing to do (all decided)"); return 0; }

  let cadAdded = 0, bothAdded = 0, camAdded = 0, processed = 0;
  for (let b = 0; b < pool.length; b += BATCH) {
    const batch = pool.slice(b, b + BATCH);
    const verdicts = await classifyBatch(batch);
    for (const v of verdicts) {
      const e = batch[Number(v.i)];
      if (!e || typeof v.domain !== "string") continue;
      const conf = Number(v.conf) || 0;
      const dom = v.domain.toLowerCase();
      const rec = { domain: dom, conf, by: MODEL };
      decided[e.slug] = rec;
      if (conf >= CONF_MIN) {
        if (dom === "cad") cadAdded++;
        else if (dom === "both") bothAdded++;
        else if (dom === "cam") camAdded++;
      }
    }
    processed += batch.length;
    // checkpoint each batch (resumable)
    overrides.lastRun = new Date(Number(process.env.NOW_MS) || 0).toISOString();
    overrides.decided = decided;
    fs.writeFileSync(OVERRIDES, JSON.stringify(overrides, null, 1));
    process.stdout.write(`  ${processed}/${pool.length} processed (cad+${cadAdded} both+${bothAdded} cam+${camAdded})\r`);
  }
  console.log(`\nDONE: processed ${processed} | high-conf cad+${cadAdded} both+${bothAdded} cam+${camAdded} | overrides -> ${path.relative(ROOT, OVERRIDES)}`);
  console.log(`total decided across all runs: ${Object.keys(decided).length}`);
  return 0;
}

const isMain = (() => { try { return process.argv[1] && path.normalize(fs.realpathSync(process.argv[1])) === path.normalize(fileURLToPath(import.meta.url)); } catch { return false; } })();
if (isMain) main().then(c => process.exit(c || 0)).catch(e => { console.error(e); process.exit(1); });

export { classifyBatch, CONF_MIN };
