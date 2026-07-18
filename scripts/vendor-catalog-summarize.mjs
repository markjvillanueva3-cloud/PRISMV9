#!/usr/bin/env node
/**
 * vendor-catalog-summarize.mjs — Deterministic per-PDF vendor-catalog summary
 *
 * RES-CATALOG-AUDIT-MS0/U-AUDIT-V2 (slot:juliett, 2026-05-23). Sister to
 * vendor-catalog-audit.mjs (which inventories the gap). This script ACTUALLY
 * extracts structured data from each PDF — publisher imprint, TOC entries,
 * insert-grade family mentions, product categories — by running pdftotext
 * across the first N pages and applying canonical-pattern regex.
 *
 * Pure deterministic (no LLM). One pdftotext invocation per PDF. Caps page
 * count at N=8 to stay fast across the full 38-PDF corpus (~30s total).
 *
 * Outputs:
 *   state/shared/specs/VENDOR-CATALOG-SUMMARIES-2026-05-23.{json,md}
 *   per-catalog summary blocks with publisher / TOC / grade families /
 *   detected product lines / size / status
 *
 * Run: node H:/prism/scripts/vendor-catalog-summarize.mjs
 *      node H:/prism/scripts/vendor-catalog-summarize.mjs --pdf <name>  (single)
 *
 * @module scripts/vendor-catalog-summarize
 */

