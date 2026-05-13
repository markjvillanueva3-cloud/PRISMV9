#!/usr/bin/env node
// tier: T1
/**
 * multi-session-awareness.mjs — PreToolUse hook
 *
 * WARNS when creating engines/hooks that use singleton state files
 * without session isolation. 8 concurrent Claude chats share state.
 *
 * Rule: Any state file should use session ID or terminal ID for isolation.
 */

import * as fs from 'fs';

const SINGLETON_PATTERNS = [
  /const\s+STATE_FILE\s*=\s*["'][^"']+\.json["']/,
  /writeFileSync\s*\(\s*["'][^"']+\.json["']/,
  /readFileSync\s*\(\s*["'][^"']+\.json["']/,
];

const SESSION_SAFE_PATTERNS = [
  /SESSION_ID|session_id|sessionId|terminalId|TERM_SESSION/i,
  /per-session|per-agent|per-chat/i,
  /getStateFile\s*\(/,
  /\$\{.*session.*\}/i,
];

// Engines that intentionally share state across all sessions
const INTENTIONALLY_SHARED_PATTERNS = [
  /SHARED-STATE:/i,                    // Explicit marker
  /cross-session|all-sessions|shared.*aggregate/i,
  /TokenEconomy|OutputCache/i,         // Known shared engines
  /CAM.*Index|CAD.*Index|Tribal/i,     // Indexes are shared
];

function hasSingletonState(content) {
  // Skip if marked as intentionally shared
  const isIntentionallyShared = INTENTIONALLY_SHARED_PATTERNS.some(p => p.test(content));
  if (isIntentionallyShared) {
    return false;
  }

  for (const pattern of SINGLETON_PATTERNS) {
    if (pattern.test(content)) {
      // Check if it's session-safe
      const hasSessionAware = SESSION_SAFE_PATTERNS.some(p => p.test(content));
      if (!hasSessionAware) {
        return true;
      }
    }
  }
  return false;
}

async function main() {
  let input;
  try {
    const _raw = readStdinSafe();
    if (!_raw) {
      console.log(JSON.stringify({ continue: true }));
      return;
    }
    input = JSON.parse(_raw);
  } catch {
    console.log(JSON.stringify({ decision: 'approve' }));
    return;
  }

  const { tool, input: toolInput } = input;

  // Only check Write/Edit to engines and hooks
  if (tool !== 'Write' && tool !== 'Edit') {
    console.log(JSON.stringify({ decision: 'approve' }));
    return;
  }

  const filePath = toolInput?.file_path || '';
  const isEngine = filePath.includes('/engines/') && filePath.endsWith('.ts');
  const isHook = filePath.includes('/hooks/') && filePath.endsWith('.mjs');

  if (!isEngine && !isHook) {
    console.log(JSON.stringify({ decision: 'approve' }));
    return;
  }

  const content = toolInput?.content || toolInput?.new_string || '';

  if (hasSingletonState(content)) {
    console.log(JSON.stringify({
      decision: 'approve', // Warn but don't block
      message: `
⚠️  MULTI-SESSION WARNING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This file uses singleton state without session isolation.

PROBLEM: 8 concurrent Claude chats will overwrite each other's state.

FIX: Use session-specific state files:
  const STATE_DIR = "H:/prism/state/<feature>";
  const getStateFile = () => \`\${STATE_DIR}/state-\${process.env.CLAUDE_SESSION_ID || 'default'}.json\`;

Or use per-agent handoff: state/shared/handoffs/HANDOFF-<instance>.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`
    }));
    return;
  }

  console.log(JSON.stringify({ decision: 'approve' }));
}

main().catch(() => {
  console.log(JSON.stringify({ decision: 'approve' }));
});
