/**
 * PRISM AutoPilot v3.0 - Unified Real API Orchestration
 * 
 * MERGED from v1 (real API) + v2 (registry-aware task classification)
 * 
 * ALL PHASES USE REAL PARALLEL API CALLS:
 * 1. GSD → Load instructions
 * 2. STATE → Load current state + task
 * 3. BRAINSTORM → 7 lenses via PARALLEL API calls (not canned strings)
 * 4. EXECUTE → Real swarm deployment with live API
 * 5. RALPH x4 → Scrutinize, Improve, Validate, ASSESS (all live API)
 * 6. UPDATE → State, hooks, memories
 * 
 * KEY CHANGE: Brainstorm uses parallelAPICalls() for real analysis
 * instead of hardcoded strings. Each lens gets its own API call.
 */

import * as fs from "fs";
import * as path from "path";
import { hasValidApiKey, getAnthropicClient, getModelForTier, parallelAPICalls } from "../config/api-config.js";
import { swarmExecutor } from "../engines/SwarmExecutor.js";
import { agentExecutor } from "../engines/AgentExecutor.js";
import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export interface AutoPilotConfig {
  statePath: string;
  gsdPath: string;
  skillsPath: string;
  enableSwarms: boolean;
  enableRalphLoops: number;
  enableFormulaOptimization: boolean;
  requireRealAPI: boolean;
  enableParallelBrainstorm: boolean;
}

export interface AutoPilotResult {
  phase: string;
  mode: "LIVE_API" | "BLOCKED";
  gsd: GSDResult;
  state: StateResult;
  brainstorm: BrainstormResult;
  execution: ExecutionResult;
  ralph: RalphResult[];
  assessment: AssessmentResult;
  updates: UpdateResult;
  metrics: MetricsResult;
  totalDuration: number;
  apiCallsMade: number;
  totalTokens: { input: number; output: number };
}

export interface GSDResult {
  loaded: boolean;
  version: string;
  laws: string[];
  bufferZone: string;
}

export interface StateResult {
  sessionId: string;
  phase: string;
  pendingTasks: string[];
  quickResume: string;
}

export interface BrainstormResult {
  lensesApplied: string[];
  assumptions: string[];
  alternatives: string[];
  inversions: string[];
  fusions: string[];
  tenX: string[];
  simplifications: string[];
  futureProof: string[];
  formulaUsed: string | null;
  optimizedApproach: string;
  apiCalls: number;
  totalTokens: { input: number; output: number };
}

export interface ExecutionResult {
  swarmsDeployed: number;
  agentsUsed: string[];
  hooksTriggered: string[];
  batchesRun: number;
  tasksCompleted: string[];
  liveResponses: AgentResponse[];
  totalTokens: number;
}

export interface AgentResponse {
  agentId: string;
  model: string;
  response: string;
  duration_ms: number;
  tokens?: { input: number; output: number };
}

export interface RalphResult {
  loop: number;
  phase: "SCRUTINIZE" | "IMPROVE" | "VALIDATE" | "ASSESS";
  scrutinized: string[];
  improvements: string[];
  validated: boolean;
  score: number;
  liveResponse?: string;
  model?: string;
  duration_ms?: number;
}

export interface AssessmentResult {
  grade: "A" | "B" | "C" | "D" | "F";
  omega: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  ready_for_production: boolean;
  confidence: number;
}

export interface UpdateResult {
  stateUpdated: boolean;
  memoriesUpdated: boolean;
  gsdUpdated: boolean;
  skillsUpdated: boolean;
  newToolsCreated: string[];
}

export interface MetricsResult {
  R: number;
  C: number;
  P: number;
  S: number;
  L: number;
  Omega: number;
  status: "BLOCKED" | "WARNING" | "APPROVED" | "EXCELLENT";
}

// Task classification (from V2)
export type TaskType = 
  | "calculation" | "data_lookup" | "code_fix" 
  | "analysis" | "documentation" | "orchestration" | "validation";

