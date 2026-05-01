const fs = require('fs');
const path = require('path');

const BASE = 'C:\\PRISM\\data\\materials';
const GROUPS = ['H_HARDENED','K_CAST_IRON','M_STAINLESS','N_NONFERROUS','P_STEELS','S_SUPERALLOYS','X_SPECIALTY'];

let missing = { total: 0, byGroup: {} };

for (const g of GROUPS) {
    const dir = path.join(BASE, g);
    if (!fs.existsSync(dir)) continue;
    let gMissing = [];
    
    for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
        const raw = fs.readFileSync(path.join(dir, file), 'utf8').replace(/^\uFEFF/, '');
        let json;
        try { json = JSON.parse(raw); } catch(e) { continue; }
        const arr = json.materials || (Array.isArray(json) ? json : [json]);
        
        for (const m of arr) {
            if (!m.composition || Object.keys(m.composition).length === 0) {
                gMissing.push({ name: m.name, id: m.material_id || m.id, file });
            }
        }
    }
    
    if (gMissing.length > 0) {
        missing.byGroup[g] = gMissing.length;
        missing.total += gMissing.length;
        
        // Show sample names to understand what types are missing
        const sampleNames = gMissing.slice(0, 10).map(m => m.name);
        console.log(`${g}: ${gMissing.length} missing composition`);
        console.log(`  Samples: ${sampleNames.join(', ')}`);
    }
}

console.log(`\nTotal missing composition: ${missing.total}`);
console.log(JSON.stringify(missing.byGroup, null, 2));
