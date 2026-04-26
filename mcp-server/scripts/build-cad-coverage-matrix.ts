/**
 * build-cad-coverage-matrix.ts — CAD coverage ground truth
 *
 * Goal: "be able to generate every single CAD file in the H drive".
 * Prerequisite for closing that gap is knowing which extensions exist
 * on the drive and which of them the CADAutomationRouter + 6 bridges
 * can already service.
 *
 * Scans H:/prism (default), groups by CAD extension, classifies each
 * extension as:
 *   - supported  : extension is in CADAutomationRouter.EXT_TO_BRIDGE
 *   - exportable : at least one bridge can WRITE this format
 *                  (e.g., STEP via exportSTEP on Inventor/SolidWorks/Mastercam)
 *   - gap        : extension has files on disk but no read path
 *   - write-gap  : extension is read-supported but no write/generate path
 *
 * U-CUC04: Also detects UNKNOWN extensions (not in CAD_EXTENSIONS) that
 * match potential CAD/CAM patterns, writes them to UNKNOWN_CAD_EXTENSIONS.jsonl.
 *
 * Writes mcp-server/data/state/CAD_COVERAGE_MATRIX.json with:
 *   schemaVersion, generatedAt, scanRoot, totalFiles, byExtension[],
 *   supportedExts[], gapExts[], writeGapExts[], summary
 *
 * Usage: npx tsx mcp-server/scripts/build-cad-coverage-matrix.ts [scanRoot]
 */

import { readdirSync, statSync, writeFileSync, mkdirSync, appendFileSync, existsSync } from "node:fs";
import path from "node:path";

// ── Canonical read-support table (from CADAutomationRouter EXT_TO_BRIDGE) ─────
// Keep synchronized with mcp-server/src/engines/CADAutomationRouter.ts.
const READ_SUPPORTED: Record<string, string> = {
  ".sldprt": "solidworks",
  ".sldasm": "solidworks",
  ".ipt": "inventor",
  ".iam": "inventor",
  ".idw": "inventor",
  ".fcstd": "freecad",
  ".fcstd1": "freecad",
  ".mcam": "mastercam",
  ".mcx": "mastercam",
  ".mcx-6": "mastercam",
  ".mcx-7": "mastercam",
  ".mcx-8": "mastercam",
  ".f3d": "fusion360",
  ".f3z": "fusion360",
  ".hmc": "hypermill",
};

// ── Write/export-support table (bridges that can PRODUCE this format) ────────
const WRITE_SUPPORTED: Record<string, string[]> = {
  ".step": ["inventor", "solidworks", "mastercam"],
  ".stp": ["inventor", "solidworks", "mastercam"],
  ".pdf": ["solidworks"],
  ".sldprt": ["solidworks"],
  ".sldasm": ["solidworks"],
  ".ipt": ["inventor"],
  ".iam": ["inventor"],
  ".fcstd": ["freecad"],
  ".mcam": ["mastercam"],
  ".f3d": ["fusion360"],
  ".hmc": ["hypermill"],
};

// ── Extension classification (CAD vs. non-CAD) ──────────────────────────────
const CAD_EXTENSIONS = new Set([
  ".sldprt", ".sldasm", ".ipt", ".iam", ".idw",
  ".fcstd", ".fcstd1", ".f3d", ".f3z",
  ".mcam", ".mcx", ".mcx-6", ".mcx-7", ".mcx-8", ".hmc",
  ".step", ".stp", ".iges", ".igs", ".x_b", ".x_t",
  ".dwg", ".dxf",
  ".stl", ".obj", ".3mf",
]);

const IGNORE_DIRS = new Set([
  "node_modules", ".git", "dist", "build", "coverage", ".venv", "venv",
  "__pycache__", ".cache", ".next", ".turbo",
]);

// ── U-CUC04: Extensions that look like CAD/CAM but aren't in taxonomy yet ───
const POTENTIAL_CAD_PATTERNS = /^\.(par|psm|asm|drw|prt|cgr|catpart|catproduct|catdrawing|jt|sat|sab|wire|nc|ncc|tap|cnc|nc1|mpf|spf|gcd|flt|gcode|ngc|model|session|exp|g|min|prg|crv|pvs|pkg|pkt)$/i;

