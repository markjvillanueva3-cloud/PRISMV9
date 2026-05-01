const PRISM_MASTER_ORCHESTRATOR = {
  version: '1.0.0',
  buildDate: '2026-01-08',

  // REGISTERED ORCHESTRATION SYSTEMS

  registeredSystems: {
    // Core AI Orchestration (7 original)
    ai: null,                    // PRISM_AI_ORCHESTRATION_ENGINE
    enhanced: null,              // PRISM_ENHANCED_ORCHESTRATION_ENGINE
    cadGeneration: null,         // UNIFIED_CAD_GENERATION_ORCHESTRATOR
    cadLearning: null,           // COMPLETE_CAD_LEARNING_ORCHESTRATOR
    aiWorkflow: null,            // AI_WORKFLOW_ORCHESTRATOR
    init: null,                  // PRISM_INIT_ORCHESTRATOR
    pipeline: null,              // UNIFIED_MANUFACTURING_PIPELINE

    // Extended Orchestrators (5 additional)
    claudeComplex: null,         // PRISM_CLAUDE_COMPLEX_ORCHESTRATOR
    claudeMachineType: null,     // PRISM_CLAUDE_MACHINE_TYPE_ORCHESTRATOR
    claude: null,                // PRISM_CLAUDE_ORCHESTRATOR
    unifiedIntelligent: null,    // PRISM_UNIFIED_INTELLIGENT_ORCHESTRATOR
    database: null               // UNIFIED_DATABASE_ORCHESTRATOR
  },
  // Current state
  state: {
    initialized: false,
    activeWorkflow: null,
    activeSystem: null,
    currentStage: null,
    context: {},
    history: [],
    startTime: null
  },
  // INTELLIGENT ROUTING ENGINE

  routingEngine: {
    /**
     * Determine best orchestrator for a given task
     */
    selectOrchestrator(taskType, context) {
      const routes = {
        // CAD generation tasks
        'cad_from_print': 'cadGeneration',
        'cad_from_sketch': 'cadGeneration',
        'parametric_cad': 'cadGeneration',

        // CAM/Programming tasks
        'program_part': 'ai',
        'generate_gcode': 'ai',
        'post_process': 'enhanced',

        // Machine selection
        'select_machine': 'claudeMachineType',
        'match_post': 'enhanced',
        'machine_filter': 'claudeMachineType',
        'machine_capabilities': 'claudeMachineType',

        // Full workflows
        'print_to_part': 'ai',
        'cad_to_code': 'ai',
        'quick_quote': 'ai',

        // Learning tasks
        'learn_from_part': 'cadLearning',
        'find_similar': 'cadLearning',

        // Complex multi-step tasks
        'complex_workflow': 'claudeComplex',
        'multi_operation': 'claudeComplex',
        'advanced_setup': 'claudeComplex',

        // Intelligent decision making
        'auto_program': 'unifiedIntelligent',
        'smart_setup': 'unifiedIntelligent',
        'optimize_workflow': 'unifiedIntelligent',

        // Database operations
        'query_machines': 'database',
        'query_tools': 'database',
        'query_materials': 'database',
        'data_lookup': 'database',

        // Claude AI assistance
        'ai_assist': 'claude',
        'explain_setup': 'claude',
        'troubleshoot': 'claude'
      };
      const systemKey = routes[taskType] || 'ai';
      const system = PRISM_MASTER_ORCHESTRATOR.registeredSystems[systemKey];

      return {
        systemKey,
        system,
        confidence: system ? 'HIGH' : 'NONE',
        fallback: systemKey !== 'ai' ? 'ai' : 'enhanced'
      };
    },
    /**
     * Determine next stage based on current state and results
     */
    determineNextStage(currentStage, result, context) {
      // Standard linear progression
      const transitions = {
        'IMPORT': { success: 'ANALYZE', failure: 'RETRY_IMPORT' },
        'ANALYZE': { success: 'PLAN', failure: 'MANUAL_REVIEW' },
        'PLAN': { success: 'TOOL_SELECT', failure: 'REPLAN' },
        'TOOL_SELECT': { success: 'CAM_GENERATE', failure: 'MANUAL_TOOL_SELECT' },
        'CAM_GENERATE': { success: 'POST_PROCESS', failure: 'STRATEGY_ADJUST' },
        'POST_PROCESS': { success: 'VERIFY', failure: 'POST_CONFIG' },
        'VERIFY': { success: 'COMPLETE', failure: 'REVIEW' },

        // Machine selection flow
        'MACHINE_SELECT': { success: 'MODEL_LOAD', failure: 'MACHINE_SELECT' },
        'MODEL_LOAD': { success: 'CAPABILITY_CHECK', failure: 'MACHINE_SELECT' },
        'CAPABILITY_CHECK': { success: 'STRATEGY_MATCH', failure: 'RESELECT_MACHINE' },
        'STRATEGY_MATCH': { success: 'POST_SELECT', failure: 'MANUAL_STRATEGY' },
        'POST_SELECT': { success: 'COMPLETE', failure: 'POST_CONFIG' }
      };
      const transition = transitions[currentStage];
      if (!transition) return 'COMPLETE';

      return result.success ? transition.success : transition.failure;
    }
  },
  // CROSS-MODULE COMMUNICATION HUB

  communicationHub: {
    listeners: {},
    messageQueue: [],

    /**
     * Register a listener for cross-module events
     */
    on(eventType, callback, systemId) {
      if (!this.listeners[eventType]) {
        this.listeners[eventType] = [];
      }
      this.listeners[eventType].push({ callback, systemId });
      return () => this.off(eventType, callback);
    },
    /**
     * Remove a listener
     */
    off(eventType, callback) {
      if (!this.listeners[eventType]) return;
      this.listeners[eventType] = this.listeners[eventType].filter(l => l.callback !== callback);
    },
    /**
     * Emit an event to all listening systems
     */
    emit(eventType, data, sourceSystem) {
      const event = {
        type: eventType,
        data,
        source: sourceSystem,
        timestamp: Date.now()
      };
      // Log for debugging
      console.log(`[COMM_HUB] ${eventType} from ${sourceSystem}`, data);

      // Notify listeners
      const listeners = this.listeners[eventType] || [];
      for (const listener of listeners) {
        try {
          listener.callback(event);
        } catch (e) {
          console.error(`[COMM_HUB] Error in listener for ${eventType}:`, e);
        }
      }
      // Store in history
      this.messageQueue.push(event);
      if (this.messageQueue.length > 1000) {
        this.messageQueue.shift();
      }
      return listeners.length;
    },
    /**
     * Request data from another system
     */
    request(targetSystem, requestType, params) {
      return new Promise((resolve, reject) => {
        const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Set up response listener
        const cleanup = this.on(`response:${requestId}`, (event) => {
          cleanup();
          if (event.data.error) {
            reject(event.data.error);
          } else {
            resolve(event.data.result);
          }
        });

        // Send request
        this.emit(`request:${targetSystem}`, {
          requestId,
          requestType,
          params
        }, 'master');

        // Timeout
        setTimeout(() => {
          cleanup();
          reject(new Error(`Request to ${targetSystem} timed out`));
        }, 30000);
      });
    }
  },
  // CONTEXTUAL DECISION ENGINE

  decisionEngine: {
    /**
     * Make a decision based on full context
     */
    makeDecision(decisionType, options, context) {
      console.log(`[DECISION] Making ${decisionType} decision with ${options.length} options`);

      const scoredOptions = options.map(option => {
        let score = 50; // Base score

        // Apply context-based scoring
        switch(decisionType) {
          case 'MACHINE_SELECT':
            score = this._scoreMachine(option, context);
            break;
          case 'TOOL_SELECT':
            score = this._scoreTool(option, context);
            break;
          case 'STRATEGY_SELECT':
            score = this._scoreStrategy(option, context);
            break;
          case 'POST_SELECT':
            score = this._scorePost(option, context);
            break;
          default:
            score = option.score || 50;
        }
        return { ...option, score };
      });

      // Sort by score descending
      scoredOptions.sort((a, b) => b.score - a.score);

      return {
        recommended: scoredOptions[0],
        alternatives: scoredOptions.slice(1, 4),
        confidence: scoredOptions[0]?.score > 80 ? 'HIGH' :
                   scoredOptions[0]?.score > 60 ? 'MEDIUM' : 'LOW',
        reasoning: this._generateReasoning(decisionType, scoredOptions[0], context)
      };
    },
    _scoreMachine(machine, context) {
      let score = 50;

      if (context.partFeatures) {
        if (context.partFeatures.needs5Axis && machine.type?.includes('5AXIS')) score += 25;
        if (context.partFeatures.needsHighSpeed && machine.spindle?.rpm > 15000) score += 15;
        if (context.partFeatures.material === 'titanium' && machine.features?.includes('rigid')) score += 10;
      }
      if (context.partSize) {
        const [x, y, z] = context.partSize;
        if (machine.travels?.x >= x && machine.travels?.y >= y && machine.travels?.z >= z) score += 20;
      }
      return Math.min(100, score);
    },
    _scoreTool(tool, context) {
      let score = 50;

      if (context.operation === 'roughing' && tool.type === 'endmill' && tool.flutes <= 4) score += 20;
      if (context.operation === 'finishing' && tool.type === 'ballnose') score += 25;
      if (context.material && tool.coating?.includes(context.material === 'aluminum' ? 'ZrN' : 'TiAlN')) score += 15;

      return Math.min(100, score);
    },
    _scoreStrategy(strategy, context) {
      let score = 50;

      if (context.machineType?.includes('5AXIS') && strategy.multiaxis) score += 30;
      if (context.operation === 'roughing' && strategy.hsm) score += 25;
      if (context.tolerance < 0.01 && strategy.finishing) score += 20;

      return Math.min(100, score);
    },
    _scorePost(post, context) {
      let score = 50;

      if (context.machine && post.machines?.some(m => context.machine.includes(m))) score += 40;
      if (context.controller && post.controller === context.controller) score += 30;
      if (post.enhanced) score += 10;

      return Math.min(100, score);
    },
    _generateReasoning(decisionType, choice, context) {
      if (!choice) return 'No suitable options found';

      const reasons = [];

      switch(decisionType) {
        case 'MACHINE_SELECT':
          if (choice.type?.includes('5AXIS')) reasons.push('5-axis capability matches part requirements');
          if (choice.spindle?.rpm > 15000) reasons.push('High-speed spindle for efficient cutting');
          reasons.push(`Adequate work envelope for part size`);
          break;
        case 'TOOL_SELECT':
          reasons.push(`${choice.type} optimal for ${context.operation || 'operation'}`);
          if (choice.coating) reasons.push(`${choice.coating} coating for material compatibility`);
          break;
        case 'STRATEGY_SELECT':
          if (choice.hsm) reasons.push('HSM strategy for efficient material removal');
          if (choice.multiaxis) reasons.push('Multi-axis capability utilized');
          break;
        case 'POST_SELECT':
          reasons.push('Direct machine compatibility');
          if (choice.enhanced) reasons.push('Enhanced with PRISM optimizations');
          break;
      }
      return reasons.join('; ');
    }
  },
  // LEARNING FEEDBACK LOOP

  learningLoop: {
    outcomes: [],

    /**
     * Record workflow outcome for learning
     */
    recordOutcome(workflowId, outcome) {
      const record = {
        workflowId,
        outcome, // 'success', 'partial', 'failure'
        timestamp: Date.now(),
        context: PRISM_MASTER_ORCHESTRATOR.state.context,
        stages: PRISM_MASTER_ORCHESTRATOR.state.history.map(h => ({
          stage: h.stage,
          duration: h.duration,
          result: h.result
        }))
      };
      this.outcomes.push(record);

      // Keep last 100 outcomes
      if (this.outcomes.length > 100) {
        this.outcomes.shift();
      }
      // Emit for external learning systems
      PRISM_MASTER_ORCHESTRATOR.communicationHub.emit('workflow:outcome', record, 'learning');

      return record;
    },
    /**
     * Get success rate for a workflow type
     */
    getSuccessRate(workflowType) {
      const relevant = this.outcomes.filter(o =>
        o.context?.workflowType === workflowType
      );

      if (relevant.length === 0) return null;

      const successes = relevant.filter(o => o.outcome === 'success').length;
      return {
        rate: successes / relevant.length,
        total: relevant.length,
        successes
      };
    },
    /**
     * Get bottleneck stages
     */
    getBottlenecks() {
      const stageDurations = {};
      const stageFailures = {};

      for (const outcome of this.outcomes) {
        for (const stage of outcome.stages || []) {
          if (!stageDurations[stage.stage]) {
            stageDurations[stage.stage] = [];
            stageFailures[stage.stage] = 0;
          }
          stageDurations[stage.stage].push(stage.duration);
          if (stage.result === 'failure') stageFailures[stage.stage]++;
        }
      }
      const bottlenecks = [];
      for (const [stage, durations] of Object.entries(stageDurations)) {
        const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
        const failureRate = stageFailures[stage] / durations.length;

        if (avgDuration > 5000 || failureRate > 0.1) {
          bottlenecks.push({
            stage,
            avgDuration,
            failureRate,
            severity: failureRate > 0.2 ? 'HIGH' : avgDuration > 10000 ? 'MEDIUM' : 'LOW'
          });
        }
      }
      return bottlenecks.sort((a, b) => b.failureRate - a.failureRate);
    }
  },
  // MAIN API

  /**
   * Initialize and register all orchestration systems
   */
  init() {
    console.log('[PRISM_MASTER_ORCHESTRATOR v1.0] Initializing...');

    // Register existing systems
    if (typeof PRISM_AI_ORCHESTRATION_ENGINE !== 'undefined') {
      this.registeredSystems.ai = PRISM_AI_ORCHESTRATION_ENGINE;
      console.log('  - Registered PRISM_AI_ORCHESTRATION_ENGINE');
    }
    if (typeof PRISM_ENHANCED_ORCHESTRATION_ENGINE !== 'undefined') {
      this.registeredSystems.enhanced = PRISM_ENHANCED_ORCHESTRATION_ENGINE;
      console.log('  - Registered PRISM_ENHANCED_ORCHESTRATION_ENGINE');
    }
    if (typeof UNIFIED_CAD_GENERATION_ORCHESTRATOR !== 'undefined') {
      this.registeredSystems.cadGeneration = UNIFIED_CAD_GENERATION_ORCHESTRATOR;
      console.log('  - Registered UNIFIED_CAD_GENERATION_ORCHESTRATOR');
    }
    if (typeof COMPLETE_CAD_LEARNING_ORCHESTRATOR !== 'undefined') {
      this.registeredSystems.cadLearning = COMPLETE_CAD_LEARNING_ORCHESTRATOR;
      console.log('  - Registered COMPLETE_CAD_LEARNING_ORCHESTRATOR');
    }
    if (typeof AI_WORKFLOW_ORCHESTRATOR !== 'undefined') {
      this.registeredSystems.aiWorkflow = AI_WORKFLOW_ORCHESTRATOR;
      console.log('  - Registered AI_WORKFLOW_ORCHESTRATOR');
    }
    if (typeof PRISM_INIT_ORCHESTRATOR !== 'undefined') {
      this.registeredSystems.init = PRISM_INIT_ORCHESTRATOR;
      console.log('  - Registered PRISM_INIT_ORCHESTRATOR');
    }
    if (typeof UNIFIED_MANUFACTURING_PIPELINE !== 'undefined') {
      this.registeredSystems.pipeline = UNIFIED_MANUFACTURING_PIPELINE;
      console.log('  - Registered UNIFIED_MANUFACTURING_PIPELINE');
    }
    // Extended orchestrators
    if (typeof PRISM_CLAUDE_COMPLEX_ORCHESTRATOR !== 'undefined') {
      this.registeredSystems.claudeComplex = PRISM_CLAUDE_COMPLEX_ORCHESTRATOR;
      console.log('  - Registered PRISM_CLAUDE_COMPLEX_ORCHESTRATOR');
    }
    if (typeof PRISM_CLAUDE_MACHINE_TYPE_ORCHESTRATOR !== 'undefined') {
      this.registeredSystems.claudeMachineType = PRISM_CLAUDE_MACHINE_TYPE_ORCHESTRATOR;
      console.log('  - Registered PRISM_CLAUDE_MACHINE_TYPE_ORCHESTRATOR');
    }
    if (typeof PRISM_CLAUDE_ORCHESTRATOR !== 'undefined') {
      this.registeredSystems.claude = PRISM_CLAUDE_ORCHESTRATOR;
      console.log('  - Registered PRISM_CLAUDE_ORCHESTRATOR');
    }
    if (typeof PRISM_UNIFIED_INTELLIGENT_ORCHESTRATOR !== 'undefined') {
      this.registeredSystems.unifiedIntelligent = PRISM_UNIFIED_INTELLIGENT_ORCHESTRATOR;
      console.log('  - Registered PRISM_UNIFIED_INTELLIGENT_ORCHESTRATOR');
    }
    if (typeof UNIFIED_DATABASE_ORCHESTRATOR !== 'undefined') {
      this.registeredSystems.database = UNIFIED_DATABASE_ORCHESTRATOR;
      console.log('  - Registered UNIFIED_DATABASE_ORCHESTRATOR');
    }
    // Set up cross-system event listeners
    this._setupEventListeners();

    this.state.initialized = true;
    (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM_MASTER_ORCHESTRATOR] Initialization complete');
    console.log(`  - ${Object.values(this.registeredSystems).filter(s => s).length} systems registered`);

    return this;
  },
  _setupEventListeners() {
    // Listen for workflow events from all systems
    if (typeof PRISM_EVENT_MANAGER !== 'undefined') {
      PRISM_EVENT_MANAGER.on('workflow:*', (data) => {
        this.communicationHub.emit('workflow:event', data, 'event_manager');
      });
    }
    // Set up window event forwarding
    window.addEventListener('prism:workflow', (e) => {
      this.communicationHub.emit('workflow:external', e.detail, 'window');
    });
  },
  /**
   * Start a unified workflow
   */
  async startWorkflow(taskType, initialContext = {}) {
    console.log(`[MASTER] Starting workflow: ${taskType}`);

    // Route to appropriate system
    const route = this.routingEngine.selectOrchestrator(taskType, initialContext);
    console.log(`[MASTER] Routed to ${route.systemKey} (confidence: ${route.confidence})`);

    if (!route.system) {
      console.error(`[MASTER] No system found for ${taskType}`);
      return { success: false, error: 'No orchestration system available' };
    }
    // Initialize state
    this.state = {
      initialized: true,
      activeWorkflow: taskType,
      activeSystem: route.systemKey,
      currentStage: null,
      context: { ...initialContext, workflowType: taskType },
      history: [],
      startTime: Date.now()
    };
    // Emit start event
    this.communicationHub.emit('workflow:started', {
      taskType,
      system: route.systemKey,
      context: initialContext
    }, 'master');

    // Delegate to appropriate system
    try {
      let result;

      switch(route.systemKey) {
        case 'ai':
          result = await this._executeAIWorkflow(taskType, initialContext);
          break;
        case 'enhanced':
          result = this.registeredSystems.enhanced.startWorkflow(
            this._mapToEnhancedWorkflow(taskType), initialContext
          );
          break;
        case 'cadGeneration':
          result = await this._executeCADWorkflow(taskType, initialContext);
          break;
        default:
          result = { success: false, error: 'Unknown system type' };
      }
      return result;
    } catch (error) {
      console.error(`[MASTER] Workflow error:`, error);
      this.communicationHub.emit('workflow:error', { taskType, error }, 'master');
      return { success: false, error: error.message };
    }
  },
  _mapToEnhancedWorkflow(taskType) {
    const mapping = {
      'select_machine': 'MACHINE_MATCHED',
      'match_post': 'POST_OPTIMIZED',
      'quick_quote': 'RAPID_QUOTE'
    };
    return mapping[taskType] || 'FULL_AUTOMATED';
  },
  async _executeAIWorkflow(taskType, context) {
    const ai = this.registeredSystems.ai;
    if (!ai) return { success: false, error: 'AI system not available' };

    // Map task to workflow
    const workflowMap = {
      'print_to_part': 'PRINT_TO_PART',
      'cad_to_code': 'CAD_TO_CODE',
      'quick_quote': 'QUICK_QUOTE',
      'program_part': 'CAD_TO_CODE'
    };
    const workflowId = workflowMap[taskType] || taskType.toUpperCase();

    if (ai.startWorkflow) {
      return ai.startWorkflow(workflowId, context);
    } else if (ai.executeAIWorkflow) {
      return await ai.executeAIWorkflow(workflowId);
    }
    return { success: false, error: 'No execution method found' };
  },
  async _executeCADWorkflow(taskType, context) {
    const cad = this.registeredSystems.cadGeneration;
    if (!cad) return { success: false, error: 'CAD system not available' };

    if (cad.generateFromSpecs) {
      return await cad.generateFromSpecs(context.specs || context);
    }
    return { success: false, error: 'No CAD generation method found' };
  },
  /**
   * Advance to next stage
   */
  advanceStage(result) {
    const stageStartTime = Date.now();
    const previousStage = this.state.currentStage;

    // Record in history
    this.state.history.push({
      stage: previousStage,
      result: result.success ? 'success' : 'failure',
      duration: stageStartTime - (this.state.stageStartTime || this.state.startTime),
      data: result
    });

    // Determine next stage
    const nextStage = this.routingEngine.determineNextStage(
      previousStage, result, this.state.context
    );

    this.state.currentStage = nextStage;
    this.state.stageStartTime = Date.now();

    // Emit progress
    this.communicationHub.emit('workflow:stage_changed', {
      previous: previousStage,
      current: nextStage,
      result
    }, 'master');

    // Check if complete
    if (nextStage === 'COMPLETE') {
      return this.completeWorkflow(result);
    }
    return {
      complete: false,
      currentStage: nextStage,
      suggestions: this.getSuggestions()
    };
  },
  /**
   * Complete the workflow
   */
  completeWorkflow(finalResult) {
    const duration = Date.now() - this.state.startTime;

    const outcome = finalResult.success ? 'success' :
                   finalResult.partialSuccess ? 'partial' : 'failure';

    // Record for learning
    this.learningLoop.recordOutcome(this.state.activeWorkflow, outcome);

    // Emit completion
    this.communicationHub.emit('workflow:completed', {
      workflow: this.state.activeWorkflow,
      outcome,
      duration,
      history: this.state.history
    }, 'master');

    return {
      complete: true,
      outcome,
      duration,
      result: finalResult,
      history: this.state.history
    };
  },
  /**
   * Get intelligent suggestions for current stage
   */
  getSuggestions() {
    const stage = this.state.currentStage;
    const context = this.state.context;

    // Gather suggestions from all relevant systems
    const suggestions = [];

    // From enhanced orchestrator
    if (this.registeredSystems.enhanced?.aiDecisionSupport) {
      const enhancedSuggestions = this.registeredSystems.enhanced
        .aiDecisionSupport.generateSuggestions(stage, context);
      suggestions.push(...enhancedSuggestions);
    }
    // From AI orchestrator
    if (this.registeredSystems.ai?.getSuggestions) {
      const aiSuggestions = this.registeredSystems.ai.getSuggestions(stage, context);
      if (aiSuggestions) suggestions.push(...aiSuggestions);
    }
    // From learning loop
    const bottlenecks = this.learningLoop.getBottlenecks();
    const currentBottleneck = bottlenecks.find(b => b.stage === stage);
    if (currentBottleneck?.severity === 'HIGH') {
      suggestions.push({
        type: 'WARNING',
        message: `This stage has a ${(currentBottleneck.failureRate * 100).toFixed(0)}% failure rate - review carefully`,
        source: 'learning'
      });
    }
    return suggestions;
  },
  /**
   * Make a decision with full context
   */
  makeDecision(decisionType, options) {
    return this.decisionEngine.makeDecision(decisionType, options, this.state.context);
  },
  /**
   * Get current status
   */
  getStatus() {
    return {
      initialized: this.state.initialized,
      activeWorkflow: this.state.activeWorkflow,
      activeSystem: this.state.activeSystem,
      currentStage: this.state.currentStage,
      registeredSystems: Object.keys(this.registeredSystems).filter(k => this.registeredSystems[k]),
      historyLength: this.state.history.length,
      duration: this.state.startTime ? Date.now() - this.state.startTime : 0
    };
  }
}