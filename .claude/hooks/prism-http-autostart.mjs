#!/usr/bin/env node
// tier: T2
/**
 * prism-http-autostart.mjs — SessionStart hook
 *
 * Ensures the shared PRISM HTTP server is running before Claude needs it.
 * If not running, starts it in background.
 *
 * Benefits:
 * - Single server for all 6-8 concurrent chats
 * - 16GB total memory instead of 96GB (6 × 16GB)
 * - No file contention between server instances
 */

import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';

// Canonical port — must match MCP_HTTP_URL in .mcp.json. The wired hook
// is mcp-daemon-autostart.mjs (which uses 3100); this file is a legacy
// orphan kept aligned to avoid surprising anyone who runs it manually.
const PRISM_HTTP_PORT = 3100;
const HEALTH_URL = `http://localhost:${PRISM_HTTP_PORT}/health`;
const STARTUP_SCRIPT = 'H:/prism/.claude/scripts/start-prism-http.sh';
const PID_FILE = 'H:/prism/.claude/cache/prism-http.pid';

function isServerRunning() {
  try {
    const result = execSync(`curl -s --max-time 2 ${HEALTH_URL}`, { windowsHide: true,
      encoding: 'utf-8',
      timeout: 3000
    });
    const health = JSON.parse(result);
    return health.status === 'healthy' || health.status === 'degraded';
  } catch {
    return false;
  }
}

function startServer() {
  try {
    // Start in detached mode so it survives this process
    const child = spawn('bash', [STARTUP_SCRIPT], {
      detached: true, windowsHide: true,
      stdio: 'ignore',
      cwd: 'H:/prism/mcp-server',
      env: {
        ...process.env,
        TRANSPORT: 'http',
        PORT: String(PRISM_HTTP_PORT),
        LOG_LEVEL: 'info',
        NODE_OPTIONS: '--max-old-space-size=16384'
      }
    });

    child.unref();

    // Save PID for later management
    fs.mkdirSync('H:/prism/.claude/cache', { recursive: true });
    fs.writeFileSync(PID_FILE, String(child.pid));

    return child.pid;
  } catch (e) {
    return null;
  }
}

function waitForServer(maxWaitMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    if (isServerRunning()) return true;
    execSync('sleep 0.5');
  }
  return false;
}

async function main() {
  // Check if HTTP server is already running
  if (isServerRunning()) {
    console.log(JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext: `✓ PRISM HTTP server running on port ${PRISM_HTTP_PORT}`
      }
    }));
    return;
  }

  // Server not running - start it
  const pid = startServer();
  if (!pid) {
    console.log(JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext: `⚠ Failed to start PRISM HTTP server. Run manually: bash ${STARTUP_SCRIPT}`
      }
    }));
    return;
  }

  // Wait for server to be ready
  const ready = waitForServer(15000);
  if (ready) {
    console.log(JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext: `✓ Started PRISM HTTP server (PID ${pid}) on port ${PRISM_HTTP_PORT}`
      }
    }));
  } else {
    console.log(JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext: `⚠ PRISM HTTP server starting (PID ${pid}) but not ready yet. May need manual check.`
      }
    }));
  }
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
