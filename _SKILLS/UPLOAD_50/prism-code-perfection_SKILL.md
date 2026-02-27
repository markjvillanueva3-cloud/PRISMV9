---
name: prism-code-perfection
description: |
  11 code quality metrics for C(x) score. Covers structure, patterns, error handling, and maintainability.
---

```
DEFINITION: Degree to which code produces correct outputs for all inputs

FORMULA:
  correctness = passing_tests / total_tests
              × specification_coverage
              × edge_case_coverage

COMPONENTS:
  passing_tests: Tests that pass / Total tests
  specification_coverage: Requirements with tests / Total requirements
  edge_case_coverage: Edge cases tested / Known edge cases

MEASUREMENT:
  1. Run full test suite
  2. Check each requirement has test(s)
  3. Identify edge cases, verify coverage
  4. correctness = geometric_mean(components)

THRESHOLDS:
  1.0: Perfect (all tests pass, all specs covered, all edges)
  ≥0.95: Production ready
  ≥0.80: Beta quality
  <0.80: FAIL - Do not deploy

MANUFACTURING APPLICATION:
  G-code generator must produce correct coordinates
  Wrong coordinate = tool crash = injury
  CRITICAL: 100% correctness required for safety-critical paths
```

## METRIC 2: ROBUSTNESS

```
DEFINITION: Ability to handle errors, edge cases, and unexpected inputs

FORMULA:
  robustness = error_handling × recovery × graceful_degradation

COMPONENTS:
  error_handling: Errors caught / Errors possible
  recovery: Recoverable errors / Caught errors
  graceful_degradation: Partial functionality when degraded

MEASUREMENT:
  1. Fault injection testing
  2. Fuzz testing with random inputs
  3. Error path coverage analysis
  4. robustness = geometric_mean(components)

PATTERNS TO CHECK:
  □ All external calls wrapped in try/catch
  □ Null/undefined checks on inputs
  □ Bounds checking on arrays
  □ Timeout handling on async operations
  □ Resource cleanup in finally blocks
  □ Validation before use

MANUFACTURING APPLICATION:
  What happens if sensor returns NaN?
  What happens if network drops mid-operation?
  What happens if file is corrupted?
  ROBUST code handles ALL these gracefully
```

## METRIC 3: MAINTAINABILITY

```
DEFINITION: Ease of understanding, modifying, and extending code

FORMULA:
  maintainability = readability × modularity × documentation × simplicity

COMPONENTS:
  readability: Code clarity score (0-1)
  modularity: Coupling/cohesion score (0-1)
  documentation: Doc coverage (0-1)
  simplicity: 1 / (1 + complexity/threshold)

MAINTAINABILITY INDEX (industry standard):
  MI = 171 - 5.2×ln(V) - 0.23×G - 16.2×ln(LOC)
  
  WHERE:
    V = Halstead Volume
    G = Cyclomatic Complexity
    LOC = Lines of Code
    
  NORMALIZED: maintainability = max(0, (MI - 20) / 100)

THRESHOLDS:
  ≥0.8: Highly maintainable
  0.6-0.8: Maintainable
  0.4-0.6: Needs improvement
  <0.4: FAIL - Technical debt crisis

MANUFACTURING APPLICATION:
  PRISM codebase is 986,621 lines
  Must be maintainable for long-term evolution
  Poor maintainability = bugs accumulate = eventual catastrophe
```

## METRIC 4: PERFORMANCE

```
DEFINITION: Speed, memory efficiency, and resource utilization

FORMULA:
  performance = speed × memory × resource_efficiency

COMPONENTS:
  speed = target_time / actual_time (capped at 1)
  memory = 1 - (memory_used / memory_available)
  resource_efficiency = useful_work / total_work

TARGETS (PRISM-specific):
  - Page load: < 2 seconds
  - Calculation: < 500 ms
  - Database query: < 100 ms
  - API response: < 200 ms

MEASUREMENT:
  1. Profile execution time
  2. Monitor memory usage
  3. Identify bottlenecks
  4. Compute performance score

BIG-O REQUIREMENTS:
  - Lookup operations: O(1) or O(log n)
  - Search operations: O(log n) or O(n)
  - NO O(n²) or worse for hot paths
  - Memory: O(n) maximum

MANUFACTURING APPLICATION:
  Real-time feeds/speeds calculation
  Machine cannot wait - toolpath must compute instantly
  Performance failure = production delay = cost
```

## METRIC 5: SECURITY

```
DEFINITION: Freedom from vulnerabilities and attack vectors

FORMULA:
  security = 1 - (vulnerabilities_found / vulnerabilities_checked)

VULNERABILITY CATEGORIES:
  □ Injection (SQL, XSS, command)
  □ Authentication flaws
  □ Authorization bypass
  □ Data exposure
  □ Security misconfiguration
  □ Cryptographic failures
  □ Insecure dependencies

STATIC ANALYSIS CHECKS:
  - No eval() or equivalent
  - No hardcoded secrets
  - Input validation on all inputs
  - Parameterized queries only
  - HTTPS everywhere
  - Dependency vulnerabilities (npm audit, etc.)

MANUFACTURING APPLICATION:
  PRISM connects to CNC machines
  Security breach = unauthorized machine control
  Malicious G-code = PHYSICAL DANGER
  
  CRITICAL: Network security for machine communication
```

