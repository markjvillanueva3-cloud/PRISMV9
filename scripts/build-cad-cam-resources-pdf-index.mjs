#!/usr/bin/env node
// build-cad-cam-resources-pdf-index.mjs
// Walks H:/prism/resources/ for all PDFs and classifies them by domain (cad/cam/mfg/training)
// + software (fusion360 / mastercam / hypermill / solidworks / etc.).
// Emits mcp-server/data/state/cad-cam-resources-pdf-index.json for tribal-by-domain
// injection + dispatcher lookup.
//
// Per kilo /checkin-kilo work order (2026-05-26):
//   "ensure we link pdfs for the cad cam software in the resources folder
//    to the cad and cam node domains for easy access"
//
// Pure-fn classifier + idempotent writer. Re-runnable.
// schemaVersion 1.0.0

import fs from 'node:fs';
import path from 'node:path';

const SCHEMA_VERSION = '1.2.0';
const ROOT = 'H:/prism/resources';
const JM_DIE_ROOT = 'H:/PRISM/JM DIE';
const JM_DIE_TRIBAL_WIKI_ROOT = 'H:/PRISM/JM DIE/TRIBAL + WIKI';
const OUT = 'H:/prism/mcp-server/data/state/cad-cam-resources-pdf-index.json';
const WALK_MAX_PDFS = 5000; // hard cap protects against runaway recursion
const JM_DIE_WALK_MAX_PDFS = 3000;
const JM_DIE_TRIBAL_WIKI_WALK_MAX_PDFS = 500;
// 2026-05-26 slot:delta — TRIBAL + WIKI is alphabetically the 20th JM DIE
// subdir; the parent JM DIE walk's 3000 cap exhausts before reaching it.
// Walk it separately with its own (small) cap so the 80 curated books always
// land in the index.

// Top-level subdir name → { domain, software }
// Domain enum matches tribal-by-domain-inject: cad | cam | mfg | training | machine | catalog
const DIR_MAP = {
  'CAD FILES':                                    { domain: 'cad',      software: 'generic-cad' },
  'DWG TrueView 2027 - English':                  { domain: 'cad',      software: 'dwg-trueview' },
  'Freecad':                                      { domain: 'cad',      software: 'freecad' },
  'Inventor':                                     { domain: 'cad',      software: 'inventor' },
  'Inventor 2027':                                { domain: 'cad',      software: 'inventor' },
  'inventor-hsm':                                 { domain: 'cam',      software: 'inventor-hsm' },
  'SOLIDWORKS':                                   { domain: 'cad',      software: 'solidworks' },
  'PART MODELS FOR LEARNING ENGINE':              { domain: 'cad',      software: 'generic-cad' },
  'TOOL_HOLDER_CAD_FILES':                        { domain: 'cad',      software: 'generic-cad' },

  'FUSION 360 PROGRAMS':                          { domain: 'cam',      software: 'fusion360-cam' },
  'FUSION BASIC POSTS':                           { domain: 'cam',      software: 'fusion360-post' },
  'FUSION POSTS':                                 { domain: 'cam',      software: 'fusion360-post' },
  'FUSION360':                                    { domain: 'cam',      software: 'fusion360-cam' },
  'fusion-addin':                                 { domain: 'cam',      software: 'fusion360-cam' },
  'HSMWorks 2026':                                { domain: 'cam',      software: 'hsmworks' },
  'HSMWorks 2027':                                { domain: 'cam',      software: 'hsmworks' },
  'HYPERMILL':                                    { domain: 'cam',      software: 'hypermill' },
  'OPEN MIND':                                    { domain: 'cam',      software: 'hypermill' },
  'MasterCam':                                    { domain: 'cam',      software: 'mastercam' },
  'SOLIDCAM':                                     { domain: 'cam',      software: 'solidcam' },

  'MACRO PROGRAMS':                               { domain: 'mfg',      software: 'macros' },
  'MULTUS PROGRAMS':                              { domain: 'mfg',      software: 'okuma-multus' },
  'OKUMA MULTUS PDFS':                            { domain: 'mfg',      software: 'okuma-multus' },
  'MACHINING KNOWLEDGE FORMULAS AND ALGORITHMS':  { domain: 'mfg',      software: 'physics' },

  '1- Basic Training Day 1':                      { domain: 'training', software: 'shop-basics' },
  '2- Basic Training Day 2':                      { domain: 'training', software: 'shop-basics' },
  '3- Basic Training Day 3':                      { domain: 'training', software: 'shop-basics' },
  'MIT COURSES':                                  { domain: 'training', software: 'mit-ocw' },
  'PRISM CAD-CAM TRAINING':                       { domain: 'training', software: 'prism-academy' },
  'PRISM FOLDER FROM HOME':                       { domain: 'training', software: 'prism' },
  'RESOURCE PDFS':                                { domain: 'training', software: 'misc' },

  'GENERIC MACHINE MODELS':                       { domain: 'machine',  software: 'machine-models' },
  'GENERIC_MACHINE_MODELS':                       { domain: 'machine',  software: 'machine-models' },
  'MACHINE MODELS FOR LEARNING ENGINE AND SIMULATION': { domain: 'machine', software: 'machine-models' },
  'MACHINE_SIMULATION_MODELS':                    { domain: 'machine',  software: 'machine-models' },
  'POSTS AND MACHINES':                           { domain: 'machine',  software: 'post-machines' },

  'MANUFACTURER_CATALOGS':                        { domain: 'catalog',  software: 'tool-catalog' },
  'PDF':                                          { domain: 'training', software: 'misc' },
};

