# PRISM GSD Comprehensive Reference v3.0
## 95 dispatchers · 6346 actions · 3018 engines · 357 hooks · 503 skills · 244 scripts
## Build PASS · Omega 1.0 · Tests 3000+ · Updated 2026-04-28

This is the **deep operational reference**, kept compact and accurate.
Each `## ` section is individually retrievable via
`prism_memory:semantic_search kind=gsd` (populated by
`scripts/chunk-gsd-vault.mjs`). Token cost is **per-query, not
per-session** — so write generously and let semantic retrieval
deliver only the relevant slice. Edits are auto-rechunked by the
`gsd-section-update.mjs` PostToolUse hook.

## 6 Laws — Hard Rules Hook Enforced

1. **S(x)≥0.70 BLOCK** — safety score must pass before release. Default
   to **shop_floor** tier S(x)≥0.98 when generating G-code or feed/speed
   that hits a real machine. Production tier S(x)≥0.95. Proven-out
   ≥0.90. Sim/explore ≥0.70. Reference
   `state/shared/omega-thresholds.json`.
2. **NO PLACEHOLDERS** — every value real, complete, verified.
   `test-legitimacy.mjs` rejects toBeDefined / toBeUndefined /
   toBeTruthy / toBeFalsy / `.skip(` placeholders.
   `code-completeness-gate.mjs` rejects TODO / FIXME / commented-out
   blocks / empty catches.
3. **NEW≥OLD** — never lose data, actions, hooks, knowledge.
   `prism_validate:anti_regression` enforces baseline counts in
   `mcp-server/data/state/BASELINE_INVENTORY.json`.
4. **MCP FIRST** — use `prism_*` dispatchers before Bash; route via
   `prism_session:tool_route_best` for cold paths.
5. **NO DUPLICATES** — `duplicationGuardEngine.mustCheckBeforeCreating()`
   THROWS on exact dup. Semantic backend (P3-U03) queries Qdrant
   `engine` collection (3013 indexed) before fuzzy string match.
6. **100% UTILIZATION** — orphan engines without dispatcher imports
   BLOCK Stop. Mark genuinely-indirect engines with
   `// WIRE-EXEMPT: <reason>`. Unwired hooks WARN at Stop.

## Engine Wiring — Wire to All Sources

NEW RULE (2026-04-28): when generating an engine, do NOT stop at one
dispatcher. Wire to **every dispatcher that would naturally consume
it** in a single commit. Examples:

- A new memory engine → wire into `prism_memory` AND any specialized
  consumer (e.g. `prism_guard:error_ledger_*` for error ledgers).
- A new physics engine → wire into `prism_calc` AND `prism_safety`
  validation actions if it computes safety-relevant quantities.
- A new CAM engine → wire into `prism_cam` AND any
  vendor-specialized dispatcher (mastercam, hypermill, etc.) that
  consumes its output.
- A new reasoning engine → wire into `prism_ai` AND
  `prism_intelligence` if both routing surfaces apply.

Verification:
- `stop-auto-wire.mjs` (Stop hook, NOW WIRED) audits new engine /
  hook / skill files, warns on missing dispatcher references.
- `stop_on_unwired_assets.mjs` HARD BLOCKS Stop when an engine has
  zero dispatcher imports.
- New acceptance criterion in tests: a round-trip E2E assertion that
  invokes the engine **through every wired dispatcher**, not only
  the singleton.

If you genuinely intend an engine to be wrapped by a singleton (e.g.
`QdrantMemoryEngine` ← `QdrantMemoryEngineSingleton`), tag it with a
`// WIRE-EXEMPT: <reason>` comment that names the wrapper.

## Multi-Chat Lane Discipline + Worktree Routing

3-6 concurrent chats run on PRISM at any time. Each chat
**stays in its own lane** — claims a milestone scope, commits to the
matching branch / worktree, never trespasses on another chat's files.

### Lane assignment
- Per-chat handoff at `state/shared/handoffs/HANDOFF-<id>-<topic>.md`.
- Topic derived in priority order: most-recent commit's `[SCOPE-MS#]`
  → `CURRENT_POSITION.md` milestone → branch slug.
