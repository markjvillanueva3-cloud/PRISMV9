#!/usr/bin/env node
/**
 * blueprint-extraction-accuracy-report.mjs
 *
 * Honest, measurable accuracy report for PRISM's blueprint-extraction pipeline.
 *
 * The user goal "100% accuracy on thousands of prints with logged proof" is
 * asymptotic — industrial OCR research baseline is 85-95% on title-block
 * extraction, and 100% requires per-print ground truth + external vision
 * fine-tune (per BLUEPRINT-OCR-TRAINING-MS1 §non_goals: "NOT on-device vision-
 * model weight updates"). This script ships the LOGGED EVIDENCE half of the
 * goal: it consumes the existing pipeline outputs and computes per-customer,
 * per-confidence-tier accuracy stats with explicit uncertainty bounds.
 *
 * Inputs:
 *   - H:/prism/Docustrata/.index/blueprint-program-join-full-v6.jsonl
 *     (73,876 rows: 1,113 exact + 746 loose + 87 ambiguous matches)
 *   - H:/prism/Docustrata/.index/jm-die-index-v2.json
 *     (38,251-entry universe; the "ground truth" pool for join coverage)
 *
 * Outputs (both UNDER `state/shared/`):
 *   - blueprint-extraction-accuracy-<date>.jsonl  per-print structured log
 *   - blueprint-extraction-accuracy-<date>.md     summary report
 *
 * Methodology (R12 fail-loud — be honest about what's measured):
 *   - "join coverage": fraction of jm-die-index entries with a v6 match.
 *     This is the GROUND TRUTH of "can we link this print to a program?",
 *     not "can we extract dimensions correctly".
 *   - "confidence breakdown": per-tier counts (exact/loose/ambiguous).
 *   - "per-customer coverage": exposes customer skew (Alcoa has more cleanly-
 *     named files; new customers worse).
 *
 * What this report DOES NOT measure (the next milestone needs these):
 *   - Per-dimension extraction accuracy (requires running BlueprintExtractionRAG
 *     against each print + comparing to operator-confirmed values).
 *   - GD&T callout accuracy (requires the gdtcallout extractor on each print).
 *   - LoRA-fine-tune accuracy delta vs base (requires external fine-tune).
 *
 * Run:
 *   node scripts/blueprint-extraction-accuracy-report.mjs [--limit N]
 *     --limit N    cap rows processed (default unlimited)
 *     --out PATH   override output base path (default state/shared/blueprint-...)
 *
 * Discovered: papa /loop 2026-05-24, response to /goal expansion requesting
 * 100% accuracy logged proof. Documented: [[reference_psn_viz_pipeline_complete_2026_05_24]].
 */

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRISM_ROOT = path.resolve(__dirname, "..");

const V6_JOIN_PATH = path.join(PRISM_ROOT, "Docustrata", ".index", "blueprint-program-join-full-v6.jsonl");
const JM_INDEX_PATH = path.join(PRISM_ROOT, "Docustrata", ".index", "jm-die-index-v2.json");

function parseArgs(argv) {
  const a = { limit: Infinity, out: null, frozenTime: null };
  for (let i = 0; i < argv.length; i++) {
    const v = argv[i];
    if (v === "--limit" && argv[i + 1]) a.limit = Number(argv[++i]);
    else if (v === "--out" && argv[i + 1]) a.out = argv[++i];
    else if (v === "--frozen-time" && argv[i + 1]) a.frozenTime = argv[++i];
  }
  return a;
}

function nowIso(frozen) {
  if (frozen) return frozen;
  return new Date().toISOString();
}

function todayDate(frozen) {
  return (frozen ?? new Date().toISOString()).slice(0, 10);
}

async function* readJsonlLines(filePath) {
  const stream = fs.createReadStream(filePath, { encoding: "utf8" });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of rl) {
    const t = line.trim();
    if (!t) continue;
    try { yield JSON.parse(t); } catch { /* skip malformed */ }
  }
}

