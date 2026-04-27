#!/usr/bin/env node
/**
 * mcp-http-bridge.mjs — Stdio-to-HTTP MCP Bridge with Request Queue
 *
 * Solves the multi-chat MCP contention problem:
 * - Each Claude chat connects via stdio to THIS bridge
 * - Bridge forwards requests to a single shared HTTP MCP server
 * - Request queue prevents concurrent tool call collisions
 * - Connection pooling keeps HTTP overhead minimal
 *
 * Usage:
 *   1. Start PRISM MCP server in HTTP mode: TRANSPORT=http node dist/index.js
 *   2. Configure Claude to use this bridge instead of direct stdio
 *
 * Architecture:
 *   Claude Chat 1 ──stdio──┐
 *   Claude Chat 2 ──stdio──┼──▶ mcp-http-bridge ──HTTP──▶ PRISM MCP Server
 *   Claude Chat 3 ──stdio──┘   (request queue)          (single instance)
 */

import { createInterface } from "readline";
import http from "http";
import https from "https";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

// Configuration
// 127.0.0.1 explicit — daemon binds IPv4, "localhost" resolves to ::1 on
// modern Windows/Node and triggers ECONNREFUSED ::1:3100.
const MCP_HTTP_URL = process.env.MCP_HTTP_URL || "http://127.0.0.1:3100/mcp";
const MAX_CONCURRENT = parseInt(process.env.MCP_MAX_CONCURRENT || "3", 10);
const REQUEST_TIMEOUT = parseInt(process.env.MCP_TIMEOUT || "120000", 10);
const QUEUE_FILE = "H:/prism/.claude/cache/mcp-request-queue.json";
const LOG_FILE = "H:/prism/.claude/cache/mcp-bridge.log";

// Request queue
const requestQueue = [];
let activeRequests = 0;
const pendingResponses = new Map();

// Bridge identity for this instance
const bridgeId = `bridge-${process.pid}-${Date.now().toString(36)}`;

function log(level, msg, data = {}) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    bridge: bridgeId,
    msg,
    ...data
  };
  try {
    fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + "\n");
  } catch {}
  if (level === "error") {
    process.stderr.write(`[mcp-bridge] ${msg}\n`);
  }
}

function updateQueueState() {
  try {
    fs.mkdirSync(path.dirname(QUEUE_FILE), { recursive: true });
    fs.writeFileSync(QUEUE_FILE, JSON.stringify({
      bridgeId,
      activeRequests,
      queueLength: requestQueue.length,
      timestamp: Date.now()
    }));
  } catch {}
}

/**
 * Forward a JSON-RPC request to the HTTP MCP server
 */
async function forwardToHttp(jsonRpcRequest) {
  return new Promise((resolve, reject) => {
    const url = new URL(MCP_HTTP_URL);
    const isHttps = url.protocol === "https:";
    const client = isHttps ? https : http;

    const body = JSON.stringify(jsonRpcRequest);

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // StreamableHTTPServerTransport requires both content types in Accept.
        "Accept": "application/json, text/event-stream",
        "Content-Length": Buffer.byteLength(body),
        "X-Bridge-Id": bridgeId,
        "X-Request-Id": jsonRpcRequest.id || randomUUID()
      },
      timeout: REQUEST_TIMEOUT
    };

    const req = client.request(options, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try {
          const response = JSON.parse(data);
          resolve(response);
        } catch (e) {
          reject(new Error(`Invalid JSON response: ${data.slice(0, 200)}`));
        }
      });
    });

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`Request timeout after ${REQUEST_TIMEOUT}ms`));
    });

    req.write(body);
    req.end();
  });
}

/**
 * Process the next request in the queue
 */
async function processQueue() {
  if (activeRequests >= MAX_CONCURRENT || requestQueue.length === 0) {
    return;
  }

  const { request, resolve, reject, startTime } = requestQueue.shift();
  activeRequests++;
  updateQueueState();

  const queueWait = Date.now() - startTime;
  log("info", "Processing request", {
    method: request.method,
    id: request.id,
    queueWait,
    active: activeRequests,
    queued: requestQueue.length
  });

  try {
    const response = await forwardToHttp(request);
    resolve(response);
  } catch (error) {
    log("error", "Request failed", {
      method: request.method,
      id: request.id,
      error: error.message
    });

    // Return JSON-RPC error response
    resolve({
      jsonrpc: "2.0",
      id: request.id,
      error: {
        code: -32603,
        message: `Bridge error: ${error.message}`
      }
    });
  } finally {
    activeRequests--;
    updateQueueState();
    // Process next in queue
    setImmediate(processQueue);
  }
}

/**
 * Queue a request and return a promise for its response
 */
function queueRequest(request) {
  return new Promise((resolve, reject) => {
    requestQueue.push({
      request,
      resolve,
      reject,
      startTime: Date.now()
    });

    log("info", "Request queued", {
      method: request.method,
      id: request.id,
      queueLength: requestQueue.length
    });

    updateQueueState();
    processQueue();
  });
}

/**
 * Handle incoming stdio messages (JSON-RPC from Claude)
 */
async function handleStdioMessage(line) {
  let request;
  try {
    request = JSON.parse(line);
  } catch (e) {
    log("error", "Invalid JSON from stdin", { line: line.slice(0, 100) });
    return;
  }

  // Handle JSON-RPC request
  if (request.method) {
    const response = await queueRequest(request);
    // Send response back via stdout
    process.stdout.write(JSON.stringify(response) + "\n");
  }
}

/**
 * Check if the HTTP MCP server is running
 */
async function checkServer() {
  return new Promise((resolve) => {
    const url = new URL(MCP_HTTP_URL);
    const client = url.protocol === "https:" ? https : http;

    const req = client.request({
      hostname: url.hostname,
      port: url.port || 80,
      path: "/health",
      method: "GET",
      timeout: 5000
    }, (res) => {
      resolve(res.statusCode < 500);
    });

    req.on("error", () => resolve(false));
    req.on("timeout", () => { req.destroy(); resolve(false); });
    req.end();
  });
}

async function main() {
  log("info", "Bridge starting", {
    pid: process.pid,
    mcpUrl: MCP_HTTP_URL,
    maxConcurrent: MAX_CONCURRENT
  });

  // Check if MCP server is running
  const serverUp = await checkServer();
  if (!serverUp) {
    log("error", "MCP HTTP server not responding", { url: MCP_HTTP_URL });
    process.stderr.write(`[mcp-bridge] WARNING: MCP server at ${MCP_HTTP_URL} not responding. Start it with: TRANSPORT=http npm start\n`);
  }

  // Set up stdin readline interface
  const rl = createInterface({
    input: process.stdin,
    terminal: false
  });

  rl.on("line", async (line) => {
    if (line.trim()) {
      await handleStdioMessage(line);
    }
  });

  rl.on("close", () => {
    log("info", "Bridge stdin closed, exiting");
    process.exit(0);
  });

  // Handle shutdown
  process.on("SIGINT", () => {
    log("info", "Bridge received SIGINT");
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    log("info", "Bridge received SIGTERM");
    process.exit(0);
  });

  log("info", "Bridge ready, waiting for requests");
}

main().catch(err => {
  log("error", "Bridge fatal error", { error: err.message });
  process.exit(1);
});
