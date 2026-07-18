#!/usr/bin/env node
// build-cam-knowledge-index.mjs
//
// Builds a unified manifest of every CAM-relevant knowledge node in PRISM
// so AI CAD engines + Claude test/train contexts can surface CAM tribal +
// wiki + PDF corpus + extracted-knowledge without re-deriving the catalog.
//
// Per kilo /checkin-kilo 2026-05-26: "ensure wiki and tribal knowledge
// nodes relevant for cam are wired into the ai cad system and claude
// usage for testing and training the system".
//
// Consumers:
//   - aiSystemRouterEngine.route() — pulls cam_knowledge_index_path
//   - tribal-by-domain-inject (slot:cam | slot:kilo | prompt has CAM keywords)
//   - CAM training pipelines (CAM-AI-TRAINING-MS0 successor)
//   - Claude session-bootstrap when slot domain ∈ {cam, kilo}
//
// schemaVersion 1.0.0
//
// Pure-fn classifier; idempotent writer; safe to run repeatedly.

import fs from 'node:fs';
import path from 'node:path';

const SCHEMA_VERSION = '1.0.0';
const OUT = 'H:/prism-slot-kilo/state/shared/training/cam-knowledge-index.json';

// CAM-relevant keyword set — matched against filename + (sampled) content.
// Tuned to maximize precision on real CAM/CAD work: software names, NC ops,
// post-processor terms, toolpath strategies. Excludes broad words like
// "cut" (too noisy in mill+lathe+wedm cross-domain content).
const CAM_KEYWORDS = [
  'mastercam', 'hypermill', 'fusion 360', 'fusion360', 'solidcam',
  'powermill', 'esprit', 'nx cam', 'nxcam', 'inventor hsm', 'inventor-hsm',
  'hsmworks', 'bobcad', 'gibbscam', 'catia cam', 'opens mind', 'siemens nx',
  'cam strategy', 'cam toolpath', 'toolpath', 'post processor', 'post-processor',
  'g-code', 'gcode', 'm-code', 'mcode', 'rapid traverse', 'feed rate',
  'spindle speed', 'cutter compensation', 'tool compensation',
  'pocketing', 'profile milling', 'adaptive clear', 'dynamic motion',
  'high speed machining', 'hsm ', 'trochoidal',
  'drilling cycle', 'tapping cycle', 'boring cycle', 'reaming cycle',
];

const SOURCES = [
  { id: 'wiki-architecture-tribal', dir: 'H:/prism-slot-kilo/knowledge/wiki/architecture/tribal', kind: 'wiki-tribal', exts: ['.md'] },
  { id: 'wiki-code-tribal', dir: 'H:/prism-slot-kilo/knowledge/wiki/code-tribal', kind: 'wiki-code-tribal', exts: ['.md'] },
  { id: 'wiki-architecture', dir: 'H:/prism-slot-kilo/knowledge/wiki/architecture', kind: 'wiki-architecture', exts: ['.md'], depth: 1, contentScan: false },
  { id: 'memory-reference', dir: 'H:/prism-slot-kilo/knowledge/memories/reference', kind: 'memory-reference', exts: ['.md'] },
  { id: 'memory-feedback', dir: 'H:/prism-slot-kilo/knowledge/memories/feedback', kind: 'memory-feedback', exts: ['.md'] },
  { id: 'cam-pdf-nodes', dir: 'H:/prism/state/shared/cad-cam-pdf-nodes/cam', kind: 'extracted-pdf-node', exts: ['.json'] },
  { id: 'extracted-knowledge', dir: 'H:/prism/mcp-server/data/extracted-knowledge', kind: 'extracted-knowledge', exts: ['.json'], depth: 2 },
];

const CONTENT_SCAN_BYTES = 4096; // header sample only — full-text scan is wasteful

/**
 * Classify a path+(optional) content sample as CAM-relevant or not.
 * Pure function — safe to test.
 * @param {string} relPath - relative path (will be lowercased)
 * @param {string} [contentSample] - optional file header bytes
 * @returns {{ camRelevant: boolean, matchedKeywords: string[], matchSource: 'filename' | 'content' | 'both' | 'none' }}
 */
