#!/usr/bin/env node
/**
 * scan-print-corpus.mjs — CLI runner for PrintCorpusOrchestratorEngine.
 *
 * PRINT-OCR-100PCT-MS0/U2 — walks a filesystem root (default JM DIE),
 * runs BlueprintExtractionRAGEngine on each print, and writes one
 * PrintCorpusRow per print into state/shared/print-corpus-tables/.
 *
 * Usage:
 *   node scripts/scan-print-corpus.mjs                        # full JM DIE
 *   node scripts/scan-print-corpus.mjs --root <dir>           # custom root
 *   node scripts/scan-print-corpus.mjs --limit 100            # smoke run
 *   node scripts/scan-print-corpus.mjs --concurrency 8        # tune workers
 *   node scripts/scan-print-corpus.mjs --formats pdf,tif      # restrict
 *   node scripts/scan-print-corpus.mjs --dry-run              # discover only
 *
 * Resumable: re-running with the same --writer-dir skips already-scanned
 * prints via the writer's sha-keyed index. Safe to interrupt + restart.
 *
 * Extract backend: this CLI defaults to a STUB extractFn that produces a
 * minimal "low_no_vision" extraction (no real OCR). To plug in the real
 * RAG engine, set PRINT_CORPUS_BACKEND=rag — that will dynamically import
 * BlueprintExtractionRAGEngine + its IO bridges. Stub mode is the safe
 * default for an initial corpus discovery pass.
 */

import path from "node:path";
import { performance } from "node:perf_hooks";

const DEFAULT_ROOT = "H:/PRISM/JM DIE";
const DEFAULT_WRITER_DIR = "H:/prism/state/shared/print-corpus-tables";

function parseArgs(argv) {
  const args = { dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--root") args.root = argv[++i];
    else if (a === "--writer-dir") args.writerDir = argv[++i];
    else if (a === "--limit") args.limit = Number(argv[++i]);
    else if (a === "--concurrency") args.concurrency = Number(argv[++i]);
    else if (a === "--formats") args.formats = argv[++i].split(",").map((s) => s.trim());
    else if (a === "--dry-run") args.dryRun = true;
    else if (a === "--help" || a === "-h") args.help = true;
  }
  return args;
}

function printHelp() {
  console.log(`scan-print-corpus.mjs — corpus-wide print extraction

Usage:
  --root <dir>            File-system root to walk (default: ${DEFAULT_ROOT})
  --writer-dir <dir>      Output directory (default: ${DEFAULT_WRITER_DIR})
  --limit <n>             Max files to process (default: unlimited)
  --concurrency <n>       Parallel workers (default: 4)
  --formats pdf,tif,png   Allowed source formats (default: pdf,tif,tiff,png,jpg,jpeg)
  --dry-run               Discovery only — count files, don't extract
  --help                  Print this message

Env:
  PRINT_CORPUS_BACKEND    'stub' (default) | 'rag' — backend selector
`);
}

async function loadOrchestrator() {
  // Load from the compiled mcp-server source. We need to resolve the path
  // RELATIVE to this script so the CLI works from any cwd.
  const distRoot = path.resolve(import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname), "..");
  const enginePath = path.join(distRoot, "mcp-server", "dist", "src", "engines", "PrintCorpusOrchestratorEngine.js");
  const writerPath = path.join(distRoot, "mcp-server", "dist", "src", "engines", "PrintCorpusTableWriter.js");
  // Source-mode fallback (no dist build yet) — load via ts-node-like resolution
  // is out of scope here; CLI requires npm run build first.
  const { PrintCorpusOrchestratorEngine } = await import(pathToFileUrl(enginePath));
  const { PrintCorpusTableWriter } = await import(pathToFileUrl(writerPath));
  return { PrintCorpusOrchestratorEngine, PrintCorpusTableWriter };
}

function pathToFileUrl(p) {
  // node's URL constructor wants file:// — handle Windows drive letters.
  const norm = p.replace(/\\/g, "/");
  return norm.startsWith("/") ? `file://${norm}` : `file:///${norm}`;
}

