# PRISM MCP Server - Dispatcher & Engine Testability Analysis

## Executive Summary
Comprehensive exploration of PRISM's 45 dispatchers and 100+ engines to understand testability patterns, contracts, and test requirements.

---

## 1. DISPATCHER INVENTORY

### File Count & Distribution
- **Total Dispatchers**: 45 files
- **Location**: C:/PRISM/mcp-server/src/tools/dispatchers/
- **Pattern**: All follow naming convention: `{domain}Dispatcher.ts`

### Dispatcher List (45 total)
1. generatorDispatcher.ts
2. autoPilotDispatcher.ts
3. nlHookDispatcher.ts
4. knowledgeDispatcher.ts
5. safetyDispatcher.ts (medium)
6. devDispatcher.ts (small)
7. gsdDispatcher.ts
8. manusDispatcher.ts
9. documentDispatcher.ts
10. guardDispatcher.ts
11. toolpathDispatcher.ts
12. hookDispatcher.ts
13. atcsDispatcher.ts
14. spDispatcher.ts
15. pfpDispatcher.ts
16. bridgeDispatcher.ts
17. complianceDispatcher.ts
18. memoryDispatcher.ts
19. telemetryDispatcher.ts
20. tenantDispatcher.ts
21. ralphDispatcher.ts
22. validationDispatcher.ts
23. threadDispatcher.ts (medium)
24. omegaDispatcher.ts (small)
25. autonomousDispatcher.ts
26. sessionDispatcher.ts
27. skillScriptDispatcher.ts
28. orchestrationDispatcher.ts
29. calcDispatcher.ts (large)
30. l2EngineDispatcher.ts
31. contextDispatcher.ts
32. cadDispatcher.ts
33. camDispatcher.ts
34. qualityDispatcher.ts
35. schedulingDispatcher.ts
36. authDispatcher.ts
37. intelligenceDispatcher.ts (very large)
38. dataDispatcher.ts
39. exportDispatcher.ts
40. turningDispatcher.ts
41. fiveAxisDispatcher.ts
42. edmDispatcher.ts
43. grindingDispatcher.ts
44. industryDispatcher.ts
45. automationDispatcher.ts

---

## 2. DISPATCHER PATTERN ANALYSIS

### Common Structure (All Dispatchers)
```typescript
export function register{Domain}Dispatcher(server: any): void {
  server.tool(
    "prism_{domain}",
    "Description with actions list",
    {
      action: z.enum([...ACTIONS]),
      params: z.record(z.any()).optional()
    },
    async ({ action, params = {} }) => {
      try {
        // param normalization
        // handler dispatch
        // hook execution (pre/post)
        // response formatting
      } catch (error) {
        return { content: [...], isError: true }
      }
    }
  );
}
```

### Action Definition Patterns

#### Pattern 1: Inline enum (Small Dispatchers)
**Example: omegaDispatcher.ts (120 LOC)**
- 5 actions: compute, breakdown, validate, optimize, history
- Inline case statement within dispatcher
- State management: omegaHistory array in module scope
- Returns: JSON-serialized results

#### Pattern 2: Action Set + Handler Import (Medium Dispatchers)
**Example: threadDispatcher.ts (90 LOC)**
- 12 actions split across CALC_ACTIONS, CODE_ACTIONS sets
- Delegates to `handleThreadTool(action, params)`
- Pre/post hooks for calculations & code generation
- ParamNormalizer integration (lines 37-42)

#### Pattern 3: Switch Statement + Multiple Imports (Large Dispatchers)
**Example: calcDispatcher.ts (2000+ LOC)**
- 30+ actions
- Imports from 10+ engines
- Key values extraction per action type (calcExtractKeyValues)
- Response slimming with pressure management
- Computation cache integration
- Cross-field validation

#### Pattern 4: Massive Composition (Very Large)
**Example: intelligenceDispatcher.ts (2000+ LOC)**
- 200+ actions across 40+ sub-systems
- Imports from 30+ engines
- Multi-tenant capable
- Skill auto-loading
- Response level formatting (BRIEF/DETAILED/FULL)
- Job learning + workflow integration

---

## 3. RESPONSE HANDLING PATTERNS

### Standard Response Envelope (MCP Format)
```typescript
{
  content: [{ type: "text", text: JSON.stringify(result) }],
  isError?: true
}
```

