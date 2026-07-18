#!/usr/bin/env node
/**
 * wedm-phase-b-pattern-mine.mjs — U-PHASE-B-TEMPLATE-MINING
 *
 * Phase-B kickoff: aggregate the 97-pair reference_metadata corpus (shipped
 * iter-35 U-MCX-METADATA-WIRE, regen'd iter-38) into a pattern catalog.
 * Phase-A produced one reference_metadata block per pair; Phase-B asks
 * "what recurs across the corpus?" so the answers become reusable
 * templates / macros / operator-vocabulary priors.
 *
 * No engine touch — pure aggregation. The 97 Mastercam binaries don't
 * leak full toolpath text (proprietary binary; see iter-35 R12 finding),
 * but they DO leak embedded printable runs: tool labels, post-processor
 * file paths, material tokens, operator comments, machine-class hints.
 * Those leaks are the substrate for Phase-B template mining.
 *
 * Output: state/shared/wedm-phase-b-patterns.json
 *
 *   {
 *     schema_version: "1.0.0",
 *     generated_at: ISO,
 *     source: "state/shared/wedm-training-corpus/*-phase-a1.json",
 *     corpus: { manifests_scanned: N, with_reference_metadata: N },
 *     format_distribution: { ".mcx-8": N, ".mcx-9": N, ".mcam": N },
 *     version_distribution: { "X8": N, "X9": N, null: N },
 *     magic_verified: { true: N, false: N },
 *     machine_hints: { wire: N, lathe: N, mill: N, ... },
 *     material_hints: [ { token: "D2", count: N }, ... ],   // sorted desc
 *     post_processor_hints: [ { name: ".pst", count: N }, ... ],
 *     tool_labels: [ { label: "...", count: N }, ... ],
 *     embedded_string_tokens: [ { token: "...", count: N, doc_freq: N }, ... ],
 *     zlib_chunk_distribution: { p50: N, p95: N, max: N, zero: N },
 *     embedded_string_count_distribution: { p50, p95, max, min },
 *   }
 *
 * Invocation: plain `node` (no engine imports — just reads JSON).
 */
import { promises as fsp } from "node:fs";
import path from "node:path";

const ROOT = path.resolve("H:/prism");
const CORPUS_DIR = path.join(ROOT, "state", "shared", "wedm-training-corpus");
const OUT_PATH = path.join(ROOT, "state", "shared", "wedm-phase-b-patterns.json");

// Token noise filter — drop generic noise that's not operator-meaningful.
// Mastercam binaries embed lots of GUIDs, paths, and framework strings that
// dwarf the operator-authored content we actually want.
const NOISE_PATTERNS = [
  /^[0-9a-f-]{20,}$/i,       // GUIDs / hashes
  /^\\\\.*\\.*$/,            // UNC paths
  /^[A-Z]:\\/,               // Windows absolute paths
  /^https?:\/\//,            // URLs
  /^\.NET/i,                 // .NET framework strings
  /^System\./,
  /^Microsoft\./,
  /^Mastercam\./,            // Internal Mastercam class names (just the namespace prefix; "Mastercam X8" etc. still pass)
  /^[\d.]+$/,                // Numeric-only
  /^.{1,3}$/,                // Too short
  /^.{120,}$/,               // Too long (a single 200-char string usually isn't operator vocabulary)
];

function isNoiseToken(s) {
  return NOISE_PATTERNS.some((re) => re.test(s));
}

