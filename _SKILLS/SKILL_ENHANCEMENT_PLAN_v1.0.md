# PRISM SKILL ENHANCEMENT PLAN v1.0
## Incorporating MIT/Stanford Knowledge Base
**Date:** January 23, 2026

---

# EXECUTIVE SUMMARY

Based on audit findings and MIT/Stanford knowledge base (220+ courses, 285 algorithms), I've identified **8 high-impact enhancements** in 3 categories:

1. **Context Continuity** (4 skills) - Survive compaction, new chats, session limits
2. **Extraction Intelligence** (2 skills) - Better code extraction with pattern recognition
3. **Coding Excellence** (2 skills) - MIT-based coding patterns and algorithm selection

---

# CATEGORY 1: CONTEXT CONTINUITY ENHANCEMENTS

## 1.1 NEW: prism-context-dna
**Purpose:** Create compressed "DNA fingerprints" of sessions that survive context compaction

**MIT Foundation:**
- 6.033 (Computer Systems): State management, checkpointing
- 6.824 (Distributed Systems): Consensus, state replication
- 6.005 (Software Construction): Immutability, snapshots

**Features:**
```
- Automatic context compression (key decisions, not raw data)
- Pattern fingerprinting (what approaches worked)
- Decision tree tracking (why we did X not Y)
- Cross-session learning (approaches that succeeded/failed)
- Auto-recovery reconstruction
```

**DNA Structure:**
```json
{
  "sessionDNA": {
    "keyDecisions": ["Used chunked write for 50KB+ files", "127-param schema locked"],
    "patternsUsed": {"materialCreation": "template→modify→validate→write"},
    "successfulApproaches": ["Desktop Commander append for large files"],
    "failedApproaches": ["Single write >50KB truncates"],
    "contextFingerprint": "hash of critical state",
    "reconstructionHints": ["Read files X, Y, Z to rebuild context"]
  }
}
```

**Impact:** 90% context recovery after compaction/new chat

---

## 1.2 ENHANCE: prism-state-manager
**Current Issues:**
- Manual checkpoint triggers
- No automatic context pressure detection
- Verbose state updates

**MIT Foundation:**
- 6.033: End-to-end checkpointing
- 6.824: Raft consensus for state
- 6.005: Defensive programming

**Enhancements:**
```
ADD:
- Auto-checkpoint triggers based on:
  * Token count estimation (approaching limits)
  * Tool call count (15+ without save)
  * Time elapsed (10+ min without checkpoint)
  * Complexity detection (multi-step operations)

- Smart state compression:
  * Delta-only updates (not full rewrite)
  * Hierarchical importance (critical vs nice-to-have)
  * Auto-cleanup of stale data

- Recovery confidence scoring:
  * "95% recoverable from state alone"
  * "70% recoverable, read transcript for X"
```

---

## 1.3 ENHANCE: prism-session-handoff
**Current Issues:**
- Templates are verbose
- Missing "essence extraction" for new chats
- No priority ranking for what to read first

**MIT Foundation:**
- 6.033: Separation of concerns
- 16.400: Human factors (information priority)

**Enhancements:**
```
ADD:
- "5-Second Resume" section:
  * One-line: What we were doing
  * One-line: Where we stopped  
  * One-line: What to do next

- Priority-ranked reading list:
  1. CURRENT_STATE.json quickResume
  2. Last 50 lines of target file
  3. Latest checkpoint DNA
  4. (only if needed) Full session log

- Handoff "essence" format:
  ```
  SESSION ESSENCE: MAT-003
  DOING: Creating carbon steels P-CS-021 to P-CS-030
  STOPPED: After P-CS-030 (file complete)
  NEXT: Create carbon_steels_031_040.js
  PATTERN: template→modify per AISI grade→validate
  GOTCHAS: Use append mode for >50KB files
  ```
```

---

## 1.4 NEW: prism-context-pressure
**Purpose:** Real-time monitoring of context limits with proactive alerts

**MIT Foundation:**
- 6.172 (Performance Engineering): Resource monitoring
- 6.033: Graceful degradation
- 2.852 (Queuing): Buffer management

