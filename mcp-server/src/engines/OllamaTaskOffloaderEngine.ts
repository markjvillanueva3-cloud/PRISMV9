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
  {
    name: "qwen2.5-coder:7b",
    size: "7b",
    capabilities: ["explanation", "summary", "documentation", "format_convert"],
    maxTokens: 8192,
    avgLatencyMs: 2000,
  },
  {
    name: "qwen2.5-coder:14b",
    size: "14b",
    capabilities: ["explanation", "summary", "documentation", "format_convert", "search_synthesis", "calculation"],
    maxTokens: 8192,
    avgLatencyMs: 5000,
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

const OFFLOADABLE_PATTERNS: Array<{ pattern: RegExp; category: TaskCategory }> = [
  { pattern: /^explain\b|explain\s+(this|the|what|how|why)/i, category: "explanation" },
  { pattern: /^what\s+(does|is|are)\s+/i, category: "explanation" },
  { pattern: /how\s+(does|do|is|are|can)\s+/i, category: "explanation" },
  { pattern: /^summarize\b|^summary\b|^tldr\b|^overview\b/i, category: "summary" },
  { pattern: /give\s+(me\s+)?(a\s+)?(summary|tldr|overview)/i, category: "summary" },
  { pattern: /search\s+(for|results?)|find\s+(files?|code)/i, category: "search_synthesis" },
  { pattern: /convert\s+(to|from)|format\s+(as|to)/i, category: "format_convert" },
  { pattern: /^document\b|add\s+docstring|add\s+jsdoc|add\s+comment/i, category: "documentation" },
  { pattern: /calculate|compute|math|formula/i, category: "calculation" },
  { pattern: /list\s+(all|the)|show\s+(me|all)/i, category: "summary" },
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
      const res = await fetch("http://localhost:11434/api/tags", {
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
    model: string
  ): Promise<{ success: boolean; result: string; latencyMs: number }> {
    const t0 = Date.now();

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const res = await fetch("http://localhost:11434/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          stream: false,
          options: { temperature: 0.1, num_predict: 2048 },
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
        };
      }

      const data = await res.json() as { message?: { content?: string } };
      return {
        success: true,
        result: data.message?.content || "",
        latencyMs: Date.now() - t0,
      };
    } catch (err) {
      return {
        success: false,
        result: String(err),
        latencyMs: Date.now() - t0,
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
