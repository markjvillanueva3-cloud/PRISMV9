#!/usr/bin/env node
// V3.2 patches: post-pass-4 fixes
// 1. MS18 LoRA -> post-pilot (Codex contrarian + ROI)
// 2. Add MS31..MS35 (label-provenance, consensus-integrity, pilot-hedge, reg-hardening, adoption-gate)
// 3. Recompute CP via topological longest-path
// 4. Symmetry sweep
// 5. MS24 pendant-button redesign
import fs from 'node:fs';
const PATH = 'H:/prism/mcp-server/data/milestones/comprehensive-roadmap-2026-05-04-v2.json';
const data = JSON.parse(fs.readFileSync(PATH, 'utf8'));
const byId = () => Object.fromEntries(data.milestones.map(m => [m.id, m]));

// 1. MS18 -> post-pilot
const ms18 = data.milestones.find(m => m.id === 'LEARN-XPROC-TRANSFER-MS18');
if (ms18) {
  ms18.phase = 'post-pilot';
  ms18.critical_path = false;
  ms18.title = ms18.title.includes('POST-PILOT') ? ms18.title : ms18.title + ' (POST-PILOT per V3.2)';
  const ms19 = data.milestones.find(m => m.id === 'SHIP-RELEASE-MS19');
  if (ms19) ms19.blocked_by = ms19.blocked_by.filter(b => b !== 'LEARN-XPROC-TRANSFER-MS18');
  ms18.blocks = (ms18.blocks || []).filter(b => b !== 'SHIP-RELEASE-MS19');
  if (!ms18.blocked_by.includes('SHIP-RELEASE-MS19')) ms18.blocked_by.push('SHIP-RELEASE-MS19');
}

// 2. New milestones
data.milestones.push(
  { id:'LABEL-PROVENANCE-MS31', title:'Operator-signed event labels for MS22a + outlier rejection', layer:3, scope_units:2, effort_days:2, risk:'low', value:'high', critical_path:false, phase:'pre-ship',
    blocks:['SAFETY-OMEGA-GATE-MS9','LEARN-XPROC-TRANSFER-MS18'], blocked_by:['RT-ADAPTIVE-MS22a'],
    acceptance:'every MS22a outcome event signed with operator+machine cert; >3 sigma outlier rejected before MS9/MS18 ingest; 100 staged events with 5 mislabels detected with FPR<5%; closes red-team risk #1 (label poisoning).' },
  { id:'CONSENSUS-INTEGRITY-MS32', title:'Voice reputation + rotating tiebreaker + agreement-anomaly detector', layer:0, scope_units:2, effort_days:2, risk:'med', value:'high', critical_path:false, phase:'pre-ship',
    blocks:['SAFETY-OMEGA-GATE-MS9'], blocked_by:['INFRA-CONSENSUS-WIRE-MS0'],
    acceptance:'voice reputation tracked over 50-call window; persistent <70% accuracy = demote; rotating tiebreaker (Claude/Codex/Gemini/Ollama round-robin) prevents Sybil collusion; anomaly detector flags persistent 3-of-4 patterns; closes red-team risk #2.' },
  { id:'PILOT-HEDGE-MS33', title:'Dual-auth overrides + customer-scoped at-rest encryption + 2-customer floor', layer:5, scope_units:3, effort_days:3, risk:'med', value:'high', critical_path:false, phase:'pre-ship',
    blocks:['SHIP-RELEASE-MS19'], blocked_by:['HITL-OPERATOR-UI-MS24','OT-IT-SECURITY-MS20'],
    acceptance:'safety-tier override (Omega<1.0) requires 2-person sign-off (operator + foreman); CrossProcessOutcomeStore AES-256 at-rest with per-customer ACL; pilot floor >=2 customers (synthetic counts via MS29-soft); closes red-team risks #3, #4, #7.' },
  { id:'REG-HARDENING-MS34', title:'AS9100 §8.5.6/8.7 + CMMC L2 + ITAR ECCN + SOTIF ODD declaration', layer:4, scope_units:4, effort_days:8, risk:'med', value:'high', critical_path:false, phase:'pre-ship',
    blocks:['SHIP-RELEASE-MS19'], blocked_by:['COMPLIANCE-AUDIT-MS17'],
    acceptance:'WORM ledger for AS9100 §8.5.6 change-control; NCR/MRB workflow engine (§8.7); ECCN/USML tags on part-master + deemed-export gate; CMMC L2 SPRS self-score >=88; ODD declared + Mahalanobis OOD detector wired to Omega gate (SOTIF/ISO 21448); external mock-audit by AS9100 Lead Auditor returns 0 majors, <=3 minors.' },
  { id:'ADOPTION-GATE-MS35', title:'MS19 adoption-rate gate (consensus_execution_rate + opt-in rate)', layer:6, scope_units:1, effort_days:3, risk:'low', value:'high', critical_path:true, phase:'pre-ship',
    blocks:['SHIP-RELEASE-MS19'], blocked_by:['HITL-OPERATOR-UI-MS24','MILL-P2P-CONSENSUS-MS3'],
    acceptance:'consensus_execution_rate >= 0.50 over 20-job baseline (operators USE picks, not display-only); opt-in rate >= 60% across 3 machines; closes pre-mortem scenario #1 (Operator Opt-Out Collapse).' }
);

