#!/usr/bin/env node
/**
 * mcp-daemon-autostart.mjs — SessionStart Hook
 *
 * Auto-starts the shared MCP HTTP daemon on session start.
 * This ensures all Claude chats share a single MCP server instance
 * instead of each spawning their own stdio process.
 *
 * @hook SessionStart
 */

import { spawnSync } from "child_process";
import http from "http";

const DAEMON_HELPER = "H:/prism/.claude/helpers/mcp-server-daemon.mjs";
const HTTP_PORT = 3100;
const HTTP_HOST = "127.0.0.1";
const HEALTH_URL = `http://${HTTP_HOST}:${HTTP_PORT}/health`;
const HEALTH_TIMEOUT_MS = 3000;

async function checkHealth() {
  return new Promise((resolve) => {
    const req = http.get(HEALTH_URL, { timeout: HEALTH_TIMEOUT_MS }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => { req.destroy(); resolve(false); });
  });
}

async function main() {
  // Quick health check first
  const alreadyHealthy = await checkHealth();
  if (alreadyHealthy) {
    console.log(JSON.stringify({
      continue: true,
      systemMessage: `MCP daemon: healthy on port ${HTTP_PORT}`
    }));
    return;
  }

  // Try to start the daemon
  const result = spawnSync(process.execPath, [DAEMON_HELPER, "start"], {
    encoding: "utf-8",
    timeout: 35000, // 35 seconds (daemon startup is 30s max)
    windowsHide: true
  });

  if (result.status === 0) {
    console.log(JSON.stringify({
      continue: true,
      systemMessage: `MCP daemon: started on port ${HTTP_PORT}`
    }));
  } else {
    // Non-fatal — Claude can still use stdio fallback
    console.log(JSON.stringify({
      continue: true,
      systemMessage: `MCP daemon: start failed (using stdio fallback). Run manually: node ${DAEMON_HELPER} start`
    }));
  }
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
