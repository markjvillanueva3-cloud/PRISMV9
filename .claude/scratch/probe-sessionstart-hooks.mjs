import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
const root = 'H:/prism';
const hooks = JSON.parse(fs.readFileSync(root + '/.claude/settings.json', 'utf8')).hooks?.SessionStart || [];
const fails = [];
const checked = new Set();
const HOOK_RX = /\.claude[\/\\]hooks[\/\\][\w-]+\.mjs/;
for (const m of hooks) {
  for (const h of m.hooks || []) {
    const cmd = h.command || '';
    const mat = cmd.match(HOOK_RX);
    if (!mat) continue;
    const rel = mat[0].split('\\').join('/');
    const p = root + '/' + rel;
    if (checked.has(p)) continue;
    checked.add(p);
    if (!fs.existsSync(p)) { fails.push({ rel, err: 'missing-on-disk' }); continue; }
    const r = spawnSync(process.execPath, [p], { timeout: 6000, encoding: 'utf8', input: JSON.stringify({ session_id: 'probe', source: 'startup', hook_event_name: 'SessionStart' }) });
    const stderr = (r.stderr || '').slice(0, 600);
    const stdout = (r.stdout || '').slice(0, 200);
    if (r.status !== 0 || /MODULE_NOT_FOUND|cjs\/loader|Cannot find|SyntaxError|ReferenceError|TypeError/.test(stderr)) {
      fails.push({ rel, code: r.status, signal: r.signal || null, stderr_head: stderr.split('\n').slice(0, 5).join(' | '), stdout_head: stdout });
    }
  }
}
console.log(JSON.stringify(fails, null, 2));
console.log('# checked=' + checked.size + ' fails=' + fails.length);
