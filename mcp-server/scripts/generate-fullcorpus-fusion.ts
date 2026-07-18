/**
 * generate-fullcorpus-fusion.ts
 * [FULLCORPUS-CAM]/U-FULLCORPUS-FUSION (slot:romeo)
 *
 * Operator directive 2026-06-15 (ALL MEANS ALL, cross-galaxy permission): export the
 * COMPLETE unified tool corpus -- every tool body + insert + tooling (118,409 tools) --
 * to a Fusion 360 .tools library (JSON, version 2), with the 6 material presets
 * (Steel/Stainless/Cast Iron/Aluminum/Superalloy/Hardened) per tool. NOT the 218-tool
 * JM crib; the WHOLE database.
 *
 * Feeds the full search() array into FusionToolExportEngine.exportLibrary (maps every
 * passed tool, no cap) AND asserts metadata.tool_count === corpus length, failing loud
 * (exit 1) on any shortfall. Also reports validateCoverage geometry grades (R15 prove).
 *
 * The full library JSON can approach V8's ~512MB single-string ceiling, so the big file
 * is written COMPACT, with a streaming fallback (write the tools array element-by-element)
 * if JSON.stringify throws RangeError (the seed-ghost / merge-augmentations lesson).
 *
 * Output (gitignored): FULLCORPUS.tools. Committed: generator + ledger + sample.
 *
 * Run: cd mcp-server && NODE_OPTIONS=--max-old-space-size=12288 npx tsx scripts/generate-fullcorpus-fusion.ts
 */
import { writeFileSync, mkdirSync, createWriteStream } from "node:fs";
import { join } from "node:path";
import { toolCatalogEngine } from "../src/engines/ToolCatalogEngine.js";
import { fusionToolExportEngine } from "../src/engines/FusionToolExportEngine.js";
import { catalogCorpusLoaderEngine } from "../src/engines/CatalogCorpusLoaderEngine.js";

const OUT_DIR = "H:/prism/state/shared/fullcorpus-cam-libraries/fusion";
const NO_CAP = 1_000_000;

function streamWriteLibrary(path: string, lib: { version: number; tools: unknown[]; metadata: unknown }): void {
  // Manual streaming serialization -- avoids building one >512MB string (V8 cap).
  const ws = createWriteStream(path, { encoding: "utf-8" });
  ws.write(`{"version":${JSON.stringify(lib.version)},"tools":[`);
  for (let i = 0; i < lib.tools.length; i++) {
    if (i > 0) ws.write(",");
    ws.write(JSON.stringify(lib.tools[i]));
  }
  ws.write(`],"metadata":${JSON.stringify(lib.metadata)}}`);
  ws.end();
}

function main(): void {
  catalogCorpusLoaderEngine.load();

  const allTools = toolCatalogEngine.search({ max_results: NO_CAP });
  const corpusTotal = allTools.length;
  console.log(`[fullcorpus-fusion] corpus tools enumerated: ${corpusTotal}`);
  if (corpusTotal < 100_000) {
    console.error(`[fullcorpus-fusion] FATAL: only ${corpusTotal} tools -- corpus not loaded. Aborting.`);
    process.exit(1);
  }

  const lib = fusionToolExportEngine.exportLibrary(allTools);
  const exported = lib.metadata?.tool_count ?? lib.tools.length;

  if (exported !== corpusTotal) {
    console.error(
      `[fullcorpus-fusion] ALL-MEANS-ALL VIOLATION: exported ${exported} != corpus ${corpusTotal} (${corpusTotal - exported} dropped). Aborting.`,
    );
    process.exit(1);
  }

  const coverage = fusionToolExportEngine.validateCoverage(allTools);

  mkdirSync(OUT_DIR, { recursive: true });
  const outPath = join(OUT_DIR, "FULLCORPUS.tools");
  let bytes = 0;
  let mode = "compact-string";
  try {
    const json = JSON.stringify(lib); // compact (half the size of indented)
    writeFileSync(outPath, json, "utf-8");
    bytes = json.length;
  } catch (e: unknown) {
    // RangeError: Invalid string length -> stream element-by-element instead
    mode = "streamed";
    streamWriteLibrary(outPath, lib);
    bytes = -1; // size not measured in stream mode (avoid re-stringify)
    console.warn(`[fullcorpus-fusion] JSON.stringify overflowed (${(e as Error)?.message}); used streaming writer.`);
  }

  const byType: Record<string, number> = {};
  for (const t of allTools) {
    const ty = String((t as { type?: string }).type ?? "?");
    byType[ty] = (byType[ty] ?? 0) + 1;
  }

  // pretty sample: first 20 tools
  const sample = JSON.stringify({ ...lib, tools: lib.tools.slice(0, 20) }, null, 2);
  writeFileSync(join(OUT_DIR, "SAMPLE.tools"), sample, "utf-8");

  const ledger = {
    schemaVersion: "1.0.0",
    generator: "generate-fullcorpus-fusion.ts",
    milestone: "FULLCORPUS-CAM/U-FULLCORPUS-FUSION",
    slot: "romeo",
    target: "Fusion 360 .tools library (JSON v2)",
    corpus_tools_enumerated: corpusTotal,
    tools_exported: exported,
    all_means_all_ok: exported === corpusTotal,
    write_mode: mode,
    library_bytes: bytes,
    material_presets: lib.metadata?.material_presets ?? [],
    geometry_coverage: coverage, // gradeA/B/C/D + pctBOrAbove (R15 prove-with-numbers)
    by_type: byType,
    note:
      "Fusion .tools v2 carries 6 material presets per tool. Geometry grade comes from corpus .physical completeness (validateCoverage): A=full dims+S/F+flutes, B=dims+cut data, C=dims only, D=no cutting diameter.",
  };
  writeFileSync(join(OUT_DIR, "FULLCORPUS-LEDGER.json"), JSON.stringify(ledger, null, 2), "utf-8");

  console.log(
    `[fullcorpus-fusion] OK: ${exported}/${corpusTotal} tools (${mode}), geometry coverage A=${coverage.gradeA} B=${coverage.gradeB} C=${coverage.gradeC} D=${coverage.gradeD} (${coverage.pctBOrAbove}% B+) -> ${OUT_DIR}`,
  );
}

main();
