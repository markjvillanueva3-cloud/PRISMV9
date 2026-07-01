# PRISM MCP Server — Master Integration Plan: 27 Improvements

**Author**: Integration & Wiring Specialist
**Date**: 2026-03-24
**Source**: IDEAS.md (16 innovations) + 11 cross-cutting capabilities
**Baseline**: 77 dispatchers, 1245 engines, 62 registered MCP tools, 2700+ actions

---

## THE 27 IMPROVEMENTS — CANONICAL LIST

### Core Infrastructure Layer (1-10)
| # | Name | Short ID | Description |
|---|------|----------|-------------|
| 1 | Response Streaming with Progressive Detail | `RESP-TIER` | 4-level response tiers (status → verdict → summary → full) |
| 2 | Tool Call Fusion Engine | `TOOL-FUSE` | Auto-detect sequential call patterns and generate fused endpoints |
| 3 | Server-Side Agent Loops | `AGENT-LOOP` | Internal multi-turn reasoning with Claude API per tool call |
| 4 | Middleware Pipeline Architecture | `MW-PIPE` | Composable pre/post middleware chain for all tool calls |
| 5 | Semantic Cache Layer | `SEM-CACHE` | Embedding-based similarity cache (0.95=exact, 0.80=approx) |
| 6 | Dependency-Aware Tool Registry | `DEP-REG` | Tools declare requires/produces/invalidates typed contracts |
| 7 | Token Budget Manager | `TOK-BUDGET` | Per-session token tracking with auto-compress at thresholds |
| 8 | Event Bus / Pub-Sub | `EVT-BUS` | Reactive tool-to-tool event chains (already partial: EventBus.ts) |
| 9 | Sandboxed Execution Environments | `SANDBOX` | Per-tool isolation (timeout, memory, filesystem, network) |
| 10 | Schema Evolution and Versioning | `SCHEMA-VER` | Multi-version tools with transparent migration |

### Orchestration Layer (11-16)
| # | Name | Short ID | Description |
|---|------|----------|-------------|
| 11 | DAG Workflow Engine | `DAG-WF` | Multi-step workflow DAGs with parallel execution |
| 12 | Circuit Breaker + Retry Intelligence | `CIRCUIT` | Per-tool circuit breaker with smart retry and fallback |
| 13 | Multi-Agent Coordination Protocol | `MULTI-AGENT` | Locking, conflict resolution, shared state for concurrent agents |
| 14 | Self-Documenting Tool Registry | `SELF-DOC` | Auto-generated docs from schemas + usage stats + examples |
| 15 | Adaptive Tool Surfacing | `ADAPT-SURF` | Context-aware dynamic tool subset (15 of 300+) per conversation |
| 16 | Telemetry and Cost Attribution | `TELEM-COST` | Per-call token/latency/cost tracking (already partial: TelemetryEngine) |

### Intelligence & Safety Layer (17-27)
| # | Name | Short ID | Description |
|---|------|----------|-------------|
| 17 | Embedding Infrastructure | `EMBED-INFRA` | Shared vector store + embedding service for semantic features |
| 18 | Semantic Router | `SEM-ROUTE` | Embedding-based intent-to-tool routing (replace keyword matching) |
| 19 | Semantic RAG | `SEM-RAG` | Retrieval-augmented generation over PRISM knowledge (tribal, playbook) |
| 20 | Semantic Memory | `SEM-MEM` | Embedding-indexed cross-session memory (upgrade MemoryGraphEngine) |
| 21 | PolicyEvaluation Type System | `POLICY-TYPE` | Typed policy evaluation results with confidence + evidence chain |
| 22 | Safety Callbacks | `SAFETY-CB` | Structured callbacks for safety-critical decisions requiring human review |
| 23 | Escalation Protocol | `ESCALATE` | Multi-tier escalation: warn → block → human → audit (beyond alarms) |
| 24 | Structured Audit Trail | `AUDIT-TRAIL` | Immutable, queryable audit log for all tool mutations + decisions |
| 25 | Shared State Protocol | `SHARED-STATE` | Cross-agent state sharing with versioning and conflict resolution |
| 26 | Agent-as-Tool | `AGENT-TOOL` | Expose agent capabilities as callable tools for other agents |
| 27 | Confidence Scoring Framework | `CONF-SCORE` | Unified confidence scoring across all computation results |

---

## 1. DEPENDENCY GRAPH

### Foundation Layer (must be built first — everything depends on these)

```
MW-PIPE (4) ─────────┬──── Foundation for ALL other features
                      │     Every tool call passes through middleware
                      │
EVT-BUS (8) ─────────┤     Already exists (EventBus.ts) but needs upgrade
                      │     Reactive chain foundation for 6+ features
                      │
EMBED-INFRA (17) ────┘     Vector store + embedding API required by 3 features
```

### Dependency Chains

```
Chain A: Embedding Foundation (4 features)
  EMBED-INFRA (17) ──→ SEM-CACHE (5)
                   ──→ SEM-ROUTE (18)
                   ──→ SEM-RAG (19)
                   ──→ SEM-MEM (20)

Chain B: Safety & Policy (4 features)
  POLICY-TYPE (21) ──→ SAFETY-CB (22)
                   ──→ ESCALATE (23)
                   ──→ CONF-SCORE (27)

Chain C: Agent Coordination (3 features)
  SHARED-STATE (25) ──→ MULTI-AGENT (13)
                    ──→ AGENT-TOOL (26)

Chain D: Middleware Enhancement (6 features)
  MW-PIPE (4) ──→ RESP-TIER (1)
              ──→ CIRCUIT (12)
              ──→ SANDBOX (9)
              ──→ TOK-BUDGET (7)
              ──→ TELEM-COST (16)
              ──→ AUDIT-TRAIL (24)

Chain E: Tool Intelligence (4 features)
  DEP-REG (6) ──→ DAG-WF (11)
              ──→ TOOL-FUSE (2)
              ──→ SELF-DOC (14)

Chain F: Smart Surfacing (2 features)
  SEM-ROUTE (18) + TELEM-COST (16) ──→ ADAPT-SURF (15)

Chain G: Server-Side AI (1 feature)
  AGENT-LOOP (3) ← requires MW-PIPE (4) + TOK-BUDGET (7) + CONF-SCORE (27)
```

### Enabler Score (how many other features does each unlock?)

| Improvement | Enables | Score |
|-------------|---------|-------|
| MW-PIPE (4) | 1, 7, 9, 12, 16, 24 | **6** |
| EMBED-INFRA (17) | 5, 18, 19, 20 | **4** |
| DEP-REG (6) | 2, 11, 14 | **3** |
| EVT-BUS (8) | 2, 12, 13, 24 | **4** |
| POLICY-TYPE (21) | 22, 23, 27 | **3** |
| SHARED-STATE (25) | 13, 26 | **2** |
| TELEM-COST (16) | 15 | **1** |
| SEM-ROUTE (18) | 15 | **1** |

