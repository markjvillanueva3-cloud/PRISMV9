/**
 * LocalAwarenessRouterEngine — LOCAL-LLM-MS0 U-LLM-AWR01
 *
 * Provides mission briefings from PRISM inventory via local Qwen.
 * Routes tasks to relevant engines/dispatchers based on semantic understanding.
 *
 * Features:
 * - Reads PRISM-INVENTORY-LATEST.md, ENGINE_DIGEST.md, DISPATCHER_DIGEST.md
 * - Uses Qwen to summarize relevant capabilities for a given task
 * - Returns condensed briefing (100-200 tokens) instead of full inventory injection
 *
 * Token savings: Full inventory is ~5000 tokens → 100-200 token briefing = 96% reduction
 *
 * @module engines/LocalAwarenessRouterEngine
 * @milestone LOCAL-LLM-MS0 Session 6
 */

import { z } from "zod";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const ROUTER_MODEL = process.env.OLLAMA_ROUTER_MODEL || "qwen2.5-coder:32b";
const TIMEOUT_MS = 20_000;

// Known inventory file paths
const INVENTORY_PATHS = {
  inventory: "H:/prism/PRISM-INVENTORY-LATEST.md",
  engineDigest: "H:/prism/mcp-server/data/docs/ENGINE_DIGEST.md",
  dispatcherDigest: "H:/prism/mcp-server/data/docs/DISPATCHER_DIGEST.md",
  directoryDigest: "H:/prism/mcp-server/data/docs/DIRECTORY_DIGEST.md",
};

export const AwarenessInputSchema = z.object({
  task: z.string().min(1, "Task description cannot be empty"),
  context: z.string().optional().describe("Additional context (file paths, errors, etc.)"),
  briefingType: z.enum([
    "engines",      // Focus on relevant engines
    "dispatchers",  // Focus on relevant dispatcher actions
    "full",         // Full mission briefing
    "quick",        // Ultra-condensed (50 tokens max)
  ]).default("full"),
  maxTokens: z.number().int().min(50).max(500).default(200),
});

export type AwarenessInput = z.input<typeof AwarenessInputSchema>;

export interface RelevantCapability {
  name: string;
  type: "engine" | "dispatcher" | "action" | "skill";
  relevance: number; // 0-1
  description: string;
  usage?: string;
}

export interface AwarenessBriefing {
  task: string;
  briefing: string;
  relevantCapabilities: RelevantCapability[];
  suggestedApproach: string;
  warnings: string[];
  ollamaUsed: boolean;
  latencyMs: number;
}

// Cached inventory data
let _inventoryCache: {
  inventory?: string;
  engineDigest?: string;
  dispatcherDigest?: string;
  loadedAt?: number;
} = {};

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function loadInventoryData(): Promise<{
  inventory: string;
  engineDigest: string;
  dispatcherDigest: string;
}> {
  const now = Date.now();
  if (_inventoryCache.loadedAt && now - _inventoryCache.loadedAt < CACHE_TTL_MS) {
    return {
      inventory: _inventoryCache.inventory || "",
      engineDigest: _inventoryCache.engineDigest || "",
      dispatcherDigest: _inventoryCache.dispatcherDigest || "",
    };
  }

  const results: Record<string, string> = {};

  for (const [key, path] of Object.entries(INVENTORY_PATHS)) {
    if (key === "directoryDigest") continue; // Skip for now
    try {
      if (existsSync(path)) {
        results[key] = await readFile(path, "utf-8");
      } else {
        results[key] = "";
      }
    } catch {
      results[key] = "";
    }
  }

  _inventoryCache = {
    inventory: results.inventory,
    engineDigest: results.engineDigest,
    dispatcherDigest: results.dispatcherDigest,
    loadedAt: now,
  };

  return {
    inventory: results.inventory || "",
    engineDigest: results.engineDigest || "",
    dispatcherDigest: results.dispatcherDigest || "",
  };
}

async function isOllamaAvailable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const response = await fetch(`${OLLAMA_URL}/api/tags`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) return false;
    const data = await response.json() as { models?: Array<{ name: string }> };
    return data.models?.some(m => m.name.includes("qwen")) ?? false;
  } catch {
    return false;
  }
}

function extractRelevantLines(content: string, keywords: string[], maxLines: number = 50): string {
  const lines = content.split("\n");
  const relevant: string[] = [];
  const lowerKeywords = keywords.map(k => k.toLowerCase());

  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    if (lowerKeywords.some(kw => lowerLine.includes(kw))) {
      relevant.push(line);
      if (relevant.length >= maxLines) break;
    }
  }

  return relevant.join("\n");
}

