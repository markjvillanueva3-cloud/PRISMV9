// add_generalized_ideas.js — Insert 8 generalized MCP innovations into PRISM roadmap
const fs = require('fs');
const filePath = 'C:\\PRISM\\mcp-server\\data\\docs\\roadmap\\PRISM_ROADMAP_v18.1.md';
let content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

function findLine(pattern, afterLine = 0) {
  for (let i = afterLine; i < lines.length; i++) {
    if (lines[i].includes(pattern)) return i;
  }
  return -1;
}

const insertions = [];

// ═══════════════════════════════════════════════
// R4: Token Budget Manager + Schema Evolution + Dependency-Aware Registry + Middleware Formalization
// Insert before R4's Build Gate (MS4)
// ═══════════════════════════════════════════════
const r4Section = findLine('## 10. R4');
const r4ms4 = findLine('### MS4:', r4Section);
// But we already inserted MS3.5 (DB Integrity). Find the NEXT MS4 after that.
// Search for "### MS4:" after the R4 section start
let r4BuildGate = -1;
for (let i = r4Section; i < lines.length; i++) {
  if (lines[i].includes('### MS4:') && i > r4Section + 20) { r4BuildGate = i; break; }
}

if (r4BuildGate > -1) {
  insertions.push({
    line: r4BuildGate,
    text: `### MS3.7: Generalized MCP Server Infrastructure
**Target: Production-grade MCP server patterns — token management, schema versioning, middleware formalization**

#### MS3.7-T1: Token Budget Manager
\`\`\`
TASK: MS3.7-T1
  DEPENDS_ON: [MS2-T1]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: STANDARD
  GATE: GATED | ESTIMATED_CALLS: 15
  LAYER: 6
  READS_FROM: [src/engines/SessionLifecycleEngine.ts, src/shared/response-level.ts]
  WRITES_TO: [src/engines/TokenBudgetEngine.ts (NEW)]
  PROVIDES: [Automatic response compression when budget depletes → longer productive sessions]
  SKILL_LOAD: [prism-token-budget, prism-token-density, prism-context-pressure]
\`\`\`
**Step-by-step:**
1. Create TokenBudgetEngine.ts — tracks cumulative token cost across all responses in session
2. Interface: { total_budget, consumed, remaining, auto_compress, reserve }
3. As budget depletes past thresholds: auto-shift response_level (full→summary→pointer)
4. Reserve tokens for final summary/checkpoint (configurable, default 5K)
5. Wire into every dispatcher via middleware — transparent to action implementations
6. Expose via \`prism_session→token_budget\` for client-side awareness
**BASH:** \`npm run build:fast && npm run test:critical\`

#### MS3.7-T2: Schema Evolution & Versioning
\`\`\`
TASK: MS3.7-T2
  DEPENDS_ON: [MS3.7-T1]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: STANDARD
  GATE: YOLO | ESTIMATED_CALLS: 12
  LAYER: 6
  READS_FROM: [src/tools/dispatchers/*.ts]
  WRITES_TO: [src/shared/schema-version.ts (NEW), src/tools/dispatchers/*.ts (enhanced)]
  PROVIDES: [Non-breaking API evolution → old clients keep working when schemas change]
  SKILL_LOAD: [prism-api-contracts, prism-api-lifecycle, prism-design-patterns]
\`\`\`
**Step-by-step:**
1. Create schema-version.ts — version declaration + migration framework
2. Each action declares schema version (e.g., "2.0") with migrate functions from older versions
3. Server auto-detects client version from request, applies migration transparently
4. Old MCP clients (Claude.ai chat) get v1 responses, Claude Code gets v2 with response_level
5. Migration registry: { from: "1.0", to: "2.0", transform: (old) => newFormat }
6. Add version header to all dispatcher responses
**BASH:** \`npm run build:fast && npm run test:critical\`

#### MS3.7-T3: Dependency-Aware Tool Registry
\`\`\`
TASK: MS3.7-T3
  DEPENDS_ON: [MS3.7-T2]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: STANDARD
  GATE: GATED | ESTIMATED_CALLS: 15
  LAYER: 6
  READS_FROM: [src/tools/dispatchers/*.ts, src/engines/*.ts]
  WRITES_TO: [src/shared/tool-dependency-graph.ts (NEW)]
  PROVIDES: [Auto-resolved execution order, parallel independent tools, invalidation cascades]
  SKILL_LOAD: [prism-design-patterns, prism-orchestration, prism-data-pipeline]
\`\`\`
**Step-by-step:**
1. Create tool-dependency-graph.ts — typed dependency declarations per action
2. Each action declares: requires (must run first), produces (output type), invalidates (cache bust)
3. Server auto-resolves execution order for compound actions
4. Parallelizes independent tools in pipelines (e.g., material_get || tool_get before calc)
5. Manages invalidation cascades — when calibration changes, bust downstream caches
6. Expose graph via \`prism_knowledge→tool_dependencies\` for introspection
**BASH:** \`npm run build:fast && npm run test:critical\`

#### MS3.7-T4: Composable Middleware Pipeline
\`\`\`
TASK: MS3.7-T4
  DEPENDS_ON: [MS3.7-T3]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: STANDARD
  GATE: GATED | ESTIMATED_CALLS: 15
  LAYER: 6
  READS_FROM: [src/engines/HookEngine.ts]
  WRITES_TO: [src/shared/middleware-pipeline.ts (NEW), src/engines/HookEngine.ts (enhanced)]
  PROVIDES: [Pluggable request/response pipeline → auth, rate limit, cache, validate, transform, log]
  SKILL_LOAD: [prism-hook-architecture, prism-design-patterns, prism-async-patterns]
\`\`\`
**Step-by-step:**
1. Create middleware-pipeline.ts — composable middleware chain for all tool calls
2. Pipeline: request → auth → rate_limit → cache_check → validate → execute → transform → cache_write → respond
3. Each middleware is a pure function: (request, next) => response
4. Middleware is pluggable — add telemetry, cost tracking, A/B testing without touching tools
5. Formalize existing HookEngine pre/post hooks as middleware stages
6. Wire as the universal dispatcher entry point (all 31 dispatchers go through pipeline)
**BASH:** \`npm run build:fast && npm run test:critical\`

`
  });
}

