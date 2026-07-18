#!/usr/bin/env node
/**
 * enumerate-jm-die-partlib.mjs — U-JMDIE-PARTLIB-INDEX-WALK (slot:kilo iter13, 2026-05-24)
 *
 * Walks H:/PRISM/JM DIE/_PART LIBRARY/ and emits a part-grouped JSON manifest.
 * Each top-level directory is treated as a PART (its dir name = part number).
 * Files within each part get classified as blueprint (PDF/TIF/etc) vs program
 * (.min/.mcx/.nc/etc) vs other.
 *
 * Pure file-system enumeration — NO content parsing, NO OCR, NO program parsing.
 * Single-session shippable scaffold per KILO-QUEUE-PSN-SYNERGY-2026-05-23.
 *
 * Unblocks downstream multi-session sub-units:
 *   - U-JMDIE-PARTLIB-BLUEPRINT-OCR-RUN (multi-session ML, depends on U-OCR-EDOCR2-IMPL)
 *   - U-JMDIE-PARTLIB-PROGRAM-PARSE (india-owned, parses .min/.mcx-8/.cyc)
 *   - U-JMDIE-PARTLIB-PAIR-MATCH (foxtrot-owned, blueprint↔program pairing)
 *   - U-JMDIE-PARTLIB-TRAINING-MANIFEST (lima-owned, training corpus curation)
 *
 * Output: state/shared/jm-die-partlib-manifest.json
 *   - parts[]: { part_number, dir_path, blueprint_count, program_count, other_count, total_bytes, files[]? }
 *   - summary: total parts, totals by file type
 *
 * Defaults to summary-only mode (no per-file detail) to keep output bounded
 * for 76K+ file corpora. Use --include-files to dump full per-file detail.
 *
 * Per kilo soul: kilo orchestrates substrate production; downstream slots
 * (india/foxtrot/lima + multi-session ML) interpret. Pure enum is the contract.
 *
 * Usage:
 *   node scripts/enumerate-jm-die-partlib.mjs
 *   node scripts/enumerate-jm-die-partlib.mjs --include-files
 *   node scripts/enumerate-jm-die-partlib.mjs --root "H:/some/other/path"
 *   node scripts/enumerate-jm-die-partlib.mjs --out custom-path.json
 *   node scripts/enumerate-jm-die-partlib.mjs --limit 100
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), "..");

function parseArgs(argv) {
  const args = {
    root: "H:/PRISM/JM DIE/_PART LIBRARY",
    out: path.join(REPO_ROOT, "state/shared/jm-die-partlib-manifest.json"),
    includeFiles: false,
    limit: 0, // 0 = unlimited
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--root" && argv[i + 1]) { args.root = argv[++i]; }
    else if (a === "--out" && argv[i + 1]) { args.out = argv[++i]; }
    else if (a === "--include-files") { args.includeFiles = true; }
    else if (a === "--limit" && argv[i + 1]) { args.limit = parseInt(argv[++i], 10) || 0; }
  }
  return args;
}

const BLUEPRINT_EXTS = new Set([".pdf", ".tif", ".tiff", ".jpg", ".jpeg", ".png", ".dxf", ".dwg", ".step", ".stp", ".iges", ".igs"]);
const PROGRAM_EXTS = new Set([".min", ".mcx", ".mcx-8", ".mcx-9", ".mcam", ".cyc", ".nc", ".eia", ".mpf", ".spf", ".h", ".cnc", ".tap", ".gcode", ".pim"]);

function classifyFile(name) {
  const ext = path.extname(name).toLowerCase();
  if (BLUEPRINT_EXTS.has(ext)) return "blueprint";
  if (PROGRAM_EXTS.has(ext)) return "program";
  return "other";
}

/** Walk a single part directory recursively, gathering file stats. */
function walkPart(rootAbs) {
  const files = [];
  let totalBytes = 0;
  const counts = { blueprint: 0, program: 0, other: 0 };
  const exts = Object.create(null);

  function recurse(dirAbs, relPrefix = "") {
    let entries;
    try {
      entries = fs.readdirSync(dirAbs, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      const full = path.join(dirAbs, ent.name);
      const rel = path.posix.join(relPrefix, ent.name);
      if (ent.isSymbolicLink()) continue;
      if (ent.isDirectory()) {
        recurse(full, rel);
      } else if (ent.isFile()) {
        let st;
        try { st = fs.statSync(full); } catch { continue; }
        const kind = classifyFile(ent.name);
        const ext = path.extname(ent.name).toLowerCase();
        counts[kind]++;
        exts[ext] = (exts[ext] || 0) + 1;
        totalBytes += st.size;
        files.push({
          rel_path: rel,
          name: ent.name,
          ext,
          kind,
          size_bytes: st.size,
          mtime_iso: st.mtime.toISOString(),
        });
      }
    }
  }
  recurse(rootAbs);
  files.sort((a, b) => a.rel_path.localeCompare(b.rel_path));
  return { files, counts, exts, totalBytes };
}

function enumerate(args) {
  const root = args.root;
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    return { ok: false, error: `root not found: ${root}`, root, parts: [] };
  }
  const startedAt = Date.now();
  let partDirs;
  try {
    partDirs = fs.readdirSync(root, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  } catch (e) {
    return { ok: false, error: `cannot read root: ${e.message}`, root, parts: [] };
  }
  // Deterministic ordering
  partDirs.sort((a, b) => a.localeCompare(b));
  if (args.limit > 0) partDirs = partDirs.slice(0, args.limit);

  const parts = [];
  const globalCounts = { blueprint: 0, program: 0, other: 0 };
  const globalExts = Object.create(null);
  let globalBytes = 0;

  for (const partName of partDirs) {
    const partDirAbs = path.join(root, partName);
    const walked = walkPart(partDirAbs);
    globalCounts.blueprint += walked.counts.blueprint;
    globalCounts.program += walked.counts.program;
    globalCounts.other += walked.counts.other;
    globalBytes += walked.totalBytes;
    for (const [ext, n] of Object.entries(walked.exts)) {
      globalExts[ext] = (globalExts[ext] || 0) + n;
    }
    const partEntry = {
      part_number: partName,
      dir_path: partDirAbs.replace(/\\/g, "/"),
      blueprint_count: walked.counts.blueprint,
      program_count: walked.counts.program,
      other_count: walked.counts.other,
      total_files: walked.files.length,
      total_bytes: walked.totalBytes,
    };
    if (args.includeFiles) {
      partEntry.files = walked.files;
    }
    parts.push(partEntry);
  }

  return {
    ok: true,
    schemaVersion: "1.0.0",
    generator: "scripts/enumerate-jm-die-partlib.mjs",
    generated_at: new Date().toISOString(),
    root,
    args_used: {
      include_files: args.includeFiles,
      limit: args.limit || null,
    },
    summary: {
      total_parts: parts.length,
      total_files: globalCounts.blueprint + globalCounts.program + globalCounts.other,
      total_bytes: globalBytes,
      file_kind_counts: globalCounts,
      ext_counts: globalExts,
      parts_with_no_blueprint: parts.filter((p) => p.blueprint_count === 0).length,
      parts_with_no_program: parts.filter((p) => p.program_count === 0).length,
      parts_pair_complete: parts.filter((p) => p.blueprint_count > 0 && p.program_count > 0).length,
      walk_duration_ms: Date.now() - startedAt,
    },
    advisoryOnly: true,
    mustHumanVerify: false,
    purpose: "Substrate for U-JMDIE-PARTLIB-BLUEPRINT-OCR-RUN (multi-session ML), U-JMDIE-PARTLIB-PROGRAM-PARSE (india), U-JMDIE-PARTLIB-PAIR-MATCH (foxtrot), U-JMDIE-PARTLIB-TRAINING-MANIFEST (lima). Pure path enumeration grouped by part-number directory; no content parsing.",
    parts,
  };
}

function writeAtomic(outPath, data) {
  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const tmp = outPath + "." + process.pid + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  // Windows: renameSync can fail EPERM if dest is open for read by a peer.
  // Retry with short backoff, then fall back to copy + unlink (R12 fail-loud on final failure).
  let lastErr = null;
  for (const delayMs of [0, 50, 150, 400, 1000]) {
    if (delayMs > 0) {
      const until = Date.now() + delayMs;
      while (Date.now() < until) { /* busy-wait: ms-scale, fine for one-shot CLI */ }
    }
    try { fs.renameSync(tmp, outPath); return; }
    catch (e) { lastErr = e; if (e.code !== "EPERM" && e.code !== "EBUSY") break; }
  }
  // Final fallback: copy then unlink tmp. If dest still locked, surface the error.
  try {
    fs.copyFileSync(tmp, outPath);
    try { fs.unlinkSync(tmp); } catch { /* tmp cleanup best-effort */ }
    return;
  } catch (copyErr) {
    try { fs.unlinkSync(tmp); } catch { /* */ }
    throw new Error(`writeAtomic failed (rename+copy): rename=${lastErr?.code} copy=${copyErr.code} dest=${outPath}`);
  }
}

function main() {
  const args = parseArgs(process.argv);
  const result = enumerate(args);
  if (!result.ok) {
    process.stderr.write(`[partlib-enum] ERROR: ${result.error}\n`);
    process.exit(2);
  }
  writeAtomic(args.out, result);
  process.stdout.write(JSON.stringify({
    ok: true,
    output: args.out,
    total_parts: result.summary.total_parts,
    total_files: result.summary.total_files,
    total_bytes: result.summary.total_bytes,
    file_kind_counts: result.summary.file_kind_counts,
    parts_pair_complete: result.summary.parts_pair_complete,
    parts_with_no_blueprint: result.summary.parts_with_no_blueprint,
    parts_with_no_program: result.summary.parts_with_no_program,
    walk_duration_ms: result.summary.walk_duration_ms,
  }) + "\n");
}

export { parseArgs, classifyFile, walkPart, enumerate, BLUEPRINT_EXTS, PROGRAM_EXTS };

const __invokedPath = (process.argv[1] || "").replace(/\\/g, "/");
if (__invokedPath && (
    import.meta.url === `file://${__invokedPath}` ||
    import.meta.url === `file:///${__invokedPath}` ||
    import.meta.url.endsWith(__invokedPath))) {
  try { main(); }
  catch (e) { process.stderr.write(`[partlib-enum] FATAL: ${e?.stack || e}\n`); process.exit(2); }
}
