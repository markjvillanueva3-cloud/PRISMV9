#!/usr/bin/env node
/**
 * memory-garden-scan.mjs — Memory Garden Audit (CLEANUP-MS0/U-CLEANUP-H1)
 *
 * Weekly Mon 04:11 cron sweep over the user's auto-memory directory at
 * `~/.claude/projects/H--PRISM/memory/`. Surfaces three classes of debt:
 *
 *   1. UNREFERENCED — memory files on disk that MEMORY.md never indexes
 *      (orphaned creations from older sessions; candidates for /memory-prune)
 *   2. DANGLING POINTERS — MEMORY.md index entries whose target file
 *      doesn't exist on disk (stale references after a manual delete)
 *   3. STALE PATH REFS — H:/ or C:/ paths inside memory bodies that
 *      no longer resolve on the filesystem (rotted external pointers)
 *
 * Read-only / advisory-only. Does NOT auto-invoke /memory-prune (that's
 * a Claude slash command — operator runs it manually after reviewing
 * the report). Defers prune verdict if any chat slot is currently
 * active per state/shared/chat-slots.json (don't prune mid-session).
 *
 * Output:
 *   - state/shared/MEMORY_GARDEN_REPORT.md  (human)
 *   - state/shared/MEMORY_GARDEN_REPORT.json (machine)
 *
 * Usage:
 *   node scripts/memory-garden-scan.mjs
 *   node scripts/memory-garden-scan.mjs --json
 *   node scripts/memory-garden-scan.mjs --frozen-time 2026-05-13T22:00:00Z
 *   node scripts/memory-garden-scan.mjs --memory-dir <dir> --slots-file <path>
 *
 * Spec: mcp-server/data/milestones/CLEANUP-MS0.json U-CLEANUP-H1.
 */

import {
  readFileSync,
  writeFileSync,
  renameSync,
  readdirSync,
  mkdirSync,
  existsSync,
  statSync,
} from "node:fs";
import { join, dirname, isAbsolute as pathIsAbsolute, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { randomBytes } from "node:crypto";
import { homedir } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO = resolve(__dirname, "..");
const DEFAULT_MEMORY_DIR = join(homedir(), ".claude", "projects", "h--prism", "memory");
const DEFAULT_SLOTS_FILE = "state/shared/chat-slots.json";
const DEFAULT_OUT_MD = "state/shared/MEMORY_GARDEN_REPORT.md";
const DEFAULT_OUT_JSON = "state/shared/MEMORY_GARDEN_REPORT.json";

// MEMORY.md is the index file — every other *.md should appear in its
// pointer list (markdown links of the form `[Title](filename.md)`).
const MEMORY_INDEX_FILENAME = "MEMORY.md";

// Markdown link regex — captures filename in `[label](file.md)` and `[[file]]`-style.
const MD_LINK_RE = /\[([^\]]+)\]\(([^)]+\.md)\)/g;
const WIKILINK_RE = /\[\[([^\]|]+)\]\]/g;

// Path-shape detectors for stale-ref scanning. We intentionally match on
// drive-letter + colon (Windows native) and the `/H:/`/`/C:/` URL form.
const ABS_WIN_PATH_RE = /\b([A-Z]):[\\/]([A-Za-z0-9_./\\-]+)/g;

// Stale-chat threshold (per chat-slots.json lastHeartbeat) — a slot's
// claim counts as "active" only when its heartbeat is fresher than this.
const ACTIVE_HEARTBEAT_MS = 10 * 60 * 1000; // 10 minutes — matches reclaim TTL

// Hard ceiling on a single memory file's size (defensive — typical entry is <10KB).
const MAX_MEMORY_FILE_BYTES = 5 * 1024 * 1024;

// ──────────────────────────────────────────────────────────────────────
// argv
// ──────────────────────────────────────────────────────────────────────

