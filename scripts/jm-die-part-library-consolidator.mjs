#!/usr/bin/env node
// JM Die _PART LIBRARY consolidator v2 — ADVISORY ONLY. Seeded canonicals + Levenshtein.
// Usage:
//   node scripts/jm-die-part-library-consolidator.mjs
//   JM_DIE_CONSOLIDATE_APPLY=1 node scripts/jm-die-part-library-consolidator.mjs --apply
//
// Outputs:
//   state/shared/jm-die-part-library-plan.{json,md}
//
// Classification cascade per folder:
//   1) EXACT match against seeded canonical (wiki customer-<slug>.md filenames)
//   2) PREFIX match (≥4 char overlap) against seeded canonical
//   3) Levenshtein distance ≤ max(2, floor(len/4)) against seeded canonical
//   4) Token-overlap: any 5+ char substring matches a seeded canonical norm
//   5) Fallback prefix grouping among folder names themselves
//   6) OCR-junk: no match AND impossible-English patterns

import { readFileSync, readdirSync, writeFileSync, existsSync, renameSync, mkdirSync } from "node:fs";
import { join, basename } from "node:path";

// --- magic numbers as named consts (per R12 / advisory) ---
const MIN_PREFIX_OVERLAP = 4;
const MIN_TOKEN_OVERLAP = 5;
const LEV_DIVISOR = 4;       // max Lev distance = max(2, floor(len/4))
const MIN_LEV_FLOOR = 2;
const JUNK_MIN_LEN = 6;      // single-word names < this can't be classified as junk
const JUNK_VOWEL_RUN = 3;
const JUNK_CONSONANT_RUN = 5;
const JUNK_REPEAT_RUN = 3;

const INVENTORY = "H:/prism/state/shared/jm-die-part-library-inventory.txt";
const ROOT = "H:/PRISM/JM DIE/Prism JM Die";
const PLAN_JSON = "H:/prism/state/shared/jm-die-part-library-plan.json";
const PLAN_MD = "H:/prism/state/shared/jm-die-part-library-plan.md";
const QUARANTINE = join(ROOT, "_ocr-junk-quarantine");
const WIKI_DIR = "H:/prism/knowledge/wiki/architecture/jmdie";
const APPLY = process.argv.includes("--apply") && process.env.JM_DIE_CONSOLIDATE_APPLY === "1";

// --- seed canonical names from wiki customer-*.md ---
function seedCanonicals() {
  const seeds = [];
  const skipSlugs = new Set([
    "long-tail-2738-programs", "long-tail-11573-programs",
    "oldversions", "drawingautomation", "tooling-cad-files",
    "posts-and-machines", "screws", "queue", "unassigned",
    "matthew-programs", "tomek-programs", "header",
    "preciosion-form", "presicion-form", // typos of precision-form
    "granduer-fasteners", "grandeur-fastener-update-10-22-2022",
    "electrodes-all-od-003", "nathans-usb",
    "hypercad-s-and-hypermill-online-training",
  ]);
  try {
    const files = readdirSync(WIKI_DIR);
    for (const f of files) {
      if (!f.startsWith("customer-") || !f.endsWith(".md")) continue;
      const slug = f.slice("customer-".length, -".md".length);
      if (skipSlugs.has(slug)) continue;
      // slug "air-industries-company" → "AIR INDUSTRIES COMPANY"
      const name = slug.split("-").map(w => w.toUpperCase()).join(" ");
      seeds.push(name);
    }
  } catch { /* wiki missing, run with empty seeds */ }
  return seeds;
}

const SEEDS = seedCanonicals();

// --- normalization ---
const norm = s => s.toUpperCase().replace(/[^A-Z0-9]/g, "");

