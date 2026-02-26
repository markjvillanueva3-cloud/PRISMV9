const fs = require('fs');

// Check unwired dispatchers
console.log('=== UNWIRED / THIN DISPATCHERS ===\n');

// Safety dispatcher
console.log('--- safetyDispatcher (0 actions) ---');
const safety = fs.readFileSync('C:\\PRISM\\mcp-server\\src\\tools\\dispatchers\\safetyDispatcher.ts', 'utf8');
console.log('Lines:', safety.split('\n').length);
console.log('Has switch:', safety.includes('switch'));
const safetyImports = [...safety.matchAll(/import.*from\s+["']([^"']+)["']/g)].map(m => m[1]);
console.log('Imports:', safetyImports.join(', '));

// Thread dispatcher
console.log('\n--- threadDispatcher (0 actions) ---');
const thread = fs.readFileSync('C:\\PRISM\\mcp-server\\src\\tools\\dispatchers\\threadDispatcher.ts', 'utf8');
console.log('Lines:', thread.split('\n').length);
console.log('Has switch:', thread.includes('switch'));
const threadImports = [...thread.matchAll(/import.*from\s+["']([^"']+)["']/g)].map(m => m[1]);
console.log('Imports:', threadImports.join(', '));

// Toolpath dispatcher
console.log('\n--- toolpathDispatcher (8 actions) ---');
const tp = fs.readFileSync('C:\\PRISM\\mcp-server\\src\\tools\\dispatchers\\toolpathDispatcher.ts', 'utf8');
const tpCases = [...tp.matchAll(/case\s+["'](\w+)["']/g)].map(m => m[1]);
console.log('Actions:', tpCases.join(', '));

// What engines are NOT wired to ANY dispatcher?
console.log('\n=== ENGINES NOT WIRED TO DISPATCHERS ===');
const engDir = 'C:\\PRISM\\mcp-server\\src\\engines';
const engines = fs.readdirSync(engDir).filter(f => f.endsWith('.ts') && f !== 'index.ts');
const allDispatchers = fs.readdirSync('C:\\PRISM\\mcp-server\\src\\tools\\dispatchers').filter(f => f.endsWith('.ts'));
let allDispCode = '';
for (const d of allDispatchers) {
    allDispCode += fs.readFileSync('C:\\PRISM\\mcp-server\\src\\tools\\dispatchers\\' + d, 'utf8');
}
for (const eng of engines) {
    const name = eng.replace('.ts', '');
    const imported = allDispCode.includes(name) || allDispCode.includes(name.replace(/Engine$/, ''));
    if (!imported) console.log(`  NOT WIRED: ${eng}`);
}

// Check ToolpathStrategyRegistry methods
console.log('\n--- ToolpathStrategyRegistry ACCESSIBLE methods ---');
const tpsr = fs.readFileSync('C:\\PRISM\\mcp-server\\src\\registries\\ToolpathStrategyRegistry.ts', 'utf8');
const methods = [...tpsr.matchAll(/(?:public|async)\s+(\w+)\s*\(/g)].map(m => m[1]);
console.log('Methods:', methods.join(', '));

// Check what toolpathDispatcher actually exposes
console.log('\n--- toolpathDispatcher FULL ---');
const tpLines = tp.split('\n').length;
console.log('Lines:', tpLines);
// Show the action handlers
const tpSwitch = tp.indexOf('switch');
console.log(tp.substring(tpSwitch, tpSwitch + 800));