- `enforce-handoff-topic.mjs` (Stop) renames topicless handoffs.

### Worktree routing
- Each active milestone has a `work/<milestone>` worktree under
  `H:/prism/.claude/worktrees/` (or peer paths like
  `H:/prism-tsc-cleanup/`, `H:/prism-cad-complete/`).
- `git worktree list` shows the live mapping.
- `worktree-commit-route.mjs` (PreToolUse Bash) DENIES `git commit`
  on the main tree when the commit subject's `[SCOPE]` token matches
  an active `work/<scope>` worktree. Override: prefix subject with
  `[MAIN]` for genuinely cross-cutting commits.

### Conflict-fork rule
**NEW RULE (2026-04-28):** if `commit-ownership-guard` or
`git-anti-clobber` blocks your commit because another chat owns the
files, do NOT fight for the same tree. **Fork to your own tree:**
1. `git worktree add ../prism-<your-milestone> -b work/<your-milestone>`
2. Move your work there with `git stash push` → `git stash pop` in
   the new worktree, OR `git cherry-pick` the relevant commits.
3. Commit on the new branch.
4. Update your `state/shared/handoffs/HANDOFF-<id>-<topic>.md` to
   point at the new worktree.

This avoids the multi-chat thrash on shared HEAD and keeps milestones
independently mergeable.

### File claims
- `file-claim-guard` (PreToolUse) tags edits with stable session id
  (15-minute lease). Other chats see warnings before editing claimed
  files in the chat-bus auto-injection.
- `commit-ownership-guard` (PreToolUse Bash on `git commit`) verifies
  staged files against ownership ledger; accepts both `claude-XXX`
  payload IDs and `host-${hostname()}` fallback as "ours"
  (HOOK-FIX-5/C).
- 3-strike escape hatch: after 3 successive blocks the guard auto-
  passes with a warning so genuine progress isn't permanently stuck.

### Chat bus
- `state/shared/AGENT_CHAT.md` — broadcast intent before non-trivial
  edits via `prism_context:chat_post`.
- `state/shared/AGENT_WORKBOARD.md` — claim a unit before starting,
  release on completion.

## Test Rules — Comprehensive Build

NEW RULE (2026-04-28): every test file must satisfy a coverage floor.
Tests that fail this WILL be flagged by `test-legitimacy.mjs`.

### Coverage floor
- **Happy path** — at least one assertion against a known-good input.
- **≥3 failure modes** — bad input, boundary condition, resource
  exhaustion (timeout/oversize/network).
- **≥2 adversarial inputs** — NaN, Infinity, empty/null, oversize
  string, malformed JSON.
- **≥3 variability axis values** — if the domain has N configurations
  (materials, dialects, machines, CAM systems), exercise at least
  three spanning ones, not just the canonical default.
- **Wiring round-trip** — at least one test must invoke the engine
  through the dispatcher (not only the singleton). The dispatcher
  schema, action enum, and lazy import all match.

### Real assertions only
- Reference values from published sources or algebraic invariants.
- NEVER `toBeDefined()`, `toBeUndefined()`, `toBeTruthy()`,
  `toBeFalsy()` as the primary assertion.
- NEVER `.skip(` to silence a failing test. Fix the code or fix the
  test — never weaken the assertion.

### Failure handling
- If tests fail mid-build: fix the code or fix the test. Do not
  comment out, skip, or weaken assertions.
- If genuine ambiguity: stop, ask the user, do not silently flip
  expectations.

## Boot Protocol

