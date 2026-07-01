#!/usr/bin/env node
// Sample node-id prefixes from system-graph.json. Pure read-only, no child_process.
import fs from 'node:fs';
const GRAPH = 'H:/prism/state/shared/system-viz/system-graph.json';
const stream = fs.createReadStream(GRAPH, { encoding: 'utf8', highWaterMark: 4 * 1024 * 1024 });
const NODE_RE = /"id"\s*:\s*"([^"]+)"/g;
const prefixes = new Map();
const samples = new Map();
let buf = '';
let total = 0;
let stopped = false;

stream.on('data', (chunk) => {
  if (stopped) return;
  buf += chunk;
  const lastIdx = Math.max(0, buf.length - 1024);
  const head = buf.slice(0, lastIdx);
  buf = buf.slice(lastIdx);
  let m;
  NODE_RE.lastIndex = 0;
  while ((m = NODE_RE.exec(head)) !== null) {
    total++;
    const id = m[1];
    const prefix = id.split('.')[0] || id.slice(0, 16);
    prefixes.set(prefix, (prefixes.get(prefix) || 0) + 1);
    if (!samples.has(prefix)) samples.set(prefix, []);
    const arr = samples.get(prefix);
    if (arr.length < 3) arr.push(id);
  }
  if (total > 250000) { stopped = true; stream.destroy(); }
});

stream.on('close', () => {
  const sorted = [...prefixes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 80);
  console.log(JSON.stringify({
    totalIdsScanned: total,
    topPrefixes: sorted.map(([p, c]) => ({ prefix: p, count: c, samples: samples.get(p) })),
  }, null, 2));
});

stream.on('error', (e) => { console.error('err', e); process.exit(1); });
