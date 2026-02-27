# PRISM SWARM EXTRACTION SKILL
## Parallel Multi-Agent Search & Extraction for Monolith Mining
## Version 1.0 | 2026-01-30

---

# OVERVIEW

This skill defines the methodology for deploying parallel swarm searches to extract modules, engines, and algorithms from the PRISM v8.89 monolith (986,621 lines, 831 modules). When monolith only contains stubs, this skill coordinates with prism-module-builder for academic-specification-based construction.

---

# WHEN TO USE

- Extracting multiple related modules simultaneously
- Finding implementations across large codebases
- Verifying stub vs real implementation status
- Mining algorithms from consolidated files
- Parallel pattern matching across monolith

---

# SWARM ARCHITECTURE

## Agent Types

| Agent Type | Role | Pattern Category |
|------------|------|------------------|
| ALPHA | Primary extraction lead | Core algorithms |
| BETA | Secondary verification | Validation patterns |
| GAMMA | Dependency mapper | Import/export chains |
| DELTA | Quality auditor | Completeness check |
| EPSILON | Cross-reference | Similar implementations |
| ZETA | Academic linker | MIT/Stanford mapping |
| ETA | Consumer tracer | Usage patterns |
| THETA | Integration validator | Wiring verification |

## Swarm Patterns

### 1. DEEP_EXTRACTION_SWARM (8 agents)
```
Purpose: Maximum coverage extraction
Agents: All 8 types active
Use when: Comprehensive module extraction needed
Pattern:
  ALPHA → Find primary implementation
  BETA → Verify completeness
  GAMMA → Map dependencies
  DELTA → Audit quality
  EPSILON → Find related code
  ZETA → Link to academics
  ETA → Trace consumers
  THETA → Validate integration
```

### 2. STUB_DETECTION_SWARM (4 agents)
```
Purpose: Identify stub vs real implementations
Agents: ALPHA, BETA, DELTA, EPSILON
Use when: Verifying extraction quality
Pattern:
  ALPHA → Find target module
  BETA → Check line count
  DELTA → Verify functionality
  EPSILON → Find alternatives
```

### 3. PARALLEL_SEARCH_SWARM (8 agents)
```
Purpose: Simultaneous pattern matching
Agents: All running different patterns
Use when: Multiple unknowns to find
Pattern:
  Each agent → Different search pattern
  Merge results → Deduplication
  Analyze → Coverage report
```

---

# SEARCH STRATEGY

## Pattern Categories

| Category | Primary Patterns | Secondary Patterns |
|----------|------------------|-------------------|
| **Optimization** | `optimize|fitness|converge` | `particle|swarm|colony|evolve` |
| **Genetic Algorithm** | `genetic|crossover|mutation|chromosome` | `selection.*tournament|roulette` |
| **Simulated Annealing** | `anneal|temperature|cooling|metropolis` | `accept.*probability|boltzmann` |
| **Differential Evolution** | `differential|DE_|mutation.*rand|trial.*vector` | `binomial|exponential.*crossover` |
| **Reinforcement Learning** | `Q_learning|qTable|reward|action.*value` | `epsilon.*greedy|exploration` |
| **Deep Q-Network** | `DQN|replay.*buffer|experience.*replay` | `target.*network|double.*DQN` |
| **Neural Networks** | `neural|layer|activation|forward.*pass` | `backprop|gradient|weight` |
| **Transformers** | `transformer|attention|self.*attention` | `multi.*head|positional.*encoding` |

## Search Execution

### Parallel Launch Protocol
```javascript
// Launch multiple searches simultaneously
const searches = [
  { id: 'GA_SEARCH', pattern: 'genetic|crossover|mutation', category: 'optimization' },
  { id: 'SA_SEARCH', pattern: 'anneal|temperature|cooling', category: 'optimization' },
  { id: 'DE_SEARCH', pattern: 'differential|trial.*vector', category: 'optimization' },
  { id: 'RL_SEARCH', pattern: 'Q_learning|reward|policy', category: 'reinforcement' },
  { id: 'DQN_SEARCH', pattern: 'DQN|replay.*buffer', category: 'deep_learning' },
  { id: 'CNN_SEARCH', pattern: 'convolution|pooling|filter', category: 'deep_learning' },
  { id: 'LSTM_SEARCH', pattern: 'lstm|gated|cell.*state', category: 'sequence' },
  { id: 'TRANS_SEARCH', pattern: 'transformer|attention', category: 'attention' }
];

// Execute in parallel (Desktop Commander supports concurrent searches)
searches.forEach(s => startSearch(monolithPath, s.pattern, s.category));
```

### Result Collection
```javascript
// Collect all search results
const results = await Promise.all(searches.map(s => getSearchResults(s.id)));

// Merge and deduplicate
const merged = mergeResults(results);

// Categorize by type
const categorized = categorizeByModule(merged);

// Identify stubs vs real implementations
const { real, stubs } = classifyImplementations(categorized);
```

