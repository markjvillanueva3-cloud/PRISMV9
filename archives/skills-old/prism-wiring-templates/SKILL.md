# PRISM Wiring Templates Skill
## Database-to-Consumer Wiring Patterns for 100% Utilization
### Version 1.0 | PRISM Manufacturing Intelligence

---

# PART 1: WIRING FUNDAMENTALS

---

## 1. THE WIRING IMPERATIVE

### 1.1 Core Principle

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

---

## 2. DATABASE REGISTRATION PATTERN

### 2.1 Database Definition Template

```javascript
/**
 * PRISM Database Registration Template
 * Use this pattern for all database modules
 */

const PRISM_[DATABASE_NAME] = {
  // ═══════════════════════════════════════════════════════════════
  // METADATA (Required)
  // ═══════════════════════════════════════════════════════════════
  _meta: {
    id: 'PRISM_[DATABASE_NAME]',
    version: '1.0.0',
    category: 'materials|machines|tools|workholding|process|ai',
    layer: 'CORE|ENHANCED|USER|LEARNED',
    
    // Utilization tracking
    minConsumers: 8,
    actualConsumers: 0, // Updated by build system
    utilizationPercent: 0,
    
    // Audit trail
    created: '2026-01-01',
    lastUpdated: '2026-01-24',
    author: 'PRISM Team',
    
    // Dependencies
    requires: ['PRISM_CONSTANTS', 'PRISM_VALIDATOR'],
    
    // Statistics
    entryCount: 0,
    fieldCount: 0,
    totalSize: '0KB'
  },

  // ═══════════════════════════════════════════════════════════════
  // CONSUMER REGISTRY (Required - MUST list ALL consumers)
  // ═══════════════════════════════════════════════════════════════
  _consumers: {
    // Format: consumerId: { fields: [...], routes: [...], usage: 'description' }
    
    'PRISM_SPEED_FEED_CALCULATOR': {
      fields: ['base_speed', 'machinability', 'hardness'],
      routes: ['gateway/materials/cutting-params'],
      usage: 'Primary speed/feed calculations',
      criticality: 'HIGH'
    },
    
    'PRISM_FORCE_CALCULATOR': {
      fields: ['kc1_1', 'mc', 'yield_strength'],
      routes: ['gateway/materials/force-params'],
      usage: 'Cutting force predictions',
      criticality: 'HIGH'
    },
    
    // ... ALL consumers must be listed
  },

  // ═══════════════════════════════════════════════════════════════
  // FIELD DEFINITIONS (Required - MUST document every field)
  // ═══════════════════════════════════════════════════════════════
  _fields: {
    // Format: fieldName: { type, unit, range, consumers: [...] }
    
    'base_speed': {
      type: 'number',
      unit: 'm/min',
      range: { min: 0, max: 2000 },
      consumers: ['PRISM_SPEED_FEED_CALCULATOR', 'PRISM_CYCLE_TIME'],
      description: 'Base cutting speed for material'
    },
    
    // ... ALL fields must be documented
  },

  // ═══════════════════════════════════════════════════════════════
  // GATEWAY ROUTES (Required - How consumers access this data)
  // ═══════════════════════════════════════════════════════════════
  _routes: {
    'getData': {
      path: 'gateway/[category]/[database]/get',
      method: 'GET',
      params: ['id', 'fields[]'],
      returns: 'object',
      consumers: ['*']
    },
    
    'query': {
      path: 'gateway/[category]/[database]/query',
      method: 'POST',
      params: ['filters', 'fields[]', 'limit'],
      returns: 'array',
      consumers: ['*']
    },
    
    'getByProperty': {
      path: 'gateway/[category]/[database]/by-property',
      method: 'GET',
      params: ['property', 'value'],
      returns: 'array',
      consumers: ['*']
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // DATA ENTRIES
  // ═══════════════════════════════════════════════════════════════
  data: {
    // Actual data entries go here
  },

  // ═══════════════════════════════════════════════════════════════
  // ACCESS METHODS
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Get entry by ID with layer resolution
   * @param {string} id - Entry identifier
   * @param {string[]} fields - Optional field filter
   * @returns {object} Entry data with source layer
   */
  get(id, fields = null) {
    // Resolve through CORE → ENHANCED → USER → LEARNED layers
    const entry = this._resolveLayered(id);
    if (!entry) return null;
    
    return fields 
      ? this._filterFields(entry, fields)
      : entry;
  },

  /**
   * Query entries with filters
   * @param {object} filters - Filter criteria
   * @param {string[]} fields - Fields to return
   * @returns {array} Matching entries
   */
  query(filters, fields = null) {
    return Object.entries(this.data)
      .filter(([id, entry]) => this._matchFilters(entry, filters))
      .map(([id, entry]) => ({
        id,
        ...this._filterFields(entry, fields)
      }));
  },

  // Internal methods
  _resolveLayered(id) { /* Layer resolution logic */ },
  _filterFields(entry, fields) { /* Field filtering */ },
  _matchFilters(entry, filters) { /* Filter matching */ }
};

// MANDATORY: Register with Gateway
PRISM_GATEWAY.registerDatabase(PRISM_[DATABASE_NAME]);

// MANDATORY: Export for consumers
if (typeof module !== 'undefined') {
  module.exports = PRISM_[DATABASE_NAME];
}
```

