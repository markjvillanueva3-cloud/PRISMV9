// Find a specific material in gen_v5 consolidated and show its full data
const fs = require('fs');
const path = require('path');
const base = 'C:\\PRISM\\data\\materials_consolidated';

function findMaterial(searchName) {
  const dirs = fs.readdirSync(base).filter(d => {
    const p = path.join(base, d);
    return fs.statSync(p).isDirectory();
  });
  for (const dir of dirs) {
    const dirPath = path.join(base, dir);
    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
    for (const file of files) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(dirPath, file), 'utf8'));
        const mats = data.materials || [];
        for (const m of mats) {
          if (m.name && m.name.toLowerCase().includes(searchName.toLowerCase())) {
            return { file: `${dir}/${file}`, material: m };
          }
        }
      } catch(e) {}
    }
  }
  return null;
}

// Check key materials
const targets = ['6061-T6 Peak', 'AISI 1018', '316L', '7075-T6', 'Inconel 625'];
for (const t of targets) {
  const found = findMaterial(t);
  if (found) {
    const m = found.material;
    console.log(`\n=== ${m.name} (${found.file}) ===`);
    console.log(`  kc1_1: ${JSON.stringify(m.kc1_1)}`);
    console.log(`  mc: ${JSON.stringify(m.mc)}`);
    console.log(`  kc1_1_milling: ${JSON.stringify(m.kc1_1_milling)}`);
    console.log(`  density: ${JSON.stringify(m.density)}`);
    console.log(`  tensile_strength: ${JSON.stringify(m.tensile_strength)}`);
    console.log(`  hardness_brinell: ${JSON.stringify(m.hardness_brinell)}`);
    console.log(`  taylor_C: ${JSON.stringify(m.taylor_C)}`);
    console.log(`  taylor_n: ${JSON.stringify(m.taylor_n)}`);
    console.log(`  johnson_cook_A: ${JSON.stringify(m.johnson_cook_A)}`);
    console.log(`  thermal_conductivity: ${JSON.stringify(m.thermal_conductivity)}`);
    console.log(`  elastic_modulus: ${JSON.stringify(m.elastic_modulus)}`);
    // Check how many fields have real data
    const keys = Object.keys(m);
    const filled = keys.filter(k => {
      const v = m[k];
      if (v === null || v === undefined || v === 0 || v === '') return false;
      if (typeof v === 'object' && v.value !== undefined) return v.value !== null && v.value !== 0;
      return true;
    });
    console.log(`  Fields total: ${keys.length}, Filled: ${filled.length}`);
  } else {
    console.log(`\n=== ${t}: NOT FOUND ===`);
  }
}
