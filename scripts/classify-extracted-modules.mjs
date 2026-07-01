#!/usr/bin/env node
// scripts/classify-extracted-modules.mjs
//
// Reads state/shared/extracted-modules-manifest.json (1788 modules from
// H:/PRISM/extracted + extracted_modules) and for each, attempts to match
// the legacy-monolith name to an existing PRISM engine in mcp-server/src/.
//
// Output: state/shared/extracted-modules-classified.json
//   { schemaVersion, generated_at, summary, modules: [{ ...orig, dup_status,
//     matched_engine?, matched_registry?, matched_algorithm?, match_confidence,
//     recommended_dispatcher, recommended_action }] }
//
// dup_status:
//   DUP_KEEP_EXISTING — fuzzy-matched (>=0.85) to an existing engine
//   PARTIAL_OVERLAP   — partial token match (0.55-0.85)
//   WIRE_CANDIDATE    — no match found; recommend new wiring
//   STUB              — <50 lines and no real content
//   DATABASE          — pure data, route to registry
//   META              — registry/index/summary file from the extractions, no code
//
// Karpathy:
//   CLASSIFY  — fuzzy-name match (legacy snake_case → camelCase normalization +
//               token Jaccard) + size/type heuristic
//   TECHNIQUE — pre-build O(N) symbol set; per-module match is O(1) hash + O(T) tokens
//   EDGE CASES — empty file, name-collisions across stockpiles, generic names
//               like "PRISM_DB" (low-confidence by design), meta files (.json
//               summaries → META)
//   FAILURE   — atomic .tmp write + rename
//
// Usage:  node scripts/classify-extracted-modules.mjs

import fs from 'node:fs';
import path from 'node:path';

const SCHEMA_VERSION = '1.0.0';
const ROOT = 'H:/PRISM';
const MANIFEST = path.join(ROOT, 'state/shared/extracted-modules-manifest.json');
const ENGINES_DIR = path.join(ROOT, 'mcp-server/src/engines');
const OUT = path.join(ROOT, 'state/shared/extracted-modules-classified.json');

function scanEngineNames() {
  if (!fs.existsSync(ENGINES_DIR)) return [];
  return fs.readdirSync(ENGINES_DIR)
    .filter(f => f.endsWith('.ts') && !f.endsWith('.d.ts') && !f.includes('test') && !f.includes('.spec.'))
    .map(f => f.replace(/\.ts$/, ''));
}

const DISPATCHER_BY_TYPE = {
  ai_ml: 'prism_ai',
  physics: 'prism_calc',
  geometry: 'prism_cad',
  cam: 'prism_cam',
  algorithm: 'prism_calc',
  engine: 'prism_dev',
  database: 'prism_data',
  material: 'prism_data',
  tool: 'prism_data',
  machine: 'prism_data',
  system: 'prism_session',
  test: 'n/a',
  util: 'n/a',
  misc: 'prism_dev',
};

// Convert PRISM_FOO_BAR_BAZ → 'foobarbaz' (collapsed) AND ['foo','bar','baz'] (tokens)
function normalize(s) {
  return String(s).toUpperCase().replace(/^PRISM[_-]?/i, '').replace(/[_\-\.]+/g, ' ').trim();
}
function collapsed(s) { return normalize(s).replace(/\s+/g, '').toLowerCase(); }
function tokens(s) {
  const t = normalize(s).split(/\s+/).filter(Boolean).map(x => x.toLowerCase());
  // Drop tiny stopwords + version suffixes
  return t.filter(x => x.length >= 2 && !/^v?\d+$/.test(x));
}

// Engine class name → token set
function buildEngineIndex(engineNames) {
  const byCollapsed = new Map(); // 'chatterpredictionengine' → original
  const tokenLists = []; // [{name, tokenSet}]
  for (const name of engineNames) {
    const c = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    byCollapsed.set(c, name);
    tokenLists.push({ name, tokenSet: new Set(splitCamel(name)) });
  }
  return { byCollapsed, tokenLists };
}

function splitCamel(s) {
  // 'ChatterPredictionEngine' → ['chatter','prediction','engine']
  return String(s).replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().split(/\s+/).filter(t => t.length >= 2 && !/^v?\d+$/.test(t));
}

function jaccard(aSet, bSet) {
  const inter = [...aSet].filter(x => bSet.has(x)).length;
  const union = new Set([...aSet, ...bSet]).size;
  return union === 0 ? 0 : inter / union;
}

