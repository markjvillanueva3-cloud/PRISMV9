// Fix all JSON.stringify() bugs in PRISM dispatchers
const fs = require('fs');
const dir = 'C:\\PRISM\\mcp-server\\src\\tools\\dispatchers\\';

const fixes = {
  'atcsDispatcher.ts': [
    { line: 174, old: 'JSON.stringify()', new: 'JSON.stringify(data, null, 2)' },
    { line: 358, old: 'JSON.stringify()', new: 'JSON.stringify(data)' },
  ],
  'autonomousDispatcher.ts': [
    { line: 197, old: 'JSON.stringify()', new: 'JSON.stringify(config, null, 2)' },
    { line: 575, old: 'JSON.stringify()', new: 'JSON.stringify(batchOutput, null, 2)' },
    { line: 587, old: 'JSON.stringify()', new: 'JSON.stringify(data, null, 2)' },
    { line: 608, old: 'JSON.stringify()', new: 'JSON.stringify(manifest, null, 2)' },
    { line: 639, old: 'JSON.stringify()', new: 'JSON.stringify(data)' },
    { line: 958, old: 'JSON.stringify()', new: 'JSON.stringify(report, null, 2)' },
    { line: 1022, old: 'JSON.stringify()', new: 'JSON.stringify(manifest, null, 2)' },
    { line: 1039, old: 'JSON.stringify()', new: 'JSON.stringify(checkpoint, null, 2)' },
    { line: 1060, old: 'JSON.stringify()', new: 'JSON.stringify(manifest, null, 2)' },
  ],
  'autoPilotDispatcher.ts': [
    { line: 136, old: 'JSON.stringify()', new: 'JSON.stringify(result)' },
  ],
  'contextDispatcher.ts': [
    { line: 63, old: 'JSON.stringify()', new: 'JSON.stringify(data)' },
    { line: 102, old: 'JSON.stringify()', new: 'JSON.stringify(sorted, null, 2)' },
    { line: 217, old: 'JSON.stringify()', new: 'JSON.stringify(record, null, 2)' },
    { line: 496, old: 'JSON.stringify()', new: 'JSON.stringify(teamState, null, 2)' },
    { line: 572, old: 'JSON.stringify()', new: 'JSON.stringify(task, null, 2)' },
    { line: 581, old: 'JSON.stringify()', new: 'JSON.stringify(blocker, null, 2)' },
    { line: 617, old: 'JSON.stringify()', new: 'JSON.stringify(teamState, null, 2)' },
  ],
  'devDispatcher.ts': [
    { line: 177, old: 'JSON.stringify()', new: 'JSON.stringify(result)' },
  ],
  'documentDispatcher.ts': [
    { line: 190, old: 'JSON.stringify()', new: 'JSON.stringify(result)' },
  ],
  'generatorDispatcher.ts': [
    { line: 14, old: 'JSON.stringify()', new: 'JSON.stringify(data)' },
  ],
  'gsdDispatcher.ts': [
    { line: 110, old: 'JSON.stringify()', new: 'JSON.stringify(result)' },
  ],
};

let totalFixed = 0;
for (const [file, fileFixes] of Object.entries(fixes)) {
  const fp = dir + file;
  const lines = fs.readFileSync(fp, 'utf8').split('\n');
  let fixCount = 0;
  
  for (const fix of fileFixes) {
    const idx = fix.line - 1;
    if (lines[idx] && lines[idx].includes(fix.old)) {
      lines[idx] = lines[idx].replace(fix.old, fix.new);
      fixCount++;
    } else {
      console.log(`WARN: ${file}:${fix.line} - expected '${fix.old}' not found. Line: ${(lines[idx]||'').trim()}`);
    }
  }
  
  fs.writeFileSync(fp, lines.join('\n'));
  console.log(`${file}: ${fixCount}/${fileFixes.length} fixes applied`);
  totalFixed += fixCount;
}

console.log(`\nTOTAL: ${totalFixed} fixes applied`);
