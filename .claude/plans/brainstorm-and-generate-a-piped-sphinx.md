# PRISM Local LLM Integration Plan
## Hybrid: Qwen Local + DeepSeek V4 API for Token Savings & Intelligence

**Created:** 2026-04-26  
**Updated:** 2026-04-26 (added DeepSeek V4 hybrid backend)
**Goal:** Hybrid local/API inference for token savings, context retention, ML self-improvement, and robust rule enforcement

### Backend Strategy
| Backend | Use Case | Cost | Context |
|---------|----------|------|---------|
| **Qwen2.5-coder:7b (local)** | Quick tasks, validation, embeddings | $0 | 32K |
| **DeepSeek V4 Flash (API)** | Complex reasoning, long context | Free* | 1M |
| **DeepSeek V4 Pro (API)** | Mission-critical, max quality | $0.07/M* | 1M |

*DeepSeek API is free tier available; Pro 75% off until May 5, 2026

---

## Executive Summary

### Current State (from exploration)
- **23 advisory hooks disabled** (`DISABLED_TOKEN_REDUX_2026_04_23`) - they worked but were noisy
- **Existing Ollama hooks exist but disabled:**
  - `ollama-task-offloader.mjs` - classifies prompts, suggests offloading (80-95% savings)
  - `local-compute-intent.mjs` - auto-starts Docker/Ollama stack
  - `prompt-rewriter-ollama.mjs` - executes rewrites locally
- **RTK is Bash-only** - compresses shell output (git, npm, vitest, etc.), NOT Read/Write/Grep/Glob
- **Learning infrastructure exists:** `error-pattern-memory.mjs`, CAMFeatureLearning, CADTrialErrorLearning engines
- **AgentDB + HNSW** for semantic search already built

### RTK Scope Answer
**RTK only works for Bash commands.** Read/Write/Grep/Glob are Claude's native tools with internal optimization - they don't produce shell output that RTK can compress. RTK wraps: git, gh, npm, npx, vitest, cargo, docker, kubectl, etc.

---

## Architecture: Hybrid Local + API

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLAUDE CODE SESSION                          │
├─────────────────────────────────────────────────────────────────┤
│  [1] prism_local dispatcher                                      │
│      ├── action: classify_task → Route to best backend          │
│      ├── action: execute_local → Run on Qwen (Ollama)           │
│      ├── action: execute_deepseek → Run on DeepSeek V4 API      │
│      ├── action: embed_local → Generate embeddings (nomic)      │
│      ├── action: enforce_rules → Validate CLAUDE.md compliance  │
│      └── action: learn_outcome → Record success/failure pattern │
├─────────────────────────────────────────────────────────────────┤
│  [2] LOCAL: Ollama Docker (qwen2.5-coder:7b + nomic-embed)      │
│      ├── /api/generate → Fast local inference (32K context)     │
│      ├── /api/embeddings → Local embeddings (free, fast)        │
│      └── Best for: validation, short tasks, embeddings          │
├─────────────────────────────────────────────────────────────────┤
│  [3] API: DeepSeek V4 (Flash or Pro)                            │
│      ├── POST api.deepseek.com/v1/chat/completions              │
│      ├── 1M token context, thinking mode support                │
│      └── Best for: complex reasoning, long context, agentic     │
├─────────────────────────────────────────────────────────────────┤
│  [4] Learning Memory Store                                       │
│      ├── error-memory.json → Error→fix patterns                 │
│      ├── sona-trajectories.jsonl → Outcome sequences            │
│      ├── rule-violations.json → CLAUDE.md enforcement patterns  │
│      └── routing-decisions.json → Backend selection history     │
└─────────────────────────────────────────────────────────────────┘
```

### Routing Logic
```typescript
function selectBackend(task: Task): "qwen" | "deepseek-flash" | "deepseek-pro" {
  // Use DeepSeek for long context (>30K tokens)
  if (task.contextLength > 30_000) return "deepseek-flash";
  
  // Use DeepSeek Pro for mission-critical reasoning
  if (task.tags.includes("critical") || task.tags.includes("agentic")) 
    return "deepseek-pro";
  
  // Use DeepSeek for complex multi-step reasoning
  if (task.complexity === "high" && task.requiresThinking) 
    return "deepseek-flash";
  
  // Default: Qwen local (free, fast)
  return "qwen";
}
```

---

## Phase 1: Foundation (Token Savings Now)

### 1.1 Re-enable Ollama Hooks with Improvements
**Files:** `.claude/hooks/{ollama-task-offloader,local-compute-intent,prompt-rewriter-ollama}.mjs`

**Changes:**
- Remove `DISABLED_TOKEN_REDUX` short-circuit
- Add rate limiting: max 1 suggestion per 5 minutes (not every prompt)
- Add confidence threshold: only suggest when >80% confident
- Silent mode: log to file, don't inject into context unless high-value

**Token Impact:** Re-enables 80-95% savings for offloadable tasks without noise

### 1.2 Create `prism_local` Dispatcher
**File:** `mcp-server/src/tools/dispatchers/localDispatcher.ts`

```typescript
// Actions:
classify_task       // Route task to optimal backend (qwen/deepseek-flash/deepseek-pro)
execute_local       // Run inference on Ollama (Qwen)
execute_deepseek    // Run inference on DeepSeek V4 API
embed_local         // Generate embeddings (nomic-embed-text)
check_backends      // Health check all backends, model list
offload_stats       // Token savings statistics by backend
backend_config      // Get/set backend preferences and API keys
```

**Token Impact:** Direct MCP tool calls replace hook injection overhead

### 1.2B DeepSeek API Configuration
**File:** `mcp-server/data/config/deepseek-config.json`

```json
{
  "api_key": "${DEEPSEEK_API_KEY}",
  "base_url": "https://api.deepseek.com/v1",
  "models": {
    "flash": "deepseek-v4-flash",
    "pro": "deepseek-v4-pro"
  },
  "defaults": {
    "model": "flash",
    "temperature": 0.3,
    "max_tokens": 4096,
    "thinking_mode": false
  },
  "routing_thresholds": {
    "context_upgrade_tokens": 30000,
    "complexity_upgrade": ["agentic", "multi-step", "critical"]
  }
}
```

**Environment:** Set `DEEPSEEK_API_KEY` in `.env` or system environment. Free tier available at [api.deepseek.com](https://api.deepseek.com).

### 1.3 Docker Compose Enhancement
**File:** `docker-compose.yml`

```yaml
services:
  ollama:
    image: ollama/ollama:latest
    volumes:
      - ollama_data:/root/.ollama
    environment:
      - OLLAMA_NUM_PARALLEL=2
      - OLLAMA_MAX_LOADED_MODELS=2
    deploy:
      resources:
        reservations:
          devices:
            - capabilities: [gpu]
  
  # Pre-pull models on start
  ollama-setup:
    image: ollama/ollama:latest
    depends_on: [ollama]
    command: |
      ollama pull qwen2.5-coder:7b
      ollama pull nomic-embed-text