```
SessionStart (auto-fire):
  prism_dev:session_boot          load baseline + claim session id
  prism_context:todo_update       anchor task focus
  embedder-inject-qdrant          Ollama + Qdrant smoke (P0-U01)
  expert-role-inject              polymath role
  prism-intelligence-briefing     system overview

UserPromptSubmit (auto-fire — semantic routing layer):
  claudemd-ollama-enforcer        top-3 CLAUDE.md (P1-U05)
  ollama-obsidian-rag             memory keywords → vault hits (P3-U05)
  ollama-skill-suggester          top-5 skills semantic (P3-U01)
  ollama-route-recommender        top-3 dispatcher actions (P3-U04)
  gsd-section-retrieve            top-3 GSD sections (P4-U01)
  self-awareness-auto-inject      JM Die paths, dedup, customer ctx
  ai-auto-command-router          slash command suggestions

PreToolUse (auto-fire):
  error-block-prewarn             past similar errors via Qdrant (P2-U04)
  rtk-auto-suggest                rtk prefix for Bash token economy
  script-summary-inject           cached 1-line per script (P3-U02)
  bash-destructive-guard          HARD BLOCK rm -rf, force push, etc.
  commit-ownership-guard          per-session ownership check
  file-claim-guard                15-min lease on edits
  worktree-commit-route           lane discipline (NOT YET WIRED)

PostToolUse (auto-fire):
  4 error capture mirrors         → UNIFIED_ERROR_LEDGER (P2-U02)
  claudemd-section-update         re-chunk on CLAUDE.md edit (P1-U05)
  gsd-section-update              re-chunk on GSD edit (P4-U01)
  memory-mirror-to-vault          mirror MEMORY.md (P1-U04)
  token-economy-hook              tracking, waste detection
  dev-outcome-tracker             outcome logging
  meta-learning-trigger           learning activation

Stop (auto-fire):
  stop-obsidian-memory-extract    Obsidian sync (P1-U01)
  session-consolidate-graph       N=5 distillation (P1-U02)
  enforce-handoff-topic           rename topicless handoffs
  stop-auto-wire                  multi-source wire audit
  stop_on_unwired_assets          BLOCK on orphan engines
  scrutinize-before-stop          BLOCK on uncommitted unreviewed
  always-build-guard              BLOCK on missing builds
  prism_session:state_save        persist for resume
```

## Dispatcher Routing — Domain Map

```
Calc       prism_calc (1900+: cutting_force_kienzle, thermal_analyze,
            deflection_calculate, surface_finish, mrr, power, chatter)
Safety     prism_safety (29) + prism_omega (6) + prism_ralph (3)
Manuf.     prism_turning (40+) + prism_grinding (10) + prism_thread (21)
            + prism_5axis (5) + prism_hole_pattern (3)
CAM        prism_cam (1500+: toolpath, post, multi-CAM bridge)
EDM        prism_edm (200+: WEDM, sinker, laser, waterjet)
Intel      prism_ai (300+) + prism_intelligence (300+)
            + prism_knowledge (130+)
Memory     prism_memory (12: semantic_search, remember, consolidate,
            record_session_end)
Data       prism_data (300+: material, machine, tool, workholding)
Quality    prism_quality (17) + prism_validate (13)
Session    prism_session (50+: state, dispatcher_map, action_search,
            tool_route_best)
Context    prism_context (45+: tokens, presence, chat bus)
Dev        prism_dev (190+: build, test, quality, foresight)
Guard      prism_guard (60+: decision_log, audit, error_ledger_*)
Orch.      prism_orchestrate (26) + prism_atcs (12) + prism_autonomous (8)
GSD        prism_gsd (6: this doc)
```

Use `prism_session:dispatcher_map_compact` for the live map.

## PRISM Self-Awareness System

The runtime introspection brain. Use it instead of re-deriving from
file scans:

```typescript
import { prismSelfAwarenessEngine } from "@engines/PRISMSelfAwarenessEngine";

// Routing decisions
prismSelfAwarenessEngine.recommendAIFeatures(task)
  // → engines[] ranked by relevance + confidence

// Workflow lookup
prismSelfAwarenessEngine.searchTribalKnowledge(query)
  // → tips[] from 4245-tip tribal vault

prismSelfAwarenessEngine.searchPlaybookRules(query)
  // → playbook entries

// JM Die test shop
prismSelfAwarenessEngine.getJMDieCustomerPath("ALCOA")
  // → "H:/PRISM/JM DIE/CNC LATHE/ALCOA"

// AI feature catalog
prismSelfAwarenessEngine.findAIFeature(name)
prismSelfAwarenessEngine.listAIDomains()
```

