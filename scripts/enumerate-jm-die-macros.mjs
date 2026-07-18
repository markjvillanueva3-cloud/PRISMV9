#!/usr/bin/env node
/**
 * enumerate-jm-die-macros.mjs — U-MACRO-INTEL-PATH-ENUM (slot:kilo iter12, 2026-05-24)
 *
 * Walks H:/PRISM/JM DIE/MACRO PROGRAMS/ and emits a JSON manifest of macro
 * files with size + mtime + first-line preview + extension classification.
 * Pure file-system enumeration — NO semantic parsing of macro contents.
 *
 * First step of U-GAP-TRIBAL-MACRO-INTEL per KILO-QUEUE-PSN-SYNERGY-2026-05-23.
 * Unblocks downstream multi-session sub-units routed to foxtrot:
 *   - U-MACRO-INTEL-CV-EXTRACTOR (common-variable definitions)
 *   - U-MACRO-INTEL-PART-COUNTER-LOOP (loop pattern detection)
 *   - U-MACRO-INTEL-OPERATOR-INTENT (intent synthesis)
 *   - U-MACRO-INTEL-TRIBAL-EMIT (write to tribal-embed-index.json)
 *
 * Output: state/shared/jm-die-macro-manifest.json
 *
 * Per kilo soul: orchestrate, don't implement at each stage. This enum produces
 * the input substrate for downstream slots; it does not interpret macros.
 *
 * Usage:
 *   node scripts/enumerate-jm-die-macros.mjs
 *   node scripts/enumerate-jm-die-macros.mjs --out custom-path.json
 *   node scripts/enumerate-jm-die-macros.mjs --root "H:/some/other/path"
 *
 * Knobs:
 *   --root <path>   override source dir (default H:/PRISM/JM DIE/MACRO PROGRAMS)
 *   --out <path>    override output JSON (default state/shared/jm-die-macro-manifest.json)
 *   --preview-bytes <N>  first-line preview cap (default 200)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), "..");

function parseArgs(argv) {
  const args = { root: "H:/PRISM/JM DIE/MACRO PROGRAMS", out: path.join(REPO_ROOT, "state/shared/jm-die-macro-manifest.json"), previewBytes: 200 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--root" && argv[i + 1]) { args.root = argv[++i]; }
    else if (a === "--out" && argv[i + 1]) { args.out = argv[++i]; }
    else if (a === "--preview-bytes" && argv[i + 1]) { args.previewBytes = parseInt(argv[++i], 10) || 200; }
  }
  return args;
}

/** Classify extension into a coarse type bucket. */
function classify(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".min") return "okuma_minfile";
  if (ext === ".mcx-8" || ext === ".mcx") return "mastercam";
  if (ext === ".cyc") return "fanuc_cycle";
  if (ext === ".nc") return "generic_nc";
  if (ext === ".eia") return "eia_iso";
  if (ext === ".h" || ext === ".hh") return "heidenhain";
  if (ext === ".mpf" || ext === ".spf") return "siemens";
  if (ext === ".pdf") return "documentation";
  if (ext === ".txt") return "documentation";
  if (ext === ".doc" || ext === ".docx") return "documentation";
  return "unknown";
}

/** Read first non-empty line up to N bytes for preview. Fail-soft. */
function previewFirstLine(absPath, capBytes) {
  try {
    const fd = fs.openSync(absPath, "r");
    try {
      const buf = Buffer.alloc(capBytes);
      const n = fs.readSync(fd, buf, 0, capBytes, 0);
      const txt = buf.subarray(0, n).toString("utf8");
      for (const line of txt.split(/\r?\n/)) {
        const t = line.trim();
        if (t) return t.slice(0, capBytes);
      }
      return "";
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    return null; // binary or unreadable
  }
}

/** Walk directory recursively, yielding file entries (no symlink follow). */
function* walkFiles(rootAbs, relPrefix = "") {
  let entries;
  try {
    entries = fs.readdirSync(rootAbs, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of entries) {
    const fullPath = path.join(rootAbs, ent.name);
    const relPath = path.posix.join(relPrefix, ent.name);
    if (ent.isSymbolicLink()) continue;
    if (ent.isDirectory()) {
      yield* walkFiles(fullPath, relPath);
    } else if (ent.isFile()) {
      yield { fullPath, relPath, name: ent.name };
    }
  }
}

function enumerate(args) {
  const root = args.root;
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    return { ok: false, error: `root not found: ${root}`, root, files: [] };
  }
  const files = [];
  const startedAt = Date.now();
  let totalBytes = 0;
  const typeCounts = Object.create(null);
  for (const f of walkFiles(root)) {
    let stat;
    try {
      stat = fs.statSync(f.fullPath);
    } catch {
      continue;
    }
    const type = classify(f.name);
    typeCounts[type] = (typeCounts[type] || 0) + 1;
    totalBytes += stat.size;
    files.push({
      rel_path: f.relPath,
      name: f.name,
      size_bytes: stat.size,
      mtime_iso: stat.mtime.toISOString(),
      ext: path.extname(f.name).toLowerCase(),
      type,
      first_line_preview: previewFirstLine(f.fullPath, args.previewBytes),
    });
  }
  // Deterministic ordering for reproducibility.
  files.sort((a, b) => a.rel_path.localeCompare(b.rel_path));
  return {
    ok: true,
    schemaVersion: "1.0.0",
    generator: "scripts/enumerate-jm-die-macros.mjs",
    generated_at: new Date().toISOString(),
    root,
    summary: {
      total_files: files.length,
      total_bytes: totalBytes,
      type_counts: typeCounts,
      walk_duration_ms: Date.now() - startedAt,
    },
    advisoryOnly: true,
    mustHumanVerify: false,
    purpose: "Substrate for U-MACRO-INTEL-CV-EXTRACTOR + U-MACRO-INTEL-PART-COUNTER-LOOP (foxtrot-owned multi-session tribal-mining sub-units). Pure path enumeration; no semantic parsing.",
    files,
  };
}

function writeAtomic(outPath, data) {
  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const tmp = outPath + "." + process.pid + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, outPath);
}

function main() {
  const args = parseArgs(process.argv);
  const result = enumerate(args);
  if (!result.ok) {
    process.stderr.write(`[macro-enum] ERROR: ${result.error}\n`);
    process.exit(2);
  }
  writeAtomic(args.out, result);
  process.stdout.write(JSON.stringify({
    ok: true,
    output: args.out,
    total_files: result.summary.total_files,
    total_bytes: result.summary.total_bytes,
    type_counts: result.summary.type_counts,
    walk_duration_ms: result.summary.walk_duration_ms,
  }) + "\n");
}

// Allow import for tests.
export { parseArgs, classify, previewFirstLine, walkFiles, enumerate };

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}` ||
    import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"))) {
  main();
}
