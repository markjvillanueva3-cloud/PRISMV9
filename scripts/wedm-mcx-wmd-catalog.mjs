#!/usr/bin/env node
/**
 * wedm-mcx-wmd-catalog.mjs — U-MCX-MACHINE-DEFINITION-VOCAB
 *
 * iter-41 (U-MCX-MATERIAL-VOCAB) surfaced that material vocabulary is sparse
 * in JM Die's .mcx-* embedded strings (operators don't put material in
 * Mastercam) — but `.wmd-*` machine-definition references ARE rich. Examples
 * from the iter-41 cross-corpus shared-string list:
 *
 *   "MPW MITS FA-FX EDM(TECH).wmd-8"   (4/5 sample files)
 *   "X WIRE (TECH).wmd-5"               (4/5)
 *
 * .wmd-* is Mastercam's machine-definition format — it identifies the
 * SPECIFIC physical machine model the program was authored for. Knowing
 * which programs target Mitsubishi FA, FX, MV-series, etc. is a real
 * downstream-useful signal (machine-aware speed/feed calibration, fixture
 * compatibility, controller-dialect inference).
 *
 * Strategy: walk every .mcx-* reference in state/shared/wedm-comparable-pairs.json
 * (or directly the wedm-training-corpus manifests), re-parse via
 * McxProgramParserEngine, extract any embedded string matching `*.wmd*`,
 * aggregate by exact .wmd identity + frequency + which manifest each appears in.
 *
 * Output: state/shared/wedm-mcx-wmd-catalog.json
 *
 *   {
 *     schema_version: "1.0.0",
 *     generated_at,
 *     corpus_size,
 *     wmd_distribution: [
 *       { wmd: "MPW MITS FA-FX EDM(TECH).wmd-8", count: N, manifests: [stems], format: ".wmd-8" },
 *       ...
 *     ],
 *     by_format: { ".wmd-8": N, ".wmd-5": N, ".wmd-9": N, ... },
 *     by_machine_class: { mitsubishi_fa_fx: N, mitsubishi_mv: N, generic_wire: N, ... },
 *     manifests_with_zero_wmd: [stems],
 *   }
 *
 * Invocation: `mcp-server/node_modules/.bin/tsx scripts/wedm-mcx-wmd-catalog.mjs`
 */
import { promises as fsp } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = path.resolve("H:/prism");
const CORPUS_DIR = path.join(ROOT, "state", "shared", "wedm-training-corpus");
const OUT_PATH = path.join(ROOT, "state", "shared", "wedm-mcx-wmd-catalog.json");

// Mastercam .wmd-* match — captures the whole identity including any
// preceding name. iter-1 had `[A-Za-z0-9 _.()\-]+` which the regex engine
// stopped advancing at `)` in the middle of compound names like
// "EDM(TECH).wmd-8", producing a "ECH).wmd-8" truncation artifact (53/97
// dup-count of the FA-FX entry). iter-2 fix: greedy match across full name
// character class including the closing paren, then post-filter for sanity.
const WMD_RE = /[A-Za-z0-9 _.()\-]+?\.wmd(?:-\d)?(?=$|[^A-Za-z0-9])/gi;

// iter-47: also catalog .pst post-processor refs in the same pass. Same
// pattern shape — compound name + paren-tolerant + version-suffix-friendly.
// Phase-B iter-39 caught 5 .pst identities via the engine's heuristic;
// full embedded-string scan should surface any the heuristic missed.
const PST_RE = /[A-Za-z0-9 _.()\-]+?\.pst(?:-\d)?(?=$|[^A-Za-z0-9])/gi;

// Machine-class inference from .wmd name. Conservative — only fires on
// clear-text identifiers operators put in .wmd filenames.
// iter-42 surfaced that MITSUBISHI/FA-SERIES variants (e.g. "MITSUBISHI
// FA-SERIES 4X WIRE (TECH).wmd-8", 16 + 15 case variants in JM Die corpus)
// were falling through to generic_wire. iter-43 (this) adds MITSUBISHI as
// a strong identifier AND FA-SERIES Nx WIRE as a variant. Order matters —
// more-specific patterns FIRST (FA-FX → fa_series → mitsubishi-generic
// → other vendors → generic_wire fallback).
const MACHINE_CLASS_PATTERNS = [
  { class: "mitsubishi_fa_fx", re: /\bFA[-\s]?FX\b|\bMITS\s+FA-FX\b/i },
  { class: "mitsubishi_mv", re: /\bMV[-\s]?\d{3,4}/i },
  { class: "mitsubishi_fa_series", re: /\b(?:MITSUBISHI|MITS)\s+FA[-\s]?(?:SERIES|\d|EDM|WIRE)\b/i },
  { class: "mitsubishi_fa_series", re: /\bFA[-\s]?SERIES\s+\d?X?\s*(?:WIRE|EDM)\b/i },
  { class: "mitsubishi_generic", re: /\bMITSUBISHI\b|\bMITS\b/i },
  { class: "fanuc_robocut", re: /\bROBOCUT\b|\bFANUC\s+(?:WIRE|EDM)/i },
  { class: "sodick", re: /\bSODICK\b|\bAQ\d{3,4}\b/i },
  { class: "agiecharmilles", re: /\bAGIE\b|\bCHARMILLES\b/i },
  { class: "makino", re: /\bMAKINO\b/i },
  { class: "generic_wire", re: /\bX?\s*WIRE\b/i },
];

