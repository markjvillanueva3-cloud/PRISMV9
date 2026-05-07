/**
 * review-merge.mjs — Phase 2-A: Dual-perspective review finding merger
 *
 * Merges findings from multiple review agents using review-rubric.json.
 * Deduplicates by file+line+description similarity, applies disputed
 * findings policy, computes file criticality weights, and outputs
 * a consolidated report.
 *
 * Usage: node review-merge.mjs --findings '<json>' --findings '<json>' [--output <path>]
 *   or:  import { mergeFindings } from "./review-merge.mjs"
 *
 * Input: Array of reviewer outputs matching review-rubric.json/reviewer_output_schema
 * Output: Consolidated report with verdicts, disputes resolved
 */

import { promises as fs } from "node:fs";
import path from "node:path";

const RUBRIC_PATH = path.join("H:", "prism", ".claude", "helpers", "review-rubric.json");
const LOG_PATH = path.join("H:", "prism", ".claude", "cache", "PRISM_REVIEW_LOG.jsonl");

let rubric = null;

async function loadRubric() {
  if (rubric) return rubric;
  try {
    const raw = await fs.readFile(RUBRIC_PATH, "utf8");
    rubric = JSON.parse(raw);
    return rubric;
  } catch {
    // Fallback rubric if file missing
    rubric = {
      disputed_findings_policy: {
        agreed_critical_high: "MUST FIX",
        disputed_critical_high: "MUST FIX",
        disputed_medium: "DEFER with justification",
        agreed_low: "Optional fix",
        disputed_low: "Ignore"
      },
      file_criticality_weights: {
        engine_files: 10,
        dispatcher_schema_files: 5,
        test_files: 3,
        utility_files: 2,
        documentation_files: 1
      }
    };
    return rubric;
  }
}

