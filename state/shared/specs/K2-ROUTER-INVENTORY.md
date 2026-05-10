# K2-ROUTER-INVENTORY — Existing AI Routing Surface

> **Unit:** K1 (U-K2-CONFIG-INVENTORY) of `K2-CLOUD-INTEGRATION-PLAN.md`
> **Purpose:** Document the as-built tier table + dispatch surface for `AISystemRouterEngine` and `OllamaHookBridgeEngine` so K2-K12 can extend without duplicating.
> **Author:** claude-85cedf09 · **Date:** 2026-05-10
> **Boris loop step:** 1/n (peer reviewer dispatch deferred until K1+K2+K3 all land — verification batch)

---

## §1 — AISystemRouterEngine (`mcp-server/src/engines/AISystemRouterEngine.ts`, 298 lines)

### 1.1 Backend union (`AIBackend` type)

| # | Backend ID | Tier | Cost | Probe method |
|---|---|---|---|---|
| 1 | `claude-opus` | premium | high | always reachable (in-process) |
| 2 | `claude-sonnet` | premium | medium | always reachable (in-process) |
| 3 | `claude-haiku` | premium | low | always reachable (in-process) |
| 4 | `ollama-codellama` | local | free | `curl -s -m 2 http://localhost:11434/api/tags` |
| 5 | `ollama-deepseek` | local | free | same |
| 6 | `docker-physics-agent` | docker | low | `docker ps` + `docker image inspect prism-physics-agent:latest` |
| 7 | `docker-batch-processor` | docker | low | `docker ps` + `docker image inspect prism-batch-processor:latest` |
| 8 | `local-mcp` | local | free | `existsSync("H:/prism/mcp-server/dist/index.js")` |

**Gap:** No mid-tier between `ollama-*` (free local) and `claude-*` (paid premium). K2.6:cloud slots in here.

### 1.2 Task class union (`TaskClass`, 9 entries)

| # | Class | Default primary | Default fallback | Cost | Notes |
|---|---|---|---|---|---|
| 1 | `physics_validation` | `docker-physics-agent` | `claude-opus`, `local-mcp` | low | Regex: `physics|kienzle|taylor|johnson[- ]cook|stress|deflection|chatter` |
| 2 | `engine_building` | `claude-opus` | `claude-sonnet` | high | Regex: `(build\|create\|new)\b.*\b(engine\|dispatcher\|hook)` |
| 3 | `ml_inference` | `ollama-codellama` | `ollama-deepseek`, `claude-haiku` | free | Regex: `ml\|neural\|inference\|predict\|classif` |
| 4 | `batch_processing` | `docker-batch-processor` | `local-mcp` | low | Regex: `batch\|>?\s*\d{3,}\s*(files?\|programs?\|parts?)\|bulk` |
| 5 | `reasoning` | `claude-opus` | `claude-sonnet` | high | Regex: `reason\|think\|plan\|design\|strategy\|why` |
| 6 | `code_review` | `claude-sonnet` | `claude-opus` | medium | Regex: `review\|audit\|critique\|check` |
| 7 | `search` | `local-mcp` | `claude-haiku` | free | Regex: `search\|find\|lookup\|grep\|locate` |
| 8 | `calculation` | `local-mcp` | `claude-haiku` | free | Regex: `calculate\|compute\|formula\|equation` |
| 9 | `unknown` | `claude-sonnet` | `claude-opus` | medium | Catch-all |

**Insertion targets for K2.6:cloud (per user-locked AGGRESSIVE posture):**
- Task classes 2 (engine_building), 5 (reasoning) currently default to `claude-opus` — these are the prime escalation candidates when context > 8K AND not safety-critical.
- K4 routing matrix override: `contextSize > 8KB ∧ ¬safetyCritical → kimi-k2.6:cloud` instead of `claude-opus` for these classes.
- Safety-critical (class 1 = `physics_validation`) routes through K4.5 two-pass chain — K2 generates, Claude scrutinizes.

### 1.3 Dispatcher surface

