#!/usr/bin/env node
// tier: T4
/**
 * ollama-context-aggregator.mjs — Single UserPromptSubmit injection point
 *
 * Designed for up to 8 concurrent chats — replaces 3 redundant routers
 * (ollama-route-recommender, ollama-unified-semantic-router,
 *  ollama-prism-intelligence) with one consolidated pattern matcher.
 *
 * Output blocks (only those that match are emitted):
 *   1. **Domain context** — guidance per matched PRISM domain (10 domains)
 *   2. **Route**          — dispatcher:action recommendation (was route-recommender)
 *   3. **AI engines**     — relevant PRISM AI engines (was prism-intelligence)
 *
 * Calls Ollama only when 3+ domains match AND prompt > 100 chars; otherwise
 * pure pattern matching for <10ms latency. ollama-auto-router still runs
 * separately because it embeds Ollama-generated content (summaries, error
 * triage, scaffolds) — that's real work, not advisory.
 */

import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { recordOllamaEvent } from './lib/ollama-stats.mjs';

const HOOK_NAME = 'ollama-context-aggregator';

// ── Domain patterns (advisory context) ────────────────────────────────────
const DOMAIN_CHECKS = {
  physics: {
    re: /force|kienzle|taylor|thermal|deflection|chatter|surface.*finish|roughness|power|torque|mrr/i,
    ctx: 'Use prism_calc dispatcher. Import constants from src/physics/constants.ts.',
    route: 'prism_calc:cutting_force_kienzle',
    routeAlt: ['thermal_analyze', 'deflection_calculate'],
  },
  duplication: {
    re: /create|build|new|add.*engine|add.*hook|add.*skill/i,
    ctx: 'Run /dedup first. Use duplicationGuardEngine.mustCheckBeforeCreating().',
    route: 'prism_dev:duplicate_check',
    routeAlt: ['inventory_list', 'engine_browse'],
  },
  toolpath: {
    re: /toolpath|gcode|feeds.*speeds|cam|machining|milling|turning/i,
    ctx: 'Use prism_cam or prism_mill dispatcher. Check ToolpathStrategyEngine.',
    route: 'prism_cam:toolpath_generate',
    routeAlt: ['feeds_speeds_optimize', 'program_validate'],
  },
  safety: {
    re: /safety|collision|limit|S\(x\)|validate/i,
    ctx: 'Use prism_safety dispatcher. All physics outputs must feed S(x) scoring.',
    route: 'prism_safety:validate_physics',
    routeAlt: ['collision_check', 'sx_score'],
  },
  wedm: {
    re: /wire.*edm|wedm|spark|erosion/i,
    ctx: 'Use prism_cam:wedm_* actions. 62 WEDM engines available.',
    route: 'prism_cam:wedm_parameters',
    routeAlt: ['wedm_toolpath', 'wedm_validate'],
  },
  testing: {
    re: /test|vitest|spec|coverage/i,
    ctx: 'Use rtk vitest run (99% savings). Tests must be real, not placeholders.',
    route: 'prism_dev:test_run',
    routeAlt: ['quality_dashboard', 'coverage_report'],
  },
  build: {
    re: /build|compile|tsc|error/i,
    ctx: 'Use rtk npm run build:fast (3s). Check build cache state.',
    route: 'prism_dev:build',
    routeAlt: ['quality_dashboard', 'auto_wiring_analyze'],
  },
  hooks: {
    re: /hook|userprompt|pretool|posttool|sessionstart/i,
    ctx: 'Hooks in .claude/hooks/. Use OllamaHookBridgeEngine for local inference.',
    route: 'prism_dev:hook_browse',
    routeAlt: ['hook_profile', 'hook_status'],
  },
  roadmap: {
    re: /milestone|roadmap|task|unit|claim/i,
    ctx: 'Check CURRENT_POSITION.md. Use /pick-task to claim work.',
    route: 'prism_session:roadmap_status',
    routeAlt: ['claim_status', 'milestone_view'],
  },
  memory: {
    re: /remember|memory|persist|handoff/i,
    ctx: 'Use per-agent-handoff.mjs for this chat. MEMORY.md < 200 lines.',
    route: 'prism_memory:store',
    routeAlt: ['recall', 'search'],
  },
};

// ── PRISM AI engines (formerly ollama-prism-intelligence) ─────────────────
const AI_ENGINE_CHECKS = [
  { re: /\b(complex|analyze|design|architect|optimize|trade-?off|decision|compare|evaluate)\b/i,
    name: 'PRISMCreativeReasoningEngine', desc: 'cross-domain synthesis' },
  { re: /\b(pattern|learn|neural|ml|ai|predict|classify|cluster|model)\b/i,
    name: 'CrossDisciplinaryDeepLearningEngine', desc: 'pattern recognition' },
  { re: /\b(step by step|chain|sequence|logic|proof|derive|because|therefore)\b/i,
    name: 'ReasoningChainEngine', desc: 'multi-step reasoning' },
  { re: /\b(what can|capabilities|features|engines|dispatchers|tools|prism)\b/i,
    name: 'PRISMSelfAwarenessEngine', desc: 'system introspection' },
];

