#!/usr/bin/env node
/**
 * ingest-tribal-tips-to-seeds.mjs
 *
 * Feeds the AI-generated tribal tips (from generate-pdf-tribal-tips-hermes.mjs +
 * the existing youtube-extraction tips) into the tribal-by-domain store that the
 * PRISM app + skills already read: state/shared/cad-cam-pdf-tribal-seeds.json
 * (consumed by tribal-by-domain-inject + /shop-knowledge). This replaces the 4
 * generic POINTER seeds with REAL per-source tribal-tip entries.
 *
 * Sources (re-runnable, idempotent by id):
 *   - state/shared/pdf-tribal-tips/tips.jsonl    (PDF corpus, one row per source doc)
 *   - state/shared/youtube-extraction/*.json     (videos, existing .tips arrays)
 *
 * SAFE: writes ONLY the seeds JSON (atomic temp+rename). Does NOT touch the
 * fragile 33K-entry tribal-embed-index (that re-embed is a careful follow-up).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SEEDS = path.join(ROOT, "state", "shared", "cad-cam-pdf-tribal-seeds.json");
const PDF_TIPS = path.join(ROOT, "state", "shared", "pdf-tribal-tips", "tips.jsonl");
const YT_DIR = path.join(ROOT, "state", "shared", "youtube-extraction");
// Hermes per-domain enrichment-loop staging (capture-tip schema). Produced by
// hermes-domain-enrichment-loop.mjs; previously stranded at staging (the live
// tribal-by-domain store never consumed it). This is the india/golf-owned
// shard-safe hop: seeds JSON only, NOT the V8-cap embed index.
const HERMES_STAGING = path.join(ROOT, "state", "shared", "staging", "hermes-enrichment-loop-tips.json");
const SCHEMA_VERSION = "2.0.0";

const slug = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "x";

/**
 * Pull the tip text out of one video-tip record. The youtube-extraction tips are
 * shaped `{id, title, body, category, tags, ...}` -- the knowledge is in `body`
 * (NOT `tip`/`text`, which an earlier reader assumed -> 0 video tips ingested).
 * Enrich with the per-tip title so the seed text carries the headline + detail.
 * Tolerates plain strings + the legacy `tip`/`text` shapes. Pure + exported.
 */
export function videoTipText(t) {
  if (typeof t === "string") return t.trim();
  if (!t || typeof t !== "object") return "";
  const body = String(t.body || t.tip || t.text || "").trim();
  if (!body) return "";
  const title = String(t.title || "").trim();
  return title && title !== body ? `${title}: ${body}` : body;
}

/** Build one seed entry per source document (its tips joined as a bulleted text). */
export function seedFromTips({ id, domain, software, title, source, tips, sourceCorpus, sourceType }) {
  const clean = (Array.isArray(tips) ? tips : []).map((t) => String(t).trim()).filter(Boolean);
  return {
    id,
    domain: domain || "manufacturing",
    software: software || null,
    title: title || source || id,
    text: clean.map((t) => `- ${t}`).join("\n"),
    tipCount: clean.length,
    sourceCorpus: sourceCorpus || "ai-tribal",
    tags: ["tribal", "ai-generated", domain, software].filter(Boolean),
    sourceType: sourceType || "ai-generated-hermes",
    source: source || null,
  };
}

function readPdfTips() {
  if (!fs.existsSync(PDF_TIPS)) return [];
  const out = [];
  for (const line of fs.readFileSync(PDF_TIPS, "utf-8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const r = JSON.parse(line);
      if (!r || !Array.isArray(r.tips) || r.tips.length === 0) continue;
      out.push(seedFromTips({ id: `tribal-ai-pdf-${r.sha8 || slug(r.title)}`, domain: r.domain, software: r.software, title: r.title, source: r.source, tips: r.tips, sourceCorpus: "cad-cam-pdf-nodes", sourceType: `ai-generated-${r.via || "hermes"}` }));
    } catch { /* tolerate torn line */ }
  }
  return out;
}