### Independent (can be built in parallel with zero dependencies)

| Improvement | Reason |
|-------------|--------|
| SCHEMA-VER (10) | Self-contained versioning layer on tool registration |
| SELF-DOC (14) | Can start with schema introspection alone (DEP-REG enhances it later) |

---

## 2. CONFLICT ANALYSIS

### Potential Conflicts

| Conflict | Features | Risk | Resolution |
|----------|----------|------|------------|
| **Batch meta-tool vs per-tool auth** | TOOL-FUSE (2) vs existing OAuth auth middleware | HIGH | Fused tools must inherit the MOST RESTRICTIVE permission from constituent tools. Implement permission union in fusion registry. |
| **Agent-as-Tool circular deps** | AGENT-TOOL (26) vs orchestration coordinator | HIGH | Agents exposed as tools MUST NOT be able to call themselves (directly or transitively). Enforce via call-stack depth check and agent ID exclusion list in the tool registry. |
| **Middleware Pipeline vs existing autoHookWrapper** | MW-PIPE (4) vs `autoHookWrapper.ts` | MEDIUM | autoHookWrapper IS the current middleware. MW-PIPE must SUBSUME it, not run alongside. Migration path: extract cadence/hook logic into MW-PIPE middleware units, then deprecate autoHookWrapper's proxy pattern. |
| **Semantic Cache vs safety-critical freshness** | SEM-CACHE (5) vs safety calculations | HIGH | Safety-critical tools (class CRITICAL in toolAnnotations.ts) MUST be excluded from caching. Use `readOnlyHint` + custom `cacheable` annotation. Never cache results for `prism_safety`, `prism_guard`, or any Φ(x)<0.70 calculation. |
| **Token Budget vs long manufacturing analyses** | TOK-BUDGET (7) vs full 67-point speed/feed | MEDIUM | Budget manager must have per-tool exemptions. Safety calculations and multi-engine pipelines get "unlimited" budget class. Only compress advisory/optional content. |
| **Multiple event buses** | EVT-BUS (8) upgrade vs existing EventBus.ts + hookEngine + reactive chains | MEDIUM | Single unified event bus. Existing EventBus.ts becomes the canonical implementation. HookEngine events route THROUGH EventBus, not around it. |
| **Shared State vs Multi-Tenant isolation** | SHARED-STATE (25) vs existing TenantDispatcher (F5) | HIGH | Shared state MUST be tenant-scoped. State keys must include tenant_id prefix. Cross-tenant state sharing only via explicit tenant bridge API. |
| **DAG Workflow vs existing ToolCallPipelineEngine** | DAG-WF (11) vs ToolCallPipelineEngine.ts | LOW | DAG-WF is a superset. ToolCallPipelineEngine's linear pipelines become single-path DAGs. Migrate existing pipeline definitions. |
| **Semantic Router vs existing ToolRouterEngine** | SEM-ROUTE (18) vs ToolRouterEngine.ts | LOW | SEM-ROUTE replaces keyword matching in ToolRouterEngine with embedding similarity. Keep ToolRouterEngine as fallback for cold-start (no embeddings computed yet). |

### Non-Conflicts (features that complement each other cleanly)

- RESP-TIER (1) + TOK-BUDGET (7): Budget manager triggers tier reduction; perfect synergy
- CIRCUIT (12) + TELEM-COST (16): Circuit breaker decisions informed by telemetry; no conflict
- AUDIT-TRAIL (24) + existing auditLog middleware: Audit trail extends audit logging from HTTP-only to ALL tool calls (stdio + HTTP)
- CONF-SCORE (27) + existing Φ(x)/Λ(x) scoring: Confidence scoring generalizes the safety-specific Φ/Λ pattern to all results

---

## 3. SHARED INFRASTRUCTURE

### Infrastructure Component 1: Vector Store + Embedding Service
**Used by**: SEM-CACHE (5), SEM-ROUTE (18), SEM-RAG (19), SEM-MEM (20), ADAPT-SURF (15)

```typescript
// New file: src/infrastructure/EmbeddingService.ts
interface EmbeddingService {
  embed(text: string): Promise<Float32Array>;
  embedBatch(texts: string[]): Promise<Float32Array[]>;
  similarity(a: Float32Array, b: Float32Array): number;
  nearestK(query: Float32Array, k: number, collection: string): Promise<SimilarityResult[]>;
}

// New file: src/infrastructure/VectorStore.ts
interface VectorStore {
  upsert(collection: string, id: string, vector: Float32Array, metadata: Record<string, unknown>): void;
  search(collection: string, query: Float32Array, k: number, filter?: Record<string, unknown>): SimilarityResult[];
  delete(collection: string, id: string): void;
  count(collection: string): number;
}
```

**Implementation**: Use Anthropic's Voyage-3 embeddings via API for production, with a local fallback using a lightweight model (e.g., `all-MiniLM-L6-v2` via ONNX) for offline/low-latency. In-memory HNSW index via `hnswlib-node` for the vector store (no external DB dependency).

### Infrastructure Component 2: Unified Middleware Pipeline
**Used by**: MW-PIPE (4), RESP-TIER (1), CIRCUIT (12), SANDBOX (9), TOK-BUDGET (7), TELEM-COST (16), AUDIT-TRAIL (24), SEM-CACHE (5)

```typescript
// New file: src/infrastructure/MiddlewarePipeline.ts
interface Middleware {
  name: string;
  phase: "pre" | "post" | "error";
  priority: number;  // Lower = runs first
  execute(ctx: MiddlewareContext, next: () => Promise<void>): Promise<void>;
}

interface MiddlewareContext {
  toolName: string;
  action: string;
  params: Record<string, unknown>;
  result?: unknown;
  error?: Error;
  metadata: Map<string, unknown>;  // Shared across middleware
  timing: { start: number; end?: number };
  budget: { consumed: number; remaining: number };
  cache: { hit: boolean; key?: string };
  audit: { entries: AuditEntry[] };
}
```

### Infrastructure Component 3: Event Bus (upgrade)
**Used by**: EVT-BUS (8), TOOL-FUSE (2), CIRCUIT (12), MULTI-AGENT (13), AUDIT-TRAIL (24), AGENT-TOOL (26)

Upgrade existing `EventBus.ts` with:
- Cross-process event relay (for multi-agent)
- Persistent event log (for audit trail replay)
- Event schemas (typed payloads per event type)
- Backpressure handling (for high-throughput manufacturing streams)

### Infrastructure Component 4: Structured Audit Log
**Used by**: AUDIT-TRAIL (24), SAFETY-CB (22), ESCALATE (23), POLICY-TYPE (21), MULTI-AGENT (13)