Dispatcher: `intelligenceDispatcher.ts` (presumed — verify with K2)
Routing function: `aiSystemRouterDispatch(action, params)` exported from same file.

| Action | Params | Returns | Used by |
|---|---|---|---|
| `ai_route_task` | `{ task: string }` | `RouteDecision` | hooks, /smart skill |
| `ai_classify_task` | `{ task: string }` | `TaskClass` | classifier-only callers |
| `ai_backend_health` | none | `BackendHealth[]` (all 8 backends probed) | dashboards, /system-health |
| `ai_backend_probe` | `{ backend: AIBackend }` | `BackendHealth` | per-backend check |
| `ai_router_stats` | none | `{ backends_known: 8, task_classes: 9, ... }` | /aware, audits |

### 1.4 Telemetry / ledger

- File: `H:/prism/knowledge/summaries/routing-decisions.jsonl` (best-effort write, never blocks)
- One line per `route()` call: `{ ts, task, taskClass, primary, fallback, reachable, reason, estimatedCost }`
- **Gap for K8:** No per-model token counts. K8 must extend to `{ ..., tier, model_used, prompt_tokens, completion_tokens, cost_estimate }`.

### 1.5 Health probe behavior

- 60s in-memory cache (`cacheTtlMs`)
- Two-step Docker probe: `docker ps` → `docker image inspect <imageName>` (avoids reporting reachable=true when image was never built — fix made during prior audit; correctness verified)
- Ollama probe ONLY checks `/api/tags`, doesn't verify specific model availability — K2 should add per-model probe before claiming `kimi-k2.6:cloud` reachable.

---

## §2 — OllamaHookBridgeEngine (`mcp-server/src/engines/OllamaHookBridgeEngine.ts`, 371 lines)

### 2.1 Configuration shape (`OllamaHookConfig`)

```typescript
{
  baseUrl: "http://localhost:11434",        // hardcoded local — needs cloud awareness
  defaultModel: "qwen2.5-coder:14b",
  modelOverrides: Partial<Record<HookType, string>>,
  timeoutMs: 500,                           // hook-friendly tight budget
  maxTokens: 100,                           // suggestion-sized
  verbose: false,
}
```

### 2.2 Hook types + model routing (`HookType`, 7 entries)

| Hook type | Current model | Tuning rationale |
|---|---|---|
| `grep_index` | qwen2.5-coder:7b | Speed-critical (file routing) — 500ms budget can't absorb 14b first-token latency |
| `mcp_route` | qwen2.5-coder:7b | Speed-critical (dispatcher routing) — same |
| `ai_feature` | qwen2.5-coder:14b | Quality > speed; latency tolerated |
| `code_explain` | qwen2.5-coder:14b | Quality > speed |
| `pattern_match` | qwen2.5-coder:14b | Better classification > 50ms latency |
| `validation` | qwen2.5-coder:14b | Catching real bugs > speed |
| `general` | qwen2.5-coder:7b | Fast catch-all |

**Tuning context** (from inline comment): RTX 4080 SUPER (16GB VRAM) — qwen2.5-coder:14b weighs ~9GB and fits entirely on-GPU at ~80 tok/sec.

**Gap for K2.6:cloud:**
- Engine has NO concept of cloud-tier Ollama models — `baseUrl` is hardcoded `http://localhost:11434`.
- K2/K3 must either (a) introduce a separate `K2CloudOllamaEngine` with its own baseUrl + auth, OR (b) extend this engine to support tier-tagged baseUrls.
- **Recommendation: (a)** — keeps the 500ms hook timeout discipline intact. K2.6:cloud has variable cloud latency (200ms-2s) and shouldn't co-mingle with the hook latency contract.

### 2.3 System prompts per hook type (`HOOK_SYSTEM_PROMPTS`)

7 hardcoded system prompts, one per HookType. All optimized for short responses (1-3 lines). K3 (`K2CloudOllamaEngine`) won't reuse these — its system prompts target deeper reasoning tasks.

### 2.4 Public surface

