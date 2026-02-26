const fs = require('fs');
const path = require('path');

const roadmapDir = 'C:\\PRISM\\mcp-server\\data\\docs\\roadmap';
const phaseFiles = [
  'PHASE_P0_ACTIVATION.md',
  'PHASE_DA_DEV_ACCELERATION.md',
  'PHASE_R1_REGISTRY.md',
  'PHASE_R2_SAFETY.md',
  'PHASE_R3_CAMPAIGNS.md',
  'PHASE_R3_IMPLEMENTATION_DETAIL.md',
  'PHASE_R4_ENTERPRISE.md',
  'PHASE_R5_VISUAL.md',
  'PHASE_R6_PRODUCTION.md',
  'PHASE_R7_INTELLIGENCE.md',
  'PHASE_R8_EXPERIENCE.md',
  'PHASE_R9_INTEGRATION.md',
  'PHASE_R10_REVOLUTION.md',
  'PHASE_R11_PRODUCT.md',
  'PHASE_R-SKILL_REMEDIATION.md',
  'PHASE_TEMPLATE.md',
  'PRISM_RECOVERY_CARD.md',
  'ROADMAP_INSTRUCTIONS.md',
  'SYSTEM_CONTRACT.md',
  'ROLE_MODEL_EFFORT_MATRIX.md',
  'SKILLS_SCRIPTS_HOOKS_PLAN.md',
];

let output = '# ROADMAP SECTION INDEX\n';
output += '# Auto-generated: ' + new Date().toISOString().split('T')[0] + '\n';
output += '# Format: ANCHOR | FILE | LINE | DESCRIPTION\n';
output += '# Use: load specific section by reading FILE from LINE for ~30-50 lines\n\n';

let totalAnchors = 0;

phaseFiles.forEach(filename => {
  const fp = path.join(roadmapDir, filename);
  if (!fs.existsSync(fp)) { return; }
  
  const lines = fs.readFileSync(fp, 'utf8').split('\n');
  const fileAnchors = [];
  
  lines.forEach((line, idx) => {
    const match = line.match(/<!-- ANCHOR:\s*(\S+)\s*-->/);
    if (match) {
      // Get description from next non-empty line
      let desc = '';
      for (let j = idx + 1; j < Math.min(idx + 3, lines.length); j++) {
        const trimmed = lines[j].trim().replace(/^#+\s*/, '').replace(/```.*/, '');
        if (trimmed.length > 5) { desc = trimmed.substring(0, 80); break; }
      }
      fileAnchors.push({ anchor: match[1], line: idx + 1, desc });
      totalAnchors++;
    }
  });
  
  if (fileAnchors.length > 0) {
    output += `## ${filename} (${lines.length} lines, ${fileAnchors.length} anchors)\n`;
    fileAnchors.forEach(a => {
      output += `${a.anchor} | L${a.line} | ${a.desc}\n`;
    });
    output += '\n';
  }
});

output += `# Total: ${totalAnchors} anchors across ${phaseFiles.length} files\n`;

const outFile = path.join(roadmapDir, 'ROADMAP_SECTION_INDEX.md');
fs.writeFileSync(outFile, output, 'utf8');
console.log(`Written: ${totalAnchors} anchors to ROADMAP_SECTION_INDEX.md`);
