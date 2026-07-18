/**
 * PRISM MCP Server — RL Post Processor Engine
 *
 * Reinforcement learning for adaptive G-code post processing.
 * Epsilon-greedy Q-learning selects code format per move type,
 * learns from controller feedback (execution time, errors, quality).
 *
 * Ported from PRISM_RL_POST_PROCESSOR.js (monolith R2.3.1).
 *
 * @module RLPostProcessorEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export type CodeFormat = "standard" | "optimized" | "compact" | "verbose";

export interface RLProcessor {
  controllerType: string;
  Q: Record<string, number>;
  epsilon: number;
  learningRate: number;
  gamma: number;
  history: Array<{ feedback: RLFeedback; reward: number; timestamp: number }>;
}

export interface ToolpathMove {
  type: "rapid" | "linear" | "arc";
  x: number;
  y: number;
  z: number;
  f?: number;
}

export interface RLFeedback {
  codeLineIndex: number;
  executionTime: number;
  expectedTime: number;
  error: boolean;
  surfaceQuality: number;
  stateKey?: string;
  actionKey?: string;
}

export interface GenerateResult {
  gcode: string;
  lineCount: number;
  optimizations: number;
  formatsUsed: Record<CodeFormat, number>;
}

export interface LearnResult {
  reward: number;
  updatedQValue: number;
  totalExperiences: number;
}

// ============================================================================
// ENGINE
// ============================================================================

class RLPostProcessorEngineImpl {

  /** Create a new RL processor instance. */
  createProcessor(
    controllerType: string,
    opts?: { epsilon?: number; learningRate?: number; gamma?: number },
  ): RLProcessor {
    return {
      controllerType,
      Q: {},
      epsilon: opts?.epsilon ?? 0.1,
      learningRate: opts?.learningRate ?? 0.1,
      gamma: opts?.gamma ?? 0.95,
      history: [],
    };
  }

  /** Generate G-code with RL-optimized formatting. */
  generateCode(
    processor: RLProcessor,
    toolpath: ToolpathMove[],
    opts?: { programNumber?: number; deterministic?: boolean },
  ): GenerateResult {
    const code: string[] = [];
    const formatsUsed: Record<CodeFormat, number> = {
      standard: 0, optimized: 0, compact: 0, verbose: 0,
    };

    code.push(this.generateHeader(processor, opts?.programNumber ?? 1000));

    for (let i = 0; i < toolpath.length; i++) {
      const move = toolpath[i];
      const stateKey = this.getStateKey(
        move, i, i > 0 ? toolpath[i - 1] : undefined,
      );

      const format = opts?.deterministic
        ? this.exploitFormat(processor, stateKey)
        : this.chooseFormat(processor, stateKey);

      formatsUsed[format]++;
      code.push(this.formatMove(move, format));
    }

    code.push("M30");
    code.push("%");

    return {
      gcode: code.join("\n"),
      lineCount: code.length,
      optimizations: this.countOptimizations(processor),
      formatsUsed,
    };
  }

  /** Learn from controller feedback — update Q-values. */
  learn(processor: RLProcessor, feedback: RLFeedback): LearnResult {
    let reward = 0;
    if (!feedback.error) reward += 10;
    if (feedback.executionTime < feedback.expectedTime) reward += 5;
    if (feedback.surfaceQuality > 0.8) reward += 3;
    if (feedback.error) reward -= 20;

    const stateKey = feedback.stateKey ?? `state_${feedback.codeLineIndex}`;
    const actionKey = feedback.actionKey ?? "default";
    const key = `${stateKey}_${actionKey}`;

    if (processor.Q[key] == null) processor.Q[key] = 0;
    processor.Q[key] += processor.learningRate * (reward - processor.Q[key]);

    processor.history.push({
      feedback, reward, timestamp: Date.now(),
    });

    return {
      reward,
      updatedQValue: processor.Q[key],
      totalExperiences: processor.history.length,
    };
  }

  /** Get processor stats. */
  stats(processor: RLProcessor): {
    totalExperiences: number;
    optimizedActions: number;
    avgReward: number;
    qTableSize: number;
  } {
    const totalReward = processor.history.reduce(
      (s, h) => s + h.reward, 0,
    );
    return {
      totalExperiences: processor.history.length,
      optimizedActions: this.countOptimizations(processor),
      avgReward: processor.history.length > 0
        ? round2(totalReward / processor.history.length) : 0,
      qTableSize: Object.keys(processor.Q).length,
    };
  }

  // ─── internal ───

  private getStateKey(
    move: ToolpathMove, _index: number, prev?: ToolpathMove,
  ): string {
    return `${move.type}_${prev?.type ?? "start"}`;
  }

  private chooseFormat(processor: RLProcessor, stateKey: string): CodeFormat {
    if (Math.random() < processor.epsilon) {
      return this.exploreFormat();
    }
    return this.exploitFormat(processor, stateKey);
  }

  private exploreFormat(): CodeFormat {
    const formats: CodeFormat[] = [
      "standard", "optimized", "compact", "verbose",
    ];
    return formats[Math.floor(Math.random() * formats.length)];
  }

  private exploitFormat(
    processor: RLProcessor, stateKey: string,
  ): CodeFormat {
    const formats: CodeFormat[] = [
      "standard", "optimized", "compact", "verbose",
    ];
    let best: CodeFormat = "standard";
    let bestQ = -Infinity;
    for (const fmt of formats) {
      const q = processor.Q[`${stateKey}_${fmt}`] ?? 0;
      if (q > bestQ) { bestQ = q; best = fmt; }
    }
    return best;
  }

  private formatMove(move: ToolpathMove, format: CodeFormat): string {
    const { type, x, y, z, f } = move;
    switch (format) {
      case "compact":
        return type === "rapid"
          ? `G0X${x}Y${y}Z${z}`
          : `G1X${x}Y${y}Z${z}F${f ?? 100}`;
      case "verbose":
        return type === "rapid"
          ? `G00 X${x.toFixed(4)} Y${y.toFixed(4)} Z${z.toFixed(4)}`
          : `G01 X${x.toFixed(4)} Y${y.toFixed(4)} Z${z.toFixed(4)} F${(f ?? 100).toFixed(1)}`;
      case "optimized":
        return type === "rapid"
          ? `G0 X${x.toFixed(3)} Y${y.toFixed(3)} Z${z.toFixed(3)}`
          : `G1 X${x.toFixed(3)} Y${y.toFixed(3)} Z${z.toFixed(3)} F${f ?? 100}`;
      default: // standard
        return type === "rapid"
          ? `G0 X${x.toFixed(3)} Y${y.toFixed(3)} Z${z.toFixed(3)}`
          : `G1 X${x.toFixed(3)} Y${y.toFixed(3)} Z${z.toFixed(3)} F${f ?? 100}`;
    }
  }

  private generateHeader(
    processor: RLProcessor, programNumber: number,
  ): string {
    return [
      "%",
      `O${programNumber}`,
      `(PRISM RL Post Processor - ${processor.controllerType})`,
      "G90 G40 G80",
      "G21",
    ].join("\n");
  }

  private countOptimizations(processor: RLProcessor): number {
    return Object.values(processor.Q).filter(v => v > 5).length;
  }
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

export const rlPostProcessorEngine = new RLPostProcessorEngineImpl();
