#!/usr/bin/env node
/**
 * resources-weekly-scan.mjs
 *
 * OBSIDIAN-COMPOUND-MS1/S5/U-RESOURCES-INGEST-CRON
 *
 * Walks `H:/Resources/` (or override via --root), finds files modified
 * since the last successful scan, and writes one `inbox/resources-<slug>-<ts>.md`
 * marker per file into `H:/prism/knowledge/memories/inbox/`. The
 * U-EMERGING-THESIS + U-DAILY-PERSONAL-BRIEF synthesizers will surface
 * the markers on their next run.
 *
 * The marker file is metadata-only — it carries:
 *   - source absolute path (so a human can `start <path>` from the inbox)
 *   - file size, mtime, sha256-prefix
 *   - extension-derived `kind` (pdf, video, doc, code, image, other)
 *   - a one-line stub body inviting the reader to triage
 *
 * No content extraction here — that's the role of /pdf-learn, /video-learn,
 * etc., which are routed by the user from the inbox marker.
 *
 * State file: `H:/prism/mcp-server/data/state/resources-weekly-scan.json`
 *   { schemaVersion, lastScanIso, lastScanPath, totalQueuedAllTime,
 *     batches: [{ ts, scanned, queued, deferred, errored }] }
 *
 * Cron schedule: `23 3 * * *` (envelope spec — daily 03:23 local).
 *
 * Safety contract
 * ---------------
 *   - Default mode is dry-run; --apply required to write inbox markers.
 *   - Per-batch cap (default 5000 files) — prevents inbox flood on first run.
 *   - Idempotent on mtime: file already in inbox-state ledger is skipped.
 *   - Atomic state-write at end of run.
 *   - Missing root directory → reports counters=0, errored=0 (no-op success).
 *
 * Usage:
 *   node scripts/resources-weekly-scan.mjs                  # dry-run
 *   node scripts/resources-weekly-scan.mjs --apply          # write markers
 *   node scripts/resources-weekly-scan.mjs --apply --batch 1000
 *   node scripts/resources-weekly-scan.mjs --root /tmp/test --apply
 *
 * @milestone OBSIDIAN-COMPOUND-MS1/S5/U-RESOURCES-INGEST-CRON
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync, renameSync, unlinkSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, resolve, dirname, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");

const DEFAULT_ROOT = "H:/Resources";
const DEFAULT_INBOX = join(REPO_ROOT, "knowledge", "memories", "inbox");
const DEFAULT_STATE = join(REPO_ROOT, "mcp-server", "data", "state", "resources-weekly-scan.json");
const DEFAULT_BATCH = 5000;
const DEFAULT_MAX_DEPTH = 8;
const SHA_PREFIX_LEN = 12;
const STUB_BODY_MAX = 200;

const SKIP_DIRS = new Set([
  "node_modules", ".git", "dist", "build", "__pycache__", ".cache",
  "Trash", "$RECYCLE.BIN", "System Volume Information",
]);

const KIND_BY_EXT = new Map([
  [".pdf", "pdf"],
  [".doc", "doc"], [".docx", "doc"], [".rtf", "doc"], [".odt", "doc"],
  [".md", "doc"], [".txt", "doc"],
  [".mp4", "video"], [".mkv", "video"], [".avi", "video"], [".mov", "video"], [".webm", "video"],
  [".png", "image"], [".jpg", "image"], [".jpeg", "image"], [".tiff", "image"], [".tif", "image"], [".bmp", "image"], [".gif", "image"],
  [".step", "cad"], [".stp", "cad"], [".iges", "cad"], [".igs", "cad"], [".dxf", "cad"], [".stl", "cad"],
  [".js", "code"], [".ts", "code"], [".py", "code"], [".rs", "code"], [".go", "code"], [".sh", "code"], [".mjs", "code"],
  [".json", "data"], [".csv", "data"], [".xml", "data"], [".yaml", "data"], [".yml", "data"],
  [".nc", "gcode"], [".cnc", "gcode"], [".tap", "gcode"], [".eia", "gcode"],
]);

function classifyKind(filename) {
  const ext = extname(filename).toLowerCase();
  return KIND_BY_EXT.get(ext) ?? "other";
}

function loadState(statePath) {
  if (!existsSync(statePath)) {
    return {
      schemaVersion: "1.0.0",
      lastScanIso: null,
      lastScanPath: null,
      totalQueuedAllTime: 0,
      batches: [],
      seenPaths: {},  // key: absolute path → mtimeMs of last seen
    };
  }
  try {
    const j = JSON.parse(readFileSync(statePath, "utf8"));
    j.seenPaths ??= {};
    j.batches ??= [];
    return j;
  } catch {
    // Corrupt state — fresh start, do NOT delete the corrupt file (caller decides).
    return {
      schemaVersion: "1.0.0",
      lastScanIso: null,
      lastScanPath: null,
      totalQueuedAllTime: 0,
      batches: [],
      seenPaths: {},
      stateLoadFailed: true,
    };
  }
}

function atomicWriteJson(path, value) {
  return atomicWriteText(path, JSON.stringify(value, null, 2) + "\n");
}

function atomicWriteText(path, content) {
  const tmp = `${path}.scan.tmp`;
  writeFileSync(tmp, content, "utf8");
  try { renameSync(tmp, path); }
  catch (err) {
    try { unlinkSync(tmp); } catch { /* ignore */ }
    throw err;
  }
}