**Features:**
```
MONITORS:
- Estimated token usage (from response length, tool calls)
- Conversation depth (number of exchanges)
- Tool call rate (calls per response)
- Output buffer (approaching truncation)

ALERTS:
- GREEN: Normal operation, no concerns
- YELLOW: 60% capacity - checkpoint soon
- ORANGE: 75% capacity - checkpoint NOW
- RED: 90% capacity - graceful stop, save everything

AUTO-ACTIONS:
- Yellow: Add checkpoint reminder to response
- Orange: Auto-trigger checkpoint sequence
- Red: Emergency save + handoff generation
```

---

# CATEGORY 2: EXTRACTION INTELLIGENCE

## 2.1 ENHANCE: prism-extractor
**Current Issues:**
- Manual dependency detection
- No code quality scoring
- Limited pattern recognition

**MIT Foundation:**
- 6.001 (SICP): Abstraction boundaries
- 6.005 (Software Construction): Module specifications
- 6.830 (Database Systems): Dependency graphs

**Enhancements:**
```
ADD:
- Automatic dependency detection:
  * Parse imports/requires
  * Identify cross-module calls
  * Map data flow dependencies
  * Generate dependency graph

- Code quality scoring:
  * Function complexity (cyclomatic)
  * Naming conventions
  * Documentation coverage
  * Error handling presence

- Pattern recognition:
  * Identify design patterns used
  * Flag anti-patterns
  * Suggest refactoring opportunities

- Pre-extraction checklist:
  * Estimated module size
  * Predicted dependencies
  * Extraction difficulty rating
```

---

## 2.2 NEW: prism-code-analyzer
**Purpose:** Deep code analysis using MIT software engineering principles

**MIT Foundation:**
- 6.001 (SICP): Abstraction, modularity
- 6.005 (Software Construction): Specifications, testing
- 6.033 (Systems): Interfaces, contracts

**Features:**
```
ANALYSIS TYPES:

1. Structural Analysis:
   - Module boundaries
   - Interface definitions
   - Data flow paths
   - Control flow complexity

2. Quality Metrics (from 6.005):
   - Specification completeness
   - Testability score
   - Coupling/cohesion analysis
   - Error handling coverage

3. Pattern Detection:
   - Factory patterns
   - Observer patterns
   - Strategy patterns
   - Anti-patterns (god object, etc.)

4. Refactoring Suggestions:
   - Extract method opportunities
   - Reduce complexity
   - Improve naming
   - Add error handling

OUTPUT:
```json
{
  "moduleScore": 78,
  "issues": [
    {"type": "high_complexity", "location": "line 145", "suggestion": "Extract to helper function"},
    {"type": "missing_error_handling", "location": "line 203", "suggestion": "Add try-catch"}
  ],
  "patterns": ["factory", "observer"],
  "antiPatterns": ["god_function at line 89"],
  "refactoringPriority": ["Extract calculateForce() from line 89-150"]
}
```
```

---

# CATEGORY 3: CODING EXCELLENCE

## 3.1 NEW: prism-coding-patterns
**Purpose:** MIT-based coding patterns and best practices for PRISM development

**MIT Foundation:**
- 6.001 (SICP): Abstraction, recursion, higher-order functions
- 6.005 (Software Construction): Specs, testing, debugging
- 6.046J (Algorithms): Algorithm design, complexity

**Content:**
```
SECTION 1: SICP PATTERNS (6.001)

1.1 Abstraction Barriers:
    - Define clear interfaces between modules
    - Hide implementation details
    - Example: PRISM_MATERIALS_MASTER exposes getMaterial(), not internal arrays

1.2 Higher-Order Functions:
    - Use map/filter/reduce for data transformation
    - Create function factories for repeated patterns
    - Example: createMaterialValidator(rules) → returns validator function

1.3 Data Abstraction:
    - Separate "what" from "how"
    - Constructors + selectors + operations
    - Example: Material(id, props) + getMaterialProperty(m, prop)

---

SECTION 2: SOFTWARE CONSTRUCTION PATTERNS (6.005)

2.1 Specifications:
    - Every function has: requires, modifies, effects
    - Pre-conditions and post-conditions
    - Example:
    ```javascript
    /**
     * @requires material !== null && property in VALID_PROPERTIES
     * @modifies nothing
     * @effects returns property value or throws PropertyNotFound
     */
    function getProperty(material, property) { ... }
    ```

2.2 Testing Patterns:
    - Boundary testing (min, max, edge cases)
    - Partition testing (divide inputs into classes)
    - Regression testing (capture bugs as tests)

2.3 Defensive Programming:
    - Validate all inputs
    - Fail fast with clear messages
    - Never trust external data

---

SECTION 3: PRISM-SPECIFIC PATTERNS

3.1 Material Creation Pattern:
    template → customize → validate → write → verify

3.2 Module Extraction Pattern:
    locate → read → parse → document → write → audit

3.3 Database Query Pattern:
    validate_input → check_cache → query → transform → return_with_confidence

3.4 Calculation Pattern:
    gather_6_sources → physics_calc → ai_adjustment → confidence_interval → explain
```

