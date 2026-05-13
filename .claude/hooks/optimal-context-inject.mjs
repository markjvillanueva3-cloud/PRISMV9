#!/usr/bin/env node
// tier: T4
/**
 * Optimal Context Inject — UserPromptSubmit Hook
 *
 * Maximizes reasoning potential by:
 * 1. Detecting task complexity (simple/medium/complex/critical)
 * 2. Querying Qdrant for semantically relevant engines (if available)
 * 3. Surfacing relevant agent-memory entries
 * 4. Suggesting appropriate reasoning mode
 *
 * Runs fast (<2s) and injects compact context.
 */

import { readFileSync, existsSync } from 'node:fs';
import { request } from 'node:http';

const QDRANT_URL = 'http://localhost:6333';
const OLLAMA_URL = 'http://localhost:11434';
const AGENT_MEMORY_PATH = 'H:/prism/mcp-server/data/state/agent-memory.json';
const EMBED_MODEL = 'nomic-embed-text';

// ============================================================================
// COMPLEXITY DETECTION
// ============================================================================

const COMPLEXITY_SIGNALS = {
  critical: [
    /safety|collision|crash|S\(x\)/i,
    /kienzle|taylor|(force|cutting).*calc|calc.*(force|cutting)/i,
    /tolerance|precision|accuracy/i,
    /thermal.*expansion|deflection/i,
  ],
  complex: [
    /optim(ize|ization|al)/i,
    /architect|design|system/i,
    /multi.*(axis|agent|step)/i,
    /chatter|vibration|stability/i,
    /neural|ml|machine.?learn/i,
    /cross.?domain|scientific/i,
  ],
  medium: [
    /create|build|implement/i,
    /debug|fix|resolve/i,
    /analyze|investigate/i,
    /compare|evaluate/i,
    /calculate|compute|determine/i,
    /improve|enhance|upgrade/i,
    /review|audit|check/i,
  ],
};

function detectComplexity(text) {
  for (const pattern of COMPLEXITY_SIGNALS.critical) {
    if (pattern.test(text)) return 'critical';
  }
  for (const pattern of COMPLEXITY_SIGNALS.complex) {
    if (pattern.test(text)) return 'complex';
  }
  for (const pattern of COMPLEXITY_SIGNALS.medium) {
    if (pattern.test(text)) return 'medium';
  }
  return 'simple';
}

const REASONING_MODES = {
  critical: {
    mode: 'exhaustive',
    engines: ['DeepAIIntelligenceEngine', 'PRISMCreativeReasoningEngine', 'CrossDisciplinaryDeepLearningEngine'],
    advice: 'CRITICAL: Exhaust all angles. Verify physics. Check safety.'
  },
  complex: {
    mode: 'deep',
    engines: ['DeepAIIntelligenceEngine', 'MetaAIOrchestrationEngine'],
    advice: 'COMPLEX: Use multi-step reasoning. Consider alternatives.'
  },
  medium: {
    mode: 'standard',
    engines: ['NeuralIntegrationEngine'],
    advice: null
  },
  simple: {
    mode: 'quick',
    engines: [],
    advice: null
  }
};

// ============================================================================
// QDRANT SEMANTIC SEARCH (best-effort)
// ============================================================================

async function embedText(text) {
  return new Promise((resolve) => {
    const body = JSON.stringify({ model: EMBED_MODEL, prompt: text.slice(0, 500) });
    const req = request(`${OLLAMA_URL}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      timeout: 1500
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.embedding || null);
        } catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.write(body);
    req.end();
  });
}

async function searchQdrant(collection, vector, limit = 3) {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      vector,
      limit,
      with_payload: true
    });
    const req = request(`${QDRANT_URL}/collections/${collection}/points/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      timeout: 1000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.result || []);
        } catch { resolve([]); }
      });
    });
    req.on('error', () => resolve([]));
    req.on('timeout', () => { req.destroy(); resolve([]); });
    req.write(body);
    req.end();
  });
}

async function findRelevantEngines(prompt) {
  const vector = await embedText(prompt);
  if (!vector) return [];

  const results = await searchQdrant('prism_engines', vector, 5);
  return results
    .filter(r => r.score > 0.6)
    .map(r => ({
      name: r.payload?.name || 'Unknown',
      score: r.score.toFixed(2),
      desc: (r.payload?.description || '').slice(0, 80)
    }));
}

// ============================================================================
// AGENT MEMORY RECALL
// ============================================================================

function recallAgentMemories(prompt, limit = 3) {
  if (!existsSync(AGENT_MEMORY_PATH)) return [];

  try {
    const data = JSON.parse(readFileSync(AGENT_MEMORY_PATH, 'utf8'));
    const memories = data.memories || [];
    if (memories.length === 0) return [];

    // Simple keyword matching (fast)
    const keywords = prompt.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const scored = memories.map(m => {
      const text = `${m.content || ''} ${m.tags?.join(' ') || ''}`.toLowerCase();
      const hits = keywords.filter(k => text.includes(k)).length;
      return { ...m, hits };
    }).filter(m => m.hits > 0)
      .sort((a, b) => b.hits - a.hits)
      .slice(0, limit);

    return scored.map(m => ({
      type: m.type,
      summary: (m.content || '').slice(0, 100)
    }));
  } catch {
    return [];
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  let input;
  try {
    input = JSON.parse(readFileSync(0, 'utf-8'));
  } catch {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const prompt = input.prompt || '';
  if (!prompt || prompt.length < 10) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  // Detect complexity
  const complexity = detectComplexity(prompt);
  const reasoning = REASONING_MODES[complexity];

  // Skip injection for simple tasks
  if (complexity === 'simple') {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const parts = [];

  // Reasoning mode
  parts.push(`## Optimal Context (${complexity})`);
  if (reasoning.advice) {
    parts.push(reasoning.advice);
  }
  if (reasoning.engines.length > 0) {
    parts.push(`Reasoning: ${reasoning.engines.join(', ')}`);
  }

  // Semantic search (best-effort, non-blocking)
  const [engines, memories] = await Promise.all([
    findRelevantEngines(prompt).catch(() => []),
    Promise.resolve(recallAgentMemories(prompt))
  ]);

  if (engines.length > 0) {
    parts.push(`Relevant engines: ${engines.map(e => e.name).join(', ')}`);
  }

  if (memories.length > 0) {
    parts.push(`Related memories: ${memories.map(m => m.type).join(', ')}`);
  }

  console.log(JSON.stringify({
    continue: true,
    additionalContext: parts.join('\n')
  }));
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