export function classifyCamRelevance(relPath, contentSample = '') {
  // Normalize: lowercase + collapse dashes/underscores/slashes to spaces so
  // multi-word keywords ("fusion 360") match "fusion-360-post.md".
  const normalize = (s) => String(s).toLowerCase().replace(/[-_\/\\.]/g, ' ');
  const filenameLower = normalize(relPath);
  const contentLower = normalize(contentSample);
  const filenameHits = [];
  const contentHits = [];
  for (const kw of CAM_KEYWORDS) {
    if (filenameLower.includes(kw)) filenameHits.push(kw);
    else if (contentLower.includes(kw)) contentHits.push(kw);
  }
  const allHits = [...new Set([...filenameHits, ...contentHits])];
  const camRelevant = allHits.length > 0;
  let matchSource = 'none';
  if (filenameHits.length && contentHits.length) matchSource = 'both';
  else if (filenameHits.length) matchSource = 'filename';
  else if (contentHits.length) matchSource = 'content';
  return { camRelevant, matchedKeywords: allHits, matchSource };
}

function readSample(abs) {
  try {
    const fd = fs.openSync(abs, 'r');
    const buf = Buffer.alloc(CONTENT_SCAN_BYTES);
    const n = fs.readSync(fd, buf, 0, CONTENT_SCAN_BYTES, 0);
    fs.closeSync(fd);
    return buf.subarray(0, n).toString('utf8');
  } catch { return ''; }
}

function walk(dir, exts, depth = Infinity) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  const stack = [{ d: dir, cur: 0 }];
  while (stack.length) {
    const { d, cur } = stack.pop();
    let xs;
    try { xs = fs.readdirSync(d, { withFileTypes: true }); } catch { continue; }
    for (const x of xs) {
      if (x.name.startsWith('.') || x.name === 'node_modules') continue;
      const ff = path.join(d, x.name);
      if (x.isDirectory()) {
        if (cur < depth) stack.push({ d: ff, cur: cur + 1 });
      } else if (exts.some((e) => x.name.endsWith(e))) {
        out.push(ff);
      }
    }
  }
  return out;
}

function inspectSource(src) {
  const files = walk(src.dir, src.exts, src.depth ?? Infinity);
  const camNodes = [];
  for (const abs of files) {
    const rel = path.relative(src.dir, abs).replace(/\\/g, '/');
    const content = src.contentScan === false ? '' : readSample(abs);
    const cls = classifyCamRelevance(rel, content);
    if (cls.camRelevant) {
      camNodes.push({
        path: abs.replace(/\\/g, '/'),
        relPath: rel,
        kind: src.kind,
        matchSource: cls.matchSource,
        matchedKeywords: cls.matchedKeywords.slice(0, 5), // cap
      });
    }
  }
  return {
    sourceId: src.id,
    dir: src.dir,
    kind: src.kind,
    totalFiles: files.length,
    camRelevantCount: camNodes.length,
    nodes: camNodes,
  };
}

function buildIndex() {
  const results = SOURCES.map(inspectSource);
  const totalCam = results.reduce((s, r) => s + r.camRelevantCount, 0);
  const totalFiles = results.reduce((s, r) => s + r.totalFiles, 0);
  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    description: 'Unified CAM-relevant knowledge index — wiki + tribal + memory + extracted-PDF nodes filtered by CAM keyword set. Consumed by AI CAD engines (aiSystemRouterEngine), tribal-by-domain-inject (slot:cam|kilo), and Claude session-bootstrap for CAM test/train tasks.',
    camKeywords: CAM_KEYWORDS,
    totalFilesScanned: totalFiles,
    totalCamRelevant: totalCam,
    sources: results,
  };
}

function main() {
  const idx = buildIndex();
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(idx, null, 2));
  process.stdout.write(JSON.stringify({
    ok: true,
    written: OUT,
    totalFilesScanned: idx.totalFilesScanned,
    totalCamRelevant: idx.totalCamRelevant,
    sourcesScanned: idx.sources.length,
  }) + '\n');
}

const invokedDirectly = process.argv[1]
  && path.basename(process.argv[1]) === 'build-cam-knowledge-index.mjs';
if (invokedDirectly) main();
