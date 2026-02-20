const fs = require('fs');
const path = require('path');

// Deep scan of ALL knowledge assets in the PRISM ecosystem
console.log('=== PRISM KNOWLEDGE ASSET DEEP SCAN ===\n');

// 1. Skills directory
console.log('--- SKILLS (C:\\PRISM\\skills-consolidated) ---');
function scanDir(dir, depth=0) {
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const e of entries) {
            if (e.name.startsWith('.') || e.name === 'node_modules') continue;
            const fp = path.join(dir, e.name);
            if (e.isDirectory() && depth < 2) {
                console.log('  '.repeat(depth) + '[DIR] ' + e.name);
                scanDir(fp, depth+1);
            } else if (e.isFile()) {
                const sz = fs.statSync(fp).size;
                if (sz > 1000) console.log('  '.repeat(depth) + e.name + ' (' + (sz/1024).toFixed(0) + 'KB)');
            }
        }
    } catch(e) {}
}
scanDir('C:\\PRISM\\skills-consolidated');

// 2. MCP Server data docs
console.log('\n--- DATA DOCS (mcp-server/data/docs) ---');
scanDir('C:\\PRISM\\mcp-server\\data\\docs');

// 3. Engines
console.log('\n--- ENGINES (calculation/intelligence) ---');
const engDir = 'C:\\PRISM\\mcp-server\\src\\engines';
for (const f of fs.readdirSync(engDir).filter(f => f.endsWith('.ts'))) {
    const content = fs.readFileSync(path.join(engDir, f), 'utf8');
    const exports = [...content.matchAll(/export\s+(function|class|const|interface)\s+(\w+)/g)].map(m => m[2]);
    const lines = content.split('\n').length;
    console.log(`  ${f} (${lines} lines, ${exports.length} exports): ${exports.slice(0,8).join(', ')}${exports.length > 8 ? '...' : ''}`);
}

// 4. Formulas
console.log('\n--- FORMULA REGISTRY ---');
try {
    const formulas = JSON.parse(fs.readFileSync('C:\\PRISM\\mcp-server\\data\\formulas\\FORMULA_REGISTRY.json', 'utf8'));
    console.log(`  Total formulas: ${formulas.formulas?.length || Object.keys(formulas).length}`);
    if (formulas.formulas) {
        const cats = {};
        for (const f of formulas.formulas) { cats[f.category || 'uncategorized'] = (cats[f.category || 'uncategorized'] || 0) + 1; }
        for (const [k,v] of Object.entries(cats)) console.log(`    ${k}: ${v}`);
    }
} catch(e) { console.log('  Error loading:', e.message); }

// 5. Registries
console.log('\n--- REGISTRIES ---');
const regDir = 'C:\\PRISM\\mcp-server\\src\\registries';
for (const f of fs.readdirSync(regDir).filter(f => f.endsWith('.ts'))) {
    const content = fs.readFileSync(path.join(regDir, f), 'utf8');
    const lines = content.split('\n').length;
    const methods = [...content.matchAll(/(public|private|protected)\s+(\w+)\s*\(/g)].map(m => m[2]);
    console.log(`  ${f} (${lines} lines): ${methods.slice(0,10).join(', ')}${methods.length > 10 ? '...' : ''}`);
}

// 6. Validation engines
console.log('\n--- VALIDATION ---');
const valDir = 'C:\\PRISM\\mcp-server\\src\\validation';
try {
    for (const f of fs.readdirSync(valDir).filter(f => f.endsWith('.ts'))) {
        const lines = fs.readFileSync(path.join(valDir, f), 'utf8').split('\n').length;
        console.log(`  ${f} (${lines} lines)`);
    }
} catch(e) {}

// 7. Data directories sizes
console.log('\n--- DATA VOLUMES ---');
function dirSize(dir) {
    let total = 0;
    try {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
            const fp = path.join(dir, e.name);
            if (e.isDirectory()) total += dirSize(fp);
            else total += fs.statSync(fp).size;
        }
    } catch(e) {}
    return total;
}
const dataDirs = ['materials', 'machines', 'tools', 'alarms', 'formulas', 'holders'];
for (const d of dataDirs) {
    const dp = path.join('C:\\PRISM\\data', d);
    const sz = dirSize(dp);
    if (sz > 0) console.log(`  ${d}: ${(sz/1024/1024).toFixed(1)}MB`);
}
const mcpData = dirSize('C:\\PRISM\\mcp-server\\data');
console.log(`  mcp-server/data: ${(mcpData/1024/1024).toFixed(1)}MB`);
