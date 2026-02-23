#!/usr/bin/env node
/**
 * Skill Index Synchronizer (R12-MS1)
 * 1. Adds orphan skills (on disk but not indexed) to SKILL_INDEX.json
 * 2. Removes phantom skills (in index but not on disk)
 * 3. Extracts basic metadata from SKILL.md frontmatter
 * Run: node scripts/sync-skill-index.cjs [--dry-run]
 */
const fs = require('fs');
const path = require('path');

const SKILLS_DIR = 'C:\\PRISM\\skills-consolidated';
const INDEX_FILE = path.join(SKILLS_DIR, 'SKILL_INDEX.json');
const DRY_RUN = process.argv.includes('--dry-run');

function parseSkillMd(skillDir) {
  const mdPath = path.join(skillDir, 'SKILL.md');
  if (!fs.existsSync(mdPath)) return null;

  const content = fs.readFileSync(mdPath, 'utf-8');
  const size = fs.statSync(mdPath).size;

  // Parse YAML frontmatter
  let description = '';
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (fmMatch) {
    const descMatch = fmMatch[1].match(/description:\s*\|?\s*\n?\s*(.+)/);
    if (descMatch) description = descMatch[1].trim();
  }

  // Fallback: use ## Purpose section
  if (!description) {
    const purposeMatch = content.match(/##\s*Purpose\s*\n+(.+)/);
    if (purposeMatch) description = purposeMatch[1].trim();
  }

  // Extract triggers from When To Use section + name parts
  const triggers = new Set();
  const name = path.basename(skillDir);

  // Add name parts as triggers
  name.replace('prism-', '').split('-').forEach(part => {
    if (part.length > 3) triggers.add(part);
  });

  // Extract from When To Use
  const wtuMatch = content.match(/##\s*When\s+(?:To|to)\s+Use\b([\s\S]*?)(?=##|$)/i);
  if (wtuMatch) {
    const words = wtuMatch[1].toLowerCase().match(/[a-z][a-z0-9_]{3,}/g) || [];
    const STOP = new Set(['the','and','for','not','use','this','that','with','from','when','how','what','why','which','where','who','you','your','are','was','were','been','being','have','has','had','will','would','could','should','need','want','get','got','set','let','make','take','just','also','only','even','still','already','about','after','before','during','between','into','through','each','every','some','any','all','most','more','less','than','then','them','they','their','there','here','both','same','other','very','really','much','many','such','like','help','using','used','uses','skill','prism','claude','file','files','run','running','see','check','look','find','read','write','create','build','add','remove','delete','update','new','old','first','last','next','current','specific','section','example','result','output','input','data','line','lines','code','system','step','steps']);
    words.forEach(w => {
      if (!STOP.has(w)) triggers.add(w);
    });
  }

  return {
    name,
    description: description || '|',
    size_bytes: size,
    triggers: [...triggers].sort(),
    source: 'disk_sync',
    tags: ['synced'],
    size_kb: Math.round(size / 1024)
  };
}

function main() {
  console.log(`[SKILL-SYNC] ${DRY_RUN ? 'DRY RUN — ' : ''}Synchronizing SKILL_INDEX.json...`);

  const index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8'));
  const skills = index.skills || {};

  // Get directories on disk with SKILL.md
  const diskDirs = fs.readdirSync(SKILLS_DIR)
    .filter(d => {
      const p = path.join(SKILLS_DIR, d);
      return fs.statSync(p).isDirectory() && fs.existsSync(path.join(p, 'SKILL.md'));
    });

  const indexedNames = new Set(Object.keys(skills));
  const diskNames = new Set(diskDirs);

  // 1. Remove phantoms
  const phantoms = [...indexedNames].filter(n => !diskNames.has(n));
  phantoms.forEach(p => {
    console.log(`  REMOVE phantom: ${p}`);
    if (!DRY_RUN) delete skills[p];
  });

  // 2. Add orphans
  const orphans = diskDirs.filter(d => !indexedNames.has(d));
  orphans.forEach(name => {
    const skillDir = path.join(SKILLS_DIR, name);
    const meta = parseSkillMd(skillDir);
    if (meta) {
      console.log(`  ADD orphan: ${name} (${meta.triggers.length} triggers, ${meta.size_kb}KB)`);
      if (!DRY_RUN) skills[name] = meta;
    }
  });

  // 3. Update count in metadata if present
  if (index.metadata) {
    index.metadata.total = Object.keys(skills).length;
    index.metadata.last_synced = new Date().toISOString().slice(0, 10);
  }

  if (!DRY_RUN) {
    fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));
  }

  const finalCount = Object.keys(skills).length;
  console.log(`\n[SKILL-SYNC] ${DRY_RUN ? 'Would: ' : ''}Removed ${phantoms.length} phantoms, added ${orphans.length} orphans`);
  console.log(`[SKILL-SYNC] Index now has ${finalCount} skills`);
}

main();
