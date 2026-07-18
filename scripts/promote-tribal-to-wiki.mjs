#!/usr/bin/env node
// H1 of [[audit-system-synergy-2026-05-09]] — U-TRIBAL-TO-WIKI-PROMOTE.
//
// Auto-promotes high-confidence tribal-knowledge tips from
// `knowledge/tribal/*.md` (~3919 entries) → `knowledge/wiki/code-tribal/`
// (compounding-gains exemplar — every tribal-ingest auto-feeds the wiki
// without manual curation).
//
// Source format (knowledge/tribal/<source>-<id>.md):
//   ---
//   id: "<id>"
//   title: "..."
//   source: "web:... | jm-die:... | auto:extracted"
//   confidence: <0..100>
//   category: "cam_strategy | machining | ..."
//   tags: [...]
//   _source: "<source-file>.ts"
//   indexed_at: <iso>
//   ---
//   <body>
//
// Target format (knowledge/wiki/code-tribal/tribal-<id>.md):
//   ---
//   name: tribal-<id>
//   category: code-tribal
//   subdomain: <tribal-category>        (e.g. cam_strategy)
//   domain: tribal-knowledge
//   tags: [...]
//   confidence: <0..100>
//   source: <original-source>
//   promoted_from: <tribal-file-path>
//   promoted_at: <iso>
//   ---
//   # <title>
//   <body>
//
// Pure-core + injected-IO. Default --dry-run (operator must pass --apply to
// write). Skips quarantine subdir. Skip-if-exists by target filename. Atomic
// writes via .tmp.{pid}+rename.
//
// CLI:
//   node scripts/promote-tribal-to-wiki.mjs --dry-run                # default
//   node scripts/promote-tribal-to-wiki.mjs --apply                  # write
//   node scripts/promote-tribal-to-wiki.mjs --apply --threshold 95   # higher bar
//   node scripts/promote-tribal-to-wiki.mjs --json                   # JSON out
//   node scripts/promote-tribal-to-wiki.mjs --apply --limit 50       # cap writes
//
// Knobs:
//   PRISM_TRIBAL_PROMOTE_THRESHOLD=<N>   default 90
//   PRISM_TRIBAL_PROMOTE_LIMIT=<N>       no default cap

import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DEFAULT_TRIBAL_ROOT = "H:/prism/knowledge/tribal";
const DEFAULT_WIKI_TARGET = "H:/prism/knowledge/wiki/code-tribal";
const DEFAULT_THRESHOLD = 90;
const TARGET_PREFIX = "tribal-";

