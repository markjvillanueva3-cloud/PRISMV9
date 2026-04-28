// Identify engines exported as singletons but never imported by any dispatcher.
// Groups them by likely affinity so we can pick the next U-WIRE batch.
const fs = require('fs');
const path = require('path');

const ROOT = 'H:\\prism\\mcp-server\\src';
const ENG_DIR = path.join(ROOT, 'engines');
const DISP_DIR = path.join(ROOT, 'tools', 'dispatchers');

const engines = fs.readdirSync(ENG_DIR).filter(f => f.endsWith('.ts') && f !== 'index.ts');
const dispatchers = fs.readdirSync(DISP_DIR).filter(f => f.endsWith('.ts'));

let allDispCode = '';
const dispImports = new Map();
for (const d of dispatchers) {
  const code = fs.readFileSync(path.join(DISP_DIR, d), 'utf8');
  allDispCode += code;
  dispImports.set(d, code);
}

// "wired" = either the file name OR the lower-camel singleton name appears in dispatcher code
const unwired = [];
for (const eng of engines) {
  const base = eng.replace('.ts', '');                              // e.g. AdaptiveChatterEngine
  const singleton = base[0].toLowerCase() + base.slice(1);          // adaptiveChatterEngine
  const fileRef = `from "../engines/${base}.js"` ;                  // import path
  const wired =
    allDispCode.includes(fileRef) ||
    allDispCode.includes(`from "../../engines/${base}.js"`) ||
    allDispCode.includes(`/${base}.js`) ||
    allDispCode.includes(singleton);
  if (!wired) unwired.push(base);
}

// Group by name prefix (rough domain affinity)
const groups = {};
for (const e of unwired) {
  const pref = e.match(/^[A-Z][a-z]+/)?.[0] || 'Misc';
  (groups[pref] = groups[pref] || []).push(e);
}

console.log(`Total engines: ${engines.length}`);
console.log(`Unwired (no dispatcher import + no singleton ref): ${unwired.length}\n`);

const ordered = Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
for (const [pref, list] of ordered) {
  if (list.length < 2) continue;
  console.log(`[${pref}] ${list.length}`);
  for (const e of list.slice(0, 12)) console.log(`  ${e}`);
  if (list.length > 12) console.log(`  ... +${list.length - 12} more`);
  console.log('');
}

// Also dump small/orphan singletons
const singles = ordered.filter(([_, l]) => l.length < 2).flatMap(([_, l]) => l);
if (singles.length) {
  console.log(`[Singletons] ${singles.length}`);
  for (const e of singles.slice(0, 30)) console.log(`  ${e}`);
  if (singles.length > 30) console.log(`  ... +${singles.length - 30} more`);
}
