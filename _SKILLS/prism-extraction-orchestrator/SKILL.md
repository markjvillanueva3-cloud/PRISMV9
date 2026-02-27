# PRISM EXTRACTION ORCHESTRATOR SKILL
## Master Coordination for Module Extraction & Construction
## Version 1.0 | 2026-01-30

---

# OVERVIEW

This skill is the MASTER COORDINATOR for all extraction activities in PRISM v9.0 rebuild. It integrates swarm extraction, module building, pattern matching, and quality verification into a unified workflow that handles both real implementations and stub replacements.

---

# WHEN TO USE

- Starting any extraction campaign
- Coordinating multi-agent extraction
- Managing extraction manifests
- Quality verification of extracted modules
- Building missing implementations

---

# ORCHESTRATION ARCHITECTURE

## Skill Dependencies

```
prism-extraction-orchestrator (THIS SKILL - Master Coordinator)
├── prism-swarm-extraction       → Parallel search patterns
├── prism-module-builder         → Build from academic specs
├── prism-aiml-engine-patterns   → Algorithm templates
├── prism-monolith-navigator     → Monolith search strategies
├── prism-monolith-extractor     → Single module extraction
├── prism-monolith-index         → Module location index
├── prism-quality-master         → Validation gates
└── prism-sp-verification        → Completion proof
```

## Agent Hierarchy

| Tier | Agents | Role |
|------|--------|------|
| **OPUS** | coordinator_v2, meta_analyst_v2, combination_optimizer | Strategic decisions, complex extraction |
| **SONNET** | resource_auditor, calibration_engineer, test_orchestrator | Tactical execution, validation |
| **HAIKU** | pattern_scanner, stub_detector, manifest_updater | Rapid pattern matching, bookkeeping |

---

# EXTRACTION CAMPAIGNS

## Campaign Types

### Type 1: TARGETED EXTRACTION
```
Purpose: Extract specific known modules
Agents: 2-4
Duration: 15-30 minutes
Pattern:
  1. Locate module in index
  2. Extract with prism-monolith-extractor
  3. Validate completeness
  4. Update manifest
```

### Type 2: CATEGORY SWEEP
```
Purpose: Extract all modules in a category
Agents: 4-8
Duration: 1-2 hours
Pattern:
  1. Define category patterns
  2. Launch PARALLEL_SEARCH_SWARM
  3. Classify results (stub vs real)
  4. Extract real implementations
  5. Build stubs from specs
  6. Consolidate results
```

### Type 3: DEEP MINING
```
Purpose: Find hidden implementations
Agents: 8 (full swarm)
Duration: 2-4 hours
Pattern:
  1. Launch DEEP_EXTRACTION_SWARM
  2. Multiple pattern variations
  3. Cross-reference analysis
  4. Dependency mapping
  5. Consumer identification
  6. Complete extraction chain
```

---

# CAMPAIGN EXECUTION PROTOCOL

## Phase 1: Reconnaissance (15 min)

### 1.1 Define Targets
```javascript
const campaign = {
  name: 'AI_ML_EXTRACTION',
  category: 'engines/ai_ml',
  targets: [
    // Known modules
    { name: 'PRISM_PSO_OPTIMIZER', priority: 1, type: 'known' },
    { name: 'PRISM_GA_ENGINE', priority: 1, type: 'known' },
    
    // Pattern-based discovery
    { pattern: 'reinforcement|RL_|Q_learning', priority: 2, type: 'pattern' },
    { pattern: 'neural|deep.*learn', priority: 2, type: 'pattern' }
  ],
  constraints: {
    maxAgents: 8,
    maxDuration: '2h',
    qualityGate: 'STANDARD'
  }
};
```

### 1.2 Monolith Reconnaissance
```javascript
async function reconMonolith(campaign) {
  const results = {};
  
  // Check index first
  for (const target of campaign.targets.filter(t => t.type === 'known')) {
    const indexEntry = await lookupInIndex(target.name);
    results[target.name] = {
      inIndex: !!indexEntry,
      lineRange: indexEntry?.lines,
      estimatedSize: indexEntry?.size
    };
  }
  
  // Pattern search for discovery
  for (const target of campaign.targets.filter(t => t.type === 'pattern')) {
    const matches = await searchPattern(target.pattern);
    results[target.pattern] = {
      matchCount: matches.length,
      locations: matches.map(m => m.line)
    };
  }
  
  return results;
}
```

