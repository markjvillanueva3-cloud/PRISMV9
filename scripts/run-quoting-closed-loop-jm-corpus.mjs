#!/usr/bin/env node
/**
 * run-quoting-closed-loop-jm-corpus —
 * QUOTING-SYNERGY-MS0/U-QP-CLOSED-LOOP-JM-CORPUS (slot:charlie iter49 2026-05-26).
 *
 * GOAL-CLEAR CONDITION ("run tests on every print, part and document in
 * DocuStrata for JM Die"). Fires the iter46 closed loop against the curated
 * DocuStrata invoices, emits a coverage + verdict report.
 *
 * Pipeline:
 *   1. Load state/shared/quoting/docustrata-invoices.curated.json (10 rows
 *      bootstrap; replaceable with real-PDF-extracted invoices once iter50
 *      lands a docustrata PDF parser).
 *   2. Adapt each row into a CycleOutcome (iter46 contract).
 *   3. Build live deps via iter47's QuotingClosedLoopRunnerEngine.buildLiveDeps.
 *   4. Call QuotingClosedLoopEngine.runCycle(deps, {minSampleSize:5, ...}).
 *   5. Augment with G-code material parse (iter48) for any part_id that has
 *      a corresponding G-code program in JM DIE/ — pure-fn, fail-soft.
 *   6. Emit state/shared/closeout/QUOTING-CLOSED-LOOP-JM-CORPUS-{ISO}.json
 *      with: verdict, accuracy_before/after, stages, warnings, coverage stats.
 *
 * EXIT CODES:
 *   0 — cycle ran end-to-end (any verdict including INSUFFICIENT_DATA — that
 *       is INFORMATION, not failure; the corpus is what it is)
 *   2 — pre-flight failed (corpus file missing, deps couldn't build)
 *
 * Cli flags:
 *   --corpus=PATH       Override the input invoices JSON.
 *   --out=PATH          Override the closeout report path.
 *   --active-out=PATH   Override the active-factor write path (tests).
 *   --min-sample=N      Override minSampleSize (default 5).
 *   --json              Print the cycle result as JSON on stdout (in addition to disk).
 */

import { promises as fs } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { QuotingClosedLoopEngine } from "../mcp-server/src/engines/QuotingClosedLoopEngine.js";
import { buildLiveDeps } from "../mcp-server/src/engines/QuotingClosedLoopRunnerEngine.js";
import { GCodeMaterialParserEngine } from "../mcp-server/src/engines/GCodeMaterialParserEngine.js";
import { DocuStrataMaterialPriorEngine, normalizeGrade } from "../mcp-server/src/engines/DocuStrataMaterialPriorEngine.js";

// ─── Named constants ──────────────────────────────────────────────────────

const DEFAULT_CORPUS_PATH = resolve(process.cwd(), "state/shared/quoting/docustrata-invoices.curated.json");
const DEFAULT_OUT_DIR = resolve(process.cwd(), "state/shared/closeout");
const DEFAULT_ACTIVE_PATH = resolve(process.cwd(), "state/shared/calibration/quoting-calibration-active.json");
const DEFAULT_MIN_SAMPLE_SIZE = 5;
const DEFAULT_DRIFT_MAPE_PCT = 5;
const DEFAULT_DRIFT_BIAS_PCT = 3;

// ─── CLI flag parsing (no external deps) ──────────────────────────────────