function classifyMachineClass(wmdName) {
  for (const p of MACHINE_CLASS_PATTERNS) {
    if (p.re.test(wmdName)) return p.class;
  }
  return "unclassified";
}

async function main() {
  const t0 = Date.now();
  const { mcxProgramParserEngine } = await import(
    pathToFileURL(path.join(ROOT, "mcp-server/src/engines/McxProgramParserEngine.ts")).href
  );

  // Read all *-phase-a1.json manifests, pull reference_program_path.
  const entries = await fsp.readdir(CORPUS_DIR);
  const manifestFiles = entries.filter((f) => f.endsWith("-phase-a1.json")).sort();

  // wmdName → { count, manifests: Set, format }
  const wmdMap = new Map();
  // pstName → { count, manifests: Set }
  const pstMap = new Map();
  const manifestsWithZeroWmd = [];
  const manifestsWithZeroPst = [];
  const parseErrors = [];
  let parsed = 0;

  for (const f of manifestFiles) {
    const stem = f.replace(/-phase-a1\.json$/, "");
    let m;
    try {
      m = JSON.parse(await fsp.readFile(path.join(CORPUS_DIR, f), "utf8"));
    } catch {
      continue;
    }
    const refPath = m.reference_program_path;
    if (!refPath) continue;
    if (!/\.mcx/i.test(refPath)) continue; // only .mcx-* refs

    let md, err = null;
    try {
      md = mcxProgramParserEngine.parseFile(refPath);
    } catch (e) {
      err = String(e?.message ?? e);
    }
    if (err || !md || !md.parse_ok) {
      parseErrors.push({ stem, ref: refPath, error: err ?? "parse_ok=false" });
      continue;
    }
    parsed++;

    // Scan ALL embedded strings for .wmd-* AND .pst matches.
    const wmdFound = new Set();
    const pstFound = new Set();
    for (const s of md.embedded_strings ?? []) {
      const wmdMatches = s.match(WMD_RE);
      if (wmdMatches) {
        for (const raw of wmdMatches) {
          const wmd = raw.trim();
          if (wmd.length < 6 || wmd.length > 80) continue;
          wmdFound.add(wmd);
        }
      }
      const pstMatches = s.match(PST_RE);
      if (pstMatches) {
        for (const raw of pstMatches) {
          const pst = raw.trim();
          if (pst.length < 5 || pst.length > 80) continue;
          pstFound.add(pst);
        }
      }
    }

    if (pstFound.size === 0) manifestsWithZeroPst.push(stem);
    for (const pst of pstFound) {
      if (!pstMap.has(pst)) pstMap.set(pst, { count: 0, manifests: new Set() });
      const entry = pstMap.get(pst);
      entry.count++;
      entry.manifests.add(stem);
    }

    if (wmdFound.size === 0) {
      manifestsWithZeroWmd.push(stem);
      continue;
    }
    for (const wmd of wmdFound) {
      if (!wmdMap.has(wmd)) {
        const dotPos = wmd.lastIndexOf(".");
        const format = dotPos >= 0 ? wmd.slice(dotPos).toLowerCase() : "unknown";
        wmdMap.set(wmd, { count: 0, manifests: new Set(), format });
      }
      const entry = wmdMap.get(wmd);
      entry.count++;
      entry.manifests.add(stem);
    }
  }

  // Dedup pass: an embedded-string extractor often emits both a full string
  // AND its truncated suffix (e.g. "EDM(TECH).wmd-8" and "ECH).wmd-8" — same
  // 53 files, the second is a sub-string artifact). Drop any wmd whose name
  // is a strict suffix of another wmd that appears in a superset of the same
  // manifests. This is conservative — only suppresses true noise duplicates.
  const wmdNames = [...wmdMap.keys()];
  const suppressed = new Set();
  for (const candidate of wmdNames) {
    for (const longer of wmdNames) {
      if (candidate === longer) continue;
      if (longer.length <= candidate.length) continue;
      if (!longer.toLowerCase().endsWith(candidate.toLowerCase())) continue;
      const cInfo = wmdMap.get(candidate);
      const lInfo = wmdMap.get(longer);
      // Suffix-fragment heuristic: the candidate's manifest set must be a
      // subset of the longer's manifest set.
      let isSubset = true;
      for (const m of cInfo.manifests) {
        if (!lInfo.manifests.has(m)) { isSubset = false; break; }
      }
      if (isSubset) {
        suppressed.add(candidate);
        break;
      }
    }
  }

  // iter-47: build .pst distribution + same suffix-dedup pass
  const pstNames = [...pstMap.keys()];
  const pstSuppressed = new Set();
  for (const candidate of pstNames) {
    for (const longer of pstNames) {
      if (candidate === longer) continue;
      if (longer.length <= candidate.length) continue;
      if (!longer.toLowerCase().endsWith(candidate.toLowerCase())) continue;
      const cInfo = pstMap.get(candidate);
      const lInfo = pstMap.get(longer);
      let isSubset = true;
      for (const m of cInfo.manifests) {
        if (!lInfo.manifests.has(m)) { isSubset = false; break; }
      }
      if (isSubset) { pstSuppressed.add(candidate); break; }
    }
  }
  const pstDistribution = [];
  for (const [pst, info] of pstMap) {
    if (pstSuppressed.has(pst)) continue;
    pstDistribution.push({
      pst,
      count: info.count,
      manifest_count: info.manifests.size,
      manifests: [...info.manifests].slice(0, 20),
    });
  }
  pstDistribution.sort((a, b) => b.manifest_count - a.manifest_count || b.count - a.count);

  // Build sorted distribution + by_format + by_machine_class aggregates
  const wmdDistribution = [];
  const byFormat = {};
  const byMachineClass = {};
  for (const [wmd, info] of wmdMap) {
    if (suppressed.has(wmd)) continue;
    byFormat[info.format] = (byFormat[info.format] ?? 0) + info.manifests.size;
    const klass = classifyMachineClass(wmd);
    byMachineClass[klass] = (byMachineClass[klass] ?? 0) + info.manifests.size;
    wmdDistribution.push({
      wmd,
      format: info.format,
      machine_class: klass,
      count: info.count,
      manifest_count: info.manifests.size,
      manifests: [...info.manifests].slice(0, 20), // cap list size
    });
  }
  wmdDistribution.sort((a, b) => b.manifest_count - a.manifest_count || b.count - a.count);

  const out = {
    schema_version: "1.0.0",
    generated_at: new Date().toISOString(),
    purpose: "Extract .wmd-* machine-definition references from .mcx-* embedded strings to identify which physical Mitsubishi (or other) WEDM model each program targets",
    runtime_ms: Date.now() - t0,
    corpus_size: manifestFiles.length,
    parsed_mcx_count: parsed,
    parse_error_count: parseErrors.length,
    unique_wmd_identities: wmdDistribution.length,
    suppressed_suffix_fragment_count: suppressed.size,
    unique_pst_identities: pstDistribution.length,
    suppressed_pst_suffix_fragment_count: pstSuppressed.size,
    manifests_with_zero_pst_count: manifestsWithZeroPst.length,
    pst_distribution: pstDistribution,
    manifests_with_zero_pst: manifestsWithZeroPst.slice(0, 30),
    manifests_with_zero_wmd_count: manifestsWithZeroWmd.length,
    by_format: byFormat,
    by_machine_class: byMachineClass,
    wmd_distribution: wmdDistribution,
    manifests_with_zero_wmd: manifestsWithZeroWmd.slice(0, 30),
    parse_errors: parseErrors.slice(0, 10),
  };

  await fsp.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fsp.writeFile(OUT_PATH, JSON.stringify(out, null, 2) + "\n");

  console.error(
    `wmd-catalog: corpus=${out.corpus_size} parsed=${out.parsed_mcx_count} · ` +
      `unique_wmd=${out.unique_wmd_identities} · ` +
      `by_format=${JSON.stringify(byFormat)} · ` +
      `by_class=${JSON.stringify(byMachineClass)} · ` +
      `zero_wmd_manifests=${out.manifests_with_zero_wmd_count} · ` +
      `runtime=${out.runtime_ms}ms`,
  );
  console.error(`wrote ${path.relative(ROOT, OUT_PATH).replace(/\\/g, "/")}`);
}

main().catch((e) => { console.error("FATAL:", e?.stack ?? e?.message ?? e); process.exit(1); });
