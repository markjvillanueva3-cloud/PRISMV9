const fs = require('fs');

function scanFile(filepath) {
  const code = fs.readFileSync(filepath, 'utf8');
  const lines = code.split('\n');
  const stubs = ['TODO', 'FIXME', 'PLACEHOLDER', 'TBD', 'INSERT HERE', 'FILL IN', 'REPLACE WITH', 'NEED TO ADD', 'lorem ipsum'];
  const skipPatterns = ['STUB_LITERALS', 'SUSPICIOUS_', '"TODO"', '"FIXME"', '"TBD"', '"PLACEHOLDER"', '"STUB"', "'TODO'", "'FIXME'", 'no TODO', 'No stubs'];
  const hits = [];
  
  lines.forEach((line, i) => {
    const shouldSkip = skipPatterns.some(p => line.includes(p));
    if (shouldSkip) return;
    
    stubs.forEach(s => {
      if (line.toUpperCase().includes(s)) {
        hits.push({ line: i + 1, stub: s, text: line.trim().slice(0, 100) });
      }
    });
  });
  
  return { file: filepath, total_lines: lines.length, stub_hits: hits.length, hits };
}

const files = [
  'src/tools/dispatchers/autonomousDispatcher.ts',
  'src/tools/dispatchers/spDispatcher.ts'
];

const results = files.map(f => scanFile(f));
console.log(JSON.stringify(results, null, 2));
