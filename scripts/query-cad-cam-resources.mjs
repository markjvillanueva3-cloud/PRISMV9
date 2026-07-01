#!/usr/bin/env node
// query-cad-cam-resources.mjs
// Tiny consumer wrapper around cad-cam-resources-pdf-index.json.
//
// Usage:
//   node scripts/query-cad-cam-resources.mjs --domain cad        # all CAD-domain PDFs
//   node scripts/query-cad-cam-resources.mjs --domain cam        # all CAM-domain PDFs
//   node scripts/query-cad-cam-resources.mjs --software mastercam
//   node scripts/query-cad-cam-resources.mjs --domain cam --json # raw JSON
//   node scripts/query-cad-cam-resources.mjs --stats             # totals only
//
// Per kilo /checkin-kilo 2026-05-26 work order — "easy access" surface
// for CAD/CAM PDF resources, consumable by chats + dispatchers + injectors.

import fs from 'node:fs';
import path from 'node:path';

const INDEX = 'H:/prism/mcp-server/data/state/cad-cam-resources-pdf-index.json';
const MAX_LIST = 50; // truncate human output; --json bypasses

function parseArgs(argv) {
  const out = { domain: null, software: null, json: false, stats: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--domain') out.domain = argv[++i];
    else if (a === '--software') out.software = argv[++i];
    else if (a === '--json') out.json = true;
    else if (a === '--stats') out.stats = true;
  }
  return out;
}

function loadIndex() {
  if (!fs.existsSync(INDEX)) {
    return { ok: false, error: `Index not found: ${INDEX}. Run build-cad-cam-resources-pdf-index.mjs first.` };
  }
  try {
    return { ok: true, data: JSON.parse(fs.readFileSync(INDEX, 'utf8')) };
  } catch (e) {
    return { ok: false, error: `Failed to parse index: ${e.message}` };
  }
}

/**
 * Filter entries by domain/software.
 * Pure function — safe to test.
 * @param {Array} entries
 * @param {{domain?: string, software?: string}} opts
 */
export function filterEntries(entries, opts = {}) {
  return entries.filter((e) => {
    if (opts.domain && e.domain !== opts.domain) return false;
    if (opts.software && e.software !== opts.software) return false;
    return true;
  });
}

function main() {
  const args = parseArgs(process.argv);
  const r = loadIndex();
  if (!r.ok) {
    process.stderr.write(`ERROR: ${r.error}\n`);
    process.exit(1);
  }
  const idx = r.data;
  if (args.stats) {
    process.stdout.write(JSON.stringify({
      ok: true,
      totalPdfs: idx.totalPdfs,
      byDomain: idx.byDomain,
      bySoftware: idx.bySoftware,
      generatedAt: idx.generatedAt,
    }, null, 2) + '\n');
    return;
  }
  const hits = filterEntries(idx.entries, { domain: args.domain, software: args.software });
  if (args.json) {
    process.stdout.write(JSON.stringify({ ok: true, count: hits.length, entries: hits }, null, 2) + '\n');
    return;
  }
  // Human-readable text — truncate to MAX_LIST.
  process.stdout.write(`Total hits: ${hits.length}\n`);
  for (const e of hits.slice(0, MAX_LIST)) {
    process.stdout.write(`  [${e.domain}/${e.software}] ${e.relPath}\n`);
  }
  if (hits.length > MAX_LIST) {
    process.stdout.write(`  ... ${hits.length - MAX_LIST} more (use --json for full list)\n`);
  }
}

const invokedDirectly = process.argv[1]
  && path.basename(process.argv[1]) === 'query-cad-cam-resources.mjs';
if (invokedDirectly) main();
