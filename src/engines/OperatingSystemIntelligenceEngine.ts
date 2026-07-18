import { apiConfig, hasValidApiKey } from "../config/api-config.js";
import { agentExecutor } from "./AgentExecutor.js";
import { aimlEngine } from "./AIMLEngine.js";
import { apprenticeEngine } from "./ApprenticeEngine.js";
import { automationChainEngine, type TaskClass } from "./AutomationChainEngine.js";
import { agentRegistry } from "../registries/AgentRegistry.js";

type IntelligenceTone = "neutral" | "good" | "watch" | "critical";

type WorkspaceMetric = {
  id: string;
  label: string;
  value: string;
  detail: string;
  tone: IntelligenceTone;
};

type CliSurface = {
  id: string;
  command: string;
  label: string;
  detail: string;
  example: string;
  route: string;
  group: "reasoning" | "physics" | "automation" | "execution";
  keywords: string[];
};

type WorkspaceLayer = {
  id: string;
  label: string;
  detail: string;
  status: string;
  tone: IntelligenceTone;
  signals: string[];
};

type WorkspaceModelCard = {
  id: string;
  name: string;
  domain: string;
  status: string;
  accuracyLabel: string;
  samplesLabel: string;
  learningMode: string;
  reasoningNote: string;
};

type WorkspaceChainCard = {
  id: string;
  taskClass: TaskClass;
  tier: string;
  tokenBudgetLabel: string;
  failBehavior: string;
  detail: string;
  emphasis: string;
};

type WorkspaceAgentSummary = {
  activeAgents: string;
  queueDepth: string;
  throughput: string;
  modelAccess: string;
  detail: string;
  alerts: string[];
};

type PromptModelMatch = {
  id: string;
  name: string;
  domain: string;
  why: string;
};

type PromptAgentCandidate = {
  id: string;
  name: string;
  category: string;
  reason: string;
};

type PromptApprenticeExplanation = {
  parameter: string;
  value: string;
  explanation: string;
  depth: string;
  factors: Array<{
    factor: string;
    impact: string;
    physics: string;
  }>;
};

type SuggestedSurface = {
  label: string;
  route: string;
  actionLabel: string;
  cliCommand: string;
};

export type OperatingSystemIntelligenceWorkspace = {
  summary: string;
  mission: string;
  metrics: WorkspaceMetric[];
  promptStarters: string[];
  cliSurfaces: CliSurface[];
  reasoningLayers: WorkspaceLayer[];
  modelCards: WorkspaceModelCard[];
  chainCards: WorkspaceChainCard[];
  agentSummary: WorkspaceAgentSummary;
};

export type OperatingSystemPromptAnalysis = {
  prompt: string;
  aiIntent: {
    intent: string;
    confidence: number;
    suggestedAction?: string;
    entities: Record<string, string | number>;
    alternatives: Array<{ intent: string; confidence: number }>;
  };
  automation: {
    taskClass: TaskClass;
    confidence: number;
    chainId: string;
    tokenBudget: number;
    matchedKeywords: string[];
    chainSteps: string[];
  };
  modelMatches: PromptModelMatch[];
  agentCandidates: PromptAgentCandidate[];
  apprentice?: PromptApprenticeExplanation;
  suggestedSurface: SuggestedSurface;
  reasoningSummary: string;
  nextActions: string[];
};

export type OperatingSystemShopFloorInsightInput = {
  employeeId?: string;
  employeeName?: string;
  department?: string;
  role?: string;
  shiftStatus?: string;
  activeJobId?: string;
  activeOperation?: string;
  trackedJobId?: string;
  trackedJobName?: string;
  material?: string;
  liveAttendanceCount: number;
  runningTaskCount: number;
  completedParts: number;
  extraParts: number;
  hotJobCount: number;
  cycleVariancePct?: number;
  handoffSummary?: string;
  roiSignals: string[];
};

export type OperatingSystemShopFloorInsight = {
  headline: string;
  tone: IntelligenceTone;
  confidence: number;
  aiIntent: OperatingSystemPromptAnalysis["aiIntent"];
  automation: OperatingSystemPromptAnalysis["automation"];
  modelMatches: PromptModelMatch[];
  agentCandidates: PromptAgentCandidate[];
  apprentice?: PromptApprenticeExplanation;
  suggestedSurface: SuggestedSurface;
  reasoningSummary: string;
  liveSignals: string[];
  riskFlags: string[];
  nextActions: string[];
};

