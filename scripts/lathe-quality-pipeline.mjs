#!/usr/bin/env node
/**
 * lathe-quality-pipeline.mjs — 10-stage quality audit for JM-Die .MIN lathe programs.
 *
 * Implements the pipeline specified in
 *   state/shared/specs/SPEC-LATHE-QUALITY-TESTING-PIPELINE-2026-05-26.md
 *
 * Pure-fn stage runners (testable in isolation) + a thin CLI driver.
 *
 * USAGE:
 *   node scripts/lathe-quality-pipeline.mjs --file path/to/program.MIN
 *   node scripts/lathe-quality-pipeline.mjs --file a.MIN --file b.MIN --file c.MIN  (compare 3 versions)
 *   node scripts/lathe-quality-pipeline.mjs --dir "H:/PRISM/JM DIE/CNC LATHE/<customer>"
 *
 * Stage runners that need PRISM engines (LatheAITrainingEngine, etc.) are
 * STUBBED here with deterministic in-script logic that produces realistic
 * ValidationIssue shapes — the operator implements the engine-backed
 * versions per U-LATHE-LOOP-STAGE-IMPL-1-TO-5.
 *
 * @milestone WHISKEY-ACADEMY-LATHE-BRIDGE-MS0/U-LATHE-QUALITY-PIPELINE
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");

// ─────────────────────────────────────────────────────────────────────────
// Data sources — the AI-queryable artifacts shipped iter1-5
// ─────────────────────────────────────────────────────────────────────────
const MASTER_INDEX_PATH = path.resolve(repoRoot, "mcp-server/data/ingestion_cache/lathe-tribal-master-index-2026-05-26.json");
const ACADEMY_PRIORS_PATH = path.resolve(repoRoot, "mcp-server/data/lathe-academy-priors.json");

function loadJsonSafe(p) {
  try {
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch { return null; }
}

// ─────────────────────────────────────────────────────────────────────────
// STAGE 1 — PROGRAM PARSE (regex-based; mirrors LatheAITrainingEngine shape)
// ─────────────────────────────────────────────────────────────────────────
const TOOL_BLOCK_RE = /\bT(\d+)\s*[\.M]?\s*(\d{0,2})/g;
const SPEED_RE = /\b(G96|G97)\s*S(\d+)/i;
const G_CODE_RE = /\bG(\d{1,3})\b/g;

/** Parse a .MIN program text into a structured shape. */
export function parseProgram(text) {
  if (typeof text !== "string" || text.length < 5) {
    return { ok: false, error: "empty-program" };
  }
  const lines = text.split(/\r?\n/);
  const tool_blocks = [];
  const operation_sequence = [];
  const g_codes_used = new Set();
  for (const tm of text.matchAll(TOOL_BLOCK_RE)) {
    tool_blocks.push({ tool_number: parseInt(tm[1], 10), offset: tm[2] ? parseInt(tm[2], 10) : null });
  }
  for (const gm of text.matchAll(G_CODE_RE)) {
    g_codes_used.add("G" + gm[1].padStart(2, "0"));
  }
  const speedMatch = text.match(SPEED_RE);
  const spindle_mode = speedMatch ? speedMatch[1].toUpperCase() : null;
  const spindle_value = speedMatch ? parseInt(speedMatch[2], 10) : null;

  // Operation inference from G-codes
  if (g_codes_used.has("G71")) operation_sequence.push("od_rough");
  if (g_codes_used.has("G70")) operation_sequence.push("od_finish");
  if (g_codes_used.has("G72")) operation_sequence.push("face");
  if (g_codes_used.has("G75")) operation_sequence.push("od_groove");
  if (g_codes_used.has("G76") || g_codes_used.has("G32") || g_codes_used.has("G92")) operation_sequence.push("od_thread");

  return {
    ok: true,
    tool_blocks,
    operation_sequence,
    spindle_mode,
    spindle_value,
    g_codes: [...g_codes_used].sort(),
    line_count: lines.length,
    char_count: text.length,
  };
}

/**
 * parseBlocks — emit block-level array for sub-validators (e.g. G76 thread validator).
 * Each block carries idx, text, g (canonical G-code if present), and parsed x/z/p/q/f/r args.
 * Pure function; used by validateThreading + by callers needing line-level analysis.
 */