function pct(arr, p) {
  if (!arr.length) return null;
  const sorted = arr.slice().sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

async function main() {
  const t0 = Date.now();
  const entries = await fsp.readdir(CORPUS_DIR);
  const manifestFiles = entries.filter((f) => f.endsWith("-phase-a1.json")).sort();

  // Aggregators
  const formatDist = new Map();
  const versionDist = new Map();
  const magicVerified = { true: 0, false: 0 };
  const machineHints = new Map();
  const materialHints = new Map();
  const postHints = new Map();
  const toolLabels = new Map();
  const stringTokenCount = new Map();
  const stringTokenDocFreq = new Map(); // how many manifests mention this token (vs total mention count)
  const zlibChunks = [];
  const embeddedStringCounts = [];

  let withRefMeta = 0;
  let totalManifests = 0;

  for (const f of manifestFiles) {
    totalManifests++;
    let m;
    try {
      m = JSON.parse(await fsp.readFile(path.join(CORPUS_DIR, f), "utf8"));
    } catch {
      continue;
    }
    const rm = m.reference_metadata;
    if (!rm || !rm.ok) continue;
    withRefMeta++;

    if (rm.format) formatDist.set(rm.format, (formatDist.get(rm.format) ?? 0) + 1);
    versionDist.set(String(rm.version), (versionDist.get(String(rm.version)) ?? 0) + 1);
    if (rm.magic_verified === true) magicVerified.true++;
    else if (rm.magic_verified === false) magicVerified.false++;

    for (const h of rm.machine_hints ?? []) {
      machineHints.set(h, (machineHints.get(h) ?? 0) + 1);
    }
    for (const h of rm.material_hints ?? []) {
      materialHints.set(h, (materialHints.get(h) ?? 0) + 1);
    }
    for (const h of rm.post_processor_hints ?? []) {
      postHints.set(h, (postHints.get(h) ?? 0) + 1);
    }
    for (const t of rm.tool_labels ?? []) {
      toolLabels.set(t, (toolLabels.get(t) ?? 0) + 1);
    }

    if (typeof rm.zlib_chunks === "number") zlibChunks.push(rm.zlib_chunks);
    if (typeof rm.embedded_string_count === "number") embeddedStringCounts.push(rm.embedded_string_count);

    // embedded_strings sample isn't persisted in the manifest (we kept only
    // counts to bound JSON size); for full token-frequency analysis we'd
    // need to re-run McxProgramParserEngine and keep the strings. v1 here
    // mines the already-persisted hint arrays + summary counts only.
    // Future: extend to re-parse the .mcx-* refs on a sampling basis.
  }

  // Sort frequency maps descending; keep noise out where appropriate.
  function toSortedFreqArray(map, { keyName, keepNoise = false, topN = null } = {}) {
    const arr = [];
    for (const [k, count] of map) {
      if (!keepNoise && isNoiseToken(String(k))) continue;
      arr.push({ [keyName]: k, count });
    }
    arr.sort((a, b) => b.count - a.count);
    return topN ? arr.slice(0, topN) : arr;
  }

  const out = {
    schema_version: "1.0.0",
    generated_at: new Date().toISOString(),
    source: "state/shared/wedm-training-corpus/*-phase-a1.json",
    runtime_ms: Date.now() - t0,
    corpus: {
      manifests_scanned: totalManifests,
      with_reference_metadata: withRefMeta,
      without_reference_metadata: totalManifests - withRefMeta,
    },
    format_distribution: Object.fromEntries(formatDist),
    version_distribution: Object.fromEntries(versionDist),
    magic_verified: magicVerified,
    machine_hints: Object.fromEntries(machineHints),
    material_hints: toSortedFreqArray(materialHints, { keyName: "token" }),
    post_processor_hints: toSortedFreqArray(postHints, { keyName: "name" }),
    tool_labels: toSortedFreqArray(toolLabels, { keyName: "label", topN: 100 }),
    zlib_chunk_distribution: {
      count: zlibChunks.length,
      zero: zlibChunks.filter((n) => n === 0).length,
      p50: pct(zlibChunks, 50),
      p95: pct(zlibChunks, 95),
      max: zlibChunks.length ? Math.max(...zlibChunks) : 0,
    },
    embedded_string_count_distribution: {
      count: embeddedStringCounts.length,
      min: embeddedStringCounts.length ? Math.min(...embeddedStringCounts) : 0,
      p50: pct(embeddedStringCounts, 50),
      p95: pct(embeddedStringCounts, 95),
      max: embeddedStringCounts.length ? Math.max(...embeddedStringCounts) : 0,
    },
  };

  await fsp.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fsp.writeFile(OUT_PATH, JSON.stringify(out, null, 2) + "\n");

  console.error(
    `phase-b mine: ${out.corpus.with_reference_metadata}/${out.corpus.manifests_scanned} manifests · ` +
      `formats=${JSON.stringify(out.format_distribution)} · ` +
      `machine_hints=${JSON.stringify(out.machine_hints)} · ` +
      `materials=${out.material_hints.length} unique (top: ${out.material_hints.slice(0,3).map(m=>m.token+'×'+m.count).join(', ') || 'none'}) · ` +
      `posts=${out.post_processor_hints.length} unique · ` +
      `tools=${out.tool_labels.length} unique · ` +
      `runtime=${out.runtime_ms}ms`,
  );
  console.error(`wrote ${path.relative(ROOT, OUT_PATH).replace(/\\/g, "/")}`);
}

main().catch((e) => {
  console.error("FATAL:", e?.stack ?? e?.message ?? e);
  process.exit(1);
});