---

# STUB DETECTION CRITERIA

## Size-Based Classification

| Line Count | Classification | Action |
|------------|----------------|--------|
| 1-5 lines | GATEWAY_STUB | Build from academic spec |
| 6-50 lines | PARTIAL_STUB | Enhance with missing parts |
| 51-200 lines | MINIMAL_IMPL | Verify completeness |
| 201+ lines | FULL_IMPL | Extract directly |

## Content-Based Classification

```javascript
function classifyImplementation(code) {
  // Gateway stub patterns
  if (code.includes('registerRoute') && !code.includes('function')) {
    return 'GATEWAY_STUB';
  }
  
  // Placeholder patterns
  if (code.includes('// TODO') || code.includes('placeholder')) {
    return 'PLACEHOLDER';
  }
  
  // Minimal implementation
  if (!code.includes('class') && !code.includes('function')) {
    return 'MINIMAL';
  }
  
  // Check for key algorithm components
  const hasCore = checkCoreAlgorithm(code);
  const hasManufacturing = code.includes('cutting') || code.includes('machining');
  const hasTests = code.includes('test') || code.includes('selfTest');
  
  return {
    type: hasCore ? 'FULL_IMPL' : 'PARTIAL_IMPL',
    hasManufacturing,
    hasTests
  };
}
```

---

# EXTRACTION MANIFEST

## Required Structure
```json
{
  "timestamp": "ISO-8601",
  "swarm_id": "extraction_session_id",
  "source": {
    "monolith": "PRISM_v8_89_002",
    "total_lines": 986621
  },
  "extracted": [
    {
      "name": "MODULE_NAME",
      "status": "EXTRACTED|BUILT|ENHANCED",
      "source_type": "monolith|academic_spec|hybrid",
      "start_line": 12345,
      "end_line": 12678,
      "lines": 333,
      "category": "optimization|deep_learning|etc",
      "academic_sources": ["MIT 6.034", "Stanford CS234"],
      "output_path": "path/to/file.js",
      "verification": {
        "has_self_test": true,
        "has_manufacturing": true,
        "completeness": 0.95
      }
    }
  ],
  "stubs_replaced": [
    {
      "name": "STUB_NAME",
      "original_lines": 1,
      "new_lines": 520,
      "build_source": "MIT 6.034, Holland 1975"
    }
  ],
  "not_found": [
    {
      "name": "MODULE_NAME",
      "reason": "No implementation in monolith",
      "action": "BUILD_FROM_SPEC"
    }
  ],
  "statistics": {
    "total_modules": 27,
    "real_extractions": 22,
    "built_from_spec": 5,
    "total_lines": 12800,
    "total_size_kb": 437
  }
}
```

---

# SWARM COORDINATION

## Execution Phases

### Phase 1: Reconnaissance (15 min)
```
1. Launch STUB_DETECTION_SWARM
2. Identify all target modules
3. Classify stub vs real
4. Generate priority list
```

### Phase 2: Extraction (30-60 min)
```
1. Launch DEEP_EXTRACTION_SWARM for real implementations
2. Extract in parallel by category
3. Validate each extraction
4. Update manifest continuously
```

### Phase 3: Construction (30-60 min)
```
1. For each stub/missing module
2. Invoke prism-module-builder skill
3. Build from academic specifications
4. Integrate manufacturing patterns
```

### Phase 4: Verification (15 min)
```
1. Run all self-tests
2. Verify integration points
3. Update extraction manifest
4. Generate final report
```

---

# PYTHON AUTOMATION

