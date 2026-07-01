#!/usr/bin/env node
/**
 * generate-print-reading-wiki-tribal.mjs — wiki + tribal batch emitter.
 *
 * PRINT-OCR-100PCT-MS0/U4 — the AI-training half of the 100% goal.
 *
 * Generates a LARGE batch of:
 *   - knowledge/wiki/lessons/print-reading-*.md       (operator-facing lessons)
 *   - knowledge/wiki/code-tribal/blueprint-*.md       (per-pattern code-tribal)
 *   - state/shared/print-reading-tribal-tips.jsonl    (TribalKnowledgeEngine seed)
 *
 * Sources:
 *   - state/shared/print-corpus-tables/rows.jsonl     (U2 output — what we saw)
 *   - knowledge/wiki/architecture/                    (existing patterns)
 *   - knowledge/tribal/                               (4,245 existing tips)
 *
 * Hard rules (per CLAUDE.md):
 *   - knowledge/wiki/lessons/ is INTERNAL-ONLY — strip JM-DIE customer names
 *     before emitting (per feedback_no_public_h_drive + LoRA anonymization).
 *   - knowledge/wiki/code-tribal/ stays internal too, but can name customer
 *     classes (e.g. "ITW-family" → "fastener-family").
 *
 * Output schema for tribal-tips JSONL (matches TribalKnowledgeEngine):
 *   { id, category, source, pattern, tip, rationale, examples?[], createdAt }
 *
 * The mined patterns come from U2's PrintCorpusRow corpus:
 *   - Customer-family clusters (rows with the same partFamily prefix)
 *   - Dim-type prevalence (which dim types occur most in which contexts)
 *   - Confidence-floor anti-patterns (which patterns produce low_no_vision)
 *   - GD&T patterns observed in regions
 *
 * Usage:
 *   node scripts/generate-print-reading-wiki-tribal.mjs            # full batch
 *   node scripts/generate-print-reading-wiki-tribal.mjs --dry-run  # print plan
 *   node scripts/generate-print-reading-wiki-tribal.mjs --limit 50 # cap output
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROWS_FILE = "H:/prism/state/shared/print-corpus-tables/rows.jsonl";
const WIKI_LESSONS_DIR = "H:/prism/knowledge/wiki/lessons";
const WIKI_TRIBAL_DIR = "H:/prism/knowledge/wiki/code-tribal";
const TRIBAL_JSONL = "H:/prism/state/shared/print-reading-tribal-tips.jsonl";

const CUSTOMER_ANONYMIZE_MAP = {
  ITW: "fastener-family",
  Alcoa: "aerospace-aluminum-family",
  Optimas: "fastener-family",
  SFS: "fastener-family",
  "Holo-Krome": "fastener-family",
  Fastenal: "fastener-family",
};

// The full ExtractionDimType enum (BlueprintExtractionRAGEngine.ts lines 38-50).
// We emit a code-tribal reference for EVERY dim-type unconditionally so the
// AI has guidance for each one even before the corpus has observed examples.
const ALL_DIM_TYPES = [
  "linear",
  "diameter",
  "radius",
  "gdt_positional",
  "gdt_runout",
  "gdt_profile",
  "thread_callout",
  "surface_finish",
  "material_callout",
  "note",
  "other",
];

/**
 * Anonymise a customer name for wiki output (no-public-H-drive rule).
 *   - Known JM-DIE customers map to a stable family name.
 *   - Unknown customers get a STABLE per-customer hashed bucket
 *     (`customer-<8hex>`). Distinct customers stay distinct — so the
 *     emitted batch is genuinely large (one lesson per customer) — but
 *     the real name never appears on disk.
 *   - null/empty → "general".
 */
function anonymizeCustomer(name) {
  if (!name) return "general";
  if (CUSTOMER_ANONYMIZE_MAP[name]) return CUSTOMER_ANONYMIZE_MAP[name];
  const h = crypto.createHash("sha256").update(String(name)).digest("hex").slice(0, 8);
  return `customer-${h}`;
}

function parseArgs(argv) {
  const args = { dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--limit") args.limit = Number(argv[++i]);
    else if (a === "--rows-file") args.rowsFile = argv[++i];
    else if (a === "--wiki-lessons-dir") args.wikiLessonsDir = argv[++i];
    else if (a === "--wiki-tribal-dir") args.wikiTribalDir = argv[++i];
    else if (a === "--tribal-jsonl") args.tribalJsonl = argv[++i];
    else if (a === "--help" || a === "-h") args.help = true;
  }
  return args;
}