```typescript
// New file: src/infrastructure/AuditLog.ts
interface AuditRecord {
  id: string;
  timestamp: string;
  actor: { type: "tool" | "agent" | "user" | "system"; id: string };
  action: string;
  target: string;
  outcome: "success" | "failure" | "blocked" | "escalated";
  evidence: Record<string, unknown>;
  policy_eval?: PolicyEvaluation;
  confidence?: number;
  parent_id?: string;  // For chains
}
```

### Infrastructure Component 5: Confidence Scoring Framework
**Used by**: CONF-SCORE (27), SEM-CACHE (5), AGENT-LOOP (3), SAFETY-CB (22), ESCALATE (23), ADAPT-SURF (15)

```typescript
// New file: src/infrastructure/ConfidenceScoring.ts
interface ConfidenceScore {
  value: number;        // 0.0 - 1.0
  method: string;       // "physics" | "statistical" | "heuristic" | "ml" | "consensus"
  evidence: string[];   // What informed the score
  uncertainty: number;  // Standard deviation / error bounds
  threshold: number;    // Below this = flag for review
}
```

Generalizes existing Φ(x)/Λ(x) safety scoring into a universal pattern.

### Infrastructure Component 6: Policy Evaluation Types
**Used by**: POLICY-TYPE (21), SAFETY-CB (22), ESCALATE (23), AUDIT-TRAIL (24)

```typescript
// New file: src/infrastructure/PolicyTypes.ts
interface PolicyEvaluation {
  policy_id: string;
  decision: "allow" | "deny" | "escalate" | "warn";
  confidence: ConfidenceScore;
  evidence: PolicyEvidence[];
  override_by?: string;  // Who can override a deny
  expires_at?: string;
  audit_required: boolean;
}
```

---

## 4. IMPLEMENTATION WAVES

### Wave 0: Foundation Infrastructure (2-3 weeks)
**Goal**: Build shared infrastructure that multiple waves depend on.
**Deployable value**: Better telemetry, middleware observability, audit logging.

| # | Feature | Priority | Effort |
|---|---------|----------|--------|
| 4 | MW-PIPE — Middleware Pipeline Architecture | P0 | L |
| 8 | EVT-BUS — Event Bus Upgrade | P0 | M |
| 16 | TELEM-COST — Telemetry & Cost Attribution | P0 | M |
| 24 | AUDIT-TRAIL — Structured Audit Trail | P1 | M |

**Internal deliverables**:
- `src/infrastructure/MiddlewarePipeline.ts` — the composable middleware framework
- `src/infrastructure/AuditLog.ts` — structured, queryable audit store
- Upgraded `src/engines/EventBus.ts` with persistent log + typed schemas
- Migration of `autoHookWrapper.ts` cadence/hook logic INTO middleware units
- Telemetry pipeline completion (extend existing TelemetryEngine)

**Wiring changes**:
- `index.ts`: Replace `proxiedTool` proxy with `MiddlewarePipeline.wrap(server)`
- All existing middleware (cors, rateLimit, auth, auditLog) re-expressed as Pipeline middlewares
- EventBus subscription endpoints exposed via a new resource URI

---

### Wave 1: Token Efficiency & Response Intelligence (2 weeks)
**Goal**: Dramatic reduction in token consumption.
**Deployable value**: Users see faster, cheaper responses with budget awareness.

| # | Feature | Priority | Effort |
|---|---------|----------|--------|
| 1 | RESP-TIER — Response Streaming with Progressive Detail | P0 | M |
| 7 | TOK-BUDGET — Token Budget Manager | P0 | M |
| 27 | CONF-SCORE — Confidence Scoring Framework | P1 | M |
| 21 | POLICY-TYPE — PolicyEvaluation Type System | P1 | S |

**Depends on**: Wave 0 (MW-PIPE for response interception, AUDIT-TRAIL for policy logging)

**Internal deliverables**:
- `src/infrastructure/ResponseTiering.ts` — 4-level response generator
- `src/infrastructure/TokenBudget.ts` — session budget tracker with auto-compress
- `src/infrastructure/ConfidenceScoring.ts` — unified confidence framework
- `src/infrastructure/PolicyTypes.ts` — typed policy evaluation
- Middleware units: `ResponseTierMiddleware`, `TokenBudgetMiddleware`

**Wiring changes**:
- All dispatcher responses pass through ResponseTierMiddleware
- Session state extended with budget tracking
- ConfidenceScore attached to all calc dispatcher results

---

### Wave 2: Semantic Intelligence (3-4 weeks)
**Goal**: Embedding-powered features that transform tool discovery and knowledge access.
**Deployable value**: Semantic search, intelligent caching, context-aware tool suggestions.

| # | Feature | Priority | Effort |
|---|---------|----------|--------|
| 17 | EMBED-INFRA — Embedding Infrastructure | P0 | L |
| 5 | SEM-CACHE — Semantic Cache Layer | P1 | L |
| 18 | SEM-ROUTE — Semantic Router | P1 | M |
| 15 | ADAPT-SURF — Adaptive Tool Surfacing | P1 | M |
| 19 | SEM-RAG — Semantic RAG | P2 | L |
| 20 | SEM-MEM — Semantic Memory | P2 | M |

**Depends on**: Wave 0 (MW-PIPE for cache middleware), Wave 1 (CONF-SCORE for cache confidence)

**Internal deliverables**:
- `src/infrastructure/EmbeddingService.ts` — Voyage-3 + local fallback
- `src/infrastructure/VectorStore.ts` — HNSW in-memory index
- `src/infrastructure/SemanticCache.ts` — embedding-aware cache with safety exclusions
- `src/infrastructure/SemanticRouter.ts` — replaces keyword matching in ToolRouterEngine
- `src/infrastructure/SemanticRAG.ts` — retrieval over tribal/playbook/formula knowledge
- Upgrade to `src/engines/MemoryGraphEngine.ts` — embedding-indexed nodes

**Wiring changes**:
- New middleware: `SemanticCacheMiddleware` (pre: check cache, post: store result)
- ToolRouterEngine upgraded with SEM-ROUTE fallback chain (embedding → keyword → default)
- New MCP resource: `prism://knowledge/semantic-search?q={query}`
- Adaptive tool list exposed via new `tools/list` enhancement (MCP protocol extension)

---

### Wave 3: Resilience & Orchestration (2-3 weeks)
**Goal**: Production-grade reliability and multi-step workflow support.
**Deployable value**: Automatic retries, circuit breakers, declarative workflow definitions.