Companion engines:
- `PRISMCreativeReasoningEngine` — 6 exploration modes for cross-
  domain synthesis. Modes: conventional → exploratory → hybrid →
  innovative → optimal.
- `CrossDisciplinaryDeepLearningEngine` — 15 scientific domains, 120
  formulas. Entry point for unfamiliar physics + ML problems.
- `MetaAIOrchestrationEngine` — coordinates 150+ engines, runs
  metacognition cycles.
- `NeuralIntegrationEngine` — auto-routes to 3018 engines.

## Token Economy

### Profiles
```
backend  : 200k (compact at 150k)
physics  : 150k (compact at 110k)
refactor : 250k (compact at 180k)
frontend : 180k (compact at 130k)
```

### RTK prefix (Bash output savings 60-95%)
```
rtk vitest run         99% reduction
rtk tsc                83% reduction
rtk git status/log     59-80% reduction
rtk gh pr view/diff    79-87% reduction
rtk npm/pnpm install   70-90% reduction
```

### Semantic routing (per-call savings, INTEL milestone)
```
CLAUDE.md scan         3000 tok → 3 sections × 150 tok = 450 tok
Skill scan             10000 tok → 5 skills × 50 tok = 250 tok
Engine dedup           O(N) name compare → top-3 vector
Action search          6000 tok per dispatcher map → top-3 = 100 tok
Script source read     full file → 1-line summary = 100 tok
GSD docs               full doc → 3 chunks = 600 tok
Tribal knowledge       O(N) tip scan → kind=tip top-5 = 250 tok
```

### Caching
```
file-read-cache    ~4k bytes/hit
grep-result-cache  ~2.5k bytes/hit
bash-result-cache  ~1.5k bytes/hit
ComputationCache   3-tier LRU (30/120/300s)
DiffEngine         CRC32 dedup, skips redundant writes
```

### Tool selection
```
Multiple Grep                  → single Agent Explore
Bash find/grep                 → Glob/Grep native tools
Re-reading files               → trust context (hooks track changes)
Full file Read                 → Read offset/limit
Sequential tool calls          → parallel independent calls
```

### Ollama offload
Free local inference for non-cognitive tasks: code summarization,
documentation generation, classification. Telemetry at
`mcp-server/data/state/ollama-offload-stats.json`. Dashboard:
`scripts/ollama-offload-dashboard.mjs`.

## Context Retention & Extension

Strategies that survive 200K context limits:

### Per-chat handoff (NEVER overwrite)
- Read at `/startup`: `node H:/prism/.claude/helpers/per-agent-handoff.mjs read --terminal "$(node H:/prism/.claude/helpers/stable-session-id.mjs)"`
- Write at `/handoff`: same helper, `write --terminal "$STABLE" --resume "<next>" --state "<body>"`.
- Topic suffix mandatory: `HANDOFF-<id>-<topic>.md`.

### Memory mirroring (P1-U04)
- `MEMORY.md` auto-mirrored to `knowledge/memories/{feedback,project,user,reference}/*.md`.
- Recall via `prism_memory:semantic_search kind=note`.

### Compaction recovery (3-layer automatic)
```
L1 _context           every MCP response carries task/resume/next
L2 _COMPACTION_RECOVERY  injected on 30s gap or session_boot mid-session
L3 Aggressive hijack  first call after detection → response REPLACED
                      with full recovery payload
```
If `_COMPACTION_DETECTED: true` → follow `_MANDATORY_RECOVERY` exactly.
Read `/mnt/transcripts/` latest + `state/RECENT_ACTIONS.json` →
continue.

### Working set awareness
- `working-set-awareness.mjs` tracks recently-touched files and
  scopes broad searches to that set.
- `pattern-frequency-tracker.mjs` learns which globs are productive.

### Skills load-on-demand
- 503 skills are NOT loaded into context. Semantic match via
  `ollama-skill-suggester` injects only top-5 names per prompt.

### Digests over live exploration
- `ENGINE_DIGEST.md` (3018 engines, 1-line each)
- `DISPATCHER_DIGEST.md` (95 dispatchers + counts)
- `DIRECTORY_DIGEST.md` (215 directories with purposes)
- `CODE_SYSTEM_INDEX.json` (1865 shortcode → path)

