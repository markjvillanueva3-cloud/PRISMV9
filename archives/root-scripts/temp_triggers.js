const data = JSON.parse(require('fs').readFileSync('C:\\PRISM\\skills-consolidated\\SKILL_INDEX.json', 'utf-8'));
const skills = data.skills || data;
let empty = 0, populated = 0;
const emptyNames = [];
for (const [name, info] of Object.entries(skills)) {
  const triggers = info.triggers || [];
  if (!triggers.length || (triggers.length === 1 && triggers[0] === '')) {
    empty++;
    emptyNames.push(name);
  } else {
    populated++;
  }
}
console.log(`Triggers: ${populated} populated, ${empty} empty out of ${populated + empty} total`);
if (emptyNames.length > 0) {
  console.log('First 20 empty:', emptyNames.slice(0, 20).join(', '));
}
