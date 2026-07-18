#!/usr/bin/env node
/**
 * scripts/validate-cam-master-corpus.mjs
 *   CAM-AI-TRAINING-MS0/U-CAMT-CORPUS-VALIDATE
 *
 * Validates the MASTER training set against the operator's hard
 * constraint: every tuple MUST carry:
 *   - messages with at least user + assistant pair
 *   - metadata.provenance.realDataOnly === true
 *   - metadata.provenance.operatorConstraint matching the exact 2026-05-25 string
 *   - metadata.provenance.sourceMilestone === "CAM-AI-TRAINING-MS0"
 *   - metadata.provenance.sourceSlot === "kilo"
 *
 * Exits 0 on full PASS, 1 on any violation (with detailed report).
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = dirname(__dirname);
const CORPUS = join(REPO_ROOT, "state", "shared", "corpus");

const REQUIRED_CONSTRAINT = "no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)";
const REQUIRED_MILESTONE = "CAM-AI-TRAINING-MS0";
const REQUIRED_SLOT = "kilo";

const MASTER = join(CORPUS, "cam-master-training-set.jsonl");

if (!existsSync(MASTER)) {
  console.error("[FAIL] master training set not found:", MASTER);
  process.exit(1);
}

const lines = readFileSync(MASTER, "utf8").split("\n").filter(Boolean);

let total = 0;
let pass = 0;
const violations = {
  noMessages: 0,
  missingUserOrAssistant: 0,
  noProvenance: 0,
  realDataOnlyMissing: 0,
  wrongOperatorConstraint: 0,
  wrongMilestone: 0,
  wrongSlot: 0,
};
const violationSamples = [];

for (const [idx, line] of lines.entries()) {
  total++;
  let rec;
  try {
    rec = JSON.parse(line);
  } catch (e) {
    violations.noMessages++;
    if (violationSamples.length < 5) violationSamples.push({ idx, kind: "json-parse", error: String(e) });
    continue;
  }
  let ok = true;
  if (!Array.isArray(rec.messages) || rec.messages.length < 2) {
    violations.missingUserOrAssistant++;
    ok = false;
  } else {
    const roles = rec.messages.map((m) => m.role);
    if (!roles.includes("user") || !roles.includes("assistant")) {
      violations.missingUserOrAssistant++;
      ok = false;
    }
  }
  const p = rec.metadata?.provenance;
  if (!p) {
    violations.noProvenance++;
    ok = false;
  } else {
    if (p.realDataOnly !== true) {
      violations.realDataOnlyMissing++;
      ok = false;
    }
    if (p.operatorConstraint !== REQUIRED_CONSTRAINT) {
      violations.wrongOperatorConstraint++;
      ok = false;
    }
    if (p.sourceMilestone !== REQUIRED_MILESTONE) {
      violations.wrongMilestone++;
      ok = false;
    }
    if (p.sourceSlot !== REQUIRED_SLOT) {
      violations.wrongSlot++;
      ok = false;
    }
  }
  if (ok) {
    pass++;
  } else if (violationSamples.length < 5) {
    violationSamples.push({ idx, track: rec.metadata?.track ?? "unknown", missingFields: { ...violations } });
  }
}

const failCount = total - pass;
const report = {
  totalTuples: total,
  passing: pass,
  failing: failCount,
  passRate: (pass / total).toFixed(4),
  violations,
  violationSamples: violationSamples.slice(0, 5),
  generatedAt: new Date().toISOString(),
};

writeFileSync(join(CORPUS, "cam-master-corpus-validation.json"), JSON.stringify(report, null, 2));

console.log(`MASTER corpus validation: ${pass}/${total} pass (${report.passRate})`);
console.log(`violations:`);
for (const [k, v] of Object.entries(violations)) console.log(`  ${k}: ${v}`);

if (failCount > 0) {
  console.error(`\nFAIL — ${failCount} tuples failed validation`);
  process.exit(1);
} else {
  console.log(`\nPASS — every tuple carries provenance + operator constraint`);
  process.exit(0);
}