```

---

## Phase 2: Replace Problematic Hooks with LLM Tool Calls

### 2.1 Hook → Tool Call Migration

| Disabled Hook | Replacement | How |
|---------------|-------------|-----|
| `reference-value-injector` | `prism_local.inject_reference` | Qwen looks up values from constants.ts |
| `ai-feature-recommend` | `prism_local.recommend_feature` | Qwen searches ENGINE_DIGEST.md |
| `naming-convention-enforcer` | `prism_local.check_naming` | Qwen validates PascalCase/camelCase |
| `complexity-gate` | `prism_local.check_complexity` | Qwen counts lines/nesting |
| `type-safety-checker` | `prism_local.check_types` | Qwen detects `any` spreading |
| `magic-number-detector` | `prism_local.check_magic` | Qwen finds unexplained numbers |

**Why Tool Calls > Hooks:**
- Hooks fire on EVERY tool use → constant token drain
- Tool calls are on-demand → only when needed
- Tool calls can be batched → one call checks multiple things
- No "persistent hook errors" → MCP has proper error handling

### 2.2 Unified Local Validation Tool
**New Action:** `prism_local.validate_code`

```typescript
// Single call replaces 6 hooks
const result = await prism_local.validate_code({
  code: editContent,
  checks: ['naming', 'complexity', 'types', 'magic', 'patterns', 'references']
});
// Returns: { passed: true, warnings: [], suggestions: [] }
```

**Token Impact:** 6 hooks firing × ~200 tokens each = 1200 tokens → 1 tool call ~300 tokens

---

## Phase 3: ML Self-Improvement System

### 3.1 Outcome Learning Loop

```
┌──────────────────────────────────────────────────────────────┐
│                    SONA Learning Loop                         │
├──────────────────────────────────────────────────────────────┤
│  [1] Task Start                                               │
│      └── prism_local.start_trajectory(task_description)      │
│                                                               │
│  [2] Actions (Claude works normally)                          │
│      └── Each Edit/Bash/Write logged to trajectory           │
│                                                               │
│  [3] Outcome                                                  │
│      ├── Success (tests pass, build works)                   │
│      │   └── prism_local.record_success(trajectory_id)       │
│      └── Failure (error, rollback)                           │
│          └── prism_local.record_failure(trajectory_id, error)│
│                                                               │
│  [4] Learning (runs on Ollama, not Claude)                   │
│      └── Qwen analyzes trajectory → extracts patterns        │
│      └── Patterns stored in AgentDB with embeddings          │
│                                                               │
│  [5] Future Tasks                                             │
│      └── Before action: search similar trajectories          │
│      └── If past failure found → warn/suggest alternative    │
└──────────────────────────────────────────────────────────────┘
```

### 3.2 Error Pattern Enhancement
**File:** `mcp-server/src/engines/LocalLearningEngine.ts`

```typescript
class LocalLearningEngine {
  // Run pattern extraction on Ollama (free)
  async extractPattern(error: string, fix: string): Promise<Pattern> {
    const response = await ollama.generate({
      model: 'qwen2.5-coder:7b',
      prompt: `Extract a reusable pattern from this error-fix pair:
        ERROR: ${error}
        FIX: ${fix}
        
        Output JSON: { pattern: string, trigger: string, prevention: string }`
    });
    return JSON.parse(response);
  }
  