/**
 * Classify a JM DIE PDF path to {domain, software}.
 * Most JM DIE PDFs are customer blueprints / engineering drawings — these
 * are CAD-pipeline INPUT (the print side of print-to-program). Software-doc
 * PDFs in JM DIE go to their respective machine/mfg domain.
 * Pure function — safe to test.
 * @param {string} rel - Path relative to JM_DIE_ROOT
 * @returns {{domain: string, software: string, top: string}}
 */
export function classifyJmDie(rel) {
  const norm = rel.split(/[\\/]/).filter(Boolean);
  const top = norm[0] || '';
  const upper = rel.toUpperCase();
  const fn = (norm[norm.length - 1] || '').toLowerCase();
  // TRIBAL + WIKI folder = curated books collection (NOT blueprints).
  // Classify per filename: CAD-graphics books → cad; CAM/CNC books → cam;
  // operator manual → machine; default to training.
  // Discovered 2026-05-26 slot:delta — 80 PDFs, 1.1 GB; the user named the
  // folder to signal "extract these into tribal + wiki".
  if (top === 'TRIBAL + WIKI') {
    if (/solidworks|fusion ?cad|engineering ?graphics|inventor|fundamentals3ddesign/i.test(fn)) {
      return { domain: 'cad', software: 'engineering-drawing-book', top };
    }
    if (/inventorcam/i.test(fn)) return { domain: 'cam', software: 'inventor-cam', top };
    if (/mastercam/i.test(fn)) return { domain: 'cam', software: 'mastercam', top };
    if (/hypermill|open ?mind/i.test(fn)) return { domain: 'cam', software: 'hypermill', top };
    if (/fusion/i.test(fn)) return { domain: 'cam', software: 'fusion360-cam', top };
    if (/cnc|lathe|mill|machining|toolpath|wcs|multiaxis|feeds|speeds|chip|drilling|helical/i.test(fn)) {
      return { domain: 'cam', software: 'cnc-machining-book', top };
    }
    if (/operator|manual.*english|interactive/i.test(fn)) {
      return { domain: 'machine', software: 'operator-manual', top };
    }
    return { domain: 'training', software: 'cnc-training-book', top };
  }
  // Software docs nested anywhere in JM DIE.
  if (/HYPERMILL|OPEN ?MIND/.test(upper)) return { domain: 'cam', software: 'hypermill', top };
  if (/MASTERCAM/.test(upper)) return { domain: 'cam', software: 'mastercam', top };
  if (/FUSION/.test(upper)) return { domain: 'cam', software: 'fusion360-cam', top };
  // Machine/post manuals.
  if (/POSTS AND MACHINES|OKUMA MULTUS PDFS|MACRO PROGRAMS|MACHINE MANUALS/.test(upper)) {
    return { domain: 'machine', software: 'machine-manual', top };
  }
  // Default: customer blueprint / engineering drawing — the CAD input side.
  return { domain: 'blueprint', software: 'engineering-drawing', top };
}

/**
 * Classify a PDF path under ROOT to {domain, software}.
 * Falls back to 'training' / 'misc' for unmapped top-level dirs.
 * Pure function — safe to test in isolation.
 * @param {string} rel - Path relative to ROOT (e.g. "HYPERMILL/foo.pdf")
 * @returns {{domain: string, software: string, top: string}}
 */
export function classify(rel) {
  // Normalize to forward slashes; relative parts.
  const norm = rel.split(/[\\/]/).filter(Boolean);
  const top = norm[0] || '';
  const hit = DIR_MAP[top];
  if (hit) return { ...hit, top };
  // Filename heuristics for top-level loose files.
  const fn = (norm[norm.length - 1] || '').toLowerCase();
  if (/winmax|hurco/.test(fn)) return { domain: 'machine', software: 'hurco', top };
  if (/fusion|hsm/.test(fn))   return { domain: 'cam',     software: 'fusion360-cam', top };
  if (/mastercam|mcam/.test(fn)) return { domain: 'cam',   software: 'mastercam', top };
  if (/hypermill|open.?mind/.test(fn)) return { domain: 'cam', software: 'hypermill', top };
  if (/solidwork/.test(fn))    return { domain: 'cad',     software: 'solidworks', top };
  if (/inventor/.test(fn))     return { domain: 'cad',     software: 'inventor', top };
  if (/macro/.test(fn))        return { domain: 'mfg',     software: 'macros', top };
  return { domain: 'training', software: 'misc', top };
}

