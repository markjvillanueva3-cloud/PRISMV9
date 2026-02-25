const f = require('fs').readFileSync('C:\\PRISM\\mcp-server\\src\\tools\\dispatchers\\calcDispatcher.ts', 'utf8');
const i = f.indexOf('case "cutting_force"');
console.log(f.substring(i, i + 800));
