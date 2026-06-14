#!/usr/bin/env node
// iter7: smoke-validate the detail augmentation against the splice contract.
// Catches schema drift between generate-extracted-modules-detail-features.mjs
// and the merge-augmentations splice block (line ~1608).
//
// Asserts:
//  - file parseable as JSON
//  - newNodes is an array of valid node objects (id+label+layer+kind+parent required)
//  - newEdges is an array of {from, to, type} or {source, target, type}
//  - stats schema matches what the splice writes to G.meta.extractedModulesDetail
//  - no duplicate node ids within newNodes
//  - all bridge_to_existing edges have non-null `to`
//
// Exit 0 OK, exit 1 schema violation (R12 fail-loud).

import fs from 'node:fs';
const P = 'H:/PRISM/state/shared/system-viz/extracted-modules-detail-augmentation.json';
let bad = 0;
function fail(m) { console.error(`FAIL: ${m}`); bad++; }

if (!fs.existsSync(P)) { console.warn(`SKIP: ${P} not present`); process.exit(0); }
let a;
try { a = JSON.parse(fs.readFileSync(P, 'utf8')); }
catch (e) { fail(`unparseable: ${e.message}`); process.exit(1); }

if (a.schemaVersion !== '1.0.0') fail(`schemaVersion is ${a.schemaVersion} not 1.0.0`);
if (!Array.isArray(a.newNodes)) fail('newNodes missing or not array');
if (!Array.isArray(a.newEdges)) fail('newEdges missing or not array');
if (!a.stats) fail('stats missing');

const ids = new Set();
for (const n of a.newNodes || []) {
  if (!n.id || !n.label || !n.layer || !n.kind || !n.parent) fail(`node ${n.id || '(no id)'} missing required field`);
  if (ids.has(n.id)) fail(`duplicate node id: ${n.id}`);
  ids.add(n.id);
}

let dupBridges = 0;
for (const e of a.newEdges || []) {
  const from = e.from || e.source;
  const to = e.to || e.target;
  if (!from || !to) fail(`edge missing from/to: ${JSON.stringify(e)}`);
  if (e.type === 'bridge_to_existing') {
    dupBridges++;
    if (!to) fail(`bridge_to_existing edge has no target`);
  }
}

if (a.stats.total_new_nodes !== a.newNodes.length) fail(`stats.total_new_nodes ${a.stats.total_new_nodes} != newNodes.length ${a.newNodes.length}`);
if (a.stats.total_new_edges !== a.newEdges.length) fail(`stats.total_new_edges ${a.stats.total_new_edges} != newEdges.length ${a.newEdges.length}`);

if (bad === 0) {
  console.log(JSON.stringify({
    ok: true,
    schema: a.schemaVersion,
    nodes: a.newNodes.length,
    edges: a.newEdges.length,
    bridge_to_existing: dupBridges,
    wire_target: (a.newEdges || []).filter(e => e.type === 'wire_target').length,
    unique_node_ids: ids.size,
    selected: a.stats,
  }, null, 2));
  process.exit(0);
}
console.error(`FAIL: ${bad} schema violations`);
process.exit(1);
