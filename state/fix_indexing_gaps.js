// fix_indexing_gaps.js — Add registration checklist to every NEW-file task + companion milestones
const fs = require('fs');
const path = require('path');
const dir = 'C:\\PRISM\\mcp-server\\data\\docs\\roadmap';

// 1. Create the registration checklist template
const checklist = `
**REGISTRATION CHECKLIST (required for every NEW file):**
- [ ] Add to \`src/engines/index.ts\` barrel export (if engine)
- [ ] Add to \`src/shared/index.ts\` barrel export (if shared module)
- [ ] Wire actions into dispatcher (if new actions)
- [ ] Update \`FILE_MAP.json\` with new file path
- [ ] Update \`SKILL_PHASE_MAP.json\` if new skills needed
- [ ] Create companion SKILL.md in \`skills-consolidated/prism-{name}/\`
- [ ] Add test coverage in phase test script
- [ ] Register hooks in \`HookRegistry.ts\` (if pre/post validation needed)
`;

// 2. Process each phase file
const phases = fs.readdirSync(dir).filter(f => f.match(/PHASE_R\d+_v19/));
let totalFixed = 0;

for (const f of phases) {
  const filePath = path.join(dir, f);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Find tasks with (NEW) in WRITES_TO that don't have REGISTRATION CHECKLIST
  const lines = content.split('\n');
  const insertions = [];
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('(NEW)') && lines[i].includes('WRITES_TO')) {
      // Check if checklist already exists within next 20 lines
      let hasChecklist = false;
      for (let j = i; j < Math.min(i + 20, lines.length); j++) {
        if (lines[j].includes('REGISTRATION CHECKLIST')) {
          hasChecklist = true;
          break;
        }
      }
      
      if (!hasChecklist) {
        // Find the BASH line after this task to insert before it
        for (let j = i; j < Math.min(i + 30, lines.length); j++) {
          if (lines[j].includes('**BASH:**') || lines[j].includes('**Step-by-step:**')) {
            insertions.push({ line: j, isStep: lines[j].includes('Step-by-step') });
            totalFixed++;
            break;
          }
        }
      }
    }
  }
  
  // Insert in reverse order
  insertions.sort((a, b) => b.line - a.line);
  for (const ins of insertions) {
    lines.splice(ins.line, 0, checklist);
  }
  
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
}

console.log(`Added registration checklist to ${totalFixed} tasks across ${phases.length} phase files`);

// 3. Now add companion milestone to each phase
for (const f of phases) {
  const filePath = path.join(dir, f);
  let content = fs.readFileSync(filePath, 'utf8');
  const phaseMatch = f.match(/R(\d+)/);
  if (!phaseMatch) continue;
  const phase = 'R' + phaseMatch[1];
  
  // Check if companion milestone already exists
  if (content.includes('Companion Artifacts')) continue;
  
  // Count new engines/modules in this phase
  const newFiles = (content.match(/\(NEW\)/g) || []).length;
  if (newFiles === 0) continue;
  
  // Find the last ### MS section that contains tasks (the build gate)
  // Insert companion milestone before the build gate
  const lines = content.split('\n');
  let buildGateLine = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].match(/### MS\d+:.*Build Gate|### MS\d+:.*Phase Gate|### MS\d+:.*Phase Completion/i)) {
      buildGateLine = i;
      break;
    }
  }
  
  if (buildGateLine === -1) {
    // Try to find "Summary" section
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].match(/### .* Summary/)) {
        buildGateLine = i;
        break;
      }
    }
  }
  
  if (buildGateLine > -1) {
    const companion = `
### Companion Artifacts (AUTO-GENERATED — ${newFiles} new files in this phase)
**Every new engine/module MUST have these companion artifacts before phase gate:**

| Artifact | Location | Purpose |
|----------|----------|---------|
| SKILL.md | \`skills-consolidated/prism-{name}/SKILL.md\` | Teach Claude how to use new actions |
| Test script | \`tests/${phase.toLowerCase()}/{name}-test.ts\` | Validate new engine correctness |
| Hook registration | \`src/registries/HookRegistry.ts\` | Pre/post validation for new actions |
| Barrel export | \`src/engines/index.ts\` | Make engine importable |
| FILE_MAP entry | \`data/docs/roadmap/FILE_MAP.json\` | Path resolution for roadmap |
| SKILL_PHASE_MAP entry | \`data/docs/roadmap/SKILL_PHASE_MAP.json\` | Phase→skill mapping |
| MASTER_INDEX entry | \`data/docs/MASTER_INDEX.md\` | Documentation index |

**Phase gate BLOCKS if any new engine lacks companion artifacts.**

`;
    lines.splice(buildGateLine, 0, companion);
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    console.log(`  ${f}: Added companion milestone (${newFiles} new files)`);
  } else {
    console.log(`  ${f}: WARNING — no build gate found, skipped companion milestone`);
  }
}
