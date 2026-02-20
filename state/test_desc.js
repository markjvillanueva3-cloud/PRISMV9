const fs = require('fs');
const path = require('path');
const dir = 'C:\\PRISM\\skills-consolidated';
let good = 0, bad = 0, total = 0;
const bads = [];

function extractDescription(content) {
  // 1. YAML front-matter
  const yamlMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (yamlMatch) {
    const b = yamlMatch[1];
    const m = b.match(/description:\s*\|\s*\r?\n((?:[ \t]+[^\r\n]*\r?\n?)*)/);
    if (m) { const d = m[1].split(/\r?\n/).map(l=>l.trim()).filter(Boolean).join(' '); if (d.length>3) return d.slice(0,300); }
    const s = b.match(/description:\s*([^|\r\n][^\r\n]*)/);
    if (s) { const d = s[1].trim(); if (d.length>3) return d.slice(0,300); }
  }
  // 2. Embedded YAML
  const ey = content.match(/```yaml\r?\n[\s\S]*?description:\s*([^|\r\n][^\r\n]*)/);
  if (ey && ey[1].trim().length>10) return ey[1].trim().slice(0,300);
  // 3. Heading + paragraph
  const dm = content.match(/^#[^#].*?\n\n([^\n#-][^\n]+)/m);
  if (dm && dm[1].trim().length>10) return dm[1].trim().slice(0,300);
  // 4. Overview/Purpose section
  const om = content.match(/##?\s*(?:OVERVIEW|Purpose|Summary|Description)\s*\r?\n+([^\n#][^\n]+)/mi);
  if (om && om[1].trim().length>10) return om[1].trim().slice(0,300);
  // 5. Title
  const tm = content.match(/^#\s+(?:PRISM\s+)?(?:SKILL:\s*)?(.+)/m);
  if (tm) { const t = tm[1].replace(/[═#*]/g,'').trim(); if (t.length>5) return t.slice(0,300); }
  // 6. Fallback
  const lines = content.split('\n').filter(l => { const t=l.trim(); return t && t.length>10 && !t.startsWith('#') && t!=='---' && !t.startsWith('name:') && !t.startsWith('```') && !t.startsWith('═'); });
  return lines[0]?.trim().slice(0,300) || '';
}

fs.readdirSync(dir).forEach(d => {
  const f = path.join(dir, d, 'SKILL.md');
  if (!fs.existsSync(f)) return;
  total++;
  const c = fs.readFileSync(f, 'utf-8');
  const desc = extractDescription(c);
  if (!desc || desc === '---' || desc === '|' || desc.length < 4) {
    bad++;
    bads.push(d + ': [' + c.slice(0,80).replace(/\n/g,' ') + ']');
  } else {
    good++;
  }
});

console.log('Total: ' + total + ' Good: ' + good + ' Bad: ' + bad);
if (bads.length > 0) console.log('BAD skills:\n' + bads.join('\n'));
