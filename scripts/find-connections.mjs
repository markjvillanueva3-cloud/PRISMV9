#!/usr/bin/env node
// find-connections.mjs - CLI for connection-finder over PRISM vault.
//
// Usage: node scripts/find-connections.mjs <target-slug> [--topK N] [--minScore F]
//
// For a target memory/wiki slug: find OTHER vault notes whose body content
// overlaps with the target but are NOT yet linked from/to it. Each match is
// a candidate link the operator should review (advisory only).
//
// Emits state/shared/CONNECTION-FINDER/<slug>.{json,md}.
import { promises as fs } from "node:fs";
import path from "node:path";
import { findConnections } from "./lib/connection-finder.mjs";

const REPO = process.env.PRISM_UNLINKED_MENTIONS_REPO || "H:/prism";
const MEM_DIR = path.join(REPO, "knowledge", "memories");
const WIKI_DIR = path.join(REPO, "knowledge", "wiki");
const MEM_SUBDIRS = ["feedback", "reference", "project", "user", "patterns", "mistakes", "inbox"];
const OUT_DIR = path.join(REPO, "state", "shared", "CONNECTION-FINDER");
const MIN_SLUG_LEN = 4;

function parseFrontmatter(src) {
  const m = /^---\s*\n([\s\S]*?)\n---\s*\n/.exec(src);
  if (!m) return { fm: {}, body: src };
  const out = {};
  for (const raw of m[1].split(/\r?\n/)) {
    const line = raw.replace(/^\s+|\s+$/g, "");
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim();
    if (key === "name") out.name = val.replace(/^["']|["']$/g, "");
  }
  return { fm: out, body: src.slice(m[0].length) };
}

async function walkMarkdown(root, into) {
  let entries;
  try { entries = await fs.readdir(root, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const full = path.join(root, e.name);
    if (e.isDirectory()) await walkMarkdown(full, into);
    else if (e.isFile() && e.name.endsWith(".md")) into.push(full);
  }
}

async function buildNotesIndex() {
  const files = [];
  for (const sub of MEM_SUBDIRS) await walkMarkdown(path.join(MEM_DIR, sub), files);
  await walkMarkdown(WIKI_DIR, files);
  const notes = new Map();
  for (const f of files) {
    let raw;
    try { raw = await fs.readFile(f, "utf8"); } catch { continue; }
    const { fm, body } = parseFrontmatter(raw);
    const slug = (fm.name && fm.name.length >= MIN_SLUG_LEN ? fm.name : path.basename(f, ".md")).trim();
    if (!slug || slug.length < MIN_SLUG_LEN) continue;
    if (notes.has(slug)) continue;
    notes.set(slug, { path: path.relative(REPO, f).replace(/\\/g, "/"), body });
  }
  return notes;
}

function parseArgs(argv) {
  const args = { target: null, topK: 25, minScore: 0.02 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--topK") args.topK = Number(argv[++i]);
    else if (a === "--minScore") args.minScore = Number(argv[++i]);
    else if (!args.target) args.target = a;
  }
  return args;
}

function renderMarkdown(r) {
  const lines = [];
  lines.push(`# Connection-finder candidates for [[${r.target}]]`);
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Source: \`${r.targetPath}\``);
  lines.push("");
  lines.push(`- Notes evaluated: **${r.stats.candidatesEvaluated}**`);
  lines.push(`- Already-connected (in + out + self): **${r.stats.connectedFiltered}**`);
  lines.push(`- Scored above threshold: **${r.stats.candidatesScored}**`);
  lines.push(`- Top shown: **${r.candidates.length}**`);
  lines.push("");
  lines.push("## Candidates (TF-IDF cosine similarity)");
  lines.push("");
  if (r.candidates.length === 0) {
    lines.push("_No candidates above threshold. Try lowering --minScore._");
  } else {
    for (const c of r.candidates) {
      lines.push(`- **${c.score.toFixed(4)}** - [[${c.slug}]] (\`${c.path}\`)`);
    }
  }
  lines.push("");
  lines.push("> Advisory only. Bare semantic similarity does NOT prove a connection should be a link.");
  return lines.join("\n");
}

async function main() {
  const t0 = Date.now();
  const args = parseArgs(process.argv);
  if (!args.target) {
    console.error("Usage: node scripts/find-connections.mjs <target-slug> [--topK N] [--minScore F]");
    process.exit(2);
  }
  const notes = await buildNotesIndex();
  const result = findConnections(args.target, notes, { topK: args.topK, minScore: args.minScore });
  if (!result.ok) {
    console.error(`[find-connections] ${result.reason}`);
    process.exit(3);
  }
  await fs.mkdir(OUT_DIR, { recursive: true });
  const safeSlug = args.target.replace(/[^a-zA-Z0-9_.-]/g, "_");
  const outJson = path.join(OUT_DIR, `${safeSlug}.json`);
  const outMd = path.join(OUT_DIR, `${safeSlug}.md`);
  await fs.writeFile(outJson, JSON.stringify({ ...result, durationMs: Date.now() - t0 }, null, 2), "utf8");
  await fs.writeFile(outMd, renderMarkdown(result), "utf8");
  console.log(
    `[find-connections] target=${args.target} ` +
    `scored=${result.stats.candidatesScored} ` +
    `top=${result.candidates.length} ` +
    `(${Date.now() - t0}ms) -> ${path.relative(REPO, outMd)}`,
  );
}

if (process.argv[1]?.endsWith("find-connections.mjs")) {
  main().catch((e) => {
    console.error("[find-connections] fatal:", e?.stack || e?.message || e);
    process.exit(1);
  });
}
