/**
 * PRISM_CAD_CONFIDENCE_ENGINE
 * Extracted from PRISM v8.89.002 monolith
 * References: 12
 * Lines: 192
 * Session: R2.3.1 Wave 2 Engine Gap Extraction
 */

const PRISM_CAD_CONFIDENCE_ENGINE = {
  version: '3.0.0',

  // CONFIDENCE SCORING SYSTEM

  scores: {
    dimension: {
      clear_digital: 100,    // Clear digital text
      clean_ocr: 90,         // Clean OCR extraction
      fuzzy_ocr: 70,         // Fuzzy OCR extraction
      inferred: 50,          // Inferred from context
      missing: 0             // Missing dimension
    },
    feature: {
      complete: 100,         // All dimensions present
      partial: 75,           // Some dimensions missing
      inferred: 50,          // Dimensions inferred
      ambiguous: 25          // Ambiguous interpretation
    },
    correlation: {
      verified: 100,         // Cross-view verified
      single_view: 80,       // Only in one view
      inferred: 60,          // Position inferred
      uncertain: 30          // Uncertain placement
    },
    grades: {
      A: { min: 95, label: 'Excellent', color: '#22c55e' },
      B: { min: 85, label: 'Good', color: '#84cc16' },
      C: { min: 75, label: 'Acceptable', color: '#eab308' },
      D: { min: 60, label: 'Review Required', color: '#f97316' },
      F: { min: 0, label: 'Manual Input Needed', color: '#ef4444' }
    }
  },
  // CALCULATE OVERALL CONFIDENCE

  calculateOverallConfidence(analysis) {
    const weights = {
      dimensions: 0.35,
      features: 0.30,
      correlations: 0.20,
      completeness: 0.15
    };
    const dimensionScore = this._averageScore(analysis.dimensions || []);
    const featureScore = this._averageScore(analysis.features || []);
    const correlationScore = this._averageScore(analysis.correlations || []);
    const completenessScore = this._calculateCompleteness(analysis);

    const overall =
      dimensionScore * weights.dimensions +
      featureScore * weights.features +
      correlationScore * weights.correlations +
      completenessScore * weights.completeness;

    return {
      overall: Math.round(overall),
      grade: this._getGrade(overall),
      breakdown: {
        dimensions: Math.round(dimensionScore),
        features: Math.round(featureScore),
        correlations: Math.round(correlationScore),
        completeness: Math.round(completenessScore)
      },
      issues: this._identifyIssues(analysis),
      recommendations: this._generateRecommendations(analysis)
    };
  },
  _averageScore(items) {
    if (!items.length) return 0;
    return items.reduce((sum, item) => sum + (item.confidence || 0), 0) / items.length;
  },
  _calculateCompleteness(analysis) {
    let required = 0;
    let found = 0;

    // Check required elements
    const checks = [
      { name: 'overall_dimensions', weight: 3 },
      { name: 'material', weight: 2 },
      { name: 'tolerances', weight: 2 },
      { name: 'surface_finish', weight: 1 },
      { name: 'features', weight: 3 }
    ];

    for (const check of checks) {
      required += check.weight;
      if (analysis[check.name] && Object.keys(analysis[check.name]).length > 0) {
        found += check.weight;
      }
    }
    return (found / required) * 100;
  },
  _getGrade(score) {
    for (const [grade, data] of Object.entries(this.scores.grades)) {
      if (score >= data.min) {
        return { grade, ...data };
      }
    }
    return { grade: 'F', ...this.scores.grades.F };
  },
  _identifyIssues(analysis) {
    const issues = [];

    if (analysis.dimensions) {
      const lowConfidence = analysis.dimensions.filter(d => d.confidence < 70);
      if (lowConfidence.length > 0) {
        issues.push({
          type: 'warning',
          category: 'dimensions',
          message: `${lowConfidence.length} dimension(s) have low confidence`,
          items: lowConfidence.map(d => d.value)
        });
      }
    }
    if (analysis.correlations) {
      const uncertain = analysis.correlations.filter(c => c.confidence < 60);
      if (uncertain.length > 0) {
        issues.push({
          type: 'warning',
          category: 'correlations',
          message: 'Some view correlations are uncertain',
          recommendation: 'Verify feature alignment across views'
        });
      }
    }
    if (!analysis.material) {
      issues.push({
        type: 'info',
        category: 'material',
        message: 'Material not specified',
        recommendation: 'Using default material (6061-T6 Aluminum)'
      });
    }
    return issues;
  },
  _generateRecommendations(analysis) {
    const recommendations = [];

    const confidence = this._averageScore(analysis.dimensions || []);

    if (confidence < 80) {
      recommendations.push('Consider uploading a higher resolution drawing');
    }
    if (analysis.features?.some(f => f.type === 'thread' && !f.callout)) {
      recommendations.push('Verify thread callouts - some may be missing');
    }
    if (!analysis.tolerances || Object.keys(analysis.tolerances).length === 0) {
      recommendations.push('No tolerances detected - using standard machining tolerances (±0.005")');
    }
    return recommendations;
  },
  // VALIDATION AGAINST MANUFACTURING CONSTRAINTS

  validateManufacturability(cadModel, machineCapabilities) {
    const issues = [];

    // Check minimum feature sizes
    if (cadModel.features) {
      for (const feature of cadModel.features) {
        if (feature.type === 'hole' && feature.diameter < 0.020) {
          issues.push({
            type: 'error',
            feature: feature.id,
            message: `Hole diameter ${feature.diameter}" is below minimum (0.020")`
          });
        }
        if (feature.type === 'pocket' && feature.cornerRadius < 0.015) {
          issues.push({
            type: 'warning',
            feature: feature.id,
            message: `Corner radius ${feature.cornerRadius}" requires small end mill`
          });
        }
      }
    }
    // Check against machine envelope
    if (machineCapabilities && cadModel.boundingBox) {
      const [x, y, z] = cadModel.boundingBox;
      if (x > machineCapabilities.travelX ||
          y > machineCapabilities.travelY ||
          z > machineCapabilities.travelZ) {
        issues.push({
          type: 'error',
          message: 'Part exceeds machine work envelope'
        });
      }
    }
    return {
      valid: issues.filter(i => i.type === 'error').length === 0,
      issues
    };
  }
}