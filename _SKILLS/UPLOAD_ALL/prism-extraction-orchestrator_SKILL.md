---
name: prism-extraction-orchestrator
description: |
  Multi-agent extraction coordination.
---

- Starting any extraction campaign
- Coordinating multi-agent extraction
- Managing extraction manifests
- Quality verification of extracted modules
- Building missing implementations

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

**Version 1.0 | 2026-01-30 | PRISM Manufacturing Intelligence**