function classifyModule(mod, idx) {
  // Meta / summary files first
  if (mod.ext === '.json' && /SUMMARY|INVENTORY|INDEX|REGISTRY|PRIORITY|PLAN/i.test(mod.name)) {
    return { dup_status: 'META', match_confidence: 0, recommended_action: 'index-only' };
  }
  if (mod.ext === '.md') {
    return { dup_status: 'META', match_confidence: 0, recommended_action: 'index-only' };
  }
  // Stub: tiny code files
  if (mod.lines > 0 && mod.lines < 30) {
    return { dup_status: 'STUB', match_confidence: 0, recommended_action: 'skip-too-small' };
  }
  // Type-driven preliminary recommendation
  let recommendedDispatcher = DISPATCHER_BY_TYPE[mod.type] || 'prism_dev';

  // Fuzzy-match against engine index
  const modTokens = new Set(tokens(mod.name));
  const modCollapsed = collapsed(mod.name);

  // Exact collapsed match → 0.95+
  if (idx.byCollapsed.has(modCollapsed)) {
    return {
      dup_status: 'DUP_KEEP_EXISTING',
      matched_engine: idx.byCollapsed.get(modCollapsed),
      match_confidence: 0.99,
      recommended_dispatcher: recommendedDispatcher,
      recommended_action: 'skip-dup-exact',
    };
  }
  // Jaccard scan for top match
  let best = { score: 0, name: null };
  for (const { name, tokenSet } of idx.tokenLists) {
    const score = jaccard(modTokens, tokenSet);
    if (score > best.score) { best = { score, name }; }
  }
  if (best.score >= 0.85) {
    return {
      dup_status: 'DUP_KEEP_EXISTING',
      matched_engine: best.name,
      match_confidence: round(best.score),
      recommended_dispatcher: recommendedDispatcher,
      recommended_action: 'skip-dup-fuzzy',
    };
  }
  if (best.score >= 0.55) {
    return {
      dup_status: 'PARTIAL_OVERLAP',
      matched_engine: best.name,
      match_confidence: round(best.score),
      recommended_dispatcher: recommendedDispatcher,
      recommended_action: 'extract-novel-features',
    };
  }
  // Database / data carriers
  if (mod.type === 'database' || /DATABASE|LOOKUP|CATALOG|REGISTRY|TABLE/i.test(mod.name)) {
    return {
      dup_status: 'DATABASE',
      matched_engine: best.score >= 0.3 ? best.name : null,
      match_confidence: round(best.score),
      recommended_dispatcher: 'prism_data',
      recommended_action: 'wire-as-registry',
    };
  }
  // Default: WIRE_CANDIDATE
  return {
    dup_status: 'WIRE_CANDIDATE',
    matched_engine: best.score >= 0.3 ? best.name : null,
    match_confidence: round(best.score),
    recommended_dispatcher: recommendedDispatcher,
    recommended_action: 'wire-new-engine',
  };
}

function round(n) { return Math.round(n * 1000) / 1000; }

function writeAtomic(p, data) {
  const tmp = `${p}.tmp.${process.pid}`;
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, p);
}

function main() {
  if (!fs.existsSync(MANIFEST)) {
    console.error(`FATAL: manifest missing — ${MANIFEST}\nRun: node scripts/build-extracted-modules-manifest.mjs`);
    process.exit(2);
  }
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const engineNames = scanEngineNames();
  if (engineNames.length === 0) {
    console.error(`FATAL: no engines found in ${ENGINES_DIR}`);
    process.exit(2);
  }
  const idx = buildEngineIndex(engineNames);

  const classified = manifest.modules.map(m => {
    const c = classifyModule(m, idx);
    return { ...m, ...c };
  });

  // Summary
  const by_status = {};
  const by_dispatcher = {};
  const wire_candidates_by_type = {};
  for (const c of classified) {
    by_status[c.dup_status] = (by_status[c.dup_status] || 0) + 1;
    if (c.recommended_dispatcher && c.recommended_dispatcher !== 'n/a') {
      by_dispatcher[c.recommended_dispatcher] = (by_dispatcher[c.recommended_dispatcher] || 0) + 1;
    }
    if (c.dup_status === 'WIRE_CANDIDATE') {
      wire_candidates_by_type[c.type] = (wire_candidates_by_type[c.type] || 0) + 1;
    }
  }

  // Top-20 highest-value WIRE_CANDIDATE by lines
  const top_wire = classified
    .filter(c => c.dup_status === 'WIRE_CANDIDATE')
    .sort((a, b) => b.lines - a.lines)
    .slice(0, 20)
    .map(c => ({ path: c.path, name: c.name, type: c.type, lines: c.lines, dispatcher: c.recommended_dispatcher, stockpile: c.source_stockpile }));

  // Top-20 highest-value DATABASE
  const top_db = classified
    .filter(c => c.dup_status === 'DATABASE')
    .sort((a, b) => b.lines - a.lines)
    .slice(0, 20)
    .map(c => ({ path: c.path, name: c.name, lines: c.lines, stockpile: c.source_stockpile }));

  const result = {
    schemaVersion: SCHEMA_VERSION,
    generated_at: new Date().toISOString(),
    manifest_source: MANIFEST,
    engine_corpus_size: engineNames.length,
    summary: {
      total_modules: classified.length,
      by_status,
      by_dispatcher,
      wire_candidates_by_type,
      top_20_wire_candidates: top_wire,
      top_20_databases: top_db,
    },
    modules: classified,
  };

  writeAtomic(OUT, result);
  console.log(JSON.stringify({
    ok: true,
    out: OUT,
    total: classified.length,
    by_status,
    by_dispatcher,
  }, null, 2));
}

main();
