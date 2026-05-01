/**
 * PRISM Session State Dump
 * Quick snapshot of system state for session recovery after compaction.
 * Outputs a concise summary that fits in a single context read.
 * 
 * Usage: node C:\PRISM\scripts\session_state.js
 */
const fs = require('fs');
const path = require('path');

const STATE_DIR = 'C:\\PRISM\\state';
const MCP_DIR = 'C:\\PRISM\\mcp-server';
const DISP_DIR = path.join(MCP_DIR, 'src', 'tools', 'dispatchers');

const out = [];
function section(title) { out.push('\n## ' + title); }
function line(text) { out.push(text); }

section('System State @ ' + new Date().toISOString());

// Dispatchers
const dispatchers = fs.readdirSync(DISP_DIR).filter(f => f.endsWith('.ts'));
let totalActions = 0;
const dispSummary = dispatchers.map(f => {
  const content = fs.readFileSync(path.join(DISP_DIR, f), 'utf8');
  const toolMatch = content.match(/server\.tool\(\s*"(prism_\w+)"/) || content.match(/"(prism_\w+)"/);
  const actionsMatch = content.match(/const ACTIONS\s*=\s*\[([\s\S]*?)\]\s*as\s*const/);
  const actions = actionsMatch ? (actionsMatch[1].match(/"(\w+)"/g) || []).length : 0;
  totalActions += actions;
  const lines = content.split('\n').length;
  return `${(toolMatch?.[1] || f).padEnd(22)} ${String(actions).padStart(3)} actions  ${String(lines).padStart(5)} lines`;
});
line(`Dispatchers: ${dispatchers.length} | Total actions: ${totalActions}`);
dispSummary.forEach(s => line('  ' + s));

// Skills
const SKILLS_DIR = 'C:\\PRISM\\skills-consolidated';
if (fs.existsSync(SKILLS_DIR)) {
  const skills = fs.readdirSync(SKILLS_DIR).filter(f => 
    fs.existsSync(path.join(SKILLS_DIR, f, 'SKILL.md'))
  );
  line(`\nSkills: ${skills.length}`);
}

// Scripts
const SCRIPTS_DIR = 'C:\\PRISM\\scripts';
if (fs.existsSync(SCRIPTS_DIR)) {
  const scripts = fs.readdirSync(SCRIPTS_DIR).filter(f => 
    fs.statSync(path.join(SCRIPTS_DIR, f)).isFile()
  );
  line(`Scripts: ${scripts.length} active`);
}

// TODO list
const todoFile = path.join(STATE_DIR, 'TODO.md');
if (fs.existsSync(todoFile)) {
  section('Active TODO');
  const todo = fs.readFileSync(todoFile, 'utf8').trim();
  if (todo.length > 0) line(todo.substring(0, 1000));
  else line('(empty)');
}

// Recent state files
section('State Files');
if (fs.existsSync(STATE_DIR)) {
  const stateFiles = fs.readdirSync(STATE_DIR)
    .filter(f => fs.statSync(path.join(STATE_DIR, f)).isFile())
    .map(f => ({
      name: f,
      age: Date.now() - fs.statSync(path.join(STATE_DIR, f)).mtimeMs,
      kb: +(fs.statSync(path.join(STATE_DIR, f)).size / 1024).toFixed(1)
    }))
    .sort((a, b) => a.age - b.age)
    .slice(0, 10);
  
  stateFiles.forEach(f => {
    const ageHrs = (f.age / 3600000).toFixed(1);
    line(`  ${f.name.padEnd(35)} ${String(f.kb).padStart(6)}KB  ${ageHrs}h ago`);
  });
}

// Build status
section('Build');
const distDir = path.join(MCP_DIR, 'dist');
if (fs.existsSync(distDir)) {
  const indexJs = path.join(distDir, 'index.js');
  if (fs.existsSync(indexJs)) {
    const s = fs.statSync(indexJs);
    const ageMin = ((Date.now() - s.mtimeMs) / 60000).toFixed(0);
    line(`dist/index.js: ${(s.size/1024).toFixed(0)}KB, built ${ageMin}min ago`);
  }
}

// Package version
const pkgFile = path.join(MCP_DIR, 'package.json');
if (fs.existsSync(pkgFile)) {
  const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8'));
  line(`Version: ${pkg.version || 'unknown'}`);
}

// Output
const result = out.join('\n');
console.log(result);

// Also save to file for recovery
const outFile = path.join(STATE_DIR, 'SESSION_SNAPSHOT.md');
fs.writeFileSync(outFile, result);
line(`\nSaved to ${outFile}`);
