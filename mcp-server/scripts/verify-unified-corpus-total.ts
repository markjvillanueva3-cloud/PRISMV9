/**
 * verify-unified-corpus-total.ts -- definitive count of the UNIFIED ToolCatalogEngine corpus
 * (U-DBCON-1 G1, slot:romeo 2026-06-12).
 *
 * Answers the operator's question ("we should have way more than 62.7k tools"): the 62.7K
 * figure was only the CATALOG_INDEX *-extracted.json slice. The real unified corpus is the
 * union of (a) the standard .ts-getter vendors loaded in ToolCatalogEngine's constructor and
 * (b) the CATALOG_INDEX corpus fed via CatalogCorpusLoaderEngine.load() -> addTools()
 * (dedup-by-id). This measures both, and surfaces the dedup signal (added vs duplicates) that
 * G1 flagged as the correctness risk: if a standard vendor and its *-extracted.json sibling use
 * INCOMPATIBLE ids, the same physical tool double-counts instead of colliding.
 *
 * Usage: cd mcp-server && npx tsx scripts/verify-unified-corpus-total.ts
 */
import { toolCatalogEngine } from "../src/engines/ToolCatalogEngine.js";
import { catalogCorpusLoaderEngine } from "../src/engines/CatalogCorpusLoaderEngine.js";

function line(s = "") { console.log(s); }

const before = toolCatalogEngine.stats();
line("=== UNIFIED TOOL CORPUS VERIFICATION (U-DBCON-1 G1) ===");
line(`standard tools (.ts getters, loaded in constructor): ${before.total_tools}`);
line("");

const t0 = Date.now();
const res = catalogCorpusLoaderEngine.load();
const dt = ((Date.now() - t0) / 1000).toFixed(1);

const after = toolCatalogEngine.stats();
line(`corpus load: ${dt}s  ok=${res.ok}  filesProcessed=${res.filesProcessed}  filesFailed=${res.filesFailed}`);
line(`  toolsNormalized=${res.toolsNormalized}  added=${res.added}  duplicates=${res.duplicates}  skipped=${res.skipped}`);
line(`  declaredTotal (CATALOG_INDEX manifest): ${res.declaredTotal}`);
line("");
line(`>>> UNIFIED total_tools (standard + corpus, dedup-by-id): ${after.total_tools}`);
line(`    corpus contribution: +${after.total_tools - before.total_tools} unique (of ${res.toolsNormalized} normalized; ${res.duplicates} were dup ids)`);
line("");
line(`by_type: ${JSON.stringify(after.by_type)}`);
line(`manufacturers: ${Object.keys(after.by_manufacturer).length}  holders: ${after.holders}  speed_feed_entries: ${after.speed_feed_entries}`);
line("");

// G1 dedup signal -- per-manufacturer declared vs normalized (top 15 by |delta|).
line("top reconciliation deltas (declared CATALOG_INDEX vs normalized at load):");
for (const r of res.reconciliation.slice(0, 15)) {
  line(`  ${r.manufacturer.padEnd(18)} declared=${String(r.declared).padStart(6)}  normalized=${String(r.normalized).padStart(6)}  delta=${r.delta}`);
}
line("");

// Top manufacturers in the final unified corpus.
const topMfr = Object.entries(after.by_manufacturer).sort((a, b) => b[1] - a[1]).slice(0, 15);
line("top manufacturers in unified corpus:");
for (const [m, n] of topMfr) line(`  ${m.padEnd(18)} ${String(n).padStart(7)}`);

if (res.errors.length) {
  line("");
  line(`ERRORS (${res.errors.length}):`);
  for (const e of res.errors) line("  " + e);
}
