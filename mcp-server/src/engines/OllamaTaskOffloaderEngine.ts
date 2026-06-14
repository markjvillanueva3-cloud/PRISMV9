/**
 * OllamaTaskOffloaderEngine
 *
 * Decides which tasks can be safely offloaded to local Ollama models
 * to save Claude API tokens. Uses task classification to route:
 *
 * OFFLOADABLE (free, fast):
 *   - Code explanations / summaries
 *   - Search result synthesis
 *   - File analysis summaries
 *   - Simple calculations
 *   - Format conversions
 *   - Documentation generation
 *
 * KEEP ON CLAUDE (quality-critical):
 *   - Code generation / editing
 *   - Complex reasoning
 *   - Multi-file refactoring
 *   - Safety-critical decisions
 *   - Physics calculations
 *
 * Token savings: 80-95% for offloadable tasks (free local inference)
 */

import { existsSync } from "node:fs";

export type TaskCategory =
  | "explanation"
  | "summary"
  | "search_synthesis"
  | "calculation"
  | "format_convert"
  | "documentation"
  | "code_generation"
  | "code_edit"
  | "refactor"
  | "reasoning"
  | "safety_critical"
  | "physics"
  | "unknown";

export interface OffloadDecision {
  task: string;
  category: TaskCategory;
  offloadable: boolean;
  targetModel: string | null;
  reason: string;
  estimatedTokenSavings: number;
  confidence: number;
}

export interface OllamaModel {
  name: string;
  size: string;
  capabilities: TaskCategory[];
  maxTokens: number;
  avgLatencyMs: number;
}

const OLLAMA_MODELS: OllamaModel[] = [
  // RETIRED 2026-06-04 (U-BW-TS-ENGINES-RETIRE, slot:alpha): qwen2.5-coder:7b + :14b
  // `ollama rm`'d from the 96GB Blackwell. selectModel() already install-gates (filters
  // on this.installedModels), so they were never selectable post-delete — but the
  // OLLAMA_MODELS catalog must not DECLARE a deleted tag (no-retired-llm-refs source-lock).
  // qwen2.5-coder:32b below carries a SUPERSET of their capabilities (adds
  // code_generation), so every offloadable category still resolves to a real, installed,
  // higher-tier model.
  // BLACKWELL-MODEL-INTEGRATION-MS0 P2 (2026-06-06): the post-swap Blackwell models.
  // selectModel() install-gates at RUNTIME (filters on this.installedModels — see line
  // ~177), so these entries are INERT until /api/tags confirms each is pulled. As of the
  // 2026-06-06 live scan only gpt-oss:20b is pulled; gpt-oss:120b + gemma4:31b are still
  // pulling, so they cannot be selected yet — safe to declare ahead of the pull (the
  // catalog is static; the gate is the runtime filter, NOT the declaration). selectModel
  // sorts capable models by avgLatencyMs asc, so once pulled gpt-oss:120b (2200ms) wins
  // search_synthesis over the 32b (15000ms), and gpt-oss:20b (800ms) wins the lighter
  // offload categories — exactly the intended speed/quality split.
  {
    name: "gpt-oss:120b",
    size: "120b",
    capabilities: ["explanation", "summary", "documentation", "format_convert", "search_synthesis", "calculation", "code_generation", "reasoning"],
    maxTokens: 32768,
    avgLatencyMs: 2200,
  },
  {
    name: "gpt-oss:20b",
    size: "20b",
    capabilities: ["explanation", "summary", "documentation", "format_convert", "search_synthesis", "calculation", "code_generation"],
    maxTokens: 16384,
    avgLatencyMs: 800,
  },
  {
    name: "gemma4:31b",
    size: "31b",
    capabilities: ["explanation", "summary", "search_synthesis", "calculation", "code_generation", "reasoning"],
    maxTokens: 16384,
    avgLatencyMs: 2400,
  },
  {
    name: "qwen2.5-coder:32b",
    size: "32b",
    capabilities: ["explanation", "summary", "documentation", "format_convert", "search_synthesis", "calculation", "code_generation"],
    maxTokens: 16384,
    avgLatencyMs: 15000,
  },
  {
    name: "codellama:7b",
    size: "7b",
    capabilities: ["explanation", "summary", "documentation"],
    maxTokens: 4096,
    avgLatencyMs: 1500,
  },
  {
    name: "deepseek-coder:6.7b",
    size: "6.7b",
    capabilities: ["explanation", "summary", "documentation", "calculation"],
    maxTokens: 8192,
    avgLatencyMs: 2000,
  },
];

