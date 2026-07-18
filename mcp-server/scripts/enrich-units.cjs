'use strict';
// enrich-units.cjs — One-time enrichment pass for auto-generated unit titles in roadmap-index.json
// Strategy: cross-reference milestone titles/tracks against ENGINE_DIGEST.md and DISPATCHER_DIGEST.md
// to replace generic titles like "Core implementation" with specific engine references.

const fs = require('fs');
const path = require('path');

// ─── File Paths ────────────────────────────────────────────────────────────────
const ROADMAP_PATH = path.join(__dirname, '..', 'data', 'roadmap-index.json');
const ENGINE_DIGEST_PATH = path.join(__dirname, '..', 'data', 'docs', 'ENGINE_DIGEST.md');
const DISPATCHER_DIGEST_PATH = path.join(__dirname, '..', 'data', 'docs', 'DISPATCHER_DIGEST.md');

// ─── Generic Title Detection ───────────────────────────────────────────────────
const GENERIC_PREFIXES = [
  'Foundation:',
  'Core implementation',
  'Registry/dispatcher wiring',
  'Test suite',
  'Integration +',
  'Polish +',
  'Design schema',
  'Implement core',
  'Define ',
];

function isGeneric(title) {
  return GENERIC_PREFIXES.some(p => title.startsWith(p) || title === p.trim());
}

// Detect which slot type a generic title represents
function slotType(title) {
  if (title.startsWith('Foundation:') || title.startsWith('Design schema') || title.startsWith('Define ')) return 'foundation';
  if (title === 'Core implementation' || title.startsWith('Implement core')) return 'core';
  if (title.startsWith('Registry/dispatcher wiring')) return 'wiring';
  if (title.startsWith('Test suite')) return 'test';
  if (title.startsWith('Integration +')) return 'integration';
  if (title.startsWith('Polish +')) return 'polish';
  return 'foundation';
}

// ─── Parse Engine Digest ───────────────────────────────────────────────────────
function parseEngines(digest) {
  const engines = [];
  const lines = digest.split('\n');
  for (const line of lines) {
    // Lines like: - **SomeEngine**: description
    const m = line.match(/^- \*\*([A-Z][A-Za-z0-9]+)\*\*: (.+)/);
    if (m) {
      engines.push({ name: m[1], desc: m[2].trim() });
    }
  }
  return engines;
}

// ─── Parse Dispatcher Digest ───────────────────────────────────────────────────
function parseDispatchers(digest) {
  const dispatchers = [];
  const lines = digest.split('\n');
  for (const line of lines) {
    // Table rows like: | fooDispatcher | prism_foo | 12 | Description |
    const m = line.match(/^\| ([A-Za-z]+Dispatcher[A-Za-z]*) \| (prism_[a-z_]+) \| (\d+) \| (.+) \|/);
    if (m) {
      dispatchers.push({
        varName: m[1],
        toolName: m[2],
        actions: parseInt(m[3], 10),
        desc: m[4].trim(),
      });
    }
  }
  return dispatchers;
}

// ─── Keyword Extraction ────────────────────────────────────────────────────────
// Split a PascalCase or camelCase name into lowercase tokens
function splitName(name) {
  // Remove trailing "Engine", "Dispatcher", "Pipeline", "Orchestrator" suffixes for matching
  const cleaned = name
    .replace(/Engine$/, '')
    .replace(/Dispatcher$/, '')
    .replace(/Pipeline$/, '')
    .replace(/Orchestrator$/, '');
  // Split on uppercase boundaries
  return cleaned
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/\s+/)
    .filter(t => t.length > 1);
}

// Extract keywords from a free-form text string
function textKeywords(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2);
}

// Score an engine name against a set of keywords (weighted intersection)
// titleTokens are more specific — weight them 2x over track tokens
function score(engineTokens, titleTokens, trackTokens) {
  const titleSet = new Set(titleTokens);
  const trackSet = new Set(trackTokens);
  let s = 0;
  for (const t of engineTokens) {
    if (titleSet.has(t)) s += 2; // title match is worth more
    else if (trackSet.has(t)) s += 1;
  }
  return s;
}

// ─── Stopwords — do not match on these ────────────────────────────────────────
const STOPWORDS = new Set([
  'engine', 'data', 'schema', 'impl', 'base', 'core', 'sensor', 'action',
  'cache', 'adaptive', 'advanced', 'batch', 'auto', 'factory', 'master',
  'unified', 'general', 'generic', 'util', 'utility', 'common', 'main',
  'manager', 'handler', 'service', 'system', 'module', 'layer',
]);

