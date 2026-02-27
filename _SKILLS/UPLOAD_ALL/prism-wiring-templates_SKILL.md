---
name: prism-wiring-templates
description: |
  Module wiring templates for 100% utilization.
---

```
╔═════════════════════════════════════════════════════════════════════════════╗
║                    COMMANDMENT #1: IF IT EXISTS, USE IT EVERYWHERE          ║
╠═════════════════════════════════════════════════════════════════════════════╣
║                                                                             ║
║  Every database, engine, and algorithm MUST be wired to ALL its consumers.  ║
║  No module enters PRISM v9.0 without 100% utilization proof.                ║
║                                                                             ║
║  MINIMUM CONSUMER REQUIREMENTS:                                             ║
║  ┌─────────────────────────────┬────────────────────────────────────┐       ║
║  │ Database Type               │ Minimum Consumers                  │       ║
║  ├─────────────────────────────┼────────────────────────────────────┤       ║
║  │ PRISM_MATERIALS_MASTER      │ 15+ consumers                      │       ║
║  │ PRISM_MACHINES_DATABASE     │ 12+ consumers                      │       ║
║  │ PRISM_TOOLS_DATABASE        │ 10+ consumers                      │       ║
║  │ PRISM_WORKHOLDING_DATABASE  │ 8+ consumers                       │       ║
║  │ Other major databases       │ 6-8 consumers minimum              │       ║
║  │ Lookup tables               │ 4+ consumers minimum               │       ║
║  │ Physics engines             │ 6+ consumers                       │       ║
║  │ AI/ML engines               │ 4+ consumers                       │       ║
║  └─────────────────────────────┴────────────────────────────────────┘       ║
║                                                                             ║
║  ZERO-TOLERANCE POLICY:                                                     ║
║  • No "placeholder" or "future use" entries                                 ║
║  • No orphan databases without active consumers                             ║
║  • No consumers without registered data sources                             ║
║  • Every field in every database must have documented use cases             ║
║                                                                             ║
╚═════════════════════════════════════════════════════════════════════════════╝
```

### 1.2 Wiring Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PRISM DATA FLOW ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐     ┌──────────────────┐     ┌──────────────────┐         │
│  │  DATABASES  │────▶│  PRISM_GATEWAY   │────▶│   CONSUMERS      │         │
│  │             │     │  (Central Router) │     │   (Engines/UI)   │         │
│  └─────────────┘     └──────────────────┘     └──────────────────┘         │
│        │                      │                        │                    │
│        │                      │                        │                    │
│        ▼                      ▼                        ▼                    │
│  ┌─────────────┐     ┌──────────────────┐     ┌──────────────────┐         │
│  │ 4 Layers:   │     │ Route Registry:  │     │ Consumer Types:  │         │
│  │ • CORE      │     │ • getData()      │     │ • Calculators    │         │
│  │ • ENHANCED  │     │ • setData()      │     │ • Engines        │         │
│  │ • USER      │     │ • subscribe()    │     │ • Validators     │         │
│  │ • LEARNED   │     │ • query()        │     │ • Learning       │         │
│  └─────────────┘     └──────────────────┘     │ • UI Components  │         │
│                                               │ • External APIs  │         │
│                                               └──────────────────┘         │
│                                                                             │
│  DATA FLOW RULES:                                                           │
│  1. All data access goes through PRISM_GATEWAY                              │
│  2. Direct database access is PROHIBITED                                    │
│  3. Every route must have registered consumers                              │
│  4. Utilization is verified at build time                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 3. CONSUMER REGISTRATION PATTERN

### 3.1 Consumer Definition Template