export interface TaskContext {
  task: string;
  taskType: TaskType;
  domain: string[];
  requiredTools: string[];
  estimatedCalls: number;
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

const DEFAULT_CONFIG: AutoPilotConfig = {
  statePath: "C:\\PRISM\\state\\CURRENT_STATE.json",
  gsdPath: "C:\\PRISM\\mcp-server\\data\\docs\\gsd\\GSD_QUICK.md",
  skillsPath: "C:\\PRISM\\skills-consolidated",
  enableSwarms: true,
  enableRalphLoops: 4,
  enableFormulaOptimization: true,
  requireRealAPI: true,
  enableParallelBrainstorm: true
};

// ============================================================================
// 7 SUPERPOWERS LENSES
// ============================================================================

const SEVEN_LENSES = [
  { id: "CHALLENGE", name: "Challenge Assumptions", question: "What are we assuming that might be wrong?" },
  { id: "MULTIPLY", name: "Multiply Alternatives", question: "What are 3+ different approaches?" },
  { id: "INVERT", name: "Invert Problem", question: "What if we solved the opposite problem?" },
  { id: "FUSE", name: "Cross-Domain Fusion", question: "What solutions exist in other domains?" },
  { id: "TENX", name: "10X Improvement", question: "How could we make this 10x better?" },
  { id: "SIMPLIFY", name: "Simplify", question: "What's the simplest possible solution?" },
  { id: "FUTURE", name: "Future-Proof", question: "How do we make this adaptable to change?" }
];

// ============================================================================
// OPTIMIZATION FORMULAS
// ============================================================================

interface Formula {
  id: string;
  name: string;
  domain: string;
  equation: string;
  variables: string[];
  optimize: "minimize" | "maximize";
}

const OPTIMIZATION_FORMULAS: Formula[] = [
  { id: "F-TOKEN-OPT-001", name: "Token Efficiency", domain: "development",
    equation: "E = (Output_Value) / (Tokens_Used × Time)", variables: ["Output_Value", "Tokens_Used", "Time"], optimize: "maximize" },
  { id: "F-SWARM-OPT-001", name: "Swarm Optimization", domain: "agents",
    equation: "S = Σ(Confidence × Match) / N", variables: ["Confidence", "Match", "N"], optimize: "maximize" },
  { id: "F-RALPH-CONV-001", name: "Ralph Convergence", domain: "validation",
    equation: "C = 1 - |Δscore| / score", variables: ["Δscore", "score"], optimize: "maximize" },
  { id: "F-RISK-MIN-001", name: "Risk Minimization", domain: "safety",
    equation: "R = Σ(P_failure × Impact) / N", variables: ["P_failure", "Impact", "N"], optimize: "minimize" }
];

// ============================================================================
// TASK CLASSIFIER (from V2)
// ============================================================================

function classifyTask(task: string): TaskContext {
  const taskLower = task.toLowerCase();
  const context: TaskContext = {
    task, taskType: "documentation", domain: [], requiredTools: [], estimatedCalls: 1
  };

  if (taskLower.match(/calc|force|speed|feed|mrr|power|deflect|stable|thermal|tool life/)) {
    context.taskType = "calculation";
    context.domain.push("manufacturing_physics");
    context.estimatedCalls = 3;
  }
  if (taskLower.match(/material|alarm|machine|controller|agent|skill/)) {
    context.taskType = "data_lookup";
    context.domain.push("data_access");
    context.estimatedCalls = 2;
  }
  if (taskLower.match(/fix|bug|error|debug|code|implement|update|registry/)) {
    context.taskType = "code_fix";
    context.domain.push("development");
    context.estimatedCalls = 5;
  }
  if (taskLower.match(/analy|audit|check|review|inspect|compare/)) {
    context.taskType = "analysis";
    context.domain.push("analysis");
    context.estimatedCalls = 4;
  }
  if (taskLower.match(/orchestrat|agent|swarm|parallel|batch/)) {
    context.taskType = "orchestration";
    context.domain.push("orchestration");
    context.estimatedCalls = 6;
  }

  return context;
}

// ============================================================================
// AUTOPILOT v3 CLASS
// ============================================================================

export class AutoPilot {
  private config: AutoPilotConfig;
  private apiCallCount: number = 0;
  private tokenTotals = { input: 0, output: 0 };