| Method | Purpose | Notes |
|---|---|---|
| `query(prompt, options)` | Single-shot generate | Validates: prompt non-empty, ≤10000 chars; uses AbortController for timeout |
| `status()` | Probe `/api/tags` + cache models | 2s timeout |
| `configure(updates)` | Update config with validation | baseUrl must start with `http`; timeoutMs ∈ [50, 30000]; maxTokens ∈ [1, 4096] |
| `getConfig()` | Read-only copy | |
| `isAvailable()` | Cached availability check | 60s TTL |
| `getModelForHook(type)` | Resolve model for hook type | |
| `getInstance()` (static) | Singleton accessor | |
| `resetInstance()` (static) | Test seam | |

### 2.5 Dispatcher wiring status

**UNKNOWN — needs K2 verification.** No dispatcher reference visible in this file. K2 must:
1. Grep for `OllamaHookBridgeEngine` / `ollamaHookBridgeEngine` / `getModelForHook` across `src/tools/dispatchers/`
2. If wired: confirm action enum
3. If NOT wired: this is an existing wiring gap (separate from K2 work) — flag in K2 deliverable

### 2.6 Telemetry / ledger

- **None present** — every `query()` returns `latencyMs` to caller but nothing is persisted.
- `H:/prism/mcp-server/data/state/ollama-offload-stats.json` (schema 2.0.0) is written by `OllamaHookBridgeEngine` callers (hooks), not by the engine itself.
- K8 schema 3.0.0 must add: `model_used`, `tier` (local|cloud), `cost_estimate`, `tokens_in`, `tokens_out` per event.

---

## §3 — Insertion plan summary (feeds K2)

### 3.1 New backend ID (K2 deliverable)

Add to `AIBackend` union:
```typescript
| "kimi-k2.6:cloud"
```

Probe method: HEAD `https://ollama.com/api/version` (or whatever the cloud-tier health endpoint is — K2 needs to confirm via Ollama docs / `ollama signin` flow).

### 3.2 New task-class routing rules (K4 deliverable, depends K2+K3)

```typescript
// Augment switch in route():
case "engine_building":
case "reasoning":
  if (this.contextSize(taskDescription) > 8000 && !this.isSafetyCritical(taskDescription)) {
    primary = "kimi-k2.6:cloud";
    fallback = ["claude-opus", "claude-sonnet"];
    reason = "AGGRESSIVE escalation: context >8K, K2.6 mid-tier replaces Opus";
    estimatedCost = "low";        // ~10× cheaper than Opus
  } else if (this.isSafetyCritical(taskDescription)) {
    // K4.5 two-pass: K2 generates, Claude scrutinizes
    primary = "kimi-k2.6:cloud";
    fallback = ["claude-opus"];
    reason = "Safety-critical: K2 generates, K4.5 chain triggers Claude scrutiny";
    estimatedCost = "medium";
  }
```

### 3.3 New helper methods (K2 deliverable on engine)

| Method | Returns | Purpose |
|---|---|---|
| `contextSize(task: string): number` | char count of task | Trigger for AGGRESSIVE escalation |
| `isSafetyCritical(task: string): boolean` | regex match: `safety\|kienzle\|taylor\|stress\|deflection\|collision\|chatter\|spindle.*load\|tool.*break` | K4.5 trigger |
| `getCurrentSessionTokens(): number` | accumulator from K8 telemetry | K7 cost guard input |

### 3.4 Files K2-K12 will touch (claim early)

