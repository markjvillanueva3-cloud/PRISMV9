const data = JSON.parse(require('fs').readFileSync('C:\\PRISM\\skills-consolidated\\SKILL_INDEX.json', 'utf-8'));
const skills = data.skills || data;
const empty = [];
for (const [name, info] of Object.entries(skills)) {
  const t = info.triggers || [];
  if (!t.length || (t.length === 1 && t[0] === '')) empty.push(name);
}
console.log('Remaining empty triggers:', empty.join(', '));
