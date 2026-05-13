#!/usr/bin/env node
// tier: T4
/**
 * stop_on_cutting_calculation_protocol.mjs
 *
 * Stop/CLI guard for PRISM milling calculator validation. It keeps strict
 * cutting-result checks from drifting back to "material + diameter = feed"
 * logic by requiring the full-factor protocol manifest to exist and cover
 * machine, material, tool, holder, insert, toolpath, engagement, workholding,
 * coolant, and physics outputs.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = "H:/prism";
const PROTOCOL_PATH = `${ROOT}/test-artifacts/cutting-data/milling-calculation-factor-protocol.json`;
const SOURCE_CORPUS_PATH = `${ROOT}/test-artifacts/cutting-data/milling-tooling-factor-source-corpus.json`;
const CALIBRATION_SEEDS_PATH = `${ROOT}/test-artifacts/cutting-data/milling-tooling-factor-calibration-seeds.json`;
const BASELINE_REPORT_PATH = `${ROOT}/test-artifacts/cutting-data/latest-manufacturer-baseline-report.json`;

const REQUIRED_GROUPS = [
  "sourceProvenance",
  "machineCapability",
  "machineBuildQuality",
  "materialState",
  "toolAssembly",
  "holderSelection",
  "insertSelection",
  "toolpathStrategy",
  "engagementGeometry",
  "workholdingFixturing",
  "coolantChipEvacuation",
  "physicsModels",
  "validationOutputs",
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function exists(filePath) {
  return fs.existsSync(filePath);
}

function hasRecentCuttingArtifact(hours = 24) {
  const dir = `${ROOT}/test-artifacts/cutting-data`;
  if (!exists(dir)) return false;

  const cutoff = Date.now() - hours * 60 * 60 * 1000;
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (/\.(json|md|txt)$/i.test(entry.name) && fs.statSync(full).mtimeMs >= cutoff) {
        return true;
      }
    }
  }
  return false;
}

function validateProtocol(protocol) {
  const findings = [];
  const groups = new Set(protocol.requiredCoverageGroups || []);

  for (const group of REQUIRED_GROUPS) {
    if (!groups.has(group)) findings.push(`protocol missing required coverage group: ${group}`);
    if (!protocol[group]) findings.push(`protocol missing section: ${group}`);
  }

  const models = new Set(protocol.physicsModels?.requiredModels || []);
  for (const model of ["chipThinning", "specificCuttingForce", "cuttingPower", "torque", "holderRunout", "chatterStability", "surfaceFinish"]) {
    if (!models.has(model)) findings.push(`physics model not enforced: ${model}`);
  }

  const holderFields = new Set(protocol.holderSelection?.requiredFields || []);
  for (const field of ["holderType", "runoutTir", "balanceGradeOrRequiredBalance", "clampingForceOrTorque", "pulloutProtection", "gaugeLength"]) {
    if (!holderFields.has(field)) findings.push(`holder field not enforced: ${field}`);
  }

  const outputFields = new Set(protocol.validationOutputs?.requiredFields || []);
  for (const field of ["power", "torque", "thermalRisk", "chatterRisk", "deflectionRisk", "metadataGaps", "sourceComparisons"]) {
    if (!outputFields.has(field)) findings.push(`validation output not enforced: ${field}`);
  }

  return findings;
}

function validateSourceCorpus(corpus) {
  const findings = [];
  const sources = corpus.sources || [];

  if (sources.length < 6) {
    findings.push(`source corpus has only ${sources.length} sources; expected at least 6 reputable manufacturer/tooling sources`);
  }

  const sourceTypes = new Set(sources.map((s) => s.type));
  for (const requiredType of [
    "official_formula_reference",
    "official_indexable_application_data",
    "official_toolholder_reference",
    "official_workholding_reference",
  ]) {
    if (!sourceTypes.has(requiredType)) findings.push(`source corpus missing ${requiredType}`);
  }

  return findings;
}

function validateCalibrationSeeds(seedFile) {
  const findings = [];
  const seeds = seedFile.seeds || [];
  const factorTypes = new Set(seeds.map((seed) => seed.factorType));

  for (const requiredType of [
    "holder_runout",
    "holder_clamping_and_runout",
    "workholding_clamping_force",
    "indexable_insert_feed_envelope",
    "calculation_confidence",
  ]) {
    if (!factorTypes.has(requiredType)) findings.push(`calibration seeds missing ${requiredType}`);
  }

  return findings;
}

function validateBaselineReport(report) {
  const findings = [];
  if (!report.strict) return findings;

  for (const comparison of report.comparisons || []) {
    const missing = new Set(comparison.metadataGaps || []);
    const text = JSON.stringify(comparison).toLowerCase();
    for (const token of ["holder", "workholding", "toolpath", "power", "torque", "thermal", "chatter", "deflection"]) {
      if (!text.includes(token) && !missing.has(token)) {
        findings.push(`${comparison.id || "comparison"} strict report does not expose ${token} coverage or metadata gap`);
      }
    }
  }

  return findings;
}

function main() {
  const strictMode = process.argv.includes("--strict");
  const findings = [];

  if (!hasRecentCuttingArtifact() && !strictMode) {
    console.log(JSON.stringify({ continue: true, systemMessage: "pass: no recent cutting-calculation artifacts" }));
    return;
  }

  if (!exists(PROTOCOL_PATH)) {
    findings.push(`missing milling calculation factor protocol: ${PROTOCOL_PATH}`);
  } else {
    findings.push(...validateProtocol(readJson(PROTOCOL_PATH)));
  }

  if (!exists(SOURCE_CORPUS_PATH)) {
    findings.push(`missing milling tooling source corpus: ${SOURCE_CORPUS_PATH}`);
  } else {
    findings.push(...validateSourceCorpus(readJson(SOURCE_CORPUS_PATH)));
  }

  if (!exists(CALIBRATION_SEEDS_PATH)) {
    findings.push(`missing milling tooling calibration seeds: ${CALIBRATION_SEEDS_PATH}`);
  } else {
    findings.push(...validateCalibrationSeeds(readJson(CALIBRATION_SEEDS_PATH)));
  }

  if (exists(BASELINE_REPORT_PATH)) {
    findings.push(...validateBaselineReport(readJson(BASELINE_REPORT_PATH)));
  }

  if (findings.length) {
    const result = {
      result: strictMode ? "fail" : "warn",
      message: `cutting calculation protocol findings: ${findings.slice(0, 8).join("; ")}`,
      findings,
    };
    console.log(JSON.stringify(result));
    if (strictMode) process.exit(1);
    return;
  }

  console.log(JSON.stringify({ continue: true, systemMessage: "pass",
    message: "cutting calculation protocol coverage present",
    protocol: PROTOCOL_PATH,
    sourceCorpus: SOURCE_CORPUS_PATH,
    calibrationSeeds: CALIBRATION_SEEDS_PATH,
  }));
}

try {
  main();
} catch (error) {
  console.log(JSON.stringify({ continue: true, systemMessage: `warn: cutting calculation protocol hook error: ${error.message}` }));
}