---

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

---

## 4. GATEWAY ROUTE REGISTRATION

### 4.1 Route Definition Pattern

```javascript
/**
 * PRISM Gateway Route Registration
 * Every database and consumer must register its routes
 */

// ═══════════════════════════════════════════════════════════════
// ROUTE CATEGORIES
// ═══════════════════════════════════════════════════════════════

const GATEWAY_ROUTES = {
  
  // ─────────────────────────────────────────────────────────────
  // MATERIALS ROUTES
  // ─────────────────────────────────────────────────────────────
  materials: {
    // Core data access
    'get': {
      path: '/api/v1/materials/:id',
      method: 'GET',
      handler: 'PRISM_MATERIALS_MASTER.get',
      params: {
        id: { type: 'string', required: true },
        fields: { type: 'array', required: false }
      },
      consumers: [
        'PRISM_SPEED_FEED_CALCULATOR',
        'PRISM_FORCE_CALCULATOR',
        'PRISM_THERMAL_ENGINE',
        'PRISM_TOOL_LIFE_ENGINE',
        'PRISM_CHATTER_PREDICTION',
        'PRISM_COST_ESTIMATOR',
        'PRISM_QUOTING_ENGINE',
        'PRISM_AI_LEARNING_PIPELINE'
      ]
    },
    
    'query': {
      path: '/api/v1/materials/query',
      method: 'POST',
      handler: 'PRISM_MATERIALS_MASTER.query',
      params: {
        filters: { type: 'object', required: true },
        fields: { type: 'array', required: false },
        limit: { type: 'number', default: 100 }
      },
      consumers: ['*']
    },
    
    'by-category': {
      path: '/api/v1/materials/category/:category',
      method: 'GET',
      handler: 'PRISM_MATERIALS_MASTER.getByCategory',
      params: {
        category: { type: 'string', required: true }
      },
      consumers: ['PRISM_MATERIAL_SELECTOR', 'PRISM_UI_MATERIAL_DROPDOWN']
    },
    
    // Cutting parameters
    'cutting-params': {
      path: '/api/v1/materials/:id/cutting',
      method: 'GET',
      handler: 'PRISM_MATERIALS_MASTER.getCuttingParams',
      params: {
        id: { type: 'string', required: true },
        operation: { type: 'string', required: false }
      },
      consumers: [
        'PRISM_SPEED_FEED_CALCULATOR',
        'PRISM_TOOLPATH_ENGINE',
        'PRISM_POST_PROCESSOR'
      ]
    },
    
    // Force model parameters
    'force-params': {
      path: '/api/v1/materials/:id/force-model',
      method: 'GET',
      handler: 'PRISM_MATERIALS_MASTER.getForceParams',
      params: {
        id: { type: 'string', required: true }
      },
      consumers: [
        'PRISM_FORCE_CALCULATOR',
        'PRISM_CHATTER_PREDICTION',
        'PRISM_DEFLECTION_ENGINE'
      ]
    },
    
    // Thermal properties
    'thermal-params': {
      path: '/api/v1/materials/:id/thermal',
      method: 'GET',
      handler: 'PRISM_MATERIALS_MASTER.getThermalParams',
      params: {
        id: { type: 'string', required: true }
      },
      consumers: [
        'PRISM_THERMAL_ENGINE',
        'PRISM_TOOL_LIFE_ENGINE',
        'PRISM_COOLANT_SELECTOR'
      ]
    }
  },

  // ─────────────────────────────────────────────────────────────
  // MACHINES ROUTES
  // ─────────────────────────────────────────────────────────────
  machines: {
    'get': {
      path: '/api/v1/machines/:id',
      method: 'GET',
      handler: 'PRISM_MACHINES_DATABASE.get',
      consumers: [
        'PRISM_SPEED_FEED_CALCULATOR',
        'PRISM_COLLISION_ENGINE',
        'PRISM_POST_PROCESSOR_GENERATOR',
        'PRISM_CHATTER_PREDICTION',
        'PRISM_CYCLE_TIME_PREDICTOR',
        'PRISM_COST_ESTIMATOR',
        'PRISM_SCHEDULING_ENGINE',
        'PRISM_3D_VISUALIZATION'
      ]
    },
    
    'capabilities': {
      path: '/api/v1/machines/:id/capabilities',
      method: 'GET',
      handler: 'PRISM_MACHINES_DATABASE.getCapabilities',
      consumers: [
        'PRISM_CAPABILITY_MATCHER',
        'PRISM_SCHEDULING_ENGINE',
        'PRISM_QUOTING_ENGINE'
      ]
    },
    
    'kinematics': {
      path: '/api/v1/machines/:id/kinematics',
      method: 'GET',
      handler: 'PRISM_MACHINES_DATABASE.getKinematics',
      consumers: [
        'PRISM_COLLISION_ENGINE',
        'PRISM_3D_VISUALIZATION',
        'PRISM_POST_PROCESSOR_GENERATOR'
      ]
    },
    
    'by-manufacturer': {
      path: '/api/v1/machines/manufacturer/:manufacturer',
      method: 'GET',
      handler: 'PRISM_MACHINES_DATABASE.getByManufacturer',
      consumers: ['PRISM_UI_MACHINE_SELECTOR', 'PRISM_CATALOG_BROWSER']
    }
  },

  // ─────────────────────────────────────────────────────────────
  // TOOLS ROUTES
  // ─────────────────────────────────────────────────────────────
  tools: {
    'get': {
      path: '/api/v1/tools/:id',
      method: 'GET',
      handler: 'PRISM_TOOLS_DATABASE.get',
      consumers: [
        'PRISM_SPEED_FEED_CALCULATOR',
        'PRISM_FORCE_CALCULATOR',
        'PRISM_TOOL_LIFE_ENGINE',
        'PRISM_DEFLECTION_ENGINE',
        'PRISM_COLLISION_ENGINE',
        'PRISM_COST_ESTIMATOR'
      ]
    },
    
    'by-type': {
      path: '/api/v1/tools/type/:type',
      method: 'GET',
      handler: 'PRISM_TOOLS_DATABASE.getByType',
      consumers: ['PRISM_TOOL_SELECTOR', 'PRISM_UI_TOOL_LIBRARY']
    },
    
    'recommend': {
      path: '/api/v1/tools/recommend',
      method: 'POST',
      handler: 'PRISM_TOOL_RECOMMENDER.recommend',
      params: {
        material: { type: 'string', required: true },
        operation: { type: 'string', required: true },
        constraints: { type: 'object', required: false }
      },
      consumers: ['PRISM_AUTO_PROGRAMMER', 'PRISM_QUOTING_ENGINE']
    }
  },

  // ─────────────────────────────────────────────────────────────
  // CALCULATION ROUTES
  // ─────────────────────────────────────────────────────────────
  calculations: {
    'speed-feed': {
      path: '/api/v1/calculate/speed-feed',
      method: 'POST',
      handler: 'PRISM_SPEED_FEED_CALCULATOR.calculate',
      params: {
        materialId: { type: 'string', required: true },
        toolId: { type: 'string', required: true },
        machineId: { type: 'string', required: true },
        operation: { type: 'string', required: true },
        doc: { type: 'number', required: false },
        woc: { type: 'number', required: false }
      },
      dataSources: [
        'PRISM_MATERIALS_MASTER',
        'PRISM_TOOLS_DATABASE',
        'PRISM_MACHINES_DATABASE'
      ],
      consumers: ['PRISM_UI_CALCULATOR', 'PRISM_AUTO_PROGRAMMER']
    },
    
    'forces': {
      path: '/api/v1/calculate/forces',
      method: 'POST',
      handler: 'PRISM_FORCE_CALCULATOR.calculate',
      dataSources: [
        'PRISM_MATERIALS_MASTER',
        'PRISM_TOOLS_DATABASE'
      ],
      consumers: [
        'PRISM_CHATTER_PREDICTION',
        'PRISM_DEFLECTION_ENGINE',
        'PRISM_POWER_CHECK'
      ]
    },
    
    'tool-life': {
      path: '/api/v1/calculate/tool-life',
      method: 'POST',
      handler: 'PRISM_TOOL_LIFE_ENGINE.calculate',
      dataSources: [
        'PRISM_MATERIALS_MASTER',
        'PRISM_TOOLS_DATABASE'
      ],
      consumers: ['PRISM_COST_ESTIMATOR', 'PRISM_QUOTING_ENGINE']
    }
  }
};

// Register all routes with Gateway
Object.entries(GATEWAY_ROUTES).forEach(([category, routes]) => {
  Object.entries(routes).forEach(([name, config]) => {
    PRISM_GATEWAY.registerRoute(`${category}/${name}`, config);
  });
});
```

