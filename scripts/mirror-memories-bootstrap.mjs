#!/usr/bin/env node
/**
 * mirror-memories-bootstrap.mjs — full sync C:/Users/.../memory/ → vault
 *
 * INTEL-OLLAMA-OBSIDIAN-MS0/P1-U04.
 *
 * Walks every .md file in the user's Claude memory directory and mirrors
 * it into H:/prism/knowledge/memories/{category}/{name}.md, where category
 * is inferred from the filename prefix (feedback_*, project_*, user_*,
 * reference_*, mistakes_*, patterns_*) or written content. Files that
 * don't match a known prefix go under memories/uncategorized/.
 *
 * After mirroring, each memory is embedded into the Qdrant 'note'
 * collection via QdrantMemoryEngineSingleton. Embedding failures are
 * non-fatal (logged + counted). The mirror itself always succeeds —
 * having the .md files on H: is the primary durability win.
 *
 * Usage:
 *   node scripts/mirror-memories-bootstrap.mjs            # mirror + embed
 *   node scripts/mirror-memories-bootstrap.mjs --dry-run  # report only
 *   node scripts/mirror-memories-bootstrap.mjs --no-embed # skip Qdrant
 *
 * Exit:
 *   0 — JSON summary written to stdout
 *   1 — source dir missing
 *   2 — invalid args
 *
 * @milestone INTEL-OLLAMA-OBSIDIAN-MS0/P1-U04
 */

import fs from "node:fs";
import path from "node:path";

const MEMORY_SOURCE_CANDIDATES = [
  "C:/Users/wompu/.claude/projects/H--prism/memory",
  `${(process.env.USERPROFILE ?? process.env.HOME ?? "").replace(/\\/g, "/")}/.claude/projects/H--prism/memory`,
];
const VAULT_TARGET = "H:/prism/knowledge/memories";

const CATEGORY_PREFIXES = {
  feedback_: "feedback",
  project_: "project",
  user_: "user",
  reference_: "reference",
  mistakes_: "mistakes",
  mistake_: "mistakes",
  patterns_: "patterns",
  pattern_: "patterns",
};

function findSourceDir() {
  for (const cand of MEMORY_SOURCE_CANDIDATES) {
    if (fs.existsSync(cand)) return cand;
  }
  return null;
}

function categorize(filename) {
  const base = filename.toLowerCase();
  if (base === "memory.md") return "_index";
  for (const [prefix, cat] of Object.entries(CATEGORY_PREFIXES)) {
    if (base.startsWith(prefix)) return cat;
  }
  return "uncategorized";
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function parseFrontmatter(content) {
  const m = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: content };
  const meta = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^(\w+):\s*(.+?)\s*$/);
    if (kv) meta[kv[1]] = kv[2];
  }
  return { meta, body: m[2] };
}

const MCP_URL = process.env.MCP_HTTP_URL ?? "http://127.0.0.1:3100/mcp";
const EMBED_TIMEOUT_MS = 12_000;

async function tryEmbed(text, id, kind = "note", metadata = {}) {
  // Route through the running MCP server rather than importing the engine
  // directly — this avoids tsx/dist path issues and exercises the real
  // dispatcher contract (prism_memory:remember was added in P1-U04).
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), EMBED_TIMEOUT_MS);
  try {
    const res = await fetch(MCP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "prism_memory",
          arguments: { action: "remember", params: { kind, id, text, metadata } },
        },
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
    const body = await res.json();
    const innerText = body?.result?.content?.[0]?.text ?? "";
    let parsed;
    try { parsed = JSON.parse(innerText); } catch { return { ok: false, reason: "bad-inner-json" }; }
    return { ok: parsed?.ok === true, reason: parsed?.error ?? null };
  } catch (e) {
    clearTimeout(timer);
    return { ok: false, reason: (e instanceof Error ? e.message : String(e)) };
  }
}

function parseArgs(argv) {
  const out = { dryRun: false, noEmbed: false };
  for (const a of argv.slice(2)) {
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--no-embed") out.noEmbed = true;
    else if (a === "--help" || a === "-h") {
      process.stdout.write(`Usage: node scripts/mirror-memories-bootstrap.mjs [--dry-run] [--no-embed]\n`);
      process.exit(0);
    } else {
      process.stderr.write(`Unknown arg: ${a}\n`);
      process.exit(2);
    }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  const source = findSourceDir();
  if (!source) {
    process.stderr.write(`Source memory dir not found in:\n  ${MEMORY_SOURCE_CANDIDATES.join("\n  ")}\n`);
    process.exit(1);
  }
  ensureDir(VAULT_TARGET);

  let entries;
  try {
    entries = fs.readdirSync(source).filter((f) => f.endsWith(".md"));
  } catch (e) {
    process.stderr.write(`Cannot read source: ${e?.message ?? e}\n`);
    process.exit(1);
  }

  const stats = {
    source,
    target: VAULT_TARGET,
    scanned: entries.length,
    mirrored: 0,
    skippedUnchanged: 0,
    embedded: 0,
    embedFailed: 0,
    errors: [],
    dryRun: args.dryRun,
    embedAttempted: !args.noEmbed,
    byCategory: {},
  };

  for (const file of entries) {
    const srcPath = path.join(source, file);
    let content;
    try {
      content = fs.readFileSync(srcPath, "utf8");
    } catch (e) {
      stats.errors.push(`read ${file}: ${e?.message ?? e}`);
      continue;
    }
    const cat = categorize(file);
    stats.byCategory[cat] = (stats.byCategory[cat] ?? 0) + 1;
    const targetDir = path.join(VAULT_TARGET, cat);
    const targetPath = path.join(targetDir, file);

    if (args.dryRun) {
      stats.mirrored++;
      continue;
    }
    ensureDir(targetDir);
    // Skip rewrite if content unchanged (preserves mtime for downstream tools)
    if (fs.existsSync(targetPath)) {
      try {
        const existing = fs.readFileSync(targetPath, "utf8");
        if (existing === content) {
          stats.skippedUnchanged++;
          continue;
        }
      } catch {
        /* fall through to write */
      }
    }
    try {
      fs.writeFileSync(targetPath, content);
      stats.mirrored++;
    } catch (e) {
      stats.errors.push(`write ${file}: ${e?.message ?? e}`);
      continue;
    }

    if (!args.noEmbed) {
      const { body, meta } = parseFrontmatter(content);
      const embedText = `${meta.name ?? file}\n${meta.description ?? ""}\n\n${body}`.slice(0, 16_384);
      const r = await tryEmbed(embedText, `${cat}/${file}`, "note");
      if (r.ok) stats.embedded++;
      else stats.embedFailed++;
    }
  }

  process.stdout.write(JSON.stringify(stats, null, 2));
  process.exit(0);
}

main().catch((e) => {
  process.stderr.write(`uncaught: ${e?.message ?? e}\n`);
  process.exit(1);
});
