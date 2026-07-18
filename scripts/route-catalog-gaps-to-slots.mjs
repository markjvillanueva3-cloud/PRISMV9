#!/usr/bin/env node
// route-catalog-gaps-to-slots.mjs
// Reads cam-toolpath-catalog.json + scans per-toolpath MD files for
// `coverageStatus: catalog-only-no-tips-yet`, then routes those gaps to the
// corresponding chat slot per CLAUDE.md §JULIETT-12CHAT-ALLOCATION-MS0.
//
// Per kilo soul: kilo orchestrates, does not implement at each stage. This
// script is the orchestration handoff — gap-by-domain → slot owner.

import fs from 'node:fs';
import path from 'node:path';

const CATALOG = 'H:/prism-slot-kilo/mcp-server/data/state/cam-toolpath-catalog.json';
const PER_TOOLPATH_DIR = 'H:/prism-slot-kilo/knowledge/wiki/architecture/tribal/per-toolpath';
const OUT_ROUTING = 'H:/prism-slot-kilo/state/shared/cam-toolpath-gap-routing.json';
const OUT_AGENT_CHAT = 'H:/prism/state/shared/AGENT_CHAT.jsonl';

// Domain → slot owner per CLAUDE.md §JULIETT-12CHAT-ALLOCATION-MS0.
// Categories from the catalog → owning slot.
const CATEGORY_TO_SLOT = {
  '2.5-axis-mill': 'alpha',
  '2d-mill': 'alpha',
  '3d-rough': 'alpha',
  '3d-finish': 'alpha',
  'drilling': 'alpha',
  'multi-axis': 'echo',
  '5-axis': 'echo',
  'multitasking': 'echo',
  'imachining': 'echo',
  'maxx-machining': 'echo',
  'milling-hsm': 'echo',
  'multiblade': 'echo',
  'lathe': 'india',
  'turning': 'india',
  'turning-hsm': 'india',
  'mill-turn': 'india',
  'wire-edm': 'charlie',
  'feature-recognition': 'delta',
  'sync': 'echo',
  'system': 'kilo',
  'config': 'kilo',
  'controller': 'india',
  'automation': 'echo',
  'specialty': 'echo',
  'ui': 'kilo',
  'diagnostic': 'kilo',
  'milling': 'alpha',
};

function readCatalogOnly() {
  if (!fs.existsSync(PER_TOOLPATH_DIR)) return [];
  const out = [];
  for (const f of fs.readdirSync(PER_TOOLPATH_DIR)) {
    if (!f.endsWith('.md')) continue;
    const md = fs.readFileSync(path.join(PER_TOOLPATH_DIR, f), 'utf8');
    const fmMatch = md.match(/^---\n([\s\S]*?)\n---\n/);
    if (!fmMatch) continue;
    const fm = {};
    for (const line of fmMatch[1].split('\n')) {
      const kv = line.match(/^(\w+):\s*(.+)$/);
      if (kv) fm[kv[1]] = kv[2].trim().replace(/^"|"$/g, '');
    }
    if (fm.coverageStatus === 'catalog-only-no-tips-yet') {
      out.push({ software: fm.software, toolpath: fm.toolpath, category: fm.category, file: f });
    }
  }
  return out;
}

function routeToSlot(gap) {
  const slot = CATEGORY_TO_SLOT[gap.category] || 'echo';
  return { ...gap, owningSlot: slot };
}

function buildRouting(gaps) {
  const routed = gaps.map(routeToSlot);
  const bySlot = {};
  for (const r of routed) {
    if (!bySlot[r.owningSlot]) bySlot[r.owningSlot] = [];
    bySlot[r.owningSlot].push(r);
  }
  return {
    schemaVersion: '1.0.0',
    generatedAt: new Date().toISOString(),
    totalGaps: routed.length,
    bySlot: Object.fromEntries(
      Object.entries(bySlot).map(([slot, items]) => [slot, { count: items.length, items }])
    ),
  };
}

function postToAgentChat(routing) {
  if (!fs.existsSync(path.dirname(OUT_AGENT_CHAT))) return;
  for (const [slot, payload] of Object.entries(routing.bySlot)) {
    const msg = {
      timestamp: new Date().toISOString(),
      from: 'kilo',
      to: slot,
      kind: 'catalog-gap-handoff',
      summary: `${payload.count} CAM toolpath gaps routed to slot:${slot} — needs training-corpus depth (YouTube + PDF + vendor docs)`,
      gaps: payload.items.slice(0, 50).map((g) => `${g.software}/${g.toolpath} (${g.category})`),
    };
    try {
      fs.appendFileSync(OUT_AGENT_CHAT, JSON.stringify(msg) + '\n');
    } catch {
      // chat bus offline — routing JSON still persisted for next pickup
    }
  }
}

function main() {
  const gaps = readCatalogOnly();
  if (gaps.length === 0) {
    process.stdout.write(JSON.stringify({ ok: true, reason: 'no-gaps' }) + '\n');
    return;
  }
  const routing = buildRouting(gaps);
  fs.mkdirSync(path.dirname(OUT_ROUTING), { recursive: true });
  fs.writeFileSync(OUT_ROUTING, JSON.stringify(routing, null, 2));
  postToAgentChat(routing);
  const summary = {
    ok: true,
    totalGaps: routing.totalGaps,
    bySlotCount: Object.fromEntries(
      Object.entries(routing.bySlot).map(([slot, p]) => [slot, p.count])
    ),
    routingPath: OUT_ROUTING,
  };
  process.stdout.write(JSON.stringify(summary) + '\n');
}

main();
