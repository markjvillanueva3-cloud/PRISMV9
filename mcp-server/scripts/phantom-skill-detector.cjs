#!/usr/bin/env node
/**
 * Phantom Skill Detector (IMP-P0-1)
 * Detects: (1) Skills in SKILL_INDEX.json with no directory on disk
 *          (2) Skill directories on disk not in SKILL_INDEX.json
 * Run: node scripts/phantom-skill-detector.cjs
 */
const fs = require('fs');
const path = require('path');

const SKILLS_DIR = 'C:\\PRISM\\skills-consolidated';
const INDEX_FILE = path.join(SKILLS_DIR, 'SKILL_INDEX.json');

function main() {
  console.log('[PHANTOM-DETECTOR] Scanning skill index vs disk...');

  if (!fs.existsSync(INDEX_FILE)) {
    console.error('[PHANTOM-DETECTOR] SKILL_INDEX.json not found at', INDEX_FILE);
    process.exit(1);
  }

  const index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8'));
  const indexedNames = new Set(Object.keys(index.skills || {}));

  // Get directories on disk that contain SKILL.md
  const diskDirs = fs.readdirSync(SKILLS_DIR)
    .filter(d => {
      const p = path.join(SKILLS_DIR, d);
      return fs.statSync(p).isDirectory() && fs.existsSync(path.join(p, 'SKILL.md'));
    });
  const diskNames = new Set(diskDirs);

  // Phantoms: in index but not on disk
  const phantoms = [...indexedNames].filter(n => !diskNames.has(n));

  // Orphans: on disk but not in index
  const orphans = [...diskNames].filter(n => !indexedNames.has(n));

  // Empty skills: in index and on disk but SKILL.md is empty/tiny
  const emptySkills = diskDirs.filter(d => {
    const p = path.join(SKILLS_DIR, d, 'SKILL.md');
    try { return fs.statSync(p).size < 50; } catch { return false; }
  });

  console.log(`[PHANTOM-DETECTOR] Index: ${indexedNames.size} skills | Disk: ${diskNames.size} dirs`);

  if (phantoms.length > 0) {
    console.log(`\n  PHANTOMS (${phantoms.length} — in index, missing on disk):`);
    phantoms.forEach(p => console.log(`    - ${p}`));
  }

  if (orphans.length > 0) {
    console.log(`\n  ORPHANS (${orphans.length} — on disk, missing from index):`);
    orphans.forEach(o => console.log(`    - ${o}`));
  }

  if (emptySkills.length > 0) {
    console.log(`\n  EMPTY (${emptySkills.length} — SKILL.md < 50 bytes):`);
    emptySkills.forEach(e => console.log(`    - ${e}`));
  }

  const ok = phantoms.length === 0;
  console.log(`\n[PHANTOM-DETECTOR] ${ok ? 'PASS' : 'WARN'}: ${phantoms.length} phantoms, ${orphans.length} orphans, ${emptySkills.length} empty`);

  // Write report
  const report = {
    timestamp: new Date().toISOString(),
    indexed: indexedNames.size,
    on_disk: diskNames.size,
    phantoms,
    orphans,
    empty: emptySkills,
    status: ok ? 'PASS' : 'WARN'
  };
  const reportDir = 'C:\\PRISM\\state';
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(path.join(reportDir, 'phantom_skill_report.json'), JSON.stringify(report, null, 2));

  return ok ? 0 : 1;
}

process.exit(main());