---

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

---

## 6. COMPLETE WIRING EXAMPLE: MATERIALS DATABASE

### 6.1 Full Implementation

```javascript
/**
 * PRISM_MATERIALS_MASTER - Complete Wiring Example
 * Demonstrates proper database→consumer wiring with 15+ consumers
 */

const PRISM_MATERIALS_MASTER = {
  // ═══════════════════════════════════════════════════════════════
  // METADATA
  // ═══════════════════════════════════════════════════════════════
  _meta: {
    id: 'PRISM_MATERIALS_MASTER',
    version: '9.0.0',
    category: 'materials',
    layer: 'ENHANCED',
    minConsumers: 15,
    
    // Statistics
    entryCount: 1047,
    fieldCount: 127,
    categories: 30
  },

  // ═══════════════════════════════════════════════════════════════
  // CONSUMER REGISTRY - ALL 15+ CONSUMERS
  // ═══════════════════════════════════════════════════════════════
  _consumers: {
    // ─────────────────────────────────────────────────────────────
    // CALCULATION CONSUMERS
    // ─────────────────────────────────────────────────────────────
    'PRISM_SPEED_FEED_CALCULATOR': {
      fields: [
        'base_speed', 'machinability_index', 'hardness_brinell',
        'recommended_speed_range', 'feed_factor'
      ],
      routes: ['materials/get', 'materials/cutting-params'],
      usage: 'Primary cutting parameter calculations',
      criticality: 'CRITICAL'
    },
    
    'PRISM_FORCE_CALCULATOR': {
      fields: [
        'kc1_1', 'mc', 'yield_strength', 'ultimate_strength',
        'specific_cutting_force', 'shear_angle'
      ],
      routes: ['materials/force-params'],
      usage: 'Cutting force predictions using Kienzle model',
      criticality: 'CRITICAL'
    },
    
    'PRISM_THERMAL_ENGINE': {
      fields: [
        'thermal_conductivity', 'specific_heat', 'melting_point',
        'thermal_diffusivity', 'emissivity'
      ],
      routes: ['materials/thermal-params'],
      usage: 'Temperature predictions and thermal analysis',
      criticality: 'HIGH'
    },
    
    'PRISM_TOOL_LIFE_ENGINE': {
      fields: [
        'taylor_n', 'taylor_C', 'abrasiveness_index',
        'hardness_brinell', 'carbide_content'
      ],
      routes: ['materials/get'],
      usage: 'Taylor tool life calculations',
      criticality: 'HIGH'
    },
    
    'PRISM_SURFACE_FINISH_ENGINE': {
      fields: [
        'elastic_modulus', 'built_up_edge_tendency',
        'surface_finish_factor', 'springback_coefficient'
      ],
      routes: ['materials/get'],
      usage: 'Surface finish predictions',
      criticality: 'MEDIUM'
    },
    
    'PRISM_CHATTER_PREDICTION': {
      fields: [
        'damping_ratio', 'elastic_modulus', 'kc1_1', 'mc',
        'dynamic_modulus'
      ],
      routes: ['materials/force-params'],
      usage: 'Stability lobe diagram generation',
      criticality: 'HIGH'
    },
    
    'PRISM_CHIP_FORMATION_ENGINE': {
      fields: [
        'strain_hardening_coefficient', 'chip_formation_type',
        'segmented_chip_tendency', 'johnson_cook_A', 'johnson_cook_B'
      ],
      routes: ['materials/get'],
      usage: 'Chip morphology predictions',
      criticality: 'MEDIUM'
    },
    
    // ─────────────────────────────────────────────────────────────
    // RECOMMENDATION CONSUMERS
    // ─────────────────────────────────────────────────────────────
    'PRISM_COOLANT_SELECTOR': {
      fields: [
        'chemical_reactivity', 'coolant_compatibility',
        'thermal_conductivity', 'corrosion_resistance'
      ],
      routes: ['materials/get'],
      usage: 'Coolant type recommendations',
      criticality: 'MEDIUM'
    },
    
    'PRISM_COATING_OPTIMIZER': {
      fields: [
        'chemical_affinity_titanium', 'chemical_affinity_aluminum',
        'operating_temperature_max', 'abrasiveness_index'
      ],
      routes: ['materials/get'],
      usage: 'Optimal tool coating selection',
      criticality: 'MEDIUM'
    },
    
    // ─────────────────────────────────────────────────────────────
    // BUSINESS CONSUMERS
    // ─────────────────────────────────────────────────────────────
    'PRISM_COST_ESTIMATOR': {
      fields: [
        'material_cost_per_kg', 'density', 'machinability_index',
        'typical_markup'
      ],
      routes: ['materials/get'],
      usage: 'Material cost calculations for quotes',
      criticality: 'HIGH'
    },
    
    'PRISM_CYCLE_TIME_PREDICTOR': {
      fields: [
        'machinability_index', 'base_speed', 'feed_factor',
        'typical_depth_of_cut'
      ],
      routes: ['materials/cutting-params'],
      usage: 'Machining time estimates',
      criticality: 'HIGH'
    },
    
    'PRISM_QUOTING_ENGINE': {
      fields: [
        'material_cost_per_kg', 'machinability_index',
        'difficulty_factor', 'special_handling'
      ],
      routes: ['materials/get'],
      usage: 'Automated quote generation',
      criticality: 'HIGH'
    },
    
    // ─────────────────────────────────────────────────────────────
    // AI/ML CONSUMERS
    // ─────────────────────────────────────────────────────────────
    'PRISM_AI_LEARNING_PIPELINE': {
      fields: ['*'],  // Needs ALL fields for training
      routes: ['materials/query'],
      usage: 'Machine learning model training',
      criticality: 'HIGH'
    },
    
    'PRISM_BAYESIAN_OPTIMIZER': {
      fields: [
        'base_speed', 'machinability_index', 'kc1_1',
        'uncertainty_ranges'
      ],
      routes: ['materials/get'],
      usage: 'Bayesian parameter optimization with uncertainty',
      criticality: 'MEDIUM'
    },
    
    'PRISM_EXPLAINABLE_AI': {
      fields: ['*'],  // Needs all for explanations
      routes: ['materials/get'],
      usage: 'XAI recommendation explanations',
      criticality: 'MEDIUM'
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // FIELD DEFINITIONS (127 parameters - abbreviated)
  // ═══════════════════════════════════════════════════════════════
  _fields: {
    // Identification (5)
    'id': { type: 'string', consumers: ['*'] },
    'name': { type: 'string', consumers: ['*'] },
    'category': { type: 'string', consumers: ['PRISM_MATERIAL_SELECTOR'] },
    'subcategory': { type: 'string', consumers: ['PRISM_MATERIAL_SELECTOR'] },
    'specification': { type: 'string', consumers: ['PRISM_QUOTING_ENGINE'] },
    
    // Composition (15)
    'carbon': { type: 'number', unit: '%', consumers: ['PRISM_THERMAL_ENGINE'] },
    'chromium': { type: 'number', unit: '%', consumers: ['PRISM_THERMAL_ENGINE'] },
    // ... more composition fields
    
    // Physical Properties (12)
    'density': { 
      type: 'number', 
      unit: 'g/cm³', 
      consumers: ['PRISM_COST_ESTIMATOR', 'PRISM_FORCE_CALCULATOR'] 
    },
    'melting_point': { 
      type: 'number', 
      unit: '°C', 
      consumers: ['PRISM_THERMAL_ENGINE'] 
    },
    // ... more physical properties
    
    // Mechanical Properties (15)
    'hardness_brinell': {
      type: 'number',
      unit: 'HB',
      consumers: ['PRISM_SPEED_FEED_CALCULATOR', 'PRISM_TOOL_LIFE_ENGINE']
    },
    'yield_strength': {
      type: 'number',
      unit: 'MPa',
      consumers: ['PRISM_FORCE_CALCULATOR', 'PRISM_DEFLECTION_ENGINE']
    },
    // ... more mechanical properties
    
    // Cutting Force Model (10)
    'kc1_1': {
      type: 'number',
      unit: 'N/mm²',
      consumers: ['PRISM_FORCE_CALCULATOR', 'PRISM_CHATTER_PREDICTION']
    },
    'mc': {
      type: 'number',
      unit: 'dimensionless',
      consumers: ['PRISM_FORCE_CALCULATOR', 'PRISM_CHATTER_PREDICTION']
    },
    // ... more Kienzle parameters
    
    // Johnson-Cook Model (8)
    'johnson_cook_A': {
      type: 'number',
      unit: 'MPa',
      consumers: ['PRISM_CHIP_FORMATION_ENGINE', 'PRISM_FEA_ENGINE']
    },
    // ... more J-C parameters
    
    // Tool Life / Taylor (8)
    'taylor_n': {
      type: 'number',
      unit: 'dimensionless',
      consumers: ['PRISM_TOOL_LIFE_ENGINE']
    },
    'taylor_C': {
      type: 'number',
      unit: 'm/min',
      consumers: ['PRISM_TOOL_LIFE_ENGINE']
    },
    // ... more Taylor parameters
    
    // Thermal Properties (10)
    'thermal_conductivity': {
      type: 'number',
      unit: 'W/(m·K)',
      consumers: ['PRISM_THERMAL_ENGINE', 'PRISM_COOLANT_SELECTOR']
    },
    // ... more thermal properties
    
    // Machinability Indices (10)
    'machinability_index': {
      type: 'number',
      unit: '%',
      consumers: ['PRISM_SPEED_FEED_CALCULATOR', 'PRISM_CYCLE_TIME_PREDICTOR']
    },
    // ... more indices
    
    // Recommended Parameters (15)
    'base_speed': {
      type: 'number',
      unit: 'm/min',
      consumers: ['PRISM_SPEED_FEED_CALCULATOR']
    },
    // ... more recommendations
    
    // Statistical Metadata (9)
    'data_confidence': {
      type: 'number',
      unit: '%',
      consumers: ['PRISM_BAYESIAN_OPTIMIZER', 'PRISM_EXPLAINABLE_AI']
    }
    // ... more metadata
  },

  // ═══════════════════════════════════════════════════════════════
  // GATEWAY ROUTES
  // ═══════════════════════════════════════════════════════════════
  _routes: {
    'get': {
      path: '/api/v1/materials/:id',
      method: 'GET',
      handler: 'get'
    },
    'query': {
      path: '/api/v1/materials/query',
      method: 'POST',
      handler: 'query'
    },
    'cutting-params': {
      path: '/api/v1/materials/:id/cutting',
      method: 'GET',
      handler: 'getCuttingParams'
    },
    'force-params': {
      path: '/api/v1/materials/:id/force-model',
      method: 'GET',
      handler: 'getForceParams'
    },
    'thermal-params': {
      path: '/api/v1/materials/:id/thermal',
      method: 'GET',
      handler: 'getThermalParams'
    },
    'by-category': {
      path: '/api/v1/materials/category/:category',
      method: 'GET',
      handler: 'getByCategory'
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // DATA (actual material entries)
  // ═══════════════════════════════════════════════════════════════
  data: {
    // 1047 materials with 127 parameters each
    // See materials databases for complete data
  },

  // ═══════════════════════════════════════════════════════════════
  // ACCESS METHODS
  // ═══════════════════════════════════════════════════════════════
  
  get(id, fields = null) {
    const entry = this.data[id];
    if (!entry) return null;
    
    if (!fields) return { ...entry, _source: 'PRISM_MATERIALS_MASTER' };
    
    const filtered = {};
    fields.forEach(f => {
      if (entry[f] !== undefined) filtered[f] = entry[f];
    });
    return { ...filtered, _source: 'PRISM_MATERIALS_MASTER' };
  },

  getCuttingParams(id) {
    const entry = this.data[id];
    if (!entry) return null;
    
    return {
      base_speed: entry.base_speed,
      feed_factor: entry.feed_factor,
      doc_max: entry.recommended_doc,
      woc_max: entry.recommended_woc,
      machinability_index: entry.machinability_index,
      _source: 'PRISM_MATERIALS_MASTER'
    };
  },

  getForceParams(id) {
    const entry = this.data[id];
    if (!entry) return null;
    
    return {
      kc1_1: entry.kc1_1,
      mc: entry.mc,
      kc1_1_range: entry.kc1_1_uncertainty,
      yield_strength: entry.yield_strength,
      ultimate_strength: entry.ultimate_strength,
      _source: 'PRISM_MATERIALS_MASTER'
    };
  },

  getThermalParams(id) {
    const entry = this.data[id];
    if (!entry) return null;
    
    return {
      thermal_conductivity: entry.thermal_conductivity,
      specific_heat: entry.specific_heat,
      thermal_diffusivity: entry.thermal_diffusivity,
      melting_point: entry.melting_point,
      emissivity: entry.emissivity,
      _source: 'PRISM_MATERIALS_MASTER'
    };
  },

  getByCategory(category) {
    return Object.entries(this.data)
      .filter(([id, entry]) => entry.category === category)
      .map(([id, entry]) => ({
        id,
        name: entry.name,
        subcategory: entry.subcategory
      }));
  },

  query(filters, fields = null, limit = 100) {
    const results = [];
    
    for (const [id, entry] of Object.entries(this.data)) {
      if (results.length >= limit) break;
      
      let match = true;
      for (const [key, value] of Object.entries(filters)) {
        if (entry[key] !== value) {
          match = false;
          break;
        }
      }
      
      if (match) {
        results.push(this.get(id, fields));
      }
    }
    
    return results;
  }
};

// Register with Gateway
PRISM_GATEWAY.registerDatabase(PRISM_MATERIALS_MASTER);

// Verify utilization at registration
const verification = PRISM_UTILIZATION_VERIFIER.verifyDatabase('PRISM_MATERIALS_MASTER');
if (!verification.valid) {
  console.warn(`⚠️ PRISM_MATERIALS_MASTER: ${verification.consumers}/${verification.minimum} consumers`);
}
```

