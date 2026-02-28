/**
 * PRISM MCP Server - Swarm Execution Engine
 * Advanced multi-agent coordination patterns
 * 
 * Swarm Patterns:
 * - PARALLEL: All agents run simultaneously, results collected
 * - PIPELINE: Sequential with output→input chaining
 * - MAP_REDUCE: Distribute work, map results, reduce to single output
 * - CONSENSUS: Agents vote, majority/supermajority wins
 * - HIERARCHICAL: Layers of agents, each layer refines previous
 * - ENSEMBLE: Weighted combination of agent outputs
 * - COMPETITION: Best result wins (by confidence/score)
 * - COLLABORATION: Agents iteratively improve shared result
 * 
 * SAFETY CRITICAL: Swarm decisions may control manufacturing.
 * Consensus and validation prevent conflicting recommendations.
 */

import { log } from "../utils/Logger.js";
import { agentExecutor, type TaskResult, type TaskPriority } from "./AgentExecutor.js";
import { agentRegistry } from "../registries/AgentRegistry.js";
import { eventBus, EventTypes } from "./EventBus.js";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type SwarmPattern = 
  | "parallel" 
  | "pipeline" 
  | "map_reduce" 
  | "consensus" 
  | "hierarchical" 
  | "ensemble" 
  | "competition" 
  | "collaboration";

export interface SwarmConfig {
  name: string;
  pattern: SwarmPattern;
  agents: string[];                    // Agent IDs
  input: Record<string, unknown>;      // Shared input for all agents
  timeout_ms?: number;                 // Per-agent timeout
  options?: SwarmOptions;
}

export interface SwarmOptions {
  // Map-Reduce options
  mapFunction?: string;                // How to partition work
  reduceFunction?: ReduceFunction;     // How to combine results
  
  // Consensus options
  consensusThreshold?: number;         // 0-1, default 0.5 (majority)
  consensusField?: string;             // Which field to compare
  
  // Hierarchical options
  layers?: string[][];                 // Agent IDs per layer
  layerTimeout_ms?: number;            // Timeout per layer
  
  // Ensemble options
  weights?: Record<string, number>;    // Agent weights (default equal)
  aggregationMethod?: "weighted_avg" | "weighted_vote" | "max" | "min";
  
  // Competition options
  scoreField?: string;                 // Field to use for scoring
  scoreDirection?: "max" | "min";      // Higher or lower is better
  
  // Collaboration options
  maxIterations?: number;              // Max collaboration rounds
  convergenceThreshold?: number;       // Stop when change < threshold
}

export type ReduceFunction = 
  | "concat"      // Concatenate arrays
  | "merge"       // Deep merge objects
  | "sum"         // Sum numeric values
  | "average"     // Average numeric values
  | "max"         // Take maximum
  | "min"         // Take minimum
  | "first"       // First successful result
  | "last"        // Last successful result
  | "vote"        // Most common value
  | "custom";     // Custom reducer (not implemented)

export interface SwarmResult {
  swarmId: string;
  name: string;
  pattern: SwarmPattern;
  status: "completed" | "partial" | "failed";
  startTime: Date;
  endTime: Date;
  duration_ms: number;
  
  // Agent results
  agentResults: Map<string, AgentSwarmResult>;
  successCount: number;
  failCount: number;
  
  // Aggregated output
  aggregatedOutput: unknown;
  
  // Pattern-specific results
  consensus?: ConsensusResult;
  competition?: CompetitionResult;
  collaboration?: CollaborationResult;
  
  // Metadata
  warnings: string[];
  metadata?: Record<string, unknown>;
}

export interface AgentSwarmResult {
  agentId: string;
  agentName: string;
  status: "success" | "failed" | "timeout" | "skipped";
  output?: unknown;
  error?: string;
  duration_ms: number;
  confidence?: number;
  score?: number;
  iteration?: number;
}

export interface ConsensusResult {
  reached: boolean;
  threshold: number;
  actualAgreement: number;
  consensusValue: unknown;
  votes: Map<string, unknown>;
  dissenting: string[];
}

export interface CompetitionResult {
  winner: string;
  winnerScore: number;
  rankings: Array<{ agentId: string; score: number }>;
  scoreField: string;
}

