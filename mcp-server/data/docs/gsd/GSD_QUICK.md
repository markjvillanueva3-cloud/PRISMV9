# PRISM Quick Reference v25.0
## 95 dispatchers | 6346 actions | 3018 engines | 357 hooks | 503 skills | 244 scripts
## Build: PASS | Omega: 1.0 | Tests: 3000+ | Updated: 2026-05-16

> **2026-05-16 status note**: the SESSION LIFECYCLE list below is a SNAPSHOT — actual wired state can drift. As of 2026-05-16 the 4 `error-*` hooks named under PostToolUse (line 37-38) AND the `error-block-prewarn` under PreToolUse (line 28) were ALL UNWIRED in both `C:` and `H:` settings.json (`grep error-(pattern\|block\|learner) settings.json` → 0 matches). `error-pattern-promote` was wired into Stop[12] same session — 1/6 fixed. The full lifecycle here is aspirational; **verify any specific hook actually fires** with `node H:/prism/scripts/harness-wiring-audit.mjs` before relying on it. Live counts in `PRISM-INVENTORY-LATEST.md`. See `H:/prism/CLAUDE.md` "Recent regressions" 2026-05-16 entries for full incident.

## SESSION LIFECYCLE (AUTO-ENFORCED BY HOOKS)
```
SessionStart → 25+ hooks fire automatically:
  - expert-role-inject (polymath role)
  - prism-intelligence-briefing (system overview)
  - skill-utilization-index (503 skills indexed)
  - ai-deep-intelligence (AI system activation)
  - self-improvement-activate (feedback loops)
  - sync-h-c-drives (H: drive canonical)
  - embedder-inject-qdrant (Qdrant + Ollama smoke test — INTEL P0-U01)

UserPromptSubmit → 18+ hooks fire:
  - neural-ai-optimizer (complexity detection → neural engines)
  - smart-skill-suggest (context-aware skill matching)
  - ai-auto-command-router (slash command suggestions)
  - self-awareness-auto-inject (JM Die paths, dedup)
  - claudemd-ollama-enforcer (semantic top-3 over CLAUDE.md chunks — INTEL P1-U05)
  - ollama-obsidian-rag (memory keywords → top-5 vault hits — INTEL P3-U05)
  - ollama-skill-suggester (semantic top-5 skills — INTEL P3-U01)
  - ollama-route-recommender (semantic top-3 dispatcher actions — INTEL P3-U04)
  - gsd-section-retrieve (GSD keywords → top-3 sections — INTEL P4-U01)

PreToolUse → 20+ hooks fire (Bash matcher):
  - error-block-prewarn (queries Qdrant for past similar errors — INTEL P2-U04)
  - rtk-auto-suggest (rtk prefix for token economy)
  - script-summary-inject (cached 1-line per script — INTEL P3-U02)
  - bash-destructive-guard (HARD BLOCK on rm -rf, force push, etc.)

PostToolUse → 25+ hooks fire:
  - token-economy-hook (token tracking, waste detection)
  - dev-outcome-tracker (build/test outcome logging)
  - meta-learning-trigger (learning activation)
  - error-block-capture / error-pattern-memory / error-recovery-memory /
    error-learner-hook (all mirror to UNIFIED_ERROR_LEDGER — INTEL P2-U02)
  - claudemd-section-update (re-chunks CLAUDE.md on edit — INTEL P1-U05)
  - memory-mirror-to-vault (mirrors MEMORY.md changes — INTEL P1-U04)
  - cache hooks (file/grep/bash deduplication)

Stop → 8+ hooks fire:
  - stop-obsidian-memory-extract (Obsidian sync — INTEL P1-U01)
  - session-consolidate-graph (every N=5 sessions, runs MemoryConsolidationEngine — INTEL P1-U02)
  - enforce-handoff-topic (renames topicless handoffs)
```

## 6 LAWS (HARD RULES — HOOK ENFORCED)
1. **S(x)≥0.70 BLOCK** — safety score must pass before release (default to shop_floor tier S(x)≥0.98)
2. **NO PLACEHOLDERS** — every value real, complete, verified; test-legitimacy gate rejects toBeDefined-style stubs
3. **NEW≥OLD** — never lose data, actions, hooks, knowledge; anti-regression gate enforces
4. **MCP FIRST** — use prism_* dispatchers before bash; tool-route-best for cold paths
5. **NO DUPLICATES** — duplicationGuardEngine.mustCheckBeforeCreating() (semantic backend now via INTEL P3-U03)
6. **100% UTILIZATION** — if it exists, use it; orphan engines + unwired hooks BLOCK Stop

