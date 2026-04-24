# MILL-MASTER-AI-WIRING — Pinned API Map

**Generated**: 2026-04-24 (U0.5-API-AUDIT-PIN)
**Purpose**: Freeze exact method signatures the `MillAIWiring` helper depends on, so U1-U14 can be executed without re-auditing the API each unit. If any signature here changes, this document and every consumer must be updated together.
**Rule**: Additive-only. Never call a method not listed here from wiring code.

---

## 1. AIDecisionExplanationEngine

**File**: `mcp-server/src/engines/AIDecisionExplanationEngine.ts`
**Singleton**: `aiDecisionExplanationEngine` (line 1279)
**Class**: `AIDecisionExplanationEngine` (line 550)

### Public methods

| Line | Signature |
|------|-----------|
| 567  | `explainDecision(input: DecisionExplanationInput): DecisionExplanation` |
| 631  | `explainParameter(input: ParameterDecisionInput, template: OperationTemplate, verbosity: VerbosityLevel, includeTribal?: boolean): ParameterExplanation` |
| 1219 | `createTribalAttribution(tipId: string, tipSource: string, tipBody: string): DecisionSource` |
| 1232 | `createOEMAttribution(manufacturer: string, recommendation: string, catalogRef?: string): DecisionSource` |
| 1244 | `createPhysicsAttribution(formulaName: string, formulaDesc: string): DecisionSource` |
| 1257 | `getApprovalGateExplanation(explanation: DecisionExplanation): { requiresApproval: boolean; reasons: string[] }` (return shape — verify at callsite) |

### Input / output shapes (verbatim)

```ts
// line 162
interface DecisionExplanationInput {
  operationId: string;
  operationType: OperationType;
  operationName?: string;
  parameters: ParameterDecisionInput[];
  verbosity?: VerbosityLevel;
  includeTribalKnowledge?: boolean;
  targetAudience?: "operator" | "engineer" | "manager";
}

// line 126
interface ParameterDecisionInput {
  parameter: string;
  displayName?: string;
  chosenValue: number | string;
  unit: string;
  context: ParameterContext;
  sources?: DecisionSource[];
  alternatives?: Array<{ value: number | string; reason?: string }>;
  constraints?: string[];
  risks?: string[];
}

// line 79
interface DecisionSource {
  type: SourceType;
  id?: string;
  description: string;
  confidence: number;   // 0..1
  reference?: string;
}

// line 110
interface DecisionExplanation {
  operationId: string;
  operationType: OperationType;
  operationName?: string;
  timestamp: string;
  parameters: ParameterExplanation[];
  overallConfidence: number;
  keyTradeoffs: Tradeoff[];
  suggestedReview: boolean;
  reviewReasons?: string[];
  summary: string;
  detailedNarrative?: string;
  verbosityLevel: VerbosityLevel;
}

// line 88
interface ParameterExplanation {
  parameter: string;
  displayName: string;
  chosenValue: number | string;
  unit: string;
  reasoning: string[];
  alternatives: AlternativeValue[];
  confidenceLevel: number;
  sourcesUsed: DecisionSource[];
  riskFactors?: string[];
  constraintsApplied?: string[];
}
```

### Wiring notes

- `MillAIWiring` helper will call `explainDecision` exactly once per AI-path request and attach the full `DecisionExplanation` to the trace record (never mutate the return value).
- Attribution helpers (`createTribalAttribution`, `createOEMAttribution`, `createPhysicsAttribution`) produce `DecisionSource` values to pass in `ParameterDecisionInput.sources` — helper does NOT instantiate `DecisionSource` objects directly.
- `getApprovalGateExplanation` feeds the gate decision in U3+ engines that need approval routing.

---

## 2. PersistentMemoryEngine

**File**: `mcp-server/src/engines/PersistentMemoryEngine.ts`
**Singleton**: `persistentMemoryEngine` (line 449)
**Class**: `PersistentMemoryEngine` (line 116)

### Public methods