export interface CollaborationResult {
  iterations: number;
  converged: boolean;
  finalDelta: number;
  history: Array<{ iteration: number; output: unknown; delta: number }>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SWARM_CONSTANTS = {
  DEFAULT_TIMEOUT_MS: 30000,
  DEFAULT_CONSENSUS_THRESHOLD: 0.5,
  DEFAULT_MAX_ITERATIONS: 5,
  DEFAULT_CONVERGENCE_THRESHOLD: 0.01,
  MAX_AGENTS_PER_SWARM: 20,
  MAX_LAYERS: 10
};

// ============================================================================
// SWARM EXECUTOR CLASS
// ============================================================================

export class SwarmExecutor {
  private swarmCounter: number = 0;
  private activeSwarms: Map<string, SwarmResult> = new Map();
  private completedSwarms: Map<string, SwarmResult> = new Map();

  constructor() {
    log.info("[SwarmExecutor] Initialized");
  }

  /**
   * Execute a swarm with specified pattern
   */
  async execute(config: SwarmConfig): Promise<SwarmResult> {
    const swarmId = `swarm_${++this.swarmCounter}_${Date.now()}`;
    const startTime = new Date();
    const warnings: string[] = [];

    log.info(`[SwarmExecutor] Starting ${config.pattern} swarm "${config.name}" with ${config.agents.length} agents`);

    // Validate agents
    const invalidAgents = config.agents.filter(id => !agentRegistry.get(id));
    if (invalidAgents.length > 0) {
      warnings.push(`Unknown agents: ${invalidAgents.join(", ")}`);
    }

    const validAgents = config.agents.filter(id => agentRegistry.get(id));
    if (validAgents.length === 0) {
      throw new Error("No valid agents in swarm");
    }

    // Initialize result
    const result: SwarmResult = {
      swarmId,
      name: config.name,
      pattern: config.pattern,
      status: "completed",
      startTime,
      endTime: new Date(),
      duration_ms: 0,
      agentResults: new Map(),
      successCount: 0,
      failCount: 0,
      aggregatedOutput: null,
      warnings
    };

    this.activeSwarms.set(swarmId, result);

    try {
      // Execute based on pattern
      switch (config.pattern) {
        case "parallel":
          await this.executeParallel(config, validAgents, result);
          break;
        case "pipeline":
          await this.executePipeline(config, validAgents, result);
          break;
        case "map_reduce":
          await this.executeMapReduce(config, validAgents, result);
          break;
        case "consensus":
          await this.executeConsensus(config, validAgents, result);
          break;
        case "hierarchical":
          await this.executeHierarchical(config, validAgents, result);
          break;
        case "ensemble":
          await this.executeEnsemble(config, validAgents, result);
          break;
        case "competition":
          await this.executeCompetition(config, validAgents, result);
          break;
        case "collaboration":
          await this.executeCollaboration(config, validAgents, result);
          break;
        default:
          throw new Error(`Unknown swarm pattern: ${config.pattern}`);
      }

      // Finalize
      result.endTime = new Date();
      result.duration_ms = result.endTime.getTime() - startTime.getTime();
      result.status = result.failCount === validAgents.length ? "failed" : 
                      result.failCount > 0 ? "partial" : "completed";

    } catch (error) {
      result.status = "failed";
      result.warnings.push(error instanceof Error ? error.message : String(error));
      log.error(`[SwarmExecutor] Swarm ${swarmId} failed: ${error}`);
    }

    // Move to completed
    this.activeSwarms.delete(swarmId);
    this.completedSwarms.set(swarmId, result);

    log.info(`[SwarmExecutor] Swarm ${swarmId} ${result.status}: ${result.successCount}/${validAgents.length} succeeded in ${result.duration_ms}ms`);

    // MS4: Emit swarm completion event
    try {
      eventBus.publish(EventTypes.SWARM_COMPLETED, {
        swarm_id: result.swarmId,
        status: result.status,
        success_count: result.successCount,
        fail_count: result.failCount,
        duration_ms: result.duration_ms,
      }, { category: "swarm", priority: "normal", source: "SwarmExecutor" });
    } catch { /* best-effort */ }

    return result;
  }

