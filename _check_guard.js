const c = require('fs').readFileSync('C:\\PRISM\\mcp-server\\src\\tools\\dispatchers\\guardDispatcher.ts', 'utf8');
console.log('Lines:', c.split('\n').length);

// Extract ACTIONS array
const actMatch = c.match(/const ACTIONS = \[([\s\S]*?)\]/);
if (actMatch) {
  const acts = actMatch[1].match(/"([^"]+)"/g)?.map(s => s.replace(/"/g, ''));
  console.log('\nDeclared ACTIONS:', acts?.length, acts);
}

// Check for imports
console.log('\nHas execSync:', c.includes('execSync'));
console.log('Has runPythonScript:', c.includes('runPythonScript'));
console.log('Has SCRIPTS_DIR:', c.includes('SCRIPTS_DIR'));
