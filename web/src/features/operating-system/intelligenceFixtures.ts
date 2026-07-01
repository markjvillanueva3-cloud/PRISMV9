import type {
  PrismIntelligenceWorkspace,
  PrismPromptAnalysis,
  PrismShopFloorInsight,
  PrismShopFloorInsightInput,
} from './contracts';

export const PRISM_INTELLIGENCE_WORKSPACE: PrismIntelligenceWorkspace = {
  summary:
    'PRISM Intelligence turns the internal CLI, reasoning chains, and model registry into a first-class shell workspace.',
  mission:
    'Route work through real PRISM reasoning layers inside the app: classify the prompt, expose the chain, show the CLI path, and explain the physics.',
  metrics: [
    {
      id: 'models',
      label: 'Ready models',
      value: '8/8',
      detail: 'The internal registry is fully online for intent, quality, wear, and machining predictions.',
      tone: 'good',
    },
    {
      id: 'chains',
      label: 'Automation chains',
      value: '9',
      detail: 'Backend, web, roadmap, audit, ERP, and machining chains are exposed directly in-app.',
      tone: 'good',
    },
    {
      id: 'cli',
      label: 'CLI surfaces',
      value: '12',
      detail: 'The shell now treats the native PRISM CLI as part of the product surface instead of a hidden dev tool.',
      tone: 'good',
    },
    {
      id: 'agents',
      label: 'Active agents',
      value: '8',
      detail: 'Core expert, orchestration, validation, and cognitive agents are available for routing.',
      tone: 'good',
    },
    {
      id: 'queue',
      label: 'Execution queue',
      value: '0',
      detail: 'No pending or running agent work is staged in the local queue snapshot.',
      tone: 'neutral',
    },
    {
      id: 'reasoning',
      label: 'Live model access',
      value: 'Guarded',
      detail: 'Fixture mode keeps the console in explain-and-route posture until live credentials are available.',
      tone: 'watch',
    },
  ],
  promptStarters: [
    'Optimize a titanium roughing pass for a 12 mm carbide endmill.',
    'Classify this roadmap task and show the right chain.',
    'Explain why chatter is happening on a long-reach finish pass.',
    'Show the safest PRISM surface for a controller-specific post issue.',
  ],
  cliSurfaces: [
    {
      id: 'sf',
      command: 'sf',
      label: 'Speed and Feed',
      detail: 'Direct physics-backed cutting parameter calculation.',
      example: 'prism sf --material titanium_gr5 --tool-diameter 12 --flutes 4 --operation roughing',
      route: '/calculator',
      group: 'physics',
      keywords: ['speed', 'feed', 'physics', 'cutting'],
    },
    {
      id: 'verify',
      command: 'verify',
      label: 'Physics Verifier',
      detail: 'Cross-checks the machining stack against canonical models.',
      example: 'prism verify --material steel --tool-diameter 10 --flutes 4 --spindle-rpm 6200 --feed-rate 900',
      route: '/what-if',
      group: 'physics',
      keywords: ['verify', 'safety', 'surface finish', 'force'],
    },
    {
      id: 'program',
      command: 'program',
      label: 'Program Generator',
      detail: 'Builds full CNC programs from part definition and machine context.',
      example: 'prism program --part part.json --controller fanuc --machine "Haas VF-2"',
      route: '/pipeline',
      group: 'execution',
      keywords: ['program', 'controller', 'pipeline', 'g-code'],
    },
    {
      id: 'post',
      command: 'post',
      label: 'Post Pipeline',
      detail: 'Runs controller-aware post processing with stage analytics.',
      example: 'prism post --gcode program.nc --controller fanuc --aggressiveness 0.45',
      route: '/ppg',
      group: 'execution',
      keywords: ['post', 'controller', 'optimize', 'dialect'],
    },
    {
      id: 'classify',
      command: 'classify',
      label: 'Chain Classifier',
      detail: 'Routes natural-language work into the automation control plane.',
      example: 'prism classify "Build the roadmap shell route and validate the dependency gate"',
      route: '/intelligence',
      group: 'automation',
      keywords: ['classify', 'router', 'automation', 'chain'],
    },
    {
      id: 'chains',
      command: 'chains',
      label: 'Automation Chains',
      detail: 'Lists tiers, budgets, and fail behavior across PRISM chains.',
      example: 'prism chains',
      route: '/intelligence',
      group: 'automation',
      keywords: ['chains', 'budget', 'routing', 'fail behavior'],
    },
    {
      id: 'calc',
      command: 'calc',
      label: 'Universal Tool Router',
      detail: 'Calls dispatcher-backed calculations directly.',
      example: 'prism calc kienzle_force --kc1_1 1500 --mc 0.25 --ap 3 --fz 0.1',
      route: '/calculator',
      group: 'physics',
      keywords: ['dispatcher', 'calc', 'physics', 'engine'],
    },
    {
      id: 'quote',
      command: 'quote',
      label: 'Cost Estimator',
      detail: 'Produces physics-backed cost estimates for quoting.',
      example: 'prism quote --part drawing.json --quantity 100 --material aluminum_6061',
      route: '/quote-builder',
      group: 'reasoning',
      keywords: ['quote', 'cost', 'estimate', 'erp'],
    },
    {
      id: 'pipe',
      command: 'pipe',
      label: 'Composable Pipeline',
      detail: 'Feeds output from one engine into the next.',
      example: "prism pipe --steps '[{\"command\":\"sf\"},{\"command\":\"post\"}]'",
      route: '/pipeline',
      group: 'execution',
      keywords: ['pipe', 'pipeline', 'batch', 'compose'],
    },
    {
      id: 'repl',
      command: 'repl',
      label: 'Interactive REPL',
      detail: 'Opens a CLI workspace for iterative reasoning.',
      example: 'prism repl',
      route: '/intelligence',
      group: 'reasoning',
      keywords: ['repl', 'interactive', 'cli', 'reasoning'],
    },
  ],
  reasoningLayers: [
    {
      id: 'intent',
      label: 'Intent inference',
      detail: 'AIMLEngine converts operator language into action-ready routes and extracted entities.',
      status: '8 registered models',
      tone: 'good',
      signals: [
        'Intent classification is visible inside the shell.',
        'Extracted entities show material and process hints.',
        'Suggested actions stay visible before the user leaves the page.',
      ],
    },
    {
      id: 'chains',
      label: 'Chain routing',
      detail: 'AutomationChainEngine maps the prompt into a task class, budget, and fail posture.',
      status: '9 routing chains',
      tone: 'good',
      signals: [
        'Roadmap, audit, speed-feed, ERP, and post-processing classes are covered.',
        'Token budgets and fail behavior stay visible in the app.',
        'The app explains why a prompt lands in a specific chain.',
      ],
    },
    {
      id: 'agents',
      label: 'Agent execution',
      detail: 'AgentExecutor keeps queue posture and live-execution state in view.',
      status: 'Explain-only posture',
      tone: 'watch',
      signals: [
        'Queue depth is visible before work gets handed off.',
        'Live execution stays guarded in fixture mode.',
        'The shell now treats orchestration as product surface area.',
      ],
    },
    {
      id: 'learning',
      label: 'Apprentice layer',
      detail: 'ApprenticeEngine explains the physics behind recommendations.',
      status: 'Explain mode ready',
      tone: 'good',
      signals: [
        'Reasoning stays teachable instead of opaque.',
        'Diagnostic guidance sits next to the routed action.',
        'The app can return both a route and a reason.',
      ],
    },
  ],
  modelCards: [
    {
      id: 'chatter_detector',
      name: 'Chatter Anomaly Detector',
      domain: 'chatter',
      status: 'ready',
      accuracyLabel: '94% accuracy',
      samplesLabel: '12,000 samples',
      learningMode: 'anomaly detection',
      reasoningNote: 'Flags vibration-driven instability before it becomes scrap or crash risk.',
    },
    {
      id: 'quality_ensemble',
      name: 'Part Quality Ensemble',
      domain: 'quality',
      status: 'ready',
      accuracyLabel: '93% accuracy',
      samplesLabel: '11,000 samples',
      learningMode: 'ensemble',
      reasoningNote: 'Rolls multiple signals into a part-quality posture instead of a single metric.',
    },
    {
      id: 'speed_feed_regressor',
      name: 'Speed & Feed Predictor',
      domain: 'speed_feed',
      status: 'ready',
      accuracyLabel: '92% accuracy',
      samplesLabel: '15,000 samples',
      learningMode: 'regression',
      reasoningNote: 'Feeds the calculator, what-if, and validation surfaces with cutting recommendations.',
    },
    {
      id: 'intent_classifier',
      name: 'Manufacturing Intent Classifier',
      domain: 'intent',
      status: 'ready',
      accuracyLabel: '91% accuracy',
      samplesLabel: '25,000 samples',
      learningMode: 'classification',
      reasoningNote: 'Translates operator language into routes, chains, and actions.',
    },
  ],
  chainCards: [
    {
      id: 'chain-roadmap',
      taskClass: 'roadmap',
      tier: 'standard',
      tokenBudgetLabel: '500 tokens',
      failBehavior: 'degrade silent',
      detail: '2 execution steps with standard priority posture.',
      emphasis: 'Use when sequencing milestone work and dependency-aware execution.',
    },
    {
      id: 'chain-sf',
      taskClass: 'speed_feed',
      tier: 'critical',
      tokenBudgetLabel: '1,000 tokens',
      failBehavior: 'fail closed',
      detail: '2 execution steps with critical physics posture.',
      emphasis: 'Use when the request needs canonical machining physics.',
    },
    {
      id: 'chain-pp',
      taskClass: 'post_process',
      tier: 'critical',
      tokenBudgetLabel: '1,500 tokens',
      failBehavior: 'fail closed',
      detail: '3 execution steps with controller-safety posture.',
      emphasis: 'Use when controller safety and output correctness matter most.',
    },
  ],
  agentSummary: {
    activeAgents: '8 active agents',
    queueDepth: '0 queued or running',
    throughput: '0/min recent throughput',
    modelAccess: 'Anthropic key not configured',
    detail:
      'The app now treats PRISM orchestration as visible product behavior. Queue posture, available agents, and execution mode are surfaced before handoff.',
    alerts: [
      'Live execution is guarded until ANTHROPIC_API_KEY is configured.',
      'No failed tasks are currently recorded in the fixture queue summary.',
    ],
  },
};

