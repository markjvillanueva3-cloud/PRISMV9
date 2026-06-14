#!/usr/bin/env node
// Deterministic hook scope+PSN classifier — replaces the rate-limited parallel-agent dispatch.
// Reads HOOK_REGISTRY.json (already has wired/events/description) and scans each hook file
// for PSN-leg synergy + verdict. One-shot, ~5s for 635 files.
//
// Output: state/shared/audits/HOOK-SCOPE-REPORT.{json,md}
//
// PSN legs (11): Obsidian-brain, PRISM-OS, Wiki, Memories, Tribal, System-Viz, Engines,
//                Algorithms, Formulas, NN-GNN, PRISM-AI

import fs from 'node:fs';
import path from 'node:path';

const REPO = 'H:/prism';
const REG_PATH = path.join(REPO, 'state/shared/HOOK_REGISTRY.json');
const OUT_DIR = path.join(REPO, 'state/shared/audits');
const OUT_JSON = path.join(OUT_DIR, 'HOOK-SCOPE-REPORT.json');
const OUT_MD = path.join(OUT_DIR, 'HOOK-SCOPE-REPORT.md');

const PSN_PATTERNS = {
  'Obsidian-brain': /MEMORY\.md|knowledge\/memories\/|\.obsidian\/|_brain\b/i,
  'PRISM-OS': /prism_operating_system|dispatcher_map|\bdesk_|shell_bootstrap|prism_session/i,
  'Wiki': /knowledge\/wiki\/|\[\[[a-zA-Z0-9_-]+\]\]|WikiIndexMaintainer|\/wiki-query/i,
  'Memories': /knowledge\/memories\/(feedback|reference)|\bfeedback_[a-z_]+\.md|\breference_[a-z_]+\.md/i,
  'Tribal': /knowledge\/tribal\/|tribal-|\bplaybook\b|tribalTipRegistry/i,
  'System-Viz': /state\/shared\/system-viz\/|system-graph\.json|regen-viz|architecture-graph/i,
  'Engines': /src\/engines\/|[A-Z][a-zA-Z]*Engine\.(ts|js)|EngineRegistry|engineRegistry/,
  'Algorithms': /src\/algorithms\/|algorithmRegistry|\balgorithm-/i,
  'Formulas': /src\/formulas\/|formulaRegistry|src\/physics\/constants/i,
  'NN-GNN': /nn-graph|graphsage|\bGNN\b|neural-graph|embeddingSource|AUROC/i,
  'PRISM-AI': /prism_ai\b|ai-system-router|aiSystemRouterEngine|ai-deep-intelligence|prismAIRoutingEngine/i,
};

const DEPRECATED_MARKERS = /\b(DEPRECATED|deprecated|SUPERSEDED|superseded by|REMOVED)\b|\/\.deprecated\//;
const REGISTRY = JSON.parse(fs.readFileSync(REG_PATH, 'utf8'));

const real = REGISTRY.hooks.filter(h => {
  const f = String(h.file || '').replace(/\\/g, '/');
  if (!f.endsWith('.mjs')) return false;
  if (f.includes('.test.')) return false;
  if (f.includes('/.deprecated/')) return false;
  if (f.includes('.bak')) return false;
  if (f.includes('_archive')) return false;
  if (f.includes('/bundles/lib/')) return false;
  return true;
});

