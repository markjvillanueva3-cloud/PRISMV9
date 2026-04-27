#!/usr/bin/env node
/**
 * wiki-bootstrap.mjs — Idempotent seed for H:/prism/knowledge/wiki/
 *
 * Per KNOWLEDGE-WIKI-MS0/U-WIKI01.
 *
 * Reads:
 *   - mcp-server/data/docs/ENGINE_DIGEST.md           (engine entries)
 *   - mcp-server/src/tools/dispatchers/*Dispatcher.ts (dispatcher entries)
 *   - knowledge/memories/{user,project,reference,feedback}/*.md (memory entries)
 *
 * Writes (idempotent — re-runs preserve LLM-added entries):
 *   - knowledge/wiki/index.md       — markdown catalog (merge-by-slug, NEVER clobber)
 *   - knowledge/wiki/index.jsonl    — sidecar for HNSW vectorization (one JSON per line)
 *   - knowledge/wiki/log.md         — chronological audit trail
 *   - knowledge/wiki/{category}/.gitkeep × 11
 *   - knowledge/lint-reports/.gitkeep
 *
 * Coordination (per WIKI_SCHEMA.md §6):
 *   - Acquires .lock file before writing index.md / index.jsonl
 *   - Stale-lock reaper: a lock older than 90s with a dead PID is force-released
 *   - All writes are atomic (tmp + rename)
 *
 * Schema authoritative source: H:/prism/WIKI_SCHEMA.md
 */

import {
  readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, statSync,
  renameSync, unlinkSync, openSync, closeSync, writeSync,
} from "node:fs";
import { join, basename, relative, dirname } from "node:path";
import { randomBytes } from "node:crypto";

const REPO = "H:/prism";
const WIKI = join(REPO, "knowledge", "wiki");
const LINT = join(REPO, "knowledge", "lint-reports");
const TODAY = new Date().toISOString().slice(0, 10);
const BOOTSTRAP_AGENT = "wiki-bootstrap.mjs";

const CATEGORIES = [
  "concepts",
  "entities",
  "decisions",
  "patterns",
  "trajectories",
  "summaries",
  "code-tribal",
  "architecture",
  "software-engineering",
  "ux-design",
  "lessons",
];

// ─── File-system helpers ──────────────────────────────────────────────

function ensureDir(d) {
  mkdirSync(d, { recursive: true });
  const keep = join(d, ".gitkeep");
  if (!existsSync(keep)) writeFileSync(keep, "", "utf8");
}

function safeRead(p) {
  try {
    return readFileSync(p, "utf8");
  } catch {
    return "";
  }
}

function listMd(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => join(dir, f));
}