| # | Feature | Priority | Effort |
|---|---------|----------|--------|
| 12 | CIRCUIT — Circuit Breaker + Retry Intelligence | P1 | M |
| 6 | DEP-REG — Dependency-Aware Tool Registry | P1 | M |
| 11 | DAG-WF — DAG Workflow Engine | P2 | L |
| 2 | TOOL-FUSE — Tool Call Fusion Engine | P2 | L |
| 9 | SANDBOX — Sandboxed Execution Environments | P2 | M |
| 10 | SCHEMA-VER — Schema Evolution and Versioning | P3 | M |

**Depends on**: Wave 0 (MW-PIPE, EVT-BUS), Wave 1 (TELEM-COST for circuit breaker decisions)

**Internal deliverables**:
- `src/infrastructure/CircuitBreaker.ts` — per-tool state machine (closed/open/half-open)
- `src/infrastructure/DependencyRegistry.ts` — typed requires/produces/invalidates
- `src/infrastructure/DAGWorkflow.ts` — DAG executor (subsumes ToolCallPipelineEngine)
- `src/infrastructure/ToolFusion.ts` — pattern detector + fused endpoint generator
- `src/infrastructure/Sandbox.ts` — isolation context per tool call
- `src/infrastructure/SchemaVersioning.ts` — multi-version tool registration

**Wiring changes**:
- CircuitBreakerMiddleware added to MW-PIPE
- New tool: `prism_workflow` dispatcher with actions: `define`, `execute`, `status`, `list`
- DEP-REG metadata added to all existing dispatcher registrations (incremental)
- Fused tools auto-registered via EventBus pattern detection
- Sandbox wrapping for external-facing tools (openWorldHint=true)

---

### Wave 4: Safety & Governance (2 weeks)
**Goal**: Comprehensive safety framework for production shop floor deployment.
**Deployable value**: Human-in-the-loop safety gates, escalation, traceable decisions.

| # | Feature | Priority | Effort |
|---|---------|----------|--------|
| 22 | SAFETY-CB — Safety Callbacks | P0 | M |
| 23 | ESCALATE — Escalation Protocol | P1 | M |
| 14 | SELF-DOC — Self-Documenting Tool Registry | P2 | S |

**Depends on**: Wave 0 (AUDIT-TRAIL, EVT-BUS), Wave 1 (POLICY-TYPE, CONF-SCORE)

**Internal deliverables**:
- `src/infrastructure/SafetyCallbacks.ts` — structured human review requests
- `src/infrastructure/EscalationProtocol.ts` — multi-tier escalation with timeouts
- `src/infrastructure/SelfDocRegistry.ts` — auto-generated API docs
- New MCP resource: `prism://meta/docs`, `prism://meta/health`, `prism://meta/usage`

**Wiring changes**:
- SafetyCallbackMiddleware intercepts Φ(x)<0.70 results → triggers elicitation
- EscalationProtocol wired to AlarmEscalationEngine (extend existing, not replace)
- Self-doc endpoint served at `/api/v1/meta/docs` and as MCP resource
- Safety callbacks use MCP `elicitation` primitive for structured input

---

### Wave 5: Multi-Agent Intelligence (3-4 weeks)
**Goal**: Enable autonomous multi-agent collaboration.
**Deployable value**: Agents coordinate, share state, delegate tasks, reach consensus.

| # | Feature | Priority | Effort |
|---|---------|----------|--------|
| 25 | SHARED-STATE — Shared State Protocol | P1 | L |
| 13 | MULTI-AGENT — Multi-Agent Coordination Protocol | P1 | L |
| 26 | AGENT-TOOL — Agent-as-Tool | P2 | M |
| 3 | AGENT-LOOP — Server-Side Agent Loops | P1 | L |

**Depends on**: Wave 0 (EVT-BUS), Wave 1 (TOK-BUDGET, CONF-SCORE), Wave 3 (DEP-REG, SANDBOX)

**Internal deliverables**:
- `src/infrastructure/SharedState.ts` — versioned, tenant-scoped cross-agent state
- `src/infrastructure/AgentCoordination.ts` — locking, conflict resolution, broadcast
- `src/infrastructure/AgentAsTool.ts` — agent capability exposure as tools
- `src/infrastructure/AgentLoop.ts` — internal multi-turn reasoning engine

**Wiring changes**:
- SharedState accessible via new MCP resource: `prism://agent/state/{key}`
- MULTI-AGENT coordination endpoints in orchestration routes
- AGENT-TOOL adds entries to tool registry at runtime (dynamic registration)
- AGENT-LOOP reuses `parallelAPICalls` from api-config.ts + adds iteration logic
- Circular call prevention: call-stack tracking in MiddlewarePipeline

---

## 5. WIRING CHECKLIST PER IMPROVEMENT

### Improvement 1: RESP-TIER — Response Streaming with Progressive Detail

| Category | Details |
|----------|---------|
| **New files** | `src/infrastructure/ResponseTiering.ts`, `src/middleware/responseTier.ts` |
| **Modified files** | `src/utils/dispatcherMiddleware.ts` (add tier-aware formatting), `src/utils/responseSlimmer.ts` (integrate with tiers), `src/index.ts` (register middleware) |
| **New types** | `ResponseTier` (0-3), `TieredResponse { tier: number; content: string; complete: boolean }` |
| **New registrations** | None (middleware, not a tool) |
| **Config changes** | `src/config/responseTiers.ts` — default tier per dispatcher category, budget-triggered tier reduction rules |
| **Test files** | `src/__tests__/response-tiering.test.ts` |

### Improvement 2: TOOL-FUSE — Tool Call Fusion Engine

| Category | Details |
|----------|---------|
| **New files** | `src/infrastructure/ToolFusion.ts`, `src/infrastructure/FusionPatternDetector.ts` |
| **Modified files** | `src/engines/EventBus.ts` (emit TOOL_CALL_COMPLETE events), `src/index.ts` (init fusion engine), `src/mcp/index.ts` (export fusion types) |
| **New types** | `FusionPattern { sourceA: string; sourceB: string; frequency: number; avgSavings: number }`, `FusedTool { name: string; steps: FusionStep[]; schema: ZodSchema }` |
| **New registrations** | Dynamically registered fused tools (e.g., `prism_fused_sf_safety`) |
| **Config changes** | `src/config/fusion.ts` — min frequency threshold, max fusion chain length, excluded tools |
| **Test files** | `src/__tests__/tool-fusion.test.ts` |

### Improvement 3: AGENT-LOOP — Server-Side Agent Loops

