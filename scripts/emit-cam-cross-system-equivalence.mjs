#!/usr/bin/env node
/**
 * scripts/emit-cam-cross-system-equivalence.mjs
 *   CAM-AI-TRAINING-MS0/U-CAMT-CROSS-SYSTEM-EQUIV
 *
 * Build canonical equivalence groups: for each CamOperation `op`, list the
 * native-name + template-id across all 4 systems. Powers cross-system
 * translation prompts ("how do I do this in esprit if I know mastercam?").
 *
 * Output:
 *   - state/shared/corpus/cam-cross-system-equivalence.json (groups index)
 *   - state/shared/corpus/cam-cross-system-translation.jsonl (LoRA-ready translation tuples)
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = dirname(__dirname);
const CORPUS = join(REPO_ROOT, "state", "shared", "corpus");

const TARGETS = ["hypermill", "mastercam", "esprit", "fusion360", "nxcam"];

function loadTemplates(sys) {
  const f = join(CORPUS, `cam-templates-${sys}.jsonl`);
  if (!existsSync(f)) return [];
  return readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
}

// Group by op
const byOp = {};
for (const sys of TARGETS) {
  for (const t of loadTemplates(sys)) {
    const op = t.op;
    byOp[op] ??= {};
    byOp[op][sys] = {
      nativeName: t.nativeName ?? t.nativeKey ?? null,
      templateId: t.id ?? null,
      paramCount: Object.keys(t.parameters ?? {}).length,
    };
  }
}

// Equivalence index
const equivalence = {
  schemaVersion: "1.0.0",
  generatedAt: new Date().toISOString(),
  operationCount: Object.keys(byOp).length,
  systems: TARGETS,
  groups: byOp,
  provenance: {
    realDataOnly: true,
    sourceMilestone: "CAM-AI-TRAINING-MS0",
    sourceSlot: "kilo",
    operatorConstraint: "no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)",
  },
};

writeFileSync(join(CORPUS, "cam-cross-system-equivalence.json"), JSON.stringify(equivalence, null, 2));

// Translation LoRA tuples — for each op, every (src, dst) pair where BOTH systems have the op
const translations = [];
for (const [op, systems] of Object.entries(byOp)) {
  const present = TARGETS.filter((s) => systems[s]);
  if (present.length < 2) continue;
  for (const src of present) {
    for (const dst of present) {
      if (src === dst) continue;
      const srcMeta = systems[src];
      const dstMeta = systems[dst];
      const prompt = `In ${src} this is called "${srcMeta.nativeName}". What is the equivalent in ${dst}?`;
      const completion = JSON.stringify({
        op,
        from: { system: src, nativeName: srcMeta.nativeName, templateId: srcMeta.templateId },
        to:   { system: dst, nativeName: dstMeta.nativeName, templateId: dstMeta.templateId },
      });
      translations.push({
        messages: [
          { role: "user", content: prompt },
          { role: "assistant", content: completion },
        ],
        metadata: {
          kind: "cross-system-translation",
          op,
          fromSystem: src,
          toSystem: dst,
          provenance: equivalence.provenance,
        },
      });
    }
  }
}

writeFileSync(
  join(CORPUS, "cam-cross-system-translation.jsonl"),
  translations.map((r) => JSON.stringify(r)).join("\n") + "\n"
);

// Coverage report
const opsWithAll4 = Object.entries(byOp).filter(([, s]) => TARGETS.every((sys) => s[sys])).length;
const opsWith3 = Object.entries(byOp).filter(([, s]) => TARGETS.filter((sys) => s[sys]).length === 3).length;
const opsWith2 = Object.entries(byOp).filter(([, s]) => TARGETS.filter((sys) => s[sys]).length === 2).length;
const opsWith1 = Object.entries(byOp).filter(([, s]) => TARGETS.filter((sys) => s[sys]).length === 1).length;

writeFileSync(
  join(CORPUS, "cam-cross-system-equivalence-summary.json"),
  JSON.stringify({
    totalOps: Object.keys(byOp).length,
    opsInAllSystems: opsWithAll4,
    opsIn3Systems: opsWith3,
    opsIn2Systems: opsWith2,
    opsInOnlySystem: opsWith1,
    translationTuples: translations.length,
    generatedAt: equivalence.generatedAt,
  }, null, 2)
);

console.log(`ops=${Object.keys(byOp).length} | all-4=${opsWithAll4} | 3sys=${opsWith3} | 2sys=${opsWith2} | 1sys=${opsWith1}`);
console.log(`translation tuples: ${translations.length}`);