### Error Handling (23 catch blocks found)
- All dispatchers catch top-level errors
- Return MCP envelope with isError: true
- Log via `log.error()` before returning
- 13 dispatchers return status field on error

### Response Formatting Options
1. **Raw JSON**: Direct engine output wrapped in MCP envelope
2. **Slim Response**: `slimResponse()` with pressure management (calcDispatcher)
3. **Level-based Formatting**: `formatByLevel()` for ResponseLevel (safetyDispatcher, intelligenceDispatcher)
4. **Key-value Extraction**: Domain-specific summaries (50-100 tokens)

Example from safetyDispatcher:
```typescript
const responseLevel = (params.response_level as ResponseLevel) || undefined;
if (responseLevel) {
  const leveled = formatByLevel(raw, responseLevel, (r: any) => safetyExtractKeyValues(action, r));
  return { content: [{ type: "text", text: JSON.stringify(leveled) }] };
}
```

---

## 4. ENGINE INVENTORY

### File Count & Distribution
- **Total Engines**: 100+ files in C:/PRISM/mcp-server/src/engines/
- **Exported via**: src/engines/index.ts (2185 LOC)
- **Size Range**: 5KB (AlgorithmEngine.ts) to 57KB (AlgorithmGatewayEngine.ts)

### Engine Categories (from index.ts exports)

#### Manufacturing Calculations (Core Physics)
- ManufacturingCalculations.ts (Kienzle, Taylor, Johnson-Cook)
- AdvancedCalculations.ts (Stability lobes, thermal, optimization)
- ToolpathCalculations.ts (Engagement, trocoidal, HSM, scallopping)
- ThreadCalculationEngine.ts
- ToleranceEngine.ts (IT grade, stackup, Cpk)

#### Orchestration & Execution
- HookExecutor.ts
- SkillExecutor.ts
- ScriptExecutor.ts
- SwarmExecutor.ts
- SwarmGroupExecutor.ts
- RoadmapExecutor.ts
- AgentExecutor.ts
- BatchProcessor.ts

#### Domain-Specific Engines (20+ manufacturing domains)
- CollisionEngine.ts
- SpindleProtectionEngine.ts
- CoolantValidationEngine.ts
- ToolBreakageEngine.ts
- WorkholdingEngine.ts
- AdaptiveControlEngine.ts
- PredictiveMaintenanceEngine.ts
- FailureForensicsEngine.ts
- QualityPredictionEngine.ts
- ... and ~20 more

#### Integration Engines
- CADKernelEngine.ts (28KB)
- CAMKernelEngine.ts (33KB)
- CAMIntegrationEngine.ts (43KB)
- ERPIntegrationEngine.ts
- MachineConnectivityEngine.ts
- DNCTransferEngine.ts
- MeasurementIntegrationEngine.ts

#### Intelligence & Learning
- IntelligenceEngine.ts
- ApprenticeEngine.ts (48KB)
- ManufacturingGenomeEngine.ts
- JobLearningEngine.ts
- FederatedLearningEngine.ts
- KnowledgeGraphEngine.ts
- MemoryGraphEngine.ts
- ConversationalMemoryEngine.ts

#### Supporting Infrastructure
- ComputationCache.ts
- ContextBudgetEngine.ts
- SessionLifecycleEngine.ts
- TelemetryEngine.ts
- EventBus.ts
- ResponseTemplateEngine.ts
- ReportRenderer.ts
- VisualizationEngine.ts

---

## 5. PARAMETER NORMALIZATION

### paramNormalizer.ts (110 LOC)

**Purpose**: Convert snake_case params to camelCase for safety/calc/thread dispatchers

**PARAM_ALIASES (61 entries)**
```typescript
// Geometry
tool_diameter → toolDiameter
axial_depth → axialDepth
radial_depth → radialDepth
depth_of_cut → depthOfCut
width_of_cut → widthOfCut
stick_out → stickout
stickout_length → stickout
tool_length → toolLength
flute_length → fluteLength
point_angle → pointAngle
helix_angle → helixAngle
lead_angle → leadAngle
nose_radius → noseRadius
corner_radius → cornerRadius

// Cutting params
cutting_speed → cuttingSpeed
spindle_speed → spindleSpeed
feed_rate → feedRate
feed_per_tooth → feedPerTooth
feed_per_rev → feedPerRev
surface_speed → surfaceSpeed
chip_load → chipLoad

// Tool properties
num_flutes → numberOfFlutes
number_of_flutes → numberOfFlutes
tool_material → toolMaterial
tool_type → toolType
tool_coating → toolCoating

// Thread params
thread_type → threadType
thread_size → threadSize
thread_pitch → threadPitch
tap_drill → tapDrill
pitch_diameter → pitchDiameter
major_diameter → majorDiameter
minor_diameter → minorDiameter
threads_per_inch → threadsPerInch

// Process params
material_type → materialType
work_material → workMaterial
coolant_type → coolantType
coolant_pressure → coolantPressure
surface_finish → surfaceFinish
material_removal_rate → materialRemovalRate
```

