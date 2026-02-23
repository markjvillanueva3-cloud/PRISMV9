const fs = require('fs');
const path = require('path');

console.log('=== FORENSIC DATA UTILIZATION AUDIT ===\n');

// 1. Get a sample material with ALL fields
const matSample = JSON.parse(fs.readFileSync('C:\\PRISM\\data\\materials\\steel\\AISI_4140.json', 'utf8').replace(/^\uFEFF/, ''));
console.log('--- MATERIAL DATA FIELDS (AISI 4140 sample) ---');

function listFields(obj, prefix = '', depth = 0) {
    const fields = [];
    for (const [k, v] of Object.entries(obj)) {
        const path = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === 'object' && !Array.isArray(v) && depth < 3) {
            fields.push(...listFields(v, path, depth + 1));
        } else {
            fields.push({ path, type: Array.isArray(v) ? 'array' : typeof v, sample: JSON.stringify(v).substring(0, 60) });
        }
    }
    return fields;
}

const matFields = listFields(matSample);
console.log(`Total fields: ${matFields.length}`);

// Now check which fields are actually referenced in any engine or dispatcher
const srcDir = 'C:\\PRISM\\mcp-server\\src';
function getAllTsFiles(dir) {
    let files = [];
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.name === 'node_modules' || e.name === '.git') continue;
        const fp = path.join(dir, e.name);
        if (e.isDirectory()) files = files.concat(getAllTsFiles(fp));
        else if (e.name.endsWith('.ts')) files.push(fp);
    }
    return files;
}

const allCode = getAllTsFiles(srcDir).map(f => fs.readFileSync(f, 'utf8')).join('\n');

const used = [];
const unused = [];
for (const f of matFields) {
    const leafKey = f.path.split('.').pop();
    // Check if this field name appears in any source code
    const isUsed = allCode.includes(leafKey) || allCode.includes(`'${leafKey}'`) || allCode.includes(`"${leafKey}"`);
    if (isUsed) used.push(f.path);
    else unused.push(f.path);
}

console.log(`\nUSED in code (${used.length}):`);
used.forEach(f => console.log(`  ✓ ${f}`));
console.log(`\nNOT FOUND in code (${unused.length}):`);
unused.forEach(f => console.log(`  ✗ ${f}`));
