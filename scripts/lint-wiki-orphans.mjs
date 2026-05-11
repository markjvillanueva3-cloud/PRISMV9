#!/usr/bin/env node
/**
 * lint-wiki-orphans.mjs
 *
 * Finds Obsidian wiki entries with ZERO inbound `[[link]]` references.
 *
 * Strategy:
 *   1. Walk knowledge/wiki/ and collect all *.md basenames (the [[link]] target form)
 *   2. Walk every wiki file once, scan body for [[X]] / [[X|Y]] / [[X#H]] tokens
 *   3. Emit per-section stats: total / orphans / orphan ratio
 *   4. Optionally write orphan list to state/shared/wiki-orphans.json
 *
 * Soft tool: orphans aren't bad per se. Generated entries (layer-l5, etc.)
 * naturally have low backlink count until other wiki content references them.
 * This report exists to flag stale or never-referenced entries for cleanup.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { resolve, dirname, join, basename, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PRISM_ROOT = resolve(__dirname, "..");
const WIKI_DIR = resolve(PRISM_ROOT, "knowledge/wiki");
const OUT_PATH = resolve(PRISM_ROOT, "state/shared/wiki-orphans.json");

const args = new Set(process.argv.slice(2));
const FLAGS = { write: args.has("--write"), section: args.has("--section") };

const SAMPLE_ORPHANS = 5;

function walkMd(dir) {
  const out = [];
  function rec(d) {
    let entries;
    try { entries = readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = join(d, e.name);
      if (e.isDirectory()) rec(full);
      else if (e.isFile() && e.name.endsWith(".md")) out.push(full);
    }
  }
  rec(dir);
  return out;
}

function main() {
  if (!existsSync(WIKI_DIR)) {
    console.error("wiki dir missing");
    process.exit(2);
  }
  const t0 = Date.now();
  const files = walkMd(WIKI_DIR);
  const fileByBase = new Map(); // base → path
  for (const f of files) {
    const base = basename(f, ".md").toLowerCase();
    fileByBase.set(base, f);
  }
  const inbound = new Map();
  const linkRe = /\[\[([^\]\n|#]+?)(?:[|#][^\]\n]*)?\]\]/g;
  for (const f of files) {
    let content;
    try { content = readFileSync(f, "utf8"); } catch { continue; }
    let m;
    while ((m = linkRe.exec(content)) !== null) {
      const target = m[1].trim().toLowerCase();
      inbound.set(target, (inbound.get(target) || 0) + 1);
    }
  }

  // Section by path (top-level subdir under wiki/)
  const sections = {};
  let total = 0;
  let totalOrphans = 0;
  for (const f of files) {
    const rel = relative(WIKI_DIR, f).replace(/\\/g, "/");
    const section = rel.split("/")[0] || "_root";
    const base = basename(f, ".md").toLowerCase();
    const links = inbound.get(base) || 0;
    sections[section] = sections[section] || { total: 0, orphans: 0, orphanList: [] };
    sections[section].total++;
    total++;
    if (links === 0) {
      sections[section].orphans++;
      totalOrphans++;
      if (sections[section].orphanList.length < SAMPLE_ORPHANS) {
        sections[section].orphanList.push(rel);
      }
    }
  }

  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    totals: { files: total, orphans: totalOrphans, orphanRatio: total ? +(totalOrphans / total).toFixed(4) : 0 },
    sections,
    elapsedMs: Date.now() - t0,
  };

  if (FLAGS.write) {
    const dir = dirname(OUT_PATH);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(OUT_PATH, JSON.stringify(report, null, 2), "utf8");
    console.log(`wrote ${OUT_PATH}`);
  }

  console.log(`wiki lint: ${total} files · ${totalOrphans} orphans (${(report.totals.orphanRatio * 100).toFixed(1)}%) · ${Date.now() - t0}ms`);
  if (FLAGS.section) {
    for (const [s, info] of Object.entries(sections).sort((a, b) => b[1].orphans - a[1].orphans)) {
      const pct = info.total ? ((info.orphans / info.total) * 100).toFixed(1) : "0";
      console.log(`  ${s.padEnd(20)} ${String(info.orphans).padStart(5)} / ${String(info.total).padStart(5)} (${pct}%)`);
    }
  }
}

main();
