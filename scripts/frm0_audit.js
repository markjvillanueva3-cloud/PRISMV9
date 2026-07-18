const fs = require('fs');
const path = require('path');

// Find all formula files
const dataDir = 'C:\\PRISM\\data';
const files = fs.readdirSync(dataDir).filter(f => f.toLowerCase().includes('formula'));
console.log('Formula files in data/:', files);

// Also check mcp-server/data
const mcpData = 'C:\\PRISM\\mcp-server\\data';
const mcpFiles = fs.readdirSync(mcpData).filter(f => f.toLowerCase().includes('formula'));
console.log('Formula files in mcp-server/data/:', mcpFiles);

// Load and list all existing formulas
let allFormulas = [];
for (const f of files) {
    const fp = path.join(dataDir, f);
    try {
        const raw = fs.readFileSync(fp, 'utf8').replace(/^\uFEFF/, '');
        const json = JSON.parse(raw);
        const arr = json.formulas || (Array.isArray(json) ? json : [json]);
        for (const fm of arr) {
            allFormulas.push({ id: fm.id || fm.formula_id, name: fm.name, domain: fm.domain, file: f });
        }
    } catch(e) {}
}
for (const f of mcpFiles) {
    const fp = path.join(mcpData, f);
    try {
        const raw = fs.readFileSync(fp, 'utf8').replace(/^\uFEFF/, '');
        const json = JSON.parse(raw);
        const arr = json.formulas || (Array.isArray(json) ? json : [json]);
        for (const fm of arr) {
            allFormulas.push({ id: fm.id || fm.formula_id, name: fm.name, domain: fm.domain, file: f });
        }
    } catch(e) {}
}

console.log(`\nTotal formulas found: ${allFormulas.length}`);
console.log('\nExisting formulas:');
for (const f of allFormulas) {
    console.log(`  ${f.id}: ${f.name} [${f.domain}] (${f.file})`);
}

// Also check what prism_calc supports
console.log('\n=== Checking calcDispatcher actions ===');
const calcPath = 'C:\\PRISM\\mcp-server\\src\\tools\\dispatchers\\calcDispatcher.ts';
const calcSrc = fs.readFileSync(calcPath, 'utf8');
const actionMatches = calcSrc.match(/case\s+'([^']+)'/g);
if (actionMatches) {
    console.log('Calc dispatcher actions:');
    for (const m of actionMatches) {
        console.log('  ' + m.replace("case '", '').replace("'", ''));
    }
}
