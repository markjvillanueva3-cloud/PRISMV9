/**
 * mine-corpus-patterns.ts — Mine learning patterns from the saved corpus
 * manifest (8,953 JM Die + Resources CAD files), write insights, and
 * apply recovered classifications back to the manifest.
 *
 * Run: npx tsx mcp-server/scripts/mine-corpus-patterns.ts
 */
import { cadCorpusIngestionEngine } from "../src/engines/CADCorpusIngestionEngine.js";
import { cadCorpusPatternEngine } from "../src/engines/CADCorpusPatternEngine.js";
import * as fs from "node:fs";

const MANIFEST_PATH = "H:/prism/mcp-server/data/state/cad-corpus-manifest.json";
const INSIGHTS_PATH = "H:/prism/mcp-server/data/state/cad-corpus-insights.json";
const RECOVERED_MANIFEST_PATH = "H:/prism/mcp-server/data/state/cad-corpus-manifest-recovered.json";

function fmtBytes(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} MB`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} KB`;
  return `${n} B`;
}

async function main(): Promise<void> {
  const manifest = cadCorpusIngestionEngine.loadManifest(MANIFEST_PATH);
  if (!manifest) {
    console.error(`No manifest found at ${MANIFEST_PATH}. Run ingest-cad-corpus.ts first.`);
    process.exit(1);
  }

  console.log(`── Mining patterns from ${manifest.total_entries.toLocaleString("en-US")} CAD files ──\n`);

  const insights = cadCorpusPatternEngine.mine(manifest);
  fs.writeFileSync(INSIGHTS_PATH, JSON.stringify(insights, null, 2), "utf8");

  console.log(`Initial classification rate: ${insights.classified_pct}%`);
  console.log(`\nTop 20 naming tokens (frequency):`);
  for (const t of insights.top_tokens.slice(0, 20)) {
    const top3 = t.by_class.slice(0, 3).map((c) => `${c.class}=${c.count}`).join(", ");
    console.log(`  ${t.token.padEnd(20)} ${t.count.toString().padStart(5)}   [${top3}]`);
  }

  console.log(`\nFile-size distribution per part class (median, p90):`);
  for (const s of insights.size_stats.slice(0, 12)) {
    console.log(
      `  ${s.class.padEnd(22)} n=${s.count.toString().padStart(5)}   med=${fmtBytes(s.median_bytes).padStart(8)}   p90=${fmtBytes(s.p90_bytes).padStart(8)}`,
    );
  }

  console.log(`\nRecovered ${insights.recovered.length.toLocaleString("en-US")} previously-unclassified entries:`);
  const recoveryByClass = new Map<string, number>();
  for (const r of insights.recovered) {
    recoveryByClass.set(r.recovered_class, (recoveryByClass.get(r.recovered_class) ?? 0) + 1);
  }
  for (const [cls, cnt] of [...recoveryByClass.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cls.padEnd(22)} ${cnt.toString().padStart(5)}`);
  }

  console.log(`\nTop 15 source-bucket affinities (directory → dominant class):`);
  for (const a of insights.bucket_affinity.slice(0, 15)) {
    console.log(`  ${a.bucket.padEnd(40).slice(0, 40)} → ${a.dominant_class.padEnd(22)} (n=${a.count})`);
  }

  // Apply recoveries back into the manifest and report new classification rate.
  const recoveredManifest = cadCorpusPatternEngine.applyRecoveries(manifest, insights.recovered);
  cadCorpusIngestionEngine.saveManifest(recoveredManifest, RECOVERED_MANIFEST_PATH);
  const newRate = cadCorpusPatternEngine.classifiedPercentage(recoveredManifest);
  console.log(`\n── After Recovery ──`);
  console.log(`Classification rate: ${insights.classified_pct}% → ${newRate}%   (Δ = +${(newRate - insights.classified_pct).toFixed(1)}%)`);

  console.log(`\nNew per-class counts (top 15):`);
  const sortedCounts = Object.entries(recoveredManifest.by_class).sort((a, b) => (b[1] as number) - (a[1] as number));
  for (const [cls, cnt] of sortedCounts.slice(0, 15)) {
    console.log(`  ${cls.padEnd(22)} ${(cnt as number).toString().padStart(7)}`);
  }

  console.log(`\n✓ Insights saved to:           ${INSIGHTS_PATH}`);
  console.log(`✓ Recovered manifest saved to: ${RECOVERED_MANIFEST_PATH}`);
}

main().catch((e: unknown) => {
  console.error("MINE CRASHED:", e instanceof Error ? e.stack : e);
  process.exit(2);
});