  // ==========================================================================
  // PARALLEL PATTERN
  // ==========================================================================

  private async executeParallel(
    config: SwarmConfig,
    agents: string[],
    result: SwarmResult
  ): Promise<void> {
    const timeout = config.timeout_ms || SWARM_CONSTANTS.DEFAULT_TIMEOUT_MS;

    const promises = agents.map(async (agentId) => {
      const startTime = Date.now();
      try {
        const taskResult = await this.executeAgent(agentId, config.input, timeout);
        const agentResult: AgentSwarmResult = {
          agentId,
          agentName: agentRegistry.get(agentId)?.name || agentId,
          status: taskResult.status === "completed" ? "success" : "failed",
          output: taskResult.output,
          error: taskResult.error,
          duration_ms: Date.now() - startTime
        };
        result.agentResults.set(agentId, agentResult);
        if (agentResult.status === "success") result.successCount++;
        else result.failCount++;
      } catch (error) {
        result.agentResults.set(agentId, {
          agentId,
          agentName: agentRegistry.get(agentId)?.name || agentId,
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
          duration_ms: Date.now() - startTime
        });
        result.failCount++;
      }
    });

    await Promise.all(promises);

    // Aggregate outputs
    result.aggregatedOutput = this.collectOutputs(result.agentResults);
  }

  // ==========================================================================
  // PIPELINE PATTERN
  // ==========================================================================

  private async executePipeline(
    config: SwarmConfig,
    agents: string[],
    result: SwarmResult
  ): Promise<void> {
    const timeout = config.timeout_ms || SWARM_CONSTANTS.DEFAULT_TIMEOUT_MS;
    let currentInput = { ...config.input };

    for (const agentId of agents) {
      const startTime = Date.now();
      try {
        const taskResult = await this.executeAgent(agentId, currentInput, timeout);
        const agentResult: AgentSwarmResult = {
          agentId,
          agentName: agentRegistry.get(agentId)?.name || agentId,
          status: taskResult.status === "completed" ? "success" : "failed",
          output: taskResult.output,
          error: taskResult.error,
          duration_ms: Date.now() - startTime
        };
        result.agentResults.set(agentId, agentResult);

        if (taskResult.status === "completed" && taskResult.output) {
          result.successCount++;
          // Pass output to next agent
          currentInput = typeof taskResult.output === "object" && taskResult.output !== null
            ? { ...config.input, _pipelineInput: taskResult.output, ...taskResult.output as Record<string, unknown> }
            : { ...config.input, _pipelineInput: taskResult.output };
        } else {
          result.failCount++;
          result.warnings.push(`Pipeline broken at agent ${agentId}`);
          break;
        }
      } catch (error) {
        result.agentResults.set(agentId, {
          agentId,
          agentName: agentRegistry.get(agentId)?.name || agentId,
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
          duration_ms: Date.now() - startTime
        });
        result.failCount++;
        break;
      }
    }

    // Final output is last successful output
    const outputs = Array.from(result.agentResults.values())
      .filter(r => r.status === "success")
      .map(r => r.output);
    result.aggregatedOutput = outputs.length > 0 ? outputs[outputs.length - 1] : null;
  }

  // ==========================================================================
  // MAP-REDUCE PATTERN
  // ==========================================================================

  private async executeMapReduce(
    config: SwarmConfig,
    agents: string[],
    result: SwarmResult
  ): Promise<void> {
    // Map phase: run all agents in parallel
    await this.executeParallel(config, agents, result);

    // Reduce phase: combine results
    const reduceFunction = config.options?.reduceFunction || "merge";
    const outputs = Array.from(result.agentResults.values())
      .filter(r => r.status === "success" && r.output !== undefined)
      .map(r => r.output);

    result.aggregatedOutput = this.reduce(outputs, reduceFunction);
  }

  // ==========================================================================
  // CONSENSUS PATTERN
  // ==========================================================================

