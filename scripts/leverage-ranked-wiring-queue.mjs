#!/usr/bin/env node
/**
 * leverage-ranked-wiring-queue.mjs — CLI (slot:sierra, U-VIZ-LEVERAGE-QUEUE 2026-05-29).
 *
 * Emits a leverage-ranked wiring queue: unwired engine-domains ordered so the fleet wires
 * the highest-impact-per-wire targets FIRST. Reads architecture-graph.json (OOM-safe 51MB,
 * NOT the 548MB merged graph) whose L5 eng.<domain> nodes already carry the graph-computed
 * `unlocks.leverageScore` + `suggestedDispatchers`. Pure core in scripts/lib/leverage-wiring-queue.mjs.
 *
 * Output: state/shared/system-viz/LEVERAGE-WIRING-QUEUE.{json,md}
 * Flags:  --json (print json to stdout, no file write) · --graph <path>
 */
import fs from "node:fs";
import { readGraphStreaming } from "./lib/graph-io.mjs";
import { extractWiringQueue, queueTotals } from "./lib/leverage-wiring-queue.mjs";

const ROOT = process.env.PRISM_ROOT || "H:/prism";
const args = process.argv.slice(2);
const graphPath = (() => {
  const i = args.indexOf("--graph");
  return i >= 0 && args[i + 1] ? args[i + 1] : `${ROOT}/state/shared/system-viz/architecture-graph.json`;
})();
const stdoutJson = args.includes("--json");
const OUT_JSON = `${ROOT}/state/shared/system-viz/LEVERAGE-WIRING-QUEUE.json`;
const OUT_MD = `${ROOT}/state/shared/system-viz/LEVERAGE-WIRING-QUEUE.md`;

let graph;
try {
  graph = readGraphStreaming(graphPath);  // off-heap: JSON.parse(readFileSync utf8) throws at >512MiB (U-VIZ-READER-CAPSAFE 2026-06-10)
} catch (e) {
  console.error(`[leverage-queue] cannot read graph at ${graphPath}: ${e.message}`);
  process.exit(1); // fail loud (R12) — no graph, no queue
}

const rows = extractWiringQueue(graph);
const totals = queueTotals(rows);
const payload = {
  schemaVersion: "1.0.0",
  source: graphPath,
  graphGeneratedAt: graph.generatedAt || null,
  totals,
  note: "Domain-granularity leverage queue from architecture-graph L5 eng.<domain> nodes (OOM-safe). Per-engine ranking needs the 548MB merged graph. leverageScore is graph-computed (unlocks.leverageScore) or derived (unwired×dispatchersGain×downstreamHops).",
  queue: rows,
};

if (stdoutJson) {
  process.stdout.write(JSON.stringify(payload, null, 2));
  process.exit(0);
}

// Atomic write (sierra standing-focus #3: never expose a truncated viz artifact to a parallel reader).
function atomicWrite(path, data) {
  const tmp = `${path}.tmp.${process.pid}`;
  fs.writeFileSync(tmp, data);
  fs.renameSync(tmp, path);
}

atomicWrite(OUT_JSON, JSON.stringify(payload, null, 2));

const md = [];
md.push("# Leverage-ranked wiring queue (sierra)");
md.push("");
md.push(`> Wire highest-impact-per-wire FIRST. Source: \`${graphPath.replace(ROOT + "/", "")}\` (OOM-safe). Domains: ${totals.domains} · unwired engines: ${totals.unwiredEngines} · need dispatcher inference: ${totals.needInference}. Regenerate: \`node scripts/leverage-ranked-wiring-queue.mjs\`.`);
md.push("");
md.push("| # | domain | unwired | cov% | leverage | hops | suggested dispatchers |");
md.push("|---|--------|---------|------|----------|------|------------------------|");
rows.forEach((r, i) => {
  const disp = r.suggestedDispatchers.length ? r.suggestedDispatchers.join(", ") : "⚠ none — needs inference";
  md.push(`| ${i + 1} | ${r.domain} | ${r.unwired} | ${r.coverage_pct ?? "?"} | ${r.leverageScore}${r.scoreSource === "derived" ? "*" : ""} | ${r.downstreamHops ?? "?"} | ${disp} |`);
});
md.push("");
md.push("_`*` = leverage derived (graph didn't pre-compute). Per-engine refinement needs the merged graph (548MB). Cross-ref: [[reference_sierra_leverage_ranked_wiring_queue]] · `SIERRA-HIGH-LEVERAGE-OPPORTUNITIES-2026-05-29.md`._");
atomicWrite(OUT_MD, md.join("\n"));

console.log(`[leverage-queue] wrote ${totals.domains} domains (${totals.unwiredEngines} unwired engines) -> ${OUT_MD}`);
console.log("Top 5:", rows.slice(0, 5).map((r) => `${r.domain}(${r.leverageScore})`).join(" "));