---

*END OF PART 1*

---


# PART 2: ADVANCED WIRING PATTERNS

---

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

---

## 8. EVENT-DRIVEN WIRING PATTERNS

### 8.1 Event Bus Subscription

```javascript
/**
 * PRISM Event-Driven Wiring
 * For real-time data flow between components
 */

const PRISM_EVENT_WIRING = {
  
  // ═══════════════════════════════════════════════════════════════
  // EVENT DEFINITIONS
  // ═══════════════════════════════════════════════════════════════
  events: {
    // Data change events
    'material:updated': {
      source: 'PRISM_MATERIALS_MASTER',
      payload: { id: 'string', changedFields: 'array', newValues: 'object' },
      subscribers: [
        'PRISM_SPEED_FEED_CALCULATOR',
        'PRISM_AI_LEARNING_PIPELINE',
        'PRISM_CACHE_MANAGER'
      ]
    },
    
    'machine:updated': {
      source: 'PRISM_MACHINES_DATABASE',
      payload: { id: 'string', changedFields: 'array', layer: 'string' },
      subscribers: [
        'PRISM_COLLISION_ENGINE',
        'PRISM_POST_PROCESSOR_GENERATOR',
        'PRISM_SCHEDULING_ENGINE'
      ]
    },
    
    // Calculation events
    'calculation:started': {
      source: '*_CALCULATOR',
      payload: { calculatorId: 'string', params: 'object', requestId: 'string' },
      subscribers: ['PRISM_METRICS_COLLECTOR', 'PRISM_AUDIT_LOGGER']
    },
    
    'calculation:completed': {
      source: '*_CALCULATOR',
      payload: { 
        calculatorId: 'string', 
        result: 'object', 
        duration: 'number',
        dataSources: 'array'
      },
      subscribers: [
        'PRISM_LEARNING_PIPELINE',
        'PRISM_METRICS_COLLECTOR',
        'PRISM_UI_ADAPTER'
      ]
    },
    
    // Learning events
    'feedback:received': {
      source: 'PRISM_UI_ADAPTER',
      payload: { 
        calculationId: 'string',
        feedbackType: 'string',  // 'accept', 'reject', 'modify'
        actualValues: 'object'
      },
      subscribers: [
        'PRISM_LEARNING_PIPELINE',
        'PRISM_BAYESIAN_OPTIMIZER'
      ]
    },
    
    'model:retrained': {
      source: 'PRISM_LEARNING_PIPELINE',
      payload: { modelId: 'string', metrics: 'object', timestamp: 'string' },
      subscribers: ['PRISM_AUDIT_LOGGER', 'PRISM_NOTIFICATION_SERVICE']
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // SUBSCRIPTION TEMPLATE
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Register event subscription
   */
  subscribe(eventName, subscriberId, handler, options = {}) {
    const event = this.events[eventName];
    if (!event) {
      throw new Error(`Unknown event: ${eventName}`);
    }
    
    // Validate subscriber is registered consumer
    if (!event.subscribers.includes(subscriberId) && !event.subscribers.includes('*')) {
      console.warn(`${subscriberId} not in official subscribers for ${eventName}`);
    }
    
    PRISM_EVENT_BUS.subscribe(eventName, {
      id: subscriberId,
      handler,
      filter: options.filter || null,
      priority: options.priority || 'NORMAL',
      async: options.async !== false
    });
    
    return () => PRISM_EVENT_BUS.unsubscribe(eventName, subscriberId);
  },

  /**
   * Emit event with validation
   */
  emit(eventName, payload, sourceId) {
    const event = this.events[eventName];
    if (!event) {
      throw new Error(`Unknown event: ${eventName}`);
    }
    
    // Validate source
    if (event.source !== '*' && !sourceId.match(event.source.replace('*', '.*'))) {
      throw new Error(`${sourceId} not authorized to emit ${eventName}`);
    }
    
    // Validate payload
    this._validatePayload(payload, event.payload);
    
    PRISM_EVENT_BUS.emit(eventName, {
      ...payload,
      _source: sourceId,
      _timestamp: Date.now()
    });
  },

  _validatePayload(payload, schema) {
    Object.entries(schema).forEach(([key, type]) => {
      if (payload[key] === undefined) {
        throw new Error(`Missing required payload field: ${key}`);
      }
      if (typeof payload[key] !== type && type !== 'object' && type !== 'array') {
        throw new Error(`Invalid type for ${key}: expected ${type}`);
      }
    });
  }
};

// Example: Calculator subscribing to material updates
PRISM_EVENT_WIRING.subscribe(
  'material:updated',
  'PRISM_SPEED_FEED_CALCULATOR',
  (event) => {
    // Invalidate cached calculations for this material
    PRISM_SPEED_FEED_CALCULATOR.invalidateCache(event.id);
    console.log(`Cache invalidated for material ${event.id}`);
  }
);

// Example: Emitting calculation completed event
PRISM_EVENT_WIRING.emit(
  'calculation:completed',
  {
    calculatorId: 'PRISM_SPEED_FEED_CALCULATOR',
    result: { speed: 150, feed: 0.2, confidence: 0.92 },
    duration: 45,
    dataSources: ['PRISM_MATERIALS_MASTER', 'PRISM_TOOLS_DATABASE', 'PRISM_MACHINES_DATABASE']
  },
  'PRISM_SPEED_FEED_CALCULATOR'
);
```