// ═══════════════════════════════════════════════
// R6: Circuit Breaker + Retry Intelligence
// Insert before R6's Build Gate
// ═══════════════════════════════════════════════
const r6Section = findLine('## 12. R6');
let r6BuildGate = -1;
for (let i = r6Section; i < lines.length; i++) {
  // Find the last MS before the next ## section
  if (lines[i].includes('### MS4:') && i > r6Section + 20) { r6BuildGate = i; break; }
}

if (r6BuildGate > -1) {
  insertions.push({
    line: r6BuildGate,
    text: `### MS3.7: Production Resilience Patterns
**Target: Circuit breaker, smart retry, fault tolerance for production MCP server**

#### MS3.7-T1: Circuit Breaker + Retry Intelligence
\`\`\`
TASK: MS3.7-T1
  DEPENDS_ON: [MS2-T2]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: STANDARD
  GATE: GATED | ESTIMATED_CALLS: 15
  LAYER: 8
  READS_FROM: [src/engines/TelemetryEngine.ts, src/shared/middleware-pipeline.ts]
  WRITES_TO: [src/shared/circuit-breaker.ts (NEW)]
  PROVIDES: [Per-tool resilience → graceful degradation under failure, auto-recovery]
  SKILL_LOAD: [prism-error-recovery, prism-error-handling-patterns, prism-high-reliability]
\`\`\`
**Step-by-step:**
1. Create circuit-breaker.ts — per-tool circuit breaker with 3 states (CLOSED/OPEN/HALF_OPEN)
2. Track failure rates per action over sliding window (default: last 10 calls)
3. If failure_rate > 50%: OPEN circuit → return cached/fallback result
4. After cooldown (configurable): HALF_OPEN → test one call
5. If success: CLOSED → resume normal. If fail: back to OPEN
6. Smart retry: exponential backoff, max 3 attempts, retryable vs non-retryable error classification
7. Wire as middleware stage in the pipeline (from R4-MS3.7-T4)
8. Expose circuit state via \`prism_telemetry→circuit_status\`
**BASH:** \`npm run build:fast && npm run test:critical && npm run test:regression\`

`
  });
}

