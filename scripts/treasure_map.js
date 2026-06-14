const fs = require('fs');

// Check what the safety tools files expose
console.log('=== SAFETY TOOLS (unwired to dispatcher) ===\n');

const toolsDir = 'C:\\PRISM\\mcp-server\\src\\tools';
const safetyTools = ['collisionTools.ts', 'coolantValidationTools.ts', 'spindleProtectionTools.ts', 
                      'toolBreakageTools.ts', 'workholdingTools.ts', 'threadTools.ts'];

for (const tf of safetyTools) {
    try {
        const content = fs.readFileSync(toolsDir + '\\' + tf, 'utf8');
        const exports = [...content.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g)].map(m => m[1]);
        console.log(`${tf}: ${exports.join(', ')}`);
    } catch(e) {
        console.log(`${tf}: NOT FOUND`);
    }
}

// Check ThreadCalculationEngine methods more carefully
console.log('\n=== THREAD CALCULATION ENGINE ===');
const tce = fs.readFileSync('C:\\PRISM\\mcp-server\\src\\engines\\ThreadCalculationEngine.ts', 'utf8');
const tceFunctions = [...tce.matchAll(/(?:export\s+)?(?:async\s+)?(?:function|static)\s+(\w+)|(\w+)\s*(?:=\s*(?:async\s+)?\(|:\s*\()/g)]
    .map(m => m[1] || m[2]).filter(Boolean);
console.log('Functions/methods:', tceFunctions.join(', '));

// Lines and size
console.log('Lines:', tce.split('\n').length);

// Check ToolBreakageEngine functions
console.log('\n=== TOOL BREAKAGE ENGINE ===');
const tbe = fs.readFileSync('C:\\PRISM\\mcp-server\\src\\engines\\ToolBreakageEngine.ts', 'utf8');
const tbeFunctions = [...tbe.matchAll(/(?:export\s+)?function\s+(\w+)/g)].map(m => m[1]);
console.log('Functions:', tbeFunctions.join(', '));

// Check WorkholdingEngine  
console.log('\n=== WORKHOLDING ENGINE ===');
const whe = fs.readFileSync('C:\\PRISM\\mcp-server\\src\\engines\\WorkholdingEngine.ts', 'utf8');
const wheFunctions = [...whe.matchAll(/(?:export\s+)?function\s+(\w+)/g)].map(m => m[1]);
console.log('Functions:', wheFunctions.join(', '));

// Check CollisionEngine
console.log('\n=== COLLISION ENGINE ===');
const ce = fs.readFileSync('C:\\PRISM\\mcp-server\\src\\engines\\CollisionEngine.ts', 'utf8');
const ceFunctions = [...ce.matchAll(/(?:export\s+)?function\s+(\w+)/g)].map(m => m[1]);
console.log('Functions:', ceFunctions.join(', '));

// Check SpindleProtectionEngine
console.log('\n=== SPINDLE PROTECTION ENGINE ===');
const spe = fs.readFileSync('C:\\PRISM\\mcp-server\\src\\engines\\SpindleProtectionEngine.ts', 'utf8');
const speFunctions = [...spe.matchAll(/(?:export\s+)?function\s+(\w+)/g)].map(m => m[1]);
console.log('Functions:', speFunctions.join(', '));

// Check CoolantValidationEngine
console.log('\n=== COOLANT VALIDATION ENGINE ===');
const cve = fs.readFileSync('C:\\PRISM\\mcp-server\\src\\engines\\CoolantValidationEngine.ts', 'utf8');
const cveFunctions = [...cve.matchAll(/(?:export\s+)?function\s+(\w+)/g)].map(m => m[1]);
console.log('Functions:', cveFunctions.join(', '));