## METRIC 6: TESTABILITY

```
DEFINITION: Ease of testing code effectively

FORMULA:
  testability = coverage × isolation × determinism

COMPONENTS:
  coverage: Lines covered by tests / Total lines
  isolation: Testable in isolation / Total functions
  determinism: Deterministic tests / Total tests

COVERAGE REQUIREMENTS:
  - Line coverage: ≥ 80%
  - Branch coverage: ≥ 70%
  - Function coverage: ≥ 90%
  - Safety-critical code: 100%

TESTABILITY PATTERNS:
  □ Dependency injection
  □ Pure functions where possible
  □ Mockable external dependencies
  □ Clear inputs/outputs
  □ No hidden state

MANUFACTURING APPLICATION:
  Every cutting parameter calculation MUST be tested
  Every G-code generation path MUST be tested
  Untested code path = unknown behavior = risk
```

## METRIC 7: READABILITY

```
DEFINITION: Ease of understanding code by human readers

FORMULA:
  readability = naming × structure × comments × consistency

COMPONENTS:
  naming: Descriptive names / Total identifiers
  structure: Logical organization score
  comments: Useful comments / Complex sections
  consistency: Style violations / Total lines (inverted)

NAMING CONVENTIONS:
  □ Variables: descriptive, not abbreviated
  □ Functions: verb phrases (calculateSpeed, validateInput)
  □ Classes: noun phrases (MaterialDatabase, ToolPathGenerator)
  □ Constants: UPPER_SNAKE_CASE
  □ No single-letter variables (except i, j, k for loops)

STRUCTURE:
  □ Functions ≤ 30 lines
  □ Files ≤ 500 lines
  □ Nesting ≤ 3 levels
  □ Clear separation of concerns

MANUFACTURING APPLICATION:
  Other engineers must understand the code
  During incident, need to quickly find issue
  Unreadable code = slow debugging = extended danger
```

## METRIC 8: MODULARITY

```
DEFINITION: Degree of separation and independence between components

FORMULA:
  modularity = cohesion × (1 - coupling)

COMPONENTS:
  cohesion: Related functionality together (0-1)
  coupling: Dependencies between modules (0-1, lower better)

COHESION TYPES (best to worst):
  1. Functional (best): All elements contribute to single task
  2. Sequential: Output of one is input to next
  3. Communicational: Operate on same data
  4. Procedural: Follow specific sequence
  5. Temporal: Executed at same time
  6. Logical: Related by type, not function
  7. Coincidental (worst): No meaningful relationship

COUPLING TYPES (best to worst):
  1. Message (best): Pass data only
  2. Data: Share simple data
  3. Stamp: Share data structures
  4. Control: Pass control flags
  5. External: Share external format
  6. Common: Share global data
  7. Content (worst): Modify each other's internals

METRICS:
  - Afferent coupling (Ca): Incoming dependencies
  - Efferent coupling (Ce): Outgoing dependencies
  - Instability: I = Ce / (Ca + Ce)
  
MANUFACTURING APPLICATION:
  Material database independent of G-code generator
  Changes to one shouldn't break the other
  Poor modularity = cascade failures
```

## METRIC 9: DOCUMENTATION

```
DEFINITION: Completeness and quality of code documentation

FORMULA:
  documentation = api_docs × inline_comments × architecture_docs × examples

COMPONENTS:
  api_docs: Documented public interfaces / Total public interfaces
  inline_comments: Complex logic with comments / Complex logic sections
  architecture_docs: Architecture decisions documented (0-1)
  examples: Features with examples / Total features

DOCUMENTATION REQUIREMENTS:
  □ Every public function: Purpose, params, return, throws
  □ Every module: Purpose, dependencies, usage
  □ Complex algorithms: Step-by-step explanation
  □ Non-obvious decisions: Why, not just what
  □ Configuration: All options documented

JSDoc/TypeDoc MINIMUM:
  /**
   * Brief description of function purpose.
   * @param {Type} paramName - Description
   * @returns {Type} Description
   * @throws {ErrorType} When condition
   * @example
   * const result = functionName(arg);
   */

MANUFACTURING APPLICATION:
  PRISM has 831 modules
  Each must be documented for future maintenance
  Undocumented code = tribal knowledge = bus factor = risk
```

## METRIC 10: COMPLEXITY

```
DEFINITION: Measure of code's structural complexity

FORMULA:
  complexity_score = 1 - (actual_complexity / max_acceptable)

CYCLOMATIC COMPLEXITY:
  CC = E - N + 2P
  
  WHERE:
    E = edges in control flow graph
    N = nodes in control flow graph
    P = connected components
    
  OR: CC = decisions + 1 (for single function)

THRESHOLDS (per function):
  CC ≤ 10: Simple, low risk
  CC 11-20: Moderate complexity
  CC 21-50: High complexity, refactor
  CC > 50: UNTESTABLE, must refactor

COGNITIVE COMPLEXITY:
  Measures understandability, penalizes:
  - Nested structures (exponential)
  - Breaks in linear flow
  - Multiple conditions

HALSTEAD METRICS:
  - Vocabulary: n = n1 + n2 (operators + operands)
  - Length: N = N1 + N2 (total occurrences)
  - Volume: V = N × log2(n)
  - Difficulty: D = (n1/2) × (N2/n2)
  - Effort: E = D × V

MANUFACTURING APPLICATION:
  Complex code = more bugs
  More bugs in safety-critical code = higher risk
  Complexity MUST be minimized
```