### Stable session id
- `helpers/stable-session-id.mjs` returns `claude-<8-char>` so
  per-chat artifacts persist across subprocess invocations.

## Semantic Memory Stack (INTEL milestone)

```
Layer            File / Engine                               Population
─────────────────────────────────────────────────────────────────────
Embedder         QdrantMemoryEngineSingleton                 Ollama
                 createOllamaEmbedder({nomic-embed-text})    /api/embed
                                                              768-dim
Vector store     QdrantMemoryEngine (kind-keyed)             Qdrant
                                                              localhost:6333

Memory kinds (14):
  program / outcome / tip / formula / rule / playbook / note /
  error / skill / engine / action / gsd / directive / wiki

Embed scripts (one-shot, idempotent — re-runnable):
  scripts/populate-tribal-vault.mjs            4245 tips
  scripts/chunk-claudemd-vault.mjs             ~30 CLAUDE.md sections
  scripts/chunk-gsd-vault.mjs                  ~50 GSD sections
  scripts/embed-all-skills.mjs                 503 skills
  scripts/embed-all-engines.mjs                3013 engines (5 noDocstring)
  scripts/embed-all-actions.mjs                6346 actions
  scripts/mirror-memories-bootstrap.mjs        MEMORY.md mirror
  scripts/summarize-all-scripts-via-ollama.mjs 364 scripts

Retrieval surface:
  prism_memory:semantic_search { query, kind, limit, threshold }
  prism_memory:remember { kind, id, text, metadata }
  prism_memory:record_session_end { session_id, auto_consolidate }
  prism_guard:error_ledger_recall_similar { signature, limit }
```

## Error Learning Loop (INTEL P2)

```
Error captured by 4 PostToolUse hooks:
  error-block-capture / error-pattern-memory /
  error-recovery-memory / error-learner-hook
                ↓
unified-ledger-mirror.mjs (helper)
  POST prism_guard:error_ledger_append
                ↓
UnifiedErrorLedgerEngine.append
  → UNIFIED_ERROR_LEDGER.jsonl (sha-1 dedup)
                ↓ (Qdrant up)
QdrantMemoryEngine.remember kind=error
  → 768-dim vector embedded
                ↓
NEXT TIME (PreToolUse Bash/Edit):
  error-block-prewarn
  → prism_guard:error_ledger_recall_similar (top-3, score≥0.5)
  → injects "📡 Vector-similar past errors" into prompt
  → 100% capture coverage (was ~25% with local-only)

Source provenance (5 values):
  hook_block | pattern_memory | recovery | session | learner

Migration: scripts/migrate-error-ledgers.mjs merges 4 legacy silos.
Originals preserved as .deprecated.
```

## Session-End Consolidation (INTEL P1-U02)

```
session-consolidate-graph.mjs (Stop hook)
  → POST prism_memory:record_session_end
  → MemoryConsolidationEngine.recordSessionEnd()
     increments sessionsSinceLastConsolidation

When sessionsSinceLast >= 5 AND auto_consolidate=true:
  → MemoryConsolidationEngine.consolidate()
     Phase 1: Collect raw graph nodes
     Phase 2: Cluster by similarity
     Phase 3: Distill recurring → ConsolidatedPattern
     Phase 4: Prune CONTEXT > 168h, cap PATTERN at 200
  → patterns written to consolidated_patterns.json
  → hook mirrors patterns to knowledge/tribal/pattern-<id>.md
  → 10K decision nodes compress to ≤1K patterns

Counter file (deliverable mirror):
  mcp-server/data/state/consolidation-counter.json
```

## Vault Structure

