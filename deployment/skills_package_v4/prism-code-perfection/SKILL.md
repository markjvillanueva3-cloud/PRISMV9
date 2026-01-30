# ═══════════════════════════════════════════════════════════════════════════════
# PRISM CODE PERFECTION v1.0
# ═══════════════════════════════════════════════════════════════════════════════
# COGNITIVE OPTIMIZATION SKILL SUITE - SKILL 3 OF 5
# 12 Code Quality Metrics | C(x) Component
# LIVES AT STAKE - Code controls CNC machines
# ═══════════════════════════════════════════════════════════════════════════════

---
name: prism-code-perfection
version: 1.0.0
layer: 1
description: |
  Defines and measures code quality through 12 core metrics.
  Produces C(x) component for master equation Ω(x) = R×C×P×S×L.
  Code controls manufacturing equipment - bugs can cause injury/death.
dependencies:
  - prism-universal-formulas
consumers:
  - prism-master-equation
  - prism-process-optimizer
  - prism-quality-master
---

# ═══════════════════════════════════════════════════════════════════════════════
# THE 12 CODE QUALITY METRICS
# ═══════════════════════════════════════════════════════════════════════════════

## METRIC 1: CORRECTNESS

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

---

# ═══════════════════════════════════════════════════════════════════════════════
# INTEGRATION
# ═══════════════════════════════════════════════════════════════════════════════

## IMPORTS

```
FROM prism-universal-formulas:
  - bigO (complexity analysis)
  - geometricMean (score computation)
  - halsteadMetrics (complexity)
  - entropy (code structure analysis)

FROM prism-reasoning-engine:
  - MetricOutput (standard format)
  - SkillInput (standard input)
```

## EXPORTS

```
TO prism-master-equation:
  - computeC(code: string) → MetricOutput  # C(x) component
  
TO prism-process-optimizer:
  - getCodeMetrics(code) → Record<string, number>
  
TO prism-quality-master:
  - checkCodeQuality(threshold: number) → QualityGateResult
```

## ACTIVATION

```
ACTIVATE when:
  - Generating code
  - Reviewing code
  - Keywords: "code quality", "refactor", "test coverage"
  - File extensions: .js, .ts, .py, .cpp, etc.
```

---

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

---

# VERSION: 1.0.0
# MS-005 RALPH LOOP 1 COMPLETE
# NEXT: RALPH LOOP 2 (SCRUTINIZE & ENHANCE)


---

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

---

# ENHANCEMENTS

## ENHANCEMENT 1: AUTOMATION SCRIPTS

```javascript
// ═══════════════════════════════════════════════════════════════════════════
// CODE QUALITY AUTOMATION
// ═══════════════════════════════════════════════════════════════════════════

// Run all quality checks
async function runCodeQualityAnalysis(filePath) {
  const results = {
    file: filePath,
    timestamp: new Date().toISOString(),
    metrics: {}
  };
  
  // 1. CORRECTNESS - Run tests
  results.metrics.correctness = await runTests(filePath);
  
  // 2. ROBUSTNESS - Static analysis for error handling
  results.metrics.robustness = await checkErrorHandling(filePath);
  
  // 3. MAINTAINABILITY - Compute maintainability index
  const mi = await computeMaintainabilityIndex(filePath);
  results.metrics.maintainability = Math.max(0, (mi - 20) / 100);
  
  // 4. PERFORMANCE - Check for O(n²) patterns
  results.metrics.performance = await checkPerformancePatterns(filePath);
  
  // 5. SECURITY - Run security scanner
  results.metrics.security = await runSecurityScan(filePath);
  
  // 6. TESTABILITY - Check coverage
  results.metrics.testability = await checkTestCoverage(filePath);
  
  // 7. READABILITY - Check naming and structure
  results.metrics.readability = await checkReadability(filePath);
  
  // 8. MODULARITY - Analyze dependencies
  results.metrics.modularity = await analyzeDependencies(filePath);
  
  // 9. DOCUMENTATION - Check doc coverage
  results.metrics.documentation = await checkDocumentation(filePath);
  
  // 10. COMPLEXITY - Compute cyclomatic complexity
  results.metrics.complexity_score = await computeComplexity(filePath);
  
  // 11. DEBT - Run debt analysis
  results.metrics.debt_score = await computeTechnicalDebt(filePath);
  
  // 12. OVERALL C(x)
  const values = Object.values(results.metrics);
  results.C = geometricMean(values);
  
  return results;
}

function geometricMean(values) {
  const logSum = values.reduce((sum, v) => sum + Math.log(Math.max(v, 1e-10)), 0);
  return Math.exp(logSum / values.length);
}
```

