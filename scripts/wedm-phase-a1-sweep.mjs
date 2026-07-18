#!/usr/bin/env node
/**
 * wedm-phase-a1-sweep.mjs — run Phase-A.1 across all 98 v4 high-conf pairs.
 *
 * Reads state/shared/wedm-pair-v4-results.json (the canonical 98-pair
 * training corpus), iterates each pair:
 *
 *   - If the pair has at least one .dxf blueprint → run DXFGeometryParserEngine
 *     + wedmPrintToProgramEngine, emit a full Phase-A.1 manifest.
 *   - If the pair is PDF-only → emit a gap manifest with reason
 *     "blueprint is PDF-scan, awaiting BlueprintVisionOCR (Phase-A.3)".
 *   - If parsing or the wizard fails → emit a partial manifest with the
 *     specific failure point recorded.
 *
 * One manifest per pair → state/shared/wedm-training-corpus/<stem>-phase-a1.json.
 * One sweep summary → state/shared/wedm-training-corpus/_sweep-summary.json.
 *
 * Flags:
 *   --limit <N>       cap pairs (debugging)
 *   --only-dxf        skip PDF-only pairs entirely
 *   --quiet           suppress per-pair stderr
 */
import { promises as fsp } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

async function main(argv) {
  const opts = { limit: Infinity, onlyDxf: false, quiet: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--limit") opts.limit = Number(argv[++i]);
    else if (argv[i] === "--only-dxf") opts.onlyDxf = true;
    else if (argv[i] === "--quiet") opts.quiet = true;
    else if (argv[i] === "--help" || argv[i] === "-h") {
      console.error("usage: node wedm-phase-a1-sweep.mjs [--limit N] [--only-dxf] [--quiet]");
      process.exit(0);
    }
  }

  const root = path.resolve("H:/prism");
  const results = JSON.parse(
    await fsp.readFile(path.join(root, "state/shared/wedm-pair-v4-results.json"), "utf8"),
  );
  const allPairs = results.pairs;
  let pairs = allPairs;
  if (opts.onlyDxf) {
    pairs = pairs.filter((p) => p.blueprints.some((b) => b.toLowerCase().endsWith(".dxf")));
  }
  pairs = pairs.slice(0, opts.limit);

  const outDir = path.join(root, "state/shared/wedm-training-corpus");
  await fsp.mkdir(outDir, { recursive: true });

  // Lazy-load engines once (avoid per-pair re-import cost).
  // Engines are .ts and must be invoked under tsx (the prior iter-34 sweep
  // ran this way — `mcp-server/node_modules/.bin/tsx scripts/wedm-phase-a1-sweep.mjs`).
  // Plain `node` (v22) will throw ERR_UNKNOWN_FILE_EXTENSION on .ts; the script
  // surfaces a clear error if launched without tsx so the operator knows to
  // re-invoke correctly. The dist/ fallback was tried but found stale (#1, see
  // src/engines/DXFGeometryParserEngine.ts iter-32/33 fixes that aren't in dist
  // until next full `npm run build`).
  const dxfMod = await import(
    pathToFileURL(path.join(root, "mcp-server/src/engines/DXFGeometryParserEngine.ts")).href
  );
  const wizMod = await import(
    pathToFileURL(path.join(root, "mcp-server/src/engines/WEDMPrintToProgramEngine.ts")).href
  );
  // U-MCX-METADATA-WIRE (iter35): also parse .mcx-* references for metadata.
  // McxProgramParserEngine deliberately stops at metadata (machine hint,
  // embedded tool/post/material runs, format/version) — full toolpath
  // extraction from the proprietary binary needs Mastercam SDK / NETHOOK.
  // Metadata still has real value: tool callouts + post-processor identity
  // + material tokens cross-validate the wizard output even without an NC diff.
  const mcxMod = await import(
    pathToFileURL(path.join(root, "mcp-server/src/engines/McxProgramParserEngine.ts")).href
  );
  const MCX_EXTS = new Set([".mcx", ".mcx-8", ".mcx-9", ".mcam"]);
  const isMcxRef = (p) => p && MCX_EXTS.has(path.extname(p).toLowerCase());

  const stats = {
    pairs_total: pairs.length,
    pdf_only_gap: 0,
    dxf_parse_ok: 0,
    dxf_parse_failed: 0,
    wizard_ok: 0,
    wizard_failed: 0,
    mcx_parse_ok: 0,
    mcx_parse_failed: 0,
    mcx_no_program: 0,
    runtime_ms_total: 0,
  };

  const t_sweep_start = Date.now();
  for (const pair of pairs) {
    const dxfPaths = pair.blueprints.filter((b) => b.toLowerCase().endsWith(".dxf"));
    const program = pair.programs[0] || null;

    const manifest = {
      schema_version: "1.1.0",
      phase: "A.1",
      pair_stem: pair.stem,
      pair_tier: pair.match_tier,
      pair_confidence: pair.match_confidence,
      blueprint_paths: pair.blueprints,
      reference_program_path: program,
      generated_at: new Date().toISOString(),
    };

    // U-MCX-METADATA-WIRE: extract metadata from .mcx-* reference (independent
    // of DXF availability — even PDF-only pairs get metadata if the reference
    // is binary Mastercam). Never throws; failure is recorded structurally.
    if (!program) {
      stats.mcx_no_program++;
      manifest.reference_metadata = { ok: false, skipped: true, skip_reason: "pair has no reference program" };
    } else if (!isMcxRef(program)) {
      manifest.reference_metadata = {
        ok: false,
        skipped: true,
        skip_reason: `reference is not Mastercam binary (extension ${path.extname(program) || "<none>"}); skipping`,
      };
    } else {
      const t_mcx_start = Date.now();
      let mcxResult, mcxErr = null;
      try {
        mcxResult = mcxMod.mcxProgramParserEngine
          ? mcxMod.mcxProgramParserEngine.parseFile(program)
          : new mcxMod.McxProgramParserEngine().parseFile(program);
      } catch (e) {
        // Defensive — engine docstring says "never throws," but we wrap anyway
        // because a buggy patch elsewhere shouldn't kill the whole 98-pair sweep.
        mcxErr = String(e?.message ?? e);
      }
      const mcxMs = Date.now() - t_mcx_start;
      if (mcxErr || !mcxResult) {
        stats.mcx_parse_failed++;
        manifest.reference_metadata = { ok: false, error: mcxErr ?? "no result", runtime_ms: mcxMs };
      } else {
        // The engine's parse_ok flag is the canonical success signal.
        if (mcxResult.parse_ok) stats.mcx_parse_ok++;
        else stats.mcx_parse_failed++;
        manifest.reference_metadata = {
          ok: mcxResult.parse_ok,
          runtime_ms: mcxMs,
          format: mcxResult.format,
          version: mcxResult.version,
          bytes_total: mcxResult.bytes_total,
          bytes_scanned: mcxResult.bytes_scanned,
          oversized: mcxResult.oversized,
          magic_verified: mcxResult.magic_verified,
          machine_hints: mcxResult.machine_hints,
          tool_labels: mcxResult.tool_labels.slice(0, 20),
          tool_label_count: mcxResult.tool_labels.length,
          post_processor_hints: mcxResult.post_processor_hints,
          material_hints: mcxResult.material_hints,
          zlib_chunks: mcxResult.zlib_chunks,
          estimated_operations: mcxResult.estimated_operations,
          embedded_string_count: mcxResult.embedded_strings.length,
          warnings: mcxResult.warnings,
          errors: mcxResult.errors,
        };
      }
    }

    if (dxfPaths.length === 0) {
      // PDF-only — Phase-A.3 gap
      manifest.parse = {
        ok: false,
        gap: true,
        gap_reason:
          "blueprint set has no .dxf — only PDF/STEP/IGES variants present. Awaits BlueprintVisionOCR for Phase-A.3 (PDF) or opencascade.js for STEP/IGES.",
      };
      manifest.wizard = { ok: false, skipped: true, skip_reason: "no DXF blueprint to parse" };
      manifest.compare = { done: false, gap_reason: "wizard skipped" };
      stats.pdf_only_gap++;
    } else {
      const dxfPath = dxfPaths[0];
      let parseResult, parseErr = null;
      const t_parse_start = Date.now();
      try {
        const content = await fsp.readFile(dxfPath, "utf8");
        parseResult = dxfMod.dxfGeometryParserEngine.parseDXF(content);
      } catch (e) {
        parseErr = String(e?.message ?? e);
      }
      const parseMs = Date.now() - t_parse_start;

      manifest.parse = parseErr
        ? { ok: false, error: parseErr, runtime_ms: parseMs }
        : {
            ok: parseResult.contours.length > 0,
            runtime_ms: parseMs,
            entity_count: parseResult.entity_count,
            contour_count: parseResult.contours.length,
            issue_count: parseResult.issues.length,
            source_units: parseResult.source_units,
            issues_sample: parseResult.issues.slice(0, 3),
            gap: parseResult.contours.length === 0,
            gap_reason: parseResult.contours.length === 0
              ? "DXF parsed but extracted 0 contours (likely entity types beyond supported set or open-contour artifacts)"
              : null,
          };

      if (parseErr || !parseResult || parseResult.contours.length === 0) {
        stats.dxf_parse_failed++;
        manifest.wizard = { ok: false, skipped: true, skip_reason: "no contours to feed" };
        manifest.compare = { done: false, gap_reason: "wizard skipped" };
      } else {
        stats.dxf_parse_ok++;
        const contours = parseResult.contours.map((c, idx) => ({
          ...c,
          id: c.id || `contour_${idx}`,
          closed: c.is_closed,
        }));
        const t_wiz_start = Date.now();
        let wizardResult, wizardError = null;
        try {
          wizardResult = await wizMod.wedmPrintToProgramEngine.generate({
            material: "D2",
            thickness_mm: 12.7,
            target_ra_um: 1.6,
            wire_type: "brass_cuzn37",
            controller: "mitsubishi",
            contours,
            program_number: 9000 + (stats.dxf_parse_ok % 1000),
          });
        } catch (e) {
          wizardError = String(e?.message ?? e);
        }
        const wizMs = Date.now() - t_wiz_start;
        manifest.wizard = wizardError
          ? { ok: false, error: wizardError, runtime_ms: wizMs }
          : {
              ok: !!wizardResult?.success,
              runtime_ms: wizMs,
              stage_count: wizardResult?.stages?.length ?? 0,
              program_length_chars: wizardResult?.program_text?.length ?? 0,
              program_text: wizardResult?.program_text ?? null,
              stage_names: wizardResult?.stages?.map?.((s) => s.name ?? s.stage ?? "?") ?? [],
            };
        if (manifest.wizard.ok) stats.wizard_ok++;
        else stats.wizard_failed++;
        // R12 fail-loud: McxProgramParserEngine is now wired (see reference_metadata
        // above) — it deliberately stops at metadata because the .mcx-* container
        // is proprietary. Full toolpath comparison needs either (a) sibling posted
        // .nc/.eia/.txt next to the .mcx-* (none found in any inspected pair so
        // far), or (b) Mastercam SDK / NETHOOK at runtime. Tracked as
        // U-WEDM-POSTED-NC-INDEX (Phase-A.2 follow-up).
        manifest.compare = {
          done: false,
          gap_reason:
            "reference is proprietary Mastercam binary (.mcx-*); McxProgramParserEngine extracted reference_metadata but cannot recover full NC text. Real deviation report needs a sibling posted-NC harvest (Phase-A.2 / U-WEDM-POSTED-NC-INDEX) or Mastercam SDK access.",
        };
      }
    }

    const manifestPath = path.join(outDir, `${pair.stem}-phase-a1.json`);
    await fsp.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
    if (!opts.quiet) {
      const tag = manifest.parse?.ok && manifest.wizard?.ok
        ? "OK     "
        : manifest.parse?.gap
        ? "GAP-PDF"
        : "PARTIAL";
      console.error(`[${tag}] ${pair.stem.padEnd(40)} → ${path.relative(root, manifestPath)}`);
    }
  }
  stats.runtime_ms_total = Date.now() - t_sweep_start;

  const summary = {
    schema_version: "1.0.0",
    phase: "A.1-sweep",
    source: "state/shared/wedm-pair-v4-results.json",
    swept_at: new Date().toISOString(),
    options: opts,
    stats,
  };
  const summaryPath = path.join(outDir, "_sweep-summary.json");
  await fsp.writeFile(summaryPath, JSON.stringify(summary, null, 2) + "\n");

  console.error(
    `\nsweep complete in ${stats.runtime_ms_total}ms — ` +
      `${stats.pairs_total} pairs · pdf_only_gap=${stats.pdf_only_gap} · ` +
      `dxf_parse_ok=${stats.dxf_parse_ok} · dxf_parse_failed=${stats.dxf_parse_failed} · ` +
      `wizard_ok=${stats.wizard_ok} · wizard_failed=${stats.wizard_failed} · ` +
      `mcx_parse_ok=${stats.mcx_parse_ok} · mcx_parse_failed=${stats.mcx_parse_failed} · ` +
      `mcx_no_program=${stats.mcx_no_program}`,
  );
  console.error(`summary: ${summaryPath}`);
}

main(process.argv.slice(2)).catch((e) => { console.error("FATAL:", e?.stack ?? e?.message ?? e); process.exit(1); });