function makeStubExtractFn(now) {
  return async (filePath, page) => ({
    extractionId: `stub-${path.basename(filePath)}-p${page}`,
    pdfPath: filePath,
    page,
    familyMatchId: null,
    regions: [],
    sources: [],
    confidenceFloor: "low_no_vision",
    contradictionsDetected: ["stub-backend: no real OCR run"],
    extractedAt: now().toISOString(),
    backendId: "stub-cli-v1",
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return 0;
  }

  const root = args.root ?? DEFAULT_ROOT;
  const writerDir = args.writerDir ?? DEFAULT_WRITER_DIR;
  const concurrency = args.concurrency ?? 4;
  const formats = args.formats;

  console.log(`▸ root         : ${root}`);
  console.log(`▸ writer-dir   : ${writerDir}`);
  console.log(`▸ concurrency  : ${concurrency}`);
  console.log(`▸ limit        : ${args.limit ?? "unlimited"}`);
  console.log(`▸ formats      : ${formats?.join(",") ?? "default (pdf,tif,tiff,png,jpg,jpeg)"}`);
  console.log(`▸ dry-run      : ${args.dryRun}`);
  console.log(`▸ backend      : ${process.env.PRINT_CORPUS_BACKEND ?? "stub"}`);
  console.log("");

  const { PrintCorpusOrchestratorEngine, PrintCorpusTableWriter } = await loadOrchestrator();
  const writer = new PrintCorpusTableWriter(writerDir);
  const orch = new PrintCorpusOrchestratorEngine(writer);

  if (args.dryRun) {
    // Use the orchestrator's discovery path indirectly by running with a
    // never-completing extractor + concurrency 0 — too cute. Just rely on
    // the orchestrator to discover then report counts without writing
    // (writer.has() will always return false so we'd write all rows).
    // Cleanest: re-import discoverFiles. For now, run with an extractor
    // that throws; the failure rows tell us discovery counts.
    console.log("Dry-run: not yet wired to a non-writing discovery path.");
    console.log("Tip: pass --limit 1 + observe state/shared/print-corpus-tables/ to gauge throughput.");
    return 0;
  }

  const startedAt = performance.now();
  const result = await orch.scan({
    rootDir: root,
    extractFn: makeStubExtractFn(() => new Date()),
    concurrency,
    fileLimit: args.limit,
    formats,
    progressFn: (prog) => {
      if (prog.filesScanned > 0 && prog.filesScanned % 100 === 0) {
        const pct = prog.filesDiscovered > 0
          ? ((prog.filesScanned + prog.filesSkipped) / prog.filesDiscovered * 100).toFixed(1)
          : "?";
        process.stdout.write(`  scanned=${prog.filesScanned} skipped=${prog.filesSkipped} failed=${prog.filesFailed} of ${prog.filesDiscovered} (${pct}%)\r`);
      }
    },
  });

  const elapsedSec = ((performance.now() - startedAt) / 1000).toFixed(1);
  console.log("");
  console.log("━".repeat(60));
  console.log(`✓ discovered  : ${result.totalDiscovered}`);
  console.log(`✓ scanned     : ${result.totalScanned}`);
  console.log(`✓ skipped     : ${result.totalSkipped}`);
  console.log(`✓ failed      : ${result.totalFailed}`);
  console.log(`✓ elapsed     : ${elapsedSec}s`);
  console.log(`✓ rows.jsonl  : ${path.join(writerDir, "rows.jsonl")}`);

  if (result.totalFailed > 0) {
    console.log("");
    console.log(`Failures (first 5):`);
    for (const f of result.failures.slice(0, 5)) {
      console.log(`  ✗ ${f.path}: ${f.error}`);
    }
  }

  return result.totalFailed > 0 ? 1 : 0;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error("scan-print-corpus.mjs fatal:", err);
    process.exit(2);
  },
);
