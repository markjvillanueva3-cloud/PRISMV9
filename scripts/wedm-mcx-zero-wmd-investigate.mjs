#!/usr/bin/env node
/**
 * wedm-mcx-zero-wmd-investigate.mjs — U-WMD-ZERO-INVESTIGATE
 *
 * iter-42 wmd-catalog found 18 of 97 .mcx-* binaries have NO .wmd-*
 * reference in their embedded strings. This unit asks: what's actually
 * in those files? Are they (a) truly machine-def-less projects, (b)
 * X8-compressed-region opaque (machine-def stored in the proprietary
 * payload, not in the printable runs the engine extracts), or
 * (c) something else operationally interesting?
 *
 * Strategy: pick 3 zero-wmd samples (including AF102-05, the canonical
 * Phase-A test pair). Re-parse via McxProgramParserEngine. Dump:
 *   - top-N embedded strings sorted by length (longer = more
 *     operator-meaningful)
 *   - any string containing potential machine identifiers ("MITSUBISHI",
 *     "FANUC", "SODICK", "WIRE", "EDM", "FA-", "MV-", "AQ-", "ROBOCUT")
 *   - any string containing post-processor file extensions (.pst, .ppr, .mc*)
 *   - any string containing a machine model number pattern
 *
 * Output: state/shared/wedm-mcx-zero-wmd-investigation.json
 *
 * Invocation: `mcp-server/node_modules/.bin/tsx scripts/wedm-mcx-zero-wmd-investigate.mjs`
 */
import { promises as fsp } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = path.resolve("H:/prism");
const CORPUS_DIR = path.join(ROOT, "state", "shared", "wedm-training-corpus");
const CATALOG_PATH = path.join(ROOT, "state", "shared", "wedm-mcx-wmd-catalog.json");
const OUT_PATH = path.join(ROOT, "state", "shared", "wedm-mcx-zero-wmd-investigation.json");

const MACHINE_IDENTIFIER_RE = /\b(?:MITSUBISHI|MITS|FANUC|ROBOCUT|SODICK|AGIE|CHARMILLES|MAKINO|FA[-\s]?\d|FA[-\s]?FX|FA[-\s]?SERIES|MV[-\s]?\d|AQ\d{3,4}|EDM|WIRE|HSM|EUROCUT|GENOA)\b/i;
const POST_PROC_EXT_RE = /\.(pst|ppr|psb|mca|mcam-pst|nci|mcx)\b/i;
// iter-45 fix: dropped the 'U' single-letter prefix — it matched binary
// garbage like '|?Z)u8)K' on 0137471 (iter-44 false positive). Single-letter
// prefixes are too ambiguous against random byte runs; keep only 2+letter
// prefixes (real Mitsubishi/Sodick/Fanuc model identifiers all have ≥2-letter
// model codes: FA, MV, AQ, UPM, SX, SF, CX, ROBO, AC). Word-boundary anchors
// stay; digit count widened to 2-5 for models like FA10S, MV1200R, AQ400LS.
const MACHINE_MODEL_NUM_RE = /\b(?:FA|MV|AQ|UPM|SX|SF|CX|ROBO|AC)[\s-]?\d{2,5}[A-Z]{0,2}\b/i;

async function main() {
  const t0 = Date.now();
  const catalog = JSON.parse(await fsp.readFile(CATALOG_PATH, "utf8"));
  const zeroStems = catalog.manifests_with_zero_wmd ?? [];
  if (zeroStems.length === 0) {
    console.error("no zero-wmd manifests — nothing to investigate");
    process.exit(0);
  }

  // Sample picks: AF102-05 (canonical test pair) + first 2 others
  const samples = ["af102-05"].concat(zeroStems.filter((s) => s !== "af102-05").slice(0, 2));

  const { mcxProgramParserEngine } = await import(
    pathToFileURL(path.join(ROOT, "mcp-server/src/engines/McxProgramParserEngine.ts")).href
  );

  const results = [];
  for (const stem of samples) {
    const manifestPath = path.join(CORPUS_DIR, `${stem}-phase-a1.json`);
    let manifest;
    try {
      manifest = JSON.parse(await fsp.readFile(manifestPath, "utf8"));
    } catch (e) {
      results.push({ stem, ok: false, error: `manifest read failed: ${String(e?.message ?? e)}` });
      continue;
    }
    const refPath = manifest.reference_program_path;
    if (!refPath) {
      results.push({ stem, ok: false, error: "no reference_program_path" });
      continue;
    }

    let md, err = null;
    try { md = mcxProgramParserEngine.parseFile(refPath); }
    catch (e) { err = String(e?.message ?? e); }
    if (err || !md || !md.parse_ok) {
      results.push({ stem, ok: false, error: err ?? "parse_ok=false" });
      continue;
    }

    const strings = md.embedded_strings ?? [];
    const machineHits = strings.filter((s) => MACHINE_IDENTIFIER_RE.test(s));
    const postProcHits = strings.filter((s) => POST_PROC_EXT_RE.test(s));
    const modelNumHits = strings.filter((s) => MACHINE_MODEL_NUM_RE.test(s));
    const topByLen = strings.slice().sort((a, b) => b.length - a.length).slice(0, 30);

    results.push({
      stem,
      ok: true,
      ref_path: refPath,
      format: md.format,
      version: md.version,
      bytes_total: md.bytes_total,
      machine_hints_from_engine: md.machine_hints,
      tool_labels_from_engine: md.tool_labels,
      post_processor_hints_from_engine: md.post_processor_hints,
      material_hints_from_engine: md.material_hints,
      embedded_string_count: strings.length,
      zlib_chunks: md.zlib_chunks,
      candidate_machine_identifier_strings: machineHits,
      candidate_post_processor_strings: postProcHits,
      candidate_model_number_strings: modelNumHits,
      top_30_strings_by_length: topByLen,
    });
  }

  const out = {
    schema_version: "1.0.0",
    generated_at: new Date().toISOString(),
    purpose: "Investigate why 18 of 97 .mcx-* binaries lack .wmd-* refs in embedded strings — alternative machine-def patterns? X8 compressed-region opacity?",
    source_catalog: "state/shared/wedm-mcx-wmd-catalog.json",
    zero_wmd_total: zeroStems.length,
    samples_inspected: samples.length,
    runtime_ms: Date.now() - t0,
    results,
  };

  await fsp.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fsp.writeFile(OUT_PATH, JSON.stringify(out, null, 2) + "\n");

  console.error(`zero-wmd-investigate: ${samples.length} samples · runtime=${out.runtime_ms}ms`);
  for (const r of results) {
    if (!r.ok) { console.error(`  ${r.stem}: ERROR ${r.error}`); continue; }
    console.error(
      `  ${r.stem.padEnd(18)} ` +
        `strings=${r.embedded_string_count} ` +
        `zlib=${r.zlib_chunks} ` +
        `machine_ids=${r.candidate_machine_identifier_strings.length} ` +
        `post_procs=${r.candidate_post_processor_strings.length} ` +
        `model_nums=${r.candidate_model_number_strings.length}`,
    );
  }
  console.error(`wrote ${path.relative(ROOT, OUT_PATH).replace(/\\/g, "/")}`);
}

main().catch((e) => { console.error("FATAL:", e?.stack ?? e?.message ?? e); process.exit(1); });