// ─── Track → Domain Keywords ───────────────────────────────────────────────────
const TRACK_KEYWORDS = {
  'LATHE-PRO': ['lathe', 'turning', 'okuma', 'spindle', 'insert', 'live', 'bar', 'chuck'],
  'RES': ['resource', 'harvest', 'index', 'mining', 'ingest', 'extract', 'parse'],
  'PP-REV': ['post', 'process', 'pipeline', 'gcode', 'setup', 'cycle', 'time', 'program'],
  'CK': ['cam', 'kernel', 'toolpath', 'strategy', 'milling', 'fiveaxis', 'multiaxis'],
  'INGEST': ['ingest', 'import', 'parse', 'pipeline', 'folder', 'scan', 'employee', 'vendor', 'print', 'drawing', 'tool', 'holder', 'material', 'stock', 'invoice', 'document'],
  'WEDM': ['wedm', 'wire', 'edm', 'spark', 'wire'],
  'HM-REV': ['hypermill', 'cam', 'strategy', 'cycle', 'automation'],
  'HM-KC': ['hypermill', 'knowledge', 'mining', 'extraction', 'database'],
  'HM-PLUGIN': ['hypermill', 'plugin', 'sdk', 'api', 'integration'],
  'LEARN': ['learning', 'training', 'course', 'content', 'curriculum', 'video'],
  'MXU': ['utilization', 'memory', 'context', 'token', 'session', 'capability'],
  'ACP': ['automation', 'chain', 'pipeline', 'build', 'guard', 'hook'],
  'F360': ['fusion', 'fusion360', 'cps', 'post', 'toolpath'],
  'F360-AP': ['fusion', 'autopilot', 'workflow', 'automation', 'orchestrate'],
  'F360-FULL': ['fusion', 'full', 'integration', 'bridge', 'sync'],
  'ARCH': ['architecture', 'base', 'engine', 'interface', 'contract', 'service'],
  'BOX-AUDIT': ['box', 'file', 'audit', 'census', 'index', 'cloud'],
  'BENCH': ['benchmark', 'synthetic', 'parts', 'report', 'suite'],
  'EIGC': ['eigen', 'stability', 'chatter', 'vibration', 'lobe'],
  'APPW': ['approval', 'workflow', 'review', 'gate'],
  'VID-EXT': ['video', 'learning', 'interactive', 'tutorial'],
  'PDF-EXT': ['pdf', 'extract', 'ocr', 'blueprint', 'drawing'],
  'DB-EXP': ['database', 'export', 'schema', 'migration'],
  'MILL-HARD': ['milling', 'hard', 'hrc', 'carbide', 'strategy'],
  'ELEC-PIPE': ['electrical', 'pipe', 'conduit', 'panel'],
  'LASER-PIPE': ['laser', 'pipeline', 'program', 'power', 'kerf'],
  'WATER-PIPE': ['waterjet', 'pipeline', 'abrasive', 'pressure'],
  'SINKER-FULL': ['sinker', 'edm', 'electrode', 'diesinking'],
  'LATHE': ['lathe', 'turning', 'okuma', 'spindle'],
  'GAP': ['gap', 'orphan', 'formula', 'missing', 'complete'],
  'CPL': ['cpl', 'roadmap', 'index'],
  'V6': ['v6', 'intelligence', 'orchestration'],
  'V6-INTELLIGENCE': ['intelligence', 'ai', 'ml', 'predict', 'recommend'],
  'PRISM-PRODUCT': ['product', 'feature', 'toggle', 'release'],
  'PRISM-MAX': ['max', 'orchestrator', 'enterprise', 'full'],
  'RX': ['rx', 'reactive', 'stream', 'event'],
  'PPG-VAR': ['program', 'variant', 'parametric', 'macro'],
  'PPG-REAL': ['program', 'real', 'production', 'verified'],
  'WEDM-LAUNCH': ['wedm', 'launch', 'production', 'deploy'],
  'CAMX-v17': ['camx', 'cam', 'strategy', 'toolpath'],
  'INFRA': ['infrastructure', 'health', 'monitor', 'config'],
  'F360-REV': ['fusion', 'review', 'revision', 'update'],
  'SCIMATH': ['scientific', 'math', 'kienzle', 'taylor', 'formula'],
  'BIZ': ['business', 'quote', 'cost', 'erp', 'invoice'],
};