| Category | Details |
|----------|---------|
| **New files** | `src/infrastructure/AgentLoop.ts`, `src/infrastructure/AgentLoopConfig.ts` |
| **Modified files** | `src/config/api-config.ts` (add agent loop model config), `src/mcp/agentConfig.ts` (wire loop config), `src/tools/dispatchers/orchestrationDispatcher.ts` (add `agent_loop_execute` action) |
| **New types** | `AgentLoopConfig { maxIterations: number; confidenceThreshold: number; model: string; tools: string[] }`, `AgentLoopResult { iterations: number; finalConfidence: number; answer: string; tokenCost: number }` |
| **New registrations** | New action in orchestration dispatcher: `agent_loop_execute` |
| **Config changes** | `.env` — `AGENT_LOOP_ENABLED=true`, `AGENT_LOOP_MAX_ITER=10`, `AGENT_LOOP_MODEL=sonnet` |
| **Test files** | `src/__tests__/agent-loop.test.ts` |

### Improvement 4: MW-PIPE — Middleware Pipeline Architecture

| Category | Details |
|----------|---------|
| **New files** | `src/infrastructure/MiddlewarePipeline.ts`, `src/infrastructure/MiddlewareContext.ts`, `src/infrastructure/MiddlewareRegistry.ts` |
| **Modified files** | `src/index.ts` (replace proxiedTool with pipeline.wrap), `src/tools/autoHookWrapper.ts` (extract logic into middleware units), `src/tools/cadenceExecutor.ts` (becomes CadenceMiddleware) |
| **New types** | `Middleware`, `MiddlewareContext`, `MiddlewarePhase`, `MiddlewareRegistry` |
| **New registrations** | None (internal infrastructure) |
| **Config changes** | `src/config/middleware.ts` — middleware ordering, enable/disable flags per middleware |
| **Test files** | `src/__tests__/middleware-pipeline.test.ts`, `src/__tests__/middleware-ordering.test.ts` |

### Improvement 5: SEM-CACHE — Semantic Cache Layer

| Category | Details |
|----------|---------|
| **New files** | `src/infrastructure/SemanticCache.ts`, `src/middleware/semanticCache.ts` |
| **Modified files** | `src/infrastructure/MiddlewarePipeline.ts` (register cache middleware), `src/mcp/toolAnnotations.ts` (add `cacheableHint` annotation) |
| **New types** | `CacheEntry { key: string; embedding: Float32Array; result: unknown; createdAt: number; ttl: number; hitCount: number }`, `CacheConfig { similarityThreshold: number; ttlMs: number; maxEntries: number; excludeTools: string[] }` |
| **New registrations** | None (middleware) |
| **Config changes** | `src/config/semanticCache.ts` — thresholds, TTL, exclusion list (safety tools excluded) |
| **Test files** | `src/__tests__/semantic-cache.test.ts` |

### Improvement 6: DEP-REG — Dependency-Aware Tool Registry

| Category | Details |
|----------|---------|
| **New files** | `src/infrastructure/DependencyRegistry.ts` |
| **Modified files** | `src/utils/dispatcherMiddleware.ts` (add dependency metadata to registration), every dispatcher file (add `requires`/`produces`/`invalidates` metadata — incremental), `src/mcp/toolAnnotations.ts` (extend annotations) |
| **New types** | `ToolDependency { requires: string[]; produces: string[]; invalidates: string[] }`, `DependencyGraph { nodes: Map<string, ToolDependency>; resolve(targets: string[]): string[] }` |
| **New registrations** | New action in dev dispatcher: `dep_graph_view`, `dep_graph_validate` |
| **Config changes** | None (metadata on existing registrations) |
| **Test files** | `src/__tests__/dependency-registry.test.ts` |

### Improvement 7: TOK-BUDGET — Token Budget Manager

| Category | Details |
|----------|---------|
| **New files** | `src/infrastructure/TokenBudget.ts`, `src/middleware/tokenBudget.ts` |
| **Modified files** | `src/mcp/index.ts` (export budget types), `src/tools/dispatchers/sessionDispatcher.ts` (add `session_budget_status` action), `src/config/compaction.ts` (budget-aware compaction triggers) |
| **New types** | `SessionBudget { totalBudget: number; consumed: number; remaining: number; autoCompress: boolean; reserve: number; exemptTools: Set<string> }` |
| **New registrations** | New action in session dispatcher: `session_budget_status`, `session_budget_set` |
| **Config changes** | `.env` — `DEFAULT_TOKEN_BUDGET=100000`, `TOKEN_RESERVE=5000` |
| **Test files** | `src/__tests__/token-budget.test.ts` |

### Improvement 8: EVT-BUS — Event Bus Upgrade

| Category | Details |
|----------|---------|
| **New files** | `src/infrastructure/EventSchemas.ts`, `src/infrastructure/EventPersistence.ts` |
| **Modified files** | `src/engines/EventBus.ts` (add persistence, cross-process relay, backpressure, typed schemas), `src/mcp/resources.ts` (add event stream resource) |
| **New types** | `TypedEvent<T extends EventSchema>`, `EventPersistenceConfig`, `BackpressurePolicy` |
| **New registrations** | New MCP resource: `prism://events/stream` |
| **Config changes** | `src/config/eventBus.ts` — persistence path, max buffer, backpressure thresholds |
| **Test files** | `src/__tests__/event-bus-upgrade.test.ts` |

### Improvement 9: SANDBOX — Sandboxed Execution Environments

| Category | Details |
|----------|---------|
| **New files** | `src/infrastructure/Sandbox.ts`, `src/middleware/sandbox.ts` |
| **Modified files** | `src/mcp/toolAnnotations.ts` (add sandbox config per tool), `src/infrastructure/MiddlewarePipeline.ts` (register sandbox middleware) |
| **New types** | `SandboxConfig { timeout: number; memoryLimit: string; filesystem: "readonly" | "scoped"; network: "none" | "allowlist"; allowedPaths?: string[] }` |
| **New registrations** | None (middleware) |
| **Config changes** | `src/config/sandbox.ts` — default limits per safety class, allowlisted paths |
| **Test files** | `src/__tests__/sandbox.test.ts` |

### Improvement 10: SCHEMA-VER — Schema Evolution and Versioning

| Category | Details |
|----------|---------|
| **New files** | `src/infrastructure/SchemaVersioning.ts` |
| **Modified files** | `src/utils/dispatcherMiddleware.ts` (add version negotiation), `src/schemas.ts` (add version metadata to schemas) |
| **New types** | `VersionedSchema { version: string; schema: ZodSchema; migrate?: (old: unknown) => unknown }`, `SchemaVersion { major: number; minor: number }` |
| **New registrations** | None (transparent to tools) |
| **Config changes** | None (version metadata embedded in schemas) |
| **Test files** | `src/__tests__/schema-versioning.test.ts` |

### Improvement 11: DAG-WF — DAG Workflow Engine