// Directory names to skip entirely — these are bundled library/runtime trees
// that contain icon PDFs, not actual CAD/CAM documentation.
const SKIP_DIRS = new Set([
  'node_modules', 'site-packages', 'bin', 'Lib', 'dist',
  'venv', '__pycache__', '.git', 'mpl-data', 'images',
]);

function walk(d, out, max = WALK_MAX_PDFS) {
  if (out.length >= max) return;
  let xs;
  try { xs = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
  for (const x of xs) {
    if (out.length >= max) return;
    if (x.name.startsWith('.') || SKIP_DIRS.has(x.name)) continue;
    const ff = path.join(d, x.name);
    if (x.isDirectory()) walk(ff, out, max);
    else if (/\.pdf$/i.test(x.name)) out.push(ff);
  }
}

function build() {
  if (!fs.existsSync(ROOT)) {
    return { ok: false, error: `Root not found: ${ROOT}` };
  }
  const byDomain = {};
  const bySoftware = {};
  const bySource = {};
  const entries = [];
  // --- resources/ root ---
  const resPdfs = [];
  walk(ROOT, resPdfs, WALK_MAX_PDFS);
  for (const abs of resPdfs) {
    const rel = path.relative(ROOT, abs).replace(/\\/g, '/');
    const { domain, software, top } = classify(rel);
    const sz = (() => { try { return fs.statSync(abs).size; } catch { return 0; } })();
    entries.push({ source: 'resources', relPath: rel, domain, software, top, sizeBytes: sz });
    byDomain[domain] = (byDomain[domain] || 0) + 1;
    bySoftware[software] = (bySoftware[software] || 0) + 1;
    bySource.resources = (bySource.resources || 0) + 1;
  }
  // --- JM DIE / TRIBAL + WIKI priority walk (additive in schema v1.2.0) ---
  // Walk this BEFORE the parent JM DIE walk so the 80 curated CAD/CAM books
  // always land regardless of the 3K parent cap.
  const seenAbs = new Set();
  if (fs.existsSync(JM_DIE_TRIBAL_WIKI_ROOT)) {
    const twPdfs = [];
    walk(JM_DIE_TRIBAL_WIKI_ROOT, twPdfs, JM_DIE_TRIBAL_WIKI_WALK_MAX_PDFS);
    for (const abs of twPdfs) {
      seenAbs.add(abs);
      const rel = ('TRIBAL + WIKI/' + path.relative(JM_DIE_TRIBAL_WIKI_ROOT, abs).replace(/\\/g, '/'));
      const { domain, software, top } = classifyJmDie(rel);
      const sz = (() => { try { return fs.statSync(abs).size; } catch { return 0; } })();
      entries.push({ source: 'jm-die', relPath: rel, domain, software, top, sizeBytes: sz });
      byDomain[domain] = (byDomain[domain] || 0) + 1;
      bySoftware[software] = (bySoftware[software] || 0) + 1;
      bySource['jm-die'] = (bySource['jm-die'] || 0) + 1;
    }
  }
  // --- JM DIE root (additive in schema v1.1.0) ---
  if (fs.existsSync(JM_DIE_ROOT)) {
    const jmPdfs = [];
    walk(JM_DIE_ROOT, jmPdfs, JM_DIE_WALK_MAX_PDFS);
    for (const abs of jmPdfs) {
      if (seenAbs.has(abs)) continue; // skip already-indexed TRIBAL + WIKI entries
      const rel = path.relative(JM_DIE_ROOT, abs).replace(/\\/g, '/');
      const { domain, software, top } = classifyJmDie(rel);
      const sz = (() => { try { return fs.statSync(abs).size; } catch { return 0; } })();
      entries.push({ source: 'jm-die', relPath: rel, domain, software, top, sizeBytes: sz });
      byDomain[domain] = (byDomain[domain] || 0) + 1;
      bySoftware[software] = (bySoftware[software] || 0) + 1;
      bySource['jm-die'] = (bySource['jm-die'] || 0) + 1;
    }
  }
  entries.sort((a, b) => (a.source + '/' + a.relPath).localeCompare(b.source + '/' + b.relPath));
  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    roots: { resources: ROOT, 'jm-die': JM_DIE_ROOT },
    totalPdfs: entries.length,
    byDomain,
    bySoftware,
    bySource,
    entries,
    ok: true,
  };
}

function main() {
  const idx = build();
  if (!idx.ok) {
    process.stderr.write(`ERROR: ${idx.error}\n`);
    process.exit(1);
  }
  const outDir = path.dirname(OUT);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(idx, null, 2));
  // Summary to stdout (machine-readable single-line JSON for /loop ticks).
  const summary = {
    ok: true,
    written: OUT,
    totalPdfs: idx.totalPdfs,
    byDomain: idx.byDomain,
  };
  process.stdout.write(JSON.stringify(summary) + '\n');
}

// Run main() when invoked directly as a script.
// (Windows-portable: compare normalized base paths rather than full file:// URLs.)
const invokedDirectly = process.argv[1]
  && path.basename(process.argv[1]) === 'build-cad-cam-resources-pdf-index.mjs';
if (invokedDirectly) main();