function printHelp() {
  console.log(`generate-print-reading-wiki-tribal.mjs — emit wiki + tribal batch

Usage:
  --dry-run                  Print plan, don't write
  --limit <n>                Cap total artifacts emitted
  --rows-file <path>         Source corpus (default: ${ROWS_FILE})
  --wiki-lessons-dir <path>  Lessons output dir (default: ${WIKI_LESSONS_DIR})
  --wiki-tribal-dir <path>   Code-tribal output dir (default: ${WIKI_TRIBAL_DIR})
  --tribal-jsonl <path>      TribalKnowledgeEngine seed (default: ${TRIBAL_JSONL})
`);
}

function loadRows(rowsFile) {
  if (!fs.existsSync(rowsFile)) return [];
  const raw = fs.readFileSync(rowsFile, "utf-8");
  const out = [];
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    try { out.push(JSON.parse(line)); } catch { /* skip */ }
  }
  return out;
}

// Minimum prints in a part-family before it earns its own lesson. Families
// below this fold into one aggregate "long-tail" lesson so we emit a large
// batch of SUBSTANTIVE lessons, not 1,600 single-print stubs.
const MIN_FAMILY_SIZE = 20;
const LONG_TAIL_KEY = "long-tail-small-families";

/**
 * Derive the grouping key for a row. The JM-DIE _PART LIBRARY corpus is
 * structured `_PART LIBRARY/<customer>/<part>/files`; the customer slot is
 * usually `_UNASSIGNED`, so the meaningful cluster is the PART-FAMILY —
 * the alpha prefix of the part number (e.g. ZQ90 -> "ZQ", ABC-12 -> "ABC").
 * Falls back to the anonymized customer when no part can be parsed.
 */