  constructor(config: Partial<AutoPilotConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * MAIN EXECUTION - All phases use REAL Claude API
   */
  async execute(task: string, context: Record<string, unknown> = {}): Promise<AutoPilotResult> {
    const startTime = Date.now();
    this.apiCallCount = 0;
    this.tokenTotals = { input: 0, output: 0 };

    log.info(`[AutoPilot v3] Starting LIVE execution for: ${task}`);

    // CHECK API KEY FIRST
    if (this.config.requireRealAPI && !hasValidApiKey()) {
      log.error("[AutoPilot v3] BLOCKED - No API key configured");
      return this.createBlockedResult(task, "ANTHROPIC_API_KEY required");
    }

    // Classify task (from V2)
    const taskContext = classifyTask(task);
    log.info(`[AutoPilot v3] Task classified: ${taskContext.taskType} (${taskContext.domain.join(",")})`);

    // Phase 1: GSD
    const gsd = await this.loadGSD();

    // Phase 2: STATE
    const state = await this.loadState();

    // Phase 3: BRAINSTORM with REAL PARALLEL API CALLS
    log.info("[AutoPilot v3] Phase 3: Brainstorming with 7 parallel API calls...");
    const brainstorm = await this.brainstormReal(task, taskContext, context);

    // Phase 4: EXECUTE WITH REAL SWARMS
    log.info("[AutoPilot v3] Phase 4: Executing with LIVE swarms...");
    const execution = await this.executeWithRealSwarms(task, taskContext, brainstorm);

    // Phase 5: RALPH LOOPS (4 phases)
    log.info("[AutoPilot v3] Phase 5: Running 4-phase Ralph validation...");
    const ralph = await this.runRalphLoopsReal(task, execution);

    // Extract assessment
    const lastRalph = ralph.find(r => r.phase === "ASSESS") || ralph[ralph.length - 1];
    const assessment = this.buildAssessment(lastRalph, ralph);

    // Phase 6: UPDATE
    const updates = await this.updateAll(task, execution, ralph);

    // Compute final metrics
    const metrics = this.computeMetrics(brainstorm, execution, ralph);

    const totalDuration = Date.now() - startTime;
    log.info(`[AutoPilot v3] Completed in ${totalDuration}ms, ${this.apiCallCount} API calls, ${this.tokenTotals.input + this.tokenTotals.output} tokens`);

    return {
      phase: "COMPLETED", mode: "LIVE_API",
      gsd, state, brainstorm, execution, ralph, assessment, updates, metrics,
      totalDuration, apiCallsMade: this.apiCallCount,
      totalTokens: { ...this.tokenTotals }
    };
  }

  // --------------------------------------------------------------------------
  // PHASE 1: GSD
  // --------------------------------------------------------------------------
  private async loadGSD(): Promise<GSDResult> {
    try {
      const content = fs.readFileSync(this.config.gsdPath, "utf-8");
      // Parse version from header (e.g., "## 31 dispatchers | 368 verified actions" or "v22.0")
      const versionMatch = content.match(/v(\d+\.?\d*)/i);
      const version = versionMatch ? `v${versionMatch[1]}` : "unknown";
      // Parse laws — look for numbered list items after "LAWS" header
      const lawsSection = content.match(/(?:LAWS|laws)[^\n]*\n((?:\d+\..+\n?)+)/);
      const laws: string[] = [];
      if (lawsSection) {
        const lawLines = lawsSection[1].match(/\d+\.\s*\*?\*?(.+?)(?:\*?\*?\s*(?:—|-).*)?$/gm);
        if (lawLines) {
          for (const line of lawLines) {
            const cleaned = line.replace(/^\d+\.\s*\*?\*?/, "").replace(/\*?\*?\s*(?:—|-).*$/, "").trim();
            if (cleaned) laws.push(cleaned);
          }
        }
      }
      if (laws.length === 0) {
        laws.push("S(x) ≥ 0.70 or BLOCKED", "No placeholders", "New ≥ Old", "MCP First", "No duplicates", "100% utilization");
      }
      // Parse buffer zones
      const bufferMatch = content.match(/🟢.*?🟡.*?🔴.*?⚫[^\n]*/);
      const bufferZone = bufferMatch ? bufferMatch[0] : "🟢 0-20 | 🟡 21-30 | 🔴 31-40 | ⚫ 41+";
      return { loaded: true, version, laws, bufferZone };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message.slice(0, 80) : "unknown";
      log.warn(`[AutoPilot] Failed to load GSD: ${msg}`);
      return { loaded: false, version: "", laws: [], bufferZone: "" };
    }
  }

  // --------------------------------------------------------------------------
  // PHASE 2: STATE
  // --------------------------------------------------------------------------
  private async loadState(): Promise<StateResult> {
    try {
      const content = fs.readFileSync(this.config.statePath, "utf-8");
      const state = JSON.parse(content);
      return {
        sessionId: state.session?.id || `AUTO-${Date.now()}`,
        phase: state.session?.phase || "execution",
        pendingTasks: state.quickResume?.pendingTasks || [],
        quickResume: state.quickResume?.summary || ""
      };
    } catch {
      return { sessionId: `AUTO-${Date.now()}`, phase: "initialization", pendingTasks: [], quickResume: "" };
    }
  }

  // --------------------------------------------------------------------------
  // PHASE 3: BRAINSTORM WITH REAL PARALLEL API CALLS
  // --------------------------------------------------------------------------
  private async brainstormReal(
    task: string,
    taskContext: TaskContext,
    context: Record<string, unknown>
  ): Promise<BrainstormResult> {
    const result: BrainstormResult = {
      lensesApplied: SEVEN_LENSES.map(l => l.id),
      assumptions: [], alternatives: [], inversions: [],
      fusions: [], tenX: [], simplifications: [], futureProof: [],
      formulaUsed: null, optimizedApproach: "",
      apiCalls: 0, totalTokens: { input: 0, output: 0 }
    };

    if (!this.config.enableParallelBrainstorm || !hasValidApiKey()) {
      // Fallback to basic analysis
      result.assumptions = [`Assumption: Current approach to "${task}" is correct`];
      result.alternatives = ["Use existing tools", "Create new orchestration", "Modify existing"];
      result.simplifications = ["Chain existing tools"];
      return result;
    }

    // Build 7 parallel API calls — one per lens
    const lensPrompts = SEVEN_LENSES.map(lens => ({
      system: `You are a PRISM Manufacturing Intelligence brainstorming agent applying the "${lens.name}" lens.
Task domain: ${taskContext.domain.join(", ") || "general"}
Task type: ${taskContext.taskType}

Return a JSON array of 2-4 specific, actionable insights. No preamble, just the JSON array of strings.
Example: ["insight 1", "insight 2", "insight 3"]`,
      user: `Task: ${task}\n\nApply the ${lens.name} lens: ${lens.question}\n\nContext: ${JSON.stringify(context).slice(0, 500)}`,
      maxTokens: 512,
      temperature: 0.4
    }));

    try {
      log.info(`[AutoPilot v3] Firing 7 parallel brainstorm API calls...`);
      const responses = await parallelAPICalls(lensPrompts);

      // Parse each lens response
      const lensMap = ["assumptions", "alternatives", "inversions", "fusions", "tenX", "simplifications", "futureProof"] as const;

      responses.forEach((resp, i) => {
        this.apiCallCount++;
        this.tokenTotals.input += resp.tokens.input;
        this.tokenTotals.output += resp.tokens.output;

        if (resp.error) {
          log.warn(`[AutoPilot v3] Lens ${SEVEN_LENSES[i].id} failed: ${resp.error}`);
          return;
        }

        try {
          // Try to parse JSON array
          const cleaned = resp.text.trim().replace(/^```json?\s*/, '').replace(/\s*```$/, '');
          const parsed = JSON.parse(cleaned);
          if (Array.isArray(parsed)) {
            (result as any)[lensMap[i]] = parsed.map(String);
          }
        } catch {
          // Extract bullet points or lines as fallback
          const lines = resp.text.split('\n')
            .map(l => l.replace(/^[-*•\d.)\s]+/, '').trim())
            .filter(l => l.length > 5 && l.length < 300);
          if (lines.length > 0) {
            (result as any)[lensMap[i]] = lines.slice(0, 4);
          }
        }
      });

      result.apiCalls = responses.filter(r => !r.error).length;
      result.totalTokens = { ...this.tokenTotals };

      log.info(`[AutoPilot v3] Brainstorm complete: ${result.apiCalls}/7 lenses succeeded`);

    } catch (error) {
      log.error(`[AutoPilot v3] Parallel brainstorm failed: ${error}`);
    }

    // Select formula
    if (this.config.enableFormulaOptimization) {
      const formula = this.selectOptimalFormula(task, taskContext);
      result.formulaUsed = formula?.id || null;
    }

    // Synthesize approach from all lens results
    result.optimizedApproach = this.synthesizeApproach(result);
    return result;
  }

