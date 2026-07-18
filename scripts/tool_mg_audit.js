const fs = require('fs');
const path = require('path');
const TOOL_DIR = 'C:\\PRISM\\data\\tools';

let total = 0, withMaterialGroups = 0, withApplication = 0, withGeometry = 0;
const sampleMGs = [];

for (const file of fs.readdirSync(TOOL_DIR).filter(f => f.endsWith('.json') && f !== 'TOOLS_HIERARCHY.json')) {
    const raw = fs.readFileSync(path.join(TOOL_DIR, file), 'utf8').replace(/^\uFEFF/, '');
    const json = JSON.parse(raw);
    const arr = json.tools || (Array.isArray(json) ? json : [json]);
    
    for (const t of arr) {
        total++;
        if (t.material_groups && Array.isArray(t.material_groups) && t.material_groups.length > 0) {
            withMaterialGroups++;
            if (sampleMGs.length < 3) sampleMGs.push({ id: t.id, mg: t.material_groups });
        }
        if (t.application && Array.isArray(t.application)) withApplication++;
        if (t.geometry?.diameter > 0 || t.cutting_diameter_mm > 0) withGeometry++;
    }
}

console.log(`Total tools: ${total}`);
console.log(`With material_groups: ${withMaterialGroups} (${Math.round(withMaterialGroups/total*100)}%)`);
console.log(`With application: ${withApplication} (${Math.round(withApplication/total*100)}%)`);
console.log(`With geometry.diameter: ${withGeometry} (${Math.round(withGeometry/total*100)}%)`);
console.log('\nSample material_groups:', JSON.stringify(sampleMGs, null, 2));
