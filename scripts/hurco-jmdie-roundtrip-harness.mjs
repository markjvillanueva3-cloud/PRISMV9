#!/usr/bin/env node
/**
 * hurco-jmdie-roundtrip-harness.mjs — Phase-1 baseline test harness
 *
 * HURCO-VM30I-FULL-PSN-MS0 follow-up (echo iter8 2026-05-24).
 *
 * Picks 3 representative .hnc files from H:/PRISM/JM DIE/HURCO CNC PROGRAMS,
 * parses each via HurcoParserEngine, re-emits via the now-PSN-engaged
 * HurcoV11MillMasterPostEngine.generateProgramWithFullPSN(), diffs the
 * original vs re-emit (line counts + byte sizes + first-N-line similarity)
 * and writes a report to state/shared/hurco-jmdie-roundtrip-report.{json,md}.
 *
 * This is the Phase-1 "are we close" baseline — NOT a pass/fail gate. The
 * operator validates the re-emitted .hnc files in the WinMax desktop app.
 * Failed roundtrips become units in HURCO-POST-REMEDIATION-MS2.
 *
 * Usage: node H:/prism/scripts/hurco-jmdie-roundtrip-harness.mjs
 *        node H:/prism/scripts/hurco-jmdie-roundtrip-harness.mjs --files file1.hnc,file2.hnc
 */

import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HARNESS_ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");
const JM_DIE_PROGRAMS_DIR = "H:/PRISM/JM DIE/HURCO CNC PROGRAMS";
const REPORT_DIR = join(HARNESS_ROOT, "state", "shared");
const REPORT_JSON = join(REPORT_DIR, "hurco-jmdie-roundtrip-report.json");
const REPORT_MD = join(REPORT_DIR, "hurco-jmdie-roundtrip-report.md");
const REEMIT_DIR = join(REPORT_DIR, "hurco-jmdie-roundtrip", "reemit");

// Phase-1 representative sample: small / medium-small / medium (varies size,
// avoids the 780KB+ extremes that would balloon the report). Operator may
// override with --files=a.hnc,b.hnc,c.hnc to pick different programs.
const DEFAULT_FILES = ["1001.hnc", "0520396.hnc", "SACMA CUTOFF.hnc"];

function parseArgs(argv) {
  const args = { files: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--files=")) args.files = a.slice("--files=".length).split(",").map(s => s.trim()).filter(Boolean);
    else if (a === "--files" && argv[i + 1]) { args.files = argv[++i].split(",").map(s => s.trim()).filter(Boolean); }
  }
  return args;
}

function lineStats(text) {
  const lines = text.split(/\r?\n/);
  return { line_count: lines.length, byte_count: Buffer.byteLength(text, "utf8") };
}

/** First-N-line character-by-character match ratio (per-line strict equality). */
function firstNLineMatch(a, b, n = 50) {
  const al = a.split(/\r?\n/);
  const bl = b.split(/\r?\n/);
  const compareN = Math.min(n, al.length, bl.length);
  if (compareN === 0) return { match_count: 0, total_compared: 0, match_pct: 0 };
  let match = 0;
  for (let i = 0; i < compareN; i++) {
    if (al[i] === bl[i]) match++;
  }
  return { match_count: match, total_compared: compareN, match_pct: Math.round((match / compareN) * 1000) / 10 };
}

/**
 * Minimal HurcoProgram → MillOperation[] adapter. Lossy (the parser captures
 * a richer structured view than MillOperation needs); supplies sensible
 * defaults for missing tool / material / depth fields so V11 can re-emit.
 *
 * Returns [] if the parsed program has no recoverable operations.
 */