---

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

---

## 10. WIRING VALIDATION CHECKLIST

### 10.1 Pre-Migration Checklist

```markdown
# DATABASE WIRING VALIDATION CHECKLIST
## Complete before migrating ANY database to v9.0

### PHASE 1: Consumer Identification
- [ ] List ALL modules that use this database
- [ ] Document which fields each consumer needs
- [ ] Identify minimum consumer count requirement
- [ ] Verify actual consumers meet minimum

### PHASE 2: Field Coverage
- [ ] Document ALL fields in database
- [ ] Map each field to its consumers
- [ ] Identify any unused fields → REMOVE or ADD CONSUMER
- [ ] Verify no field has 0 consumers

### PHASE 3: Route Registration
- [ ] Define Gateway routes for data access
- [ ] Register GET route for single entry
- [ ] Register QUERY route for filtered access
- [ ] Register specialized routes (cutting-params, etc.)
- [ ] Map routes to consumers

### PHASE 4: Event Wiring
- [ ] Define update events for this database
- [ ] Register all subscribers to update events
- [ ] Implement cache invalidation handlers
- [ ] Test event propagation

### PHASE 5: Layer Resolution (if hierarchical)
- [ ] Define which layers exist (CORE/ENHANCED/USER/LEARNED)
- [ ] Implement resolution order
- [ ] Test override behavior
- [ ] Document layer priorities

### PHASE 6: Verification
- [ ] Run PRISM_UTILIZATION_VERIFIER.verifyDatabase(id)
- [ ] Verify result.valid === true
- [ ] Check fieldCoverage.unused.length === 0
- [ ] Document final consumer list

### PHASE 7: Integration Testing
- [ ] Test each consumer's access pattern
- [ ] Verify all routes return expected data
- [ ] Test with missing/invalid IDs
- [ ] Verify fallback behavior
```

