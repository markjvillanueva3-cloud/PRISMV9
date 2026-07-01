// Analyze remaining stubs — what patterns do they follow?
const fs = require('fs');
const path = require('path');
const CONSOLIDATED = 'C:\\PRISM\\data\\materials_consolidated';
const DATA_BASE = 'C:\\PRISM\\data\\materials';

// Get all already-verified material IDs
const verifiedIds = new Set();
const groups = fs.readdirSync(DATA_BASE).filter(d => fs.statSync(path.join(DATA_BASE, d)).isDirectory());
for (const g of groups) {
  const files = fs.readdirSync(path.join(DATA_BASE, g)).filter(f => f.includes('verified'));
  for (const f of files) {
    try {
      const mats = JSON.parse(fs.readFileSync(path.join(DATA_BASE, g, f), 'utf8')).materials || [];
      mats.forEach(m => verifiedIds.add(m.material_id));
    } catch(e) {}
  }
}

// Find remaining stubs
const remaining = {};
const cGroups = fs.readdirSync(CONSOLIDATED).filter(d => fs.statSync(path.join(CONSOLIDATED, d)).isDirectory());
for (const g of cGroups) {
  const files = fs.readdirSync(path.join(CONSOLIDATED, g)).filter(f => f.endsWith('.json'));
  for (const f of files) {
    try {
      const mats = JSON.parse(fs.readFileSync(path.join(CONSOLIDATED, g, f), 'utf8')).materials || [];
      for (const m of mats) {
        if (!verifiedIds.has(m.material_id) && !verifiedIds.has(m.id)) {
          if (!remaining[g]) remaining[g] = [];
          remaining[g].push(m.name);
        }
      }
    } catch(e) {}
  }
}

let total = 0;
for (const [g, names] of Object.entries(remaining).sort((a,b) => b[1].length - a[1].length)) {
  console.log(`\n${g}: ${names.length} remaining`);
  total += names.length;
  // Show patterns
  const patterns = {};
  for (const n of names) {
    // Extract base alloy
    const base = n.replace(/\s+(Annealed|Normalized|Cold Drawn|Hot Rolled|Q&T|Quenched|Tempered|Hardened|Stress Relieved|Oil Quenched|Water Quenched|Air Cooled|\d+ HRC|Solution|Aged|As Cast|Die Cast|Extruded|Forged|1\/[24] Hard|Full Hard|Spring Temper|H\d+|T\d+|O\b).*/i, '').trim();
    if (!patterns[base]) patterns[base] = 0;
    patterns[base]++;
  }
  const sorted = Object.entries(patterns).sort((a,b) => b[1] - a[1]);
  for (const [p, c] of sorted.slice(0, 15)) {
    console.log(`  ${c}x ${p}`);
  }
  if (sorted.length > 15) console.log(`  ... and ${sorted.length - 15} more base grades`);
}
console.log(`\nTOTAL REMAINING: ${total}`);