export function parseArgs(argv) {
  const args = { json: false, frozenTime: null, memoryDir: null, slotsFile: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") args.json = true;
    else if (a === "--frozen-time") args.frozenTime = argv[++i];
    else if (a === "--memory-dir") args.memoryDir = argv[++i];
    else if (a === "--slots-file") args.slotsFile = argv[++i];
  }
  if (!args.frozenTime && process.env.PRISM_AUDIT_FROZEN_TIME) {
    args.frozenTime = process.env.PRISM_AUDIT_FROZEN_TIME;
  }
  return args;
}

// ──────────────────────────────────────────────────────────────────────
// Memory dir scan
// ──────────────────────────────────────────────────────────────────────

export function scanMemoryDir(absDir) {
  if (!existsSync(absDir)) return { ok: false, reason: `memory dir not found: ${absDir}` };
  let entries;
  try { entries = readdirSync(absDir); }
  catch (err) { return { ok: false, reason: `readdir failed: ${String(err && err.message || err)}` }; }
  const files = [];
  for (const name of entries) {
    if (!name.endsWith(".md")) continue;
    const p = join(absDir, name);
    let st;
    try { st = statSync(p); } catch { continue; }
    if (!st.isFile()) continue;
    files.push({ name, absPath: p, bytes: st.size, mtime: st.mtimeMs });
  }
  files.sort((a, b) => a.name.localeCompare(b.name));
  return { ok: true, files };
}

// ──────────────────────────────────────────────────────────────────────
// MEMORY.md parsing — extract referenced filenames
// ──────────────────────────────────────────────────────────────────────