export function parseTribalFrontmatter(body) {
  if (typeof body !== "string" || !body.startsWith("---")) return null;
  const end = body.indexOf("\n---", 3);
  if (end < 0) return null;
  const fmBlob = body.slice(3, end).trim();
  const rest = body.slice(end + 4).replace(/^\n+/, "");

  const fm = {};
  const lines = fmBlob.split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^([A-Za-z_][\w-]*):\s*(.+?)\s*$/);
    if (!m) continue;
    const key = m[1];
    let raw = m[2];
    if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
      raw = raw.slice(1, -1);
    }
    if (raw.startsWith("[") && raw.endsWith("]")) {
      const inner = raw.slice(1, -1);
      fm[key] = inner.split(",").map((s) => s.trim().replace(/^['"]|['"]$/g, "")).filter(Boolean);
      continue;
    }
    if (key === "confidence") {
      const n = parseInt(raw, 10);
      fm[key] = Number.isFinite(n) ? n : raw;
      continue;
    }
    fm[key] = raw;
  }
  return { fm, body: rest };
}

export function shouldPromote(fm, threshold) {
  if (!fm || typeof fm !== "object") return false;
  const c = Number(fm.confidence);
  if (!Number.isFinite(c)) return false;
  return c >= threshold;
}

export function buildWikiEntry({ fm, body, sourceFileName }) {
  if (!fm || typeof fm !== "object") return null;
  const id = String(fm.id || "").trim() || sourceFileName.replace(/\.md$/i, "");
  const slug = `${TARGET_PREFIX}${id}`.replace(/[^A-Za-z0-9_-]/g, "-");
  const title = String(fm.title || id).trim();
  const tagsArr = Array.isArray(fm.tags) ? fm.tags : (typeof fm.tags === "string" ? [fm.tags] : []);
  const tagsRendered = tagsArr.length ? "[" + tagsArr.map((t) => JSON.stringify(t)).join(", ") + "]" : "[]";
  const subdomain = String(fm.category || "general").trim();
  const source = String(fm.source || "").trim();
  const confidence = Number(fm.confidence);

  const promotedAt = new Date().toISOString();
  const wikiFM = [
    "---",
    `name: ${slug}`,
    "category: code-tribal",
    `subdomain: ${subdomain}`,
    "domain: tribal-knowledge",
    `tags: ${tagsRendered}`,
    `confidence: ${confidence}`,
    source ? `source: ${JSON.stringify(source)}` : null,
    `promoted_from: knowledge/tribal/${sourceFileName}`,
    `promoted_at: ${promotedAt}`,
    "---",
    "",
  ].filter((s) => s !== null).join("\n");

  const bodyText = (body || "").trim();
  const hasH1 = /^#\s/.test(bodyText);
  const heading = hasH1 ? "" : `# ${title}\n\n`;
  return { slug, fileName: `${slug}.md`, content: wikiFM + "\n" + heading + bodyText + "\n" };
}

export function enumerateTribalFiles({
  tribalRoot = DEFAULT_TRIBAL_ROOT,
  readdirImpl = readdirSync,
  statImpl = statSync,
} = {}) {
  let entries;
  try { entries = readdirImpl(tribalRoot); } catch { return []; }
  const out = [];
  for (const name of entries) {
    if (!/\.md$/i.test(name)) continue;
    const full = join(tribalRoot, name);
    try {
      const st = statImpl(full);
      if (st.isDirectory && st.isDirectory()) continue;
      if (st.isFile && !st.isFile()) continue;
    } catch { continue; }
    out.push({ fileName: name, fullPath: full });
  }
  return out;
}

export function runPromotion({
  tribalRoot = DEFAULT_TRIBAL_ROOT,
  wikiTarget = DEFAULT_WIKI_TARGET,
  threshold = DEFAULT_THRESHOLD,
  apply = false,
  limit = null,
  readdirImpl = readdirSync,
  readFileImpl = readFileSync,
  statImpl = statSync,
  existsImpl = existsSync,
  writeFileImpl = writeFileSync,
  renameImpl = renameSync,
  mkdirImpl = mkdirSync,
} = {}) {
  const files = enumerateTribalFiles({ tribalRoot, readdirImpl, statImpl });
  const report = {
    threshold,
    apply,
    tribalRoot,
    wikiTarget,
    totalScanned: 0,
    aboveThreshold: 0,
    skippedExisting: 0,
    skippedMalformed: 0,
    promoted: 0,
    candidates: [],
    written: [],
  };
  if (apply && !existsImpl(wikiTarget)) {
    mkdirImpl(wikiTarget, { recursive: true });
  }

  for (const f of files) {
    if (typeof limit === "number" && report.promoted >= limit) break;
    report.totalScanned++;

    let body;
    try { body = readFileImpl(f.fullPath, "utf8"); }
    catch { report.skippedMalformed++; continue; }

    const parsed = parseTribalFrontmatter(body);
    if (!parsed) { report.skippedMalformed++; continue; }
    if (!shouldPromote(parsed.fm, threshold)) continue;
    report.aboveThreshold++;

    const entry = buildWikiEntry({ fm: parsed.fm, body: parsed.body, sourceFileName: f.fileName });
    if (!entry) { report.skippedMalformed++; continue; }
    const targetPath = join(wikiTarget, entry.fileName);
    if (existsImpl(targetPath)) { report.skippedExisting++; continue; }

    report.candidates.push({ src: f.fileName, target: entry.fileName, confidence: parsed.fm.confidence });

    if (apply) {
      const tmp = `${targetPath}.tmp.${process.pid}`;
      writeFileImpl(tmp, entry.content, "utf8");
      renameImpl(tmp, targetPath);
      report.written.push(targetPath);
      report.promoted++;
    }
  }

  return report;
}

function clampInt(raw, fallback, min, max) {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function parseArgs(argv) {
  const out = { apply: false, json: false, threshold: null, limit: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--apply") out.apply = true;
    else if (a === "--dry-run") out.apply = false;
    else if (a === "--json") out.json = true;
    else if (a === "--threshold") out.threshold = parseInt(argv[++i], 10);
    else if (a === "--limit") out.limit = parseInt(argv[++i], 10);
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const threshold = Number.isFinite(args.threshold)
    ? args.threshold
    : clampInt(process.env.PRISM_TRIBAL_PROMOTE_THRESHOLD, DEFAULT_THRESHOLD, 0, 100);
  const limitEnv = clampInt(process.env.PRISM_TRIBAL_PROMOTE_LIMIT, null, 1, 100000);
  const limit = Number.isFinite(args.limit) ? args.limit : limitEnv;

  const start = Date.now();
  const report = runPromotion({ threshold, apply: args.apply, limit });
  const elapsedMs = Date.now() - start;

  if (args.json) {
    process.stdout.write(JSON.stringify({ ...report, elapsedMs }, null, 2) + "\n");
    return;
  }

  const verb = args.apply ? "PROMOTED" : "WOULD PROMOTE";
  process.stdout.write(
    `[promote-tribal-to-wiki] threshold=${threshold} ` +
    `scanned=${report.totalScanned} above=${report.aboveThreshold} ` +
    `skipExisting=${report.skippedExisting} skipMalformed=${report.skippedMalformed} ` +
    `${verb}=${report.candidates.length} elapsed=${elapsedMs}ms\n`,
  );
  if (!args.apply && report.candidates.length > 0) {
    process.stdout.write("  (sample of first 5 candidates:)\n");
    report.candidates.slice(0, 5).forEach((c) => {
      process.stdout.write(`    ${c.src} (conf ${c.confidence}) → ${c.target}\n`);
    });
    process.stdout.write("  Re-run with --apply to write.\n");
  }
}

const invokedDirect = (() => {
  try {
    const here = new URL(import.meta.url).pathname.replace(/^\/+([A-Za-z]:)/, "$1");
    const argv = process.argv[1] || "";
    const norm = (s) => s.replace(/\\/g, "/").toLowerCase();
    return norm(here) === norm(argv);
  } catch { return false; }
})();

if (invokedDirect) {
  try { main(); }
  catch (err) {
    try { process.stderr.write(`[promote-tribal-to-wiki] ${err?.stack || err?.message || err}\n`); }
    catch { /* ignore */ }
    process.exit(1);
  }
}