### 1.3 Stub Detection
```javascript
async function detectStubs(results) {
  const classifications = {};
  
  for (const [name, data] of Object.entries(results)) {
    if (!data.inIndex && !data.matchCount) {
      classifications[name] = 'NOT_FOUND';
    } else if (data.estimatedSize < 500) {
      // < 500 bytes likely a stub
      const content = await readModule(name);
      classifications[name] = isStub(content) ? 'STUB' : 'MINIMAL';
    } else {
      classifications[name] = 'REAL_IMPL';
    }
  }
  
  return classifications;
}
```

---

## Phase 2: Extraction (30-60 min)

### 2.1 Real Implementation Extraction
```javascript
async function extractRealImplementations(classifications) {
  const realModules = Object.entries(classifications)
    .filter(([_, type]) => type === 'REAL_IMPL')
    .map(([name, _]) => name);
  
  const extracted = [];
  
  for (const name of realModules) {
    const result = await extractModule(name, {
      validateCompleteness: true,
      extractDependencies: true,
      traceConsumers: true
    });
    
    extracted.push({
      name,
      status: 'EXTRACTED',
      source: 'monolith',
      lines: result.lines,
      path: result.outputPath,
      verification: result.verification
    });
  }
  
  return extracted;
}
```

### 2.2 Parallel Swarm Extraction
```javascript
async function runSwarmExtraction(patterns) {
  // Launch 8 parallel agents
  const swarm = new ExtractionSwarm({
    agents: 8,
    patterns,
    strategy: 'PARALLEL_SEARCH'
  });
  
  return await swarm.execute({
    onMatch: async (match) => {
      // Immediately classify and extract
      const classification = await classifyMatch(match);
      if (classification === 'REAL_IMPL') {
        return await extractImmediate(match);
      }
      return { match, needsBuild: true };
    },
    onComplete: (results) => {
      // Consolidate and deduplicate
      return consolidateResults(results);
    }
  });
}
```

---

## Phase 3: Construction (30-60 min)

### 3.1 Build Missing Modules
```javascript
async function buildMissingModules(classifications) {
  const needsBuild = Object.entries(classifications)
    .filter(([_, type]) => type === 'STUB' || type === 'NOT_FOUND');
  
  const built = [];
  
  for (const [name, type] of needsBuild) {
    // Determine academic sources
    const sources = await lookupAcademicSources(name);
    
    // Use module builder
    const result = await buildFromSpec({
      name,
      category: determineCategory(name),
      sources,
      template: await selectTemplate(name),
      includeManufacturing: true,
      includeSelfTest: true
    });
    
    built.push({
      name,
      status: 'BUILT',
      source: 'academic_spec',
      academicSources: sources,
      lines: result.lines,
      path: result.outputPath
    });
  }
  
  return built;
}
```

### 3.2 Module Builder Integration
```javascript
const MODULE_BUILDER_CONFIG = {
  // Template selection by category
  templates: {
    'optimization': 'metaheuristic_template',
    'reinforcement': 'rl_agent_template',
    'deep_learning': 'neural_network_template',
    'ensemble': 'ensemble_template',
    'probabilistic': 'bayesian_template'
  },
  
  // Academic source lookup
  academicLookup: {
    'GA': ['MIT 6.034', 'Holland 1975', 'Goldberg 1989'],
    'SA': ['MIT 6.034', 'Kirkpatrick 1983'],
    'DE': ['MIT 6.036', 'Storn & Price 1997'],
    'PSO': ['MIT 6.034', 'Kennedy & Eberhart 1995'],
    'Q_LEARNING': ['MIT 6.036', 'Stanford CS 234', 'Watkins 1989'],
    'DQN': ['MIT 6.036', 'Mnih 2015', 'van Hasselt 2016']
  },
  
  // Required components
  requirements: {
    manufacturing: true,      // Always include manufacturing integration
    selfTest: true,           // Always include self-test
    nodeExport: true,         // Node.js module.exports
    browserExport: true       // Browser window attachment
  }
};
```

---

## Phase 4: Verification (15 min)

### 4.1 Quality Gate
```javascript
async function verifyExtraction(extracted, built) {
  const allModules = [...extracted, ...built];
  const verification = {
    passed: [],
    failed: [],
    warnings: []
  };
  
  for (const module of allModules) {
    const checks = await runQualityChecks(module);
    
    if (checks.allPassed) {
      verification.passed.push(module.name);
    } else if (checks.criticalFailed) {
      verification.failed.push({ name: module.name, issues: checks.failures });
    } else {
      verification.warnings.push({ name: module.name, issues: checks.warnings });
    }
  }
  
  return verification;
}

async function runQualityChecks(module) {
  return {
    syntax: await checkSyntax(module.path),
    completeness: await checkCompleteness(module.path),
    manufacturing: await checkManufacturingIntegration(module.path),
    selfTest: await runSelfTest(module.path),
    exports: await checkExports(module.path)
  };
}
```

