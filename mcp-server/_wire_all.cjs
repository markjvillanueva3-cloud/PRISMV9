const fs = require('fs');

// === 1. Wire materialSanity into dataDispatcher ===
const dataPath = 'C:\\PRISM\\mcp-server\\src\\tools\\dispatchers\\dataDispatcher.ts';
let data = fs.readFileSync(dataPath, 'utf-8');
const dataOld = `import { hookExecutor } from "../../engines/HookExecutor.js";`;
const dataNew = `import { hookExecutor } from "../../engines/HookExecutor.js";
import { validateMaterialSanity } from "../../validation/materialSanity.js";`;
if (data.includes(dataOld) && !data.includes('validateMaterialSanity')) {
  data = data.replace(dataOld, dataNew);
  fs.writeFileSync(dataPath, data, 'utf-8');
  console.log('1. dataDispatcher: materialSanity import added');
} else {
  console.log('1. dataDispatcher: SKIP (already wired or pattern changed)');
}

// === 2. Wire atomicWrite into sessionDispatcher ===
const sessPath = 'C:\\PRISM\\mcp-server\\src\\tools\\dispatchers\\sessionDispatcher.ts';
let sess = fs.readFileSync(sessPath, 'utf-8');
if (!sess.includes('atomicWrite')) {
  // Find the last import line and add after it
  const lines = sess.split('\n');
  let lastImportIdx = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('import ')) lastImportIdx = i;
  }
  lines.splice(lastImportIdx + 1, 0, 'import { atomicWrite } from "../../utils/atomicWrite.js";');
  fs.writeFileSync(sessPath, lines.join('\n'), 'utf-8');
  console.log('2. sessionDispatcher: atomicWrite import added');
} else {
  console.log('2. sessionDispatcher: SKIP (already wired)');
}

// === 3. Wire PrismError into safetyDispatcher ===
const safetyPath = 'C:\\PRISM\\mcp-server\\src\\tools\\dispatchers\\safetyDispatcher.ts';
let safety = fs.readFileSync(safetyPath, 'utf-8');
if (!safety.includes('SafetyBlockError')) {
  const sLines = safety.split('\n');
  let sLastImport = 0;
  for (let i = 0; i < sLines.length; i++) {
    if (sLines[i].startsWith('import ')) sLastImport = i;
  }
  sLines.splice(sLastImport + 1, 0, 'import { SafetyBlockError } from "../../errors/PrismError.js";');
  fs.writeFileSync(safetyPath, sLines.join('\n'), 'utf-8');
  console.log('3. safetyDispatcher: SafetyBlockError import added');
} else {
  console.log('3. safetyDispatcher: SKIP (already wired)');
}

// === 4. Wire atomicWrite into documentDispatcher ===
const docPath = 'C:\\PRISM\\mcp-server\\src\\tools\\dispatchers\\documentDispatcher.ts';
let doc = fs.readFileSync(docPath, 'utf-8');
if (!doc.includes('atomicWrite')) {
  const dLines = doc.split('\n');
  let dLastImport = 0;
  for (let i = 0; i < dLines.length; i++) {
    if (dLines[i].startsWith('import ')) dLastImport = i;
  }
  dLines.splice(dLastImport + 1, 0, 'import { atomicWrite } from "../../utils/atomicWrite.js";');
  fs.writeFileSync(docPath, dLines.join('\n'), 'utf-8');
  console.log('4. documentDispatcher: atomicWrite import added');
} else {
  console.log('4. documentDispatcher: SKIP (already wired)');
}

// === 5. Wire getEffort into api-config ===
const apiPath = 'C:\\PRISM\\mcp-server\\src\\config\\api-config.ts';
let api = fs.readFileSync(apiPath, 'utf-8');
if (!api.includes('getEffort')) {
  api = api.replace(
    'import Anthropic from "@anthropic-ai/sdk";',
    'import Anthropic from "@anthropic-ai/sdk";\nimport { getEffort } from "./effortTiers.js";'
  );
  fs.writeFileSync(apiPath, api, 'utf-8');
  console.log('5. api-config: getEffort import added');
} else {
  console.log('5. api-config: SKIP (already wired)');
}

console.log('\\nAll import wiring complete.');
