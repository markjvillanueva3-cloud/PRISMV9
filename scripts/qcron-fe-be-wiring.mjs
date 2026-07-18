#!/usr/bin/env node
/**
 * qcron-fe-be-wiring.mjs -- quebec FE<->BE wiring continuity pulse (harness, $0, no Claude tokens).
 *
 * Re-runs the 3 deterministic wiring audits and writes one combined status dashboard so the
 * FE->BE wiring loop always has a fresh buildable queue:
 *   1. audit-frontend-backend-contract.mjs  -> route-prefix gaps (LF1)
 *   2. audit-fe-route-action-contract.mjs   -> route->dispatcher action breakage (LF1b)
 *   3. audit-page-wiring.mjs                 -> per-page live-data status (LF2)
 *
 * Cron-friendly: schedule it (Windows Task / `node scripts/qcron-fe-be-wiring.mjs`) to keep
 * state/shared/dashboards/QUEBEC-WIRING-PULSE.md current. Exit code reflects regressions vs the
 * prior pulse (so a watchdog can alarm): 0 = same/better, 2 = a LF regressed.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const NODE = process.execPath;
const AUDIT_TIMEOUT_MS = 180000;
const DASH = join(ROOT, 'state', 'shared', 'dashboards');
const PULSE_MD = join(DASH, 'QUEBEC-WIRING-PULSE.md');
const PULSE_JSON = join(DASH, 'QUEBEC-WIRING-PULSE.json');

function run(script) {
  const r = spawnSync(NODE, [join(ROOT, 'scripts', script)], {
    cwd: ROOT, encoding: 'utf8', windowsHide: true, timeout: AUDIT_TIMEOUT_MS,
  });
  return { code: r.status ?? -1, out: r.stdout || '', err: r.stderr || '' };
}

function readJson(p, fallback) {
  try { return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : fallback; }
  catch { return fallback; }
}

/**
 * Extract the route-prefix gap signal from the contract audit JSON, shape-tolerant.
 * U-CONTRACT-REACHABILITY (2026-06-26) split the flat `gaps[]` into `liveGaps`/`orphanGaps`
 * (a LIVE gap = routed-reachable SPA code 404s = frontend-blocking; orphan = dead code). This
 * consumer must read the new shape (or it silently loses LF1), AND it must gate regression on
 * LIVE gaps only -- an orphan-count change is dead code, not a frontend regression.
 * Returns { live, orphan, total } with nulls when a field is absent.
 */
export function extractContractGaps(contract) {
  const s = contract && typeof contract === 'object' ? contract.stats : null;
  if (s && (typeof s.liveGaps === 'number' || typeof s.orphanGaps === 'number')) {
    return {
      live: typeof s.liveGaps === 'number' ? s.liveGaps : null,
      orphan: typeof s.orphanGaps === 'number' ? s.orphanGaps : null,
      total: typeof s.gaps === 'number' ? s.gaps : null,
    };
  }
  if (Array.isArray(contract?.liveGaps) || Array.isArray(contract?.orphanGaps)) {
    const live = Array.isArray(contract.liveGaps) ? contract.liveGaps.length : 0;
    const orphan = Array.isArray(contract.orphanGaps) ? contract.orphanGaps.length : 0;
    return { live, orphan, total: live + orphan };
  }
  // Legacy pre-reachability shape: a flat gaps[]/uncovered[]/gapCount with no live/orphan split.
  // Treat the whole count as "live" (conservative -- the old auditor could not distinguish).
  const total = Array.isArray(contract?.gaps) ? contract.gaps.length
    : Array.isArray(contract?.uncovered) ? contract.uncovered.length
    : (typeof contract?.gapCount === 'number' ? contract.gapCount : null);
  return { live: total, orphan: null, total };
}

