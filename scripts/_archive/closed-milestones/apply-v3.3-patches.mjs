#!/usr/bin/env node
// V3.3 patches incorporating pass-5 findings (5 Claude + 5 Codex)
// 1. Move MS34 OFF critical path (parallel swimlane gating only ship event)
// 2. Add outcome_correlation to MS35 acceptance (gameability fix)
// 3. Update MS24 with motion-aware timer + phone-tap dual-auth + customer-history Omega override
// 4. Update MS0/MS1 acceptance to reflect engines now copied to primary worktree
// 5. Update MS6 acceptance: orchestrator EXISTS, only consensus gating missing
// 6. Update MS9 acceptance: enforce constants-imported (currently inlined per Codex P3)
// 7. Add MS36 PRICING-PACKAGING (5d) — Codex WSJF #7
// 8. Add MS37 INCIDENT-RESPONSE (3d) — Codex WSJF #3
// 9. Split MS19 → MS19a (pilot/JM Die ship) + MS19b (platform/multi-tenant)
// 10. Recompute CP via topological longest-path

import fs from 'node:fs';
const PATH = 'H:/prism/mcp-server/data/milestones/comprehensive-roadmap-2026-05-04-v2.json';
const data = JSON.parse(fs.readFileSync(PATH, 'utf8'));
const idx = () => Object.fromEntries(data.milestones.map(m => [m.id, m]));

// --- 1. MS34 off CP: it should gate only MS19, not be on the longest chain ---
// Strategy: keep its blocks=[MS19] but reduce effort_days reflected on CP by allowing parallelism marker.
// True fix: MS34 is parallel to MS9-MS17 chain; it should not chain through MS17.
const ms34 = idx()['REG-HARDENING-MS34'];
if (ms34) {
  ms34.blocked_by = ms34.blocked_by.filter(b => b !== 'COMPLIANCE-AUDIT-MS17');
  ms34.parallel_swimlane = true;
  ms34.title = ms34.title + ' (PARALLEL SWIMLANE per V3.3 — gates only MS19 not chained through MS17)';
}
const ms17 = idx()['COMPLIANCE-AUDIT-MS17'];
if (ms17) ms17.blocks = (ms17.blocks || []).filter(b => b !== 'REG-HARDENING-MS34');

// --- 2. MS35 outcome_correlation ---
const ms35 = idx()['ADOPTION-GATE-MS35'];
if (ms35) {
  ms35.acceptance = 'consensus_execution_rate >= 0.50 over 20-job baseline AND outcome_correlation: parts-in-spec rate must NOT differ between accept and reject buckets by >5% (catches operator rubber-stamping); reject-with-reason histogram tracked, "other" category capped at 20% (catches hidden-distrust); opt-in rate >= 60% across 3 machines.';
  ms35.v3_3_note = 'gameability fix per operator-empathy + Codex P5: rubber-stamp detection via outcome correlation';
}

// --- 3. MS24 motion-aware + phone-tap + customer-history override ---
const ms24 = idx()['HITL-OPERATOR-UI-MS24'];
if (ms24) {
  ms24.acceptance = 'physical button on machine pendant (NOT CLI, NOT screen); 1-button accept (default after 30s timeout WHEN door_closed AND spindle_running AND no_motion_at_pendant_for_15s — pause timer if operator walks away); 2-button reject with pre-canned reason dropdown (chatter/wrong-tool/bad-finish/material/fixture/other); foreman dual-auth via phone-tap approval <10s (NOT walk-across-shop); customer-history Omega override: parts with >=50 prior accepted runs at given Cpk auto-downgrade Omega block to YELLOW advisory (no override paperwork); thermal-comp defaults ON (low-risk auto-help); chatter/feed-override stays opt-in.';
  ms24.v3_3_note = 'motion-aware timer + phone-tap dual-auth + customer-history Omega override per operator-empathy follow-up';
}

