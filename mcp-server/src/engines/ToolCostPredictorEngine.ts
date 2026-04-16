/**
 * ToolCostPredictorEngine — Pre-execution token cost prediction
 *
 * Predicts the token cost of a tool call before it executes,
 * enabling stop decisions based on expected cost vs remaining budget.
 * Uses file sizes, pattern complexity, and historical averages.
 *
 * Token savings: Prevents expensive calls when budget is tight.
 *
 * @version 1.0.0
 */

import * as fs from "fs";

export interface CostPrediction {
  tool: string;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedTotal: number;
  confidence: "high" | "medium" | "low";
  reasoning: string;
}

// Historical averages by tool type (tokens)
const AVERAGES: Record<string, { input: number; output: number }> = {
  Read:       { input: 100, output: 2000 },
  Grep:       { input: 150, output: 800 },
  Glob:       { input: 100, output: 400 },
  Edit:       { input: 500, output: 200 },
  Write:      { input: 300, output: 100 },
  Bash:       { input: 200, output: 1500 },
  Agent:      { input: 500, output: 5000 },
  WebFetch:   { input: 100, output: 3000 },
  WebSearch:  { input: 100, output: 1500 },
  ToolSearch: { input: 100, output: 200 },
  NotebookEdit: { input: 400, output: 300 },
};

export class ToolCostPredictorEngine {

  /**
   * Predict token cost of a tool call.
   */
  predict(tool: string, params: Record<string, unknown> = {}): CostPrediction {
    switch (tool) {
      case "Read": return this.predictRead(params);
      case "Grep": return this.predictGrep(params);
      case "Glob": return this.predictGlob(params);
      case "Edit": return this.predictEdit(params);
      case "Write": return this.predictWrite(params);
      case "Agent": return this.predictAgent(params);
      case "Bash": return this.predictBash(params);
      default: return this.predictDefault(tool);
    }
  }

  private predictRead(params: Record<string, unknown>): CostPrediction {
    const filePath = String(params.file_path || "");
    const limit = Number(params.limit || 0);
    const offset = Number(params.offset || 0);

    let fileSize = 0;
    try {
      fileSize = fs.statSync(filePath).size;
    } catch {
      return {
        tool: "Read",
        estimatedInputTokens: 100,
        estimatedOutputTokens: 2000,
        estimatedTotal: 2100,
        confidence: "low",
        reasoning: "File not found — using average estimate",
      };
    }

    // Calculate readable portion
    const totalLines = Math.ceil(fileSize / 80);
    const readLines = limit > 0 ? Math.min(limit, totalLines - offset) : totalLines;
    const readBytes = readLines * 80;
    const outputTokens = Math.ceil(readBytes / 4);

    return {
      tool: "Read",
      estimatedInputTokens: 100,
      estimatedOutputTokens: Math.min(outputTokens, 50000), // cap at tool limit
      estimatedTotal: 100 + Math.min(outputTokens, 50000),
      confidence: "high",
      reasoning: `File ${Math.round(fileSize / 1024)}KB, ~${readLines} lines${limit ? ` (limited to ${limit})` : ""}`,
    };
  }

  private predictGrep(params: Record<string, unknown>): CostPrediction {
    const outputMode = String(params.output_mode || "files_with_matches");
    const headLimit = Number(params.head_limit || 0);
    const hasPath = Boolean(params.path);

    let outputTokens = AVERAGES.Grep.output;
    let confidence: "high" | "medium" | "low" = "medium";

    if (outputMode === "content") {
      outputTokens = headLimit > 0 ? headLimit * 30 : 2000; // ~30 tokens per line
      if (!hasPath) outputTokens *= 3; // unbounded search = much more output
    } else if (outputMode === "count") {
      outputTokens = 100;
      confidence = "high";
    } else {
      outputTokens = headLimit > 0 ? headLimit * 20 : 800;
    }

    return {
      tool: "Grep",
      estimatedInputTokens: 150,
      estimatedOutputTokens: outputTokens,
      estimatedTotal: 150 + outputTokens,
      confidence,
      reasoning: `Mode: ${outputMode}${hasPath ? ", scoped" : ", codebase-wide"}${headLimit ? `, limit ${headLimit}` : ""}`,
    };
  }

