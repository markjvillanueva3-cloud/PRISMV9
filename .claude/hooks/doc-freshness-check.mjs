#!/usr/bin/env node
/**
 * doc-freshness-check.mjs — PreToolUse staleness warning for Markdown docs
 *
 * WHY: PRISM churns fast (~1700 uncommitted files during active work). Docs
 * written 60+ days ago often reference engine/dispatcher/state shapes that
 * have since changed. Reading an old doc as ground truth leads to wrong
 * recommendations.
 *
 * This hook inspects .md files at Read time. When the file's LAST git
 * commit is >30 days old, it emits permissionDecision "allow" with a
 * staleness warning as the reason — the Read still proceeds, but Claude
 * sees "⚠ this doc is N days old, verify before trusting specifics".
 *
 * Cheap: git log commit-time is cached per (file, mtime) for 7 days; a
 * stable doc is only queried once.
 *
 * NEVER intervenes when:
 *   - Not a .md file
 *   - File not in a git repo / not yet committed
 *   - git log call fails or times out
 *   - File is under plans-archive/, node_modules/, .git/
 *
 * AGI-INFRA Phase C / C1-DOC-FRESHNESS.
 */

import { promises as fs, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { createInterface } from "node:readline";

const CACHE_DIR = "H:/prism/.claude/cache";
const CACHE_FILE = `${CACHE_DIR}/doc-freshness-seen.json`;
const TELEMETRY_FILE = `${CACHE_DIR}/hook-telemetry.jsonl`;
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7d — commit times rarely change
const STALE_THRESHOLD_DAYS = 30;
const GIT_TIMEOUT_MS = 2000;

// Path fragments to skip (archives, vendored, git internals)
const SKIP_FRAGMENTS = [
  "/plans-archive/",
  "\\plans-archive\\",
  "/node_modules/",
  "\\node_modules\\",
  "/.git/",
  "\\.git\\",
  "/dist/",
  "\\dist\\",
];

async function logTelemetry(event) {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.appendFile(TELEMETRY_FILE, JSON.stringify(event) + "\n", "utf8");
  } catch { /* non-fatal */ }
}

async function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    const rl = createInterface({ input: process.stdin });
    rl.on("line", (line) => { data += line + "\n"; });
    rl.on("close", () => resolve(data));
  });
}

async function loadCache() {
  try {
    const raw = await fs.readFile(CACHE_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return (typeof parsed === "object" && parsed !== null) ? parsed : {};
  } catch {
    return {};
  }
}

async function saveCache(cache) {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2), "utf8");
  } catch { /* non-fatal */ }
}

function pruneExpired(cache) {
  const now = Date.now();
  const pruned = {};
  for (const [k, v] of Object.entries(cache)) {
    if (v && typeof v === "object" && typeof v.ts === "number" && now - v.ts < TTL_MS) {
      pruned[k] = v;
    }
  }
  return pruned;
}

function cacheKey(filePath, mtimeMs) {
  return `${filePath}::${mtimeMs}`;
}

function findRepoRoot(filePath) {
  // Walk up to find .git
  let dir = path.dirname(filePath);
  const root = path.parse(dir).root;
  for (let i = 0; i < 10; i++) {
    try {
      if (existsSync(path.join(dir, ".git"))) return dir;
    } catch { /* keep walking */ }
    if (dir === root) return null;
    dir = path.dirname(dir);
  }
  return null;
}

function gitLastCommitEpoch(filePath) {
  try {
    const repoRoot = findRepoRoot(filePath);
    if (!repoRoot) return null;
    const relPath = path.relative(repoRoot, filePath).replace(/\\/g, "/");
    const out = execFileSync("git", ["log", "-1", "--format=%ct", "--", relPath], {
      cwd: repoRoot,
      timeout: GIT_TIMEOUT_MS,
      windowsHide: true,
      stdio: ["ignore", "pipe", "ignore"],
    }).toString().trim();
    if (!out) return null;
    const n = Number(out);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function emitAllowWithWarning(reason) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "allow",
      permissionDecisionReason: reason,
    },
  }));
}

function humanDate(epoch) {
  return new Date(epoch * 1000).toISOString().slice(0, 10);
}

async function main() {
  const raw = await readStdin();
  if (!raw.trim()) process.exit(0);
  let event;
  try { event = JSON.parse(raw); } catch { process.exit(0); }

  if (event.tool_name !== "Read") process.exit(0);
  const input = event.tool_input || {};
  const filePath = input.file_path;
  if (typeof filePath !== "string" || !filePath) process.exit(0);

  if (path.extname(filePath).toLowerCase() !== ".md") process.exit(0);

  // Normalize path for fragment checks
  const norm = filePath.replace(/\\/g, "/");
  if (SKIP_FRAGMENTS.some((f) => filePath.includes(f))) process.exit(0);

  let stat;
  try { stat = await fs.stat(filePath); } catch { process.exit(0); }

  const key = cacheKey(filePath, stat.mtimeMs);
  const cache = pruneExpired(await loadCache());

  let commitEpoch;
  if (cache[key] && typeof cache[key].commit_epoch === "number") {
    commitEpoch = cache[key].commit_epoch;
  } else {
    commitEpoch = gitLastCommitEpoch(filePath);
    if (commitEpoch !== null) {
      cache[key] = { ts: Date.now(), commit_epoch: commitEpoch };
      await saveCache(cache);
    } else {
      // Not in git / not committed — cache a null sentinel briefly to avoid repeat lookups
      cache[key] = { ts: Date.now(), commit_epoch: null };
      await saveCache(cache);
      process.exit(0);
    }
  }

  if (commitEpoch === null) process.exit(0);

  const nowEpoch = Math.floor(Date.now() / 1000);
  const ageDays = Math.floor((nowEpoch - commitEpoch) / 86400);

  if (ageDays < STALE_THRESHOLD_DAYS) {
    await logTelemetry({
      ts: new Date().toISOString(),
      hook: "doc-freshness-check",
      event: "fresh",
      file: norm,
      age_days: ageDays,
    });
    process.exit(0);
  }

  await logTelemetry({
    ts: new Date().toISOString(),
    hook: "doc-freshness-check",
    event: "stale-warning",
    file: norm,
    age_days: ageDays,
    commit_date: humanDate(commitEpoch),
  });

  emitAllowWithWarning(
    `⚠ STALE DOC WARNING\n` +
    `File: ${norm}\n` +
    `Last committed: ${humanDate(commitEpoch)} (${ageDays} days ago).\n` +
    `Threshold: ${STALE_THRESHOLD_DAYS} days.\n\n` +
    `Treat specific claims (counts, file paths, engine names, API shapes) as\n` +
    `POSSIBLY OUTDATED. Verify against current state before relying on details:\n` +
    `  - git log <file> for recent source changes\n` +
    `  - grep for referenced identifiers to confirm they still exist\n` +
    `  - SYSTEM_ARCHITECTURE.json for current engine/dispatcher inventory\n` +
    `(Read proceeding — this is informational, not a block.)`
  );
  process.exit(0);
}

main().catch(() => process.exit(0));
