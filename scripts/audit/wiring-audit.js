/**
 * PRISM Wiring Verification Audit Script
 * Run at end of any infrastructure phase to catch orphaned artifacts.
 * Usage: node scripts/audit/wiring-audit.js [phase_name]
 * Example: node scripts/audit/wiring-audit.js DA
 */
const fs = require('fs');
const path = require('path');

const PHASE = process.argv[2] || 'UNKNOWN';
const SRC = 'C:\\PRISM\\mcp-server\\src';
const ENGINES_DIR = path.join(SRC, 'engines');
const SKILLS_DIR = 'C:\\PRISM\\skills-consolidated';
const SCRIPTS_DIR = 'C:\\PRISM\\mcp-server\\scripts';
const STATE_DIR = 'C:\\PRISM\\state';
const ROADMAP_DIR = 'C:\\PRISM\\mcp-server\\data\\docs\\roadmap';

function readAllTs(dir, exclude) {
  const files = [];
  const walk = (d) => {
    try {
      fs.readdirSync(d).forEach(f => {
        const p = path.join(d, f);
        if (p.includes('node_modules')) return;
        if (exclude && p.includes(exclude)) return;
        if (fs.statSync(p).isDirectory()) walk(p);
        else if (f.endsWith('.ts')) files.push(p);
      });
    } catch {}
  };
  walk(dir);
  return files.map(f => ({ path: f, content: fs.readFileSync(f, 'utf8') }));
}

console.log(`\n========================================`);
console.log(`  PRISM WIRING AUDIT — Phase ${PHASE}`);
console.log(`  ${new Date().toISOString().split('T')[0]}`);
console.log(`========================================\n`);

// 1. CADENCE FUNCTIONS
const cadence = fs.readFileSync(path.join(SRC, 'tools', 'cadenceExecutor.ts'), 'utf8');
const hookWrapper = fs.readFileSync(path.join(SRC, 'tools', 'autoHookWrapper.ts'), 'utf8');
const cadenceFns = (cadence.match(/export (?:async )?function (auto\w+)/g) || [])
  .map(m => m.match(/auto\w+/)[0]);
const wiredSet = new Set();
for (const m of hookWrapper.matchAll(/auto(\w+)\(/g)) wiredSet.add('auto' + m[1]);
const unwiredCadence = cadenceFns.filter(fn => !wiredSet.has(fn));
console.log(`CADENCE: ${cadenceFns.length} total, ${cadenceFns.length - unwiredCadence.length} wired, ${unwiredCadence.length} orphaned`);
unwiredCadence.forEach(fn => console.log(`  ⚠ ORPHAN: ${fn}`));

// 2. ENGINES
const engines = fs.readdirSync(ENGINES_DIR).filter(f => f.endsWith('.ts') && f !== 'index.ts');
const nonEngineCode = readAllTs(SRC, 'engines').map(f => f.content).join('\n');
const unwiredEngines = engines.filter(e => !nonEngineCode.includes(e.replace('.ts', '')));
console.log(`\nENGINES: ${engines.length} total, ${engines.length - unwiredEngines.length} wired, ${unwiredEngines.length} orphaned`);
unwiredEngines.forEach(e => console.log(`  ⚠ ORPHAN: ${e}`));

// 3. SCRIPTS
const scripts = [];
const walkScripts = (dir) => {
  try {
    fs.readdirSync(dir).forEach(f => {
      const p = path.join(dir, f);
      if (fs.statSync(p).isDirectory()) walkScripts(p);
      else if (f.endsWith('.ps1') || f.endsWith('.js') || f.endsWith('.py')) scripts.push(f);
    });
  } catch {}
};
walkScripts(SCRIPTS_DIR);
// Filter out archived/completed scripts
const activeScripts = scripts.filter(s => !s.includes('_completed'));
scripts.length = 0;
scripts.push(...activeScripts);
const allCode = readAllTs(SRC, null).map(f => f.content).join('\n');
const roadmapContent = fs.readdirSync(ROADMAP_DIR)
  .filter(f => f.endsWith('.md'))
  .map(f => fs.readFileSync(path.join(ROADMAP_DIR, f), 'utf8')).join('\n');
const unreferencedScripts = scripts.filter(s => !allCode.includes(s) && !roadmapContent.includes(s));
console.log(`\nSCRIPTS: ${scripts.length} total, ${scripts.length - unreferencedScripts.length} referenced, ${unreferencedScripts.length} orphaned`);
if (unreferencedScripts.length > 15) {
  console.log(`  (showing first 15 of ${unreferencedScripts.length})`);
  unreferencedScripts.slice(0, 15).forEach(s => console.log(`  ⚠ ORPHAN: ${s}`));
} else {
  unreferencedScripts.forEach(s => console.log(`  ⚠ ORPHAN: ${s}`));
}

// 4. SKILLS INDEX
const idx = JSON.parse(fs.readFileSync(path.join(SKILLS_DIR, 'SKILL_INDEX.json'), 'utf8'));
const skillNames = Object.keys(idx.skills);
const splits = skillNames.filter(n => idx.skills[n].source === 'split_from_monolith');
const noTriggers = skillNames.filter(n => !idx.skills[n].triggers || idx.skills[n].triggers.length === 0);
const nanSizes = skillNames.filter(n => isNaN(idx.skills[n].size_kb));
console.log(`\nSKILLS: ${skillNames.length} indexed, ${splits.length} atomic splits`);
console.log(`  No triggers: ${noTriggers.length}  |  NaN sizes: ${nanSizes.length}`);
if (nanSizes.length > 0) console.log(`  ⚠ NaN sizes need fixing`);

// 5. NL HOOKS
const nlDir = path.join(STATE_DIR, 'nl_hooks');
const nlCount = fs.existsSync(nlDir) ? fs.readdirSync(nlDir).filter(f => f.endsWith('.json')).length : 0;
console.log(`\nNL HOOKS: ${nlCount} on disk`);
if (nlCount === 0) console.log(`  ⚠ No NL hooks deployed — runtime evaluation impossible`);

// 6. OVERALL SCORE
const total = cadenceFns.length + engines.length + scripts.length;
const orphaned = unwiredCadence.length + unwiredEngines.length + unreferencedScripts.length;
const pct = ((total - orphaned) / total * 100).toFixed(1);
console.log(`\n========================================`);
console.log(`  OVERALL: ${total} artifacts, ${total - orphaned} wired (${pct}%)`);
console.log(`  Orphaned: ${orphaned} (${(orphaned/total*100).toFixed(1)}%)`);
console.log(`  Gate threshold: >90% wired`);
console.log(`  Status: ${pct >= 90 ? 'PASS ✅' : 'NEEDS ATTENTION ⚠️'}`);
console.log(`========================================\n`);