const CLI_SURFACES: CliSurface[] = [
  {
    id: "sf",
    command: "sf",
    label: "Speed and Feed",
    detail: "Direct physics-backed cutting parameter calculation with optimization goals.",
    example: "prism sf --material titanium_gr5 --tool-diameter 12 --flutes 4 --operation roughing",
    route: "/calculator",
    group: "physics",
    keywords: ["speed", "feed", "physics", "roughing", "cutting"],
  },
  {
    id: "verify",
    command: "verify",
    label: "Physics Verifier",
    detail: "Cross-checks the machining stack against canonical force, wear, and surface models.",
    example: "prism verify --material steel --tool-diameter 10 --flutes 4 --spindle-rpm 6200 --feed-rate 900",
    route: "/what-if",
    group: "physics",
    keywords: ["verify", "consistency", "safety", "force", "surface finish"],
  },
  {
    id: "what-if",
    command: "what-if",
    label: "What-If Delta",
    detail: "Runs scenario deltas across PRISM's unified physics and optimization layers.",
    example: "prism what-if --from aluminum_6061 --material titanium_gr5 --tool-diameter 12 --flutes 4",
    route: "/what-if",
    group: "reasoning",
    keywords: ["compare", "delta", "scenario", "reasoning", "tradeoff"],
  },
  {
    id: "program",
    command: "program",
    label: "Program Generator",
    detail: "Builds a full CNC program from part definition, machine context, and optimization target.",
    example: "prism program --part part.json --controller fanuc --machine \"Haas VF-2\" --optimize balanced",
    route: "/pipeline",
    group: "execution",
    keywords: ["program", "g-code", "post", "pipeline", "controller"],
  },
  {
    id: "post",
    command: "post",
    label: "Post Pipeline",
    detail: "Runs controller-aware post processing with safety-aware stage analytics.",
    example: "prism post --gcode program.nc --controller fanuc --aggressiveness 0.45",
    route: "/ppg",
    group: "execution",
    keywords: ["post", "controller", "optimize", "g-code", "dialect"],
  },
  {
    id: "sim",
    command: "sim",
    label: "Simulation",
    detail: "Simulates G-code with physics traces for force, wear, and thermal posture.",
    example: "prism sim --gcode program.nc --machine \"Haas VF-2\" --material aluminum_6061",
    route: "/viewer",
    group: "execution",
    keywords: ["simulate", "g-code", "wear", "thermal", "force"],
  },
  {
    id: "classify",
    command: "classify",
    label: "Chain Classifier",
    detail: "Routes a natural-language request into PRISM's automation control plane.",
    example: "prism classify \"Build the roadmap shell route and validate the dependency gate\"",
    route: "/intelligence",
    group: "automation",
    keywords: ["classify", "router", "automation", "chain", "roadmap"],
  },
  {
    id: "chains",
    command: "chains",
    label: "Automation Chains",
    detail: "Lists the chain tiers, budgets, and fail behavior behind PRISM routing.",
    example: "prism chains",
    route: "/intelligence",
    group: "automation",
    keywords: ["chains", "routing", "budget", "fail behavior", "automation"],
  },
  {
    id: "calc",
    command: "calc",
    label: "Universal Tool Router",
    detail: "Calls any routed calculation surface directly through the dispatcher stack.",
    example: "prism calc kienzle_force --kc1_1 1500 --mc 0.25 --ap 3 --fz 0.1",
    route: "/calculator",
    group: "physics",
    keywords: ["dispatcher", "calc", "tool router", "physics", "engine"],
  },
  {
    id: "quote",
    command: "quote",
    label: "Cost Estimator",
    detail: "Produces physics-backed cost estimates for quoting and release planning.",
    example: "prism quote --part drawing.json --quantity 100 --material aluminum_6061 --complexity complex",
    route: "/quote-builder",
    group: "reasoning",
    keywords: ["quote", "estimate", "cost", "erp", "pricing"],
  },
  {
    id: "pipe",
    command: "pipe",
    label: "Composable Pipeline",
    detail: "Feeds output from one engine into the next for repeatable multi-step execution.",
    example: "prism pipe --steps '[{\"command\":\"sf\"},{\"command\":\"post\"}]'",
    route: "/pipeline",
    group: "execution",
    keywords: ["pipe", "pipeline", "batch", "compose", "automation"],
  },
  {
    id: "repl",
    command: "repl",
    label: "Interactive REPL",
    detail: "Opens a CLI workspace for fast iterative reasoning with reusable previous output.",
    example: "prism repl",
    route: "/intelligence",
    group: "reasoning",
    keywords: ["repl", "interactive", "cli", "reasoning", "loop"],
  },
];