function buildFixtureSurface(prompt: string) {
  if (/quote|cost|rfq|margin/i.test(prompt)) {
    return {
      label: 'Quote Builder',
      route: '/quote-builder',
      actionLabel: 'Open the cost and planning lane',
      cliCommand: 'prism quote --part drawing.json --quantity 50',
    };
  }

  if (/post|controller|gcode|g-code|fanuc|haas|siemens/i.test(prompt)) {
    return {
      label: 'Post Processor Generator',
      route: '/ppg',
      actionLabel: 'Open the post-processing surface',
      cliCommand: 'prism post --gcode program.nc --controller fanuc',
    };
  }

  if (/roadmap|milestone|task|dependency/i.test(prompt)) {
    return {
      label: 'PRISM Intelligence',
      route: '/intelligence',
      actionLabel: 'Open roadmap reasoning',
      cliCommand: 'prism classify "resume the roadmap work"',
    };
  }

  return {
    label: 'Calculator Studio',
    route: '/calculator',
    actionLabel: 'Open the calculator surface',
    cliCommand: 'prism sf --material steel --tool-diameter 12 --flutes 4 --operation roughing',
  };
}

export function buildPrismPromptAnalysisFixture(prompt: string): PrismPromptAnalysis {
  const surface = buildFixtureSurface(prompt);
  const isRoadmap = /roadmap|milestone|task|dependency/i.test(prompt);
  const isPost = /post|controller|gcode|g-code|fanuc|haas|siemens/i.test(prompt);
  const isQuote = /quote|cost|rfq|margin/i.test(prompt);
  const taskClass = isRoadmap ? 'roadmap' : isPost ? 'post_process' : isQuote ? 'erp' : 'speed_feed';
  const intent = isRoadmap ? 'plan_process' : isPost ? 'generate_gcode' : isQuote ? 'estimate_cost' : 'calculate_speed_feed';

  return {
    prompt,
    aiIntent: {
      intent,
      confidence: 0.84,
      suggestedAction: taskClass === 'speed_feed' ? 'prism_calc→speed_feed' : 'prism_intelligence→router',
      entities: taskClass === 'speed_feed' ? { material: 'titanium', tool_diameter: 12 } : {},
      alternatives: [
        { intent: 'compare_options', confidence: 0.42 },
        { intent: 'check_safety', confidence: 0.31 },
      ],
    },
    automation: {
      taskClass,
      confidence: 0.88,
      chainId:
        taskClass === 'roadmap'
          ? 'chain-roadmap'
          : taskClass === 'post_process'
            ? 'chain-pp'
            : taskClass === 'erp'
              ? 'chain-erp'
              : 'chain-sf',
      tokenBudget: taskClass === 'roadmap' ? 500 : taskClass === 'speed_feed' ? 1000 : 1500,
      matchedKeywords:
        taskClass === 'roadmap'
          ? ['roadmap', 'task', 'dependency']
          : taskClass === 'post_process'
            ? ['post', 'controller', 'gcode']
            : taskClass === 'erp'
              ? ['quote', 'cost']
              : ['speed', 'feed', 'optimize'],
      chainSteps:
        taskClass === 'roadmap'
          ? ['Load current roadmap position', 'Pick the next ready batch']
          : taskClass === 'post_process'
            ? ['Detect controller', 'Run pipeline', 'Verify safety']
            : taskClass === 'erp'
              ? ['Classify business domain', 'Run the pricing engine']
              : ['Load canonical constants', 'Run the speed/feed orchestrator'],
    },
    modelMatches: [
      {
        id: taskClass === 'speed_feed' ? 'speed_feed_regressor' : 'intent_classifier',
        name: taskClass === 'speed_feed' ? 'Speed & Feed Predictor' : 'Manufacturing Intent Classifier',
        domain: taskClass === 'speed_feed' ? 'speed_feed' : 'intent',
        why: 'Supports the current reasoning path.',
      },
      {
        id: taskClass === 'post_process' ? 'force_predictor' : 'quality_ensemble',
        name: taskClass === 'post_process' ? 'Cutting Force Predictor' : 'Part Quality Ensemble',
        domain: taskClass === 'post_process' ? 'force_prediction' : 'quality',
        why: 'Adds secondary posture before work leaves the console.',
      },
    ],
    agentCandidates: [
      {
        id: 'AGT-COORD-ORCHESTRATOR',
        name: 'Task Orchestrator',
        category: 'coordination',
        reason: 'Routes the request into the right PRISM surface.',
      },
      {
        id: taskClass === 'speed_feed' ? 'AGT-TASK-SPEED-FEED' : 'AGT-COG-REASONING',
        name: taskClass === 'speed_feed' ? 'Speed & Feed Calculator' : 'Reasoning Engine',
        category: taskClass === 'speed_feed' ? 'task_agent' : 'cognitive',
        reason: taskClass === 'speed_feed'
          ? 'Owns direct cutting-parameter reasoning.'
          : 'Synthesizes the prompt into a concrete next move.',
      },
    ],
    apprentice: {
      parameter: taskClass === 'speed_feed' ? 'cutting_speed' : 'feed',
      value: taskClass === 'speed_feed' ? 'speed/feed routing' : 'reasoning posture',
      explanation:
        taskClass === 'speed_feed'
          ? 'For titanium, speed must stay controlled while chip load stays high enough to cut below the work-hardened layer.'
          : 'The prompt needs classification and sequencing before the next system action is safe to take.',
      depth: 'standard',
      factors: [
        {
          factor: 'Thermal behavior',
          impact: taskClass === 'speed_feed' ? 'Titanium traps heat at the edge.' : 'Ambiguous prompts create routing uncertainty.',
          physics: taskClass === 'speed_feed'
            ? 'Low thermal conductivity keeps heat in the tool, so the app should not overspeed the cut.'
            : 'PRISM reduces risk by classifying the work before it executes or hands off anything.',
        },
      ],
    },
    suggestedSurface: surface,
    reasoningSummary: `Fixture mode reads this prompt as "${intent}", routes it through the ${taskClass} chain, and recommends continuing in ${surface.label}.`,
    nextActions: [
      `${surface.actionLabel} in ${surface.label}.`,
      `Run \`${surface.cliCommand}\` if you want the direct CLI path.`,
      'Use the visible chain posture to decide whether this request is safe to execute, inspect, or keep in explanation mode.',
    ],
  };
}