// ═══════════════════════════════════════════════
// R8: Adaptive Tool Surfacing + Self-Documenting Registry + Tool Call Fusion
// Insert before R8's Build Gate  
// ═══════════════════════════════════════════════
const r8Section = findLine('## 14. R8');
let r8BuildGate = -1;
for (let i = r8Section; i < lines.length; i++) {
  if (lines[i].includes('### MS4:') && i > r8Section + 20) { r8BuildGate = i; break; }
}

if (r8BuildGate > -1) {
  insertions.push({
    line: r8BuildGate,
    text: `### MS3.5: Intelligent Tool Management
**Target: Reduce tool overload, auto-optimize API surface, self-documenting registry**

#### MS3.5-T1: Adaptive Tool Surfacing
\`\`\`
TASK: MS3.5-T1
  DEPENDS_ON: [MS2-T2]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: STANDARD
  GATE: GATED | ESTIMATED_CALLS: 20
  LAYER: 10
  READS_FROM: [src/tools/dispatchers/*.ts, src/engines/TelemetryEngine.ts]
  WRITES_TO: [src/engines/ToolSurfacingEngine.ts (NEW)]
  PROVIDES: [Dynamic tool selection → LLM sees 15 focused tools instead of 368, massive token savings]
  SKILL_LOAD: [prism-query-intelligence, prism-intent-disambiguator, prism-design-patterns]
\`\`\`
**Step-by-step:**
1. Create ToolSurfacingEngine.ts — contextual tool filtering for MCP clients
2. Client sends conversation context summary with each request
3. Engine scores relevance of each action to current context (material? machine? safety?)
4. Surfaces only top N (default 15) most relevant tools to the LLM
5. Re-evaluates every 3 calls as conversation evolves
6. Massive system prompt savings — 368 actions × ~50 tokens each = 18K tokens normally
7. Expose via MCP tool listing protocol — transparent to client
**BASH:** \`npm run build:fast && npx tsx tests/r8/plugin-tests.ts\`

#### MS3.5-T2: Self-Documenting Tool Registry
\`\`\`
TASK: MS3.5-T2
  DEPENDS_ON: [MS3.5-T1]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: STANDARD
  GATE: YOLO | ESTIMATED_CALLS: 12
  LAYER: 10
  READS_FROM: [src/tools/dispatchers/*.ts, src/engines/TelemetryEngine.ts]
  WRITES_TO: [src/engines/RegistryDocsEngine.ts (NEW)]
  PROVIDES: [Auto-generated API docs, usage stats, dependency graphs → LLM self-discovery]
  SKILL_LOAD: [prism-knowledge-base, prism-design-patterns, prism-observability]
\`\`\`
**Step-by-step:**
1. Create RegistryDocsEngine.ts — generates documentation from tool schemas + telemetry
2. Actions: get_docs (full API reference), get_usage (most-called tools), get_graph (dependency viz), get_health (per-tool latency/errors)
3. LLM clients query this to discover capabilities without hardcoded system prompts
4. Auto-updates when tools change — no manual doc maintenance
5. Include example calls from telemetry (most common successful invocations)
6. Wire as \`prism_knowledge→registry_docs\`
**BASH:** \`npm run build:fast && npx tsx tests/r8/plugin-tests.ts\`

#### MS3.5-T3: Tool Call Fusion Engine
\`\`\`
TASK: MS3.5-T3
  DEPENDS_ON: [MS3.5-T2, R4-MS3.7-T3]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: STANDARD
  GATE: GATED | ESTIMATED_CALLS: 20
  LAYER: 10
  READS_FROM: [src/engines/TelemetryEngine.ts, src/shared/tool-dependency-graph.ts]
  WRITES_TO: [src/engines/ToolFusionEngine.ts (NEW)]
  PROVIDES: [Self-optimizing API surface → auto-fuses sequential patterns into compound endpoints]
  SKILL_LOAD: [prism-design-patterns, prism-orchestration, prism-performance-patterns]
\`\`\`
**Step-by-step:**
1. Create ToolFusionEngine.ts — detects sequential call patterns from telemetry
2. When A→B pattern occurs N+ times (threshold: 5): auto-generate fused endpoint A_B
3. Register fused tool with MCP client dynamically
4. Fused tool runs both internally, returns single combined result
5. Example: material_get→speed_feed_calc pattern → auto-fuse into material_speed_feed
6. Validation: fused results must match sequential results exactly (regression test)
7. Admin: \`prism_telemetry→fusion_candidates\` shows potential fusions with stats
**BASH:** \`npm run build:fast && npx tsx tests/r8/plugin-tests.ts\`

`
  });
}

