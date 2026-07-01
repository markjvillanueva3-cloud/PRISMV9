/**
 * PRISM_RAPIDS_OPTIMIZER
 * Extracted from PRISM v8.89.002 monolith
 * References: 15
 * Lines: 125
 * Session: R2.3.1 Wave 2 Engine Gap Extraction
 */

const PRISM_RAPIDS_OPTIMIZER = {
  version: '1.0.0',

  /**
   * Optimize rapid moves in a toolpath
   */
  optimize(toolpath, options = {}) {
    const result = {
      original: toolpath,
      optimized: JSON.parse(JSON.stringify(toolpath)),
      savings: { distance: 0, estimatedTime: 0 },
      confidence: 100
    };
    const moves = result.optimized.moves || [];
    if (moves.length < 3) return result;

    // Strategy 1: Remove redundant rapids
    result.optimized.moves = this._removeRedundantRapids(moves);

    // Strategy 2: Combine consecutive rapids
    result.optimized.moves = this._combineRapids(result.optimized.moves);

    // Strategy 3: Optimize rapid path (nearest neighbor)
    if (options.reorderOperations !== false) {
      result.optimized.moves = this._optimizeRapidPath(result.optimized.moves, options);
    }
    // Calculate savings
    result.savings = this._calculateSavings(moves, result.optimized.moves);

    return result;
  },
  _removeRedundantRapids(moves) {
    const optimized = [];

    for (let i = 0; i < moves.length; i++) {
      const move = moves[i];
      const next = moves[i + 1];

      // Skip rapid if next move is also rapid to same position
      if (move.type === 'rapid' && next?.type === 'rapid') {
        if (move.x === next.x && move.y === next.y && move.z === next.z) {
          continue;
        }
      }
      optimized.push(move);
    }
    return optimized;
  },
  _combineRapids(moves) {
    const optimized = [];

    for (let i = 0; i < moves.length; i++) {
      const move = moves[i];
      const next = moves[i + 1];

      // Combine consecutive Z-only rapids
      if (move.type === 'rapid' && next?.type === 'rapid') {
        if (move.x === next.x && move.y === next.y && move.z !== next.z) {
          // Skip intermediate Z move
          optimized.push({ ...move, z: next.z });
          i++; // Skip next
          continue;
        }
      }
      optimized.push(move);
    }
    return optimized;
  },
  _optimizeRapidPath(moves, options) {
    // Group moves by operation (between rapids at safe Z)
    const operations = [];
    let currentOp = [];

    for (const move of moves) {
      currentOp.push(move);

      // End of operation marker (rapid to safe Z)
      if (move.type === 'rapid' && move.z > 0.05) {
        if (currentOp.length > 1) {
          operations.push([...currentOp]);
        }
        currentOp = [];
      }
    }
    if (currentOp.length > 0) {
      operations.push(currentOp);
    }
    // For now, return as-is (nearest neighbor would go here)
    // Full implementation would reorder operations

    return moves;
  },
  _calculateSavings(original, optimized) {
    const calcRapidDist = (moves) => {
      let dist = 0;
      for (let i = 1; i < moves.length; i++) {
        if (moves[i].type === 'rapid') {
          const dx = (moves[i].x || 0) - (moves[i-1].x || 0);
          const dy = (moves[i].y || 0) - (moves[i-1].y || 0);
          const dz = (moves[i].z || 0) - (moves[i-1].z || 0);
          dist += Math.sqrt(dx*dx + dy*dy + dz*dz);
        }
      }
      return dist;
    };
    const origDist = calcRapidDist(original);
    const optDist = calcRapidDist(optimized);
    const savedDist = origDist - optDist;

    // Estimate time savings (assuming 400 IPM rapid)
    const estimatedTime = (savedDist / 400) * 60; // seconds

    return {
      distance: savedDist.toFixed(2),
      percentage: origDist > 0 ? ((savedDist / origDist) * 100).toFixed(1) : 0,
      estimatedTime: estimatedTime.toFixed(1)
    };
  },
  init() {
    (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM_RAPIDS_OPTIMIZER] v1.0 initialized');
    window.PRISM_RAPIDS_OPTIMIZER = this;
    window.optimizeRapids = this.optimize.bind(this);
    return this;
  }
}