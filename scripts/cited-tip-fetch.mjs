#!/usr/bin/env node
/**
 * cited-tip-fetch.mjs — CLI wrapper for the cited-tip runtime fetcher.
 *
 * Examples:
 *   node scripts/cited-tip-fetch.mjs --controller=mazak --limit=5
 *   node scripts/cited-tip-fetch.mjs --keyword=macro --min-difficulty=advanced
 *   node scripts/cited-tip-fetch.mjs --controller=siemens --min-score=4 --json
 *
 * @milestone POST-PDF-NODE-MS0/U-CITED-TIP-FETCHER-CLI
 * @slot echo · @iter 16 · @date 2026-05-26
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadTipsFromJsonl,
  fetchTips,
  defaultJsonlPath,
} from "./lib/cited-tip-fetcher.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function parseArgs(argv) {
  const out = { _flags: new Set() };
  for (let i = 0; i < argv.length; i++) {
    const a = String(argv[i]);
    const eq = a.match(/^--([a-zA-Z][a-zA-Z0-9-]*)=(.*)$/);
    if (eq) { out[eq[1]] = eq[2]; continue; }
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) { out._flags.add(key); out[key] = true; }
      else { out[key] = next; i++; }
    }
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args._flags.has("help") || args._flags.has("h")) {
    console.log("Usage: node scripts/cited-tip-fetch.mjs [options]");
    console.log("  --controller=<haas|mazak|okuma|siemens|fanuc|hurco>");
    console.log("  --min-difficulty=<easy|intermediate|advanced|complex>");
    console.log("  --domain=<mill|cam|post|wire|reference>");
    console.log("  --keyword=<substring>  (case-insensitive body search)");
    console.log("  --min-score=N  --max-score=N");
    console.log("  --limit=N  (default 10)");
    console.log("  --file=PATH  (override default JSONL location)");
    console.log("  --json  (emit JSON instead of table)");
    return 0;
  }

  const filePath = args.file ? path.resolve(args.file) : defaultJsonlPath(ROOT);
  const tips = loadTipsFromJsonl(filePath);
  if (tips.length === 0) {
    console.error(`FAIL-LOUD: no tips loaded from ${filePath}`);
    console.error("Run scripts/generate-curriculum-tribal-candidates.mjs first.");
    return 2;
  }

  const criteria = {};
  if (args.controller) criteria.controller = args.controller;
  if (args["min-difficulty"]) criteria.minDifficulty = args["min-difficulty"];
  if (args.domain) criteria.domain = args.domain;
  if (args.keyword) criteria.keyword = args.keyword;
  if (args["min-score"] !== undefined) criteria.minScore = Number(args["min-score"]);
  if (args["max-score"] !== undefined) criteria.maxScore = Number(args["max-score"]);
  criteria.limit = args.limit ? Number(args.limit) : 10;

  const matches = fetchTips(tips, criteria);
  const isJson = args.json || args._flags.has("json");

  if (isJson) {
    console.log(JSON.stringify(matches, null, 2));
    return 0;
  }

  console.log(`File:       ${filePath}`);
  console.log(`Total:      ${tips.length}`);
  console.log(`Matches:    ${matches.length}`);
  console.log(`Criteria:   ${JSON.stringify(criteria)}`);
  console.log("");
  console.log("difficulty    score  controller   domain      citation");
  console.log("------------  -----  -----------  ----------  --------------------------------");
  for (const t of matches) {
    const dif = String(t.difficulty || "").padEnd(12);
    const sc = String(t.score ?? "").padStart(5);
    const ctl = String(t.controller || "-").padEnd(11);
    const dom = String(t.domain || "").padEnd(10);
    console.log(`${dif}  ${sc}  ${ctl}  ${dom}  ${t.citation}`);
  }
  return 0;
}

process.exit(main());
