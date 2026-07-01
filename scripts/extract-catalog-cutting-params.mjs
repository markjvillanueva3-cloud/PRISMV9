#!/usr/bin/env node
/**
 * extract-catalog-cutting-params.mjs -- Phase B: extract REAL per-tool cutting parameters
 * from the tooling vendor catalogs (operator directive 2026-06-24, slot:papa).
 *
 * THE GAP this closes: the per-vendor extractors (extract-accupro.py etc.) pull tool GEOMETRY
 * only (dia/flute/OAL/order#); enrich-catalog-cutting-data.mjs (Phase A) then ATTACHES generic
 * ISO-aggregate cutting data (confidence 0.4-0.5). Neither reads the SFM/feed RECOMMENDATION
 * tables PRINTED IN THE CATALOGS (Vc/fz by ISO material group x coating x operation). The
 * operator: "there are always parameter and sfm specs for all tools relative to material type,
 * tool path type and coatings. don't skip over anything." This extracts THAT, per real source page.
 *
 * Pipeline per catalog (resumable, Ollama-first per R5 -> $0 Claude tokens for the extraction):
 *   1. catalog-cutting-page-extract.py selects the speed/feed-bearing pages (deterministic fitz scan)
 *   2. each selected page -> Ollama (qwen2.5-coder:32b) STRUCTURED extraction -> JSON records
 *   3. validate + normalize units (sfm->m/min, ipt(in)->mm/tooth) -- canonical = m/min + mm/tooth
 *   4. write additive store mcp-server/data/catalog-cutting-params/<slug>.json
 *      (records[] + manufacturerSpeedFeed[] -- compatible with oscar's ManufacturerSpeedFeed so
 *       ToolCatalogEngine/SFC can ingest later; does NOT mutate his compiled *.ts -- lane-safe)
 *   5. append per-tool tribal tips to state/shared/pdf-tribal-tips/catalog-cutting-tips.jsonl
 *      (the existing tribal-embed pipeline ingests -> feeds RAG/GNN/LoRA + tribal-by-domain inject)
 *
 * Fully resumable: an attempted-catalog cursor. A reaper/session kill just resumes next run.
 * Bounded by --max-catalogs so a durable scheduled task grinds all 287 over many runs.
 *
 * Usage:
 *   node scripts/extract-catalog-cutting-params.mjs --status
 *   node scripts/extract-catalog-cutting-params.mjs --max-catalogs 3
 *   node scripts/extract-catalog-cutting-params.mjs --catalog "<one pdf path>"   # single, for proving
 * Env: PRISM_OLLAMA_URL, PRISM_CATALOG_CUTTING_MODEL (default qwen2.5-coder:32b),
 *      PRISM_CATALOG_MAX_PAGES (default 60)
 *
 * @milestone PDF-TRIBAL-HERMES/U-CATALOG-CUTTING-PARAMS
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), "..");
const CAT_DIR = process.env.PRISM_CATALOG_DIR || "H:/PRISM/resources/MANUFACTURER_CATALOGS/uploaded";
const OUT_DIR = path.join(ROOT, "mcp-server", "data", "catalog-cutting-params");
const CURSOR = path.join(OUT_DIR, "_cursor.json");
const TIPS = path.join(ROOT, "state", "shared", "pdf-tribal-tips", "catalog-cutting-tips.jsonl");
const PROGRESS = path.join(OUT_DIR, "_progress.jsonl");
const PY = process.env.PRISM_PORTABLE_PY || "H:/Tools/python/python.exe";
const NODE = process.execPath;
const OLLAMA_URL = process.env.PRISM_OLLAMA_URL || "http://127.0.0.1:11434";
const MODEL = process.env.PRISM_CATALOG_CUTTING_MODEL || "qwen2.5-coder:32b";
const MAX_PAGES = parseInt(process.env.PRISM_CATALOG_MAX_PAGES || "400", 10); // full selected set; windowed per run
const PAGE_WINDOW = parseInt(process.env.PRISM_CATALOG_PAGE_WINDOW || "30", 10); // cutting-data pages processed per run (resumable)
const PAGE_TIMEOUT_MS = parseInt(process.env.PRISM_CATALOG_PAGE_TIMEOUT_MS || "90000", 10); // per-page Ollama extraction timeout
const ISO_GROUPS = new Set(["P", "M", "K", "N", "S", "H"]);
// material name -> ISO group (catalogs often label rows by material, not ISO letter)
const MAT_TO_ISO = [
  [/stainless|austenit|duplex|17-4|ph\b/, "M"], [/cast[\s-]?iron|gray iron|grey iron|ductile|nodular|\bgg\b|\bggg\b/, "K"],
  [/alumin|brass|bronze|copper|non[\s-]?ferrous|magnesium|\bmmc\b/, "N"],
  [/titanium|\bti[\s-]?6|inconel|nickel|superalloy|hastelloy|waspaloy|nimonic|cobalt|heat[\s-]?resist/, "S"],
  [/hardened|\bhrc\b|\d{2}\s?hrc|hard steel|tool steel hardened/, "H"],
  [/steel|alloy steel|carbon steel|\bp20\b|mold steel|free[\s-]?machining/, "P"], // P last (broad)
];

// Robust ISO normalization: single letter, embedded letter (P25/ISO M), or material name.
// Ambiguous multi-letter (e.g. "SM") -> null (rejected, not guessed).
export function normalizeIso(raw) {
  if (raw == null) return null;
  const s = String(raw).toUpperCase().trim();
  if (s.length === 1 && ISO_GROUPS.has(s)) return s;
  const low = String(raw).toLowerCase();
  for (const [re, iso] of MAT_TO_ISO) if (re.test(low)) return iso;
  // strip the literal token "ISO" first so "ISO M" is not read as {S,M} (the S in I-S-O)
  const cleaned = s.replace(/ISO/g, " ");
  const letters = [...new Set(cleaned.split("").filter((c) => ISO_GROUPS.has(c)))];
  return letters.length === 1 ? letters[0] : null;
}

const SYSTEM_PROMPT =
  "You extract cutting-tool speed & feed data from one page of a machining tooling catalog. " +
  "Return ONLY a JSON array (no prose, no markdown fences). Each element is ONE " +
  "(tool series x ISO material group) cutting recommendation EXPLICITLY shown on this page. " +
  "Schema per element: " +
  '{"series":str,"tool_type":"end_mill|ball_mill|drill|reamer|tap|insert|turning|threading|unknown",' +
  '"coating":"TiAlN|AlTiN|TiCN|AlCrN|TiN|uncoated|unknown","iso_group":"P|M|K|N|S|H",' +
  '"operation":"rough|finish|slotting|drilling|turning|general","vc_min":num,"vc_max":num,' +
  '"vc_unit":"m/min|sfm","feed_type":"fz_per_tooth|fn_per_rev","feed_min":num,"feed_max":num,' +
  '"feed_unit":"mm|in","dc_min":num_or_null,"dc_max":num_or_null}. ' +
  "CRITICAL feed semantics (do NOT confuse columns): for MILLING (end_mill/ball_mill/milling inserts) the feed is " +
  "fz = feed PER TOOTH, typically 0.02-0.5 mm/tooth (NEVER above ~1.5) -> feed_type='fz_per_tooth'. For TURNING/DRILLING/" +
  "THREADING the feed is fn = feed PER REV, typically 0.05-1.5 mm/rev -> feed_type='fn_per_rev'. Do NOT report a depth of " +
  "cut (ap/ae) or a diameter as the feed. " +
  "Rules: include a row ONLY if the page gives an actual cutting speed (Vc/sfm) AND/OR a feed value. " +
  "If a single value (not a range), set min=max. iso_group MUST be EXACTLY ONE letter from {P,M,K,N,S,H} " +
  "(P=steel, M=stainless, K=cast iron, N=aluminium/non-ferrous, S=titanium/superalloy, H=hardened) -- never two " +
  "letters, never a code like 'SM'. If the page names a material instead of an ISO group, also include " +
  '"material":"<the material name>". If NO cutting data on the page, return []. Never invent values.';

// ── pure, testable helpers ───────────────────────────────────────────────────
export function coerceJsonArray(text) {
  if (typeof text !== "string") return [];
  let s = text.trim();
  s = s.replace(/```(?:json)?/gi, "").trim();
  const start = s.indexOf("[");
  const end = s.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return [];
  try {
    const arr = JSON.parse(s.slice(start, end + 1));
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

// physically-realistic feed caps (mm) by feed type -- rejects column-confusion (ap/dia read as feed)
const FZ_PER_TOOTH_MAX_MM = 1.5; // milling feed/tooth realistically <=~0.5; 1.5 is a generous reject ceiling
const FN_PER_REV_MAX_MM = 3.0; // turning/drilling feed/rev realistically <=~1.5; 3.0 generous ceiling
const VC_MAX_MPM = 3000; // non-ferrous HSM tops ~1500-2000 m/min; 3000 generous

function inferFeedType(rec) {
  if (rec.feed_type === "fn_per_rev" || rec.feed_type === "fz_per_tooth") return rec.feed_type;
  const tt = String(rec.tool_type || "").toLowerCase();
  if (/turn|drill|ream|thread|tap|bore|groov|part/.test(tt)) return "fn_per_rev";
  return "fz_per_tooth"; // milling default
}

export function normalizeUnits(rec) {
  const out = { ...rec };
  const vu = String(rec.vc_unit || "m/min").toLowerCase();
  // back-compat: accept legacy fz_* keys as the feed fields
  const feedMinRaw = rec.feed_min != null ? rec.feed_min : rec.fz_min;
  const feedMaxRaw = rec.feed_max != null ? rec.feed_max : rec.fz_max;
  const fu = String(rec.feed_unit || rec.fz_unit || "mm").toLowerCase();
  const sfm = vu.includes("sfm") || vu.includes("ft");
  const inch = fu === "in" || fu.includes("inch");
  const vcFac = sfm ? 0.3048 : 1; // sfm (ft/min) -> m/min
  const feedFac = inch ? 25.4 : 1; // in -> mm
  const num = (x) => (typeof x === "number" && isFinite(x) ? x : null);
  out.vc_min_mpm = num(rec.vc_min) != null ? +(rec.vc_min * vcFac).toFixed(2) : null;
  out.vc_max_mpm = num(rec.vc_max) != null ? +(rec.vc_max * vcFac).toFixed(2) : null;
  out.feed_type = inferFeedType(rec);
  out.feed_min_mm = num(feedMinRaw) != null ? +(feedMinRaw * feedFac).toFixed(4) : null;
  out.feed_max_mm = num(feedMaxRaw) != null ? +(feedMaxRaw * feedFac).toFixed(4) : null;
  // expose per-tooth feed as fz_* (milling) so oscar's ManufacturerSpeedFeed (fz) ingests cleanly
  if (out.feed_type === "fz_per_tooth") { out.fz_min_mm = out.feed_min_mm; out.fz_max_mm = out.feed_max_mm; }
  else { out.fz_min_mm = null; out.fz_max_mm = null; }
  return out;
}

export function validateRecord(rec) {
  if (!rec || typeof rec !== "object") return { ok: false, reason: "not-object" };
  if (!rec.series || typeof rec.series !== "string") return { ok: false, reason: "no-series" };
  const g = normalizeIso(rec.iso_group != null ? rec.iso_group : rec.material);
  if (!g) return { ok: false, reason: `bad-iso:${rec.iso_group}` };
  const n = normalizeUnits(rec);
  const hasVc = n.vc_min_mpm != null && n.vc_max_mpm != null;
  const hasFeed = n.feed_min_mm != null && n.feed_max_mm != null;
  if (!hasVc && !hasFeed) return { ok: false, reason: "no-cutting-values" };
  if (hasVc) {
    if (n.vc_min_mpm <= 0 || n.vc_max_mpm > VC_MAX_MPM || n.vc_min_mpm > n.vc_max_mpm)
      return { ok: false, reason: `vc-range:${n.vc_min_mpm}-${n.vc_max_mpm}` };
  }
  if (hasFeed) {
    const cap = n.feed_type === "fn_per_rev" ? FN_PER_REV_MAX_MM : FZ_PER_TOOTH_MAX_MM;
    if (n.feed_min_mm <= 0 || n.feed_max_mm > cap || n.feed_min_mm > n.feed_max_mm)
      return { ok: false, reason: `feed-range(${n.feed_type}):${n.feed_min_mm}-${n.feed_max_mm}>cap${cap}` };
  }
  return { ok: true, normalized: { ...n, iso_group: g } };
}

export function recordToTribalTip(rec, vendor) {
  const parts = [];
  parts.push(`${vendor} ${rec.series}`);
  if (rec.tool_type && rec.tool_type !== "unknown") parts.push(rec.tool_type.replace(/_/g, " "));
  if (rec.coating && rec.coating !== "unknown") parts.push(`${rec.coating}-coated`);
  const head = parts.join(" ");
  const iso = { P: "steel (ISO P)", M: "stainless (ISO M)", K: "cast iron (ISO K)", N: "non-ferrous (ISO N)", S: "superalloy/Ti (ISO S)", H: "hardened (ISO H)" }[rec.iso_group] || rec.iso_group;
  const seg = [];
  if (rec.vc_min_mpm != null) seg.push(`Vc ${rec.vc_min_mpm}-${rec.vc_max_mpm} m/min`);
  if (rec.feed_min_mm != null) {
    const lbl = rec.feed_type === "fn_per_rev" ? "fn" : "fz";
    const unit = rec.feed_type === "fn_per_rev" ? "mm/rev" : "mm/tooth";
    seg.push(`${lbl} ${rec.feed_min_mm}-${rec.feed_max_mm} ${unit}`);
  }
  const op = rec.operation && rec.operation !== "general" ? ` (${rec.operation})` : "";
  return `${head} in ${iso}${op}: ${seg.join(", ")}.`;
}

export function toManufacturerSpeedFeed(records) {
  // group by series+iso -> widest range; emit oscar's ManufacturerSpeedFeed shape (m/min, mm/tooth).
  // ONLY per-tooth (milling) records -- turning/drilling fn (mm/rev) is NOT mm/tooth and would
  // corrupt a milling fz lookup; that data stays in records[] with feed_type='fn_per_rev'.
  const map = new Map();
  for (const r of records) {
    if (r.feed_type === "fn_per_rev") continue;
    if (r.vc_min_mpm == null && r.fz_min_mm == null) continue;
    const key = `${r.series}|${r.iso_group}`;
    const cur = map.get(key) || {
      series: r.series, isoGroup: r.iso_group,
      vc_min: Infinity, vc_max: -Infinity, fz_min: Infinity, fz_max: -Infinity,
      dc_min: undefined, dc_max: undefined,
    };
    if (r.vc_min_mpm != null) { cur.vc_min = Math.min(cur.vc_min, r.vc_min_mpm); cur.vc_max = Math.max(cur.vc_max, r.vc_max_mpm); }
    if (r.fz_min_mm != null) { cur.fz_min = Math.min(cur.fz_min, r.fz_min_mm); cur.fz_max = Math.max(cur.fz_max, r.fz_max_mm); }
    if (typeof r.dc_min === "number") cur.dc_min = cur.dc_min == null ? r.dc_min : Math.min(cur.dc_min, r.dc_min);
    if (typeof r.dc_max === "number") cur.dc_max = cur.dc_max == null ? r.dc_max : Math.max(cur.dc_max, r.dc_max);
    map.set(key, cur);
  }
  const fix = (v, d) => (isFinite(v) ? v : d);
  return [...map.values()].map((c) => {
    const o = { series: c.series, isoGroup: c.isoGroup };
    if (isFinite(c.vc_min)) { o.vc_min = c.vc_min; o.vc_max = c.vc_max; } else { o.vc_min = 0; o.vc_max = 0; }
    o.fz_min = fix(c.fz_min, 0); o.fz_max = fix(c.fz_max, 0);
    if (c.dc_min != null) o.dc_min = c.dc_min;
    if (c.dc_max != null) o.dc_max = c.dc_max;
    return o;
  });
}

export function slug(s) {
  return String(s).toLowerCase().replace(/\.pdf$/i, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

export function guessVendor(filename) {
  const f = filename.toLowerCase();
  const known = [
    // GC_2023-2024 = Tungaloy General Catalog (grades T9215/T6215/AH62xx; slogan "we ADD"). NOT Sandvik.
    ["tungaloy", /tungaloy|gc_2023|gc_20\d\d/], ["sandvik", /sandvik|coromant/],
    ["kennametal", /kennametal|master catalog 2018/],
    // SECO catalog naming convention "Milling/Turning/Threading 2018.1" (grades H15, XOMX*, Jabro)
    ["seco", /\bseco\b|jabro|(?:milling|turning|threading)\s*2018/], ["iscar", /iscar/], ["korloy", /korloy/], ["osg", /\bosg\b/],
    ["guhring", /guhring/], ["sgs", /\bsgs\b/], ["ma-ford", /ma_ford|ma ford/], ["emuge", /emuge/],
    ["accupro", /accupro/], ["tungaloy", /tungaloy/], ["walter", /walter/], ["mitsubishi", /mitsubishi/],
    ["harvey", /harvey/], ["helical", /helical/], ["niagara", /niagara/], ["yg1", /yg1|yg-1/],
    ["widia", /widia/], ["ingersoll", /ingersoll/], ["big-daishowa", /daishowa/], ["rego-fix", /rego.?fix/],
    ["global-cnc", /global-cnc/], ["rapidkut", /rapidkut/],
  ];
  for (const [name, re] of known) if (re.test(f)) return name;
  const base = filename.replace(/\.pdf$/i, "").split(/[_\s-]/)[0];
  return slug(base) || "unknown";
}

// ── io helpers ────────────────────────────────────────────────────────────────
function readJson(p, dflt) { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return dflt; } }
function ensureDirs() { for (const d of [OUT_DIR, path.dirname(TIPS)]) fs.mkdirSync(d, { recursive: true }); }
// yield priority (lower = drained first): cutting-tool makers carry the dense SFM/feed tables;
// workholding/holders/coolant/fixturing carry NO cutting data -> drain last. Maximizes valuable
// records-per-run so the durable task hits the goldmines (SECO gave 70 records in 16 pages) first.
const HIGH_YIELD_VENDOR = /sandvik|coromant|kennametal|\bseco\b|jabro|iscar|korloy|\bosg\b|guhring|tungaloy|widia|walter|mitsubishi|\bsgs\b|ma.?ford|harvey|helical|niagara|yg.?1|emuge|kyocera|sumitomo|gc_20\d\d|(?:milling|turning|threading)\s*2018|accupro|rapidkut/i;
const CUTTING_WORD = /milling|turning|drilling|end.?mill|insert|carbide|reamer|\btap\b|thread|grooving|solid/i;
const NO_CUTTING = /vise|fixtur|workhold|holder|coolant|lubric|clamp|collet|chuck|orange.?vise|camfix|rego.?fix|daishowa|tooling.?systems/i;
export function catalogPriority(filename) {
  const f = String(filename).toLowerCase();
  if (NO_CUTTING.test(f)) return 3;        // no SFM data
  if (HIGH_YIELD_VENDOR.test(f)) return 0;  // known cutting-tool maker
  if (CUTTING_WORD.test(f)) return 1;       // generic cutting-tool catalog
  return 2;                                  // unknown
}
function listCatalogs() {
  // RECURSIVE: the 287 catalog PDFs are nested under uploaded/ subdirs, not just top-level.
  const out = [];
  const walk = (dir) => {
    let entries; try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name.toLowerCase().endsWith(".pdf")) out.push(full);
    }
  };
  if (fs.existsSync(CAT_DIR)) walk(CAT_DIR);
  // yield priority first, then name (stable, deterministic resume)
  return out.sort((a, b) => catalogPriority(path.basename(a)) - catalogPriority(path.basename(b)) || a.localeCompare(b));
}
const relPath = (p) => path.relative(CAT_DIR, p).replace(/\\/g, "/");
function catId(p) { return crypto.createHash("sha1").update(relPath(p)).digest("hex").slice(0, 12); }

async function ollamaExtract(pageText, signal) {
  const userPrompt = `CATALOG PAGE TEXT:\n${pageText}\n\nReturn the JSON array of cutting recommendations on this page.`;
  try {
    const r = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: userPrompt }],
        stream: false,
        options: { temperature: 0.1, num_predict: 2048 },
      }),
      signal,
    });
    if (!r.ok) return { ok: false, err: `ollama http ${r.status}` };
    const j = await r.json();
    const content = j?.message?.content;
    if (typeof content !== "string") return { ok: false, err: "ollama empty" };
    return { ok: true, content };
  } catch (e) {
    return { ok: false, err: `ollama ${e.name === "AbortError" ? "timeout" : e.message}` };
  }
}

function selectPages(pdfPath) {
  const res = spawnSync(PY, [path.join(ROOT, "scripts/catalog-cutting-page-extract.py"), pdfPath, "--max-pages", String(MAX_PAGES)],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, timeout: 8 * 60 * 1000, windowsHide: true });
  if (res.status !== 0 || !res.stdout) return { error: res.stderr?.slice(0, 200) || `py exit ${res.status}`, pages: [] };
  try { return JSON.parse(res.stdout); } catch (e) { return { error: `parse: ${e.message}`, pages: [] }; }
}

async function processCatalog(pdfPath, startIdx = 0, window = Infinity) {
  const filename = path.basename(pdfPath);
  const vendor = guessVendor(filename);
  const sel = selectPages(pdfPath);
  if (sel.error) return { filename, vendor, error: sel.error, records: 0 };
  const allPages = sel.pages || [];
  const slice = allPages.slice(startIdx, startIdx + window);
  const records = [];
  let pagesWithData = 0;
  // bounded Ollama concurrency -- Blackwell 96GB serves several qwen2.5-coder:32b requests at once
  // (the gap is UTILIZATION); keep modest so the catalog task + general drain can coexist on the GPU.
  const conc = Math.max(1, parseInt(process.env.PRISM_CATALOG_OLLAMA_CONCURRENCY || "3", 10));
  for (let i = 0; i < slice.length; i += conc) {
    const chunk = slice.slice(i, i + conc);
    const settled = await Promise.all(chunk.map(async (pg) => {
      const ac = new AbortController();
      const to = setTimeout(() => ac.abort(), PAGE_TIMEOUT_MS);
      const r = await ollamaExtract(pg.text, ac.signal);
      clearTimeout(to);
      return { pg, r };
    }));
    for (const { pg, r } of settled) {
      if (!r.ok) continue;
      const raw = coerceJsonArray(r.content);
      let kept = 0;
      for (const rec of raw) {
        const v = validateRecord(rec);
        if (!v.ok) continue;
        records.push({ ...v.normalized, vendor, source_pdf: filename, source_page: pg.page });
        kept++;
      }
      if (kept) pagesWithData++;
    }
  }
  // dedup identical (series|iso|vc|fz)
  const seen = new Set();
  const uniq = records.filter((r) => {
    const k = `${r.series}|${r.iso_group}|${r.vc_min_mpm}|${r.vc_max_mpm}|${r.fz_min_mm}|${r.fz_max_mm}`;
    if (seen.has(k)) return false; seen.add(k); return true;
  });
  return {
    filename, rel: relPath(pdfPath), vendor, totalPages: sel.total_pages, selectedPages: sel.selected,
    pagesProcessedThisRun: slice.length, startIdx, pagesWithData, records: uniq,
  };
}

// merge new records into any existing per-catalog JSON (windowed runs accumulate -- nothing skipped)
function writeOutputs(result) {
  const key = slug(result.rel || result.filename);
  const outPath = path.join(OUT_DIR, `${key}.json`);
  const prev = fs.existsSync(outPath) ? readJson(outPath, { records: [] }) : { records: [] };
  const merged = [...(prev.records || []), ...result.records];
  const seen = new Set();
  const records = merged.filter((r) => {
    const k = `${r.series}|${r.iso_group}|${r.feed_type}|${r.vc_min_mpm}|${r.vc_max_mpm}|${r.feed_min_mm}|${r.feed_max_mm}|${r.source_page}`;
    if (seen.has(k)) return false; seen.add(k); return true;
  });
  const msf = toManufacturerSpeedFeed(records);
  const out = {
    schemaVersion: "1.0.0", store: "catalog-cutting-params", vendor: result.vendor, source_pdf: result.filename,
    generatedAt: new Date().toISOString(), generatedBy: "scripts/extract-catalog-cutting-params.mjs",
    advisoryOnly: true, must_human_verify: true,
    stats: { totalPages: result.totalPages, selectedPages: result.selectedPages, records: records.length, seriesIsoPairs: msf.length },
    records, manufacturerSpeedFeed: msf,
  };
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  // tribal tips -> append-only jsonl the embed pipeline consumes (id keyed so re-runs are idempotent on ingest)
  const tipRows = result.records.map((r) => JSON.stringify({
    id: `catalog-cutting:${key}:${r.series}:${r.iso_group}:${r.source_page}`,
    domain: "speed-feed", source: result.filename, page: r.source_page,
    tip: recordToTribalTip(r, result.vendor),
    meta: { vendor: result.vendor, series: r.series, iso: r.iso_group, tool_type: r.tool_type, coating: r.coating, feed_type: r.feed_type },
  }));
  if (tipRows.length) fs.appendFileSync(TIPS, tipRows.join("\n") + "\n");
  return { ...out.stats, newRecords: result.records.length };
}

async function main() {
  ensureDirs();
  const argv = process.argv.slice(2);
  const flags = { status: false, maxCatalogs: 3, catalog: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--status") flags.status = true;
    else if (a === "--max-catalogs") flags.maxCatalogs = parseInt(argv[++i], 10);
    else if (a === "--catalog") flags.catalog = argv[++i];
  }
  const all = flags.catalog ? [flags.catalog] : listCatalogs();
  const cursor = readJson(CURSOR, { done: {} });

  const isComplete = (p) => cursor.done[catId(p)]?.complete === true;
  if (flags.status) {
    const complete = all.filter(isComplete).length;
    const started = Object.keys(cursor.done).length;
    let totalRecords = 0;
    for (const f of fs.existsSync(OUT_DIR) ? fs.readdirSync(OUT_DIR) : []) {
      if (f.startsWith("_") || !f.endsWith(".json")) continue;
      totalRecords += readJson(path.join(OUT_DIR, f), { stats: {} })?.stats?.records || 0;
    }
    console.log(JSON.stringify({ ok: true, totalCatalogs: all.length, complete, started, remaining: all.length - complete, cuttingRecords: totalRecords }, null, 2));
    return;
  }

  // pick catalogs that are not yet COMPLETE (windowed page-level resume -- nothing skipped)
  const todo = all.filter((p) => flags.catalog || !isComplete(p)).slice(0, flags.maxCatalogs);
  console.log(`[catalog-cutting] processing ${todo.length} catalog(s) of ${all.length} (${all.filter(isComplete).length} complete)`);
  for (const pdf of todo) {
    const id = catId(pdf);
    const prev = cursor.done[id] || { pagesProcessed: 0, records: 0 };
    const startIdx = prev.pagesProcessed || 0;
    const t0 = Date.now();
    const res = await processCatalog(pdf, startIdx, PAGE_WINDOW);
    if (res.error) {
      console.log(`  ✗ ${res.filename}: ${res.error}`);
      cursor.done[id] = { ...prev, error: res.error, at: new Date().toISOString() };
    } else {
      const stats = writeOutputs(res);
      const pagesProcessed = startIdx + res.pagesProcessedThisRun;
      const complete = pagesProcessed >= res.selectedPages;
      console.log(`  ✓ ${res.filename} [${res.vendor}] pages ${startIdx}-${pagesProcessed}/${res.selectedPages} new=${stats.newRecords} total=${stats.records} series×iso=${stats.seriesIsoPairs}${complete ? " COMPLETE" : ""} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
      cursor.done[id] = { vendor: res.vendor, pagesProcessed, selectedPages: res.selectedPages, records: stats.records, complete, at: new Date().toISOString() };
      fs.appendFileSync(PROGRESS, JSON.stringify({ at: new Date().toISOString(), file: res.filename, vendor: res.vendor, pagesProcessed, selectedPages: res.selectedPages, newRecords: stats.newRecords, totalRecords: stats.records, complete }) + "\n");
    }
    fs.writeFileSync(CURSOR, JSON.stringify(cursor, null, 2));
  }
  console.log(`[catalog-cutting] batch done. complete=${all.filter(isComplete).length}/${all.length}`);
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1] === __filename) {
  main().catch((e) => { console.error("FATAL", e); process.exit(1); });
}
