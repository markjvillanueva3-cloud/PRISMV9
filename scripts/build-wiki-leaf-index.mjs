#!/usr/bin/env node
/**
 * build-wiki-leaf-index.mjs
 *
 * Walks knowledge/wiki/architecture/**\/*.md and emits a compact JSONL index:
 *   knowledge/wiki/architecture/_leaf-index.jsonl
 *
 * One line per entry: { name, title, type, desc, path } where:
 *   - name  = basename without .md  (the [[wiki-link]] target)
 *   - title = frontmatter title (falls back to first H1)
 *   - type  = frontmatter type (architecture | engine | action | skill | hook | …)
 *   - desc  = the first blockquote line (the "> …" summary line)
 *   - path  = repo-relative path
 *
 * Why a separate file: index.md is loaded on every SessionStart + keyword match,
 * so it must stay small (~hundreds of lines). The architecture tree has ~13K leaf
 * entries — keeping them in a JSONL the recall hook reads lazily means the
 * leaves are searchable without bloating index.md.
 *
 * Idempotent. Skips the AUTO/XLINK marker noise — just pulls title + the one
 * blockquote line. ~13K entries → ~2 MB JSONL, parses in <100ms.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, dirname, join, relative, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PRISM_ROOT = resolve(__dirname, "..");
const ARCH_DIR = resolve(PRISM_ROOT, "knowledge/wiki/architecture");
const OUT_PATH = join(ARCH_DIR, "_leaf-index.jsonl");

const DESC_MAX = 200;

function walkMd(dir) {
  const out = [];
  function rec(d) {
    let entries;
    try { entries = readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = join(d, e.name);
      if (e.isDirectory()) rec(full);
      else if (e.isFile() && e.name.endsWith(".md") && e.name !== "_leaf-index.jsonl") out.push(full);
    }
  }
  rec(dir);
  return out;
}

function parseFrontmatter(content) {
  const m = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!m) return {};
  const fm = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([a-z_-]+)\s*:\s*(.*)$/i);
    if (!kv) continue;
    let v = kv[2].trim().replace(/^['"]|['"]$/g, "");
    fm[kv[1].trim()] = v;
  }
  return fm;
}

function firstH1(content) {
  const m = content.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : null;
}

function firstBlockquote(content) {
  // The convention across generators: a single "> …" line right after the H1.
  const m = content.match(/^>\s+(.+)$/m);
  return m ? m[1].trim().slice(0, DESC_MAX) : "";
}

function main() {
  if (!existsSync(ARCH_DIR)) {
    process.stderr.write(`architecture dir missing at ${ARCH_DIR}\n`);
    process.exit(2);
  }
  const t0 = Date.now();
  const files = walkMd(ARCH_DIR);
  const lines = [];
  let skipped = 0;
  for (const f of files) {
    let content;
    try { content = readFileSync(f, "utf8"); } catch { skipped++; continue; }
    const fm = parseFrontmatter(content);
    const name = basename(f, ".md");
    const title = fm.title || firstH1(content) || name;
    const type = fm.type || "architecture";
    const desc = firstBlockquote(content);
    const path = relative(PRISM_ROOT, f).replace(/\\/g, "/");
    lines.push(JSON.stringify({ name, title, type, desc, path }));
  }
  writeFileSync(OUT_PATH, lines.join("\n") + "\n", "utf8");
  process.stdout.write(`leaf-index: ${lines.length} entries written to _leaf-index.jsonl (${(Buffer.byteLength(lines.join("\n")) / 1048576).toFixed(2)} MB, ${Date.now() - t0}ms, skipped ${skipped})\n`);
}

main();