function main() {
  // Regenerate all three audit JSONs.
  run('audit-frontend-backend-contract.mjs');
  run('audit-fe-route-action-contract.mjs');
  run('audit-page-wiring.mjs');

  const contract = readJson(join(ROOT, 'state', 'shared', 'FRONTEND-BACKEND-CONTRACT-AUDIT.json'), {});
  const pageWiring = readJson(join(DASH, 'PAGE-WIRING-AUDIT.json'), {});

  // LF1: route-prefix gaps, split LIVE (frontend-blocking) vs orphan (dead code) -- shape-tolerant.
  const cg = extractContractGaps(contract);

  const pw = pageWiring.byStatus || {};
  const queue = Array.isArray(pageWiring.queue) ? pageWiring.queue.length : null;

  const pulse = {
    schemaVersion: '1.1.0',
    generatedAt: new Date().toISOString(),
    lf1_route_prefix_gaps: cg.total,   // total (live+orphan) -- field name kept for prev-pulse continuity
    lf1_live_gaps: cg.live,            // the URGENT signal: routed-reachable SPA code that 404s
    lf1_orphan_gaps: cg.orphan,        // informational: dead-code refs (not frontend-blocking)
    lf2_pages: { total: pageWiring.totalPages ?? null, ...pw, queue },
  };

  const prev = readJson(PULSE_JSON, null);
  // Regress on a NEW live broken wire (cg.live up) or a growing page queue -- NOT on orphan growth.
  const prevLive = typeof prev?.lf1_live_gaps === 'number' ? prev.lf1_live_gaps
    : (typeof prev?.lf1_route_prefix_gaps === 'number' ? prev.lf1_route_prefix_gaps : null); // back-compat w/ old pulse
  let regressed = false;
  if (prev) {
    if (typeof cg.live === 'number' && typeof prevLive === 'number' && cg.live > prevLive) regressed = true;
    if (typeof queue === 'number' && typeof prev.lf2_pages?.queue === 'number' && queue > prev.lf2_pages.queue) regressed = true;
  }

  writeFileSync(PULSE_JSON, JSON.stringify(pulse, null, 2));
  writeFileSync(PULSE_MD, renderMd(pulse, prev, regressed));
  console.log(`qcron-fe-be-wiring: LF1 live=${cg.live} orphan=${cg.orphan} (total ${cg.total}) | pages wired=${pw.wired} dead=${pw.dead} partial=${pw.partial} queue=${queue}${regressed ? ' | REGRESSED' : ''}`);
  return regressed ? 2 : 0;
}

function renderMd(p, prev, regressed) {
  const d = (cur, was) => (typeof cur === 'number' && typeof was === 'number' && cur !== was ? ` (was ${was})` : '');
  const L = [];
  L.push('# QUEBEC-WIRING-PULSE');
  L.push('');
  L.push(`> FE<->BE wiring continuity pulse (\`scripts/qcron-fe-be-wiring.mjs\`). Generated: ${p.generatedAt}`);
  L.push(`> Status: ${regressed ? 'REGRESSED -- a loss function got worse' : 'OK'}`);
  L.push('');
  L.push(`- **LF1 route-prefix gaps:** ${p.lf1_route_prefix_gaps}${d(p.lf1_route_prefix_gaps, prev?.lf1_route_prefix_gaps)} -- LIVE (frontend-blocking) **${p.lf1_live_gaps}**${d(p.lf1_live_gaps, prev?.lf1_live_gaps)} / orphan ${p.lf1_orphan_gaps}`);
  L.push(`- **LF2 pages:** total ${p.lf2_pages.total} -- wired ${p.lf2_pages.wired}${d(p.lf2_pages.wired, prev?.lf2_pages?.wired)} / partial ${p.lf2_pages.partial} / dead ${p.lf2_pages.dead}${d(p.lf2_pages.dead, prev?.lf2_pages?.dead)} / static-ok ${p.lf2_pages['static-ok']}`);
  L.push(`- **buildable queue (dead+partial):** ${p.lf2_pages.queue}`);
  L.push('');
  L.push('See `PAGE-WIRING-AUDIT.md` for the per-page queue and `QUEBEC-FE-BE-WIRING-MAP-2026-06-25.md` for dispositions + owners.');
  L.push('');
  return L.join('\n');
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) process.exit(main());

export { main };
