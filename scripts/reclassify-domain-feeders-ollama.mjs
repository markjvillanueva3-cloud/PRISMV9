#!/usr/bin/env node
/**
 * reclassify-domain-feeders-ollama.mjs  (slot:papa 2026-06-24)
 *
 * The GENERALIZED Ollama content-reclassifier for build-domain-knowledge-feeders.mjs.
 *
 * zulu's feeder keyword-classifies 1210 resource-pdf specs into 12 manufacturing
 * domains, but ~769 land in the keyword-"unclassified" residual: their id + source +
 * slug + kind carry no domain keyword (part-number filenames, "2D_Drawing.pdf",
 * generic "manual.pdf"). zulu's handoff named cadcam-reclassify-ollama.mjs as the
 * "next pass" for this residual -- but THAT script only emits cad/cam verdicts on a
 * DIFFERENT corpus (cadcam-consolidated-corpus.json), so the 12-domain residual + the
 * empty wedm/quality/business/grinding/safety domains had NO rescue path. This closes
 * that gap (R16 -- the gap zulu's first pass left).
 *
 * Recovers the residual by asking a LOCAL Ollama model (free, R5 lane) to multi-label
 * classify each entry from its spec's title + kind + path + Build-target engines +
 * formulas -- signal the keyword regex never sees. GIGO-safe: only HIGH-confidence
 * (>= CONF_MIN) verdicts are written. Output is a durable, resumable sidecar
 * (state/shared/domain-classify-overrides.json) that build-domain-knowledge-feeders.mjs
 * APPLIES for keyword-unclassified entries (resolveDomains override fallback). cad+cam
 * verdicts are recorded but NOT applied by the feeder (dedicated generator owns them).
 *
 * Resumable: already-decided slugs are skipped, so bounded passes (--limit) accumulate.
 *
 * Usage:  node scripts/reclassify-domain-feeders-ollama.mjs [--limit N] [--model id] [--conf 0.7]
 * Knobs:  OLLAMA_URL (default http://127.0.0.1:11434)
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  SPECS_DIR, parseSpec, classifyDomains, DOMAIN_KEYWORDS, DEDICATED_GENERATOR_DOMAINS, OVERRIDES_PATH,
} from "./build-domain-knowledge-feeders.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OLLAMA = (process.env.OLLAMA_URL || "http://127.0.0.1:11434") + "/api/generate";

function arg(name, dflt) {
  const i = process.argv.indexOf("--" + name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
}
const LIMIT = parseInt(arg("limit", "200"), 10);
const MODEL = arg("model", "qwen2.5-coder:32b");
const CONF_MIN = parseFloat(arg("conf", "0.7"));
const BATCH = parseInt(arg("batch", "1"), 10);

// The 10 APPLICABLE domains (12 minus cad/cam which a dedicated generator owns). A
// verdict naming cad/cam is recorded for traceability but the feeder will not apply it.
export const APPLICABLE_DOMAINS = Object.keys(DOMAIN_KEYWORDS).filter((d) => !DEDICATED_GENERATOR_DOMAINS.has(d));

// ---- pure: pull richer classification signal out of a spec MD than id+path alone ----
// The Build-targets section names Engines + Formulas that strongly imply the domain
// (e.g. "PdfBlueprintDimensionExtractorEngine" -> cad/blueprint). Bounded slice.
export function extractSpecSignal(text) {
  const titleMatch = text.match(/^#\s*(.+)$/m);
  const get = (label) => {
    const m = text.match(new RegExp(`\\|\\s*${label}\\s*\\|\\s*\`?([^\`|\\n]+?)\`?\\s*\\|`, "i"));
    return m ? m[1].trim() : "";
  };
  const listAfter = (label) => {
    const m = text.match(new RegExp(`\\*\\*${label}:\\*\\*\\s*([^\\n]+)`, "i"));
    if (!m) return [];
    return m[1].split(/[,·]/).map((s) => s.replace(/[\`*]/g, "").trim()).filter(Boolean).slice(0, 8);
  };
  return {
    title: titleMatch ? titleMatch[1].replace(/AUTOGEN EXTRACT SPEC\s*[-:]*\s*/i, "").replace(/^[^A-Za-z0-9]+/, "").trim() : "",
    kind: get("Kind"),
    source: get("Source path"),
    engines: listAfter("Engines"),
    formulas: listAfter("Formulas"),
  };
}

