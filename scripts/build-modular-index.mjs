#!/usr/bin/env node
/**
 * build-modular-index.mjs -- a MODULAR, section-loadable file index for the H:
 * drive codebase. Instead of one monolithic graph consumers must load whole
 * (the 711MB system-graph.json OOM problem), this emits:
 *
 *   state/shared/modular-index/manifest.json        <- thin: one row per SECTION
 *   state/shared/modular-index/sections/<id>.jsonl  <- per-file rows, loaded ON DEMAND
 *
 * A SECTION is (root, depth-1 subdir). To search, a consumer reads the small
 * manifest, picks the relevant section(s), then loads ONLY those shard(s) --
 * "call up a section, not the full thing." Nothing ever loads the whole index.
 *
 * MEMORY MODEL (the OOM fix): shards are written via a streaming file descriptor
 * (fs.writeSync per file), so resident memory is O(1) per file regardless of how
 * many files a section holds. There is NO per-section file cap -- a section with
 * 2M files streams 2M lines without growing the heap. This is why the FULL H:
 * drive (1.18M+ files, 757GB) indexes without OOM on any heap size.
 *
 * MODES:
 *   node scripts/build-modular-index.mjs            # DEFAULT_ROOTS (distinct codebases)
 *   node scripts/build-modular-index.mjs --full     # every H: root (incl. slot worktrees + stale variants)
 *   node scripts/build-modular-index.mjs --root H:/cad-engine   # one ad-hoc root
 *   node scripts/build-modular-index.mjs --json     # machine-readable summary
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRISM_ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(PRISM_ROOT, "state", "shared", "modular-index");
const SECTIONS_DIR = path.join(OUT_DIR, "sections");
const H_DRIVE = "H:/";

// Distinct code roots worth indexing by default. id is the manifest namespace.
const DEFAULT_ROOTS = [
  { id: "prism", path: "H:/prism" },
  { id: "cad-engine", path: "H:/cad-engine" },
  { id: "docustrata", path: "H:/Docustrata" },
  { id: "jmd", path: "H:/JMD" },
  { id: "mcp-server", path: "H:/mcp-server" },
  { id: "obsidian", path: "H:/OBSIDIAN" },
  { id: "launch", path: "H:/LAUNCH" },
  { id: "hermes-install", path: "H:/hermes-install" },
  { id: "new-pc-setup", path: "H:/NEW-PC-SETUP" },
];

// Directory names never descended into (deps, caches, build output, binaries, VCS).
const IGNORE_DIRS = new Set([
  "node_modules", ".git", ".hg", ".svn", "dist", "build", "out", ".next",
  ".turbo", ".cache", ".uv-cache", ".hf-cache", "__pycache__", ".pytest_cache",
  ".venv", "venv", ".venv2", ".venv-wedm-lora", "env", ".mypy_cache",
  "coverage", ".nyc_output", "target", ".gradle", "bin", "obj", "blobs",
  ".idea", ".vscode-test", "tmp", "temp", ".tmp", "cache", "logs",
  "shell-snapshots",
]);

// Top-level H: dirs --full never treats as a root (system/binary/cache/recovery).
const FULL_ROOT_SKIP = new Set([
  "$RECYCLE.BIN", "System", "SteamLibrary", "WSL", "DockerData", "found.000",
  "found.001", "found.002", "found.003", "found.004", "recovery-logs",
  ".hf-cache", ".uv-cache", ".uv-python", ".cache", ".venv", ".venv2",
  ".venv-wedm-lora", "tmp", "temp", ".tmp", "blobs", "CodexTmp",
  "0", "c", "BIOS", "%SystemDrive%",
]);

// Extensions we treat as code/text (others recorded by path+size, binary:true).
const TEXT_EXT = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py", ".json", ".md", ".mdx",
  ".yml", ".yaml", ".toml", ".ini", ".sh", ".ps1", ".bat", ".sql", ".html",
  ".css", ".scss", ".vue", ".svelte", ".go", ".rs", ".java", ".c", ".h",
  ".cpp", ".hpp", ".cs", ".rb", ".php", ".lua", ".r", ".jl", ".txt", ".csv",
  ".xml", ".cfg", ".conf", ".env", ".nc", ".min", ".cnc", ".cps", ".dxf",
  ".step", ".stp", ".tcl", ".hnc",
]);

function sanitize(s) {
  return s.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
}

/**
 * Recursively stream files under dir, invoking onFile(fullPath) per file.
 * No accumulation -- O(1) memory. Skips IGNORE_DIRS + symlinks (loop-safe).
 */
