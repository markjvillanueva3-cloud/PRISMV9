/**
 * hurco-jmdie-roundtrip.ts — Sidecar TS payload for the tsx-runtime harness.
 *
 * HURCO-VM30I-FULL-PSN-MS0 / U-HURCO-ROUNDTRIP-TSX-SIDECAR (echo iter11 2026-05-24).
 *
 * Sidecar .ts file invoked via `npx tsx scripts/hurco-jmdie-roundtrip.ts` —
 * bypasses BOTH the stale dist/engines/*.js AND the Windows shell:true
 * inline-payload quoting trap from iter10. Imports src/engines/*.ts
 * directly via tsx hot-compile.
 *
 * Reads representative JM Die .hnc files → parses via HurcoParserEngine →
 * re-emits via HurcoV11MillMasterPostEngine.generateProgramWithFullPSN() →
 * writes per-file diff + PSN-enriched report.
 *
 * Usage:
 *   npx tsx H:/prism/scripts/hurco-jmdie-roundtrip.ts
 *   npx tsx H:/prism/scripts/hurco-jmdie-roundtrip.ts --files=file1.hnc,file2.hnc
 */

import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { hurcoParserEngine } from "../mcp-server/src/engines/HurcoParserEngine.js";
import { hurcoV11MillMasterPostEngine } from "../mcp-server/src/engines/HurcoV11MillMasterPostEngine.js";

const HARNESS_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const JM_DIE_PROGRAMS_DIR = "H:/PRISM/JM DIE/HURCO CNC PROGRAMS";
const REPORT_DIR = join(HARNESS_ROOT, "state", "shared");
const REPORT_JSON = join(REPORT_DIR, "hurco-jmdie-roundtrip-tsx-report.json");
const REPORT_MD = join(REPORT_DIR, "hurco-jmdie-roundtrip-tsx-report.md");
const REEMIT_DIR = join(REPORT_DIR, "hurco-jmdie-roundtrip-tsx", "reemit");

const DEFAULT_FILES = ["1001.hnc", "0520396.hnc", "SACMA CUTOFF.hnc"];

interface CliArgs { files: string[] | null }

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { files: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--files=")) args.files = a.slice("--files=".length).split(",").map(s => s.trim()).filter(Boolean);
    else if (a === "--files" && argv[i + 1]) { args.files = argv[++i].split(",").map(s => s.trim()).filter(Boolean); }
  }
  return args;
}

function lineStats(text: string): { line_count: number; byte_count: number } {
  const lines = text.split(/\r?\n/);
  return { line_count: lines.length, byte_count: Buffer.byteLength(text, "utf8") };
}

function firstNLineMatch(a: string, b: string, n = 50): { match_count: number; total_compared: number; match_pct: number } {
  const al = a.split(/\r?\n/);
  const bl = b.split(/\r?\n/);
  const compareN = Math.min(n, al.length, bl.length);
  if (compareN === 0) return { match_count: 0, total_compared: 0, match_pct: 0 };
  let match = 0;
  for (let i = 0; i < compareN; i++) if (al[i] === bl[i]) match++;
  return { match_count: match, total_compared: compareN, match_pct: Math.round((match / compareN) * 1000) / 10 };
}