## ENHANCEMENT 2: TOOL COMMANDS

```bash
# ═══════════════════════════════════════════════════════════════════════════
# COMMAND LINE TOOLS FOR EACH METRIC
# ═══════════════════════════════════════════════════════════════════════════

# CORRECTNESS
npm test -- --coverage
pytest --cov=. --cov-report=xml

# ROBUSTNESS (ESLint rules)
eslint --rule 'no-unsafe-optional-chaining: error' src/

# MAINTAINABILITY INDEX
# Using radon (Python) or escomplex (JS)
radon mi -a -s src/
npx escomplex src/

# PERFORMANCE (detect O(n²))
# Custom script or using complexity analysis
npx madge --circular src/

# SECURITY
npm audit
snyk test
bandit -r src/  # Python

# TESTABILITY (Coverage)
nyc report --reporter=lcov
coverage report

# READABILITY (Style checking)
prettier --check src/
pylint src/

# MODULARITY (Dependency analysis)
npx madge --image graph.svg src/
pydeps src/ --show-deps

# DOCUMENTATION
npx documentation lint src/
pydocstyle src/

# COMPLEXITY
npx complexity-report src/
radon cc -a -s src/

# TECHNICAL DEBT
npx sonar-scanner  # SonarQube
codeclimate analyze
```

## ENHANCEMENT 3: PRISM-SPECIFIC THRESHOLDS

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// PRISM CODE QUALITY THRESHOLDS
// ═══════════════════════════════════════════════════════════════════════════

const PRISM_THRESHOLDS = {
  // STANDARD CODE
  standard: {
    correctness: 0.80,
    robustness: 0.75,
    maintainability: 0.60,
    performance: 0.70,
    security: 0.80,
    testability: 0.70,
    readability: 0.70,
    modularity: 0.60,
    documentation: 0.50,
    complexity_score: 0.60,
    debt_score: 0.80,
    C_min: 0.70
  },
  
  // SAFETY-CRITICAL CODE (G-code generation, machine control)
  safety_critical: {
    correctness: 0.99,      // NEAR PERFECT - lives at stake
    robustness: 0.95,       // Must handle all errors
    maintainability: 0.80,  // Must be changeable for fixes
    performance: 0.80,      // Real-time requirements
    security: 0.95,         // No unauthorized control
    testability: 0.95,      // Must be fully tested
    readability: 0.85,      // Must be auditable
    modularity: 0.80,       // Must be isolatable
    documentation: 0.90,    // Must be understood
    complexity_score: 0.80, // Must be simple
    debt_score: 0.95,       // No shortcuts allowed
    C_min: 0.90             // HIGHER bar for safety
  },
  
  // PROTOTYPE/EXPERIMENTAL CODE
  prototype: {
    correctness: 0.60,
    robustness: 0.50,
    maintainability: 0.40,
    performance: 0.50,
    security: 0.70,         // Still need basic security
    testability: 0.50,
    readability: 0.60,
    modularity: 0.40,
    documentation: 0.30,
    complexity_score: 0.50,
    debt_score: 0.60,
    C_min: 0.50
  }
};

