#!/usr/bin/env node
// build-galaxy-free-source-corpus.mjs
// GALAXY-ENRICH (papa, 2026-06-09): extract the verifiable free/legal source
// pointers from every staged deep-domain research packet and emit ONE per-galaxy
// corpus index. R12-safe: this indexes VERIFIABLE source URLs only -- it never
// asserts the (owner-gated, UNVERIFIED) physics claims those packets carry.
// Idempotent: fully regenerated from the staged packets each run.
// Usage: node scripts/build-galaxy-free-source-corpus.mjs [--dry]
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const STAGING_GLOB_DIR = path.join(ROOT, "knowledge", "wiki");
const PACKET = "deep-domain-research-2026-06-09.md";
const OUT = path.join(ROOT, "state", "shared", "specs", "GALAXY-FREE-SOURCE-CORPUS-2026-06-09.md");
const DRY = process.argv.includes("--dry");

const GALAXIES = [
  "ai-training", "system-viz", "speed-feed", "cad", "quality", "mill", "lathe",
  "wedm", "cam", "post-processor", "blueprint-vision", "business", "quoting",
  "academy", "shop-floor",
];

const OWNER = {
  "ai-training": "india", "system-viz": "sierra", "speed-feed": "oscar", "cad": "delta",
  "quality": "(quality-owner)", "mill": "foxtrot", "lathe": "whiskey", "wedm": "mike",
  "cam": "kilo", "post-processor": "echo", "blueprint-vision": "xray", "business": "hotel",
  "quoting": "charlie", "academy": "lima", "shop-floor": "(shop-floor-owner)",
};

// TIER-1 = authoritative primary (gov / edu / standards / open courseware / preprint).
const T1_HOST = /(\.gov|\.edu|nist\.gov|ecfr\.gov|arxiv\.org|ocw\.mit\.edu|nims-skills\.org|openstax\.org|gutenberg\.org|iso\.org|asme\.org|astm\.org|osha\.gov|vlabs\.|nptel\.|doi\.org|ncbi\.nlm)/i;
// TIER-2 = vendor / OEM technical documentation.
const T2_HOST = /(sandvik|coromant|mitsubishi|mmc-carbide|iscar|kennametal|seco|walter|kyocera|tungaloy|dapra|haascnc|haas|fanuc|siemens|heidenhain|mazak|okuma|dmgmori|makino|hurco|protolabs|gwizard|cnccookbook|harvey|helical|emuge|guhring|osg)/i;

function classify(url) {
  if (T1_HOST.test(url)) return 1;
  if (T2_HOST.test(url)) return 2;
  return 3;
}

