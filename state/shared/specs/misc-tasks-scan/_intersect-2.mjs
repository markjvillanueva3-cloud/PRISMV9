import fs from 'fs';
const norm = s => s.trim().replace(/\\/g, '/').toLowerCase();
const manifest = fs.readFileSync('H:/prism/state/shared/specs/misc-tasks-scan/manifest-2.txt', 'utf8')
  .split(/\r?\n/).filter(Boolean).map(norm);
const matchTxt = fs.readFileSync('C:/Users/wompu/.claude/projects/H--prism/3a1c1c68-a4cf-4705-a813-b80ec43b26fa/tool-results/toolu_01PcmHagqBAtXqeDGsPg6R73.txt', 'utf8');
const matchSet = new Set(matchTxt.split(/\r?\n/).filter(l => l.endsWith('.jsonl')).map(norm));
const inter = manifest.filter(m => matchSet.has(m));
console.log('manifest=' + manifest.length + ' matchFiles=' + matchSet.size + ' intersection=' + inter.length);
fs.writeFileSync('H:/prism/state/shared/specs/misc-tasks-scan/_intersect-2.txt', inter.join('\n'));