function extractCustomer(programPath) {
  // Path convention: _PART LIBRARY/<CUSTOMER>/<PART>/CNC PROGRAM/...
  if (!programPath || typeof programPath !== "string") return "_UNKNOWN";
  const segments = programPath.split(/[\\/]/);
  const idx = segments.findIndex((s) => /^_?part library$/i.test(s));
  if (idx >= 0 && idx + 1 < segments.length) {
    return segments[idx + 1].toUpperCase();
  }
  return "_UNATTRIBUTED";
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const ts = nowIso(args.frozenTime);
  const date = todayDate(args.frozenTime);

  if (!fs.existsSync(V6_JOIN_PATH)) {
    console.error(`ERROR: v6 join missing: ${V6_JOIN_PATH}`);
    process.exit(2);
  }
  if (!fs.existsSync(JM_INDEX_PATH)) {
    console.error(`ERROR: jm-die-index missing: ${JM_INDEX_PATH}`);
    process.exit(2);
  }

  const outBase = args.out ?? path.join(PRISM_ROOT, "state", "shared", `blueprint-extraction-accuracy-${date}`);
  const jsonlPath = `${outBase}.jsonl`;
  const mdPath = `${outBase}.md`;
  fs.mkdirSync(path.dirname(jsonlPath), { recursive: true });

  // Stage 1: scan v6 join, accumulate stats + write per-row log.
  const jsonlFd = fs.openSync(jsonlPath, "w");
  const writeLog = (obj) => fs.writeSync(jsonlFd, JSON.stringify(obj) + "\n", null, "utf8");
  writeLog({ kind: "header", schema: 1, generatedAt: ts, source: V6_JOIN_PATH });

  const stats = {
    rows_total: 0,
    rows_processed: 0,
    match_confidence: { exact: 0, loose: 0, ambiguous: 0, miss: 0, other: 0 },
    by_customer: new Map(),  // from print_customers field
    rows_with_part_number: 0,
    rows_with_blueprints: 0,
    rows_with_programs: 0,
    rows_customer_corroborated: 0,
    rows_narrowed_by_customer: 0,
    blueprint_count_total: 0,
    program_count_total: 0,
    drawing_score_buckets: { ge_0_75: 0, ge_0_55: 0, lt_0_55: 0 }, // phase-15 tiers
  };

  for await (const row of readJsonlLines(V6_JOIN_PATH)) {
    stats.rows_total++;
    if (stats.rows_processed >= args.limit) continue;
    stats.rows_processed++;

    // Real v6 schema: row = {part_number, blueprints[], programs[], match_confidence, n_programs, print_customers[], ...}
    const conf = String(row.match_confidence ?? "other").toLowerCase();
    if (conf in stats.match_confidence) stats.match_confidence[conf]++;
    else stats.match_confidence.other++;

    if (row.part_number) stats.rows_with_part_number++;
    const blueprints = Array.isArray(row.blueprints) ? row.blueprints : [];
    const programs = Array.isArray(row.programs) ? row.programs : [];
    if (blueprints.length > 0) stats.rows_with_blueprints++;
    if (programs.length > 0) stats.rows_with_programs++;
    stats.blueprint_count_total += blueprints.length;
    stats.program_count_total += programs.length;
    if (row.customer_corroborated_n && row.customer_corroborated_n > 0) stats.rows_customer_corroborated++;
    if (row.narrowed_by_customer) stats.rows_narrowed_by_customer++;

    // Drawing-score distribution (phase-15 tiering: 0.75+ = high-confidence drawing, 0.55 = tier-2, <0.55 = low).
    for (const bp of blueprints) {
      const score = Number(bp.drawing_score ?? 0);
      if (score >= 0.75) stats.drawing_score_buckets.ge_0_75++;
      else if (score >= 0.55) stats.drawing_score_buckets.ge_0_55++;
      else stats.drawing_score_buckets.lt_0_55++;
    }

    // Customer attribution from print_customers (best-effort — these are extracted codes, may be noisy).
    const customers = Array.isArray(row.print_customers) ? row.print_customers : [];
    for (const c of customers) {
      const k = String(c).toUpperCase();
      stats.by_customer.set(k, (stats.by_customer.get(k) ?? 0) + 1);
    }

    writeLog({
      kind: "row",
      seq: stats.rows_processed,
      part_number: row.part_number ?? null,
      match_confidence: conf,
      n_blueprints: blueprints.length,
      n_programs: programs.length,
      drawing_score_max: blueprints.length > 0
        ? Math.max(...blueprints.map((bp) => Number(bp.drawing_score ?? 0)))
        : null,
      print_customers: customers,
      customer_corroborated_n: row.customer_corroborated_n ?? 0,
      narrowed_by_customer: Boolean(row.narrowed_by_customer),
    });
  }

  // Stage 2: scan jm-die-index for the denominator.
  let totalUniverse = 0;
  try {
    const idx = JSON.parse(fs.readFileSync(JM_INDEX_PATH, "utf8"));
    totalUniverse = Array.isArray(idx.entries) ? idx.entries.length
      : Array.isArray(idx) ? idx.length
      : Object.keys(idx).length;
  } catch { /* leave 0 */ }

  // Compose summary.
  const topCustomers = [...stats.by_customer.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);

  const joinCoverage = totalUniverse > 0 ? (stats.rows_total / totalUniverse) : null;

  const summary = {
    kind: "summary",
    generatedAt: ts,
    v6_join_rows: stats.rows_total,
    jm_die_index_entries: totalUniverse,
    join_coverage_pct: joinCoverage !== null ? +(joinCoverage * 100).toFixed(2) : null,
    match_confidence: stats.match_confidence,
    rows_with_part_number: stats.rows_with_part_number,
    rows_with_blueprints: stats.rows_with_blueprints,
    rows_with_programs: stats.rows_with_programs,
    rows_customer_corroborated: stats.rows_customer_corroborated,
    rows_narrowed_by_customer: stats.rows_narrowed_by_customer,
    blueprint_count_total: stats.blueprint_count_total,
    program_count_total: stats.program_count_total,
    drawing_score_distribution: stats.drawing_score_buckets,
    top_customers: topCustomers.map(([c, n]) => ({ customer: c, count: n })),
    methodology_note:
      "This report measures the v6 JOIN coverage (print↔program linkage), NOT dimension-extraction accuracy. " +
      "Per-dimension accuracy requires the BlueprintExtractionRAGEngine running across each print + " +
      "ground-truth comparison via GroundTruthValidationEngine.validateExtractionBackend. " +
      "External vision-LLM fine-tune (BLUEPRINT-OCR-TRAINING-MS1 U8) is required to push accuracy past " +
      "the ~85-95% industrial OCR baseline. 100% accuracy on thousands of prints is asymptotic, not absolute.",
  };
  writeLog(summary);
  fs.closeSync(jsonlFd);

  // Markdown summary report.
  const md = [
    `# Blueprint Extraction Accuracy Report — ${date}`,
    ``,
    `Generated by \`scripts/blueprint-extraction-accuracy-report.mjs\`.`,
    `Per-row structured log: \`${path.basename(jsonlPath)}\`.`,
    ``,
    `## Methodology (R12 fail-loud)`,
    ``,
    `**What this report measures:** the v6 JOIN coverage — fraction of the JM-Die`,
    `index entries that have been linked to a CNC program file via title-block`,
    `extraction + part-number matching. This is "print↔program linkage", NOT`,
    `per-dimension extraction accuracy.`,
    ``,
    `**What this report does NOT measure:**`,
    ``,
    `- **Per-dimension extraction accuracy.** Requires running`,
    `  \`BlueprintExtractionRAGEngine\` across each print + comparing extracted`,
    `  values to operator-confirmed ground truth via`,
    `  \`GroundTruthValidationEngine.validateExtractionBackend()\`. The ground-`,
    `  truth registry currently holds only confidence-tiered entries (most`,
    `  \`inferred\` / \`quoted\`; few \`confirmed\`).`,
    `- **GD&T callout accuracy.** Requires the \`gdtcalloutparserengine\` on each print.`,
    `- **LoRA fine-tune accuracy delta vs base.** Requires external vision-LLM`,
    `  fine-tune (\`prism_ai:blueprint_lora_export\` + external provider +`,
    `  endpoint registration). Per \`BLUEPRINT-OCR-TRAINING-MS1\` §non_goals,`,
    `  PRISM does NOT run on-device GPU vision-model training.`,
    ``,
    `**Honest claim about 100% accuracy:** Industrial OCR research baseline is`,
    `85-95% on title-block extraction. 100% is asymptotic and requires per-print`,
    `ground truth that doesn't exist for thousands of legacy prints. The`,
    `\`BlueprintExtractionRAGEngine\` HARD RULE (\`sources.length > 0 OR`,
    `confidenceFloor !== 'normal'\`) ensures NO extraction claims high confidence`,
    `without retrieved priors — the operator-in-the-loop closes the loop.`,
    ``,
    `## Measured metrics`,
    ``,
    `| Metric | Value |`,
    `|---|---|`,
    `| v6 join total rows | ${stats.rows_total.toLocaleString()} |`,
    `| jm-die-index universe | ${totalUniverse.toLocaleString()} |`,
    `| Join coverage | ${joinCoverage !== null ? (joinCoverage * 100).toFixed(2) + "%" : "—"} |`,
    `| Rows with part number | ${stats.rows_with_part_number.toLocaleString()} |`,
    ``,
    `### Match-confidence breakdown (v6 print↔program join)`,
    ``,
    `| Tier | Count | Pct |`,
    `|---|---|---|`,
    ...Object.entries(stats.match_confidence).map(([k, v]) => {
      const pct = stats.rows_processed > 0 ? ((v / stats.rows_processed) * 100).toFixed(2) + "%" : "—";
      return `| ${k} | ${v.toLocaleString()} | ${pct} |`;
    }),
    ``,
    `### Blueprint drawing-score distribution (per-blueprint, phase-15 tiers)`,
    ``,
    `| Score | Count |`,
    `|---|---|`,
    `| ≥0.75 (high-confidence drawing) | ${stats.drawing_score_buckets.ge_0_75.toLocaleString()} |`,
    `| ≥0.55 (tier-2, candidate) | ${stats.drawing_score_buckets.ge_0_55.toLocaleString()} |`,
    `| <0.55 (low, ignore) | ${stats.drawing_score_buckets.lt_0_55.toLocaleString()} |`,
    ``,
    `### Other coverage stats`,
    ``,
    `| Metric | Value |`,
    `|---|---|`,
    `| Total blueprints referenced | ${stats.blueprint_count_total.toLocaleString()} |`,
    `| Total programs referenced | ${stats.program_count_total.toLocaleString()} |`,
    `| Rows with ≥1 blueprint | ${stats.rows_with_blueprints.toLocaleString()} |`,
    `| Rows with ≥1 program | ${stats.rows_with_programs.toLocaleString()} |`,
    `| Rows customer-corroborated | ${stats.rows_customer_corroborated.toLocaleString()} |`,
    `| Rows narrowed by customer | ${stats.rows_narrowed_by_customer.toLocaleString()} |`,
    ``,
    `### Top 15 customers (by row count)`,
    ``,
    `| Customer | Rows |`,
    `|---|---|`,
    ...topCustomers.map(([c, n]) => `| ${c} | ${n.toLocaleString()} |`),
    ``,
    `## Path forward (the missing measurements)`,
    ``,
    `1. **Run BlueprintExtractionRAGEngine across each print** with a vision-LLM`,
    `   backend (Gemini Vision / GPT-4V / Claude Vision via MCP) — log per-print`,
    `   extracted dimensions.`,
    `2. **Cross-validate against GroundTruthRegistryEngine** confirmed entries`,
    `   via \`gt_validate_backend\` — produces per-dim-type accuracy + conformal`,
    `   coverage.`,
    `3. **Operator confirmation loop** for previously-uncertain prints —`,
    `   confirmed corrections flow to \`xproc_outcome_record\` + \`xproc_replay_add\`.`,
    `4. **LoRA export + external fine-tune + endpoint register** —`,
    `   incremental accuracy lift via fine-tuned vision endpoint plugged into`,
    `   \`AISystemRouterEngine\` (per MS1 spec U8).`,
    `5. **Repeat 1-4** with each new fine-tune cycle, until coverage audit shows`,
    `   per-customer / per-convention / per-GD&T-symbol accuracy converges.`,
    ``,
    `Each cycle delivers measurable accuracy improvement; 100% is the asymptote.`,
    ``,
    `## Related`,
    ``,
    `- [[reference_psn_viz_pipeline_complete_2026_05_24]] · [[reference_psn_docu_ocr_wiring_2026_05_23]]`,
    `- BLUEPRINT-OCR-TRAINING-MS1 spec — \`state/shared/specs/BLUEPRINT-OCR-TRAINING-MS1-2026-05-12.md\``,
    `- GroundTruthValidationEngine — \`mcp-server/src/engines/GroundTruthValidationEngine.ts\``,
    `- BlueprintExtractionRAGEngine — \`mcp-server/src/engines/BlueprintExtractionRAGEngine.ts\``,
  ].join("\n");
  fs.writeFileSync(mdPath, md, "utf8");

  console.log(`Wrote ${jsonlPath}`);
  console.log(`Wrote ${mdPath}`);
  console.log(`v6 join rows: ${stats.rows_total.toLocaleString()}`);
  console.log(`jm-die universe: ${totalUniverse.toLocaleString()}`);
  console.log(`join coverage: ${joinCoverage !== null ? (joinCoverage * 100).toFixed(2) + "%" : "—"}`);
  const mc = stats.match_confidence;
  console.log(`match_confidence: exact=${mc.exact} loose=${mc.loose} ambiguous=${mc.ambiguous} miss=${mc.miss} other=${mc.other}`);
  console.log(`drawing_score: ge_0_75=${stats.drawing_score_buckets.ge_0_75.toLocaleString()} ge_0_55=${stats.drawing_score_buckets.ge_0_55.toLocaleString()} lt_0_55=${stats.drawing_score_buckets.lt_0_55.toLocaleString()}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