function walkStream(dir, onFile) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return; } // unreadable dir -- skip, never throw
  for (const e of entries) {
    if (e.isSymbolicLink()) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (IGNORE_DIRS.has(e.name)) continue;
      walkStream(full, onFile);
    } else if (e.isFile()) {
      onFile(full);
    }
  }
}

/**
 * Index one root, streaming each section's shard to disk as it walks.
 * Returns lightweight manifest rows only (never retains file arrays).
 */
function indexRoot(root) {
  let topEntries;
  try { topEntries = fs.readdirSync(root.path, { withFileTypes: true }); }
  catch { return { ok: false, rows: [] }; }

  const rows = [];
  for (const e of topEntries) {
    if (e.isSymbolicLink()) continue;
    const isDir = e.isDirectory();
    if (isDir && IGNORE_DIRS.has(e.name)) continue;
    const sectionKey = isDir ? e.name : "_root";
    const sectionId = `${root.id}__${sanitize(sectionKey)}`;
    const shardPath = path.join(SECTIONS_DIR, `${sectionId}.jsonl`);

    // Stream this section's files straight to the shard fd (bounded memory).
    const fd = fs.openSync(shardPath, "w");
    let files = 0, bytes = 0;
    const exts = new Map();
    const onFile = (full) => {
      let size = 0;
      try { size = fs.statSync(full).size; } catch { /* skip stat error */ }
      const ext = path.extname(full).toLowerCase();
      fs.writeSync(fd, JSON.stringify({
        path: full.replace(/\\/g, "/"),
        name: path.basename(full),
        ext, size, binary: !TEXT_EXT.has(ext),
      }) + "\n");
      files++; bytes += size;
      exts.set(ext, (exts.get(ext) || 0) + 1);
    };
    if (isDir) walkStream(path.join(root.path, e.name), onFile);
    else if (e.isFile()) onFile(path.join(root.path, e.name));
    fs.closeSync(fd);

    if (files === 0) { try { fs.unlinkSync(shardPath); } catch { /* noop */ } continue; }
    const extsTop = [...exts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
      .map(([x, n]) => `${x || "<none>"}:${n}`);
    rows.push({
      id: sectionId, root: root.id, dir: sectionKey,
      files, bytes, exts: extsTop, shard: `sections/${sectionId}.jsonl`,
    });
  }
  return { ok: true, rows };
}

/** --full: every top-level H: dir that isn't a skip/ignore target becomes a root. */
function discoverAllRoots() {
  let entries;
  try { entries = fs.readdirSync(H_DRIVE, { withFileTypes: true }); }
  catch { return []; }
  return entries
    .filter((e) => e.isDirectory() && !e.isSymbolicLink())
    .map((e) => e.name)
    .filter((n) => !FULL_ROOT_SKIP.has(n) && !IGNORE_DIRS.has(n))
    .map((n) => ({ id: sanitize(n), path: path.join(H_DRIVE, n) }));
}

function buildIndex(roots) {
  fs.mkdirSync(SECTIONS_DIR, { recursive: true });
  const manifest = {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    note: "Thin section index -- load a section shard on demand, never the whole index.",
    roots: roots.map((r) => ({ id: r.id, path: r.path })),
    sections: [],
  };
  const summary = { roots: 0, rootsMissing: 0, sections: 0, files: 0, bytes: 0 };

  for (const root of roots) {
    if (!fs.existsSync(root.path)) { summary.rootsMissing++; continue; }
    const res = indexRoot(root);
    if (!res.ok) { summary.rootsMissing++; continue; }
    summary.roots++;
    for (const row of res.rows) {
      manifest.sections.push(row);
      summary.sections++;
      summary.files += row.files;
      summary.bytes += row.bytes;
    }
  }

  manifest.sections.sort((a, b) => b.files - a.files);
  manifest.summary = summary;
  fs.writeFileSync(path.join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2));
  return { manifest, summary };
}

/** Cheap query: read ONLY the manifest, return sections whose id/dir/root match term. */
function queryManifest(term, manifestPath = path.join(OUT_DIR, "manifest.json")) {
  if (!fs.existsSync(manifestPath)) return [];
  const m = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const t = term.toLowerCase();
  return m.sections.filter((s) =>
    s.id.toLowerCase().includes(t) || s.dir.toLowerCase().includes(t) || s.root.toLowerCase().includes(t));
}

/**
 * "Call up a section": load ONLY that one shard (never the whole index) and
 * return its file rows, optionally filtered by a path/name substring. Bounded by
 * the section size, not the drive size -- the whole point of the modular design.
 */