function readVideoTips() {
  const out = [];
  let files = [];
  try { files = fs.readdirSync(YT_DIR); } catch { return out; }
  for (const f of files) {
    if (!f.endsWith(".json") || f.includes("fallback")) continue;
    let j;
    try { j = JSON.parse(fs.readFileSync(path.join(YT_DIR, f), "utf-8")); } catch { continue; }
    const tips = j.tips || j.tribal_tips || [];
    const tipTexts = (Array.isArray(tips) ? tips : []).map(videoTipText).filter(Boolean);
    if (tipTexts.length === 0) continue;
    const id = `tribal-ai-video-${slug(f.replace(/\.json$/, ""))}`;
    const title = (j.meta && (j.meta.title || j.meta.video_title)) || j.title || f;
    out.push(seedFromTips({ id, domain: (j.meta && j.meta.domain) || "machining", software: (j.meta && j.meta.software) || null, title, source: (j.meta && j.meta.url) || f, tips: tipTexts, sourceCorpus: "youtube-extraction", sourceType: "ai-generated-video" }));
  }
  return out;
}

/** Domain from a Hermes capture-tip's `domain:<x>` tag (e.g. "domain:mill" -> "mill"). */
export function hermesTipDomain(tip) {
  const tags = Array.isArray(tip && tip.tags) ? tip.tags : [];
  for (const t of tags) {
    const m = /^domain:(.+)$/.exec(String(t || "").trim());
    if (m) return m[1].toLowerCase();
  }
  return "manufacturing";
}

/**
 * Hermes per-domain enrichment-loop tips -> one seed PER TIP. These are atomic,
 * pre-tagged rules (each with its OWN stable id `hkl-<domain>-NNN`, source cite,
 * confidence + safety/needs_specialist_confirm flags) -- so per-tip granularity
 * (NOT the per-document grouping PDF/video use) preserves that metadata and lets
 * the consumer rank individual rules. Unreviewed-cron items keep the advisory
 * boundary (`verify:unreviewed-cron` tag + needsSpecialistConfirm) so no consumer
 * fires a gate on LLM-asserted knowledge. Idempotent by the tip's own id.
 */
export function readHermesEnrichmentTips(stagingPath = HERMES_STAGING) {
  if (!fs.existsSync(stagingPath)) return [];
  let doc;
  try { doc = JSON.parse(fs.readFileSync(stagingPath, "utf-8")); } catch { return []; }
  const tips = Array.isArray(doc && doc.tips) ? doc.tips : [];
  const out = [];
  for (const t of tips) {
    if (!t || typeof t !== "object") continue;
    const text = String(t.title || t.body || "").trim();
    if (!text || !t.id) continue;
    const domain = hermesTipDomain(t);
    const seed = seedFromTips({
      id: String(t.id),
      domain,
      software: null,
      title: text.slice(0, 140),
      source: t.source || null,
      tips: [text],
      sourceCorpus: "hermes-enrichment-loop",
      sourceType: "ai-generated-hermes",
    });
    if (typeof t.confidence === "number") seed.confidence = t.confidence;
    if (t.needs_specialist_confirm || t.safety) {
      seed.needsSpecialistConfirm = true;
      seed.tags = [...seed.tags, "verify:unreviewed-cron"];
    }
    out.push(seed);
  }
  return out;
}

/** Merge new seeds into the existing tips[] by id (new wins), keep prior entries. */
export function mergeSeeds(existing, fresh) {
  const byId = new Map();
  for (const e of (existing && Array.isArray(existing.tips) ? existing.tips : [])) if (e && e.id) byId.set(e.id, e);
  for (const e of fresh) byId.set(e.id, e);
  const tips = [...byId.values()];
  return { schemaVersion: SCHEMA_VERSION, generatedAt: existing && existing.generatedAt ? existing.generatedAt : null, totalSeeds: tips.length, totalTips: tips.reduce((n, e) => n + (e.tipCount || 0), 0), tips };
}

function main() {
  const fresh = [...readPdfTips(), ...readVideoTips(), ...readHermesEnrichmentTips()];
  let existing = {};
  try { existing = JSON.parse(fs.readFileSync(SEEDS, "utf-8")); } catch { existing = {}; }
  const merged = mergeSeeds(existing, fresh);
  merged.generatedAt = new Date().toISOString();
  const tmp = `${SEEDS}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(merged, null, 2), "utf-8");
  fs.renameSync(tmp, SEEDS);
  console.log(JSON.stringify({ ok: true, freshSeeds: fresh.length, totalSeeds: merged.totalSeeds, totalTips: merged.totalTips, seeds: SEEDS.replace(ROOT + path.sep, "") }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { main(); } catch (e) { console.error(String(e && e.message ? e.message : e)); process.exit(1); }
}