// --- 4. MS0/MS1 acceptance updates: engines now in canonical worktree ---
const ms0 = idx()['INFRA-CONSENSUS-WIRE-MS0'];
if (ms0) {
  ms0.acceptance = 'prism_ai:consensus_decide returns 3-of-4 vote with provenance; AND >=1 production dispatcher path calls consensus_decide per high-stakes pick (machine, strategy, post); engines confirmed at H:/prism/mcp-server/src/engines/{MultiModelConsensusEngine,ConsensusCoordinatorEngine,CodexClientEngine,GeminiClientEngine,GrokClientEngine,OllamaClientEngine}.ts (copied from prism-iooms0 in V3.3); smoke test passes across Claude+Codex+Gemini+Ollama; >=3 negative cases (deliberate disagreement) trigger correct fallback.';
  ms0.v3_3_note = 'engines copied from prism-iooms0 worktree to canonical primary in V3.3 (closes Codex P3 grounding gap)';
}
const ms1 = idx()['INFRA-NEURAL-LEDGER-MS1'];
if (ms1) {
  ms1.acceptance = 'CrossProcessOutcomeStore engine BUILT in H:/prism/mcp-server/src/engines/ (does not yet exist; this MS builds it — Codex P3 confirmed not in prism-iooms0/xproc-neural either); every print-to-program run writes structured outcome event with schemaVersion; replay reproduces last 100 jobs byte-identical; ledger is append-only and audit-checked.';
  ms1.v3_3_note = 'CrossProcessOutcomeStore not present in any worktree — this MS owns the build (Codex P3 finding)';
}

// --- 5. MS6 acceptance: orchestrator EXISTS ---
const ms6 = idx()['SINKER-P2P-MS6'];
if (ms6) {
  ms6.title = 'Sinker EDM consensus gating + AGI master (orchestrator already exists, V3.3 corrected scope)';
  ms6.acceptance = 'SinkerEDMPrintToProgramEngine.ts already exists per Codex P3 — V3.3 corrected scope: this MS adds (a) consensus gating around the existing orchestrator (b) SinkerAGIMasterEngine for parity with Mill/Lathe/WEDM AGIs (c) wire to MS9 Omega gate for VDI scale + electrode wear consensus picks; >=5 sinker jobs route through with consensus on VDI scale and wear comp.';
  ms6.effort_days = 5;
  ms6.v3_3_note = 'effort reduced 8d->5d: orchestrator already built (per Codex P3 ground-truth)';
}

// --- 6. MS9 acceptance: enforce constants-imported ---
const ms9 = idx()['SAFETY-OMEGA-GATE-MS9'];
if (ms9) {
  ms9.acceptance = 'every released program has Omega=1.0 AND min(per-dimension)>=0.50 AND S(x)>=0.70; 7 new gates wired (G_cumulative_tol, G_kinematic, G_min_dim, G_constant_provenance, G_domain, G_post_validation, G_thermal_cycle); per-domain addenda (wire-break, back-refl, garnet-flow); INLINED CONSTANTS MIGRATION: PipelineSafetyOrchestratorEngine.ts lines 219-262 currently inline POWER_DERATING/CHATTER_THRESHOLD/etc — V3.3 acceptance ADDS hard requirement: CI gate (grep) blocks merge if any of these constants are inlined in safety-orchestrator (must be imported from src/physics/constants.ts); gate ledger at SAFETY_GATE_LEDGER.jsonl; >=2 known-bad cases per pipeline trigger BLOCK.';
  ms9.v3_3_note = 'inlined-constant CI grep-gate added per Codex P3 finding';
}

// --- 7. New MS36 PRICING-PACKAGING ---
data.milestones.push({
  id: 'PRICING-PACKAGING-MS36',
  title: 'SaaS pricing tiers, SKUs, billing plumbing (Codex WSJF #7)',
  layer: 5, scope_units: 2, effort_days: 5, risk: 'low', value: 'high', critical_path: false, phase: 'pre-ship',
  blocks: ['SHIP-RELEASE-MS19'],
  blocked_by: ['BIZ-ERP-SYNC-MS14'],
  acceptance: 'tier definitions (Free/Starter/Pro/Enterprise) with feature gates; Stripe billing wired; per-tenant SKU assignment via prism_tenant; usage-based metering for SFC + Master Post calls; 3 staged customer signups round-trip to invoice in <1d; without this, $100K-in-4-months pilot cannot bill; closes pass-2 ROI gap.'
});