function extractKeywords(task: string): string[] {
  // Extract meaningful keywords from task
  const stopWords = new Set([
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "must", "can", "to", "of", "in", "for",
    "on", "with", "at", "by", "from", "as", "into", "through", "during",
    "before", "after", "above", "below", "between", "under", "again",
    "further", "then", "once", "here", "there", "when", "where", "why",
    "how", "all", "each", "few", "more", "most", "other", "some", "such",
    "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very",
    "just", "and", "but", "if", "or", "because", "until", "while", "this",
    "that", "these", "those", "i", "me", "my", "we", "our", "you", "your",
    "it", "its", "they", "them", "their", "what", "which", "who", "whom",
    "want", "need", "create", "make", "build", "add", "get", "use", "help",
  ]);

  const words = task.toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));

  // Add domain-specific keywords based on task content
  const domainKeywords: string[] = [];
  if (/mill|cnc|machine|tool/i.test(task)) domainKeywords.push("cam", "toolpath", "milling");
  if (/turn|lathe|bore/i.test(task)) domainKeywords.push("turning", "lathe", "boring");
  if (/edm|wire|spark/i.test(task)) domainKeywords.push("wedm", "edm", "wire");
  if (/cad|model|design/i.test(task)) domainKeywords.push("cad", "model", "geometry");
  if (/force|power|physics/i.test(task)) domainKeywords.push("kienzle", "physics", "calculation");
  if (/ai|learn|pattern/i.test(task)) domainKeywords.push("ai", "learning", "intelligence");
  if (/test|validate|check/i.test(task)) domainKeywords.push("validation", "test", "quality");

  return [...new Set([...words, ...domainKeywords])];
}

function generateFallbackBriefing(
  task: string,
  keywords: string[],
  inventoryData: { inventory: string; engineDigest: string; dispatcherDigest: string }
): AwarenessBriefing {
  const relevantEngines = extractRelevantLines(inventoryData.engineDigest, keywords, 10);
  const relevantDispatchers = extractRelevantLines(inventoryData.dispatcherDigest, keywords, 5);

  const capabilities: RelevantCapability[] = [];

  // Parse relevant engine lines
  for (const line of relevantEngines.split("\n")) {
    const match = line.match(/^\s*[-*]\s*\*?\*?(\w+Engine)\*?\*?\s*[—–-]\s*(.+)/);
    if (match) {
      capabilities.push({
        name: match[1],
        type: "engine",
        relevance: 0.7,
        description: match[2].slice(0, 100),
      });
    }
  }

  // Parse relevant dispatcher lines
  for (const line of relevantDispatchers.split("\n")) {
    const match = line.match(/^\s*[-*]\s*\*?\*?(prism_\w+)\*?\*?\s*[—–-]\s*(.+)/);
    if (match) {
      capabilities.push({
        name: match[1],
        type: "dispatcher",
        relevance: 0.6,
        description: match[2].slice(0, 100),
      });
    }
  }

  const briefing = capabilities.length > 0
    ? `For "${task.slice(0, 50)}": Found ${capabilities.length} relevant capabilities. ` +
      `Top matches: ${capabilities.slice(0, 3).map(c => c.name).join(", ")}.`
    : `For "${task.slice(0, 50)}": No specific matches found. Check ENGINE_DIGEST.md for full list.`;

  return {
    task,
    briefing,
    relevantCapabilities: capabilities.slice(0, 5),
    suggestedApproach: capabilities.length > 0
      ? `Use ${capabilities[0].name} as primary capability.`
      : "Manual exploration recommended.",
    warnings: [],
    ollamaUsed: false,
    latencyMs: 0,
  };
}