function atomicWrite(filePath, content) {
  const tmp = `${filePath}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;
  try {
    writeFileSync(tmp, content, "utf8");
    renameSync(tmp, filePath);
  } catch (err) {
    try { unlinkSync(tmp); } catch { /* tmp may not exist */ }
    throw err;
  }
}

// ─── Lock helpers (per WIKI_SCHEMA §6.1 + §6.6 stale-lock reaper) ─────

const LOCK_TTL_MS = 60_000;       // 60s normal lock TTL
const STALE_LOCK_MS = 90_000;     // 90s — after this, a dead-PID lock may be reaped
const LOCK_RETRY_MAX = 30;
const LOCK_RETRY_INTERVAL_MS = 200;

function isPidAlive(pid) {
  if (!pid || pid === process.pid) return true;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readLockOrNull(lockPath) {
  try {
    const raw = readFileSync(lockPath, "utf8");
    const j = JSON.parse(raw);
    if (typeof j.pid === "number" && typeof j.ts === "number") return j;
  } catch {
    /* missing or malformed */
  }
  return null;
}

function tryAcquireLockOnce(lockPath, payload) {
  try {
    const fd = openSync(lockPath, "wx"); // exclusive create
    writeSync(fd, JSON.stringify(payload));
    closeSync(fd);
    return true;
  } catch {
    return false;
  }
}

async function acquireLock(target) {
  const lockPath = `${target}.lock`;
  ensureDir(dirname(lockPath));

  for (let attempt = 0; attempt < LOCK_RETRY_MAX; attempt++) {
    const payload = {
      pid: process.pid,
      ts: Date.now(),
      agent: BOOTSTRAP_AGENT,
      target,
    };

    if (tryAcquireLockOnce(lockPath, payload)) return lockPath;

    // Lock taken — inspect and possibly reap
    const existing = readLockOrNull(lockPath);
    if (existing) {
      const age = Date.now() - existing.ts;
      const dead = !isPidAlive(existing.pid);
      if (age > STALE_LOCK_MS && dead) {
        // Per §6.6, reap and proceed. Log it inline (caller may also append to log.md).
        process.stderr.write(
          `[wiki-bootstrap] reaping stale lock @ ${lockPath} (pid=${existing.pid} age=${age}ms)\n`
        );
        try { unlinkSync(lockPath); } catch { /* race with another reaper */ }
        continue; // try acquire again immediately
      }
      if (age > STALE_LOCK_MS && !dead) {
        // Holder alive but lock is older than threshold — DO NOT reap; back off.
        process.stderr.write(
          `[wiki-bootstrap] lock held by live pid=${existing.pid} age=${age}ms; waiting\n`
        );
      }
    }
    await new Promise((r) => setTimeout(r, LOCK_RETRY_INTERVAL_MS));
  }
  throw new Error(`Could not acquire lock on ${target} after ${LOCK_RETRY_MAX} attempts`);
}

function releaseLock(lockPath) {
  try { unlinkSync(lockPath); } catch { /* already gone */ }
}

// ─── Frontmatter-aware summary extraction (fixes "name: prefix" leak) ─

/**
 * Skip the YAML frontmatter (between two `---` lines at the top of file)
 * and return the first non-empty, non-heading content line as the summary.
 * Without this, memory files leak `name: User Profile` as their summary.
 */
function extractSummary(content, fallback) {
  const lines = content.split(/\r?\n/);
  let i = 0;

  // If first non-blank line is `---`, skip frontmatter block.
  while (i < lines.length && lines[i].trim() === "") i++;
  if (i < lines.length && lines[i].trim() === "---") {
    i++; // step past opening ---
    while (i < lines.length && lines[i].trim() !== "---") i++;
    if (i < lines.length) i++; // step past closing ---
  }

  // First non-empty, non-heading line below frontmatter is the summary.
  for (; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (line.startsWith("#")) continue;
    if (line.startsWith("```")) continue; // skip code fences
    return line.slice(0, 120);
  }
  return fallback;
}

// ─── 1. Vault skeleton ───────────────────────────────────────────────

ensureDir(WIKI);
ensureDir(LINT);
for (const cat of CATEGORIES) ensureDir(join(WIKI, cat));

// ─── 2. Build entries from canonical sources ─────────────────────────

const indexEntries = []; // { slug, category, summary, sources, confidence, source: "bootstrap" }

// 2.1 Engines
const engineDigest = safeRead(join(REPO, "mcp-server", "data", "docs", "ENGINE_DIGEST.md"));
let engineCount = 0;
for (const line of engineDigest.split(/\r?\n/)) {
  const m = line.match(/^\|\s*E\d+\s*\|\s*([A-Za-z][\w]+)\s*\|\s*(\S+)\s*\|\s*(.+?)\s*\|\s*$/);
  if (!m) continue;
  indexEntries.push({
    slug: m[1],
    category: "concepts",
    summary: m[3].slice(0, 120).trim(),
    sources: [m[2]],
    confidence: 0.7,
    source: "bootstrap",
  });
  engineCount++;
}

