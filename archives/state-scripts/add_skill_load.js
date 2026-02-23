// add_skill_load.js — Add SKILL_LOAD field to all TASK blocks based on phase
// Reads SKILL_PHASE_MAP.json to determine which skills each phase needs
const fs = require('fs');

const mapPath = 'C:\\PRISM\\mcp-server\\data\\docs\\roadmap\\SKILL_PHASE_MAP.json';
const roadmapPath = 'C:\\PRISM\\mcp-server\\data\\docs\\roadmap\\PRISM_ROADMAP_v18.1.md';

const skillMap = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
const lines = fs.readFileSync(roadmapPath, 'utf8').split('\n');

let currentPhase = '';
let insertions = [];

for (let i = 0; i < lines.length; i++) {
  // Track phase
  const pm = lines[i].match(/^## \d+\. (R\d+)/);
  if (pm) currentPhase = pm[1];
  
  // Find TASK blocks
  const tm = lines[i].match(/^\s*TASK:\s*(MS\S+)/);
  if (!tm) continue;
  
  // Check if already has SKILL_LOAD
  let hasSkillLoad = false;
  let blockEnd = -1;
  let lastFieldLine = -1;
  
  for (let j = i + 1; j < Math.min(i + 30, lines.length); j++) {
    if (lines[j].trim().match(/^```\s*$/)) { blockEnd = j; break; }
    if (lines[j].includes('SKILL_LOAD:')) hasSkillLoad = true;
    // Track last field line (for insertion point)
    if (lines[j].match(/^\s+(PROVIDES|WRITES_TO|READS_FROM|LAYER|GATE|BASH|DATA_DEPS|TASK_DEPS|ESCALATION|ESTIMATED_CALLS|PARALLEL|SUCCESS):/) ||
        lines[j].match(/^\s+\]/)) {
      lastFieldLine = j;
    }
  }
  
  if (hasSkillLoad) continue;
  if (blockEnd === -1) continue;
  if (!currentPhase || !skillMap[currentPhase]) continue;
  
  // Get phase skills (compact — just top 5 most relevant)
  const phaseSkills = skillMap[currentPhase].skills || [];
  const topSkills = phaseSkills.slice(0, 5);
  
  if (topSkills.length === 0) continue;
  
  // Insert before the closing ```
  insertions.push({
    line: blockEnd,
    phase: currentPhase,
    taskId: tm[1],
    skills: topSkills
  });
}

// Sort descending to preserve line numbers
insertions.sort((a, b) => b.line - a.line);

let added = 0;
for (const ins of insertions) {
  const skillLine = `  SKILL_LOAD: [${ins.skills.join(', ')}]`;
  lines.splice(ins.line, 0, skillLine);
  added++;
}

fs.writeFileSync(roadmapPath, lines.join('\n'), 'utf8');
console.log(`Added SKILL_LOAD to ${added} tasks across ${new Set(insertions.map(i => i.phase)).size} phases`);

// Show summary per phase
const phaseCount = {};
for (const ins of insertions) {
  phaseCount[ins.phase] = (phaseCount[ins.phase] || 0) + 1;
}
for (const [phase, count] of Object.entries(phaseCount)) {
  console.log(`  ${phase}: ${count} tasks`);
}