## Swarm Extraction Script
```python
#!/usr/bin/env python3
"""
PRISM Swarm Extraction Coordinator
Parallel search and module extraction from monolith
"""

import json
import os
import subprocess
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime

class SwarmExtractor:
    def __init__(self, monolith_path, output_dir):
        self.monolith_path = monolith_path
        self.output_dir = output_dir
        self.manifest = {
            'timestamp': datetime.now().isoformat(),
            'extracted': [],
            'stubs_replaced': [],
            'not_found': []
        }
        
    def search_pattern(self, pattern_name, pattern, category):
        """Execute single pattern search"""
        cmd = f'findstr /n /r /c:"{pattern}" "{self.monolith_path}"'
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        
        matches = []
        for line in result.stdout.split('\n'):
            if line.strip():
                try:
                    line_num = int(line.split(':')[0])
                    matches.append({
                        'line': line_num,
                        'content': ':'.join(line.split(':')[1:])[:100],
                        'category': category
                    })
                except:
                    pass
        
        return {
            'pattern_name': pattern_name,
            'pattern': pattern,
            'category': category,
            'matches': matches,
            'count': len(matches)
        }
    
    def run_swarm(self, patterns):
        """Execute parallel swarm search"""
        results = {}
        
        with ThreadPoolExecutor(max_workers=8) as executor:
            futures = {
                executor.submit(
                    self.search_pattern, 
                    p['name'], 
                    p['pattern'], 
                    p['category']
                ): p['name']
                for p in patterns
            }
            
            for future in as_completed(futures):
                name = futures[future]
                try:
                    results[name] = future.result()
                except Exception as e:
                    results[name] = {'error': str(e)}
        
        return results
    
    def classify_results(self, results):
        """Classify implementations as stub or real"""
        classifications = {}
        
        for name, data in results.items():
            if 'error' in data:
                classifications[name] = 'ERROR'
            elif data['count'] == 0:
                classifications[name] = 'NOT_FOUND'
            elif data['count'] < 5:
                classifications[name] = 'STUB'
            else:
                classifications[name] = 'REAL_IMPL'
        
        return classifications
    
    def generate_report(self, results, classifications):
        """Generate extraction report"""
        report = {
            'timestamp': datetime.now().isoformat(),
            'summary': {
                'total_patterns': len(results),
                'real_implementations': sum(1 for c in classifications.values() if c == 'REAL_IMPL'),
                'stubs': sum(1 for c in classifications.values() if c == 'STUB'),
                'not_found': sum(1 for c in classifications.values() if c == 'NOT_FOUND'),
                'errors': sum(1 for c in classifications.values() if c == 'ERROR')
            },
            'details': []
        }
        
        for name, data in results.items():
            report['details'].append({
                'name': name,
                'classification': classifications[name],
                'match_count': data.get('count', 0),
                'action': self._determine_action(classifications[name])
            })
        
        return report
    
    def _determine_action(self, classification):
        actions = {
            'REAL_IMPL': 'EXTRACT_FROM_MONOLITH',
            'STUB': 'BUILD_FROM_ACADEMIC_SPEC',
            'NOT_FOUND': 'BUILD_FROM_ACADEMIC_SPEC',
            'ERROR': 'MANUAL_REVIEW'
        }
        return actions.get(classification, 'UNKNOWN')


# Default AI/ML patterns
AI_ML_PATTERNS = [
    {'name': 'GA', 'pattern': 'genetic.*algorithm|crossover|mutation.*rate', 'category': 'optimization'},
    {'name': 'SA', 'pattern': 'simulated.*anneal|temperature|cooling', 'category': 'optimization'},
    {'name': 'DE', 'pattern': 'differential.*evolution|trial.*vector', 'category': 'optimization'},
    {'name': 'PSO', 'pattern': 'particle.*swarm|velocity.*update', 'category': 'optimization'},
    {'name': 'RL_QLEARN', 'pattern': 'Q.*learning|q.*table|reward', 'category': 'reinforcement'},
    {'name': 'RL_DQN', 'pattern': 'DQN|replay.*buffer|target.*network', 'category': 'reinforcement'},
    {'name': 'CNN', 'pattern': 'convolution|pooling|stride', 'category': 'deep_learning'},
    {'name': 'TRANSFORMER', 'pattern': 'transformer|attention|multi.*head', 'category': 'attention'}
]

if __name__ == '__main__':
    import sys
    
    monolith = sys.argv[1] if len(sys.argv) > 1 else 'monolith.html'
    output = sys.argv[2] if len(sys.argv) > 2 else 'extraction_results'
    
    extractor = SwarmExtractor(monolith, output)
    results = extractor.run_swarm(AI_ML_PATTERNS)
    classifications = extractor.classify_results(results)
    report = extractor.generate_report(results, classifications)
    
    print(json.dumps(report, indent=2))
```

---

# INTEGRATION WITH OTHER SKILLS

| Skill | Integration Point |
|-------|-------------------|
| `prism-monolith-navigator` | Search strategies |
| `prism-monolith-extractor` | Single module extraction |
| `prism-module-builder` | Build missing modules |
| `prism-aiml-engine-patterns` | Algorithm templates |
| `prism-extraction-orchestrator` | Master coordination |

---

# SUCCESS CRITERIA

| Metric | Target |
|--------|--------|
| Parallel efficiency | ≥70% speedup vs sequential |
| Stub detection accuracy | 100% |
| Coverage | All target patterns searched |
| False positives | <5% |

---

# QUICK REFERENCE

```
SWARM EXTRACTION CHECKLIST:
☐ Define target patterns by category
☐ Launch STUB_DETECTION_SWARM first
☐ Classify results (stub vs real)
☐ Extract real implementations
☐ Build missing from academic specs
☐ Update extraction manifest
☐ Verify all self-tests pass
☐ Generate final report
```

---

**Version 1.0 | 2026-01-30 | PRISM Manufacturing Intelligence**
