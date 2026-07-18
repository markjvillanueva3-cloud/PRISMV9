/**
 * cam-corpus-profile.mts — empirical "how JM actually programmed it" profiler.
 *
 * Runs the (FIXED, U-CAM-FEED-PER-REV) CAMFeatureExtractorEngine over a strided real
 * JM .MIN sample and aggregates the observed cutting-condition distributions — the
 * data-grounded answer to the /goal's "go over how all previous programs were written,
 * take notes on how we generated them, learn to optimize". Read-only; emits JSON to
 * stdout. Run: cd mcp-server && npx tsx scripts/cam-corpus-profile.mts [sampleSize]
 */
import * as fs from "fs";
import * as path from "path";
import { CAMFeatureExtractorEngine } from "../src/engines/CAMFeatureExtractorEngine.js";

const JM_LATHE = "H:/PRISM/JM DIE/CNC LATHE";
const SAMPLE = parseInt(process.argv[2] || "150", 10);

function pct(n: number, d: number): number {
  return d > 0 ? Math.round((1000 * n) / d) / 10 : 0;
}
function stats(xs: number[]): { n: number; min: number; median: number; max: number } {
  if (xs.length === 0) return { n: 0, min: 0, median: 0, max: 0 };
  const s = [...xs].sort((a, b) => a - b);
  return { n: s.length, min: s[0], median: s[Math.floor(s.length / 2)], max: s[s.length - 1] };
}

function main() {
  let files: string[] = [];
  try {
    files = fs.readdirSync(JM_LATHE).filter((f) => /\.MIN$/i.test(f));
  } catch (e) {
    console.log(JSON.stringify({ error: `corpus dir unreadable: ${(e as Error).message}` }));
    return;
  }
  const step = Math.max(1, Math.floor(files.length / SAMPLE));
  const sample = files.filter((_, i) => i % step === 0).slice(0, SAMPLE);
  const engine = new CAMFeatureExtractorEngine(JM_LATHE);

  let parsedOk = 0;
  const perRevFeeds: number[] = [];      // upper bound of each program's per-rev feed range
  const mmMinFeeds: number[] = [];
  const spindleMax: number[] = [];
  const unitTally: Record<string, number> = {};
  const opTotals: Record<string, number> = {};
  let withPerRev = 0;
  let withMmMin = 0;

  for (const f of sample) {
    const v = engine.extractOne(path.join(JM_LATHE, f)); // absolute path (extractOne accepts abs)
    if (!v.parsed_ok) continue;
    parsedOk++;
    const pr = v.estimated_feed_range_per_rev;
    if (pr && pr[1] > 0) { perRevFeeds.push(pr[1]); withPerRev++; }
    if (v.estimated_feed_range_mm_min[1] > 0) { mmMinFeeds.push(v.estimated_feed_range_mm_min[1]); withMmMin++; }
    if (v.estimated_spindle_range_rpm[1] > 0) spindleMax.push(v.estimated_spindle_range_rpm[1]);
    const u = v.feed_per_rev_unit ?? "none";
    unitTally[u] = (unitTally[u] ?? 0) + 1;
    for (const [k, n] of Object.entries(v.ops_by_strategy)) opTotals[k] = (opTotals[k] ?? 0) + (n as number);
  }

  console.log(JSON.stringify({
    corpus: JM_LATHE,
    sampleRequested: SAMPLE,
    sampledFiles: sample.length,
    parsedOk,
    feedCoverage: {
      withFeedPerRev: withPerRev,
      withFeedPerRev_pct: pct(withPerRev, parsedOk),
      withFeedMmMin: withMmMin,
      withFeedMmMin_pct: pct(withMmMin, parsedOk),
      note: "feed_per_rev is the native CSS-shop target; both now benefit from the 9x feed-regex fix",
    },
    feedPerRev_in_rev: stats(perRevFeeds),
    feedMmMin: stats(mmMinFeeds),
    spindleMaxRpm: stats(spindleMax),
    feedPerRevUnitTally: unitTally,
    opStrategyTotals: opTotals,
  }, null, 2));
}

main();