// ═══════════════════════════════════════════════
// R3 or R4: Enhance HookEngine with formal Pub/Sub + Progressive Streaming
// Add to R3 MS4.5 area (already has server-side intelligence)
// ═══════════════════════════════════════════════
const r3ms45 = findLine('Server-Side Intelligence Patterns');
if (r3ms45 > -1) {
  // Find end of MS4.5-T2 BASH line
  let insertAfter = -1;
  for (let i = r3ms45; i < r3ms45 + 60; i++) {
    if (lines[i] && lines[i].includes('BASH:') && lines[i].includes('intelligence-tests')) {
      insertAfter = i + 1;
      break;
    }
  }
  if (insertAfter > -1) {
    insertions.push({
      line: insertAfter,
      text: `
#### MS4.5-T3: Event Bus / Pub-Sub Formalization
\`\`\`
TASK: MS4.5-T3
  DEPENDS_ON: [MS4.5-T2]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: STANDARD
  GATE: YOLO | ESTIMATED_CALLS: 12
  LAYER: 4
  READS_FROM: [src/engines/HookEngine.ts]
  WRITES_TO: [src/engines/HookEngine.ts (enhanced with pub/sub)]
  PROVIDES: [Reactive tool chains without client orchestration → tools auto-trigger on events]
  SKILL_LOAD: [prism-hook-architecture, prism-hook-system, prism-async-patterns]
\`\`\`
**Step-by-step:**
1. Extend HookEngine with formal pub/sub protocol (beyond current emit/fire)
2. Tools publish typed events: { event: "data_updated", source: "material_merge", payload: {...} }
3. Other tools subscribe with filters: { event: "data_updated", filter: { source: "material_*" } }
4. Reactive chains: data_updated → auto-validate → bust-cache → audit-log (zero client coordination)
5. Event persistence: last N events stored for replay on reconnect
6. Wire into middleware pipeline for automatic event emission on tool completion
**BASH:** \`npm run build:fast && npx tsx tests/r3/intelligence-tests.ts\`

#### MS4.5-T4: Progressive Response Streaming
\`\`\`
TASK: MS4.5-T4
  DEPENDS_ON: [MS4.5-T2]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: STANDARD
  GATE: YOLO | ESTIMATED_CALLS: 10
  LAYER: 4
  READS_FROM: [src/shared/response-level.ts]
  WRITES_TO: [src/shared/progressive-response.ts (NEW)]
  PROVIDES: [Streaming tiered responses → client aborts early when it has enough context]
  SKILL_LOAD: [prism-design-patterns, prism-async-patterns, prism-token-density]
\`\`\`
**Step-by-step:**
1. Create progressive-response.ts — streams response in layers (L0→L3)
2. L0: status code (1 token), L1: verdict + key metric (10-20 tokens),
   L2: summary with reasoning (50-100 tokens), L3: full payload
3. Client sets max_level per call. Server stops at that tier.
4. Each level is self-contained (not truncation — deliberate escalation)
5. Enhances response-level.ts with streaming capability for long computations
6. Particularly valuable for batch operations that take >5s
**BASH:** \`npm run build:fast && npx tsx tests/r3/intelligence-tests.ts\`
`
    });
  }
}

// Apply insertions in reverse order
insertions.sort((a, b) => b.line - a.line);

for (const ins of insertions) {
  const newLines = ins.text.split('\n');
  lines.splice(ins.line, 0, ...newLines);
  console.log(`Inserted ${newLines.length} lines at L${ins.line}`);
}

fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log(`\nTotal: ${insertions.length} blocks inserted`);
console.log('New line count:', lines.length);
