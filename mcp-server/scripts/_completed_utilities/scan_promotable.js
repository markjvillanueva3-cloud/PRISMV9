// Scan ALL gen_v5 consolidated files for promotable materials (have kc1_1 data)
const fs = require('fs');
const path = require('path');
const CONSOLIDATED = 'C:\\PRISM\\data\\materials_consolidated';

const groups = fs.readdirSync(CONSOLIDATED).filter(d => {
  return fs.statSync(path.join(CONSOLIDATED, d)).isDirectory();
});

for (const group of groups) {
  const dir = path.join(CONSOLIDATED, group);
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
      const mats = data.materials || [];
      let hasKc = 0, noKc = 0, total = mats.length;
      for (const m of mats) {
        const kc = m.kc1_1;
        if (kc && typeof kc === 'object' && kc.value && kc.value > 0) hasKc++;
        else if (kc && typeof kc === 'number' && kc > 0) hasKc++;
        else noKc++;
      }
      if (total > 0) {
        console.log(`${group}/${file}: ${total} total, ${hasKc} with kc, ${noKc} stubs`);
      }
    } catch(e) {}
  }
}
