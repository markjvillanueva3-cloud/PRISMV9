/**
 * generate-fullcorpus-hypermill.ts
 * [FULLCORPUS-CAM]/U-FULLCORPUS-HYPERMILL (slot:romeo)
 *
 * Operator directive 2026-06-15 (ALL MEANS ALL, cross-galaxy permission): export the
 * COMPLETE unified tool corpus -- every tool body + insert + tooling (118,409 tools) --
 * to a hyperMILL .hmt SQLite tool database, with per-ISO material cutting factors and
 * per-tool assembled holders (NCTools). NOT the 218-tool JM crib; the WHOLE database.
 *
 * Closes the silent ALL-MEANS-ALL shortfall in HyperMillToolExportEngine: its empty-tools
 * fallback caps at max_tools ?? 100_000, which is < the 118,409 corpus (18,409 tools would
 * be dropped). This generator feeds the full search() array AND asserts
 * result.tool_count === corpus length, failing loud (exit 1) on any shortfall.
 *
 * Output (gitignored -- ~50MB): FULLCORPUS.hmt.sql. Committed: this generator + the
 * ledger (counts) + a HEAD sample.
 *
 * Run: cd mcp-server && npx tsx scripts/generate-fullcorpus-hypermill.ts
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { toolCatalogEngine } from "../src/engines/ToolCatalogEngine.js";
import { hyperMillToolExportEngine } from "../src/engines/HyperMillToolExportEngine.js";
import { catalogCorpusLoaderEngine } from "../src/engines/CatalogCorpusLoaderEngine.js";

const OUT_DIR = "H:/prism/state/shared/fullcorpus-cam-libraries/hypermill";
const NO_CAP = 1_000_000; // safely above the 118,409 corpus so nothing is sliced off

function main(): void {
  // Ensure the *-extracted.json corpus is folded into the catalog (idempotent).
  catalogCorpusLoaderEngine.load();

  // Enumerate ALL tools (search with no filter returns every this.tools.values() entry,
  // then slices to max_results -- NO_CAP keeps the whole corpus).
  const allTools = toolCatalogEngine.search({ max_results: NO_CAP });
  const corpusTotal = allTools.length;
  console.log(`[fullcorpus-hypermill] corpus tools enumerated: ${corpusTotal}`);
  if (corpusTotal < 100_000) {
    console.error(`[fullcorpus-hypermill] FATAL: only ${corpusTotal} tools -- corpus not loaded (expected ~118,409). Aborting.`);
    process.exit(1);
  }

  // Export the FULL array (not the capped fallback). max_tools lifted above corpus size.
  const result = hyperMillToolExportEngine.exportToHMT(allTools, {
    max_tools: NO_CAP,
    include_materials: true,
    include_nctool: true,
    include_depot: true,
  });

  // ALL MEANS ALL: every enumerated tool MUST be in the export. Fail loud on any shortfall.
  if (result.tool_count !== corpusTotal) {
    console.error(
      `[fullcorpus-hypermill] ALL-MEANS-ALL VIOLATION: exported ${result.tool_count} != corpus ${corpusTotal} (${corpusTotal - result.tool_count} dropped). Aborting.`,
    );
    process.exit(1);
  }

  const sql = [result.sqlite_schema, "", ...result.insert_statements].join("\n");

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, "FULLCORPUS.hmt.sql"), sql, "utf-8");

  const byType: Record<string, number> = {};
  for (const t of allTools) {
    const ty = String((t as { type?: string }).type ?? "?");
    byType[ty] = (byType[ty] ?? 0) + 1;
  }

  const ledger = {
    schemaVersion: "1.0.0",
    generator: "generate-fullcorpus-hypermill.ts",
    milestone: "FULLCORPUS-CAM/U-FULLCORPUS-HYPERMILL",
    slot: "romeo",
    target: "hyperMILL .hmt SQLite tool database",
    corpus_tools_enumerated: corpusTotal,
    tools_exported: result.tool_count,
    all_means_all_ok: result.tool_count === corpusTotal,
    insert_statement_count: result.insert_statements.length,
    sql_bytes: sql.length,
    materials_iso_groups: 6,
    holders_embedded_in_nctools: true,
    by_type: byType,
    note:
      "holders are embedded per-tool in NCTools via holderSelectionEngine.select; the standalone 1,164-holder catalog export is a separate unit. hyperMILL stores cutting as per-ISO Materials factors (format-native) -- toolpath-specific cutting is applied at the CAM operation level.",
  };
  writeFileSync(join(OUT_DIR, "FULLCORPUS-LEDGER.json"), JSON.stringify(ledger, null, 2), "utf-8");

  // small committable sample (schema + first ~40 inserts)
  const sample = [result.sqlite_schema, "", ...result.insert_statements.slice(0, 40)].join("\n");
  writeFileSync(join(OUT_DIR, "SAMPLE.hmt.sql"), sample, "utf-8");

  console.log(
    `[fullcorpus-hypermill] OK: ${result.tool_count}/${corpusTotal} tools exported, ${result.insert_statements.length} INSERTs, ${(sql.length / 1e6).toFixed(1)}MB SQL -> ${OUT_DIR}`,
  );
}

main();
