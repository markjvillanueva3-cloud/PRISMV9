#!/usr/bin/env node
/**
 * memory-provider-status.mjs -- CLI consumer of the memory-provider registry.
 *
 * AGENTIC-SUBSTRATE-BRIDGE/U-MEM-PROVIDER-REGISTRY-WIRE (slot:bravo 2026-06-14).
 *
 * Gives the previously-orphaned MemoryProvider framework (U-MWO05) a live consumer (R15):
 * lists every registered provider + its memory footprint via the registry's aggregateStats.
 * The `combined` total is a naive sum (obsidian-feed/receipt share a read source -> double-count);
 * the per-provider rows are the honest view. Fail-soft per provider (a broken stats() shows ERROR,
 * never aborts the run).
 *
 * Usage:
 *   node scripts/memory-provider-status.mjs            # text report
 *   node scripts/memory-provider-status.mjs --json     # machine-readable
 */
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { buildRegistry, aggregateStats, defaultProviders } from "./memory-providers/memory-provider-registry.mjs";

const MB = 1048576;

/**
 * Pure: render the status report from an aggregateStats() result + skipped list.
 * Exported for tests (the IO half lives in buildStatusReport). Never throws.
 */
export function formatStatusReport(agg, skipped = [], { wantJson = false } = {}) {
  const a = agg && typeof agg === "object" ? agg : { providers: [], combinedCount: 0, combinedBytes: 0, providerCount: 0 };
  if (wantJson) return JSON.stringify({ ...a, skipped }, null, 2);
  const lines = ["PRISM memory-provider status", ""];
  for (const p of a.providers ?? []) {
    if (p.error) { lines.push(`  ${p.name}: ERROR ${p.error}`); continue; }
    lines.push(`  ${p.name}: ${p.count} entries, ${((p.totalBytes || 0) / MB).toFixed(2)} MB${p.lastSync ? `, lastSync ${p.lastSync}` : ""}`);
  }
  lines.push("");
  lines.push(`combined (naive, may double-count shared sources): ${a.combinedCount || 0} entries, ${((a.combinedBytes || 0) / MB).toFixed(2)} MB across ${a.providerCount || 0} provider(s)`);
  if ((skipped ?? []).length) lines.push(`skipped (non-conformant): ${skipped.map((s) => s.name).join(", ")}`);
  return lines.join("\n");
}

export async function buildStatusReport({ wantJson = false } = {}) {
  const { registry, skipped } = buildRegistry(defaultProviders());
  const agg = await aggregateStats(registry);
  return formatStatusReport(agg, skipped, { wantJson });
}

async function main() {
  const wantJson = process.argv.includes("--json");
  process.stdout.write((await buildStatusReport({ wantJson })) + "\n");
}

const isMain = (() => {
  try { return process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url); }
  catch { return false; }
})();
if (isMain) main().catch((e) => { process.stderr.write(String((e && e.message) || e) + "\n"); process.exitCode = 1; });