## CRITICAL SLASH COMMANDS (AUTO-SUGGESTED BY HOOKS)
| Command | Trigger | Purpose |
|---------|---------|---------|
| `/pdf-learn` | pdf, manual, document | Extract knowledge → tribal tips |
| `/video-learn` | video, youtube, tutorial | Extract knowledge → procedures |
| `/forge-triple` | create engine, build | Engine + skill + hook creation |
| `/dedup` | BEFORE any creation | Block duplicates (semantic + fuzzy) |
| `/wire-edm-studio` | wedm, wire edm | Full EDM programming |
| `/lathe-studio` | lathe, turning, okuma | Full lathe programming |
| `/auto-speed-feed` | speed, feed, sfm | Calculate cutting params |
| `/quote-to-ship` | quote, estimate, cost | Full job pipeline |
| `/scrutinize` | review, audit, check | Deep code analysis |
| `/smart` | complex task | AI-powered routing |
| `/handoff` | session end | Per-chat handoff (`HANDOFF-<id>-<topic>.md`) |
| `/wiki-query` | reference, lookup | Wiki bridge — 722 entries |

## AI SYSTEM (3018 ENGINES — AUTO-ORCHESTRATED)
```
MetaAIOrchestrationEngine — 150+ engine coordination, metacognition
NeuralIntegrationEngine — auto-routing to 3018 engines
DeepAIIntelligenceEngine — 8 reasoning modes
CrossDisciplinaryDeepLearningEngine — 15 domains, 120 formulas
PRISMCreativeReasoningEngine — 6 exploration modes
27 Neural Network Engines — force/thermal/chatter prediction
OllamaClientEngine — local inference (qwen2.5-coder:7b @ localhost:11434)
QdrantMemoryEngine + Singleton — semantic memory (13 kinds, INTEL P0-U01)
UnifiedErrorLedgerEngine — single source of truth for errors (INTEL P2-U03)
MemoryConsolidationEngine — N=5 session distillation (INTEL P1-U02)
```

## DISPATCHER DECISION TREE (95 DISPATCHERS, 6346 ACTIONS)
### Manufacturing (SAFETY CRITICAL)
- **prism_calc** (1900+) — Force, power, time, deflection, thermal, chatter
- **prism_safety** (29) — S(x) scoring, collision, clearance
- **prism_turning** (40+) — Lathe operations, threading, profile, cycle time
- **prism_grinding** (10) — Grinding cycles
- **prism_cam** (1500+) — Toolpath, post-processing, multi-CAM bridge
- **prism_5axis** (5) — 5-axis kinematics
- **prism_thread** (21) — Threading operations + thread-mill

### AI & Intelligence
- **prism_ai** (300+) — Reasoning, speed/feed, tool select, strategy
- **prism_intelligence** (300+) — Learning, knowledge query
- **prism_knowledge** (130+) — Cross-registry knowledge
- **prism_knowledge_ext** (40+) — Knowledge extraction

### Memory & Vector (NEW — INTEL milestone)
- **prism_memory** (12) — get_health, trace_decision, find_similar, get_session,
    get_node, run_integrity, consolidate, consolidation_stats,
    consolidation_patterns, **record_session_end**, **semantic_search**, **remember**

### Data & Quality
- **prism_data** (300+) — Material, machine, tool lookup
- **prism_quality** (17) — Inspection, SPC, GD&T
- **prism_validate** (13) — Validation workflows
- **prism_omega** (6) — Ω quality scoring
- **prism_ralph** (3) — 4-phase deep validation

### Session & Dev
- **prism_session** (50+) — State save/restore, dispatcher map, action search
- **prism_context** (45+) — Context, tokens, presence, chat bus
- **prism_dev** (190+) — Build, test, quality, inventory, foresight
- **prism_gsd** (6) — GSD protocol (this doc)

### Guard & Safety (4 NEW — INTEL P2-U03)
- **prism_guard** (60+) — Decision logs, audit, **error_ledger_append**,
    **error_ledger_append_and_embed**, **error_ledger_recent**,
    **error_ledger_recall_similar**

### Orchestration
- **prism_orchestrate** (26) — Multi-agent coordination
- **prism_atcs** (12) — Multi-session autonomous tasks
- **prism_autonomous** (8) — Autonomous tasks
- **prism_autopilot_d** (8) — Workflow orchestration

## QDRANT MEMORY KINDS (13 — INTEL milestone)
```
program  — completed CNC programs / outcomes
outcome  — measurement / dimensional outcomes
tip      — tribal knowledge tips (4245 mirrored to knowledge/tribal/)
formula  — physics formulas
rule     — CLAUDE.md chunks (project + global, ~30 sections)
playbook — playbook rules
note     — mirrored MEMORY.md memories (knowledge/memories/)
error    — UNIFIED_ERROR_LEDGER signatures (1604+ entries)
skill    — 503 skill descriptions
engine   — 3013 engine descriptions
action   — 6346 dispatcher actions across 80 dispatchers
gsd      — 28 GSD section chunks
directive — 9 shared directive summaries (P4-U02 pending)
wiki     — 722 wiki entries (P4-U04 pending)
```

