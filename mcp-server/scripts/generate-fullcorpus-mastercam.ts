/**
 * generate-fullcorpus-mastercam.ts
 * [FULLCORPUS-CAM]/U-FULLCORPUS-MASTERCAM (slot:romeo)
 *
 * Operator directive 2026-06-15 (ALL MEANS ALL, cross-galaxy permission): export the
 * COMPLETE unified tool corpus -- every tool body + insert + tooling (118,409 tools) --
 * to a Mastercam .mcam-tools library (JSON), with per-ISO material cutting data and an
 * inferred holder per tool. NOT the 218-tool JM crib; the WHOLE database.
 *
 * Feeds the full search() array straight into MastercamToolExportEngine.exportFromTools
 * (which maps every passed tool -- no internal cap) AND asserts result.tool_count ===
 * corpus length, failing loud (exit 1) on any shortfall.
 *
 * Output (gitignored -- ~150MB JSON): FULLCORPUS.mcam-tools. Committed: this generator +
 * the ledger (counts) + a HEAD sample.
 *
 * Run: cd mcp-server && NODE_OPTIONS=--max-old-space-size=8192 npx tsx scripts/generate-fullcorpus-mastercam.ts
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { toolCatalogEngine } from "../src/engines/ToolCatalogEngine.js";
import { mastercamToolExportEngine } from "../src/engines/MastercamToolExportEngine.js";
import { catalogCorpusLoaderEngine } from "../src/engines/CatalogCorpusLoaderEngine.js";

const OUT_DIR = "H:/prism/state/shared/fullcorpus-cam-libraries/mastercam";
const NO_CAP = 1_000_000;

function main(): void {
  catalogCorpusLoaderEngine.load();

  const allTools = toolCatalogEngine.search({ max_results: NO_CAP });
  const corpusTotal = allTools.length;
  console.log(`[fullcorpus-mastercam] corpus tools enumerated: ${corpusTotal}`);
  if (corpusTotal < 100_000) {
    console.error(`[fullcorpus-mastercam] FATAL: only ${corpusTotal} tools -- corpus not loaded. Aborting.`);
    process.exit(1);
  }

  // exportFromTools maps EVERY passed tool (no internal cap); materials defaults to ALL_ISO.
  const result = mastercamToolExportEngine.exportFromTools(allTools, "PRISM_FULLCORPUS", "mcam-tools");

  if (result.tool_count !== corpusTotal) {
    console.error(
      `[fullcorpus-mastercam] ALL-MEANS-ALL VIOLATION: exported ${result.tool_count} != corpus ${corpusTotal} (${corpusTotal - result.tool_count} dropped). Aborting.`,
    );
    process.exit(1);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, "FULLCORPUS.mcam-tools"), result.library_data, "utf-8");

  const byType: Record<string, number> = {};
  for (const t of allTools) {
    const ty = String((t as { type?: string }).type ?? "?");
    byType[ty] = (byType[ty] ?? 0) + 1;
  }

  // small committable sample: re-parse the library + slice the first 30 tools
  let sample = "";
  try {
    const lib = JSON.parse(result.library_data) as { tools?: unknown[] } & Record<string, unknown>;
    const head = { ...lib, tools: Array.isArray(lib.tools) ? lib.tools.slice(0, 30) : lib.tools };
    sample = JSON.stringify(head, null, 2);
  } catch {
    sample = result.library_data.slice(0, 20_000);
  }
  writeFileSync(join(OUT_DIR, "SAMPLE.mcam-tools"), sample, "utf-8");

  const ledger = {
    schemaVersion: "1.0.0",
    generator: "generate-fullcorpus-mastercam.ts",
    milestone: "FULLCORPUS-CAM/U-FULLCORPUS-MASTERCAM",
    slot: "romeo",
    target: "Mastercam .mcam-tools library (JSON)",
    corpus_tools_enumerated: corpusTotal,
    tools_exported: result.tool_count,
    all_means_all_ok: result.tool_count === corpusTotal,
    library_bytes: result.library_data.length,
    file_name: result.file_name,
    materials_iso_groups: 6,
    holder_per_tool: "inferred (scalar gauge/body/projection); 3D TlAssembly profile is a separate unit",
    by_type: byType,
    note:
      "Mastercam stores per-ISO material cutting + operation-applied toolpath strategy (format-native). Each tool carries an inferred holder; the real 3D holder TlAssembly profile is task #23.",
  };
  writeFileSync(join(OUT_DIR, "FULLCORPUS-LEDGER.json"), JSON.stringify(ledger, null, 2), "utf-8");

  console.log(
    `[fullcorpus-mastercam] OK: ${result.tool_count}/${corpusTotal} tools, ${(result.library_data.length / 1e6).toFixed(1)}MB JSON -> ${OUT_DIR}`,
  );
}

main();
