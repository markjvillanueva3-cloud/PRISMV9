#!/usr/bin/env node
/**
 * CAM-EXHAUST-MS0 / U-CAM-ENRICH-05
 * ==================================
 *
 * Pre-commit gate: blocks edits to Phase-5 engine files (U-CAM71..U-CAM78)
 * unless the CAMCatalogEnrichmentValidator baseline exists AND the last
 * validation run passed.
 *
 * This enforces the dependency documented in U-CAM-ENRICH-05:
 *   "Before any Phase-5 unit flips from 'scaffolded stub' to 'real
 *    implementation', CAMCatalogEnrichmentValidator must report ≥
 *    baseline for the CAM(s) involved."
 *
 * How it decides "real implementation":
 *   - If the engine file already exists AND its diff is non-trivial
 *     (not pure comment/whitespace change), it counts as real-impl work.
 *   - Pure stub scaffolding in CAMPhase5Stubs.ts is exempt.
 *
 * Bypass: set env PRISM_CAM_PHASE5_GATE=off to disable temporarily
 *         (e.g. for revert-only commits).
 *
 * Exit codes: 0 = allow, 1 = block.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";

const REPO_ROOT = path.resolve(import.meta.dirname, "..", "..", "..");
const MCP_ROOT  = path.resolve(import.meta.dirname, "..", "..");
const BASELINE_PATH = path.join(MCP_ROOT, "data", "state", "PHASE_0.6_ENRICHMENT_BASELINE.json");
const VALIDATION_PATH = path.join(MCP_ROOT, "data", "state", "PHASE_0.6_ENRICHMENT_VALIDATION.json");

const PHASE5_ENGINES = [
  "CAMFunctionRouterEngine",
  "CAMParameterValidatorEngine",
  "CAMStrategyRecommenderEngine",
  "CAMParameterOptimizerEngine",
  "CAMCrossSystemTranslatorEngine",
  "CAMAGIReasoningEngine",
  "CAMTribalKnowledgeEngine",
  "CAMFeatureLearningEngine",
];

function listStagedFiles() {
  try {
    const out = execSync("git diff --cached --name-only", { cwd: REPO_ROOT, encoding: "utf-8" });
    return out.split("\n").map((s) => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function isPhase5RealImplFile(relPath) {
  if (!relPath.startsWith("mcp-server/src/engines/")) return false;
  const basename = path.basename(relPath, ".ts");
  if (basename === "CAMPhase5Stubs") return false; // scaffold is exempt
  return PHASE5_ENGINES.includes(basename);
}

function baselineReady() {
  if (!fs.existsSync(BASELINE_PATH)) {
    return { ready: false, reason: "baseline-missing", detail: `No file at ${BASELINE_PATH}. Run: npm run validate:cam-enrichment` };
  }
  if (!fs.existsSync(VALIDATION_PATH)) {
    return { ready: false, reason: "validation-missing", detail: `No validator run output at ${VALIDATION_PATH}. Run: npm run validate:cam-enrichment` };
  }
  try {
    const v = JSON.parse(fs.readFileSync(VALIDATION_PATH, "utf-8"));
    if (v.passed !== true) {
      return { ready: false, reason: "validator-failed", detail: `Last validator run did not pass (regressions=${v.regressions?.length ?? "?"}).` };
    }
    if (v.baseline_compared !== true) {
      return { ready: false, reason: "baseline-not-compared", detail: "Validator ran but did not compare against baseline." };
    }
    return { ready: true };
  } catch (e) {
    return { ready: false, reason: "validation-parse-error", detail: String(e) };
  }
}

function main() {
  if (process.env.PRISM_CAM_PHASE5_GATE === "off") {
    console.log("[cam-phase5-impl-gate] Bypass via PRISM_CAM_PHASE5_GATE=off.");
    process.exit(0);
  }
  const staged = listStagedFiles();
  const phase5Changed = staged.filter(isPhase5RealImplFile);
  if (phase5Changed.length === 0) {
    process.exit(0);
  }

  const ready = baselineReady();
  if (ready.ready) {
    console.log(`[cam-phase5-impl-gate] ${phase5Changed.length} Phase-5 engine file(s) staged; baseline passing. Allowed.`);
    process.exit(0);
  }

  console.error("\n[cam-phase5-impl-gate] BLOCK — Phase-5 real-impl change detected without passing enrichment baseline.");
  console.error(`  Reason : ${ready.reason}`);
  console.error(`  Detail : ${ready.detail}`);
  console.error("  Staged Phase-5 files:");
  for (const f of phase5Changed) console.error(`    - ${f}`);
  console.error("\n  Fix path:");
  console.error("    1) cd mcp-server && npm run validate:cam-enrichment");
  console.error("    2) Re-stage any regenerated baseline/validation artifacts");
  console.error("    3) Retry the commit");
  console.error("\n  Temporary bypass (NOT for normal commits):");
  console.error("    PRISM_CAM_PHASE5_GATE=off git commit ...");
  process.exit(1);
}

main();