const DOMAIN_REASONING_NOTES: Record<string, string> = {
  speed_feed: "Feeds the calculator, what-if, and validation surfaces with direct cutting recommendations.",
  tool_life: "Tracks heat, wear, and replacement posture before the job degrades.",
  surface_finish: "Keeps finish predictions connected to geometry, chip load, and stability.",
  force_prediction: "Anchors spindle load, deflection, and process safety estimates.",
  chatter: "Flags vibration-driven instability before it turns into scrap or crash risk.",
  wear: "Supports long-run monitoring and adaptive intervention decisions.",
  quality: "Rolls multiple signals into part-quality posture instead of a single metric.",
  intent: "Translates operator language into PRISM routes, chains, and actions.",
};

const INTENT_TO_MODELS: Record<string, string[]> = {
  calculate_speed_feed: ["speed_feed_regressor", "force_predictor", "tool_life_predictor"],
  optimize_parameters: ["speed_feed_regressor", "force_predictor", "wear_monitor"],
  diagnose_problem: ["chatter_detector", "wear_monitor", "quality_ensemble"],
  check_safety: ["chatter_detector", "force_predictor", "quality_ensemble"],
  estimate_cost: ["quality_ensemble", "intent_classifier"],
  plan_process: ["intent_classifier", "quality_ensemble"],
  explain_concept: ["intent_classifier", "surface_finish_classifier"],
  compare_options: ["speed_feed_regressor", "quality_ensemble", "tool_life_predictor"],
  report_generate: ["quality_ensemble", "intent_classifier"],
  generate_gcode: ["intent_classifier", "force_predictor"],
  schedule_job: ["intent_classifier", "quality_ensemble"],
  lookup_alarm: ["intent_classifier", "chatter_detector"],
  general_question: ["intent_classifier"],
};

const TASK_CLASS_TO_AGENTS: Record<TaskClass, Array<{ id: string; reason: string }>> = {
  backend: [
    { id: "AGT-COORD-ORCHESTRATOR", reason: "Coordinates the multi-surface implementation plan." },
    { id: "AGT-COG-REASONING", reason: "Breaks down cross-cutting code changes and sequencing." },
    { id: "AGT-COORD-VALIDATOR", reason: "Checks that the result stays safe and internally consistent." },
  ],
  web: [
    { id: "AGT-COORD-ORCHESTRATOR", reason: "Routes the UI slice across shell surfaces." },
    { id: "AGT-COG-REASONING", reason: "Keeps the interaction model coherent across app flows." },
    { id: "AGT-COORD-VALIDATOR", reason: "Validates the surface before it lands in the shell." },
  ],
  cad_python: [
    { id: "AGT-COORD-ORCHESTRATOR", reason: "Aligns geometry work with the rest of the pipeline." },
    { id: "AGT-COG-REASONING", reason: "Interprets geometric edge cases and fallback posture." },
  ],
  roadmap: [
    { id: "AGT-COORD-ORCHESTRATOR", reason: "Owns sequencing, dependencies, and multi-task progression." },
    { id: "AGT-COG-REASONING", reason: "Turns milestone language into concrete execution slices." },
    { id: "AGT-COG-LEARNING", reason: "Captures lessons and convergence signals between passes." },
  ],
  audit: [
    { id: "AGT-COORD-VALIDATOR", reason: "Leads the scrutiny and failure-detection posture." },
    { id: "AGT-COG-REASONING", reason: "Synthesizes issues into clear next actions." },
    { id: "AGT-COORD-ORCHESTRATOR", reason: "Spreads audit work across the right validation surfaces." },
  ],
  speed_feed: [
    { id: "AGT-TASK-SPEED-FEED", reason: "Owns direct cutting-parameter reasoning." },
    { id: "AGT-EXPERT-MATERIALS", reason: "Keeps material behavior grounded in metallurgy." },
    { id: "AGT-EXPERT-TOOLING", reason: "Connects tool geometry and wear posture to the result." },
  ],
  post_process: [
    { id: "AGT-COORD-ORCHESTRATOR", reason: "Routes the controller-specific post pipeline." },
    { id: "AGT-COG-REASONING", reason: "Explains dialect tradeoffs and safety posture." },
    { id: "AGT-COORD-VALIDATOR", reason: "Checks the final output before execution." },
  ],
  erp: [
    { id: "AGT-COORD-ORCHESTRATOR", reason: "Moves ERP requests into the right quote or planning lane." },
    { id: "AGT-EXPERT-MACHINES", reason: "Brings machine capability into cost and release choices." },
    { id: "AGT-COG-REASONING", reason: "Balances margin, risk, and sequencing." },
  ],
  general: [
    { id: "AGT-COORD-ORCHESTRATOR", reason: "Routes the request into the best PRISM surface." },
    { id: "AGT-COG-REASONING", reason: "Synthesizes ambiguous prompts into a useful plan." },
  ],
};

