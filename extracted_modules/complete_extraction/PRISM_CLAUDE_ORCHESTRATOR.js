const PRISM_CLAUDE_ORCHESTRATOR = {
  version: '1.0.0',

  // Operational mode
  config: {
    mode: 'local_simulation',  // 'local_simulation' or 'api' (future)
    enabled: true,
    verbosity: 'normal',  // 'quiet', 'normal', 'verbose'
    decisionLogging: true
  },
  // Decision history for reasoning trace
  decisionHistory: [],

  // Reasoning templates (simulates LLM reasoning patterns)
  reasoningTemplates: {
    tool_selection: {
      factors: ['material_compatibility', 'feature_geometry', 'required_tolerance', 'surface_finish', 'tool_availability'],
      weights: { material_compatibility: 0.3, feature_geometry: 0.25, required_tolerance: 0.2, surface_finish: 0.15, tool_availability: 0.1 }
    },
    strategy_selection: {
      factors: ['feature_type', 'material_machinability', 'machine_rigidity', 'cycle_time_priority', 'quality_priority'],
      weights: { feature_type: 0.25, material_machinability: 0.2, machine_rigidity: 0.2, cycle_time_priority: 0.2, quality_priority: 0.15 }
    },
    parameter_optimization: {
      factors: ['tool_capability', 'machine_capability', 'material_limits', 'stability', 'tool_life'],
      weights: { tool_capability: 0.25, machine_capability: 0.2, material_limits: 0.2, stability: 0.2, tool_life: 0.15 }
    }
  },
  /**
   * Get AI-guided recommendation for a decision
   * Simulates Claude-like reasoning locally
   */
  getGuidance(decisionType, context) {
    const startTime = performance.now();

    const guidance = {
      decision: decisionType,
      timestamp: Date.now(),
      context,
      analysis: {},
      recommendation: null,
      confidence: 0,
      reasoning: [],
      alternatives: []
    };
    // Route to appropriate handler
    switch (decisionType) {
      case 'tool_selection':
        Object.assign(guidance, this._guideToolSelection(context));
        break;
      case 'strategy_selection':
        Object.assign(guidance, this._guideStrategySelection(context));
        break;
      case 'parameter_optimization':
        Object.assign(guidance, this._guideParameterOptimization(context));
        break;
      case 'sequence_planning':
        Object.assign(guidance, this._guideSequencePlanning(context));
        break;
      case 'error_recovery':
        Object.assign(guidance, this._guideErrorRecovery(context));
        break;
      default:
        guidance.reasoning.push('No specific guidance available for: ' + decisionType);
        guidance.recommendation = 'Use default behavior';
        guidance.confidence = 0.5;
    }
    // Calculate processing time
    guidance.processingTime = Math.round(performance.now() - startTime) + 'ms';

    // Log decision
    if (this.config.decisionLogging) {
      this.decisionHistory.push(guidance);
      if (this.decisionHistory.length > 100) {
        this.decisionHistory = this.decisionHistory.slice(-100);
      }
    }
    return guidance;
  },
  /**
   * Guide tool selection
   */
  _guideToolSelection(context) {
    const { feature, material, machine, availableTools, targetFinish, targetTolerance } = context;

    const analysis = {
      featureType: feature?.type || 'unknown',
      materialClass: this._classifyMaterial(material),
      finishRequirement: targetFinish || 'standard',
      toleranceClass: this._classifyTolerance(targetTolerance)
    };
    const reasoning = [];
    reasoning.push(`Analyzing tool selection for ${analysis.featureType} in ${analysis.materialClass}`);

    // Score available tools
    const scoredTools = (availableTools || []).map(tool => {
      let score = 50;

      // Material compatibility
      if (this._isToolSuitableForMaterial(tool, material)) {
        score += 20;
        reasoning.push(`${tool.type || tool.id} is compatible with ${analysis.materialClass}`);
      } else {
        score -= 20;
      }
      // Feature geometry match
      if (this._isToolSuitableForFeature(tool, feature)) {
        score += 15;
      }
      // Tolerance capability
      if (analysis.toleranceClass === 'tight' && tool.precision) {
        score += 10;
      }
      return { tool, score };
    });

    // Sort and select best
    scoredTools.sort((a, b) => b.score - a.score);

    if (scoredTools.length > 0) {
      reasoning.push(`Recommended: ${scoredTools[0].tool.type || scoredTools[0].tool.id} (score: ${scoredTools[0].score})`);
    }
    return {
      analysis,
      recommendation: scoredTools[0]?.tool || null,
      confidence: scoredTools.length > 0 ? Math.min(scoredTools[0].score / 100, 0.95) : 0.3,
      reasoning,
      alternatives: scoredTools.slice(1, 4).map(s => s.tool)
    };
  },
  /**
   * Guide strategy selection
   */
  _guideStrategySelection(context) {
    const { feature, material, machine, priorities } = context;

    const analysis = {
      featureComplexity: this._assessFeatureComplexity(feature),
      materialDifficulty: this._assessMaterialDifficulty(material),
      priorityProfile: priorities || 'balanced'
    };
    const reasoning = [];
    reasoning.push(`Feature complexity: ${analysis.featureComplexity}`);
    reasoning.push(`Material difficulty: ${analysis.materialDifficulty}`);

    // Use PRISM_MULTI_OBJECTIVE_OPTIMIZER if available
    let recommendation = null;
    let confidence = 0.7;

    if (typeof PRISM_MULTI_OBJECTIVE_OPTIMIZER !== 'undefined') {
      const mopResult = PRISM_MULTI_OBJECTIVE_OPTIMIZER.selectOptimalStrategy({
        feature,
        material,
        machine,
        profile: analysis.priorityProfile
      });

      if (mopResult.success) {
        recommendation = mopResult.optimal;
        confidence = mopResult.optimal.weightedScore / 100;
        reasoning.push(`Multi-objective optimization selected: ${mopResult.optimal.id}`);
        reasoning.push(...(mopResult.reasoning || []));
      }
    } else {
      // Fallback to rule-based
      reasoning.push('Using rule-based strategy selection');

      if (analysis.featureComplexity === 'simple' && analysis.materialDifficulty === 'easy') {
        recommendation = { id: 'pocket', type: 'roughing' };
      } else if (analysis.materialDifficulty === 'difficult') {
        recommendation = { id: 'trochoidal', type: 'roughing' };
      } else {
        recommendation = { id: 'adaptive_clearing', type: 'roughing' };
      }
    }
    return {
      analysis,
      recommendation,
      confidence,
      reasoning,
      alternatives: []
    };
  },
  /**
   * Guide parameter optimization
   */
  _guideParameterOptimization(context) {
    const { tool, material, operation, machine } = context;

    const reasoning = [];
    reasoning.push('Analyzing optimal cutting parameters...');

    // Use PRISM_INTELLIGENT_CUTTING_PARAM_ENGINE if available
    if (typeof PRISM_INTELLIGENT_CUTTING_PARAM_ENGINE !== 'undefined') {
      reasoning.push('Using manufacturer-based parameter engine');
      // Would call the engine here
    }
    // Basic parameter calculation
    const params = this._calculateBasicParams(tool, material, operation);
    reasoning.push(`Calculated: ${params.rpm} RPM, ${params.feedRate} mm/min, ${params.doc} mm DOC`);

    // Safety checks
    if (typeof PRISM_ADVANCED_OPTIMIZATION_ENGINE !== 'undefined') {
      const stability = PRISM_ADVANCED_OPTIMIZATION_ENGINE.stabilityLobe?.calculateCriticalDepth?.({
        fluteCount: tool?.flutes || 4
      });

      if (stability && params.doc > stability.criticalDepth) {
        reasoning.push(`⚠️ DOC exceeds stability limit (${stability.criticalDepth.toFixed(2)}mm) - reducing`);
        params.doc = stability.criticalDepth * 0.8;
      }
    }
    return {
      analysis: { tool, material, operation },
      recommendation: params,
      confidence: 0.8,
      reasoning,
      alternatives: []
    };
  },
  /**
   * Guide operation sequence planning
   */
  _guideSequencePlanning(context) {
    const { features, operations, constraints } = context;

    const reasoning = [];
    reasoning.push('Planning optimal operation sequence...');

    // Basic sequence rules
    const sequence = [];

    // 1. Roughing first
    const roughing = (operations || []).filter(op => op.type === 'roughing');
    sequence.push(...roughing);
    reasoning.push(`${roughing.length} roughing operations queued first`);

    // 2. Semi-finish
    const semiFinish = (operations || []).filter(op => op.type === 'semi_finish');
    sequence.push(...semiFinish);

    // 3. Finishing last
    const finishing = (operations || []).filter(op => op.type === 'finishing');
    sequence.push(...finishing);
    reasoning.push(`${finishing.length} finishing operations queued last`);

    return {
      analysis: { totalOperations: sequence.length },
      recommendation: sequence,
      confidence: 0.85,
      reasoning,
      alternatives: []
    };
  },
  /**
   * Guide error recovery
   */
  _guideErrorRecovery(context) {
    const { error, stage, state } = context;

    const reasoning = [];
    reasoning.push(`Analyzing error at stage: ${stage}`);
    reasoning.push(`Error type: ${error?.type || 'unknown'}`);

    let recovery = null;

    if (error?.type === 'collision') {
      recovery = { action: 'modify_toolpath', params: { retract_height: '+10mm' } };
      reasoning.push('Recommending increased retract height');
    } else if (error?.type === 'tool_overload') {
      recovery = { action: 'reduce_parameters', params: { feed_reduction: 0.7, doc_reduction: 0.8 } };
      reasoning.push('Recommending parameter reduction');
    } else {
      recovery = { action: 'manual_review', params: {} };
      reasoning.push('Recommending manual review');
    }
    return {
      analysis: { error, stage },
      recommendation: recovery,
      confidence: 0.7,
      reasoning,
      alternatives: []
    };
  },
  // Helper methods
  _classifyMaterial(material) {
    if (!material) return 'unknown';
    const m = (material.name || material.category || material || '').toLowerCase();
    if (m.includes('aluminum')) return 'aluminum';
    if (m.includes('titanium')) return 'titanium';
    if (m.includes('inconel') || m.includes('nickel')) return 'superalloy';
    if (m.includes('stainless')) return 'stainless';
    return 'steel';
  },
  _classifyTolerance(tol) {
    if (!tol) return 'standard';
    if (tol <= 0.01) return 'tight';
    if (tol <= 0.05) return 'medium';
    return 'standard';
  },
  _isToolSuitableForMaterial(tool, material) {
    // Simplified material compatibility check
    return true;
  },
  _isToolSuitableForFeature(tool, feature) {
    // Simplified feature compatibility check
    return true;
  },
  _assessFeatureComplexity(feature) {
    if (!feature) return 'medium';
    if (feature.type === 'pocket' && !feature.islands) return 'simple';
    if (feature.type === 'freeform' || feature.type === '5axis') return 'complex';
    return 'medium';
  },
  _assessMaterialDifficulty(material) {
    const m = this._classifyMaterial(material);
    if (m === 'aluminum') return 'easy';
    if (m === 'titanium' || m === 'superalloy') return 'difficult';
    return 'medium';
  },
  _calculateBasicParams(tool, material, operation) {
    const diameter = tool?.diameter || 12;
    const matFactor = this._assessMaterialDifficulty(material) === 'easy' ? 1.5 :
                      this._assessMaterialDifficulty(material) === 'difficult' ? 0.5 : 1.0;

    return {
      rpm: Math.round(1000 * matFactor * (12 / diameter)),
      feedRate: Math.round(500 * matFactor),
      doc: diameter * 0.5 * matFactor,
      woc: diameter * 0.3 * matFactor
    };
  },
  /**
   * Get decision history
   */
  getHistory() {
    return this.decisionHistory;
  },
  /**
   * Clear decision history
   */
  clearHistory() {
    this.decisionHistory = [];
  }
}