| Phase | File | Action |
|---|---|---|
| K2 | `src/engines/AISystemRouterEngine.ts` | Add backend ID + helpers |
| K2 | `src/__tests__/AISystemRouterEngine.test.ts` | New tier coverage |
| K3 | `src/engines/K2CloudOllamaEngine.ts` (NEW) | Adapter — auth + fallback to qwen |
| K3 | `src/__tests__/K2CloudOllamaEngine.test.ts` (NEW) | 5 failure modes + 2 adversarial |
| K4 | `src/engines/AISystemRouterEngine.ts` | Routing matrix update |
| K4.5 | `src/engines/K2ScrutinizeChainEngine.ts` (NEW) | Two-pass orchestrator |
| K4.5 | `src/__tests__/K2ScrutinizeChainEngine.test.ts` (NEW) | PASS/REVISE/FAIL paths |
| K5 | `.claude/hooks/ollama-tier-router.mjs` (NEW) | UserPromptSubmit hook |
| K6 | `.claude/commands/k2-ask.md` (NEW) | Skill |
| K7 | `src/engines/AISystemRouterEngine.ts` | Cost guard |
| K8 | `mcp-server/data/state/ollama-offload-stats.json` | schema 2.0.0 → 3.0.0 + migration |
| K8 | `src/migrations/ollama-offload-stats-v3.ts` (NEW) | Migration |
| K9 | `scripts/ollama-offload-dashboard.mjs` | Extend with cost projection |
| K10 | All test files above | Coverage validation |
| K11 | `scripts/k2-cloud-auth-setup.mjs` (NEW) | `ollama signin` wrapper |
| K12 | `H:/prism/CLAUDE.md` | 3-tier ladder doc + Boris back-flow note |

---

## §4 — Open questions surfaced during inventory (must resolve before K3)

1. **Ollama cloud auth shape** — does `ollama signin` produce a config file, env var, or per-call header? K3 design depends on this. **Resolution path:** K11 inventory (run `ollama signin --help` + read Ollama docs); defer K3 implementation until K11's auth shape lands.
2. **Cost-per-token for `kimi-k2.6:cloud`** — Moonshot pricing not yet captured in PRISM. K7/K8/K9 need this constant. **Resolution path:** K2 deliverable adds `KIMI_K2_PRICING` constant block (input + output $/1M tokens) sourced from Moonshot API docs at K2 build time.
3. **OllamaHookBridgeEngine dispatcher wiring** — unclear whether currently wired. **Resolution path:** K2 first action is grep, results gate whether K2 also fixes the wiring gap or leaves it for separate unit.
4. **Context-size estimation** — `task.length` is char count, NOT token count. AGGRESSIVE rule uses `>8K context` — should this be 8K chars or 8K tokens? **Decision (this inventory):** start with 8K **chars** for K4 (cheap to compute, no tokenizer dep); upgrade to 8K **tokens** in K9 if telemetry shows mis-routing.
5. **K4.5 scrutiny chain return shape** — does K4.5 return `{ verdict, response_K2, claude_revisions? }` or modify `RouteDecision`? **Decision (this inventory):** new type `ScrutinyDecision { verdict: 'PASS'|'REVISE'|'FAIL', primary_response: string, scrutiny_notes: string, total_cost: number, claude_revisions?: string }` — keeps `RouteDecision` API stable.

---

## §5 — Boris loop verification gates for K1 (this doc)

- [ ] **Self-review:** doc enumerates all 8 backends + 9 task classes + 7 hook types + 5 dispatcher actions present in the source. ✅ verified above.
- [ ] **Peer reviewer subagent (deferred to K3 milestone):** spawn `Agent({ subagent_type: 'reviewer', isolation: 'worktree', prompt: <review K1+K2+K3 together> })` after K3 lands — review batch reduces 3× peer-spawn cost.
- [ ] **Cross-CLI 3-way:** out of scope for inventory doc (no diff to scrutinize). Will apply at K3 + K4.5 milestones.
- [ ] **Regression flow:** any defects discovered → CLAUDE.md `## Recent regressions` block per Boris doctrine.

---

## §6 — Provenance

- Source files read in full this session: `AISystemRouterEngine.ts` (298 lines), `OllamaHookBridgeEngine.ts` (371 lines)
- User-locked decisions: `K2-CLOUD-INTEGRATION-PLAN.md` §6 (100K/session cap, AGGRESSIVE, two-pass, Wave 5.5)
- Doctrine: `BORIS-LOOP-AGENT-DOCTRINE.md` (227 lines)
- Inventory date: 2026-05-10 · Inventory chat: claude-85cedf09
