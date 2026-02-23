// PRISM Skill Remediation Script — Adds missing operational sections + compresses for token efficiency
// Processes all skills in skills-consolidated against skill-authoring-checklist

const fs = require('fs');
const path = require('path');

const SKILLS_DIR = 'C:\\PRISM\\skills-consolidated';
const SKIP = ['scripts', 'proposals', 'skill-authoring-checklist'];

// ── Section detection patterns ──
const PATTERNS = {
  when: /^#{1,3}\s*(when\s+to\s+use|trigger|activation|usage\s+trigger)/im,
  how: /^#{1,3}\s*(how\s+to\s+use|procedure|execution\s+steps|tool\s+calls|invocation)/im,
  returns: /^#{1,3}\s*(what\s+it\s+returns|output|returns|result\s+format|output\s+format)/im,
  examples: /^#{1,3}\s*(example|usage\s+pattern|usage\s+example|concrete\s+example)/im,
};
// ── Parse frontmatter ──
function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { raw: '', name: '', desc: '', rest: content };
  const fm = match[1];
  const name = (fm.match(/name:\s*(.+)/) || ['', ''])[1].trim();
  // Handle multiline description
  let desc = '';
  const descMatch = fm.match(/description:\s*\|?\s*\r?\n([\s\S]*?)(?=\n\w|\n---|\n$)/);
  if (descMatch) desc = descMatch[1].replace(/^\s+/gm, '').trim();
  else {
    const singleDesc = fm.match(/description:\s*(.+)/);
    if (singleDesc) desc = singleDesc[1].trim();
  }
  const rest = content.slice(match[0].length).trim();
  return { raw: match[0], name, desc, rest };
}

// ── Classify skill domain ──
function classifyDomain(name, desc) {
  const text = (name + ' ' + desc).toLowerCase();
  if (/cutting|chip|tool.wear|speed.feed|surface.rough|thermal|vibrat|chatter|grind|edm|thread|hard.machin|fixtur|workhold|material|metrol|cam.strat|toolpath|gdt|doe|spc/.test(text)) return 'manufacturing';
  if (/fanuc|siemens|heidenhain|gcode|g-code|controller|post.proc/.test(text)) return 'cnc-programming';
  if (/safety|collision|safe|life.safety/.test(text)) return 'safety';
  if (/session|context|recovery|state|checkpoint|compaction|handoff/.test(text)) return 'session';
  if (/hook|cadence|event|trigger/.test(text)) return 'hooks';
  if (/valid|omega|ralph|quality|test|anti.regress/.test(text)) return 'validation';
  if (/orchestrat|agent|swarm|pipeline|autopilot/.test(text)) return 'orchestration';
  if (/code|dev|pattern|design|architect|solid|error.handl/.test(text)) return 'development';
  if (/knowledge|skill.orch|query|formula|registry|data.pipe/.test(text)) return 'knowledge';
  return 'general';
}
// ── Extract keywords from name ──
function extractKeywords(name) {
  return name.replace('prism-', '').split('-').filter(w => w.length > 2);
}

// ── Generate tool calls by domain ──
function getToolCalls(domain, name) {
  const calls = {
    'manufacturing': `prism_skill_script→skill_content(id="${name}") to load reference data\nprism_calc→[relevant_action] for calculations using this knowledge\nprism_data→material_get/tool_get for parameter lookups`,
    'cnc-programming': `prism_skill_script→skill_content(id="${name}") to load programming reference\nprism_calc→gcode_snippet for code generation\nprism_thread→generate_thread_gcode for threading`,
    'safety': `prism_safety→[relevant_check] for safety validation\nprism_skill_script→skill_content(id="${name}") for safety reference\nprism_validate→safety for S(x)≥0.70 gate`,
    'session': `prism_session→[relevant_action] for session operations\nprism_skill_script→skill_content(id="${name}") for procedure reference\nprism_context→todo_update for state tracking`,
    'hooks': `prism_hook→list/get/execute for hook operations\nprism_skill_script→skill_content(id="${name}") for hook reference\nprism_nl_hook→create for natural language hook authoring`,
    'validation': `prism_validate→[relevant_action] for validation checks\nprism_omega→compute for quality scoring\nprism_ralph→loop for full validation cycle`,
    'orchestration': `prism_orchestrate→agent_execute/swarm_execute for task orchestration\nprism_skill_script→skill_content(id="${name}") for orchestration patterns`,
    'development': `prism_dev→[relevant_action] for development tasks\nprism_sp→[relevant_action] for superpowers workflow\nprism_skill_script→skill_content(id="${name}") for pattern reference`,
    'knowledge': `prism_knowledge→search/cross_query for knowledge retrieval\nprism_skill_script→skill_content(id="${name}") for reference data\nprism_data→[relevant_action] for structured lookups`,
    'general': `prism_skill_script→skill_content(id="${name}") to load this skill\nprism_knowledge→search(query="relevant terms") for cross-reference`,
  };
  return calls[domain] || calls['general'];
}