function walk(root, maxDepth, batchCap) {
  if (!existsSync(root)) return [];
  const out = [];
  const stack = [{ dir: root, depth: 0 }];
  while (stack.length > 0 && out.length < batchCap) {
    const { dir, depth } = stack.pop();
    if (depth > maxDepth) continue;
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const ent of entries) {
      if (out.length >= batchCap) break;
      if (SKIP_DIRS.has(ent.name)) continue;
      if (ent.name.startsWith(".")) continue;
      const full = join(dir, ent.name);
      if (ent.isDirectory()) {
        stack.push({ dir: full, depth: depth + 1 });
      } else if (ent.isFile()) {
        let st;
        try { st = statSync(full); } catch { continue; }
        out.push({ path: full, size: st.size, mtimeMs: st.mtimeMs });
      }
    }
  }
  return out;
}

function slugify(filename) {
  return filename
    .toLowerCase()
    .replace(extname(filename).toLowerCase(), "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function sha256Prefix(absPath, sizeBytes) {
  // Hash on path + mtime, NOT content — we don't read big binaries here.
  const h = createHash("sha256");
  h.update(absPath);
  h.update(String(sizeBytes));
  return h.digest("hex").slice(0, SHA_PREFIX_LEN);
}

function buildMarker(file, kind, scanIso) {
  const fname = basename(file.path);
  const ext = extname(fname).slice(1).toLowerCase() || "noext";
  const sha = sha256Prefix(file.path, file.size);
  const fm = [
    "---",
    "type: resource-marker",
    `kind: ${kind}`,
    `source_path: ${JSON.stringify(file.path.replace(/\\/g, "/"))}`,
    `source_filename: ${JSON.stringify(fname)}`,
    `source_extension: ${ext}`,
    `source_size_bytes: ${file.size}`,
    `source_mtime_iso: ${new Date(file.mtimeMs).toISOString()}`,
    `source_sha_prefix: ${sha}`,
    `scanned_at: ${scanIso}`,
    "milestone: OBSIDIAN-COMPOUND-MS1/S5/U-RESOURCES-INGEST-CRON",
    "epistemic_only: true",
    "consumed_by_machining: false",
    "---",
    "",
  ].join("\n");

  let action = "Triage this resource — ";
  switch (kind) {
    case "pdf":   action += "run `/pdf-learn " + JSON.stringify(file.path.replace(/\\/g, "/")) + "` to extract knowledge."; break;
    case "video": action += "run `/video-learn " + JSON.stringify(file.path.replace(/\\/g, "/")) + "` to extract procedures."; break;
    case "cad":   action += "open in CAD tool or run `/cad-extract` for feature recognition."; break;
    case "gcode": action += "run `/program-validate` to safety-check."; break;
    case "doc":   action += "read directly or run `/learn` for routing."; break;
    case "code":  action += "review and decide whether to add to PRISM tooling."; break;
    case "data":  action += "inspect headers and consider linking from a wiki entry."; break;
    case "image": action += "tag visually and link to the parent doc/program if known."; break;
    default:      action += "decide if this file deserves a slot in the wiki or memories."; break;
  }
  const stub = `# Resource: ${fname}\n\n${action}\n\n_Source mtime: ${new Date(file.mtimeMs).toISOString()}, size: ${file.size} bytes._\n`;
  // Cap stub length defensively.
  return fm + stub.slice(0, STUB_BODY_MAX * 4);
}

export function runResourcesScan(opts = {}) {
  const root = resolve(opts.root ?? DEFAULT_ROOT);
  const inboxDir = resolve(opts.inbox ?? DEFAULT_INBOX);
  const statePath = resolve(opts.state ?? DEFAULT_STATE);
  const batchCap = opts.batch ?? DEFAULT_BATCH;
  const maxDepth = opts.maxDepth ?? DEFAULT_MAX_DEPTH;
  const apply = !!opts.apply;
  const scanIso = opts.nowIso ?? new Date().toISOString();
  const scanMs = Date.parse(scanIso);

  const counters = { scanned: 0, queued: 0, alreadySeen: 0, errored: 0, deferredOverBatch: 0 };
  const writes = [];

  if (!existsSync(root)) {
    return {
      apply, root, counters, writes, scanIso,
      reason: "root-not-found",
    };
  }

  const state = loadState(statePath);
  const lastScanMs = state.lastScanIso ? Date.parse(state.lastScanIso) : 0;
  const seen = state.seenPaths;

  const files = walk(root, maxDepth, batchCap * 4); // Walk wider to allow filtering.
  counters.scanned = files.length;

  if (!existsSync(inboxDir) && apply) {
    mkdirSync(inboxDir, { recursive: true });
  }

  for (const f of files) {
    if (counters.queued >= batchCap) {
      counters.deferredOverBatch++;
      continue;
    }
    const canonical = f.path.replace(/\\/g, "/");
    const seenMtime = seen[canonical];
    // mtime-based idempotency: if the file's mtime hasn't advanced since last seen, skip.
    if (typeof seenMtime === "number" && f.mtimeMs <= seenMtime) {
      counters.alreadySeen++;
      continue;
    }
    // Also skip files older than last full scan unless they're truly new.
    if (lastScanMs > 0 && f.mtimeMs <= lastScanMs && typeof seenMtime !== "number") {
      // Older than last scan AND we've never seen it — could be a backfill case.
      // Surface it once so old material doesn't stay invisible forever.
    }

    const kind = classifyKind(f.path);
    const slug = slugify(basename(f.path));
    const sha = sha256Prefix(f.path, f.size);
    const ts = scanIso.slice(0, 10);
    const inboxName = `resources-${slug}-${sha}-${ts}.md`;
    const inboxPath = join(inboxDir, inboxName);
    const marker = buildMarker(f, kind, scanIso);

    writes.push({ inboxPath, sourcePath: f.path });
    if (apply) {
      try {
        atomicWriteText(inboxPath, marker);
      } catch (err) {
        counters.errored++;
        continue;
      }
      seen[canonical] = f.mtimeMs;
    }
    counters.queued++;
  }

  if (apply) {
    state.lastScanIso = scanIso;
    state.lastScanPath = root;
    state.totalQueuedAllTime = (state.totalQueuedAllTime ?? 0) + counters.queued;
    state.batches.push({ ts: scanIso, scanned: counters.scanned, queued: counters.queued, deferred: counters.deferredOverBatch, errored: counters.errored });
    state.batches = state.batches.slice(-32); // keep last 32 batches
    state.seenPaths = seen;
    if (!existsSync(dirname(statePath))) mkdirSync(dirname(statePath), { recursive: true });
    atomicWriteJson(statePath, state);
  }

  return { apply, root, counters, writes, scanIso };
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI
// ─────────────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const out = { apply: false, json: false, root: undefined, inbox: undefined, state: undefined, batch: DEFAULT_BATCH };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--apply") out.apply = true;
    else if (a === "--json") out.json = true;
    else if (a === "--root") out.root = argv[++i];
    else if (a === "--inbox") out.inbox = argv[++i];
    else if (a === "--state") out.state = argv[++i];
    else if (a === "--batch") out.batch = parseInt(argv[++i], 10);
    else if (a === "--help" || a === "-h") { console.log(`resources-weekly-scan.mjs — write inbox markers for new files under H:/Resources/`); process.exit(0); }
  }
  return out;
}

const isMain = (() => {
  try { return resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url); }
  catch { return false; }
})();

if (isMain) {
  const args = parseArgs(process.argv);
  const r = runResourcesScan(args);
  if (args.json) {
    console.log(JSON.stringify(r, null, 2));
  } else {
    console.log(`resources-weekly-scan: apply=${r.apply} root=${r.root}`);
    console.log(`  scanned:           ${r.counters.scanned}`);
    console.log(`  queued (markers):  ${r.counters.queued}`);
    console.log(`  already-seen:      ${r.counters.alreadySeen}`);
    console.log(`  deferred:          ${r.counters.deferredOverBatch}`);
    console.log(`  errored:           ${r.counters.errored}`);
    if (r.reason === "root-not-found") console.log(`  (root does not exist on this machine — no-op)`);
    if (!r.apply && r.counters.queued > 0) console.log(`  (DRY-RUN — pass --apply to write markers)`);
  }
  process.exit(r.counters.errored > 0 ? 1 : 0);
}