```javascript
/**
 * PRISM Consumer Registration Template
 * Use this pattern for all engine/calculator modules that consume database data
 */

const PRISM_[CONSUMER_NAME] = {
  // ═══════════════════════════════════════════════════════════════
  // METADATA
  // ═══════════════════════════════════════════════════════════════
  _meta: {
    id: 'PRISM_[CONSUMER_NAME]',
    version: '1.0.0',
    category: 'calculator|engine|validator|learning|ui',
    
    // Data source declarations (REQUIRED)
    dataSources: [
      {
        database: 'PRISM_MATERIALS_MASTER',
        fields: ['base_speed', 'machinability', 'hardness', 'kc1_1'],
        required: true,
        fallback: 'PRISM_MATERIAL_KC_DATABASE'
      },
      {
        database: 'PRISM_TOOLS_DATABASE',
        fields: ['geometry', 'coating', 'grade'],
        required: true,
        fallback: null
      },
      {
        database: 'PRISM_MACHINES_DATABASE',
        fields: ['rpm_max', 'power', 'torque'],
        required: true,
        fallback: null
      }
    ],
    
    // Output declarations
    outputs: [
      { name: 'optimal_speed', unit: 'm/min', type: 'number' },
      { name: 'optimal_feed', unit: 'mm/rev', type: 'number' },
      { name: 'confidence', unit: '%', type: 'number' }
    ],
    
    // Audit
    created: '2026-01-01',
    lastUpdated: '2026-01-24'
  },

  // ═══════════════════════════════════════════════════════════════
  // DATA SOURCE CONNECTIONS
  // ═══════════════════════════════════════════════════════════════
  _connections: {
    materials: null,  // Set during initialization
    tools: null,
    machines: null
  },

  // ═══════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Initialize consumer and connect to data sources
   * Called automatically by PRISM_GATEWAY
   */
  async init() {
    // Connect to required databases via Gateway
    this._connections.materials = await PRISM_GATEWAY.connect(
      'PRISM_MATERIALS_MASTER',
      this._meta.dataSources[0].fields
    );
    
    this._connections.tools = await PRISM_GATEWAY.connect(
      'PRISM_TOOLS_DATABASE',
      this._meta.dataSources[1].fields
    );
    
    this._connections.machines = await PRISM_GATEWAY.connect(
      'PRISM_MACHINES_DATABASE',
      this._meta.dataSources[2].fields
    );
    
    // Register as consumer with all sources
    this._meta.dataSources.forEach(source => {
      PRISM_GATEWAY.registerConsumer(source.database, this._meta.id, source.fields);
    });
    
    return true;
  },

  // ═══════════════════════════════════════════════════════════════
  // CALCULATION METHODS
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Main calculation method
   * MUST use data from ALL registered sources
   */
  calculate(params) {
    const { materialId, toolId, machineId, operation } = params;
    
    // Get data from ALL sources (MANDATORY)
    const material = this._connections.materials.get(materialId);
    const tool = this._connections.tools.get(toolId);
    const machine = this._connections.machines.get(machineId);
    
    // Validate all data present
    if (!material || !tool || !machine) {
      return this._handleMissingData({ material, tool, machine });
    }
    
    // Perform calculation using ALL data sources
    const result = this._compute(material, tool, machine, operation);
    
    // Return with metadata
    return {
      ...result,
      _sources: {
        material: { id: materialId, source: material._source },
        tool: { id: toolId, source: tool._source },
        machine: { id: machineId, source: machine._source }
      },
      _confidence: this._calculateConfidence(material, tool, machine),
      _timestamp: new Date().toISOString()
    };
  },

  // Internal computation
  _compute(material, tool, machine, operation) {
    // Implementation specific to this consumer
  },

  _calculateConfidence(material, tool, machine) {
    // Calculate confidence based on data completeness and quality
  },

  _handleMissingData(sources) {
    // Graceful degradation with fallbacks
  }
};

// MANDATORY: Register with Gateway as consumer
PRISM_GATEWAY.registerConsumer(PRISM_[CONSUMER_NAME]);

// Export
if (typeof module !== 'undefined') {
  module.exports = PRISM_[CONSUMER_NAME];
}
```

## 5. UTILIZATION VERIFICATION

### 5.1 Build-Time Verification