async function generateOllamaBriefing(
  task: string,
  context: string | undefined,
  briefingType: string,
  maxTokens: number,
  inventoryData: { inventory: string; engineDigest: string; dispatcherDigest: string }
): Promise<AwarenessBriefing> {
  const keywords = extractKeywords(task);
  const relevantEngines = extractRelevantLines(inventoryData.engineDigest, keywords, 30);
  const relevantDispatchers = extractRelevantLines(inventoryData.dispatcherDigest, keywords, 15);

  const focusInstruction = {
    engines: "Focus on which engines to use.",
    dispatchers: "Focus on which dispatcher actions to call.",
    full: "Provide a complete mission briefing.",
    quick: "Be extremely concise (50 words max).",
  }[briefingType];

  const prompt = `You are a PRISM manufacturing intelligence assistant. Given a task, recommend relevant engines and dispatchers.

TASK: ${task}
${context ? `CONTEXT: ${context}` : ""}

AVAILABLE ENGINES (relevant matches):
${relevantEngines || "No specific matches - check full digest"}

AVAILABLE DISPATCHERS (relevant matches):
${relevantDispatchers || "No specific matches - check full digest"}

${focusInstruction}

Respond with JSON:
{
  "briefing": "One paragraph mission briefing",
  "capabilities": [{"name": "EngineName", "type": "engine|dispatcher", "relevance": 0.9, "description": "why relevant", "usage": "how to use"}],
  "approach": "Suggested step-by-step approach",
  "warnings": ["any gotchas or things to watch out for"]
}`;

  try {
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: ROUTER_MODEL,
        prompt,
        stream: false,
        options: { temperature: 0.2, num_predict: maxTokens * 2 },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      return generateFallbackBriefing(task, keywords, inventoryData);
    }

    const data = await response.json() as { response?: string };
    if (!data.response) {
      return generateFallbackBriefing(task, keywords, inventoryData);
    }

    const jsonMatch = data.response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return generateFallbackBriefing(task, keywords, inventoryData);
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      briefing?: string;
      capabilities?: Array<{
        name: string;
        type: string;
        relevance: number;
        description: string;
        usage?: string;
      }>;
      approach?: string;
      warnings?: string[];
    };

    return {
      task,
      briefing: parsed.briefing || "No briefing generated.",
      relevantCapabilities: (parsed.capabilities || []).map(c => ({
        name: c.name,
        type: (c.type === "dispatcher" ? "dispatcher" : "engine") as "engine" | "dispatcher",
        relevance: c.relevance || 0.5,
        description: c.description || "",
        usage: c.usage,
      })),
      suggestedApproach: parsed.approach || "No specific approach suggested.",
      warnings: parsed.warnings || [],
      ollamaUsed: true,
      latencyMs: 0,
    };
  } catch {
    return generateFallbackBriefing(task, keywords, inventoryData);
  }
}

/**
 * LocalAwarenessRouterEngine — Mission briefings via local Qwen
 */
export class LocalAwarenessRouterEngine {
  /**
   * Generate a mission briefing for a given task
   */
  static async brief(input: AwarenessInput): Promise<AwarenessBriefing> {
    const startTime = Date.now();
    const parsed = AwarenessInputSchema.parse(input);
    const { task, context, briefingType, maxTokens } = parsed;

    const inventoryData = await loadInventoryData();
    const ollamaAvailable = await isOllamaAvailable();

    let result: AwarenessBriefing;

    if (ollamaAvailable) {
      result = await generateOllamaBriefing(task, context, briefingType, maxTokens, inventoryData);
    } else {
      const keywords = extractKeywords(task);
      result = generateFallbackBriefing(task, keywords, inventoryData);
    }

    result.latencyMs = Date.now() - startTime;
    return result;
  }

  /**
   * Get a condensed one-liner briefing for context injection
   */
  static async getCondensedBriefing(task: string): Promise<string> {
    const result = await this.brief({ task, briefingType: "quick", maxTokens: 100 });
    if (result.relevantCapabilities.length === 0) {
      return "";
    }
    const topCaps = result.relevantCapabilities.slice(0, 3).map(c => c.name).join(", ");
    return `🎯 Relevant: ${topCaps}`;
  }

  /**
   * Check if inventory files are accessible
   */
  static async healthCheck(): Promise<{
    inventoryAvailable: boolean;
    engineDigestAvailable: boolean;
    dispatcherDigestAvailable: boolean;
    ollamaAvailable: boolean;
  }> {
    const [inventoryData, ollamaAvailable] = await Promise.all([
      loadInventoryData(),
      isOllamaAvailable(),
    ]);

    return {
      inventoryAvailable: inventoryData.inventory.length > 0,
      engineDigestAvailable: inventoryData.engineDigest.length > 0,
      dispatcherDigestAvailable: inventoryData.dispatcherDigest.length > 0,
      ollamaAvailable,
    };
  }

  /**
   * Clear the inventory cache (useful for testing)
   */
  static clearCache(): void {
    _inventoryCache = {};
  }
}

export const localAwarenessRouterEngine = LocalAwarenessRouterEngine;
export default LocalAwarenessRouterEngine;
