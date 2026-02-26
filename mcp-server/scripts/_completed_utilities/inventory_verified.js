const fs = require('fs');
const path = require('path');
const base = 'C:\\PRISM\\data\\materials';
let total = 0;
const groups = {};
const details = [];

function scan(dir) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const p = path.join(dir, item);
    if (fs.statSync(p).isDirectory()) {
      scan(p);
    } else if (item.endsWith('_verified.json')) {
      try {
        const d = JSON.parse(fs.readFileSync(p, 'utf8'));
        const mats = d.materials || [];
        const c = mats.length;
        const g = path.basename(path.dirname(p));
        groups[g] = (groups[g] || 0) + c;
        total += c;
        // Check which have real mc (not 0.25 default)
        let verifiedMc = 0;
        let hasTaylor = 0;
        for (const m of mats) {
          if (m.kienzle && m.kienzle.mc && m.kienzle.mc !== 0.25) verifiedMc++;
          if (m.taylor && m.taylor.C && m.taylor.C > 0) hasTaylor++;
        }
        details.push({ file: item, group: g, count: c, verifiedMc, hasTaylor });
      } catch (e) {}
    }
  }
}

scan(base);
console.log('=== VERIFIED MATERIAL INVENTORY ===');
console.log('Total verified materials:', total);
console.log('\nBy ISO group:');
for (const [g, c] of Object.entries(groups).sort()) {
  console.log(`  ${g}: ${c}`);
}
console.log('\nFiles with non-default mc and Taylor data:');
for (const d of details.sort((a,b) => b.count - a.count)) {
  console.log(`  ${d.group}/${d.file}: ${d.count} mats, ${d.verifiedMc} real mc, ${d.hasTaylor} Taylor`);
}