```javascript
/**
 * PRISM Utilization Verifier
 * Runs at build time to ensure 100% database utilization
 */

const PRISM_UTILIZATION_VERIFIER = {
  
  // Minimum consumer requirements by database type
  minimumConsumers: {
    'PRISM_MATERIALS_MASTER': 15,
    'PRISM_MACHINES_DATABASE': 12,
    'PRISM_TOOLS_DATABASE': 10,
    'PRISM_WORKHOLDING_DATABASE': 8,
    'PRISM_POST_PROCESSOR_DATABASE': 8,
    'PRISM_CONTROLLER_DATABASE': 8,
    'default': 6
  },

  /**
   * Verify single database utilization
   * @param {string} databaseId - Database to verify
   * @returns {object} Verification result
   */
  verifyDatabase(databaseId) {
    const db = PRISM_GATEWAY.getDatabase(databaseId);
    if (!db) {
      return { 
        valid: false, 
        error: `Database ${databaseId} not found` 
      };
    }

    const consumers = PRISM_GATEWAY.getConsumers(databaseId);
    const minRequired = this.minimumConsumers[databaseId] || this.minimumConsumers.default;
    
    const result = {
      database: databaseId,
      consumers: consumers.length,
      minimum: minRequired,
      utilization: (consumers.length / minRequired * 100).toFixed(1) + '%',
      valid: consumers.length >= minRequired,
      consumerList: consumers.map(c => ({
        id: c.id,
        fields: c.fields,
        usage: c.usage
      }))
    };

    // Check field coverage
    const allFields = Object.keys(db._fields || {});
    const usedFields = new Set();
    consumers.forEach(c => c.fields.forEach(f => usedFields.add(f)));
    
    result.fieldCoverage = {
      total: allFields.length,
      used: usedFields.size,
      unused: allFields.filter(f => !usedFields.has(f)),
      percent: (usedFields.size / allFields.length * 100).toFixed(1) + '%'
    };

    // Fail if any field is unused
    if (result.fieldCoverage.unused.length > 0) {
      result.valid = false;
      result.warnings = result.warnings || [];
      result.warnings.push(`Unused fields: ${result.fieldCoverage.unused.join(', ')}`);
    }

    return result;
  },

  /**
   * Verify all databases
   * @returns {object} Complete verification report
   */
  verifyAll() {
    const databases = PRISM_GATEWAY.getAllDatabases();
    const results = {
      timestamp: new Date().toISOString(),
      totalDatabases: databases.length,
      passed: 0,
      failed: 0,
      databases: {}
    };

    databases.forEach(dbId => {
      const verification = this.verifyDatabase(dbId);
      results.databases[dbId] = verification;
      
      if (verification.valid) {
        results.passed++;
      } else {
        results.failed++;
      }
    });

    results.overallValid = results.failed === 0;
    results.passRate = (results.passed / results.totalDatabases * 100).toFixed(1) + '%';

    return results;
  },

  /**
   * Generate utilization matrix report
   * @returns {string} Formatted report
   */
  generateReport() {
    const verification = this.verifyAll();
    
    let report = `
╔═══════════════════════════════════════════════════════════════════════════════╗
║                        PRISM UTILIZATION VERIFICATION REPORT                   ║
║                        Generated: ${verification.timestamp}                    ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  SUMMARY                                                                      ║
║  ─────────────────────────────────────────────────────────────────────────    ║
║  Total Databases: ${verification.totalDatabases}                              ║
║  Passed: ${verification.passed}                                               ║
║  Failed: ${verification.failed}                                               ║
║  Pass Rate: ${verification.passRate}                                          ║
║  Overall Status: ${verification.overallValid ? '✅ VALID' : '❌ INVALID'}      ║
║                                                                               ║
╠═══════════════════════════════════════════════════════════════════════════════╣
`;

    Object.entries(verification.databases).forEach(([dbId, result]) => {
      const status = result.valid ? '✅' : '❌';
      report += `║                                                                               ║