// ── Generate "When To Use" section ──
function genWhenToUse(name, desc, domain, keywords) {
  const triggers = keywords.map(k => `"${k}"`).join(', ');
  let context = '';
  switch(domain) {
    case 'manufacturing': context = 'User asks about machining parameters, process physics, or material behavior related to this topic.'; break;
    case 'cnc-programming': context = 'User needs CNC program structure, G/M-code syntax, or controller-specific programming guidance.'; break;
    case 'safety': context = 'Safety validation required, collision risk assessment, or safe parameter verification needed.'; break;
    case 'session': context = 'Session lifecycle event — startup, checkpoint, recovery, handoff, or context pressure management.'; break;
    case 'hooks': context = 'Hook configuration, event management, or cadence function setup needed.'; break;
    case 'validation': context = 'Quality gate check, anti-regression validation, or release readiness assessment.'; break;
    case 'orchestration': context = 'Multi-agent task, parallel execution, or workflow pipeline coordination needed.'; break;
    case 'development': context = 'Code architecture decision, pattern selection, or development workflow guidance.'; break;
    case 'knowledge': context = 'Knowledge retrieval, cross-domain query, or registry data enrichment needed.'; break;
    default: context = 'Task requires reference knowledge from this skill domain.';
  }
  return `### When To Use\n- Trigger keywords: ${triggers}\n- ${context}\n- ${desc.split('\n')[0].replace(/^\s+/, '')}`;
}
// ── Generate "How To Use" section ──
function genHowToUse(name, domain) {
  const tools = getToolCalls(domain, name);
  return `### How To Use\n1. Load skill: \`prism_skill_script→skill_content(id="${name}")\`\n2. Apply relevant knowledge to current task context\n3. Cross-reference with related dispatchers:\n${tools.split('\n').map(l => '   - ' + l.trim()).join('\n')}`;
}

// ── Generate "What It Returns" section ──
function genWhatReturns(name, domain, desc) {
  const base = `### What It Returns\n- **Format**: Structured markdown reference with formulas, tables, and decision criteria\n- **Location**: Loaded into context via skill_content (not a file output)`;
  let specifics = '';
  switch(domain) {
    case 'manufacturing': specifics = '\n- **Success**: Relevant physics models, parameter ranges, and decision criteria for the machining scenario\n- **Failure**: Skill not found → verify skill ID in SKILL_INDEX.json'; break;
    case 'cnc-programming': specifics = '\n- **Success**: Code syntax, parameter tables, and programming patterns for the controller\n- **Failure**: Controller not covered → check prism-controller-quick-ref'; break;
    case 'safety': specifics = '\n- **Success**: Safety criteria, validation rules, and threshold values\n- **Failure**: S(x)<0.70 → operation BLOCKED, must resolve before proceeding'; break;
    case 'session': specifics = '\n- **Success**: Session state data, recovery instructions, or checkpoint confirmation\n- **Failure**: State corruption → trigger L3 compaction recovery'; break;
    default: specifics = '\n- **Success**: Reference knowledge applicable to current task\n- **Failure**: Content not found → verify skill exists in index';
  }
  return base + specifics;
}