| Category | Details |
|----------|---------|
| **New files** | `src/infrastructure/DAGWorkflow.ts`, `src/infrastructure/WorkflowDefinitions.ts`, `src/tools/dispatchers/workflowDispatcher.ts`, `src/schemas/workflowActionSchemas.ts` |
| **Modified files** | `src/index.ts` (register workflow dispatcher), `src/engines/ToolCallPipelineEngine.ts` (deprecation notice, delegate to DAG) |
| **New types** | `DAGNode { id: string; tool: string; action: string; params: Record<string,unknown>; next: string[]; requires?: string[] }`, `DAGResult { nodes_completed: number; nodes_failed: number; outputs: Map<string, unknown> }` |
| **New registrations** | New dispatcher: `prism_workflow` with actions: `wf_define`, `wf_execute`, `wf_status`, `wf_list`, `wf_delete` |
| **Config changes** | `src/config/workflow.ts` — max DAG depth, max parallel branches, timeout |
| **Test files** | `src/__tests__/dag-workflow.test.ts` |

### Improvement 12: CIRCUIT — Circuit Breaker + Retry Intelligence

| Category | Details |
|----------|---------|
| **New files** | `src/infrastructure/CircuitBreaker.ts`, `src/middleware/circuitBreaker.ts` |
| **Modified files** | `src/infrastructure/MiddlewarePipeline.ts` (register CB middleware), `src/engines/TelemetryEngine.ts` (feed failure rates to CB) |
| **New types** | `CircuitState` (CLOSED/OPEN/HALF_OPEN), `CircuitConfig { failureThreshold: number; cooldownMs: number; halfOpenTestCount: number }`, `RetryConfig { strategy: "exponential"|"linear"; maxAttempts: number; retryableErrors: string[] }` |
| **New registrations** | New action in telemetry dispatcher: `circuit_status`, `circuit_reset` |
| **Config changes** | `src/config/circuitBreaker.ts` — per-tool thresholds, global defaults |
| **Test files** | `src/__tests__/circuit-breaker.test.ts` |

### Improvement 13: MULTI-AGENT — Multi-Agent Coordination Protocol

| Category | Details |
|----------|---------|
| **New files** | `src/infrastructure/AgentCoordination.ts`, `src/infrastructure/LockManager.ts`, `src/infrastructure/ConflictResolver.ts` |
| **Modified files** | `src/engines/SwarmGroupExecutor.ts` (use coordination protocol), `src/tools/dispatchers/orchestrationDispatcher.ts` (add coordination actions), `src/mcp/agentConfig.ts` (coordination config) |
| **New types** | `CoordinationConfig { locking: "optimistic"|"pessimistic"; conflictResolution: "last_write_wins"|"merge"|"reject"; sharedState: "session"|"global"; broadcast: boolean }` |
| **New registrations** | New actions in orchestration: `coord_acquire_lock`, `coord_release_lock`, `coord_broadcast`, `coord_consensus` |
| **Config changes** | `src/config/agentCoordination.ts` — lock timeout, consensus quorum size |
| **Test files** | `src/__tests__/agent-coordination.test.ts` |

### Improvement 14: SELF-DOC — Self-Documenting Tool Registry

| Category | Details |
|----------|---------|
| **New files** | `src/infrastructure/SelfDocRegistry.ts`, `src/routes/meta.ts` |
| **Modified files** | `src/routes/index.ts` (mount meta router), `src/mcp/resources.ts` (add meta resources) |
| **New types** | `ToolDocEntry { name: string; description: string; schema: unknown; annotations: ToolAnnotationConfig; usageCount: number; avgLatency: number; examples: Example[] }` |
| **New registrations** | New MCP resources: `prism://meta/docs`, `prism://meta/usage`, `prism://meta/graph`, `prism://meta/health` |
| **Config changes** | None |
| **Test files** | `src/__tests__/self-doc-registry.test.ts` |

### Improvement 15: ADAPT-SURF — Adaptive Tool Surfacing

| Category | Details |
|----------|---------|
| **New files** | `src/infrastructure/AdaptiveToolSurfacing.ts` |
| **Modified files** | `src/engines/ToolRouterEngine.ts` (integrate adaptive surfacing), `src/infrastructure/SemanticRouter.ts` (provide relevance scores), `src/mcp/index.ts` (export surfacing config) |
| **New types** | `SurfacingConfig { strategy: "contextual"|"frequency"|"manual"; maxToolsSurfaced: number; reEvaluateEvery: number }`, `SurfacedToolSet { tools: string[]; reason: string; confidence: number }` |
| **New registrations** | None (internal optimization; affects tools/list response) |
| **Config changes** | `src/config/toolSurfacing.ts` — max tools, strategy, re-evaluation frequency |
| **Test files** | `src/__tests__/adaptive-tool-surfacing.test.ts` |

### Improvement 16: TELEM-COST — Telemetry and Cost Attribution

| Category | Details |
|----------|---------|
| **New files** | `src/middleware/telemetry.ts` |
| **Modified files** | `src/engines/TelemetryEngine.ts` (add cost tracking, token counting), `src/infrastructure/MiddlewarePipeline.ts` (register telemetry middleware) |
| **New types** | `CostRecord { tool: string; latencyMs: number; tokensIn: number; tokensOut: number; apiCallsInternal: number; cacheHit: boolean; costUsd: number; sessionId: string; userId?: string }` |
| **New registrations** | New actions in telemetry dispatcher: `cost_report`, `cost_by_session`, `cost_by_tool` |
| **Config changes** | `src/config/costRates.ts` — per-model token costs, API call costs |
| **Test files** | `src/__tests__/telemetry-cost.test.ts` |

### Improvement 17: EMBED-INFRA — Embedding Infrastructure

| Category | Details |
|----------|---------|
| **New files** | `src/infrastructure/EmbeddingService.ts`, `src/infrastructure/VectorStore.ts`, `src/infrastructure/EmbeddingConfig.ts` |
| **Modified files** | `src/config/api-config.ts` (add Voyage-3 config), `src/index.ts` (init embedding service) |
| **New types** | `EmbeddingService`, `VectorStore`, `SimilarityResult { id: string; score: number; metadata: Record<string,unknown> }`, `EmbeddingConfig { provider: "voyage"|"local"; model: string; dimensions: number; batchSize: number }` |
| **New registrations** | None (internal infrastructure) |
| **Config changes** | `.env` — `EMBEDDING_PROVIDER=voyage`, `VOYAGE_API_KEY=...`, `EMBEDDING_MODEL=voyage-3` |
| **Test files** | `src/__tests__/embedding-service.test.ts`, `src/__tests__/vector-store.test.ts` |

### Improvement 18: SEM-ROUTE — Semantic Router

