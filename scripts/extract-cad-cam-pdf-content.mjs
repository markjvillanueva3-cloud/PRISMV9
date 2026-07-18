#!/usr/bin/env node
// extract-cad-cam-pdf-content.mjs
//
// For each PDF in cad-cam-resources-pdf-index.json with domain in
// {cad, cam}, run pdf-parse, emit a per-PDF node JSON at
// state/shared/cad-cam-pdf-nodes/<domain>/<sha8>.json and a sibling
// HTML view. Idempotent — skips already-extracted PDFs.
//
// Per kilo /checkin-kilo 2026-05-26 expanded scope:
//   "generate nodes for ALL text and content (convert to html if it
//    would be helpful) convert to nodes to wire into cad and cam"
//
// Usage:
//   node scripts/extract-cad-cam-pdf-content.mjs               # all cad+cam
//   node scripts/extract-cad-cam-pdf-content.mjs --limit 3     # first 3
//   node scripts/extract-cad-cam-pdf-content.mjs --domain cam  # cam only
//   node scripts/extract-cad-cam-pdf-content.mjs --force       # re-extract
//
// schemaVersion 1.0.0

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const SCHEMA_VERSION = '1.1.0';
const INDEX_PATH = 'H:/prism/mcp-server/data/state/cad-cam-resources-pdf-index.json';
const ROOTS = { 'resources': 'H:/prism/resources', 'jm-die': 'H:/PRISM/JM DIE' };
const OUT_BASE = 'H:/prism/state/shared/cad-cam-pdf-nodes';
const PROGRESS_PATH = `${OUT_BASE}/_progress.json`;
const MAX_TEXT_BYTES_INLINE = 200_000; // 200KB cap per node JSON; bigger PDFs get truncated text + full HTML
// Default domains targeted by extraction; can be overridden via --domain.
const DEFAULT_DOMAINS = new Set(['cad', 'cam', 'blueprint']);

// pdf-parse lives in mcp-server/node_modules — resolve from there.
const require = createRequire('H:/prism/mcp-server/package.json');
const { PDFParse } = require('pdf-parse');

function parseArgs(argv) {
  const out = { limit: null, domain: null, force: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--limit') out.limit = parseInt(argv[++i], 10);
    else if (argv[i] === '--domain') out.domain = argv[++i];
    else if (argv[i] === '--force') out.force = true;
  }
  return out;
}

/**
 * sha8 of a path (deterministic per relPath).
 * Pure function.
 */
export function sha8(s) {
  return crypto.createHash('sha256').update(String(s)).digest('hex').slice(0, 8);
}

/**
 * Convert plain text to a minimal HTML5 document with the text in <pre>.
 * Pure function — safe to test.
 * @param {{title: string, domain: string, software: string, relPath: string, pageCount: number, text: string}} node
 */
