#!/usr/bin/env node
/**
 * Generates barrel exports for all unexported engines in src/engines/index.ts
 * Usage: node scripts/gen-engine-exports.mjs [--dry-run] [--domain physics|cam|business|all]
 */
import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const ENGINES_DIR = join(import.meta.dirname, '..', 'src', 'engines');
const INDEX_PATH = join(ENGINES_DIR, 'index.ts');
const SKIP_FILES = new Set(['index.ts', 'reactiveChainBootstrap.ts']);

const dryRun = process.argv.includes('--dry-run');
const domainArg = process.argv.find(a => a.startsWith('--domain='))?.split('=')[1] || 'all';

// Read current index.ts to find already-exported files AND already-exported names
const indexContent = readFileSync(INDEX_PATH, 'utf8');
const alreadyExported = new Set();
for (const match of indexContent.matchAll(/from\s+['"]\.\/([\w-]+)(?:\.js)?['"]/g)) {
  alreadyExported.add(match[1]);
}

// Collect all names already exported (to avoid duplicate identifier errors)
const alreadyExportedNames = new Set();
// Match: export { Name1, Name2, type Name3 } from '...';
for (const match of indexContent.matchAll(/export\s*\{([^}]+)\}/g)) {
  const names = match[1].split(',').map(n => n.trim().replace(/^type\s+/, ''));
  for (const n of names) {
    if (n) alreadyExportedNames.add(n);
  }
}
// Match: export const name, export class Name, export function name, etc.
for (const match of indexContent.matchAll(/export\s+(?:const|class|function|enum|interface|type)\s+(\w+)/g)) {
  alreadyExportedNames.add(match[1]);
}
console.log(`Already exported names: ${alreadyExportedNames.size}`);

// Get all .ts files in src/engines/ (top-level only)
const allFiles = readdirSync(ENGINES_DIR)
  .filter(f => f.endsWith('.ts') && !f.endsWith('.test.ts') && !f.endsWith('.spec.ts') && !f.endsWith('.d.ts'))
  .filter(f => !SKIP_FILES.has(f));

// Find unexported files
const unexported = allFiles
  .map(f => f.replace(/\.ts$/, ''))
  .filter(name => !alreadyExported.has(name));

console.log(`Total engine files: ${allFiles.length}`);
console.log(`Already exported: ${alreadyExported.size}`);
console.log(`Unexported: ${unexported.length}`);

// Domain classification patterns
const domains = {
  physics: /force|thermal|heat|temperature|kienzle|taylor|wear|friction|stress|strain|creep|fatigue|deflect|vibrat|chatter|stability|damp|modal|harmonic|cutting(?!tool)|speed.?feed|mrr|chip|surface.?finish|roughness|residual|stochastic/i,
  cam: /toolpath|post.?proc|gcode|g.?code|cam[A-Z]|mastercam|fusion|solidcam|esprit|strategy|nest|contour|pocket|profile|adaptive|trochoidal|peel|ramp/i,
  machine: /machine|spindle|axis|kinematic|fixture|workhold|chuck|turret|pallet|probe|calibrat|alignment|warm.?up|backlash|encoder|servo/i,
  tool: /^tool[A-Z]|insert|holder|collet|boring.?bar|end.?mill|drill|tap|ream|thread|cutter|carbide|ceramic|cbn|diamond|coating/i,
  material: /material|stock|alloy|steel|aluminum|titanium|inconel|composite|polymer|hardness|tensile|yield/i,
  quality: /quality|inspect|spc|cpk|gauge|gdt|tolerance|metrol|fai|cert|measure|cmm|roundness/i,
  business: /business|quote|cost|price|invoice|order|customer|vendor|supplier|erp|gl|ledger|payroll|employee|roi|capacity|oee|schedule|inventory|warehouse/i,
  edm_laser: /edm|laser|waterjet|grind|plasma|electrochem|abrasive|hone|lap|polish|burnish|shot.?peen/i,
  turning: /turn(?!ing.?program)|lathe|thread(?!ed)|taper|boring|facing|parting|bar.?feed|live.?tool|sub.?spindle/i,
  multiaxis: /five.?axis|5.?axis|multi.?axis|swarf|impeller|blade|blisk|undercut|tcp|rtcp/i,
  learning: /learn|knowledge|training|apprentice|playbook|tribal|onboard|course|quiz|certif|mentor/i,
  mech_design: /gear|bearing|spring|bolt|shaft|weld|seal|gasket|flange|pipe|vessel|beam|column|plate|rivet|fastener|clutch|brake|coupling|flywheel|cam(?!x)/i,
  safety: /safety|compliance|guard|osha|risk|audit|lockout|hazard|ergon/i,
  integration: /bridge|connect|mqtt|mtconnect|opcua|api|webhook|sync|protocol|adapter|import|export(?!er)/i,
  coolant: /coolant|fluid|lubri|mql|cryo|emulsion|mist|filtrat|chip.?conv/i,
  forming: /form(?!at|ula)|mold|cast|stamp|extru|sheet.?metal|bend|draw|forge|sinter|3d.?print|additive/i,
  diagnostic: /diagnos|alarm|fault|trouble|forensic|failure|predict|anomaly|health|condition.?monitor/i,
};

function classifyEngine(name) {
  for (const [domain, pattern] of Object.entries(domains)) {
    if (pattern.test(name)) return domain;
  }
  return 'other';
}

// Extract exports from a file
function extractExports(filePath) {
  const content = readFileSync(filePath, 'utf8');
  const exports = [];

  // export class FooEngine
  for (const m of content.matchAll(/export\s+class\s+(\w+)/g)) {
    exports.push(m[1]);
  }
  // export const fooEngine = ...
  for (const m of content.matchAll(/export\s+const\s+(\w+)\s*[=:]/g)) {
    exports.push(m[1]);
  }
  // export function foo
  for (const m of content.matchAll(/export\s+function\s+(\w+)/g)) {
    exports.push(m[1]);
  }
  // export enum Foo
  for (const m of content.matchAll(/export\s+enum\s+(\w+)/g)) {
    exports.push(m[1]);
  }
  // export interface Foo
  for (const m of content.matchAll(/export\s+interface\s+(\w+)/g)) {
    exports.push({ name: m[1], isType: true });
  }
  // export type Foo = ...
  for (const m of content.matchAll(/export\s+type\s+(\w+)\s*[=<{]/g)) {
    exports.push({ name: m[1], isType: true });
  }
  // export default — skip (barrel re-export of default is messy)

  return exports;
}

// Generate export lines grouped by domain
const byDomain = {};
let skipped = 0;
let errors = 0;

for (const name of unexported) {
  const domain = classifyEngine(name);
  if (domainArg !== 'all' && domain !== domainArg) continue;

  const filePath = join(ENGINES_DIR, `${name}.ts`);
  try {
    const exports = extractExports(filePath);
    if (exports.length === 0) {
      skipped++;
      continue;
    }

    // Filter out names already exported elsewhere (prevents TS2300 duplicate identifier)
    const valueExports = exports
      .filter(e => typeof e === 'string')
      .filter(e => !alreadyExportedNames.has(e));
    const typeExports = exports
      .filter(e => typeof e === 'object' && e.isType)
      .map(e => e.name)
      .filter(e => !alreadyExportedNames.has(e));

    // Track newly added names to prevent dupes within this run too
    for (const n of valueExports) alreadyExportedNames.add(n);
    for (const n of typeExports) alreadyExportedNames.add(n);

    let line = '';
    if (valueExports.length > 0 && typeExports.length > 0) {
      line = `export { ${valueExports.join(', ')}, type ${typeExports.join(', type ')} } from './${name}.js';`;
    } else if (valueExports.length > 0) {
      line = `export { ${valueExports.join(', ')} } from './${name}.js';`;
    } else if (typeExports.length > 0) {
      line = `export { type ${typeExports.join(', type ')} } from './${name}.js';`;
    }

    if (line) {
      if (!byDomain[domain]) byDomain[domain] = [];
      byDomain[domain].push(line);
    }
  } catch (err) {
    errors++;
    console.error(`ERROR reading ${name}: ${err.message}`);
  }
}

// Generate the append block
const sections = [];
const domainLabels = {
  physics: 'Physics / Force / Thermal / Deflection',
  cam: 'CAM / Toolpath / Post-Processor',
  machine: 'Machine / Setup / Spindle',
  tool: 'Tool / Insert / Holder',
  material: 'Material / Stock',
  quality: 'Quality / Inspection / SPC',
  business: 'Business / Quote / Cost / Scheduling',
  edm_laser: 'EDM / Laser / Waterjet / Grinding / Non-Traditional',
  turning: 'Turning / Lathe',
  multiaxis: '5-Axis / Multi-Axis',
  learning: 'Learning / Knowledge / Training',
  mech_design: 'Mechanical Design',
  safety: 'Safety / Compliance',
  integration: 'Integration / Bridge',
  coolant: 'Coolant / Fluid',
  forming: 'Forming / Casting / Additive',
  diagnostic: 'Diagnostics / Predictive',
  other: 'General / Infrastructure / Other',
};

let totalLines = 0;
for (const [domain, lines] of Object.entries(byDomain).sort(([a], [b]) => a.localeCompare(b))) {
  const label = domainLabels[domain] || domain;
  sections.push(`\n// --- ${label} (${lines.length} engines) ---`);
  for (const line of lines.sort()) {
    sections.push(line);
    totalLines++;
  }
}

const appendBlock = sections.join('\n');

console.log(`\nGenerated ${totalLines} export lines across ${Object.keys(byDomain).length} domains`);
console.log(`Skipped: ${skipped} (no exports), Errors: ${errors}`);

if (dryRun) {
  console.log('\n--- DRY RUN OUTPUT ---');
  console.log(appendBlock);
} else {
  // Append to index.ts
  const currentContent = readFileSync(INDEX_PATH, 'utf8');
  const newContent = currentContent.trimEnd() + '\n' + appendBlock + '\n';
  writeFileSync(INDEX_PATH, newContent, 'utf8');
  console.log(`\nAppended to ${INDEX_PATH}`);
}

// Print domain summary
console.log('\nDomain breakdown:');
for (const [domain, lines] of Object.entries(byDomain).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  ${(domainLabels[domain] || domain).padEnd(45)} ${lines.length}`);
}
