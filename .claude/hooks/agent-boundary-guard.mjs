#!/usr/bin/env node
// tier: T1
/**
 * Agent Boundary Guard Hook (PreToolUse)
 *
 * Enforces AGENT_BOUNDARY_DIRECTIVE.md:
 * - Claude (backend) blocked from frontend files
 * - Codex (frontend) blocked from backend files
 *
 * Blocking hook: continueOnError = false
 */

import { readFileSync, existsSync } from 'fs';

const FRONTEND_PATHS = [
  'web/src/pages/',
  'web/src/components/',
  'web/src/App.tsx',
  'web/src/main.tsx',
  'web/src/index.css',
  '/pages/',
  '/components/'
];

const BACKEND_PATHS = [
  'mcp-server/src/engines/',
  'mcp-server/src/tools/dispatchers/',
  'mcp-server/src/schemas/',
  'mcp-server/src/physics/',
  'mcp-server/src/algorithms/',
  'mcp-server/src/registries/',
  'mcp-server/src/hooks/',
  'mcp-server/src/mcp/',
  'mcp-server/src/db/',
  '/engines/',
  '/dispatchers/',
  '/schemas/',
  '/physics/',
  '/algorithms/',
  '/registries/'
];

const FRONTEND_MILESTONES = ['APP-', 'APPW-', 'FMERGE-', 'WEB-', 'UI-'];
const BACKEND_MILESTONES = ['S0', 'QA', 'SYS', 'CAMK', 'CAMX', 'WEDM', 'ACP', 'RES', 'SAFE', 'PHYS', 'BIZ'];

function detectAgentFamily() {
  // Check environment or process name
  const agentFamily = process.env.PRISM_AGENT_FAMILY ||
                      process.env.AGENT_FAMILY ||
                      'Claude'; // Default to Claude for backend work
  return agentFamily.toLowerCase();
}

function isFrontendPath(filePath) {
  const normalized = filePath.replace(/\\/g, '/').toLowerCase();
  return FRONTEND_PATHS.some(p => normalized.includes(p.toLowerCase()));
}

function isBackendPath(filePath) {
  const normalized = filePath.replace(/\\/g, '/').toLowerCase();
  return BACKEND_PATHS.some(p => normalized.includes(p.toLowerCase()));
}

function main() {
  try {
    const toolInput = process.env.TOOL_INPUT || '{}';
    const tool = process.env.TOOL || '';

    // Only check Write/Edit/MultiEdit operations
    if (!['Write', 'Edit', 'MultiEdit'].includes(tool)) {
      process.exit(0);
    }

    let input;
    try {
      input = JSON.parse(toolInput);
    } catch {
      // Try to get file_path from env
      input = { file_path: process.env.TOOL_INPUT_file_path || '' };
    }

    const filePath = input.file_path || '';
    if (!filePath) {
      process.exit(0);
    }

    const agent = detectAgentFamily();

    // Claude (backend) trying to edit frontend
    if (agent === 'claude' && isFrontendPath(filePath)) {
      console.log(JSON.stringify({
        decision: 'block',
        reason: `AGENT_BOUNDARY_DIRECTIVE: Claude is blocked from frontend files. File: ${filePath}\nTo override: User must explicitly say "Claude, you may work on [this frontend file]"`,
        directive: 'AGENT_BOUNDARY_DIRECTIVE.md'
      }));
      process.exit(1);
    }

    // Codex (frontend) trying to edit backend
    if (agent === 'codex' && isBackendPath(filePath)) {
      console.log(JSON.stringify({
        decision: 'block',
        reason: `AGENT_BOUNDARY_DIRECTIVE: Codex is blocked from backend files. File: ${filePath}\nTo override: User must explicitly say "Codex, you may work on [this backend file]"`,
        directive: 'AGENT_BOUNDARY_DIRECTIVE.md'
      }));
      process.exit(1);
    }

    // Allowed
    process.exit(0);

  } catch (err) {
    // On error, allow (fail-open for this advisory check)
    console.error(`agent-boundary-guard error: ${err.message}`);
    process.exit(0);
  }
}

try { main(); } catch { process.stdout.write(JSON.stringify({ continue: true })); }