// --- 8. New MS37 INCIDENT-RESPONSE ---
data.milestones.push({
  id: 'INCIDENT-RESPONSE-MS37',
  title: 'Outage runbook, on-call rotation, rollback automation (Codex WSJF #3)',
  layer: 0, scope_units: 1, effort_days: 3, risk: 'low', value: 'high', critical_path: false, phase: 'pre-ship',
  blocks: ['SHIP-RELEASE-MS19'],
  blocked_by: ['SCHEMA-MIGRATION-RUNNER-MS27'],
  acceptance: 'rollback automation: any deployed version can be reverted in <2 min via single command; on-call rotation defined (Mark + 1 backup); 3 staged outage scenarios (db-down, mcp-dead, ollama-flap) have documented runbook entries; postmortem template + ledger; incident_log.jsonl persists; without this, 1 pilot outage kills reference customer.'
});

// --- 9. Split MS19 into MS19a + MS19b ---
const ms19 = idx()['SHIP-RELEASE-MS19'];
if (ms19) {
  // MS19a: narrow pilot ship (JM Die only)
  const ms19a = {
    id: 'SHIP-RELEASE-MS19a',
    title: 'Pilot ship: JM Die quote-to-ship live (NARROW per V3.3)',
    layer: 6, scope_units: 2, effort_days: 6, risk: 'high', value: 'high', critical_path: true, phase: 'pre-ship',
    blocks: ['SHIP-RELEASE-MS19b'],
    blocked_by: ['SAFETY-OMEGA-GATE-MS9', 'BIZ-QUOTE-FEED-MS12', 'HITL-OPERATOR-UI-MS24', 'L6-BACKPROP-REGISTRY-MS25', 'PRICING-PACKAGING-MS36', 'INCIDENT-RESPONSE-MS37', 'ADOPTION-GATE-MS35', 'PILOT-HEDGE-MS33'],
    acceptance: '3 JM Die jobs flow quote -> P2P -> ship -> invoice with zero human keystrokes in ERP UI AND zero clipboard-paste events PRISM->ERP, telemetry-verified over 20 cycles; ALL safety + adoption gates green; pilot is JM-Die-only acceptable (does NOT require multi-tenant or full biz-stack — those are MS19b).'
  };
  // MS19b: platform/multi-tenant + biz-stack hardening
  const ms19b = {
    id: 'SHIP-RELEASE-MS19b',
    title: 'Platform release: multi-tenant + full biz-stack + compliance (BROAD per V3.3)',
    layer: 6, scope_units: 3, effort_days: 6, risk: 'high', value: 'high', critical_path: false, phase: 'post-pilot',
    blocks: [],
    blocked_by: ['SHIP-RELEASE-MS19a', 'BIZ-ERP-SYNC-MS14', 'BIZ-PORTAL-CUSTOMER-MS15', 'OBS-MONITOR-MS16', 'COMPLIANCE-AUDIT-MS17', 'REG-HARDENING-MS34', 'SCHEMA-MIGRATION-RUNNER-MS27', 'TENANT-ONBOARD-MS29'],
    acceptance: 'second customer onboarded via tenant template; AS9100/CMMC/ITAR audit pass; Grafana dashboards live; ERP/Portal/Compliance all green; this is the GA milestone, distinct from MS19a pilot.'
  };
  // Replace MS19 entry
  const idx19 = data.milestones.findIndex(m => m.id === 'SHIP-RELEASE-MS19');
  data.milestones.splice(idx19, 1, ms19a, ms19b);
  // Update everything that pointed at MS19 to point at MS19a or MS19b appropriately
  for (const m of data.milestones) {
    if (m.id === 'SHIP-RELEASE-MS19a' || m.id === 'SHIP-RELEASE-MS19b') continue;
    m.blocks = (m.blocks || []).map(b => b === 'SHIP-RELEASE-MS19' ? (
      // Items that gate ship -> point at MS19a (pilot) since pilot ships first
      ['SAFETY-OMEGA-GATE-MS9','BIZ-QUOTE-FEED-MS12','HITL-OPERATOR-UI-MS24','L6-BACKPROP-REGISTRY-MS25','PRICING-PACKAGING-MS36','INCIDENT-RESPONSE-MS37','ADOPTION-GATE-MS35','PILOT-HEDGE-MS33'].includes(m.id) ? 'SHIP-RELEASE-MS19a' :
      // Platform-level items -> MS19b
      'SHIP-RELEASE-MS19b'
    ) : b);
    m.blocked_by = (m.blocked_by || []).map(b => b === 'SHIP-RELEASE-MS19' ? 'SHIP-RELEASE-MS19a' : b);
  }
}