### 10.2 Consumer Registration Checklist

```markdown
# CONSUMER WIRING VALIDATION CHECKLIST
## Complete before registering ANY consumer

### PHASE 1: Data Source Declaration
- [ ] List ALL databases this consumer needs
- [ ] Document specific fields from each database
- [ ] Identify required vs optional sources
- [ ] Define fallback databases for each source

### PHASE 2: Connection Setup
- [ ] Implement init() method
- [ ] Connect to all required databases via Gateway
- [ ] Register as consumer with each database
- [ ] Handle connection failures gracefully

### PHASE 3: Calculation Implementation
- [ ] Use data from ALL declared sources
- [ ] Implement 6+ source combination
- [ ] Apply appropriate fusion weights
- [ ] Include hard constraint checking

### PHASE 4: Output Documentation
- [ ] Define all output fields
- [ ] Include source tracking (_sources)
- [ ] Include confidence/uncertainty
- [ ] Add timestamp and audit info

### PHASE 5: Event Integration
- [ ] Subscribe to relevant data change events
- [ ] Implement cache invalidation
- [ ] Emit calculation completed events
- [ ] Handle feedback events if applicable

### PHASE 6: Verification
- [ ] Test with valid inputs
- [ ] Test with missing data (fallback behavior)
- [ ] Verify output includes all _sources
- [ ] Confirm registration in all source databases
```

