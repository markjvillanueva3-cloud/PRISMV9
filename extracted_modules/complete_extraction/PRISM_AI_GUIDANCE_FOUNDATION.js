const PRISM_AI_GUIDANCE_FOUNDATION = {
  version: '1.0.0',

  // Configuration for future LLM integration
  config: {
    enabled: true,
    mode: 'local',  // 'local' (rule-based) or 'api' (LLM)
    apiEndpoint: null,  // For future Claude API integration
    apiKey: null,
    modelPreference: 'claude-3-sonnet',
    maxTokens: 4096,
    temperature: 0.3
  },
  // Context accumulator for intelligent decisions
  context: {
    session: {
      id: null,
      startTime: null,
      workflowMode: null,
      currentStage: null,
      history: []
    },
    part: {
      type: null,
      material: null,
      dimensions: null,
      features: [],
      complexity: null
    },
    machine: {
      selected: null,
      capabilities: [],
      limitations: []
    },
    tooling: {
      available: [],
      selected: [],
      constraints: []
    },
    parameters: {
      calculated: {},
      overridden: {},
      recommendations: []
    },
    decisions: []
  },
  // Initialize guidance session
  startSession: function(workflowMode) {
    this.context.session = {
      id: 'AI_' + Date.now(),
      startTime: new Date().toISOString(),
      workflowMode: workflowMode,
      currentStage: 'initialized',
      history: []
    };
    this._log('Session started', { mode: workflowMode });
    return this.context.session.id;
  },
  // Get intelligent recommendation
  getRecommendation: function(stage, data) {
    this.context.session.currentStage = stage;
    this._updateContext(data);

    // Local rule-based recommendations (fallback when no LLM)
    const recommendation = this._generateLocalRecommendation(stage, data);

    // Log decision
    this.context.decisions.push({
      timestamp: new Date().toISOString(),
      stage: stage,
      input: data,
      recommendation: recommendation,
      source: this.config.mode
    });

    return recommendation;
  },
  // Update context with new data
  _updateContext: function(data) {
    if (data.part) {
      Object.assign(this.context.part, data.part);
    }
    if (data.machine) {
      Object.assign(this.context.machine, data.machine);
    }
    if (data.tooling) {
      Object.assign(this.context.tooling, data.tooling);
    }
    if (data.parameters) {
      Object.assign(this.context.parameters, data.parameters);
    }
  },
  // Generate local (rule-based) recommendation
  _generateLocalRecommendation: function(stage, data) {
    const recommendations = {
      // File analysis stage
      FILE_ANALYSIS: () => {
        const ext = data.fileName?.split('.').pop()?.toLowerCase();
        return {
          action: ext === 'step' || ext === 'stp' ? 'parse_step' :
                  ext === 'pdf' || ext === 'png' || ext === 'jpg' ? 'ocr_extract' : 'unknown',
          confidence: 0.95,
          reasoning: `File type .${ext} detected. Routing to appropriate parser.`,
          nextStage: 'FEATURE_RECOGNITION'
        };
      },
      // Feature recognition stage
      FEATURE_RECOGNITION: () => {
        const features = data.features || [];
        const hasComplex = features.some(f => f.complexity === 'high' || f.type === '5axis');
        return {
          action: hasComplex ? 'advanced_recognition' : 'standard_recognition',
          confidence: features.length > 0 ? 0.85 : 0.5,
          reasoning: `${features.length} features detected. ${hasComplex ? 'Complex features require advanced processing.' : 'Standard processing suitable.'}`,
          nextStage: 'SETUP_PLANNING',
          suggestions: features.length === 0 ? ['Upload higher quality file', 'Check file format'] : []
        };
      },
      // Machine selection stage
      MACHINE_SELECTION: () => {
        const part = this.context.part;
        const features = part.features || [];
        const needs5Axis = features.some(f => f.type === 'undercut' || f.type === 'compound_angle');
        const needsTurning = features.some(f => f.type === 'od_profile' || f.type === 'id_bore');

        let machineType = '3AXIS_VMC';
        if (needs5Axis && needsTurning) machineType = 'MILL_TURN_5AXIS';
        else if (needs5Axis) machineType = '5AXIS_VMC';
        else if (needsTurning) machineType = 'LATHE_CNC';

        return {
          action: 'select_machine',
          recommendedType: machineType,
          confidence: 0.80,
          reasoning: `Based on ${features.length} features, ${needs5Axis ? '5-axis capability' : ''} ${needsTurning ? 'turning operations' : ''} recommended.`,
          nextStage: 'TOOL_SELECTION'
        };
      },
      // Tool selection stage
      TOOL_SELECTION: () => {
        const part = this.context.part;
        const material = part.material || 'aluminum';
        const features = part.features || [];

        const toolRecs = [];
        const smallestFeature = features.reduce((min, f) =>
          f.dimensions?.radius < min ? f.dimensions.radius : min, Infinity);

        if (smallestFeature < 3) {
          toolRecs.push({ type: 'endmill', diameter: Math.max(1, smallestFeature * 0.8), reason: 'Small feature access' });
        }
        if (features.some(f => f.type === 'pocket')) {
          toolRecs.push({ type: 'endmill', diameter: 10, reason: 'Pocket roughing' });
        }
        if (features.some(f => f.type === 'hole')) {
          toolRecs.push({ type: 'drill', reason: 'Hole operations' });
        }
        return {
          action: 'select_tools',
          recommendations: toolRecs,
          confidence: toolRecs.length > 0 ? 0.85 : 0.6,
          reasoning: `${toolRecs.length} tools recommended based on ${features.length} features in ${material}.`,
          nextStage: 'PARAMETER_CALCULATION'
        };
      },
      // Parameter calculation stage
      PARAMETER_CALCULATION: () => {
        const part = this.context.part;
        const machine = this.context.machine;
        const material = part.material || 'aluminum';

        // Get manufacturer data priority
        const useManufacturerData = typeof MANUFACTURER_CUTTING_DATA !== 'undefined';

        return {
          action: 'calculate_parameters',
          source: useManufacturerData ? 'manufacturer_data' : 'calculated',
          confidence: useManufacturerData ? 0.92 : 0.75,
          reasoning: useManufacturerData ?
            'Using manufacturer-validated cutting data for optimal parameters.' :
            'Using calculated parameters based on engineering formulas.',
          recommendations: [
            { param: 'depth_of_cut', value: 'Use 100% LOC for adaptive roughing' },
            { param: 'width_of_cut', value: 'Use 10-15% for HSM/adaptive' },
            { param: 'feed', value: 'Apply chip thinning compensation' }
          ],
          nextStage: 'TOOLPATH_GENERATION'
        };
      },
      // Toolpath generation stage
      TOOLPATH_GENERATION: () => {
        const part = this.context.part;
        const features = part.features || [];

        const strategies = [];
        if (features.some(f => f.type === 'pocket')) {
          strategies.push({ feature: 'pocket', strategy: 'adaptive_clearing', reason: 'Optimal for pocket roughing' });
          strategies.push({ feature: 'pocket', strategy: 'contour_finish', reason: 'Wall finishing' });
        }
        if (features.some(f => f.type === 'surface')) {
          strategies.push({ feature: 'surface', strategy: 'waterline', reason: 'Steep surface finishing' });
          strategies.push({ feature: 'surface', strategy: 'scallop', reason: 'Shallow surface finishing' });
        }
        return {
          action: 'generate_toolpaths',
          strategies: strategies,
          confidence: strategies.length > 0 ? 0.88 : 0.6,
          reasoning: `${strategies.length} toolpath strategies recommended for ${features.length} features.`,
          nextStage: 'SIMULATION'
        };
      },
      // Simulation/verification stage
      SIMULATION: () => {
        return {
          action: 'verify_program',
          checks: ['collision_detection', 'tool_reach', 'material_removal', 'cycle_time'],
          confidence: 0.90,
          reasoning: 'Running comprehensive verification before G-code generation.',
          nextStage: 'GCODE_GENERATION'
        };
      },
      // G-code generation stage
      GCODE_GENERATION: () => {
        const machine = this.context.machine;

        return {
          action: 'generate_gcode',
          controller: machine?.controller || 'fanuc',
          confidence: 0.95,
          reasoning: `Generating controller-specific G-code for ${machine?.name || 'generic'} machine.`,
          nextStage: 'COMPLETE'
        };
      }
    };
    const handler = recommendations[stage];
    if (handler) {
      return handler();
    }
    return {
      action: 'continue',
      confidence: 0.5,
      reasoning: `No specific recommendation for stage: ${stage}`,
      nextStage: null
    };
  },
  // Log activity
  _log: function(message, data) {
    this.context.session.history.push({
      timestamp: new Date().toISOString(),
      message: message,
      data: data
    });

    if (typeof UNIFIED_WORKFLOW_EVENT_BUS !== 'undefined') {
      UNIFIED_WORKFLOW_EVENT_BUS.emit('AI_GUIDANCE_LOG', { message, data });
    }
  },
  // Get full context summary
  getContextSummary: function() {
    return {
      session: this.context.session,
      partSummary: {
        type: this.context.part.type,
        material: this.context.part.material,
        featureCount: this.context.part.features?.length || 0,
        complexity: this.context.part.complexity
      },
      machineSelected: this.context.machine.selected,
      toolCount: this.context.tooling.selected?.length || 0,
      decisionCount: this.context.decisions.length,
      lastDecision: this.context.decisions[this.context.decisions.length - 1]
    };
  },
  // Export session for analysis
  exportSession: function() {
    return JSON.stringify(this.context, null, 2);
  },
  // Placeholder for future LLM integration
  _callLLM: async function(prompt) {
    if (this.config.mode !== 'api' || !this.config.apiEndpoint) {
      console.warn('[PRISM AI] LLM API not configured. Using local rules.');
      return null;
    }
    // Future implementation:
    // const response = await fetch(this.config.apiEndpoint, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${this.config.apiKey}`
    //   },
    //   body: JSON.stringify({
    //     model: this.config.modelPreference,
    //     max_tokens: this.config.maxTokens,
    //     temperature: this.config.temperature,
    //     messages: [{ role: 'user', content: prompt }]
    //   })
    // });
    // return response.json();

    return null;
  }
}