**Key Contract**:
- Does NOT mutate input
- Adds camelCase versions alongside originals
- Sets `_param_remaps` count if any remapping occurs
- Also exports REVERSE_ALIASES for snake_case conversion

**Usage Pattern** (all dispatchers):
```typescript
try {
  const { normalizeParams } = await import("../../utils/paramNormalizer.js");
  const normalized = normalizeParams(params);
  if (normalized._param_remaps) {
    params = normalized;
    log.info(`[PARAM-NORM] ${dispatcher}:${action} remapped ${normalized._param_remaps} params`);
  }
} catch { /* normalizer not available — proceed with original params */ }
```

---

## 6. CADENCE EXECUTOR (cadenceExecutor.ts)

### Purpose
Auto-fire side-channel executor for todo_update and auto_checkpoint, bypassing dispatchers to avoid recursive hook loops.

### Key Functions Exported
1. **autoTodoRefresh(callNumber)** → TodoRefreshResult
   - Refreshes todo.md with current call number
   - Creates minimal todo if none exists
   - Maintains 100-entry max history

2. **appendEventLine(type, data)** → void
   - Appends event to immutable session_events.jsonl log
   - Format: { ts, type, ...data }
   - Non-fatal on failure

3. **autoCheckpoint(callNumber)** → CheckpointResult
   - Captures state for recovery
   - Writes to CURRENT_STATE.json atomically

4. **Atomic File Write Helper**
   - Writes to .tmp then renames (prevents corruption from concurrent access)

### Key Type Imports (from prism-schema.ts)
- CompactionSurvivalData
- TodoRefreshResult
- CheckpointResult
- ContextPressureResult
- QualityGateResult
- ErrorLearnResult
- ValidationWarning
- NLHookEvalResult
- ... and 15+ more

### Integration Points
- SessionLifecycleEngine
- ContextBudgetEngine
- TelemetryEngine
- TaskAgentClassifier
- SwarmGroupExecutor
- PredictiveFailureEngine
- MemoryGraphEngine

---

## 7. EXISTING TEST PATTERNS

### AtomicValue.test.ts (429 LOC)

**Testing Framework**: Custom (no Jest/Vitest yet)

**Test Structure**:
```typescript
interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  expected?: any;
  actual?: any;
}

function test(name, fn): void { /* record result */ }
function assertClose(actual, expected, tolerance): boolean { /* ~1% delta */ }
```

**Test Categories**:
1. **Creation Tests** (4 tests)
   - basicValue, negative uncertainty handling, exact counts, handbook sources

2. **Type Guard Tests** (5 tests)
   - isAtomicValue, isExactValue with valid/invalid inputs

3. **Formatting & Parsing** (4 tests)
   - formatAtomicValue, parseAtomicValue round-trip

4. **Validation Tests** (3 tests)
   - Valid values pass, negative uncertainty fails, exact with uncertainty fails

5. **Arithmetic Tests** (8 tests)
   - add, subtract, multiply, divide with uncertainty propagation
   - Unit mismatch handling, zero divisor protection

6. **Power & Exponential Tests** (2 tests)
   - power(x, n), sqrt(x) with uncertainty scaling

7. **Confidence Conversion Tests** (2 tests)
   - convertConfidence 68%→95%, same level returns same

8. **Aggregation Tests** (1 test)
   - sum() with Pythagorean uncertainty

9. **Comparison Tests** (4 tests)
   - areEquivalent with overlapping/non-overlapping CIs
   - isGreaterThan with statistical significance

10. **Monte Carlo Tests** (2 tests)
    - Complex formula propagation (x²+y)
    - 10,000 samples for statistical distribution