// --- stop-words: industry generics that must NOT trigger token-overlap matching ---
// These words are SHARED across many unrelated customers (ALLFAST FASTENERS vs
// ARCONIC FASTENERS are different companies). Token matching uses the proper-noun
// core only — what's distinctive about the name.
const STOP_WORDS = new Set([
  "COMPANY", "COMPANIES", "CORP", "CORPORATION", "INC", "INCORPORATED",
  "LTD", "LIMITED", "LLC", "GROUP", "USA", "AMERICA", "AMERICAN",
  "INDUSTRIES", "INDUSTRIAL", "INDUSTRY",
  "FASTENER", "FASTENERS", "FASTENING", "FASTENINGS", "FASTEN",
  "SYSTEMS", "SYSTEM",
  "AEROSPACE", "AERO",
  "PRODUCTS", "PRODUCT",
  "MFG", "MANUFACTURING", "MANUFACTURE",
  "TOOL", "TOOLS", "TOOLING",
  "SCREW", "SCREWS",
  "BOLT", "BOLTS",
  "RIVET", "RIVETS",
  "PARTS", "PART",
  "TECHNOLOGIES", "TECHNOLOGY",
  "THREADED", "THREAD",
  "FORMING", "FORM",
  "STEEL", "METALS", "METAL",
  "AND", "OF", "THE", "FOR",
  "PRECISION", "DEFENSE", "GLOBAL",
]);

// Build a richer seed record:
//   - name: canonical display name
//   - n: full norm (for exact + prefix)
//   - core: proper-noun core (tokens minus STOP_WORDS, joined) — used for token matching
//   - coreParts: array of individual proper-noun tokens (each ≥ 2 chars) — used for Lev
function buildSeed(name) {
  const tokens = name.toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean);
  const proper = tokens.filter(t => !STOP_WORDS.has(t));
  const core = proper.join("");
  return { name, n: norm(name), core, coreParts: proper };
}
const seedNorms = SEEDS.map(buildSeed);

// --- Levenshtein (small DP) ---
function lev(a, b) {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const prev = new Array(b.length + 1);
  const curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}

// --- best seed match for a folder name (v3: stop-word-aware) ---
//
// Match cascade (first hit wins, tracked by quality score):
//   1) exact full-name match
//   2) prefix overlap against full canonical norm (≥4 chars)
//   3) Levenshtein against canonical CORE (proper-noun-only) — distance ≤ max(2, len/4)
//   4) Token overlap: 5+ char substring match against canonical CORE only
//      (NOT the full name — that would re-introduce the FASTENER/AEROSPACE/INDUSTRY false-positives)
function matchSeed(folderName) {
  const n = norm(folderName);
  if (n.length < MIN_PREFIX_OVERLAP) return null;

  // 1) exact full match
  for (const s of seedNorms) if (s.n === n) return { seed: s.name, kind: "exact", score: 0 };

  // 2) prefix on full canonical norm
  let bestPrefix = null;
  let bestPrefixOverlap = 0;
  for (const s of seedNorms) {
    const overlap = Math.min(n.length, s.n.length);
    if (overlap < MIN_PREFIX_OVERLAP) continue;
    if (s.n.startsWith(n) || n.startsWith(s.n)) {
      if (overlap > bestPrefixOverlap) { bestPrefix = s.name; bestPrefixOverlap = overlap; }
    }
  }
  if (bestPrefix) return { seed: bestPrefix, kind: "prefix", score: bestPrefixOverlap };

  // 3) Lev against CORE (proper-noun core only — skip seeds with no usable core)
  const maxLev = Math.max(MIN_LEV_FLOOR, Math.floor(n.length / LEV_DIVISOR));
  let bestLev = null;
  let bestLevDist = Infinity;
  for (const s of seedNorms) {
    if (s.core.length < MIN_PREFIX_OVERLAP) continue;
    if (Math.abs(s.core.length - n.length) > maxLev) continue;
    const d = lev(n, s.core);
    if (d <= maxLev && d < bestLevDist) { bestLev = s.name; bestLevDist = d; }
  }
  if (bestLev) return { seed: bestLev, kind: "lev-core", score: bestLevDist };

  // 4) Token overlap against CORE (any 5+ substring of folder appears in seed's core)
  //    Multi-token cores like "AIRINDUSTRIES" allow AIR/INDUSTR matching, but
  //    "FASTENER"/"AEROSPACE" alone never become a seed core (they're stop-words).
  for (const s of seedNorms) {
    if (s.core.length < MIN_TOKEN_OVERLAP) continue;
    // Slide window over folder, look for substring in core
    for (let i = 0; i + MIN_TOKEN_OVERLAP <= n.length; i++) {
      const sub = n.slice(i, i + MIN_TOKEN_OVERLAP);
      if (s.core.includes(sub)) return { seed: s.name, kind: "token-core", score: MIN_TOKEN_OVERLAP };
    }
    // Also: any individual proper-noun core part of length ≥5 contained in folder
    for (const part of s.coreParts) {
      if (part.length >= MIN_TOKEN_OVERLAP && n.includes(part)) {
        return { seed: s.name, kind: "token-coreparts", score: part.length };
      }
    }
  }
  return null;
}

