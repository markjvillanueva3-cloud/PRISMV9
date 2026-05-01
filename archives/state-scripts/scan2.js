const fs = require('fs');
const content = fs.readFileSync('C:\\\\PRISM\\\\mcp-server\\\\src\\\\tools\\\\autoHookWrapper.ts', 'utf-8');
const lines = content.split('\n');
const issues = [];
for (let i = 500; i < Math.min(lines.length, 1900); i++) {
  const line = lines[i];
  if (/[^a-zA-Z_.]action[^2a-zA-Z_]/.test(line) && !/\/\//.test(line.trimStart().substring(0,2))) {
    issues.push('Line ' + (i+1) + ': ' + line.trim().substring(0, 120));
  }
}
fs.writeFileSync('C:\\\\PRISM\\\\state\\\\action_scan.txt', issues.join('\n') || 'CLEAN');