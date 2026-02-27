/**
 * PRISM MCP Server - Unified API Call Wrapper
 * Central point for ALL Anthropic API calls. Integrates:
 *   - Effort tiers (getEffort → thinking budget)
 *   - Timeout boundaries (apiCallWithTimeout)
 *   - Structured logging with correlationId (XA-8)
 *   - Extended thinking config (Opus 4.6)
 * 
 * ALL API calls MUST go through this wrapper. Direct messages.create() is prohibited
 * except inside this module.
 * 
 * @module config/apiWrapper
 * @safety HIGH — Controls reasoning depth for all calculations.
 */

import { randomUUID } from 'crypto';
import { log } from '../utils/Logger.js';
import { getAnthropicClient, getModelForTier, hasValidApiKey } from './api-config.js';
import { getEffort, type EffortLevel } from './effortTiers.js';
import { apiCallWithTimeout } from '../utils/apiTimeout.js';

/** Map effort levels to timeout boundaries (ms) */
const EFFORT_TIMEOUTS: Record<EffortLevel, number> = {
  max: 120_000,   // 2 min — safety calcs need deep reasoning
  high: 60_000,   // 1 min — data retrieval with reasoning
  medium: 30_000, // 30s — operational tasks
  low: 15_000,    // 15s — pure reads
};

/** Map effort levels to model tier selection */
const EFFORT_MODEL_TIER: Record<EffortLevel, 'opus' | 'sonnet' | 'haiku'> = {
  max: 'opus',
  high: 'opus',
  medium: 'sonnet',
  low: 'sonnet',
};

export interface PrismAPICallOptions {
  action: string;
  system: string;
  user: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  correlationId?: string;
}

export interface PrismAPIResponse {
  text: string;
  tokens: { input: number; output: number };
  duration_ms: number;
  model: string;
  effort: EffortLevel;
  correlationId: string;
  error?: string;
}

/**
 * Make a PRISM API call with full effort/thinking/timeout integration.
 */
export async function prismAPICall(options: PrismAPICallOptions): Promise<PrismAPIResponse> {
  const effort = getEffort(options.action);
  const correlationId = options.correlationId || randomUUID();
  const model = options.model || getModelForTier(EFFORT_MODEL_TIER[effort]);
  const timeout = EFFORT_TIMEOUTS[effort];
  const startTime = Date.now();

  log.info(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'info',
    dispatcher: 'api_wrapper',
    action: options.action,
    correlationId,
    effort,
    model,
  }));

  if (!hasValidApiKey()) {
    return {
      text: `[API_UNAVAILABLE] No valid API key. Action: ${options.action}`,
      tokens: { input: 0, output: 0 },
      duration_ms: 0,
      model,
      effort,
      correlationId,
      error: 'No valid API key configured',
    };
  }

  try {
    const result = await apiCallWithTimeout(
      async (_signal) => {
        const client = getAnthropicClient();
        const thinkingBudget = getThinkingBudget(effort);
        
        const createParams: any = {
          model,
          max_tokens: options.maxTokens || (thinkingBudget + 4096),
          system: options.system,
          messages: [{ role: 'user', content: options.user }],
        };

        // Extended thinking for max/high effort — requires temperature=1
        if (effort === 'max' || effort === 'high') {
          createParams.thinking = { type: 'enabled', budget_tokens: thinkingBudget };
          createParams.temperature = 1; // Required for extended thinking
        } else {
          createParams.temperature = options.temperature ?? 0.3;
        }

        const response = await client.messages.create(createParams);

        const text = response.content
          .filter((block: any) => block.type === 'text')
          .map((block: any) => block.text)
          .join('\n');

        return {
          text,
          tokens: {
            input: response.usage?.input_tokens || 0,
            output: response.usage?.output_tokens || 0,
          },
          duration_ms: Date.now() - startTime,
          model,
          effort,
          correlationId,
        };
      },
      timeout,
      `${options.action} [effort=${effort}]`,
    );

    log.info(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      dispatcher: 'api_wrapper',
      action: options.action,
      correlationId,
      durationMs: result.duration_ms,
      effort,
      tokens: result.tokens,
    }));

    return result;
  } catch (err: unknown) {
    const duration = Date.now() - startTime;
    const errorMsg = err instanceof Error ? err.message : String(err);

    log.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      dispatcher: 'api_wrapper',
      action: options.action,
      correlationId,
      durationMs: duration,
      effort,
      error: errorMsg,
    }));

    return {
      text: '',
      tokens: { input: 0, output: 0 },
      duration_ms: duration,
      model,
      effort,
      correlationId,
      error: errorMsg,
    };
  }
}

/** Get thinking budget based on effort level */
function getThinkingBudget(effort: EffortLevel): number {
  switch (effort) {
    case 'max': return 16000;
    case 'high': return 8000;
    case 'medium': return 4000;
    case 'low': return 1024;
  }
}

/** Generate a new correlation ID */
export function newCorrelationId(): string {
  return randomUUID();
}

/** Create a child correlation ID from a parent */
export function childCorrelationId(parentId: string, index: number): string {
  return `${parentId}:${index}`;
}
