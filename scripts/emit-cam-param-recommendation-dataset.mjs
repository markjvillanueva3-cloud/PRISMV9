#!/usr/bin/env node
/**
 * scripts/emit-cam-param-recommendation-dataset.mjs
 *   CAM-AI-TRAINING-MS0/U-CAMT-PARAM-RECO
 *
 * Walk the 4 system CamTemplates and emit LoRA tuples for parameter
 * recommendations: "what's a typical {param} for {op} in {system}?" ->
 * default value extracted from catalog parameters {} dict (or "no default
 * in catalog" if absent — both signals are useful training data).
 *
 * Output:
 *   - state/shared/corpus/cam-param-recommendation.jsonl
 *   - state/shared/corpus/cam-param-recommendation-summary.json
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = dirname(__dirname);
const CORPUS = join(REPO_ROOT, "state", "shared", "corpus");

const TARGETS = ["hypermill", "mastercam", "esprit", "fusion360", "nxcam"];

const OPERATOR_CONSTRAINT = "no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)";

function loadTemplates(sys) {
  const f = join(CORPUS, `cam-templates-${sys}.jsonl`);
  if (!existsSync(f)) return [];
  return readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
}

const tuples = [];
const perSystemCounts = {};
const paramCoverage = { withDefault: 0, withoutDefault: 0 };

for (const sys of TARGETS) {
  const templates = loadTemplates(sys);
  let count = 0;
  for (const t of templates) {
    const op = t.op;
    const nativeName = t.nativeName ?? t.nativeKey ?? op;
    const params = t.parameters ?? {};
    const paramNames = Object.keys(params);
    if (paramNames.length === 0) {
      // Catalog has no params recorded — useful negative signal
      tuples.push({
        messages: [
          { role: "user", content: `What parameters does ${nativeName} expose in ${sys}?` },
          { role: "assistant", content: JSON.stringify({ op, system: sys, nativeName, parameters: [], note: "catalog does not record parameter list for this operation" }) },
        ],
        metadata: { kind: "param-list-empty", op, system: sys, provenance: { realDataOnly: true, sourceMilestone: "CAM-AI-TRAINING-MS0", sourceSlot: "kilo", operatorConstraint: OPERATOR_CONSTRAINT } },
      });
      count++;
      paramCoverage.withoutDefault++;
      continue;
    }
    // Whole parameter list
    tuples.push({
      messages: [
        { role: "user", content: `List the parameters for ${nativeName} in ${sys}.` },
        { role: "assistant", content: JSON.stringify({ op, system: sys, nativeName, parameters: paramNames }) },
      ],
      metadata: { kind: "param-list", op, system: sys, paramCount: paramNames.length, provenance: { realDataOnly: true, sourceMilestone: "CAM-AI-TRAINING-MS0", sourceSlot: "kilo", operatorConstraint: OPERATOR_CONSTRAINT } },
    });
    count++;

    // Per-parameter recommendation
    for (const [paramName, paramDef] of Object.entries(params)) {
      const defaultValue = (paramDef && typeof paramDef === "object" && "default" in paramDef) ? paramDef.default : paramDef;
      const hasDefault = defaultValue !== undefined && defaultValue !== null && defaultValue !== "";
      if (hasDefault) paramCoverage.withDefault++; else paramCoverage.withoutDefault++;

      tuples.push({
        messages: [
          { role: "user", content: `What is a typical ${paramName} for ${nativeName} in ${sys}?` },
          { role: "assistant", content: JSON.stringify({
            op, system: sys, nativeName, parameter: paramName,
            recommendedValue: hasDefault ? defaultValue : null,
            note: hasDefault ? "from catalog default" : "no default in catalog — operator must specify",
          }) },
        ],
        metadata: { kind: "param-recommendation", op, system: sys, parameter: paramName, hasDefault, provenance: { realDataOnly: true, sourceMilestone: "CAM-AI-TRAINING-MS0", sourceSlot: "kilo", operatorConstraint: OPERATOR_CONSTRAINT } },
      });
      count++;
    }
  }
  perSystemCounts[sys] = count;
  console.log(`[${sys}] templates=${templates.length} -> ${count} param tuples`);
}

writeFileSync(
  join(CORPUS, "cam-param-recommendation.jsonl"),
  tuples.map((r) => JSON.stringify(r)).join("\n") + "\n"
);

writeFileSync(
  join(CORPUS, "cam-param-recommendation-summary.json"),
  JSON.stringify({
    totalTuples: tuples.length,
    perSystem: perSystemCounts,
    paramCoverage,
    coverageFrac: (paramCoverage.withDefault / (paramCoverage.withDefault + paramCoverage.withoutDefault)).toFixed(4),
    generatedAt: new Date().toISOString(),
  }, null, 2)
);

console.log(`\nTotal param-recommendation tuples: ${tuples.length}`);
console.log(`Param coverage: ${paramCoverage.withDefault} with default / ${paramCoverage.withoutDefault} without`);