// OFFLOADABLE_PATTERNS — widened MCP-FLEET-CAPACITY-MS0 (2026-06-08) to raise the
// offload ratio from ~8% toward >=30%. The 96GB Blackwell sits 99.9% idle while the
// fleet contends for CPU/RAM; the prior pattern list matched only a handful of
// verb-prefixed phrasings, so 1170/1174 router fires kept work on Claude. These add
// the rest of the doctrine-named offloadable classes (lint, classify, docstring-from-
// code, diff/change summary, error/log triage, extract/parse, describe, rename) mapped
// to EXISTING categories the installed models already declare as capabilities — no new
// category/model-capability surface needed. SAFETY: KEEP_ON_CLAUDE_PATTERNS is checked
// FIRST in classifyTask(), so create/edit/refactor/reasoning/physics/safety-critical
// still correctly stay on Claude even when these broader offload patterns also match.
const OFFLOADABLE_PATTERNS: Array<{ pattern: RegExp; category: TaskCategory }> = [
  { pattern: /^explain\b|explain\s+(this|the|what|how|why)|what\s+does\s+this\s+(do|mean)/i, category: "explanation" },
  { pattern: /^what\s+(does|is|are)\s+/i, category: "explanation" },
  { pattern: /how\s+(does|do|is|are|can)\s+/i, category: "explanation" },
  { pattern: /^describe\b|walk\s+(me\s+)?through|what'?s\s+happening\s+in/i, category: "explanation" },
  { pattern: /^summarize\b|^summary\b|^tldr\b|^overview\b|^recap\b/i, category: "summary" },
  { pattern: /give\s+(me\s+)?(a\s+)?(summary|tldr|overview|recap|gist)/i, category: "summary" },
  { pattern: /summar(y|ize)\s+(of\s+)?(the\s+)?(diff|changes?|commit|log|output)/i, category: "summary" },
  { pattern: /list\s+(all|the)|show\s+(me|all)|enumerate\b/i, category: "summary" },
  { pattern: /search\s+(for|results?)|find\s+(files?|code|references?)|grep\s+for/i, category: "search_synthesis" },
  { pattern: /convert\s+(to|from)|format\s+(as|to)|reformat\b|prettify\b|normalize\s+(the\s+)?(format|json|yaml)/i, category: "format_convert" },
  { pattern: /^document\b|add\s+(a\s+)?(docstring|jsdoc|comment|doc\s+comment)|write\s+(a\s+)?(docstring|jsdoc|comment)/i, category: "documentation" },
  { pattern: /calculate|compute|math|formula/i, category: "calculation" },
  // Mechanical text ops the AI-routing doctrine names (CLAUDE.md §TOKEN ECONOMY:
  // "code explain/summarize/docstring/classify/lint/diff-summary/error-triage").
  { pattern: /^lint\b|run\s+(the\s+)?lint|style\s+check|find\s+(lint|style)\s+(issues?|violations?)/i, category: "documentation" },
  { pattern: /^classify\b|categorize\b|what\s+(kind|type|category)\s+of|label\s+(this|the)/i, category: "summary" },
  { pattern: /triage\b|(explain|interpret|diagnose)\s+(this\s+)?(error|stack\s*trace|exception|log)/i, category: "explanation" },
  { pattern: /^extract\b|parse\s+(out|the)|pull\s+(out\s+)?the\s+\w+\s+from/i, category: "search_synthesis" },
  { pattern: /^translate\b|rephrase\b|reword\b|rewrite\s+(this\s+)?(more\s+)?(clearly|concisely|as)/i, category: "format_convert" },
];

const KEEP_ON_CLAUDE_PATTERNS: Array<{ pattern: RegExp; category: TaskCategory }> = [
  { pattern: /^(create|build|implement|write|add|fix)\s+\w/i, category: "code_generation" },
  { pattern: /^(edit|modify|change|update|replace)\s+(the|this|a|my)\s+/i, category: "code_edit" },
  { pattern: /^refactor\b|^restructure\b|^reorganize\b/i, category: "refactor" },
  { pattern: /^analyze\s+(the|this)|deep\s+analysis|root\s+cause/i, category: "reasoning" },
  { pattern: /check\s+(safety|collision)|validate\s+(force|stress)/i, category: "safety_critical" },
  { pattern: /^calculate\s+(kienzle|taylor|force|stress|deflection)/i, category: "physics" },
  { pattern: /johnson.cook\s+(model|param)/i, category: "physics" },
];

export class OllamaTaskOffloaderEngine {
  private ollamaAvailable: boolean | null = null;
  private installedModels: string[] = [];
  private lastCheck = 0;
  private checkIntervalMs = 60000;

  async checkOllamaAvailable(): Promise<boolean> {
    const now = Date.now();
    if (this.ollamaAvailable !== null && now - this.lastCheck < this.checkIntervalMs) {
      return this.ollamaAvailable;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const res = await fetch("http://127.0.0.1:11434/api/tags", {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json() as { models?: Array<{ name: string }> };
        this.installedModels = (data.models || []).map((m) => m.name);
        this.ollamaAvailable = this.installedModels.length > 0;
      } else {
        this.ollamaAvailable = false;
      }
    } catch {
      this.ollamaAvailable = false;
    }

    this.lastCheck = now;
    return this.ollamaAvailable;
  }

  classifyTask(task: string): TaskCategory {
    const t = task.toLowerCase();

    for (const { pattern, category } of KEEP_ON_CLAUDE_PATTERNS) {
      if (pattern.test(t)) return category;
    }

    for (const { pattern, category } of OFFLOADABLE_PATTERNS) {
      if (pattern.test(t)) return category;
    }

    return "unknown";
  }

  isOffloadable(category: TaskCategory): boolean {
    const offloadableCategories: TaskCategory[] = [
      "explanation",
      "summary",
      "search_synthesis",
      "format_convert",
      "documentation",
      "calculation",
    ];
    return offloadableCategories.includes(category);
  }

  selectModel(category: TaskCategory): OllamaModel | null {
    const capable = OLLAMA_MODELS.filter((m) =>
      m.capabilities.includes(category) && this.installedModels.includes(m.name)
    );

    if (capable.length === 0) return null;

    capable.sort((a, b) => a.avgLatencyMs - b.avgLatencyMs);
    return capable[0];
  }

  async decide(task: string): Promise<OffloadDecision> {
    const category = this.classifyTask(task);
    const offloadable = this.isOffloadable(category);

    if (!offloadable) {
      return {
        task,
        category,
        offloadable: false,
        targetModel: null,
        reason: `Task category "${category}" requires Claude for quality`,
        estimatedTokenSavings: 0,
        confidence: 0.9,
      };
    }

    const ollamaUp = await this.checkOllamaAvailable();
    if (!ollamaUp) {
      return {
        task,
        category,
        offloadable: false,
        targetModel: null,
        reason: "Ollama not available (offline or no models installed)",
        estimatedTokenSavings: 0,
        confidence: 1.0,
      };
    }

    const model = this.selectModel(category);
    if (!model) {
      return {
        task,
        category,
        offloadable: false,
        targetModel: null,
        reason: `No installed Ollama model supports "${category}" tasks`,
        estimatedTokenSavings: 0,
        confidence: 0.8,
      };
    }

    const estimatedTokens = Math.ceil(task.length / 4) * 3;
    const savings = Math.round(estimatedTokens * 0.85);

    return {
      task,
      category,
      offloadable: true,
      targetModel: model.name,
      reason: `"${category}" task can be handled by local ${model.name}`,
      estimatedTokenSavings: savings,
      confidence: 0.85,
    };
  }

  async executeOffloaded(
    task: string,
    systemPrompt: string,
    model: string,
    opts?: { temperature?: number; maxTokens?: number; timeoutMs?: number; numCtx?: number }
  ): Promise<{ success: boolean; result: string; latencyMs: number; model: string }> {
    const t0 = Date.now();
    const temperature = opts?.temperature ?? 0.1;
    const numPredict = opts?.maxTokens ?? 2048;
    const timeoutMs = opts?.timeoutMs ?? 30000;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch("http://127.0.0.1:11434/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          stream: false,
          // num_ctx is opt-in: omitted -> Ollama uses the model default (byte-identical
          // legacy behavior). Large-context callers (e.g. transcript mining, which chunks
          // to fit num_ctx 32768) pass it so the prompt is not silently truncated.
          options: {
            temperature,
            num_predict: numPredict,
            ...(opts?.numCtx ? { num_ctx: opts.numCtx } : {}),
          },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: task },
          ],
        }),
      });

      clearTimeout(timeout);

      if (!res.ok) {
        return {
          success: false,
          result: `Ollama HTTP ${res.status}`,
          latencyMs: Date.now() - t0,
          model,
        };
      }

      const data = await res.json() as { message?: { content?: string } };
      return {
        success: true,
        result: data.message?.content || "",
        latencyMs: Date.now() - t0,
        model,
      };
    } catch (err) {
      return {
        success: false,
        result: String(err),
        latencyMs: Date.now() - t0,
        model,
      };
    }
  }

  getInstalledModels(): string[] {
    return [...this.installedModels];
  }

  getSupportedCategories(): TaskCategory[] {
    return [
      "explanation",
      "summary",
      "search_synthesis",
      "format_convert",
      "documentation",
      "calculation",
    ];
  }
}

export const ollamaTaskOffloaderEngine = new OllamaTaskOffloaderEngine();