// ─── Find Best Matching Engines ────────────────────────────────────────────────
function findBestEngines(milestoneTitle, track, engines, topN = 3) {
  const trackKws = (TRACK_KEYWORDS[track] || textKeywords(track)).filter(t => !STOPWORDS.has(t));
  const titleKws = textKeywords(milestoneTitle).filter(t => !STOPWORDS.has(t));

  const scored = engines.map(e => {
    const tokens = splitName(e.name).filter(t => !STOPWORDS.has(t));
    return {
      engine: e,
      score: score(tokens, titleKws, trackKws),
    };
  });

  // Require minimum score of 2 (at least one title match or two track matches)
  return scored
    .filter(s => s.score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map(s => s.engine);
}

function findBestDispatchers(milestoneTitle, track, dispatchers, topN = 2) {
  const trackKws = (TRACK_KEYWORDS[track] || textKeywords(track)).filter(t => !STOPWORDS.has(t));
  const titleKws = textKeywords(milestoneTitle).filter(t => !STOPWORDS.has(t));

  const scored = dispatchers.map(d => {
    const tokens = splitName(d.varName).filter(t => !STOPWORDS.has(t));
    return {
      disp: d,
      score: score(tokens, titleKws, trackKws),
    };
  });

  return scored
    .filter(s => s.score >= 1)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map(s => s.disp);
}

// ─── Domain Noun Extraction ────────────────────────────────────────────────────
// Extract the most meaningful noun phrase from a milestone title for use in fallback titles
function domainNoun(milestoneTitle) {
  // Strip trailing stats (e.g., "— 15,599 .MIN Cutting Conditions")
  let s = milestoneTitle
    .replace(/\s*[—–]\s*\d[\d,]+.*$/, '')         // "— 15,599 files"
    .replace(/\s*[—–]\s*[\d]+[+]?\s+\w.*$/, '')   // "— 280+ CPS Files"
    .replace(/\s*\(.*\)$/, '')                      // "(Turning+EDM+...)"
    .replace(/\s*\[.*\]$/, '')
    .trim();
  // Truncate at 50 chars
  if (s.length > 50) s = s.slice(0, 50).replace(/\s+\S*$/, '') + '...';
  return s;
}

// ─── Track → Default Dispatcher fallback ──────────────────────────────────────
const TRACK_DEFAULT_DISPATCHER = {
  'LATHE-PRO': 'prism_turning',
  'LATHE': 'prism_turning',
  'RES': 'prism_data',
  'PP-REV': 'prism_cam',
  'CK': 'prism_cam',
  'INGEST': 'prism_data',
  'WEDM': 'prism_edm',
  'HM-REV': 'prism_cam',
  'HM-KC': 'prism_knowledge',
  'HM-PLUGIN': 'prism_cam',
  'LEARN': 'prism_knowledge',
  'MXU': 'prism_dev',
  'ACP': 'prism_dev',
  'F360': 'prism_cam',
  'F360-AP': 'prism_cam',
  'F360-FULL': 'prism_cam',
  'ARCH': 'prism_dev',
  'BOX-AUDIT': 'prism_dev',
  'BENCH': 'prism_calc',
  'EIGC': 'prism_calc',
  'APPW': 'prism_business',
  'MILL-HARD': 'prism_cam',
  'LASER-PIPE': 'prism_edm',
  'WATER-PIPE': 'prism_edm',
  'SINKER-FULL': 'prism_edm',
  'SCIMATH': 'prism_calc',
  'BIZ': 'prism_business',
};

// ─── Title Generation ──────────────────────────────────────────────────────────
function makeTitle(slot, milestoneTitle, track, bestEngines, bestDispatchers) {
  const primary = bestEngines[0];
  const secondary = bestEngines[1];
  // Prefer matched dispatcher; fall back to track default
  const dispName = bestDispatchers[0]
    ? bestDispatchers[0].toolName
    : (TRACK_DEFAULT_DISPATCHER[track] || 'prism_calc');

  const noun = domainNoun(milestoneTitle);

  switch (slot) {
    case 'foundation': {
      if (primary) {
        return `Define schema + interfaces for ${primary.name}`;
      }
      return `Define schema + interfaces for ${noun}`;
    }
    case 'core': {
      if (primary && secondary) {
        return `Implement ${primary.name} + ${secondary.name} core logic`;
      }
      if (primary) {
        return `Implement ${primary.name} core logic`;
      }
      return `Implement ${noun} engine logic`;
    }
    case 'wiring': {
      if (primary) {
        return `Wire ${primary.name} to ${dispName} dispatcher`;
      }
      return `Wire ${noun} engine to ${dispName} dispatcher`;
    }
    case 'test': {
      if (primary && secondary) {
        return `Test ${primary.name} + ${secondary.name} against JM Die production data`;
      }
      if (primary) {
        return `Test ${primary.name} against JM Die production data`;
      }
      return `Test ${noun} against JM Die production data`;
    }
    case 'integration': {
      if (primary && secondary) {
        return `Integrate ${primary.name} with ${secondary.name} pipeline`;
      }
      if (primary) {
        return `Integrate ${primary.name} into ${noun} pipeline`;
      }
      return `Integrate ${noun} pipeline end-to-end`;
    }
    case 'polish': {
      if (primary) {
        return `Polish ${primary.name} docs, error messages, and edge-case handling`;
      }
      return `Polish ${noun} docs, error messages, and edge cases`;
    }
    default:
      return null;
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────────
function main() {
  console.log('=== enrich-units.cjs — Unit Title Enrichment Pass ===\n');

  // Load files
  const roadmap = JSON.parse(fs.readFileSync(ROADMAP_PATH, 'utf8'));
  const engineDigest = fs.readFileSync(ENGINE_DIGEST_PATH, 'utf8');
  const dispatcherDigest = fs.readFileSync(DISPATCHER_DIGEST_PATH, 'utf8');

  // Parse catalogs
  const engines = parseEngines(engineDigest);
  const dispatchers = parseDispatchers(dispatcherDigest);

  console.log(`Loaded ${engines.length} engines, ${dispatchers.length} dispatchers`);
  console.log(`Loaded ${roadmap.milestones.length} milestones\n`);

  // Track stats
  let totalUnits = 0;
  let genericUnits = 0;
  let enrichedUnits = 0;
  let leftGeneric = 0;
  const enrichmentLog = [];

  // Process milestones
  for (const milestone of roadmap.milestones) {
    const bestEngines = findBestEngines(milestone.title, milestone.track, engines, 3);
    const bestDispatchers = findBestDispatchers(milestone.title, milestone.track, dispatchers, 2);

    for (const unit of (Array.isArray(milestone.units) ? milestone.units : [])) {
      totalUnits++;
      if (!isGeneric(unit.title)) continue;

      genericUnits++;

      const slot = slotType(unit.title);
      const newTitle = makeTitle(slot, milestone.title, milestone.track, bestEngines, bestDispatchers);

      if (newTitle && newTitle !== unit.title) {
        enrichmentLog.push({
          milestoneId: milestone.id,
          unitId: unit.id,
          old: unit.title,
          new: newTitle,
          engines: bestEngines.map(e => e.name),
        });
        unit.title = newTitle;
        enrichedUnits++;
      } else {
        leftGeneric++;
      }
    }
  }

  // Update metadata timestamp
  roadmap.updated_at = new Date().toISOString().split('T')[0];

  // Write updated roadmap
  fs.writeFileSync(ROADMAP_PATH, JSON.stringify(roadmap, null, 2), 'utf8');

  // ─── Stats Report ─────────────────────────────────────────────────────────
  console.log('=== Enrichment Results ===');
  console.log(`Total units:     ${totalUnits}`);
  console.log(`Generic (before):${genericUnits}`);
  console.log(`Enriched:        ${enrichedUnits}`);
  console.log(`Left generic:    ${leftGeneric}`);
  console.log(`Success rate:    ${((enrichedUnits / genericUnits) * 100).toFixed(1)}%`);
  console.log(`\nUpdated: ${ROADMAP_PATH}`);

  // Print sample of changes (first 30)
  console.log('\n=== Sample Enrichments (first 30) ===');
  enrichmentLog.slice(0, 30).forEach((e, i) => {
    console.log(`\n[${i + 1}] ${e.milestoneId} / ${e.unitId}`);
    console.log(`  OLD: ${e.old}`);
    console.log(`  NEW: ${e.new}`);
    if (e.engines.length > 0) {
      console.log(`  ENG: ${e.engines.join(', ')}`);
    }
  });

  // Breakdown by track
  const byTrack = {};
  for (const e of enrichmentLog) {
    const track = e.milestoneId.split('-')[0];
    byTrack[track] = (byTrack[track] || 0) + 1;
  }
  console.log('\n=== Enrichments by Track ===');
  Object.entries(byTrack)
    .sort((a, b) => b[1] - a[1])
    .forEach(([t, c]) => console.log(`  ${t.padEnd(20)} ${c}`));

  console.log('\nDone.');
}

main();