  private async executeConsensus(
    config: SwarmConfig,
    agents: string[],
    result: SwarmResult
  ): Promise<void> {
    const threshold = config.options?.consensusThreshold || SWARM_CONSTANTS.DEFAULT_CONSENSUS_THRESHOLD;
    const consensusField = config.options?.consensusField;

    // Run all agents in parallel
    await this.executeParallel(config, agents, result);

    // Collect votes
    const votes = new Map<string, unknown>();
    const voteCounts = new Map<string, number>();

    result.agentResults.forEach((agentResult, agentId) => {
      if (agentResult.status === "success" && agentResult.output !== undefined) {
        // Extract vote value
        let voteValue: unknown;
        if (consensusField && typeof agentResult.output === "object" && agentResult.output !== null) {
          voteValue = (agentResult.output as Record<string, unknown>)[consensusField];
        } else {
          voteValue = agentResult.output;
        }

        votes.set(agentId, voteValue);

        // Count votes
        const voteKey = JSON.stringify(voteValue);
        voteCounts.set(voteKey, (voteCounts.get(voteKey) || 0) + 1);
      }
    });

    // Find consensus
    const totalVotes = votes.size;
    let consensusValue: unknown = null;
    let maxVotes = 0;
    let consensusKey = "";

    voteCounts.forEach((count, key) => {
      if (count > maxVotes) {
        maxVotes = count;
        consensusKey = key;
        consensusValue = JSON.parse(key);
      }
    });

    const actualAgreement = totalVotes > 0 ? maxVotes / totalVotes : 0;
    const reached = actualAgreement >= threshold;

    // Find dissenting agents
    const dissenting: string[] = [];
    votes.forEach((vote, agentId) => {
      if (JSON.stringify(vote) !== consensusKey) {
        dissenting.push(agentId);
      }
    });

    result.consensus = {
      reached,
      threshold,
      actualAgreement,
      consensusValue,
      votes,
      dissenting
    };

    result.aggregatedOutput = reached ? consensusValue : null;

    if (!reached) {
      result.warnings.push(`Consensus not reached: ${(actualAgreement * 100).toFixed(0)}% < ${(threshold * 100).toFixed(0)}%`);
    }

    // MS4: Emit consensus event
    try {
      const eventType = reached ? EventTypes.SWARM_CONSENSUS_REACHED : EventTypes.SWARM_CONSENSUS_FAILED;
      eventBus.publish(eventType, {
        swarm_id: result.swarmId,
        pattern: config.pattern,
        reached,
        threshold,
        actual_agreement: actualAgreement,
        agents: agents.length,
      }, { category: "swarm", priority: reached ? "normal" : "high", source: "SwarmExecutor" });
    } catch { /* event emission is best-effort */ }
  }

  // ==========================================================================
  // HIERARCHICAL PATTERN
  // ==========================================================================

  private async executeHierarchical(
    config: SwarmConfig,
    agents: string[],
    result: SwarmResult
  ): Promise<void> {
    const layers = config.options?.layers || [agents];
    const layerTimeout = config.options?.layerTimeout_ms || config.timeout_ms || SWARM_CONSTANTS.DEFAULT_TIMEOUT_MS;

    let layerInput = { ...config.input };
    let layerNum = 0;

    for (const layer of layers) {
      layerNum++;
      log.debug(`[SwarmExecutor] Executing hierarchical layer ${layerNum}/${layers.length}`);

      // Execute layer in parallel
      const layerPromises = layer.map(async (agentId) => {
        const startTime = Date.now();
        try {
          const taskResult = await this.executeAgent(agentId, layerInput, layerTimeout);
          const agentResult: AgentSwarmResult = {
            agentId,
            agentName: agentRegistry.get(agentId)?.name || agentId,
            status: taskResult.status === "completed" ? "success" : "failed",
            output: taskResult.output,
            error: taskResult.error,
            duration_ms: Date.now() - startTime,
            iteration: layerNum
          };
          result.agentResults.set(`${agentId}_L${layerNum}`, agentResult);
          if (agentResult.status === "success") result.successCount++;
          else result.failCount++;
          return agentResult;
        } catch (error) {
          result.failCount++;
          return null;
        }
      });

      const layerResults = await Promise.all(layerPromises);

      // Aggregate layer outputs for next layer
      const layerOutputs = layerResults
        .filter(r => r && r.status === "success" && r.output)
        .map(r => r!.output);

      if (layerOutputs.length > 0) {
        layerInput = {
          ...config.input,
          _previousLayerOutputs: layerOutputs,
          _layerNumber: layerNum
        };
      }
    }

    // Final output is from last layer
    const lastLayerKey = `_L${layerNum}`;
    const lastLayerResults = Array.from(result.agentResults.entries())
      .filter(([key]) => key.endsWith(lastLayerKey))
      .map(([, value]) => value.output)
      .filter(o => o !== undefined);

    result.aggregatedOutput = this.reduce(lastLayerResults, "merge");
  }

