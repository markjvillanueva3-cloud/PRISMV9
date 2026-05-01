#!/usr/bin/env node
/**
 * generate-svi-target-breakdown.mjs — SVI per-target opportunity breakdown
 *
 * Reads state/shared/SVI.json and emits state/shared/SVI_TARGET_BREAKDOWN.json
 * with per-subsystem reachability deltas, gap sizes, opportunity scores, and
 * the top-ranked unreached variability. Feeds Tier-1 SessionStart context so
 * every session starts with a fresh "where is the dormant capability" map.
 *
 * Opportunity score = (1 - wired_pct/100) * log10(variability + 1)
 *   → favours BIG underutilized subsystems over tiny fully-wired ones
 *   → log-scales variability so 10^6 tools don't swamp 10^3 formulas
 *
 * Emitted schema (v1):
 *   {
 *     schemaVersion: 1,
 *     generatedAt: ISO,
 *     psi: number,              // from SVI.json reachability %
 *     psiTrend: "growing"|"shrinking"|"stable",
 *     psiDelta: number,
 *     subsystems: [
 *       { name, category, variability, reachable, wiredPct, gap,
 *         opportunityScore, growthSinceLast, rank }
 *     ],
 *     pipelines: [ { name, stages, reachabilityScore, bottleneck } ],
 *     topOpportunities: [ { target, action, potentialPsiGain } ],
 *     dormantMask: string[]    // subsystems with wired_pct < 40
 *   }
 *
 * Usage: node generate-svi-target-breakdown.mjs [--out=path]
 * @milestone USSH-OPUS47-BOLSTER U-CTX03
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = "H:\\prism";
const SVI_PATH = path.join(ROOT, "state", "shared", "SVI.json");
const WATCH_PATH = path.join(ROOT, "state", "shared", "SVI-watch-status.json");
const DEFAULT_OUT = path.join(ROOT, "state", "shared", "SVI_TARGET_BREAKDOWN.json");

function parseArgs(argv) {
  const out = { outPath: DEFAULT_OUT };
  for (const a of argv.slice(2)) {
    if (a.startsWith("--out=")) out.outPath = a.slice("--out=".length);
  }
  return out;
}

function opportunityScore(variability, wiredPct) {
  const underutilized = Math.max(0, 1 - (wiredPct ?? 0) / 100);
  const scale = Math.log10(Math.max(1, variability ?? 0) + 1);
  return Math.round(underutilized * scale * 1000) / 1000;
}

function dormant(wiredPct) {
  return (wiredPct ?? 0) < 40;
}

function deriveAction(sub) {
  const wired = sub.wired_pct ?? 0;
  if (wired < 30) return `wire ${sub.name.toLowerCase()} into ${sub.category} pipeline — massive dormant capacity`;
  if (wired < 50) return `half-wired ${sub.name.toLowerCase()}: audit existing consumers, expand dispatcher coverage`;
  if (wired < 70) return `${sub.name.toLowerCase()} well-integrated — target remaining ${(100 - wired).toFixed(0)}% via edge cases`;
  return `${sub.name.toLowerCase()} near-ceiling — low ROI unless net-new dimensions added`;
}

function bottleneckPipeline(pipelines) {
  const sorted = [...pipelines].sort((a, b) => (a.reachability_score ?? 1) - (b.reachability_score ?? 1));
  return sorted[0]?.name ?? null;
}

async function readOrNull(p) {
  try { return JSON.parse(await fs.readFile(p, "utf8")); } catch { return null; }
}

async function main() {
  const { outPath } = parseArgs(process.argv);
  const svi = await readOrNull(SVI_PATH);
  if (!svi) {
    process.stderr.write(`[svi-breakdown] cannot read ${SVI_PATH}\n`);
    process.exit(2);
  }
  const watch = await readOrNull(WATCH_PATH);

  const subs = (svi.subsystems ?? []).map((s) => {
    const variability = s.variability ?? 0;
    const reachable = s.reachable ?? 0;
    const wiredPct = s.wired_pct ?? 0;
    return {
      name: s.name,
      category: s.category,
      entities: s.entities ?? 0,
      dimensions: s.dimensions ?? 0,
      variability,
      reachable,
      wiredPct,
      gap: Math.max(0, variability - reachable),
      opportunityScore: opportunityScore(variability, wiredPct),
      growthSinceLast: s.growth_since_last ?? 0,
      rank: 0,
    };
  });
  subs.sort((a, b) => b.opportunityScore - a.opportunityScore);
  subs.forEach((s, i) => { s.rank = i + 1; });

  const pipelines = (svi.pipelines ?? []).map((p) => ({
    name: p.name,
    stages: p.stages ?? 0,
    registries: (p.registries_connected ?? []).length,
    formulas: p.physics_formulas_used ?? 0,
    dialects: p.controller_dialects ?? 0,
    reachabilityScore: p.reachability_score ?? 0,
  }));
  pipelines.sort((a, b) => a.reachabilityScore - b.reachabilityScore);

  const topReachable = subs.reduce((a, s) => a + s.reachable, 0);
  const topVariability = subs.reduce((a, s) => a + s.variability, 0);
  const psi = topVariability > 0 ? topReachable / topVariability : 0;

  const psiTrend = watch?.trend ?? "unknown";
  const psiDelta = typeof watch?.delta === "number" ? watch.delta : 0;

  const topOpportunities = subs.slice(0, 5).map((s) => ({
    target: s.name,
    category: s.category,
    wiredPct: s.wiredPct,
    action: deriveAction(s),
    potentialPsiGain: Math.round(((s.gap * 1.0) / Math.max(1, topVariability)) * 10000) / 10000,
  }));

  const dormantMask = subs.filter((s) => dormant(s.wiredPct)).map((s) => s.name);

  const bottleneck = bottleneckPipeline(svi.pipelines ?? []);

  const out = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    psi: Math.round(psi * 10000) / 10000,
    psiPercent: Math.round(psi * 10000) / 100,
    psiTrend,
    psiDelta,
    bottleneckPipeline: bottleneck,
    subsystems: subs,
    pipelines,
    topOpportunities,
    dormantMask,
    summary: {
      totalSubsystems: subs.length,
      dormantCount: dormantMask.length,
      totalVariability: topVariability,
      totalReachable: Math.round(topReachable),
      hugeGap: subs[0]?.name ?? null,
      hugeGapScore: subs[0]?.opportunityScore ?? 0,
    },
  };

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(out, null, 2));
  process.stdout.write(JSON.stringify({
    ok: true,
    outPath,
    psi: out.psi,
    dormantCount: dormantMask.length,
    topOpportunity: topOpportunities[0] ?? null,
    sizeBytes: (await fs.stat(outPath)).size,
  }, null, 2) + "\n");
}

main().catch((err) => {
  process.stderr.write(`[svi-breakdown] error: ${err?.message ?? err}\n`);
  process.exit(1);
});