| Category | Details |
|----------|---------|
| **New files** | `src/infrastructure/SemanticRouter.ts` |
| **Modified files** | `src/engines/ToolRouterEngine.ts` (add semantic fallback chain), `src/infrastructure/EmbeddingService.ts` (pre-embed tool descriptions) |
| **New types** | `SemanticRoute { toolName: string; action: string; similarity: number; method: "semantic"|"keyword"|"default" }` |
| **New registrations** | None (replaces internal routing logic) |
| **Config changes** | `src/config/semanticRouter.ts` — similarity thresholds, fallback chain order |
| **Test files** | `src/__tests__/semantic-router.test.ts` |

### Improvement 19: SEM-RAG — Semantic RAG

| Category | Details |
|----------|---------|
| **New files** | `src/infrastructure/SemanticRAG.ts`, `src/infrastructure/KnowledgeIndexer.ts` |
| **Modified files** | `src/engines/TribalKnowledgeEngine.ts` (index tips into vector store), `src/engines/MachiningPlaybookEngine.ts` (index rules), `src/tools/dispatchers/knowledgeDispatcher.ts` (add `knowledge_semantic_search` action) |
| **New types** | `RAGContext { chunks: RAGChunk[]; totalRelevance: number }`, `RAGChunk { source: string; content: string; relevance: number; metadata: Record<string,unknown> }` |
| **New registrations** | New action: `knowledge_semantic_search` in knowledge dispatcher |
| **Config changes** | `src/config/rag.ts` — chunk size, max chunks, relevance threshold |
| **Test files** | `src/__tests__/semantic-rag.test.ts` |

### Improvement 20: SEM-MEM — Semantic Memory

| Category | Details |
|----------|---------|
| **New files** | `src/infrastructure/SemanticMemory.ts` |
| **Modified files** | `src/engines/MemoryGraphEngine.ts` (add embedding index to graph nodes), `src/tools/dispatchers/memoryDispatcher.ts` (add `memory_semantic_recall` action) |
| **New types** | `SemanticMemoryNode extends GraphNode { embedding: Float32Array; semanticLinks: string[] }` |
| **New registrations** | New action: `memory_semantic_recall` in memory dispatcher |
| **Config changes** | None (uses EMBED-INFRA config) |
| **Test files** | `src/__tests__/semantic-memory.test.ts` |

### Improvement 21: POLICY-TYPE — PolicyEvaluation Type System

| Category | Details |
|----------|---------|
| **New files** | `src/infrastructure/PolicyTypes.ts`, `src/infrastructure/PolicyEngine.ts` |
| **Modified files** | `src/types.ts` (export PolicyEvaluation), `src/mcp/authMiddleware.ts` (return PolicyEvaluation instead of boolean) |
| **New types** | `PolicyEvaluation { policyId: string; decision: string; confidence: ConfidenceScore; evidence: PolicyEvidence[]; overrideBy?: string; auditRequired: boolean }` |
| **New registrations** | None (type system, not a tool) |
| **Config changes** | None |
| **Test files** | `src/__tests__/policy-types.test.ts` |

### Improvement 22: SAFETY-CB — Safety Callbacks

| Category | Details |
|----------|---------|
| **New files** | `src/infrastructure/SafetyCallbacks.ts`, `src/middleware/safetyCB.ts` |
| **Modified files** | `src/mcp/elicitation.ts` (add safety-specific elicitation schemas), `src/tools/dispatchers/safetyDispatcher.ts` (emit callbacks on Φ<0.70), `src/infrastructure/MiddlewarePipeline.ts` (register safety CB middleware) |
| **New types** | `SafetyCallback { id: string; severity: "warn"|"block"|"critical"; description: string; requiredApproval: "user"|"supervisor"|"automatic"; evidence: PolicyEvaluation; timeout: number }` |
| **New registrations** | New elicitation schema: `safety_review_request` |
| **Config changes** | `src/config/safetyCallbacks.ts` — Φ threshold, timeout, auto-approve rules |
| **Test files** | `src/__tests__/safety-callbacks.test.ts` |

### Improvement 23: ESCALATE — Escalation Protocol

| Category | Details |
|----------|---------|
| **New files** | `src/infrastructure/EscalationProtocol.ts` |
| **Modified files** | `src/engines/AlarmEscalationEngine.ts` (generalize beyond alarms), `src/infrastructure/SafetyCallbacks.ts` (escalation on timeout), `src/tools/dispatchers/safetyDispatcher.ts` (add `escalation_status` action) |
| **New types** | `EscalationTier { level: number; name: string; timeout: number; handler: string; notifyChannels: string[] }`, `EscalationChain { tiers: EscalationTier[]; currentTier: number; startedAt: string }` |
| **New registrations** | New actions in safety dispatcher: `escalation_status`, `escalation_acknowledge` |
| **Config changes** | `src/config/escalation.ts` — tier definitions, timeout values |
| **Test files** | `src/__tests__/escalation-protocol.test.ts` |

### Improvement 24: AUDIT-TRAIL — Structured Audit Trail

| Category | Details |
|----------|---------|
| **New files** | `src/infrastructure/AuditLog.ts`, `src/middleware/auditTrail.ts` |
| **Modified files** | `src/middleware/auditLog.ts` (extend to all transports, not just HTTP), `src/infrastructure/MiddlewarePipeline.ts` (register audit middleware), `src/mcp/resources.ts` (add audit resource) |
| **New types** | `AuditRecord { id: string; timestamp: string; actor: ActorRef; action: string; target: string; outcome: string; evidence: Record<string,unknown>; policyEval?: PolicyEvaluation; parentId?: string }` |
| **New registrations** | New MCP resource: `prism://audit/log?from={ts}&to={ts}`, New action in admin dispatcher: `audit_query`, `audit_export` |
| **Config changes** | `src/config/auditTrail.ts` — retention period, storage path, max size |
| **Test files** | `src/__tests__/audit-trail.test.ts` |

### Improvement 25: SHARED-STATE — Shared State Protocol

| Category | Details |
|----------|---------|
| **New files** | `src/infrastructure/SharedState.ts`, `src/infrastructure/StateVersioning.ts` |
| **Modified files** | `src/engines/MultiTenantEngine.ts` (tenant-scoped state), `src/tools/dispatchers/sessionDispatcher.ts` (add state actions), `src/mcp/resources.ts` (add state resource) |
| **New types** | `SharedStateEntry { key: string; value: unknown; version: number; updatedBy: string; updatedAt: string; tenantId: string }`, `StateConflict { key: string; localVersion: number; remoteVersion: number; resolution: "overwrite"|"merge"|"reject" }` |
| **New registrations** | New MCP resource: `prism://agent/state/{key}`, New actions in session: `state_get`, `state_set`, `state_delete`, `state_list` |
| **Config changes** | `src/config/sharedState.ts` — conflict resolution strategy, max state size |
| **Test files** | `src/__tests__/shared-state.test.ts` |

### Improvement 26: AGENT-TOOL — Agent-as-Tool

