#!/usr/bin/env node
/**
 * resources-inventory.mjs — walk H:/prism/Resources/, classify each
 * subdir via ResourcesClassifierEngine, emit JSON + markdown reports
 * to feed the Knowledge Ingestion Pipeline (P14-U02+).
 *
 * INTEL-OLLAMA-OBSIDIAN-MS0 / P14-U01.
 *
 * Output:
 *   state/shared/RESOURCES-INVENTORY.json — machine-readable, full data
 *   state/shared/RESOURCES-INVENTORY.md   — human-readable summary
 *   state/shared/RESOURCES-INGEST-CANDIDATES.json — filtered list of
 *     general-knowledge dirs that P14-U02 should batch-ingest
 *
 * Usage:
 *   node mcp-server/scripts/resources-inventory.mjs            # default
 *   node mcp-server/scripts/resources-inventory.mjs --quiet
 *   node mcp-server/scripts/resources-inventory.mjs --json     # JSON to stdout
 *   node mcp-server/scripts/resources-inventory.mjs --root=H:/other/path
 *
 * Walks recursively but caps at MAX_DEPTH levels and MAX_FILES files
 * per directory to keep wall time bounded on a 49 GB tree.
 */

import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync, renameSync, unlinkSync, appendFileSync } from "node:fs";
import { dirname, join, relative, sep, posix, extname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..");
const ENGINE_DIST = join(REPO_ROOT, "mcp-server", "dist", "engines", "ResourcesClassifierEngine.js");
const ENGINE_SRC = join(REPO_ROOT, "mcp-server", "src", "engines", "ResourcesClassifierEngine.ts");
const TSX_BIN = join(REPO_ROOT, "mcp-server", "node_modules", ".bin", process.platform === "win32" ? "tsx.cmd" : "tsx");

const args = new Set(process.argv.slice(2));
const QUIET = args.has("--quiet");
const JSON_OUT = args.has("--json");
const ROOT = (() => {
  const a = [...args].find((x) => x.startsWith("--root="));
  return a ? a.slice("--root=".length) : "H:/prism/Resources";
})();

const STATE_DIR = process.env.PRISM_STATE_SHARED ?? join(REPO_ROOT, "state", "shared");
const OUT_JSON = join(STATE_DIR, "RESOURCES-INVENTORY.json");
const OUT_MD = join(STATE_DIR, "RESOURCES-INVENTORY.md");
const OUT_CANDIDATES = join(STATE_DIR, "RESOURCES-INGEST-CANDIDATES.json");
const LOG_FILE = join(STATE_DIR, "resources-inventory.log");

const MAX_DEPTH = 4;
const MAX_FILES_PER_DIR = 5_000;
const SKIP_DIRS = new Set(["node_modules", ".git", "$RECYCLE.BIN", "System Volume Information"]);

function log(line) {
  try {
    mkdirSync(dirname(LOG_FILE), { recursive: true });
    appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${line}\n`, "utf-8");
  } catch { /* best-effort */ }
}

function atomicWrite(target, content) {
  mkdirSync(dirname(target), { recursive: true });
  const tmp = `${target}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tmp, content, "utf-8");
  try { renameSync(tmp, target); }
  catch {
    try { unlinkSync(target); } catch { /* ignore */ }
    renameSync(tmp, target);
  }
}

/**
 * Walk one top-level subdir, returning every file descendant.
 * Bounded by MAX_DEPTH and MAX_FILES_PER_DIR.
 */
function walkSubdir(rootAbs, subdirRel) {
  const entries = [];
  const stack = [{ absPath: join(rootAbs, subdirRel), depth: 0 }];
  while (stack.length > 0) {
    const { absPath, depth } = stack.pop();
    if (depth >= MAX_DEPTH) continue;
    let dirents;
    try { dirents = readdirSync(absPath, { withFileTypes: true }); }
    catch { continue; }
    for (const e of dirents) {
      if (entries.length >= MAX_FILES_PER_DIR) return entries;
      if (SKIP_DIRS.has(e.name)) continue;
      const childAbs = join(absPath, e.name);
      if (e.isDirectory()) {
        stack.push({ absPath: childAbs, depth: depth + 1 });
        continue;
      }
      if (!e.isFile()) continue;
      let size = 0;
      try { size = statSync(childAbs).size; } catch { /* ignore */ }
      const rel = relative(rootAbs, childAbs).split(sep).join(posix.sep);
      const ext = extname(e.name).toLowerCase();
      entries.push({ relPath: rel, ext, size });
    }
  }
  return entries;
}

async function loadEngine() {
  if (existsSync(ENGINE_DIST)) {
    const mod = await import(pathToFileURL(ENGINE_DIST).href);
    return { mode: "dist", engine: mod.resourcesClassifierEngine };
  }
  if (existsSync(ENGINE_SRC) && existsSync(TSX_BIN)) {
    return { mode: "tsx-subprocess", engine: null };
  }
  throw new Error(`engine unavailable: dist=${existsSync(ENGINE_DIST)} src=${existsSync(ENGINE_SRC)} tsx=${existsSync(TSX_BIN)}`);
}

async function classifyViaTsx(dirRelPath, entries) {
  const bootstrapPath = join(tmpdir(), `resources-bootstrap-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mts`);
  const code = [
    `import { resourcesClassifierEngine } from ${JSON.stringify(pathToFileURL(ENGINE_SRC).href)};`,
    `import { readFileSync } from "node:fs";`,
    `const data = JSON.parse(readFileSync(${JSON.stringify(bootstrapPath + ".data.json")}, "utf-8"));`,
    `const r = resourcesClassifierEngine.summarizeDir(data.dirRelPath, data.entries);`,
    `process.stdout.write(JSON.stringify(r));`,
  ].join("\n");
  writeFileSync(bootstrapPath, code, "utf-8");
  writeFileSync(bootstrapPath + ".data.json", JSON.stringify({ dirRelPath, entries }), "utf-8");
  return await new Promise((resolve) => {
    const isWin = process.platform === "win32";
    const cmdExe = `${process.env.SystemRoot ?? "C:\\Windows"}\\System32\\cmd.exe`;
    const exe = isWin ? cmdExe : TSX_BIN;
    const argv = isWin ? ["/c", TSX_BIN, bootstrapPath] : [bootstrapPath];
    const child = spawn(exe, argv, { stdio: ["ignore", "pipe", "pipe"], windowsHide: true, shell: false });
    let stdout = "";
    child.stdout.on("data", (c) => { stdout += c.toString("utf-8"); });
    child.stderr.on("data", () => {});
    child.on("close", () => {
      try { unlinkSync(bootstrapPath); } catch { /* ignore */ }
      try { unlinkSync(bootstrapPath + ".data.json"); } catch { /* ignore */ }
      try { resolve(JSON.parse(stdout)); }
      catch { resolve(null); }
    });
  });
}

async function summarize(loaded, dirRelPath, entries) {
  if (loaded.mode === "tsx-subprocess") {
    return await classifyViaTsx(dirRelPath, entries);
  }
  return loaded.engine.summarizeDir(dirRelPath, entries);
}

function formatBytes(n) {
  if (n < 1_024) return `${n} B`;
  if (n < 1_024 * 1_024) return `${(n / 1_024).toFixed(1)} KB`;
  if (n < 1_024 * 1_024 * 1_024) return `${(n / 1_024 / 1_024).toFixed(1)} MB`;
  return `${(n / 1_024 / 1_024 / 1_024).toFixed(2)} GB`;
}

function renderMarkdown(summary, allDirs, ingestCandidates) {
  const lines = [
    "# Resources Inventory",
    "",
    "_Auto-generated by `mcp-server/scripts/resources-inventory.mjs` (P14-U01). Do not edit manually._",
    "",
    `**Root:** \`${summary.root}\``,
    `**Generated:** ${summary.generatedAt}`,
    `**Subdirs scanned:** ${summary.subdirCount}`,
    `**Total files:** ${summary.totalFiles.toLocaleString()}`,
    `**Total bytes:** ${formatBytes(summary.totalBytes)}`,
    "",
    "## Bucket totals",
    "",
    "| Category | Subdirs | Files | Bytes |",
    "|---|---|---|---|",
  ];
  for (const cat of ["machining-specific", "general-knowledge", "binary-assets", "mixed"]) {
    const b = summary.byCategory[cat];
    lines.push(`| ${cat} | ${b.dirCount} | ${b.fileCount.toLocaleString()} | ${formatBytes(b.bytes)} |`);
  }
  lines.push("");
  lines.push(`## Ingest candidates (${ingestCandidates.length} general-knowledge dirs)`);
  lines.push("");
  lines.push("These subdirs are classified `general-knowledge` and have ≥1 file. Feed to P14-U02 batch-ingest.");
  lines.push("");
  lines.push("| Subdir | Files | Bytes | Dominant ext |");
  lines.push("|---|---|---|---|");
  for (const d of ingestCandidates.slice(0, 50)) {
    lines.push(`| \`${d.relPath}\` | ${d.fileCount} | ${formatBytes(d.totalBytes)} | \`${d.dominantExt || "(none)"}\` |`);
  }
  if (ingestCandidates.length > 50) {
    lines.push(`| ... | _${ingestCandidates.length - 50} more — see RESOURCES-INGEST-CANDIDATES.json_ | | |`);
  }
  lines.push("");
  lines.push(`## All ${allDirs.length} subdirs`);
  lines.push("");
  lines.push("| Subdir | Category | Files | Bytes | Dominant ext |");
  lines.push("|---|---|---|---|---|");
  const sorted = [...allDirs].sort((a, b) => b.totalBytes - a.totalBytes);
  for (const d of sorted) {
    lines.push(`| \`${d.relPath}\` | ${d.category} | ${d.fileCount} | ${formatBytes(d.totalBytes)} | \`${d.dominantExt || "(none)"}\` |`);
  }
  lines.push("");
  return lines.join("\n");
}

async function main() {
  const start = Date.now();

  if (!existsSync(ROOT)) {
    process.stderr.write(`resources-inventory: root missing: ${ROOT}\n`);
    process.exit(1);
  }

  let loaded;
  try { loaded = await loadEngine(); }
  catch (e) {
    process.stderr.write(`engine load failed: ${(e && e.message) || e}\n`);
    process.exit(1);
  }

  let topLevel = [];
  try { topLevel = readdirSync(ROOT, { withFileTypes: true }); }
  catch (e) {
    process.stderr.write(`cannot read root: ${(e && e.message) || e}\n`);
    process.exit(1);
  }

  const subdirs = topLevel.filter((e) => e.isDirectory() && !SKIP_DIRS.has(e.name)).map((e) => e.name);
  const topLevelFiles = topLevel.filter((e) => e.isFile()).map((e) => {
    let size = 0;
    try { size = statSync(join(ROOT, e.name)).size; } catch { /* ignore */ }
    return { relPath: e.name, ext: extname(e.name).toLowerCase(), size };
  });

  if (!QUIET) {
    process.stdout.write(`Walking ${subdirs.length} subdirs (max-depth ${MAX_DEPTH}) under ${ROOT}\n`);
  }

  const allDirs = [];
  let totalFiles = topLevelFiles.length;
  let totalBytes = topLevelFiles.reduce((a, e) => a + e.size, 0);

  // Top-level files become a synthetic "(top-level)" subdir entry
  if (topLevelFiles.length > 0) {
    const topSummary = await summarize(loaded, "(top-level)", topLevelFiles);
    if (topSummary) allDirs.push(topSummary);
  }

  for (let i = 0; i < subdirs.length; i++) {
    const subdir = subdirs[i];
    const entries = walkSubdir(ROOT, subdir);
    totalFiles += entries.length;
    totalBytes += entries.reduce((a, e) => a + e.size, 0);
    const summary = await summarize(loaded, subdir, entries);
    if (summary) allDirs.push(summary);
    if (!QUIET && (i % 5 === 0 || i === subdirs.length - 1)) {
      process.stdout.write(`  [${i + 1}/${subdirs.length}] ${subdir.padEnd(40)} ${(summary?.category ?? "?").padEnd(20)} files=${summary?.fileCount ?? 0} bytes=${formatBytes(summary?.totalBytes ?? 0)}\n`);
    }
  }

  // Aggregate bucket totals
  const byCategory = {
    "machining-specific": { dirCount: 0, fileCount: 0, bytes: 0 },
    "general-knowledge":  { dirCount: 0, fileCount: 0, bytes: 0 },
    "binary-assets":      { dirCount: 0, fileCount: 0, bytes: 0 },
    "mixed":              { dirCount: 0, fileCount: 0, bytes: 0 },
  };
  for (const d of allDirs) {
    byCategory[d.category].dirCount += 1;
    byCategory[d.category].fileCount += d.fileCount;
    byCategory[d.category].bytes += d.totalBytes;
  }

  const summary = {
    schemaVersion: "1.0.0",
    root: ROOT,
    generatedAt: new Date().toISOString(),
    subdirCount: subdirs.length,
    totalFiles,
    totalBytes,
    byCategory,
    durationMs: Date.now() - start,
    dirs: allDirs,
  };

  // Build ingest candidates list (general-knowledge with ≥1 file)
  const ingestCandidates = allDirs
    .filter((d) => d.category === "general-knowledge" && d.fileCount > 0)
    .sort((a, b) => b.totalBytes - a.totalBytes);

  // Write outputs
  atomicWrite(OUT_JSON, JSON.stringify(summary, null, 2) + "\n");
  atomicWrite(OUT_MD, renderMarkdown(summary, allDirs, ingestCandidates));
  atomicWrite(OUT_CANDIDATES, JSON.stringify({
    schemaVersion: "1.0.0",
    generatedAt: summary.generatedAt,
    root: ROOT,
    candidates: ingestCandidates,
  }, null, 2) + "\n");

  log(`done: subdirs=${summary.subdirCount} files=${summary.totalFiles} bytes=${summary.totalBytes} ingest=${ingestCandidates.length} ms=${summary.durationMs}`);

  if (!QUIET) {
    if (JSON_OUT) {
      process.stdout.write(JSON.stringify(summary) + "\n");
    } else {
      process.stdout.write(
        `\nresources-inventory: subdirs=${summary.subdirCount} files=${summary.totalFiles.toLocaleString()} bytes=${formatBytes(summary.totalBytes)} ingest_candidates=${ingestCandidates.length} ${summary.durationMs}ms\n` +
        `  json: ${OUT_JSON}\n` +
        `  md:   ${OUT_MD}\n` +
        `  candidates: ${OUT_CANDIDATES}\n`,
      );
    }
  }
  process.exit(0);
}

const WATCHDOG_MS = 600_000; // 10 min hard ceiling
setTimeout(() => { log(`watchdog fired after ${WATCHDOG_MS}ms`); process.exit(0); }, WATCHDOG_MS).unref();

main().catch((e) => { log(`unhandled: ${(e && e.message) || e}`); process.exit(1); });