// Parse the `## Sources` block of a packet into {label, url} rows.
function parseSources(md) {
  const lines = md.split(/\r?\n/);
  const out = [];
  let inSources = false;
  for (const ln of lines) {
    if (/^##\s+Sources\b/i.test(ln)) { inSources = true; continue; }
    if (inSources && /^##\s+/.test(ln)) break;
    if (!inSources) continue;
    const m = ln.match(/https?:\/\/[^\s)\]]+/);
    if (!m) continue;
    const url = m[0].replace(/[.,;]+$/, "");
    let label = ln.slice(0, ln.indexOf(m[0]))
      .replace(/^\s*[-*]\s*/, "")
      .replace(/^\s*\d+\.\s*/, "")
      .replace(/[\s\p{Pd}"']+$/u, "")
      .trim();
    if (!label) label = url.replace(/^https?:\/\//, "").split("/")[0];
    out.push({ label, url });
  }
  return out;
}

const perGalaxy = {};
let totalRows = 0, totalUnique = 0;
const tierCount = { 1: 0, 2: 0, 3: 0 };

for (const g of GALAXIES) {
  const f = path.join(STAGING_GLOB_DIR, g, "_staging", PACKET);
  if (!fs.existsSync(f)) continue;
  const rows = parseSources(fs.readFileSync(f, "utf8"));
  const seenLocal = new Set();
  const tiers = { 1: [], 2: [], 3: [] };
  for (const r of rows) {
    totalRows++;
    const key = r.url.toLowerCase();
    if (seenLocal.has(key)) continue;
    seenLocal.add(key);
    const t = classify(r.url);
    tiers[t].push(r);
    tierCount[t]++;
    totalUnique++;
  }
  perGalaxy[g] = tiers;
}

function section(g, tiers) {
  const n = tiers[1].length + tiers[2].length + tiers[3].length;
  if (n === 0) return "";
  const owner = OWNER[g] || "(owner)";
  let s = `\n### ${g} - ${n} sources   owner: ${owner}\n`;
  s += `> Deep physics/numeric claims for this domain live in \`knowledge/wiki/${g}/_staging/${PACKET}\` (status: UNVERIFIED - ${owner} verifies before integration). The pointers below are the verifiable corpus the owner draws from.\n`;
  const tname = { 1: "TIER-1 (primary: gov/edu/standards/courseware)", 2: "TIER-2 (vendor/OEM technical docs)", 3: "TIER-3 (free articles/aggregators)" };
  for (const t of [1, 2, 3]) {
    if (tiers[t].length === 0) continue;
    s += `\n**${tname[t]}**\n`;
    for (const r of tiers[t].sort((a, b) => a.label.localeCompare(b.label))) {
      s += `- [${r.label}](${r.url})\n`;
    }
  }
  return s;
}

const header = `# GALAXY FREE-SOURCE CORPUS - per-domain authoritative external knowledge index

> **Generated** by \`scripts/build-galaxy-free-source-corpus.mjs\` from the staged deep-domain research packets (GALAXY-ENRICH batches 1-3, papa 2026-06-09). Re-run after any new packet lands - idempotent, fully regenerated.
>
> **What this is:** the curated, deduped, tiered index of free + legal authoritative EXTERNAL knowledge sources per galaxy - the "pull fresh authoritative data on demand" corpus that keeps each domain's knowledge non-stagnant. Complements the INTERNAL corpus roots (\`mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.json\` -> \`H:/PRISM/{resources,JM DIE,Docustrata}\`): internal = our files, external = the world's free authoritative references.
>
> **R12 / honesty boundary:** this file indexes verifiable source pointers only (real, resolvable, free/legal URLs). It does NOT assert the physics/numeric/cost claims those sources contain - those are drafted UNVERIFIED in each galaxy's \`_staging/\` packet and stay owner-gated until the owner slot spot-checks them against source. A TIER-1 source does not make a derived claim verified.
>
> **Source-quality tiers:** TIER-1 = primary (gov/edu/standards bodies/MIT-OCW/arXiv/NIST/NIMS/eCFR) - TIER-2 = vendor/OEM technical docs (Sandvik/Mitsubishi/ISCAR/Kennametal/Haas/Fanuc/Siemens, authoritative for tool/material/controller specifics) - TIER-3 = free articles/aggregators (secondary; corroborate against T1/T2 before trusting a number).
>
> **Auto-invoke path:** discoverable via the galaxy CLAUDE.md cross-cutting block -> \`GALAXY-ENRICHMENT-PROGRAM-2026-06-09.md\` -> this index. Owners integrate survivors into live galaxy MEMORY.md / wiki / tribal so per-domain recall surfaces them.
>
> **Legal-sources-only:** every entry is a free, publicly-accessible page. No paywalled/pirated sources (no LibGen/SciHub). Vendor docs are public technical-info pages.

`;

let toc = `## Coverage\n\n| galaxy | owner | sources | T1 | T2 | T3 |\n|--------|-------|--------:|---:|---:|---:|\n`;
for (const g of GALAXIES) {
  const tiers = perGalaxy[g];
  if (!tiers) continue;
  const n = tiers[1].length + tiers[2].length + tiers[3].length;
  toc += `| ${g} | ${OWNER[g] || "(owner)"} | ${n} | ${tiers[1].length} | ${tiers[2].length} | ${tiers[3].length} |\n`;
}

let sections = `\n## Per-galaxy corpus\n`;
for (const g of GALAXIES) {
  if (perGalaxy[g]) sections += section(g, perGalaxy[g]);
}

const footer = `\n## Remaining galaxies (no deep-domain packet yet)\n\nThe ~19 infrastructure galaxies (agent-orchestration, fleet-hygiene, discovery, wiring, bug-hunting, backend-helper, dormant-data, hermes-zulu, token-optimization, database-expansion, cad-fusion-live, mit-curriculum, pdf-corpus, pdf-corpus-mill, corpus-aggregation, knowledge-conversion, compliance-safety, tribal-knowledge, frontend-app) are tooling/meta domains whose authoritative corpus is PRISM-internal (code + wiki + the operator-provided article set) rather than external free-source - they are served by the cross-cutting methodology lane (34/34) and do not need an external-source corpus. If a future packet lands for one, re-run the generator and it appears above automatically.\n\n---\n_Maintenance: \`node scripts/build-galaxy-free-source-corpus.mjs\` regenerates this file. Related: \`GALAXY-ENRICHMENT-PROGRAM-2026-06-09.md\`, \`GALAXY-DEEPDOMAIN-STAGED-2026-06-09.md\`, \`reference_critical_resource_roots_2026_05_30\`._\n`;

const out = header + toc + sections + footer;

if (DRY) {
  console.log(`[dry] galaxies=${Object.keys(perGalaxy).length} rows=${totalRows} unique=${totalUnique} (T1=${tierCount[1]} T2=${tierCount[2]} T3=${tierCount[3]})`);
  console.log(`[dry] would write ${OUT} (${out.length} bytes)`);
} else {
  fs.writeFileSync(OUT, out);
  console.log(`wrote ${OUT} | galaxies=${Object.keys(perGalaxy).length} unique=${totalUnique} (T1=${tierCount[1]} T2=${tierCount[2]} T3=${tierCount[3]})`);
}