function programToMillOperations(program: unknown): Array<Record<string, unknown>> {
  const prog = program as { operations?: Array<{ type?: string; tool_number?: number; spindle_rpm?: number; feed_mm_min?: number; coordinates?: Array<{ x?: number; y?: number; z?: number; type?: string }> }> };
  if (!prog?.operations?.length) return [];
  return prog.operations
    .filter(op => (op?.coordinates?.length ?? 0) > 0)
    .map((op, idx) => {
      const tn = typeof op.tool_number === "number" && Number.isFinite(op.tool_number) ? op.tool_number : idx + 1;
      const allowedOps = new Set(["face", "pocket", "contour", "drill", "tap", "bore", "slot", "3d_surface", "adaptive"]);
      const opType = op.type && allowedOps.has(op.type) ? op.type : "contour";
      return {
        operation_type: opType,
        tool_number: tn,
        tool_diameter_mm: 10,
        tool_flutes: 3,
        tool_description: `T${tn}`,
        material_iso: "N",
        spindle_rpm: typeof op.spindle_rpm === "number" && op.spindle_rpm > 0 ? op.spindle_rpm : 5000,
        feed_mm_min: typeof op.feed_mm_min === "number" && op.feed_mm_min > 0 ? op.feed_mm_min : 800,
        axial_depth_mm: 1.0,
        radial_depth_mm: 5,
        coolant: "flood",
        coordinates: (op.coordinates ?? []).map(c => ({
          x: typeof c.x === "number" && Number.isFinite(c.x) ? c.x : 0,
          y: typeof c.y === "number" && Number.isFinite(c.y) ? c.y : 0,
          z: typeof c.z === "number" && Number.isFinite(c.z) ? c.z : 0,
          type: c.type === "rapid" || c.type === "arc_cw" || c.type === "arc_ccw" ? c.type : "linear",
        })),
      };
    });
}

interface RunResult {
  filename: string;
  full_path: string;
  started_at: string;
  finished_at?: string;
  stage: string;
  original_stats?: ReturnType<typeof lineStats>;
  parsed?: Record<string, unknown>;
  reemit_stats?: ReturnType<typeof lineStats>;
  first50_match?: ReturnType<typeof firstNLineMatch>;
  psn_enrichment?: unknown;
  reemit_path?: string;
  reemit_op_count?: number;
  errors: string[];
}