function programToMillOperations(program) {
  if (!program?.operations?.length) return [];
  return program.operations
    .filter(op => op?.coordinates?.length > 0)
    .map((op, idx) => {
      const tool = op.tool ?? { number: idx + 1, diameter_mm: 10, flutes: 3 };
      return {
        operation_type: "contour", // safest default — V11 accepts it for any path
        tool_number: typeof tool.number === "number" && Number.isFinite(tool.number) ? tool.number : idx + 1,
        tool_diameter_mm: typeof tool.diameter_mm === "number" && tool.diameter_mm > 0 ? tool.diameter_mm : 10,
        tool_flutes: typeof tool.flutes === "number" && tool.flutes > 0 ? tool.flutes : 3,
        tool_description: tool.description ?? `Tool ${idx + 1}`,
        material_iso: "N",
        spindle_rpm: typeof op.spindle_rpm === "number" && op.spindle_rpm > 0 ? op.spindle_rpm : 5000,
        feed_mm_min: typeof op.feed_mm_min === "number" && op.feed_mm_min > 0 ? op.feed_mm_min : 800,
        axial_depth_mm: typeof op.axial_depth_mm === "number" && op.axial_depth_mm > 0 ? op.axial_depth_mm : 1.0,
        radial_depth_mm: typeof op.radial_depth_mm === "number" && op.radial_depth_mm > 0 ? op.radial_depth_mm : 5,
        coolant: "flood",
        coordinates: op.coordinates.map(c => ({
          x: typeof c.x === "number" && Number.isFinite(c.x) ? c.x : 0,
          y: typeof c.y === "number" && Number.isFinite(c.y) ? c.y : 0,
          z: typeof c.z === "number" && Number.isFinite(c.z) ? c.z : 0,
          type: c.type === "rapid" || c.type === "arc_cw" || c.type === "arc_ccw" ? c.type : "linear",
        })),
      };
    });
}

async function loadEngines() {
  // Engines live in the TS source tree; the script runs against compiled output.
  // Resolve through the dist build (so this is callable post `npm run build`).
  const distRoot = join(HARNESS_ROOT, "mcp-server", "dist", "engines");
  const parserMod = await import(`file://${join(distRoot, "HurcoParserEngine.js").replace(/\\/g, "/")}`);
  const postMod = await import(`file://${join(distRoot, "HurcoV11MillMasterPostEngine.js").replace(/\\/g, "/")}`);
  return {
    parser: parserMod.hurcoParserEngine,
    post: postMod.hurcoV11MillMasterPostEngine,
  };
}

async function runFile(filename, { parser, post }) {
  const fullPath = join(JM_DIE_PROGRAMS_DIR, filename);
  const result = {
    filename,
    full_path: fullPath,
    started_at: new Date().toISOString(),
    stage: "init",
    original_stats: null,
    parsed: null,
    reemit_stats: null,
    first50_match: null,
    psn_enrichment: null,
    reemit_path: null,
    errors: [],
  };

  try {
    const original = await readFile(fullPath, "utf8");
    result.original_stats = lineStats(original);
    result.stage = "read_ok";

    const program = parser.parse(original, filename);
    result.parsed = {
      mode: program.mode,
      program_name: program.program_name,
      operation_count: program.operations?.length ?? 0,
      tool_section_count: program.toolSections?.length ?? 0,
      hasConversational: program.hasConversational,
      hasGCode: program.hasGCode,
      hasProbing: program.hasProbing,
      hasRotaryAxis: program.hasRotaryAxis,
      safety: program.safety,
    };
    result.stage = "parse_ok";

    const ops = programToMillOperations(program);
    if (ops.length === 0) {
      result.errors.push("No recoverable operations from parse — skipping re-emit");
      result.stage = "no_ops";
      return result;
    }

    const reemit = await post.generateProgramWithFullPSN(ops);
    const reemitText = reemit.gcode.join("\n");
    result.reemit_stats = lineStats(reemitText);
    result.first50_match = firstNLineMatch(original, reemitText, 50);
    result.psn_enrichment = reemit.psn_enrichment ?? null;
    result.stage = "reemit_ok";

    // Write re-emitted .hnc for operator to load in WinMax
    await mkdir(REEMIT_DIR, { recursive: true });
    const reemitName = filename.replace(/\.hnc$/i, "") + ".reemit.hnc";
    const reemitPath = join(REEMIT_DIR, reemitName);
    await writeFile(reemitPath, reemitText, "utf8");
    result.reemit_path = reemitPath;
    result.stage = "complete";
  } catch (err) {
    result.errors.push(err instanceof Error ? err.message : String(err));
    result.stage = "error";
  }

  result.finished_at = new Date().toISOString();
  return result;
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Hurco V11 ↔ JM Die Roundtrip Report");
  lines.push("");
  lines.push(`**Generated:** ${report.generated_at}`);
  lines.push(`**Source dir:** \`${report.source_dir}\``);
  lines.push(`**V11 method:** \`generateProgramWithFullPSN()\` (HURCO-VM30I-FULL-PSN-MS0)`);
  lines.push(`**Files tested:** ${report.results.length}  ·  **Complete:** ${report.summary.complete}  ·  **Error:** ${report.summary.error}`);
  lines.push("");
  lines.push("## Per-file results");
  lines.push("");
  lines.push("| File | Stage | Orig lines | Re-emit lines | First-50 match | PSN engaged | Errors |");
  lines.push("|------|-------|------------|---------------|----------------|-------------|--------|");
  for (const r of report.results) {
    const orig = r.original_stats?.line_count ?? "-";
    const reemit = r.reemit_stats?.line_count ?? "-";
    const match = r.first50_match ? `${r.first50_match.match_pct}% (${r.first50_match.match_count}/${r.first50_match.total_compared})` : "-";
    const psn = r.psn_enrichment ? (r.psn_enrichment.full_psn_engaged ? "✅" : "⚠ partial") : "-";
    const errs = r.errors.length > 0 ? r.errors.join(" · ").slice(0, 60) : "—";
    lines.push(`| \`${r.filename}\` | ${r.stage} | ${orig} | ${reemit} | ${match} | ${psn} | ${errs} |`);
  }
  lines.push("");
  lines.push("## PSN enrichment details (per file)");
  for (const r of report.results) {
    if (!r.psn_enrichment) continue;
    lines.push("");
    lines.push(`### ${r.filename}`);
    const e = r.psn_enrichment;
    if (e.runtime_estimate) lines.push(`- **Runtime:** ${e.runtime_estimate.total_minutes.toFixed(2)} min on ${e.runtime_estimate.machine_id} (conf ${e.runtime_estimate.confidence.toFixed(2)})`);
    if (e.cost_report) lines.push(`- **Cost:** $${e.cost_report.total_cost_usd.toFixed(2)} (${e.cost_report.cycle_min.toFixed(2)} min · ${e.cost_report.most_expensive_line_item})`);
    if (e.optimizer_recommendations) lines.push(`- **Optimizer recs:** ${e.optimizer_recommendations.count} total, top: ${(e.optimizer_recommendations.top_3 ?? []).map(t => t.category).join(", ") || "none"}`);
    if (e.ai_feature_recommendations) lines.push(`- **AI features:** ${e.ai_feature_recommendations.count} recommended`);
    if (e.substrate_errors?.length) lines.push(`- **Substrate errors:** ${e.substrate_errors.join(" · ")}`);
    if (r.reemit_path) lines.push(`- **Re-emitted .hnc:** \`${r.reemit_path}\` (load in WinMax to validate)`);
  }
  lines.push("");
  lines.push("## Next steps for operator");
  lines.push("");
  lines.push("1. Load each `reemit.hnc` file in your WinMax desktop app");
  lines.push("2. Note whether the program loads without edits + simulates cleanly");
  lines.push("3. Compare predicted-vs-actual cycle time on the real machine (target ≤5% error)");
  lines.push("4. File each failure as a unit in HURCO-POST-REMEDIATION-MS2");
  return lines.join("\n");
}