export function parseIndexLinks(memoryMdContent) {
  const refs = new Set();
  if (typeof memoryMdContent !== "string") return refs;
  let m;
  // [Title](filename.md)
  MD_LINK_RE.lastIndex = 0;
  while ((m = MD_LINK_RE.exec(memoryMdContent)) !== null) {
    const fname = m[2].trim();
    // Only track simple basenames (skip http(s) / external paths)
    if (/^https?:\/\//.test(fname)) continue;
    if (fname.includes("/") || fname.includes("\\")) continue;
    refs.add(fname);
  }
  // [[wikilink]] form (no .md suffix in the link, but resolves to <name>.md)
  WIKILINK_RE.lastIndex = 0;
  while ((m = WIKILINK_RE.exec(memoryMdContent)) !== null) {
    const stem = m[1].trim();
    if (stem.length > 0 && !stem.includes("/") && !stem.includes("\\")) {
      refs.add(stem.endsWith(".md") ? stem : `${stem}.md`);
    }
  }
  return refs;
}

// ──────────────────────────────────────────────────────────────────────
// Stale-path-ref scan inside a memory body
// ──────────────────────────────────────────────────────────────────────

export function findStalePathRefs(content, opts = {}) {
  const stale = [];
  const checked = new Set();
  const checkExists = opts.checkExists || ((p) => existsSync(p));
  if (typeof content !== "string") return stale;
  ABS_WIN_PATH_RE.lastIndex = 0;
  let m;
  while ((m = ABS_WIN_PATH_RE.exec(content)) !== null) {
    const drive = m[1];
    const tail = m[2].replace(/\\/g, "/");
    const candidate = `${drive}:/${tail}`;
    // Strip trailing punctuation that's clearly not part of the path
    const cleaned = candidate.replace(/[.,;:'"`)\]}]+$/, "");
    if (checked.has(cleaned)) continue;
    checked.add(cleaned);
    // Skip clearly-non-path tokens (URLs, timestamps with colons, etc.)
    if (cleaned.length < 5 || cleaned.includes("://")) continue;
    // Skip the obvious in-prose mentions like 'H:/PRISM/' (no specific file)
    if (!/[A-Za-z0-9_-]\.[A-Za-z0-9]+$|\/$/.test(cleaned)) continue;
    if (!checkExists(cleaned)) stale.push(cleaned);
  }
  return stale;
}

// ──────────────────────────────────────────────────────────────────────
// Active-chat detection (defer prune verdict if any slot is active)
// ──────────────────────────────────────────────────────────────────────

export function loadChatSlots(absPath) {
  if (!existsSync(absPath)) return { ok: false, reason: `slots file not found: ${absPath}`, slots: {} };
  let parsed;
  try { parsed = JSON.parse(readFileSync(absPath, "utf8")); }
  catch (err) { return { ok: false, reason: `parse failed: ${String(err && err.message || err)}`, slots: {} }; }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, reason: "slots file root is not an object", slots: {} };
  }
  return { ok: true, slots: parsed.slots && typeof parsed.slots === "object" && !Array.isArray(parsed.slots) ? parsed.slots : {} };
}

export function activeSlotCount(slotsObj, nowMs, activeWindowMs = ACTIVE_HEARTBEAT_MS) {
  if (!slotsObj || typeof slotsObj !== "object") return 0;
  let count = 0;
  for (const slot of Object.values(slotsObj)) {
    if (!slot || typeof slot !== "object") continue;
    const hb = slot.lastHeartbeat;
    const hbMs = hb ? Date.parse(hb) : NaN;
    if (Number.isFinite(hbMs) && nowMs - hbMs < activeWindowMs) count++;
  }
  return count;
}

// ──────────────────────────────────────────────────────────────────────
// Top-level orchestrator
// ──────────────────────────────────────────────────────────────────────

function resolveAbsPath(repo, override, fallback) {
  if (!override) return join(repo, fallback);
  return pathIsAbsolute(override) ? override : join(repo, override);
}

function emptyShape() {
  return {
    schemaVersion: 1,
    counts: {
      memory_files: 0, indexed_in_memory_md: 0,
      unreferenced: 0, dangling_pointers: 0,
      files_with_stale_path_refs: 0, total_stale_path_refs: 0,
      active_chats: 0,
    },
    unreferenced: [],
    dangling_pointers: [],
    files_with_stale_path_refs: [],
    prune_verdict: { recommended: false, deferred: false, reason: "no_data" },
  };
}

export async function scanMemoryGarden(opts = {}) {
  const repo = opts.repo || DEFAULT_REPO;
  const memoryDir = opts.memoryDir
    ? (pathIsAbsolute(opts.memoryDir) ? opts.memoryDir : join(repo, opts.memoryDir))
    : DEFAULT_MEMORY_DIR;
  const slotsPath = resolveAbsPath(repo, opts.slotsFile, DEFAULT_SLOTS_FILE);
  const generatedAt = opts.frozenTime || new Date().toISOString();
  const nowMs = opts.nowMs != null ? opts.nowMs : Date.now();

  const dirScan = scanMemoryDir(memoryDir);
  if (!dirScan.ok) {
    return {
      ok: false,
      reason: `memory: ${dirScan.reason}`,
      generated_at: generatedAt,
      memory_dir: memoryDir.replace(/\\/g, "/"),
      slots_file: slotsPath.replace(/\\/g, "/"),
      ...emptyShape(),
    };
  }

  const filesByName = new Map(dirScan.files.map((f) => [f.name, f]));
  const indexFile = filesByName.get(MEMORY_INDEX_FILENAME);
  let indexedRefs = new Set();
  if (indexFile) {
    let raw;
    try { raw = readFileSync(indexFile.absPath, "utf8"); }
    catch { raw = ""; }
    indexedRefs = parseIndexLinks(raw);
  }

  // UNREFERENCED: files on disk not in MEMORY.md (excluding MEMORY.md itself)
  const unreferenced = [];
  for (const f of dirScan.files) {
    if (f.name === MEMORY_INDEX_FILENAME) continue;
    if (!indexedRefs.has(f.name)) unreferenced.push({ name: f.name, bytes: f.bytes, mtime: new Date(f.mtime).toISOString() });
  }

  // DANGLING POINTERS: refs in MEMORY.md whose target file doesn't exist
  const dangling = [];
  for (const ref of indexedRefs) {
    if (!filesByName.has(ref)) dangling.push(ref);
  }
  dangling.sort();

  // STALE PATH REFS: scan each file's body for absolute paths that don't resolve
  const filesWithStale = [];
  let totalStale = 0;
  const checkExists = opts.checkExists || ((p) => existsSync(p));
  for (const f of dirScan.files) {
    if (f.bytes > MAX_MEMORY_FILE_BYTES) continue;
    let body;
    try { body = readFileSync(f.absPath, "utf8"); } catch { continue; }
    const stale = findStalePathRefs(body, { checkExists });
    if (stale.length > 0) {
      filesWithStale.push({ name: f.name, stale_path_count: stale.length, sample: stale.slice(0, 3) });
      totalStale += stale.length;
    }
  }
  filesWithStale.sort((a, b) => b.stale_path_count - a.stale_path_count || a.name.localeCompare(b.name));

  // Active-chat count (defer-prune signal)
  const slotsLoad = loadChatSlots(slotsPath);
  const activeChats = slotsLoad.ok ? activeSlotCount(slotsLoad.slots, nowMs) : 0;

  // Prune verdict — recommend only when there's actual debt AND no active sessions
  const totalDebt = unreferenced.length + dangling.length + filesWithStale.length;
  let pruneVerdict;
  if (activeChats > 0) {
    pruneVerdict = { recommended: false, deferred: true, reason: `${activeChats} active chat(s) — defer prune to quiet window` };
  } else if (totalDebt === 0) {
    pruneVerdict = { recommended: false, deferred: false, reason: "no_debt — memory garden is clean" };
  } else {
    pruneVerdict = {
      recommended: true,
      deferred: false,
      reason: `${unreferenced.length} unref + ${dangling.length} dangling + ${filesWithStale.length} stale-ref files; safe to /memory-prune (no active chats)`,
    };
  }

  return {
    ok: true,
    schemaVersion: 1,
    generated_at: generatedAt,
    memory_dir: memoryDir.replace(/\\/g, "/"),
    slots_file: slotsPath.replace(/\\/g, "/"),
    counts: {
      memory_files: dirScan.files.length,
      indexed_in_memory_md: indexedRefs.size,
      unreferenced: unreferenced.length,
      dangling_pointers: dangling.length,
      files_with_stale_path_refs: filesWithStale.length,
      total_stale_path_refs: totalStale,
      active_chats: activeChats,
    },
    unreferenced,
    dangling_pointers: dangling,
    files_with_stale_path_refs: filesWithStale,
    prune_verdict: pruneVerdict,
  };
}

// ──────────────────────────────────────────────────────────────────────
// Markdown render
// ──────────────────────────────────────────────────────────────────────

export function renderMarkdown(report) {
  if (!report.ok) {
    return `# MEMORY_GARDEN_REPORT\n\n**ERROR:** ${report.reason}\n\nGenerated: ${report.generated_at}\n`;
  }
  const lines = [];
  lines.push("# Memory Garden Report");
  lines.push("");
  lines.push(`> Generated: ${report.generated_at}`);
  lines.push(`> Source: \`scripts/memory-garden-scan.mjs\``);
  lines.push(`> Memory dir: \`${report.memory_dir}\``);
  lines.push(`> Active chats: ${report.counts.active_chats} (per ${report.slots_file})`);
  lines.push("");
  lines.push("## Counts");
  lines.push("");
  lines.push(`- Memory files on disk: **${report.counts.memory_files}**`);
  lines.push(`- Indexed in MEMORY.md: **${report.counts.indexed_in_memory_md}**`);
  lines.push(`- Unreferenced (orphan): **${report.counts.unreferenced}**`);
  lines.push(`- Dangling pointers (in index, file gone): **${report.counts.dangling_pointers}**`);
  lines.push(`- Files with stale H:/C: path refs: **${report.counts.files_with_stale_path_refs}** (${report.counts.total_stale_path_refs} total bad refs)`);
  lines.push("");
  lines.push("## Prune verdict");
  lines.push("");
  if (report.prune_verdict.recommended) {
    lines.push(`🟢 **RECOMMENDED**: ${report.prune_verdict.reason}`);
  } else if (report.prune_verdict.deferred) {
    lines.push(`🟡 **DEFERRED**: ${report.prune_verdict.reason}`);
  } else {
    lines.push(`⚪ **CLEAN**: ${report.prune_verdict.reason}`);
  }
  lines.push("");
  if (report.unreferenced.length > 0) {
    lines.push("## Unreferenced files (candidates for /memory-prune)");
    lines.push("");
    lines.push("| File | Bytes | Last modified |");
    lines.push("|------|------:|---------------|");
    for (const u of report.unreferenced.slice(0, 50)) lines.push(`| \`${u.name}\` | ${u.bytes} | ${u.mtime} |`);
    if (report.unreferenced.length > 50) lines.push(`| _(${report.unreferenced.length - 50} more)_ | | |`);
    lines.push("");
  }
  if (report.dangling_pointers.length > 0) {
    lines.push("## Dangling pointers in MEMORY.md");
    lines.push("");
    for (const d of report.dangling_pointers) lines.push(`- \`${d}\` — referenced but missing from disk`);
    lines.push("");
  }
  if (report.files_with_stale_path_refs.length > 0) {
    lines.push("## Files with stale H:/C: path references");
    lines.push("");
    lines.push("| File | Bad refs | Sample |");
    lines.push("|------|---------:|--------|");
    for (const f of report.files_with_stale_path_refs.slice(0, 30)) {
      lines.push(`| \`${f.name}\` | ${f.stale_path_count} | ${f.sample.map((s) => `\`${s}\``).join("<br>")} |`);
    }
    lines.push("");
  }
  lines.push("> Advisory only — operator runs `/memory-prune` manually after reviewing this report.");
  return lines.join("\n");
}

// ──────────────────────────────────────────────────────────────────────
// Atomic write
// ──────────────────────────────────────────────────────────────────────

export function writeAtomic(absPath, content) {
  const dir = dirname(absPath);
  mkdirSync(dir, { recursive: true });
  const tmp = `${absPath}.tmp-${process.pid}-${Date.now()}-${randomBytes(3).toString("hex")}`;
  writeFileSync(tmp, content, "utf8");
  renameSync(tmp, absPath);
}

// ──────────────────────────────────────────────────────────────────────
// CLI entry
// ──────────────────────────────────────────────────────────────────────

export async function runCli(argv = process.argv, opts = {}) {
  const args = parseArgs(argv);
  const repo = opts.repo || DEFAULT_REPO;
  const report = await scanMemoryGarden({
    repo,
    memoryDir: args.memoryDir || opts.memoryDir,
    slotsFile: args.slotsFile || opts.slotsFile,
    frozenTime: args.frozenTime,
    checkExists: opts.checkExists,
    nowMs: opts.nowMs,
  });

  if (args.json) {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
    return report;
  }

  const outJson = join(repo, DEFAULT_OUT_JSON);
  const outMd = join(repo, DEFAULT_OUT_MD);
  try {
    writeAtomic(outJson, JSON.stringify(report, null, 2) + "\n");
    writeAtomic(outMd, renderMarkdown(report));
  } catch (err) {
    process.stderr.write(`memory-garden-scan: write failed — ${String(err && err.message || err)}\n`);
    process.exitCode = 0;
  }

  if (report.ok) {
    process.stdout.write(
      `memory-garden-scan: files=${report.counts.memory_files} indexed=${report.counts.indexed_in_memory_md} unref=${report.counts.unreferenced} dangling=${report.counts.dangling_pointers} stale-refs=${report.counts.total_stale_path_refs} active-chats=${report.counts.active_chats} verdict=${report.prune_verdict.recommended ? "RECOMMEND" : report.prune_verdict.deferred ? "DEFER" : "CLEAN"}\n`,
    );
  } else {
    process.stdout.write(`memory-garden-scan: not ok — ${report.reason}\n`);
  }
  return report;
}

const invokedDirectly = (() => {
  try {
    if (!process.argv[1]) return false;
    return pathToFileURL(process.argv[1]).href === import.meta.url;
  } catch {
    return false;
  }
})();
if (invokedDirectly) {
  void runCli().catch((err) => {
    process.stderr.write(`memory-garden-scan: unhandled — ${String(err && err.stack || err)}\n`);
    process.exitCode = 0;
  });
}
