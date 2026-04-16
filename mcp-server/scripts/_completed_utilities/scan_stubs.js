// Count remaining stubs (no kc data) and check what info they DO have
const fs = require('fs');
const path = require('path');
const CONSOLIDATED = 'C:\\PRISM\\data\\materials_consolidated';

const groups = fs.readdirSync(CONSOLIDATED).filter(d => fs.statSync(path.join(CONSOLIDATED, d)).isDirectory());

let totalStubs = 0;
const stubsByGroup = {};

for (const group of groups) {
  const dir = path.join(CONSOLIDATED, group);
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
      const mats = data.materials || [];
      for (const m of mats) {
        const kc = m.kc1_1;
        const hasKc = (kc && typeof kc === 'object' && kc.value > 0) || (typeof kc === 'number' && kc > 0);
        if (!hasKc && mats.length > 0) {
          if (!stubsByGroup[group]) stubsByGroup[group] = { count: 0, samples: [], files: {} };
          stubsByGroup[group].count++;
          if (!stubsByGroup[group].files[file]) stubsByGroup[group].files[file] = 0;
          stubsByGroup[group].files[file]++;
          totalStubs++;
          // Check what data they DO have
          if (stubsByGroup[group].samples.length < 3) {
            const keys = Object.keys(m);
            const hasTS = m.tensile_strength && (typeof m.tensile_strength === 'number' ? m.tensile_strength > 0 : m.tensile_strength?.value > 0);
            const hasHB = m.hardness_brinell && (typeof m.hardness_brinell === 'number' ? m.hardness_brinell > 0 : m.hardness_brinell?.value > 0);
            stubsByGroup[group].samples.push({
              name: m.name,
              fields: keys.length,
              hasTS: !!hasTS,
              hasHB: !!hasHB,
              ts: hasTS ? (typeof m.tensile_strength === 'number' ? m.tensile_strength : m.tensile_strength?.value) : null,
            });
          }
        }
      }
    } catch(e) {}
  }
}

console.log(`=== REMAINING STUBS: ${totalStubs} ===\n`);
for (const [g, info] of Object.entries(stubsByGroup).sort((a,b) => b[1].count - a[1].count)) {
  console.log(`${g}: ${info.count} stubs`);
  for (const [f, c] of Object.entries(info.files).sort((a,b) => b - a)) {
    console.log(`  ${f}: ${c}`);
  }
  for (const s of info.samples) {
    console.log(`  sample: "${s.name}" fields=${s.fields} hasTS=${s.hasTS}${s.ts ? ' ts='+s.ts : ''} hasHB=${s.hasHB}`);
  }
  console.log();
}
