const f = require('fs').readFileSync('C:\\PRISM\\mcp-server\\src\\tools\\dispatchers\\dataDispatcher.ts','utf8');
const cases = [...f.matchAll(/case "([\w]+)":/g)].map(m => m[1]);
console.log(cases.length + ' actions:');
cases.forEach(c => console.log('  ' + c));
