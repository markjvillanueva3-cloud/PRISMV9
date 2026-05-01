const c = require('fs').readFileSync('C:\\PRISM\\mcp-server\\src\\tools\\cadenceExecutor.ts', 'utf8');
const lines = c.split('\n');
const exps = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (line.startsWith('export ') && line.includes('function')) {
    const name = line.match(/function\s+(\w+)/)?.[1] || 'unknown';
    exps.push(`L${i+1}: ${name}`);
  }
}
console.log('Exported functions (' + exps.length + '):');
exps.forEach(e => console.log('  ' + e));
