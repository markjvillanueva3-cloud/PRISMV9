#!/usr/bin/env node
/**
 * stage-hermes-knowledge-tips.mjs  (HERMES-KNOWLEDGE / U-PARALLEL-HERMES-WAVE2, slot:zulu)
 *
 * Parse the two committed Hermes knowledge-enrichment specs (wave 1 + wave 2)
 * and emit a STAGING file in the canonical tribal capture-tip schema
 * (state/tribal_captured_tips.json shape) so the shard-safe writer (golf/india)
 * can embed all 84 cited items with one run -- WITHOUT this script ever touching
 * the live tribal index (shard-clobber discipline, [[reference_tribal_shard_read_clobber_2026_06_10]]).
 *
 * Output: state/shared/staging/hermes-knowledge-tips-staging.json (advisory; review-then-embed).
 *
 * Confidence map (from zulu's R12 verification tag in the spec):
 *   [C] confirms existing doctrine -> 70
 *   [N] new/extends                -> 55
 *   [ARITH?] worked-number suspect -> 40 (ingest rule+formula, NOT the bad example number)
 *   (default)                      -> 50
 *
 * Idempotent + deterministic (stable ids, no Date.now in ids). Run:
 *   node scripts/stage-hermes-knowledge-tips.mjs            # write the staging file
 *   node scripts/stage-hermes-knowledge-tips.mjs --dry      # print summary only
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const ROOT = resolve(process.cwd());
const SPECS_DIR = "state/shared/specs";

// Discover every Hermes knowledge-enrichment spec by GLOB (not a hardcoded list). Each new
// parallel-agent wave (WAVE3, WAVE4, ...) then auto-flows to the tribal + LoRA consumers with
// ZERO code change -- durability (R15). Wave number is parsed from the filename (WAVE<n> -> n;
// the PRIMARY-DOMAINS baseline, which has no WAVE token, is wave 1) so the hk-w<wave>-<dom>-NNN
// ids stay stable + collision-free across waves. Sorted by wave for deterministic id sequencing.
export function discoverSpecs(root = ROOT) {
  let files = [];
  try { files = readdirSync(resolve(root, SPECS_DIR)); } catch { return []; }
  return files
    .filter((f) => /^HERMES-KNOWLEDGE-ENRICHMENT-.*\.md$/i.test(f))
    .map((f) => {
      const m = /WAVE(\d+)/i.exec(f);
      const wave = m ? parseInt(m[1], 10) : 1; // PRIMARY-DOMAINS (no WAVE token) = wave 1
      return { wave, path: `${SPECS_DIR}/${f}`, file: f };
    })
    .sort((a, b) => a.wave - b.wave || a.file.localeCompare(b.file));
}
const SPECS = discoverSpecs(ROOT);
const OUT = "state/shared/staging/hermes-knowledge-tips-staging.json";
const CREATED_AT = "2026-06-29"; // fixed (deterministic) -- the campaign date

// domain header -> ingestion metadata
const DOMAIN_META = {
  MILL:   { galaxy: "mill",           category: "milling",         operation_types: ["milling"] },
  LATHE:  { galaxy: "lathe",          category: "turning",         operation_types: ["turning"] },
  WEDM:   { galaxy: "wedm",           category: "wedm",            operation_types: ["wire_edm"] },
  CAM:    { galaxy: "cam",            category: "cam",             operation_types: ["cam_strategy"] },
  "POST-PROCESSOR": { galaxy: "post-processor", category: "post_processor", operation_types: ["post"] },
  POST:   { galaxy: "post-processor", category: "post_processor",  operation_types: ["post"] },
  CAD:    { galaxy: "cad",            category: "cad_gdt",         operation_types: ["cad"] },
};

function domainFromHeader(line) {
  // "## MILL (foxtrot)" / "## POST-PROCESSOR (echo) -- dialect..." -> key
  const m = line.replace(/^##\s+/, "").match(/^([A-Z][A-Z-]+)/);
  if (!m) return null;
  const key = m[1].toUpperCase();
  return DOMAIN_META[key] ? key : null;
}

function splitRow(line) {
  // "| a | b | c |" -> ["a","b","c"] (trim, drop leading/trailing empties)
  const cells = line.split("|").map((c) => c.trim());
  if (cells.length && cells[0] === "") cells.shift();
  if (cells.length && cells[cells.length - 1] === "") cells.pop();
  return cells;
}

function isSeparator(cells) {
  return cells.length > 0 && cells.every((c) => /^:?-{2,}:?$/.test(c.replace(/\s/g, "")));
}

export function confidenceFor(tagCell) {
  const t = (tagCell || "").toUpperCase();
  let base;
  if (t.includes("ARITH")) base = 40;
  else if (t.includes("[N]")) base = 55;
  else if (t.includes("[C]")) base = 70;
  else base = 50;
  // A rule-sound but citation-UNVERIFIED item ([CITE?]) is down-weighted: the specific source
  // page is LLM-asserted (not corroborated), so it is weaker recall than a canonical-cited item.
  if (t.includes("CITE")) base = Math.min(base, 45);
  return base;
}

function parseSpec(wave, mdText) {
  const lines = mdText.split(/\r?\n/);
  const rows = [];
  let domain = null;
  let header = null; // {rule, expl, source, safety, tag} -> column index
  for (const line of lines) {
    if (/^##\s/.test(line)) {
      const d = domainFromHeader(line);
      domain = d; // null when a non-domain ## section (## SUMMARY etc) -> stops capture
      header = null;
      continue;
    }
    if (!domain || !line.trim().startsWith("|")) continue;
    const cells = splitRow(line);
    if (isSeparator(cells)) continue;
    if (!header) {
      // first table row in a domain section = header; map columns by name
      const idx = {};
      cells.forEach((c, i) => {
        const lc = c.toLowerCase();
        if (lc === "rule") idx.rule = i;
        else if (lc === "source") idx.source = i;
        else if (lc === "safety") idx.safety = i;
        else if (lc.includes("zulu") || lc === "tag") idx.tag = i;
        else if (
          idx.expl === undefined &&
          (lc.includes("formula") || lc.includes("threshold") || lc.includes("dialect") ||
           lc.includes("clause") || lc.includes("value") || lc.includes("difference"))
        ) idx.expl = i;
      });
      // require at least rule+source to treat as a real knowledge table
      if (idx.rule !== undefined && idx.source !== undefined) header = idx;
      continue;
    }
    // data row
    const rule = cells[header.rule];
    if (!rule || rule === "#") continue;
    const expl = header.expl !== undefined ? cells[header.expl] : "";
    const source = header.source !== undefined ? cells[header.source] : "";
    const safetyCell = header.safety !== undefined ? (cells[header.safety] || "") : "";
    const tagCell = header.tag !== undefined ? (cells[header.tag] || "") : "";
    rows.push({ wave, domain, rule, expl, source, safety: /yes/i.test(safetyCell), tag: tagCell });
  }
  return rows;
}

function toTip(r, seq) {
  const meta = DOMAIN_META[r.domain];
  const conf = confidenceFor(r.tag);
  const arith = /ARITH/i.test(r.tag);
  const cite = /CITE/i.test(r.tag); // rule-sound but citation LLM-asserted / not page-verified
  const tags = [
    `domain:${meta.galaxy}`,
    "hermes:parallel-agent", // model varies by wave (grok wave1/2, deepseek-v4-pro wave3+); attribution is generic
    `wave:${r.wave}`,
  ];
  if (r.safety) tags.push("safety:gate-candidate"); // specialist confirms vs cite before firing
  if (/\[C\]/i.test(r.tag)) tags.push("verify:confirms-doctrine");
  if (/\[N\]/i.test(r.tag)) tags.push("verify:new");
  if (arith) tags.push("verify:worked-number-suspect");
  if (cite) tags.push("verify:citation-unverified");
  const bodyParts = [r.rule];
  if (r.expl) bodyParts.push(`formula/threshold: ${r.expl}`);
  if (arith) bodyParts.push("CAUTION: worked example arithmetic flagged -- use rule+formula, recompute the number");
  if (cite) bodyParts.push("NOTE: citation is LLM-asserted, not page-verified -- confirm the source before relying on it");
  return {
    title: r.rule.slice(0, 140),
    body: bodyParts.join(" | "),
    category: meta.category,
    tags,
    material_groups: [],
    operation_types: meta.operation_types.slice(),
    confidence: conf,
    source: `hermes:parallel-agent (wave ${r.wave}) | cite: ${r.source || "n/a"}`,
    id: `hk-w${r.wave}-${meta.galaxy}-${String(seq).padStart(3, "0")}`,
    created_at: CREATED_AT,
    usage_count: 0,
    safety: r.safety,
    needs_specialist_confirm: r.safety || arith || cite,
  };
}

function main() {
  const dry = process.argv.includes("--dry");
  let allRows = [];
  for (const s of SPECS) {
    const p = resolve(ROOT, s.path);
    if (!existsSync(p)) {
      console.error(`MISSING spec: ${s.path}`);
      continue;
    }
    const rows = parseSpec(s.wave, readFileSync(p, "utf8"));
    console.log(`wave ${s.wave}: parsed ${rows.length} rows from ${s.path}`);
    allRows = allRows.concat(rows);
  }
  // per (wave,domain) sequence for stable ids
  const seqByKey = {};
  const tips = allRows.map((r) => {
    const k = `${r.wave}:${r.domain}`;
    seqByKey[k] = (seqByKey[k] || 0) + 1;
    return toTip(r, seqByKey[k]);
  });
  const byDomain = {};
  for (const t of tips) {
    const g = t.tags.find((x) => x.startsWith("domain:"));
    byDomain[g] = (byDomain[g] || 0) + 1;
  }
  console.log(`TOTAL tips: ${tips.length}`);
  console.log("by domain:", JSON.stringify(byDomain));
  console.log(`safety/needs-confirm: ${tips.filter((t) => t.needs_specialist_confirm).length}`);
  if (dry) {
    console.log("--dry: not writing. sample:", JSON.stringify(tips[0], null, 2));
    return;
  }
  const outAbs = resolve(ROOT, OUT);
  mkdirSync(dirname(outAbs), { recursive: true });
  const payload = {
    schemaVersion: 1,
    artifact: "hermes-knowledge-tips-staging",
    generatedBy: "scripts/stage-hermes-knowledge-tips.mjs (slot:zulu)",
    note: "ADVISORY staging. Review-then-embed via the shard-safe tribal writer (golf/india). NOT the live index. safety/needs_specialist_confirm items: specialist confirms threshold vs the cited source before any gate fires.",
    sourceSpecs: SPECS.map((s) => s.path),
    count: tips.length,
    tips,
  };
  writeFileSync(outAbs, JSON.stringify(payload, null, 2) + "\n");
  console.log(`WROTE ${OUT} (${tips.length} tips)`);
}

main();