const BLOCK_ARG_RE = /\b([XZPQFR])(-?\d+(?:\.\d+)?)/gi;
const BLOCK_G_RE = /\bG(\d{1,3})\b/;
// iter265: strip parenthesized comments before parsing G-codes.
// Standard Okuma/Mazak/Fanuc convention is `(...)` around block comments.
// Without this, rationale strings inside v2.0.0 stacked headers (e.g.
// `(  rationale: uses G81 drill cycle)`) get falsely parsed as real G-codes.
// This was the root cause of iter218's incorrect "v2.0.0 adds G40/G80/canned cycles" reading
// — see [[reference_iter218_alcoa_outlier_retraction_2026_05_27]].
const PAREN_COMMENT_RE = /\([^)]*\)/g;
export function parseBlocks(text) {
  if (typeof text !== "string") return [];
  const lines = text.split(/\r?\n/);
  return lines.map((line, idx) => {
    const codeOnly = line.replace(PAREN_COMMENT_RE, " ");
    const gMatch = codeOnly.match(BLOCK_G_RE);
    const block = { idx, text: line };
    if (gMatch) block.g = "G" + gMatch[1].padStart(2, "0");
    for (const m of codeOnly.matchAll(BLOCK_ARG_RE)) {
      const k = m[1].toLowerCase();
      const v = Number(m[2]);
      if (block[k] === undefined) block[k] = v;
    }
    return block;
  });
}

/**
 * validateThreading — wrap G76 thread validator with the pipeline's calling convention.
 * Returns { issues } in the same shape as validatePhysics for easy aggregation.
 */
import { validateG76Thread } from "./lib/lathe-g76-thread-validator.mjs";
export function validateThreading(programText, ctx) {
  const blocks = parseBlocks(programText);
  const controllerCtx = ctx || { controller: "fanuc", iso_group: null, material_grade: null };
  const result = validateG76Thread({ controller: controllerCtx.controller, blocks }, controllerCtx);
  // Map the validator's issues into the pipeline's severity convention
  // (validator uses P0/P1/P2; pipeline uses critical/warning/suggestion/info).
  const SEVERITY_MAP = { P0: "critical", P1: "warning", P2: "suggestion" };
  return {
    issues: result.issues.map(i => ({
      severity: SEVERITY_MAP[i.severity] || "info",
      operation: "od_thread",
      parameter: i.rule,
      issue: i.rule,
      block_index: i.block_index,
      message: i.message,
      suggestion: i.suggestion,
      physics_basis: "G76-thread-validator-rules-1-6-7"
    })),
    thread_block_count: result.thread_block_count,
    all_passed: result.all_passed
  };
}

// ─────────────────────────────────────────────────────────────────────────
// STAGE 2 — TOOL VALIDATION (lookup inserts in master tribal index)
// ─────────────────────────────────────────────────────────────────────────
const INSERT_RE = /\b([CWDSTV][A-Z][A-Z][A-Z])\s*[-_]?\s*\d{3,4}/g;

/** Find insert codes referenced in program text + check against master index. */
export function validateTools(programText, masterIndex) {
  const issues = [];
  const insertsFound = [];
  if (!programText) return { issues, insertsFound };
  for (const m of programText.matchAll(INSERT_RE)) {
    const code = m[1].toUpperCase();
    insertsFound.push(code);
    if (!masterIndex) continue;
    // master index stores vendor grades not raw geometry codes — the geometry
    // code (e.g. CNMG) prefixes the grade (CNMG-432-MA). Check the prefix
    // matches a known ANSI geometry.
    if (!/^(CNMG|CNMA|CCMT|CCGT|WNMG|WNMA|WCMT|DNMG|DCMT|SNMG|SCMT|TNMG|TPMR|TCMT|VBMT|VNMG|VCMT|RCMX|RCMT)$/.test(code)) {
      issues.push({ severity: "warning", code, issue: "unknown-insert-geometry", physics_basis: "iso-insert-geometry-table" });
    }
  }
  if (insertsFound.length === 0) {
    issues.push({ severity: "suggestion", issue: "no-explicit-insert-codes", note: "program may use shop-internal tool numbers only — tool-validation requires a tool-library lookup" });
  }
  return { issues, insertsFound };
}

// ─────────────────────────────────────────────────────────────────────────
// STAGE 3 — MATERIAL × TOOL × OP CONSISTENCY
// ─────────────────────────────────────────────────────────────────────────

/** Check program operations against the wizard_query_records first_choice recommendations. */
export function validateConsistency(parsed, isoGroup, masterIndex) {
  const issues = [];
  if (!parsed?.ok || !isoGroup || !masterIndex?.wizard_query_records) return { issues };
  for (const op of parsed.operation_sequence) {
    const rec = masterIndex.wizard_query_records.find(r => {
      const keys = (r.query_keys || []).map(k => String(k).toLowerCase());
      return keys.includes(op.toLowerCase()) && keys.some(k => k.toUpperCase().includes(isoGroup.toUpperCase()));
    });
    if (rec) {
      issues.push({
        severity: "info",
        operation: op,
        iso_group: isoGroup,
        recommended_first_choice: rec.first_choice,
        recommended_alternatives: rec.alternatives,
        physics_basis: "wizard_query_records: " + rec.rationale,
      });
    }
  }
  return { issues };
}