║  ${status} ${dbId}                                                            
║     Consumers: ${result.consumers}/${result.minimum} (${result.utilization})
║     Fields: ${result.fieldCoverage.used}/${result.fieldCoverage.total} (${result.fieldCoverage.percent})
`;
      if (result.warnings) {
        result.warnings.forEach(w => {
          report += `║     ⚠️  ${w}\n`;
        });
      }
    });

    report += `╚═══════════════════════════════════════════════════════════════════════════════╝`;
    
    return report;
  },

  /**
   * Block build if utilization requirements not met
   * Called by build system
   */
  enforceAtBuild() {
    const verification = this.verifyAll();
    
    if (!verification.overallValid) {
      console.error(this.generateReport());
      throw new Error(
        `BUILD BLOCKED: ${verification.failed} database(s) do not meet utilization requirements. ` +
        `All databases must have minimum consumers wired before build can proceed.`
      );
    }
    
    console.log('✅ Utilization verification passed');
    return true;
  }
};
```

*END OF PART 1*

## 7. COMPLETE WIRING EXAMPLE: MACHINES DATABASE

### 7.1 Full Implementation with 12+ Consumers

```javascript
/**
 * PRISM_MACHINES_DATABASE - Complete Wiring Example
 * Demonstrates hierarchical database with CORE/ENHANCED/USER/LEARNED layers
 */

const PRISM_MACHINES_DATABASE = {
  // ═══════════════════════════════════════════════════════════════
  // METADATA
  // ═══════════════════════════════════════════════════════════════
  _meta: {
    id: 'PRISM_MACHINES_DATABASE',
    version: '9.0.0',
    category: 'machines',
    minConsumers: 12,
    
    // Layer structure
    layers: {
      CORE: 'Infrastructure specs from monolith',
      ENHANCED: '33 manufacturers with full kinematic data',
      USER: 'Shop-specific customizations',
      LEARNED: 'AI-derived optimizations'
    },
    
    entryCount: 824,
    manufacturers: 43,
    fieldCount: 85
  },

  // ═══════════════════════════════════════════════════════════════
  // CONSUMER REGISTRY - ALL 12+ CONSUMERS
  // ═══════════════════════════════════════════════════════════════
  _consumers: {
    // ─────────────────────────────────────────────────────────────
    // CALCULATION CONSUMERS
    // ─────────────────────────────────────────────────────────────
    'PRISM_SPEED_FEED_CALCULATOR': {
      fields: ['rpm_max', 'rpm_min', 'power_kw', 'torque_max', 'feed_rate_max'],
      routes: ['machines/get', 'machines/capabilities'],
      usage: 'Verify parameters within machine limits',
      criticality: 'CRITICAL'
    },
    
    'PRISM_COLLISION_ENGINE': {
      fields: [
        'work_envelope_x', 'work_envelope_y', 'work_envelope_z',
        'axis_limits', 'kinematics', '3d_model_path'
      ],
      routes: ['machines/get', 'machines/kinematics'],
      usage: 'Toolpath collision detection and avoidance',
      criticality: 'CRITICAL'
    },
    
    'PRISM_CHATTER_PREDICTION': {
      fields: [
        'spindle_stiffness', 'spindle_damping', 'natural_frequency',
        'dynamic_compliance', 'FRF_data'
      ],
      routes: ['machines/get'],
      usage: 'Stability lobe diagram with machine dynamics',
      criticality: 'HIGH'
    },
    
    'PRISM_CYCLE_TIME_PREDICTOR': {
      fields: [
        'rapid_rate_x', 'rapid_rate_y', 'rapid_rate_z',
        'acceleration', 'deceleration', 'jerk_limits',
        'tool_change_time', 'pallet_change_time'
      ],
      routes: ['machines/get'],
      usage: 'Accurate cycle time estimation',
      criticality: 'HIGH'
    },
    
    'PRISM_POWER_CHECK': {
      fields: ['power_kw', 'torque_curve', 'constant_power_range'],
      routes: ['machines/get'],
      usage: 'Verify power/torque within limits',
      criticality: 'HIGH'
    },
    
    // ─────────────────────────────────────────────────────────────
    // POST PROCESSOR CONSUMERS
    // ─────────────────────────────────────────────────────────────
    'PRISM_POST_PROCESSOR_GENERATOR': {
      fields: [
        'controller_type', 'controller_version', 'g_codes_supported',
        'm_codes', 'canned_cycles', 'macro_capability',
        'coordinate_systems', 'tool_change_method'
      ],
      routes: ['machines/get', 'machines/controller'],
      usage: 'Generate machine-specific post processors',
      criticality: 'CRITICAL'
    },
    
    'PRISM_GCODE_VALIDATOR': {
      fields: [
        'g_codes_supported', 'm_codes', 'address_limits',
        'block_format', 'max_block_length'
      ],
      routes: ['machines/get'],
      usage: 'Validate G-code compatibility',
      criticality: 'HIGH'
    },
    
    // ─────────────────────────────────────────────────────────────
    // BUSINESS CONSUMERS
    // ─────────────────────────────────────────────────────────────
    'PRISM_COST_ESTIMATOR': {
      fields: ['hourly_rate', 'setup_time_typical', 'efficiency_factor'],
      routes: ['machines/get'],
      usage: 'Machine cost calculations for quotes',
      criticality: 'HIGH'
    },
    
    'PRISM_SCHEDULING_ENGINE': {
      fields: [
        'availability', 'capabilities', 'operator_requirements',
        'maintenance_schedule', 'queue_jobs'
      ],
      routes: ['machines/get', 'machines/status'],
      usage: 'Job shop scheduling optimization',
      criticality: 'HIGH'
    },
    
    'PRISM_CAPABILITY_MATCHER': {
      fields: [
        'machine_type', 'axis_count', 'work_envelope',
        'accuracy_specs', 'special_features'
      ],
      routes: ['machines/capabilities', 'machines/query'],
      usage: 'Match jobs to capable machines',
      criticality: 'HIGH'
    },
    
    // ─────────────────────────────────────────────────────────────
    // VISUALIZATION CONSUMERS
    // ─────────────────────────────────────────────────────────────
    'PRISM_3D_VISUALIZATION': {
      fields: [
        'kinematics', '3d_model_path', 'axis_colors',
        'component_hierarchy', 'motion_limits'
      ],
      routes: ['machines/kinematics'],
      usage: '3D machine simulation and visualization',
      criticality: 'MEDIUM'
    },
    
    // ─────────────────────────────────────────────────────────────
    // AI/ML CONSUMERS
    // ─────────────────────────────────────────────────────────────
    'PRISM_AI_LEARNING_PIPELINE': {
      fields: ['*'],
      routes: ['machines/query'],
      usage: 'Machine learning for parameter optimization',
      criticality: 'MEDIUM'
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // LAYER RESOLUTION
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Resolve machine data through 4 layers
   * LEARNED → USER → ENHANCED → CORE
   */
  _resolveLayered(machineId, field) {
    // Layer 4: LEARNED (AI-derived, highest confidence only)
    if (this.LEARNED[machineId]?.[field]) {
      const learned = this.LEARNED[machineId][field];
      if (learned.confidence > 0.85) {
        return { value: learned.value, source: 'LEARNED', confidence: learned.confidence };
      }
    }
    
    // Layer 3: USER (shop-specific overrides)
    if (this.USER[machineId]?.[field]) {
      return { value: this.USER[machineId][field], source: 'USER' };
    }
    
    // Layer 2: ENHANCED (manufacturer data)
    if (this.ENHANCED[machineId]?.[field]) {
      return { value: this.ENHANCED[machineId][field], source: 'ENHANCED' };
    }
    
    // Layer 1: CORE (base data)
    if (this.CORE[machineId]?.[field]) {
      return { value: this.CORE[machineId][field], source: 'CORE' };
    }
    
    return null;
  },

  /**
   * Get complete machine data with layer tracing
   */
  get(machineId, fields = null) {
    const allFields = fields || Object.keys(this._fields);
    const result = { _id: machineId, _sources: {} };
    
    allFields.forEach(field => {
      const resolved = this._resolveLayered(machineId, field);
      if (resolved) {
        result[field] = resolved.value;
        result._sources[field] = resolved.source;
      }
    });
    
    return result;
  },

  // Data layers
  CORE: {},      // Infrastructure database from monolith
  ENHANCED: {},  // 33 manufacturers with full specs
  USER: {},      // Shop customizations
  LEARNED: {}    // AI optimizations
};

// Register
PRISM_GATEWAY.registerDatabase(PRISM_MACHINES_DATABASE);
```

