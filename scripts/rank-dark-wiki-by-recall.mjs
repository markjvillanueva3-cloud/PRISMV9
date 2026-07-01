#!/usr/bin/env node
// scripts/rank-dark-wiki-by-recall.mjs
// ------------------------------------
// U-DARK-WIKI-RANK (2026-06-09, slot:alpha). Ranks the ~32,630 DARK (unembedded)
// wiki files by RECALL DEMAND so the highest-value ones get embedded FIRST the
// instant the V8-cap write-side SHARDING lands (india/sierra). Read-only: never
// touches the wiki, the tribal index, or the V8-cap writer -- it only joins two
// existing state files and ranks paths.
//
// Inputs (both must exist -- fail loud, R12):
//   state/shared/.wiki-tribal-cross-ref-audit.json  .missingFromTribal (dark paths)
//   mcp-server/data/state/wiki-recall-counts.json   .entries (recall demand)
//
// Output:
//   state/shared/dark-wiki-recall-priority.jsonl
//     line 0: {__meta:true, generatedAt, totalDark, demandedDark, undemandedDark,
//              totalDemandedRecalls, note}
//     lines 1..N: one per DEMANDED file (tier 1), ranked DESC -- the actionable
//              priority head. Undemanded (tier 3) files are summarized by COUNT
//              only (they carry no demand signal; embed them after, any order)
//              so the artifact stays tight and decision-useful.
//
// Usage: node scripts/rank-dark-wiki-by-recall.mjs [--json] [--top N]

import { readFileSync, writeFileSync, existsSync, renameSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { rankDarkFiles, summarizeRanking } from "./lib/dark-wiki-rank.mjs";

const ROOT = "H:/prism";
const AUDIT_PATH = `${ROOT}/state/shared/.wiki-tribal-cross-ref-audit.json`;
const RECALL_PATH = `${ROOT}/mcp-server/data/state/wiki-recall-counts.json`;
const OUT_PATH = `${ROOT}/state/shared/dark-wiki-recall-priority.jsonl`;

function readJson(path, label) {
  if (!existsSync(path)) throw new Error(`${label} not found at ${path}`);
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    throw new Error(`${label} is not valid JSON: ${e && e.message ? e.message : e}`);
  }
}

export function loadInputs({ auditPath = AUDIT_PATH, recallPath = RECALL_PATH } = {}) {
  const audit = readJson(auditPath, "wiki-tribal cross-ref audit");
  const recall = readJson(recallPath, "wiki-recall-counts");
  const missing = Array.isArray(audit.missingFromTribal) ? audit.missingFromTribal : null;
  if (!missing) throw new Error("audit.missingFromTribal is not an array -- cannot rank");
  const recallByKey = recall && recall.entries && typeof recall.entries === "object" ? recall.entries : {};
  return { missing, recallByKey, auditStats: audit.stats || null, totalRecalls: recall.totalRecalls || 0 };
}

async function main() {
  const args = process.argv.slice(2);
  const asJson = args.includes("--json");
  const topIdx = args.indexOf("--top");
  const top = topIdx >= 0 ? Math.max(1, parseInt(args[topIdx + 1], 10) || 50) : 50;

  let inputs;
  try {
    inputs = loadInputs();
  } catch (e) {
    console.error(`[rank-dark-wiki] ${e.message}`);
    process.exit(3);
  }

  const nowMs = Date.now();
  const ranked = rankDarkFiles({ missing: inputs.missing, recallByKey: inputs.recallByKey, nowMs });
  const summary = summarizeRanking(ranked);
  const demanded = ranked.filter((r) => r.tier === 1);

  // Write the artifact: meta + the demanded (actionable) head.
  const meta = {
    __meta: true,
    generatedAt: new Date(nowMs).toISOString(),
    totalDark: summary.totalDark,
    demandedDark: summary.demandedDark,
    undemandedDark: summary.undemandedDark,
    totalDemandedRecalls: summary.totalDemandedRecalls,
    coverage: inputs.auditStats ? inputs.auditStats.coverage : null,
    note: "Demanded (tier 1, recallCount>0) files listed below ranked DESC -- embed FIRST when V8-cap sharding lands. The " +
      `${summary.undemandedDark} undemanded files carry no recall signal (embed after, any order).`,
  };
  const lines = [JSON.stringify(meta), ...demanded.map((r) => JSON.stringify(r))];
  const tmp = `${OUT_PATH}.${process.pid}.${nowMs}.tmp`;
  writeFileSync(tmp, lines.join("\n") + "\n");
  renameSync(tmp, OUT_PATH);

  if (asJson) {
    console.log(JSON.stringify({ summary, out: OUT_PATH, top: demanded.slice(0, top) }, null, 2));
  } else {
    console.log(`[rank-dark-wiki] ${summary.totalDark} dark wiki files; ${summary.demandedDark} are DEMANDED (recalled but unembedded), carrying ${summary.totalDemandedRecalls} recalls.`);
    console.log(`[rank-dark-wiki] -> ${OUT_PATH} (${demanded.length} priority entries)`);
    console.log(`[rank-dark-wiki] top ${Math.min(top, demanded.length)} demanded-but-dark:`);
    for (const r of demanded.slice(0, top)) {
      console.log(`  ${String(r.recallCount).padStart(4)} recalls  ${r.relPath}`);
    }
    if (!demanded.length) console.log("  (none -- every recalled wiki file is already embedded; dark set is pure long-tail)");
  }
  return 0;
}

const INVOKED_DIRECTLY =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1].replace(/\\/g, "/");
if (INVOKED_DIRECTLY || (process.argv[1] && process.argv[1].endsWith("rank-dark-wiki-by-recall.mjs"))) {
  void main().catch((e) => {
    console.error(`[rank-dark-wiki] fatal: ${e && e.stack ? e.stack : e}`);
    process.exit(1);
  });
}