function getThresholds(codeType: 'standard' | 'safety_critical' | 'prototype') {
  return PRISM_THRESHOLDS[codeType];
}

// SAFETY-CRITICAL PATHS IN PRISM
const SAFETY_CRITICAL_PATHS = [
  'src/gcode/**',           // G-code generation
  'src/machine/**',         // Machine control
  'src/safety/**',          // Safety systems
  'src/kinematics/**',      // Motion planning
  'src/toolpath/**',        // Toolpath computation
  'src/collision/**',       // Collision detection
  'src/limits/**',          // Limit enforcement
  'src/emergency/**',       // Emergency stop
];
```

## ENHANCEMENT 4: QUALITY GATE EXAMPLES

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// QUALITY GATE IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════

interface QualityGateResult {
  passed: boolean;
  C_score: number;
  failures: string[];
  warnings: string[];
  details: Record<string, MetricResult>;
}

async function runQualityGate(
  code: string, 
  codeType: 'standard' | 'safety_critical' | 'prototype'
): Promise<QualityGateResult> {
  
  const thresholds = getThresholds(codeType);
  const metrics = await runCodeQualityAnalysis(code);
  
  const failures: string[] = [];
  const warnings: string[] = [];
  
  // Check each metric against threshold
  for (const [metric, threshold] of Object.entries(thresholds)) {
    if (metric === 'C_min') continue;
    
    const value = metrics.metrics[metric];
    
    if (value < threshold) {
      if (codeType === 'safety_critical') {
        failures.push(`${metric}: ${value.toFixed(2)} < ${threshold} (REQUIRED)`);
      } else {
        warnings.push(`${metric}: ${value.toFixed(2)} < ${threshold}`);
      }
    }
  }
  
  // Check overall C(x)
  if (metrics.C < thresholds.C_min) {
    failures.push(`C(x): ${metrics.C.toFixed(2)} < ${thresholds.C_min} (REQUIRED)`);
  }
  
  return {
    passed: failures.length === 0,
    C_score: metrics.C,
    failures,
    warnings,
    details: metrics.metrics
  };
}

// EXAMPLE USAGE:
/*
const result = await runQualityGate(gcodeGeneratorCode, 'safety_critical');

if (!result.passed) {
  console.error("QUALITY GATE FAILED:");
  result.failures.forEach(f => console.error(`  ❌ ${f}`));
  throw new Error("Cannot deploy safety-critical code with quality failures");
}

if (result.warnings.length > 0) {
  console.warn("QUALITY WARNINGS:");
  result.warnings.forEach(w => console.warn(`  ⚠️ ${w}`));
}

console.log(`✅ Quality Gate PASSED - C(x) = ${result.C_score.toFixed(2)}`);
*/
```

## ENHANCEMENT 5: CONTINUOUS INTEGRATION

```yaml
# ═══════════════════════════════════════════════════════════════════════════
# CI/CD PIPELINE FOR CODE QUALITY
# ═══════════════════════════════════════════════════════════════════════════
# .github/workflows/quality-gate.yml

name: PRISM Code Quality Gate

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  quality-check:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests (Correctness)
        run: npm test -- --coverage
        
      - name: Run ESLint (Robustness, Readability)
        run: npm run lint
        
      - name: Security audit (Security)
        run: npm audit --audit-level=moderate
        
      - name: Complexity analysis (Complexity)
        run: npx escomplex src/ --format json > complexity.json
        
      - name: Documentation check (Documentation)
        run: npx documentation lint src/
        
      - name: Run Quality Gate
        run: |
          node scripts/quality-gate.js
          
      - name: Fail if quality gate not passed
        run: |
          if [ "$QUALITY_PASSED" != "true" ]; then
            echo "❌ Quality Gate FAILED"
            exit 1
          fi
          
      - name: Post results to PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const report = fs.readFileSync('quality-report.md', 'utf8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: report
            });
```

---

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