async function runFile(filename: string): Promise<RunResult> {
  const fullPath = join(JM_DIE_PROGRAMS_DIR, filename);
  const result: RunResult = { filename, full_path: fullPath, started_at: new Date().toISOString(), stage: "init", errors: [] };

  try {
    const original = await readFile(fullPath, "utf8");
    result.original_stats = lineStats(original);
    result.stage = "read_ok";

    const program = hurcoParserEngine.parse(original, filename);
    const opsWithCoords = (program.operations ?? []).filter(o => (o?.coordinates?.length ?? 0) > 0).length;
    result.parsed = {
      mode: program.mode,
      program_name: program.program_name,
      operation_count: program.operations?.length ?? 0,
      ops_with_coordinates: opsWithCoords,
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
      result.errors.push(`No recoverable operations from parse (ops_total=${program.operations?.length ?? 0}, ops_with_coords=${opsWithCoords})`);
      result.stage = "no_ops";
      return result;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reemit = await hurcoV11MillMasterPostEngine.generateProgramWithFullPSN(ops as any);
    const reemitText = reemit.gcode.join("\n");
    result.reemit_stats = lineStats(reemitText);
    result.first50_match = firstNLineMatch(original, reemitText, 50);
    result.psn_enrichment = reemit.psn_enrichment ?? null;
    result.reemit_op_count = ops.length;

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

function renderMarkdown(report: Record<string, unknown>): string {
  const r = report as { generated_at: string; source_dir: string; results: RunResult[]; summary: Record<string, number> };
  const lines: string[] = [];
  lines.push("# Hurco V11 ↔ JM Die Roundtrip Report (TSX runtime)");
  lines.push("");
  lines.push(`**Generated:** ${r.generated_at}`);
  lines.push(`**Source dir:** \`${r.source_dir}\``);
  lines.push(`**Runtime:** tsx (src/.ts direct import — bypasses stale dist)`);
  lines.push(`**Files tested:** ${r.results.length}  ·  **Complete:** ${r.summary.complete}  ·  **No-ops:** ${r.summary.no_ops}  ·  **Error:** ${r.summary.error}`);
  lines.push("");
  lines.push("## Per-file results");
  lines.push("");
  lines.push("| File | Stage | Orig lines | Re-emit lines | Ops re-emitted | First-50 match | PSN engaged | Errors |");
  lines.push("|------|-------|------------|---------------|----------------|----------------|-------------|--------|");
  for (const res of r.results) {
    const orig = res.original_stats?.line_count ?? "-";
    const reem = res.reemit_stats?.line_count ?? "-";
    const opc = res.reemit_op_count ?? "-";
    const match = res.first50_match ? `${res.first50_match.match_pct}%` : "-";
    const psn = res.psn_enrichment ? ((res.psn_enrichment as { full_psn_engaged?: boolean }).full_psn_engaged ? "✅" : "⚠ partial") : "-";
    const errs = res.errors.length > 0 ? res.errors.join(" · ").slice(0, 80) : "—";
    lines.push(`| \`${res.filename}\` | ${res.stage} | ${orig} | ${reem} | ${opc} | ${match} | ${psn} | ${errs} |`);
  }
  lines.push("");
  lines.push("## PSN enrichment per file");
  for (const res of r.results) {
    if (!res.psn_enrichment) continue;
    lines.push("");
    lines.push(`### ${res.filename}`);
    const e = res.psn_enrichment as Record<string, { total_minutes?: number; machine_id?: string; total_cost_usd?: number; cycle_min?: number; most_expensive_line_item?: string; count?: number; substrate_errors?: string[] } | string[] | boolean | undefined>;
    const rt = e.runtime_estimate as { total_minutes?: number; machine_id?: string } | undefined;
    if (rt) lines.push(`- **Runtime:** ${rt.total_minutes?.toFixed(2)} min on ${rt.machine_id}`);
    const cr = e.cost_report as { total_cost_usd?: number; cycle_min?: number; most_expensive_line_item?: string } | undefined;
    if (cr) lines.push(`- **Cost:** $${cr.total_cost_usd?.toFixed(2)} (${cr.cycle_min?.toFixed(2)} min · ${cr.most_expensive_line_item})`);
    const opt = e.optimizer_recommendations as { count?: number } | undefined;
    if (opt) lines.push(`- **Optimizer recs:** ${opt.count} total`);
    const ai = e.ai_feature_recommendations as { count?: number } | undefined;
    if (ai) lines.push(`- **AI features:** ${ai.count} recommended`);
    const se = e.substrate_errors as string[] | undefined;
    if (se?.length) lines.push(`- **Substrate errors:** ${se.join(" · ")}`);
    if (res.reemit_path) lines.push(`- **Re-emitted .hnc:** \`${res.reemit_path}\` — load in WinMax to validate`);
  }
  lines.push("");
  lines.push("## Operator next steps");
  lines.push("");
  lines.push("1. For each `.reemit.hnc` above, open in WinMax desktop app");
  lines.push("2. Report load + simulation status (clean / needs-edit / rejected)");
  lines.push("3. Compare predicted cycle (above) vs actual machine cycle");
  lines.push("4. Failures become units in HURCO-POST-REMEDIATION-MS2");
  return lines.join("\n");
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);
  const candidates = args.files ?? DEFAULT_FILES;
  const files: string[] = [];
  for (const f of candidates) {
    try {
      await stat(join(JM_DIE_PROGRAMS_DIR, f));
      files.push(f);
    } catch {
      console.error(`[harness] skip ${f} — not in ${JM_DIE_PROGRAMS_DIR}`);
    }
  }
  if (files.length === 0) {
    console.error("[harness] No files. Pass --files=a.hnc,b.hnc");
    process.exit(1);
  }

  const results: RunResult[] = [];
  for (const f of files) {
    process.stderr.write(`[harness] ${f} ... `);
    const r = await runFile(f);
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
    runtime: "tsx",
    files_requested: candidates,
    files_processed: files,
    summary,
    results,
  };

  await mkdir(REPORT_DIR, { recursive: true });
  await writeFile(REPORT_JSON, JSON.stringify(report, null, 2), "utf8");
  await writeFile(REPORT_MD, renderMarkdown(report), "utf8");
  console.log(`[harness] Report written:\n  ${REPORT_JSON}\n  ${REPORT_MD}`);
  console.log(`[harness] complete=${summary.complete}, no_ops=${summary.no_ops}, error=${summary.error}`);
}

void main().catch(err => {
  console.error("[harness] Fatal:", err);
  process.exit(1);
});
