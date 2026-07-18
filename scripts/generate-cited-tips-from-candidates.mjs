#!/usr/bin/env node
/**
 * generate-cited-tips-from-candidates.mjs — emits one TypeScript cited-
 * tips file per controller from the iter12 curriculum-tribal-candidates
 * JSONL. Mirrors the iter6 CitedPostTip layout under
 * mcp-server/src/data/tribal-tips/.
 *
 * @milestone POST-PDF-NODE-MS0/U-CITED-TIPS-EMIT
 * @slot echo · @iter 13 · @date 2026-05-26
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseJsonl } from "./lib/training-curriculum-query.mjs";
import {
  bucketByController,
  rankCandidatesForEmit,
  renderTipsFile,
} from "./lib/cited-tips-emitter.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CANDIDATES_JSONL = path.join(ROOT, "mcp-server/data/ingestion_cache/curriculum-tribal-candidates/jm-die-curriculum-tribal-candidates.jsonl");
const OUT_TS_DIR = path.join(ROOT, "mcp-server/src/data/tribal-tips/jm-die-curriculum");
const OUT_INDEX = path.join(OUT_TS_DIR, "index.ts");
const OUT_SPEC = path.join(ROOT, "state/shared/specs/JM-DIE-CITED-TIPS-EMITTED-2026-05-26.md");

function main() {
  if (!fs.existsSync(CANDIDATES_JSONL)) {
    console.error(`FAIL-LOUD: candidates JSONL missing: ${CANDIDATES_JSONL}`);
    console.error("Run scripts/generate-curriculum-tribal-candidates.mjs first.");
    return 2;
  }
  const text = fs.readFileSync(CANDIDATES_JSONL, "utf8");
  const cands = parseJsonl(text);
  if (cands.length === 0) {
    console.error("FAIL-LOUD: 0 candidates parsed");
    return 3;
  }

  fs.mkdirSync(OUT_TS_DIR, { recursive: true });
  const buckets = bucketByController(cands);
  const stats = { total: cands.length, controllers: 0, filesWritten: 0, byController: {} };
  const indexEntries = [];

  for (const [controller, group] of buckets.entries()) {
    if (controller === "unspecified") continue;
    const ranked = rankCandidatesForEmit(group);
    const body = renderTipsFile(controller, ranked);
    const safe = controller.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const fname = `${safe}-cited-tips.ts`;
    fs.writeFileSync(path.join(OUT_TS_DIR, fname), body);
    stats.controllers++;
    stats.filesWritten++;
    stats.byController[controller] = ranked.length;
    indexEntries.push({ controller, safe, count: ranked.length, file: fname });
  }

  const indexBody = [
    `/**`,
    ` * AUTO-GENERATED index for jm-die-curriculum cited tips.`,
    ` * Source: scripts/generate-cited-tips-from-candidates.mjs`,
    ` */`,
    ``,
    ...indexEntries.map((e) => `export { ${e.safe.toUpperCase()}_CITED_TIPS, ${e.safe.toUpperCase()}_CITED_TIPS_STATS } from "./${e.safe}-cited-tips.js";`),
    ``,
    `export const JM_DIE_CURRICULUM_CITED_TIPS_INDEX = {`,
    `  total: ${stats.total},`,
    `  controllerFiles: ${stats.filesWritten},`,
    `  byController: ${JSON.stringify(stats.byController)},`,
    `  generatedAt: "${new Date().toISOString()}",`,
    `} as const;`,
    ``,
  ].join("\n");
  fs.writeFileSync(OUT_INDEX, indexBody);
  stats.filesWritten++;

  fs.mkdirSync(path.dirname(OUT_SPEC), { recursive: true });
  const lines = [];
  lines.push(`# JM DIE curriculum cited tips — emitted TS files`);
  lines.push(``);
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push(`**Slot:** echo · **Milestone:** POST-PDF-NODE-MS0/U-CITED-TIPS-EMIT · **Iter:** 13`);
  lines.push(``);
  lines.push(`## Pipeline`);
  lines.push(`1. iter9: page-by-page curriculum`);
  lines.push(`2. iter10: query CLI + re-extraction (67 PDFs)`);
  lines.push(`3. iter11: full-body candidates (94 advanced/complex pages)`);
  lines.push(`4. iter12: content-classifier (26 controllers recovered)`);
  lines.push(`5. **iter13 (this): per-controller TypeScript cited-tip files**`);
  lines.push(``);
  lines.push(`## Headline`);
  lines.push(`- candidates parsed:    ${stats.total}`);
  lines.push(`- controller files:     ${stats.filesWritten - 1}`);
  lines.push(`- index file:           \`${path.relative(ROOT, OUT_INDEX).replace(/\\/g, "/")}\``);
  lines.push(`- output dir:           \`${path.relative(ROOT, OUT_TS_DIR).replace(/\\/g, "/")}\``);
  lines.push(``);
  lines.push(`## Per-controller emit`);
  lines.push(`| Controller | Tips | File |`);
  lines.push(`|------------|-----:|------|`);
  for (const e of indexEntries.sort((a, b) => b.count - a.count)) {
    lines.push(`| ${e.controller} | ${e.count} | ${e.file} |`);
  }
  const unspec = buckets.get("unspecified");
  if (unspec) {
    lines.push(`| (unspecified — skipped) | ${unspec.length} | — |`);
  }
  lines.push(``);
  lines.push(`## Consumer wiring`);
  lines.push(`Imports: \`import { HAAS_CITED_TIPS, MAZAK_CITED_TIPS, SIEMENS_CITED_TIPS } from "@/data/tribal-tips/jm-die-curriculum";\``);
  lines.push(`Each tip = full CitedTip object with id + sourceId + citation + page + score + body. Post-processor + classifier engines can filter by controller + difficulty + score.`);
  fs.writeFileSync(OUT_SPEC, lines.join("\n") + "\n");

  console.log(`wrote ${stats.filesWritten} files under ${OUT_TS_DIR}`);
  console.log(`  candidates parsed:  ${stats.total}`);
  console.log(`  controllers:        ${stats.controllers}`);
  console.log(`  by controller:      ${JSON.stringify(stats.byController)}`);
  console.log(`  spec:               ${OUT_SPEC}`);
  return 0;
}

process.exit(main());
