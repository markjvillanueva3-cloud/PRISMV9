#!/usr/bin/env node
// One-shot: audit open mill+CAM milestones for foxtrot consolidation.
import fs from 'node:fs';
const dir = 'mcp-server/data/milestones';
const all = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
const re = /MILL|CAM|CAD-CAM|HYPERMILL|TOOLPATH|TEMPLATE|MASTERCAM|FUSION|INVENTOR|PRINT-TO-PROGRAM|MACHINING|JM-DIE|MACHINE|HM-|MFM-|MASTER-POST|SFC-|SF-|PROGRAM-|POST/i;
const open = [];
for (const f of all) {
  if (!re.test(f)) continue;
  try {
    const j = JSON.parse(fs.readFileSync(`${dir}/${f}`, 'utf8'));
    const status = String(j.claimedStatus || j.status || 'unknown');
    if (/^(completed|shipped|complete)$/i.test(status)) continue;
    open.push({
      id: f.replace('.json', ''),
      status,
      title: (j.title || j.scope || '').slice(0, 140),
      pendingUnits: Array.isArray(j.units) ? j.units.filter(u => u.status !== 'completed').length : (j.pendingCount || null)
    });
  } catch {/* skip parse errors */}
}
fs.mkdirSync('state/shared/audits', { recursive: true });
fs.writeFileSync('state/shared/audits/FOXTROT-MILL-CAM-OPEN-MILESTONES.json', JSON.stringify({
  schemaVersion: '1.0.0',
  generatedAt: new Date().toISOString(),
  source: 'foxtrot mill+CAM scope audit',
  count: open.length,
  milestones: open
}, null, 2));
console.log(`AUDIT: wrote ${open.length} open mill/CAM milestones`);
const hist = {};
for (const m of open) hist[m.status] = (hist[m.status] || 0) + 1;
console.log('Status histogram:');
for (const [k, v] of Object.entries(hist).sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(15)} ${v}`);
