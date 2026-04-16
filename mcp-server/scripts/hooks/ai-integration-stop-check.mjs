#!/usr/bin/env node
/**
 * AI Integration Stop Check Hook
 * ===============================
 * Fires on Stop event to remind about AI integration opportunities.
 *
 * Checks:
 * 1. Were any reasoning tasks done manually that could use prism_ai?
 * 2. Should any learnings be extracted to tribal knowledge?
 * 3. Are there knowledge gaps that should be documented?
 */

import * as fs from 'fs';
import * as path from 'path';

const STATE_PATH = path.join(process.cwd(), 'data', 'state', 'session-ai-usage.json');

// Check if prism_ai was used in this session
let aiUsage = { used: false, actions: [] };
try {
  if (fs.existsSync(STATE_PATH)) {
    aiUsage = JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8'));
  }
} catch {}

const reminders = [];

if (!aiUsage.used) {
  reminders.push('No prism_ai actions were used this session. Consider if AI reasoning could have helped.');
}

// Check for common patterns that suggest AI could help
const suggestions = [
  {
    pattern: 'reasoning|analysis|complex|multi-step',
    suggestion: 'Complex reasoning detected - try prism_ai opus_execute or cot_reason next time'
  },
  {
    pattern: 'physics|force|thermal|deflection',
    suggestion: 'Physics work done - use prism_ai opus_validate_physics for validation'
  },
  {
    pattern: 'knowledge|tip|learned|discovered',
    suggestion: 'Knowledge created - use prism_ai extract_tribal to capture it'
  },
  {
    pattern: 'error|debug|diagnose|fix',
    suggestion: 'Debugging done - use prism_ai resolve_error or diagnosis actions'
  }
];

const output = {
  hookSpecificOutput: {
    hookEventName: 'Stop',
    additionalContext: `
## AI Integration Checkpoint

${reminders.length > 0 ? reminders.join('\n') : 'prism_ai was used this session.'}

### Before You Go:
1. **Extract learnings** → prism_ai action=extract_tribal if you discovered something new
2. **Index knowledge** → prism_ai action=neural_index_entity for any new concepts
3. **Share chains** → prism_ai action=share_reasoning_chain if multi-agent collaboration ongoing

### Quick Reference for Next Session:
- \`prism_ai action=opus_execute params={category:"deep_reasoning", intent:"..."}\`
- \`prism_ai action=neural_semantic_search params={query:"..."}\`
- \`prism_ai action=cot_reason params={problem:"...", domain:"..."}\`
`.trim()
  }
};

console.log(JSON.stringify(output));
