// Recovery script: extract autoHookWrapper.ts content from compiled bundle
const fs = require('fs');
const path = require('path');

const bundlePath = path.join(__dirname, '..', 'dist', 'index.js');
const outputPath = path.join(__dirname, '..', 'src', 'tools', 'autoHookWrapper.recovered.js');

const bundle = fs.readFileSync(bundlePath, 'utf-8');
const lines = bundle.split('\n');

// Find autoHookWrapper section boundaries
let startLine = -1;
let endLine = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('// src/tools/autoHookWrapper.ts')) {
    startLine = i;
  }
  // Next module after autoHookWrapper
  if (startLine > 0 && i > startLine + 10 && lines[i].includes('// src/tests/smokeTests.ts')) {
    endLine = i;
    break;
  }
}

if (startLine === -1 || endLine === -1) {
  console.log('ERROR: Could not find autoHookWrapper boundaries');
  console.log('Start:', startLine, 'End:', endLine);
  process.exit(1);
}

const extracted = lines.slice(startLine, endLine).join('\n');
fs.writeFileSync(outputPath, extracted);
console.log(`Extracted lines ${startLine+1}-${endLine+1} (${endLine-startLine} lines)`);
console.log(`Saved to: ${outputPath}`);
console.log(`Size: ${extracted.length} bytes`);