  // ==========================================================================
  // ENSEMBLE PATTERN
  // ==========================================================================

  private async executeEnsemble(
    config: SwarmConfig,
    agents: string[],
    result: SwarmResult
  ): Promise<void> {
    const weights = config.options?.weights || {};
    const method = config.options?.aggregationMethod || "weighted_avg";

    // Run all agents in parallel
    await this.executeParallel(config, agents, result);

    // Collect outputs with weights
    const weightedOutputs: Array<{ output: unknown; weight: number }> = [];

    result.agentResults.forEach((agentResult, agentId) => {
      if (agentResult.status === "success" && agentResult.output !== undefined) {
        const weight = weights[agentId] || 1.0;
        weightedOutputs.push({ output: agentResult.output, weight });
      }
    });

    // Aggregate based on method
    switch (method) {
      case "weighted_avg":
        result.aggregatedOutput = this.weightedAverage(weightedOutputs);
        break;
      case "weighted_vote":
        result.aggregatedOutput = this.weightedVote(weightedOutputs);
        break;
      case "max":
        result.aggregatedOutput = this.selectByScore(weightedOutputs, "max");
        break;
      case "min":
        result.aggregatedOutput = this.selectByScore(weightedOutputs, "min");
        break;
      default:
        result.aggregatedOutput = this.collectOutputs(result.agentResults);
    }
  }

  // ==========================================================================
  // COMPETITION PATTERN
  // ==========================================================================

  private async executeCompetition(
    config: SwarmConfig,
    agents: string[],
    result: SwarmResult
  ): Promise<void> {
    const scoreField = config.options?.scoreField || "confidence";
    const direction = config.options?.scoreDirection || "max";

    // Run all agents in parallel
    await this.executeParallel(config, agents, result);

    // Score and rank results
    const rankings: Array<{ agentId: string; score: number; output: unknown }> = [];

    result.agentResults.forEach((agentResult, agentId) => {
      if (agentResult.status === "success" && agentResult.output !== undefined) {
        let score = 0;
        if (typeof agentResult.output === "object" && agentResult.output !== null) {
          const outputObj = agentResult.output as Record<string, unknown>;
          score = typeof outputObj[scoreField] === "number" ? outputObj[scoreField] as number : 0;
        } else if (typeof agentResult.output === "number") {
          score = agentResult.output;
        }

        agentResult.score = score;
        rankings.push({ agentId, score, output: agentResult.output });
      }
    });

    // Sort by score
    rankings.sort((a, b) => direction === "max" ? b.score - a.score : a.score - b.score);

    // Winner is first
    const winner = rankings[0];

    result.competition = {
      winner: winner?.agentId || "",
      winnerScore: winner?.score || 0,
      rankings: rankings.map(r => ({ agentId: r.agentId, score: r.score })),
      scoreField
    };

    result.aggregatedOutput = winner?.output || null;
  }

  // ==========================================================================
  // COLLABORATION PATTERN
  // ==========================================================================

