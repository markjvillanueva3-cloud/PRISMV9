#!/usr/bin/env node
// tier: T4
/**
 * Memory System Init — SessionStart Hook
 *
 * Checks memory system health and reports status:
 * - Qdrant connection (localhost:6333)
 * - Ollama embeddings (localhost:11434)
 * - agent-memory.json count
 * - Claude memory files
 *
 * Does NOT block on failures — just reports status.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { request } from 'node:http';
import os from 'node:os';
import path from 'node:path';

const QDRANT_URL = 'http://localhost:6333';
const OLLAMA_URL = 'http://localhost:11434';
const AGENT_MEMORY_PATH = 'H:/prism/mcp-server/data/state/agent-memory.json';
// Per-PC memory dir. Home PC: C:\Users\wompu\... · Work PC: C:\Users\Mark Villanueva\...
// Resolve via os.homedir() so it works on both. Folder name casing (H--PRISM vs H--prism) is
// case-insensitive on Windows, so the uppercase variant is canonical.
const CLAUDE_MEMORY_DIR = path.join(os.homedir(), '.claude', 'projects', 'H--PRISM', 'memory');

// ============================================================================
// CHECKS
// ============================================================================

async function checkQdrant() {
  return new Promise((resolve) => {
    const req = request(`${QDRANT_URL}/collections`, { method: 'GET', timeout: 2000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const count = json.result?.collections?.length || 0;
          resolve({ ok: true, collections: count });
        } catch {
          resolve({ ok: false, error: 'parse error' });
        }
      });
    });
    req.on('error', () => resolve({ ok: false, error: 'not responding' }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, error: 'timeout' }); });
    req.end();
  });
}

async function checkOllama() {
  return new Promise((resolve) => {
    const req = request(`${OLLAMA_URL}/api/tags`, { method: 'GET', timeout: 2000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const models = json.models?.map(m => m.name) || [];
          const hasEmbed = models.some(m => m.includes('embed'));
          resolve({ ok: true, models: models.length, hasEmbed });
        } catch {
          resolve({ ok: false, error: 'parse error' });
        }
      });
    });
    req.on('error', () => resolve({ ok: false, error: 'not responding' }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, error: 'timeout' }); });
    req.end();
  });
}

function checkAgentMemory() {
  try {
    if (existsSync(AGENT_MEMORY_PATH)) {
      const content = readFileSync(AGENT_MEMORY_PATH, 'utf8');
      const data = JSON.parse(content);
      const count = data.memories?.length || 0;
      return { ok: true, count };
    }
  } catch { /* ignore */ }
  return { ok: false, count: 0 };
}

function checkClaudeMemory() {
  try {
    if (existsSync(CLAUDE_MEMORY_DIR)) {
      const files = readdirSync(CLAUDE_MEMORY_DIR).filter(f => f.endsWith('.md'));
      return { ok: true, count: files.length };
    }
  } catch { /* ignore */ }
  return { ok: false, count: 0 };
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const [qdrant, ollama] = await Promise.all([checkQdrant(), checkOllama()]);
  const agentMem = checkAgentMemory();
  const claudeMem = checkClaudeMemory();

  const parts = [];
  parts.push('## Memory Systems');

  // Qdrant status
  if (qdrant.ok) {
    if (qdrant.collections === 0) {
      parts.push(`Qdrant: UP (empty — run prism_memory:seed to populate)`);
    } else {
      parts.push(`Qdrant: ${qdrant.collections} collections`);
    }
  } else {
    parts.push(`Qdrant: DOWN (${qdrant.error})`);
  }

  // Ollama status
  if (ollama.ok) {
    parts.push(`Ollama: ${ollama.models} models${ollama.hasEmbed ? ' (embed ready)' : ''}`);
  } else {
    parts.push(`Ollama: DOWN (${ollama.error})`);
  }

  // Memory counts
  parts.push(`MCP Memory: ${agentMem.count} memories | Claude: ${claudeMem.count} files`);

  console.log(JSON.stringify({
    continue: true,
    additionalContext: parts.join(' | ')
  }));
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
