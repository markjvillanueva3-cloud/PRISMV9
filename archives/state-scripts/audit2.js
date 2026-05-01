const fs = require('fs');
const dir = 'C:\\PRISM\\mcp-server\\src\\tools\\dispatchers\\';
['dataDispatcher.ts','safetyDispatcher.ts','threadDispatcher.ts','toolpathDispatcher.ts'].forEach(f => {
  const c = fs.readFileSync(dir + f, 'utf8');
  const cases = c.match(/case "([^"]+)":/g);
  const unique = cases ? [...new Set(cases.map(c => c.replace('case "','').replace('":','')))].length : 0;
  console.log(f + ': ' + unique + ' unique actions');
});