  // Before writing code, check if similar patterns exist
  async checkSimilarErrors(code: string): Promise<Warning[]> {
    const embedding = await ollama.embeddings({ model: 'nomic-embed-text', prompt: code });
    const similar = await agentDB.searchPatterns(embedding, { minScore: 0.8 });
    return similar.map(p => ({ message: p.prevention, confidence: p.score }));
  }
}
```

### 3.3 CLAUDE.md Rule Enforcement via Qwen
**New Action:** `prism_local.enforce_rules`

```typescript
// Qwen validates against CLAUDE.md rules (NO Claude tokens)
async enforceRules(code: string): Promise<RuleViolation[]> {
  const rules = await readFile('CLAUDE.md'); // Cached locally
  const prompt = `Check this code against these rules. Return violations as JSON array.
    RULES: ${rules}
    CODE: ${code}`;
  
  const response = await ollama.generate({
    model: 'qwen2.5-coder:7b',
    prompt,
    format: 'json'
  });
  
  return JSON.parse(response.response);
}
```

**Rules enforced locally (free):**
- No TODO/FIXME comments
- No empty catch blocks  
- No `any` types
- No magic numbers
- PascalCase/camelCase naming
- Function length < 50 lines
- Nesting depth < 4

---

## Phase 4: Context Extension via Local Memory

### 4.1 Session Memory Bridge
**File:** `mcp-server/src/engines/LocalMemoryBridge.ts`

```typescript
class LocalMemoryBridge {
  private contextFile = 'data/state/local-context-32k.json';
  
  // Store context that would otherwise be lost on compaction
  async storeContext(key: string, content: string) {
    const embedding = await ollama.embeddings({ model: 'nomic-embed-text', prompt: content });
    await agentDB.store({ key, content, embedding, timestamp: Date.now() });
  }
  
  // Retrieve relevant context for current task
  async retrieveContext(query: string, limit = 5): Promise<Context[]> {
    const embedding = await ollama.embeddings({ model: 'nomic-embed-text', prompt: query });
    return agentDB.search(embedding, { limit, minScore: 0.7 });
  }
  
