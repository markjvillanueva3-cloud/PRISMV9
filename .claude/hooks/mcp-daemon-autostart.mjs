#!/usr/bin/env node
// tier: T4
/**
 * mcp-daemon-autostart.mjs — SessionStart Hook
 *
 * Auto-starts the shared MCP HTTP daemon on session start.
 * This ensures all Claude chats share a single MCP server instance
 * instead of each spawning their own stdio process.
 *
 * @hook SessionStart
 */

import { spawn } from "child_process";
import http from "http";

const DAEMON_HELPER = "H:/prism/.claude/helpers/mcp-server-daemon.mjs";
const HTTP_PORT = 3100;
const HTTP_HOST = "127.0.0.1";
const HEALTH_URL = `http://${HTTP_HOST}:${HTTP_PORT}/health`;
const HEALTH_TIMEOUT_MS = 3000;
const POLL_BUDGET_MS = 5000;
const POLL_INTERVAL_MS = 250;

function checkHealth() {
  return new Promise((resolve) => {
    const req = http.get(HEALTH_URL, { timeout: HEALTH_TIMEOUT_MS }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => { req.destroy(); resolve(false); });
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  // Quick health check first — daemon usually persists between sessions.
  if (await checkHealth()) {
    console.log(JSON.stringify({
      continue: true,
      systemMessage: `MCP daemon: healthy on port ${HTTP_PORT}`
    }));
    return;
  }

  // Daemon not running. Spawn it DETACHED so the SessionStart hook does
  // not block on the 30s daemon-warmup. stdio fallback (line below) lets
  // Claude proceed immediately if the daemon is slow; the daemon will
  // be ready for the next tool call when warmup completes.
  try {
    const child = spawn(process.execPath, [DAEMON_HELPER, "start"], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    child.unref();
  } catch {
    // Spawn itself failed — fall through to stdio fallback message.
  }

  // Brief poll: if daemon comes up within POLL_BUDGET_MS, signal "started".
  // Otherwise signal "warming" and let Claude proceed without blocking.
  const deadline = Date.now() + POLL_BUDGET_MS;
  while (Date.now() < deadline) {
    if (await checkHealth()) {
      console.log(JSON.stringify({
        continue: true,
        systemMessage: `MCP daemon: started on port ${HTTP_PORT}`,
      }));
      return;
    }
    await sleep(POLL_INTERVAL_MS);
  }

  // Did not come up within poll budget — daemon is warming in background.
  // Claude proceeds on stdio fallback; subsequent tool calls will pick up
  // the daemon once it's ready.
  console.log(JSON.stringify({
    continue: true,
    systemMessage: `MCP daemon: warming in background (using stdio fallback). Will be ready shortly.`,
  }));
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