export function textToHtml(node) {
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>${esc(node.title)}</title>
<style>body{font:14px/1.5 system-ui,-apple-system,sans-serif;max-width:960px;margin:2em auto;padding:0 1em;background:#0d1117;color:#c9d1d9}h1{font-size:1.4em;border-bottom:1px solid #30363d;padding-bottom:.4em}dl{display:grid;grid-template-columns:max-content 1fr;gap:.3em 1em}dt{font-weight:600;color:#8b949e}pre{white-space:pre-wrap;word-wrap:break-word;background:#161b22;padding:1em;border:1px solid #30363d;border-radius:6px;font-size:13px}</style>
</head><body>
<h1>${esc(node.title)}</h1>
<dl>
<dt>Domain</dt><dd>${esc(node.domain)}</dd>
<dt>Software</dt><dd>${esc(node.software)}</dd>
<dt>Path</dt><dd><code>${esc(node.relPath)}</code></dd>
<dt>Pages</dt><dd>${node.pageCount}</dd>
<dt>Text chars</dt><dd>${node.text.length}</dd>
</dl>
<h2>Extracted text</h2>
<pre>${esc(node.text)}</pre>
</body></html>`;
}

async function extractOne(entry) {
  const rootBase = ROOTS[entry.source] || ROOTS['resources'];
  const abs = path.join(rootBase, entry.relPath);
  if (!fs.existsSync(abs)) return { ok: false, error: 'missing', relPath: entry.relPath };
  let buf;
  try { buf = fs.readFileSync(abs); } catch (e) { return { ok: false, error: e.message, relPath: entry.relPath }; }
  let result;
  try {
    const parser = new PDFParse({ data: buf });
    result = await parser.getText();
  } catch (e) {
    return { ok: false, error: e.message, relPath: entry.relPath };
  }
  const text = String(result?.text || '');
  const inlineText = text.length > MAX_TEXT_BYTES_INLINE ? text.slice(0, MAX_TEXT_BYTES_INLINE) + '\n[... truncated, see HTML for full]' : text;
  const node = {
    schemaVersion: SCHEMA_VERSION,
    sha8: sha8((entry.source || 'resources') + '/' + entry.relPath),
    title: path.basename(entry.relPath, '.pdf'),
    source: entry.source || 'resources',
    relPath: entry.relPath,
    domain: entry.domain,
    software: entry.software,
    top: entry.top,
    pageCount: result?.pages?.length || 0,
    textChars: text.length,
    text: inlineText,
    sizeBytes: entry.sizeBytes,
    extractedAt: new Date().toISOString(),
  };
  return { ok: true, node, fullText: text };
}

async function main() {
  const args = parseArgs(process.argv);
  if (!fs.existsSync(INDEX_PATH)) {
    process.stderr.write(`ERROR: ${INDEX_PATH} not found. Run build-cad-cam-resources-pdf-index.mjs first.\n`);
    process.exit(1);
  }
  const idx = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
  let queue = idx.entries.filter((e) => DEFAULT_DOMAINS.has(e.domain));
  if (args.domain) queue = queue.filter((e) => e.domain === args.domain);
  if (args.limit) queue = queue.slice(0, args.limit);

  for (const d of DEFAULT_DOMAINS) fs.mkdirSync(`${OUT_BASE}/${d}`, { recursive: true });

  const stats = { attempted: 0, extracted: 0, skipped: 0, failed: 0, startedAt: new Date().toISOString(), errors: [] };
  for (const entry of queue) {
    stats.attempted++;
    const sh = sha8((entry.source || 'resources') + '/' + entry.relPath);
    const nodePath = `${OUT_BASE}/${entry.domain}/${sh}.json`;
    const htmlPath = `${OUT_BASE}/${entry.domain}/${sh}.html`;
    if (!args.force && fs.existsSync(nodePath)) {
      stats.skipped++;
      continue;
    }
    const r = await extractOne(entry);
    if (!r.ok) {
      stats.failed++;
      stats.errors.push({ relPath: entry.relPath, error: r.error });
      continue;
    }
    fs.writeFileSync(nodePath, JSON.stringify(r.node, null, 2));
    // Full text goes into HTML even if truncated in JSON.
    const fullNode = { ...r.node, text: r.fullText };
    fs.writeFileSync(htmlPath, textToHtml(fullNode));
    stats.extracted++;
  }
  stats.finishedAt = new Date().toISOString();
  fs.writeFileSync(PROGRESS_PATH, JSON.stringify(stats, null, 2));
  process.stdout.write(JSON.stringify({
    ok: true,
    attempted: stats.attempted,
    extracted: stats.extracted,
    skipped: stats.skipped,
    failed: stats.failed,
    progressPath: PROGRESS_PATH,
  }) + '\n');
}

const invokedDirectly = process.argv[1]
  && path.basename(process.argv[1]) === 'extract-cad-cam-pdf-content.mjs';
if (invokedDirectly) main().catch((e) => { process.stderr.write(`FATAL: ${e.message}\n`); process.exit(1); });
