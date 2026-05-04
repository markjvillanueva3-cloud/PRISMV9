#!/usr/bin/env node
/**
 * chunk-gsd-vault.mjs — split GSD docs by `## ` headers
 *
 * INTEL-OLLAMA-OBSIDIAN-MS0/P4-U01.
 *
 * Walks the three GSD source files (GSD_QUICK.md, DEV_PROTOCOL.md,
 * GSD_MICRO.md) under `mcp-server/data/docs/gsd/`, splits each by
 * top-level `## ` sections, writes one `.md` per section to
 * `H:/prism/knowledge/gsd/` with frontmatter, and embeds each chunk
 * into the Qdrant `gsd` collection via `prism_memory:remember`.
 *
 * Output filename pattern: knowledge/gsd/{source-stem}-{slug}.md
 * Frontmatter fields: source (gsd_quick | dev_protocol | gsd_micro),
 * section, slug, indexed_at.
 *
 * Idempotent on disk: existing chunk files are compared by body
 * (frontmatter `indexed_at` jitter ignored) and skipped if unchanged.
 *
 * Usage:
 *   node scripts/chunk-gsd-vault.mjs
 *   node scripts/chunk-gsd-vault.mjs --no-embed
 *   node scripts/chunk-gsd-vault.mjs --dry-run
 *
 * Exit:
 *   0 — JSON summary
 *   1 — fatal (no GSD source files found)
 *   2 — invalid args
 *
 * @milestone INTEL-OLLAMA-OBSIDIAN-MS0/P4-U01
 */

import fs from "node:fs";
import path from "node:path";

const VAULT_TARGET = "H:/prism/knowledge/gsd";
const SOURCES = [
  { label: "gsd_quick", file: "H:/prism/mcp-server/data/docs/gsd/GSD_QUICK.md" },
  { label: "dev_protocol", file: "H:/prism/mcp-server/data/docs/gsd/DEV_PROTOCOL.md" },
  { label: "gsd_micro", file: "H:/prism/mcp-server/data/docs/gsd/GSD_MICRO.md" },
];
const MCP_URL = process.env.MCP_HTTP_URL ?? "http://127.0.0.1:3100/mcp";
const EMBED_TIMEOUT_MS = 12_000;
const MAX_EMBED_CHARS = 8_192;

function parseArgs(argv) {
  const out = { dryRun: false, noEmbed: false };
  for (const a of argv.slice(2)) {
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--no-embed") out.noEmbed = true;
    else if (a === "--help" || a === "-h") {
      process.stdout.write("Usage: node scripts/chunk-gsd-vault.mjs [--dry-run] [--no-embed]\n");
      process.exit(0);
    } else { process.stderr.write(`Unknown arg: ${a}\n`); process.exit(2); }
  }
  return out;
}

function ensureDir(d) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }

function slugify(s) {
  return String(s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "section";
}

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
        params: { name: "prism_memory", arguments: { action: "remember", params: { kind: "gsd", id, text, metadata } } },
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
    } catch { return { ok: false, reason: "bad-inner-json" }; }
  } catch (e) {
    clearTimeout(timer);
    return { ok: false, reason: e?.message ?? String(e) };
  }
}

function stripFrontmatter(s) {
  return s.replace(/^---[\s\S]*?---\n+/, "");
}

async function processSource(spec, args, stats) {
  const r = { source: spec.label, file: spec.file, exists: false, chunks: 0, mirrored: 0, skipped: 0, embedded: 0, embedFailed: 0 };
  if (!fs.existsSync(spec.file)) { stats.bySource.push(r); return; }
  r.exists = true;
  const md = fs.readFileSync(spec.file, "utf8");
  const chunks = splitSections(md);
  r.chunks = chunks.length;
  ensureDir(VAULT_TARGET);

  for (const ch of chunks) {
    const slug = slugify(ch.heading);
    const filename = `${spec.label}-${slug}.md`;
    const target = path.join(VAULT_TARGET, filename);
    const indexedAt = new Date().toISOString();
    const fileText = `---\nsource: ${spec.label}\nsection: ${ch.heading.replace(/[\r\n]/g, " ")}\nslug: ${slug}\nindexed_at: ${indexedAt}\n---\n\n## ${ch.heading}\n\n${ch.body}\n`;
    if (args.dryRun) { r.mirrored++; continue; }
    if (fs.existsSync(target)) {
      const existing = fs.readFileSync(target, "utf8");
      if (stripFrontmatter(existing) === stripFrontmatter(fileText)) {
        r.skipped++;
        continue;
      }
    }
    fs.writeFileSync(target, fileText);
    r.mirrored++;

    if (!args.noEmbed) {
      const id = `gsd/${spec.label}/${slug}`;
      const text = `${spec.label} GSD — ${ch.heading}\n\n${ch.body}`.slice(0, MAX_EMBED_CHARS);
      // P4-U01-FOLLOWUP-2: emit body_preview so the retrieve hook does NOT have
      // to parse the embed text by line position. The retrieve hook prefers this
      // field when present and falls back to text-splitting otherwise.
      const bodyPreview = ch.body.replace(/\s+/g, " ").trim().slice(0, 200);
      const e = await tryEmbed(id, text, {
        source: spec.label,
        section: ch.heading,
        slug,
        body_preview: bodyPreview,
      });
      if (e.ok) r.embedded++;
      else r.embedFailed++;
    }
  }
  stats.bySource.push(r);
}

async function main() {
  const args = parseArgs(process.argv);
  const stats = {
    target: VAULT_TARGET,
    bySource: [],
    totalChunks: 0,
    totalMirrored: 0,
    totalSkipped: 0,
    totalEmbedded: 0,
    totalEmbedFailed: 0,
    dryRun: args.dryRun,
    embedAttempted: !args.noEmbed && !args.dryRun,
  };

  for (const spec of SOURCES) {
    await processSource(spec, args, stats);
  }

  const anyExist = stats.bySource.some((r) => r.exists);
  if (!anyExist) {
    process.stderr.write("No GSD source files found\n");
    process.exit(1);
  }

  for (const r of stats.bySource) {
    if (!r.exists) continue;
    stats.totalChunks += r.chunks;
    stats.totalMirrored += r.mirrored;
    stats.totalSkipped += r.skipped;
    stats.totalEmbedded += r.embedded;
    stats.totalEmbedFailed += r.embedFailed;
  }

  process.stdout.write(JSON.stringify(stats, null, 2));
  process.exit(0);
}

main().catch((e) => {
  process.stderr.write(`uncaught: ${e?.message ?? e}\n`);
  process.exit(1);
});
