/**
 * PRISM API Proxy — Lightweight Express server that proxies REST calls to MCP server via stdio.
 * Run: node api-proxy.mjs
 * Listens: http://localhost:3000
 * Vite dev server at :3100 proxies /api → here
 */
import express from 'express';
import { spawn } from 'child_process';
import { randomUUID } from 'crypto';

const app = express();
app.use(express.json());

// CORS for local dev
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Health
app.get('/health', (_, res) => res.json({ status: 'ok', mode: 'api-proxy' }));

// Spawn MCP server in stdio mode
let mcpProcess = null;
let pending = new Map();
let buffer = '';

function startMCP() {
  mcpProcess = spawn('node', ['dist/index.js'], {
    cwd: 'C:/PRISM/mcp-server',
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, TRANSPORT: 'stdio' }
  });
