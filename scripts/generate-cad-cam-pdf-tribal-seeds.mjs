#!/usr/bin/env node
// generate-cad-cam-pdf-tribal-seeds.mjs
//
// For each (domain, software) bucket in the extracted PDF nodes, emit one
// pointer-style tribal-tip entry that any consumer (tribal-by-domain-inject,
// course content, /shop-knowledge skill) can surface to operators.
//
// These are POINTER tips, not AI-summarized tips. Full semantic summarization
// requires Ollama (currently offline per fleet banner). Pointer tips name the
// node directory and per-software count so consumers know the corpus exists.
//
// schemaVersion 1.0.0
//
// Per kilo /checkin-kilo 2026-05-26: "generate wikis and tribal knowledge
// if we haven't done so already".

import fs from 'node:fs';
import path from 'node:path';

const SCHEMA_VERSION = '1.0.0';
const NODES_BASE = 'H:/prism/state/shared/cad-cam-pdf-nodes';
const OUT = 'H:/prism/state/shared/cad-cam-pdf-tribal-seeds.json';

const SOFTWARE_TO_DOMAIN_TAG = {
  hypermill: 'cam',
  mastercam: 'cam',
  'fusion360-cam': 'cam',
  'fusion360-post': 'cam',
  hsmworks: 'cam',
  solidcam: 'cam',
  'inventor-hsm': 'cam',
  solidworks: 'cad',
  freecad: 'cad',
  inventor: 'cad',
  'dwg-trueview': 'cad',
  'generic-cad': 'cad',
  'engineering-drawing': 'blueprint',
  'machine-manual': 'mfg',
};

function loadNodes(domain) {
  const dir = `${NODES_BASE}/${domain}`;
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const f of fs.readdirSync(dir)) {
    if (!/\.json$/.test(f) || f.startsWith('_')) continue;
    try {
      out.push(JSON.parse(fs.readFileSync(`${dir}/${f}`, 'utf8')));
    } catch {
      // ignore corrupt entries
    }
  }
  return out;
}

/**
 * Aggregate nodes by software.
 * Pure function.
 * @param {Array} nodes
 * @returns {Map<string, {count, totalChars, totalPages, paths: string[]}>}
 */
export function aggregateBySoftware(nodes) {
  const map = new Map();
  for (const n of nodes) {
    const sw = n.software || 'unknown';
    if (!map.has(sw)) {
      map.set(sw, { count: 0, totalChars: 0, totalPages: 0, paths: [] });
    }
    const slot = map.get(sw);
    slot.count++;
    slot.totalChars += n.textChars || 0;
    slot.totalPages += n.pageCount || 0;
    if (slot.paths.length < 5) slot.paths.push(n.relPath);
  }
  return map;
}

/**
 * Build a single tribal tip from a software aggregate.
 * Pure function.
 */
export function buildTip(software, agg, domain) {
  const domainTag = SOFTWARE_TO_DOMAIN_TAG[software] || domain;
  const samplePaths = agg.paths.slice(0, 3).map((p) => `\`${p}\``).join(', ');
  return {
    id: `tribal-pdf-corpus-${software}`,
    domain: domainTag,
    software,
    title: `${software} PDF documentation corpus (${agg.count} docs, ${agg.totalPages} pages)`,
    text: `PRISM has ${agg.count} extracted PDF documents totaling ${agg.totalPages.toLocaleString()} pages and ${agg.totalChars.toLocaleString()} characters of indexed text for ${software}. Query via \`node scripts/query-cad-cam-resources.mjs --software ${software}\`. Full text + HTML view per document at \`state/shared/cad-cam-pdf-nodes/${domainTag}/<sha8>.{json,html}\`. Sample paths: ${samplePaths}.`,
    sourceCorpus: 'cad-cam-pdf-nodes',
    nodeCount: agg.count,
    tags: [domainTag, software, 'pdf-corpus', 'reference-documentation'],
    sourceType: 'pointer',
    generatedAt: new Date().toISOString(),
  };
}

function main() {
  const allNodes = [
    ...loadNodes('cad'),
    ...loadNodes('cam'),
    ...loadNodes('blueprint'),
  ];
  const byDomain = { cad: [], cam: [], blueprint: [] };
  for (const n of allNodes) {
    if (n.domain && byDomain[n.domain]) byDomain[n.domain].push(n);
  }
  const tips = [];
  for (const dom of Object.keys(byDomain)) {
    const agg = aggregateBySoftware(byDomain[dom]);
    for (const [sw, a] of agg.entries()) {
      tips.push(buildTip(sw, a, dom));
    }
  }
  const out = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    totalNodes: allNodes.length,
    totalTips: tips.length,
    tips,
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  process.stdout.write(JSON.stringify({
    ok: true,
    written: OUT,
    totalNodes: out.totalNodes,
    totalTips: out.totalTips,
  }) + '\n');
}

const invokedDirectly = process.argv[1]
  && path.basename(process.argv[1]) === 'generate-cad-cam-pdf-tribal-seeds.mjs';
if (invokedDirectly) main();
