#!/usr/bin/env node
/**
 * build-domain-knowledge-feeders.mjs  (slot:zulu 2026-06-24)
 *
 * R15 APPLY-TO-ALL-GALAXIES generalization of the CAD/CAM feeder work
 * (extract-cadcam-tribal-wiki.mjs only built cad+cam). Reads the resource-pdf-specs
 * corpus and emits a GIGO-safe knowledge feeder per MANUFACTURING DOMAIN so every
 * specialist galaxy (mill/lathe/wedm/speed-feed/post-processor/quality/...) gets the
 * same per-resource bridge index CAD/CAM already has.
 *
 * Multi-label: a doc can feed several domains (a "Mastercam mill speeds" PDF -> mill +
 * cam + speed-feed). Deterministic keyword classify over id+source+slug+kind (fast, no
 * OCR). GIGO-safe: an entry is emitted ONLY if its source file/dir exists on disk
 * (a knowledge feeder must never point at a missing source -- R9, the same rule the
 * cadcam feeder fix established). Ollama content-reclassify (cadcam-reclassify-ollama.mjs)
 * is the accuracy-refinement next pass for the keyword-"unclassified" residual.
 *
 * Output: state/shared/<domain>-tribal-corpus.jsonl -- the CANONICAL consumed convention
 * (the exact path cad/cam/blueprint-vision/database-expansion already use; referenced by
 * AIResourceLearningEngine.getCadCamCorpus + the per-slot tribal pipeline). cad+cam are
 * EXCLUDED here -- they are owned by the richer dedicated generator extract-cadcam-tribal-wiki.mjs.
 * Ownership guard: never overwrites a corpus whose records were not spawned_by THIS generator
 * (a dedicated generator's or a slot's hand-curated corpus), so a regen can never clobber
 * peer-curated knowledge (the tribal-brain clobber-regression class).
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
export const SPECS_DIR = path.join(ROOT, "state/shared/resource-pdf-specs");
const SHARED_DIR = path.join(ROOT, "state/shared");
const SCHEMA_VERSION = "1.0.0";
const SPAWNED_BY = "build-domain-knowledge-feeders.mjs";
// cad + cam have a dedicated, richer generator (extract-cadcam-tribal-wiki.mjs). This general
// feeder must NEVER overwrite them. Every other domain routes to the canonical per-domain corpus.
export const DEDICATED_GENERATOR_DOMAINS = new Set(["cad", "cam"]);

// Durable sidecar of Ollama content-classifier verdicts for the keyword-unclassified
// residual (written by reclassify-domain-feeders-ollama.mjs; applied by resolveDomains).
export const OVERRIDES_PATH = path.join(SHARED_DIR, "domain-classify-overrides.json");

// Canonical per-domain tribal-corpus path -- the path every consumer already reads.
export function corpusPathFor(domain) {
  return path.join(SHARED_DIR, `${domain}-tribal-corpus.jsonl`);
}

// We may write a corpus ONLY if it is absent or every record was spawned_by THIS generator.
// A file carrying foreign `spawned_by` (a dedicated generator or a slot's hand-curated tips) is
// off-limits -- skip it rather than clobber. Unreadable -> refuse to write (fail safe, R12).
export function weOwnCorpus(outPath) {
  if (!fs.existsSync(outPath)) return true;
  try {
    const lines = fs.readFileSync(outPath, "utf8").split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return true;
    return lines.every((l) => { try { return JSON.parse(l).spawned_by === SPAWNED_BY; } catch { return false; } });
  } catch { return false; }
}

// Manufacturing-domain keyword maps (multi-label). Word-boundary, case-insensitive.
export const DOMAIN_KEYWORDS = {
  mill:            /\b(mill|milling|vmc|machining cent|end ?mill|face ?mill|pocket|2d|3d|hsm|haas|mazak)\b/i,
  lathe:           /\b(lathe|turning|cnc ?lathe|chuck|css|g50|g96|live ?tool|swiss|okuma)\b/i,
  wedm:            /\b(wire ?edm|wedm|wire-edm|\bedm\b|spark|wire ?cut|sinker)\b/i,
  cam:             /\b(cam|toolpath|mastercam|hypermill|gibbscam|esprit|solidcam|powermill|featurecam|nci|operation)\b/i,
  cad:             /\b(cad|drawing|sketch|blueprint|solidworks|inventor|fusion|catia|creo|gd&?t|tolerance|model|design)\b/i,
  "speed-feed":    /\b(speed|feed|sfm|ipm|ipr|rpm|chip ?load|fz|kienzle|taylor|cutting ?data|surface ?speed)\b/i,
  "post-processor":/\b(post ?process|post-proc|g-?code|controller|fanuc|siemens|heidenhain|mitsubishi|\.cps|nc ?code|dnc)\b/i,
  quality:         /\b(quality|spc|cpk|inspection|cmm|metrolog|fai|gauge|gage|six ?sigma|first ?article)\b/i,
  tooling:         /\b(tool|insert|holder|carbide|coating|drill|tap|reamer|catalog|cutter|grade)\b/i,
  grinding:        /\b(grind|grinding|surface ?grind|wheel|abrasive|dress)\b/i,
  business:        /\b(quote|cost|estimat|invoice|erp|accounting|purchase|vendor|rfq|pricing)\b/i,
  safety:          /\b(safety|hazard|lockout|tagout|guard|ppe|osha|msds|sds)\b/i,
};

// Audience slot per domain (for the tribal `audience` field).
const DOMAIN_AUDIENCE = {
  mill: "foxtrot", lathe: "whiskey", wedm: "mike", cam: "kilo", cad: "delta",
  "speed-feed": "oscar", "post-processor": "echo", quality: "quality",
  tooling: "kilo", grinding: "foxtrot", business: "hotel", safety: "compliance-safety",
};

// ---- pure: parse one AUTOGEN-EXTRACT-SPEC markdown into {slug,id,kind,source} ----
export function parseSpec(text) {
  const get = (label) => {
    const m = text.match(new RegExp(`\\|\\s*${label}\\s*\\|\\s*\`?([^\`|\\n]+?)\`?\\s*\\|`, "i"));
    return m ? m[1].trim() : "";
  };
  const id = get("PDF id");
  const slug = get("Slug");
  const kind = get("Kind") || "other-pdf";
  const source = get("Source path");
  if (!slug || !source) return null;
  return { slug, id: id || slug, kind, source };
}

// ---- pure: which domains does this entry feed? (multi-label) ----
export function classifyDomains(entry) {
  const text = `${entry.id} ${entry.source} ${entry.slug} ${entry.kind}`;
  return Object.keys(DOMAIN_KEYWORDS).filter((d) => DOMAIN_KEYWORDS[d].test(text));
}

// ---- Ollama-override sidecar (resumable verdicts for the keyword-unclassified residual) ----
// Load the override sidecar written by reclassify-domain-feeders-ollama.mjs. Absent or
// corrupt -> empty (fail-soft; a missing sidecar must never break the deterministic feeder).
export function loadOverrides(p = OVERRIDES_PATH) {
  try {
    if (!fs.existsSync(p)) return { decided: {} };
    const o = JSON.parse(fs.readFileSync(p, "utf8"));
    return (o && typeof o === "object" && o.decided && typeof o.decided === "object") ? o : { decided: {} };
  } catch { return { decided: {} }; }
}

// Resolve an entry's domains: keyword classification first; for the keyword-unclassified
// residual fall back to a HIGH-confidence Ollama override (conf >= confMin), filtered to
// real, non-dedicated domains (cad/cam are owned by the dedicated generator). Returns
// { domains, via } where via tags provenance ("keyword" | "ollama-override" | "none").
export function resolveDomains(entry, overrides, confMin = 0.7) {
  const kw = classifyDomains(entry);
  if (kw.length) return { domains: kw, via: "keyword" };
  const dec = overrides && overrides.decided ? overrides.decided[entry.slug] : null;
  if (dec && Number(dec.conf) >= confMin && Array.isArray(dec.domains)) {
    const valid = dec.domains.filter((d) =>
      Object.prototype.hasOwnProperty.call(DOMAIN_KEYWORDS, d) && !DEDICATED_GENERATOR_DOMAINS.has(d));
    if (valid.length) return { domains: valid, via: "ollama-override" };
  }
  return { domains: [], via: "none" };
}

export function entryToTribal(entry, domain, ts) {
  return {
    ts, schemaVersion: SCHEMA_VERSION, domain,
    slug: entry.slug, id: entry.id, kind: entry.kind,
    source: entry.source, source_type: "pdf",
    tip: `${domain.toUpperCase()} knowledge reference (kind=${entry.kind}): read AUTOGEN-EXTRACT-SPEC-${entry.slug}.md for the extraction plan, then ingest the source file.`,
    consume: { spec_md: `state/shared/resource-pdf-specs/AUTOGEN-EXTRACT-SPEC-${entry.slug}.md`, source_file: entry.source },
    audience: DOMAIN_AUDIENCE[domain] || "fleet",
    spawned_by: SPAWNED_BY,
    must_human_verify: true, advisory: true,
  };
}

export function main() {
  if (!fs.existsSync(SPECS_DIR)) { console.error(`no specs dir ${SPECS_DIR}`); return 1; }
  const ts = (process.env.NOW_ISO || "1970-01-01T00:00:00.000Z");
  const files = fs.readdirSync(SPECS_DIR).filter((f) => /^AUTOGEN-EXTRACT-SPEC-.*\.md$/.test(f));
  const byDomain = {};
  const overrides = loadOverrides();
  let parsed = 0, gigoDropped = 0, unclassified = 0, overrideApplied = 0;
  for (const f of files) {
    let entry;
    try { entry = parseSpec(fs.readFileSync(path.join(SPECS_DIR, f), "utf8")); } catch { continue; }
    if (!entry) continue;
    parsed++;
    // GIGO-safe: source must exist on disk (R9 -- a feeder never points at a missing source).
    if (!fs.existsSync(entry.source)) { gigoDropped++; continue; }
    // Keyword classify first; fall back to a high-confidence Ollama override for the residual.
    const { domains, via } = resolveDomains(entry, overrides, 0.7);
    if (!domains.length) { unclassified++; continue; }
    if (via === "ollama-override") overrideApplied++;
    for (const d of domains) (byDomain[d] = byDomain[d] || []).push(entryToTribal(entry, d, ts));
  }
  fs.mkdirSync(SHARED_DIR, { recursive: true });
  const summary = {};
  const skipped = {};
  for (const d of Object.keys(DOMAIN_KEYWORDS)) {
    const rows = byDomain[d] || [];
    if (DEDICATED_GENERATOR_DOMAINS.has(d)) { skipped[d] = "dedicated generator (extract-cadcam-tribal-wiki.mjs)"; continue; }
    if (!rows.length) { summary[d] = 0; continue; }  // no content in resources/ -> don't materialize an empty corpus
    const outPath = corpusPathFor(d);
    if (!weOwnCorpus(outPath)) { skipped[d] = "foreign/curated corpus present -- not clobbering"; continue; }
    fs.writeFileSync(outPath, rows.map((r) => JSON.stringify(r)).join("\n") + (rows.length ? "\n" : ""));
    summary[d] = rows.length;
  }
  console.log(`specs parsed: ${parsed} | GIGO-dropped (missing source): ${gigoDropped} | unclassified: ${unclassified} | ollama-override applied: ${overrideApplied}`);
  console.log(`per-domain tribal corpora -> state/shared/<domain>-tribal-corpus.jsonl:`);
  for (const [d, n] of Object.entries(summary).sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${d}`);
  for (const [d, why] of Object.entries(skipped)) console.log(`  SKIP  ${d} (${why})`);
  return 0;
}

const isMain = (() => { try { return process.argv[1] && path.normalize(fs.realpathSync(process.argv[1])) === path.normalize(fileURLToPath(import.meta.url)); } catch { return false; } })();
if (isMain) process.exit(main());
