// Diagnostic: test MaterialRegistry loading
const fs = require('fs');
const path = require('path');

const MATERIALS_DB = 'C:\\PRISM\\data\\materials';
const isoGroups = ["P_STEELS", "M_STAINLESS", "K_CAST_IRON", "N_NONFERROUS", "S_SUPERALLOYS", "H_HARDENED", "X_SPECIALTY"];

let totalLoaded = 0;

for (const group of isoGroups) {
    const groupPath = path.join(MATERIALS_DB, group);
    if (!fs.existsSync(groupPath)) {
        console.log(`${group}: directory NOT FOUND`);
        continue;
    }
    
    const files = fs.readdirSync(groupPath, { withFileTypes: true });
    const jsonFiles = files.filter(f => f.isFile() && f.name.endsWith('.json') && f.name !== 'index.json');
    
    let groupCount = 0;
    for (const file of jsonFiles) {
        try {
            const raw = fs.readFileSync(path.join(groupPath, file.name), 'utf-8');
            const data = JSON.parse(raw);
            const materials = data.materials || [];
            groupCount += materials.length;
            
            // Check first material structure
            if (materials.length > 0) {
                const m = materials[0];
                const hasId = !!(m.material_id || m.id);
                const hasKienzle = !!(m.kienzle && m.kienzle.kc1_1);
                console.log(`  ${file.name}: ${materials.length} materials, hasId=${hasId}, hasKienzle=${hasKienzle}, id=${m.material_id || m.id || 'NONE'}`);
            }
        } catch (e) {
            console.log(`  ${file.name}: ERROR ${e.message}`);
        }
    }
    totalLoaded += groupCount;
    console.log(`${group}: ${jsonFiles.length} files, ${groupCount} materials\n`);
}

console.log(`\nTOTAL: ${totalLoaded} materials loadable from disk`);