### 4.2 Self-Test Execution
```javascript
async function executeSelfTests(modules) {
  const results = {};
  
  for (const module of modules) {
    try {
      // Load module
      const mod = require(module.path);
      
      // Run self-test if available
      if (typeof mod.selfTest === 'function') {
        const testResult = mod.selfTest();
        results[module.name] = {
          status: testResult ? 'PASSED' : 'FAILED',
          hasSelfTest: true
        };
      } else {
        results[module.name] = {
          status: 'SKIPPED',
          hasSelfTest: false,
          warning: 'No selfTest function found'
        };
      }
    } catch (e) {
      results[module.name] = {
        status: 'ERROR',
        error: e.message
      };
    }
  }
  
  return results;
}
```

---

## Phase 5: Consolidation (5 min)

### 5.1 Update Extraction Manifest
```javascript
async function updateManifest(campaign, results) {
  const manifest = {
    timestamp: new Date().toISOString(),
    campaign: campaign.name,
    source: {
      monolith: 'PRISM_v8_89_002',
      totalLines: 986621
    },
    extracted: results.extracted.map(m => ({
      name: m.name,
      status: 'EXTRACTED',
      source_type: 'monolith',
      start_line: m.lineRange?.start,
      end_line: m.lineRange?.end,
      lines: m.lines,
      category: m.category,
      output_path: m.path,
      verification: m.verification
    })),
    built: results.built.map(m => ({
      name: m.name,
      status: 'BUILT',
      source_type: 'academic_spec',
      academic_sources: m.academicSources,
      lines: m.lines,
      category: m.category,
      output_path: m.path
    })),
    stubs_replaced: results.built.filter(m => m.wasStub).map(m => ({
      name: m.name,
      original_lines: m.originalLines,
      new_lines: m.lines,
      build_source: m.academicSources.join(', ')
    })),
    statistics: {
      total_modules: results.extracted.length + results.built.length,
      real_extractions: results.extracted.length,
      built_from_spec: results.built.length,
      total_lines: results.totalLines,
      total_size_kb: results.totalSizeKB
    },
    verification: results.verification
  };
  
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  return manifest;
}
```

### 5.2 Generate Report
```javascript
function generateReport(manifest) {
  return `
## EXTRACTION CAMPAIGN COMPLETE

**Campaign:** ${manifest.campaign}
**Timestamp:** ${manifest.timestamp}

### Summary
| Metric | Value |
|--------|-------|
| Total Modules | ${manifest.statistics.total_modules} |
| Real Extractions | ${manifest.statistics.real_extractions} |
| Built From Spec | ${manifest.statistics.built_from_spec} |
| Total Lines | ${manifest.statistics.total_lines} |
| Total Size | ${manifest.statistics.total_size_kb} KB |

### Extracted (${manifest.extracted.length})
${manifest.extracted.map(m => `- ${m.name} (${m.lines} lines)`).join('\n')}

### Built From Academic Specs (${manifest.built.length})
${manifest.built.map(m => `- ${m.name} (${m.lines} lines) - ${m.academic_sources.join(', ')}`).join('\n')}

### Verification
- Passed: ${manifest.verification.passed.length}
- Warnings: ${manifest.verification.warnings.length}
- Failed: ${manifest.verification.failed.length}
`;
}
```

---

# ORCHESTRATOR COMMANDS

## Python Script Integration