function collectSignals(prompt) {
  const matched = [];
  for (const [domain, check] of Object.entries(DOMAIN_CHECKS)) {
    if (check.re.test(prompt)) matched.push({ domain, ...check });
  }
  return matched;
}

function recommendAiEngines(prompt) {
  const matches = [];
  for (const e of AI_ENGINE_CHECKS) {
    if (e.re.test(prompt)) matches.push(`${e.name} (${e.desc})`);
    if (matches.length >= 2) break;
  }
  return matches;
}

// Returns { text, source } where source is 'pattern' | 'ollama' | 'ollama-fallback'.
// Caller uses source to record the right decision in the stats ledger.
async function queryOllamaPrioritization(prompt, signals) {
  if (signals.length < 3) {
    const text = signals.slice(0, 3).map(s => `**${s.domain}**: ${s.ctx}`).join('\n');
    return { text, source: 'pattern' };
  }
  try {
    const ollamaPrompt = `Given the user prompt and these PRISM domain signals, return the 3 MOST relevant as a bulleted list.

Prompt: "${prompt.slice(0, 400)}"

Signals:
${signals.map((s, i) => `${i + 1}. [${s.domain}] ${s.ctx}`).join('\n')}

Return only the 3 selected domain names, one per line:`;
    const body = JSON.stringify({
      model: 'qwen2.5-coder:32b',
      prompt: ollamaPrompt,
      stream: false,
      options: { num_predict: 100 }
    });
    const result = execSync(
      `curl -s -X POST http://localhost:11434/api/generate -d '${body.replace(/'/g, "'\\''")}'`,
      { encoding: 'utf-8', timeout: 4000 }
    );
    const parsed = JSON.parse(result);
    if (parsed.response) {
      const picked = signals.filter(s =>
        parsed.response.toLowerCase().includes(s.domain.toLowerCase())
      ).slice(0, 3);
      if (picked.length > 0) {
        return {
          text: picked.map(s => `**${s.domain}**: ${s.ctx}`).join('\n'),
          source: 'ollama',
        };
      }
    }
  } catch { /* ollama unavailable — fallback */ }
  return {
    text: signals.slice(0, 3).map(s => `**${s.domain}**: ${s.ctx}`).join('\n'),
    source: 'ollama-fallback',
  };
}

function readStdin() {
  try {
    if (process.stdin.isTTY) return null;
    return JSON.parse(readFileSync(0, 'utf-8'));
  } catch { return null; }
}

async function main() {
  const stdin = readStdin();
  const prompt = stdin?.prompt || '';
  if (!prompt || prompt.length < 20 || prompt.startsWith('/')) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const signals = collectSignals(prompt);
  const aiEngines = recommendAiEngines(prompt);

  if (signals.length === 0 && aiEngines.length === 0) {
    recordOllamaEvent({
      hook: HOOK_NAME, decision: 'keep', category: 'no-signal',
      extras: { snippet: prompt.slice(0, 80) },
    });
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const blocks = [];
  let priSource = 'pattern';

  if (signals.length > 0) {
    const { text, source } = await queryOllamaPrioritization(prompt, signals);
    priSource = source;
    blocks.push(`## PRISM Context (${signals.length} domain${signals.length > 1 ? 's' : ''})\n${text}`);
  }

  if (signals.length > 0) {
    const primary = signals[0];
    blocks.push(`**Route:** \`${primary.route}\` (alt: ${primary.routeAlt.slice(0, 2).join(', ')})`);
  }

  if (aiEngines.length > 0) {
    blocks.push(`**AI engines:** ${aiEngines.join(' · ')}`);
  }

  // Record decision: Ollama-prioritized = offload (~75 tokens saved by avoiding
  // re-prioritization round-trip); pattern-only = suggest-injected; ollama-down
  // = suggest with ollama-down marker.
  const primaryDomain = signals[0]?.domain || 'ai-engines';
  if (priSource === 'ollama') {
    const TOKENS_SAVED_OLLAMA_PRIORITIZE = 75;
    recordOllamaEvent({
      hook: HOOK_NAME, decision: 'offload',
      category: primaryDomain, tokensSaved: TOKENS_SAVED_OLLAMA_PRIORITIZE,
      extras: { mode: 'prioritize', domains: signals.length },
    });
  } else if (priSource === 'ollama-fallback') {
    recordOllamaEvent({
      hook: HOOK_NAME, decision: 'suggest',
      category: primaryDomain,
      extras: { mode: 'ollama-down', domains: signals.length },
    });
  } else {
    recordOllamaEvent({
      hook: HOOK_NAME, decision: 'suggest',
      category: primaryDomain,
      extras: { mode: 'injected', domains: signals.length, aiEngines: aiEngines.length },
    });
  }

  console.log(JSON.stringify({
    continue: true,
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: blocks.join('\n\n'),
    }
  }));
}

main().catch(() => console.log(JSON.stringify({ continue: true })));
