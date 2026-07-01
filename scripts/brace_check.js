const fs = require('fs');
const code = fs.readFileSync(process.argv[2], 'utf8');
const lines = code.split('\n');
let depth = 0;
let inBlock = false;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  let prevDepth = depth;
  for (let j = 0; j < line.length; j++) {
    const c = line[j];
    const n = j + 1 < line.length ? line[j + 1] : '';
    if (inBlock) {
      if (c === '*' && n === '/') { inBlock = false; j++; }
      continue;
    }
    if (c === '/' && n === '/') break;
    if (c === '/' && n === '*') { inBlock = true; j++; continue; }
    // Skip double-quoted strings
    if (c === '"') {
      j++;
      while (j < line.length && line[j] !== '"') {
        if (line[j] === '\\') j++;
        j++;
      }
      continue;
    }
    // Skip single-quoted strings
    if (c === "'") {
      j++;
      while (j < line.length && line[j] !== "'") {
        if (line[j] === '\\') j++;
        j++;
      }
      continue;
    }
    if (c === '{') depth++;
    if (c === '}') depth--;
  }
  if (depth !== prevDepth) {
    if (line.match(/^function /) || Math.abs(depth - prevDepth) > 1 || (depth === 0 && prevDepth > 0)) {
      console.log(`Line ${i + 1}: ${prevDepth}->${depth} | ${line.substring(0, 90)}`);
    }
  }
}
console.log('\nFinal depth:', depth);

// Find where depth first exceeds expected
depth = 0;
inBlock = false;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  let prevDepth = depth;
  for (let j = 0; j < line.length; j++) {
    const c = line[j];
    const n = j + 1 < line.length ? line[j + 1] : '';
    if (inBlock) {
      if (c === '*' && n === '/') { inBlock = false; j++; }
      continue;
    }
    if (c === '/' && n === '/') break;
    if (c === '/' && n === '*') { inBlock = true; j++; continue; }
    if (c === '"') {
      j++;
      while (j < line.length && line[j] !== '"') {
        if (line[j] === '\\') j++;
        j++;
      }
      continue;
    }
    if (c === "'") {
      j++;
      while (j < line.length && line[j] !== "'") {
        if (line[j] === '\\') j++;
        j++;
      }
      continue;
    }
    if (c === '{') depth++;
    if (c === '}') depth--;
  }
  // Report where functions start at wrong depth
  if (line.match(/^function /) && depth !== 1) {
    console.log(`\nPROBLEM: Line ${i + 1} function at depth ${depth}: ${line.substring(0, 70)}`);
    // Show surrounding context
    for (let k = Math.max(0, i - 5); k <= i; k++) {
      console.log(`  ${k + 1}: ${lines[k].substring(0, 90)}`);
    }
    break;
  }
}