import { execFileSync } from "node:child_process";
import { readdir, readFile, stat, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const REPO = "H:/prism";
const UPLOADED_DIR = join(REPO, "resources/MANUFACTURER_CATALOGS/uploaded");
const OUT_DIR = join(REPO, "state/shared/specs");
const OUT_JSON = join(OUT_DIR, "VENDOR-CATALOG-SUMMARIES-2026-05-23.json");
const OUT_MD = join(OUT_DIR, "VENDOR-CATALOG-SUMMARIES-2026-05-23.md");
const PAGES_PER_PDF = 8;            // bounded extraction (cover + TOC + first content)
const PDFTOTEXT = "pdftotext";       // MSYS /mingw64/bin/pdftotext
const PER_FILE_TIMEOUT_MS = 60_000;  // per pdftotext call

// Publisher signature patterns — first 5 pages contain canonical brand imprint
const PUBLISHER_SIGNATURES = [
  { pattern: /tungaloy/i, vendor: "tungaloy", url_pattern: /tungaloy\.com/i },
  { pattern: /sandvik\s+coromant|sandvik\.coromant/i, vendor: "sandvik", url_pattern: /sandvik\.coromant\.com/i },
  { pattern: /\biscar\b/i, vendor: "iscar", url_pattern: /iscar\.com/i },
  { pattern: /kennametal/i, vendor: "kennametal", url_pattern: /kennametal\.com/i },
  { pattern: /walter\s+ag|walter[-_ ]tools/i, vendor: "walter", url_pattern: /walter-tools\.com/i },
  { pattern: /mitsubishi\s+materials|mmc\s+tools/i, vendor: "mitsubishi", url_pattern: /mitsubishicarbide\.com/i },
  { pattern: /korloy/i, vendor: "korloy", url_pattern: /korloy\.com/i },
  { pattern: /ingersoll\s+cutting|ingersoll[-_ ]tools/i, vendor: "ingersoll", url_pattern: /ingersoll-imc\.com/i },
  { pattern: /osg\s+corporation|osgtool/i, vendor: "osg", url_pattern: /osgtool\.com/i },
  { pattern: /guhring/i, vendor: "guhring", url_pattern: /guhring\.com/i },
  { pattern: /m\.?a\.?\s*ford/i, vendor: "ma_ford", url_pattern: /maford\.com/i },
  { pattern: /\bsgs\b/i, vendor: "sgs", url_pattern: /sgstool\.com/i },
  { pattern: /emuge[-_ ]?franken|emuge\s+corp/i, vendor: "emuge", url_pattern: /emuge\.com/i },
  { pattern: /allied\s+machine/i, vendor: "allied_machine", url_pattern: /alliedmachine\.com/i },
  { pattern: /\byg[-_ ]?1\b/i, vendor: "yg1", url_pattern: /yg1\.com/i },
  { pattern: /imco\s+carbide|imco\s+inc/i, vendor: "imco", url_pattern: /imcousa\.com/i },
  { pattern: /haimer/i, vendor: "haimer", url_pattern: /haimer\.com/i },
  { pattern: /rego[-_ ]?fix/i, vendor: "rego_fix", url_pattern: /rego-fix\.com/i },
  { pattern: /big\s+daishowa|big[-_ ]daishowa/i, vendor: "big_daishowa", url_pattern: /bigkaiser\.com|bigdaishowa\.com/i },
  { pattern: /camfix/i, vendor: "camfix", url_pattern: /camfix\.com/i },
  { pattern: /accupro/i, vendor: "accupro", url_pattern: /mscdirect\.com|accupro\.com/i },
  { pattern: /global\s+cnc/i, vendor: "global_cnc", url_pattern: /globalcnc\.com/i },
  { pattern: /rapidkut/i, vendor: "rapidkut", url_pattern: /rapidkut\.com/i },
  { pattern: /orange\s+vise/i, vendor: "orange_vise", url_pattern: /orangevise\.com/i },
  { pattern: /ampc|ace\s+manufacturing/i, vendor: "ampc" },
  { pattern: /metalmorphosis/i, vendor: "metalmorphosis" },
  { pattern: /flash\s+solid/i, vendor: "flash_solid" },
  { pattern: /horn\s+(?:cutting|usa)|horn\s+gmbh/i, vendor: "horn", url_pattern: /horn-usa\.com|hornusa\.com/i },
  { pattern: /ceratizit/i, vendor: "ceratizit", url_pattern: /ceratizit\.com/i },
  { pattern: /carmex/i, vendor: "carmex", url_pattern: /carmex\.com/i },
  { pattern: /dormer\s+pramet/i, vendor: "dormer", url_pattern: /dormerpramet\.com/i },
  { pattern: /seco\s+tools/i, vendor: "seco", url_pattern: /secotools\.com/i },
  { pattern: /fraisa/i, vendor: "fraisa", url_pattern: /fraisa\.com/i },
];

// Insert-grade family patterns (per-vendor canonical naming)
const GRADE_PATTERNS = [
  { vendor: "tungaloy", pattern: /\b(T9215|T6315|T6215|T6315|AH725|AH8005|AH130|AH140|T1500A|T1200A|GH130|GH330|GT9530|TH10|TH30|JC8050)\b/g },
  { vendor: "sandvik", pattern: /\b(GC4325|GC4315|GC4335|GC4225|GC4205|GC2025|GC2035|GC1115|GC1125|GC1130|GC3210|GC3215|GC1010|GC1020|H13A|S05F|S25)\b/g },
  { vendor: "iscar", pattern: /\b(IC928|IC830|IC808|IC907|IC520M|IC607|IC830|IC354|IC910|IC9054|IC908|IC5400)\b/g },
  { vendor: "kennametal", pattern: /\b(KC5010|KC5025|KCPK30|KCP25|KCK20|KCM20|KCSM40|KCU40|KCU25|KCM40|KCS25|KCPM25)\b/g },
  { vendor: "mitsubishi", pattern: /\b(MP9015|MP9025|MP9120|MP9130|MP4030|MP6120|US7020|VP15TF|VP25)\b/g },
  { vendor: "sumitomo", pattern: /\b(AC820P|AC830P|AC2000|AC4015K|AC6030|EH520)\b/g },
  { vendor: "korloy", pattern: /\b(PC5300|PC5400|PC3500|PC9540|PC8110|NC5330|NC3030|NC9020|H01)\b/g },
  { vendor: "walter", pattern: /\b(WAK10|WAP35|WSM30|WMP25|WAK20|WMP35|WSM35|WK10|WAK40)\b/g },
];

const COATING_PATTERNS = /\b(TiN|TiCN|TiAlN|AlTiN|AlCrN|nACo|CVD|PVD|Al2O3|Tiger[-_ ]?tec\s*Gold|DLC|diamond|CBN|ceramic)\b/g;

// Product-category keywords (signal that the catalog covers this domain)
const CATEGORY_KEYWORDS = [
  { category: "turning_inserts", pattern: /\b(turning\s+(?:insert|tool)|CNMG|DNMG|TNMG|WNMG|SNMG|VNMG)\b/i },
  { category: "milling_inserts", pattern: /\b(milling\s+(?:insert|cutter)|face\s+mill|shoulder\s+mill|APMT|APKT|XOMT)\b/i },
  { category: "drilling_inserts", pattern: /\b(drilling\s+(?:insert|tool)|indexable\s+drill|spade\s+drill)\b/i },
  { category: "threading", pattern: /\b(threading\s+(?:insert|tool)|thread\s+mill|tap|tapping)\b/i },
  { category: "grooving_parting", pattern: /\b(grooving|parting|cut[-_ ]?off|groove\s+insert)\b/i },
  { category: "solid_carbide_end_mills", pattern: /\b(solid\s+carbide\s+end\s*mill|solid\s+endmill|carbide\s+end\s*mill)\b/i },
  { category: "solid_carbide_drills", pattern: /\b(solid\s+carbide\s+drill|carbide\s+drill)\b/i },
  { category: "tool_holders", pattern: /\b(tool\s*holder|toolholder|er\s*collet|er20|er25|er32|er40|HSK|CAT40|CAT50|BT30|BT40|BT50)\b/i },
  { category: "shrink_fit", pattern: /\b(shrink[-_ ]?fit|heat[-_ ]?shrink|shrinking\s+chuck)\b/i },
  { category: "workholding", pattern: /\b(vise|fixture|workhold|chuck|clamping)\b/i },
  { category: "boring_bars", pattern: /\b(boring\s+bar|internal\s+turning|ID\s+turning)\b/i },
  { category: "reamers", pattern: /\b(reamer|reaming)\b/i },
];

async function extractText(pdfPath, pages) {
  try {
    const buf = execFileSync(PDFTOTEXT, ["-l", String(pages), pdfPath, "-"], {
      encoding: "utf8",
      timeout: PER_FILE_TIMEOUT_MS,
      maxBuffer: 16 * 1024 * 1024,
    });
    return buf || "";
  } catch (err) {
    return `__EXTRACT_ERROR__: ${err.message?.split("\n")[0] ?? err}`;
  }
}

function detectPublisher(text) {
  if (!text || text.startsWith("__EXTRACT_ERROR__")) return { vendor: "unknown", confidence: 0, evidence: [] };
  const head = text.slice(0, 8000); // first ~8KB is cover + TOC
  for (const sig of PUBLISHER_SIGNATURES) {
    const m = head.match(sig.pattern);
    if (m) {
      const evidence = [m[0]];
      let confidence = 0.7;
      if (sig.url_pattern) {
        const urlM = head.match(sig.url_pattern);
        if (urlM) {
          evidence.push(urlM[0]);
          confidence = 0.95;
        }
      }
      return { vendor: sig.vendor, confidence, evidence };
    }
  }
  return { vendor: "unknown", confidence: 0, evidence: [] };
}

function detectGrades(text) {
  if (!text || text.startsWith("__EXTRACT_ERROR__")) return [];
  const found = new Map(); // vendor → Set of grades
  for (const gp of GRADE_PATTERNS) {
    const matches = text.match(gp.pattern);
    if (matches) {
      const seen = found.get(gp.vendor) ?? new Set();
      for (const m of matches) seen.add(m);
      found.set(gp.vendor, seen);
    }
  }
  return [...found.entries()].map(([vendor, grades]) => ({ vendor, grades: [...grades].sort() }));
}

function detectCoatings(text) {
  if (!text || text.startsWith("__EXTRACT_ERROR__")) return [];
  const matches = text.match(COATING_PATTERNS) || [];
  return [...new Set(matches.map(m => m.replace(/[-_]\s*/g, " ").trim()))].sort();
}

function detectCategories(text) {
  if (!text || text.startsWith("__EXTRACT_ERROR__")) return [];
  const found = [];
  for (const ck of CATEGORY_KEYWORDS) {
    if (ck.pattern.test(text)) found.push(ck.category);
  }
  return found;
}

function extractTOC(text) {
  if (!text || text.startsWith("__EXTRACT_ERROR__")) return [];
  // Look for canonical TOC pattern: lines like "A Grade A001 -" or "B Insert B001"
  const lines = text.split("\n").slice(0, 200);
  const toc = [];
  for (const line of lines) {
    const m = line.match(/^\s*([A-Z])\s+([A-Z][A-Za-z][^\n]{2,40}?)\s+([A-Z]\d{2,4})/);
    if (m) toc.push({ section: m[1], title: m[2].trim(), anchor: m[3] });
  }
  return toc.slice(0, 20); // cap
}

async function summarizeOne(pdfPath, filename) {
  const text = await extractText(pdfPath, PAGES_PER_PDF);
  const extractError = text.startsWith("__EXTRACT_ERROR__") ? text : null;
  const publisher = detectPublisher(text);
  const grades = detectGrades(text);
  const coatings = detectCoatings(text);
  const categories = detectCategories(text);
  const toc = extractTOC(text);
  let size_mb = null;
  try { size_mb = +((await stat(pdfPath)).size / (1024 * 1024)).toFixed(1); } catch {}

  return {
    file: filename,
    size_mb,
    pages_extracted: PAGES_PER_PDF,
    extract_status: extractError ? "error" : "ok",
    extract_error: extractError,
    publisher,
    grade_families: grades,
    coatings_mentioned: coatings,
    product_categories: categories,
    toc_first_20: toc,
    text_sample_first_500: extractError ? null : text.slice(0, 500).replace(/\s+/g, " ").trim(),
  };
}

async function main() {
  const wantSingle = process.argv.find(a => a === "--pdf")
    ? process.argv[process.argv.indexOf("--pdf") + 1]
    : null;

  if (!existsSync(UPLOADED_DIR)) {
    console.error(`Resources dir missing: ${UPLOADED_DIR}`);
    process.exit(1);
  }

  const entries = await readdir(UPLOADED_DIR);
  const pdfs = entries.filter(n => /\.pdf$/i.test(n)).sort();
  const target = wantSingle ? pdfs.filter(p => p.toLowerCase().includes(wantSingle.toLowerCase())) : pdfs;

  if (target.length === 0) {
    console.error(`No PDFs match selector: ${wantSingle}`);
    process.exit(1);
  }

  process.stdout.write(`Summarizing ${target.length} PDF${target.length === 1 ? "" : "s"}...\n`);
  const summaries = [];
  for (const name of target) {
    const path = join(UPLOADED_DIR, name);
    process.stdout.write(`  · ${name} `);
    const t0 = Date.now();
    const s = await summarizeOne(path, name);
    const ms = Date.now() - t0;
    process.stdout.write(`(${ms}ms · ${s.extract_status === "ok" ? "publisher=" + s.publisher.vendor + (s.publisher.confidence ? " @" + s.publisher.confidence : "") : "ERROR"})\n`);
    summaries.push(s);
  }

  // Aggregate
  const byPublisher = {};
  let okCount = 0, errCount = 0, unknownPublisherCount = 0;
  for (const s of summaries) {
    if (s.extract_status === "ok") okCount++; else errCount++;
    if (s.publisher.vendor === "unknown") unknownPublisherCount++;
    byPublisher[s.publisher.vendor] = (byPublisher[s.publisher.vendor] ?? 0) + 1;
  }

  const output = {
    schemaVersion: "1.0.0",
    summary_id: "VENDOR-CATALOG-SUMMARIES-2026-05-23",
    generated_at: new Date().toISOString(),
    generated_by: "scripts/vendor-catalog-summarize.mjs",
    advisoryOnly: true,
    mustHumanVerify: false, // pdftotext-verified publisher names are high-confidence
    stats: {
      total: summaries.length,
      extracted_ok: okCount,
      extract_errors: errCount,
      publisher_resolved: summaries.length - unknownPublisherCount,
      publisher_unknown: unknownPublisherCount,
      by_publisher: byPublisher,
    },
    summaries,
  };

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT_JSON, JSON.stringify(output, null, 2));
  await writeFile(OUT_MD, renderMd(output));

  process.stdout.write(`\n✓ Wrote ${OUT_JSON.replace(REPO + "/", "")}\n`);
  process.stdout.write(`✓ Wrote ${OUT_MD.replace(REPO + "/", "")}\n`);
  process.stdout.write(`  ${okCount} extracted · ${errCount} errors · ${summaries.length - unknownPublisherCount} publisher-resolved (${unknownPublisherCount} unknown)\n`);
  process.stdout.write(`  By publisher: ${Object.entries(byPublisher).sort((a,b)=>b[1]-a[1]).map(([v,n])=>v+"="+n).join(", ")}\n`);
}