  private async executeCollaboration(
    config: SwarmConfig,
    agents: string[],
    result: SwarmResult
  ): Promise<void> {
    const maxIterations = config.options?.maxIterations || SWARM_CONSTANTS.DEFAULT_MAX_ITERATIONS;
    const convergenceThreshold = config.options?.convergenceThreshold || SWARM_CONSTANTS.DEFAULT_CONVERGENCE_THRESHOLD;
    const timeout = config.timeout_ms || SWARM_CONSTANTS.DEFAULT_TIMEOUT_MS;

    const history: Array<{ iteration: number; output: unknown; delta: number }> = [];
    let currentOutput: unknown = null;
    let previousOutput: unknown = null;
    let converged = false;
    let iteration = 0;

    while (iteration < maxIterations && !converged) {
      iteration++;
      log.debug(`[SwarmExecutor] Collaboration iteration ${iteration}/${maxIterations}`);

      // Build collaborative input
      const iterInput = {
        ...config.input,
        _iteration: iteration,
        _previousOutput: currentOutput,
        _history: history.map(h => h.output)
      };

      // Run agents in sequence for collaboration
      for (const agentId of agents) {
        const startTime = Date.now();
        try {
          const taskResult = await this.executeAgent(agentId, iterInput, timeout);
          const agentResult: AgentSwarmResult = {
            agentId,
            agentName: agentRegistry.get(agentId)?.name || agentId,
            status: taskResult.status === "completed" ? "success" : "failed",
            output: taskResult.output,
            error: taskResult.error,
            duration_ms: Date.now() - startTime,
            iteration
          };
          result.agentResults.set(`${agentId}_I${iteration}`, agentResult);

          if (taskResult.status === "completed" && taskResult.output) {
            result.successCount++;
            currentOutput = taskResult.output;
          } else {
            result.failCount++;
          }
        } catch (error) {
          result.failCount++;
        }
      }

      // Calculate delta
      const delta = this.calculateDelta(previousOutput, currentOutput);
      history.push({ iteration, output: currentOutput, delta });

      // Check convergence
      if (delta < convergenceThreshold) {
        converged = true;
      }

      previousOutput = currentOutput;
    }

    result.collaboration = {
      iterations: iteration,
      converged,
      finalDelta: history.length > 0 ? history[history.length - 1].delta : 0,
      history
    };

    result.aggregatedOutput = currentOutput;

    if (!converged) {
      result.warnings.push(`Collaboration did not converge after ${iteration} iterations`);
    }
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Execute a single agent
   */
  private async executeAgent(
    agentId: string,
    input: Record<string, unknown>,
    timeout_ms: number
  ): Promise<TaskResult> {
    const task = agentExecutor.createTask(agentId, input, { timeout_ms });
    return agentExecutor.executeTask(task);
  }

  /**
   * Collect outputs from agent results
   */
  private collectOutputs(results: Map<string, AgentSwarmResult>): unknown[] {
    return Array.from(results.values())
      .filter(r => r.status === "success" && r.output !== undefined)
      .map(r => r.output);
  }

  /**
   * Reduce outputs using specified function
   */
  private reduce(outputs: unknown[], fn: ReduceFunction): unknown {
    if (outputs.length === 0) return null;

    switch (fn) {
      case "concat":
        return outputs.flat();

      case "merge":
        return outputs.reduce((acc: Record<string, unknown>, curr) => {
          if (typeof curr === "object" && curr !== null) {
            return { ...acc, ...curr };
          }
          return acc;
        }, {});

      case "sum":
        return outputs.reduce((sum: number, curr) => {
          return sum + (typeof curr === "number" ? curr : 0);
        }, 0);

      case "average":
        const nums = outputs.filter(o => typeof o === "number") as number[];
        return nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;

      case "max":
        return Math.max(...outputs.filter(o => typeof o === "number") as number[]);

      case "min":
        return Math.min(...outputs.filter(o => typeof o === "number") as number[]);

      case "first":
        return outputs[0];

      case "last":
        return outputs[outputs.length - 1];

      case "vote":
        const counts = new Map<string, number>();
        outputs.forEach(o => {
          const key = JSON.stringify(o);
          counts.set(key, (counts.get(key) || 0) + 1);
        });
        let maxCount = 0;
        let winner: unknown = null;
        counts.forEach((count, key) => {
          if (count > maxCount) {
            maxCount = count;
            winner = JSON.parse(key);
          }
        });
        return winner;

      default:
        return outputs;
    }
  }

  /**
   * Weighted average of outputs
   */
  private weightedAverage(items: Array<{ output: unknown; weight: number }>): unknown {
    // For numeric outputs
    const numericItems = items.filter(i => typeof i.output === "number");
    if (numericItems.length > 0) {
      const totalWeight = numericItems.reduce((sum, i) => sum + i.weight, 0);
      const weightedSum = numericItems.reduce((sum, i) => sum + (i.output as number) * i.weight, 0);
      return weightedSum / totalWeight;
    }

    // For object outputs, use highest weight
    const sorted = [...items].sort((a, b) => b.weight - a.weight);
    return sorted[0]?.output || null;
  }

  /**
   * Weighted vote
   */
  private weightedVote(items: Array<{ output: unknown; weight: number }>): unknown {
    const votes = new Map<string, number>();
    items.forEach(({ output, weight }) => {
      const key = JSON.stringify(output);
      votes.set(key, (votes.get(key) || 0) + weight);
    });

    let maxWeight = 0;
    let winner: unknown = null;
    votes.forEach((weight, key) => {
      if (weight > maxWeight) {
        maxWeight = weight;
        winner = JSON.parse(key);
      }
    });
    return winner;
  }

  /**
   * Select by score
   */
  private selectByScore(
    items: Array<{ output: unknown; weight: number }>,
    direction: "max" | "min"
  ): unknown {
    if (items.length === 0) return null;
    const sorted = [...items].sort((a, b) => 
      direction === "max" ? b.weight - a.weight : a.weight - b.weight
    );
    return sorted[0].output;
  }

  /**
   * Calculate delta between outputs
   */
  private calculateDelta(prev: unknown, curr: unknown): number {
    if (prev === null || prev === undefined) return 1.0;
    if (curr === null || curr === undefined) return 1.0;

    // Numeric comparison
    if (typeof prev === "number" && typeof curr === "number") {
      return Math.abs(curr - prev) / Math.max(Math.abs(prev), 1);
    }

    // String comparison
    if (typeof prev === "string" && typeof curr === "string") {
      return prev === curr ? 0 : 1;
    }

    // Object comparison (simplified)
    try {
      return JSON.stringify(prev) === JSON.stringify(curr) ? 0 : 0.5;
    } catch {
      return 1.0;
    }
  }

  // ==========================================================================
  // SWARM MANAGEMENT
  // ==========================================================================

  /**
   * Get swarm result
   */
  getSwarm(swarmId: string): SwarmResult | undefined {
    return this.activeSwarms.get(swarmId) || this.completedSwarms.get(swarmId);
  }

  /**
   * List all swarms
   */
  listSwarms(): SwarmResult[] {
    return [
      ...Array.from(this.activeSwarms.values()),
      ...Array.from(this.completedSwarms.values())
    ];
  }

  /**
   * Get available patterns
   */
  getPatterns(): Array<{ pattern: SwarmPattern; description: string }> {
    return [
      { pattern: "parallel", description: "All agents run simultaneously, results collected" },
      { pattern: "pipeline", description: "Sequential with output→input chaining" },
      { pattern: "map_reduce", description: "Distribute work, map results, reduce to single output" },
      { pattern: "consensus", description: "Agents vote, majority wins" },
      { pattern: "hierarchical", description: "Layers of agents, each layer refines previous" },
      { pattern: "ensemble", description: "Weighted combination of agent outputs" },
      { pattern: "competition", description: "Best result wins (by score)" },
      { pattern: "collaboration", description: "Agents iteratively improve shared result" }
    ];
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const swarmExecutor = new SwarmExecutor();

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Execute a swarm with specified pattern
 */
export async function executeSwarm(config: SwarmConfig): Promise<SwarmResult> {
  return swarmExecutor.execute(config);
}

/**
 * Execute parallel swarm
 */
export async function executeParallelSwarm(
  name: string,
  agents: string[],
  input: Record<string, unknown>
): Promise<SwarmResult> {
  return swarmExecutor.execute({ name, pattern: "parallel", agents, input });
}

/**
 * Execute consensus swarm
 */
export async function executeConsensusSwarm(
  name: string,
  agents: string[],
  input: Record<string, unknown>,
  threshold: number = 0.5
): Promise<SwarmResult> {
  return swarmExecutor.execute({
    name,
    pattern: "consensus",
    agents,
    input,
    options: { consensusThreshold: threshold }
  });
}