async function main() {
  const args = parseArgs(process.argv);
  const candidateFiles = args.files ?? DEFAULT_FILES;
  const files = [];
  for (const f of candidateFiles) {
    try {
      await stat(join(JM_DIE_PROGRAMS_DIR, f));
      files.push(f);
    } catch {
      console.error(`[harness] Skipping ${f} — not found in ${JM_DIE_PROGRAMS_DIR}`);
    }
  }
  if (files.length === 0) {
    console.error("[harness] No files to test. Pass --files=a.hnc,b.hnc or ensure default set exists in JM Die dir.");
    process.exit(1);
  }
  const engines = await loadEngines();
  const results = [];
  for (const f of files) {
    process.stderr.write(`[harness] Processing ${f} ... `);
    const r = await runFile(f, engines);
    process.stderr.write(`${r.stage}\n`);
    results.push(r);
  }
  const summary = {
    complete: results.filter(r => r.stage === "complete").length,
    error: results.filter(r => r.stage === "error" || r.errors.length > 0).length,
    no_ops: results.filter(r => r.stage === "no_ops").length,
  };
  const report = {
    generated_at: new Date().toISOString(),
    source_dir: JM_DIE_PROGRAMS_DIR,
    files_requested: candidateFiles,
    files_processed: files,
    summary,
    results,
  };
  await mkdir(REPORT_DIR, { recursive: true });
  await writeFile(REPORT_JSON, JSON.stringify(report, null, 2), "utf8");
  await writeFile(REPORT_MD, renderMarkdown(report), "utf8");
  console.log(`[harness] Report written:\n  ${REPORT_JSON}\n  ${REPORT_MD}`);
}

main().catch(err => {
  console.error("[harness] Fatal:", err);
  process.exit(1);
});
