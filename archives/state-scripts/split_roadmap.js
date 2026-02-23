// split_roadmap.js — Split v18.1 monolith into modular phase files + index
const fs = require('fs');
const path = require('path');

const src = 'C:\\PRISM\\mcp-server\\data\\docs\\roadmap\\PRISM_ROADMAP_v18.1.md';
const outDir = 'C:\\PRISM\\mcp-server\\data\\docs\\roadmap';
const content = fs.readFileSync(src, 'utf8');
const lines = content.split('\n');

// Phase markers with their section numbers
const phases = [];
const headerPattern = /^## (\d+)\.\s+(R\d+|RECOVERY|Appendix|FILE PATH|TABLE OF CONTENTS|Layer|Philosophy|Three-Archetype|Claude Code Hooks|Model|Task DAG|Human)/i;

let currentPhase = null;
let globalHeader = []; // Everything before first phase
let globalHeaderDone = false;

for (let i = 0; i < lines.length; i++) {
  const match = lines[i].match(/^## (\d+)\.\s+(.+)/);
  if (match) {
    const sectionNum = parseInt(match[1]);
    const title = match[2].trim();
    
    // Sections 0-7 are global infrastructure, 8+ are phases
    if (sectionNum >= 8) {
      globalHeaderDone = true;
      if (currentPhase) {
        currentPhase.endLine = i - 1;
        phases.push(currentPhase);
      }
      
      // Extract phase code from title
      let phaseCode = 'MISC';
      const phaseMatch = title.match(/^(R\d+)/);
      if (phaseMatch) phaseCode = phaseMatch[1];
      else if (title.includes('RECOVERY')) phaseCode = 'RECOVERY';
      
      currentPhase = {
        sectionNum,
        phaseCode,
        title,
        startLine: i,
        endLine: null
      };
    } else if (!globalHeaderDone) {
      // Still in global header
    }
  }
  
  if (!globalHeaderDone) {
    globalHeader.push(lines[i]);
  }
}

// Close last phase
if (currentPhase) {
  currentPhase.endLine = lines.length - 1;
  phases.push(currentPhase);
}

console.log(`Found ${phases.length} phases to extract`);
console.log(`Global header: ${globalHeader.length} lines`);

// Write global header as ROADMAP_INDEX.md
const indexLines = [
  '# PRISM ROADMAP v19.0 — MODULAR INDEX',
  '## Build from primitives upward: data → engines → calibration → features → platform → intelligence → product',
  `## Date: 2026-02-20 | Status: ACTIVE | Phases: ${phases.length}`,
  '## Split from v18.1 monolith into modular phase files',
  '',
  '---',
  '',
  '## QUICK REFERENCE',
  '',
  '| Phase | Layer | File | Tasks | Status |',
  '|-------|-------|------|-------|--------|',
];

const phaseFiles = [];

for (const p of phases) {
  const phaseLines = lines.slice(p.startLine, p.endLine + 1);
  const taskCount = phaseLines.filter(l => l.trim().startsWith('TASK:')).length;
  const fileName = `PHASE_${p.phaseCode}_v19.md`;
  const filePath = path.join(outDir, fileName);
  
  // Add file path resolution header to each phase file
  const header = [
    `# PHASE ${p.phaseCode}: ${p.title}`,
    `## Roadmap v19.0 | Extracted from v18.1 | Tasks: ${taskCount}`,
    `## See ROADMAP_INDEX.md for global architecture and cross-phase dependencies`,
    `## See FILE_MAP.json for path resolution`,
    '',
    '---',
    ''
  ];
  
  const fullContent = header.join('\n') + phaseLines.join('\n');
  fs.writeFileSync(filePath, fullContent, 'utf8');
  
  const sizeKB = Math.round(Buffer.byteLength(fullContent) / 1024);
  console.log(`  ${fileName} — ${taskCount} tasks, ${sizeKB}KB`);
  
  indexLines.push(`| ${p.phaseCode} | L${p.sectionNum - 6} | ${fileName} | ${taskCount} | NOT STARTED |`);
  phaseFiles.push({ phase: p.phaseCode, file: fileName, tasks: taskCount, sizeKB });
}

// Add rest of index
indexLines.push('');
indexLines.push('---');
indexLines.push('');

// Add the global header sections (architecture, philosophy, etc) 
indexLines.push('## GLOBAL ARCHITECTURE');
indexLines.push('');
indexLines.push('The following sections apply to ALL phases:');
indexLines.push('');

// Extract section titles from global header
for (const line of globalHeader) {
  if (line.startsWith('## ') && !line.includes('TABLE OF CONTENTS')) {
    indexLines.push(`- ${line.replace('## ', '')}`);
  }
}

indexLines.push('');
indexLines.push('### Loading Protocol for Claude Code');
indexLines.push('```');
indexLines.push('1. Read ROADMAP_INDEX.md (this file) — understand phases and current position');
indexLines.push('2. Read CURRENT_POSITION.md — know which task is active');
indexLines.push('3. Read PHASE_{current}_v19.md — load ONLY the active phase');
indexLines.push('4. Read FILE_MAP.json — resolve all file paths');
indexLines.push('5. Run /project:load-phase {phase} — load domain skills');
indexLines.push('6. Execute task per EXECUTOR_PROTOCOL.md');
indexLines.push('```');
indexLines.push('');
indexLines.push('### Context Budget');
indexLines.push('| Document | Size | When to Load |');
indexLines.push('|----------|------|-------------|');
indexLines.push(`| ROADMAP_INDEX.md | ~5KB | Every session (boot) |`);
indexLines.push(`| PHASE_R2_v19.md | ~${phaseFiles.find(p=>p.phase==='R2')?.sizeKB || '?'}KB | When working on R2 |`);
indexLines.push('| FILE_MAP.json | ~8KB | Every session (boot) |');
indexLines.push('| CURRENT_POSITION.md | ~1KB | Every session (boot) |');
indexLines.push('| EXECUTOR_PROTOCOL.md | ~4KB | Every session (boot) |');
indexLines.push(`| Total boot cost | ~18KB | vs 235KB monolith = 92% reduction |`);
indexLines.push('');

// Add global header content (sections 0-7) as reference
indexLines.push('---');
indexLines.push('');
indexLines.push('## GLOBAL SECTIONS (from v18.1 header)');
indexLines.push('');
for (const line of globalHeader) {
  indexLines.push(line);
}

// Write index
const indexPath = path.join(outDir, 'ROADMAP_INDEX.md');
fs.writeFileSync(indexPath, indexLines.join('\n'), 'utf8');
const indexSize = Math.round(Buffer.byteLength(indexLines.join('\n')) / 1024);
console.log(`\nROADMAP_INDEX.md — ${indexSize}KB`);

// Write machine-readable manifest
const manifest = {
  version: "19.0",
  split_from: "PRISM_ROADMAP_v18.1.md",
  split_date: "2026-02-20",
  index_file: "ROADMAP_INDEX.md",
  phases: phaseFiles.map(p => ({
    phase: p.phase,
    file: p.file,
    tasks: p.tasks,
    size_kb: p.sizeKB,
    status: "NOT_STARTED"
  })),
  global_files: [
    "ROADMAP_INDEX.md",
    "FILE_MAP.json",
    "CURRENT_POSITION.md",
    "EXECUTOR_PROTOCOL.md",
    "SKILL_PHASE_MAP.json",
    "COMPOUND_ACTIONS.md"
  ],
  total_tasks: phaseFiles.reduce((s, p) => s + p.tasks, 0)
};

const manifestPath = path.join(outDir, 'ROADMAP_MANIFEST.json');
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
console.log(`ROADMAP_MANIFEST.json — ${Math.round(Buffer.byteLength(JSON.stringify(manifest, null, 2)) / 1024)}KB`);
console.log(`\nTotal tasks across all phases: ${manifest.total_tasks}`);