## 9. MULTI-SOURCE CALCULATION PATTERN

### 9.1 The 6+ Source Rule

```javascript
/**
 * PRISM Multi-Source Calculation Template
 * Every calculation MUST combine 6+ data sources
 * This is COMMANDMENT #1 in action
 */

const PRISM_CALCULATION_TEMPLATE = {
  
  /**
   * Standard calculation structure
   * Returns result with full source tracking
   */
  calculate(params) {
    const { materialId, toolId, machineId, operation } = params;
    
    // ═══════════════════════════════════════════════════════════════
    // SOURCE 1: Material Database
    // ═══════════════════════════════════════════════════════════════
    const material = PRISM_GATEWAY.get('materials', materialId, [
      'base_speed', 'machinability_index', 'kc1_1', 'mc',
      'hardness_brinell', 'thermal_conductivity'
    ]);
    
    // ═══════════════════════════════════════════════════════════════
    // SOURCE 2: Tool Database
    // ═══════════════════════════════════════════════════════════════
    const tool = PRISM_GATEWAY.get('tools', toolId, [
      'diameter', 'flutes', 'helix_angle', 'coating',
      'grade', 'edge_radius', 'max_doc', 'max_woc'
    ]);
    
    // ═══════════════════════════════════════════════════════════════
    // SOURCE 3: Machine Database
    // ═══════════════════════════════════════════════════════════════
    const machine = PRISM_GATEWAY.get('machines', machineId, [
      'rpm_max', 'rpm_min', 'power_kw', 'torque_max',
      'spindle_stiffness', 'feed_rate_max'
    ]);
    
    // ═══════════════════════════════════════════════════════════════
    // SOURCE 4: Physics Engine
    // ═══════════════════════════════════════════════════════════════
    const physics = PRISM_CUTTING_MECHANICS_ENGINE.calculateBaseParams({
      material,
      tool,
      operation
    });
    
    // ═══════════════════════════════════════════════════════════════
    // SOURCE 5: Historical Data / Learning
    // ═══════════════════════════════════════════════════════════════
    const historical = PRISM_LEARNING_ENGINE.findSimilarCases({
      material: material.category,
      tool: tool.type,
      operation,
      limit: 10
    });
    
    // ═══════════════════════════════════════════════════════════════
    // SOURCE 6: AI/ML Recommendation
    // ═══════════════════════════════════════════════════════════════
    const aiRecommendation = PRISM_BAYESIAN_OPTIMIZER.recommend({
      material,
      tool,
      machine,
      physics,
      historical
    });
    
    // ═══════════════════════════════════════════════════════════════
    // FUSION: Combine all sources with weights
    // ═══════════════════════════════════════════════════════════════
    const weights = {
      database: 0.25,      // Material/tool base values
      physics: 0.25,       // Physical calculations
      historical: 0.20,    // What worked before
      ai: 0.20,           // ML recommendation
      constraints: 0.10    // Machine limits (hard constraints)
    };
    
    const result = this._fuseResults({
      database: this._extractDatabaseValues(material, tool),
      physics: physics,
      historical: this._aggregateHistorical(historical),
      ai: aiRecommendation,
      constraints: this._extractConstraints(machine)
    }, weights);
    
    // ═══════════════════════════════════════════════════════════════
    // APPLY HARD CONSTRAINTS
    // ═══════════════════════════════════════════════════════════════
    result.speed = Math.min(result.speed, machine.rpm_max * Math.PI * tool.diameter / 1000);
    result.feed = Math.min(result.feed, machine.feed_rate_max);
    
    // ═══════════════════════════════════════════════════════════════
    // RETURN WITH FULL METADATA
    // ═══════════════════════════════════════════════════════════════
    return {
      // Primary outputs
      speed: result.speed,           // m/min
      rpm: result.rpm,               // rev/min
      feed: result.feed,             // mm/rev
      feedRate: result.feedRate,     // mm/min
      doc: result.doc,               // mm
      woc: result.woc,               // mm
      
      // Confidence and uncertainty
      confidence: result.confidence,  // 0-1
      uncertainty: {
        speed: result.speedRange,
        feed: result.feedRange
      },
      
      // Source tracking (REQUIRED)
      _sources: {
        material: {
          id: materialId,
          layer: material._sources,
          fieldsUsed: Object.keys(material).filter(k => !k.startsWith('_'))
        },
        tool: {
          id: toolId,
          fieldsUsed: Object.keys(tool).filter(k => !k.startsWith('_'))
        },
        machine: {
          id: machineId,
          fieldsUsed: Object.keys(machine).filter(k => !k.startsWith('_')),
          constraintsApplied: result._constraintsApplied
        },
        physics: {
          engine: 'PRISM_CUTTING_MECHANICS_ENGINE',
          models: physics._modelsUsed
        },
        historical: {
          casesFound: historical.length,
          avgConfidence: this._avgConfidence(historical)
        },
        ai: {
          engine: 'PRISM_BAYESIAN_OPTIMIZER',
          modelVersion: aiRecommendation._modelVersion
        }
      },
      
      // Fusion weights used
      _weights: weights,
      
      // Audit trail
      _timestamp: new Date().toISOString(),
      _calculatorId: this._meta.id,
      _calculatorVersion: this._meta.version
    };
  },

  // Fusion methods
  _fuseResults(sources, weights) { /* Weighted combination logic */ },
  _extractDatabaseValues(material, tool) { /* Extract relevant values */ },
  _aggregateHistorical(cases) { /* Combine historical data */ },
  _extractConstraints(machine) { /* Get hard limits */ },
  _avgConfidence(cases) { /* Calculate average confidence */ }
};
```

