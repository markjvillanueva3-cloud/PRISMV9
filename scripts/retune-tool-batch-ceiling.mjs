#!/usr/bin/env node
/**
 * retune-tool-batch-ceiling.mjs — recompute the self-tuned tool-batch ceiling on demand.
 *
 * U-HKA10 of HOOKS-AUTOMATION-V2-MS0 — the periodic "recompute the ceiling" job
 * (loop_schedule: 7d). The post-tool-batch-budget.mjs hook already self-tunes every
 * ~200 calls; this is the heavier on-demand recompute (reads the FULL samples file,
 * not just the last 500) intended for `/loop --interval 7d "node scripts/retune-tool-batch-ceiling.mjs"`.
 *
 * Reads .claude/cache/tool-batch-samples.jsonl (window-count samples written by the hook)
 * and rewrites .claude/cache/tool-batch-recommendation.json with recommendCeiling(samples).
 * Advisory only — it never edits settings.json; if you want the recommendation pinned, set
 * PRISM_TOOL_BATCH_CEILING from the printed value.
 *
 * Run:  node scripts/retune-tool-batch-ceiling.mjs            (human report; writes the recommendation)
 *       node scripts/retune-tool-batch-ceiling.mjs --json     (machine output)
 *       node scripts/retune-tool-batch-ceiling.mjs --dry-run  (compute + print, don't write)
 */

import * as fs from "node:fs";
import * as path from "node:path";

import { recommendCeiling, samplesPath, recommendationPath } from "../.claude/hooks/post-tool-batch-budget.mjs";

function readSamples(file) {
  const counts = [];
  let raw = "";
  try { raw = fs.readFileSync(file, "utf8"); } catch { return counts; }
  for (const ln of raw.split("\n")) {
    const s = ln.trim();
    if (!s.startsWith("{")) continue;
    try { const j = JSON.parse(s); if (Number.isFinite(j.count) && j.count >= 0) counts.push(j.count); } catch { /* ignore */ }
  }
  return counts;
}

function basicStats(xs) {
  if (xs.length === 0) return { n: 0 };
  const s = [...xs].sort((a, b) => a - b);
  const at = (q) => s[Math.min(s.length - 1, Math.max(0, Math.ceil(q * s.length) - 1))];
  return { n: s.length, min: s[0], p50: at(0.5), p90: at(0.9), p99: at(0.99), max: s[s.length - 1] };
}

export function retune({ env = process.env, dryRun = false } = {}) {
  const sf = samplesPath(env);
  const rp = recommendationPath(env);
  const samples = readSamples(sf);
  const ceiling = recommendCeiling(samples);
  const stats = basicStats(samples);
  const rec = { ceiling, computedAt: Date.now(), sampleCount: samples.length, stats, source: "retune-tool-batch-ceiling.mjs" };
  if (!dryRun) {
    try {
      fs.mkdirSync(path.dirname(rp), { recursive: true });
      const tmp = rp + "." + process.pid + ".tmp";
      fs.writeFileSync(tmp, JSON.stringify(rec, null, 2));
      fs.renameSync(tmp, rp);
    } catch (e) { rec.writeError = (e && e.message) || String(e); }
  }
  return { ...rec, samplesFile: sf, recommendationFile: rp, wrote: !dryRun && !rec.writeError };
}

function main() {
  const json = process.argv.includes("--json");
  const dryRun = process.argv.includes("--dry-run");
  const r = retune({ dryRun });
  if (json) { process.stdout.write(JSON.stringify(r, null, 2) + "\n"); return; }
  const lines = [
    `tool-batch ceiling retune`,
    `  samples:        ${r.sampleCount} (from ${r.samplesFile})`,
    r.sampleCount ? `  observed hourly counts:  min ${r.stats.min} · p50 ${r.stats.p50} · p90 ${r.stats.p90} · p99 ${r.stats.p99} · max ${r.stats.max}` : `  observed hourly counts:  (none yet — the hook hasn't recorded any samples)`,
    `  recommended ceiling:  ${r.ceiling}  (~p90 × 1.4, clamped to [100, 20000])`,
    `  ${r.wrote ? `written to ${r.recommendationFile}` : (dryRun ? "(dry-run — not written)" : `NOT written: ${r.writeError || "?"}`)}`,
    ``,
    `  The post-tool-batch-budget hook reads PRISM_TOOL_BATCH_CEILING env first, else this file,`,
    `  else 800. To pin it, set PRISM_TOOL_BATCH_CEILING=${r.ceiling} in settings.json env.`,
  ];
  process.stdout.write(lines.join("\n") + "\n");
}

const invokedDirectly = (() => {
  try { return path.resolve(process.argv[1] || "").endsWith("retune-tool-batch-ceiling.mjs"); }
  catch { return false; }
})();
if (invokedDirectly) main();
