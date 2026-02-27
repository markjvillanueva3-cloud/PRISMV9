---
name: prism-module-builder
description: |
  Module construction from extracted code.
---

- Monolith contains gateway stub only (1-5 lines)
- Implementation is missing entirely
- Existing code is incomplete or placeholder
- Need to add new algorithm categories
- Upgrading stub to full implementation

# MODULE STRUCTURE TEMPLATE

## Standard Module Format (JavaScript)
```javascript
/**
 * PRISM [ALGORITHM_NAME] Engine
 * 
 * Academic Sources:
 *   - MIT [COURSE_NUMBER]: [COURSE_NAME]
 *   - [AUTHOR] ([YEAR]): "[PAPER_TITLE]"
 * 
 * Implementation Features:
 *   - [FEATURE_1]
 *   - [FEATURE_2]
 *   - Manufacturing optimization integration
 *   - Self-test validation
 * 
 * @module PRISM_[NAME]_ENGINE
 * @version 1.0.0
 * @date [DATE]
 */

'use strict';

// ============================================================
// SECTION 1: CONFIGURATION & DEFAULTS
// ============================================================
const DEFAULT_CONFIG = {
  // Algorithm-specific parameters
};

// ============================================================
// SECTION 2: CORE ALGORITHM IMPLEMENTATION
// ============================================================
class [AlgorithmName]Engine {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.history = [];
    this.initialized = false;
  }
  
  // Core algorithm methods
  // ...
}

// ============================================================
// SECTION 3: MANUFACTURING OPTIMIZATION FUNCTIONS
// ============================================================
function optimizeCuttingParameters(material, operation, constraints) {
  // Manufacturing-specific optimization
}

function optimizeToolPath(waypoints, machine, constraints) {
  // Toolpath optimization using algorithm
}

// ============================================================
// SECTION 4: UTILITY FUNCTIONS
// ============================================================
// Helper functions, math utilities, etc.

// ============================================================
// SECTION 5: SELF-TEST VALIDATION
// ============================================================
function selfTest() {
  console.log('[ALGORITHM] Self-Test Starting...');
  
  const tests = [
    { name: 'Basic Optimization', fn: testBasicOptimization },
    { name: 'Manufacturing Case', fn: testManufacturingCase },
    { name: 'Edge Cases', fn: testEdgeCases }
  ];
  
  let passed = 0;
  for (const test of tests) {
    try {
      test.fn();
      console.log(`  ✓ ${test.name}: PASSED`);
      passed++;
    } catch (e) {
      console.log(`  ✗ ${test.name}: FAILED - ${e.message}`);
    }
  }
  
  console.log(`[ALGORITHM] Self-Test Complete: ${passed}/${tests.length} passed`);
  return passed === tests.length;
}

// ============================================================
// SECTION 6: EXPORTS
// ============================================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    [AlgorithmName]Engine,
    optimizeCuttingParameters,
    optimizeToolPath,
    selfTest,
    DEFAULT_CONFIG
  };
}

if (typeof window !== 'undefined') {
  window.PRISM_[NAME] = {
    [AlgorithmName]Engine,
    optimizeCuttingParameters,
    optimizeToolPath,
    selfTest
  };
}
```

# MANUFACTURING INTEGRATION PATTERNS

## Cutting Parameter Optimization
```javascript
/**
 * Every algorithm MUST include manufacturing optimization functions
 */

function createManufacturingObjective(material, operation, tool) {
  return {
    // Primary objectives
    minimize: {
      cycleTime: (params) => calculateCycleTime(params),
      toolWear: (params) => estimateToolWear(params, material, tool),
      surfaceRoughness: (params) => predictSurfaceFinish(params)
    },
    
    // Constraints
    constraints: {
      maxSpindleSpeed: tool.maxRPM,
      maxFeedRate: machine.maxFeed,
      maxDepthOfCut: tool.maxDoc,
      minChipLoad: material.minChipLoad,
      maxTemperature: material.maxCuttingTemp
    },
    
    // Bounds for optimization variables
    bounds: {
      speed: [material.minSpeed, material.maxSpeed],
      feed: [material.minFeed, material.maxFeed],
      depth: [0.1, tool.maxDoc]
    }
  };
}

function optimizeCuttingParameters(algorithm, material, operation, tool, machine) {
  const objective = createManufacturingObjective(material, operation, tool);
  
  // Configure algorithm for manufacturing
  const config = {
    dimensions: 3,  // speed, feed, depth
    bounds: [
      objective.bounds.speed,
      objective.bounds.feed,
      objective.bounds.depth
    ],
    constraints: Object.values(objective.constraints)
  };
  
  // Run optimization
  const result = algorithm.optimize(
    (params) => {
      const [speed, feed, depth] = params;
      return evaluateManufacturingCost(speed, feed, depth, objective);
    },
    config
  );
  
  return {
    optimalSpeed: result.solution[0],
    optimalFeed: result.solution[1],
    optimalDepth: result.solution[2],
    predictedCycleTime: result.cost,
    convergenceHistory: result.history
  };
}
```

# BUILD CHECKLIST

```
MODULE BUILD CHECKLIST:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
□ STEP 1: Identify academic sources
  - Primary course (MIT/Stanford)
  - Seminal paper citations
  - Reference implementations
  
□ STEP 2: Core algorithm implementation
  - All standard variations
  - Configurable parameters
  - Proper initialization
  
□ STEP 3: Manufacturing integration
  - Cutting parameter optimization
  - Toolpath optimization
  - Machine constraints
  
□ STEP 4: Utility functions
  - Math helpers
  - Validation functions
  - Result formatting
  
□ STEP 5: Self-test suite
  - Benchmark functions
  - Manufacturing cases
  - Edge cases
  
□ STEP 6: Documentation
  - Header with sources
  - Inline comments
  - Usage examples
  
□ STEP 7: Exports
  - Node.js module.exports
  - Browser window attachment
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

# INTEGRATION WITH OTHER SKILLS

| Skill | Integration Point |
|-------|-------------------|
| `prism-swarm-extraction` | Triggers build when stub detected |
| `prism-aiml-engine-patterns` | Provides standard patterns |
| `prism-knowledge-master` | Academic course lookup |
| `prism-quality-master` | Validation gates |
| `prism-sp-verification` | Completion proof |

**Version 1.0 | 2026-01-30 | PRISM Manufacturing Intelligence**
