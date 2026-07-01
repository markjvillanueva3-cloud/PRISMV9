#!/usr/bin/env node
/**
 * wedm-phase-a1-demo.mjs — Phase-A.1: parse→wizard end-to-end on the first
 * verified DXF training pair.
 *
 * Reads the AF102-05 pair from v3 results (the only exact-tier pair with
 * .dxf blueprints — see [[reference_wedm_phase_a_walker_v3_yield_2026_05_22]]),
 * runs DXFGeometryParserEngine.parseDXF() on the first DXF, then feeds the
 * parsed contours into wedmPrintToProgramEngine.generate() with sensible
 * D2 / 12.7mm / Mitsubishi defaults (matching iter-24 demo params).
 *
 * Persists a Phase-A.1 manifest entry to state/shared/wedm-training-corpus/
 * with:
 *   - source paths (blueprint + reference program)
 *   - parser stats (entity_count, contour_count, issues)
 *   - wizard stats (success, stage_count, program_length, runtime_ms)
 *   - the generated G-code (full text — these are tiny ≤1KB files)
 *   - explicit gap note: deviation report requires McxProgramParserEngine
 *     on the .mcx-8 reference before comparison is meaningful.
 *
 * One pair today. Full 148-sweep is Phase-A.2 (gated on McxProgramParserEngine
 * wire to read the .mcx-8 binary as NC text).
 */
import { promises as fsp } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