```python
#!/usr/bin/env python3
"""
PRISM Extraction Orchestrator
Master coordinator for all extraction campaigns
"""

import json
import os
from datetime import datetime
from typing import Dict, List
from concurrent.futures import ThreadPoolExecutor

class ExtractionOrchestrator:
    def __init__(self, config_path: str):
        self.config = self._load_config(config_path)
        self.manifest = {}
        self.results = {
            'extracted': [],
            'built': [],
            'failed': []
        }
    
    def run_campaign(self, campaign: Dict) -> Dict:
        """Execute full extraction campaign"""
        print(f"\n{'='*60}")
        print(f"EXTRACTION CAMPAIGN: {campaign['name']}")
        print(f"{'='*60}\n")
        
        # Phase 1: Reconnaissance
        print("Phase 1: Reconnaissance...")
        recon = self._reconnaissance(campaign['targets'])
        classifications = self._classify_results(recon)
        
        # Phase 2: Extraction
        print("Phase 2: Extraction...")
        extracted = self._extract_real(classifications)
        
        # Phase 3: Construction
        print("Phase 3: Construction...")
        built = self._build_missing(classifications)
        
        # Phase 4: Verification
        print("Phase 4: Verification...")
        verification = self._verify_all(extracted, built)
        
        # Phase 5: Consolidation
        print("Phase 5: Consolidation...")
        manifest = self._update_manifest(campaign, extracted, built, verification)
        
        return manifest
    
    def _reconnaissance(self, targets: List[Dict]) -> Dict:
        # Implementation
        pass
    
    def _classify_results(self, recon: Dict) -> Dict:
        # Implementation
        pass
    
    def _extract_real(self, classifications: Dict) -> List:
        # Implementation
        pass
    
    def _build_missing(self, classifications: Dict) -> List:
        # Implementation
        pass
    
    def _verify_all(self, extracted: List, built: List) -> Dict:
        # Implementation
        pass
    
    def _update_manifest(self, campaign: Dict, extracted: List, 
                         built: List, verification: Dict) -> Dict:
        # Implementation
        pass


# Campaign definitions
CAMPAIGNS = {
    'ai_ml': {
        'name': 'AI_ML_EXTRACTION',
        'category': 'engines/ai_ml',
        'targets': [
            {'name': 'PRISM_PSO_OPTIMIZER', 'priority': 1, 'type': 'known'},
            {'name': 'PRISM_GA_ENGINE', 'priority': 1, 'type': 'known'},
            {'pattern': 'reinforcement|RL_|Q_learning', 'priority': 2, 'type': 'pattern'},
            {'pattern': 'neural|deep.*learn', 'priority': 2, 'type': 'pattern'}
        ]
    },
    'physics': {
        'name': 'PHYSICS_EXTRACTION',
        'category': 'engines/physics',
        'targets': [
            {'name': 'PRISM_KIENZLE_ENGINE', 'priority': 1, 'type': 'known'},
            {'name': 'PRISM_TAYLOR_TOOL_LIFE', 'priority': 1, 'type': 'known'},
            {'pattern': 'thermal|heat.*transfer', 'priority': 2, 'type': 'pattern'}
        ]
    }
}


if __name__ == '__main__':
    import sys
    
    campaign_name = sys.argv[1] if len(sys.argv) > 1 else 'ai_ml'
    campaign = CAMPAIGNS.get(campaign_name)
    
    if campaign:
        orchestrator = ExtractionOrchestrator('config.json')
        result = orchestrator.run_campaign(campaign)
        print(json.dumps(result, indent=2))
    else:
        print(f"Unknown campaign: {campaign_name}")
        print(f"Available: {list(CAMPAIGNS.keys())}")
```

---

# INTEGRATION WITH PRISM v13.0

## ILP Optimization Integration

The orchestrator integrates with the F-PSI-001 combination engine for optimal resource selection:

```javascript
// Resource selection via ILP
const resources = await combinationEngine.optimize({
  task: 'AI_ML_EXTRACTION',
  requirements: ['swarm_search', 'module_building', 'validation'],
  constraints: {
    maxSkills: 8,
    maxAgents: 8,
    safetyThreshold: 0.70,
    rigorThreshold: 0.60
  }
});

// Optimal resource combination
// resources = {
//   skills: ['prism-swarm-extraction', 'prism-module-builder', ...],
//   agents: ['coordinator_v2', 'resource_auditor', ...],
//   synergy: 0.92,
//   coverage: 1.0
// }
```

---

# QUICK REFERENCE

```
EXTRACTION ORCHESTRATOR:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CAMPAIGN TYPES:
  TARGETED    → 2-4 agents, 15-30 min, specific modules
  CATEGORY    → 4-8 agents, 1-2 hours, full category
  DEEP_MINING → 8 agents, 2-4 hours, exhaustive search

PHASES:
  1. RECONNAISSANCE → Define targets, detect stubs
  2. EXTRACTION     → Extract real implementations
  3. CONSTRUCTION   → Build missing from specs
  4. VERIFICATION   → Quality gates, self-tests
  5. CONSOLIDATION  → Update manifest, report

SKILL INTEGRATION:
  swarm-extraction     → Parallel search
  module-builder       → Academic construction
  aiml-engine-patterns → Algorithm templates
  quality-master       → Validation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

# CHECKLIST

```
CAMPAIGN EXECUTION CHECKLIST:
☐ Define campaign targets and patterns
☐ Run reconnaissance phase
☐ Classify stub vs real implementations
☐ Extract real implementations
☐ Build missing from academic specs
☐ Run quality verification
☐ Execute all self-tests
☐ Update extraction manifest
☐ Generate campaign report
☐ Commit to version control
```

---

**Version 1.0 | 2026-01-30 | PRISM Manufacturing Intelligence**
