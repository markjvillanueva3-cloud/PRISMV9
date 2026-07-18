#!/usr/bin/env node
/**
 * training-curriculum-query.mjs — CLI for querying the iter9 training
 * curriculum JSONL emitted by generate-training-curriculum.mjs.
 *
 * Examples:
 *   node scripts/training-curriculum-query.mjs --difficulty=easy --limit=5
 *   node scripts/training-curriculum-query.mjs --domain=mill --controller=haas
 *   node scripts/training-curriculum-query.mjs --min-score=4 --max-score=10
 *   node scripts/training-curriculum-query.mjs --bottom=true --limit=10
 *   node scripts/training-curriculum-query.mjs --summary
 *
 * @milestone POST-PDF-NODE-MS0/U-JM-TRAINING-CURRICULUM-QUERY
 * @slot echo · @iter 10 · @date 2026-05-26
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadCurriculum,
  filterRecords,
  topN,
  bottomN,
  summarize,
  parseCriteriaArgv,
} from "./lib/training-curriculum-query.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DEFAULT_PATH = path.join(ROOT, "mcp-server/data/ingestion_cache/training-curriculum/jm-die-easy-to-complex.jsonl");

function main() {
  const argv = process.argv.slice(2);
  const criteria = parseCriteriaArgv(argv);
  const wantSummary = argv.includes("--summary");
  const wantJson = argv.includes("--json");
  const wantHelp = argv.includes("--help") || argv.includes("-h");
  const filePath = criteria.file ? path.resolve(criteria.file) : DEFAULT_PATH;

  if (wantHelp) {
    console.log("Usage: node training-curriculum-query.mjs [options]");
    console.log("  --domain=mill|cam|post|wire|reference (comma-list ok)");
    console.log("  --controller=haas|okuma|hurco|... (comma-list ok)");
    console.log("  --difficulty=unscored|easy|intermediate|advanced|complex (comma-list ok)");
    console.log("  --min-score=N  --max-score=N");
    console.log("  --filename=substring");
    console.log("  --limit=N (default 10)");
    console.log("  --bottom=true (return hardest N instead of easiest N)");
    console.log("  --summary (print stats only, no records)");
    console.log("  --json (print result as JSON)");
    console.log("  --file=PATH (override default JSONL location)");
    return 0;
  }

  const all = loadCurriculum(filePath);
  if (all.length === 0) {
    console.error(`FAIL-LOUD: no records loaded from ${filePath}`);
    console.error("Run scripts/generate-training-curriculum.mjs first.");
    return 2;
  }

  if (wantSummary) {
    const s = summarize(all);
    if (wantJson) { console.log(JSON.stringify(s, null, 2)); return 0; }
    console.log(`Total records: ${s.total}`);
    console.log(`By difficulty:`);
    for (const [k, v] of Object.entries(s.byDifficulty)) console.log(`  ${k.padEnd(14)} ${v}`);
    console.log(`By domain:`);
    for (const [k, v] of Object.entries(s.byDomain).sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(14)} ${v}`);
    if (Object.keys(s.byController).length > 0) {
      console.log(`By controller:`);
      for (const [k, v] of Object.entries(s.byController).sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(14)} ${v}`);
    }
    return 0;
  }

  const filtered = filterRecords(all, criteria);
  const limit = Number.isInteger(criteria.limit) && criteria.limit > 0 ? criteria.limit : 10;
  const window = criteria.bottom ? bottomN(filtered, limit) : topN(filtered, limit);

  if (wantJson) {
    console.log(JSON.stringify(window, null, 2));
    return 0;
  }

  console.log(`File:      ${filePath}`);
  console.log(`Total:     ${all.length}`);
  console.log(`Filtered:  ${filtered.length}`);
  console.log(`Showing:   ${window.length} (${criteria.bottom ? "hardest" : "easiest"})`);
  console.log("");
  console.log("rank  difficulty    score   domain      controller   filename · page");
  console.log("----  ------------  ------  ----------  -----------  --------------------------------");
  for (const r of window) {
    const rank = String(r.rank).padStart(4);
    const dif = String(r.difficulty || "").padEnd(12);
    const sc = String(r.score ?? "").padStart(6);
    const dom = String(r.domain || "").padEnd(10);
    const ctl = String(r.controller || "-").padEnd(11);
    const fp = `${r.filename} · p${r.pageNum}`;
    console.log(`${rank}  ${dif}  ${sc}  ${dom}  ${ctl}  ${fp}`);
  }
  return 0;
}

process.exit(main());