const TASK_CLASS_TO_SURFACE: Record<TaskClass, SuggestedSurface> = {
  backend: {
    label: "PRISM Intelligence",
    route: "/intelligence",
    actionLabel: "Inspect the reasoning console",
    cliCommand: "prism classify \"describe the backend change\"",
  },
  web: {
    label: "PRISM Intelligence",
    route: "/intelligence",
    actionLabel: "Review the shell reasoning path",
    cliCommand: "prism classify \"describe the frontend change\"",
  },
  cad_python: {
    label: "Pipeline",
    route: "/pipeline",
    actionLabel: "Open the execution pipeline",
    cliCommand: "prism pipe --steps '[{\"command\":\"program\"}]'",
  },
  roadmap: {
    label: "PRISM Intelligence",
    route: "/intelligence",
    actionLabel: "Open roadmap reasoning",
    cliCommand: "prism classify \"resume the roadmap work\"",
  },
  audit: {
    label: "Reports",
    route: "/reports",
    actionLabel: "Open the validation surface",
    cliCommand: "prism benchmark --layer 1",
  },
  speed_feed: {
    label: "Calculator Studio",
    route: "/calculator",
    actionLabel: "Open the calculator surface",
    cliCommand: "prism sf --material steel --tool-diameter 12 --flutes 4 --operation roughing",
  },
  post_process: {
    label: "Post Processor Generator",
    route: "/ppg",
    actionLabel: "Open the post-processing surface",
    cliCommand: "prism post --gcode program.nc --controller fanuc",
  },
  erp: {
    label: "Quote Builder",
    route: "/quote-builder",
    actionLabel: "Open the cost and planning lane",
    cliCommand: "prism quote --part drawing.json --quantity 50",
  },
  general: {
    label: "PRISM Intelligence",
    route: "/intelligence",
    actionLabel: "Stay in the intelligence console",
    cliCommand: "prism repl",
  },
};

function formatPercent(value: number | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "Not yet calibrated";
  }

  return `${Math.round(value * 100)}% accuracy`;
}