const classifyOne = (entry) => {
  const file = String(entry.file || '').replace(/\\/g, '/');
  const abs = path.join(REPO, file);
  const wired = !!entry.wired;
  const events = entry.events || [];
  const tier = entry.tier || 'T?';
  const lines = entry.lines ?? 0;
  const sizeBytes = entry.sizeBytes ?? 0;
  const headerDesc = entry.description || '';

  let body = '';
  let exists = false;
  try {
    if (fs.existsSync(abs)) {
      exists = true;
      const buf = fs.readFileSync(abs, 'utf8');
      body = buf.length > 50000 ? buf.slice(0, 50000) : buf;
    }
  } catch {/* unreadable — count as broken */}

  // PSN leg detection
  const psnLegs = [];
  for (const [leg, pat] of Object.entries(PSN_PATTERNS)) {
    if (pat.test(body) || pat.test(file)) psnLegs.push(leg);
  }
  const psnSynergized = psnLegs.length > 0;

  // Verdict
  let verdict = 'live';
  let notes = '';
  if (!exists) {
    verdict = 'broken';
    notes = 'file missing on disk';
  } else if (DEPRECATED_MARKERS.test(body.slice(0, 500)) || file.includes('/.deprecated/')) {
    verdict = 'deprecated';
    notes = 'header marks deprecated/superseded';
  } else if (lines < 20 || sizeBytes < 500) {
    verdict = 'dead-stub';
    notes = `tiny (${lines} lines, ${sizeBytes}B)`;
  } else if (!wired) {
    verdict = 'orphan';
    notes = 'on disk but not wired in settings.json';
  }

  // 1-sentence purpose: prefer registry description, fall back to first comment line
  let purpose = headerDesc;
  if (!purpose || entry.descriptionInferred === false) {
    const m = body.match(/^[/\s\*]*([^\n*][^\n]{20,160})/m);
    if (m) purpose = m[1].trim().replace(/\s+/g, ' ').slice(0, 180);
  }
  if (!purpose) purpose = '(no description)';

  return {
    id: entry.id,
    file,
    wired,
    events,
    tier,
    purpose: purpose.slice(0, 200),
    psnLegs,
    psnSynergized,
    verdict,
    notes
  };
};

console.log(`Classifying ${real.length} hooks…`);
const t0 = Date.now();
const classifications = real.map(classifyOne);
const elapsed = Date.now() - t0;
console.log(`Done in ${elapsed}ms`);

// Aggregate
const agg = {
  total: classifications.length,
  byVerdict: {},
  byPsnLeg: {},
  psnSynergized: 0,
  wiredCount: 0,
  multiLegHooks: 0,
  ghostsInSettings: classifications.filter(c => c.wired && c.verdict === 'broken').map(c => c.id),
};
for (const c of classifications) {
  agg.byVerdict[c.verdict] = (agg.byVerdict[c.verdict] || 0) + 1;
  if (c.psnSynergized) agg.psnSynergized++;
  if (c.psnLegs.length > 1) agg.multiLegHooks++;
  if (c.wired) agg.wiredCount++;
  for (const leg of c.psnLegs) {
    agg.byPsnLeg[leg] = (agg.byPsnLeg[leg] || 0) + 1;
  }
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_JSON, JSON.stringify({
  schemaVersion: '1.0.0',
  generatedAt: new Date().toISOString(),
  source: 'scripts/_classify-hooks.mjs',
  registrySource: REG_PATH,
  aggregate: agg,
  classifications
}, null, 2));