export function buildPrismShopFloorInsightFixture(input: PrismShopFloorInsightInput): PrismShopFloorInsight {
  const hasHotJob = input.hotJobCount > 0;
  const largeVariance = typeof input.cycleVariancePct === 'number' && Math.abs(input.cycleVariancePct) >= 8;
  const qualitySignal = /quality|inspection|hold|ncr/i.test(input.handoffSummary ?? '');
  const taskClass = qualitySignal ? 'erp' : hasHotJob ? 'roadmap' : largeVariance ? 'erp' : 'web';
  const surface = qualitySignal
    ? {
        label: 'Quality Management',
        route: '/quality',
        actionLabel: 'Open the blocking quality lane',
        cliCommand: 'prism classify "review the quality hold before resuming the traveler"',
      }
    : hasHotJob
      ? {
          label: 'Jobs Desk',
          route: '/jobs',
          actionLabel: 'Open the hot-job execution desk',
          cliCommand: 'prism classify "reprioritize the hot job on the shop floor"',
        }
      : largeVariance
        ? {
            label: 'Quote Builder',
            route: '/quote-builder',
            actionLabel: 'Review quote and labor feedback',
            cliCommand: 'prism classify "feed the new cycle variance back into quoting"',
          }
        : {
            label: 'Shop Floor Clock',
            route: '/shop-clock',
            actionLabel: 'Stay in the floor execution desk',
            cliCommand: 'prism classify "continue the active shop floor execution flow"',
          };

  const riskFlags = [
    ...(hasHotJob ? [`${input.hotJobCount} hot job escalation is active on the floor.`] : []),
    ...(largeVariance && typeof input.cycleVariancePct === 'number'
      ? [`Cycle variance is ${input.cycleVariancePct >= 0 ? 'over' : 'under'} standard by ${Math.abs(input.cycleVariancePct).toFixed(0)}%.`]
      : []),
    ...(input.extraParts > 0 ? [`${input.extraParts} extra part${input.extraParts === 1 ? '' : 's'} have been logged beyond the target quantity.`] : []),
    ...(input.handoffSummary ? ['A prior-shift handoff is still shaping the current operator move.'] : []),
    ...(input.trackedJobId && input.runningTaskCount === 0 ? ['A traveler packet is active but no task is currently running.'] : []),
  ];

  return {
    headline:
      hasHotJob
        ? 'Shop-floor execution is carrying a hot-job escalation and should stay tightly routed.'
        : largeVariance
          ? 'Cycle variance is large enough to affect quote trust and dispatch posture.'
          : input.handoffSummary
            ? 'Prior-shift handoff signal is still active, so the next operator move should stay explicit.'
            : 'The floor is staged and PRISM can keep the next move grounded in live execution context.',
    tone: hasHotJob || largeVariance ? 'critical' : riskFlags.length > 0 ? 'watch' : input.runningTaskCount > 0 ? 'good' : 'neutral',
    confidence: hasHotJob || largeVariance ? 0.91 : 0.84,
    aiIntent: {
      intent: largeVariance ? 'estimate_cost' : 'plan_process',
      confidence: hasHotJob ? 0.92 : 0.86,
      suggestedAction: hasHotJob ? 'prism_intelligence→router' : 'prism_business→dispatch_queue_job',
      entities: {
        ...(input.material ? { material: input.material } : {}),
        ...(input.trackedJobId ? { job_id: input.trackedJobId } : {}),
        live_attendance: input.liveAttendanceCount,
      },
      alternatives: [
        { intent: 'check_safety', confidence: 0.41 },
        { intent: 'diagnose_problem', confidence: 0.33 },
      ],
    },
    automation: {
      taskClass,
      confidence: 0.88,
      chainId: taskClass === 'roadmap' ? 'chain-roadmap' : taskClass === 'erp' ? 'chain-erp' : 'chain-web',
      tokenBudget: taskClass === 'roadmap' ? 500 : 1500,
      matchedKeywords: hasHotJob ? ['job', 'priority', 'queue'] : largeVariance ? ['quote', 'cost', 'variance'] : ['shop floor', 'operator', 'traveler'],
      chainSteps:
        taskClass === 'roadmap'
          ? ['Load current queue posture', 'Pick the next gated floor action']
          : taskClass === 'erp'
            ? ['Classify business impact', 'Run cost or quality reasoning']
            : ['Update the floor desk', 'Keep the operator context live'],
    },
    modelMatches: [
      {
        id: largeVariance ? 'quality_ensemble' : 'intent_classifier',
        name: largeVariance ? 'Part Quality Ensemble' : 'Manufacturing Intent Classifier',
        domain: largeVariance ? 'quality' : 'intent',
        why: largeVariance
          ? 'Variance should feed both quality confidence and commercial trust.'
          : 'The floor needs reliable routing before the operator changes state.',
      },
      {
        id: hasHotJob ? 'quality_ensemble' : 'tool_life_predictor',
        name: hasHotJob ? 'Part Quality Ensemble' : 'Tool Life Estimator',
        domain: hasHotJob ? 'quality' : 'tool_life',
        why: hasHotJob
          ? 'Hot work should keep quality risk visible while queue priority rises.'
          : 'Live execution should keep wear and task duration visible before the cycle drifts.',
      },
    ],
    agentCandidates: [
      {
        id: 'AGT-COORD-ORCHESTRATOR',
        name: 'Task Orchestrator',
        category: 'coordination',
        reason: 'Keeps the operator path, queue state, and next desk aligned.',
      },
      {
        id: hasHotJob ? 'AGT-COG-REASONING' : 'AGT-COORD-VALIDATOR',
        name: hasHotJob ? 'Reasoning Engine' : 'Validation Engine',
        category: hasHotJob ? 'cognitive' : 'coordination',
        reason: hasHotJob
          ? 'Explains why the floor should override normal ordering.'
          : 'Checks whether the next floor action is safe before it advances.',
      },
    ],
    apprentice: {
      parameter: largeVariance ? 'feed' : input.handoffSummary ? 'coolant' : 'cutting_speed',
      value: input.activeOperation || input.trackedJobId || 'shop-floor execution',
      explanation:
        largeVariance
          ? 'When actual cycle drifts away from standard, the app should treat chip load and process timing as a quote-feedback signal, not just a timer event.'
          : input.handoffSummary
            ? 'A live handoff means the operator should carry prior-shift process context forward before changing traveler state.'
            : 'The floor should keep operator moves tied to current execution posture, not disconnected button pushes.',
      depth: hasHotJob ? 'detailed' : 'standard',
      factors: [
        {
          factor: 'Queue pressure',
          impact: hasHotJob ? 'A management escalation is compressing the normal queue.' : 'Normal floor sequencing is still available.',
          physics: hasHotJob
            ? 'Urgency raises the cost of a misrouted step, so PRISM should keep the next desk and chain visible.'
            : 'Stable sequencing lets the operator stay in the current desk until a signal changes.',
        },
      ],
    },
    suggestedSurface: surface,
    reasoningSummary: `Fixture mode reads this floor context as ${largeVariance ? 'commercial-risk plus execution drift' : hasHotJob ? 'priority-sensitive execution' : 'active operator routing'}, keeps it in ${surface.label}, and leaves the reasoning chain visible instead of hiding it behind the desk.`,
    liveSignals: [
      `${input.liveAttendanceCount} operator${input.liveAttendanceCount === 1 ? '' : 's'} currently appear live on the floor.`,
      input.runningTaskCount > 0
        ? `${input.runningTaskCount} task${input.runningTaskCount === 1 ? '' : 's'} are actively running for the selected packet.`
        : 'No floor task is actively running right now.',
      input.completedParts > 0
        ? `${input.completedParts} part${input.completedParts === 1 ? '' : 's'} have been logged so far.`
        : 'No completed parts have been captured yet.',
    ],
    riskFlags,
    nextActions: [
      `${surface.actionLabel} in ${surface.label}.`,
      input.handoffSummary
        ? 'Review the shift handoff before advancing the traveler.'
        : 'Capture a handoff summary once the operator state changes.',
      'Keep the visible PRISM reasoning chain open while the floor context is still moving.',
    ],
  };
}
