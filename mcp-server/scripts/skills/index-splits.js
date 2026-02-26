const fs = require('fs');
const path = require('path');

const idxPath = 'C:\\PRISM\\skills-consolidated\\SKILL_INDEX.json';
const dir = 'C:\\PRISM\\skills-consolidated';
const idx = JSON.parse(fs.readFileSync(idxPath, 'utf8'));

const toAdd = process.argv.slice(2);
if (toAdd.length === 0) {
  // Find all unindexed split skills
  const allDirs = fs.readdirSync(dir).filter(d => {
    const p = path.join(dir, d, 'SKILL.md');
    if (!fs.existsSync(p)) return false;
    const c = fs.readFileSync(p, 'utf8');
    return c.includes('SOURCE: Split from');
  });
  const indexed = new Set(Object.keys(idx.skills || idx));
  const missing = allDirs.filter(d => !indexed.has(d));
  if (missing.length === 0) { console.log('All splits indexed.'); process.exit(0); }
  console.log('Found ' + missing.length + ' unindexed splits:');
  missing.forEach(m => toAdd.push(m));
}

const store = idx.skills || idx;

toAdd.forEach(name => {
  const skillPath = path.join(dir, name, 'SKILL.md');
  if (!fs.existsSync(skillPath)) { console.log('SKIP ' + name + ' (no SKILL.md)'); return; }
  
  const content = fs.readFileSync(skillPath, 'utf8');
  const desc = (content.match(/description:\s*(.+)/) || ['',''])[1].slice(0, 200);
  const sizeKb = parseFloat((Buffer.byteLength(content) / 1024).toFixed(1));
  
  store[name] = {
    name: name,
    description: desc,
    size_kb: sizeKb,
    source: 'split_from_monolith',
    prism_phases: ['DA','R1','R2','R3','R4','R5','R6','R7','R8'],
    tags: ['dev', 'executable', 'v2.0']
  };
  console.log('+ ' + name + ' (' + sizeKb + 'KB)');
});

fs.writeFileSync(idxPath, JSON.stringify(idx, null, 2));
console.log('Total indexed: ' + Object.keys(store).length);