  private predictGlob(params: Record<string, unknown>): CostPrediction {
    const pattern = String(params.pattern || "");
    const hasPath = Boolean(params.path);
    const isBroad = pattern === "**/*" || pattern === "**" || !pattern.includes(".");

    return {
      tool: "Glob",
      estimatedInputTokens: 100,
      estimatedOutputTokens: isBroad && !hasPath ? 2000 : 400,
      estimatedTotal: isBroad && !hasPath ? 2100 : 500,
      confidence: isBroad ? "low" : "medium",
      reasoning: `Pattern: ${pattern}${hasPath ? ", scoped" : ""}${isBroad ? " (broad)" : ""}`,
    };
  }

  private predictEdit(params: Record<string, unknown>): CostPrediction {
    const oldStr = String(params.old_string || "");
    const newStr = String(params.new_string || "");
    const inputTokens = Math.ceil((oldStr.length + newStr.length) / 4) + 100;

    return {
      tool: "Edit",
      estimatedInputTokens: inputTokens,
      estimatedOutputTokens: 200,
      estimatedTotal: inputTokens + 200,
      confidence: "high",
      reasoning: `old: ${oldStr.length}ch, new: ${newStr.length}ch`,
    };
  }

  private predictWrite(params: Record<string, unknown>): CostPrediction {
    const content = String(params.content || "");
    const inputTokens = Math.ceil(content.length / 4) + 50;

    return {
      tool: "Write",
      estimatedInputTokens: inputTokens,
      estimatedOutputTokens: 100,
      estimatedTotal: inputTokens + 100,
      confidence: "high",
      reasoning: `Content: ${content.length}ch (~${inputTokens} tokens)`,
    };
  }

  private predictAgent(params: Record<string, unknown>): CostPrediction {
    const prompt = String(params.prompt || params.query || params.task || "");
    const inputTokens = Math.ceil(prompt.length / 4) + 200;
    // Agents typically 3-10x more expensive than direct calls
    const outputTokens = prompt.length < 100 ? 3000 : 8000;

    return {
      tool: "Agent",
      estimatedInputTokens: inputTokens,
      estimatedOutputTokens: outputTokens,
      estimatedTotal: inputTokens + outputTokens,
      confidence: "low",
      reasoning: `Prompt: ${prompt.length}ch — agents have high variance`,
    };
  }

  private predictBash(params: Record<string, unknown>): CostPrediction {
    const command = String(params.command || "");
    let outputTokens = 1500;
    let confidence: "high" | "medium" | "low" = "medium";

    // Command-specific estimates
    if (/\|\s*(head|tail)\s+-?\d+/.test(command)) {
      const match = command.match(/\|\s*(head|tail)\s+-?(\d+)/);
      outputTokens = match ? parseInt(match[2]) * 30 : 500;
      confidence = "high";
    } else if (/git\s+(status|log\s+--oneline|diff\s+--stat)/.test(command)) {
      outputTokens = 500;
      confidence = "high";
    } else if (/npm\s+(test|run)|npx\s+(tsc|vitest)/.test(command)) {
      outputTokens = 3000;
      confidence = "low";
    }

    return {
      tool: "Bash",
      estimatedInputTokens: 200,
      estimatedOutputTokens: outputTokens,
      estimatedTotal: 200 + outputTokens,
      confidence,
      reasoning: `Command: ${command.substring(0, 60)}...`,
    };
  }

  private predictDefault(tool: string): CostPrediction {
    const avg = AVERAGES[tool] || { input: 200, output: 1000 };
    return {
      tool,
      estimatedInputTokens: avg.input,
      estimatedOutputTokens: avg.output,
      estimatedTotal: avg.input + avg.output,
      confidence: "low",
      reasoning: "Using historical average — no specific prediction available",
    };
  }

  /**
   * Check if a call is affordable within remaining budget.
   */
  isAffordable(tool: string, params: Record<string, unknown>, remainingBudget: number): {
    affordable: boolean;
    prediction: CostPrediction;
    budgetAfter: number;
  } {
    const prediction = this.predict(tool, params);
    const budgetAfter = remainingBudget - prediction.estimatedTotal;
    return {
      affordable: budgetAfter > 0,
      prediction,
      budgetAfter: Math.max(0, budgetAfter),
    };
  }

  /**
   * Compact one-liner prediction.
   */
  oneLiner(tool: string, params: Record<string, unknown> = {}): string {
    const p = this.predict(tool, params);
    return `${tool}: ~${p.estimatedTotal} tokens (${p.confidence} confidence) — ${p.reasoning}`;
  }
}

export const toolCostPredictorEngine = new ToolCostPredictorEngine();