function groupKeyForRow(row) {
  const norm = String(row.sourcePath ?? "").replace(/\\/g, "/");
  // `_UNASSIGNED/<part>/` OR a general `_PART LIBRARY/<cust>/<part>/`.
  const m = norm.match(/_UNASSIGNED\/([^/]+)\//i)
    || norm.match(/_PART LIBRARY\/[^/]+\/([^/]+)\//i);
  if (m) {
    const part = m[1];
    // Alpha-prefix family: strip from the first digit onward; cap length.
    const fam = part.replace(/[0-9].*$/, "").replace(/[^A-Za-z-]/g, "").slice(0, 5);
    if (fam.length >= 2) return `family-${fam.toUpperCase()}`;
    return `part-${part.slice(0, 8).replace(/[^A-Za-z0-9_-]/g, "_")}`;
  }
  return anonymizeCustomer(row.customer);
}

function minePatterns(rows) {
  // Group by part-family / customer + dim-type co-occurrence + floor outcomes.
  const byCustomer = new Map();
  const dimTypeCounts = new Map();
  const floorByCustomer = new Map();
  const gdtPatterns = new Map();

  for (const row of rows) {
    const family = groupKeyForRow(row);
    const cluster = byCustomer.get(family) ?? { count: 0, totalRegions: 0, weakestFloor: "normal", failed: 0 };
    cluster.count++;
    cluster.totalRegions += row.totalRegions ?? 0;
    if (row.scanStatus === "extraction_failed") cluster.failed++;
    byCustomer.set(family, cluster);

    const floorCounts = floorByCustomer.get(family) ?? {};
    floorCounts[row.worstConfidenceFloor] = (floorCounts[row.worstConfidenceFloor] ?? 0) + 1;
    floorByCustomer.set(family, floorCounts);

    for (const page of row.pages ?? []) {
      for (const region of page.regions ?? []) {
        dimTypeCounts.set(region.dimType, (dimTypeCounts.get(region.dimType) ?? 0) + 1);
        if (region.dimType?.startsWith("gdt_")) {
          const key = `${family}:${region.dimType}`;
          gdtPatterns.set(key, (gdtPatterns.get(key) ?? 0) + 1);
        }
      }
    }
  }

  return {
    byCustomer,
    dimTypeCounts,
    floorByCustomer,
    gdtPatterns,
  };
}

function emitLessonForFamily(family, cluster, floorCounts, opts) {
  const slug = `print-reading-${family}`;
  const fp = path.join(opts.wikiLessonsDir, `${slug}.md`);
  const total = cluster.count;
  const failPct = total === 0 ? 0 : ((cluster.failed / total) * 100).toFixed(1);
  const avgRegions = total === 0 ? 0 : (cluster.totalRegions / total).toFixed(1);
  const dominantFloor =
    Object.entries(floorCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "normal";

  const body = `---
title: Print-reading lesson — ${family}
slug: ${slug}
kind: lesson
status: shipped
date: ${new Date().toISOString().slice(0, 10)}
milestone: PRINT-OCR-100PCT-MS0
unit: U4
generated: true
---

# Print-reading patterns observed in the ${family} corpus

Generated from the corpus-wide scan (U2 output, ${total} prints).

## Stats

| Metric | Value |
|--------|-------|
| Total prints | ${total} |
| Avg regions per print | ${avgRegions} |
| Failed extractions | ${cluster.failed} (${failPct}%) |
| Dominant confidence floor | \`${dominantFloor}\` |

## What the corpus tells us

The ${family} cluster contains ${total} prints whose extraction floor distribution is:

${Object.entries(floorCounts).map(([k, v]) => `- \`${k}\`: ${v} (${((v / total) * 100).toFixed(1)}%)`).join("\n")}

The dominant floor (\`${dominantFloor}\`) means the typical confidence guarantee
for this customer family. Floors below \`normal\` (\`low_no_prior\`,
\`low_contradiction\`, \`low_no_vision\`) require operator review per CLAUDE.md
R12 fail-loud — never silently accept.

## When extracting these prints

1. Run \`prism_cad:blueprint_rag_extract\` per page.
2. If \`confidenceFloor\` returns anything other than \`normal\`, escalate to
   operator review — do NOT auto-write to \`verified_100pct\`.
3. For GD&T regions: cross-check against \`knowledge/wiki/code-tribal/blueprint-gdt-*.md\`
   for known anti-patterns.
4. Ground truth resolution order:
   - JM-DIE inspection table (\`groundTruthSource: jm_die_inspection\`)
   - Docustrata index (\`groundTruthSource: docustrata_index\`)
   - Operator-confirmed measurement (\`groundTruthSource: operator_confirmed\`)

## Related

- [[print-corpus-100pct-coverage]] — top-level coverage report
- [[blueprint-extraction-rag]] — the engine that fills these rows

## See also

- \`state/shared/print-corpus-tables/by-customer/${family}.jsonl\` — raw rows
- \`mcp-server/src/engines/PrintAccuracyProofEngine.ts\` — 100% gate logic
- \`mcp-server/data/milestones/PRINT-OCR-100PCT-MS0.json\` — milestone envelope
`;
  return { path: fp, body };
}

function emitCodeTribalForDimType(dimType, count, opts) {
  const slug = `blueprint-dim-${dimType.replace(/_/g, "-")}`;
  const fp = path.join(opts.wikiTribalDir, `${slug}.md`);

  const guidance = {
    linear: "Look for `mm` / `in` suffix or no-unit (drawing default applies). Watch for limit-pair `12.5 / 12.3` per ISO 14405.",
    diameter: "`Ø` or `DIA` prefix. Limit-pair common. Cross-check with the section view to confirm cylinder direction.",
    radius: "`R` prefix. Surface-radius (outer) vs corner-radius (inner) distinguished by callout location.",
    gdt_positional: "FCF anatomy: symbol | tol | [Ø?] | M/L/F? | [datums]. `M` = MMC, `L` = LMC, `F` = RFS-equivalent in Y14.5-2018.",
    gdt_runout: "Datum letter REQUIRED. Total runout (3-arrow symbol) vs circular runout (1-arrow) — easy to misread at low resolution.",
    gdt_profile: "Bilateral / unilateral / unequally-disposed callout — extra annotation usually present (U notation).",
    thread_callout: "Pattern: `<series>-<size> <tolerance> [LH] [<class>]` e.g. `1/4-20 UNC-2B LH`. Tap-drill table lookup in `prism_thread:calculate_tap_drill`.",
    surface_finish: "ISO 1302: Ra / Rz / Rmr. N-grade legacy callouts (N3-N12) still common in older JM-DIE prints — resolve via `prism_cad:cad_select_gdt`.",
    material_callout: "Often a title-block field; can ALSO appear as a flag-note. Cross-reference `prism_data:material_get`.",
    note: "Free text — extract verbatim then classify via downstream NER. Don't normalise units in notes.",
    other: "Unclassified — these are the highest-value items for U4 pattern-mining. Cluster + propose new dimTypes.",
  };

  const body = `---
title: Blueprint pattern — ${dimType}
slug: ${slug}
kind: code-tribal
status: shipped
date: ${new Date().toISOString().slice(0, 10)}
milestone: PRINT-OCR-100PCT-MS0
unit: U4
generated: true
---

# Reading \`${dimType}\` regions on blueprints

Observed in the corpus: **${count} regions** across all customer families.

## Extraction guidance

${guidance[dimType] ?? "No specific guidance yet — pattern-mining candidate."}

## RAG hooks

When extracting a \`${dimType}\` region, the RAG retrieval should pull from:

- \`corpus\` (similar prints by family + class)
- \`tribal\` (operator-confirmed historical reads)
- \`similar_print\` (nearest-neighbour by dimensional signature)

Hard rule from \`BlueprintExtractionRAGEngine\`: \`sources.length > 0\`
**OR** \`confidenceFloor !== "normal"\`. A \`${dimType}\` extraction with
zero sources MUST drop to one of the \`low_*\` floors.

## Cross-references

- [[blueprint-extraction-rag]] — the engine
- [[print-reading-fastener-family]] — customer-family lesson
- [[cad_select_gdt]] — GD&T symbol catalog (for gdt_* dimTypes)

## See also

- \`mcp-server/src/engines/BlueprintExtractionRAGEngine.ts\` lines 38-50 — dim-type enum
- \`mcp-server/data/state/print-reading-tribal-tips.jsonl\` — auto-generated tips
`;
  return { path: fp, body };
}

function emitTribalTipsJsonl(patterns, opts) {
  const tips = [];
  const minSize = opts.minFamilySize ?? MIN_FAMILY_SIZE;
  // One tip per family describing its dominant floor pattern — gated by the
  // same size threshold as lessons so we don't emit thousands of singleton
  // part-key tips (the corpus has ~9.5k single-print part keys).
  for (const [family, cluster] of patterns.byCustomer) {
    if (cluster.count < minSize) continue;
    const floorCounts = patterns.floorByCustomer.get(family) ?? {};
    const dominantFloor = Object.entries(floorCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "normal";
    tips.push({
      id: `print-reading-${family}-floor`,
      category: "blueprint-extraction",
      source: "PRINT-OCR-100PCT-MS0/U4",
      pattern: `${family}-prints`,
      tip: `${family} prints typically extract at ${dominantFloor}; below normal requires operator review per R12.`,
      rationale: `Across ${cluster.count} ${family} prints, the dominant floor was ${dominantFloor}. Anything weaker is a red flag.`,
      createdAt: new Date().toISOString(),
    });
  }
  // One tip per dim-type by prevalence (top-5).
  const dimTypeTop = Array.from(patterns.dimTypeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  for (const [dimType, count] of dimTypeTop) {
    tips.push({
      id: `dim-type-${dimType}-prevalence`,
      category: "blueprint-extraction",
      source: "PRINT-OCR-100PCT-MS0/U4",
      pattern: `dim-${dimType}`,
      tip: `\`${dimType}\` regions are common (n=${count}); make sure your RAG retrieves at least one tribal source per region of this type.`,
      rationale: "Prevalence is a proxy for retrieval-importance; rare dim types get less corpus signal and need more careful operator review.",
      createdAt: new Date().toISOString(),
    });
  }
  return tips;
}

function applyLimit(items, limit) {
  return limit === undefined ? items : items.slice(0, limit);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeArtifacts(plan, dryRun) {
  let filesWritten = 0;
  if (dryRun) {
    console.log(`Plan: ${plan.lessons.length} lessons + ${plan.tribal.length} code-tribal + ${plan.tips.length} tribal tips`);
    for (const x of plan.lessons.slice(0, 3)) console.log(`  lesson:  ${x.path}`);
    for (const x of plan.tribal.slice(0, 3)) console.log(`  tribal:  ${x.path}`);
    if (plan.tips.length > 0) console.log(`  tips:    ${plan.tipsPath} (${plan.tips.length} lines)`);
    return 0;
  }
  for (const item of [...plan.lessons, ...plan.tribal]) {
    ensureDir(path.dirname(item.path));
    fs.writeFileSync(item.path, item.body);
    filesWritten++;
  }
  if (plan.tips.length > 0) {
    ensureDir(path.dirname(plan.tipsPath));
    const lines = plan.tips.map((t) => JSON.stringify(t)).join("\n") + "\n";
    fs.writeFileSync(plan.tipsPath, lines);
    filesWritten++;
  }
  return filesWritten;
}

export function buildPlan(rows, opts) {
  const patterns = minePatterns(rows);
  // Threshold is opts-overridable (tests use 1 to exercise per-family mode).
  const minFamilySize = opts.minFamilySize ?? MIN_FAMILY_SIZE;

  // Emit a lesson per family with >= minFamilySize prints. Families below
  // the threshold fold into one aggregate "long-tail" lesson — this keeps
  // the batch large AND substantive (no 1-print stub lessons).
  const lessons = [];
  const longTail = { count: 0, totalRegions: 0, failed: 0 };
  const longTailFloors = {};
  let longTailFamilies = 0;
  for (const [family, cluster] of patterns.byCustomer) {
    const floorCounts = patterns.floorByCustomer.get(family) ?? {};
    if (cluster.count >= minFamilySize) {
      lessons.push(emitLessonForFamily(family, cluster, floorCounts, opts));
    } else {
      longTailFamilies++;
      longTail.count += cluster.count;
      longTail.totalRegions += cluster.totalRegions;
      longTail.failed += cluster.failed;
      for (const [floor, n] of Object.entries(floorCounts)) {
        longTailFloors[floor] = (longTailFloors[floor] ?? 0) + n;
      }
    }
  }
  if (longTail.count > 0) {
    const lt = emitLessonForFamily(LONG_TAIL_KEY, longTail, longTailFloors, opts);
    lt.body = lt.body.replace(
      "## What the corpus tells us",
      `> This lesson aggregates ${longTailFamilies} small part-families `
        + `(each < ${minFamilySize} prints). Families large enough to warrant `
        + `their own lesson are emitted separately.\n\n## What the corpus tells us`,
    );
    lessons.push(lt);
  }

  // Emit a code-tribal reference for EVERY dim-type in the enum, not only
  // the ones observed in this corpus slice. Count is the observed total
  // (0 = "reference guidance, not yet seen in corpus"). This guarantees
  // the AI has read-guidance for all 11 dim-types even on a partial scan.
  const tribal = [];
  for (const dimType of ALL_DIM_TYPES) {
    const count = patterns.dimTypeCounts.get(dimType) ?? 0;
    tribal.push(emitCodeTribalForDimType(dimType, count, opts));
  }

  const tips = emitTribalTipsJsonl(patterns, opts);

  return {
    lessons: applyLimit(lessons, opts.limit),
    tribal: applyLimit(tribal, opts.limit),
    tips: applyLimit(tips, opts.limit),
    tipsPath: opts.tribalJsonl,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return 0;
  }
  const opts = {
    rowsFile: args.rowsFile ?? ROWS_FILE,
    wikiLessonsDir: args.wikiLessonsDir ?? WIKI_LESSONS_DIR,
    wikiTribalDir: args.wikiTribalDir ?? WIKI_TRIBAL_DIR,
    tribalJsonl: args.tribalJsonl ?? TRIBAL_JSONL,
    limit: args.limit,
  };

  const rows = loadRows(opts.rowsFile);
  if (rows.length === 0) {
    console.log(`⚠ No rows found in ${opts.rowsFile}.`);
    console.log("  Run scripts/scan-print-corpus.mjs first to populate the corpus.");
    return 1;
  }

  const plan = buildPlan(rows, opts);
  console.log(`Loaded ${rows.length} rows; emitting ${plan.lessons.length} lessons + ${plan.tribal.length} code-tribal + ${plan.tips.length} tips.`);
  const written = writeArtifacts(plan, args.dryRun);
  console.log(args.dryRun ? "✓ dry-run complete." : `✓ wrote ${written} files.`);
  return 0;
}

// Allow this file to be both a CLI and an importable module (for tests).
const isMain = import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}` || process.argv[1]?.replace(/\\/g, "/").endsWith("generate-print-reading-wiki-tribal.mjs")
  || import.meta.url.endsWith(path.basename(process.argv[1]));
if (isMain) {
  main().then(
    (code) => process.exit(code),
    (err) => { console.error("generate-print-reading-wiki-tribal.mjs fatal:", err); process.exit(2); },
  );
}