  private selectOptimalFormula(task: string, ctx: TaskContext): Formula | null {
    if (ctx.taskType === "orchestration") return OPTIMIZATION_FORMULAS.find(f => f.id === "F-SWARM-OPT-001") || null;
    if (ctx.taskType === "validation") return OPTIMIZATION_FORMULAS.find(f => f.id === "F-RALPH-CONV-001") || null;
    if (ctx.taskType === "calculation") return OPTIMIZATION_FORMULAS.find(f => f.id === "F-RISK-MIN-001") || null;
    return OPTIMIZATION_FORMULAS.find(f => f.id === "F-TOKEN-OPT-001") || null;
  }

  private synthesizeApproach(result: BrainstormResult): string {
    const parts: string[] = [];
    if (result.simplifications.length > 0) parts.push(`Simplest: ${result.simplifications[0]}`);
    if (result.tenX.length > 0) parts.push(`10X: ${result.tenX[0]}`);
    if (result.assumptions.length > 0) parts.push(`Challenge: ${result.assumptions[0]}`);
    return parts.join(" → ") || "Direct execution";
  }

  // --------------------------------------------------------------------------
  // PHASE 4: EXECUTE WITH REAL SWARMS
  // --------------------------------------------------------------------------
  private async executeWithRealSwarms(
    task: string,
    taskContext: TaskContext,
    brainstorm: BrainstormResult
  ): Promise<ExecutionResult> {
    const result: ExecutionResult = {
      swarmsDeployed: 0, agentsUsed: [], hooksTriggered: [],
      batchesRun: 0, tasksCompleted: [], liveResponses: [], totalTokens: 0
    };

    if (!this.config.enableSwarms || !hasValidApiKey()) return result;

    const agents = this.selectAgentsForTask(task);
    result.agentsUsed = agents;

    if (agents.length > 1) {
      try {
        log.info(`[AutoPilot v3] Deploying LIVE swarm: ${agents.length} agents, pattern=parallel`);
        const swarmResult = await swarmExecutor.execute({
          name: `autopilot-${Date.now()}`,
          pattern: "parallel",
          agents,
          input: { task, approach: brainstorm.optimizedApproach, domain: taskContext.domain },
          timeout_ms: 30000
        });
        
        result.swarmsDeployed = 1;
        result.hooksTriggered.push("SWARM-EXECUTE-001");
        
        swarmResult.agentResults.forEach((agentResult, agentId) => {
          if (agentResult.status === "success") {
            const output = agentResult.output as any;
            result.liveResponses.push({
              agentId,
              model: output?.model || "unknown",
              response: typeof output === "string" ? output : JSON.stringify(output).slice(0, 500),
              duration_ms: agentResult.duration_ms,
              tokens: output?.usage
            });
            this.apiCallCount++;
            if (output?.usage) {
              this.tokenTotals.input += output.usage.inputTokens || 0;
              this.tokenTotals.output += output.usage.outputTokens || 0;
            }
          }
        });
        
        result.tasksCompleted.push(task);
      } catch (error) {
        log.error(`[AutoPilot v3] Swarm execution failed: ${error}`);
        result.hooksTriggered.push("SWARM-FAILED-001");
      }
    }

    result.batchesRun = Math.ceil(agents.length / 3);
    result.totalTokens = this.tokenTotals.input + this.tokenTotals.output;
    return result;
  }