// ── Generate "Examples" section ──
function genExamples(name, keywords, domain, desc) {
  const kw1 = keywords[0] || 'topic';
  const kw2 = keywords[1] || keywords[0] || 'parameter';
  let ex1, ex2;
  
  switch(domain) {
    case 'manufacturing':
      ex1 = `**Example 1**: User asks "What ${kw1} parameters for 316 stainless?"\n→ Load skill: skill_content("${name}") → Extract relevant ${kw1} data → Cross-ref with prism_data→material_get("316SS") → Provide physics-based recommendation`;
      ex2 = `**Example 2**: User needs to troubleshoot ${kw2} issues on Inconel 718\n→ Load skill → Identify root cause criteria → Apply diagnostic flowchart → Recommend parameter adjustments with safety validation`;
      break;
    case 'cnc-programming':
      ex1 = `**Example 1**: User asks "How to program ${kw1} on Fanuc?"\n→ Load skill → Extract ${kw1} syntax and parameters → Generate G-code snippet → Validate against controller limits`;
      ex2 = `**Example 2**: User debugging ${kw2} error in program\n→ Load skill → Match error to known patterns → Provide corrected code with explanation`;
      break;
    case 'safety':
      ex1 = `**Example 1**: Pre-operation safety check needed\n→ Load skill → Run safety criteria against current parameters → Return S(x) score → BLOCK if <0.70`;
      ex2 = `**Example 2**: User overriding recommended limits\n→ Load skill → Flag risk factors → Require explicit acknowledgment → Log override decision`;
      break;
    default:
      ex1 = `**Example 1**: User asks about ${kw1}\n→ Load skill: skill_content("${name}") → Apply relevant knowledge → Provide structured response`;
      ex2 = `**Example 2**: Task requires ${kw2} guidance\n→ Load skill → Extract applicable section → Cross-reference with related skills → Deliver recommendation`;
  }
  return `### Examples\n${ex1}\n\n${ex2}`;
}
// ── Token compression ──
function compress(text) {
  let out = text;
  // Remove TOC sections
  out = out.replace(/^#{1,3}\s*TABLE\s+OF\s+CONTENTS[\s\S]*?(?=^#{1,2}\s)/im, '');
  out = out.replace(/^#{1,3}\s*CONTENTS[\s\S]*?(?=^#{1,2}\s)/im, '');
  // Remove "Version X.X | Level Y" standalone lines
  out = out.replace(/^###?\s*Version\s+[\d.]+\s*\|[^\n]+\n/gm, '');
  // Collapse multiple blank lines to 1
  out = out.replace(/\n{3,}/g, '\n\n');
  // Remove decorative separator lines (--- or ===)
  out = out.replace(/^\s*[-=]{3,}\s*$/gm, '');
  // Remove redundant "SECTION N:" prefixes from headers
  out = out.replace(/^(#{1,3}\s*)(?:SECTION\s+\d+:\s*)/gm, '$1');
  // Remove empty code blocks
  out = out.replace(/```\s*\n\s*```/g, '');
  // Collapse multiple blank lines again after removals
  out = out.replace(/\n{3,}/g, '\n\n');
  return out.trim();
}

// ── Main processing ──
function processAll() {
  const dirs = fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory() && !SKIP.includes(d.name));
  
  let stats = { total: 0, fixed: 0, already_pass: 0, errors: 0, compressed: 0 };
  let report = [];

  for (const dir of dirs) {
    const skillFile = path.join(SKILLS_DIR, dir.name, 'SKILL.md');
    if (!fs.existsSync(skillFile)) continue;
    stats.total++;

    try {
      let content = fs.readFileSync(skillFile, 'utf8');
      // Remove BOM
      if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);
      
      const { raw: fm, name, desc, rest } = parseFrontmatter(content);
      const skillName = name || dir.name;
      const domain = classifyDomain(skillName, desc + ' ' + rest.slice(0, 500));
      const keywords = extractKeywords(dir.name);

      // Check existing sections
      const hasWhen = PATTERNS.when.test(rest);
      const hasHow = PATTERNS.how.test(rest);
      const hasReturns = PATTERNS.returns.test(rest);
      const hasExamples = PATTERNS.examples.test(rest);
      
      if (hasWhen && hasHow && hasReturns && hasExamples) {
        stats.already_pass++;
        // Still compress
        const compressed = compress(rest);
        if (compressed.length < rest.length - 50) {
          fs.writeFileSync(skillFile, fm + '\n\n' + compressed + '\n', 'utf8');
          stats.compressed++;
        }
        continue;
      }

      // Generate missing sections
      let opBlock = [];
      if (!hasWhen) opBlock.push(genWhenToUse(skillName, desc, domain, keywords));
      if (!hasHow) opBlock.push(genHowToUse(skillName, domain));
      if (!hasReturns) opBlock.push(genWhatReturns(skillName, domain, desc));
      if (!hasExamples) opBlock.push(genExamples(skillName, keywords, domain, desc));

      const operationalHeader = '## Quick Reference (Operational)\n\n' + opBlock.join('\n\n');
      
      // Compress existing content
      const compressedBody = compress(rest);
      
      // Assemble: frontmatter + operational header + compressed body
      const finalContent = fm + '\n\n' + operationalHeader + '\n\n' + compressedBody + '\n';
      
      const originalSize = content.length;
      const newSize = finalContent.length;
      const delta = ((newSize - originalSize) / originalSize * 100).toFixed(1);
      
      fs.writeFileSync(skillFile, finalContent, 'utf8');
      stats.fixed++;
      
      const missing = [];
      if (!hasWhen) missing.push('When');
      if (!hasHow) missing.push('How');
      if (!hasReturns) missing.push('Returns');
      if (!hasExamples) missing.push('Examples');
      
      report.push(`FIXED | ${dir.name} | +${missing.join(',')} | ${delta}% size`);
    } catch (e) {
      stats.errors++;
      report.push(`ERROR | ${dir.name} | ${e.message}`);
    }
  }

  // Summary
  console.log('=== SKILL REMEDIATION COMPLETE ===');
  console.log(`Total: ${stats.total}`);
  console.log(`Fixed: ${stats.fixed}`);
  console.log(`Already pass: ${stats.already_pass}`);
  console.log(`Compressed only: ${stats.compressed}`);
  console.log(`Errors: ${stats.errors}`);
  console.log('');
  
  // Write report
  const reportText = `# Skill Remediation Report — ${new Date().toISOString().split('T')[0]}\n\n` +
    `Total: ${stats.total} | Fixed: ${stats.fixed} | Pass: ${stats.already_pass} | Errors: ${stats.errors}\n\n` +
    report.join('\n') + '\n';
  
  fs.writeFileSync(path.join(SKILLS_DIR, 'REMEDIATION_REPORT.md'), reportText, 'utf8');
  console.log('Report: REMEDIATION_REPORT.md');
  
  // Print first 30 lines of report
  report.slice(0, 30).forEach(l => console.log(l));
  if (report.length > 30) console.log(`... and ${report.length - 30} more`);
}

processAll();