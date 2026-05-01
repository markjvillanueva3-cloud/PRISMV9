#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const checks = [];
function check(name, fn) { try { const r = fn(); checks.push({name, ok: r.ok, detail: r.detail}); } catch(e) { checks.push({name, ok: false, detail: e.message}); } }

check('State dir', () => ({ ok: fs.existsSync('C:\\PRISM\\state'), detail: 'C:\\PRISM\\state' }));
check('MCP server dist', () => {
  const p = 'C:\\PRISM\\mcp-server\\dist\\index.js';
  const exists = fs.existsSync(p);
  const stat = exists ? fs.statSync(p) : null;
  const age = stat ? Math.round((Date.now() - stat.mtimeMs) / 3600000) : -1;
  return { ok: exists && age < 24, detail: exists ? `${(stat.size/1024/1024).toFixed(1)}MB, ${age}h old` : 'MISSING' };
});
check('HOT_RESUME', () => ({ ok: fs.existsSync('C:\\PRISM\\state\\HOT_RESUME.md'), detail: 'recovery file' }));
check('ACTION_TRACKER', () => ({ ok: fs.existsSync('C:\\PRISM\\state\\ACTION_TRACKER.md'), detail: 'continuity file' }));
check('Snapshot dir', () => {
  const d = 'C:\\PRISM\\state\\snapshots';
  const exists = fs.existsSync(d);
  const count = exists ? fs.readdirSync(d).filter(f=>f.startsWith('snap-')).length : 0;
  return { ok: exists && count > 0, detail: `${count} snapshots` };
});
check('Skills dir', () => {
  const d = 'C:\\PRISM\\skills-consolidated';
  const exists = fs.existsSync(d);
  const count = exists ? fs.readdirSync(d).filter(f=>f.endsWith('.md')).length : 0;
  return { ok: exists && count > 0, detail: `${count} skill files` };
});
check('Pre-build snapshot', () => ({ ok: fs.existsSync('C:\\PRISM\\state\\pre_build_snapshot.json'), detail: 'anti-regression' }));

const passed = checks.filter(c => c.ok).length;
const total = checks.length;
console.log(`[PREFLIGHT] ${passed}/${total} checks passed`);
checks.forEach(c => console.log(`  ${c.ok ? 'OK' : 'FAIL'} ${c.name}: ${c.detail}`));
if (passed < total) { console.log('[PREFLIGHT] WARNING: Some checks failed'); process.exit(1); }
console.log('[PREFLIGHT] All systems go.');
