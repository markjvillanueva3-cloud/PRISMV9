#!/usr/bin/env node
// tier: T4
/**
 * ollama-obsidian-rag.mjs — UserPromptSubmit hook
 *
 * RAG (Retrieval-Augmented Generation) over Obsidian vault:
 * 1. Detect queries that could benefit from memory lookup
 * 2. Search Obsidian vault for relevant memories
 * 3. Use Ollama to summarize relevant context
 *
 * Token savings: Avoids Claude reading 57+ memory files (~200 tokens each)
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { recordOllamaEvent } from './lib/ollama-stats.mjs';

const HOOK_NAME = 'ollama-obsidian-rag';
// Conservative estimate: 5 memory files × ~200 tokens each = ~1000 tokens raw.
// RAG summary is ~150 tokens. Net Claude-context savings ~400 tokens after
// accounting for the summary still being injected.
const TOKENS_SAVED_PER_RAG = 400;

const OBSIDIAN_VAULT = 'H:/prism/knowledge';
const RATE_FILE = 'H:/prism/.claude/cache/obsidian-rag-last.json';
const RATE_WINDOW_MS = 45 * 1000; // 45 seconds

// INTEL-OLLAMA-OBSIDIAN-MS0/P3-U05: when MCP is up, use Qdrant
// semantic_search alongside the keyword scan for higher recall on
// CLAUDE.md chunks (kind=rule) and mirrored MEMORY.md (kind=note).
const MCP_TIMEOUT_MS = 3_000;
function mcpUrl() { return process.env.MCP_HTTP_URL ?? 'http://127.0.0.1:3100/mcp'; }

async function semanticSearchVault(query, kind, limit) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), MCP_TIMEOUT_MS);
  try {
    const res = await fetch(mcpUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'tools/call',
        params: { name: 'prism_memory', arguments: { action: 'semantic_search', params: { query, kind, limit } } },
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return [];
    const body = await res.json();
    const inner = body?.result?.content?.[0]?.text ?? '';
    try {
      const parsed = JSON.parse(inner);
      return Array.isArray(parsed?.items) ? parsed.items : [];
    } catch { return []; }
  } catch {
    clearTimeout(timer);
    return [];
  }
}

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return '';
    return fs.readFileSync(0, 'utf-8');
  } catch {
    return '';
  }
}

function checkRateLimit() {
  try {
    const last = JSON.parse(fs.readFileSync(RATE_FILE, 'utf8'));
    return (Date.now() - last.timestamp) < RATE_WINDOW_MS;
  } catch {
    return false;
  }
}

function recordRate() {
  try {
    fs.writeFileSync(RATE_FILE, JSON.stringify({ timestamp: Date.now() }));
  } catch {}
}

function shouldQueryMemory(prompt) {
  const lower = prompt.toLowerCase();
  // Triggers for memory lookup
  return /remember|recall|previous|last time|you said|we discussed|feedback|preference|user|shop|jm die|tribal|decision|why did|how do i/i.test(lower);
}

function searchVault(query) {
  const results = [];
  const keywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);

  function searchDir(dir) {
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory() && !file.startsWith('.')) {
          searchDir(filePath);
        } else if (file.endsWith('.md')) {
          try {
            const content = fs.readFileSync(filePath, 'utf8');
            const contentLower = content.toLowerCase();

            // Score by keyword matches
            let score = 0;
            for (const kw of keywords) {
              if (contentLower.includes(kw)) score++;
            }

            if (score > 0) {
              results.push({
                path: filePath.replace(OBSIDIAN_VAULT, ''),
                score,
                snippet: content.slice(0, 300),
              });
            }
          } catch {}
        }
      }
    } catch {}
  }

  searchDir(OBSIDIAN_VAULT);
  return results.sort((a, b) => b.score - a.score).slice(0, 5);
}

async function queryOllamaRAG(prompt, memories) {
  if (!memories.length) return null;

  const memoryContext = memories.map(m =>
    `[${m.path}]: ${m.snippet.slice(0, 200)}`
  ).join('\n\n');

  const ollamaPrompt = `You are a PRISM memory assistant. Given this question and relevant memories, provide a brief answer (max 50 words).

Question: "${prompt.slice(0, 200)}"

Relevant memories:
${memoryContext}

Brief answer:`;

  try {
    const body = JSON.stringify({
      model: 'qwen2.5-coder:32b',
      prompt: ollamaPrompt,
      stream: false,
      options: { num_predict: 100 }
    });

    const result = execSync(
      `curl -s -X POST http://localhost:11434/api/generate -d '${body.replace(/'/g, "'\"'\"'")}'`,
      { encoding: 'utf-8', timeout: 5000 }
    );

    const parsed = JSON.parse(result);
    return parsed.response?.trim();
  } catch {
    return null;
  }
}

async function main() {
  const input = readStdinSafe();
  if (!input) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  let payload;
  try {
    payload = JSON.parse(input);
  } catch {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const prompt = payload.prompt || payload.message || '';

  if (!prompt || prompt.length < 15 || prompt.startsWith('/')) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  if (!shouldQueryMemory(prompt)) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  if (checkRateLimit()) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  recordRate();

  const memories = searchVault(prompt);

  // INTEL-OLLAMA-OBSIDIAN-MS0/P3-U05: query Qdrant in parallel for
  // semantic neighbors over CLAUDE.md chunks + mirrored memories.
  const [semRules, semNotes, semTips] = await Promise.all([
    semanticSearchVault(prompt, 'rule', 3),
    semanticSearchVault(prompt, 'note', 3),
    semanticSearchVault(prompt, 'tip', 2),
  ]);
  const semHits = [...semRules, ...semNotes, ...semTips];
  for (const h of semHits) {
    const text = typeof h.text === 'string' ? h.text : '';
    if (!text) continue;
    memories.push({
      path: typeof h.id === 'string' ? `[qdrant:${h.kind ?? 'note'}] ${h.id}` : '[qdrant]',
      score: typeof h.score === 'number' ? Math.round(h.score * 10) : 1,
      snippet: text.slice(0, 300),
    });
  }
  // Re-rank merged memories and cap at 5 for the Ollama prompt
  memories.sort((a, b) => b.score - a.score);
  const top = memories.slice(0, 5);
  if (!top.length) {
    recordOllamaEvent({
      hook: HOOK_NAME, decision: 'keep', category: 'no-memory-hits',
      extras: { snippet: prompt.slice(0, 80) },
    });
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const answer = await queryOllamaRAG(prompt, top);
  if (!answer) {
    recordOllamaEvent({
      hook: HOOK_NAME, decision: 'suggest',
      category: 'memory-rag',
      extras: { mode: 'ollama-down', memoriesFound: top.length },
    });
    const fileList = top.map(m => m.path.split('/').pop()).join(', ');
    console.log(JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: 'UserPromptSubmit',
        additionalContext: `**Memory Found:** ${fileList}`,
      }
    }));
    return;
  }

  recordOllamaEvent({
    hook: HOOK_NAME, decision: 'offload',
    category: 'memory-rag', tokensSaved: TOKENS_SAVED_PER_RAG,
    extras: { mode: 'rag-hit', memoriesUsed: top.length },
  });

  console.log(JSON.stringify({
    continue: true,
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: `**Memory Recall:** ${answer}`,
    }
  }));
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