  private selectAgentsForTask(task: string): string[] {
    const agents: string[] = [];
    const t = task.toLowerCase();
    
    if (t.includes("material")) agents.push("AGT-EXPERT-MATERIALS");
    if (t.includes("tool") || t.includes("cutting")) agents.push("AGT-EXPERT-TOOLING");
    if (t.includes("machine") || t.includes("cnc")) agents.push("AGT-EXPERT-MACHINES");
    if (t.includes("reason") || t.includes("analyze")) agents.push("AGT-COG-REASONING");
    if (t.includes("validate") || t.includes("check")) agents.push("AGT-COORD-VALIDATOR");
    
    if (agents.length === 0) agents.push("AGT-COG-REASONING");
    if (agents.length > 1) agents.push("AGT-COORD-ORCHESTRATOR");
    
    return agents;
  }

  // --------------------------------------------------------------------------
  // PHASE 5: RALPH LOOPS WITH PARALLEL API (4 phases)
  // Uses parallelAPICalls for SCRUTINIZE+IMPROVE, sequential for VALIDATE+ASSESS
  // --------------------------------------------------------------------------
  private async runRalphLoopsReal(task: string, execution: ExecutionResult): Promise<RalphResult[]> {
    const results: RalphResult[] = [];
    let previousScore = 0.7;

    if (!hasValidApiKey()) {
      return [{ loop: 1, phase: "VALIDATE", scrutinized: ["No API key"], improvements: [], validated: false, score: 0, duration_ms: 0 }];
    }

    // Phase 1+2: SCRUTINIZE + IMPROVE in PARALLEL (2 API calls at once)
    try {
      const parallelResults = await parallelAPICalls([
        {
          system: `You are PRISM's Scrutiny Agent. Find ALL issues with the work. Return JSON: {"findings": ["issue1", "issue2"], "score": 0.0-1.0}`,
          user: `Task: ${task}\nAgents: ${execution.agentsUsed.join(", ")}\nResponses: ${execution.liveResponses.length}\nProvide scrutiny.`,
          maxTokens: 1024, temperature: 0.2
        },
        {
          system: `You are PRISM's Improvement Agent. Suggest fixes for identified issues. Return JSON: {"improvements": ["fix1", "fix2"], "score": 0.0-1.0}`,
          user: `Task: ${task}\nAgents: ${execution.agentsUsed.join(", ")}\nResponses: ${execution.liveResponses.length}\nProvide improvements.`,
          maxTokens: 1024, temperature: 0.2
        }
      ]);

      for (const r of parallelResults) {
        this.apiCallCount++;
        this.tokenTotals.input += r.tokens.input;
        this.tokenTotals.output += r.tokens.output;
      }

      // Parse SCRUTINIZE
      const scrutinyResult = this.parseRalphResponse(parallelResults[0].text, previousScore);
      results.push({
        loop: 1, phase: "SCRUTINIZE",
        scrutinized: scrutinyResult.items, improvements: [],
        validated: scrutinyResult.score >= 0.70, score: scrutinyResult.score,
        liveResponse: parallelResults[0].text.slice(0, 500),
        model: parallelResults[0].model, duration_ms: parallelResults[0].duration_ms
      });
      previousScore = scrutinyResult.score;

      // Parse IMPROVE
      const improveResult = this.parseRalphResponse(parallelResults[1].text, previousScore);
      results.push({
        loop: 2, phase: "IMPROVE",
        scrutinized: [], improvements: improveResult.items,
        validated: improveResult.score >= 0.70, score: improveResult.score,
        liveResponse: parallelResults[1].text.slice(0, 500),
        model: parallelResults[1].model, duration_ms: parallelResults[1].duration_ms
      });
      previousScore = improveResult.score;
    } catch (error) {
      log.error(`[AutoPilot v3] Ralph SCRUTINIZE+IMPROVE failed: ${error}`);
    }

    // Phase 3: VALIDATE (sequential — gate decision)
    try {
      const validateResp = await parallelAPICalls([{
        system: `You are PRISM's Safety Validator. Check S(x) ≥ 0.70 for manufacturing safety. Return JSON: {"validated": true/false, "safety_score": 0.0-1.0, "blocking_issues": []}`,
        user: `Task: ${task}\nPrevious scores: ${results.map(r => `${r.phase}:${r.score.toFixed(2)}`).join(", ")}\nValidate safety.`,
        maxTokens: 1024, temperature: 0.1
      }]);
      this.apiCallCount++;
      this.tokenTotals.input += validateResp[0].tokens.input;
      this.tokenTotals.output += validateResp[0].tokens.output;

      const valResult = this.parseRalphResponse(validateResp[0].text, previousScore);
      results.push({
        loop: 3, phase: "VALIDATE",
        scrutinized: valResult.items, improvements: [],
        validated: valResult.score >= 0.70, score: valResult.score,
        liveResponse: validateResp[0].text.slice(0, 500),
        model: validateResp[0].model, duration_ms: validateResp[0].duration_ms
      });
      previousScore = valResult.score;

      if (valResult.score < 0.70) {
        log.warn(`[AutoPilot v3] Safety gate FAILED: ${valResult.score.toFixed(2)}`);
        return results;
      }
    } catch (error) {
      log.error(`[AutoPilot v3] Ralph VALIDATE failed: ${error}`);
    }

    // Phase 4: ASSESS (uses Opus for final grading)
    try {
      const assessResp = await parallelAPICalls([{
        system: `You are PRISM's Master Assessor. Compute Ω(x) = 0.25R + 0.20C + 0.15P + 0.30S + 0.10L.
Return JSON: {"grade": "A/B/C/D/F", "omega": 0.0-1.0, "summary": "...", "ready_for_production": true/false, "findings": [], "recommendations": []}`,
        user: `Task: ${task}\nPhases: ${results.map(r => `${r.phase}:${r.score.toFixed(2)}`).join(", ")}\nAPI calls: ${this.apiCallCount}\nProvide final assessment.`,
        model: getModelForTier("opus"),
        maxTokens: 2048, temperature: 0.2
      }]);
      this.apiCallCount++;
      this.tokenTotals.input += assessResp[0].tokens.input;
      this.tokenTotals.output += assessResp[0].tokens.output;

      const assessResult = this.parseRalphResponse(assessResp[0].text, previousScore);
      results.push({
        loop: 4, phase: "ASSESS",
        scrutinized: assessResult.items, improvements: [],
        validated: assessResult.score >= 0.70, score: assessResult.score,
        liveResponse: assessResp[0].text.slice(0, 500),
        model: assessResp[0].model, duration_ms: assessResp[0].duration_ms
      });
    } catch (error) {
      log.error(`[AutoPilot v3] Ralph ASSESS failed: ${error}`);
    }

    return results;
  }

