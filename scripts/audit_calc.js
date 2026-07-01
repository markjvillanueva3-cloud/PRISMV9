const fs = require('fs');

// List all calc actions
const calcFile = fs.readFileSync('C:\\PRISM\\mcp-server\\src\\tools\\dispatchers\\calcDispatcher.ts', 'utf8');
const cases = [...calcFile.matchAll(/case "([\w]+)":/g)].map(m => m[1]);
console.log(cases.length + ' calc actions:');
cases.forEach(c => console.log('  ' + c));

// List all dispatchers registered
const indexFile = fs.readFileSync('C:\\PRISM\\mcp-server\\src\\index.ts', 'utf8');
const dispatchers = [...indexFile.matchAll(/register(\w+Dispatcher)/g)].map(m => m[1]);
console.log('\n' + dispatchers.length + ' dispatchers registered:');
dispatchers.forEach(d => console.log('  ' + d));
