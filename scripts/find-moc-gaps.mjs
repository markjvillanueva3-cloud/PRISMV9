#!/usr/bin/env node
// find-moc-gaps.mjs - CLI for gap-finder.
// Usage: node scripts/find-moc-gaps.mjs <moc-slug> [--minForDedicated N]
// @milestone PSN-ENHANCE-MS0/U-PSN-GAP-FINDER
import { promises as fs } from "node:fs";
import path from "node:path";
import { findGaps } from "./lib/gap-finder.mjs";

const REPO = process.env.PRISM_UNLINKED_MENTIONS_REPO || "H:/prism";
const MEM_DIR = path.join(REPO, "knowledge", "memories");
const WIKI_DIR = path.join(REPO, "knowledge", "wiki");
const MEM_SUBDIRS = ["feedback", "reference", "project", "user", "patterns", "mistakes", "inbox"];
const OUT_DIR = path.join(REPO, "state", "shared", "GAP-FINDER");
const MIN_SLUG_LEN = 3;

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
  const args = { target: null, minForDedicated: 2 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--minForDedicated") args.minForDedicated = Number(argv[++i]);
    else if (!args.target) args.target = a;
  }
  return args;
}

function renderMarkdown(r, mocPath) {
  const lines = [];
  lines.push(`# Gap-finder report for [[${r.moc}]]`);
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Source: \`${mocPath}\`  minForDedicated=${r.minForDedicated}`);
  lines.push("");
  lines.push("## Stats");
  lines.push("");
  lines.push(`- Total slug refs: **${r.stats.total_refs}**`);
  lines.push(`- Well-covered: **${r.stats.well_covered_count}**`);
  lines.push(`- Fragile: **${r.stats.fragile_count}**`);
  lines.push(`- Missing leaves: **${r.stats.missing_count}**`);
  lines.push(`- Implicit concepts: **${r.stats.implicit_count}**`);
  lines.push("");
  if (r.missing_leaf.length > 0) {
    lines.push("## Missing leaves");
    lines.push("");
    for (const s of r.missing_leaf) lines.push(`- [[${s}]]`);
    lines.push("");
  }
  if (r.fragile.length > 0) {
    lines.push("## Fragile coverage");
    lines.push("");
    for (const c of r.fragile) lines.push(`- [[${c.slug}]] - ${c.backlinks} backlink(s)`);
    lines.push("");
  }
  if (r.implicit_concepts.length > 0) {
    lines.push("## Implicit concepts (headings without dedicated notes)");
    lines.push("");
    for (const c of r.implicit_concepts) lines.push(`- ${c}`);
    lines.push("");
  }
  if (r.well_covered.length > 0) {
    lines.push("## Well-covered (top 25)");
    lines.push("");
    r.well_covered.sort((a, b) => b.backlinks - a.backlinks);
    for (const c of r.well_covered.slice(0, 25)) lines.push(`- [[${c.slug}]] - ${c.backlinks} backlinks`);
    lines.push("");
  }
  lines.push("> Advisory only.");
  return lines.join("\n");
}

async function main() {
  const t0 = Date.now();
  const args = parseArgs(process.argv);
  if (!args.target) {
    console.error("Usage: node scripts/find-moc-gaps.mjs <moc-slug> [--minForDedicated N]");
    process.exit(2);
  }
  const notes = await buildNotesIndex();
  let moc = notes.get(args.target);
  if (!moc) {
    const found = Array.from(notes.entries()).find(([k]) => k.toLowerCase() === args.target.toLowerCase());
    if (found) moc = found[1];
  }
  if (!moc) {
    console.error(`[find-moc-gaps] slug "${args.target}" not found`);
    process.exit(3);
  }
  const result = findGaps(args.target, moc.body, notes, { minForDedicated: args.minForDedicated });
  await fs.mkdir(OUT_DIR, { recursive: true });
  const safeSlug = args.target.replace(/[^a-zA-Z0-9_.-]/g, "_");
  const outJson = path.join(OUT_DIR, `${safeSlug}.json`);
  const outMd = path.join(OUT_DIR, `${safeSlug}.md`);
  await fs.writeFile(outJson, JSON.stringify({ ...result, durationMs: Date.now() - t0 }, null, 2), "utf8");
  await fs.writeFile(outMd, renderMarkdown(result, moc.path), "utf8");
  console.log(
    `[find-moc-gaps] moc=${args.target} refs=${result.stats.total_refs} ` +
    `well=${result.stats.well_covered_count} fragile=${result.stats.fragile_count} ` +
    `missing=${result.stats.missing_count} implicit=${result.stats.implicit_count} ` +
    `(${Date.now() - t0}ms)`,
  );
}

if (process.argv[1]?.endsWith("find-moc-gaps.mjs")) {
  main().catch((e) => {
    console.error("[find-moc-gaps] fatal:", e?.stack || e?.message || e);
    process.exit(1);
  });
}