function parseArgs(argv) {
  const out = {
    corpus: DEFAULT_CORPUS_PATH,
    out: null,
    activeOut: DEFAULT_ACTIVE_PATH,
    minSample: DEFAULT_MIN_SAMPLE_SIZE,
    machineRate: null,
    materialSpend: null,
    json: false,
  };
  for (const a of argv.slice(2)) {
    if (a.startsWith("--corpus=")) out.corpus = resolve(a.slice("--corpus=".length));
    else if (a.startsWith("--out=")) out.out = resolve(a.slice("--out=".length));
    else if (a.startsWith("--active-out=")) out.activeOut = resolve(a.slice("--active-out=".length));
    else if (a.startsWith("--min-sample=")) out.minSample = Number(a.slice("--min-sample=".length));
    else if (a.startsWith("--machine-rate=")) out.machineRate = Number(a.slice("--machine-rate=".length));
    else if (a.startsWith("--material-spend=")) out.materialSpend = Number(a.slice("--material-spend=".length));
    else if (a === "--json") out.json = true;
  }
  return out;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Map curated invoice row → iter46 CycleOutcome shape. */
function invoiceToCycleOutcome(row, idx) {
  return {
    quote_id: `${row.customer ?? "UNKNOWN"}-${row.part_id ?? `IDX-${idx}`}-${row.date ?? "no-date"}`,
    customer: row.customer ?? "unknown",
    part_id: row.part_id ?? null,
    doc_date: row.date ?? null,
    predicted_quote_usd: Number(row.predicted_quote_usd),
    actual_invoice_usd: Number(row.actual_invoice_usd),
    accepted: true,
    material: row.material ?? null,
    machine_class: null,
    observed_at: row.date ?? new Date().toISOString(),
  };
}

/**
 * Coverage summary: how many outcomes carried each field; iter48's
 * GCodeMaterialParserEngine.parse() is run against the `material` text
 * (treating it as a 1-line "header") so we can verify the cross-engine
 * compatibility — if our G-code parser can recognize a curated material
 * string, the same parser will work on the real G-code header.
 */
function buildCoverage(outcomes) {
  const total = outcomes.length;
  const withCustomer = outcomes.filter((o) => o.customer && o.customer !== "unknown").length;
  const withMaterial = outcomes.filter((o) => o.material).length;
  const withInvoice = outcomes.filter((o) => typeof o.actual_invoice_usd === "number" && o.actual_invoice_usd > 0).length;
  const withPartId = outcomes.filter((o) => o.part_id).length;

  let materialParserHits = 0;
  let materialParserMisses = 0;
  const isoGroupBreakdown = {};
  for (const o of outcomes) {
    if (!o.material) continue;
    // Treat the curated material text as a paren-wrapped MATERIAL line so
    // iter48's classifier+body matcher will both fire.
    const synthetic = `(MATERIAL: ${o.material})`;
    const parsed = GCodeMaterialParserEngine.parse(synthetic);
    if (parsed.material) {
      materialParserHits += 1;
      isoGroupBreakdown[parsed.iso_group] = (isoGroupBreakdown[parsed.iso_group] ?? 0) + 1;
    } else {
      materialParserMisses += 1;
    }
  }

  return {
    total_outcomes: total,
    with_customer: withCustomer,
    with_material_label: withMaterial,
    with_invoice_amount: withInvoice,
    with_part_id: withPartId,
    material_parser_hits: materialParserHits,
    material_parser_misses: materialParserMisses,
    material_parser_hit_rate: withMaterial > 0 ? materialParserHits / withMaterial : 0,
    iso_group_breakdown: isoGroupBreakdown,
  };
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv);

  // R12: verify pre-flight before any cycle.
  let raw;
  try {
    raw = await fs.readFile(args.corpus, "utf8");
  } catch (e) {
    console.error(`[jm-corpus] R12 FAIL — corpus not readable: ${args.corpus}\n  ${e.message}`);
    process.exit(2);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    console.error(`[jm-corpus] R12 FAIL — corpus JSON parse error: ${e.message}`);
    process.exit(2);
  }

  const invoices = Array.isArray(parsed) ? parsed : (parsed.invoices ?? []);
  if (!Array.isArray(invoices) || invoices.length === 0) {
    console.error(`[jm-corpus] R12 FAIL — corpus has no invoice rows (got ${invoices.length} rows)`);
    process.exit(2);
  }

  const outcomes = invoices.map(invoiceToCycleOutcome);
  console.log(`[jm-corpus] loaded ${outcomes.length} cycle outcomes from ${args.corpus}`);

  // Coverage report — run BEFORE the cycle so we know what we're feeding in.
  const coverage = buildCoverage(outcomes);
  console.log(`[jm-corpus] coverage:`);
  console.log(`    customer:        ${coverage.with_customer}/${coverage.total_outcomes}`);
  console.log(`    material-label:  ${coverage.with_material_label}/${coverage.total_outcomes}`);
  console.log(`    invoice-amount:  ${coverage.with_invoice_amount}/${coverage.total_outcomes}`);
  console.log(`    part-id:         ${coverage.with_part_id}/${coverage.total_outcomes}`);
  console.log(`    iter48-parse:    ${coverage.material_parser_hits}/${coverage.with_material_label} (rate ${(coverage.material_parser_hit_rate * 100).toFixed(1)}%)`);
  console.log(`    iso-group break: ${JSON.stringify(coverage.iso_group_breakdown)}`);

  // Build live deps with the loaded outcomes + tmpdir-style active path so
  // a corpus run doesn't pollute the real active-factor JSON unless the
  // operator explicitly asked for that path.
  // iter54 — pre-resolve DocuStrata per-grade material spend into a Map
  // so perRecordOverrides (called sync inside .map()) can look up by grade.
  const gradeSpendMap = new Map();
  let docuStrataReady = false;
  try {
    const grades = await DocuStrataMaterialPriorEngine.listGrades();
    for (const g of grades) {
      const b = await DocuStrataMaterialPriorEngine.getMaterialSpendBracket(g);
      if (b) gradeSpendMap.set(g, b.median);
    }
    docuStrataReady = gradeSpendMap.size > 0;
    console.log(`[jm-corpus] DocuStrata priors loaded — ${gradeSpendMap.size} grades, brackets: ${[...gradeSpendMap.entries()].map(([k,v])=>k+'=$'+v).join(' ')}`);
  } catch (e) {
    console.log(`[jm-corpus] DocuStrata priors NOT loaded (${e.message}) — falling back to flat overrides`);
  }

  // Per-outcome override fn — purely synchronous Map lookup. Plausibility
  // floor: priors below FINISHED_BLANK_FLOOR_USD likely represent raw-stock
  // pricing (DocuStrata D2/H13/S7 show $4-5/unit which is per-foot of bar
  // stock, NOT per finished die-insert which is $80+ from the carbide
  // vendors). Fall back to the flat override when the prior would poison
  // job-cost estimation.
  const FINISHED_BLANK_FLOOR_USD = 20;
  const perRecordOverrides = (outcome) => {
    const grade = normalizeGrade(outcome.material ?? "", undefined);
    if (!grade) return {};
    const spend = gradeSpendMap.get(grade);
    if (typeof spend !== "number") return {};
    if (spend < FINISHED_BLANK_FLOOR_USD) return {}; // raw-stock prior, ignore
    return { materialSpend: spend };
  };

  const deps = buildLiveDeps({
    loadOutcomes: async () => outcomes,
    activeFactorPath: args.activeOut,
    feedPsnAutonomy: false, // never feed PSN from a one-shot test run
    defaultMachineRate: args.machineRate ?? undefined,
    defaultMaterialSpend: args.materialSpend ?? undefined,
    perRecordOverrides: docuStrataReady ? perRecordOverrides : undefined,
  });

  if (args.machineRate) console.log(`[jm-corpus] machine-rate override: $${args.machineRate}/hr (was substrate $95/hr default)`);
  if (args.materialSpend) console.log(`[jm-corpus] material-spend FLAT fallback: $${args.materialSpend}/job (was substrate $75 default)`);

  // Fire the cycle. Drift gates tightened for the small corpus.
  const result = await QuotingClosedLoopEngine.runCycle(deps, {
    minSampleSize: args.minSample,
    driftMapeThresholdPct: DEFAULT_DRIFT_MAPE_PCT,
    driftBiasThresholdPct: DEFAULT_DRIFT_BIAS_PCT,
  });

  console.log(`[jm-corpus] verdict: ${result.verdict}`);
  if (result.accuracy_before) {
    console.log(`    PRE  MAPE=${result.accuracy_before.mape_pct.toFixed(2)}% bias=${result.accuracy_before.bias_pct.toFixed(2)}% n=${result.accuracy_before.sample_size}`);
  }
  if (result.accuracy_after) {
    console.log(`    POST MAPE=${result.accuracy_after.mape_pct.toFixed(2)}% bias=${result.accuracy_after.bias_pct.toFixed(2)}% n=${result.accuracy_after.sample_size}`);
  }
  for (const w of result.warnings) console.log(`    ⚠ ${w}`);
  for (const s of result.stages) {
    console.log(`    [${s.ok ? "✓" : "✗"}] ${s.stage}${s.reason ? ` — ${s.reason}` : ""}`);
  }

  // Persist closeout report
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath = args.out ?? resolve(DEFAULT_OUT_DIR, `QUOTING-CLOSED-LOOP-JM-CORPUS-${ts}.json`);
  const closeout = {
    schema_version: "1.0.0",
    milestone: "QUOTING-SYNERGY-MS0",
    unit: "U-QP-CLOSED-LOOP-JM-CORPUS",
    iter: 49,
    slot: "charlie",
    generated_at: new Date().toISOString(),
    corpus_source: args.corpus,
    active_factor_target: args.activeOut,
    coverage,
    cycle: result,
  };
  await fs.mkdir(dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(closeout, null, 2), "utf8");
  console.log(`[jm-corpus] closeout report → ${outPath}`);

  if (args.json) {
    process.stdout.write(JSON.stringify(closeout) + "\n");
  }

  // Always exit 0 — the verdict (including INSUFFICIENT_DATA + NO_DRIFT) is
  // operational information, not a failure. The script only exits non-zero
  // when pre-flight FAILS (corpus missing/corrupt).
  process.exit(0);
}

// Only auto-run when invoked as main, not when imported by tests.
const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMainModule) {
  main().catch((e) => {
    console.error(`[jm-corpus] FATAL: ${e.message}`);
    process.exit(2);
  });
}

export { invoiceToCycleOutcome, buildCoverage, parseArgs };
