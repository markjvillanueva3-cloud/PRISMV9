/**
 * PRISM_MULTI_OBJECTIVE_OPTIMIZER
 * Extracted from PRISM v8.89.002 monolith
 * References: 19
 * Lines: 293
 * Session: R2.3.1 Engine Gap Extraction
 */

const PRISM_MULTI_OBJECTIVE_OPTIMIZER = {
  version: '1.0.0',

  // Default objective weights (user adjustable)
  defaultWeights: {
    cycleTime: 0.25,      // Minimize machining time
    toolLife: 0.20,       // Maximize tool life / minimize tool cost
    accuracy: 0.25,       // Meet tolerance requirements
    safety: 0.15,         // Avoid collisions, chatter, tool breakage
    surfaceFinish: 0.15   // Achieve target surface finish
  },
  // Preset weight profiles for common scenarios
  weightProfiles: {
    'production': {
      cycleTime: 0.40, toolLife: 0.25, accuracy: 0.15, safety: 0.10, surfaceFinish: 0.10,
      description: 'Maximize throughput, balance tool cost'
    },
    'prototype': {
      cycleTime: 0.15, toolLife: 0.10, accuracy: 0.35, safety: 0.25, surfaceFinish: 0.15,
      description: 'Prioritize accuracy and safety for one-off parts'
    },
    'finish_critical': {
      cycleTime: 0.10, toolLife: 0.15, accuracy: 0.25, safety: 0.10, surfaceFinish: 0.40,
      description: 'Surface finish is paramount (molds, medical)'
    },
    'tool_economy': {
      cycleTime: 0.20, toolLife: 0.40, accuracy: 0.15, safety: 0.15, surfaceFinish: 0.10,
      description: 'Minimize tool consumption for expensive tooling'
    },
    'safety_first': {
      cycleTime: 0.10, toolLife: 0.10, accuracy: 0.20, safety: 0.50, surfaceFinish: 0.10,
      description: 'Maximum safety for new setups or exotic materials'
    },
    'balanced': {
      cycleTime: 0.25, toolLife: 0.20, accuracy: 0.25, safety: 0.15, surfaceFinish: 0.15,
      description: 'Default balanced approach'
    }
  },
  /**
   * Select optimal toolpath strategy using multi-objective optimization
   * @param {Object} params - Input parameters
   * @returns {Object} Ranked strategies with scores
   */
  selectOptimalStrategy(params) {
    const {
      feature,              // Feature to machine
      material,             // Material being cut
      machine,              // Machine being used
      tool,                 // Tool selected
      targetRa = null,      // Target surface finish (μm)
      targetTolerance = null, // Target tolerance (mm)
      stockRemoval,         // Volume to remove (mm³)
      profile = 'balanced', // Weight profile to use
      customWeights = null  // Optional custom weights
    } = params;

    // Get weights
    const weights = customWeights || this.weightProfiles[profile] || this.defaultWeights;

    // Get candidate strategies from existing systems
    const candidates = this._getCandidateStrategies(feature, material, machine);

    if (candidates.length === 0) {
      return {
        success: false,
        message: 'No suitable strategies found for this feature/material combination',
        fallback: 'adaptive_clearing'
      };
    }
    // Score each candidate across all objectives
    const scoredCandidates = candidates.map(strategy => {
      const scores = this._scoreStrategy(strategy, {
        feature, material, machine, tool, targetRa, targetTolerance, stockRemoval
      });

      // Calculate weighted total
      const weightedScore =
        scores.cycleTime * weights.cycleTime +
        scores.toolLife * weights.toolLife +
        scores.accuracy * weights.accuracy +
        scores.safety * weights.safety +
        scores.surfaceFinish * weights.surfaceFinish;

      return {
        ...strategy,
        scores,
        weightedScore: Math.round(weightedScore * 100) / 100,
        weights
      };
    });

    // Sort by weighted score (higher is better)
    scoredCandidates.sort((a, b) => b.weightedScore - a.weightedScore);

    // Check for Pareto dominance
    const paretoFront = this._findParetoFront(scoredCandidates);

    return {
      success: true,
      optimal: scoredCandidates[0],
      alternatives: scoredCandidates.slice(1, 5),
      paretoFront,
      profile,
      weights,
      reasoning: this._generateReasoning(scoredCandidates[0], weights)
    };
  },
  /**
   * Get candidate strategies from existing PRISM systems
   */
  _getCandidateStrategies(feature, material, machine) {
    const candidates = [];

    // Get from INTELLIGENT_TOOLPATH_ENGINE
    if (typeof INTELLIGENT_TOOLPATH_ENGINE !== 'undefined') {
      const featureType = (feature.type || 'pocket').toLowerCase();
      const strategies = INTELLIGENT_TOOLPATH_ENGINE.constraints?.featureStrategies?.[featureType];
      if (strategies) {
        for (const [subtype, stratList] of Object.entries(strategies)) {
          for (const strat of stratList) {
            candidates.push({
              id: strat,
              source: 'INTELLIGENT_TOOLPATH_ENGINE',
              featureType,
              subtype
            });
          }
        }
      }
    }
    // Get from PRISM_INTELLIGENT_STRATEGY_SELECTOR
    if (typeof PRISM_INTELLIGENT_STRATEGY_SELECTOR !== 'undefined') {
      for (const [stratId, stratData] of Object.entries(PRISM_INTELLIGENT_STRATEGY_SELECTOR.strategies || {})) {
        const featureMatch = stratData.features?.some(f =>
          (feature.type || '').toLowerCase().includes(f) || f.includes((feature.type || '').toLowerCase())
        );
        if (featureMatch) {
          candidates.push({
            id: stratId,
            source: 'PRISM_INTELLIGENT_STRATEGY_SELECTOR',
            ...stratData
          });
        }
      }
    }
    // Get from MEGA_STRATEGY_LIBRARY
    if (typeof MEGA_STRATEGY_LIBRARY !== 'undefined') {
      const milling = MEGA_STRATEGY_LIBRARY.milling || {};
      for (const [stratId, stratData] of Object.entries(milling)) {
        candidates.push({
          id: stratId,
          source: 'MEGA_STRATEGY_LIBRARY',
          type: stratData.type,
          description: stratData.description
        });
      }
    }
    // Remove duplicates by id
    const seen = new Set();
    return candidates.filter(c => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
  },
  /**
   * Score a strategy across all objectives (0-1 scale, higher is better)
   */
  _scoreStrategy(strategy, params) {
    const { feature, material, machine, tool, targetRa, targetTolerance, stockRemoval } = params;

    // 1. CYCLE TIME SCORE
    const cycleTimeScore = this._scoreCycleTime(strategy, feature, material, tool, stockRemoval);

    // 2. TOOL LIFE SCORE
    const toolLifeScore = this._scoreToolLife(strategy, material, tool);

    // 3. ACCURACY SCORE
    const accuracyScore = this._scoreAccuracy(strategy, targetTolerance);

    // 4. SAFETY SCORE
    const safetyScore = this._scoreSafety(strategy, material, machine, tool);

    // 5. SURFACE FINISH SCORE
    const surfaceFinishScore = this._scoreSurfaceFinish(strategy, targetRa, tool);

    return {
      cycleTime: cycleTimeScore,
      toolLife: toolLifeScore,
      accuracy: accuracyScore,
      safety: safetyScore,
      surfaceFinish: surfaceFinishScore
    };
  },
  /**
   * Cycle time scoring - faster strategies score higher
   */
  _scoreCycleTime(strategy, feature, material, tool, stockRemoval) {
    // Relative MRR factors by strategy type
    const mrrFactors = {
      'adaptive_clearing': 1.0,
      'adaptive': 1.0,
      'volumill': 0.95,
      'dynamic_mill': 0.95,
      'trochoidal': 0.7,
      'trochoidal_pocket': 0.7,
      'peel_mill': 0.65,
      'plunge_rough': 0.6,
      'pocket': 0.5,
      '2d_pocket': 0.5,
      'parallel': 0.4,
      'waterline': 0.35,
      'contour': 0.3,
      'scallop': 0.25,
      'pencil': 0.2,
      'rest': 0.3
    };
    const factor = mrrFactors[strategy.id] || 0.5;
    return factor;
  },
  /**
   * Tool life scoring - strategies easier on tools score higher
   */
  _scoreToolLife(strategy, material, tool) {
    // Strategies that are easier on tools
    const toolLifeFactors = {
      'trochoidal': 0.95,      // Low engagement = long life
      'trochoidal_pocket': 0.95,
      'adaptive_clearing': 0.85, // Constant engagement
      'adaptive': 0.85,
      'peel_mill': 0.8,
      'dynamic_mill': 0.8,
      'volumill': 0.8,
      'parallel': 0.7,
      'contour': 0.7,
      'waterline': 0.75,
      'scallop': 0.75,
      'pocket': 0.5,           // Full slotting = hard on tools
      'plunge_rough': 0.6,
      'pencil': 0.8,
      'rest': 0.85
    };
    let score = toolLifeFactors[strategy.id] || 0.6;

    // Material difficulty adjustment
    const materialDifficulty = {
      'aluminum': 1.0,
      'steel': 0.85,
      'stainless': 0.7,
      'titanium': 0.55,
      'inconel': 0.4,
      'hardened': 0.5
    };
    const matClass = this._getMaterialClass(material);
    score *= materialDifficulty[matClass] || 0.7;

    return Math.min(score, 1.0);
  },
  /**
   * Accuracy scoring - strategies that maintain tolerance score higher
   */
  _scoreAccuracy(strategy, targetTolerance) {
    // Achievable tolerances by strategy (mm)
    const achievableTolerances = {
      'contour': 0.01,
      'parallel': 0.02,
      'scallop': 0.015,
      'waterline': 0.02,
      'pencil': 0.015,
      'adaptive': 0.05,
      'adaptive_clearing': 0.05,
      'volumill': 0.05,
      'trochoidal': 0.03,
      'pocket': 0.04,
      'plunge_rough': 0.1,
      'rest': 0.02
    };
    const achievable = achievableTolerances[strategy.id] || 0.05;

    if (!targetTolerance) return 0.7; // Default if no target specified

    // Score based on how much margin we have
    if (achievable <= targetTolerance * 0.5) return 1.0;  // Easily achieved
    if (achievable <= targetTolerance) return 0.8;        // Can achieve
    if (achievable <= targetTolerance * 1.5) return 0.5;  // Marginal
    return 0.2;  // Unlikely to achieve
  },
  /**
   * Safety scoring - considers collision risk, chatter, tool breakage
   */
  _scoreSafety(strategy, material, machine, tool) {
    // Base safety scores
    const baseSafety =