function loadSection(sectionId, { grep } = {}, manifestPath = path.join(OUT_DIR, "manifest.json")) {
  if (!fs.existsSync(manifestPath)) return null;
  const m = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const sec = m.sections.find((s) => s.id === sectionId);
  if (!sec) return null;
  const shardPath = path.join(OUT_DIR, sec.shard);
  if (!fs.existsSync(shardPath)) return { section: sec, rows: [] };
  const g = grep ? grep.toLowerCase() : null;
  const rows = [];
  for (const line of fs.readFileSync(shardPath, "utf8").split("\n")) {
    if (!line) continue;
    let row;
    try { row = JSON.parse(line); } catch { continue; }
    if (!g || row.path.toLowerCase().includes(g) || row.name.toLowerCase().includes(g)) rows.push(row);
  }
  return { section: sec, rows };
}

/** Absolute on-disk path for a manifest section row. */
function resolveSectionPath(manifest, sec) {
  const r = manifest.roots.find((x) => x.id === sec.root);
  if (!r) return null;
  return sec.dir === "_root" ? r.path : path.join(r.path, sec.dir);
}

// Resolve a working ripgrep binary once (PATH, env override, or the bundled
// copy the harness ships). Returns null if none -> caller uses node-native scan.
let _rgPath;
function resolveRg() {
  if (_rgPath !== undefined) return _rgPath;
  const tryBin = (bin) => {
    if (!bin) return false;
    try { const r = spawnSync(bin, ["--version"], { encoding: "utf8" }); return !r.error && r.status === 0; }
    catch { return false; }
  };
  for (const c of [process.env.PRISM_RG_PATH, "rg", "rg.exe"]) if (tryBin(c)) { _rgPath = c; return c; }
  // Harness-bundled ripgrep (Codex/VSCode ship one) -- shallow glob, no deep walk.
  try {
    const wa = "C:/Program Files/WindowsApps";
    for (const d of fs.readdirSync(wa)) {
      if (!/Codex|VSCode|vscode/i.test(d)) continue;
      const p = path.join(wa, d, "app", "resources", "rg.exe");
      if (fs.existsSync(p) && tryBin(p)) { _rgPath = p; return p; }
    }
  } catch { /* WindowsApps unreadable -- fall through */ }
  _rgPath = null;
  return null;
}

/** rg search within one dir; returns trimmed file:line:text hits (or null if rg unusable). */
function rgSearch(rg, term, dir, maxPerSection) {
  const r = spawnSync(rg, [
    "--no-heading", "-n", "-S", "--max-count", String(maxPerSection),
    "--max-filesize", "2M", "-g", "!node_modules", "-g", "!*.min.js",
    "--", term, dir,
  ], { encoding: "utf8", maxBuffer: 1e8 });
  if (r.error) return null;
  return (r.stdout || "").trim().split("\n").filter(Boolean).slice(0, maxPerSection).map((l) => l.replace(/\\/g, "/"));
}

/** Node-native fallback: scan the section's text files (via its shard) for term. Bounded. */
function nativeSearch(sec, term, maxPerSection, maxFiles = 8000) {
  const shardPath = path.join(OUT_DIR, sec.shard);
  if (!fs.existsSync(shardPath)) return [];
  const re = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  const hits = [];
  let scanned = 0;
  for (const line of fs.readFileSync(shardPath, "utf8").split("\n")) {
    if (!line || hits.length >= maxPerSection || scanned >= maxFiles) break;
    let row; try { row = JSON.parse(line); } catch { continue; }
    if (row.binary || row.size > 2_000_000) continue;
    scanned++;
    let content; try { content = fs.readFileSync(row.path, "utf8"); } catch { continue; }
    const ls = content.split("\n");
    for (let i = 0; i < ls.length; i++) {
      if (re.test(ls[i])) { hits.push(`${row.path}:${i + 1}:${ls[i].trim().slice(0, 200)}`); if (hits.length >= maxPerSection) break; }
    }
  }
  return hits;
}

/**
 * Efficient CONTENT search: route via the manifest to the relevant section(s),
 * then grep the term ONLY within those sections (not the whole drive). Uses rg
 * when available, else a bounded node-native scan of the section shard.
 * `inQuery` scopes to sections whose id/dir/root match it. Returns grouped hits.
 */
