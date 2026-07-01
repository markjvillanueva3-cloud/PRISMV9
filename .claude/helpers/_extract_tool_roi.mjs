#!/usr/bin/env node
// Stream-extract tool-surface CANDIDATE nodes from system-graph.json + rank by inferred ROI.
// Pure extraction; no child_process; no commit. Cap output at top-500.

import fs from 'node:fs';

const GRAPH = 'H:/prism/state/shared/system-viz/system-graph.json';
const OUT = 'H:/prism/state/shared/dashboards/token-savings-top-roi-candidates.json';

const KEEP_RE = /^(hook|action|dispatcher|cmd|skill|slash|tool|rtk|route|passthrough|priority|bridge|substrate)\./;
const DROP_RE = /^(fs|wiki|ghost|formula|test|course|tribal|algorithm|engine|module|monolith|mem|vault|eng|reg|alg|fmla|fe|disp)\./;
const VERB_KEYWORDS = ['log','diff','show','blame','build','install','test'];

function categorize(id) {
  if (id.startsWith('hook.')) return { cat: 'hook', pw: 10 };
  if (id.startsWith('action.') || id.startsWith('dispatcher.')) return { cat: 'action', pw: 8 };
  if (id.startsWith('skill.')) return { cat: 'skill', pw: 8 };
  if (id.startsWith('cmd.') || id.startsWith('slash.') || id.startsWith('tool.') || id.startsWith('rtk.') || id.startsWith('route.') || id.startsWith('passthrough.')) return { cat: 'command', pw: 6 };
  if (id.startsWith('priority.') || id.startsWith('bridge.') || id.startsWith('substrate.')) return { cat: 'roost', pw: 4 };
  return null;
}

function verbosityKeyword(text) {
  const lower = (text || '').toLowerCase();
  for (const kw of VERB_KEYWORDS) {
    if (lower.includes(kw)) return kw;
  }
  return null;
}

const NODE_RE = /"id"\s*:\s*"([^"]+)"\s*,\s*"label"\s*:\s*"([^"]*)"/g;
const NODE_RE_REV = /"label"\s*:\s*"([^"]*)"\s*,\s*"id"\s*:\s*"([^"]+)"/g;

const seen = new Map();
let totalNodes = 0;
let kept = 0;
let dropped = 0;

function processChunk(text) {
  let m;
  NODE_RE.lastIndex = 0;
  while ((m = NODE_RE.exec(text)) !== null) {
    totalNodes++;
    const id = m[1], label = m[2];
    if (DROP_RE.test(id)) { dropped++; continue; }
    if (!KEEP_RE.test(id)) { continue; }
    if (!seen.has(id)) { seen.set(id, { id, label }); kept++; }
  }
  NODE_RE_REV.lastIndex = 0;
  while ((m = NODE_RE_REV.exec(text)) !== null) {
    totalNodes++;
    const id = m[2], label = m[1];
    if (DROP_RE.test(id)) { dropped++; continue; }
    if (!KEEP_RE.test(id)) { continue; }
    if (!seen.has(id)) { seen.set(id, { id, label }); kept++; }
  }
}

const stream = fs.createReadStream(GRAPH, { encoding: 'utf8', highWaterMark: 16 * 1024 * 1024 });
let buf = '';

stream.on('data', (chunk) => {
  buf += chunk;
  const lastIdx = Math.max(0, buf.length - 1024);
  const head = buf.slice(0, lastIdx);
  buf = buf.slice(lastIdx);
  processChunk(head);
});

stream.on('end', () => {
  processChunk(buf);

  const ranked = [];
  for (const { id, label } of seen.values()) {
    const cat = categorize(id);
    if (!cat) continue;
    const haystack = `${id} ${label || ''}`;
    const vkw = verbosityKeyword(haystack);
    const vw = vkw ? 5 : 1;
    const score = cat.pw + vw;
    ranked.push({ id, label: label || null, category: cat.cat, score, verbosity_keyword: vkw });
  }
  ranked.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));

  const capped = ranked.slice(0, 500).map((r, i) => ({
    rank: i + 1,
    id: r.id,
    score: r.score,
    category: r.category,
    label: r.label,
    verbosity_keyword: r.verbosity_keyword,
  }));

  const out = {
    ts: new Date().toISOString(),
    sourceGraph: GRAPH,
    totalNodesScanned: totalNodes,
    keptAfterPrefixFilter: kept,
    droppedByPrefix: dropped,
    totalCandidates: ranked.length,
    filtered: capped.length,
    ranked: capped,
  };

  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(JSON.stringify({
    totalNodesScanned: totalNodes,
    keptAfterPrefixFilter: kept,
    droppedByPrefix: dropped,
    totalCandidates: ranked.length,
    filtered: capped.length,
    top5: capped.slice(0, 5),
    outPath: OUT,
  }, null, 2));
});

stream.on('error', (e) => { console.error('stream error', e); process.exit(1); });