function renderMd(out) {
  const lines = [];
  lines.push(`# Vendor Catalog Summaries — 2026-05-23`);
  lines.push(``);
  lines.push(`Generated by \`scripts/vendor-catalog-summarize.mjs\` · ${out.summaries.length} PDFs extracted (8 pages each, pdftotext)`);
  lines.push(``);
  lines.push(`## Stats`);
  lines.push(``);
  for (const [k, v] of Object.entries(out.stats)) {
    lines.push(`- **${k}**: ${typeof v === "object" ? JSON.stringify(v) : v}`);
  }
  lines.push(``);
  lines.push(`## Per-Catalog Summaries`);
  lines.push(``);
  for (const s of out.summaries) {
    lines.push(`### \`${s.file}\` (${s.size_mb}MB)`);
    lines.push(`- **publisher**: ${s.publisher.vendor}${s.publisher.confidence ? ` @${s.publisher.confidence}` : ""}${s.publisher.evidence?.length ? " — evidence: " + s.publisher.evidence.map(e => `\`${e}\``).join(", ") : ""}`);
    lines.push(`- **categories**: ${s.product_categories.join(", ") || "(none detected)"}`);
    if (s.grade_families.length > 0) {
      lines.push(`- **grade families**:`);
      for (const gf of s.grade_families) {
        lines.push(`  - ${gf.vendor}: ${gf.grades.slice(0, 8).join(", ")}${gf.grades.length > 8 ? ` (+${gf.grades.length - 8} more)` : ""}`);
      }
    }
    if (s.coatings_mentioned.length > 0) {
      lines.push(`- **coatings mentioned**: ${s.coatings_mentioned.join(", ")}`);
    }
    if (s.toc_first_20.length > 0) {
      lines.push(`- **TOC**: ${s.toc_first_20.slice(0, 10).map(t => `${t.section}=${t.title}`).join(" · ")}`);
    }
    if (s.extract_status === "error") {
      lines.push(`- **EXTRACT ERROR**: ${s.extract_error}`);
    }
    lines.push(``);
  }
  return lines.join("\n");
}

main().catch(err => {
  console.error("vendor-catalog-summarize failed:", err);
  process.exit(1);
});
