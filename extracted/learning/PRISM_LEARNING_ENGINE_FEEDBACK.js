// PRISM_LEARNING_ENGINE_FEEDBACK - Lines 362796-363194 (399 lines) - Learning feedback engine\n\nconst PRISM_LEARNING_ENGINE_FEEDBACK = {
  version: '1.0.0',
  lastUpdated: '2026-01-06',

  // Feedback storage
  feedbackHistory: [],
  maxHistorySize: 1000,

  /**
   * Record job completion feedback
   */
  recordJobFeedback(job) {
    const feedback = {
      timestamp: new Date().toISOString(),
      jobId: job.id || this._generateJobId(),

      // Part information
      part: {
        material: job.material,
        features: job.features?.map(f => f.type) || [],
        complexity: job.complexity || 'medium',
        volume: job.volume
      },
      // Tooling used
      tools: job.tools?.map(t => ({
        type: t.type,
        diameter: t.diameter,
        manufacturer: t.manufacturer,
        coating: t.coating
      })) || [],

      // Machine used
      machine: {
        type: job.machine?.type,
        manufacturer: job.machine?.manufacturer,
        controller: job.machine?.controller
      },
      // Parameters used
      parameters: {
        strategies: job.strategies || [],
        avgRPM: job.avgRPM,
        avgFeed: job.avgFeed,
        avgDOC: job.avgDOC,
        avgWOC: job.avgWOC,
        usedFullLoc: job.usedFullLoc
      },
      // Results
      results: {
        cycleTime: job.cycleTime,
        actualVsEstimated: job.actualCycleTime / (job.estimatedCycleTime || 1),
        toolWear: job.toolWear || 'normal',
        surfaceQuality: job.surfaceQuality || 'acceptable',
        dimensionalAccuracy: job.dimensionalAccuracy || 'in_tolerance',
        scrapped: job.scrapped || false
      },
      // User rating
      rating: job.rating || 3, // 1-5 scale
      notes: job.notes || ''
    };
    this.feedbackHistory.push(feedback);

    // Trim history if needed
    if (this.feedbackHistory.length > this.maxHistorySize) {
      this.feedbackHistory = this.feedbackHistory.slice(-this.maxHistorySize);
    }
    // Update learning engine
    this._updateLearningEngine(feedback);

    // Save to storage
    this._saveFeedback();

    return feedback;
  },
  /**
   * Get recommendations based on historical feedback
   */
  getRecommendations(newJob) {
    const similarJobs = this._findSimilarJobs(newJob);

    if (similarJobs.length === 0) {
      return {
        confidence: 'low',
        source: 'default_parameters',
        recommendations: null
      };
    }
    // Analyze successful jobs
    const successfulJobs = similarJobs.filter(j =>
      j.results.rating >= 4 &&
      !j.results.scrapped &&
      j.results.surfaceQuality !== 'poor'
    );

    if (successfulJobs.length === 0) {
      return {
        confidence: 'low',
        source: 'insufficient_positive_data',
        recommendations: null
      };
    }
    // Calculate optimal parameters from successful jobs
    const avgParams = this._averageParameters(successfulJobs);

    return {
      confidence: successfulJobs.length >= 5 ? 'high' :
                  successfulJobs.length >= 3 ? 'medium' : 'low',
      source: 'historical_success',
      sampleSize: successfulJobs.length,
      recommendations: {
        strategies: this._getMostCommonStrategies(successfulJobs),
        rpm: avgParams.avgRPM,
        feed: avgParams.avgFeed,
        doc: avgParams.avgDOC,
        woc: avgParams.avgWOC,
        useLoc: avgParams.usedFullLoc,
        tools: this._getMostSuccessfulTools(successfulJobs)
      },
      warnings: this._getWarningsFromHistory(similarJobs)
    };
  },
  /**
   * Get parameter adjustments based on feedback
   */
  getParameterAdjustments(material, operation, tool) {
    const relevantFeedback = this.feedbackHistory.filter(f =>
      this._matchesMaterial(f.part.material, material) &&
      f.parameters.strategies?.includes(operation)
    );

    if (relevantFeedback.length < 3) {
      return null; // Not enough data
    }
    // Analyze patterns
    const successfulParams = relevantFeedback
      .filter(f => f.results.rating >= 4)
      .map(f => f.parameters);

    const failedParams = relevantFeedback
      .filter(f => f.results.rating <= 2 || f.results.scrapped)
      .map(f => f.parameters);

    return {
      recommendedAdjustments: this._analyzePatterns(successfulParams, failedParams),
      confidence: successfulParams.length >= 5 ? 'high' : 'medium',
      basedOn: successfulParams.length + ' successful jobs'
    };
  },
  /**
   * Submit quick feedback from UI
   */
  submitQuickFeedback(jobId, rating, quickNotes) {
    const existingIndex = this.feedbackHistory.findIndex(f => f.jobId === jobId);

    if (existingIndex >= 0) {
      this.feedbackHistory[existingIndex].rating = rating;
      this.feedbackHistory[existingIndex].notes = quickNotes;
    } else {
      // Create minimal feedback entry
      this.feedbackHistory.push({
        timestamp: new Date().toISOString(),
        jobId: jobId,
        rating: rating,
        notes: quickNotes,
        minimal: true
      });
    }
    this._saveFeedback();

    return { success: true, jobId: jobId };
  },
  /**
   * Get learning statistics
   */
  getStatistics() {
    const total = this.feedbackHistory.length;
    const successful = this.feedbackHistory.filter(f => f.rating >= 4).length;
    const failed = this.feedbackHistory.filter(f => f.rating <= 2).length;

    return {
      totalJobs: total,
      successRate: total > 0 ? (successful / total * 100).toFixed(1) + '%' : 'N/A',
      failureRate: total > 0 ? (failed / total * 100).toFixed(1) + '%' : 'N/A',

      byMaterial: this._groupByMaterial(),
      byOperation: this._groupByOperation(),

      topPerformingTools: this._getTopTools(),
      commonIssues: this._getCommonIssues(),

      lastUpdated: this.feedbackHistory.length > 0 ?
        this.feedbackHistory[this.feedbackHistory.length - 1].timestamp : null
    };
  },
  // PRIVATE METHODS

  _generateJobId() {
    return 'JOB_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  },
  _findSimilarJobs(newJob) {
    return this.feedbackHistory.filter(f => {
      // Match by material (required)
      if (!this._matchesMaterial(f.part?.material, newJob.material)) return false;

      // Match by complexity (optional)
      if (newJob.complexity && f.part?.complexity &&
          f.part.complexity !== newJob.complexity) return false;

      // Match by feature types (at least one common feature)
      if (newJob.features && f.part?.features) {
        const commonFeatures = newJob.features.filter(nf =>
          f.part.features.includes(nf.type || nf)
        );
        if (commonFeatures.length === 0) return false;
      }
      return true;
    });
  },
  _matchesMaterial(mat1, mat2) {
    if (!mat1 || !mat2) return false;

    const name1 = (typeof mat1 === 'string' ? mat1 : mat1.name || '').toLowerCase();
    const name2 = (typeof mat2 === 'string' ? mat2 : mat2.name || '').toLowerCase();

    // Direct match
    if (name1 === name2) return true;

    // Category match
    const cat1 = this._getMaterialCategory(name1);
    const cat2 = this._getMaterialCategory(name2);

    return cat1 === cat2;
  },
  _getMaterialCategory(name) {
    name = name.toLowerCase();
    if (name.includes('aluminum')) return 'aluminum';
    if (name.includes('steel') && !name.includes('stainless')) return 'steel';
    if (name.includes('stainless')) return 'stainless';
    if (name.includes('titanium')) return 'titanium';
    if (name.includes('inconel')) return 'inconel';
    return 'other';
  },
  _averageParameters(jobs) {
    const params = jobs.map(j => j.parameters).filter(p => p);

    if (params.length === 0) return {};

    return {
      avgRPM: Math.round(params.reduce((s, p) => s + (p.avgRPM || 0), 0) / params.length),
      avgFeed: Math.round(params.reduce((s, p) => s + (p.avgFeed || 0), 0) / params.length),
      avgDOC: parseFloat((params.reduce((s, p) => s + (p.avgDOC || 0), 0) / params.length).toFixed(3)),
      avgWOC: parseFloat((params.reduce((s, p) => s + (p.avgWOC || 0), 0) / params.length).toFixed(3)),
      usedFullLoc: params.filter(p => p.usedFullLoc).length > params.length / 2
    };
  },
  _getMostCommonStrategies(jobs) {
    const strategyCounts = {};

    jobs.forEach(j => {
      (j.parameters?.strategies || []).forEach(s => {
        strategyCounts[s] = (strategyCounts[s] || 0) + 1;
      });
    });

    return Object.entries(strategyCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([strategy, count]) => ({ strategy, count }));
  },
  _getMostSuccessfulTools(jobs) {
    const toolSuccess = {};

    jobs.forEach(j => {
      (j.tools || []).forEach(t => {
        const key = `${t.type}_${t.manufacturer || 'generic'}`;
        if (!toolSuccess[key]) {
          toolSuccess[key] = { tool: t, successCount: 0, totalCount: 0 };
        }
        toolSuccess[key].totalCount++;
        if (j.results?.rating >= 4) {
          toolSuccess[key].successCount++;
        }
      });
    });

    return Object.values(toolSuccess)
      .filter(ts => ts.totalCount >= 2)
      .sort((a, b) => (b.successCount / b.totalCount) - (a.successCount / a.totalCount))
      .slice(0, 5);
  },
  _getWarningsFromHistory(jobs) {
    const warnings = [];

    // Check for tool wear issues
    const wearIssues = jobs.filter(j => j.results?.toolWear === 'excessive');
    if (wearIssues.length > jobs.length * 0.2) {
      warnings.push('Historical data shows frequent tool wear issues with this setup');
    }
    // Check for surface quality issues
    const surfaceIssues = jobs.filter(j => j.results?.surfaceQuality === 'poor');
    if (surfaceIssues.length > jobs.length * 0.15) {
      warnings.push('Historical data shows occasional surface quality concerns');
    }
    return warnings;
  },
  _analyzePatterns(successfulParams, failedParams) {
    const adjustments = {};

    if (successfulParams.length === 0) return adjustments;

    // Compare average DOC
    const avgSuccessDOC = successfulParams.reduce((s, p) => s + (p.avgDOC || 0), 0) / successfulParams.length;
    const avgFailDOC = failedParams.length > 0 ?
      failedParams.reduce((s, p) => s + (p.avgDOC || 0), 0) / failedParams.length : avgSuccessDOC;

    if (avgFailDOC > avgSuccessDOC * 1.2) {
      adjustments.doc = { direction: 'reduce', target: avgSuccessDOC };
    }
    // Check if full LOC correlates with success
    const fullLocSuccess = successfulParams.filter(p => p.usedFullLoc).length / successfulParams.length;
    const fullLocFail = failedParams.length > 0 ?
      failedParams.filter(p => p.usedFullLoc).length / failedParams.length : fullLocSuccess;

    if (fullLocSuccess > 0.7 && fullLocFail < 0.5) {
      adjustments.loc = { recommendation: 'use_full_loc', confidence: 'high' };
    }
    return adjustments;
  },
  _updateLearningEngine(feedback) {
    // Integration with PRISM_CAM_LEARNING_ENGINE
    if (typeof PRISM_CAM_LEARNING_ENGINE !== 'undefined' &&
        typeof PRISM_CAM_LEARNING_ENGINE.learnFromJob === 'function') {
      PRISM_CAM_LEARNING_ENGINE.learnFromJob(feedback);
    }
  },
  _saveFeedback() {
    try {
      localStorage.setItem('PRISM_LEARNING_FEEDBACK', JSON.stringify(this.feedbackHistory));
    } catch (e) {
      console.warn('Could not save learning feedback:', e);
    }
  },
  _loadFeedback() {
    try {
      const saved = localStorage.getItem('PRISM_LEARNING_FEEDBACK');
      if (saved) {
        this.feedbackHistory = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Could not load learning feedback:', e);
    }
  },
  _groupByMaterial() {
    const groups = {};
    this.feedbackHistory.forEach(f => {
      const mat = this._getMaterialCategory(f.part?.material || 'unknown');
      if (!groups[mat]) groups[mat] = { total: 0, successful: 0 };
      groups[mat].total++;
      if (f.rating >= 4) groups[mat].successful++;
    });
    return groups;
  },
  _groupByOperation() {
    const groups = {};
    this.feedbackHistory.forEach(f => {
      (f.parameters?.strategies || ['unknown']).forEach(op => {
        if (!groups[op]) groups[op] = { total: 0, successful: 0 };
        groups[op].total++;
        if (f.rating >= 4) groups[op].successful++;
      });
    });
    return groups;
  },
  _getTopTools() {
    return this._getMostSuccessfulTools(this.feedbackHistory);
  },
  _getCommonIssues() {
    const issues = {};
    this.feedbackHistory.forEach(f => {
      if (f.results?.toolWear === 'excessive') {
        issues['excessive_tool_wear'] = (issues['excessive_tool_wear'] || 0) + 1;
      }
      if (f.results?.surfaceQuality === 'poor') {
        issues['poor_surface_finish'] = (issues['poor_surface_finish'] || 0) + 1;
      }
      if (f.results?.dimensionalAccuracy === 'out_of_tolerance') {
        issues['dimensional_issues'] = (issues['dimensional_issues'] || 0) + 1;
      }
      if (f.results?.scrapped) {
        issues['scrapped_parts'] = (issues['scrapped_parts'] || 0) + 1;
      }
    });
    return issues;
  },
  // Initialize on load
  init() {
    this._loadFeedback();
    return this;
  }
};