// ---- pure: keep only real, applicable domain labels from an Ollama verdict ----
export function validApplicableDomains(domains) {
  if (!Array.isArray(domains)) return [];
  const seen = new Set();
  const out = [];
  for (const d of domains) {
    const key = String(d).toLowerCase().trim();
    if (Object.prototype.hasOwnProperty.call(DOMAIN_KEYWORDS, key) && !DEDICATED_GENERATOR_DOMAINS.has(key) && !seen.has(key)) {
      seen.add(key);
      out.push(key);
    }
  }
  return out;
}

const DOMAIN_DEFS = [
  `mill: milling, VMC, end/face mill, pockets, 2D/3D milling, machining centers.`,
  `lathe: turning, CNC lathe, chucks, CSS/G96, live tooling, Swiss, Okuma.`,
  `wedm: wire EDM, sinker EDM, spark erosion, wire cutting.`,
  `speed-feed: speeds & feeds, SFM/IPM/IPR/RPM, chip load, Kienzle/Taylor, cutting data.`,
  `post-processor: post-processors, G-code, controllers (Fanuc/Siemens/Heidenhain), .cps, DNC.`,
  `quality: QC/SPC/Cpk, inspection, CMM, metrology, FAI, six sigma, gauging.`,
  `tooling: cutting tools, inserts, holders, carbide, coatings, drills/taps/reamers, catalogs.`,
  `grinding: grinding, surface/cylindrical grind, wheels, abrasives, dressing.`,
  `business: quoting, cost/estimating, ERP, accounting, purchasing, RFQ, pricing.`,
  `safety: safety, hazard, lockout/tagout, PPE, OSHA, SDS.`,
];
const PROMPT_HEAD =
`You are a CNC manufacturing knowledge-base domain classifier. Classify each document
into ALL applicable domains from this set (a document may belong to several):
${DOMAIN_DEFS.join("\n")}
Reply ONLY with a JSON array, one object per input:
{"i": <index>, "domains": ["mill","tooling"], "conf": <0..1>}. Use domains [] + conf 0
if none clearly apply. No prose.`;

export function buildPrompt(items) {
  const lines = items.map((it, i) => {
    const sig = it.signal;
    const parts = [
      `${i}.`,
      `title="${(sig.title || it.id || "").slice(0, 100)}"`,
      `kind="${sig.kind || it.kind}"`,
      `path="${String(sig.source || it.source || "").replace(/\\/g, "/").slice(-90)}"`,
    ];
    if (sig.engines && sig.engines.length) parts.push(`engines="${sig.engines.join(",").slice(0, 120)}"`);
    if (sig.formulas && sig.formulas.length) parts.push(`formulas="${sig.formulas.join(",").slice(0, 80)}"`);
    return parts.join(" ");
  }).join("\n");
  return PROMPT_HEAD + "\n\nINPUTS:\n" + lines;
}

// ---- pure: normalize the many shapes format:json can return into an array ----
export function normalizeVerdicts(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") {
    for (const k of ["results", "classifications", "items", "data", "verdicts"]) {
      if (Array.isArray(raw[k])) return raw[k];
    }
    if ("domains" in raw || "domain" in raw) return [raw];
    return Object.entries(raw)
      .map(([k, v]) => (v && typeof v === "object") ? { i: v.i != null ? v.i : Number(k), ...v } : null)
      .filter(Boolean);
  }
  return [];
}

// ---- pure: a single verdict may carry `domains:[]` (preferred) or a lone `domain` ----
export function verdictDomains(v) {
  if (Array.isArray(v.domains)) return v.domains;
  if (typeof v.domain === "string") return v.domain.toLowerCase() === "neither" ? [] : [v.domain];
  return [];
}

