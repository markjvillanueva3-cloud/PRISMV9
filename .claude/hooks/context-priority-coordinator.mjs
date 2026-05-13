#!/usr/bin/env node
// tier: T4
/**
 * context-priority-coordinator.mjs — UserPromptSubmit hook
 *
 * Uses ContextPriorityEngine to classify the user's task and set
 * environment flags that other hooks check before injecting context.
 *
 * This reduces token waste by only injecting context relevant to
 * the current task domain and type.
 *
 * Output: Sets PRISM_TASK_DOMAIN and PRISM_TASK_TYPE in shared state
 *         for other hooks to read.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const STATE_FILE = 'H:/prism/mcp-server/data/state/context-priority-state.json';

const DOMAIN_KEYWORDS = {
  machining: ['cnc', 'mill', 'lathe', 'toolpath', 'gcode', 'feed', 'speed', 'cutting', 'tool life', 'kienzle', 'taylor', 'chip'],
  cad: ['cad', 'model', 'geometry', 'stl', 'step', 'iges', 'solid', 'surface', 'mesh', 'feature'],
  ai: ['neural', 'ml', 'model training', 'inference', 'embedding', 'vector', 'llm', 'reasoning engine'],
  infrastructure: ['hook', 'dispatcher', 'schema', 'wiring', 'build', 'test', 'ci', 'deploy'],
  physics: ['force', 'stress', 'thermal', 'deflection', 'vibration', 'stability', 'dynamics'],
  web: ['frontend', 'react', 'css', 'html', 'api', 'rest', 'graphql', 'ui', 'ux'],
};

const TASK_KEYWORDS = {
  build: ['create', 'build', 'implement', 'add', 'new engine', 'new feature'],
  debug: ['fix', 'bug', 'error', 'failing', 'broken', 'issue', 'crash'],
  analyze: ['analyze', 'audit', 'review', 'check', 'investigate', 'understand'],
  explore: ['explore', 'find', 'search', 'what', 'how', 'why', 'where'],
  optimize: ['optimize', 'improve', 'reduce', 'faster', 'better', 'refactor'],
  wire: ['wire', 'dispatcher', 'action', 'schema', 'register'],
  test: ['test', 'coverage', 'assertion', 'vitest', 'spec'],
};

function classifyTask(prompt) {
  const lower = prompt.toLowerCase();

  // Domain classification
  const domainScores = {};
  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    domainScores[domain] = keywords.filter(kw => lower.includes(kw)).length;
  }
  const sortedDomains = Object.entries(domainScores)
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1]);
  const primaryDomain = sortedDomains[0]?.[0] || 'general';

  // Task type classification
  let taskType = 'other';
  let maxScore = 0;
  for (const [type, keywords] of Object.entries(TASK_KEYWORDS)) {
    const score = keywords.filter(kw => lower.includes(kw)).length;
    if (score > maxScore) {
      maxScore = score;
      taskType = type;
    }
  }

  // Urgency
  const urgency = lower.includes('urgent') || lower.includes('asap') || lower.includes('now')
    ? 'immediate'
    : lower.includes('background') || lower.includes('when you can')
      ? 'background'
      : 'standard';

  return { primaryDomain, taskType, urgency };
}

function main() {
  let input;
  try {
    input = JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const message = input?.message?.content || input?.message || '';
  if (!message || message.length < 5) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const classification = classifyTask(message);

  // Write state for other hooks to read
  try {
    mkdirSync(dirname(STATE_FILE), { recursive: true });
    writeFileSync(STATE_FILE, JSON.stringify({
      ...classification,
      timestamp: Date.now(),
      promptLength: message.length,
    }));
  } catch { /* non-fatal */ }

  // Only inject context hint if non-general domain detected
  if (classification.primaryDomain !== 'general' || classification.taskType !== 'other') {
    console.log(JSON.stringify({
      continue: true,
      systemMessage: `[CtxPri] Domain: ${classification.primaryDomain} | Task: ${classification.taskType} | Urgency: ${classification.urgency}`
    }));
  } else {
    console.log(JSON.stringify({ continue: true }));
  }
}

try { main(); } catch { process.stdout.write(JSON.stringify({ continue: true })); }