// Common non-CAD extensions to skip in unknown detection
const KNOWN_NON_CAD = new Set([
  ".txt", ".md", ".json", ".js", ".ts", ".tsx", ".jsx", ".css", ".html", ".htm",
  ".xml", ".yaml", ".yml", ".toml", ".ini", ".cfg", ".conf", ".log", ".csv",
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
  ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".svg", ".ico", ".webp", ".tiff",
  ".mp3", ".mp4", ".wav", ".avi", ".mov", ".mkv", ".webm",
  ".zip", ".rar", ".7z", ".tar", ".gz", ".bz2",
  ".exe", ".dll", ".so", ".dylib", ".bin", ".dat",
  ".py", ".pyc", ".pyo", ".rb", ".php", ".java", ".class", ".jar",
  ".sh", ".bat", ".cmd", ".ps1",
  ".gitignore", ".dockerignore", ".env", ".lock",
]);

interface UnknownExtEntry {
  ext: string;
  count: number;
  samples: string[];
  detectedAt: string;
  looksLikeCad: boolean;
}

interface ExtEntry {
  ext: string;
  count: number;
  readSupported: boolean;
  readBridge?: string;
  writeSupported: boolean;
  writeBridges: string[];
  sampleFiles: string[];
  classification: "supported" | "write-gap" | "gap" | "read-only" | "not-cad";
}

interface WalkResult {
  cadFiles: number;
  unknownExts: Map<string, { count: number; samples: string[]; looksLikeCad: boolean }>;
}

function walk(
  root: string,
  out: Map<string, { count: number; samples: string[] }>,
  unknowns: Map<string, { count: number; samples: string[]; looksLikeCad: boolean }>,
  maxSamples = 3
): number {
  let total = 0;
  let entries: string[];
  try {
    entries = readdirSync(root);
  } catch {
    return 0;
  }
  for (const name of entries) {
    if (IGNORE_DIRS.has(name)) continue;
    const full = path.join(root, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      total += walk(full, out, unknowns, maxSamples);
    } else if (st.isFile()) {
      const ext = path.extname(name).toLowerCase();
      if (!ext) continue;

      if (CAD_EXTENSIONS.has(ext)) {
        // Known CAD extension
        total++;
        const entry = out.get(ext) ?? { count: 0, samples: [] };
        entry.count++;
        if (entry.samples.length < maxSamples) entry.samples.push(full);
        out.set(ext, entry);
      } else if (!KNOWN_NON_CAD.has(ext)) {
        // Unknown extension - check if it looks like CAD
        const looksLikeCad = POTENTIAL_CAD_PATTERNS.test(ext);
        const entry = unknowns.get(ext) ?? { count: 0, samples: [], looksLikeCad };
        entry.count++;
        if (entry.samples.length < maxSamples) entry.samples.push(full);
        unknowns.set(ext, entry);
      }
    }
  }
  return total;
}

function classify(ext: string, count: number): ExtEntry {
  const readSupported = ext in READ_SUPPORTED;
  const readBridge = READ_SUPPORTED[ext];
  const writeBridges = WRITE_SUPPORTED[ext] ?? [];
  const writeSupported = writeBridges.length > 0;

  let classification: ExtEntry["classification"];
  if (!CAD_EXTENSIONS.has(ext)) classification = "not-cad";
  else if (readSupported && writeSupported) classification = "supported";
  else if (readSupported && !writeSupported) classification = "write-gap";
  else if (!readSupported && writeSupported) classification = "read-only";
  else classification = "gap";

  return {
    ext,
    count,
    readSupported,
    readBridge,
    writeSupported,
    writeBridges,
    sampleFiles: [],
    classification,
  };
}

function writeUnknownExtensions(
  unknowns: Map<string, { count: number; samples: string[]; looksLikeCad: boolean }>,
  outDir: string
): number {
  const outPath = path.join(outDir, "UNKNOWN_CAD_EXTENSIONS.jsonl");
  const now = new Date().toISOString();
  let newCount = 0;

  // Filter to only extensions that look like CAD and have meaningful volume
  const candidates = Array.from(unknowns.entries())
    .filter(([_, v]) => v.looksLikeCad && v.count >= 1)
    .sort((a, b) => b[1].count - a[1].count);

  for (const [ext, { count, samples, looksLikeCad }] of candidates) {
    const entry: UnknownExtEntry = {
      ext,
      count,
      samples: samples.slice(0, 3),
      detectedAt: now,
      looksLikeCad,
    };
    appendFileSync(outPath, JSON.stringify(entry) + "\n");
    newCount++;
  }

  return newCount;
}