  // Qwen summarizes what's in memory (for injection at session start)
  async summarizeMemory(): Promise<string> {
    const recent = await agentDB.getRecent(20);
    const prompt = `Summarize these context entries into a concise session handoff (max 500 words):
      ${JSON.stringify(recent)}`;
    return ollama.generate({ model: 'qwen2.5-coder:7b', prompt });
  }
}
```

### 4.2 Pre-Compaction Memory Dump
**Hook Enhancement:** `precompact-handoff.mjs`

Before compaction, automatically:
1. Dump key decisions to local memory
2. Store current task context
3. Generate Qwen summary for next session
4. Store in per-agent handoff file

---

## Phase 5: Implementation Roadmap

### Sprint 1 (Days 1-3): Foundation
- [ ] Create `localDispatcher.ts` with basic actions
- [ ] Update `docker-compose.yml` with Ollama + Qwen
- [ ] Create `LocalInferenceEngine.ts` wrapper
- [ ] Wire dispatcher to MCP server

### Sprint 2 (Days 4-6): Hook Migration
- [ ] Create `LocalValidationEngine.ts` (replaces 6 hooks)
- [ ] Add `prism_local.validate_code` action
- [ ] Migrate `reference-value-injector` → tool call
- [ ] Migrate `naming-convention-enforcer` → tool call

### Sprint 3 (Days 7-9): Learning System
- [ ] Create `LocalLearningEngine.ts`
- [ ] Integrate with existing `error-pattern-memory.mjs`
- [ ] Add trajectory tracking actions
- [ ] Wire SONA-style outcome learning

### Sprint 4 (Days 10-12): Context Extension
- [ ] Create `LocalMemoryBridge.ts`
- [ ] Enhance `precompact-handoff.mjs`
- [ ] Add context retrieval to session start
- [ ] Test 32K context retention across compactions

### Sprint 5 (Days 13-14): Polish
- [ ] `/offload-stats` enhancement with detailed metrics
- [ ] `/local-health` skill for Docker/Ollama status
- [ ] Documentation and test coverage
- [ ] Performance benchmarks

---

## Token Savings Projection

| Source | Before | After (Hybrid) | Savings |
|--------|--------|----------------|---------|
| Advisory hook injection | ~1200 tokens/prompt | 0 (silent) | 100% |
| Code validation (6 hooks) | ~1200 tokens/edit | ~300 tokens (1 tool) | 75% |
| Reference lookups | ~400 tokens/lookup | 0 (Qwen local) | 100% |
| Explanations/summaries | ~2000 tokens | 0 (Qwen/DeepSeek) | 100% |
| Pattern search | ~500 tokens | 0 (local embeddings) | 100% |
| Complex reasoning | ~5000 tokens | 0 (DeepSeek API free) | 100% |
| Long context tasks | N/A (context overflow) | DeepSeek 1M ctx | ∞ |

**Estimated total savings:** 50-70% of current Claude token usage

### Backend Cost Breakdown
| Backend | Cost | Speed | Context | Best For |
|---------|------|-------|---------|----------|
| Qwen local | $0 | ~50 tok/s | 32K | Validation, quick tasks |
| DeepSeek Flash | Free* | ~80 tok/s | 1M | Complex reasoning |
| DeepSeek Pro | $0.07/M in* | ~40 tok/s | 1M | Mission-critical |

*Free tier / 75% promo until May 5, 2026

### Future: DeepSeek V4 Local Weights
When `deepseek-v4-flash` local weights land in Ollama (expected soon — MIT licensed), update config to prefer local over API for even more savings.

---

## Key Decisions

1. **Dispatcher over hooks** - MCP tool calls are cleaner than hook injection
2. **Hybrid backend strategy** - Qwen local for speed/cost, DeepSeek API for power
3. **Qwen2.5-coder:7b (local)** - Fast, free, 32K context for validation/quick tasks
4. **DeepSeek V4 Flash (API)** - Free tier, 1M context, complex reasoning fallback
5. **DeepSeek V4 Pro (API)** - Mission-critical tasks, best quality (75% off until May 5)
6. **nomic-embed-text** - Fast, high-quality local embeddings for semantic search
7. **AgentDB integration** - Reuse existing HNSW infrastructure
8. **Smart routing** - Auto-select backend based on context length + complexity
9. **Learn from all** - Claude + Qwen + DeepSeek outcomes feed pattern memory

---

## Files to Create/Modify

### New Files
- `mcp-server/src/tools/dispatchers/localDispatcher.ts`
- `mcp-server/src/engines/LocalInferenceEngine.ts` - Qwen via Ollama
- `mcp-server/src/engines/DeepSeekInferenceEngine.ts` - DeepSeek V4 API client
- `mcp-server/src/engines/LocalValidationEngine.ts`
- `mcp-server/src/engines/LocalLearningEngine.ts`
- `mcp-server/src/engines/LocalMemoryBridge.ts`
- `mcp-server/src/engines/BackendRouterEngine.ts` - Smart backend selection
- `mcp-server/data/config/deepseek-config.json` - API configuration
- `.claude/commands/local-health.md`
- `.claude/commands/deepseek-status.md`

### Modified Files
- `docker-compose.yml` - Add Ollama service
- `.claude/hooks/ollama-task-offloader.mjs` - Re-enable with hybrid routing
- `.claude/hooks/local-compute-intent.mjs` - Re-enable with improvements
- `.claude/hooks/precompact-handoff.mjs` - Add memory dump
- `mcp-server/src/tools/mcp-server.ts` - Register localDispatcher
- `.env.example` - Add DEEPSEEK_API_KEY placeholder

---

## Success Criteria

1. **Token savings measurable** - `/offload-stats` shows >50% Claude token reduction
2. **Zero hook errors** - No "persistent hook errors" from migrated hooks
3. **Hybrid routing works** - Tasks auto-route to optimal backend based on complexity
4. **DeepSeek integration** - API calls succeed, 1M context available for long tasks
5. **Learning works** - Pattern memory grows, suggestions improve over time
6. **Context survives** - Key decisions persist across compactions via 1M DeepSeek context
7. **Rules enforced** - CLAUDE.md violations caught before commit (Qwen local)
8. **Graceful fallback** - If DeepSeek API unavailable, fall back to Qwen local

## Migration Path (when V4 local weights land)

When `ollama pull deepseek-v4-flash` becomes available:
1. Update `deepseek-config.json`: set `local_available: true`
2. BackendRouterEngine auto-prefers local over API
3. API becomes fallback for rate limits / outages only
4. Expected timeline: days to weeks (MIT license, weights are public)
