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
check('Phantom skills', () => {
  const indexFile = path.join('C:\\PRISM\\skills-consolidated', 'SKILL_INDEX.json');
  if (!fs.existsSync(indexFile)) return { ok: false, detail: 'SKILL_INDEX.json missing' };
  const idx = JSON.parse(fs.readFileSync(indexFile, 'utf-8'));
  const indexedNames = Object.keys(idx.skills || {});
  const phantoms = indexedNames.filter(n => !fs.existsSync(path.join('C:\\PRISM\\skills-consolidated', n, 'SKILL.md')));
  return { ok: phantoms.length === 0, detail: phantoms.length === 0 ? `${indexedNames.length} skills OK` : `${phantoms.length} phantoms: ${phantoms.slice(0,3).join(', ')}` };
});

// Run log rotation
check('Audit log rotation', () => {
  const logDir = path.join('C:\\PRISM\\state', 'logs');
  if (!fs.existsSync(logDir)) return { ok: true, detail: 'no logs yet' };
  const auditLog = path.join(logDir, 'audit.jsonl');
  if (!fs.existsSync(auditLog)) return { ok: true, detail: 'no audit.jsonl yet' };
  const sizeMB = (fs.statSync(auditLog).size / (1024 * 1024)).toFixed(1);
  return { ok: parseFloat(sizeMB) < 10, detail: `audit.jsonl: ${sizeMB}MB` };
});

const passed = checks.filter(c => c.ok).length;
const total = checks.length;
console.log(`[PREFLIGHT] ${passed}/${total} checks passed`);
checks.forEach(c => console.log(`  ${c.ok ? 'OK' : 'FAIL'} ${c.name}: ${c.detail}`));
if (passed < total) { console.log('[PREFLIGHT] WARNING: Some checks failed'); process.exit(1); }
console.log('[PREFLIGHT] All systems go.');
