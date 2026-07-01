#!/usr/bin/env node
/**
 * wedm-mcx-material-vocab-scan.mjs — U-MCX-MATERIAL-VOCAB
 *
 * Phase-B iter-39 found only "GRAPHITE×1" material hint across the 97-pair
 * corpus. McxProgramParserEngine's COMMON_MATERIAL_TOKENS regex requires
 * verbatim alloy designations (D2, M2, 4140, TI-6AL-4V, etc.). JM Die's
 * operators don't put those in Mastercam — they write descriptive comments
 * ("die steel", "carbide insert", "thru hardened", etc.).
 *
 * This script re-parses 5 .mcx-* samples and dumps the raw embedded_strings
 * array so we can see what's actually there. The output is a discovery
 * artifact for proposing regex additions — engine modification is a
 * follow-up unit (needs companion tests + the 3-of-3 scrutiny gate).
 *
 * Strategy:
 *   1. Re-parse 5 .mcx-8 files from JM Die WIRE EDM/
 *   2. For each, surface: top 50 embedded strings sorted by length-desc
 *      (longer strings are more likely operator-written, less likely random
 *      binary fragments). Also dump any string containing capitalized words
 *      (operator vocabulary marker).
 *   3. Cross-corpus: find strings that appear in 2+ files (high signal
 *      for shared operator vocabulary vs file-specific GUIDs/paths).
 *   4. Persist as discovery artifact — operator can scan and propose
 *      regex additions; this script does NOT edit the engine.
 *
 * Output: state/shared/wedm-mcx-material-vocab-scan.json
 *
 * Invocation: `mcp-server/node_modules/.bin/tsx scripts/wedm-mcx-material-vocab-scan.mjs`
 * (engine import — .ts requires tsx)
 */
import { promises as fsp } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = path.resolve("H:/prism");
const OUT_PATH = path.join(ROOT, "state", "shared", "wedm-mcx-material-vocab-scan.json");

// Sample selection — spread across customers + file sizes for vocabulary diversity.
const SAMPLE_FILES = [
  { stem: "10-001-490", path: "JM DIE/WIRE EDM/ALLFAST/10-001-490.mcx-8" },
  { stem: "1134_hob",   path: "JM DIE/WIRE EDM/FORGO/1134 HOB.mcx-8" },
  { stem: "0137471",    path: "JM DIE/WIRE EDM/ALCOA FASTENING/0137471.mcx-8" },
  { stem: "1649735",    path: "JM DIE/WIRE EDM/MCAM X8/SFS INTEC/1649735.mcx-8" },
  { stem: "1210",       path: "JM DIE/WIRE EDM/COBRA/1210.mcx-8" },
];

// Noise filter — drop strings that are obviously not operator vocabulary.
const NOISE_PATTERNS = [
  /^[0-9a-f-]{20,}$/i,           // GUIDs / hashes
  /^[A-Z]:\\/,                   // Windows abs paths
  /^\\\\/,                       // UNC paths
  /^https?:\/\//,                // URLs
  /^System\.|^Microsoft\.|^Mastercam\.|^MCAM\./, // Framework / vendor namespaces
  /^[\d.\-+e]+$/,                // Numeric-only
  /^[A-Z_]+\.dll$/i,             // DLLs
  /^[A-Z_]+\.exe$/i,             // EXEs
];
const isNoise = (s) => NOISE_PATTERNS.some((re) => re.test(s));

// Heuristic material-vocabulary markers — strings that LOOK like material
// callouts (alloy/hardness/processing descriptors). Used to PROPOSE regex
// additions, not to actually classify.
const MATERIAL_VOCAB_PATTERNS = [
  // Alloy designations beyond the engine's current set
  { name: "carbide-token", re: /\bCARBIDE\b/i },
  { name: "tool-steel-descriptor", re: /\bTOOL\s*STEEL\b/i },
  { name: "die-steel-descriptor", re: /\bDIE\s*STEEL\b/i },
  { name: "hss-token", re: /\bHSS\b|\bHIGH\s*SPEED\s*STEEL\b/i },
  { name: "hardened-descriptor", re: /\bHARDENED\b|\bTHRU\s*HARDENED\b/i },
  { name: "annealed-descriptor", re: /\bANNEALED\b/i },
  { name: "hot-work-token", re: /\bHOT\s*WORK\b|\bHWT\b/i },
  { name: "cold-work-token", re: /\bCOLD\s*WORK\b|\bCWS\b/i },
  // Hardness designators
  { name: "rockwell-c", re: /\bH?RC\s*[\d.]+/i },
  { name: "rockwell-b", re: /\bH?RB\s*[\d.]+/i },
  { name: "brinell", re: /\bHB[NW]?\s*[\d.]+/i },
  // Additional alloy designations
  { name: "p20-token", re: /\bP20\b/i },          // pre-hardened mold steel
  { name: "s7-token", re: /\bS7\b/ },             // shock-resistant tool steel
  { name: "a2-token", re: /\bA2\b/ },             // air-hardening tool steel
  { name: "o1-token", re: /\bO1\b/i },            // oil-hardening tool steel
  { name: "w1-token", re: /\bW1\b/i },            // water-hardening
  { name: "powdered-metal", re: /\bPM\s*M[24]\b|\bCPM\b|\bPM\s*STEEL\b/i },
  { name: "stainless-token", re: /\bSTAINLESS\b|\b[34]\d{2}\s*STAINLESS\b/i },
  { name: "inconel-token", re: /\bINCONEL\b|\bINCO\s*\d/i },
  { name: "hastelloy-token", re: /\bHASTELLOY\b/i },
  { name: "titanium-token", re: /\bTITANIUM\b|\bTI[\s-]?\d/i },
];

