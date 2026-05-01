const fs = require('fs');
const path = require('path');

const skillsDir = 'C:\\PRISM\\skills-consolidated';
const invPath = 'C:\\PRISM\\state\\SKILL_INVENTORY.json';

// Get disk directories
const diskDirs = new Set(
  fs.readdirSync(skillsDir).filter(d => 
    fs.statSync(path.join(skillsDir, d)).isDirectory()
  )
);

// Get registry
let regIds = new Set();
if (fs.existsSync(invPath)) {
  const inv = JSON.parse(fs.readFileSync(invPath, 'utf8'));
  if (Array.isArray(inv)) {
    inv.forEach(s => regIds.add(s.skill_id || s.id || ''));
  } else if (inv.skills) {
    inv.skills.forEach(s => regIds.add(s.skill_id || s.id || ''));
  }
}

console.log(`Disk dirs: ${diskDirs.size}`);
console.log(`Registry entries: ${regIds.size}`);

const phantoms = [...regIds].filter(id => !diskDirs.has(id)).sort();
console.log(`\n=== PHANTOMS (in registry, NOT on disk): ${phantoms.length} ===`);
phantoms.forEach(p => console.log(`  ${p}`));

const unreg = [...diskDirs].filter(d => !regIds.has(d)).sort();
console.log(`\n=== UNREGISTERED (on disk, NOT in registry): ${unreg.length} ===`);
unreg.forEach(u => console.log(`  ${u}`));