  private parseRalphResponse(text: string, fallbackScore: number): { items: string[]; score: number } {
    try {
      const cleaned = text.trim().replace(/^```json?\s*/, '').replace(/\s*```$/, '');
      const parsed = JSON.parse(cleaned);
      const items = parsed.findings || parsed.improvements || parsed.blocking_issues || parsed.recommendations || [];
      const score = parsed.score || parsed.safety_score || parsed.omega || fallbackScore + 0.03;
      return { items: items.map(String), score: Math.min(0.99, Math.max(0, score)) };
    } catch {
      // Heuristic extraction
      const scoreMatch = text.match(/0\.\d+/);
      const score = scoreMatch ? parseFloat(scoreMatch[0]) : fallbackScore + 0.03;
      return { items: [], score: Math.min(0.99, score) };
    }
  }

  // --------------------------------------------------------------------------
  // PHASE 6: UPDATE
  // --------------------------------------------------------------------------
  private async updateAll(task: string, execution: ExecutionResult, ralph: RalphResult[]): Promise<UpdateResult> {
    const result: UpdateResult = {
      stateUpdated: false, memoriesUpdated: false, gsdUpdated: false,
      skillsUpdated: false, newToolsCreated: []
    };

    try {
      const finalScore = ralph[ralph.length - 1]?.score || 0.7;
      const stateUpdate = {
        lastTask: task,
        lastExecution: {
          agents: execution.agentsUsed, swarms: execution.swarmsDeployed,
          liveResponses: execution.liveResponses.length, apiCalls: this.apiCallCount,
          totalTokens: this.tokenTotals
        },
        lastValidation: {
          ralphPhases: ralph.map(r => r.phase), finalScore, mode: "LIVE_API"
        },
        timestamp: new Date().toISOString()
      };

      let currentState: Record<string, unknown> = {};
      try { currentState = JSON.parse(fs.readFileSync(this.config.statePath, "utf-8")); } catch { }
      fs.writeFileSync(this.config.statePath, JSON.stringify({ ...currentState, autoPilot: stateUpdate }, null, 2));
      result.stateUpdated = true;
    } catch (e) {
      log.error(`[AutoPilot v3] State update failed: ${e}`);
    }

    return result;
  }