| Line | Signature |
|------|-----------|
| 126  | `load(): void` |
| 141  | `save(): void` |
| 159  | `store(type: MemoryType, domain: string, tags: string[], content: string, metadata?: Record<string, unknown>, sessionId?: string): MemoryEntry` |
| 197  | `get(id: string): MemoryEntry \| undefined` |
| 210  | `delete(id: string): boolean` |
| 225  | `search(query: MemoryQuery): MemorySearchResult` |
| 293  | `applyDecay(): { decayed: number; pruned: number }` |
| 322  | `recordLearning(record: LearningRecord, sessionId?: string): MemoryEntry` |
| 336  | `setPreference(pref: PreferenceRecord): MemoryEntry` |
| 355  | `getPreference(key: string): unknown \| undefined` |
| 366  | `recordCalibration(cal: CalibrationRecord): MemoryEntry` |
| 385  | `getStats(): MemoryStats` |

### Input / output shapes (verbatim)

```ts
// line 29
type MemoryType =
  | "learning"
  | "preference"
  | "calibration"
  | "pattern"
  | "decision"
  | "context";

// line 37
interface MemoryEntry {
  id: string;
  type: MemoryType;
  domain: string;
  tags: string[];
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
  last_accessed: string;
  access_count: number;
  relevance_score: number;
  source_session?: string;
}

// line 51
interface MemoryQuery {
  tags?: string[];
  domain?: string;
  type?: MemoryType;
  min_relevance?: number;
  max_age_hours?: number;
  limit?: number;
}

// line 60
interface MemorySearchResult {
  entries: MemoryEntry[];
  total_matches: number;
  query_time_ms: number;
}

// line 66
interface LearningRecord {
  action: string;
  outcome: "success" | "failure" | "partial";
  context: Record<string, unknown>;
  lesson: string;
  confidence: number;
}

// line 74
interface PreferenceRecord {
  key: string;
  value: unknown;
  domain: string;
  set_by: string;
  reason?: string;
}

// line 82
interface CalibrationRecord {
  parameter: string;
  predicted: number;
  actual: number;
  correction_factor: number;
  material?: string;
  machine?: string;
  sample_count: number;
}

// line 92
interface MemoryStats {
  total_entries: number;
  by_type: Record<MemoryType, number>;
  by_domain: Record<string, number>;
  avg_relevance: number;
  oldest_entry: string | null;
  newest_entry: string | null;
  stale_count: number;
}
```

### Constants that bound helper behaviour

- `MAX_ENTRIES = 5000` (hard cap — eviction is lowest-relevance first).
- `DECAY_RATE = 0.995` per hour; `MIN_RELEVANCE = 0.1`; `STALE_HOURS = 720` (30 d).
- `MEMORY_FILE = data/state/PERSISTENT_MEMORY.json` — helper must not rely on file path; go through the singleton.

### Wiring notes

- Helper records outcomes via `recordLearning({ action, outcome, context, lesson, confidence })` — NEVER direct `store()`.
- User preferences read via `getPreference(key)`; write through `setPreference(...)` only on explicit operator action, never inside an AI route.
- Physics calibration lives on `recordCalibration(...)`; only engines with a physics comparison (predicted vs actual) may call it.
- Helper never calls `save()` in hot path — singleton persists opportunistically; call `save()` only from dispatcher shutdown / test teardown.

---

## 3. Contract summary for `src/engines/MillAIWiring.ts` (U2)

The helper exports exactly four entry points, each typed in terms of the shapes above:

```ts
export async function withPRISMReasoning<T>(
  ctx: MillReasoningContext,
  legacyPath: () => Promise<T>,
  aiPath: () => Promise<T>,
): Promise<T>;

export function rankCandidatesBayesian<C>(
  candidates: C[],
  scorer: (c: C) => number,
  priors?: Record<string, number>,
): { best: C; ranked: C[]; explanation: DecisionExplanation };

export function recordCapabilityUsage(event: CapabilityUsageEvent): void;

export async function budgetedAIPath<T>(
  useAI: "off" | "auto" | "on",
  legacyPath: () => Promise<T>,
  aiPath: () => Promise<T>,
  budgetMs: number,
): Promise<T>;
```

All four functions MUST:
1. Route memory writes through `persistentMemoryEngine.recordLearning(...)` only — no direct `store()`.
2. Route explanations through `aiDecisionExplanationEngine.explainDecision(...)` with attribution helpers.
3. Fail closed to `legacyPath()` on any helper exception; attach failure reason to trace.
4. Honour `latency_budgets_ms` from the envelope `global_contracts`: off=50, auto=100, on=500, hard ceiling=2000.

---

## 4. Change control

Any PR that modifies either engine's public signature MUST update this document in the same commit. CI gate (U16) will grep this file against the engines and fail if a listed signature is missing at the stated line number ±3.
