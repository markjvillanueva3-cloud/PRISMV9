const fs = require('fs');
const path = require('path');

const TOOL_DIR = 'C:\\PRISM\\data\\tools';
const files = fs.readdirSync(TOOL_DIR).filter(f => f.endsWith('.json'));

console.log(`Tool files: ${files.length}`);
console.log(files.join('\n'));

// Sample each file: count, top-level keys, ID format
let totalTools = 0;
let schemaVariants = {};

for (const file of files) {
    const fp = path.join(TOOL_DIR, file);
    let raw = fs.readFileSync(fp, 'utf8').replace(/^\uFEFF/, '');
    let json;
    try { json = JSON.parse(raw); } catch(e) { console.log(`ERROR: ${file}: ${e.message}`); continue; }
    
    const arr = json.tools || (Array.isArray(json) ? json : [json]);
    const first = arr[0];
    if (!first) { console.log(`  ${file}: EMPTY`); continue; }
    
    const keys = Object.keys(first).sort().join('|');
    if (!schemaVariants[keys]) schemaVariants[keys] = { count: 0, files: [], sample_id: first.id || first.tool_id };
    schemaVariants[keys].count += arr.length;
    schemaVariants[keys].files.push(file);
    
    totalTools += arr.length;
    
    // Check specific problem fields
    let hasVendor = 0, hasManufacturer = 0, hasCuttingParams = 0, hasCuttingData = 0;
    for (const t of arr) {
        if (t.vendor) hasVendor++;
        if (t.manufacturer) hasManufacturer++;
        if (t.cutting_params) hasCuttingParams++;
        if (t.cutting_data) hasCuttingData++;
    }
    
    console.log(`  ${file}: ${arr.length} tools, vendor=${hasVendor} mfr=${hasManufacturer} cut_params=${hasCuttingParams} cut_data=${hasCuttingData}`);
}

console.log(`\nTotal tools: ${totalTools}`);
console.log(`\nSchema variants: ${Object.keys(schemaVariants).length}`);
for (const [keys, info] of Object.entries(schemaVariants)) {
    const shortKeys = keys.split('|').filter(k => !['id','name','type','category','subcategory'].includes(k)).join(', ');
    console.log(`\n  Variant (${info.count} tools in ${info.files.length} files):`);
    console.log(`    Files: ${info.files.join(', ')}`);
    console.log(`    Sample ID: ${info.sample_id}`);
    console.log(`    Extra keys: ${shortKeys}`);
}