// --- junk detector (only consulted when no seed match) ---
function isLikelyJunk(name) {
  const n = norm(name);
  if (n.length < JUNK_MIN_LEN) return false;
  const hasSpaceOrHyphen = /[\s\-]/.test(name);
  if (hasSpaceOrHyphen) return false; // multi-word names are almost never junk
  if (new RegExp(`[AEIOU]{${JUNK_VOWEL_RUN},}`).test(n)) return true;
  if (new RegExp(`[BCDFGHJKLMNPQRSTVWXYZ]{${JUNK_CONSONANT_RUN},}`).test(n)) return true;
  if (new RegExp(`([A-Z])\\1{${JUNK_REPEAT_RUN - 1},}`).test(n)) return true;
  return true; // single all-caps token ≥6 chars with no seed match = junk
}

// --- main ---
const names = readFileSync(INVENTORY, "utf8")
  .split(/\r?\n/)
  .map(s => s.trim())
  .filter(s => s.length > 0)
  .filter(s => !s.startsWith("_ocr-junk-quarantine"));

const groups = new Map(); // canonical name → {seed, members:[{name, kind, score}]}
const junk = [];
const fallbackCanonicals = []; // {name, norm, members:[]}
const singletons = [];

// Phase A: seed-driven matching
const unmatched = [];
for (const name of names) {
  const m = matchSeed(name);
  if (m) {
    if (!groups.has(m.seed)) groups.set(m.seed, { seed: m.seed, members: [] });
    groups.get(m.seed).members.push({ name, kind: m.kind, score: m.score });
  } else {
    unmatched.push(name);
  }
}

// Phase B: prefix grouping among unmatched (longest first becomes canonical)
const sortedUnmatched = [...unmatched].sort((a, b) => b.length - a.length || a.localeCompare(b));
for (const name of sortedUnmatched) {
  if (isLikelyJunk(name)) { junk.push(name); continue; }
  const n = norm(name);
  let attached = false;
  for (const c of fallbackCanonicals) {
    const overlap = Math.min(n.length, c.norm.length);
    if (overlap < MIN_PREFIX_OVERLAP) continue;
    if (c.norm.startsWith(n) || n.startsWith(c.norm)) {
      c.members.push(name); attached = true; break;
    }
  }
  if (!attached) fallbackCanonicals.push({ name, norm: n, members: [] });
}

for (const c of fallbackCanonicals) {
  if (c.members.length > 0) {
    if (!groups.has(c.name)) groups.set(c.name, { seed: c.name, members: [] });
    const g = groups.get(c.name);
    for (const m of c.members) g.members.push({ name: m, kind: "fallback-prefix", score: 0 });
  } else {
    singletons.push(c.name);
  }
}

