#!/usr/bin/env node
// tier: T4
/**
 * Skill Usage Tracker — UserPromptSubmit Hook
 *
 * Tracks when skills are actually invoked (prompts starting with /)
 * to identify:
 * - Most used skills (amplify these)
 * - Never used skills (surface these)
 * - Usage patterns over time
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

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

const prompt = (payload.prompt || payload.message || '').trim();

// Only track slash commands
if (!prompt.startsWith('/')) {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

// Extract skill name
const match = prompt.match(/^\/([a-z0-9-]+)/i);
if (!match) {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

const skillName = match[1].toLowerCase();

// ============================================================================
// UPDATE USAGE STATS
// ============================================================================

let usage = {
  usageCounts: {},
  lastUsed: {},
  suggestions: {},
  history: []
};

try {
  if (existsSync(USAGE_PATH)) {
    usage = JSON.parse(readFileSync(USAGE_PATH, 'utf8'));
  }
} catch { /* ignore */ }

// Update counts
usage.usageCounts = usage.usageCounts || {};
usage.usageCounts[skillName] = (usage.usageCounts[skillName] || 0) + 1;

// Update last used
usage.lastUsed = usage.lastUsed || {};
usage.lastUsed[skillName] = new Date().toISOString();

// Update history (keep last 100)
usage.history = usage.history || [];
usage.history.push({
  skill: skillName,
  timestamp: new Date().toISOString()
});
if (usage.history.length > 100) {
  usage.history = usage.history.slice(-100);
}

// Calculate stats
const totalInvocations = Object.values(usage.usageCounts).reduce((a, b) => a + b, 0);
const uniqueSkillsUsed = Object.keys(usage.usageCounts).length;

// Find most used
const topSkills = Object.entries(usage.usageCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5);

// Save
try {
  const dir = dirname(USAGE_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(USAGE_PATH, JSON.stringify({
    ...usage,
    totalInvocations,
    uniqueSkillsUsed,
    topSkills: topSkills.map(([name, count]) => ({ name, count })),
    lastUpdated: new Date().toISOString()
  }, null, 2));
} catch { /* ignore */ }

// ============================================================================
// MILESTONES
// ============================================================================

// Celebrate usage milestones
if (totalInvocations > 0 && totalInvocations % 50 === 0) {
  console.log(JSON.stringify({
    continue: true,
    additionalContext: `## Skill Usage Milestone\n${totalInvocations} skill invocations! Top: ${topSkills.slice(0, 3).map(([n, c]) => `/${n}(${c})`).join(', ')}`
  }));
} else {
  console.log(JSON.stringify({ continue: true }));
}