---

## 3.2 NEW: prism-algorithm-selector
**Purpose:** Given a problem, select optimal algorithm from ALGORITHM_REGISTRY.json

**MIT Foundation:**
- 6.046J (Algorithms): Complexity analysis
- 6.006 (Intro Algorithms): Data structures
- 15.083J (Optimization): Algorithm selection

**Usage:**
```
INPUT: Problem description
OUTPUT: Recommended algorithm + PRISM engine + complexity + usage example

EXAMPLES:

Q: "Need to optimize cutting parameters for minimum cost"
A: {
     "algorithm": "Multi-objective optimization (NSGA-II)",
     "prismEngine": "PRISM_NSGA2",
     "complexity": "O(MN²) where M=objectives, N=population",
     "course": "15.083J",
     "usage": "PRISM_NSGA2.optimize({objectives: ['cost', 'time'], constraints: [...]})",
     "alternatives": ["MOEA/D for many objectives", "Weighted sum for 2 objectives"]
   }

Q: "Need to cluster similar materials for grouping"
A: {
     "algorithm": "DBSCAN",
     "prismEngine": "PRISM_CLUSTERING_ENGINE",
     "complexity": "O(n log n) with spatial index",
     "course": "6.867",
     "usage": "PRISM_CLUSTERING_ENGINE.cluster({method: 'dbscan', eps: 0.5})",
     "alternatives": ["K-means if k known", "Hierarchical for dendrogram"]
   }

Q: "Need to sequence operations to minimize setup time"
A: {
     "algorithm": "Ant Colony Optimization",
     "prismEngine": "PRISM_ACO_SEQUENCER",
     "complexity": "O(n² × iterations)",
     "course": "6.034",
     "usage": "PRISM_ACO_SEQUENCER.sequence({operations: [...], setupMatrix: [...]})",
     "alternatives": ["Genetic algorithm", "Simulated annealing", "Tabu search"]
   }
```

---

# IMPLEMENTATION PRIORITY

| Priority | Skill | Impact | Effort | Dependency |
|----------|-------|--------|--------|------------|
| **1** | prism-context-dna | 🔴 Critical | Medium | None |
| **2** | prism-context-pressure | 🔴 Critical | Low | context-dna |
| **3** | prism-coding-patterns | 🟡 High | Medium | None |
| **4** | prism-algorithm-selector | 🟡 High | Medium | ALGORITHM_REGISTRY |
| **5** | Enhance prism-state-manager | 🟡 High | Low | context-dna |
| **6** | Enhance prism-session-handoff | 🟢 Medium | Low | None |
| **7** | Enhance prism-extractor | 🟢 Medium | Medium | code-analyzer |
| **8** | prism-code-analyzer | 🟢 Medium | High | None |

---

# RECOMMENDED IMPLEMENTATION ORDER

## Phase 1: Context Continuity (Highest Impact)
1. Create `prism-context-dna` 
2. Create `prism-context-pressure`
3. Enhance `prism-state-manager` with auto-checkpoint

## Phase 2: Coding Excellence
4. Create `prism-coding-patterns` (MIT 6.001/6.005 patterns)
5. Create `prism-algorithm-selector` (from ALGORITHM_REGISTRY)

## Phase 3: Extraction Intelligence
6. Enhance `prism-session-handoff` with essence format
7. Create `prism-code-analyzer`
8. Enhance `prism-extractor` with pattern recognition

---

# ESTIMATED BENEFITS

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Context recovery after compaction | ~40% | ~90% | **+125%** |
| Time to resume new chat | 5-10 min | 1-2 min | **-80%** |
| Code quality consistency | Manual | Automated | **Standardized** |
| Algorithm selection speed | Research needed | Instant lookup | **-95%** |
| Extraction errors | ~15% | ~3% | **-80%** |

---

**Ready to implement? Start with prism-context-dna (highest impact).**