// 2.2 Dispatchers
const dispatchDir = join(REPO, "mcp-server", "src", "tools", "dispatchers");
let dispatcherCount = 0;
if (existsSync(dispatchDir)) {
  for (const f of readdirSync(dispatchDir)) {
    if (!f.endsWith("Dispatcher.ts")) continue;
    const slug = `prism_${f.replace(/Dispatcher\.ts$/, "")}`;
    if (!slug || slug === "prism_") continue;
    const head = safeRead(join(dispatchDir, f)).split(/\r?\n/).slice(0, 40);
    const docLine = head.find((l) => /^\s*\*\s+\S/.test(l) && !l.includes("@"));
    const summary = (docLine ? docLine.replace(/^\s*\*\s*/, "") : `Dispatcher: ${slug}`).slice(0, 120);
    indexEntries.push({
      slug,
      category: "concepts",
      summary,
      sources: [`mcp-server/src/tools/dispatchers/${f}`],
      confidence: 0.8,
      source: "bootstrap",
    });
    dispatcherCount++;
  }
}

// 2.3 Memories — frontmatter-aware summary extraction (FIX 3)
const memoryRoot = join(REPO, "knowledge", "memories");
const memCats = {
  user: "entities",
  project: "decisions",
  reference: "architecture",
  feedback: "code-tribal",
};
let memoryCount = 0;
for (const [memDir, wikiCat] of Object.entries(memCats)) {
  for (const p of listMd(join(memoryRoot, memDir))) {
    const content = safeRead(p);
    const slug = basename(p, ".md");
    const summary = extractSummary(content, `[memory: ${memDir}]`);
    indexEntries.push({
      slug,
      category: wikiCat,
      summary,
      sources: [`knowledge/memories/${memDir}/${basename(p)}`],
      confidence: 0.85,
      source: "bootstrap",
    });
    memoryCount++;
  }
}

// ─── 3. Merge-by-slug with existing index.md (FIX 1) ─────────────────

/**
 * Parse existing index.md back into entries so we can preserve LLM-added
 * pages. Bootstrap-sourced entries get refreshed; non-bootstrap entries
 * (slugs not in our generated set) are kept verbatim.
 */
function parseExistingIndex(content) {
  if (!content) return [];
  const lines = content.split(/\r?\n/);
  const entries = [];
  let currentCat = null;
  for (const line of lines) {
    const catMatch = line.match(/^##\s+(.+?)\s*$/);
    if (catMatch && CATEGORIES.includes(catMatch[1])) {
      currentCat = catMatch[1];
      continue;
    }
    // - [[slug]] — summary | category:X | sources:N | confidence:0.85 | last_verified:YYYY-MM-DD | source:path
    const m = line.match(/^-\s+\[\[([^\]]+)\]\]\s+—\s+(.+?)(?:\s+\|\s+category:\S+)?(?:\s+\|\s+sources:\d+)?(?:\s+\|\s+confidence:([\d.]+))?(?:\s+\|\s+last_verified:[\d-]+)?(?:\s+\|\s+source:(\S+))?\s*$/);
    if (!m) continue;
    entries.push({
      slug: m[1],
      category: currentCat || "concepts",
      summary: m[2].trim(),
      sources: m[4] ? [m[4]] : [],
      confidence: m[3] ? parseFloat(m[3]) : 0.5,
      source: "preserved",
    });
  }
  return entries;
}

const indexPath = join(WIKI, "index.md");
const jsonlPath = join(WIKI, "index.jsonl");