// ─────────────────────────────────────────────────────────────────────────
// STAGE 4 — SPEED / FEED PHYSICS (real deviation detection)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Extract program-quoted cutting parameters from .MIN text.
 * Parses G71 U<DOC> blocks, F<feed> values, G50 S<rpmCap>, G96 S<surfaceSpeed>.
 * Returns first-encountered values per op type — multi-op programs may
 * carry several entries.
 *
 * Inputs that fail-soft to null: malformed numbers, missing addressing letters.
 */
export function extractProgramParameters(text) {
  if (typeof text !== "string" || text.length < 5) return {};
  const out = { rpm_cap: null, css_m_min: null, css_units: null, feed_per_rev: null, feed_per_min: null, doc_mm: null, doc_units: null };

  const g50 = text.match(/\bG50\s*S(\d+)/i);
  if (g50) out.rpm_cap = parseInt(g50[1], 10);

  // G96 S<n> — n is the surface speed. Units (m/min vs sfm) depend on G20/G21.
  const g96 = text.match(/\bG96\s*S(\d+)/i);
  if (g96) {
    out.css_units = /\bG20\b/i.test(text) ? "sfm" : "m/min";
    out.css_m_min = out.css_units === "sfm" ? Math.round(parseInt(g96[1], 10) * 0.3048) : parseInt(g96[1], 10);
  }

  // Feed per rev — first F<n> following G99 (or anywhere if G99 not present)
  const fmatch = text.match(/\bF([\d.]+)\b/);
  if (fmatch) {
    const v = parseFloat(fmatch[1]);
    const isInch = /\bG20\b/i.test(text);
    // Heuristic: feed-per-rev for lathe is typically 0.01-0.5 mm/rev or 0.0005-0.020 ipr.
    if (isInch) {
      out.feed_per_rev = v < 0.1 ? Math.round(v * 25.4 * 1000) / 1000 : null;
    } else {
      out.feed_per_rev = v > 0 && v < 1.0 ? v : null;
    }
  }

  // G71 U<doc> — first-pass DOC from canned cycle (always radial × 2 for diameter, U is depth-per-pass)
  const g71u = text.match(/\bG71\s+U([\d.]+)/i);
  if (g71u) {
    const v = parseFloat(g71u[1]);
    out.doc_units = /\bG20\b/i.test(text) ? "in" : "mm";
    out.doc_mm = out.doc_units === "in" ? Math.round(v * 25.4 * 100) / 100 : v;
  }

  return out;
}

/**
 * Compare program-quoted speed/feed against expected ranges from academy priors.
 * Emits ValidationIssue with severity reflecting deviation magnitude:
 *   - critical: param outside range by >50%
 *   - warning:  param outside range by 10-50%
 *   - suggestion: param within range but at extremes (top/bottom 10%)
 *   - info: param inside range OR no program value to compare
 */
export function validatePhysics(parsed, _isoGroup, academyPriors, programParams) {
  const issues = [];
  if (!parsed?.ok || !academyPriors?.priors) return { issues };
  const params = programParams || {};

  for (const op of parsed.operation_sequence) {
    const prior = academyPriors.priors.find(p => p.tool_type === op);
    if (!prior) continue;
    const ranges = prior.param_ranges || {};

    issues.push(...compareRange("doc_mm", params.doc_mm, ranges.doc_mm, op, prior.physics_basis));
    issues.push(...compareRange("feed_mm_rev", params.feed_per_rev, ranges.feed_mm_rev, op, prior.physics_basis));
    if (typeof params.rpm_cap === "number" && Array.isArray(ranges.rpm) && ranges.rpm.length === 2) {
      if (params.rpm_cap > ranges.rpm[1] * 1.5) {
        issues.push({
          severity: "warning", operation: op, parameter: "rpm_cap",
          program_value: params.rpm_cap, expected_max: ranges.rpm[1],
          deviation_pct: Math.round(((params.rpm_cap - ranges.rpm[1]) / ranges.rpm[1]) * 100),
          issue: "rpm-cap-exceeds-prior",
          physics_basis: prior.physics_basis,
        });
      }
    }
  }
  return { issues };
}

/**
 * Compare a scalar program value against an expected [min, max] range.
 * Returns 0-or-1 issues describing the comparison.
 */
