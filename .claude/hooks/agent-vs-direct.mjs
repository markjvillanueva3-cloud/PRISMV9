#!/usr/bin/env node
// tier: T1
/**
 * agent-vs-direct.mjs - PreToolUse Agent
 * Checks if a direct tool would be faster than spawning an agent.
 * Token savings: 50-70% (agent overhead avoided)
 */

import { readFileSync } from 'fs';

const input = JSON.parse(readFileSync(0, 'utf8'));
const { tool_name, tool_input } = input;

if (tool_name !== 'Agent') {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

const prompt = (tool_input?.prompt || '').toLowerCase();
const description = (tool_input?.description || '').toLowerCase();
const subagentType = tool_input?.subagent_type || '';

// Patterns that suggest direct tools would be better
const directToolPatterns = [
  {
    pattern: /read\s+(the\s+)?file|check\s+(the\s+)?file|look\s+at\s+(the\s+)?file/,
    tool: 'Read',
    reason: 'Single file read is faster with Read tool directly'
  },
  {
    pattern: /search\s+for|find\s+.*in\s+.*files?|grep\s+for|look\s+for.*pattern/,
    tool: 'Grep',
    reason: 'Pattern search is faster with Grep tool directly'
  },
  {
    pattern: /list\s+files|find\s+files|what\s+files/,
    tool: 'Glob',
    reason: 'File listing is faster with Glob tool directly'
  },
  {
    pattern: /run\s+(the\s+)?command|execute|npm\s+run|git\s+/,
    tool: 'Bash',
    reason: 'Single command is faster with Bash tool directly'
  },
  {
    pattern: /edit\s+(the\s+)?file|change\s+.*in\s+.*file|update\s+(the\s+)?file/,
    tool: 'Edit',
    reason: 'Single edit is faster with Edit tool directly'
  },
];

// Check prompt and description
const combined = `${prompt} ${description}`;

for (const { pattern, tool, reason } of directToolPatterns) {
  if (pattern.test(combined)) {
    // Check if it's truly a simple task (no conditionals, no multi-step)
    const complexityIndicators = [
      /if\s+.*then/,
      /multiple/,
      /several/,
      /all\s+of/,
      /each\s+of/,
      /based\s+on.*result/,
      /depending\s+on/,
      /and\s+then/,
    ];

    const isComplex = complexityIndicators.some(p => p.test(combined));

    if (!isComplex) {
      const message = [
        `🎯 Consider using ${tool} directly instead of Agent:`,
        `  ${reason}`,
        `  Agent overhead: context setup, tool result parsing, response synthesis`,
        `  Direct tool: single round-trip, immediate result`,
        `  Use Agent for: multi-step tasks, conditional logic, parallel work`,
      ].join('\n');

      console.log(JSON.stringify({ continue: true, hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: message } }));
      process.exit(0);
    }
  }
}

// Check for explore agent on simple searches
if (subagentType === 'Explore' && combined.length < 100) {
  const message = [
    `💡 Explore agent may be overkill for short queries:`,
    `  Query: "${combined.substring(0, 80)}..."`,
    `  Consider: Direct Grep/Glob for simple pattern matches`,
    `  Use Explore for: complex codebase understanding, multi-file analysis`,
  ].join('\n');

  console.log(JSON.stringify({ continue: true, hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: message } }));
  process.exit(0);
}

console.log(JSON.stringify({ continue: true }));