function classifyAsMaterialVocab(s) {
  const hits = [];
  for (const p of MATERIAL_VOCAB_PATTERNS) {
    if (p.re.test(s)) hits.push(p.name);
  }
  return hits;
}

async function main() {
  const t0 = Date.now();
  const { mcxProgramParserEngine } = await import(
    pathToFileURL(path.join(ROOT, "mcp-server/src/engines/McxProgramParserEngine.ts")).href
  );

  const perFile = [];
  // string → { firstSeenIn, totalCount, files: Set<stem> }
  const crossCorpusStrings = new Map();

  for (const s of SAMPLE_FILES) {
    const full = path.isAbsolute(s.path) ? s.path : path.join(ROOT, s.path);
    let md;
    try {
      md = mcxProgramParserEngine.parseFile(full);
    } catch (e) {
      perFile.push({ stem: s.stem, path: s.path, ok: false, error: String(e?.message ?? e) });
      continue;
    }
    const strings = (md.embedded_strings ?? []).filter((str) => !isNoise(str));
    // Build per-file digest: top-N longest strings + any material-vocab hits
    const byLen = strings.slice().sort((a, b) => b.length - a.length).slice(0, 50);
    const materialHits = [];
    for (const str of strings) {
      const tags = classifyAsMaterialVocab(str);
      if (tags.length > 0) materialHits.push({ string: str, tags });
      // Cross-corpus aggregation
      if (!crossCorpusStrings.has(str)) {
        crossCorpusStrings.set(str, { totalCount: 0, files: new Set() });
      }
      const cc = crossCorpusStrings.get(str);
      cc.totalCount++;
      cc.files.add(s.stem);
    }
    perFile.push({
      stem: s.stem,
      path: s.path,
      ok: true,
      format: md.format,
      version: md.version,
      machine_hints: md.machine_hints,
      tool_labels: md.tool_labels,
      post_processor_hints: md.post_processor_hints,
      material_hints_existing: md.material_hints,
      embedded_string_total: md.embedded_strings.length,
      embedded_string_after_noise: strings.length,
      top_50_by_length: byLen,
      material_vocab_candidates: materialHits,
    });
  }

  // Cross-corpus: strings appearing in 2+ files (shared operator vocabulary)
  const sharedAcrossFiles = [];
  for (const [str, info] of crossCorpusStrings) {
    if (info.files.size >= 2) {
      sharedAcrossFiles.push({ string: str, files: [...info.files], totalCount: info.totalCount });
    }
  }
  sharedAcrossFiles.sort((a, b) => b.files.length - a.files.length || b.totalCount - a.totalCount);

  // Vocabulary-pattern aggregate across the sample
  const vocabAggregate = {};
  for (const pf of perFile) {
    if (!pf.ok) continue;
    for (const m of pf.material_vocab_candidates) {
      for (const tag of m.tags) {
        if (!vocabAggregate[tag]) vocabAggregate[tag] = { hit_count: 0, examples: new Set() };
        vocabAggregate[tag].hit_count++;
        vocabAggregate[tag].examples.add(m.string);
      }
    }
  }
  const vocabAggregateOut = {};
  for (const [k, v] of Object.entries(vocabAggregate)) {
    vocabAggregateOut[k] = { hit_count: v.hit_count, examples: [...v.examples].slice(0, 5) };
  }

  const out = {
    schema_version: "1.0.0",
    generated_at: new Date().toISOString(),
    purpose: "Discover operator material vocabulary in JM Die .mcx-* embedded strings beyond engine's current COMMON_MATERIAL_TOKENS regex",
    sample_size: SAMPLE_FILES.length,
    runtime_ms: Date.now() - t0,
    vocab_pattern_aggregate: vocabAggregateOut,
    cross_corpus_shared_strings: sharedAcrossFiles.slice(0, 100),
    per_file: perFile,
  };

  await fsp.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fsp.writeFile(OUT_PATH, JSON.stringify(out, null, 2) + "\n");

  console.error(
    `material-vocab-scan: ${SAMPLE_FILES.length} samples · ` +
      `vocab_patterns_hit=${Object.keys(vocabAggregateOut).length} (${Object.entries(vocabAggregateOut).map(([k,v])=>k+'×'+v.hit_count).join(', ') || 'none'}) · ` +
      `cross_corpus_shared=${sharedAcrossFiles.length} strings appear in 2+ files · ` +
      `runtime=${out.runtime_ms}ms`,
  );
  console.error(`wrote ${path.relative(ROOT, OUT_PATH).replace(/\\/g, "/")}`);
}

main().catch((e) => { console.error("FATAL:", e?.stack ?? e?.message ?? e); process.exit(1); });