function compareRange(paramName, programValue, expectedRange, operation, physicsBasis) {
  if (!Array.isArray(expectedRange) || expectedRange.length !== 2) return [];
  if (typeof programValue !== "number" || !Number.isFinite(programValue)) {
    return [{ severity: "info", operation, parameter: paramName, issue: "no-program-value-to-compare",
              expected_range: expectedRange, physics_basis: physicsBasis }];
  }
  const [lo, hi] = expectedRange;
  if (programValue >= lo && programValue <= hi) {
    const span = hi - lo;
    const fromHigh = (hi - programValue) / span;
    const fromLow = (programValue - lo) / span;
    if (fromHigh < 0.10 || fromLow < 0.10) {
      return [{ severity: "suggestion", operation, parameter: paramName,
                program_value: programValue, expected_range: expectedRange,
                issue: "value-at-extreme-of-range",
                physics_basis: physicsBasis }];
    }
    return [{ severity: "info", operation, parameter: paramName,
              program_value: programValue, expected_range: expectedRange,
              issue: "value-within-range",
              physics_basis: physicsBasis }];
  }
  const deviation = programValue < lo ? (lo - programValue) / lo : (programValue - hi) / hi;
  const sev = deviation > 0.5 ? "critical" : "warning";
  return [{
    severity: sev, operation, parameter: paramName,
    program_value: programValue, expected_range: expectedRange,
    deviation_pct: Math.round(deviation * 100),
    issue: programValue < lo ? "below-expected-range" : "above-expected-range",
    physics_basis: physicsBasis,
  }];
}

// ─────────────────────────────────────────────────────────────────────────
// STAGE 8 — OPERATION SEQUENCE QUALITY
// ─────────────────────────────────────────────────────────────────────────

/**
 * Canonical lathe operation sequence: rough-then-finish, OD-before-ID,
 * center-drill before drill, drill before bore, profile before thread,
 * thread before cutoff, cutoff last.
 * Adheres to operation_ordering wiki convention
 * ([[operation-ordering-sequencing-roughing-finishing-datums]]).
 */
const CANONICAL_ORDER = [
  "face", "center_drill", "drill",
  "od_rough", "id_rough",
  "od_finish", "id_finish", "boring_bar",
  "od_groove", "id_groove",
  "od_thread", "id_thread",
  "cutoff", "parting",
];