const lockPath = await acquireLock(indexPath);
try {
  const existing = parseExistingIndex(safeRead(indexPath));
  const bootstrapSlugs = new Set(indexEntries.map((e) => e.slug));
  const preserved = existing.filter((e) => !bootstrapSlugs.has(e.slug));
  const merged = [...indexEntries, ...preserved];

  // ─── 4. Write index.md (atomic, sorted by category then slug) ─────

  const byCat = new Map();
  for (const e of merged) {
    if (!byCat.has(e.category)) byCat.set(e.category, []);
    byCat.get(e.category).push(e);
  }

  const idxLines = [];
  idxLines.push("---");
  idxLines.push("title: PRISM Wiki Index");
  idxLines.push("category: meta");
  idxLines.push(`last_verified: ${TODAY}`);
  idxLines.push("author: hybrid");
  idxLines.push("---");
  idxLines.push("");
  idxLines.push("# PRISM Wiki Index");
  idxLines.push("");
  idxLines.push("> LLM-maintained catalog. Bootstrap rewrites entries with `source:bootstrap` only — LLM-added entries are preserved across re-runs. See `WIKI_SCHEMA.md` §4.1.");
  idxLines.push("");
  idxLines.push(
    `Last bootstrap: ${TODAY} — ${merged.length} entries total ` +
    `(${engineCount} engines + ${dispatcherCount} dispatchers + ${memoryCount} memories from bootstrap, ` +
    `${preserved.length} preserved from prior writes)`
  );
  idxLines.push("");

  const seenCats = new Set();
  for (const cat of CATEGORIES) {
    if (!byCat.has(cat) || seenCats.has(cat)) continue;
    seenCats.add(cat);
    const entries = byCat.get(cat).slice().sort((a, b) => a.slug.localeCompare(b.slug));
    idxLines.push(`## ${cat}`);
    idxLines.push("");
    for (const e of entries) {
      const src = e.sources?.[0] || "";
      idxLines.push(
        `- [[${e.slug}]] — ${e.summary} | category:${cat} | sources:${e.sources?.length || 0} | confidence:${e.confidence} | last_verified:${TODAY}`
        + (src ? ` | source:${src}` : "")
      );
    }
    idxLines.push("");
  }

  atomicWrite(indexPath, idxLines.join("\n"));

  // ─── 5. Write index.jsonl sidecar (FIX 4 — HNSW readiness) ────────

  const jsonlLines = merged.map((e) => JSON.stringify({
    slug: e.slug,
    category: e.category,
    summary: e.summary,
    sources: e.sources,
    confidence: e.confidence,
    last_verified: TODAY,
    source: e.source,
  }));
  atomicWrite(jsonlPath, jsonlLines.join("\n") + "\n");
} finally {
  releaseLock(lockPath);
}

// ─── 6. Append today's bootstrap entry to log.md ──────────────────────

const logPath = join(WIKI, "log.md");
const logLockPath = await acquireLock(logPath);
try {
  let existingLog = safeRead(logPath);
  // Per WIKI_SCHEMA §4.2: `## [YYYY-MM-DD] op | title | by:agent`
  const dedupHeader = `## [${TODAY}] bootstrap | initial seed from digests + memories | by:${BOOTSTRAP_AGENT}`;

  if (existingLog.includes(dedupHeader)) {
    // Already logged today — no-op.
  } else {
    if (!existingLog.includes("# PRISM Wiki Log")) {
      existingLog =
        `# PRISM Wiki Log\n\n` +
        `> Chronological audit trail. Grep with: \`grep '^## \\[' log.md | tail -10\`\n\n` +
        existingLog.trim();
    }
    const entry =
      `\n${dedupHeader}\n` +
      `- ${indexEntries.length} bootstrap entries (${engineCount} engines, ${dispatcherCount} dispatchers, ${memoryCount} memories)\n` +
      `- Vault skeleton: ${relative(REPO, WIKI)}\n` +
      `- index.jsonl sidecar emitted for HNSW indexing\n`;
    atomicWrite(logPath, existingLog.trimEnd() + "\n" + entry);
  }
} finally {
  releaseLock(logLockPath);
}

// ─── 7. Summary ───────────────────────────────────────────────────────

console.log(`Wiki bootstrap complete:`);
console.log(`  index.md:    ${indexPath}`);
console.log(`  index.jsonl: ${jsonlPath}`);
console.log(`  log.md:      ${logPath}`);
console.log(`  bootstrap entries: ${indexEntries.length} (${engineCount} engines, ${dispatcherCount} dispatchers, ${memoryCount} memories)`);
console.log(`  vault: ${WIKI}`);
console.log(`  lint:  ${LINT}`);
console.log(`  schema: ${join(REPO, "WIKI_SCHEMA.md")}`);