| Category | Details |
|----------|---------|
| **New files** | `src/infrastructure/AgentAsTool.ts`, `src/infrastructure/AgentToolRegistry.ts` |
| **Modified files** | `src/mcp/agentConfig.ts` (define which agents are exposable), `src/index.ts` (dynamic tool registration for agents), `src/infrastructure/MiddlewarePipeline.ts` (circular call detection) |
| **New types** | `AgentToolConfig { agentId: string; exposedAs: string; description: string; inputSchema: ZodSchema; maxDepth: number; excludeCallers: string[] }` |
| **New registrations** | Dynamic tools: e.g., `prism_agent_feasibility_checker`, `prism_agent_speed_feed_expert` (registered at startup from agentConfig) |
| **Config changes** | `src/config/agentTools.ts` — which agents to expose, max call depth, timeout |
| **Test files** | `src/__tests__/agent-as-tool.test.ts` |

### Improvement 27: CONF-SCORE — Confidence Scoring Framework

| Category | Details |
|----------|---------|
| **New files** | `src/infrastructure/ConfidenceScoring.ts`, `src/infrastructure/ConfidenceAggregator.ts` |
| **Modified files** | `src/types.ts` (add ConfidenceScore to base result types), `src/tools/dispatchers/calcDispatcher.ts` (attach confidence to all calc results), `src/tools/dispatchers/safetyDispatcher.ts` (map Φ/Λ to ConfidenceScore) |
| **New types** | `ConfidenceScore { value: number; method: string; evidence: string[]; uncertainty: number; threshold: number }`, `ConfidenceAggregation { scores: ConfidenceScore[]; aggregate: number; strategy: "min"|"mean"|"weighted" }` |
| **New registrations** | None (attached to existing results) |
| **Config changes** | `src/config/confidence.ts` — default thresholds per domain, aggregation strategies |
| **Test files** | `src/__tests__/confidence-scoring.test.ts` |

---

## 6. SUMMARY STATISTICS

| Metric | Count |
|--------|-------|
| **Total new files** | ~52 |
| **Total modified files** | ~45 unique (many modified by multiple features) |
| **New types/interfaces** | ~65 |
| **New MCP resources** | 8 |
| **New dispatcher actions** | ~22 |
| **New dispatchers** | 1 (prism_workflow) |
| **New middleware units** | 8 |
| **New test files** | 27 |
| **New config files** | ~15 |
| **Waves** | 6 (0-5) |
| **Estimated total effort** | 14-19 weeks |

### Critical Path

```
Wave 0 (MW-PIPE + EVT-BUS + TELEM + AUDIT)
  → Wave 1 (RESP-TIER + TOK-BUDGET + CONF-SCORE + POLICY-TYPE)
    → Wave 2 (EMBED-INFRA → SEM-CACHE + SEM-ROUTE + ADAPT-SURF + SEM-RAG + SEM-MEM)
      → Wave 5 (SHARED-STATE + MULTI-AGENT + AGENT-TOOL + AGENT-LOOP)

Parallel track (after Wave 0):
  Wave 3 (CIRCUIT + DEP-REG + DAG-WF + TOOL-FUSE + SANDBOX + SCHEMA-VER)
  Wave 4 (SAFETY-CB + ESCALATE + SELF-DOC)
```

Waves 3 and 4 can run in parallel with Wave 2. Wave 5 depends on Waves 0-3.

### Most-Modified Files (change hotspots)

| File | Modified by features |
|------|---------------------|
| `src/index.ts` | 4, 8, 11, 17, 26 |
| `src/infrastructure/MiddlewarePipeline.ts` | 1, 5, 9, 12, 16, 22, 24 |
| `src/mcp/toolAnnotations.ts` | 5, 6, 9 |
| `src/mcp/resources.ts` | 8, 14, 24, 25 |
| `src/mcp/index.ts` | 2, 7, 15 |
| `src/engines/TelemetryEngine.ts` | 12, 16 |
| `src/engines/EventBus.ts` | 2, 8 |
| `src/tools/dispatchers/safetyDispatcher.ts` | 22, 23, 27 |
| `src/tools/dispatchers/sessionDispatcher.ts` | 7, 25 |
| `src/tools/dispatchers/orchestrationDispatcher.ts` | 3, 13 |

---

## 7. EXISTING PRISM ASSETS TO LEVERAGE

| Existing Asset | Relevant To | Leverage Strategy |
|----------------|-------------|-------------------|
| `EventBus.ts` (750+ lines) | EVT-BUS (8) | Upgrade in place, add persistence + typed schemas |
| `TelemetryEngine.ts` (500+ lines) | TELEM-COST (16) | Extend with cost tracking, not replace |
| `ToolRouterEngine.ts` (200+ lines) | SEM-ROUTE (18) | Add semantic layer, keep keyword as fallback |
| `ToolCallPipelineEngine.ts` (200+ lines) | DAG-WF (11) | Subsume into DAG as single-path case |
| `BatchQueryEngine.ts` (200+ lines) | TOOL-FUSE (2) | BatchQuery handles explicit batches; Fusion handles implicit patterns |
| `BatchProcessor.ts` (200+ lines) | MW-PIPE (4) | Batch priority system becomes a middleware unit |
| `SmartPrefetchEngine.ts` (200+ lines) | ADAPT-SURF (15) | Co-access patterns inform adaptive surfacing |
| `autoHookWrapper.ts` (1800+ lines) | MW-PIPE (4) | Extract into composable middleware units |
| `MemoryGraphEngine.ts` (500+ lines) | SEM-MEM (20) | Add embedding index to existing graph |
| `AlarmEscalationEngine.ts` (200+ lines) | ESCALATE (23) | Generalize beyond alarm-specific escalation |
| `auth.ts` + `authMiddleware.ts` | POLICY-TYPE (21) | Extend auth results with PolicyEvaluation |
| `auditLog.ts` middleware | AUDIT-TRAIL (24) | Extend from HTTP-only to all transports |
| `ComplianceEngine.ts` | POLICY-TYPE (21) | Compliance rules become policy evaluations |
| `CertificateEngine.ts` | AUDIT-TRAIL (24) | Certificate proofs feed into audit records |
| `PFPEngine.ts` | CONF-SCORE (27) | PFP predictions include confidence scores |
| `responseSlimmer.ts` | RESP-TIER (1) | Slimming becomes tier-0/tier-1 logic |
| `cadenceExecutor.ts` | MW-PIPE (4) | Cadence functions become scheduled middleware |
| `dispatcherMiddleware.ts` | MW-PIPE (4), DEP-REG (6) | Merge into new pipeline infrastructure |
| `sampling.ts` | AGENT-LOOP (3) | Sampling is server→client; AgentLoop is server-internal |
| `config/effortTiers.ts` | TOK-BUDGET (7) | Effort tiers inform budget allocation |