// 3. MS24 pendant-button redesign
const ms24 = data.milestones.find(m => m.id === 'HITL-OPERATOR-UI-MS24');
if (ms24) {
  ms24.title = 'Operator pendant-button override (PHYSICAL — accept-after-30s default)';
  ms24.acceptance = 'physical button on machine pendant (NOT CLI, NOT screen); 1-button accept (default after 30s timeout); 2-button reject with pre-canned reason dropdown (chatter/wrong-tool/bad-finish/material/fixture/other) — no typing; rejections emit OperatorDecisionEvent to outcome ledger as labeled negative; thermal-comp defaults ON (low-risk auto-help); chatter/feed-override stays opt-in. Operator-empathy verified.';
}

// 4. Symmetry sweep
const idx = byId();
let added = 0;
for (const m of data.milestones) {
  for (const t of (m.blocks || [])) {
    const target = idx[t]; if (!target) continue;
    target.blocked_by = target.blocked_by || [];
    if (!target.blocked_by.includes(m.id)) { target.blocked_by.push(m.id); added++; }
  }
  for (const b of (m.blocked_by || [])) {
    const blocker = idx[b]; if (!blocker) continue;
    blocker.blocks = blocker.blocks || [];
    if (!blocker.blocks.includes(m.id)) { blocker.blocks.push(m.id); added++; }
  }
}

// 5. Topological longest-path CP recomputation (with cycle detection)
const memo = {};
const inStack = new Set();
const cycles = [];
function longestTo(id, depth = 0) {
  if (memo[id] != null) return memo[id];
  if (inStack.has(id)) { cycles.push([...inStack, id]); return 0; }
  if (depth > 200) { return 0; }
  const m = idx[id]; if (!m) return 0;
  inStack.add(id);
  const days = m.effort_days || 0;
  const preds = (m.blocked_by || []).map(b => longestTo(b, depth + 1));
  inStack.delete(id);
  return memo[id] = (preds.length ? Math.max(...preds) : 0) + days;
}
const trueDays = longestTo('SHIP-RELEASE-MS19');
if (cycles.length) console.error('CYCLES DETECTED:', cycles.slice(0, 3));
const cp = [];
let cur = 'SHIP-RELEASE-MS19';
while (cur) {
  cp.unshift(cur);
  const m = idx[cur];
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

// 6. Recompute total
data.totalEffortDays = data.milestones.reduce((s, m) => s + (m.effort_days || 0), 0);

// 7. Tag
data.v3_2_applied = new Date().toISOString();
data.v3_2_changes = [
  'MS18 LoRA moved to post-pilot (Codex contrarian + ROI)',
  'Added MS31 LABEL-PROVENANCE (closes red-team #1)',
  'Added MS32 CONSENSUS-INTEGRITY (closes red-team #2)',
  'Added MS33 PILOT-HEDGE (closes red-team #3,#4,#7)',
  'Added MS34 REG-HARDENING (AS9100/CMMC/ITAR/SOTIF)',
  'Added MS35 ADOPTION-GATE (closes pre-mortem #1)',
  'MS24 pendant-button redesign (operator-empathy)',
  `CP recomputed (topological longest-path): ${cp.length} nodes, ${trueDays}d`,
  `Total effort: ${data.totalEffortDays}d`,
  `Reciprocal edges added: ${added}`
];
fs.writeFileSync(PATH, JSON.stringify(data, null, 2));
console.log(JSON.stringify({ ok:true, milestoneCount:data.milestones.length, trueCriticalPath:cp, trueCriticalPathDays:trueDays, totalEffortDays:data.totalEffortDays, reciprocalEdgesAdded:added }, null, 2));