---

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

---

## 12. QUICK REFERENCE

### 12.1 Wiring Patterns Summary

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                         PRISM WIRING QUICK REFERENCE                           ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  DATABASE REGISTRATION                                                        ║
║  ─────────────────────────────────────────────────────────────────────────    ║
║  1. Define _meta with minConsumers                                            ║
║  2. List ALL consumers in _consumers                                          ║
║  3. Document ALL fields in _fields with consumers                             ║
║  4. Define _routes for Gateway access                                         ║
║  5. Call PRISM_GATEWAY.registerDatabase()                                     ║
║                                                                               ║
║  CONSUMER REGISTRATION                                                        ║
║  ─────────────────────────────────────────────────────────────────────────    ║
║  1. Declare dataSources in _meta                                              ║
║  2. Connect to sources in init()                                              ║
║  3. Register with each source database                                        ║
║  4. Use ALL sources in calculations                                           ║
║  5. Return results with _sources tracking                                     ║
║                                                                               ║
║  MINIMUM REQUIREMENTS                                                         ║
║  ─────────────────────────────────────────────────────────────────────────    ║
║  Materials: 15+ consumers     Machines: 12+ consumers                         ║
║  Tools: 10+ consumers         Workholding: 8+ consumers                       ║
║  Other: 6+ consumers          Lookups: 4+ consumers                           ║
║                                                                               ║
║  CALCULATION REQUIREMENTS                                                     ║
║  ─────────────────────────────────────────────────────────────────────────    ║
║  Every calculation MUST use:                                                  ║
║  1. Database values (material/tool/machine)                                   ║
║  2. Physics engine calculations                                               ║
║  3. Historical data / similar cases                                           ║
║  4. AI/ML recommendations                                                     ║
║  5. Machine constraints (hard limits)                                         ║
║  6. Uncertainty quantification                                                ║
║                                                                               ║
║  OUTPUT REQUIREMENTS                                                          ║
║  ─────────────────────────────────────────────────────────────────────────    ║
║  Every result MUST include:                                                   ║
║  • Primary values                                                             ║
║  • Confidence score (0-1)                                                     ║
║  • Uncertainty ranges                                                         ║
║  • _sources tracking object                                                   ║
║  • _timestamp                                                                 ║
║                                                                               ║
║  VERIFICATION COMMAND                                                         ║
║  ─────────────────────────────────────────────────────────────────────────    ║
║  PRISM_UTILIZATION_VERIFIER.verifyDatabase('DATABASE_ID')                     ║
║  PRISM_UTILIZATION_VERIFIER.verifyAll()                                       ║
║  PRISM_UTILIZATION_VERIFIER.enforceAtBuild()                                  ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

### 12.2 Gateway Access Patterns

```javascript
// GET single entry
PRISM_GATEWAY.get('materials', 'steel-1045');
PRISM_GATEWAY.get('materials', 'steel-1045', ['kc1_1', 'mc']);

// QUERY multiple
PRISM_GATEWAY.query('materials', { category: 'carbon_steel' });

// Specialized routes
PRISM_GATEWAY.call('materials/cutting-params', { id: 'steel-1045' });
PRISM_GATEWAY.call('materials/force-params', { id: 'steel-1045' });

// With layer specification
PRISM_GATEWAY.get('machines', 'haas-vf2', null, { layer: 'ENHANCED' });
```

### 12.3 Event Patterns

```javascript
// Subscribe to updates
PRISM_EVENT_WIRING.subscribe('material:updated', 'MY_CONSUMER', handler);

// Emit calculation complete
PRISM_EVENT_WIRING.emit('calculation:completed', payload, 'CALCULATOR_ID');

// Unsubscribe
const unsubscribe = PRISM_EVENT_WIRING.subscribe(...);
unsubscribe();
```

---

*End of PRISM Wiring Templates Skill v1.0*