async function main() {
  const root = path.resolve("H:/prism");
  const resultsPath = path.join(root, "state/shared/wedm-pair-v3-results.json");
  const results = JSON.parse(await fsp.readFile(resultsPath, "utf8"));

  // Find the AF102-05 exact-tier pair — the only verified-real DXF pair
  const pair = results.pairs.find((p) => p.stem === "af102-05" && p.match_tier === "exact");
  if (!pair) {
    console.error("FATAL: af102-05 exact-tier pair not in v3 results");
    process.exit(1);
  }
  const dxfPath = pair.blueprints.find((b) => b.toLowerCase().endsWith(".dxf"));
  const programPath = pair.programs[0];
  if (!dxfPath || !programPath) {
    console.error("FATAL: pair missing dxf or program path");
    process.exit(1);
  }

  console.error(`[phase-a1] pair: ${pair.stem}`);
  console.error(`[phase-a1] dxf:     ${dxfPath}`);
  console.error(`[phase-a1] program: ${programPath}`);

  // Stage 1: parse the DXF
  const t0 = Date.now();
  const { dxfGeometryParserEngine } = await import(
    pathToFileURL(path.join(root, "mcp-server/src/engines/DXFGeometryParserEngine.ts")).href
  );
  const dxfContent = await fsp.readFile(dxfPath, "utf8");
  const parseResult = dxfGeometryParserEngine.parseDXF(dxfContent);
  const parseMs = Date.now() - t0;

  console.error(
    `[phase-a1] parsed in ${parseMs}ms: ${parseResult.contours.length} contours, ${parseResult.entity_count} entities, ${parseResult.issues.length} issues, units=${parseResult.source_units}`,
  );
  // Don't exit on 0 contours — record the gap. AF102-05 hit this with
  // legacy POLYLINE/VERTEX/SEQEND (unsupported by parser today).
  const parseGap = parseResult.contours.length === 0;
  if (parseGap) {
    console.error("[phase-a1] WARNING: 0 contours extracted — parser gap (likely unsupported entity type)");
  }

  // Stage 2: feed contours into the wizard (skip if parse gap)
  let wizardResult;
  let wizardError = null;
  let wizardMs = 0;
  let wizardSkipped = false;
  if (parseGap) {
    wizardSkipped = true;
    console.error("[phase-a1] wizard SKIPPED — no contours to feed");
  } else {
    // Pass through the full WireEDMContour shape — wizard reads bbox,
    // area_mm2, perimeter_mm, is_exterior, is_closed in addition to segments.
    const wizardContours = parseResult.contours.map((c, idx) => ({
      ...c,
      id: c.id || `contour_${idx}`,
      closed: c.is_closed,
    }));

    const t1 = Date.now();
    const { wedmPrintToProgramEngine } = await import(
      pathToFileURL(path.join(root, "mcp-server/src/engines/WEDMPrintToProgramEngine.ts")).href
    );
    try {
      wizardResult = await wedmPrintToProgramEngine.generate({
        material: "D2",
        thickness_mm: 12.7,
        target_ra_um: 1.6,
        wire_type: "brass_cuzn37",
        controller: "mitsubishi",
        contours: wizardContours,
        program_number: 9002,
      });
    } catch (e) {
      wizardError = String(e?.message ?? e);
    }
    wizardMs = Date.now() - t1;
  }

  if (!wizardSkipped) {
    if (wizardError) {
      console.error(`[phase-a1] wizard FAILED in ${wizardMs}ms: ${wizardError}`);
    } else {
      console.error(
        `[phase-a1] wizard ${wizardResult?.success ? "OK" : "FAIL"} in ${wizardMs}ms: ${wizardResult?.program_text?.length ?? 0} chars, ${wizardResult?.stages?.length ?? 0} stages`,
      );
    }
  }

  // Stage 3: persist Phase-A.1 manifest
  const outDir = path.join(root, "state/shared/wedm-training-corpus");
  await fsp.mkdir(outDir, { recursive: true });
  const manifest = {
    schema_version: "1.0.0",
    phase: "A.1",
    pair_stem: pair.stem,
    pair_tier: pair.match_tier,
    pair_confidence: pair.match_confidence,
    blueprint_path: dxfPath,
    reference_program_path: programPath,
    parse: {
      ok: !parseGap,
      gap: parseGap,
      gap_reason: parseGap
        ? "DXFGeometryParserEngine extracted 0 contours — AF102-05 uses legacy AcDb2dPolyline (POLYLINE/VERTEX/SEQEND); parser supports LINE/ARC/CIRCLE/LWPOLYLINE/ELLIPSE/SPLINE only. Fix: add POLYLINE entity support to DXFGeometryParserEngine."
        : null,
      runtime_ms: parseMs,
      entity_count: parseResult.entity_count,
      contour_count: parseResult.contours.length,
      issue_count: parseResult.issues.length,
      source_units: parseResult.source_units,
      issues_sample: parseResult.issues.slice(0, 3),
    },
    wizard: wizardSkipped
      ? { ok: false, skipped: true, skip_reason: "no contours from parse stage" }
      : wizardError
      ? { ok: false, error: wizardError, runtime_ms: wizardMs }
      : {
          ok: !!wizardResult?.success,
          runtime_ms: wizardMs,
          stage_count: wizardResult?.stages?.length ?? 0,
          program_length_chars: wizardResult?.program_text?.length ?? 0,
          program_text: wizardResult?.program_text ?? null,
          stage_names: wizardResult?.stages?.map?.((s) => s.name ?? s.stage ?? "?") ?? [],
        },
    compare: {
      done: false,
      gap_reason:
        "reference is .mcx-8 Mastercam binary; comparison requires McxProgramParserEngine to extract NC text first (Phase-A.2). Also blocked on parse-gap above.",
    },
    generated_at: new Date().toISOString(),
  };

  const manifestPath = path.join(outDir, `${pair.stem}-phase-a1.json`);
  await fsp.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  console.error(`[phase-a1] wrote ${manifestPath}`);

  // Print a one-line summary to stdout for chat use
  process.stdout.write(
    JSON.stringify({
      pair: pair.stem,
      parse_ok: !parseGap,
      parse_gap: parseGap,
      contours: parseResult.contours.length,
      wizard_skipped: wizardSkipped,
      wizard_ok: !wizardSkipped && !wizardError && !!wizardResult?.success,
      wizard_chars: wizardResult?.program_text?.length ?? 0,
      manifest: manifestPath,
    }) + "\n",
  );
}

main().catch((e) => {
  console.error("FATAL:", e?.stack || e?.message || e);
  process.exit(1);
});
