const fs = require('fs');
const path = require('path');
const TOOL_DIR = 'C:\\PRISM\\data\\tools';
const files = fs.readdirSync(TOOL_DIR).filter(f => f.endsWith('.json') && f !== 'TOOLS_HIERARCHY.json');

let total = 0, withVendor = 0, withMfr = 0, withCutParams = 0, withCutData = 0;

for (const file of files) {
    const fp = path.join(TOOL_DIR, file);
    const raw = fs.readFileSync(fp, 'utf8').replace(/^\uFEFF/, '');
    const json = JSON.parse(raw);
    const arr = json.tools || (Array.isArray(json) ? json : [json]);
    
    let fv = 0, fm = 0, fcp = 0;
    for (const t of arr) {
        total++;
        if (t.vendor) { withVendor++; fv++; }
        if (t.manufacturer) { withMfr++; fm++; }
        if (t.cutting_params) { withCutParams++; fcp++; }
        if (t.cutting_data) withCutData++;
    }
    console.log(`${file}: ${arr.length} | vendor=${fv} mfr=${fm} cut_params=${fcp} (${Math.round(fcp/arr.length*100)}%)`);
}

console.log(`\nTOTAL: ${total}`);
console.log(`  vendor: ${withVendor} (${Math.round(withVendor/total*100)}%)`);
console.log(`  manufacturer: ${withMfr} (${Math.round(withMfr/total*100)}%)`);
console.log(`  cutting_params: ${withCutParams} (${Math.round(withCutParams/total*100)}%)`);