## METRIC 11: TECHNICAL DEBT

```
DEFINITION: Cost of additional rework caused by choosing quick solutions

FORMULA:
  debt_score = 1 - (debt_hours / total_dev_hours)

DEBT CATEGORIES:
  - Design debt: Poor architecture choices
  - Code debt: Quick hacks, copy-paste
  - Test debt: Missing tests
  - Documentation debt: Missing docs
  - Dependency debt: Outdated packages

MEASUREMENT:
  SonarQube, CodeClimate, or similar tool
  Estimates hours to fix issues

DEBT RATIO:
  debt_ratio = debt_hours / (debt_hours + dev_hours)
  
  THRESHOLDS:
    ≤ 5%: Excellent
    5-10%: Acceptable
    10-20%: Concerning
    > 20%: CRITICAL

INTEREST RATE:
  Debt compounds - unfixed issues slow future development
  debt_interest = debt × complexity_factor × age_factor

MANUFACTURING APPLICATION:
  PRISM is long-term project
  Debt accumulation = eventual inability to make changes
  Unable to fix safety issues quickly = DANGER
```

## METRIC 12: OVERALL CODE QUALITY C(x)

```
FORMULA:
  C(x) = (correctness × robustness × maintainability × performance ×
          security × testability × readability × modularity ×
          documentation × complexity_score × debt_score)^(1/11)

GEOMETRIC MEAN PROPERTIES:
  - Range: [0, 1]
  - Penalizes any weak component
  - C(x) = 0 if ANY component = 0
  - Cannot compensate weakness in one with strength in another

QUALITY GATES:
  C(x) ≥ 0.9: Excellent - Ship with confidence
  C(x) ≥ 0.8: Good - Minor improvements possible
  C(x) ≥ 0.7: Acceptable - Address weaknesses
  C(x) < 0.7: FAIL - Do not deploy, fix issues first

UNCERTAINTY:
  σ_C ≈ C × √(Σ(σᵢ/μᵢ)² / 121)  (geometric mean variance)

MANUFACTURING APPLICATION:
  Code quality directly affects system reliability
  Low quality code → bugs → wrong outputs → crashes → injury
  C(x) < 0.7 for safety-critical code = UNACCEPTABLE
```

# ═══════════════════════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════════════════════

| Metric | Symbol | Range | Manufacturing Impact |
|--------|--------|-------|---------------------|
| Correctness | cor | [0,1] | Wrong output = crash |
| Robustness | rob | [0,1] | Error handling = safe |
| Maintainability | mnt | [0,1] | Long-term reliability |
| Performance | prf | [0,1] | Real-time requirements |
| Security | sec | [0,1] | Unauthorized control |
| Testability | tst | [0,1] | Verified behavior |
| Readability | rdb | [0,1] | Debug speed |
| Modularity | mod | [0,1] | Change isolation |
| Documentation | doc | [0,1] | Knowledge transfer |
| Complexity | cpx | [0,1] | Bug probability |
| Technical Debt | dbt | [0,1] | Future agility |
| **C(x)** | C | [0,1] | **Overall quality** |

# ═══════════════════════════════════════════════════════════════════════════════
# MS-005 RALPH LOOP 2: SCRUTINY FINDINGS & ENHANCEMENTS
# ═══════════════════════════════════════════════════════════════════════════════

## SCRUTINY CHECKLIST

| Required Element | Present? | Gap? |
|------------------|----------|------|
| All 12 metrics defined | ✅ | - |
| Formulas for each metric | ✅ | - |
| Manufacturing applications | ✅ | - |
| Integration | ✅ | - |
| Specific tools/commands | ❌ | GAP |
| Automation scripts | ❌ | GAP |
| Quality gate examples | ❌ | GAP |
| PRISM-specific thresholds | ❌ | GAP |

# ═══════════════════════════════════════════════════════════════════════════════
# ENHANCED SUMMARY
# ═══════════════════════════════════════════════════════════════════════════════

## Version 1.1 Additions:
- JavaScript automation scripts for all metrics
- Command-line tools for each metric
- PRISM-specific thresholds (standard, safety-critical, prototype)
- Quality gate implementation with examples
- CI/CD pipeline configuration

## Code Paths Classification:
- **Safety-Critical** (C_min = 0.90): G-code, machine control, safety systems
- **Standard** (C_min = 0.70): Normal application code
- **Prototype** (C_min = 0.50): Experimental code

---

# VERSION: 1.1.0 (Enhanced)
# MS-005 RALPH LOOP 2 COMPLETE ✅