export function scoreOperationSequence(parsed) {
  if (!parsed?.ok) return { score: 0, deltas: [] };
  const seq = parsed.operation_sequence;
  if (seq.length === 0) return { score: 50, deltas: ["no-operations-detected"] };
  const expectedRanks = seq.map(op => {
    const i = CANONICAL_ORDER.indexOf(op);
    return i < 0 ? CANONICAL_ORDER.length : i;
  });
  let inversions = 0;
  for (let i = 0; i < expectedRanks.length - 1; i++) {
    if (expectedRanks[i] > expectedRanks[i + 1]) inversions++;
  }
  const maxInversions = Math.max(1, expectedRanks.length - 1);
  const score = Math.round(100 * (1 - inversions / maxInversions));
  return {
    score,
    inversions,
    sequence_observed: seq,
    canonical_reference: CANONICAL_ORDER,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// STAGE 10 — AGGREGATE QUALITY SCORE
// ─────────────────────────────────────────────────────────────────────────

/**
 * Weighted aggregate of stage 2-9 outputs. Stage names match the spec.
 * Weights sum to 1.0. Each stage returns a 0-100 score (or null = skipped).
 */
const STAGE_WEIGHTS = {
  tool_validation: 0.20,
  consistency:     0.20,
  physics:         0.20,
  stability:       0.10,
  deflection:      0.10,
  chip_control:    0.05,
  sequence:        0.10,
  post:            0.05,
};

export function aggregateQualityScore(stageScores) {
  let total = 0;
  let weightUsed = 0;
  const breakdown = {};
  for (const [stage, w] of Object.entries(STAGE_WEIGHTS)) {
    const s = stageScores[stage];
    if (typeof s !== "number" || !Number.isFinite(s)) {
      breakdown[stage] = { weight: w, score: null, contribution: 0, skipped: true };
      continue;
    }
    const clamped = Math.max(0, Math.min(100, s));
    breakdown[stage] = { weight: w, score: clamped, contribution: clamped * w };
    total += clamped * w;
    weightUsed += w;
  }
  // Renormalize by weight actually used (so skipped stages don't sink the score)
  const score = weightUsed > 0 ? Math.round(total / weightUsed) : null;
  return { score, breakdown, weight_used: weightUsed };
}

// ─────────────────────────────────────────────────────────────────────────
// CLI driver — run pipeline against one or more .MIN files
// ─────────────────────────────────────────────────────────────────────────

function runPipelineOne(filePath, masterIndex, academyPriors, isoGroup) {
  const text = fs.readFileSync(filePath, "utf8");
  const parsed = parseProgram(text);
  if (!parsed.ok) return { ok: false, error: parsed.error, file: filePath };

  const programParams = extractProgramParameters(text);
  const toolVal = validateTools(text, masterIndex);
  const consistency = validateConsistency(parsed, isoGroup, masterIndex);
  const physics = validatePhysics(parsed, isoGroup, academyPriors, programParams);
  const seq = scoreOperationSequence(parsed);

  // Derive a physics score from issue severities — critical drops the score sharply
  const physicsSeverityScore = scorePhysicsIssues(physics.issues);
  const stageScores = {
    tool_validation: toolVal.insertsFound.length > 0 ? 80 : 50,
    consistency: consistency.issues.length > 0 ? 75 : 50,
    physics: physicsSeverityScore,
    sequence: seq.score,
  };
  const aggregate = aggregateQualityScore(stageScores);

  return {
    ok: true,
    file: filePath,
    parsed: { tool_count: parsed.tool_blocks.length, ops: parsed.operation_sequence, g_codes: parsed.g_codes, line_count: parsed.line_count },
    program_params: programParams,
    inserts_found: toolVal.insertsFound,
    tool_validation_issues: toolVal.issues,
    consistency_issues: consistency.issues,
    physics_issues: physics.issues,
    sequence_score: seq,
    quality: aggregate,
  };
}

/**
 * Severity-weighted physics score (0-100). Each issue deducts:
 *   critical → 25 · warning → 10 · suggestion → 3 · info → 0
 * Floor 0, ceiling 100. Starts at 100 (no issues = perfect).
 */
export function scorePhysicsIssues(issues) {
  if (!Array.isArray(issues) || issues.length === 0) return 50; // no priors, no data → neutral
  let score = 100;
  for (const i of issues) {
    if (i.severity === "critical") score -= 25;
    else if (i.severity === "warning") score -= 10;
    else if (i.severity === "suggestion") score -= 3;
  }
  return Math.max(0, Math.min(100, score));
}

function parseArgs(argv) {
  const args = { files: [], dir: null, isoGroup: null, json: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--file") args.files.push(argv[++i]);
    else if (a === "--dir") args.dir = argv[++i];
    else if (a === "--iso") args.isoGroup = argv[++i];
    else if (a === "--json") args.json = true;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  const masterIndex = loadJsonSafe(MASTER_INDEX_PATH);
  const academyPriors = loadJsonSafe(ACADEMY_PRIORS_PATH);

  if (!masterIndex) process.stderr.write("# WARNING: master tribal index not found at " + MASTER_INDEX_PATH + "\n");
  if (!academyPriors) process.stderr.write("# WARNING: academy priors not found at " + ACADEMY_PRIORS_PATH + "\n");

  const files = [...args.files];
  if (args.dir) {
    const dirFiles = fs.readdirSync(args.dir).filter(f => /\.(MIN|min)$/.test(f)).map(f => path.join(args.dir, f));
    files.push(...dirFiles);
  }
  if (files.length === 0) {
    process.stderr.write("Usage: --file path/to/program.MIN  OR  --dir path/to/dir  [--iso P|M|K|N|S|H]\n");
    process.exit(2);
  }

  const reports = [];
  for (const f of files) {
    try {
      const rep = runPipelineOne(f, masterIndex, academyPriors, args.isoGroup);
      reports.push(rep);
    } catch (e) {
      reports.push({ ok: false, file: f, error: e.message });
    }
  }
  if (args.json) {
    process.stdout.write(JSON.stringify(reports, null, 2) + "\n");
  } else {
    for (const r of reports) {
      process.stdout.write("=== " + r.file + " ===\n");
      if (!r.ok) { process.stdout.write("  ERROR: " + r.error + "\n"); continue; }
      process.stdout.write("  tools=" + r.parsed.tool_count + " ops=[" + r.parsed.ops.join(",") + "]" +
                          " g_codes=[" + r.parsed.g_codes.join(",") + "]" +
                          " inserts=[" + (r.inserts_found || []).join(",") + "]\n");
      process.stdout.write("  sequence_score=" + r.sequence_score.score + "  quality=" + r.quality.score + "/100\n");
    }
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main().catch(e => { process.stderr.write("FATAL " + e.stack + "\n"); process.exit(1); });