function main() {
  const scanRoot = process.argv[2] ?? "H:/prism";
  console.log(`[build-cad-coverage-matrix] scanning ${scanRoot} ...`);

  const counts = new Map<string, { count: number; samples: string[] }>();
  const unknowns = new Map<string, { count: number; samples: string[]; looksLikeCad: boolean }>();
  const t0 = Date.now();
  const totalFiles = walk(scanRoot, counts, unknowns);
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  const byExtension: ExtEntry[] = [];
  for (const [ext, { count, samples }] of counts) {
    const entry = classify(ext, count);
    entry.sampleFiles = samples;
    byExtension.push(entry);
  }
  byExtension.sort((a, b) => b.count - a.count);

  const supportedExts = byExtension.filter((e) => e.classification === "supported");
  const writeGapExts = byExtension.filter((e) => e.classification === "write-gap");
  const gapExts = byExtension.filter((e) => e.classification === "gap");

  const summary = {
    totalFiles,
    totalExtensions: byExtension.length,
    fullyCovered: supportedExts.length,
    writeGap: writeGapExts.length,
    fullGap: gapExts.length,
    coveragePercent:
      byExtension.length === 0
        ? 0
        : Math.round((supportedExts.length / byExtension.length) * 10000) / 100,
    fullyCoveredVolume: supportedExts.reduce((s, e) => s + e.count, 0),
    writeGapVolume: writeGapExts.reduce((s, e) => s + e.count, 0),
    fullGapVolume: gapExts.reduce((s, e) => s + e.count, 0),
    unknownExtensionsDetected: unknowns.size,
    potentialCadExtensions: Array.from(unknowns.entries())
      .filter(([_, v]) => v.looksLikeCad)
      .length,
  };

  const doc = {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    scanRoot,
    scanElapsedSec: Number(elapsed),
    totalFiles,
    byExtension,
    supportedExts: supportedExts.map((e) => e.ext),
    writeGapExts: writeGapExts.map((e) => e.ext),
    gapExts: gapExts.map((e) => e.ext),
    summary,
  };

  const outDir = path.resolve(process.cwd(), "data", "state");
  mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "CAD_COVERAGE_MATRIX.json");
  writeFileSync(outPath, JSON.stringify(doc, null, 2));

  // U-CUC04: Write unknown extensions to JSONL
  const unknownCount = writeUnknownExtensions(unknowns, outDir);

  console.log(`[build-cad-coverage-matrix] scanned ${totalFiles} CAD files across ${byExtension.length} extensions in ${elapsed}s`);
  console.log(`[build-cad-coverage-matrix] fully-covered: ${summary.fullyCovered} exts (${summary.fullyCoveredVolume} files)`);
  console.log(`[build-cad-coverage-matrix] write-gap:     ${summary.writeGap} exts (${summary.writeGapVolume} files)`);
  console.log(`[build-cad-coverage-matrix] full-gap:      ${summary.fullGap} exts (${summary.fullGapVolume} files)`);
  if (unknownCount > 0) {
    console.log(`[build-cad-coverage-matrix] ⚠️  detected ${unknownCount} potential CAD extensions not in taxonomy`);
  }
  console.log(`[build-cad-coverage-matrix] wrote ${outPath}`);

  console.log("\nExtension          Count    Read       Write");
  console.log("----------------   -----    --------   ------------------");
  for (const e of byExtension) {
    const readStr = e.readSupported ? `✓ ${e.readBridge}` : "✗";
    const writeStr = e.writeSupported ? `✓ ${e.writeBridges.join(",")}` : "✗";
    console.log(`${e.ext.padEnd(18)} ${String(e.count).padStart(5)}    ${readStr.padEnd(10)} ${writeStr}`);
  }

  // Show potential CAD extensions that need classification
  const potentialCad = Array.from(unknowns.entries())
    .filter(([_, v]) => v.looksLikeCad)
    .sort((a, b) => b[1].count - a[1].count);

  if (potentialCad.length > 0) {
    console.log("\n⚠️  POTENTIAL CAD EXTENSIONS (need classification):");
    console.log("Extension          Count    Sample Path");
    console.log("----------------   -----    ------------------");
    for (const [ext, { count, samples }] of potentialCad.slice(0, 10)) {
      console.log(`${ext.padEnd(18)} ${String(count).padStart(5)}    ${samples[0] ?? ""}`);
    }
  }
}

main();