// Markdown report
const linesOut = [];
linesOut.push('# Hook Scope Report — 11-leg PSN classification');
linesOut.push('');
linesOut.push(`**Generated:** ${new Date().toISOString()}  `);
linesOut.push(`**Source:** ${REG_PATH}  `);
linesOut.push(`**Total hooks scoped:** ${agg.total}`);
linesOut.push('');
linesOut.push('## Aggregate');
linesOut.push('');
linesOut.push('### By verdict');
linesOut.push('| Verdict | Count | % |');
linesOut.push('|---|---|---|');
for (const [v, n] of Object.entries(agg.byVerdict).sort((a,b)=>b[1]-a[1])) {
  linesOut.push(`| ${v} | ${n} | ${(n/agg.total*100).toFixed(1)}% |`);
}
linesOut.push('');
linesOut.push(`**Wired:** ${agg.wiredCount} / ${agg.total} (${(agg.wiredCount/agg.total*100).toFixed(1)}%)`);
linesOut.push(`**PSN-synergized:** ${agg.psnSynergized} / ${agg.total} (${(agg.psnSynergized/agg.total*100).toFixed(1)}%)`);
linesOut.push(`**Multi-leg hooks:** ${agg.multiLegHooks} (touch ≥2 PSN legs)`);
linesOut.push('');
linesOut.push('### By PSN leg');
linesOut.push('| Leg | Hooks touching | % of fleet |');
linesOut.push('|---|---|---|');
const legOrder = ['Obsidian-brain','PRISM-OS','Wiki','Memories','Tribal','System-Viz','Engines','Algorithms','Formulas','NN-GNN','PRISM-AI'];
for (const leg of legOrder) {
  const n = agg.byPsnLeg[leg] || 0;
  linesOut.push(`| ${leg} | ${n} | ${(n/agg.total*100).toFixed(1)}% |`);
}
linesOut.push('');
linesOut.push('### Ghost references (wired but file missing)');
if (agg.ghostsInSettings.length === 0) {
  linesOut.push('_None._');
} else {
  for (const g of agg.ghostsInSettings) linesOut.push(`- ${g}`);
}
linesOut.push('');
linesOut.push('## Top 20 orphans by code-size (candidates for wiring)');
const orphansBySize = classifications
  .filter(c => c.verdict === 'orphan')
  .sort((a,b) => {
    const ae = real.find(r => r.id === a.id); const be = real.find(r => r.id === b.id);
    return (be?.sizeBytes||0) - (ae?.sizeBytes||0);
  })
  .slice(0, 20);
linesOut.push('| Hook | PSN legs | Purpose |');
linesOut.push('|---|---|---|');
for (const o of orphansBySize) {
  linesOut.push(`| \`${o.id}\` | ${o.psnLegs.join(', ')||'-'} | ${o.purpose.slice(0,80)} |`);
}
linesOut.push('');
linesOut.push('## Deprecated still-in-tree');
const deprecated = classifications.filter(c => c.verdict === 'deprecated');
if (deprecated.length === 0) linesOut.push('_None._');
else {
  linesOut.push('| Hook | Notes |');
  linesOut.push('|---|---|');
  for (const d of deprecated.slice(0, 30)) linesOut.push(`| \`${d.id}\` | ${d.notes} |`);
  if (deprecated.length > 30) linesOut.push(`_…and ${deprecated.length-30} more (see JSON)._`);
}
linesOut.push('');
linesOut.push('## Dead stubs (live + <20 lines or <500B)');
const stubs = classifications.filter(c => c.verdict === 'dead-stub');
if (stubs.length === 0) linesOut.push('_None._');
else {
  linesOut.push('| Hook | Notes |');
  linesOut.push('|---|---|');
  for (const s of stubs.slice(0, 30)) linesOut.push(`| \`${s.id}\` | ${s.notes} |`);
  if (stubs.length > 30) linesOut.push(`_…and ${stubs.length-30} more._`);
}
linesOut.push('');
linesOut.push('## Hooks NOT synergized with any PSN leg (potential rewires)');
const nonSyn = classifications.filter(c => !c.psnSynergized && c.verdict === 'live');
linesOut.push(`Total: **${nonSyn.length}** live hooks touch zero PSN legs (per keyword scan).`);
linesOut.push('');
linesOut.push('_Full per-hook classifications in `HOOK-SCOPE-REPORT.json`._');

fs.writeFileSync(OUT_MD, linesOut.join('\n'));
console.log(`\nWrote ${OUT_JSON}`);
console.log(`Wrote ${OUT_MD}`);
console.log(`\nSummary:`);
console.log(JSON.stringify({
  total: agg.total,
  wired: agg.wiredCount,
  byVerdict: agg.byVerdict,
  psnSynergized: agg.psnSynergized,
  ghosts: agg.ghostsInSettings,
}, null, 2));
