const fs = require('fs');
const path = require('path');

const MAT_DIR = 'C:\\PRISM\\data\\materials';
const GROUPS = ['H_HARDENED','K_CAST_IRON','M_STAINLESS','N_NONFERROUS','P_STEELS','S_SUPERALLOYS','X_SPECIALTY'];
let byGroup = {};

for (const g of GROUPS) {
    const dir = path.join(MAT_DIR, g);
    if (!fs.existsSync(dir)) continue;
    let missing = [];
    let total = 0;
    
    for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
        const arr = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8').replace(/^\uFEFF/, '')).materials || [];
        for (const m of arr) {
            total++;
            if (!m.taylor || !m.taylor.C || m.taylor.C <= 0) {
                missing.push(m.name);
            }
        }
    }
    
    if (missing.length > 0) {
        byGroup[g] = { missing: missing.length, total, samples: missing.slice(0, 5) };
        console.log(`${g}: ${missing.length}/${total} missing Taylor`);
        console.log(`  Samples: ${missing.slice(0,5).join(', ')}`);
    }
}

// Also check: do these materials have Kienzle but not Taylor?
// If so, we can generate Taylor from Kienzle + ISO group defaults
console.log('\n=== GENERATION STRATEGY ===');
console.log('Taylor C and n can be estimated from:');
console.log('  - ISO group defaults (most common approach)');
console.log('  - Hardness correlation: harder materials = lower C, lower n');
console.log('  - Machinability rating correlation');
