import fs from 'node:fs';
const PATH = 'H:/prism/mcp-server/data/milestones/comprehensive-roadmap-2026-05-04-v2.json';
const data = JSON.parse(fs.readFileSync(PATH, 'utf8'));
const idx = Object.fromEntries(data.milestones.map(m => [m.id, m]));

// Break MS19 -> MS16 -> MS18 -> MS19 cycle (MS18 is now post-pilot, MS16 must not depend on it)
const ms16 = idx['OBS-MONITOR-MS16'];
const ms18 = idx['LEARN-XPROC-TRANSFER-MS18'];
if (ms16) ms16.blocked_by = (ms16.blocked_by || []).filter(b => b !== 'LEARN-XPROC-TRANSFER-MS18');
if (ms18) ms18.blocks = (ms18.blocks || []).filter(b => b !== 'OBS-MONITOR-MS16');

// Recompute CP
const memo = {}, inStack = new Set(), cycles = [];
function longestTo(id, d = 0) {
  if (memo[id] != null) return memo[id];
  if (inStack.has(id)) { cycles.push([...inStack, id]); return 0; }
  if (d > 200) return 0;
  const m = idx[id]; if (!m) return 0;
  inStack.add(id);
  const days = m.effort_days || 0;
  const preds = (m.blocked_by || []).map(b => longestTo(b, d + 1));
  inStack.delete(id);
  return memo[id] = (preds.length ? Math.max(...preds) : 0) + days;
}
const days = longestTo('SHIP-RELEASE-MS19');
const cp = [];
let cur = 'SHIP-RELEASE-MS19';
while (cur) {
  cp.unshift(cur);
  const m = idx[cur];
  let bid = null, bd = -1;
  for (const b of (m?.blocked_by || [])) {
    const x = longestTo(b);
    if (x > bd) { bd = x; bid = b; }
  }
  cur = bid;
}
data.criticalPath = cp;
data.criticalPathDays = days;
data.criticalPathDaysCorrected = days;
data.v3_2_cycle_break = 'MS19->MS16->MS18->MS19 broken: removed MS18 from MS16.blocked_by (MS18 is post-pilot, cannot block pre-ship dashboards)';
fs.writeFileSync(PATH, JSON.stringify(data, null, 2));
console.log(JSON.stringify({ cycles_remaining: cycles.length, cp_days: days, cp_nodes: cp.length, cp }, null, 2));