function getFileCriticality(filePath) {
  const normalized = filePath.replace(/\\/g, "/").toLowerCase();
  if (/engine\.ts$|engines\//.test(normalized)) return { type: "engine", weight: 10 };
  if (/dispatcher|schema/.test(normalized)) return { type: "dispatcher/schema", weight: 5 };
  if (/\.test\.|\.spec\./.test(normalized)) return { type: "test", weight: 3 };
  if (/helper|util|lib/.test(normalized)) return { type: "utility", weight: 2 };
  if (/\.md$|docs\//.test(normalized)) return { type: "documentation", weight: 1 };
  return { type: "other", weight: 2 };
}

function findingSimilarity(a, b) {
  // Same file + similar description = likely duplicate
  if (a.file !== b.file) return 0;
  if (a.line && b.line && Math.abs(a.line - b.line) > 5) return 0;

  const aWords = new Set(a.description.toLowerCase().split(/\s+/));
  const bWords = new Set(b.description.toLowerCase().split(/\s+/));
  const intersection = new Set([...aWords].filter(w => bWords.has(w)));
  const union = new Set([...aWords, ...bWords]);
  return intersection.size / union.size; // Jaccard similarity
}

function resolveSeverity(severity, agreementCount, totalReviewers) {
  const isAgreed = agreementCount >= 2 || agreementCount === totalReviewers;
  const isDisputed = !isAgreed;

  if (severity === "CRITICAL" || severity === "HIGH") {
    return { action: "MUST FIX", note: isAgreed ? "agreed" : "disputed but MUST FIX per policy" };
  }
  if (severity === "MEDIUM") {
    return isAgreed
      ? { action: "SHOULD FIX", note: "agreed by multiple reviewers" }
      : { action: "DEFER", note: "disputed — log justification" };
  }
  // LOW
  return isAgreed
    ? { action: "OPTIONAL", note: "agreed low severity" }
    : { action: "IGNORE", note: "disputed low — skip" };
}

/**
 * Merge findings from multiple reviewers into a consolidated report.
 * @param {Array} reviewerOutputs - Array of objects matching reviewer_output_schema
 * @returns {Object} Consolidated report
 */
export function mergeFindings(reviewerOutputs) {
  const allFindings = [];
  const dimensionVerdicts = {};

  // Collect all findings with reviewer attribution
  for (const output of reviewerOutputs) {
    const role = output.reviewer_role || "unknown";
    for (const finding of (output.findings || [])) {
      allFindings.push({ ...finding, reviewer: role });
    }
    // Merge dimension verdicts
    for (const [dim, verdict] of Object.entries(output.dimensions || {})) {
      if (!dimensionVerdicts[dim]) dimensionVerdicts[dim] = [];
      dimensionVerdicts[dim].push({ role, ...verdict });
    }
  }

  // Deduplicate by similarity
  const SIMILARITY_THRESHOLD = 0.5;
  const groups = [];

  for (const finding of allFindings) {
    let merged = false;
    for (const group of groups) {
      if (findingSimilarity(group[0], finding) > SIMILARITY_THRESHOLD) {
        group.push(finding);
        merged = true;
        break;
      }
    }
    if (!merged) groups.push([finding]);
  }

  // Resolve each group
  const totalReviewers = reviewerOutputs.length;
  const resolvedFindings = groups.map(group => {
    const primary = group[0];
    const highestSeverity = group.reduce((max, f) => {
      const order = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      return (order[f.severity] || 0) > (order[max] || 0) ? f.severity : max;
    }, primary.severity);

    const reviewers = [...new Set(group.map(f => f.reviewer))];
    const resolution = resolveSeverity(highestSeverity, reviewers.length, totalReviewers);
    const criticality = getFileCriticality(primary.file);

    return {
      severity: highestSeverity,
      file: primary.file,
      line: primary.line,
      dimension: primary.dimension,
      description: primary.description,
      suggested_fix: primary.suggested_fix,
      reviewers,
      agreement: reviewers.length >= 2 ? "agreed" : "single",
      resolution: resolution.action,
      resolution_note: resolution.note,
      file_criticality: criticality,
      priority_score: (criticality.weight * ({ CRITICAL: 10, HIGH: 7, MEDIUM: 4, LOW: 1 }[highestSeverity] || 1))
    };
  });

  // Sort by priority score descending
  resolvedFindings.sort((a, b) => b.priority_score - a.priority_score);

  // Aggregate dimension verdicts
  const dimensionSummary = {};
  for (const [dim, verdicts] of Object.entries(dimensionVerdicts)) {
    const hasFail = verdicts.some(v => v.verdict === "FAIL");
    const hasWarn = verdicts.some(v => v.verdict === "WARN");
    dimensionSummary[dim] = {
      verdict: hasFail ? "FAIL" : hasWarn ? "WARN" : "PASS",
      details: verdicts
    };
  }

  // Overall verdict
  const hasCritical = resolvedFindings.some(f => f.severity === "CRITICAL" && f.resolution === "MUST FIX");
  const hasHigh = resolvedFindings.some(f => f.severity === "HIGH" && f.resolution === "MUST FIX");
  const overallVerdict = hasCritical ? "FAIL — CRITICAL issues must be fixed"
    : hasHigh ? "FAIL — HIGH issues must be fixed"
    : "PASS";

  // Cross-role insights (findings flagged by 2+ reviewers)
  const crossRole = resolvedFindings.filter(f => f.reviewers.length >= 2);

  return {
    timestamp: new Date().toISOString(),
    reviewers: reviewerOutputs.map(o => o.reviewer_role),
    total_findings: allFindings.length,
    deduplicated_findings: resolvedFindings.length,
    must_fix: resolvedFindings.filter(f => f.resolution === "MUST FIX").length,
    should_fix: resolvedFindings.filter(f => f.resolution === "SHOULD FIX").length,
    deferred: resolvedFindings.filter(f => f.resolution === "DEFER").length,
    ignored: resolvedFindings.filter(f => f.resolution === "IGNORE").length,
    dimensions: dimensionSummary,
    findings: resolvedFindings,
    cross_role_insights: crossRole,
    overall_verdict: overallVerdict
  };
}

/**
 * Append a review report to the PRISM_REVIEW_LOG.jsonl audit trail.
 */
export async function logReview(report) {
  try {
    const dir = path.dirname(LOG_PATH);
    await fs.mkdir(dir, { recursive: true });
    await fs.appendFile(LOG_PATH, JSON.stringify(report) + "\n", "utf8");
  } catch (err) {
    process.stderr.write(`[review-merge] Log failed: ${err.message}\n`);
  }
}

// CLI mode
const isMain = process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1"));

if (isMain) {
  (async () => {
    const args = process.argv.slice(2);
    const findingsArgs = [];
    let outputPath = null;

    for (let i = 0; i < args.length; i++) {
      if (args[i] === "--findings" && args[i + 1]) {
        try {
          findingsArgs.push(JSON.parse(args[++i]));
        } catch {
          process.stderr.write(`[review-merge] Invalid JSON in --findings arg ${findingsArgs.length + 1}\n`);
          process.exit(1);
        }
      } else if (args[i] === "--output" && args[i + 1]) {
        outputPath = args[++i];
      }
    }

    if (findingsArgs.length === 0) {
      process.stderr.write("Usage: node review-merge.mjs --findings '<json>' [--findings '<json>'] [--output <path>]\n");
      process.exit(1);
    }

    await loadRubric();
    const report = mergeFindings(findingsArgs);
    await logReview(report);

    const output = JSON.stringify(report, null, 2);
    if (outputPath) {
      await fs.writeFile(outputPath, output, "utf8");
      process.stderr.write(`[review-merge] Report written to ${outputPath}\n`);
    }
    process.stdout.write(output);
  })().catch(err => {
    process.stderr.write(`[review-merge] Error: ${err.message}\n`);
    process.exit(1);
  });
}
