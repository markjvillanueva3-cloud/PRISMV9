const c = require('fs').readFileSync('C:\\PRISM\\mcp-server\\src\\engines\\cadenceExecutor.ts', 'utf8');
console.log('Lines:', c.split('\n').length);

// Find cadence intervals
const intervals = c.match(/callNumber\s*%\s*\d+|every\s+\d+|@\s*\d+\s*calls/gi) || [];
console.log('\nCadence intervals:');
intervals.forEach(i => console.log('  ' + i));

// Find existing Python calls
const pyScripts = c.match(/runPythonScript|python|\.py/gi) || [];
console.log('\nPython references:', pyScripts.length);

// Find existing compaction/pressure/compress
const d2refs = ['compaction', 'compress', 'pressure', 'attention', 'auto_compress'];
console.log('\nD2 references in cadence:');
d2refs.forEach(r => {
  const count = (c.match(new RegExp(r, 'gi')) || []).length;
  if (count) console.log('  ' + r + ': ' + count + ' refs');
  else console.log('  ' + r + ': none');
});

// Show the main execution function
const execMatch = c.match(/async function execute[^{]*\{/);
if (execMatch) console.log('\nMain exec:', execMatch[0]);