function searchSections(term, { inQuery = null, maxPerSection = 40 } = {}, manifestPath = path.join(OUT_DIR, "manifest.json")) {
  if (!fs.existsSync(manifestPath)) return { ok: false, reason: "no-manifest", groups: [] };
  const m = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const secs = inQuery
    ? m.sections.filter((s) => [s.id, s.dir, s.root].some((f) => f.toLowerCase().includes(inQuery.toLowerCase())))
    : m.sections;
  const rg = resolveRg();
  const groups = [];
  for (const sec of secs) {
    const dir = resolveSectionPath(m, sec);
    if (!dir || !fs.existsSync(dir)) continue;
    let hits = rg ? rgSearch(rg, term, dir, maxPerSection) : null;
    if (hits === null) hits = nativeSearch(sec, term, maxPerSection); // rg missing/errored
    if (hits.length) groups.push({ section: sec.id, dir: dir.replace(/\\/g, "/"), hits, engine: rg ? "rg" : "native" });
  }
  return { ok: true, term, engine: rg ? "rg" : "native", groups };
}

export { buildIndex, indexRoot, discoverAllRoots, queryManifest, loadSection, searchSections, resolveSectionPath, sanitize, walkStream, DEFAULT_ROOTS, IGNORE_DIRS, OUT_DIR };

if (process.argv[1]?.endsWith("build-modular-index.mjs")) {
  const args = process.argv.slice(2);
  const json = args.includes("--json");

  // --query <term>: cheap manifest-only section lookup (never loads a shard).
  const qFlag = args.indexOf("--query");
  if (qFlag >= 0 && args[qFlag + 1]) {
    const hits = queryManifest(args[qFlag + 1]);
    if (json) { console.log(JSON.stringify(hits)); }
    else {
      console.log(`${hits.length} section(s) match "${args[qFlag + 1]}":`);
      for (const s of hits) console.log(`  ${s.id.padEnd(40)} ${String(s.files).padStart(8)} files  ${s.exts.slice(0, 4).join(" ")}`);
    }
    process.exit(0);
  }

  // --open <section-id> [--grep <term>]: load ONLY that one section shard.
  const oFlag = args.indexOf("--open");
  if (oFlag >= 0 && args[oFlag + 1]) {
    const gFlag = args.indexOf("--grep");
    const res = loadSection(args[oFlag + 1], { grep: gFlag >= 0 ? args[gFlag + 1] : null });
    if (!res) { console.error(`section not found: ${args[oFlag + 1]} (run a build first?)`); process.exit(1); }
    if (json) { console.log(JSON.stringify(res.rows)); }
    else {
      console.log(`section ${res.section.id}: ${res.rows.length} file(s)${gFlag >= 0 ? ` matching "${args[gFlag + 1]}"` : ""}`);
      for (const r of res.rows.slice(0, 50)) console.log(`  ${r.path}  (${r.size}b)`);
      if (res.rows.length > 50) console.log(`  ... +${res.rows.length - 50} more`);
    }
    process.exit(0);
  }

  // --search <term> [--in <section-query>]: route via manifest, ripgrep scoped.
  const sFlag = args.indexOf("--search");
  if (sFlag >= 0 && args[sFlag + 1]) {
    const inFlag = args.indexOf("--in");
    const res = searchSections(args[sFlag + 1], { inQuery: inFlag >= 0 ? args[inFlag + 1] : null });
    if (!res.ok) { console.error(`search failed: ${res.reason}`); process.exit(1); }
    if (json) { console.log(JSON.stringify(res)); }
    else {
      const total = res.groups.reduce((n, g) => n + g.hits.length, 0);
      console.log(`"${res.term}" -> ${total} hit(s) across ${res.groups.length} section(s):`);
      for (const g of res.groups.slice(0, 12)) {
        console.log(`\n[${g.section}]`);
        for (const h of g.hits.slice(0, 8)) console.log(`  ${h}`);
      }
    }
    process.exit(0);
  }

  const rootFlag = args.indexOf("--root");
  let roots;
  if (rootFlag >= 0 && args[rootFlag + 1]) {
    roots = [{ id: sanitize(path.basename(args[rootFlag + 1])), path: args[rootFlag + 1] }];
  } else if (args.includes("--full")) {
    roots = discoverAllRoots();
  } else {
    roots = DEFAULT_ROOTS;
  }
  const t0 = Date.now();
  const { summary } = buildIndex(roots);
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  if (json) {
    console.log(JSON.stringify({ ...summary, elapsedSec: Number(secs) }));
  } else {
    console.log(`modular index written to ${OUT_DIR}  (${secs}s)`);
    console.log(`  roots indexed:  ${summary.roots} (missing: ${summary.rootsMissing})`);
    console.log(`  sections:       ${summary.sections}`);
    console.log(`  files:          ${summary.files.toLocaleString()}`);
    console.log(`  total bytes:    ${(summary.bytes / 1e9).toFixed(2)} GB`);
    console.log(`  manifest:       ${path.join(OUT_DIR, "manifest.json")}`);
  }
}