```
H:/prism/knowledge/
├── claude-md/        ~30 CLAUDE.md chunks (P1-U05)
│   ├── project-*.md     12 from H:/prism/CLAUDE.md
│   └── global-*.md      18 from ~/.claude/CLAUDE.md
├── gsd/              ~50 GSD chunks (P4-U01)
│   ├── gsd_quick-*.md
│   ├── gsd_micro-*.md
│   └── dev_protocol-*.md
├── tribal/           4245 tribal tip files (P1-U03)
│   └── pattern-*.md  consolidated patterns from N=5 cycle
├── memories/         mirrored MEMORY.md (P1-U04)
│   ├── feedback/     corrections, preferences
│   ├── project/      in-progress milestones
│   ├── user/         role, expertise
│   └── reference/    external systems
├── scripts/
│   └── INDEX.md      364 1-line summaries (P3-U02)
└── wiki/             722 wiki entries (Karpathy LLM-Wiki, pre-INTEL)
```

## Hook Inventory (357 active, 23 dormant)

```
Categorized by event:
  SessionStart       ~25 hooks (role inject, briefing, indexes,
                       embedder probe)
  UserPromptSubmit   ~18 hooks (complexity router, skill suggester,
                       RAG, semantic CLAUDE.md, semantic actions,
                       GSD retrieve)
  PreToolUse         ~30 hooks (error prewarn, RTK suggest,
                       destructive guard, script summary inject,
                       file claim guard, commit ownership)
  PostToolUse        ~25 hooks (outcome tracker, meta-learning,
                       4 error capture mirrors, claudemd re-chunk,
                       gsd re-chunk, memory mirror to vault,
                       file ownership tag)
  Stop               ~8 hooks (obsidian extract, consolidate graph,
                       enforce handoff topic, stop-auto-wire,
                       stop_on_unwired_assets, scrutinize-before-stop,
                       always-build-guard, file-claim-release)

Dormant (DISABLED_TOKEN_REDUX_2026_04_23 — opt-in):
  prism-awareness-v2     350-tok SessionStart briefing
  task-goal-tracker      drift detector
  reference-value-injector  Kienzle/Taylor injection
  prompt-rewriter-ollama    prompt clarification
  + 19 more advisory hooks

Audit: .claude/helpers/apply-hook-fixes.mjs (reverses with marker
removal). Re-enable selectively if a domain needs the signal.

Newly wired this milestone:
  embedder-inject-qdrant       SessionStart (P0-U01)
  session-consolidate-graph    Stop (P1-U02)
  memory-mirror-to-vault       PostToolUse (P1-U04)
  claudemd-section-update      PostToolUse (P1-U05)
  gsd-section-update           PostToolUse (P4-U01)
  ollama-obsidian-rag          UserPromptSubmit (P3-U05 — was already)
  script-summary-inject        PreToolUse Bash (P3-U02)
  stop-auto-wire               Stop (NEW — multi-source wire audit)
```

## Approach Decision Tree

```
Simple fix (<20 lines, single file):
  Read → Edit → verify → done. No brainstorm. Skip ralph.

Medium task (20-100 lines, 1-3 files):
  Plan in head → implement → self-review.
  Optional: prism_ralph:scrutinize on safety-touching changes.

Large task (>100 lines or >3 files):
  prism_sp:brainstorm (MANDATORY, await user approval)
  prism_sp:plan (steps + checkpoints)
  Implement in <50-line chunks
  prism_ralph:loop (4-phase validation)
  prism_ralph:assess (Opus-level grade)

Safety-critical (forces, speeds, G-code):
  ALL of the above PLUS:
    prism_validate:safety (S(x)≥0.70 hard block)
    prism_omega:compute (Ω≥0.95 shop floor; ≥0.90 production)
    Evidence ≥ L4 (reproducible)
```

## When To Use What

