const fs = require('fs');
const path = require('path');

const TOOL_DIR = 'C:\\PRISM\\data\\tools';
let byFile = {};

for (const f of fs.readdirSync(TOOL_DIR).filter(f => f.endsWith('.json') && f !== 'TOOLS_HIERARCHY.json')) {
    const json = JSON.parse(fs.readFileSync(path.join(TOOL_DIR, f), 'utf8').replace(/^\uFEFF/, ''));
    const arr = json.tools || (Array.isArray(json) ? json : [json]);
    
    let total = 0, noDiam = 0, noCutParams = 0;
    for (const t of arr) {
        total++;
        if (!t.cutting_diameter_mm || t.cutting_diameter_mm <= 0) noDiam++;
        if (!t.cutting_params) noCutParams++;
    }
    
    if (noDiam > 0 || noCutParams > 0) {
        console.log(`${f}: ${total} tools | no diameter: ${noDiam} | no cutting_params: ${noCutParams}`);
        if (arr[0]) {
            const keys = Object.keys(arr[0]);
            // Check for diameter aliases
            const dimKeys = keys.filter(k => k.toLowerCase().includes('diam') || k.toLowerCase().includes('bore') || k.toLowerCase().includes('size'));
            if (dimKeys.length > 0) console.log(`  Diameter aliases found: ${dimKeys.join(', ')}`);
        }
    }
}