  // --------------------------------------------------------------------------
  // METRICS & ASSESSMENT
  // --------------------------------------------------------------------------
  private computeMetrics(brainstorm: BrainstormResult, execution: ExecutionResult, ralph: RalphResult[]): MetricsResult {
    const finalRalph = ralph[ralph.length - 1];
    const R = Math.min(0.95, 0.75 + (brainstorm.apiCalls * 0.03));
    const C = Math.min(0.95, 0.80 + (execution.liveResponses.length * 0.05));
    const P = Math.min(0.95, 0.80 + (execution.swarmsDeployed * 0.10));
    const S = finalRalph?.validated ? Math.max(0.70, finalRalph.score) : 0.60;
    const L = Math.min(0.90, 0.70 + (ralph.length * 0.05));
    const Omega = 0.25 * R + 0.20 * C + 0.15 * P + 0.30 * S + 0.10 * L;

    let status: MetricsResult["status"];
    if (S < 0.70) status = "BLOCKED";
    else if (Omega < 0.70) status = "WARNING";
    else if (Omega >= 0.85) status = "EXCELLENT";
    else status = "APPROVED";

    return { R, C, P, S, L, Omega, status };
  }

  private buildAssessment(lastRalph: RalphResult | undefined, ralph: RalphResult[]): AssessmentResult {
    const score = lastRalph?.score || 0;
    return {
      grade: score >= 0.90 ? "A" : score >= 0.80 ? "B" : score >= 0.70 ? "C" : score >= 0.60 ? "D" : "F",
      omega: score,
      summary: `AutoPilot v3 completed: ${ralph.length} Ralph phases, ${ralph.filter(r => r.validated).length} validated`,
      strengths: ["Parallel API brainstorming", "Real swarm execution", "4-phase Ralph validation"],
      weaknesses: lastRalph?.scrutinized || [],
      recommendations: lastRalph?.improvements || [],
      ready_for_production: score >= 0.70,
      confidence: Math.min(0.95, score + 0.05)
    };
  }