```
Understand a problem
  prism_sp:brainstorm (7-lens analysis)
  prismCreativeReasoningEngine.explore (cross-domain synthesis)

Find an asset (semantic-first)
  prism_memory:semantic_search { kind: skill|engine|action|tip|gsd|rule }
  prism_session:tool_route_best (verb+object → dispatcher:action)
  prism_skill_script:skill_search (legacy fallback)
  prism_data:material_search/machine_search/tool_search (registries)

Validate
  prism_validate:material/kienzle/taylor/johnson_cook (physics)
  prism_validate:safety/completeness (quality)
  prism_ralph:scrutinize|loop (code review)
  prism_omega:compute (Ω release gate)

Orchestrate
  prism_orchestrate:agent_execute (single)
  prism_orchestrate:agent_parallel (multi)
  prism_orchestrate:swarm_consensus (vote)
  prism_atcs:task_init (multi-session)
  prism_autonomous:auto_execute (background)

Manufacturing calculations
  prism_calc: cutting_force_kienzle, tool_life, speed_feed, mrr,
    power, chip_load, surface_finish, deflection, thermal,
    trochoidal, hsm, scallop, cycle_time, cost_optimize
  prism_safety: check_toolpath_collision, validate_rapid_moves,
    check_spindle_torque, predict_tool_breakage,
    calculate_clamp_force_required
  prism_thread: calculate_tap_drill, generate_thread_gcode

Recall memory
  prism_memory:semantic_search { query, kind, limit }
  prism_guard:error_ledger_recall_similar (past errors)
  prism_memory:trace_decision (graph trace)

Track progress
  prism_context:todo_update (anchor focus)
  prism_doc:append name=ACTION_TRACKER.md (log)
  prism_session:state_save (persist)

Coordinate with other chats
  prism_context:chat_post (broadcast)
  state/shared/AGENT_WORKBOARD.md (claim)
  file-claim-guard auto-tags edits

Export to a vault / re-chunk
  scripts/chunk-claudemd-vault.mjs (CLAUDE.md edits)
  scripts/chunk-gsd-vault.mjs (GSD doc edits)
  scripts/populate-tribal-vault.mjs (new tribal tips)
  scripts/embed-all-{skills,engines,actions}.mjs (asset routing)
```

## Auto-Fire Systems (Zero Token Cost)

```
Every Call:
  autoSkillHint               loads SKILL.md excerpt
  autoKnowledgeCrossQuery     enriches with material/formula/machine
  autoScriptRecommend         suggests Python scripts
  autoInputValidation         pre-dispatch param checking

Error Handling:
  4 capture mirrors → unified-ledger-mirror → UNIFIED_ERROR_LEDGER
  PreToolUse error-block-prewarn → top-3 past errors injected
  D3 error chain (legacy local path retained for durability)

Success Tracking:
  autoD3LkgUpdate             last-known-good per subsystem
  lkg_tracker                 rollback target on break

Context Management:
  autoTodoRefresh @5          attention anchor
  autoContextPressure @8      window monitor
  autoAttentionScore @8       importance score for trim
  autoCheckpoint @10          state snapshot
  autoCompactionDetect @12    predict compaction
  autoCompactionSurvival      triple-redundant save

Performance:
  ComputationCache            3-tier LRU (30/120/300s)
  DiffEngine                  CRC32 dedup
  BatchProcessor              priority + fail-fast
```

## Quality Tiers

```
Tier 1: Quick (no API calls)
  prism_validate:safety → S(x)≥0.70
  Use for: routine calcs, lookups, simple fixes

Tier 2: Standard (1 API call)
  prism_ralph:scrutinize → single validator pass
  Use for: code changes, feature additions, bug fixes

Tier 3: Deep (4-7 API calls)
  prism_ralph:loop → SCRUTINIZE → IMPROVE → VALIDATE → ASSESS
  Use for: infrastructure, new features, refactors
  Expect: 30-60s, scored findings

Tier 4: Release (Deep + Omega)
  prism_ralph:loop THEN prism_omega:compute
  Use for: production ship, safety-critical
  Expect: Ω with component breakdown
```

## File Operations Priority

```
1. prism_doc                  PRISM docs (todo, ACTION_TRACKER, roadmaps)
2. prism_dev:file_read/write  source code within mcp-server/
3. Direct Read/Write/Edit     general project files
4. Bash (last resort)         container ops, system commands
```

## Build Protocol

```
Full:        npm run build       (tsc + esbuild, ~30s, pre-commit)
Incremental: npm run build:incremental (~10s)
Fast:        npm run build:fast  (esbuild only, ~3s, dev iteration)
Tests:       npx vitest run
Tests one:   npx vitest run <file.test.ts>

Pre-commit gate: build_guard hook runs tsc on every meaningful edit
Stop gate:       scrutinize-before-stop blocks Stop with uncommitted
                 unreviewed changes (3-strike escape hatch)

Server reload: kill running MCP, run build:fast, restart Claude desktop
               app to load new actions
```

