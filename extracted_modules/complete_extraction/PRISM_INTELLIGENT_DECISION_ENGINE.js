const PRISM_INTELLIGENT_DECISION_ENGINE = {
  version: '1.0.0',

  // 1. CONFIDENCE SCORING SYSTEM

  confidence: {
    // Confidence thresholds
    thresholds: {
      HIGH: 85,      // Proceed automatically
      MEDIUM: 60,    // Proceed with warning
      LOW: 40,       // Recommend user review
      VERY_LOW: 20   // Require user confirmation
    },
    /**
     * Calculate confidence for a decision
     */
    calculate(factors) {
      const {
        dataQuality = 0.5,      // How complete is input data (0-1)
        matchQuality = 0.5,     // How well does solution match requirements (0-1)
        experienceData = 0.5,   // How much historical data supports this (0-1)
        constraintsSatisfied = 1.0, // What % of constraints are met (0-1)
        edgeCaseFactor = 1.0    // Penalty for unusual situations (0-1)
      } = factors;

      // Weighted confidence calculation
      const weights = {
        dataQuality: 0.25,
        matchQuality: 0.30,
        experienceData: 0.15,
        constraintsSatisfied: 0.20,
        edgeCaseFactor: 0.10
      };
      let confidence =
        dataQuality * weights.dataQuality +
        matchQuality * weights.matchQuality +
        experienceData * weights.experienceData +
        constraintsSatisfied * weights.constraintsSatisfied +
        edgeCaseFactor * weights.edgeCaseFactor;

      // Convert to percentage
      confidence = Math.round(confidence * 100);

      // Determine level
      let level = 'VERY_LOW';
      if (confidence >= this.thresholds.HIGH) level = 'HIGH';
      else if (confidence >= this.thresholds.MEDIUM) level = 'MEDIUM';
      else if (confidence >= this.thresholds.LOW) level = 'LOW';

      return {
        score: confidence,
        level,
        factors: { dataQuality, matchQuality, experienceData, constraintsSatisfied, edgeCaseFactor },
        recommendation: this._getRecommendation(level),
        canProceedAutomatically: confidence >= this.thresholds.MEDIUM
      };
    },
    _getRecommendation(level) {
      const recommendations = {
        HIGH: 'Proceed with high confidence. Decision is well-supported by data.',
        MEDIUM: 'Proceed with caution. Review parameters before running.',
        LOW: 'User review recommended. Some aspects need verification.',
        VERY_LOW: 'Manual confirmation required. Insufficient data for reliable decision.'
      };
      return recommendations[level];
    },
    /**
     * Assess data completeness
     */
    assessDataQuality(input) {
      const requiredFields = ['material', 'operation', 'dimensions'];
      const optionalFields = ['tolerance', 'finish', 'machine', 'tool', 'quantity'];

      let requiredScore = 0;
      let optionalScore = 0;

      for (const field of requiredFields) {
        if (input[field] !== undefined && input[field] !== null && input[field] !== '') {
          requiredScore += 1;
        }
      }
      for (const field of optionalFields) {
        if (input[field] !== undefined && input[field] !== null && input[field] !== '') {
          optionalScore += 1;
        }
      }
      // Required fields are weighted more heavily
      const quality = (requiredScore / requiredFields.length) * 0.7 +
                      (optionalScore / optionalFields.length) * 0.3;

      return {
        quality,
        missingRequired: requiredFields.filter(f => !input[f]),
        missingOptional: optionalFields.filter(f => !input[f])
      };
    }
  },
  // 2. MULTI-CRITERIA OPTIMIZATION (Pareto Optimal Solutions)

  optimization: {
    /**
     * Find Pareto optimal solutions for multi-criteria problems
     */
    findParetoOptimal(solutions, criteria) {
      // criteria = ['cost', 'time', 'quality'] with directions
      // directions: 'min' or 'max' for each criterion

      const paretoFront = [];

      for (let i = 0; i < solutions.length; i++) {
        let dominated = false;

        for (let j = 0; j < solutions.length; j++) {
          if (i === j) continue;

          if (this._dominates(solutions[j], solutions[i], criteria)) {
            dominated = true;
            break;
          }
        }
        if (!dominated) {
          paretoFront.push(solutions[i]);
        }
      }
      return paretoFront;
    },
    /**
     * Check if solution A dominates solution B
     */
    _dominates(a, b, criteria) {
      let dominated = true;
      let strictlyBetterInOne = false;

      for (const { name, direction } of criteria) {
        const aVal = a[name] || 0;
        const bVal = b[name] || 0;

        if (direction === 'min') {
          if (aVal > bVal) dominated = false;
          if (aVal < bVal) strictlyBetterInOne = true;
        } else { // max
          if (aVal < bVal) dominated = false;
          if (aVal > bVal) strictlyBetterInOne = true;
        }
      }
      return dominated && strictlyBetterInOne;
    },
    /**
     * Weighted sum optimization
     */
    weightedOptimize(solutions, weights, directions) {
      // Normalize all values to 0-1 scale
      const normalized = this._normalize(solutions, Object.keys(weights));

      // Calculate weighted scores
      const scored = normalized.map((sol, idx) => {
        let score = 0;

        for (const [criterion, weight] of Object.entries(weights)) {
          let value = sol[criterion] || 0;

          // Flip if we want to maximize (normalized assumes min is better)
          if (directions[criterion] === 'max') {
            value = 1 - value;
          }
          score += value * weight;
        }
        return {
          ...solutions[idx],
          _normalizedScore: 1 - score, // Higher is better
          _rank: 0
        };
      });

      // Sort by score (descending)
      scored.sort((a, b) => b._normalizedScore - a._normalizedScore);

      // Assign ranks
      scored.forEach((sol, idx) => {
        sol._rank = idx + 1;
      });

      return scored;
    },
    /**
     * Normalize values to 0-1 range
     */
    _normalize(solutions, criteria) {
      const mins = {};
      const maxs = {};

      // Find min/max for each criterion
      for (const criterion of criteria) {
        mins[criterion] = Infinity;
        maxs[criterion] = -Infinity;

        for (const sol of solutions) {
          const val = sol[criterion] || 0;
          mins[criterion] = Math.min(mins[criterion], val);
          maxs[criterion] = Math.max(maxs[criterion], val);
        }
      }
      // Normalize
      return solutions.map(sol => {
        const normalized = { ...sol };

        for (const criterion of criteria) {
          const range = maxs[criterion] - mins[criterion];
          if (range > 0) {
            normalized[criterion] = (sol[criterion] - mins[criterion]) / range;
          } else {
            normalized[criterion] = 0;
          }
        }
        return normalized;
      });
    },
    /**
     * Generate trade-off options for user selection
     */
    generateTradeoffOptions(solutions, criteria) {
      const options = [];

      // Option 1: Lowest cost
      const byCost = [...solutions].sort((a, b) => (a.cost || 0) - (b.cost || 0));
      if (byCost[0]) {
        options.push({
          name: 'Lowest Cost',
          description: 'Minimizes total cost at expense of time/quality',
          solution: byCost[0],
          tradeoffs: 'May take longer, slightly lower quality'
        });
      }
      // Option 2: Fastest
      const byTime = [...solutions].sort((a, b) => (a.time || 0) - (b.time || 0));
      if (byTime[0]) {
        options.push({
          name: 'Fastest',
          description: 'Minimizes cycle time',
          solution: byTime[0],
          tradeoffs: 'May cost more, aggressive parameters'
        });
      }
      // Option 3: Highest quality
      const byQuality = [...solutions].sort((a, b) => (b.quality || 0) - (a.quality || 0));
      if (byQuality[0]) {
        options.push({
          name: 'Highest Quality',
          description: 'Best surface finish and precision',
          solution: byQuality[0],
          tradeoffs: 'Takes longer, costs more'
        });
      }
      // Option 4: Balanced
      const balanced = this.weightedOptimize(solutions,
        { cost: 0.33, time: 0.33, quality: 0.34 },
        { cost: 'min', time: 'min', quality: 'max' }
      );
      if (balanced[0]) {
        options.push({
          name: 'Balanced',
          description: 'Optimizes all factors equally',
          solution: balanced[0],
          tradeoffs: 'Compromise on all dimensions'
        });
      }
      return options;
    }
  },
  // 3. INTERPOLATION ENGINE - Handle Unknown Values

  interpolation: {
    /**
     * Interpolate material properties for unknown materials
     */
    interpolateMaterial(unknownMaterial, knownMaterials) {
      // Find closest known materials by name similarity and properties
      const similarities = [];

      for (const [name, props] of Object.entries(knownMaterials)) {
        const similarity = this._calculateMaterialSimilarity(unknownMaterial, name, props);
        similarities.push({ name, props, similarity });
      }
      // Sort by similarity
      similarities.sort((a, b) => b.similarity - a.similarity);

      // Take top 3 most similar
      const top3 = similarities.slice(0, 3);

      if (top3.length === 0) {
        return { success: false, error: 'No similar materials found' };
      }
      // Weighted average of properties based on similarity
      const interpolated = {};
      const numericProps = ['hardness', 'tensileStrength', 'thermalConductivity', 'sfm', 'feedFactor'];

      for (const prop of numericProps) {
        let weightedSum = 0;
        let weightSum = 0;

        for (const { props, similarity } of top3) {
          if (props[prop] !== undefined) {
            weightedSum += props[prop] * similarity;
            weightSum += similarity;
          }
        }
        if (weightSum > 0) {
          interpolated[prop] = weightedSum / weightSum;
        }
      }
      // Take category from most similar
      interpolated.category = top3[0].props.category || 'unknown';
      interpolated.machinability = top3[0].props.machinability || 'medium';

      return {
        success: true,
        interpolated,
        basedOn: top3.map(m => m.name),
        confidence: Math.round(top3[0].similarity * 100),
        warning: `Interpolated from ${top3.map(m => m.name).join(', ')}. Verify parameters.`
      };
    },
    _calculateMaterialSimilarity(unknown, knownName, knownProps) {
      let similarity = 0;

      // Name-based similarity
      const unknownLower = unknown.toLowerCase();
      const knownLower = knownName.toLowerCase();

      // Check for common material family terms
      const families = ['aluminum', 'steel', 'stainless', 'titanium', 'inconel', 'brass', 'copper', 'nickel', 'cobalt'];

      for (const family of families) {
        if (unknownLower.includes(family) && knownLower.includes(family)) {
          similarity += 0.5;
          break;
        }
      }
      // Check for grade similarity (numbers)
      const unknownNums = unknown.match(/\d+/g) || [];
      const knownNums = knownName.match(/\d+/g) || [];

      for (const uNum of unknownNums) {
        for (const kNum of knownNums) {
          if (uNum === kNum) {
            similarity += 0.3;
          } else if (Math.abs(parseInt(uNum) - parseInt(kNum)) < 100) {
            similarity += 0.1;
          }
        }
      }
      // Normalize to 0-1
      return Math.min(similarity, 1.0);
    },
    /**
     * Interpolate cutting parameters for unknown tool/material combinations
     */
    interpolateCuttingParams(tool, material, knownParams) {
      // Find bracket values (parameters for similar conditions)
      const brackets = this._findBracketParams(tool, material, knownParams);

      if (brackets.length === 0) {
        // No data - use conservative defaults
        return {
          success: false,
          params: this._getConservativeDefaults(tool, material),
          confidence: 30,
          warning: 'No similar data found. Using conservative defaults.'
        };
      }
      if (brackets.length === 1) {
        // Single match - use with reduced confidence
        return {
          success: true,
          params: brackets[0].params,
          confidence: 60,
          warning: 'Limited data. Parameters from similar condition.'
        };
      }
      // Multiple matches - interpolate
      const interpolated = {};
      const paramNames = ['sfm', 'chipLoad', 'doc', 'woc', 'plungeRate'];

      for (const param of paramNames) {
        const values = brackets.map(b => b.params[param]).filter(v => v !== undefined);
        if (values.length > 0) {
          // Use geometric mean for cutting parameters (safer than arithmetic)
          interpolated[param] = Math.pow(values.reduce((a, b) => a * b, 1), 1 / values.length);
        }
      }
      return {
        success: true,
        params: interpolated,
        confidence: 100,
        basedOn: brackets.length + ' similar conditions'
      };
    },
    _findBracketParams(tool, material, knownParams) {
      const brackets = [];

      for (const known of knownParams) {
        let matchScore = 0;

        // Tool type match
        if (known.toolType === tool.type) matchScore += 0.3;

        // Tool diameter close
        if (Math.abs(known.toolDiameter - tool.diameter) < tool.diameter * 0.25) {
          matchScore += 0.2;
        }
        // Material family match
        if (known.materialFamily === material.family) matchScore += 0.3;

        // Hardness range
        if (known.hardnessRange && material.hardness) {
          if (material.hardness >= known.hardnessRange[0] &&
              material.hardness <= known.hardnessRange[1]) {
            matchScore += 0.2;
          }
        }
        if (matchScore >= 0.5) {
          brackets.push({ ...known, matchScore });
        }
      }
      return brackets.sort((a, b) => b.matchScore - a.matchScore);
    },
    _getConservativeDefaults(tool, material) {
      // Very conservative starting point
      return {
        sfm: 100,
        chipLoad: tool.diameter * 0.01, // 1% of diameter
        doc: tool.diameter * 0.5,
        woc: tool.diameter * 0.3,
        plungeRate: 5
      };
    }
  },
  // 4. REASONING CHAIN - Explain Every Decision

  reasoning: {
    /**
     * Create a reasoning chain for a decision
     */
    createChain(decision) {
      const chain = {
        decision: decision.name,
        timestamp: new Date().toISOString(),
        steps: [],
        conclusion: null,
        alternativesConsidered: [],
        confidence: null
      };
      return chain;
    },
    /**
     * Add a reasoning step
     */
    addStep(chain, step) {
      chain.steps.push({
        id: chain.steps.length + 1,
        ...step,
        timestamp: new Date().toISOString()
      });
      return chain;
    },
    /**
     * Generate human-readable explanation
     */
    explain(chain) {
      let explanation = `DECISION: ${chain.decision}\n\n`;
      explanation += `REASONING STEPS:\n`;

      for (const step of chain.steps) {
        explanation += `${step.id}. ${step.action}\n`;
        explanation += `   Because: ${step.reason}\n`;
        if (step.data) {
          explanation += `   Data: ${JSON.stringify(step.data)}\n`;
        }
        explanation += `\n`;
      }
      if (chain.alternativesConsidered.length > 0) {
        explanation += `ALTERNATIVES CONSIDERED:\n`;
        for (const alt of chain.alternativesConsidered) {
          explanation += `- ${alt.name}: ${alt.rejectionReason}\n`;
        }
        explanation += `\n`;
      }
      explanation += `CONCLUSION: ${chain.conclusion}\n`;
      explanation += `CONFIDENCE: ${chain.confidence}%\n`;

      return explanation;
    },
    /**
     * Standard reasoning templates for common decisions
     */
    templates: {
      toolSelection: (tool, material, operation, alternatives) => ({
        decision: `Select tool for ${operation} in ${material}`,
        steps: [
          { action: 'Identify operation type', reason: `Operation is ${operation}`, data: { operation } },
          { action: 'Check material requirements', reason: `${material} requires specific tool properties`, data: { material } },
          { action: 'Filter compatible tools', reason: 'Eliminate tools not suitable for material/operation', data: { candidateCount: alternatives.length } },
          { action: 'Score remaining options', reason: 'Rank by diameter match, coating, and availability', data: null },
          { action: `Select ${tool.name}`, reason: 'Highest score among candidates', data: { score: tool.score } }
        ],
        conclusion: `${tool.name} selected for ${operation} in ${material}`,
        alternativesConsidered: alternatives.slice(1, 4).map(a => ({
          name: a.name,
          rejectionReason: `Lower score (${a.score} vs ${tool.score})`
        }))
      }),

      feedsSpeedsSelection: (params, material, tool, conditions) => ({
        decision: `Calculate feeds and speeds for ${tool.type} in ${material}`,
        steps: [
          { action: 'Get base SFM for material', reason: `${material} base SFM from database`, data: { baseSfm: params.baseSfm } },
          { action: 'Apply tool coating factor', reason: `${tool.coating || 'Uncoated'} affects speed`, data: { coatingFactor: params.coatingFactor } },
          { action: 'Apply rigidity factor', reason: `Setup rigidity affects parameters`, data: { rigidityFactor: conditions.rigidity } },
          { action: 'Calculate RPM from SFM', reason: 'RPM = SFM * 3.82 / diameter', data: { rpm: params.rpm } },
          { action: 'Calculate feed rate', reason: 'Feed = RPM * chipload * flutes', data: { feed: params.feed } },
          { action: 'Apply safety factor', reason: 'Conservative start for untested conditions', data: { safetyFactor: params.safetyFactor } }
        ],
        conclusion: `RPM: ${params.rpm}, Feed: ${params.feed} IPM`
      }),

      strategySelection: (strategy, features, material, machine) => ({
        decision: `Select machining strategy for ${features.length} features in ${material}`,
        steps: [
          { action: 'Analyze feature types', reason: 'Different features need different strategies', data: { featureTypes: features.map(f => f.type) } },
          { action: 'Check material properties', reason: `${material} machinability affects strategy`, data: { machinability: material.machinability } },
          { action: 'Consider machine capabilities', reason: `${machine.type} has specific strengths`, data: { machineType: machine.type } },
          { action: 'Evaluate strategy options', reason: 'Compare roughing approaches', data: { options: ['adaptive', 'traditional', 'hsr'] } },
          { action: `Select ${strategy.name}`, reason: 'Best match for feature/material/machine combination', data: { strategy: strategy.name } }
        ],
        conclusion: `Using ${strategy.name} strategy with ${strategy.roughing} roughing and ${strategy.finishing} finishing`
      })
    }
  },
  // 5. CONSTRAINT SOLVER - Handle Conflicting Requirements

  constraints: {
    /**
     * Check all constraints and find conflicts
     */
    analyze(requirements) {
      const result = {
        satisfied: [],
        violated: [],
        conflicts: [],
        suggestions: []
      };
      // Check each constraint
      for (const constraint of this._getConstraints(requirements)) {
        const check = this._checkConstraint(constraint, requirements);

        if (check.satisfied) {
          result.satisfied.push(constraint);
        } else {
          result.violated.push({ constraint, reason: check.reason });
        }
      }
      // Find conflicts between satisfied constraints
      for (let i = 0; i < result.satisfied.length; i++) {
        for (let j = i + 1; j < result.satisfied.length; j++) {
          const conflict = this._checkConflict(result.satisfied[i], result.satisfied[j]);
          if (conflict) {
            result.conflicts.push(conflict);
          }
        }
      }
      // Generate suggestions for violations and conflicts
      for (const violation of result.violated) {
        result.suggestions.push(this._suggestFix(violation));
      }
      for (const conflict of result.conflicts) {
        result.suggestions.push(this._suggestResolution(conflict));
      }
      return result;
    },
    /**
     * Attempt to resolve conflicts automatically
     */
    resolve(conflicts, priorities) {
      const resolutions = [];

      for (const conflict of conflicts) {
        // Check priority of conflicting requirements
        const priority1 = priorities[conflict.constraint1.type] || 50;
        const priority2 = priorities[conflict.constraint2.type] || 50;

        if (priority1 > priority2) {
          // Relax constraint 2
          resolutions.push({
            conflict,
            action: 'relax',
            target: conflict.constraint2,
            adjustment: this._calculateRelaxation(conflict.constraint2, conflict.constraint1)
          });
        } else if (priority2 > priority1) {
          // Relax constraint 1
          resolutions.push({
            conflict,
            action: 'relax',
            target: conflict.constraint1,
            adjustment: this._calculateRelaxation(conflict.constraint1, conflict.constraint2)
          });
        } else {
          // Equal priority - find compromise
          resolutions.push({
            conflict,
            action: 'compromise',
            adjustment: this._calculateCompromise(conflict.constraint1, conflict.constraint2)
          });
        }
      }
      return resolutions;
    },
    _getConstraints(requirements) {
      const constraints = [];

      // Tolerance constraints
      if (requirements.tolerance) {
        constraints.push({
          type: 'tolerance',
          value: requirements.tolerance,
          check: (params) => params.achievableTolerance <= requirements.tolerance
        });
      }
      // Surface finish constraints
      if (requirements.finish) {
        constraints.push({
          type: 'finish',
          value: requirements.finish,
          check: (params) => params.achievableFinish <= requirements.finish
        });
      }
      // Wall thickness constraints
      if (requirements.minWallThickness) {
        constraints.push({
          type: 'wall_thickness',
          value: requirements.minWallThickness,
          check: (params) => params.toolDiameter <= requirements.minWallThickness * 2
        });
      }
      // Depth constraints
      if (requirements.depth && requirements.toolDiameter) {
        constraints.push({
          type: 'depth_to_diameter',
          value: requirements.depth / requirements.toolDiameter,
          check: (params) => params.depth / params.toolDiameter <= 4 // Max 4:1 typically
        });
      }
      // Time constraints
      if (requirements.maxTime) {
        constraints.push({
          type: 'time',
          value: requirements.maxTime,
          check: (params) => params.estimatedTime <= requirements.maxTime
        });
      }
      // Cost constraints
      if (requirements.maxCost) {
        constraints.push({
          type: 'cost',
          value: requirements.maxCost,
          check: (params) => params.estimatedCost <= requirements.maxCost
        });
      }
      return constraints;
    },
    _checkConstraint(constraint, requirements) {
      // Simplified check - would be more sophisticated in practice
      return { satisfied: true, reason: '' };
    },
    _checkConflict(c1, c2) {
      // Known conflict patterns
      const conflictPatterns = [
        { types: ['tolerance', 'time'], message: 'Tight tolerance requires slower feeds which increases time' },
        { types: ['finish', 'cost'], message: 'Better finish requires more passes which increases cost' },
        { types: ['depth_to_diameter', 'time'], message: 'Deep features with small tools take much longer' },
        { types: ['tolerance', 'wall_thickness'], message: 'Tight tolerance on thin walls causes deflection' }
      ];

      for (const pattern of conflictPatterns) {
        if (pattern.types.includes(c1.type) && pattern.types.includes(c2.type)) {
          return {
            constraint1: c1,
            constraint2: c2,
            message: pattern.message
          };
        }
      }
      return null;
    },
    _suggestFix(violation) {
      const suggestions = {
        tolerance: 'Consider using a precision machining operation or smaller tool',
        finish: 'Add a finishing pass with reduced stepover',
        wall_thickness: 'Use a smaller diameter tool or multiple passes',
        depth_to_diameter: 'Use a longer tool or multiple depth passes',
        time: 'Increase feed rates or reduce operation count',
        cost: 'Use standard tooling or reduce precision requirements'
      };
      return {
        violation: violation.constraint.type,
        suggestion: suggestions[violation.constraint.type] || 'Review requirements'
      };
    },
    _suggestResolution(conflict) {
      return {
        conflict: `${conflict.constraint1.type} vs ${conflict.constraint2.type}`,
        message: conflict.message,
        options: [
          `Relax ${conflict.constraint1.type} requirement`,
          `Relax ${conflict.constraint2.type} requirement`,
          'Accept longer cycle time / higher cost'
        ]
      };
    },
    _calculateRelaxation(constraintToRelax, keepConstraint) {
      // Calculate how much to relax a constraint
      return {
        original: constraintToRelax.value,
        suggested: constraintToRelax.value * 1.2, // Relax by 20%
        reason: `To satisfy ${keepConstraint.type} requirement`
      };
    },
    _calculateCompromise(c1, c2) {
      return {
        constraint1Adjustment: 1.1, // Relax by 10%
        constraint2Adjustment: 1.1,
        reason: 'Equal priority - both relaxed slightly'
      };
    }
  },
  // 6. FEEDBACK LEARNING SYSTEM

  learning: {
    // Storage key for learned preferences
    STORAGE_KEY: 'prism_learned_preferences',

    /**
     * Record user feedback on a decision
     */
    recordFeedback(decision, feedback) {
      const record = {
        timestamp: new Date().toISOString(),
        decision: {
          type: decision.type,
          input: decision.input,
          output: decision.output
        },
        feedback: {
          accepted: feedback.accepted,
          modified: feedback.modified,
          userValues: feedback.userValues,
          reason: feedback.reason
        }
      };
      // Store feedback
      const history = this._loadHistory();
      history.push(record);
      this._saveHistory(history);

      // Update preference model
      this._updatePreferences(record);

      return record;
    },
    /**
     * Get learned adjustments for a decision type
     */
    getLearnedAdjustments(decisionType, context) {
      const preferences = this._loadPreferences();
      const adjustments = preferences[decisionType] || {};

      // Find applicable adjustments based on context
      const applicable = [];

      for (const [key, adjustment] of Object.entries(adjustments)) {
        if (this._contextMatches(context, adjustment.context)) {
          applicable.push(adjustment);
        }
      }
      if (applicable.length === 0) {
        return { hasAdjustments: false };
      }
      // Combine adjustments (weighted by confidence and recency)
      const combined = this._combineAdjustments(applicable);

      return {
        hasAdjustments: true,
        adjustments: combined,
        basedOnRecords: applicable.length
      };
    },
    /**
     * Calculate adjustment factor for a parameter
     */
    getAdjustmentFactor(param, context) {
      const adjustments = this.getLearnedAdjustments(param, context);

      if (!adjustments.hasAdjustments) {
        return 1.0; // No adjustment
      }
      return adjustments.adjustments.factor || 1.0;
    },
    _loadHistory() {
      try {
        const data = localStorage.getItem(this.STORAGE_KEY + '_history');
        return data ? JSON.parse(data) : [];
      } catch (e) {
        return [];
      }
    },
    _saveHistory(history) {
      try {
        // Keep last 1000 records
        const trimmed = history.slice(-1000);
        localStorage.setItem(this.STORAGE_KEY + '_history', JSON.stringify(trimmed));
      } catch (e) {
        console.warn('[Learning] Could not save history:', e);
      }
    },
    _loadPreferences() {
      try {
        const data = localStorage.getItem(this.STORAGE_KEY + '_prefs');
        return data ? JSON.parse(data) : {};
      } catch (e) {
        return {};
      }
    },
    _savePreferences(prefs) {
      try {
        localStorage.setItem(this.STORAGE_KEY + '_prefs', JSON.stringify(prefs));
      } catch (e) {
        console.warn('[Learning] Could not save preferences:', e);
      }
    },
    _updatePreferences(record) {
      const prefs = this._loadPreferences();
      const type = record.decision.type;

      if (!prefs[type]) {
        prefs[type] = {};
      }
      // If user modified the output, learn from it
      if (record.feedback.modified && record.feedback.userValues) {
        const contextKey = this._createContextKey(record.decision.input);

        // Calculate adjustment factor
        const original = record.decision.output;
        const modified = record.feedback.userValues;

        const adjustment = {
          context: record.decision.input,
          factor: {},
          confidence: 0.8, // Start with high confidence for direct feedback
          lastUpdated: new Date().toISOString()
        };
        // Calculate factor for each modified value
        for (const [key, value] of Object.entries(modified)) {
          if (original[key] && typeof value === 'number' && typeof original[key] === 'number') {
            adjustment.factor[key] = value / original[key];
          }
        }
        // Update or add preference
        if (prefs[type][contextKey]) {
          // Average with existing preference
          const existing = prefs[type][contextKey];
          for (const [key, factor] of Object.entries(adjustment.factor)) {
            if (existing.factor[key]) {
              existing.factor[key] = (existing.factor[key] + factor) / 2;
            } else {
              existing.factor[key] = factor;
            }
          }
          existing.confidence = Math.min(existing.confidence + 0.1, 1.0);
          existing.lastUpdated = adjustment.lastUpdated;
        } else {
          prefs[type][contextKey] = adjustment;
        }
      }
      this._savePreferences(prefs);
    },
    _createContextKey(input) {
      // Create a key that represents similar contexts
      const parts = [];
      if (input.material) parts.push(input.material.split('_')[0]); // Material family
      if (input.operation) parts.push(input.operation);
      if (input.toolType) parts.push(input.toolType);
      return parts.join('_') || 'default';
    },
    _contextMatches(context, storedContext) {
      // Check if contexts are similar enough
      if (!storedContext) return true;

      const keys = ['material', 'operation', 'toolType', 'machine'];
      let matches = 0;
      let checks = 0;

      for (const key of keys) {
        if (storedContext[key]) {
          checks++;
          if (context[key] && context[key].toLowerCase().includes(storedContext[key].toLowerCase())) {
            matches++;
          }
        }
      }
      return checks === 0 || (matches / checks) >= 0.5;
    },
    _combineAdjustments(adjustments) {
      const combined = { factor: {} };

      // Weight by confidence and recency
      let totalWeight = 0;

      for (const adj of adjustments) {
        const recencyDays = (Date.now() - new Date(adj.lastUpdated).getTime()) / (1000 * 60 * 60 * 24);
        const recencyWeight = Math.exp(-recencyDays / 30); // Decay over 30 days
        const weight = adj.confidence * recencyWeight;
        totalWeight += weight;

        for (const [key, factor] of Object.entries(adj.factor)) {
          if (!combined.factor[key]) combined.factor[key] = 0;
          combined.factor[key] += factor * weight;
        }
      }
      // Normalize
      if (totalWeight > 0) {
        for (const key of Object.keys(combined.factor)) {
          combined.factor[key] /= totalWeight;
        }
      }
      return combined;
    }
  },
  // 7. CONTEXT INFERENCE - Handle Incomplete Information

  inference: {
    /**
     * Infer missing information from context
     */
    inferMissing(partialInput, context) {
      const inferred = { ...partialInput };
      const inferences = [];

      // Infer material from part name or description
      if (!inferred.material && context.partName) {
        const materialGuess = this._inferMaterialFromName(context.partName);
        if (materialGuess) {
          inferred.material = materialGuess.material;
          inferences.push({
            field: 'material',
            value: materialGuess.material,
            confidence: materialGuess.confidence,
            reason: materialGuess.reason
          });
        }
      }
      // Infer material from industry/application
      if (!inferred.material && context.industry) {
        const materialGuess = this._inferMaterialFromIndustry(context.industry);
        if (materialGuess) {
          inferred.material = materialGuess.material;
          inferences.push({
            field: 'material',
            value: materialGuess.material,
            confidence: materialGuess.confidence,
            reason: materialGuess.reason
          });
        }
      }
      // Infer tolerance from application
      if (!inferred.tolerance && context.application) {
        const toleranceGuess = this._inferToleranceFromApplication(context.application);
        if (toleranceGuess) {
          inferred.tolerance = toleranceGuess.tolerance;
          inferences.push({
            field: 'tolerance',
            value: toleranceGuess.tolerance,
            confidence: toleranceGuess.confidence,
            reason: toleranceGuess.reason
          });
        }
      }
      // Infer finish from application
      if (!inferred.finish && context.application) {
        const finishGuess = this._inferFinishFromApplication(context.application);
        if (finishGuess) {
          inferred.finish = finishGuess.finish;
          inferences.push({
            field: 'finish',
            value: finishGuess.finish,
            confidence: finishGuess.confidence,
            reason: finishGuess.reason
          });
        }
      }
      // Infer quantity from context
      if (!inferred.quantity) {
        if (context.jobType === 'prototype') {
          inferred.quantity = 1;
          inferences.push({ field: 'quantity', value: 1, confidence: 100, reason: 'Prototype job' });
        } else if (context.jobType === 'production') {
          inferred.quantity = 100;
          inferences.push({ field: 'quantity', value: 100, confidence: 50, reason: 'Production job - assumed batch size' });
        }
      }
      return {
        input: inferred,
        inferences,
        overallConfidence: inferences.length > 0 ?
          Math.round(inferences.reduce((sum, i) => sum + i.confidence, 0) / inferences.length) : 100
      };
    },
    _inferMaterialFromName(name) {
      const nameLower = name.toLowerCase();

      const patterns = [
        { pattern: /bracket|mount|frame/i, material: 'aluminum_6061', confidence: 100, reason: 'Structural part typically aluminum' },
        { pattern: /housing|enclosure|case/i, material: 'aluminum_6061', confidence: 65, reason: 'Enclosure typically aluminum' },
        { pattern: /shaft|axle|spindle/i, material: 'steel_4140', confidence: 100, reason: 'Rotating part typically alloy steel' },
        { pattern: /gear|pinion|sprocket/i, material: 'steel_4340', confidence: 100, reason: 'Power transmission typically hardened steel' },
        { pattern: /fitting|valve|manifold/i, material: 'brass', confidence: 100, reason: 'Fluid handling often brass' },
        { pattern: /implant|medical|surgical/i, material: 'titanium_6al4v', confidence: 100, reason: 'Medical implant typically titanium' },
        { pattern: /aerospace|aircraft|wing/i, material: 'aluminum_7075', confidence: 100, reason: 'Aerospace typically 7000 series aluminum' },
        { pattern: /marine|boat|underwater/i, material: 'stainless_316', confidence: 100, reason: 'Marine environment requires corrosion resistance' }
      ];

      for (const { pattern, material, confidence, reason } of patterns) {
        if (pattern.test(nameLower)) {
          return { material, confidence, reason };
        }
      }
      return null;
    },
    _inferMaterialFromIndustry(industry) {
      const industryMap = {
        'aerospace': { material: 'aluminum_7075', confidence: 100, reason: 'Aerospace industry standard' },
        'automotive': { material: 'steel_4140', confidence: 65, reason: 'Automotive industry common material' },
        'medical': { material: 'stainless_316', confidence: 100, reason: 'Medical industry requires biocompatibility' },
        'oil_gas': { material: 'inconel_625', confidence: 100, reason: 'Oil & gas requires corrosion/heat resistance' },
        'electronics': { material: 'aluminum_6061', confidence: 65, reason: 'Electronics enclosures typically aluminum' },
        'defense': { material: 'steel_4340', confidence: 60, reason: 'Defense applications often require high strength steel' }
      };
      return industryMap[industry.toLowerCase()] || null;
    },
    _inferToleranceFromApplication(application) {
      const toleranceMap = {
        'prototype': { tolerance: 0.005, confidence: 100, reason: 'Prototype - standard tolerance' },
        'display': { tolerance: 0.010, confidence: 100, reason: 'Display model - loose tolerance' },
        'functional': { tolerance: 0.003, confidence: 100, reason: 'Functional part - moderate tolerance' },
        'precision': { tolerance: 0.001, confidence: 100, reason: 'Precision application' },
        'bearing': { tolerance: 0.0005, confidence: 100, reason: 'Bearing fit requires tight tolerance' },
        'press_fit': { tolerance: 0.0005, confidence: 100, reason: 'Press fit requires tight tolerance' },
        'slip_fit': { tolerance: 0.002, confidence: 100, reason: 'Slip fit tolerance' }
      };
      return toleranceMap[application.toLowerCase()] || null;
    },
    _inferFinishFromApplication(application) {
      const finishMap = {
        'prototype': { finish: 125, confidence: 100, reason: 'Prototype - standard finish' },
        'display': { finish: 32, confidence: 100, reason: 'Display model needs good appearance' },
        'functional': { finish: 63, confidence: 100, reason: 'Functional part - moderate finish' },
        'sealing': { finish: 32, confidence: 100, reason: 'Sealing surface requires fine finish' },
        'bearing': { finish: 16, confidence: 100, reason: 'Bearing surface requires fine finish' },
        'decorative': { finish: 16, confidence: 100, reason: 'Decorative finish required' }
      };
      return finishMap[application.toLowerCase()] || null;
    }
  },
  // 8. EDGE CASE HANDLER - Special Logic for Unusual Situations

  edgeCases: {
    /**
     * Detect if situation is an edge case
     */
    detect(input, context) {
      const edgeCases = [];

      // Check for unusual material
      if (input.material && !this._isCommonMaterial(input.material)) {
        edgeCases.push({
          type: 'unusual_material',
          severity: 'medium',
          description: `${input.material} is not a common material - parameters may need verification`,
          suggestion: 'Start with conservative parameters and adjust'
        });
      }
      // Check for extreme aspect ratios
      if (input.dimensions) {
        const aspectRatio = this._calculateAspectRatio(input.dimensions);
        if (aspectRatio > 10) {
          edgeCases.push({
            type: 'extreme_aspect_ratio',
            severity: 'high',
            description: `Aspect ratio of ${aspectRatio}:1 may cause vibration or deflection`,
            suggestion: 'Use support or multiple operations'
          });
        }
      }
      // Check for tight tolerance on thin walls
      if (input.tolerance && input.wallThickness) {
        if (input.tolerance < 0.002 && input.wallThickness < 0.100) {
          edgeCases.push({
            type: 'thin_wall_tolerance',
            severity: 'high',
            description: 'Tight tolerance on thin wall - deflection likely',
            suggestion: 'Consider stress relief, light cuts, or support'
          });
        }
      }
      // Check for deep pocket
      if (input.pocketDepth && input.pocketWidth) {
        const depthRatio = input.pocketDepth / input.pocketWidth;
        if (depthRatio > 4) {
          edgeCases.push({
            type: 'deep_pocket',
            severity: 'medium',
            description: `Pocket depth ratio of ${depthRatio}:1 requires long tool`,
            suggestion: 'Use stepped approach or longer tool'
          });
        }
      }
      // Check for very small features
      if (input.minFeatureSize && input.minFeatureSize < 0.030) {
        edgeCases.push({
          type: 'micro_features',
          severity: 'high',
          description: `Feature size ${input.minFeatureSize}" requires micro tooling`,
          suggestion: 'Use micro end mills, high RPM, light cuts'
        });
      }
      // Check for conflicting materials (multi-material)
      if (input.materials && input.materials.length > 1) {
        const conflicts = this._checkMaterialCompatibility(input.materials);
        if (conflicts.length > 0) {
          edgeCases.push({
            type: 'multi_material',
            severity: 'medium',
            description: 'Multiple materials require different cutting parameters',
            suggestion: 'Program separate operations for each material'
          });
        }
      }
      return {
        hasEdgeCases: edgeCases.length > 0,
        edgeCases,
        overallSeverity: this._calculateOverallSeverity(edgeCases)
      };
    },
    /**
     * Get special handling instructions for edge cases
     */
    getHandling(edgeCases) {
      const handling = [];

      for (const ec of edgeCases) {
        switch (ec.type) {
          case 'unusual_material':
            handling.push({
              action: 'Use interpolation engine for cutting parameters',
              method: () => PRISM_INTELLIGENT_DECISION_ENGINE.interpolation.interpolateMaterial
            });
            break;

          case 'extreme_aspect_ratio':
            handling.push({
              action: 'Apply vibration-reduction strategy',
              params: {
                reduceFeed: 0.7,
                reduceDoc: 0.5,
                addSpringPasses: true
              }
            });
            break;

          case 'thin_wall_tolerance':
            handling.push({
              action: 'Apply thin-wall machining strategy',
              params: {
                useClimbMilling: true,
                reduceWoc: 0.3,
                addFinishPasses: 2,
                considerStressRelief: true
              }
            });
            break;

          case 'deep_pocket':
            handling.push({
              action: 'Apply deep pocket strategy',
              params: {
                useHelixEntry: true,
                stepDownRatio: 0.5, // 50% of tool diameter
                reduceWoc: 0.4,
                useLongTool: true
              }
            });
            break;

          case 'micro_features':
            handling.push({
              action: 'Apply micro machining strategy',
              params: {
                useHighRPM: true,
                minRPM: 20000,
                reduceFeed: 0.5,
                chipLoadMin: 0.0001
              }
            });
            break;
        }
      }
      return handling;
    },
    _isCommonMaterial(material) {
      const commonMaterials = [
        'aluminum_6061', 'aluminum_7075', 'aluminum_2024',
        'steel_1018', 'steel_4140', 'steel_4340',
        'stainless_304', 'stainless_316', 'stainless_17-4',
        'brass', 'copper', 'bronze',
        'titanium_6al4v', 'inconel_718'
      ];

      return commonMaterials.some(m => material.toLowerCase().includes(m.replace('_', '')));
    },
    _calculateAspectRatio(dimensions) {
      const { length = 1, width = 1, height = 1 } = dimensions;
      const sorted = [length, width, height].sort((a, b) => b - a);
      return sorted[0] / sorted[2]; // Longest / shortest
    },
    _checkMaterialCompatibility(materials) {
      const conflicts = [];

      // Check for materials needing very different parameters
      const hasAluminum = materials.some(m => m.toLowerCase().includes('aluminum'));
      const hasSteel = materials.some(m => m.toLowerCase().includes('steel'));
      const hasTitanium = materials.some(m => m.toLowerCase().includes('titanium'));

      if (hasAluminum && hasSteel) {
        conflicts.push({ materials: ['aluminum', 'steel'], reason: 'Very different SFM requirements' });
      }
      if (hasTitanium && hasAluminum) {
        conflicts.push({ materials: ['titanium', 'aluminum'], reason: 'Different coolant and speed requirements' });
      }
      return conflicts;
    },
    _calculateOverallSeverity(edgeCases) {
      if (edgeCases.length === 0) return 'none';

      const severities = edgeCases.map(ec => ec.severity);
      if (severities.includes('critical')) return 'critical';
      if (severities.includes('high')) return 'high';
      if (severities.includes('medium')) return 'medium';
      return 'low';
    }
  },
  // MASTER DECISION FUNCTION

  /**
   * Make an intelligent decision with full confidence scoring and reasoning
   */
  makeDecision(type, input, context = {}) {
    console.log('[INTELLIGENT_DECISION] Making decision:', type);

    const result = {
      type,
      input,
      decision: null,
      confidence: null,
      reasoning: null,
      alternatives: [],
      warnings: [],
      edgeCaseHandling: null
    };
    // Step 1: Check data quality and infer missing info
    const dataAssessment = this.confidence.assessDataQuality(input);

    if (dataAssessment.missingRequired.length > 0 && context) {
      // Try to infer missing data
      const inferred = this.inference.inferMissing(input, context);
      input = inferred.input;

      if (inferred.inferences.length > 0) {
        result.warnings.push({
          type: 'inferred_data',
          message: `Inferred: ${inferred.inferences.map(i => i.field).join(', ')}`,
          details: inferred.inferences
        });
      }
    }
    // Step 2: Detect edge cases
    const edgeCaseAnalysis = this.edgeCases.detect(input, context);

    if (edgeCaseAnalysis.hasEdgeCases) {
      result.edgeCaseHandling = this.edgeCases.getHandling(edgeCaseAnalysis.edgeCases);
      result.warnings.push({
        type: 'edge_case',
        message: `Detected ${edgeCaseAnalysis.edgeCases.length} edge case(s)`,
        severity: edgeCaseAnalysis.overallSeverity,
        details: edgeCaseAnalysis.edgeCases
      });
    }
    // Step 3: Check constraints
    const constraintAnalysis = this.constraints.analyze(input);

    if (constraintAnalysis.conflicts.length > 0) {
      const resolutions = this.constraints.resolve(constraintAnalysis.conflicts, context.priorities || {});
      result.warnings.push({
        type: 'constraint_conflict',
        message: `${constraintAnalysis.conflicts.length} constraint conflict(s) detected`,
        resolutions
      });
    }
    // Step 4: Get learned adjustments
    const learnedAdjustments = this.learning.getLearnedAdjustments(type, context);

    // Step 5: Make the actual decision based on type
    const reasoning = this.reasoning.createChain({ name: type });

    switch (type) {
      case 'tool_selection':
        result.decision = this._decideToolSelection(input, context, learnedAdjustments, reasoning);
        break;

      case 'feeds_speeds':
        result.decision = this._decideFeedsSpeeds(input, context, learnedAdjustments, reasoning);
        break;

      case 'strategy':
        result.decision = this._decideStrategy(input, context, learnedAdjustments, reasoning);
        break;

      case 'operation_sequence':
        result.decision = this._decideOperationSequence(input, context, learnedAdjustments, reasoning);
        break;

      default:
        result.decision = this._decideGeneric(type, input, context, learnedAdjustments, reasoning);
    }
    // Step 6: Calculate confidence
    result.confidence = this.confidence.calculate({
      dataQuality: dataAssessment.quality,
      matchQuality: result.decision?.matchScore || 0.7,
      experienceData: learnedAdjustments.hasAdjustments ? 0.9 : 0.5,
      constraintsSatisfied: constraintAnalysis.violated.length === 0 ? 1.0 : 0.6,
      edgeCaseFactor: edgeCaseAnalysis.hasEdgeCases ? 0.7 : 1.0
    });

    // Step 7: Finalize reasoning
    reasoning.conclusion = result.decision?.summary || 'Decision made';
    reasoning.confidence = result.confidence.score;
    result.reasoning = reasoning;

    console.log('[INTELLIGENT_DECISION] Confidence:', result.confidence.score + '%');

    return result;
  },
  // Decision implementations
  _decideToolSelection(input, context, learned, reasoning) {
    this.reasoning.addStep(reasoning, {
      action: 'Analyze tool requirements',
      reason: `Operation: ${input.operation}, Material: ${input.material}`
    });

    // Get candidates from manufacturer connector
    let candidates = [];
    if (typeof PRISM_MANUFACTURER_CONNECTOR !== 'undefined') {
      const search = PRISM_MANUFACTURER_CONNECTOR.findTools({
        type: input.toolType || 'endmill',
        diameter: input.diameter,
        material: input.material
      });
      candidates = search.tools;
    }
    this.reasoning.addStep(reasoning, {
      action: `Found ${candidates.length} candidate tools`,
      reason: 'Searched manufacturer catalogs'
    });

    // Apply learned preferences
    if (learned.hasAdjustments && learned.adjustments.factor?.preferredManufacturer) {
      candidates = candidates.filter(c =>
        c.manufacturer.toLowerCase().includes(learned.adjustments.factor.preferredManufacturer)
      );

      this.reasoning.addStep(reasoning, {
        action: 'Applied manufacturer preference',
        reason: 'User has shown preference for specific manufacturer'
      });
    }
    // Score and rank
    const scored = candidates.map(c => ({
      ...c,
      finalScore: c.score * (learned.hasAdjustments ? learned.adjustments.factor.score || 1 : 1)
    }));

    scored.sort((a, b) => b.finalScore - a.finalScore);

    const selected = scored[0] || null;

    this.reasoning.addStep(reasoning, {
      action: `Selected: ${selected?.name || 'None'}`,
      reason: selected ? `Highest score: ${selected.finalScore}` : 'No suitable tool found'
    });

    return {
      tool: selected,
      alternatives: scored.slice(1, 4),
      matchScore: selected ? selected.finalScore / 100 : 0,
      summary: selected ? `Selected ${selected.name} from ${selected.manufacturer}` : 'No tool found'
    };
  },
  _decideFeedsSpeeds(input, context, learned, reasoning) {
    const { material, tool, operation, machine } = input;

    this.reasoning.addStep(reasoning, {
      action: 'Get base cutting parameters',
      reason: `Material: ${material}, Tool: ${tool?.diameter || 'unknown'}`
    });

    // Base parameters
    let params = {
      sfm: 500,
      chipLoad: 0.003,
      doc: 0.1,
      woc: 0.3
    };
    // Get from material database if available
    if (typeof MATERIAL_DATABASE !== 'undefined' && material) {
      const matData = MATERIAL_DATABASE.find(m => m.name.toLowerCase().includes(material.toLowerCase()));
      if (matData) {
        params.sfm = matData.sfm || params.sfm;
        params.chipLoad = matData.chipLoad || params.chipLoad;
      }
    }
    // If material unknown, use interpolation
    if (!params.sfm || params.sfm === 500) {
      const interpolated = this.interpolation.interpolateMaterial(material, {
        aluminum_6061: { sfm: 800, chipLoad: 0.004 },
        steel_4140: { sfm: 350, chipLoad: 0.003 },
        stainless_304: { sfm: 200, chipLoad: 0.002 },
        titanium_6al4v: { sfm: 120, chipLoad: 0.002 }
      });

      if (interpolated.success) {
        params.sfm = interpolated.interpolated.sfm || params.sfm;
        params.chipLoad = interpolated.interpolated.chipLoad || params.chipLoad;

        this.reasoning.addStep(reasoning, {
          action: 'Interpolated material parameters',
          reason: `Based on: ${interpolated.basedOn.join(', ')}`
        });
      }
    }
    // Calculate RPM
    const toolDia = tool?.diameter || 0.5;
    params.rpm = Math.round((params.sfm * 3.82) / toolDia);

    // Calculate feed
    const flutes = tool?.flutes || 4;
    params.feed = Math.round(params.rpm * params.chipLoad * flutes);

    // Apply learned adjustments
    if (learned.hasAdjustments) {
      if (learned.adjustments.factor?.rpm) {
        params.rpm = Math.round(params.rpm * learned.adjustments.factor.rpm);
      }
      if (learned.adjustments.factor?.feed) {
        params.feed = Math.round(params.feed * learned.adjustments.factor.feed);
      }
      this.reasoning.addStep(reasoning, {
        action: 'Applied learned adjustments',
        reason: 'Based on previous user feedback'
      });
    }
    // Check machine limits
    if (machine?.maxRPM && params.rpm > machine.maxRPM) {
      params.rpm = machine.maxRPM;
      params.feed = Math.round(params.rpm * params.chipLoad * flutes);

      this.reasoning.addStep(reasoning, {
        action: 'Limited by machine max RPM',
        reason: `Machine max: ${machine.maxRPM}`
      });
    }
    return {
      params,
      matchScore: 0.8,
      summary: `RPM: ${params.rpm}, Feed: ${params.feed} IPM`
    };
  },
  _decideStrategy(input, context, learned, reasoning) {
    const { features, material, machine } = input;

    this.reasoning.addStep(reasoning, {
      action: 'Analyze features for strategy',
      reason: `${features?.length || 0} features to machine`
    });

    let strategy = {
      roughing: 'adaptive',
      finishing: 'contour',
      order: []
    };
    // Determine roughing strategy based on material
    const materialLower = (material || '').toLowerCase();

    if (materialLower.includes('titanium') || materialLower.includes('inconel')) {
      strategy.roughing = 'light_high_speed';

      this.reasoning.addStep(reasoning, {
        action: 'Selected light high-speed roughing',
        reason: 'Hard material requires light cuts at high speed'
      });
    } else if (materialLower.includes('aluminum')) {
      strategy.roughing = 'aggressive_hsr';

      this.reasoning.addStep(reasoning, {
        action: 'Selected aggressive HSR roughing',
        reason: 'Aluminum allows aggressive material removal'
      });
    }
    // Determine operation order
    strategy.order = ['face', 'rough', 'semifinish', 'finish', 'drill', 'tap', 'chamfer'];

    return {
      strategy,
      matchScore: 0.85,
      summary: `${strategy.roughing} roughing, ${strategy.finishing} finishing`
    };
  },
  _decideOperationSequence(input, context, learned, reasoning) {
    const { features, machine } = input;

    // Default sequence
    const sequence = [
      { order: 1, type: 'face', reason: 'Create reference surface' },
      { order: 2, type: 'rough', reason: 'Remove bulk material' },
      { order: 3, type: 'semifinish', reason: 'Prepare for finishing' },
      { order: 4, type: 'finish', reason: 'Final dimensions and surface' },
      { order: 5, type: 'drill', reason: 'Hole features' },
      { order: 6, type: 'tap', reason: 'Threaded features' },
      { order: 7, type: 'chamfer', reason: 'Edge breaks' }
    ];

    return {
      sequence,
      matchScore: 0.9,
      summary: `${sequence.length} operations in standard sequence`
    };
  },
  _decideGeneric(type, input, context, learned, reasoning) {
    this.reasoning.addStep(reasoning, {
      action: `Processing generic decision: ${type}`,
      reason: 'Using default decision logic'
    });

    return {
      result: input,
      matchScore: 0.6,
      summary: `Generic decision for ${type}`
    };
  },
  // INITIALIZATION

  init() {
    console.log('[PRISM_INTELLIGENT_DECISION_ENGINE] v1.0 initializing...');

    // Register with existing systems
    if (typeof SMART_AUTO_PROGRAM_GENERATOR !== 'undefined') {
      SMART_AUTO_PROGRAM_GENERATOR.intelligentDecision = this.makeDecision.bind(this);
      console.log('  ✓ Integrated with SMART_AUTO_PROGRAM_GENERATOR');
    }
    if (typeof PRISM_INTELLIGENT_MACHINING_MODE !== 'undefined') {
      PRISM_INTELLIGENT_MACHINING_MODE.intelligentDecision = this.makeDecision.bind(this);
      console.log('  ✓ Integrated with PRISM_INTELLIGENT_MACHINING_MODE');
    }
    if (typeof PRISM_DATABASE_HUB !== 'undefined') {
      PRISM_DATABASE_HUB.intelligentDecision = this;
      console.log('  ✓ Registered with PRISM_DATABASE_HUB');
    }
    // Update MODULE_REGISTRY
    if (typeof PRISM_MODULE_REGISTRY !== 'undefined') {
      PRISM_MODULE_REGISTRY.core['PRISM_INTELLIGENT_DECISION_ENGINE'] = {
        type: 'engine',
        category: 'ai',
        description: 'Intelligent decision making with confidence scoring and learning'
      };
    }
    console.log('[PRISM_INTELLIGENT_DECISION_ENGINE] Initialized with:');
    console.log('  - Confidence Scoring (0-100% with levels)');
    console.log('  - Multi-Criteria Optimization (Pareto optimal)');
    console.log('  - Interpolation Engine (unknown materials/tools)');
    console.log('  - Reasoning Chain (explainable decisions)');
    console.log('  - Constraint Solver (conflict resolution)');
    console.log('  - Feedback Learning (improves over time)');
    console.log('  - Context Inference (handles missing data)');
    console.log('  - Edge Case Handler (unusual situations)');

    return this;
  }
}