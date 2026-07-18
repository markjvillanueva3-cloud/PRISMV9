#!/usr/bin/env node
// V3.1 mechanical patches for comprehensive-roadmap-2026-05-04-v2.json
// 1. Split MS22 -> MS22a (pre-ship) + MS22b (post-pilot)
// 2. MS24 lite-CLI (10d -> 3d)
// 3. MS29 softened to synthetic-tenant gate
// 4. Symmetry sweep (reciprocate every blocks/blocked_by edge)
// 5. Recompute totalEffortDays + criticalPathDays
import fs from 'node:fs';

const PATH = 'H:/prism/mcp-server/data/milestones/comprehensive-roadmap-2026-05-04-v2.json';
const data = JSON.parse(fs.readFileSync(PATH, 'utf8'));

// ── 1. Split MS22 ────────────────────────────────────────────
const ms22idx = data.milestones.findIndex(m => m.id === 'RT-ADAPTIVE-MS22');
if (ms22idx >= 0) {
  const ms22a = {
    id: 'RT-ADAPTIVE-MS22a',
    title: 'Passive MTConnect/OPC-UA telemetry capture (PRE-SHIP — MS9 training data)',
    layer: 3,
    scope_units: 2,
    effort_days: 4,
    risk: 'low',
    value: 'high',
    critical_path: false,
    phase: 'pre-ship',
    blocks: ['SAFETY-OMEGA-GATE-MS9'],
    blocked_by: ['MILL-P2P-CONSENSUS-MS3'],
    acceptance: 'read-only MTConnect/OPC-UA streams from 3 machines (1 mill+1 lathe+1 WEDM) logged with job correlation; 100 staged events round-trip with correct labels; ledger feeds MS9 calibration AND MS18 LoRA training; no write-back path exposed (verified via packet capture).'
  };
  const ms22b = {
    id: 'RT-ADAPTIVE-MS22b',
    title: 'Active in-cycle adaptive feedback (POST-PILOT — feed/spindle/thermal closed loop)',
    layer: 3,
    scope_units: 3,
    effort_days: 8,
    risk: 'high',
    value: 'med',
    critical_path: false,
    phase: 'post-pilot',
    blocks: [],
    blocked_by: ['SHIP-RELEASE-MS19', 'OT-IT-SECURITY-MS20', 'RT-ADAPTIVE-MS22a'],
    acceptance: 'in-cycle MTConnect feed-rate override on 1 mill+1 lathe+1 WEDM; chatter onset triggers spindle shift <200ms; thermal-comp engages at dT>15C; actuation gated on MS9 Omega=1.0 + operator opt-in.'
  };
  data.milestones.splice(ms22idx, 1, ms22a, ms22b);
}

// ── 2. Update MS19 + MS20 references MS22 -> MS22b ──────────
for (const id of ['SHIP-RELEASE-MS19', 'OT-IT-SECURITY-MS20']) {
  const m = data.milestones.find(x => x.id === id);
  if (!m) continue;
  m.blocks = (m.blocks || []).map(b => b === 'RT-ADAPTIVE-MS22' ? 'RT-ADAPTIVE-MS22b' : b);
  m.blocked_by = (m.blocked_by || []).map(b => b === 'RT-ADAPTIVE-MS22' ? 'RT-ADAPTIVE-MS22b' : b);
}

// ── 3. MS24 lite-CLI (10 → 3) ───────────────────────────────
const ms24 = data.milestones.find(m => m.id === 'HITL-OPERATOR-UI-MS24');
if (ms24) {
  ms24.title = 'Operator review/override CLI prompt path (LITE — full UI deferred post-pilot)';
  ms24.effort_days = 3;
  ms24.scope_units = 1;
  ms24.acceptance = 'CLI prompt path (no UI build) — operator sees consensus output (machine/strategy/feed picks) with provenance; accept/reject/override emits OperatorDecisionEvent to outcome ledger labeled NEGATIVE on rejection; CLAUDE.md operator-in-the-loop mandate satisfied via terminal not GUI; MS18 LoRA training pipeline picks up labeled negatives; full UI build deferred to post-pilot tranche.';
}

// ── 4. MS29 soft-gate ───────────────────────────────────────
const ms29 = data.milestones.find(m => m.id === 'TENANT-ONBOARD-MS29');
if (ms29) {
  ms29.title = 'Second-customer tenant template (SOFT GATE — synthetic tenant E2E)';
  ms29.acceptance = 'second-customer LOI signed (verbal/email acceptable as soft gate) AND tenant template runs end-to-end on SYNTHETIC tenant data (no real second customer required for ship); first quote-to-ship cycle on real second customer ALLOWED post-MS19; soft gate prevents single-customer-veto on ship date; auto-downgrade to soft after 60-day timer if hard LOI not signed (logged as risk acceptance).';
}

// ── 5. Symmetry sweep ───────────────────────────────────────
const byId = Object.fromEntries(data.milestones.map(m => [m.id, m]));
let added = 0;
const orphans = [];
for (const m of data.milestones) {
  for (const t of (m.blocks || [])) {
    const target = byId[t];
    if (!target) { orphans.push(`${m.id}.blocks->${t}`); continue; }
    target.blocked_by = target.blocked_by || [];
    if (!target.blocked_by.includes(m.id)) { target.blocked_by.push(m.id); added++; }
  }
  for (const b of (m.blocked_by || [])) {
    const blocker = byId[b];
    if (!blocker) { orphans.push(`${m.id}.blocked_by<-${b}`); continue; }
    blocker.blocks = blocker.blocks || [];
    if (!blocker.blocks.includes(m.id)) { blocker.blocks.push(m.id); added++; }
  }
}

// ── 6. Recompute totals ─────────────────────────────────────
data.totalEffortDays = data.milestones.reduce((s, m) => s + (m.effort_days || 0), 0);
const cp = ['INFRA-CONSENSUS-WIRE-MS0','INFRA-NEURAL-LEDGER-MS1','INFRA-AGI-ROUTER-MS2','MILL-P2P-CONSENSUS-MS3','TWIN-SIM-GATE-MS23','SAFETY-OMEGA-GATE-MS9','L6-BACKPROP-REGISTRY-MS25','LEARN-XPROC-TRANSFER-MS18','SHIP-RELEASE-MS19'];
data.criticalPathDaysCorrected = cp.reduce((s, id) => s + (byId[id]?.effort_days || 0), 0);

// ── 7. Mark V3.1 ────────────────────────────────────────────
data.v3_1_applied = new Date().toISOString();
data.v3_1_changes = [
  'MS22 split into MS22a (pre-ship telemetry, 4d) + MS22b (post-pilot active feedback, 8d)',
  'MS24 lite-CLI replaces full UI (10d -> 3d, saves 7d on critical path)',
  'MS29 softened to synthetic-tenant gate (no single-customer-veto)',
  `${added} reciprocal blocks/blocked_by edges added (symmetry sweep)`,
  `totalEffortDays recomputed: ${data.totalEffortDays}`,
  `criticalPathDays recomputed: ${data.criticalPathDaysCorrected}`,
  `orphans: ${orphans.length}`
];

fs.writeFileSync(PATH, JSON.stringify(data, null, 2));
console.log(JSON.stringify({
  ok: true,
  milestoneCount: data.milestones.length,
  reciprocalEdgesAdded: added,
  orphans,
  totalEffortDays: data.totalEffortDays,
  criticalPathDays: data.criticalPathDaysCorrected
}, null, 2));