## Schema Versioning

```
All state JSON requires schemaVersion field.
Migrations: src/migrations/<old>-to-<new>.ts
Backward compat: N-1 versions
Breaking changes: bump major + migration script

State files (gitignored — regenerated):
  UNIFIED_ERROR_LEDGER.jsonl + .index.json
  SCRIPTS_INDEX.json / ENGINES_INDEX.json / ACTIONS_INDEX.json
  SKILLS_INDEX.json
  consolidation-counter.json / consolidated_patterns.json

State files (committed — durable):
  BASELINE_INVENTORY.json    (anti-regression baseline)
  HEALTH_CHECK_REPORT.json   (latest health snapshot)
  cross-session-asset-registry.json
  extraction-log.json
```

## Orchestrator Heuristics

```
Use prism_autopilot_d:autopilot when:
  - Implementing a feature/fix that spans >4 steps
  - Need full lifecycle (GSD → state → brainstorm → execute → ralph → update)

Use prism_atcs:task_init when:
  - Multi-session work (continues across compaction)
  - Need persistent task state file

Use prism_orchestrate:swarm_parallel when:
  - 2+ independent subtasks, each well-defined

Use prism_autopilot_d:autopilot_quick when:
  - Lightweight automation, single-call workflow

DON'T orchestrate:
  - Simple data lookups
  - Single calculations
  - Session management
  - Anything that finishes in <5s
```

## Roadmap

### Active milestones (2026-04-28)

```
INTEL-OLLAMA-OBSIDIAN-MS0  92 units, 16/92 done (claude-2a125756)
  Phase 0  ✅ Embedder + Qdrant infrastructure (1)
  Phase 1  ✅ Vault chunking + memory mirror (5)
  Phase 2  ✅ Unified error ledger + Qdrant prewarn (4)
  Phase 3  ✅ Asset routing — skills/scripts/engines/actions (5)
  Phase 4  → Knowledge routing — GSD/directives/wiki (1/4 done)
  Phase 5+ → Reasoning orphans, BIM facade, fleet learning (76 left)

ENGINE-WIRE-MS0            multi-engine wiring sweep (claude-37ef54c0)
  U-WIRE01..N: leaf adaptive engines, AI specialists, plane data

CAM-EXHAUST-MS0            CAM function-index sweep (claude-37ef54c0)
  U-CAM-FIDX-01..N: SolidCAM, Mastercam, NX, PowerMill, etc.

LOCAL-LLM-MS0              local Ollama integration (in progress)
CAD-COMPLETE-MS0           CAD pipeline (work/cad-complete-ms0 worktree)
LATHE-PROD-READY-MS0       lathe production readiness
TSC-CLEANUP-MS0            tsc error cleanup (claude-5e6b6b23)
```

### Historical (completed prior to 2026-04)
- D1-D4 (Session, Context, Learning, Performance)
- W1-W7 (File-based GSD, wiring, orchestration, MCP wrappers,
  workflows, bug fixes, GSD consolidation v22)
- F1-F8 (PFP, MemGraph, Telemetry, Certs, MultiTenant, NL Hooks,
  Bridge, Compliance)

Reference: `PRISM-UNIFIED-ROADMAP-v2.md` (the canonical source).

## Changelog
- 2026-04-28: v3.0 — Major rewrite. Added Engine Wiring multi-source
  rule, Multi-Chat Lane Discipline + Worktree Routing rule,
  Conflict-Fork rule, Test Rules comprehensive build, Context
  Retention & Extension section. Updated roadmap to active
  milestones (INTEL/ENGINE-WIRE/CAM-EXHAUST/LOCAL-LLM/CAD-COMPLETE/
  LATHE-PROD-READY/TSC-CLEANUP). 14 memory kinds.
- 2026-04-28: v2.0 — INTEL milestone refresh. Semantic memory stack,
  error learning loop, vault structure, multi-chat coordination.
- 2026-02-13: v1.0 — Initial micro reference.