function formatInteger(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatTokenBudget(value: number) {
  return `${formatInteger(value)} tokens`;
}

function apprenticeParameterForIntent(intent: string) {
  switch (intent) {
    case "calculate_speed_feed":
    case "optimize_parameters":
      return "cutting_speed";
    case "check_safety":
    case "diagnose_problem":
      return "feed";
    case "setup_machine":
      return "coolant";
    default:
      return "cutting_speed";
  }
}

function buildModelMatches(intent: string) {
  const preferredIds = INTENT_TO_MODELS[intent] ?? INTENT_TO_MODELS.general_question;
  return preferredIds
    .map((id) => aimlEngine.getModel(id))
    .filter((model): model is NonNullable<ReturnType<typeof aimlEngine.getModel>> => model !== null)
    .map((model) => ({
      id: model.id,
      name: model.name,
      domain: model.domain,
      why: DOMAIN_REASONING_NOTES[model.domain] ?? "Supports the current reasoning path.",
    }));
}

function buildAgentCandidates(taskClass: TaskClass) {
  return TASK_CLASS_TO_AGENTS[taskClass]
    .map((candidate) => agentRegistry.get(candidate.id))
    .filter((agent): agent is NonNullable<ReturnType<typeof agentRegistry.get>> => Boolean(agent))
    .map((agent) => ({
      id: agent.agent_id,
      name: agent.name,
      category: agent.category,
      reason: TASK_CLASS_TO_AGENTS[taskClass].find((candidate) => candidate.id === agent.agent_id)?.reason
        ?? "Supports this workflow.",
    }));
}

function buildReasoningSummary(args: {
  intent: string;
  intentConfidence: number;
  chainId: string;
  surface: SuggestedSurface;
}) {
  return `PRISM reads this prompt as "${args.intent}" (${Math.round(args.intentConfidence * 100)}% confidence), routes it through ${args.chainId}, and recommends continuing in ${args.surface.label}.`;
}

function normalizePrompt(prompt: string) {
  return prompt.trim().replace(/\s+/g, " ");
}

function buildShopFloorPrompt(input: OperatingSystemShopFloorInsightInput) {
  const sections = [
    `Analyze this shop-floor execution context for ${input.employeeName ?? "the current operator"}.`,
    `Department: ${input.department ?? "unknown"}. Role: ${input.role ?? "operator"}. Shift status: ${input.shiftStatus ?? "idle"}.`,
    input.trackedJobId
      ? `Tracked traveler packet: ${input.trackedJobId}${input.trackedJobName ? ` (${input.trackedJobName})` : ""}.`
      : "No traveler packet is active yet.",
    input.activeJobId
      ? `Active job timer: ${input.activeJobId}${input.activeOperation ? ` on ${input.activeOperation}` : ""}.`
      : "No active job timer is running.",
    `Live attendance count: ${input.liveAttendanceCount}. Running tasks: ${input.runningTaskCount}. Hot jobs: ${input.hotJobCount}.`,
    `Completed parts: ${input.completedParts}. Extra parts: ${input.extraParts}.`,
    typeof input.cycleVariancePct === "number"
      ? `Cycle variance versus standard: ${input.cycleVariancePct.toFixed(1)} percent.`
      : "Cycle variance is not available yet.",
    input.handoffSummary
      ? `Shift handoff summary: ${input.handoffSummary}.`
      : "No shift handoff summary is available.",
    input.roiSignals.length > 0
      ? `ROI and learning signals: ${input.roiSignals.join(" ")}`
      : "No ROI signals are staged yet.",
    "Recommend the safest next operator action, the right PRISM surface, and the reasoning chain that should stay visible in the app.",
  ];

  return normalizePrompt(sections.join(" "));
}

function buildShopFloorRiskFlags(input: OperatingSystemShopFloorInsightInput) {
  const flags: string[] = [];

  if (input.hotJobCount > 0) {
    flags.push(`${input.hotJobCount} hot job escalation${input.hotJobCount > 1 ? "s are" : " is"} active on the floor.`);
  }

  if (typeof input.cycleVariancePct === "number" && Math.abs(input.cycleVariancePct) >= 10) {
    flags.push(`Cycle variance is ${input.cycleVariancePct >= 0 ? "over" : "under"} standard by ${Math.abs(input.cycleVariancePct).toFixed(0)}%, which should feed back into quoting and dispatch.`);
  }

  if (input.extraParts > 0) {
    flags.push(`${input.extraParts} extra part${input.extraParts === 1 ? "" : "s"} were logged and should be reviewed for inventory and lot-sizing impact.`);
  }

  if (input.handoffSummary) {
    flags.push("A prior-shift handoff is still shaping the current traveler posture.");
  }

  if (input.trackedJobId && input.runningTaskCount === 0) {
    flags.push("A traveler packet is staged but no task is actively running, which can hide queue drift.");
  }

  if ((input.shiftStatus ?? "").toLowerCase() !== "clocked_in" && input.activeJobId) {
    flags.push("The operator has an active job context without a confirmed clocked-in shift state.");
  }

  return flags;
}

function buildShopFloorLiveSignals(input: OperatingSystemShopFloorInsightInput) {
  const signals = [
    `${input.liveAttendanceCount} operator${input.liveAttendanceCount === 1 ? "" : "s"} currently appear live on the floor.`,
    input.runningTaskCount > 0
      ? `${input.runningTaskCount} task${input.runningTaskCount === 1 ? "" : "s"} are actively running for the selected packet.`
      : "No floor task is actively running right now.",
    input.completedParts > 0
      ? `${input.completedParts} part${input.completedParts === 1 ? "" : "s"} have been logged so far.`
      : "No completed parts have been captured yet.",
  ];

  if (typeof input.cycleVariancePct === "number") {
    signals.push(`Cycle variance signal is ${input.cycleVariancePct >= 0 ? "+" : ""}${input.cycleVariancePct.toFixed(1)}%.`);
  }

  if (input.roiSignals.length > 0) {
    signals.push(input.roiSignals[0]);
  }

  return signals;
}

function buildShopFloorSurface(
  input: OperatingSystemShopFloorInsightInput,
  fallback: SuggestedSurface,
): SuggestedSurface {
  if (input.handoffSummary && /quality|inspection|hold|ncr/i.test(input.handoffSummary)) {
    return {
      label: "Quality Management",
      route: "/quality",
      actionLabel: "Open the blocking quality lane",
      cliCommand: "prism classify \"review the quality hold before resuming the traveler\"",
    };
  }

  if (input.hotJobCount > 0) {
    return {
      label: "Jobs Desk",
      route: "/jobs",
      actionLabel: "Open the hot-job execution desk",
      cliCommand: "prism classify \"reprioritize the hot job on the shop floor\"",
    };
  }

  if (typeof input.cycleVariancePct === "number" && Math.abs(input.cycleVariancePct) >= 8) {
    return {
      label: "Quote Builder",
      route: "/quote-builder",
      actionLabel: "Review quote and labor feedback",
      cliCommand: "prism classify \"feed the new cycle variance back into quoting\"",
    };
  }

  if (input.trackedJobId || input.activeJobId) {
    return {
      label: "Shop Floor Clock",
      route: "/shop-clock",
      actionLabel: "Stay in the floor execution desk",
      cliCommand: "prism classify \"continue the active shop floor execution flow\"",
    };
  }

  return fallback;
}

function buildShopFloorHeadline(input: OperatingSystemShopFloorInsightInput, tone: IntelligenceTone) {
  if (tone === "critical" && input.hotJobCount > 0) {
    return "Shop-floor execution is carrying a hot-job escalation and should stay tightly routed.";
  }

  if (typeof input.cycleVariancePct === "number" && Math.abs(input.cycleVariancePct) >= 10) {
    return "Cycle variance is now large enough to affect planning, quote trust, and floor sequencing.";
  }

  if (input.handoffSummary) {
    return "Prior-shift handoff signal is still active, so the operator should execute with explicit context.";
  }

  if (input.runningTaskCount > 0) {
    return "The floor is in active execution mode and PRISM can keep the next action grounded in live signals.";
  }

  return "The floor is staged but needs a clearer execution signal before work accelerates.";
}

export class OperatingSystemIntelligenceEngine {
  async buildWorkspace(): Promise<OperatingSystemIntelligenceWorkspace> {
    await agentRegistry.load().catch(() => undefined);

    const models = aimlEngine.listModels();
    const performance = aimlEngine.getModelPerformance();
    const chains = automationChainEngine.listChains();
    const queueStats = agentExecutor.getQueueStats();
    const agentStats = agentRegistry.getStats();
    const liveReasoning = hasValidApiKey();

    return {
      summary:
        "The intelligence console turns PRISM's internal CLI, model registry, automation chains, and agent executor into a first-class shell surface.",
      mission:
        "Build the app around native reasoning: classify work, explain the route, surface the right CLI command, and keep model- and chain-level posture visible inside the shell.",
      metrics: [
        {
          id: "models",
          label: "Ready models",
          value: `${performance.ready}/${performance.total_models}`,
          detail: `${formatInteger(performance.total_training_samples)} total samples across the internal model registry.`,
          tone: performance.ready === performance.total_models ? "good" : "watch",
        },
        {
          id: "chains",
          label: "Automation chains",
          value: `${chains.length}`,
          detail: "Classification, roadmap, physics, ERP, and post-processing chains are now surfaced directly in-app.",
          tone: "good",
        },
        {
          id: "cli",
          label: "CLI surfaces",
          value: `${CLI_SURFACES.length}`,
          detail: "Direct command-line entry points mirrored from the internal PRISM CLI.",
          tone: "good",
        },
        {
          id: "agents",
          label: "Active agents",
          value: `${agentStats.activeEnabled}`,
          detail: `${agentStats.totalCapabilities} registered capabilities available for orchestration.`,
          tone: agentStats.activeEnabled > 0 ? "good" : "watch",
        },
        {
          id: "queue",
          label: "Execution queue",
          value: `${queueStats.pending + queueStats.running}`,
          detail: `${queueStats.throughput_per_min}/min recent throughput with ${queueStats.completed} completed tasks.`,
          tone: queueStats.failed > 0 ? "watch" : "neutral",
        },
        {
          id: "reasoning",
          label: "Live model access",
          value: liveReasoning ? "Enabled" : "Guarded",
          detail: liveReasoning
            ? `Anthropic execution is available through ${apiConfig.sonnetModel}.`
            : "No Anthropic API key is configured, so the app stays in explain-and-route mode.",
          tone: liveReasoning ? "good" : "watch",
        },
      ],
      promptStarters: [
        "Optimize a titanium roughing pass for a 12 mm carbide endmill.",
        "Classify this roadmap request and show the right automation chain.",
        "Explain why chatter is happening on a long-reach finish pass in stainless.",
        "Which PRISM surface should I use for a controller-specific post issue?",
      ],
      cliSurfaces: CLI_SURFACES,
      reasoningLayers: [
        {
          id: "intent",
          label: "Intent inference",
          detail: "AIMLEngine converts operator language into PRISM actions, extracted entities, and suggested next moves.",
          status: `${performance.total_models} registered models`,
          tone: "good",
          signals: [
            "Intent classifier exposed through the shell.",
            "Entity extraction surfaces material, spindle, and feed clues.",
            "Suggested action stays visible before the user leaves the page.",
          ],
        },
        {
          id: "chains",
          label: "Chain routing",
          detail: "AutomationChainEngine maps the same prompt into a concrete task class, token budget, and fail posture.",
          status: `${chains.length} routing chains`,
          tone: "good",
          signals: [
            "Roadmap, audit, speed-feed, ERP, and post-processing classes are covered.",
            "Token budgets and fail behavior stay visible instead of hidden in the backend.",
            "The app now explains why a request lands in a specific chain.",
          ],
        },
        {
          id: "agents",
          label: "Agent execution",
          detail: "AgentExecutor provides queue, throughput, and real-execution posture for deeper PRISM workflows.",
          status: liveReasoning ? "Live execution available" : "Explain-only posture",
          tone: liveReasoning ? "good" : "watch",
          signals: [
            `${queueStats.pending} pending tasks and ${queueStats.running} running tasks in the local executor.`,
            `${queueStats.completed} completed tasks are visible through the same console.`,
            liveReasoning
              ? `Live Claude-backed execution is configured through ${apiConfig.sonnetModel}.`
              : "The console stays safe until Anthropic credentials are configured.",
          ],
        },
        {
          id: "learning",
          label: "Apprentice layer",
          detail: "ApprenticeEngine explains the physics behind recommendations so the app teaches instead of only routing.",
          status: "Explain mode ready",
          tone: "good",
          signals: [
            "Parameter explanations connect directly to material behavior.",
            "Diagnostic guidance stays next to the routed action.",
            "The prompt lab can now return both a route and a reason.",
          ],
        },
      ],
      modelCards: models
        .sort((left, right) => (right.accuracy ?? 0) - (left.accuracy ?? 0))
        .map((model) => ({
          id: model.id,
          name: model.name,
          domain: model.domain,
          status: model.status,
          accuracyLabel: formatPercent(model.accuracy),
          samplesLabel: `${formatInteger(model.training_samples)} samples`,
          learningMode: model.type.replace(/_/g, " "),
          reasoningNote: DOMAIN_REASONING_NOTES[model.domain] ?? "Supports internal PRISM reasoning and routing.",
        })),
      chainCards: chains.map((chain) => {
        const fullChain = automationChainEngine.getChain(chain.task_class);
        return {
          id: chain.id,
          taskClass: chain.task_class,
          tier: chain.tier,
          tokenBudgetLabel: formatTokenBudget(chain.token_budget),
          failBehavior: fullChain.fail_behavior.replace(/_/g, " "),
          detail: `${chain.steps} execution steps with ${chain.tier} priority posture.`,
          emphasis:
            chain.task_class === "roadmap"
              ? "Use when sequencing milestone work and dependency-aware execution."
              : chain.task_class === "speed_feed"
                ? "Use when the request needs canonical machining physics."
                : chain.task_class === "post_process"
                  ? "Use when controller safety and output correctness matter most."
                  : "Use when a prompt needs explicit routing, budget, and fail posture.",
        };
      }),
      agentSummary: {
        activeAgents: `${agentStats.activeEnabled} active agents`,
        queueDepth: `${queueStats.pending + queueStats.running} queued or running`,
        throughput: `${queueStats.throughput_per_min}/min recent throughput`,
        modelAccess: liveReasoning ? apiConfig.sonnetModel : "Anthropic key not configured",
        detail:
          "The app now treats PRISM's orchestration layer as product surface area. Queue posture, available agents, and execution mode are visible before you hand work off.",
        alerts: [
          liveReasoning
            ? "Live execution is enabled for deeper agent runs."
            : "Live execution is guarded until ANTHROPIC_API_KEY is configured.",
          queueStats.failed > 0
            ? `${queueStats.failed} task failures remain in queue history and should be reviewed.`
            : "No failed tasks are currently recorded in the local queue summary.",
        ],
      },
    };
  }

  async analyzePrompt(prompt: string): Promise<OperatingSystemPromptAnalysis> {
    await agentRegistry.load().catch(() => undefined);

    const normalizedPrompt = normalizePrompt(prompt);
    const aiIntent = aimlEngine.classifyIntent(normalizedPrompt);
    const automation = automationChainEngine.classify(normalizedPrompt);
    const chain = automationChainEngine.getChain(automation.task_class);
    const modelMatches = buildModelMatches(aiIntent.intent);
    const agentCandidates = buildAgentCandidates(automation.task_class);
    const suggestedSurface = TASK_CLASS_TO_SURFACE[automation.task_class];
    const parameter = apprenticeParameterForIntent(aiIntent.intent);
    const material = typeof aiIntent.entities.material === "string"
      ? aiIntent.entities.material
      : "steel";
    const apprentice = apprenticeEngine("apprentice_explain", {
      parameter,
      material,
      value: aiIntent.suggested_action ?? aiIntent.intent,
      depth: "standard",
    }) as PromptApprenticeExplanation;

    return {
      prompt: normalizedPrompt,
      aiIntent: {
        intent: aiIntent.intent,
        confidence: aiIntent.confidence,
        suggestedAction: aiIntent.suggested_action,
        entities: aiIntent.entities,
        alternatives: aiIntent.alternatives,
      },
      automation: {
        taskClass: automation.task_class,
        confidence: automation.confidence,
        chainId: automation.chain_id,
        tokenBudget: automation.token_budget,
        matchedKeywords: automation.matched_keywords,
        chainSteps: chain.steps.map((step) => step.description),
      },
      modelMatches,
      agentCandidates,
      apprentice,
      suggestedSurface,
      reasoningSummary: buildReasoningSummary({
        intent: aiIntent.intent,
        intentConfidence: aiIntent.confidence,
        chainId: automation.chain_id,
        surface: suggestedSurface,
      }),
      nextActions: [
        `${suggestedSurface.actionLabel} in ${suggestedSurface.label}.`,
        `Run \`${suggestedSurface.cliCommand}\` if you want the direct CLI equivalent.`,
        `Stay inside ${automation.chain_id} (${chain.fail_behavior.replace(/_/g, " ")}, ${chain.steps.length} steps) for the next automation pass.`,
      ],
    };
  }

  async analyzeShopFloorContext(
    input: OperatingSystemShopFloorInsightInput,
  ): Promise<OperatingSystemShopFloorInsight> {
    await agentRegistry.load().catch(() => undefined);

    const prompt = buildShopFloorPrompt(input);
    const aiIntent = aimlEngine.classifyIntent(prompt);
    const automation = automationChainEngine.classify(prompt);
    const chain = automationChainEngine.getChain(automation.task_class);
    const modelMatches = buildModelMatches(aiIntent.intent);
    const agentCandidates = buildAgentCandidates(automation.task_class);
    const fallbackSurface = TASK_CLASS_TO_SURFACE[automation.task_class];
    const suggestedSurface = buildShopFloorSurface(input, fallbackSurface);
    const riskFlags = buildShopFloorRiskFlags(input);
    const liveSignals = buildShopFloorLiveSignals(input);

    const tone: IntelligenceTone =
      input.hotJobCount > 0 || (typeof input.cycleVariancePct === "number" && Math.abs(input.cycleVariancePct) >= 15)
        ? "critical"
        : riskFlags.length > 0
          ? "watch"
          : input.runningTaskCount > 0
            ? "good"
            : "neutral";

    const apprentice = apprenticeEngine("apprentice_explain", {
      parameter:
        typeof input.cycleVariancePct === "number" && Math.abs(input.cycleVariancePct) >= 8
          ? "feed"
          : input.handoffSummary
            ? "coolant"
            : "cutting_speed",
      material: input.material ?? "steel",
      value: input.activeOperation ?? input.trackedJobId ?? aiIntent.intent,
      depth: tone === "critical" ? "detailed" : "standard",
    }) as PromptApprenticeExplanation;

    return {
      headline: buildShopFloorHeadline(input, tone),
      tone,
      confidence: Number((((aiIntent.confidence + automation.confidence) / 2) || 0).toFixed(3)),
      aiIntent: {
        intent: aiIntent.intent,
        confidence: aiIntent.confidence,
        suggestedAction: aiIntent.suggested_action,
        entities: aiIntent.entities,
        alternatives: aiIntent.alternatives,
      },
      automation: {
        taskClass: automation.task_class,
        confidence: automation.confidence,
        chainId: automation.chain_id,
        tokenBudget: automation.token_budget,
        matchedKeywords: automation.matched_keywords,
        chainSteps: chain.steps.map((step) => step.description),
      },
      modelMatches,
      agentCandidates,
      apprentice,
      suggestedSurface,
      reasoningSummary:
        `${buildReasoningSummary({
          intent: aiIntent.intent,
          intentConfidence: aiIntent.confidence,
          chainId: automation.chain_id,
          surface: suggestedSurface,
        })} Floor signals currently indicate ${riskFlags.length > 0 ? `${riskFlags.length} active risk flag${riskFlags.length === 1 ? "" : "s"}` : "stable operator posture"}.`,
      liveSignals,
      riskFlags,
      nextActions: [
        `${suggestedSurface.actionLabel} in ${suggestedSurface.label}.`,
        `Keep ${automation.chain_id} visible while the floor context is changing (${chain.fail_behavior.replace(/_/g, " ")}, ${chain.steps.length} steps).`,
        input.handoffSummary
          ? "Review the shift handoff before changing traveler state."
          : "Capture a handoff summary once the current operator state changes.",
      ],
    };
  }
}

export const operatingSystemIntelligenceEngine = new OperatingSystemIntelligenceEngine();
