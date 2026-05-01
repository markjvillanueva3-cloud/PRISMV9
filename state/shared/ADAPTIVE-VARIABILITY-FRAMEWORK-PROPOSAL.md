# Adaptive Variability Framework — USSH Roadmap Addition

**Created**: 2026-04-18
**Purpose**: Eliminate hard caps and account for infinite machining variability
**Status**: PROPOSED — awaiting roadmap integration

## Core Principle: NO HARD CAPS

Machining has extreme variability:
- Materials: 10,000+ alloys, each with unique properties
- Geometries: infinite possible shapes
- Machines: 1,000+ configurations per family
- Conditions: temperature, humidity, tool wear, batch variation
- Operators: skill levels, preferences, tribal knowledge
- Customers: tolerance requirements, surface specs, cost constraints

**Rule**: Every parameter must have adaptive boundaries, not fixed limits.

## Proposed Engines (Phase 0.25 — Adaptive Variability Layer)

### 1. VariabilityEnvelopeEngine
**Purpose**: Replace hard limits with probabilistic envelopes

```typescript
interface VariabilityEnvelope {
  parameter: string;
  nominal: number;
  // NO min/max — instead:
  distribution: "normal" | "lognormal" | "empirical";
  p50: number;  // 50th percentile
  p95: number;  // 95th percentile  
  p99: number;  // 99th percentile
  p999: number; // 99.9th percentile — "extreme but seen"
  outlierCapture: boolean; // Learn from values beyond p999
}
```

Instead of: `rpm_max: 12000` (hard cap)
Use: `rpm: {p50: 8000, p95: 10000, p99: 11500, p999: 12500, outlierCapture: true}`

### 2. AdaptiveParameterSpaceEngine
**Purpose**: Expand parameter space based on evidence

- Start with conservative defaults
- Expand as successful operations are logged
- Never contract without explicit evidence of failure
- Track "unexplored regions" for curiosity-driven learning

```typescript
interface AdaptiveSpace {
  parameters: Map<string, VariabilityEnvelope>;
  exploredRegions: ConvexHull[];
  unexploredGaps: Region[];
  expansionHistory: ExpansionEvent[];
  
  // Methods
  proposeExpansion(outcome: SuccessfulOperation): ExpansionProposal;
  captureOutlier(value: number, context: OperationContext): void;
  suggestExploration(): ExplorationTarget[];
}
```

### 3. EdgeCaseCaptureEngine
**Purpose**: Systematically learn from boundary conditions

Every operation at the edge of known space:
- Logs to `EDGE_CASE_LEDGER.jsonl`
- Triggers review for envelope expansion
- Feeds into neural models
- Captures tribal knowledge

```typescript
interface EdgeCaseCapture {
  operation: Operation;
  parameter: string;
  value: number;
  percentile: number; // Where in envelope
  outcome: "success" | "marginal" | "failure";
  context: MachineState;
  operatorNotes: string;
  
  // Auto-captured
  vibration: number;
  temperature: number;
  power: number;
}
```

### 4. ExceptionLearningEngine
**Purpose**: Turn exceptions into knowledge, not errors

When something unexpected happens:
1. Don't fail — capture
2. Analyze context
3. Propose envelope expansion OR new tribal tip
4. Log for future reference

```typescript
interface ExceptionHandler {
  handleUnexpected(event: UnexpectedEvent): ExceptionResponse;
  proposeEnvelopeUpdate(event: SuccessfulException): EnvelopeProposal;
  generateTribalTip(event: LearnedException): TribalTip;
}
```

### 5. InfiniteConditionCombinatorEngine
**Purpose**: Handle combinatorial explosion of conditions

- Material × Geometry × Machine × Tool × Conditions = effectively infinite
- Use hierarchical Bayesian models to share information
- Transfer learning across similar conditions
- Interpolate between known points

### 6. ContextualBoundaryEngine
**Purpose**: Boundaries depend on context, not absolutes

Example: "Max feed" depends on:
- Material hardness
- Tool condition
- Machine rigidity
- Depth of cut
- Chip load
- Coolant type
- Operator experience

No single number — a function of all inputs.

### 7. VariabilitySourceTrackerEngine
**Purpose**: Track where variability comes from

Sources:
- Material batch variation
- Tool wear progression
- Machine thermal drift
- Environmental changes
- Setup differences
- Operator variation

Knowing the source enables compensation.

## New Skills

| Skill | Purpose |
|-------|---------|
| `/envelope-view <param>` | Show current variability envelope for parameter |
| `/expand-envelope <param> <evidence>` | Propose envelope expansion with evidence |
| `/edge-cases` | Show recent edge case operations |
| `/unexplored` | Show unexplored parameter regions |
| `/variability-sources` | Analyze variability sources for recent operations |

## New Hooks

| Hook | Purpose |
|------|---------|
| `hook_no_hard_cap` | BLOCK any code introducing hard min/max without envelope |
| `hook_edge_case_capture` | Auto-capture operations at envelope boundaries |
| `hook_outlier_learning` | Trigger learning when outlier succeeds |
| `hook_context_boundary` | Warn when boundary used without context |

## State Files

| File | Purpose |
|------|---------|
| `VARIABILITY_ENVELOPES.json` | All parameter envelopes |
| `EDGE_CASE_LEDGER.jsonl` | Captured edge cases |
| `ENVELOPE_EXPANSION_LOG.jsonl` | History of expansions |
| `UNEXPLORED_REGIONS.json` | Gaps in parameter space |
| `VARIABILITY_SOURCES.json` | Source attribution data |

## Exit Gates

- NO hardcoded min/max in any engine (grep audit)
- ALL parameters use VariabilityEnvelope
- Edge cases captured automatically
- Successful outliers trigger envelope expansion
- `/envelope-view spindle_rpm` shows probabilistic distribution
- `hook_no_hard_cap` blocks new hard limits

## Integration Points

- **Phase 0.18 CausalReasoningEngine**: Traces variability sources
- **Phase 0.19 OutcomeTrackingEngine**: Feeds edge case learning
- **Phase 0.20 BayesianInferenceEngine**: Updates envelope posteriors
- **Phase 0.13 CuriosityDrivenExplorerEngine**: Explores unexplored regions

## Anti-Patterns

- ❌ `if (rpm > 12000) throw Error` — HARD CAP
- ❌ `Math.min(rpm, maxRPM)` — SILENT CLAMP
- ❌ `validateRange(rpm, 0, 12000)` — FIXED RANGE

## Correct Patterns

- ✓ `envelope.evaluate(rpm, context)` — CONTEXTUAL CHECK
- ✓ `envelope.percentile(rpm)` — PROBABILITY ASSESSMENT
- ✓ `envelope.captureIfOutlier(rpm, outcome)` — LEARNING

## Migration Plan

1. Audit all engines for hard caps
2. Replace with envelope calls
3. Seed envelopes from existing data
4. Enable edge case capture
5. Monitor for expansion opportunities

---

**Estimated Artifacts**: 7 engines + 5 skills + 4 hooks + 5 state files = ~21 artifacts

**Priority**: HIGH — foundational for all other learning
