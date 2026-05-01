const fs = require('fs');
const path = require('path');
const SKILLS_DIR = 'C:\\PRISM\\skills-consolidated';

const fixes = {
  'prism-anti-regression': { missing: ['Returns', 'Examples'], domain: 'validation', kw: ['anti', 'regression'] },
  'prism-claude-code-bridge': { missing: ['When'], domain: 'development', kw: ['claude', 'code', 'bridge'] },
  'prism-formula-evolution': { missing: ['When', 'Returns'], domain: 'knowledge', kw: ['formula', 'evolution'] },
  'prism-master-equation': { missing: ['When'], domain: 'manufacturing', kw: ['master', 'equation', 'omega'] },
  'prism-mathematical-planning': { missing: ['When'], domain: 'development', kw: ['mathematical', 'planning'] },
  'prism-process-optimizer': { missing: ['When'], domain: 'manufacturing', kw: ['process', 'optimizer'] },
  'prism-skill-orchestrator': { missing: ['When'], domain: 'orchestration', kw: ['skill', 'orchestrator'] },
  'prism-thermal-effects': { missing: ['When'], domain: 'manufacturing', kw: ['thermal', 'effects', 'heat'] },
  'prism-uncertainty-propagation': { missing: ['When'], domain: 'manufacturing', kw: ['uncertainty', 'propagation'] },
};

for (const [name, fix] of Object.entries(fixes)) {
  const fp = path.join(SKILLS_DIR, name, 'SKILL.md');
  let content = fs.readFileSync(fp, 'utf8');

  let sections = [];
  for (const m of fix.missing) {
    switch(m) {
      case 'When':
        sections.push(`### When To Use\n- Trigger keywords: ${fix.kw.map(k=>'"'+k+'"').join(', ')}\n- Activate when user task involves ${fix.kw.join(' or ')} concepts\n- Also fires when related dispatchers need reference knowledge from this domain`);
        break;
      case 'Returns':
        sections.push(`### What It Returns\n- **Format**: Structured markdown reference loaded into context\n- **Success**: Applicable criteria, models, and decision rules for the task\n- **Failure**: Skill not found → verify in SKILL_INDEX.json`);
        break;
      case 'Examples':
        sections.push(`### Examples\n**Example 1**: User asks about ${fix.kw[0]}\n→ Load skill: skill_content("${name}") → Extract relevant section → Apply to task\n\n**Example 2**: Task requires ${fix.kw.slice(0,2).join(' ')} guidance\n→ Load skill → Cross-reference with related dispatchers → Deliver structured response`);
        break;
    }
  }

  // Insert after "## Quick Reference (Operational)" if present, else after frontmatter
  const qrIdx = content.indexOf('## Quick Reference (Operational)');
  if (qrIdx !== -1) {
    // Find end of existing Quick Reference block (next ## heading)
    const afterQR = content.indexOf('\n## ', qrIdx + 10);
    if (afterQR !== -1) {
      content = content.slice(0, afterQR) + '\n\n' + sections.join('\n\n') + '\n' + content.slice(afterQR);
    } else {
      content = content + '\n\n' + sections.join('\n\n') + '\n';
    }
  } else {
    // Insert after frontmatter
    const fmEnd = content.indexOf('---', 3);
    if (fmEnd !== -1) {
      const insertPos = content.indexOf('\n', fmEnd) + 1;
      content = content.slice(0, insertPos) + '\n## Quick Reference (Operational)\n\n' + sections.join('\n\n') + '\n\n' + content.slice(insertPos);
    }
  }
  
  fs.writeFileSync(fp, content, 'utf8');
  console.log(`FIXED: ${name} — added ${fix.missing.join(', ')}`);
}
console.log('Done — all 9 patched.');