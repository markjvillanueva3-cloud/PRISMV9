#!/usr/bin/env node
// tier: T4
/**
 * Smart Skill Suggest — UserPromptSubmit Hook
 *
 * Uses the skill index to provide context-aware skill suggestions.
 * Covers ALL 300+ skills, not just hardcoded patterns.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const INDEX_PATH = 'H:/prism/mcp-server/data/state/skill-utilization-index.json';
const USAGE_PATH = 'H:/prism/mcp-server/data/state/skill-usage-stats.json';

// Read stdin
let input = '';
try {
  input = readFileSync(0, 'utf-8');
} catch {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

let payload;
try {
  payload = JSON.parse(input);
} catch {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

const prompt = (payload.prompt || payload.message || '').toLowerCase();
if (!prompt || prompt.startsWith('/')) {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

// ============================================================================
// LOAD INDEX
// ============================================================================

let index = { skills: [], categories: {} };
try {
  if (existsSync(INDEX_PATH)) {
    index = JSON.parse(readFileSync(INDEX_PATH, 'utf8'));
  }
} catch { /* ignore */ }

if (!index.skills || index.skills.length === 0) {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

// ============================================================================
// MATCHING
// ============================================================================

// Domain patterns for quick matching
const DOMAIN_TRIGGERS = {
  lathe: /lathe|turning|okuma|facing|boring|threading|grooving/,
  mill: /mill|milling|haas|hurco|pocket|contour|slot/,
  edm: /edm|wire.*edm|wedm|sinker|spark|erosion/,
  speed_feed: /speed|feed|sfm|rpm|ipm|fz|chip.*load/,
  tooling: /tool|insert|holder|carbide|hss|end.*mill|drill/,
  material: /material|steel|aluminum|titanium|inconel|hardness/,
  business: /quote|cost|estimate|price|bid|job.*cost/,
  safety: /safe|guard|collision|clearance|clamp/,
  development: /engine|create|build|forge|develop|code/,
  learning: /pdf|video|learn|extract|knowledge|manual/,
  post_processing: /post|gcode|macro|g-?code|fanuc|okuma.*code/,
  simulation: /simul|virtual|verify.*path|collision.*check/,
  project: /roadmap|milestone|task|continue|progress/,
  search: /search|find|lookup|where|locate/
};

function matchDomains(text) {
  const matched = [];
  for (const [domain, pattern] of Object.entries(DOMAIN_TRIGGERS)) {
    if (pattern.test(text)) matched.push(domain);
  }
  return matched;
}

function scoreSkill(skill, promptDomains, promptWords) {
  let score = 0;

  // Domain match (high value)
  for (const domain of skill.domains || []) {
    if (promptDomains.includes(domain)) score += 3;
  }

  // Keyword match
  for (const keyword of skill.keywords || []) {
    if (promptWords.includes(keyword)) score += 2;
    // Partial match
    else if (promptWords.some(w => w.includes(keyword) || keyword.includes(w))) score += 1;
  }

  // Name match
  const nameParts = skill.name.split('-');
  for (const part of nameParts) {
    if (promptWords.includes(part)) score += 2;
  }

  return score;
}

// ============================================================================
// FIND BEST MATCHES
// ============================================================================

const promptDomains = matchDomains(prompt);
const promptWords = prompt.split(/\s+/).filter(w => w.length > 2);

const scored = index.skills
  .map(skill => ({ ...skill, score: scoreSkill(skill, promptDomains, promptWords) }))
  .filter(s => s.score > 0)
  .sort((a, b) => b.score - a.score);

if (scored.length === 0) {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

// ============================================================================
// TRACK SUGGESTIONS
// ============================================================================

let usage = { usageCounts: {}, suggestions: {} };
try {
  if (existsSync(USAGE_PATH)) {
    usage = JSON.parse(readFileSync(USAGE_PATH, 'utf8'));
  }
} catch { /* ignore */ }

// Track suggestions made
for (const skill of scored.slice(0, 3)) {
  usage.suggestions[skill.name] = (usage.suggestions[skill.name] || 0) + 1;
}
usage.lastSuggestionAt = new Date().toISOString();

try {
  const dir = dirname(USAGE_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(USAGE_PATH, JSON.stringify(usage, null, 2));
} catch { /* ignore */ }

// ============================================================================
// OUTPUT
// ============================================================================

const top = scored[0];
const alternatives = scored.slice(1, 4);

// Only suggest if score is meaningful
if (top.score < 3) {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

const parts = [];
parts.push(`**Skill Match**: /${top.name} (score: ${top.score})`);

if (alternatives.length > 0) {
  parts.push('Also consider: ' + alternatives.map(s => `/${s.name}`).join(', '));
}

console.log(JSON.stringify({
  continue: true,
  hookSpecificOutput: {
    hookEventName: "UserPromptSubmit",
    additionalContext: parts.join('\n')
  }
}));