// --- 10. Symmetry sweep ---
const i2 = idx();
let added = 0;
for (const m of data.milestones) {
  for (const t of (m.blocks || [])) {
    const target = i2[t]; if (!target) continue;
    target.blocked_by = target.blocked_by || [];
    if (!target.blocked_by.includes(m.id)) { target.blocked_by.push(m.id); added++; }
  }
  for (const b of (m.blocked_by || [])) {
    const blocker = i2[b]; if (!blocker) continue;
    blocker.blocks = blocker.blocks || [];
    if (!blocker.blocks.includes(m.id)) { blocker.blocks.push(m.id); added++; }
  }
}

// --- 11. Topological longest-path CP recomputation (cycle-safe) ---
const memo = {}; const inStack = new Set(); const cycles = [];
function longestTo(id, d = 0) {
  if (memo[id] != null) return memo[id];
  if (inStack.has(id)) { cycles.push([...inStack, id]); return 0; }
  if (d > 200) return 0;
  const m = i2[id]; if (!m) return 0;
  inStack.add(id);
  const days = m.effort_days || 0;
  const preds = (m.blocked_by || []).map(b => longestTo(b, d + 1));
  inStack.delete(id);
  return memo[id] = (preds.length ? Math.max(...preds) : 0) + days;
}
const trueDays = longestTo('SHIP-RELEASE-MS19a');
const cp = [];
let cur = 'SHIP-RELEASE-MS19a';
while (cur) {
  cp.unshift(cur);
  const m = i2[cur];
  let bestId = null, bestD = -1;
  for (const b of (m?.blocked_by || [])) {
    const d = longestTo(b);
    if (d > bestD) { bestD = d; bestId = b; }
  }
  cur = bestId;
}
data.criticalPath = cp;
data.criticalPathDays = trueDays;
data.criticalPathDaysCorrected = trueDays;

// --- 12. Recompute total ---
data.totalEffortDays = data.milestones.reduce((s, m) => s + (m.effort_days || 0), 0);

// --- 13. Tag V3.3 ---
data.v3_3_applied = new Date().toISOString();
data.v3_3_changes = [
  'MS34 moved off critical path (parallel swimlane, no longer chained through MS17)',
  'MS35 acceptance: outcome_correlation gameability fix (operators rubber-stamping detected)',
  'MS24 acceptance: motion-aware 30s timer + phone-tap foreman dual-auth + customer-history Omega override',
  'MS0/MS1 acceptance updated to reflect engine paths (12 consensus engines copied from prism-iooms0 to primary)',
  'MS6 acceptance: orchestrator EXISTS — V3.3 reduced scope from 8d to 5d (Codex P3 ground-truth)',
  'MS9 acceptance: CI grep-gate added for inlined constants migration',
  'Added MS36 PRICING-PACKAGING (5d, Codex WSJF #7 — required for $100K pilot)',
  'Added MS37 INCIDENT-RESPONSE (3d, Codex WSJF #3 — outage runbook + rollback)',
  'Split MS19 into MS19a (pilot/JM Die) + MS19b (platform/multi-tenant) — Codex P4 finding',
  `CP recomputed (topological longest-path to MS19a): ${cp.length} nodes, ${trueDays}d`,
  `Total effort: ${data.totalEffortDays}d`,
  `Reciprocal edges added: ${added}`,
  `Cycles remaining: ${cycles.length}`
];
fs.writeFileSync(PATH, JSON.stringify(data, null, 2));
console.log(JSON.stringify({
  ok: true,
  milestoneCount: data.milestones.length,
  criticalPath: cp,
  criticalPathDays: trueDays,
  totalEffortDays: data.totalEffortDays,
  reciprocalEdgesAdded: added,
  cyclesRemaining: cycles.length
}, null, 2));
