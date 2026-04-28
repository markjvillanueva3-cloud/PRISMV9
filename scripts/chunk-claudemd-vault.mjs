#!/usr/bin/env node
/**
 * chunk-claudemd-vault.mjs — split CLAUDE.md by `## ` headers
 *
 * INTEL-OLLAMA-OBSIDIAN-MS0/P1-U05.
 *
 * Walks both the project (H:/prism/CLAUDE.md) and global
 * (~/.claude/CLAUDE.md) CLAUDE.md files, splits each by top-level `## `
 * sections, writes one .md per section to H:/prism/knowledge/claude-md/
 * and embeds each chunk into the Qdrant `rule` collection via
 * prism_memory:remember through the running MCP server.
 *
 * Output filename pattern:
 *   knowledge/claude-md/{source}-{slug}.md
 * where source ∈ {project, global} and slug is the lower-cased,
 * alphanumeric+hyphen form of the `## ` heading.
 *
 * Each chunk file has frontmatter:
 *   ---
 *   source: project|global
 *   section: <heading>
 *   slug: <slug>
 *   indexed_at: <ISO>
 *   ---
 *
 * Embedding failures are non-fatal (logged in stats) — the on-disk
 * chunk is the durability win.
 *
 * Usage:
 *   node scripts/chunk-claudemd-vault.mjs            # chunk + embed
 *   node scripts/chunk-claudemd-vault.mjs --no-embed # skip Qdrant
 *   node scripts/chunk-claudemd-vault.mjs --dry-run  # report only
 *
 * Exit:
 *   0 — JSON summary on stdout
 *   1 — both source files missing
 *   2 — invalid args
 *
 * @milestone INTEL-OLLAMA-OBSIDIAN-MS0/P1-U05
 */

import fs from "node:fs";
import path from "node:path";

const VAULT_TARGET = "H:/prism/knowledge/claude-md";
const PROJECT_CLAUDEMD = "H:/prism/CLAUDE.md";
const GLOBAL_CLAUDEMD = `${(process.env.USERPROFILE ?? process.env.HOME ?? "").replace(/\\/g, "/")}/.claude/CLAUDE.md`;
const MCP_URL = process.env.MCP_HTTP_URL ?? "http://127.0.0.1:3100/mcp";
const EMBED_TIMEOUT_MS = 12_000;

function parseArgs(argv) {
  const out = { dryRun: false, noEmbed: false };
  for (const a of argv.slice(2)) {
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--no-embed") out.noEmbed = true;
    else if (a === "--help" || a === "-h") {
      process.stdout.write(`Usage: node scripts/chunk-claudemd-vault.mjs [--dry-run] [--no-embed]\n`);
      process.exit(0);
    } else {
      process.stderr.write(`Unknown arg: ${a}\n`);
      process.exit(2);
    }
  }
  return out;
}

function ensureDir(d) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "section";
}

/**
 * Split markdown by `## ` headers. Preamble (everything before the first
 * `## `) becomes its own "_preamble" chunk to preserve top-of-file context.
 */
function splitSections(md) {
  const lines = md.split(/\r?\n/);
  const chunks = [];
  let cur = { heading: "_preamble", body: [] };
  for (const line of lines) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (m) {
      if (cur.body.length > 0 || cur.heading !== "_preamble") {
        chunks.push({ heading: cur.heading, body: cur.body.join("\n").trim() });
      }
      cur = { heading: m[1].trim(), body: [] };
    } else {
      cur.body.push(line);
    }
  }
  if (cur.body.length > 0 || cur.heading !== "_preamble") {
    chunks.push({ heading: cur.heading, body: cur.body.join("\n").trim() });
  }
  return chunks.filter((c) => c.body.length > 0);
}

async function tryEmbed(id, text, metadata) {
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
        params: { name: "prism_memory", arguments: { action: "remember", params: { kind: "rule", id, text, metadata } } },
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
    const body = await res.json();
    const inner = body?.result?.content?.[0]?.text ?? "";
    try {
      const parsed = JSON.parse(inner);
      return { ok: parsed?.ok === true, reason: parsed?.error ?? null };
    } catch {
      return { ok: false, reason: "bad-inner-json" };
    }
  } catch (e) {
    clearTimeout(timer);
    return { ok: false, reason: e?.message ?? String(e) };
  }
}

async function processSource(label, srcPath, args, stats) {
  if (!fs.existsSync(srcPath)) {
    stats.bySource[label] = { exists: false, chunks: 0 };
    return;
  }
  const md = fs.readFileSync(srcPath, "utf8");
  const chunks = splitSections(md);
  stats.bySource[label] = { exists: true, chunks: chunks.length, embedded: 0, embedFailed: 0, mirrored: 0, skipped: 0 };
  ensureDir(VAULT_TARGET);

  for (const ch of chunks) {
    const slug = slugify(ch.heading);
    const filename = `${label}-${slug}.md`;
    const targetPath = path.join(VAULT_TARGET, filename);
    const indexedAt = new Date().toISOString();
    const fileText =
      `---\nsource: ${label}\nsection: ${ch.heading.replace(/[\r\n]/g, " ")}\nslug: ${slug}\nindexed_at: ${indexedAt}\n---\n\n## ${ch.heading}\n\n${ch.body}\n`;
    if (args.dryRun) {
      stats.bySource[label].mirrored++;
      continue;
    }
    if (fs.existsSync(targetPath)) {
      const existing = fs.readFileSync(targetPath, "utf8");
      // Compare body (ignore frontmatter `indexed_at` jitter)
      const stripFm = (s) => s.replace(/^---[\s\S]*?---\n\n?/, "");
      if (stripFm(existing) === stripFm(fileText)) {
        stats.bySource[label].skipped++;
        continue;
      }
    }
    fs.writeFileSync(targetPath, fileText);
    stats.bySource[label].mirrored++;

    if (!args.noEmbed) {
      const id = `claudemd/${label}/${slug}`;
      const embedText = `${label} CLAUDE.md — ${ch.heading}\n\n${ch.body}`.slice(0, 16_384);
      const r = await tryEmbed(id, embedText, { source: label, section: ch.heading, slug });
      if (r.ok) stats.bySource[label].embedded++;
      else stats.bySource[label].embedFailed++;
    }
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const stats = {
    target: VAULT_TARGET,
    bySource: {},
    totalChunks: 0,
    totalMirrored: 0,
    totalEmbedded: 0,
    totalEmbedFailed: 0,
    dryRun: args.dryRun,
    embedAttempted: !args.noEmbed,
  };

  await processSource("project", PROJECT_CLAUDEMD, args, stats);
  await processSource("global", GLOBAL_CLAUDEMD, args, stats);

  const both = !!(stats.bySource.project?.exists || stats.bySource.global?.exists);
  if (!both) {
    process.stderr.write("Both CLAUDE.md sources missing\n");
    process.exit(1);
  }

  // Aggregate totals
  for (const v of Object.values(stats.bySource)) {
    if (!v.exists) continue;
    stats.totalChunks += v.chunks ?? 0;
    stats.totalMirrored += v.mirrored ?? 0;
    stats.totalEmbedded += v.embedded ?? 0;
    stats.totalEmbedFailed += v.embedFailed ?? 0;
  }

  process.stdout.write(JSON.stringify(stats, null, 2));
  process.exit(0);
}

main().catch((e) => {
  process.stderr.write(`uncaught: ${e?.message ?? e}\n`);
  process.exit(1);
});