11. **PRISM Physics Formula Tests** (2 tests)
    - Kienzle cutting force propagation
    - Taylor tool life propagation

**Assertions**:
- Boolean returns true/false
- assertClose(actual, expected, tolerance=0.01) for floating point
- Custom error messages with expected/actual

**Total Coverage**: 38 tests, all report pass/fail status

---

## 8. TESTABILITY INTERFACES & CONTRACTS

### Dispatcher Contract

**Input Interface**:
```typescript
{
  action: string (from enum)
  params?: Record<string, any>
}
```

**Output Interface (MCP Envelope)**:
```typescript
{
  content: [{ type: "text", text: string (JSON) }],
  isError?: boolean
}
```

**Internal Contracts**:
1. **Pre-action Hook**: Can block if safety/policy violated
2. **Param Normalization**: Optional snake_case → camelCase
3. **Defaults Application**: Auto-populate tool geometry, forces, conditions
4. **Handler Dispatch**: Route action to handler or engine
5. **Post-action Hook**: Non-blocking status update
6. **Response Formatting**: Optional level-based slimming

### Engine Contract (Example: ManufacturingCalculations)

**Exports**:
```typescript
// Core functions
export function calculateKienzleCuttingForce(params): CuttingForceResult
export function calculateTaylorToolLife(params): ToolLifeResult
export function calculateJohnsonCookStress(params): StressResult
export function calculateSurfaceFinish(params): SurfaceFinishResult
export function calculateMRR(params): MRRResult
export function calculateSpeedFeed(params): SpeedFeedResult

// Type definitions
export type KienzleCoefficients = { ... }
export type TaylorCoefficients = { ... }
export type CuttingConditions = { ... }
export type CuttingForceResult = { Fc, Ff, power, torque, ... }

// Constants
export const SAFETY_LIMITS: Record<string, [number, number]> = { ... }

// Defaults
export function getDefaultKienzle(): KienzleCoefficients
export function getDefaultTaylor(): TaylorCoefficients
```

**Error Handling Pattern**:
- Throw Error with descriptive message
- No try/catch in engine — let dispatcher handle
- Validate inputs before computation

### Response Level Formatting

**Pattern** (from safetyDispatcher):
```typescript
type ResponseLevel = "brief" | "normal" | "detailed" | "full"

function formatByLevel(
  raw: any,
  level: ResponseLevel,
  keyValueExtractor: (result) => Record<string, any>
): any
```

**Purpose**: Token budgeting for context pressure
- BRIEF: ~50 tokens (critical info only)
- NORMAL: ~100-150 tokens (key metrics)
- DETAILED: ~300 tokens (full breakdown)
- FULL: ~500+ tokens (complete result)

---

## 9. ERROR HANDLING SUMMARY

### Dispatcher-level Error Handling
- **Top-level catch**: All 45 dispatchers wrap in try/catch
- **Error return**: { content: [{ type: "text", text: JSON.stringify({ error, details, action }) }], isError: true }
- **Logging**: log.error() before return
- **Error Info**: action, params, message, sometimes details

### Engine-level Error Handling
- **Strategy**: Throw early with clear messages
- **No silent failures**: Validation errors surface immediately
- **Type safety**: Zod schemas validate params before handler call

### Specific Patterns
```typescript
// Pattern 1: Pre-computation validation
if (!fs.existsSync(file)) throw new Error(`File not found: ${file}`);

// Pattern 2: Math domain errors
if (divisor === 0) throw new Error("Division by zero");

// Pattern 3: Physical constraint violations
if (safetyScore < 0.70) throw new SafetyBlockError(`Safety score ${s.toFixed(2)} < 0.70`);

// Pattern 4: Hook blocking
if (preResult.blocked) {
  return { content: [{ type: "text", text: JSON.stringify({ blocked: true, reason }) }] };
}
```

---

## 10. KEY TESTABILITY INSIGHTS

### Strengths
1. **Consistent Structure**: All dispatchers follow same pattern
2. **Clear Contracts**: Action enums, Zod schemas, response envelopes
3. **Modular Design**: Engines are independent, testable functions
4. **Hook Integration**: Pre/post hooks allow policy testing
5. **Parameter Normalization**: Automatic snake_case → camelCase
6. **Response Formatting**: Supports multiple output levels
7. **Error Tracking**: isError flag + error messages
8. **Type Safety**: Zod + TypeScript for compile-time checks

