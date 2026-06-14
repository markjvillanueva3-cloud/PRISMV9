#!/usr/bin/env node
/**
 * wedm-standalone-nc-parse.mjs — U-WEDM-STANDALONE-NC-CORPUS
 *
 * Closes the Phase-A loop with NC-parser coverage on the 22 standalone NC
 * files that iter-36 (U-WEDM-COMPARABLE-PAIRS-INDEX) proved have no
 * .mcx-* siblings. Those 22 files (19 .MIN Mitsubishi + 3 .NC generic) are
 * the only operator-authored WEDM NC in JM Die's tree — independent of any
 * Mastercam workflow. Parsing them tells us:
 *
 *   1. Does WireEDMProgramParserEngine actually handle Mitsubishi .MIN
 *      dialect ($PC...% / NBAR / DEF WORK / M-codes)? Or is .MIN a parser
 *      gap that needs a dialect extension?
 *   2. What's the program-metadata distribution (pass counts, taper usage,
 *      auto-thread, offsets) across real shop-authored programs?
 *   3. Surfaces parser failures with full context so a follow-up dialect
 *      extension unit (U-WEDM-MIN-PARSER) has a clean target list.
 *
 * Input:  state/shared/wedm-comparable-pairs.json (the iter-36 index;
 *         reads the `unpaired` array — that IS the standalone corpus).
 * Output: state/shared/wedm-standalone-nc-corpus.json
 *
 * Invocation: `mcp-server/node_modules/.bin/tsx scripts/wedm-standalone-nc-parse.mjs`
 * (engine is .ts; plain `node` throws ERR_UNKNOWN_FILE_EXTENSION.)
 */
import { promises as fsp } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = path.resolve("H:/prism");
const INDEX_PATH = path.join(ROOT, "state", "shared", "wedm-comparable-pairs.json");
const OUT_PATH = path.join(ROOT, "state", "shared", "wedm-standalone-nc-corpus.json");

async function main() {
  const t0 = Date.now();
  let index;
  try {
    index = JSON.parse(await fsp.readFile(INDEX_PATH, "utf8"));
  } catch (e) {
    console.error("FATAL: cannot read", INDEX_PATH, "-", String(e?.message ?? e));
    console.error("Run scripts/wedm-comparable-pairs-index.mjs first.");
    process.exit(1);
  }
  const standalone = index.unpaired ?? [];
  if (standalone.length === 0) {
    console.error("no standalone NC files in index — nothing to parse");
    process.exit(0);
  }

  const { wireEDMProgramParserEngine } = await import(
    pathToFileURL(path.join(ROOT, "mcp-server/src/engines/WireEDMProgramParserEngine.ts")).href
  );

  const results = [];
  const stats = {
    total: standalone.length,
    parse_ok: 0,
    parse_failed: 0,
    by_dialect_detected: {},
    by_dialect_expected: {},
    expected_vs_detected_match: 0,
    has_passes: 0,
    has_taper: 0,
    has_auto_thread: 0,
  };

  for (const nc of standalone) {
    const t_start = Date.now();
    stats.by_dialect_expected[nc.nc_dialect] = (stats.by_dialect_expected[nc.nc_dialect] ?? 0) + 1;

    let content;
    try {
      content = await fsp.readFile(nc.nc_path, "utf8");
    } catch (e) {
      stats.parse_failed++;
      results.push({
        stem: nc.stem,
        nc_path: nc.nc_path,
        nc_ext: nc.nc_ext,
        expected_dialect: nc.nc_dialect,
        ok: false,
        error: `read failed: ${String(e?.message ?? e)}`,
        runtime_ms: Date.now() - t_start,
      });
      continue;
    }

    let parsed, parseErr = null;
    try {
      parsed = wireEDMProgramParserEngine.parse(content, path.basename(nc.nc_path));
    } catch (e) {
      // The engine docs don't promise "never throws," so wrap defensively.
      parseErr = String(e?.message ?? e);
    }

    const runtime_ms = Date.now() - t_start;

    if (parseErr || !parsed) {
      stats.parse_failed++;
      results.push({
        stem: nc.stem,
        nc_path: nc.nc_path,
        nc_ext: nc.nc_ext,
        expected_dialect: nc.nc_dialect,
        ok: false,
        error: parseErr ?? "no parse result",
        runtime_ms,
      });
      continue;
    }

    stats.parse_ok++;
    stats.by_dialect_detected[parsed.dialect] = (stats.by_dialect_detected[parsed.dialect] ?? 0) + 1;
    if (parsed.dialect === nc.nc_dialect) stats.expected_vs_detected_match++;
    if ((parsed.passes?.length ?? 0) > 0) stats.has_passes++;
    if (parsed.taper?.enabled) stats.has_taper++;
    if (parsed.wire_settings?.has_auto_thread) stats.has_auto_thread++;

    results.push({
      stem: nc.stem,
      nc_path: nc.nc_path,
      nc_ext: nc.nc_ext,
      expected_dialect: nc.nc_dialect,
      ok: true,
      runtime_ms,
      detected_dialect: parsed.dialect,
      dialect_confidence: parsed.dialect_confidence,
      dialect_matches_expected: parsed.dialect === nc.nc_dialect,
      program_number: parsed.program_number,
      program_comment: parsed.program_comment,
      pass_count: parsed.passes?.length ?? 0,
      contour_move_count: parsed.contour_moves?.length ?? 0,
      taper_enabled: parsed.taper?.enabled ?? false,
      has_auto_thread: parsed.wire_settings?.has_auto_thread ?? false,
      has_program_end: parsed.safety?.has_program_end ?? false,
      work_origin: parsed.work_origin,
      line_count: content.split(/\r?\n/).length,
      byte_count: Buffer.byteLength(content, "utf8"),
    });
  }

  const out = {
    schema_version: "1.0.0",
    generated_at: new Date().toISOString(),
    source_index: path.relative(ROOT, INDEX_PATH).replace(/\\/g, "/"),
    runtime_ms_total: Date.now() - t0,
    stats,
    results,
  };

  await fsp.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fsp.writeFile(OUT_PATH, JSON.stringify(out, null, 2) + "\n");

  // One-line summary to stderr (operator-facing).
  console.error(
    `parsed ${stats.parse_ok}/${stats.total} OK · ${stats.parse_failed} failed · ` +
      `dialect detected=${JSON.stringify(stats.by_dialect_detected)} · ` +
      `expected_match=${stats.expected_vs_detected_match}/${stats.parse_ok} · ` +
      `passes=${stats.has_passes} · taper=${stats.has_taper} · ` +
      `auto_thread=${stats.has_auto_thread} · runtime=${out.runtime_ms_total}ms`,
  );
  console.error(`wrote ${path.relative(ROOT, OUT_PATH).replace(/\\/g, "/")}`);
}

main().catch((e) => {
  console.error("FATAL:", e?.stack ?? e?.message ?? e);
  process.exit(1);
});
