#!/usr/bin/env node
// integrate-free-source-into-galaxy-memory.mjs
// GALAXY-ENRICH (papa, 2026-06-09): append a compact, per-galaxy free-source
// corpus block to each live galaxy MEMORY.md so the corpus is AUTO-INVOKED
// per-domain (MEMORY.md loads on SessionStart + is semantic-searchable), not
// just chain-discoverable. Idempotent + marker-guarded: skips any MEMORY.md
// that already carries the block. R12-safe: emits verifiable source pointers
// only; the physics/cost claims stay owner-gated UNVERIFIED in _staging/.
// Usage: node scripts/integrate-free-source-into-galaxy-memory.mjs [--dry]
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const PACKET = "deep-domain-research-2026-06-09.md";
const MARKER = "## Authoritative free-source corpus (papa 2026-06-09";
const DRY = process.argv.includes("--dry");

const GALAXIES = [
  "ai-training", "speed-feed", "cad", "quality", "mill", "lathe", "wedm",
  "cam", "post-processor", "blueprint-vision", "business", "quoting",
  "academy", "shop-floor",
];
const OWNER = {
  "ai-training": "india", "speed-feed": "oscar", "cad": "delta", "quality": "(quality-owner)",
  "mill": "foxtrot", "lathe": "whiskey", "wedm": "mike", "cam": "kilo",
  "post-processor": "echo", "blueprint-vision": "xray", "business": "hotel",
  "quoting": "charlie", "academy": "lima", "shop-floor": "(shop-floor-owner)",
};

const T1_HOST = /(\.gov|\.edu|nist\.gov|ecfr\.gov|arxiv\.org|ocw\.mit\.edu|nims-skills\.org|openstax\.org|gutenberg\.org|iso\.org|asme\.org|astm\.org|osha\.gov|vlabs\.|nptel\.|doi\.org|ncbi\.nlm)/i;
const T2_HOST = /(sandvik|coromant|mitsubishi|mmc-carbide|iscar|kennametal|seco|walter|kyocera|tungaloy|dapra|haascnc|haas|fanuc|siemens|heidenhain|mazak|okuma|dmgmori|makino|hurco|protolabs|gwizard|cnccookbook|harvey|helical|emuge|guhring|osg)/i;

function tier(url) {
  if (T1_HOST.test(url)) return 1;
  if (T2_HOST.test(url)) return 2;
  return 3;
}

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
      .replace(/^\s*[-*]\s*/, "").replace(/^\s*\d+\.\s*/, "")
      .replace(/[\s\p{Pd}"']+$/u, "").trim();
    if (!label) label = url.replace(/^https?:\/\//, "").split("/")[0];
    out.push({ label, url, t: tier(url) });
  }
  return out;
}

function buildBlock(g) {
  const f = path.join(ROOT, "knowledge", "wiki", g, "_staging", PACKET);
  if (!fs.existsSync(f)) return null;
  const rows = parseSources(fs.readFileSync(f, "utf8"));
  const seen = new Set();
  const uniq = rows.filter((r) => (seen.has(r.url) ? false : (seen.add(r.url), true)));
  const t1 = uniq.filter((r) => r.t === 1).length;
  const t2 = uniq.filter((r) => r.t === 2).length;
  const t3 = uniq.filter((r) => r.t === 3).length;
  // top primary = up to 3 T1, then top up with T2.
  const primary = [...uniq.filter((r) => r.t === 1), ...uniq.filter((r) => r.t === 2)].slice(0, 3);
  const owner = OWNER[g] || "(owner)";
  let b = `\n${MARKER}, GALAXY-ENRICH)\n`;
  b += `Pull-fresh-on-demand EXTERNAL knowledge for ${g} (keeps this domain non-stagnant; complements internal CRITICAL-RESOURCE-ROOTS). Full per-galaxy index: \`state/shared/specs/GALAXY-FREE-SOURCE-CORPUS-2026-06-09.md\` (${uniq.length} sources: T1=${t1}/T2=${t2}/T3=${t3}). Top primary:\n`;
  for (const p of primary) b += `- [${p.label}](${p.url})\n`;
  b += `Deep cited domain research (UNVERIFIED -- ${owner} verifies vs source before any live engine/doctrine use): \`knowledge/wiki/${g}/_staging/${PACKET}\`. R12: source pointers verifiable; physics/cost claims owner-gated. Regen: \`scripts/build-galaxy-free-source-corpus.mjs\`.\n`;
  return b;
}

let updated = 0, skipped = 0, missing = 0;
for (const g of GALAXIES) {
  const mp = path.join(ROOT, "mcp-server", "src", "engines", g, "MEMORY.md");
  if (!fs.existsSync(mp)) { console.log(`  MISSING ${g}/MEMORY.md`); missing++; continue; }
  const cur = fs.readFileSync(mp, "utf8");
  if (cur.includes(MARKER)) { console.log(`  skip ${g} (already has block)`); skipped++; continue; }
  const block = buildBlock(g);
  if (!block) { console.log(`  no-packet ${g}`); missing++; continue; }
  const next = cur.replace(/\s*$/, "\n") + block;
  if (DRY) { console.log(`  [dry] would append to ${g} (+${block.split("\n").length}L)`); updated++; continue; }
  fs.writeFileSync(mp, next);
  console.log(`  updated ${g}`);
  updated++;
}
console.log(`\n${DRY ? "[dry] " : ""}updated=${updated} skipped=${skipped} missing/no-packet=${missing}`);
