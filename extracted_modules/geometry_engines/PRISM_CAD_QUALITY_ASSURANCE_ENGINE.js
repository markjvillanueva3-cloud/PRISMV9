const PRISM_CAD_QUALITY_ASSURANCE_ENGINE = {
  version: '1.0.0',

  // Quality metrics thresholds
  thresholds: {
    minVerticesPerFace: 4,
    minTrianglesPerCurvedFace: 12,
    maxChordError: 0.02,          // mm
    maxAngleDeviation: 15,         // degrees
    minMeshDensity: 50,            // triangles per 100mm²
    targetSTEPEquivalence: 0.95    // 95% match to STEP import
  },
  /**
   * Validate generated CAD against quality standards
   */
  validate(model, reference = null) {
    const report = {
      passed: true,
      score: 0,
      totalChecks: 0,
      passedChecks: 0,
      issues: [],
      recommendations: [],
      metrics: {}
    };
    // 1. Topology validation
    const topoResult = this._validateTopology(model);
    report.metrics.topology = topoResult;
    report.totalChecks += topoResult.checks;
    report.passedChecks += topoResult.passed;
    if (!topoResult.valid) {
      report.passed = false;
      report.issues.push(...topoResult.issues);
    }
    // 2. Mesh quality validation
    const meshResult = this._validateMeshQuality(model);
    report.metrics.meshQuality = meshResult;
    report.totalChecks += meshResult.checks;
    report.passedChecks += meshResult.passed;
    if (!meshResult.valid) {
      report.issues.push(...meshResult.issues);
      report.recommendations.push(...meshResult.recommendations);
    }
    // 3. Geometry accuracy
    const geoResult = this._validateGeometry(model);
    report.metrics.geometry = geoResult;
    report.totalChecks += geoResult.checks;
    report.passedChecks += geoResult.passed;

    // 4. Compare to reference if provided
    if (reference) {
      const compareResult = this._compareToReference(model, reference);
      report.metrics.comparison = compareResult;
      report.totalChecks += compareResult.checks;
      report.passedChecks += compareResult.passed;

      if (compareResult.similarity < this.thresholds.targetSTEPEquivalence) {
        report.passed = false;
        report.issues.push({
          type: 'quality_gap',
          message: `Model similarity ${(compareResult.similarity*100).toFixed(1)}% below target ${(this.thresholds.targetSTEPEquivalence*100)}%`,
          severity: 'error'
        });
      }
    }
    // Calculate overall score
    report.score = report.totalChecks > 0 ?
      (report.passedChecks / report.totalChecks) * 100 : 0;

    return report;
  },
  /**
   * Validate B-Rep topology
   */
  _validateTopology(model) {
    const result = {
      valid: true,
      checks: 0,
      passed: 0,
      issues: []
    };
    // Check for required components
    const components = model.components || [model];

    for (const comp of components) {
      result.checks++;

      // Check solid exists
      if (comp.solid) {
        result.passed++;
      } else {
        result.issues.push({
          type: 'missing_solid',
          component: comp.name,
          severity: 'error'
        });
        result.valid = false;
      }
      // Check shell exists
      result.checks++;
      if (comp.shell) {
        result.passed++;
      } else {
        result.issues.push({
          type: 'missing_shell',
          component: comp.name,
          severity: 'error'
        });
        result.valid = false;
      }
      // Check faces exist
      result.checks++;
      if (comp.faces && comp.faces.length > 0) {
        result.passed++;
      } else {
        result.issues.push({
          type: 'no_faces',
          component: comp.name,
          severity: 'error'
        });
        result.valid = false;
      }
      // Check edges exist
      result.checks++;
      if (comp.edges && comp.edges.length > 0) {
        result.passed++;
      } else {
        result.issues.push({
          type: 'no_edges',
          component: comp.name,
          severity: 'warning'
        });
      }
      // Check vertices exist
      result.checks++;
      if (comp.vertices && comp.vertices.length > 0) {
        result.passed++;
      } else {
        result.issues.push({
          type: 'no_vertices',
          component: comp.name,
          severity: 'warning'
        });
      }
      // Check Euler characteristic (V - E + F = 2 for closed polyhedra)
      if (comp.vertices && comp.edges && comp.faces) {
        result.checks++;
        const euler = comp.vertices.length - comp.edges.length + comp.faces.length;
        if (euler === 2) {
          result.passed++;
        } else {
          result.issues.push({
            type: 'euler_violation',
            component: comp.name,
            expected: 2,
            actual: euler,
            severity: 'warning'
          });
        }
      }
    }
    return result;
  },
  /**
   * Validate mesh quality after tessellation
   */
  _validateMeshQuality(model) {
    const result = {
      valid: true,
      checks: 0,
      passed: 0,
      issues: [],
      recommendations: []
    };
    const stats = model.statistics || {};

    // Check vertex count
    result.checks++;
    if (stats.totalVertices > 1000) {
      result.passed++;
    } else if (stats.totalVertices > 100) {
      result.passed += 0.5;
      result.recommendations.push({
        type: 'low_vertex_count',
        message: 'Consider increasing tessellation quality',
        current: stats.totalVertices,
        recommended: 5000
      });
    } else {
      result.issues.push({
        type: 'insufficient_vertices',
        message: 'Model has too few vertices for high-quality rendering',
        current: stats.totalVertices,
        severity: 'warning'
      });
    }
    // Check face count
    result.checks++;
    if (stats.totalFaces > 50) {
      result.passed++;
    } else if (stats.totalFaces > 10) {
      result.passed += 0.5;
    } else {
      result.issues.push({
        type: 'insufficient_faces',
        severity: 'warning'
      });
    }
    return result;
  },
  /**
   * Validate geometric accuracy
   */
  _validateGeometry(model) {
    const result = {
      valid: true,
      checks: 0,
      passed: 0
    };
    // Check bounding box exists
    result.checks++;
    if (model.boundingBox) {
      result.passed++;
    }
    // Check dimensions are reasonable
    if (model.boundingBox) {
      const bb = model.boundingBox;
      const size = bb.size || {
        x: bb.dx || (bb.max?.x - bb.min?.x),
        y: bb.dy || (bb.max?.y - bb.min?.y),
        z: bb.dz || (bb.max?.z - bb.min?.z)
      };
      result.checks++;
      if (size.x > 0 && size.y > 0 && size.z > 0) {
        result.passed++;
      }
      // Check for reasonable machine dimensions (100mm to 5000mm)
      result.checks++;
      const maxDim = Math.max(size.x, size.y, size.z);
      if (maxDim >= 100 && maxDim <= 5000) {
        result.passed++;
      }
    }
    return result;
  },
  /**
   * Compare generated model to reference (e.g., STEP import)
   */
  _compareToReference(model, reference) {
    const result = {
      checks: 0,
      passed: 0,
      similarity: 0,
      metrics: {}
    };
    // Compare component counts
    const modelComps = model.components?.length || 1;
    const refComps = reference.components?.length || 1;

    result.checks++;
    const compRatio = Math.min(modelComps, refComps) / Math.max(modelComps, refComps);
    result.metrics.componentRatio = compRatio;
    if (compRatio > 0.5) result.passed++;

    // Compare vertex counts
    const modelVerts = model.statistics?.totalVertices || 0;
    const refVerts = reference.statistics?.totalVertices || 0;

    result.checks++;
    const vertRatio = Math.min(modelVerts, refVerts) / Math.max(modelVerts, refVerts);
    result.metrics.vertexRatio = vertRatio;
    if (vertRatio > 0.3) result.passed++;  // Allow lower ratio since parametric uses fewer

    // Compare bounding boxes
    if (model.boundingBox && reference.boundingBox) {
      result.checks++;

      const mbb = model.boundingBox;
      const rbb = reference.boundingBox;

      const mSize = mbb.size || { x: mbb.dx, y: mbb.dy, z: mbb.dz };
      const rSize = rbb.size || { x: rbb.dx, y: rbb.dy, z: rbb.dz };

      const sizeMatch = 1 - (
        Math.abs(mSize.x - rSize.x) / rSize.x +
        Math.abs(mSize.y - rSize.y) / rSize.y +
        Math.abs(mSize.z - rSize.z) / rSize.z
      ) / 3;

      result.metrics.sizeMatch = sizeMatch;
      if (sizeMatch > 0.8) result.passed++;
    }
    // Calculate overall similarity
    result.similarity = result.checks > 0 ? result.passed / result.checks : 0;

    return result;
  },
  /**
   * Generate quality improvement recommendations
   */
  getRecommendations(report) {
    const recommendations = [...report.recommendations];

    if (report.score < 90) {
      recommendations.push({
        priority: 'high',
        action: 'Increase tessellation segments for curved surfaces',
        impact: 'Will improve visual quality significantly'
      });
    }
    if (report.metrics.topology && !report.metrics.topology.valid) {
      recommendations.push({
        priority: 'critical',
        action: 'Fix B-Rep topology errors before export',
        impact: 'Required for valid STEP output'
      });
    }
    return recommendations;
  },
  init() {
    console.log('[PRISM_CAD_QUALITY_ASSURANCE_ENGINE] Initialized v' + this.version);
    console.log('  ✓ Topology validation');
    console.log('  ✓ Mesh quality assessment');
    console.log('  ✓ STEP equivalence comparison');
    window.PRISM_CAD_QUALITY_ASSURANCE_ENGINE = this;
    return this;
  }
}