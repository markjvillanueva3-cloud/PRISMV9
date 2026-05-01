const fs = require('fs');
const path = require('path');
const dir = 'C:\\PRISM\\mcp-server\\src\\tools\\dispatchers';
let totalActions = 0;
fs.readdirSync(dir).filter(f => f.endsWith('.ts')).forEach(f => {
  const c = fs.readFileSync(path.join(dir, f), 'utf8');
  const m = c.match(/const ACTIONS\s*=\s*\[([\s\S]*?)\]\s*as const/);
  if (m) {
    const actions = m[1].match(/"[^"]+"/g);
    const count = actions ? actions.length : 0;
    totalActions += count;
    console.log(f + ': ' + count + ' actions');
  } else {
    console.log(f + ': NO_ACTIONS_ARRAY');
  }
});
console.log('TOTAL: ' + totalActions + ' actions');