## TOKEN ECONOMY (HOOK-ENFORCED)
```
Budget Profiles:
  backend: 200k tokens (compact at 150k)
  physics: 150k tokens (compact at 110k)
  refactor: 250k tokens (compact at 180k)

Waste Detection:
  - Duplicate reads → blocked by file-read-cache
  - Broad searches → warned by token-economy-hook
  - Large outputs → flagged for compression

Cache Performance:
  - file-read-cache: ~4k bytes saved per hit
  - grep-result-cache: ~2.5k bytes saved per hit
  - bash-result-cache: ~1.5k bytes saved per hit

Semantic Routing (NEW — INTEL P3):
  - skills:  503 skills → top-5 per prompt (~1000 tok saved/session)
  - scripts: 364 scripts → cached 1-line summary (~400 tok per call)
  - engines: 3013 engines → top-3 dedup (replaces O(N) fuzzy)
  - actions: 6346 actions → top-3 per verb-object (~70% search overhead saved)
  - rules:   ~30 CLAUDE.md sections → top-3 per prompt (vs full 3000 tok)
  - gsd:     28 GSD sections → top-3 (vs full DEV_PROTOCOL.md)
```

## SELF-IMPROVEMENT SYSTEM (ACTIVE)
```
dev-outcome-tracker → logs build/test/commit outcomes
   ↓
SelfImprovementPatternEngine → detects failure patterns
   ↓
meta-learning-trigger → activates when thresholds reached:
  - 20+ outcomes → MetaLearningOptimizerEngine
  - 5+ failures → SelfImprovementPatternEngine
   ↓
EngineAccuracyTrackerEngine → monitors prediction accuracy
   ↓
MemoryConsolidationEngine → every N=5 sessions, distills graph patterns
   ↓ (INTEL P1-U02)
knowledge/tribal/pattern-*.md → vault-mirrored compressed patterns
```

## ERROR LEARNING LOOP (INTEL P2 — Phase 2 complete)
```
Error captured by any of 4 hooks:
  error-block-capture / error-pattern-memory /
  error-recovery-memory / error-learner-hook
   ↓
unified-ledger-mirror.mjs (helper) → POST prism_guard:error_ledger_append
   ↓
UnifiedErrorLedgerEngine.append → UNIFIED_ERROR_LEDGER.jsonl (sha-1 dedup)
   ↓ (when Qdrant up)
QdrantMemoryEngine.remember kind=error → vector embedding
   ↓
NEXT TIME: error-block-prewarn fires PreToolUse →
  prism_guard:error_ledger_recall_similar → top-3 past errors injected
  → 100% capture coverage (was ~25% with local-only)
```

## VAULT STRUCTURE (knowledge/)
```
knowledge/claude-md/    — 30 CLAUDE.md sections (project + global)  [P1-U05]
knowledge/gsd/          — 28 GSD sections                            [P4-U01]
knowledge/tribal/       — 4245 tribal tip files (one per tip)        [P1-U03]
knowledge/scripts/      — INDEX.md (364 1-line summaries)            [P3-U02]
knowledge/memories/     — mirrored MEMORY.md feedback/project/...    [P1-U04]
knowledge/wiki/         — 722-entry compounding wiki                 [pre-existing]
```

## MULTI-CHAT COORDINATION (3-6 concurrent chats)
```
Per-chat handoff:    state/shared/handoffs/HANDOFF-<id>-<topic>.md
File claims:         file-claim-guard tags edits with claude-<id>
Chat bus:            state/shared/AGENT_CHAT.md (post via prism_context:chat_post)
Workboard:           state/shared/AGENT_WORKBOARD.md
Conflict warning:    PreToolUse hook flags edits to files claimed by other chats
Session id:          stable-session-id helper, prefer claude-XXX over host-PID
```

## JM DIE TEST SHOP (CANONICAL)
```
PRISMSelfAwarenessEngine.getJMDieCustomerPath("ALCOA")
  → "H:/PRISM/JM DIE/CNC LATHE/ALCOA"

24,545 programs | 100+ customers | 21 machines
Machines: 7 Okuma lathes, 5 mills, 2 sinker EDM, 1 wire EDM
```

## USAGE
```typescript
// Via MCP
mcp__prism__prism_gsd({ action: "quick" })
mcp__prism__prism_gsd({ action: "get", section: "laws" })
mcp__prism__prism_gsd({ action: "dev_protocol" })

// Semantic memory (INTEL milestone)
mcp__prism__prism_memory({ action: "semantic_search", params: { query: "...", kind: "engine", limit: 5 } })
mcp__prism__prism_memory({ action: "remember", params: { kind: "tip", id: "...", text: "..." } })
mcp__prism__prism_memory({ action: "record_session_end", params: { session_id: "..." } })

// Error ledger (INTEL P2)
mcp__prism__prism_guard({ action: "error_ledger_append", params: { source: "hook_block", message: "..." } })
mcp__prism__prism_guard({ action: "error_ledger_recall_similar", params: { signature: "...", limit: 3 } })

// GSD section retrieval (INTEL P4)
mcp__prism__prism_memory({ action: "semantic_search", params: { query: "buffer equation", kind: "gsd" } })
```
