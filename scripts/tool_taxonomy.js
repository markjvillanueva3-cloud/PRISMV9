const fs = require('fs');
const path = require('path');
const TOOL_DIR = 'C:\\PRISM\\data\\tools';

let categories = {};
let types = {};
let subcategories = {};

for (const f of fs.readdirSync(TOOL_DIR).filter(f => f.endsWith('.json') && f !== 'TOOLS_HIERARCHY.json')) {
    const json = JSON.parse(fs.readFileSync(path.join(TOOL_DIR, f), 'utf8').replace(/^\uFEFF/, ''));
    for (const t of (json.tools || [])) {
        const cat = t.category || 'NONE';
        const type = t.type || 'NONE';
        const sub = t.subcategory || 'NONE';
        categories[cat] = (categories[cat] || 0) + 1;
        types[type] = (types[type] || 0) + 1;
        subcategories[sub] = (subcategories[sub] || 0) + 1;
    }
}

console.log('=== CATEGORIES ===');
for (const [k,v] of Object.entries(categories).sort((a,b) => b[1]-a[1])) console.log(`  ${k}: ${v}`);
console.log('\n=== TYPES (top 25) ===');
for (const [k,v] of Object.entries(types).sort((a,b) => b[1]-a[1]).slice(0,25)) console.log(`  ${k}: ${v}`);
console.log('\n=== SUBCATEGORIES (top 20) ===');
for (const [k,v] of Object.entries(subcategories).sort((a,b) => b[1]-a[1]).slice(0,20)) console.log(`  ${k}: ${v}`);