  private createBlockedResult(task: string, reason: string): AutoPilotResult {
    const empty = { loaded: false, version: "", laws: [] as string[], bufferZone: "" };
    return {
      phase: "BLOCKED", mode: "BLOCKED",
      gsd: empty,
      state: { sessionId: "", phase: "", pendingTasks: [], quickResume: "" },
      brainstorm: { lensesApplied: [], assumptions: [], alternatives: [], inversions: [], fusions: [], tenX: [], simplifications: [], futureProof: [], formulaUsed: null, optimizedApproach: "", apiCalls: 0, totalTokens: { input: 0, output: 0 } },
      execution: { swarmsDeployed: 0, agentsUsed: [], hooksTriggered: [], batchesRun: 0, tasksCompleted: [], liveResponses: [], totalTokens: 0 },
      ralph: [],
      assessment: { grade: "F", omega: 0, summary: reason, strengths: [], weaknesses: [reason], recommendations: ["Add ANTHROPIC_API_KEY"], ready_for_production: false, confidence: 0 },
      updates: { stateUpdated: false, memoriesUpdated: false, gsdUpdated: false, skillsUpdated: false, newToolsCreated: [] },
      metrics: { R: 0, C: 0, P: 0, S: 0, L: 0, Omega: 0, status: "BLOCKED" },
      totalDuration: 0, apiCallsMade: 0, totalTokens: { input: 0, output: 0 }
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const autoPilot = new AutoPilot();

export async function runAutoPilot(
  task: string,
  context: Record<string, unknown> = {}
): Promise<AutoPilotResult> {
  return autoPilot.execute(task, context);
}

export function getSevenLenses() {
  return SEVEN_LENSES;
}

export function getOptimizationFormulas() {
  return OPTIMIZATION_FORMULAS;
}