async function classifyBatch(items) {
  const body = JSON.stringify({
    model: MODEL, prompt: buildPrompt(items), stream: false, format: "json", options: { temperature: 0 },
  });
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 90_000);
  try {
    const r = await fetch(OLLAMA, { method: "POST", body, signal: ctrl.signal });
    const j = await r.json();
    return normalizeVerdicts(JSON.parse(j.response));
  } catch (e) {
    process.stderr.write(`batch failed: ${e.message}\n`);
    return [];
  } finally { clearTimeout(to); }
}

// ---- load the keyword-unclassified residual (parsed + GIGO-filtered + with signal) ----
export function loadResidual(specsDir = SPECS_DIR) {
  if (!fs.existsSync(specsDir)) return [];
  const files = fs.readdirSync(specsDir).filter((f) => /^AUTOGEN-EXTRACT-SPEC-.*\.md$/.test(f));
  const residual = [];
  for (const f of files) {
    let text;
    try { text = fs.readFileSync(path.join(specsDir, f), "utf8"); } catch { continue; }
    const entry = parseSpec(text);
    if (!entry) continue;
    if (!fs.existsSync(entry.source)) continue;          // GIGO-safe (source must exist)
    if (classifyDomains(entry).length) continue;          // already keyword-classified -> not residual
    residual.push({ ...entry, signal: extractSpecSignal(text) });
  }
  return residual;
}

async function main() {
  const residual = loadResidual();
  const overrides = fs.existsSync(OVERRIDES_PATH)
    ? JSON.parse(fs.readFileSync(OVERRIDES_PATH, "utf8"))
    : { schemaVersion: "1.0.0", generatedBy: "reclassify-domain-feeders-ollama.mjs", lastRun: null, decided: {} };
  const decided = overrides.decided || (overrides.decided = {});

  const pool = residual.filter((e) => !decided[e.slug]).slice(0, LIMIT);
  console.log(`residual=${residual.length} | undecided=${residual.filter((e) => !decided[e.slug]).length} | pool=${pool.length} | model=${MODEL} conf>=${CONF_MIN}`);
  if (!pool.length) { console.log("nothing to do (all residual decided)"); return 0; }

  let processed = 0, applied = 0, neither = 0;
  const perDomain = {};
  for (let b = 0; b < pool.length; b += BATCH) {
    const batch = pool.slice(b, b + BATCH);
    const verdicts = await classifyBatch(batch);
    for (const v of verdicts) {
      const e = batch[Number(v.i)] || (batch.length === 1 ? batch[0] : null);
      if (!e) continue;
      const conf = Number(v.conf) || 0;
      const valid = validApplicableDomains(verdictDomains(v));
      decided[e.slug] = { domains: valid, conf, by: MODEL };
      if (conf >= CONF_MIN && valid.length) {
        applied++;
        for (const d of valid) perDomain[d] = (perDomain[d] || 0) + 1;
      } else if (!valid.length) {
        neither++;
      }
    }
    processed += batch.length;
    overrides.lastRun = new Date(Number(process.env.NOW_MS) || 0).toISOString();
    overrides.decided = decided;
    fs.writeFileSync(OVERRIDES_PATH, JSON.stringify(overrides, null, 1));
    process.stdout.write(`  ${processed}/${pool.length} processed (applied ${applied}, neither ${neither})\r`);
  }
  console.log(`\nDONE: processed ${processed} | high-conf applied ${applied} | neither/low-conf ${neither}`);
  for (const [d, n] of Object.entries(perDomain).sort((a, b) => b[1] - a[1])) console.log(`  +${String(n).padStart(4)}  ${d}`);
  console.log(`total decided across all runs: ${Object.keys(decided).length} | overrides -> ${path.relative(ROOT, OVERRIDES_PATH)}`);
  console.log(`apply with: node scripts/build-domain-knowledge-feeders.mjs`);
  return 0;
}

const isMain = (() => { try { return process.argv[1] && path.normalize(fs.realpathSync(process.argv[1])) === path.normalize(fileURLToPath(import.meta.url)); } catch { return false; } })();
if (isMain) main().then((c) => process.exit(c || 0)).catch((e) => { console.error(e); process.exit(1); });