// --- report ---
const groupArr = [...groups.values()];
const report = {
  schemaVersion: "2.0.0",
  source: INVENTORY,
  root: ROOT,
  generatedAt: new Date().toISOString(),
  seededCanonicals: SEEDS.length,
  totals: {
    inputFolders: names.length,
    duplicateGroups: groupArr.length,
    foldersInGroups: groupArr.reduce((s, g) => s + g.members.length, 0),
    junkFolders: junk.length,
    singletons: singletons.length,
  },
  duplicateGroups: groupArr
    .map(g => ({
      canonical: g.seed,
      variants: g.members.map(m => ({ name: m.name, matchKind: m.kind, score: m.score })).sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => b.variants.length - a.variants.length),
  junkFolders: junk.sort(),
  singletons: singletons.sort(),
  apply: APPLY,
  advisoryOnly: !APPLY,
};

writeFileSync(PLAN_JSON, JSON.stringify(report, null, 2));

let md = `# JM Die _PART LIBRARY consolidation plan (v2)\n\n`;
md += `Generated: ${report.generatedAt}\n`;
md += `Root: \`${ROOT}\`\n`;
md += `Seeded canonicals: ${SEEDS.length} (from wiki/architecture/jmdie/customer-*.md)\n\n`;
md += `## Totals\n\n`;
md += `- Input folders: **${report.totals.inputFolders}**\n`;
md += `- Duplicate groups: **${report.totals.duplicateGroups}** (covering ${report.totals.foldersInGroups} variant folders)\n`;
md += `- OCR-junk candidates: **${report.totals.junkFolders}**\n`;
md += `- Singletons: **${report.totals.singletons}**\n`;
md += `- Mode: **${APPLY ? "APPLY" : "ADVISORY"}**\n\n`;
md += `## Top 25 duplicate groups (by variant count)\n\n`;
for (const g of report.duplicateGroups.slice(0, 25)) {
  md += `### ${g.canonical}  (${g.variants.length} variant${g.variants.length === 1 ? "" : "s"})\n`;
  for (const v of g.variants) md += `- ${v.name}  _[${v.matchKind}]_\n`;
  md += "\n";
}
md += `## Junk samples (first 40)\n\n`;
for (const j of junk.slice(0, 40)) md += `- ${j}\n`;
md += `\n_Full data: \`${PLAN_JSON}\`_\n`;
writeFileSync(PLAN_MD, md);

console.log(JSON.stringify({
  ok: true,
  plan_json: PLAN_JSON,
  plan_md: PLAN_MD,
  seedsUsed: SEEDS.length,
  totals: report.totals,
  mode: APPLY ? "apply" : "advisory",
}, null, 2));

if (APPLY) {
  if (!existsSync(QUARANTINE)) mkdirSync(QUARANTINE, { recursive: true });
  let movedJunk = 0, mergedVariants = 0;
  const errors = [];
  for (const j of junk) {
    try { renameSync(join(ROOT, j), join(QUARANTINE, j)); movedJunk++; }
    catch (e) { errors.push({ kind: "junk", folder: j, error: e.code || e.message }); }
  }
  for (const g of groupArr) {
    const canonDir = join(ROOT, g.seed);
    // ensure canonical exists; create if seed but no folder
    if (!existsSync(canonDir)) {
      try { mkdirSync(canonDir, { recursive: true }); }
      catch (e) { errors.push({ kind: "mkdir-canonical", canonical: g.seed, error: e.code || e.message }); continue; }
    }
    for (const m of g.members) {
      if (m.name === g.seed) continue; // canonical itself, skip
      const variantDir = join(ROOT, m.name);
      const dest = join(canonDir, `_merged_from_${m.name}`);
      try { renameSync(variantDir, dest); mergedVariants++; }
      catch (e) { errors.push({ kind: "variant", canonical: g.seed, variant: m.name, error: e.code || e.message }); }
    }
  }
  console.log(JSON.stringify({ apply: true, movedJunk, mergedVariants, errors: errors.slice(0, 20), errorCount: errors.length }, null, 2));
}

void basename; // imported for symmetry; kept for future per-folder logging
