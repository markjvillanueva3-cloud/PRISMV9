/**
 * ingest-cad-corpus.ts — Walk every CAD-bearing directory under H:/prism and
 * build a unified corpus manifest the OCR + DfM pipeline can match against.
 *
 * Run: npx tsx mcp-server/scripts/ingest-cad-corpus.ts
 */
import { cadCorpusIngestionEngine, type CorpusManifest } from "../src/engines/CADCorpusIngestionEngine.js";
import * as fs from "node:fs";
import * as path from "node:path";

const ROOTS = [
  "H:/prism/BOX",
  "H:/prism/cad-engine/exports",
  "H:/prism/JM DIE",
  "H:/prism/Resources/CAD FILES",
];

const MANIFEST_PATH = "H:/prism/mcp-server/data/state/cad-corpus-manifest.json";

function fmtCount(n: number): string {
  return n.toLocaleString("en-US");
}

function ingestRoot(root: string): CorpusManifest | null {
  if (!fs.existsSync(root)) {
    console.log(`✗ skip (missing): ${root}`);
    return null;
  }
  const start = Date.now();
  const m = cadCorpusIngestionEngine.ingestDirectory(root, {
    skip_segments: [".git", "node_modules", ".cache", "_archive"],
    max_files: 50_000,
  });
  const elapsed = Date.now() - start;
  console.log(`✓ ${root}: ${fmtCount(m.total_entries)} files (${elapsed}ms)`);
  return m;
}

function mergeManifests(parts: CorpusManifest[]): CorpusManifest {
  const allEntries = parts.flatMap((m) => m.entries);
  const byClass: Record<string, number> = {};
  const byFormat: Record<string, number> = {};
  for (const e of allEntries) {
    byClass[e.part_class] = (byClass[e.part_class] ?? 0) + 1;
    byFormat[e.ext] = (byFormat[e.ext] ?? 0) + 1;
  }
  return {
    schema_version: "1.0.0",
    generated_at: new Date().toISOString(),
    root: "H:/prism (multi-root union)",
    total_entries: allEntries.length,
    by_class: byClass,
    by_format: byFormat,
    entries: allEntries,
  };
}

async function main(): Promise<void> {
  console.log("── PRISM CAD Corpus Ingestion ──\n");
  const manifests: CorpusManifest[] = [];
  for (const root of ROOTS) {
    const m = ingestRoot(root);
    if (m) manifests.push(m);
  }
  if (manifests.length === 0) {
    console.error("No directories ingested — bailing.");
    process.exit(1);
  }

  const merged = mergeManifests(manifests);
  cadCorpusIngestionEngine.saveManifest(merged, MANIFEST_PATH);

  const summary = cadCorpusIngestionEngine.summarize(merged);
  console.log("\n── Summary ──");
  console.log(`Total CAD files indexed:   ${fmtCount(summary.total)}`);
  console.log(`Classified (non-general):  ${fmtCount(summary.classified)}  (${((summary.classified / Math.max(1, summary.total)) * 100).toFixed(1)}%)`);
  console.log(`Unclassified ('general'):  ${fmtCount(summary.unclassified)}`);

  console.log("\nTop 15 part classes:");
  for (const c of summary.by_class.slice(0, 15)) {
    console.log(`  ${c.class.padEnd(24)} ${c.count.toString().padStart(7)}`);
  }

  console.log("\nFile formats:");
  for (const f of summary.by_format.slice(0, 12)) {
    console.log(`  ${f.ext.padEnd(10)} ${f.count.toString().padStart(7)}`);
  }

  console.log(`\n✓ Manifest saved to: ${MANIFEST_PATH}`);
  console.log(`  Size: ${(fs.statSync(MANIFEST_PATH).size / 1024).toFixed(0)} KB`);
}

main().catch((e: unknown) => {
  console.error("INGEST CRASHED:", e instanceof Error ? e.stack : e);
  process.exit(2);
});