### Testing Challenges
1. **45 Dispatchers**: Need matrix testing approach
2. **100+ Engines**: Each with complex calculations
3. **Deep Dependencies**: Engines import from many other engines
4. **State Management**: Some dispatchers maintain state (omegaHistory)
5. **File I/O**: Some dispatchers read config files (paramNormalizer)
6. **Hook Execution**: Pre/post hooks can't be tested in isolation
7. **Registry Dependencies**: Many engines depend on external registries
8. **Response Slimming**: Pressure-aware response formatting adds complexity

### What Tests Should Verify

#### For Each Dispatcher (45 tests minimum)
1. **Happy Path**: Valid action + params → valid response
2. **Action Enumeration**: All ACTIONS defined in enum
3. **Invalid Action**: Unknown action → error response with isError: true
4. **Missing Params**: Required params missing → helpful error
5. **Param Normalization**: snake_case params converted to camelCase
6. **Error Handling**: Engine throws → dispatcher catches + returns error
7. **Response Format**: Always returns MCP content envelope
8. **Logging**: log.info called with action

#### For Each Engine (complex)
1. **Unit Test**: Function inputs → expected outputs
2. **Boundary Tests**: Edge cases (zero, negative, limits)
3. **Physical Constraints**: Engineering limits enforced
4. **Uncertainty Propagation**: Error ranges calculated correctly
5. **Cross-field Validation**: Related params validated together
6. **Defaults Application**: Missing params populated sensibly
7. **Type Safety**: Zod schema validation works

#### Integration Tests
1. **Dispatcher → Engine**: Valid flow through entire stack
2. **Hook Integration**: Pre-hook can block, post-hook captures output
3. **Response Formatting**: Level-based response trimming works
4. **Param Normalization**: snake_case → camelCase in complex objects
5. **Cache Behavior**: ComputationCache hits/misses work

---

## 11. SUGGESTED TEST STRUCTURE

### Phase 1: Dispatcher Matrix Tests
- File: `dispatchers.test.ts`
- Table-driven tests for all 45 dispatchers
- Smoke test: valid action → response

### Phase 2: Engine Tests
- File: `engines/{engine}.test.ts` (per engine)
- Unit tests for calculation functions
- Boundary tests for physical constraints
- Uncertainty propagation verification

### Phase 3: Integration Tests
- File: `integration.test.ts`
- Dispatcher → Engine → Response envelope
- Hook pre/post execution
- Response formatting levels

### Phase 4: Type Safety Tests
- File: `types.test.ts`
- Zod schema validation
- Response envelope structure
- Error object structure

### Phase 5: Smoke/E2E Tests
- File: `smokeTests.ts` (pattern already exists!)
- Already defined: SMK-001 through SMK-N
- ATCS work queue generation
- Acceptance criteria verification

---

## 12. REFERENCES & FILE PATHS

**Key Files Analyzed**:
- C:/PRISM/mcp-server/src/tools/dispatchers/ (45 dispatchers)
- C:/PRISM/mcp-server/src/engines/index.ts (2185 LOC, all exports)
- C:/PRISM/mcp-server/src/utils/paramNormalizer.ts (110 LOC)
- C:/PRISM/mcp-server/src/tools/cadenceExecutor.ts (278 KB, side-channel)
- C:/PRISM/src/core/tests/AtomicValue.test.ts (429 LOC, existing pattern)

**Smoke Test Infrastructure**:
- C:/PRISM/mcp-server/src/tests/smokeTests.ts (generates WORK_QUEUE.json)
- Already used in: devDispatcher.ts → "test_smoke" action
- ATCS integration: autonomous task generation

---

## Summary

The PRISM MCP server has:
- **45 dispatchers** with consistent patterns and clear contracts
- **100+ engines** with modular, testable functions
- **Parameter normalization** layer for usability
- **Hook system** for policy enforcement
- **Response formatting** for context budgeting
- **Existing test pattern** (AtomicValue.test.ts) showing custom test framework
- **Smoke test infrastructure** ready for expansion

**Testability Level**: HIGH (clear contracts, modular design, type-safe)
**Test Complexity**: MEDIUM (many dispatchers, complex engines, state management)
**Recommended Approach**: Table-driven dispatcher tests + per-engine unit tests + integration layer
