// Run: node scripts/register_atcs.js
// Adds ATCS dispatcher (prism_atcs) registration to index.ts
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'index.ts');
console.log('Reading:', filePath);
let content = fs.readFileSync(filePath, 'utf-8');
const originalLines = content.split('\n').length;

// Check if already registered
if (content.includes('registerAtcsDispatcher')) {
  console.log('ALREADY REGISTERED - atcsDispatcher is already in index.ts');
  process.exit(0);
}

// Edit 1: Add import after guardDispatcher import
const importTarget = 'import { registerGuardDispatcher } from "./tools/dispatchers/guardDispatcher.js";';
if (!content.includes(importTarget)) {
  console.error('FAILED: Could not find guardDispatcher import line');
  process.exit(1);
}
content = content.replace(
  importTarget,
  importTarget + '\n\n// ATCS: Autonomous Task Completion System (Dispatcher #23)\nimport { registerAtcsDispatcher } from "./tools/dispatchers/atcsDispatcher.js";'
);
console.log('Edit 1: Import added');

// Edit 2: Add registration after guardDispatcher registration log
const regTarget = '  log.debug("Registered: prism_guard dispatcher (8 actions, replaces reasoning + enforcement + autoHook)");';
if (!content.includes(regTarget)) {
  console.error('FAILED: Could not find guardDispatcher registration log line');
  process.exit(1);
}
content = content.replace(
  regTarget,
  regTarget + '\n  \n  // DISPATCHER: Autonomous Task Completion System (10 actions -> 1 dispatcher)\n  registerAtcsDispatcher(server);\n  log.debug("Registered: prism_atcs dispatcher (10 actions) — Autonomous Task Completion System");'
);
console.log('Edit 2: Registration added');

// Edit 3: Update dispatcher count
const countTarget = '21 dispatchers + 1 autoHook proxy = ~22 tool definitions';
if (content.includes(countTarget)) {
  content = content.replace(countTarget, '22 dispatchers + 1 autoHook proxy = ~23 tool definitions');
  console.log('Edit 3: Count updated 21->22');
} else {
  console.log('Edit 3: Count string not found (may already be updated), skipping');
}

// Verify
const newLines = content.split('\n').length;
console.log(`Lines: ${originalLines} -> ${newLines} (+${newLines - originalLines})`);
console.log('Verify import:', content.includes('registerAtcsDispatcher') ? 'OK' : 'MISSING');
console.log('Verify registration:', content.includes('prism_atcs dispatcher') ? 'OK' : 'MISSING');

// Write
fs.writeFileSync(filePath, content, 'utf-8');
console.log('\nSUCCESS: index.ts updated with ATCS dispatcher registration');
console.log('Next: npm run build');