## 11. TROUBLESHOOTING WIRING ISSUES

### 11.1 Common Problems and Solutions

```javascript
/**
 * PRISM Wiring Troubleshooting Guide
 */

const WIRING_TROUBLESHOOTING = {
  
  // ═══════════════════════════════════════════════════════════════
  // PROBLEM: Database reports low utilization
  // ═══════════════════════════════════════════════════════════════
  'LOW_UTILIZATION': {
    symptoms: [
      'PRISM_UTILIZATION_VERIFIER reports < 100%',
      'Build fails with utilization error',
      'Unused field warnings'
    ],
    causes: [
      'Consumer not registered with database',
      'Fields not listed in consumer declaration',
      'Consumer using direct access instead of Gateway'
    ],
    solutions: [
      `
      // 1. Add consumer to database _consumers registry
      _consumers: {
        'MISSING_CONSUMER': {
          fields: ['field1', 'field2'],
          routes: ['database/get'],
          usage: 'Description of use'
        }
      }
      `,
      `
      // 2. Register consumer during init
      PRISM_GATEWAY.registerConsumer(
        'DATABASE_ID',
        'CONSUMER_ID',
        ['field1', 'field2']
      );
      `,
      `
      // 3. If field truly unused, document and consider removal
      // Add to _deprecatedFields with migration note
      `
    ]
  },

  // ═══════════════════════════════════════════════════════════════
  // PROBLEM: Consumer not receiving data updates
  // ═══════════════════════════════════════════════════════════════
  'STALE_DATA': {
    symptoms: [
      'Consumer shows old values after database update',
      'Cache not invalidating',
      'Events not firing'
    ],
    causes: [
      'Not subscribed to update events',
      'Event handler not invalidating cache',
      'Direct database access bypassing events'
    ],
    solutions: [
      `
      // 1. Subscribe to update events
      PRISM_EVENT_WIRING.subscribe(
        'material:updated',
        'MY_CONSUMER_ID',
        (event) => {
          this.invalidateCache(event.id);
        }
      );
      `,
      `
      // 2. Always access through Gateway (not direct)
      // BAD:  const data = PRISM_MATERIALS_MASTER.data[id];
      // GOOD: const data = PRISM_GATEWAY.get('materials', id);
      `,
      `
      // 3. Verify event is being emitted
      PRISM_EVENT_BUS.on('*', (name, payload) => {
        console.log('Event:', name, payload);
      });
      `
    ]
  },

  // ═══════════════════════════════════════════════════════════════
  // PROBLEM: Layer resolution not working
  // ═══════════════════════════════════════════════════════════════
  'LAYER_RESOLUTION': {
    symptoms: [
      'USER overrides not applied',
      'ENHANCED data not visible',
      'Wrong source reported in _sources'
    ],
    causes: [
      'Layer not loaded',
      'Resolution order incorrect',
      'Field name mismatch between layers'
    ],
    solutions: [
      `
      // 1. Verify all layers are loaded
      console.log('CORE:', Object.keys(db.CORE).length);
      console.log('ENHANCED:', Object.keys(db.ENHANCED).length);
      console.log('USER:', Object.keys(db.USER).length);
      console.log('LEARNED:', Object.keys(db.LEARNED).length);
      `,
      `
      // 2. Check resolution order in _resolveLayered
      // Should be: LEARNED → USER → ENHANCED → CORE
      `,
      `
      // 3. Verify field names match exactly
      // Case-sensitive, no whitespace issues
      `
    ]
  },

  // ═══════════════════════════════════════════════════════════════
  // PROBLEM: Gateway route not found
  // ═══════════════════════════════════════════════════════════════
  'ROUTE_NOT_FOUND': {
    symptoms: [
      '404 or route not found error',
      'PRISM_GATEWAY.get returns undefined',
      'Consumer can\'t access data'
    ],
    causes: [
      'Route not registered',
      'Database not registered with Gateway',
      'Path mismatch'
    ],
    solutions: [
      `
      // 1. Register database with Gateway
      PRISM_GATEWAY.registerDatabase(MY_DATABASE);
      `,
      `
      // 2. Verify routes are defined
      console.log(PRISM_GATEWAY.listRoutes('materials'));
      `,
      `
      // 3. Check path format matches
      // Route path: '/api/v1/materials/:id'
      // Call: PRISM_GATEWAY.get('materials', 'steel-1045')
      `
    ]
  },

  // ═══════════════════════════════════════════════════════════════
  // DIAGNOSTIC TOOL
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Run full wiring diagnostic
   */
  diagnose(databaseId) {
    const report = {
      database: databaseId,
      timestamp: new Date().toISOString(),
      checks: {}
    };

    // Check 1: Database exists
    const db = PRISM_GATEWAY.getDatabase(databaseId);
    report.checks.exists = !!db;
    if (!db) {
      report.status = 'CRITICAL';
      report.message = 'Database not found in Gateway';
      return report;
    }

    // Check 2: Consumer count
    const consumers = PRISM_GATEWAY.getConsumers(databaseId);
    const minRequired = PRISM_UTILIZATION_VERIFIER.minimumConsumers[databaseId] || 6;
    report.checks.consumers = {
      count: consumers.length,
      minimum: minRequired,
      pass: consumers.length >= minRequired
    };

    // Check 3: Field coverage
    const allFields = Object.keys(db._fields || {});
    const usedFields = new Set();
    consumers.forEach(c => c.fields?.forEach(f => usedFields.add(f)));
    report.checks.fieldCoverage = {
      total: allFields.length,
      used: usedFields.size,
      unused: allFields.filter(f => !usedFields.has(f)),
      pass: usedFields.size === allFields.length
    };

    // Check 4: Routes registered
    const routes = PRISM_GATEWAY.listRoutes(databaseId.toLowerCase().replace('prism_', ''));
    report.checks.routes = {
      count: routes.length,
      list: routes,
      pass: routes.length > 0
    };

    // Check 5: Events subscribed
    const eventName = `${databaseId.toLowerCase().replace('prism_', '').split('_')[0]}:updated`;
    const subscribers = PRISM_EVENT_BUS.getSubscribers(eventName);
    report.checks.events = {
      eventName,
      subscribers: subscribers.length,
      pass: subscribers.length > 0
    };

    // Overall status
    const allPass = Object.values(report.checks).every(c => c.pass !== false);
    report.status = allPass ? 'HEALTHY' : 'ISSUES_FOUND';
    
    return report;
  }
};
```

*End of PRISM Wiring Templates Skill v1.0*
