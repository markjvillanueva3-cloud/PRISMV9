const r = new RegExp('STATE_DIR', 'i');
console.log('Test /**:', r.test('/**'));
console.log('Test STATE_DIR:', r.test('const STATE_DIR = 123'));
console.log('Test empty:', r.test(''));

// Simulate what devDispatcher does
const fs = require('fs');
const path = require('path');
const MCP_ROOT = 'C:\\PRISM\\mcp-server';
const SRC_DIR = path.join(MCP_ROOT, 'src');
const pattern = 'STATE_DIR';
const regex = new RegExp(pattern, 'i');
let count = 0;
const file = path.join(SRC_DIR, 'config', 'api-config.ts');
const lines = fs.readFileSync(file, 'utf-8').split('\n');
lines.forEach((line, i) => {
  if (regex.test(line)) {
    count++;
    console.log(`MATCH L${i+1}: ${line.trim().substring(0, 80)}`);
  }
});
console.log(`Total matches in api-config.ts: ${count}`);
